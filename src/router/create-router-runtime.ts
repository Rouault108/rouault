import { RouterLinkInterceptor } from './browser-link-interceptor.js';
import { ContentCommitter } from './content-committer.js';
import { DocumentLoader } from './document-loader.js';
import { LocationAdapter } from './location-adapter.js';
import { NavigationQueue, type QueuedNavigationRequest } from './navigation-queue.js';
import { RouteRegistry } from './route-registry.js';
import { RouterEventBus } from './router-event-bus.js';
import type { NavigationResult, RouterOptions, RouterRuntimeUrlDependencies } from './router-types.js';
import { createRouterRuntimeDiagnosticSink } from './router-diagnostics.js';
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
  linkInterceptor: RouterLinkInterceptor;
  queue: NavigationQueue;
}

interface CreateRouterRuntimeOptions {
  outlet: HTMLElement;
  options: RouterOptions;
  urlDependencies: RouterRuntimeUrlDependencies;
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
  const loader = new DocumentLoader(routeRegistry, location, runtimeOptions.urlDependencies.siteUrlContext);
  const committer = new ContentCommitter(
    outlet,
    location,
    options.contentAdapter,
    options.shellAdapter,
  );
  const diagnosticSink = createRouterRuntimeDiagnosticSink((diagnostic) => {
    runtimeOptions.reportDiagnostic?.(diagnostic);
  });
  const linkInterceptor = new RouterLinkInterceptor({
    location,
    siteUrlContext: runtimeOptions.urlDependencies.siteUrlContext,
    getCurrentUrl: () => runtimeOptions.getCurrentUrl(),
    requestNavigation: (request) => runtimeOptions.requestNavigation(request),
    routeManifestState: runtimeOptions.urlDependencies.routeManifestState,
    ...(runtimeOptions.urlDependencies.isInternalResourcePathname
      ? { isInternalResourcePathname: runtimeOptions.urlDependencies.isInternalResourcePathname }
      : {}),
    diagnosticSink,
  });
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
