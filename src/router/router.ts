import {
  adoptContentBinding,
  markContentRecoveryRequired,
  readContentContext,
  beginNavigationIntent,
  adoptNativeNavigationIntent,
  isNavigationIntentCurrent,
  subscribeContentContext,
  type NavigationIntent,
} from '../navigation/content-navigation-context.js';
import {
  readAddress,
  readHistoryEntry,
  type BrowserAddressChange,
} from '../navigation/history-entry.js';
import { readCurrentShellCommitId } from '../components/app/shell/app-shell-lifecycle.js';
import { ContentCommitter, createNavigationCommitReceipt } from './content-committer.js';
import { ContentTransitionCoordinator } from './content-transition-coordinator.js';
import { createRouterRuntime } from './create-router-runtime.js';
import { DocumentLoader } from './document-loader.js';
import { LocationAdapter } from './location-adapter.js';
import { NavigationQueue, type QueuedNavigationRequest } from './navigation-queue.js';
import { RouteRegistry } from './route-registry.js';
import { RouterEventBus } from './router-event-bus.js';
import type { NavigationEnvelope } from '../../shared/navigation/navigation-envelope.js';
import { stripAsciiControlCharacters } from '../../shared/string/ascii-control.js';
import type {
  BeforeNavigateContext,
  BeforeNavigateHook,
  NavigateRequest,
  HistoryMode,
  NavigationResult,
  NavigationCommitReceipt,
  NavigationCompletedResult,
  RouterEventMap,
  RouterOptions,
  RouterRuntimeUrlDependencies,
} from './router-types.js';
import {
  RouterDestroyedError,
  RouterNotStartedError,
  RouterOwnershipError,
} from './router-types.js';
import type { RouterDiagnosticPayload } from './router-diagnostics.js';
import type { InternalDocumentNormalizedUrl } from './internal-document-normalized-url.js';
import { validateInternalDocumentNavigationRequest } from './validate-internal-document-navigation-request.js';

export type {
  BeforeNavigateContext,
  BeforeNavigateHook,
  ContentUpdateAdapter,
  ContentUpdatePayload,
  DocumentRouteContext,
  DocumentRouteHandler,
  PayloadDocumentShellSnapshot,
  RuntimeDocumentShellSnapshot,
  RuntimeSidebarShellSnapshot,
  PresentSidebarShellProjection,
  AbsentRuntimeSidebarShellProjection,
  LoadDocumentResult,
  HistoryMode,
  NavigateRequest,
  RouterDocumentRenderSnapshot,
  RouterHydrationPlan,
  NavigationErrorReason,
  NavigationIssue,
  NavigationCommitReceipt,
  NavigationResult,
  NavigationOutcome,
  PreparedContentUpdate,
  PreparedShellUpdate,
  RoutePattern,
  RouterEventMap,
  RouterOptions,
  RouterRuntimeUrlDependencies,
  ShellAdapter,
  ShellUpdatePayload,
  StrictLoadedNavigationEnvelope,
  UrlStateNavigationDecision,
} from './router-types.js';
export type { PostCommitController, UrlStateNavigationPolicy } from './router-types.js';
export type { NavigationEnvelope } from '../../shared/navigation/navigation-envelope.js';
export type { RouterDiagnosticPayload, RouterDiagnosticReason } from './router-diagnostics.js';
export {
  RouterDestroyedError,
  RouterNotStartedError,
  RouterOwnershipError,
} from './router-types.js';
export type { UrlPolicy } from './url-policy.js';

const LIVE_ROUTER_OWNERS = new WeakMap<Document, Router>();

type NormalizedNavigationRequest = QueuedNavigationRequest;

const isSignalAborted = (signal: AbortSignal): boolean => signal.aborted;

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

export class Router {
  private readonly outlet: HTMLElement;
  private readonly options: RouterOptions;
  private readonly eventBus: RouterEventBus;
  private readonly location: LocationAdapter;
  private readonly routeRegistry: RouteRegistry;
  private readonly loader: DocumentLoader;
  private readonly committer: ContentCommitter;
  private readonly beforeNavigateHooks = new Set<BeforeNavigateHook>();
  private readonly linkInterceptor: import('./browser-link-interceptor.js').RouterLinkInterceptor;
  private readonly queue: NavigationQueue;
  private readonly transitions: ContentTransitionCoordinator;
  private previousRenderedKind: NavigationResult['renderedKind'] = null;
  private readonly urlDependencies: RouterRuntimeUrlDependencies;
  private started = false;
  private destroyed = false;
  private isBusy = false;
  private currentUrl = '';
  private hasCommittedNavigation = false;
  private recoveryReceipt: NavigationCommitReceipt | null = null;
  private stopContextObserver: (() => void) | null = null;

