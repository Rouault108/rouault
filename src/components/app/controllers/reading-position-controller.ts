import {
  adoptHistoryEntry,
  observeHistoryEntries,
  readAddress,
  readHistoryEntry,
} from '../../../navigation/history-entry.js';
import {
  adoptContentBinding,
  beginNavigationIntent,
  markCoordinatePriority,
  hasInitialIntervention,
  readContentContext,
  subscribeContentContext,
  type NavigationIntent,
} from '../../../navigation/content-navigation-context.js';
import { waitForContentReadiness } from '../../../client/hydration/content-readiness.js';
import {
  clampReadingPosition,
  validateReadingPosition,
  ReadingPositionStore,
  type ReadingPosition,
} from '../navigation/reading-position-store.js';
import { readDecodedHash } from '../navigation/primary-tab-url-state.js';
import { readHeadingScrollOffset } from '../../../navigation/heading-scroll-offset.js';
import { readCurrentShellCommitId } from '../shell/app-shell-lifecycle.js';
import { readContentTransitionShell } from '../../../router/content-transition-shell.js';
import type { AppShellValidatedDetail } from '../shell/app-shell-events.js';
import type { NavigationCommitReceipt } from '../../../router/router-types.js';
import { HistoryPresentationCoordinator } from './history-presentation-coordinator.js';
import { ownsAcceptedHistoryCommit } from './accepted-history-commit.js';
import {
  captureHistoryGeometry,
  readHistoryGeometryAnchor,
  prepareHistoryFonts,
  matchesHistoryGeometry,
  type HistoryGeometryCheckpoint,
} from './history-presentation-geometry.js';

type PresentationEligibility =
  | 'pending'
  | 'ready'
  | 'unavailable'
  | 'skipped'
  | 'interrupted'
  | 'superseded'
  | 'failed';

interface ScrollJob {
  readonly intent: NavigationIntent;
  readonly epoch: number;
  readonly root: HTMLElement;
  readonly controller: AbortController;
  readonly shellCommitId: number;
  readonly stateOnly: boolean;
  readonly error: boolean;
  readonly entryId: string | null;
  readonly receipt?: NavigationCommitReceipt;
  readonly prepaintGeometryReady?: boolean;
  presentation: PresentationEligibility;
  candidate: ReadingPosition | null;
  url: string;
}
export interface AcceptedReadingPosition {
  readonly root: HTMLElement;
  readonly intent: NavigationIntent;
  readonly receipt: NavigationCommitReceipt | undefined;
  readonly sequence?: number;
  readonly isCurrent?: () => boolean;
}
export interface NativeReadingPositionObservation {
  readonly root: HTMLElement;
  readonly intent: NavigationIntent;
  readonly contentEpoch: number;
  readonly shellCommitId: number;
  readonly entryId: string | null;
  readonly url: string;
  readonly sequence: number;
  readonly policy: 'native-viewport' | 'initial-fragment';
  readonly phase: 'classified' | 'accepted';
  readonly isCurrent: () => boolean;
}
const interventionKeys = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'PageDown',
  'PageUp',
  'Home',
  'End',
  ' ',
  'Tab',
]);
export class ReadingPositionController {
  private readonly store = new ReadingPositionStore();
  private readonly lifetime = new AbortController();
  private renderedId: string | null = null;
  private renderedUrl = '';
  private renderedError = false;
  private sample: ReadingPosition | null = null;
  private candidate: ReadingPosition | null = null;
  private candidateId: string | null = null;
  private job: ScrollJob | null = null;
  private restoring = false;
  private disposed = false;
  private nativeGeneration = 0;
  private positionSequence = 0;
  private interruptedIntent = -1;
  private pendingIntent: number | null = null;
  private originalMode: ScrollRestoration = history.scrollRestoration;
  private ownedMode: ScrollRestoration | null = null;
  private stops: (() => void)[] = [];
  private readonly presentation = new HistoryPresentationCoordinator();
  private readonly geometry = new Map<string, HistoryGeometryCheckpoint>();
  private verifiedLayout: string | null = null;
  private geometryTimer: number | null = null;
  private fontPreparationEpoch = -1;
  private traverseVisual: { entryId: string | null; url: string; active: boolean | null } | null =
    null;
  constructor(
    private readonly reportError: (error: unknown) => void,
    private readonly onPositionAccepted: (position: AcceptedReadingPosition) => void = () => {
      /* TOC連携を持たない利用者は位置復元だけを行う。 */
    },
    private readonly onNativeObservation: (
      observation: NativeReadingPositionObservation,
    ) => void = () => {
      /* native位置の観測先を持たない利用者は既存の位置採用だけを行う。 */
    },
  ) {}

