import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { MAIN_CONTENT_SELECTOR } from '../shared/navigation/main-landmark-contract.js';
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
  const appRouter = await waitForAppRouterReady();

  const mainContent =
    contentRoot ??
    (appRouter?.getContentRoot() instanceof HTMLElement ? appRouter.getContentRoot() : null) ??
    resolveCurrentContentRoot();
  if (!(mainContent instanceof HTMLElement)) {
    return;
  }

  customElements.upgrade(mainContent);
  await Promise.resolve();

  await hydrationScheduler.hydrateContent(mainContent, {
    dispatchTarget: appRouter,
  });
};

const bootstrapClient = async (): Promise<void> => {
  initTheme();
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