  constructor(
    outlet: HTMLElement,
    urlDependencies: RouterRuntimeUrlDependencies,
    options?: RouterOptions,
  ) {
    const currentOwner = LIVE_ROUTER_OWNERS.get(document);
    if (currentOwner && !currentOwner.destroyed) {
      throw new RouterOwnershipError('document ごとに live Router は 1 つだけです。');
    }

    LIVE_ROUTER_OWNERS.set(document, this);
    this.outlet = outlet;
    this.transitions = new ContentTransitionCoordinator(outlet);
    this.urlDependencies = urlDependencies;
    this.options = options ?? {};

    const runtime = createRouterRuntime({
      outlet: this.outlet,
      options: this.options,
      urlDependencies,
      adoptSameDocumentAddress: (change) => {
        this.adoptSameDocumentAddress(change);
      },
      getCurrentUrl: () => this.currentUrl,
      requestNavigation: async (request) => this.navigate(request),
      runNavigation: async (request, signal) => this.runNavigation(request, signal),
      createSupersededResult: (request) => this.createSupersededResult(request),
      reportDiagnostic: (diagnostic) => {
        this.eventBus.emit('diagnostic', diagnostic);
      },
    });

    this.eventBus = runtime.eventBus;
    this.location = runtime.location;
    this.routeRegistry = runtime.routeRegistry;
    this.loader = runtime.loader;
    this.committer = runtime.committer;
    this.linkInterceptor = runtime.linkInterceptor;
    this.queue = runtime.queue;
    this.currentUrl = this.location.readCurrentUrl();
    this.stopContextObserver = subscribeContentContext((reason, owner) => {
      if (reason === 'intent') this.transitions.skip();
      if (reason === 'intent' && owner !== 'router') this.queue.cancelPending();
      if (reason === 'feature') this.currentUrl = this.location.readCurrentUrl();
    });
  }

  async start(): Promise<NavigationResult | null> {
    if (this.destroyed || this.started) {
      return null;
    }

    this.started = true;
    this.linkInterceptor.attach();

    if (this.options.skipInitialNavigation === true) {
      return null;
    }

    return this.navigate({
      url: this.currentUrl,
      historyMode: 'none',
      cause: 'initial',
    });
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.started = false;
    this.linkInterceptor.detach();
    this.beforeNavigateHooks.clear();
    this.eventBus.clear();
    this.queue.dispose();
    this.transitions.dispose();
    this.stopContextObserver?.();

    if (LIVE_ROUTER_OWNERS.get(document) === this) {
      LIVE_ROUTER_OWNERS.delete(document);
    }
  }

  on<K extends keyof RouterEventMap>(
    event: K,
    callback: (payload: RouterEventMap[K]) => void,
  ): void {
    this.eventBus.on(event, callback);
  }

  off<K extends keyof RouterEventMap>(
    event: K,
    callback: (payload: RouterEventMap[K]) => void,
  ): void {
    this.eventBus.off(event, callback);
  }

  isNavigating(): boolean {
    return this.isBusy;
  }

  addBeforeNavigateHook(hook: BeforeNavigateHook): void {
    this.beforeNavigateHooks.add(hook);
  }

  removeBeforeNavigateHook(hook: BeforeNavigateHook): void {
    this.beforeNavigateHooks.delete(hook);
  }

  addDocumentRoute(pattern: string | RegExp, handler: Parameters<RouteRegistry['add']>[1]): void {
    if (this.destroyed) {
      throw new RouterDestroyedError('destroy() 後は route を追加できません。');
    }

    this.routeRegistry.add(pattern, handler);
  }

  getSearchParams(): URLSearchParams {
    return new URLSearchParams(this.location.getSearchParams(this.currentUrl));
  }

  getCurrentPath(): string {
    return this.location.getPath(this.currentUrl);
  }

  private getCurrentAbsoluteUrl(): string {
    return new URL(
      this.currentUrl || this.location.readCurrentUrl(),
      `${this.urlDependencies.siteUrlContext.siteOrigin}${this.urlDependencies.siteUrlContext.basePath}/`,
    ).toString();
  }

  async navigate(request: NavigateRequest): Promise<NavigationResult> {
    this.transitions.skip();
    const historyMode = request.historyMode ?? 'push';
    if (this.destroyed) {
      return this.createLifecycleFailureResult(
        historyMode,
        new RouterDestroyedError('destroy() 済みの Router です。'),
        'destroyed',
      );
    }

    if (!this.started) {
      return this.createLifecycleFailureResult(
        historyMode,
        new RouterNotStartedError('start() 前の Router です。'),
        'not-started',
      );
    }

    const validation = validateInternalDocumentNavigationRequest({
      requestedUrl: request.url,
      currentUrl: this.getCurrentAbsoluteUrl(),
      siteUrlContext: this.urlDependencies.siteUrlContext,
      routeManifestState: this.urlDependencies.routeManifestState,
    });

    if (!validation.ok) {
      const reason = validation.reason;
      return this.createValidationFailureResult(reason, historyMode);
    }

    const normalized = this.normalizeValidatedRequest(
      request,
      validation.normalizedUrl,
      validation.routePresence,
      historyMode,
    );
    const result = await this.queue.enqueue(normalized);
    if (normalized.intent) {
      try {
        this.eventBus.emit('navigation:terminal', { result, intentId: normalized.intent.intentId });
      } catch (error) {
        if (!result.committed && !('recoveryRequired' in result && result.recoveryRequired))
          throw error;
        result.degraded = true;
        result.issues.push({
          code: 'post-commit-failed',
          error: this.normalizeAcceptedError(error),
        });
      }
    }
    return result;
  }

