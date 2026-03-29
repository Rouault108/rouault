import { BrowserLinkInterceptor } from './router/browser-link-interceptor.js';
import { ContentCommitter } from './router/content-committer.js';
import { ContentLoader } from './router/content-loader.js';
import { LocationAdapter } from './router/location-adapter.js';
import { NavigationQueue, type QueuedNavigationRequest } from './router/navigation-queue.js';
import { RouteRegistry } from './router/route-registry.js';
import { RouterEventBus } from './router/router-event-bus.js';
import type {
  BeforeNavigateContext,
  BeforeNavigateHook,
  DocumentSnapshot,
  NavigateRequest,
  NavigationResult,
  PostCommitController,
  RouterEventMap,
  RouterOptions,
  UrlStateNavigationPolicy,
} from './router/router-types.js';
import {
  RouterDestroyedError,
  RouterNotStartedError,
  RouterOwnershipError,
} from './router/router-types.js';

export type {
  BeforeNavigateContext,
  BeforeNavigateHook,
  ContentUpdateAdapter,
  ContentUpdatePayload,
  DocumentRouteContext,
  DocumentRouteHandler,
  DocumentShellSnapshot,
  DocumentSnapshot,
  ErrorSnapshotReason,
  HeaderShellSnapshot,
  HistoryMode,
  NavigateRequest,
  NavigationErrorReason,
  NavigationIssue,
  NavigationResult,
  NavigationOutcome,
  PostCommitController,
  PreparedContentUpdate,
  RoutePattern,
  RouterEventMap,
  RouterOptions,
  ShellAdapter,
  UrlStateNavigationDecision,
  UrlStateNavigationPolicy,
} from './router/router-types.js';
export {
  RouterDestroyedError,
  RouterNotStartedError,
  RouterOwnershipError,
} from './router/router-types.js';

const LIVE_ROUTER_OWNERS = new WeakMap<Document, Router>();

type NormalizedNavigationRequest = QueuedNavigationRequest;

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

export class Router {
  private eventBus = new RouterEventBus();
  private location = new LocationAdapter();
  private routeRegistry = new RouteRegistry();
  private loader: ContentLoader;
  private committer: ContentCommitter;
  private beforeNavigateHooks = new Set<BeforeNavigateHook>();
  private linkInterceptor: BrowserLinkInterceptor;
  private queue: NavigationQueue;
  private started = false;
  private destroyed = false;
  private isBusy = false;
  private currentUrl = this.location.readCurrentUrl();
  private hasCommittedNavigation = false;

