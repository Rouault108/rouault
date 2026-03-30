import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { HydrationScheduler } from './client/hydration/scheduler.js';
import { initSearch } from './lib/search/bootstrap.js';
import { initTheme } from './lib/theme/theme-manager.js';

const hydrationScheduler = new HydrationScheduler();

const queryElement = <T extends Element>(selector: string): T | null =>
  document.querySelector<T>(selector);

const hydrateShellScopes = async (): Promise<void> => {
  const shellScopes = [
    queryElement<HTMLElement>('[data-hydration-scope="skip-link"]'),
    queryElement<HTMLElement>('[data-hydration-scope="app-shell"]'),
    queryElement<HTMLElement>('[data-hydration-scope="global-search"]'),
  ].filter((scope): scope is HTMLElement => scope !== null);

  for (const scope of shellScopes) {
    await hydrationScheduler.hydrateShell(scope);
  }
};

const hydrateCurrentContent = async (): Promise<void> => {
  const appRouter = queryElement<HTMLElement>('app-router');
  const mainContent = queryElement<HTMLElement>('#main-content');
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
