import {
  readContentContext,
  subscribeContentContext,
  hasCoordinatePriority,
} from '../navigation/content-navigation-context.js';
import { readAddress, readHistoryEntry } from '../navigation/history-entry.js';
import { ownsAcceptedHistoryCommit } from '../components/app/controllers/accepted-history-commit.js';
import type {
  AcceptedReadingPosition,
  NativeReadingPositionObservation,
} from '../components/app/controllers/reading-position-controller.js';
import {
  readValidatedShellProof,
  subscribeValidatedShellProof,
} from '../components/app/shell/app-shell-lifecycle.js';
import { TocActiveTracker } from './toc-active-tracker.js';
import { readTocSourceBinding, type TocSourceBinding } from './toc-source-binding.js';
import {
  syncTocActiveLinks,
  syncTocHeadingVisibility,
  type TocDomWriter,
} from './toc-desktop-nav-sync.js';
import { matchesTocViewportSnapshot, type TocViewportSnapshot } from './toc-viewport-snapshot.js';
import { independentTocTrack } from './toc-track-independence.js';
import { resolveTocDensityTier } from './toc-density-tier.js';
import type { TocPositionSyncResult } from './sync-toc-at-reading-position.js';

interface Surface {
  readonly nav: HTMLElement;
  readonly root: HTMLElement;
}
interface Change {
  readonly element: HTMLElement;
  readonly name: string;
  readonly before: string | null;
  readonly written: string | null;
}
interface Request {
  readonly strict: boolean;
  readonly preferHash: boolean;
  readonly requestedId?: string;
  readonly key: string;
  readonly sequence: number;
  readonly position: readonly number[] | null;
  readonly current: (verifyStructure?: boolean) => boolean;
}
const sessions = new WeakMap<HTMLElement, TocSourceSession>();
let nativeObservation: NativeReadingPositionObservation | null = null;
const readPosition = (): number[] => {
  const root = document.scrollingElement ?? document.documentElement;
  return [
    scrollX,
    scrollY,
    root.scrollWidth - root.clientWidth,
    root.scrollHeight - root.clientHeight,
  ];
};
const samePosition = (a: readonly number[], b: readonly number[]): boolean =>
  a.every((n, i) => Math.abs(n - (b[i] ?? NaN)) <= 0.1);
const diagnose = (error: unknown): void => {
  // 診断もtransactionの所有権・後続callbackを変更しない。
  try {
    console.error('TOC source session', error);
  } catch {
    /* 診断先の例外を隔離する。 */
  }
};

export class TocSourceSession {
  readonly tracker: TocActiveTracker;
  snapshot: TocViewportSnapshot | null = null;
  private connected = false;
  private disposed = false;
  private normalAllowed = false;
  private initialStarted = false;
  private busy = false;
  private refreshFrame: { result: TocPositionSyncResult } | null = null;
  private pending: Request | null = null;
  private writeFault = false;
  private policyRevision = 0;
  private nativePolicy: NativeReadingPositionObservation | null = null;
  private positionProof: (() => boolean) | null = null;
  private readonly surfaces = new Set<Surface>();
  private readonly listeners = new Set<() => void>();
  private stopContext: (() => void) | null = null;

