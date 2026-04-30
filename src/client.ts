import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { MAIN_CONTENT_SELECTOR } from '../shared/navigation/main-landmark-contract.js';
import type { AppRouter, AppRouterNavigationCommittedDetail } from './components/app/app-router.js';
import './components/ui/syntax-card/syntax-card.js';
import { HydrationScheduler } from './client/hydration/scheduler.js';
import { promoteDeclarativeShadowRoots } from './router/declarative-shadow-dom.js';
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

  promoteDeclarativeShadowRoots(mainContent);
  customElements.upgrade(mainContent);
  await Promise.resolve();

  await hydrationScheduler.hydrateContent(mainContent, {
    dispatchTarget: appRouter,
  });
};

const preloadLayoutSidebarDefinition = (): void => {
  if (!(document.querySelector('layout-sidebar') instanceof HTMLElement)) {
    return;
  }

  /*
   * WebKit の pre-hydration leakage 回帰試験では、
   * layout-sidebar の define 解決が shell hydration より後ろへずれると
   * boot marker cleanup の完了が不安定になることがある。
   * 先に module load を開始して、define 解決を前倒しする。
   */
  void import('./components/layout/layout-sidebar.js');
};

const installLayoutSidebarDefinitionGuard = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  void customElements.whenDefined('layout-sidebar').then(() => {
    queueMicrotask(() => {
      for (const element of document.querySelectorAll<HTMLElement>(
        'layout-sidebar[data-sidebar-boot-state="ssr"]',
      )) {
        customElements.upgrade(element);

        /*
         * connectedCallback / hydration activation 後も marker が残る場合の
         * 最終保険。pre-hydration guard を通常表示へ持ち越さない。
         */
        if (element.isConnected && element.getAttribute('data-sidebar-boot-state') === 'ssr') {
          element.removeAttribute('data-sidebar-boot-state');
        }
      }
    });
  });
};

const bootstrapClient = async (): Promise<void> => {
  initTheme();
  preloadLayoutSidebarDefinition();
  installLayoutSidebarDefinitionGuard();
  await hydrateShellScopes();
  initSearch();
  await hydrateCurrentContent();
};

document.addEventListener('app-router:navigation-committed', (event: Event) => {
  const detail = (event as CustomEvent<AppRouterNavigationCommittedDetail>).detail;
  const contentRoot = detail.contentRoot;
  void hydrateCurrentContent(contentRoot instanceof HTMLElement ? contentRoot : undefined);
});

void bootstrapClient();
