import { ContentCommitter } from './content-committer.js';
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
  private readonly urlDependencies: RouterRuntimeUrlDependencies;
  private started = false;
  private destroyed = false;
  private isBusy = false;
  private currentUrl = '';
  private hasCommittedNavigation = false;

  constructor(outlet: HTMLElement, urlDependencies: RouterRuntimeUrlDependencies, options?: RouterOptions) {
    const currentOwner = LIVE_ROUTER_OWNERS.get(document);
    if (currentOwner && !currentOwner.destroyed) {
      throw new RouterOwnershipError('document ごとに live Router は 1 つだけです。');
    }

    LIVE_ROUTER_OWNERS.set(document, this);
    this.outlet = outlet;
    this.urlDependencies = urlDependencies;
    this.options = options ?? {};

    const runtime = createRouterRuntime({
      outlet: this.outlet,
      options: this.options,
      urlDependencies,
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

    return this.queue.enqueue(this.normalizeValidatedRequest(request, validation.normalizedUrl, historyMode));
  }

  private normalizeValidatedRequest(
    request: NavigateRequest,
    normalizedUrl: InternalDocumentNormalizedUrl,
    historyMode: HistoryMode,
  ): NormalizedNavigationRequest {
    return {
      requestedUrl: request.url,
      normalizedUrl,
      historyMode,
      state: request.state,
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

    const currentUrl = this.currentUrl;
    const statePolicy = this.options.urlStateNavigationPolicy;
    const stateDecision = statePolicy
      ? await statePolicy.evaluate({
          currentUrl,
          requestedUrl: request.requestedUrl,
          normalizedUrl: request.normalizedUrl,
          historyMode: request.historyMode,
          outlet: this.outlet,
        })
      : { kind: 'full' as const };

    if (stateDecision.kind === 'state-only') {
      const result = await this.runStateOnlyNavigation(request, currentUrl);
      this.eventBus.emit('after:navigate', result);
      return result;
    }

    this.setBusy(true);

    let timeoutId: number | null = null;
    const executionController = new AbortController();
    const onExternalAbort = () => {
      executionController.abort();
    };
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });

    const timeoutMs = this.options.navigationTimeoutMs ?? null;
    if (typeof timeoutMs === 'number' && timeoutMs > 0) {
      timeoutId = window.setTimeout(() => {
        executionController.abort();
      }, timeoutMs);
    }

    try {
      const loadResult = await this.loader.load(request.normalizedUrl, executionController.signal);

      if (executionController.signal.aborted && externalSignal.aborted) {
        return this.createSupersededResult(request);
      }

      const durableCommitResult = await this.commitLoadedSnapshot(
        request,
        currentUrl,
        loadResult.envelope,
      );

      const loadError = loadResult.source === 'error-fallback' ? loadResult.error : undefined;
      const loadErrorReason =
        loadResult.source === 'error-fallback' ? loadResult.errorReason : undefined;

      const finalResult: NavigationResult =
        durableCommitResult.outcome === 'failed'
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

      this.eventBus.emit('after:navigate', finalResult);
      return finalResult;
    } catch (error) {
      if (executionController.signal.aborted && externalSignal.aborted && isAbortError(error)) {
        const result = this.createSupersededResult(request);
        this.eventBus.emit('after:navigate', result);
        return result;
      }

      const loadResult = this.loader.createExceptionResult(error);
      const loadError = loadResult.source === 'error-fallback' ? loadResult.error : undefined;
      const loadErrorReason =
        loadResult.source === 'error-fallback' ? loadResult.errorReason : undefined;

      const durableCommitResult = await this.commitLoadedSnapshot(
        request,
        currentUrl,
        loadResult.envelope,
        error instanceof Error ? error : undefined,
        loadErrorReason,
      );

      const finalResult: NavigationResult =
        durableCommitResult.outcome === 'failed'
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

      this.eventBus.emit('error', {
        error: finalResult.error ?? new Error('navigation failed'),
        stage: 'load',
      });
      this.eventBus.emit('after:navigate', finalResult);
      return finalResult;
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      externalSignal.removeEventListener('abort', onExternalAbort);
      this.setBusy(false);
    }
  }

  private async commitLoadedSnapshot(
    request: NormalizedNavigationRequest,
    previousUrl: string,
    envelope: NavigationEnvelope,
    baseError?: Error,
    baseErrorReason?: import('./router-types.js').NavigationLoadFailureReason,
  ): Promise<import('./router-types.js').NavigationCompletedResult | import('./router-types.js').NavigationLoadFailureResult> {
    try {
      await this.committer.commit({
        envelope,
        normalizedUrl: request.normalizedUrl,
        historyMode: request.historyMode,
        state: request.state,
      });
    } catch (error) {
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

    this.currentUrl = request.normalizedUrl;
    const isInitial = !this.hasCommittedNavigation;
    this.hasCommittedNavigation = true;

    const result: NavigationResult = {
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
      error: envelope.document.renderedKind === 'error' ? baseError : undefined,
      errorReason: envelope.document.renderedKind === 'error' ? baseErrorReason : undefined,
    };

    this.eventBus.emit('content:load', {
      previousUrl,
      url: request.normalizedUrl,
      isInitial,
    });

    await this.runPostCommit(
      previousUrl,
      request.normalizedUrl,
      isInitial,
      envelope.document.renderedKind,
      false,
      result,
    );

    return result;
  }

  private async runPostCommit(
    previousUrl: string,
    normalizedUrl: string,
    isInitial: boolean,
    renderedKind: NavigationResult['renderedKind'],
    stateOnly: boolean,
    result: NavigationResult,
  ): Promise<void> {
    const controller = this.options.postCommitController;
    if (!controller) {
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
    if (request.historyMode === 'push') {
      this.location.push(request.normalizedUrl, request.state);
    } else if (request.historyMode === 'replace') {
      this.location.replace(request.normalizedUrl, request.state);
    }

    this.currentUrl = request.normalizedUrl;
    const isInitial = !this.hasCommittedNavigation;
    this.hasCommittedNavigation = true;
    const detail = {
      previousUrl,
      url: request.normalizedUrl,
    };
    this.eventBus.emit('ui-url-state-change', detail);

    const result: NavigationResult = {
      kind: 'completed',
      outcome: 'completed',
      normalizedUrl: request.normalizedUrl,
      historyMode: request.historyMode,
      stateOnly: true,
      committed: true,
      degraded: false,
      issues: [],
      source: 'state-only',
      renderedKind: null,
    };

    await this.runPostCommit(previousUrl, request.normalizedUrl, isInitial, null, true, result);

    return result;
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