  private normalizeValidatedRequest(
    request: NavigateRequest,
    normalizedUrl: InternalDocumentNormalizedUrl,
    routePresence: import('./router-types.js').InternalDocumentRoutePresence,
    historyMode: HistoryMode,
  ): NormalizedNavigationRequest {
    return {
      requestedUrl: request.url,
      normalizedUrl,
      historyMode,
      routePresence,
      state: request.state,
      intent: beginNavigationIntent(
        request.cause ?? 'navigation',
        request.cause === 'traverse' || historyMode === 'none' ? readAddress() : normalizedUrl,
      ),
    };
  }

  private async runNavigation(
    request: NormalizedNavigationRequest,
    externalSignal: AbortSignal,
  ): Promise<NavigationResult> {
    const beforeNavigateResult = await this.runBeforeNavigateHooks(request);
    if (beforeNavigateResult) {
      return beforeNavigateResult;
    }

    if (request.intent && !isNavigationIntentCurrent(request.intent))
      return this.createSupersededResult(request);
    const currentUrl = this.currentUrl;
    if (this.recoveryReceipt || readContentContext()?.recoveryRequired)
      return this.delegateRecoveryNavigation(request, externalSignal);
    const statePolicy = this.options.urlStateNavigationPolicy;
    const stateDecision = statePolicy
      ? await statePolicy.evaluate({
          ...(request.intent ? { cause: request.intent.cause } : {}),
          currentUrl,
          requestedUrl: request.requestedUrl,
          normalizedUrl: request.normalizedUrl,
          historyMode: request.historyMode,
          outlet: this.outlet,
        })
      : { kind: 'full' as const };

    if (
      isSignalAborted(externalSignal) ||
      (request.intent && !isNavigationIntentCurrent(request.intent))
    )
      return this.createSupersededResult(request);
    if (stateDecision.kind === 'state-only') {
      const result = await this.runStateOnlyNavigation(request, currentUrl);
      this.notifyNavigationResult(result);
      return result;
    }

    this.setBusy(true);

    let timeoutId: number | null = null;
    const executionController = new AbortController();
    const onExecutionAbort = (): void => {
      this.transitions.skip();
    };
    executionController.signal.addEventListener('abort', onExecutionAbort, { once: true });
    const onExternalAbort = () => {
      executionController.abort();
    };
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    request.intent?.signal.addEventListener('abort', onExternalAbort, { once: true });

    const timeoutMs = this.options.navigationTimeoutMs ?? null;
    if (typeof timeoutMs === 'number' && timeoutMs > 0) {
      timeoutId = window.setTimeout(() => {
        executionController.abort();
      }, timeoutMs);
    }

    try {
      const loadResult = await this.loader.load(
        request.normalizedUrl,
        executionController.signal,
        request.routePresence,
      );

      if (
        isSignalAborted(externalSignal) ||
        (request.intent && !isNavigationIntentCurrent(request.intent))
      ) {
        return this.createSupersededResult(request);
      }

      if (loadResult.source === 'document-navigation-fallback') {
        if (this.canUseDocumentNavigationFallback(request, currentUrl)) {
          document.dispatchEvent(new Event('reading-position:document-fallback'));
          this.location.navigateDocument(request.normalizedUrl, request.historyMode);
          const result = this.createDocumentNavigationFallbackResult(
            request,
            loadResult.reason,
            loadResult.error,
          );
          this.notifyNavigationResult(result);
          return result;
        }

        const errorFallbackResult = this.loader.createExceptionResult(loadResult.error);
        const loadError = errorFallbackResult.error;
        const loadErrorReason = errorFallbackResult.errorReason;
        const durableCommitResult = await this.commitLoadedSnapshot(
          request,
          currentUrl,
          errorFallbackResult.envelope,
          loadResult.error,
          loadErrorReason,
          executionController.signal,
        );
        const finalResult: NavigationResult =
          durableCommitResult.outcome !== 'completed'
            ? {
                ...durableCommitResult,
                source: errorFallbackResult.source,
              }
            : {
                ...durableCommitResult,
                source: errorFallbackResult.source,
                error: loadError ?? loadResult.error,
                errorReason: loadErrorReason,
              };

        this.reportLoadError(finalResult, finalResult.error ?? loadResult.error);
        this.notifyNavigationResult(finalResult);
        return finalResult;
      }

      const durableCommitResult = await this.commitLoadedSnapshot(
        request,
        currentUrl,
        loadResult.envelope,
        undefined,
        undefined,
        executionController.signal,
      );

      const loadError = loadResult.source === 'error-fallback' ? loadResult.error : undefined;
      const loadErrorReason =
        loadResult.source === 'error-fallback' ? loadResult.errorReason : undefined;

      const finalResult: NavigationResult =
        durableCommitResult.outcome !== 'completed'
          ? {
              ...durableCommitResult,
              source: loadResult.source,
            }
          : {
              ...durableCommitResult,
              source: loadResult.source,
              error: loadError,
              errorReason:
                loadResult.envelope.document.renderedKind === 'error'
                  ? loadErrorReason
                  : durableCommitResult.errorReason,
            };

      this.notifyNavigationResult(finalResult);
      return finalResult;
    } catch (error) {
      if (
        isSignalAborted(externalSignal) ||
        (request.intent && !isNavigationIntentCurrent(request.intent)) ||
        (executionController.signal.aborted && isAbortError(error))
      ) {
        const result = this.createSupersededResult(request);
        this.notifyNavigationResult(result);
        return result;
      }

      const loadResult = this.loader.createExceptionResult(error);
      const loadError = loadResult.error;
      const loadErrorReason = loadResult.errorReason;

      const durableCommitResult = await this.commitLoadedSnapshot(
        request,
        currentUrl,
        loadResult.envelope,
        error instanceof Error ? error : undefined,
        loadErrorReason,
        executionController.signal,
      );

      const finalResult: NavigationResult =
        durableCommitResult.outcome !== 'completed'
          ? {
              ...durableCommitResult,
              source: loadResult.source,
            }
          : {
              ...durableCommitResult,
              source: loadResult.source,
              error: loadError ?? (error instanceof Error ? error : undefined),
              errorReason: loadErrorReason,
            };

      this.reportLoadError(finalResult, finalResult.error ?? new Error('navigation failed'));
      this.notifyNavigationResult(finalResult);
      return finalResult;
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      executionController.signal.removeEventListener('abort', onExecutionAbort);
      externalSignal.removeEventListener('abort', onExternalAbort);
      request.intent?.signal.removeEventListener('abort', onExternalAbort);
      this.setBusy(false);
    }
  }