  // registryへの公開前に購読やDOM writeを行わない。
  constructor(readonly binding: TocSourceBinding) {
    this.tracker = new TocActiveTracker({
      contentRootId: binding.contentRoot.id,
      headings: binding.headings,
      capabilities: binding.capabilities,
      getActiveId: () => this.snapshot?.activeId ?? '',
      getVisibleHeadings: () => this.snapshot?.visibleHeadings ?? [],
      isCurrent: () => this.isCurrent(),
      coordinatePriority: () => this.coordinatePriority(),
      requestSnapshot: (preferHash) => {
        this.onTrackerRequest(preferHash);
      },
      onError: diagnose,
    });
  }
  isCurrent(verifyStructure = true): boolean {
    return (
      !this.disposed &&
      sessions.get(this.binding.controller) === this &&
      this.binding.isCurrent(verifyStructure)
    );
  }
  private coordinatePriority(): boolean {
    const policy = this.nativePolicy;
    return (
      hasCoordinatePriority() ||
      (policy?.policy === 'native-viewport' &&
        policy.intent.intentId === readContentContext()?.intent?.intentId)
    );
  }
  connect(): void {
    if (this.connected || !this.isCurrent()) return;
    this.connected = true;
    try {
      this.stopContext = subscribeContentContext((reason) => {
        if (
          (reason === 'before-mutation' && readContentContext()?.root === this.binding.root) ||
          !this.isCurrent()
        )
          this.dispose();
      });
      window.addEventListener('pagehide', this.onPageHide);
      this.tracker.observe();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  private onPageHide = (): void => {
    // 通常観測とshellは維持し、保存された位置の成功証明だけを破棄する。
    this.positionProof = null;
    if (this.pending?.strict) this.pending = null;
    this.policyRevision += 1;
  };
  activate(): void {
    if (!this.isCurrent()) return;
    this.normalAllowed = true;
    this.writeFault = false;
    this.connect();
    if (this.initialStarted) {
      this.refresh();
      return;
    }
    this.initialStarted = true;
    try {
      this.tracker.start();
    } catch (error) {
      diagnose(error);
    } finally {
      // controller由来の既存二枠も、同期refreshの成否と独立に一度試す。
      if (this.isCurrent()) {
        try {
          queueMicrotask(() => {
            if (this.isCurrent()) this.refresh();
          });
        } catch (error) {
          diagnose(error);
        }
        try {
          requestAnimationFrame(() => {
            if (this.isCurrent()) this.refresh();
          });
        } catch (error) {
          diagnose(error);
        }
      }
    }
  }
  refresh(): TocPositionSyncResult {
    const frame = { result: 'skipped' as TocPositionSyncResult };
    const previous = this.refreshFrame;
    this.refreshFrame = frame;
    try {
      if (this.isCurrent()) this.tracker.refresh();
    } finally {
      this.refreshFrame = previous;
    }
    return frame.result;
  }
  applyActiveId(id: string): void {
    this.request(this.capture(false, false, undefined, 0, id));
  }
  attachSurface(surface: Surface): () => void {
    this.surfaces.add(surface);
    try {
      this.refresh();
    } catch (error) {
      this.surfaces.delete(surface);
      throw error;
    }
    return () => {
      this.surfaces.delete(surface);
    };
  }
  subscribe(listener: () => void): () => void {
    const registration = (): void => {
      listener();
    };
    this.listeners.add(registration);
    try {
      registration();
    } catch (error) {
      diagnose(error);
    }
    return () => {
      this.listeners.delete(registration);
    };
  }
  setInitialPolicy(position: NativeReadingPositionObservation): void {
    this.nativePolicy = position;
  }
  observe(position: NativeReadingPositionObservation): void {
    if (!position.isCurrent() || position.root !== this.binding.root) return;
    if (
      this.nativePolicy?.isCurrent() &&
      this.nativePolicy.root === position.root &&
      this.nativePolicy.contentEpoch === position.contentEpoch &&
      this.nativePolicy.intent.intentId === position.intent.intentId &&
      position.sequence < this.nativePolicy.sequence
    )
      return;
    if (this.nativePolicy !== position) {
      this.nativePolicy = position;
      this.policyRevision += 1;
    }
    if (position.phase !== 'accepted') return;
    this.positionProof = position.isCurrent;
    this.writeFault = false;
    this.connect();
    const result = this.request(
      this.capture(true, this.snapshot === null, position.isCurrent, position.sequence),
    );
    if (this.isCurrent() && position.isCurrent()) {
      this.binding.root.dataset['tocNativeSync'] = result;
      this.binding.root.dataset['tocPositionSequence'] = String(position.sequence);
    }
  }
  accept(position: AcceptedReadingPosition): TocPositionSyncResult {
    const current = (): boolean =>
      !!position.receipt &&
      ownsAcceptedHistoryCommit(position.root, position.intent, position.receipt) &&
      (position.isCurrent?.() ?? true);
    if (!current()) return 'superseded';
    this.positionProof = current;
    this.writeFault = false;
    this.connect();
    return this.request(this.capture(true, false, current, position.sequence ?? 0));
  }
  private capture(
    strict: boolean,
    preferHash: boolean,
    proof?: () => boolean,
    sequence = 0,
    requestedId?: string,
  ): Request {
    const context = readContentContext();
    const intent = context?.intent;
    const epoch = context?.contentEpoch;
    const entry = readHistoryEntry()?.id ?? null;
    const url = readAddress();
    const policyRevision = this.policyRevision;
    const trackerRevision = this.tracker.policyRevision;
    return {
      strict,
      preferHash,
      sequence,
      position: strict ? readPosition() : null,
      ...(requestedId === undefined ? {} : { requestedId }),
      key: JSON.stringify([epoch, intent?.intentId, entry, url, policyRevision, trackerRevision]),
      current: (verifyStructure = true) => {
        const next = readContentContext();
        return (
          this.isCurrent(verifyStructure) &&
          (!strict || this.positionProof === proof) &&
          (proof?.() ?? true) &&
          next?.contentEpoch === epoch &&
          next?.intent === intent &&
          !intent?.signal.aborted &&
          readAddress() === url &&
          (readHistoryEntry()?.id ?? null) === entry &&
          this.policyRevision === policyRevision &&
          this.tracker.policyRevision === trackerRevision
        );
      },
    };
  }
  private onTrackerRequest(preferHash: boolean): void {
    const pending = this.pending;
    this.pending = null;
    const fresh = this.capture(
      !this.normalAllowed,
      preferHash,
      this.normalAllowed ? undefined : (this.positionProof ?? (() => false)),
    );
    const frame = this.refreshFrame;
    let result: TocPositionSyncResult;
    if (
      pending &&
      pending.current() &&
      pending.key === fresh.key &&
      (pending.position === null || samePosition(pending.position, readPosition()))
    )
      result = this.request(pending);
    else result = this.request(fresh);
    if (frame) frame.result = result;
  }
  private request(request: Request): TocPositionSyncResult {
    if (!request.current()) return 'superseded';
    if (this.writeFault) return 'skipped';
    if (this.busy) {
      const pending = this.pending;
      if (
        !pending ||
        !pending.current() ||
        (pending.position !== null && !samePosition(pending.position, readPosition())) ||
        pending.key !== request.key ||
        !pending.strict ||
        (request.strict && request.sequence >= pending.sequence)
      )
        this.pending = request;
      this.tracker.deferRefresh();
      return 'skipped';
    }
    this.busy = true;
    try {
      return this.transact(request);
    } finally {
      this.busy = false;
    }
  }
  private transact(request: Request): TocPositionSyncResult {
    const journal: Change[] = [];
    const expected: Change[] = [];
    let result: TocPositionSyncResult = 'rejected-before';
    let beforePosition: number[] | null = null;
    const surfaces: Surface[] = [
      { nav: this.binding.nav, root: this.binding.toc },
      ...this.surfaces,
    ];
    const captured = new Set<Element>(
      surfaces.flatMap((s) => [s.nav, s.root, ...s.nav.querySelectorAll('*')]),
    );
    const current = (verifyStructure = true): boolean =>
      request.current(verifyStructure) &&
      surfaces.every(
        (s) =>
          s.nav.isConnected &&
          s.root.isConnected &&
          (s.nav === this.binding.nav || this.surfaces.has(s)),
      );
    const owns = (element: HTMLElement): boolean =>
      captured.has(element) &&
      surfaces.some((s) => element === s.root || element === s.nav || s.nav.contains(element));
    try {
      if (!current()) return 'superseded';
      if (request.position && !samePosition(request.position, readPosition()))
        return 'rejected-before';
      if (request.strict && !independentTocTrack(this.binding.root)) return 'skipped';
      const now = performance.now();
      const candidate = this.tracker.readCandidate(request.preferHash, now, request.requestedId);
      if (!candidate || !current()) return result;
      beforePosition = readPosition();
      const writer: TocDomWriter = {
        attribute: (element, name, written) => {
          if (!current(false) || !owns(element)) throw new Error('TOC source superseded');
          const before = element.getAttribute(name);
          expected.push({ element, name, before, written });
          if (before === written) return;
          journal.push({ element, name, before, written });
          if (written === null) element.removeAttribute(name);
          else element.setAttribute(name, written);
        },
        activeClass: (element, active) => {
          if (!current(false) || !owns(element)) throw new Error('TOC source superseded');
          const before = element.classList.contains('is-active');
          expected.push({
            element,
            name: 'class:is-active',
            before: String(before),
            written: String(active),
          });
          if (before === active) return;
          journal.push({
            element,
            name: 'class:is-active',
            before: String(before),
            written: String(active),
          });
          element.classList.toggle('is-active', active);
        },
      };
      const visible = new Set(candidate.visibleHeadings.map((h) => h.id));
      const density = resolveTocDensityTier(candidate.visibleHeadings);
      for (const surface of surfaces) {
        syncTocHeadingVisibility(surface.nav, visible, writer);
        syncTocActiveLinks({
          nav: surface.nav,
          ownerId: this.binding.ownerId,
          activeHeadingId: candidate.activeId || null,
          visibleHeadingIds: visible,
          writer,
        });
        writer.attribute(surface.nav, 'data-density-tier', density);
        writer.attribute(surface.root, 'data-density-tier', density);
      }
      const after = this.tracker.readCandidate(request.preferHash, now, request.requestedId);
      if (!current()) result = 'superseded';
      else if (
        expected.some((change) =>
          change.name === 'class:is-active'
            ? String(change.element.classList.contains('is-active')) !== change.written
            : change.element.getAttribute(change.name) !== change.written,
        ) ||
        (request.strict
          ? !matchesTocViewportSnapshot(candidate, after)
          : candidate.activeId !== after?.activeId ||
            candidate.visibleHeadings.length !== after.visibleHeadings.length ||
            candidate.visibleHeadings.some((h, i) => h.id !== after.visibleHeadings[i]?.id)) ||
        (request.strict && !samePosition(beforePosition, readPosition()))
      )
        result = 'rejected-after';
      else {
        const changed =
          this.snapshot?.activeId !== candidate.activeId ||
          this.snapshot.visibleHeadings.length !== candidate.visibleHeadings.length ||
          this.snapshot.visibleHeadings.some((h, i) => h.id !== candidate.visibleHeadings[i]?.id);
        this.snapshot = candidate;
        this.tracker.adoptSnapshot(candidate);
        result = 'accepted';
        if (changed) {
          for (const listener of [...this.listeners]) {
            try {
              if (!current()) break;
            } catch (error) {
              diagnose(error);
              break;
            }
            try {
              listener();
            } catch (error) {
              diagnose(error);
            }
          }
        }
      }
    } catch (error) {
      let owned = false;
      try {
        owned = current();
      } catch {
        /* owner確認の例外も位置処理から隔離する。 */
      }
      if (owned) this.writeFault = true;
      result = owned ? (journal.length ? 'rejected-after' : 'rejected-before') : 'superseded';
      diagnose(error);
    } finally {
      if (result !== 'accepted') {
        for (const change of journal) {
          try {
            if (!current()) break;
            if (!owns(change.element)) continue;
            if (change.name === 'class:is-active') {
              if (String(change.element.classList.contains('is-active')) === change.written)
                change.element.classList.toggle('is-active', change.before === 'true');
            } else if (change.element.getAttribute(change.name) === change.written) {
              if (change.before === null) change.element.removeAttribute(change.name);
              else change.element.setAttribute(change.name, change.before);
            }
          } catch (error) {
            this.writeFault = true;
            diagnose(error);
          }
        }
        try {
          if (current() && beforePosition && !samePosition(beforePosition, readPosition()))
            this.binding.root.dataset['tocPositionPreserved'] = 'false';
        } catch (error) {
          diagnose(error);
        }
      }
    }
    return result;
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pending = null;
    this.positionProof = null;
    this.stopContext?.();
    this.stopContext = null;
    window.removeEventListener('pagehide', this.onPageHide);
    try {
      this.tracker.destroy();
    } catch (error) {
      diagnose(error);
    }
    this.listeners.clear();
    this.surfaces.clear();
    if (sessions.get(this.binding.controller) === this) sessions.delete(this.binding.controller);
  }
}

export const getTocSourceSession = (controller: HTMLElement): TocSourceSession | null => {
  const existing = sessions.get(controller);
  if (existing?.isCurrent()) return existing;
  existing?.dispose();
  // dispose/owner getterの再入後にregistryを再確認する。
  const reentered = sessions.get(controller);
  if (reentered?.isCurrent()) return reentered;
  const binding = readTocSourceBinding(controller);
  if (!binding) return null;
  const latest = sessions.get(controller);
  if (latest?.isCurrent()) return latest;
  if (!binding.isCurrent()) return null;
  const session = new TocSourceSession(binding);
  sessions.set(controller, session);
  const observation = nativeObservation;
  if (observation?.root === binding.root && observation.isCurrent())
    session.setInitialPolicy(observation);
  return session;
};
export const disposeTocSourceSession = (controller: HTMLElement): void => {
  sessions.get(controller)?.dispose();
};
export const syncAcceptedTocPosition = (
  position: AcceptedReadingPosition,
): TocPositionSyncResult => {
  let result: TocPositionSyncResult = 'rejected-before';
  try {
    if (
      !position.receipt ||
      position.receipt.stateOnly ||
      !ownsAcceptedHistoryCommit(position.root, position.intent, position.receipt)
    )
      result = 'superseded';
    else if (
      position.receipt.url.includes('#') ||
      !position.root.querySelector('[data-layout-toc-root]:not([data-toc-hydration="static"])')
    )
      result = 'skipped';
    else {
      const controller = position.root.querySelector<HTMLElement>('layout-toc-controller');
      result = controller
        ? (getTocSourceSession(controller)?.accept(position) ?? 'rejected-before')
        : 'rejected-before';
    }
  } catch (error) {
    diagnose(error);
  }
  try {
    if (
      position.receipt &&
      ownsAcceptedHistoryCommit(position.root, position.intent, position.receipt)
    )
      position.root.dataset['tocPositionSync'] = result;
  } catch {
    /* 診断も復元candidateを消さない。 */
  }
  return result;
};
const connectNativeObservation = (): void => {
  const observation = nativeObservation;
  const proof = readValidatedShellProof();
  if (observation === null) return;
  if (
    observation.entryId === null ||
    !observation.isCurrent() ||
    proof?.shellCommitId !== observation.shellCommitId ||
    proof.document !== observation.root.ownerDocument
  )
    return;
  const controller = observation.root.querySelector<HTMLElement>('layout-toc-controller');
  if (!controller) return;
  try {
    const session = getTocSourceSession(controller);
    session?.observe({
      ...observation,
      isCurrent: () => observation.isCurrent() && readValidatedShellProof() === proof,
    });
  } catch (error) {
    diagnose(error);
  }
};
export const observeNativeTocPosition = (observation: NativeReadingPositionObservation): void => {
  if (
    !observation.isCurrent() ||
    (nativeObservation?.isCurrent() &&
      nativeObservation.root === observation.root &&
      nativeObservation.contentEpoch === observation.contentEpoch &&
      nativeObservation.intent.intentId === observation.intent.intentId &&
      observation.sequence < nativeObservation.sequence)
  )
    return;
  nativeObservation = observation;
  // 分類だけでは購読を前倒しせず、実際の位置受理とshell検証が揃ってから接続する。
  if (observation.phase === 'accepted') connectNativeObservation();
  else {
    const controller = observation.root.querySelector<HTMLElement>('layout-toc-controller');
    if (controller) sessions.get(controller)?.observe(observation);
  }
};
subscribeValidatedShellProof(connectNativeObservation);