  start(root: HTMLElement): void {
    adoptHistoryEntry();
    adoptContentBinding(readAddress());
    this.renderedId = readHistoryEntry()?.id ?? null;
    this.renderedUrl = readAddress();
    this.sampleCurrent();
    const signal = this.lifetime.signal;
    document.addEventListener(
      'app-shell:validated',
      (event) => {
        this.verifiedLayout =
          readContentTransitionShell(
            (event as CustomEvent<AppShellValidatedDetail>).detail.shell,
            document,
          )?.layoutKey ?? null;
      },
      { signal },
    );
    document.addEventListener(
      'app-shell:rollback-start',
      () => {
        this.verifiedLayout = null;
      },
      { signal },
    );
    window.addEventListener(
      'popstate',
      (event) => {
        // UA自身の演出が不明な環境も、appの演出を重ねない。
        this.traverseVisual = {
          entryId: readHistoryEntry()?.id ?? null,
          url: readAddress(),
          active:
            'hasUAVisualTransition' in event && typeof event.hasUAVisualTransition === 'boolean'
              ? event.hasUAVisualTransition
              : null,
        };
      },
      { capture: true, signal },
    );
    document.addEventListener(
      'reading-position:native-start',
      () => {
        this.adoptNativeAddress();
      },
      { signal },
    );
    document.addEventListener(
      'reading-position:document-fallback',
      () => {
        this.fallback();
      },
      {
        signal,
      },
    );
    document.addEventListener(
      'reading-position:native-address',
      () => {
        this.adoptNativeAddress();
      },
      {
        signal,
      },
    );
    window.addEventListener(
      'scroll',
      () => {
        if (!this.restoring) this.sampleCurrent();
      },
      { passive: true, signal },
    );
    for (const name of ['wheel', 'touchmove', 'pointerdown'] as const)
      window.addEventListener(
        name,
        () => {
          this.intervene();
        },
        {
          passive: true,
          capture: true,
          signal,
        },
      );
    window.addEventListener(
      'keydown',
      (event) => {
        if (interventionKeys.has(event.key)) this.intervene();
      },
      { capture: true, signal },
    );
    window.addEventListener(
      'pagehide',
      () => {
        this.checkpoint();
        this.cancel();
        this.nativeGeneration += 1;
        this.mode('auto');
      },
      { signal },
    );
    window.addEventListener(
      'pageshow',
      (event) => {
        if (!event.persisted) return;
        this.traverseVisual = null;
        const context = readContentContext();
        if (context?.recoveryRequired) {
          this.cancel();
          this.restoring = true;
          this.mode('auto');
          return;
        }
        const entry = adoptHistoryEntry();
        const url = readAddress();
        const matches =
          context?.displayedBinding.entryId === (entry?.id ?? null) &&
          context.displayedBinding.url === url;
        adoptContentBinding(url, entry?.id ?? null);
        this.renderedId = entry?.id ?? null;
        this.renderedUrl = url;
        this.restoring = false;
        const nativeIntent =
          context?.intent && !context.intent.signal.aborted
            ? context.intent
            : beginNavigationIntent('initial', url, 'native');
        this.observeNativePosition(
          context?.root ?? root,
          nativeIntent,
          'native-viewport',
          'classified',
        );
        if (!matches && entry && this.store.read(entry.id, url) && context?.root) {
          const intent = beginNavigationIntent('traverse', url);
          this.schedule({
            intent,
            root: context.root,
            url,
            stateOnly: true,
            error: false,
            shellCommitId: readCurrentShellCommitId(),
          });
        } else {
          if (this.sampleCurrent())
            this.observeNativePosition(
              context?.root ?? root,
              nativeIntent,
              'native-viewport',
              'accepted',
            );
          this.mode(entry ? 'manual' : 'auto');
        }
      },
      { signal },
    );
    this.stops.push(
      observeHistoryEntries(
        () => {
          this.checkpoint();
        },
        (change) => {
          if (change.owner !== 'feature') {
            this.mode(change.entry ? 'manual' : 'auto');
            return;
          }
          this.store.rebind(change.entry?.id ?? null, change.previousUrl, change.url);
          if (this.candidateId === change.entry?.id && this.candidate)
            this.candidate = { ...this.candidate, url: change.url };
          if (this.job?.candidate && this.candidateId === change.entry?.id) {
            this.job.url = change.url;
            this.job.candidate = { ...this.job.candidate, url: change.url };
          }
          this.renderedId = change.entry?.id ?? null;
          this.renderedUrl = change.url;
          if (!this.restoring) this.sampleCurrent();
        },
      ),
    );
    this.stops.push(
      subscribeContentContext((reason, owner) => {
        if (reason === 'recovery') {
          this.cancel();
          this.pendingIntent = null;
          this.restoring = true;
          return;
        }
        if (reason === 'before-mutation' || reason === 'mutation') {
          if (reason === 'before-mutation') this.checkpoint();
          this.cancel();
          this.restoring = true;
          return;
        }
        if (reason !== 'intent') return;
        this.checkpoint();
        this.cancel();
        const intent = readContentContext()?.intent;
        if (!intent) return;
        this.pendingIntent = owner === 'router' ? intent.intentId : null;
        const root = readContentContext()?.root;
        if (owner === 'router' && root) root.dataset['readingPositionStatus'] = 'pending';
        if (intent.cause === 'traverse') {
          const frozen =
            this.candidateId === intent.target.entryId && this.candidate?.url === intent.target.url
              ? this.candidate
              : null;
          this.candidateId = intent.target.entryId;
          this.candidate = frozen ?? this.store.read(this.candidateId, intent.target.url);
          this.restoring = true;
          if (this.candidate) markCoordinatePriority();
        } else if (owner === 'feature') {
          this.candidate = null;
          this.candidateId = null;
          this.restoring = false;
        } else {
          this.candidate = null;
          this.candidateId = null;
        }
        this.mode(
          intent.cause === 'initial' && owner === 'native'
            ? 'auto'
            : intent.target.entryId
              ? 'manual'
              : 'auto',
        );
      }),
    );
    const navigation = performance.getEntriesByType('navigation')[0];
    const nativeInitial =
      navigation instanceof PerformanceNavigationTiming && navigation.type !== 'navigate';
    if (nativeInitial || this.renderedId === null) {
      this.mode('auto');
      const intent = beginNavigationIntent('initial', readAddress(), 'native');
      this.observeNativePosition(root, intent, 'native-viewport', 'classified');
      const generation = ++this.nativeGeneration;
      const adopt = (): void => {
        if (intent.signal.aborted || this.disposed || generation !== this.nativeGeneration) return;
        requestAnimationFrame(() => {
          if (intent.signal.aborted || this.disposed || generation !== this.nativeGeneration)
            return;
          this.restoring = false;
          if (this.sampleCurrent())
            this.observeNativePosition(root, intent, 'native-viewport', 'accepted');
          root.dataset['readingPositionStatus'] = 'settled';
          this.mode(this.renderedId ? 'manual' : 'auto');
        });
      };
      if (document.readyState === 'complete') adopt();
      else window.addEventListener('load', adopt, { once: true, signal });
      return;
    }
    this.mode('manual');
    const intent = beginNavigationIntent('initial', readAddress());
    this.observeNativePosition(root, intent, 'initial-fragment', 'classified');
    if (hasInitialIntervention()) this.interruptedIntent = intent.intentId;
    this.schedule({
      intent,
      root,
      url: readAddress(),
      stateOnly: false,
      error: false,
      shellCommitId: readCurrentShellCommitId(),
    });
  }

