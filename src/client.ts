import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import type { AppRouter, AppRouterContentRenderedDetail } from './components/app/app-router.js';
import { HydrationScheduler } from './client/hydration/scheduler.js';
import { initSearch } from './search/bootstrap.js';
import { initTheme } from './theme/theme-manager.js';

const hydrationScheduler = new HydrationScheduler();

const getAppRouter = (): AppRouter | null => document.querySelector<AppRouter>('app-router');

const resolveCurrentContentRoot = (): HTMLElement | null => {
  const appRouter = getAppRouter();
  const routerContentRoot = appRouter?.getContentRoot();
  if (routerContentRoot instanceof HTMLElement) {
    return routerContentRoot;
  }

  return document.querySelector<HTMLElement>('#main-content');
};

const preloadCriticalCustomElements = async (): Promise<void> => {
  const eagerLoaders: Promise<unknown>[] = [];

  if (document.querySelector('layout-sidebar')) {
    eagerLoaders.push(import('./components/layout/layout-sidebar.js'));
  }

  if (document.querySelector('layout-toc')) {
    eagerLoaders.push(import('./components/layout/layout-toc.js'));
  }

  if (document.querySelector('ui-article-header')) {
    eagerLoaders.push(import('./components/ui/article-header/article-header.js'));
  }

  if (eagerLoaders.length > 0) {
    await Promise.all(eagerLoaders);
  }
};

const hydrateShellScopes = async (): Promise<void> => {
  const shellScopes = [
    document.querySelector<HTMLElement>('[data-hydration-scope="skip-link"]'),
    document.querySelector<HTMLElement>('[data-hydration-scope="app-shell"]'),
    document.querySelector<HTMLElement>('[data-hydration-scope="global-search"]'),
  ].filter((scope): scope is HTMLElement => scope !== null);

  for (const scope of shellScopes) {
    await hydrationScheduler.hydrateShell(scope);
  }
};

const hydrateCurrentContent = async (contentRoot?: HTMLElement): Promise<void> => {
  await customElements.whenDefined('app-router');

  const mainContent = contentRoot ?? resolveCurrentContentRoot();
  if (!(mainContent instanceof HTMLElement)) {
    return;
  }

  const eagerLoaders: Promise<unknown>[] = [];
  if (mainContent.querySelector('search-page')) {
    eagerLoaders.push(import('./components/search/search-page.js'));
  }
  if (mainContent.querySelector('ui-article-header')) {
    eagerLoaders.push(import('./components/ui/article-header/article-header.js'));
  }
  if (mainContent.querySelector('layout-sidebar')) {
    eagerLoaders.push(import('./components/layout/layout-sidebar.js'));
  }
  if (mainContent.querySelector('layout-toc')) {
    eagerLoaders.push(import('./components/layout/layout-toc.js'));
  }
  if (mainContent.querySelector('ui-tabs')) {
    eagerLoaders.push(import('./components/ui/tabs/tabs.js'));
  }

  if (eagerLoaders.length > 0) {
    await Promise.all(eagerLoaders);
  }

  customElements.upgrade(mainContent);
  await Promise.resolve();

  await hydrationScheduler.hydrateContent(mainContent, {
    dispatchTarget: getAppRouter(),
  });

  for (const sidebar of mainContent.querySelectorAll<
    HTMLElement & { activateHydration?: () => void }
  >('layout-sidebar')) {
    sidebar.activateHydration?.();
  }

  for (const toc of mainContent.querySelectorAll<HTMLElement & { activateHydration?: () => void }>(
    'layout-toc',
  )) {
    toc.activateHydration?.();
  }
};

const bootstrapClient = async (): Promise<void> => {
  initTheme();
  await preloadCriticalCustomElements();
  await hydrateShellScopes();
  initSearch();
  await hydrateCurrentContent();
};

document.addEventListener('app-router:content-rendered', (event: Event) => {
  const detail = (event as CustomEvent<AppRouterContentRenderedDetail>).detail;
  const contentRoot = detail.contentRoot;
  void hydrateCurrentContent(contentRoot instanceof HTMLElement ? contentRoot : undefined);
});

void bootstrapClient();
