import { BrowserLinkInterceptor } from './browser-link-interceptor.js';
import { ContentCommitter } from './content-committer.js';
import { DocumentLoader } from './document-loader.js';
import { LocationAdapter } from './location-adapter.js';
import { NavigationQueue, type QueuedNavigationRequest } from './navigation-queue.js';
import { RouteRegistry } from './route-registry.js';
import { RouterEventBus } from './router-event-bus.js';
import type { NavigationResult, RouterOptions } from './router-types.js';
import type { RouterDiagnosticPayload } from './router-diagnostics.js';

interface InterceptorRequest {
  url: string;
  historyMode: 'none' | 'push' | 'replace';
}

export interface RouterRuntime {
  eventBus: RouterEventBus;
  location: LocationAdapter;
  routeRegistry: RouteRegistry;
  loader: DocumentLoader;
  committer: ContentCommitter;
  linkInterceptor: BrowserLinkInterceptor;
  queue: NavigationQueue;
}

interface CreateRouterRuntimeOptions {
  outlet: HTMLElement;
  options: RouterOptions;
  getCurrentUrl(): string;
  requestNavigation(request: InterceptorRequest): Promise<NavigationResult>;
  runNavigation(request: QueuedNavigationRequest, signal: AbortSignal): Promise<NavigationResult>;
  createSupersededResult(request: QueuedNavigationRequest): NavigationResult;
  reportDiagnostic?(diagnostic: RouterDiagnosticPayload): void;
}

export const createRouterRuntime = (runtimeOptions: CreateRouterRuntimeOptions): RouterRuntime => {
  const { outlet, options } = runtimeOptions;
  const eventBus = new RouterEventBus();
  const location = new LocationAdapter();
  const routeRegistry = new RouteRegistry();
  const loader = new DocumentLoader(routeRegistry, location);
  const committer = new ContentCommitter(
    outlet,
    location,
    options.contentAdapter,
    options.shellAdapter,
  );
  const linkInterceptor = new BrowserLinkInterceptor(
    location,
    () => runtimeOptions.getCurrentUrl(),
    (request) => runtimeOptions.requestNavigation(request),
    (diagnostic) => {
      runtimeOptions.reportDiagnostic?.(diagnostic);
    },
  );
  const queue = new NavigationQueue(
    (request, signal) => runtimeOptions.runNavigation(request, signal),
    (request) => runtimeOptions.createSupersededResult(request),
    (diagnostic) => {
      runtimeOptions.reportDiagnostic?.(diagnostic);
    },
  );

  return {
    eventBus,
    location,
    routeRegistry,
    loader,
    committer,
    linkInterceptor,
    queue,
  };
};
