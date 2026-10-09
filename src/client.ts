import { readHistoryEntry } from './navigation/history-entry.js';
import {
  adoptContentBinding,
  readContentContext,
  subscribeContentContext,
  recordInitialIntervention,
} from './navigation/content-navigation-context.js';
import { readContentReadiness, setContentReadiness } from './client/hydration/content-readiness.js';
import { readCurrentShellCommitId } from './components/app/shell/app-shell-lifecycle.js';
import { MAIN_CONTENT_SELECTOR } from '../shared/navigation/main-landmark-contract.js';
import type {
  RouterDocumentHost,
  RouterDocumentHostNavigationCommittedDetail,
} from './components/app/router-document-host.js';
import { HydrationScheduler } from './client/hydration/scheduler.js';
import { attachUnsafeLinkClickGuard } from './router/unsafe-link-click-guard.js';
import {
  loadInternalDocumentRouteManifest,
  readInternalDocumentRouteManifestMeta,
} from './router/internal-document-route-manifest-loader.js';
import { initSearch, initSearchUnavailable } from './search/bootstrap.js';
import { initTheme } from './theme/theme-manager.js';
import { validateInitialAppShell } from './router/initial-shell-validation.js';
import type { AppContentHydrationReadyDetail } from './components/app/shell/app-shell-events.js';

const initialNavigation = performance.getEntriesByType('navigation')[0];
if (
  readHistoryEntry() === null ||
  (initialNavigation instanceof PerformanceNavigationTiming &&
    initialNavigation.type !== 'navigate')
)
  history.scrollRestoration = 'auto';
const hydrationScheduler = new HydrationScheduler();
const initialInput = new AbortController();
for (const name of ['wheel', 'touchmove', 'pointerdown', 'keydown'] as const)
  window.addEventListener(
    name,
    (event) => {
      if (
        event instanceof KeyboardEvent &&
        !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Tab'].includes(
          event.key,
        )
      )
        return;
      if (!readContentContext()?.intent) recordInitialIntervention();
    },
    { capture: true, passive: true, signal: initialInput.signal },
  );

const getRouterDocumentHost = (): RouterDocumentHost | null =>
  document.querySelector<RouterDocumentHost>('router-document-host');

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
  contentEpoch: number;
  shellCommitId: number;
}): void => {
  document.dispatchEvent(
    new CustomEvent<AppContentHydrationReadyDetail>('app-content:hydration-ready', {
      detail,
    }),
  );
};

const hydrateCurrentContent = async (
  contentRoot?: HTMLElement,
  options: { initial?: boolean; contentEpoch?: number } = {},
): Promise<void> => {
  const epoch = options.contentEpoch ?? readContentContext()?.contentEpoch;
  if (epoch === undefined) return;
  const ready = readContentReadiness(epoch);
  if (!ready || ready.started || ready.status === 'invalidated') return;
  const isCurrent = (): boolean =>
    readContentContext()?.contentEpoch === epoch &&
    readContentContext()?.mutation === false &&
    ready.root.isConnected;
  const routerDocumentHost = await waitForRouterDocumentHostReady();
  if (!isCurrent()) return;

  const mainContent =
    contentRoot ??
    (routerDocumentHost?.getContentRoot() instanceof HTMLElement
      ? routerDocumentHost.getContentRoot()
      : null) ??
    resolveCurrentContentRoot();
  if (!(mainContent instanceof HTMLElement)) {
    return;
  }
  await Promise.resolve();
  if (!isCurrent()) return;
  setContentReadiness({ ...ready, shellCommitId: readCurrentShellCommitId(), started: true });

  try {
    await hydrationScheduler.hydrateContent(mainContent, {
      dispatchTarget: routerDocumentHost,
      isCurrent,
    });
  } catch {
    if (isCurrent()) setContentReadiness({ ...ready, started: true, status: 'unavailable' });
    return;
  }
  if (!isCurrent() || !mainContent.isConnected) {
    return;
  }
  const currentContentRoot = routerDocumentHost?.getContentRoot();
  if (currentContentRoot instanceof HTMLElement && currentContentRoot !== mainContent) {
    return;
  }
  setContentReadiness({
    ...ready,
    shellCommitId: readCurrentShellCommitId(),
    started: true,
    status: 'settled',
  });
  dispatchContentHydrationReady({
    contentEpoch: epoch,
    shellCommitId: readCurrentShellCommitId(),
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
  initialInput.abort();
  await hydrateCurrentContent(undefined, { initial: true });
};

document.addEventListener('router-document-host:navigation-committed', (event: Event) => {
  const detail = (event as CustomEvent<RouterDocumentHostNavigationCommittedDetail>).detail;
  const contentRoot = detail.contentRoot;
  void hydrateCurrentContent(contentRoot instanceof HTMLElement ? contentRoot : undefined, {
    initial: false,
    contentEpoch: detail.contentEpoch,
  });
});

subscribeContentContext((reason) => {
  if (reason === 'mutation') hydrationScheduler.cancelContent();
});
document.addEventListener('app-shell:restored', () => {
  const context = readContentContext();
  if (!context) return;
  adoptContentBinding(context.displayedBinding.url, context.displayedBinding.entryId);
  void hydrateCurrentContent(context.root ?? undefined, { contentEpoch: context.contentEpoch });
});
void bootstrapClient();
