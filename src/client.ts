/**
 * アプリケーションのクライアントサイドエントリーポイント
 *
 * Declarative Shadow DOM の hydration support を最初に読み込み、
 * 現在のDOMに存在するコンポーネントだけを段階的に読み込む。
 */

import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
import { loadModulesForDocument } from './client/component-loader.js';
import { initSearch } from './lib/search/bootstrap.js';
import { initTheme } from './lib/theme/theme-manager.js';

const bootstrapClient = async (): Promise<void> => {
  initTheme();
  await loadModulesForDocument(document);
  initSearch();
};

document.addEventListener('app-router:content-rendered', () => {
  void loadModulesForDocument(document);
});

void bootstrapClient();
