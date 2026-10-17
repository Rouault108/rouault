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
  ReadingPositionStore,
  type ReadingPosition,
} from '../navigation/reading-position-store.js';
import { readDecodedHash } from '../navigation/primary-tab-url-state.js';
import { readCurrentShellCommitId } from '../shell/app-shell-lifecycle.js';
import { readContentTransitionShell } from '../../../router/content-transition-shell.js';
import type { AppShellValidatedDetail } from '../shell/app-shell-events.js';
import { HistoryPresentationCoordinator } from './history-presentation-coordinator.js';
import {
  captureHistoryGeometry,
  isHistoryPresentationVerificationPair,
  matchesHistoryGeometry,
  type HistoryGeometryCheckpoint,
} from './history-presentation-geometry.js';

interface ScrollJob {
  readonly intent: NavigationIntent;
  readonly epoch: number;
  readonly root: HTMLElement;
  readonly controller: AbortController;
  readonly shellCommitId: number;
  readonly stateOnly: boolean;
  readonly error: boolean;
  readonly entryId: string | null;
  readonly previousUrl: string | undefined;
  candidate: ReadingPosition | null;
  url: string;
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
  private interruptedIntent = -1;
  private pendingIntent: number | null = null;
  private originalMode: ScrollRestoration = history.scrollRestoration;
  private ownedMode: ScrollRestoration | null = null;
  private stops: (() => void)[] = [];
  private readonly presentation = new HistoryPresentationCoordinator();
  private readonly geometry = new Map<string, HistoryGeometryCheckpoint>();
  private verifiedLayout: string | null = null;
  private previousLayout: string | null = null;
  private traverseVisual: { entryId: string | null; url: string; active: boolean | null } | null =
    null;
  constructor(private readonly reportError: (error: unknown) => void) {}

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
        this.previousLayout = this.verifiedLayout;
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
        this.previousLayout = null;
        this.verifiedLayout = null;
      },
      { signal },
    );
    window.addEventListener(
      'popstate',
      (event) => {
        // UA自身の演出が不明な環境も、この限定実験では対象にしない。
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
        const entry = adoptHistoryEntry();
        const url = readAddress();
        const matches =
          context?.displayedBinding.entryId === (entry?.id ?? null) &&
          context.displayedBinding.url === url;
        adoptContentBinding(url, entry?.id ?? null);
        this.renderedId = entry?.id ?? null;
        this.renderedUrl = url;
        this.restoring = false;
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
          this.sampleCurrent();
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
        if (reason === 'mutation') {
          this.checkpoint();
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
      const adopt = (): void => {
        if (intent.signal.aborted || this.disposed) return;
        requestAnimationFrame(() => {
          if (intent.signal.aborted || this.disposed) return;
          this.restoring = false;
          this.sampleCurrent();
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
  }): void {
    if (this.disposed || options.intent.signal.aborted) return;
    this.cancel();
    delete options.root.dataset['historyPresentationEligibility'];
    const context = readContentContext();
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
      previousUrl: options.previousUrl,
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
    this.pendingIntent = null;
    this.cancel();
    this.candidate = null;
    this.candidateId = null;
    this.restoring = false;
    this.renderedId = readHistoryEntry()?.id ?? null;
    this.renderedUrl = readAddress();
    this.mode('auto');
    const intent = readContentContext()?.intent;
    const generation = ++this.nativeGeneration;
    requestAnimationFrame(() => {
      if (this.disposed || generation !== this.nativeGeneration || intent?.signal.aborted) return;
      this.sampleCurrent();
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
    if (context?.intent?.intentId !== intentId) return;
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
      job.root.isConnected &&
      (readHistoryEntry()?.id ?? null) === this.renderedId &&
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
      this.restoreVerifiedHistoryBeforePaint(job);
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
      )
        window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
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
            const style = getComputedStyle(element);
            target = {
              version: 1,
              url: job.url,
              x: 0,
              y: Math.max(
                0,
                element.getBoundingClientRect().top +
                  window.scrollY -
                  (parseFloat(style.scrollMarginTop) || 0),
              ),
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
          if (Math.abs(window.scrollX - target.x) > 2 || Math.abs(window.scrollY - target.y) > 2) {
            this.cancelJobPresentation(job, 'position-correction');
            if (!this.current(job)) return;
            window.scrollTo({ left: target.x, top: target.y, behavior: 'instant' });
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
  private restoreVerifiedHistoryBeforePaint(job: ScrollJob): void {
    // この同期経路は一つの検証済みpairだけ。settledや候補の寿命を短縮しない。
    if (
      job.intent.cause !== 'traverse' ||
      job.stateOnly ||
      job.error ||
      !job.candidate ||
      !job.entryId ||
      !job.previousUrl ||
      !isHistoryPresentationVerificationPair(job.previousUrl, job.url)
    )
      return;
    job.root.dataset['historyPresentationEligibility'] = 'unavailable';
    try {
      if (document.visibilityState !== 'visible') return;
      const checkpoint = this.geometry.get(job.entryId);
      const visual = this.traverseVisual;
      if (
        !checkpoint ||
        !this.verifiedLayout ||
        this.previousLayout !== this.verifiedLayout ||
        visual?.entryId !== job.entryId ||
        visual.url !== job.url ||
        visual.active !== false ||
        checkpoint.position.url !== job.candidate.url ||
        checkpoint.position.x !== job.candidate.x ||
        checkpoint.position.y !== job.candidate.y ||
        !this.presentationCurrent(job) ||
        !matchesHistoryGeometry(job.root, checkpoint, this.verifiedLayout)
      )
        return;
      this.cancelJobPresentation(job, 'verified-position-apply');
      if (!this.presentationCurrent(job)) return;
      window.scrollTo({ left: job.candidate.x, top: job.candidate.y, behavior: 'instant' });
      const anchor = document.getElementById(checkpoint.anchorId);
      if (
        !this.presentationCurrent(job) ||
        !anchor ||
        !job.root.contains(anchor) ||
        Math.abs(scrollX - job.candidate.x) > 2 ||
        Math.abs(scrollY - job.candidate.y) > 2 ||
        Math.abs(anchor.getBoundingClientRect().top - (checkpoint.anchorY - job.candidate.y)) > 2
      )
        return;
      job.root.dataset['historyPresentationEligibility'] = 'ready';
      this.presentation.start({
        root: job.root,
        contentEpoch: job.epoch,
        shellCommitId: job.shellCommitId,
        intent: job.intent,
        entryId: job.entryId,
        url: job.url,
      });
    } catch {
      // 表示試行の例外を受理済みtransactionや既存の安定化へ伝播させない。
      this.cancelJobPresentation(job, 'presentation-unavailable');
      if (this.job === job) job.root.dataset['historyPresentationEligibility'] = 'unavailable';
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
  private sampleCurrent(): void {
    const context = readContentContext();
    if (
      this.restoring ||
      this.renderedError ||
      context?.mutation ||
      this.renderedUrl !== readAddress() ||
      this.renderedId !== (readHistoryEntry()?.id ?? null)
    )
      return;
    this.sample = {
      version: 1,
      url: this.renderedUrl,
      x: Math.max(0, window.scrollX),
      y: Math.max(0, window.scrollY),
    };
    this.store.write(this.renderedId, this.sample);
    if (
      this.renderedId &&
      this.verifiedLayout &&
      context?.root &&
      context.displayedBinding.entryId === this.renderedId &&
      context.displayedBinding.url === this.renderedUrl
    ) {
      try {
        const checkpoint = captureHistoryGeometry(context.root, this.sample, this.verifiedLayout);
        if (checkpoint) this.geometry.set(this.renderedId, checkpoint);
      } catch {
        /* 未証明の幾何は通常復元だけへ渡す。保存candidateは変更しない。 */
      }
    }
  }
  private checkpoint(): void {
    if (this.restoring) return;
    if (this.renderedUrl === readAddress()) this.sampleCurrent();
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
    for (const stop of this.stops) stop();
    this.stops = [];
    if (history.scrollRestoration === this.ownedMode) history.scrollRestoration = this.originalMode;
  }
}