  private isKnownNavigationRoute(url: string): boolean {
    const result = validateInternalDocumentNavigationRequest({
      requestedUrl: url,
      currentUrl: this.getCurrentAbsoluteUrl(),
      siteUrlContext: this.urlDependencies.siteUrlContext,
      routeManifestState: this.urlDependencies.routeManifestState,
    });
    return result.ok && result.routePresence === 'known-route';
  }

  private async commitLoadedSnapshot(
    request: NormalizedNavigationRequest,
    previousUrl: string,
    envelope: NavigationEnvelope,
    baseError?: Error,
    baseErrorReason?: import('./router-types.js').NavigationLoadFailureReason,
    signal?: AbortSignal,
  ): Promise<
    | import('./router-types.js').NavigationCompletedResult
    | import('./router-types.js').NavigationLoadFailureResult
    | import('./router-types.js').NavigationSupersededResult
  > {
    const canCommit = (): boolean =>
      !this.destroyed &&
      !signal?.aborted &&
      (!request.intent || isNavigationIntentCurrent(request.intent));
    if (!canCommit()) return this.createCommitSupersededResult(request);
    let incoming: import('./router-types.js').PreparedIncomingContent | null = null;
    const disposeIncoming = (): void => {
      try {
        incoming?.dispose();
      } catch {
        // 任意証跡の解放失敗を文書transactionへ伝播させない。
      }
    };
    try {
      incoming = await this.committer.prepareIncoming(envelope, request.normalizedUrl, {
        signal: signal ?? request.intent?.signal ?? new AbortController().signal,
        isCurrent: canCommit,
        ...(request.intent ? { intent: request.intent } : {}),
      });
    } catch {
      // 事前証跡の失敗は文書transactionの失敗にせず、通常commitへ縮退する。
    }
    if (!canCommit()) {
      disposeIncoming();
      return this.createCommitSupersededResult(request);
    }
    const eligible =
      request.intent?.cause === 'navigation' &&
      request.routePresence === 'known-route' &&
      this.isKnownNavigationRoute(previousUrl) &&
      !request.normalizedUrl.includes('#') &&
      !previousUrl.includes('#') &&
      envelope.document.renderedKind === 'page' &&
      this.previousRenderedKind !== 'error' &&
      this.previousRenderedKind !== 'not-found' &&
      !this.outlet.querySelector('[data-not-found-page], [data-not-found-fallback], .error-page');
    try {
      return await this.transitions.run(envelope.shell, request.intent, eligible, async () => {
        if (!canCommit()) return this.createCommitSupersededResult(request);
        let lifetime: import('./content-committer.js').CommittedContentLifetime;
        try {
          lifetime = await this.committer.commit({
            envelope,
            normalizedUrl: request.normalizedUrl,
            historyMode: request.historyMode,
            state: request.state,
            ...(signal ? { signal } : {}),
            ...(request.intent ? { intent: request.intent } : {}),
            ...(incoming ? { incoming } : {}),
          });
        } catch (error) {
          // prepare失敗はrollback通知を出さないため、更新前の失敗でも演出を止める。
          this.transitions.skip();
          if (!canCommit()) return this.createCommitSupersededResult(request);
          const normalizedError = error instanceof Error ? error : new Error(String(error));
          this.eventBus.emit('error', {
            error: normalizedError,
            stage: 'commit',
            diagnostic: this.createRouterDiagnostic('route-state-mismatch', request.normalizedUrl),
          });

          return {
            kind: 'load-failure',
            outcome: 'failed',
            reason: 'unexpected',
            normalizedUrl: request.normalizedUrl,
            historyMode: request.historyMode,
            stateOnly: false,
            committed: false,
            degraded: false,
            issues: [],
            source: 'none',
            renderedKind: null,
            error: normalizedError,
            errorReason: 'unexpected',
          };
        }

        const receipt = lifetime.receipt;
        const result: NavigationCompletedResult = {
          kind: 'completed',
          outcome: 'completed',
          normalizedUrl: request.normalizedUrl,
          historyMode: request.historyMode,
          stateOnly: false,
          committed: true,
          degraded: false,
          issues: [],
          source: 'none',
          renderedKind: envelope.document.renderedKind,
          contentEpoch: lifetime.contentEpoch,
          shellCommitId: lifetime.shellCommitId,
          receipt,
          error: envelope.document.renderedKind === 'error' ? baseError : undefined,
          errorReason: envelope.document.renderedKind === 'error' ? baseErrorReason : undefined,
        };
        // 受理したentryを固定し、observerによって進んだ現在addressで旧本文を採用しない。
        try {
          this.adoptAcceptedBinding(receipt);
        } catch (error) {
          this.transitions.skip();
          this.requireBindingRecovery(receipt);
          return {
            ...result,
            recoveryRequired: true,
            degraded: true,
            issues: [
              { code: 'binding-adoption-failed', error: this.normalizeAcceptedError(error) },
            ],
          };
        }
        try {
          incoming?.accepted?.(receipt);
        } catch {
          // 任意の証跡採用は受理済み文書を再commit・rollbackさせない。
        }
        this.currentUrl = request.normalizedUrl;
        this.previousRenderedKind = envelope.document.renderedKind;
        const isInitial = !this.hasCommittedNavigation;
        this.hasCommittedNavigation = true;
        if (lifetime.postAcceptanceError) {
          this.transitions.skip();
          result.degraded = true;
          result.issues.push({
            code: 'accepted-commit-failed',
            error: lifetime.postAcceptanceError,
          });
        }
        try {
          this.eventBus.emit('content:load', {
            previousUrl,
            url: request.normalizedUrl,
            isInitial,
          });
        } catch (error) {
          result.degraded = true;
          result.issues.push({
            code: 'post-commit-failed',
            error: this.normalizeAcceptedError(error),
          });
          this.transitions.skip();
        }
        // 通知observerの故障で、受理済み本文の位置jobや保存再開まで失わない。
        if (canCommit()) {
          try {
            await this.runPostCommit(
              previousUrl,
              request.normalizedUrl,
              isInitial,
              envelope.document.renderedKind,
              false,
              result,
              request.intent,
            );
          } catch (error) {
            result.degraded = true;
            result.issues.push({
              code: 'post-commit-failed',
              error: this.normalizeAcceptedError(error),
            });
            this.transitions.skip();
          }
        }
        return result;
      });
    } finally {
      disposeIncoming();
    }
  }

