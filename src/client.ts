import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { ensureComponentsForRoot } from './client/component-loader.js';
import { initSearch } from './lib/search/bootstrap.js';
import { initTheme } from './lib/theme/theme-manager.js';

const hydrateRenderedContent = async (): Promise<void> => {
  await ensureComponentsForRoot(document);
};

const bootstrapClient = async (): Promise<void> => {
  initTheme();
  await hydrateRenderedContent();
  initSearch();
};

document.addEventListener('app-router:content-rendered', () => {
  void hydrateRenderedContent();
});

void bootstrapClient();