  shouldFocus(intent: NavigationIntent): boolean {
    return this.interruptedIntent !== intent.intentId;
  }

  schedule(options: {
    intent: NavigationIntent;
    root: HTMLElement;
    url: string;
    stateOnly: boolean;
    error: boolean;
    shellCommitId: number;
    previousUrl?: string;
    receipt?: NavigationCommitReceipt;
    prepaintGeometryReady?: boolean;
  }): void {
    if (this.disposed || options.intent.signal.aborted) return;
    this.cancel();
    delete options.root.dataset['historyPresentationEligibility'];
    delete options.root.dataset['readingPositionPrepaint'];
    const context = readContentContext();
    if (context?.recoveryRequired) {
      this.pendingIntent = null;
      this.restoring = true;
      options.root.dataset['historyPresentationEligibility'] = 'unavailable';
      return;
    }
    if (!context || readHistoryEntry() === null) {
      this.pendingIntent = null;
      this.mode('auto');
      this.restoring = false;
      options.root.dataset['readingPositionStatus'] = 'settled';
      return;
    }
    this.renderedId = readHistoryEntry()?.id ?? null;
    this.renderedUrl = options.url;
    this.sample = null;
    if (!options.stateOnly) this.renderedError = options.error;
    if (!this.shouldFocus(options.intent)) {
      this.pendingIntent = null;
      this.restoring = false;
      this.sampleCurrent();
      options.root.dataset['readingPositionStatus'] = 'cancelled';
      return;
    }
    const controller = new AbortController();
    const job: ScrollJob = {
      ...options,
      entryId: this.renderedId,
      presentation: 'pending',
      error: options.error || this.renderedError,
      epoch: context.contentEpoch,
      controller,
      candidate: options.error
        ? null
        : this.candidateId === this.renderedId
          ? this.candidate
          : null,
    };
    this.job = job;
    job.root.dataset['readingPositionStatus'] = 'pending';
    this.restoring = true;
    const cancel = (): void => {
      controller.abort();
    };
    options.intent.signal.addEventListener('abort', cancel, { once: true });
    let failed = false;
    void this.restore(job)
      .catch((error: unknown) => {
        failed = true;
        this.cancelJobPresentation(job, 'position-failed');
        this.reportError(error);
      })
      .finally(() => {
        options.intent.signal.removeEventListener('abort', cancel);
        if (this.job !== job) return;
        this.job = null;
        if (!controller.signal.aborted) {
          job.root.dataset['readingPositionStatus'] = failed ? 'unavailable' : 'settled';
          this.restoring = false;
          this.pendingIntent = null;
          this.candidate = null;
          this.candidateId = null;
          if (!job.error && !failed) this.sampleCurrent();
        }
      });
  }
  adoptNativeAddress(): void {
    if (readContentContext()?.recoveryRequired) {
      this.fallback();
      return;
    }
    this.pendingIntent = null;
    this.cancel();
    this.candidate = null;
    this.candidateId = null;
    this.restoring = false;
    this.renderedId = readHistoryEntry()?.id ?? null;
    this.renderedUrl = readAddress();
    this.mode('auto');
    const intent = readContentContext()?.intent;
    const root = readContentContext()?.root;
    // native-start/addressは新しいfragment操作であり、reloadの古いhashとは優先順位が異なる。
    const policy = intent?.cause === 'native-navigation' ? 'initial-fragment' : 'native-viewport';
    if (intent && root) this.observeNativePosition(root, intent, policy, 'classified');
    const generation = ++this.nativeGeneration;
    requestAnimationFrame(() => {
      if (this.disposed || generation !== this.nativeGeneration || intent?.signal.aborted) return;
      if (this.sampleCurrent() && intent && root)
        this.observeNativePosition(root, intent, policy, 'accepted');
      this.mode(this.renderedId ? 'manual' : 'auto');
    });
  }
  fallback(): void {
    this.pendingIntent = null;
    this.checkpoint();
    this.cancel();
    this.mode('auto');
  }
  terminal(committed: boolean, intentId: number): void {
    const context = readContentContext();
    if (context?.intent?.intentId !== intentId || context.recoveryRequired) return;
    if (!committed && !context.mutation && context.displayedBinding.url === readAddress()) {
      this.pendingIntent = null;
      this.restoring = false;
      this.sampleCurrent();
      if (context.root) context.root.dataset['readingPositionStatus'] = 'settled';
    }
  }
  private current(job: ScrollJob): boolean {
    const context = readContentContext();
    return (
      !this.disposed &&
      !job.controller.signal.aborted &&
      !job.intent.signal.aborted &&
      context?.contentEpoch === job.epoch &&
      readCurrentShellCommitId() === job.shellCommitId &&
      context.intent?.intentId === job.intent.intentId &&
      !context.mutation &&
      !context.recoveryRequired &&
      context.root === job.root &&
      this.job === job &&
      job.root.isConnected &&
      (readHistoryEntry()?.id ?? null) === job.entryId &&
      job.url === readAddress()
    );
  }
  private async restore(job: ScrollJob): Promise<void> {
    const deadline = performance.now() + 5000;
    const expired = (): boolean => performance.now() >= deadline;
    const readinessController = new AbortController();
    const abortReady = (): void => {
      readinessController.abort();
    };
    job.controller.signal.addEventListener('abort', abortReady, { once: true });
    const readyTimer = window.setTimeout(abortReady, 5000);
    try {
      const rawApplied = this.restoreRawHistoryBeforePaint(job);
      let notified = rawApplied;
      if (rawApplied) this.positionAccepted(job);
      this.restoreVerifiedHistoryBeforePaint(job, rawApplied);
      // 履歴成功・binding採用後の既知の先頭だけを描画待ちより前に適用する。
      // 完了判定と取消は、このjobの準備後の安定化まで引き続き所有する。
      const binding = readContentContext()?.displayedBinding;
      if (
        job.intent.cause === 'navigation' &&
        !job.stateOnly &&
        !job.error &&
        !job.candidate &&
        readDecodedHash(job.url) === '' &&
        binding?.entryId === this.renderedId &&
        binding.url === job.url &&
        this.current(job)
      ) {
        window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
        if (Math.abs(scrollX) <= 2 && Math.abs(scrollY) <= 2) {
          this.positionAccepted(job);
          notified = true;
        }
      }
      const readiness = await waitForContentReadiness(job.epoch, readinessController.signal);
      if (
        !this.current(job) ||
        (readiness === 'invalidated' && !readinessController.signal.aborted)
      ) {
        this.cancelJobPresentation(job, 'position-invalidated');
        return;
      }
      await Promise.resolve();
      let stable = 0;
      let previous = '';
      while (this.current(job)) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => {
            resolve();
          }),
        );
        if (!this.current(job)) return;
        const range = this.range();
        let target: ReadingPosition;
        if (job.candidate) target = clampReadingPosition(job.candidate, range.x, range.y);
        else {
          const hash = job.error ? '' : readDecodedHash(job.url);
          const element = hash ? document.getElementById(hash) : null;
          if (element instanceof HTMLElement && element.getClientRects().length > 0) {
            element.setAttribute('data-router-hash-target', 'true');
            const { offset } = readHeadingScrollOffset(element);
            target = {
              version: 1,
              url: job.url,
              x: 0,
              y: Math.max(0, element.getBoundingClientRect().top + window.scrollY - offset),
            };
          } else if (job.stateOnly && job.intent.cause !== 'traverse') return;
          else target = { version: 1, url: job.url, x: 0, y: 0 };
          target = clampReadingPosition(target, range.x, range.y);
        }
        const pending =
          document.fonts.status === 'loading' ||
          Array.from(job.root.querySelectorAll('img')).some(
            (image) =>
              !image.complete &&
              image.getBoundingClientRect().top + window.scrollY <=
                (job.candidate?.y ?? target.y) &&
              (!image.hasAttribute('width') || !image.hasAttribute('height')),
          );
        const values = [range.x, range.y, target.x, target.y];
        const prior = previous.split(':').map(Number);
        stable =
          previous !== '' &&
          values.every((value, index) => Math.abs(value - (prior[index] ?? Infinity)) <= 2)
            ? stable + 1
            : 0;
        previous = values.join(':');
        if (!pending || expired()) {
          const corrected =
            Math.abs(window.scrollX - target.x) > 2 || Math.abs(window.scrollY - target.y) > 2;
          if (corrected) {
            this.cancelJobPresentation(job, 'position-correction');
            if (!this.current(job)) return;
            window.scrollTo({ left: target.x, top: target.y, behavior: 'instant' });
          }
          if (
            (!notified || corrected) &&
            Math.abs(scrollX - target.x) <= 2 &&
            Math.abs(scrollY - target.y) <= 2
          ) {
            this.positionAccepted(job);
            notified = true;
            if (!this.current(job)) return;
            const after = this.range();
            if (
              Math.abs(scrollX - target.x) > 2 ||
              Math.abs(scrollY - target.y) > 2 ||
              Math.abs(after.x - range.x) > 2 ||
              Math.abs(after.y - range.y) > 2
            ) {
              stable = 0;
              previous = '';
              // TOCの巻き戻しが位置を動かしても、完了扱いにせず同じReading jobで補正する。
              if (!expired()) continue;
              const finalTarget = clampReadingPosition(target, after.x, after.y);
              window.scrollTo({ left: finalTarget.x, top: finalTarget.y, behavior: 'instant' });
            }
          }
          if (stable >= 2 || expired()) return;
        }
      }
    } finally {
      clearTimeout(readyTimer);
      readinessController.abort();
      job.controller.signal.removeEventListener('abort', abortReady);
    }
  }
  private restoreRawHistoryBeforePaint(job: ScrollJob): boolean {
    const outcome = (status: 'applied' | 'unavailable' | 'skipped'): boolean => {
      if (this.job === job) job.root.dataset['readingPositionPrepaint'] = status;
      return status === 'applied';
    };
    if (job.intent.cause !== 'traverse' || job.stateOnly || job.error || job.url.includes('#'))
      return outcome('skipped');
    outcome('unavailable');
    const receipt = job.receipt;
    const candidate = validateReadingPosition(job.candidate, job.url);
    if (
      receipt?.commitTiming !== 'synchronous' ||
      job.prepaintGeometryReady !== true ||
      !candidate ||
      !job.entryId ||
      document.visibilityState !== 'visible' ||
      !this.presentationCurrent(job) ||
      !ownsAcceptedHistoryCommit(job.root, job.intent, receipt)
    )
      return false;
    try {
      const range = this.range();
      const target = clampReadingPosition(candidate, range.x, range.y);
      // 仮clampを最初の位置が復元済みという証明にせず、通常jobへ候補を残す。
      if (target.x !== candidate.x || target.y !== candidate.y) return false;
      this.cancelJobPresentation(job, 'raw-position-apply');
      if (
        !this.presentationCurrent(job) ||
        !ownsAcceptedHistoryCommit(job.root, job.intent, receipt)
      )
        return false;
      if (Math.abs(scrollX - target.x) > 2 || Math.abs(scrollY - target.y) > 2)
        window.scrollTo({ left: target.x, top: target.y, behavior: 'instant' });
      if (
        !this.presentationCurrent(job) ||
        !ownsAcceptedHistoryCommit(job.root, job.intent, receipt) ||
        Math.abs(scrollX - target.x) > 2 ||
        Math.abs(scrollY - target.y) > 2
      )
        return false;
      return outcome('applied');
    } catch {
      // 先行適用の失敗はcandidateや通常のsettled復元を失わせない。
      return false;
    }
  }
  private restoreVerifiedHistoryBeforePaint(job: ScrollJob, rawApplied: boolean): void {
    // URLや移動方向で選別せず、復帰先entry自身の保存時の証跡と新DOMを照合する。
    if (job.intent.cause !== 'traverse') return;
    const outcome = (status: PresentationEligibility): void => {
      job.presentation = status;
      job.root.dataset['historyPresentationEligibility'] = status;
    };
    if (job.stateOnly || job.error) {
      outcome('skipped');
      return;
    }
    outcome('unavailable');
    if (!job.candidate || !job.entryId) return;
    try {
      if (document.visibilityState !== 'visible') return;
      const checkpoint = this.geometry.get(job.entryId);
      const receipt = job.receipt;
      // 受理証明は後からcurrentを読んで組み直さず、commit時の固定世代を使う。
      if (
        !receipt ||
        receipt.stateOnly ||
        receipt.entryId !== job.entryId ||
        receipt.url !== job.url ||
        receipt.intentId !== job.intent.intentId ||
        receipt.root !== job.root ||
        receipt.contentEpoch !== job.epoch ||
        receipt.shellCommitId !== job.shellCommitId ||
        !checkpoint ||
        !this.verifiedLayout ||
        checkpoint.position.url !== job.candidate.url ||
        checkpoint.position.x !== job.candidate.x ||
        checkpoint.position.y !== job.candidate.y ||
        !this.presentationCurrent(job) ||
        !matchesHistoryGeometry(job.root, checkpoint, this.verifiedLayout)
      )
        return;
      this.cancelJobPresentation(job, 'verified-position-apply');
      if (!this.presentationCurrent(job)) return;
      const corrected =
        Math.abs(scrollX - job.candidate.x) > 2 || Math.abs(scrollY - job.candidate.y) > 2;
      if (corrected)
        window.scrollTo({ left: job.candidate.x, top: job.candidate.y, behavior: 'instant' });
      if (
        (!rawApplied || corrected) &&
        Math.abs(scrollX - job.candidate.x) <= 2 &&
        Math.abs(scrollY - job.candidate.y) <= 2
      )
        this.positionAccepted(job);
      const anchor = readHistoryGeometryAnchor(job.root, checkpoint);
      if (
        !this.presentationCurrent(job) ||
        !anchor ||
        !job.root.contains(anchor) ||
        Math.abs(scrollX - job.candidate.x) > 2 ||
        Math.abs(scrollY - job.candidate.y) > 2 ||
        Math.abs(anchor.getBoundingClientRect().top - (checkpoint.anchorY - job.candidate.y)) > 2
      )
        return;
      // 同epochの実textと使用字体は幾何照合で読込済みと確認しており、保存開始時に再準備しない。
      if (job.root.ownerDocument.fonts.status === 'loaded') this.fontPreparationEpoch = job.epoch;
      outcome('ready');
      // UA効果とapp効果は重ねない。情報未提供でも座標の先行適用は妨げない。
      const visual = this.traverseVisual;
      if (visual?.entryId !== job.entryId || visual.url !== job.url || visual.active !== false)
        return;
      this.presentation.start({
        root: job.root,
        anchor,
        contentEpoch: job.epoch,
        shellCommitId: job.shellCommitId,
        intent: job.intent,
        entryId: job.entryId,
        url: job.url,
      });
    } catch {
      this.cancelJobPresentation(job, 'presentation-unavailable');
      if (this.job === job) outcome('unavailable');
    }
  }
  private presentationCurrent(job: ScrollJob): boolean {
    const context = readContentContext();
    return (
      this.current(job) &&
      context?.root === job.root &&
      !context.mutation &&
      context.displayedBinding.entryId === job.entryId &&
      context.displayedBinding.url === job.url &&
      context.addressBinding.entryId === job.entryId &&
      context.addressBinding.url === job.url &&
      readHistoryEntry()?.id === job.entryId
    );
  }
  private positionAccepted(job: ScrollJob): void {
    if (!this.current(job)) return;
    if (!job.receipt && job.intent.cause === 'initial')
      this.observeNativePosition(job.root, job.intent, 'initial-fragment', 'accepted');
    else this.positionSequence += 1;
    const sequence = this.positionSequence;
    const isCurrent = (): boolean => sequence === this.positionSequence && this.current(job);
    this.notifyPositionObserver(() => {
      this.onPositionAccepted({
        root: job.root,
        intent: job.intent,
        receipt: job.receipt,
        sequence,
        isCurrent,
      });
    });
  }
  private observeNativePosition(
    root: HTMLElement,
    intent: NavigationIntent,
    policy: NativeReadingPositionObservation['policy'],
    phase: NativeReadingPositionObservation['phase'],
  ): void {
    const context = readContentContext();
    if (context?.root !== root || context.mutation || context.recoveryRequired) return;
    const contentEpoch = context.contentEpoch;
    const shellCommitId = readCurrentShellCommitId();
    const entryId = readHistoryEntry()?.id ?? null;
    const url = readAddress();
    const sequence = ++this.positionSequence;
    const isCurrent = (): boolean => {
      const current = readContentContext();
      return (
        !this.disposed &&
        sequence === this.positionSequence &&
        !intent.signal.aborted &&
        root.isConnected &&
        root.ownerDocument === document &&
        document.getElementById('main-content') === root &&
        current?.root === root &&
        current.contentEpoch === contentEpoch &&
        !current.mutation &&
        !current.recoveryRequired &&
        current.intent?.intentId === intent.intentId &&
        readCurrentShellCommitId() === shellCommitId &&
        readAddress() === url &&
        (readHistoryEntry()?.id ?? null) === entryId &&
        current.displayedBinding.entryId === entryId &&
        current.displayedBinding.url === url &&
        current.addressBinding.entryId === entryId &&
        current.addressBinding.url === url
      );
    };
    this.notifyPositionObserver(() => {
      this.onNativeObservation({
        root,
        intent,
        contentEpoch,
        shellCommitId,
        entryId,
        url,
        sequence,
        policy,
        phase,
        isCurrent,
      });
    });
    // TOCの検証・巻戻しで実位置が変わっても、nativeへ独自補正せず実座標を採り直す。
    if (phase === 'accepted' && isCurrent()) this.sampleCurrent();
  }
  private notifyPositionObserver(notify: () => void): void {
    try {
      notify();
    } catch (error) {
      try {
        this.reportError(error);
      } catch {
        /* 観測先と診断先の例外を位置jobへ戻さない。 */
      }
    }
  }
  private cancelPresentation(reason: string): void {
    try {
      this.presentation.cancel(reason);
    } catch {
      /* 表示後始末の失敗で位置jobを停止しない。 */
    }
  }
  private cancelJobPresentation(job: ScrollJob, reason: string): void {
    if (this.job === job) this.cancelPresentation(reason);
  }
  private range(): { x: number; y: number } {
    const root = document.scrollingElement ?? document.documentElement;
    return {
      x: Math.max(0, root.scrollWidth - root.clientWidth),
      y: Math.max(0, root.scrollHeight - root.clientHeight),
    };
  }
  private sampleCurrent(capture = false): boolean {
    const context = readContentContext();
    if (
      this.restoring ||
      this.renderedError ||
      context?.mutation ||
      context?.recoveryRequired ||
      this.renderedUrl !== readAddress() ||
      this.renderedId !== (readHistoryEntry()?.id ?? null)
    )
      return false;
    this.sample = {
      version: 1,
      url: this.renderedUrl,
      x: Math.max(0, window.scrollX),
      y: Math.max(0, window.scrollY),
    };
    this.store.write(this.renderedId, this.sample);
    if (context?.root && context.contentEpoch !== this.fontPreparationEpoch) {
      this.fontPreparationEpoch = context.contentEpoch;
      const root = context.root;
      const epoch = context.contentEpoch;
      void prepareHistoryFonts(root, this.lifetime.signal).then((prepared) => {
        const current = readContentContext();
        if (
          prepared &&
          !this.disposed &&
          current?.root === root &&
          current.contentEpoch === epoch &&
          !current.mutation &&
          !current.recoveryRequired &&
          !this.restoring
        )
          this.sampleCurrent(true);
      });
    }
    if (
      this.renderedId &&
      this.verifiedLayout &&
      context?.root &&
      context.displayedBinding.entryId === this.renderedId &&
      context.displayedBinding.url === this.renderedUrl
    ) {
      if (
        capture &&
        context.root
          .getAnimations()
          .some(
            (animation) =>
              animation.id === 'rouault-history-content' && animation.playState !== 'finished',
          )
      )
        capture = false;
      if (capture) {
        const checkpoint = captureHistoryGeometry(context.root, this.sample, this.verifiedLayout, {
          entryId: this.renderedId,
          contentEpoch: context.contentEpoch,
        });
        if (checkpoint) this.rememberGeometry(this.renderedId, checkpoint);
        else this.geometry.delete(this.renderedId);
      } else {
        // passive scrollでは全DOM/fontを測らず、離脱直前か最後のscroll後に集約する。
        if (this.geometryTimer !== null) clearTimeout(this.geometryTimer);
        this.geometryTimer = window.setTimeout(() => {
          this.geometryTimer = null;
          this.sampleCurrent(true);
        }, 120);
      }
    }
    return true;
  }
  private rememberGeometry(entryId: string, checkpoint: HistoryGeometryCheckpoint): void {
    this.geometry.delete(entryId);
    this.geometry.set(entryId, checkpoint);
    // 座標台帳は保持し、大きな表示証跡だけを上限付きで保持する。
    if (this.geometry.size > 32) {
      const oldest = this.geometry.keys().next().value;
      if (oldest !== undefined) this.geometry.delete(oldest);
    }
  }
  private checkpoint(): void {
    if (this.restoring || readContentContext()?.recoveryRequired) return;
    if (this.renderedUrl === readAddress() && this.renderedId === (readHistoryEntry()?.id ?? null))
      this.sampleCurrent(true);
    else {
      // popstateではaddressが先に進むため、まだ表示中のbinding/epochを証明して離脱元を採る。
      const context = readContentContext();
      if (
        this.renderedId &&
        this.sample &&
        context?.root &&
        context.root.isConnected &&
        context.root.ownerDocument === document &&
        context.root.matches('main#main-content') &&
        document.getElementById('main-content') === context.root &&
        !context.mutation &&
        context.displayedBinding.entryId === this.renderedId &&
        context.displayedBinding.url === this.renderedUrl
      ) {
        // manualで旧本文を所有中は、scroll event未配信でも離脱直前の実座標を保存する。
        // autoではUAが既に移動した可能性があるため、最後の受理済みsampleを維持する。
        if (history.scrollRestoration === 'manual')
          this.sample = {
            version: 1,
            url: this.renderedUrl,
            x: Math.max(0, window.scrollX),
            y: Math.max(0, window.scrollY),
          };
        const checkpoint = this.verifiedLayout
          ? captureHistoryGeometry(context.root, this.sample, this.verifiedLayout, {
              entryId: this.renderedId,
              contentEpoch: context.contentEpoch,
            })
          : null;
        if (checkpoint) this.rememberGeometry(this.renderedId, checkpoint);
        else this.geometry.delete(this.renderedId);
      }
    }
    if (!this.renderedError && this.sample?.url === this.renderedUrl)
      this.store.write(this.renderedId, this.sample);
  }
  private intervene(): void {
    if (!this.job && !this.restoring && this.pendingIntent === null) return;
    this.interruptedIntent = readContentContext()?.intent?.intentId ?? -1;
    this.pendingIntent = null;
    this.cancel();
    this.candidate = null;
    this.candidateId = null;
    this.restoring = false;
    this.sampleCurrent();
  }
  private cancel(): void {
    this.positionSequence += 1;
    if (this.geometryTimer !== null) clearTimeout(this.geometryTimer);
    this.geometryTimer = null;
    this.cancelPresentation('position-job-cancelled');
    if (this.job) this.job.root.dataset['readingPositionStatus'] = 'cancelled';
    this.job?.controller.abort();
    this.job = null;
  }
  private mode(mode: ScrollRestoration): void {
    history.scrollRestoration = mode;
    this.ownedMode = mode;
  }
  dispose(): void {
    this.checkpoint();
    this.disposed = true;
    this.cancel();
    this.lifetime.abort();
    this.presentation.dispose();
    this.geometry.clear();
    for (const stop of this.stops) stop();
    this.stops = [];
    if (history.scrollRestoration === this.ownedMode) history.scrollRestoration = this.originalMode;
  }
}
