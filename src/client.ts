import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { HydrationScheduler } from './client/hydration/scheduler.js';
import { promoteDeclarativeShadowRoots } from './router/declarative-shadow-dom.js';
import { initSearch } from './search/bootstrap.js';
import { initTheme } from './theme/theme-manager.js';

const hydrationScheduler = new HydrationScheduler();

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

const hydrateCurrentContent = async (): Promise<void> => {
  await customElements.whenDefined('app-router');

  const mainContent = document.querySelector<HTMLElement>('#main-content');
  if (!(mainContent instanceof HTMLElement)) {
    return;
  }

  promoteDeclarativeShadowRoots(mainContent);

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

  // SSR を保持した既存 host に対して、補助処理より前に upgrade を完了させる。
  customElements.upgrade(mainContent);
  await Promise.resolve();

  await hydrationScheduler.hydrateContent(mainContent, {
    dispatchTarget: document.querySelector('app-router'),
  });

  for (const toc of mainContent.querySelectorAll<HTMLElement & { activateHydration?: () => void }>(
    'layout-toc',
  )) {
    toc.activateHydration?.();
  }
};

const bootstrapClient = async (): Promise<void> => {
  initTheme();
  await hydrateShellScopes();
  initSearch();
  await hydrateCurrentContent();
};

document.addEventListener('app-router:content-rendered', () => {
  void hydrateCurrentContent();
});

void bootstrapClient();