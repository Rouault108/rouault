import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { MAIN_CONTENT_SELECTOR } from '../shared/navigation/main-landmark-contract.js';
import type { AppRouter, AppRouterNavigationCommittedDetail } from './components/app/app-router.js';
import { HydrationScheduler } from './client/hydration/scheduler.js';
import { promoteDeclarativeShadowRoots } from './router/declarative-shadow-dom.js';
import { attachUnsafeLinkClickGuard } from './router/unsafe-link-click-guard.js';
import {
  loadInternalDocumentRouteManifest,
  readInternalDocumentRouteManifestMeta,
} from './router/internal-document-route-manifest-loader.js';
import { initSearch, initSearchUnavailable } from './search/bootstrap.js';
import { initTheme } from './theme/theme-manager.js';

const hydrationScheduler = new HydrationScheduler();

const getAppRouter = (): AppRouter | null => document.querySelector<AppRouter>('app-router');

const resolveCurrentContentRoot = (): HTMLElement | null => {
  const appRouter = getAppRouter();
  const routerContentRoot = appRouter?.getContentRoot();
  if (routerContentRoot instanceof HTMLElement) {
    return routerContentRoot;
  }

  return document.querySelector<HTMLElement>(MAIN_CONTENT_SELECTOR);
};

const waitForAppRouterReady = async (): Promise<AppRouter | null> => {
  await customElements.whenDefined('app-router');

  const appRouter = getAppRouter();
  if (appRouter && typeof appRouter.whenReady === 'function') {
    await appRouter.whenReady();
  }

  return appRouter;
};

const hydrateShellScopes = async (): Promise<void> => {
  const mainContent = document.querySelector<HTMLElement>(MAIN_CONTENT_SELECTOR);

  const skipLink = document.querySelector<HTMLElement>('[data-hydration-scope="skip-link"]');
  if (skipLink) {
    await hydrationScheduler.hydrateShell(skipLink);
  }

  const appShell = document.querySelector<HTMLElement>('[data-hydration-scope="app-shell"]');
  if (appShell) {
    await hydrationScheduler.hydrateShell(appShell, {
      excludeSubtrees: mainContent ? [mainContent] : [],
    });
  }

  const globalSearch = document.querySelector<HTMLElement>(
    '[data-hydration-scope="global-search"]',
  );
  if (globalSearch) {
    await hydrationScheduler.hydrateShell(globalSearch);
  }
};

const hydrateCurrentContent = async (contentRoot?: HTMLElement): Promise<void> => {
  const appRouter = await waitForAppRouterReady();

  const mainContent =
    contentRoot ??
    (appRouter?.getContentRoot() instanceof HTMLElement ? appRouter.getContentRoot() : null) ??
    resolveCurrentContentRoot();
  if (!(mainContent instanceof HTMLElement)) {
    return;
  }

  promoteDeclarativeShadowRoots(mainContent);
  customElements.upgrade(mainContent);
  await Promise.resolve();

  await hydrationScheduler.hydrateContent(mainContent, {
    dispatchTarget: appRouter,
  });
};

const initializeAppRouterRuntime = async (): Promise<void> => {
  const appRouter = getAppRouter();
  if (!appRouter) return;

  const manifestMeta = readInternalDocumentRouteManifestMeta(document);
  if (manifestMeta === null) {
    appRouter.initializeRuntimeFailure({ reason: 'route-manifest-invalid' });
    initSearchUnavailable();
    return;
  }

  const routeManifestState = await loadInternalDocumentRouteManifest({
    manifestUrl: manifestMeta.manifestUrl,
    siteUrlContext: manifestMeta.siteUrlContext,
    buildId: manifestMeta.buildId,
    version: manifestMeta.version,
    currentLocation: window.location,
  });

  if (routeManifestState.status !== 'loaded') {
    appRouter.initializeRuntimeFailure({ siteUrlContext: manifestMeta.siteUrlContext, routeManifestState });
    initSearchUnavailable();
    return;
  }

  appRouter.initializeRuntime({
    siteUrlContext: manifestMeta.siteUrlContext,
    routeManifestState,
    isInternalDocumentPathname: (pathname) => routeManifestState.routeSet.has(pathname),
  });
  initSearch({ siteUrlContext: manifestMeta.siteUrlContext, routeManifestState });
};

const bootstrapClient = async (): Promise<void> => {
  attachUnsafeLinkClickGuard(document);
  initTheme();
  await hydrateShellScopes();
  await initializeAppRouterRuntime();
  await hydrateCurrentContent();
};

document.addEventListener('app-router:navigation-committed', (event: Event) => {
  const detail = (event as CustomEvent<AppRouterNavigationCommittedDetail>).detail;
  const contentRoot = detail.contentRoot;
  void hydrateCurrentContent(contentRoot instanceof HTMLElement ? contentRoot : undefined);
});

void bootstrapClient();
