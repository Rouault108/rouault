import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { MAIN_CONTENT_SELECTOR } from '../shared/navigation/main-landmark-contract.js';
import type { RouterDocumentHost, RouterDocumentHostNavigationCommittedDetail } from './components/app/router-document-host.js';
import { HydrationScheduler } from './client/hydration/scheduler.js';
import { promoteDeclarativeShadowRoots } from './router/declarative-shadow-dom.js';
import { attachUnsafeLinkClickGuard } from './router/unsafe-link-click-guard.js';
import {
  loadInternalDocumentRouteManifest,
  readInternalDocumentRouteManifestMeta,
} from './router/internal-document-route-manifest-loader.js';
import { initSearch, initSearchUnavailable } from './search/bootstrap.js';
import { initTheme } from './theme/theme-manager.js';
import { validateInitialAppShell } from './router/initial-shell-validation.js';
import type { AppContentHydrationReadyDetail } from './components/app/shell/app-shell-events.js';

const hydrationScheduler = new HydrationScheduler();
let contentHydrationGeneration = 0;

const getRouterDocumentHost = (): RouterDocumentHost | null => document.querySelector<RouterDocumentHost>('router-document-host');

const resolveCurrentContentRoot = (): HTMLElement | null => {
  const routerDocumentHost = getRouterDocumentHost();
  const routerContentRoot = routerDocumentHost?.getContentRoot();
  if (routerContentRoot instanceof HTMLElement) {
    return routerContentRoot;
  }

  return document.querySelector<HTMLElement>(MAIN_CONTENT_SELECTOR);
};

const waitForRouterDocumentHostReady = async (): Promise<RouterDocumentHost | null> => {
  await customElements.whenDefined('router-document-host');

  const routerDocumentHost = getRouterDocumentHost();
  if (routerDocumentHost && typeof routerDocumentHost.whenReady === 'function') {
    await routerDocumentHost.whenReady();
  }

  return routerDocumentHost;
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

const dispatchContentHydrationReady = (detail: {
  contentRoot: HTMLElement;
  initial: boolean;
}): void => {
  document.dispatchEvent(
    new CustomEvent<AppContentHydrationReadyDetail>('app-content:hydration-ready', {
      detail,
    }),
  );
};

const hydrateCurrentContent = async (
  contentRoot?: HTMLElement,
  options: { initial?: boolean } = {},
): Promise<void> => {
  const generation = ++contentHydrationGeneration;
  const routerDocumentHost = await waitForRouterDocumentHostReady();

  const mainContent =
    contentRoot ??
    (routerDocumentHost?.getContentRoot() instanceof HTMLElement ? routerDocumentHost.getContentRoot() : null) ??
    resolveCurrentContentRoot();
  if (!(mainContent instanceof HTMLElement)) {
    return;
  }

  promoteDeclarativeShadowRoots(mainContent);
  customElements.upgrade(mainContent);
  await Promise.resolve();

  await hydrationScheduler.hydrateContent(mainContent, {
    dispatchTarget: routerDocumentHost,
  });
  if (generation !== contentHydrationGeneration || !mainContent.isConnected) {
    return;
  }
  const currentContentRoot = routerDocumentHost?.getContentRoot();
  if (currentContentRoot instanceof HTMLElement && currentContentRoot !== mainContent) {
    return;
  }
  dispatchContentHydrationReady({
    contentRoot: mainContent,
    initial: options.initial === true,
  });
};

const initializeRouterDocumentHostRuntime = async (): Promise<void> => {
  const routerDocumentHost = getRouterDocumentHost();
  if (!routerDocumentHost) return;

  const manifestMeta = readInternalDocumentRouteManifestMeta(document);
  if (manifestMeta === null) {
    routerDocumentHost.initializeRuntimeFailure({ reason: 'route-manifest-invalid' });
    initSearchUnavailable({ runtimeEnvironment: 'production', reason: 'route-manifest-invalid' });
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
    if (routeManifestState.status === 'invalid') {
      routerDocumentHost.initializeRuntimeFailure({
        reason: 'route-manifest-invalid',
        siteUrlContext: manifestMeta.siteUrlContext,
        routeManifestState,
      });
    } else {
      routerDocumentHost.initializeRuntimeFailure({
        siteUrlContext: manifestMeta.siteUrlContext,
        routeManifestState,
      });
    }
    initSearchUnavailable({
      runtimeEnvironment: 'production',
      siteUrlContext: manifestMeta.siteUrlContext,
      reason: routeManifestState.reason,
    });
    return;
  }

  routerDocumentHost.initializeRuntime({
    siteUrlContext: manifestMeta.siteUrlContext,
    routeManifestState,
    isInternalDocumentPathname: (pathname) => routeManifestState.routeSet.has(pathname),
  });
  validateInitialAppShell({
    urlDependencies: {
      siteUrlContext: manifestMeta.siteUrlContext,
      routeManifestState,
      isInternalDocumentPathname: (pathname) => routeManifestState.routeSet.has(pathname),
    },
    currentAbsoluteUrl: window.location.href,
    normalizedNavigationUrl:
      window.location.pathname + window.location.search + window.location.hash,
  });
  initSearch({
    runtimeEnvironment: 'production',
    siteUrlContext: manifestMeta.siteUrlContext,
    routeManifestState,
  });
};

const bootstrapClient = async (): Promise<void> => {
  attachUnsafeLinkClickGuard(document);
  initTheme();
  await hydrateShellScopes();
  await initializeRouterDocumentHostRuntime();
  await hydrateCurrentContent(undefined, { initial: true });
};

document.addEventListener('router-document-host:navigation-committed', (event: Event) => {
  const detail = (event as CustomEvent<RouterDocumentHostNavigationCommittedDetail>).detail;
  const contentRoot = detail.contentRoot;
  void hydrateCurrentContent(contentRoot instanceof HTMLElement ? contentRoot : undefined, {
    initial: false,
  });
});

void bootstrapClient();