  constructor(
    private outlet: HTMLElement,
    private options: RouterOptions = {},
  ) {
    const currentOwner = LIVE_ROUTER_OWNERS.get(document);
    if (currentOwner && !currentOwner.destroyed) {
      throw new RouterOwnershipError('document ごとに live Router は 1 つだけです。');
    }

    LIVE_ROUTER_OWNERS.set(document, this);

    this.loader = new ContentLoader(this.routeRegistry, this.location);
    this.committer = new ContentCommitter(this.outlet, this.location, this.options.contentAdapter);

    this.linkInterceptor = new BrowserLinkInterceptor(
      this.location,
      () => this.currentUrl,
      async (request) => this.navigate(request),
    );
    this.queue = new NavigationQueue(
      async (request, signal) => this.runNavigation(request, signal),
      (request) => this.createSupersededResult(request),
    );
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

  async navigate(request: NavigateRequest): Promise<NavigationResult> {
    const normalizedRequest = this.normalizeRequest(request);

    if (this.destroyed) {
      return this.createFailureResult(
        normalizedRequest,
        new RouterDestroyedError('destroy() 済みの Router です。'),
        'destroyed',
      );
    }

    if (!this.started) {
      return this.createFailureResult(
        normalizedRequest,
        new RouterNotStartedError('start() 前の Router です。'),
        'not-started',
      );
    }

    return this.queue.enqueue(normalizedRequest);
  }

  private normalizeRequest(request: NavigateRequest): NormalizedNavigationRequest {
    const requestedUrl = request.url;
    const historyMode = request.historyMode ?? 'push';
    return {
      requestedUrl,
      normalizedUrl: this.location.normalizeUrl(requestedUrl),
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
      const loadResult = await this.loader.load(
        request.normalizedUrl,
        executionController.signal,
        this.options.shellAdapter,
      );

      if (executionController.signal.aborted && externalSignal.aborted) {
        return this.createSupersededResult(request);
      }

      const durableCommitResult = await this.commitLoadedSnapshot(
        request,
        currentUrl,
        loadResult.snapshot,
      );
      const finalResult = {
        ...durableCommitResult,
        source: loadResult.source,
        error: loadResult.error,
        errorReason: loadResult.errorReason,
      };

      if (loadResult.snapshot.kind === 'error') {
        finalResult.errorReason = loadResult.errorReason;
      }

      this.eventBus.emit('after:navigate', finalResult);
      return finalResult;
    } catch (error) {
      if (executionController.signal.aborted && externalSignal.aborted && isAbortError(error)) {
        const result = this.createSupersededResult(request);
        this.eventBus.emit('after:navigate', result);
        return result;
      }

      const loadResult = this.loader.createExceptionResult(error);
      const durableCommitResult = await this.commitLoadedSnapshot(
        request,
        currentUrl,
        loadResult.snapshot,
        error instanceof Error ? error : undefined,
        loadResult.errorReason,
      );
      const finalResult = {
        ...durableCommitResult,
        source: 'fetch' as const,
        error: loadResult.error ?? (error instanceof Error ? error : undefined),
        errorReason: loadResult.errorReason,
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
    snapshot: DocumentSnapshot,
    baseError?: Error,
    baseErrorReason?: NavigationResult['errorReason'],
  ): Promise<NavigationResult> {
    try {
      await this.committer.commit({
        snapshot,
        normalizedUrl: request.normalizedUrl,
        historyMode: request.historyMode,
        state: request.state,
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.eventBus.emit('error', {
        error: normalizedError,
        stage: 'commit',
      });

      return {
        outcome: 'failed',
        requestedUrl: request.requestedUrl,
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
      outcome: 'completed',
      requestedUrl: request.requestedUrl,
      normalizedUrl: request.normalizedUrl,
      historyMode: request.historyMode,
      stateOnly: false,
      committed: true,
      degraded: false,
      issues: [],
      source: 'none',
      renderedKind: snapshot.kind,
      error: snapshot.kind === 'error' ? baseError : undefined,
      errorReason: snapshot.kind === 'error' ? baseErrorReason : undefined,
    };

    this.eventBus.emit('content:load', {
      previousUrl,
      url: request.normalizedUrl,
      isInitial,
    });

    await this.applyShell(snapshot, request.normalizedUrl, result);
    await this.runPostCommit(
      previousUrl,
      request.normalizedUrl,
      isInitial,
      snapshot.kind,
      false,
      result,
    );

    return result;
  }

  private async applyShell(
    snapshot: DocumentSnapshot,
    normalizedUrl: string,
    result: NavigationResult,
  ): Promise<void> {
    if (!this.options.shellAdapter?.apply) {
      return;
    }

    try {
      await this.options.shellAdapter.apply(snapshot.shell ?? null, {
        navigationUrl: normalizedUrl,
      });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      result.degraded = true;
      result.issues.push({
        code: 'shell-sync-failed',
        error: normalizedError,
      });
      this.eventBus.emit('error', {
        error: normalizedError,
        stage: 'shell',
      });
    }
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
      });
      this.eventBus.emit('error', {
        error: normalizedError,
        stage: 'post-commit',
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
      outcome: 'completed',
      requestedUrl: request.requestedUrl,
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
            outcome: 'cancelled',
            requestedUrl: request.requestedUrl,
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
        });
        return {
          outcome: 'failed',
          requestedUrl: request.requestedUrl,
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

  private createFailureResult(
    request: NormalizedNavigationRequest,
    error: Error,
    reason: NavigationResult['errorReason'],
  ): NavigationResult {
    return {
      outcome: 'failed',
      requestedUrl: request.requestedUrl,
      normalizedUrl: request.normalizedUrl,
      historyMode: request.historyMode,
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
      outcome: 'superseded',
      requestedUrl: request.requestedUrl,
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
}