  private async runPostCommit(
    previousUrl: string,
    normalizedUrl: string,
    isInitial: boolean,
    renderedKind: NavigationResult['renderedKind'],
    stateOnly: boolean,
    result: NavigationResult,
    intent?: NavigationIntent,
  ): Promise<void> {
    const controller = this.options.postCommitController;
    if (!controller || !intent || !isNavigationIntentCurrent(intent)) {
      return;
    }

    try {
      await controller.run({
        outlet: this.outlet,
        previousUrl,
        url: normalizedUrl,
        isInitial,
        stateOnly,
        renderedKind,
        intent,
        ...('receipt' in result ? { receipt: result.receipt } : {}),
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      result.degraded = true;
      result.issues.push({
        code: 'post-commit-failed',
        error: normalizedError,
        diagnostic: this.createRouterDiagnostic('post-commit-handler-failed', 'post-commit'),
      });
      this.eventBus.emit('error', {
        error: normalizedError,
        stage: 'post-commit',
        diagnostic: this.createRouterDiagnostic('post-commit-handler-failed', 'post-commit'),
      });
    }
  }

  private async runStateOnlyNavigation(
    request: NormalizedNavigationRequest,
    previousUrl: string,
  ): Promise<NavigationResult> {
    const checkCurrent = (): void => {
      if (request.intent && !isNavigationIntentCurrent(request.intent))
        throw new DOMException('superseded', 'AbortError');
    };
    const accepted: { receipt: NavigationCommitReceipt | null } = { receipt: null };
    const accept = (): void => {
      const context = readContentContext();
      accepted.receipt = createNavigationCommitReceipt({
        intentId: request.intent?.intentId ?? null,
        entryId: readHistoryEntry()?.id ?? null,
        url: readAddress(),
        contentEpoch: context?.contentEpoch ?? 0,
        root: context?.root ?? this.outlet,
        shellCommitId: readCurrentShellCommitId(),
        stateOnly: true,
      });
    };
    let acceptedError: Error | undefined;
    try {
      checkCurrent();
      if (request.historyMode === 'push')
        this.location.push(request.normalizedUrl, request.state, accept, checkCurrent);
      else if (request.historyMode === 'replace')
        this.location.replace(request.normalizedUrl, request.state, accept, checkCurrent);
      else {
        if (
          this.location.normalizeInternalDocumentUrl(readAddress()) !== request.normalizedUrl ||
          (request.intent &&
            (request.intent.target.url !== readAddress() ||
              request.intent.target.entryId !== (readHistoryEntry()?.id ?? null)))
        )
          throw new DOMException('history target changed', 'AbortError');
        accept();
      }
    } catch (error) {
      if (!accepted.receipt) {
        if (request.intent && !isNavigationIntentCurrent(request.intent))
          return this.createCommitSupersededResult(request);
        throw error;
      }
      acceptedError = this.normalizeAcceptedError(error);
    }
    const receipt = accepted.receipt;
    if (!receipt) throw new Error('state-only navigation was not accepted');
    const result: NavigationCompletedResult = {
      kind: 'completed',
      outcome: 'completed',
      normalizedUrl: request.normalizedUrl,
      historyMode: request.historyMode,
      stateOnly: true,
      committed: true,
      degraded: acceptedError !== undefined,
      issues: acceptedError ? [{ code: 'accepted-commit-failed', error: acceptedError }] : [],
      source: 'state-only',
      renderedKind: null,
      receipt,
    };
    // 同epochの後続featureが既に新bindingを採用した場合、その成果を旧受理で上書きしない。
    if (request.intent && !isNavigationIntentCurrent(request.intent)) return result;
    try {
      this.adoptAcceptedBinding(receipt);
    } catch (error) {
      this.requireBindingRecovery(receipt);
      return {
        ...result,
        recoveryRequired: true,
        degraded: true,
        issues: [{ code: 'binding-adoption-failed', error: this.normalizeAcceptedError(error) }],
      };
    }
    this.currentUrl = request.normalizedUrl;
    const isInitial = !this.hasCommittedNavigation;
    this.hasCommittedNavigation = true;
    try {
      if (request.intent && !isNavigationIntentCurrent(request.intent)) return result;
      this.eventBus.emit('ui-url-state-change', { previousUrl, url: request.normalizedUrl });
    } catch (error) {
      result.degraded = true;
      result.issues.push({ code: 'post-commit-failed', error: this.normalizeAcceptedError(error) });
    }
    try {
      await this.runPostCommit(
        previousUrl,
        request.normalizedUrl,
        isInitial,
        null,
        true,
        result,
        request.intent,
      );
    } catch (error) {
      result.degraded = true;
      result.issues.push({ code: 'post-commit-failed', error: this.normalizeAcceptedError(error) });
    }
    return result;
  }

  private adoptAcceptedBinding(receipt: NavigationCommitReceipt): void {
    const addressIsCurrent = (): boolean =>
      receipt.root.isConnected &&
      readCurrentShellCommitId() === receipt.shellCommitId &&
      readAddress() === receipt.url &&
      (readHistoryEntry()?.id ?? null) === receipt.entryId;
    // 旧受理の採用を試してから検査すると、新しい本文contextのbindingまで書き換えてしまう。
    // intentだけの変化は本文寿命を変えないが、root/epoch/shell/entryの変化は採用前に拒否する。
    if (!addressIsCurrent())
      throw new Error('accepted content owner changed before binding adoption');
    const previous = readContentContext();
    // standalone Routerには共有本文contextがない。hostの成功通知条件は別に保持する。
    if (previous === null && receipt.contentEpoch === 0 && receipt.root === this.outlet) return;
    if (
      previous?.root !== receipt.root ||
      previous.contentEpoch !== receipt.contentEpoch ||
      previous.recoveryRequired
    )
      throw new Error('accepted content context changed before binding adoption');
    adoptContentBinding(receipt.url, receipt.entryId);
    const context = readContentContext();
    if (
      !addressIsCurrent() ||
      context?.root !== receipt.root ||
      context.contentEpoch !== receipt.contentEpoch ||
      context.mutation ||
      context.recoveryRequired ||
      context.displayedBinding.url !== receipt.url ||
      context.displayedBinding.entryId !== receipt.entryId
    )
      throw new Error('accepted content binding could not be adopted');
  }

  private requireBindingRecovery(receipt: NavigationCommitReceipt): void {
    this.recoveryReceipt = receipt;
    const context = readContentContext();
    // 新しい世代や同epochの別bindingへ、旧受理の保存抑止状態を移植しない。
    if (
      context?.root === receipt.root &&
      context.contentEpoch === receipt.contentEpoch &&
      readCurrentShellCommitId() === receipt.shellCommitId &&
      (context.mutation ||
        (context.displayedBinding.url === receipt.url &&
          context.displayedBinding.entryId === receipt.entryId))
    )
      markContentRecoveryRequired(receipt.root, receipt.contentEpoch);
  }

  private normalizeAcceptedError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  private reportLoadError(result: NavigationResult, error: Error): void {
    try {
      this.eventBus.emit('error', { error, stage: 'load' });
    } catch (notificationError) {
      if (!result.committed) throw notificationError;
      result.degraded = true;
      result.issues.push({
        code: 'post-commit-failed',
        error: this.normalizeAcceptedError(notificationError),
      });
    }
  }

  private notifyNavigationResult(result: NavigationResult): void {
    try {
      this.eventBus.emit('after:navigate', result);
    } catch (error) {
      if (!result.committed) throw error;
      result.degraded = true;
      result.issues.push({ code: 'post-commit-failed', error: this.normalizeAcceptedError(error) });
    }
  }

  private delegateRecoveryNavigation(
    request: NormalizedNavigationRequest,
    signal: AbortSignal,
  ): NavigationResult {
    const intent = request.intent;
    const current = (): boolean =>
      !this.destroyed &&
      !signal.aborted &&
      intent !== undefined &&
      isNavigationIntentCurrent(intent) &&
      (intent.cause !== 'traverse' ||
        (readAddress() === intent.target.url &&
          (readHistoryEntry()?.id ?? null) === intent.target.entryId));
    if (!current()) return this.createCommitSupersededResult(request);
    // 回復不能な旧DOM/entryの組を再採用せず、新しいcurrent requestをdocumentへ委譲する。
    document.dispatchEvent(new Event('reading-position:document-fallback'));
    if (!current()) return this.createCommitSupersededResult(request);
    let result: NavigationResult;
    try {
      this.location.navigateDocument(request.normalizedUrl, request.historyMode);
      result = {
        ...this.createDocumentNavigationFallbackResult(
          request,
          'binding-recovery-required',
          new Error('accepted binding requires document recovery'),
        ),
        recoveryRequired: true,
      };
    } catch (error) {
      result = {
        kind: 'load-failure',
        outcome: 'failed',
        reason: 'unexpected',
        errorReason: 'unexpected',
        normalizedUrl: request.normalizedUrl,
        historyMode: request.historyMode,
        stateOnly: false,
        committed: false,
        degraded: true,
        recoveryRequired: true,
        issues: [],
        source: 'none',
        renderedKind: null,
        error: this.normalizeAcceptedError(error),
      };
    }
    try {
      // 回復委譲が失敗しても一度だけ通知し、observerの例外でqueueを未解放にしない。
      this.eventBus.emit('after:navigate', result);
    } catch (error) {
      result.degraded = true;
      result.issues.push({ code: 'post-commit-failed', error: this.normalizeAcceptedError(error) });
    }
    return result;
  }

  private createCommitSupersededResult(
    request: NormalizedNavigationRequest,
  ): import('./router-types.js').NavigationSupersededResult {
    return {
      kind: 'superseded',
      outcome: 'superseded',
      reason: 'superseded',
      normalizedUrl: request.normalizedUrl,
      historyMode: request.historyMode,
      stateOnly: false,
      committed: false,
      degraded: false,
      issues: [],
      source: 'none',
      renderedKind: null,
    };
  }

  private adoptSameDocumentAddress(change: BrowserAddressChange): void {
    // native hash/addressでも受理失敗の混在contextを通常bindingへ戻さない。
    if (this.recoveryReceipt || readContentContext()?.recoveryRequired) return;
    const previousUrl = this.currentUrl;
    adoptNativeNavigationIntent(change.url);
    this.currentUrl = change.url;
    adoptContentBinding(change.url, change.entry?.id ?? null);
    document.dispatchEvent(new Event('reading-position:native-address'));
    this.eventBus.emit('ui-url-state-change', { previousUrl, url: change.url });
  }

  private async runBeforeNavigateHooks(
    request: NormalizedNavigationRequest,
  ): Promise<NavigationResult | null> {
    const context: BeforeNavigateContext = {
      currentUrl: this.currentUrl,
      requestedUrl: request.requestedUrl,
      normalizedUrl: request.normalizedUrl,
      historyMode: request.historyMode,
    };

    for (const hook of this.beforeNavigateHooks) {
      try {
        const hookResult = await hook(context);
        if (hookResult === false) {
          return {
            kind: 'cancelled',
            outcome: 'cancelled',
            reason: 'cancelled',
            normalizedUrl: request.normalizedUrl,
            historyMode: request.historyMode,
            stateOnly: false,
            committed: false,
            degraded: false,
            issues: [],
            source: 'none',
            renderedKind: null,
          };
        }
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        this.eventBus.emit('error', {
          error: normalizedError,
          stage: 'before-navigate',
          diagnostic: this.createRouterDiagnostic('route-state-mismatch', request.normalizedUrl),
        });
        return {
          kind: 'load-failure',
          outcome: 'failed',
          reason: 'unexpected',
          normalizedUrl: request.normalizedUrl,
          historyMode: request.historyMode,
          stateOnly: false,
          committed: false,
          degraded: false,
          issues: [],
          source: 'none',
          renderedKind: null,
          error: normalizedError,
          errorReason: 'unexpected',
        };
      }
    }

    return null;
  }

  private canUseDocumentNavigationFallback(
    request: NormalizedNavigationRequest,
    currentUrl: string,
  ): boolean {
    return !(
      !this.hasCommittedNavigation &&
      request.historyMode === 'none' &&
      request.normalizedUrl === currentUrl
    );
  }

  private createDocumentNavigationFallbackResult(
    request: NormalizedNavigationRequest,
    reason: import('./router-types.js').DocumentNavigationFallbackReason,
    error: Error,
  ): import('./router-types.js').DocumentNavigationFallbackResult {
    return {
      kind: 'document-navigation-fallback',
      outcome: 'completed',
      reason,
      normalizedUrl: request.normalizedUrl,
      historyMode: request.historyMode,
      stateOnly: false,
      committed: false,
      degraded: false,
      issues: [],
      source: 'document-navigation-fallback',
      renderedKind: null,
      error,
    };
  }

  private setBusy(nextValue: boolean): void {
    if (this.isBusy === nextValue) {
      return;
    }

    this.isBusy = nextValue;
    this.eventBus.emit('navigation:busy-change', {
      isNavigating: nextValue,
    });
  }

  private createValidationFailureResult(
    reason: import('./router-types.js').NavigationValidationFailureReason,
    historyMode: HistoryMode,
  ): NavigationResult {
    return {
      kind: 'validation-failure',
      outcome: 'failed',
      reason,
      errorReason: reason,
      historyMode,
      stateOnly: false,
      committed: false,
      degraded: false,
      issues: [],
      source: 'none',
      renderedKind: null,
    };
  }

  private createLifecycleFailureResult(
    historyMode: HistoryMode,
    error: Error,
    reason: import('./router-types.js').NavigationLifecycleFailureReason,
  ): NavigationResult {
    return {
      kind: 'lifecycle-failure',
      outcome: 'failed',
      reason,
      historyMode,
      stateOnly: false,
      committed: false,
      degraded: false,
      issues: [],
      source: 'none',
      renderedKind: null,
      error,
      errorReason: reason,
    };
  }

  private createSupersededResult(request: NormalizedNavigationRequest): NavigationResult {
    return {
      kind: 'superseded',
      outcome: 'superseded',
      reason: 'superseded',
      normalizedUrl: request.normalizedUrl,
      historyMode: request.historyMode,
      stateOnly: false,
      committed: false,
      degraded: false,
      issues: [],
      source: 'none',
      renderedKind: null,
    };
  }

  private createRouterDiagnostic(
    reason: RouterDiagnosticPayload['reason'],
    detail: string,
  ): RouterDiagnosticPayload {
    switch (reason) {
      case 'post-commit-handler-failed':
        return { reason, handlerName: detail };
      case 'invalid-target':
        return { reason, target: stripAsciiControlCharacters(detail) };
      case 'route-state-mismatch':
      case 'return-to-reading-unavailable':
      case 'navigation-envelope-invalid':
        return { reason, routeId: detail };
    }
  }
}
