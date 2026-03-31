import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { HydrationScheduler } from './client/hydration/scheduler.js';
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
  const appRouter = document.querySelector<HTMLElement>('app-router');
  const mainContent = document.querySelector<HTMLElement>('#main-content');
  if (!(mainContent instanceof HTMLElement)) {
    return;
  }

  await hydrationScheduler.hydrateContent(mainContent, {
    allowFallback: true,
    dispatchTarget: appRouter,
  });
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
