import type { ClientBundleData } from '../data/clientBundle.js';
import {
  buildCorpusNavigation,
  resolveCurrentCorpusKey,
  type CorpusPageEntry,
} from '../data/corpusPages.js';
import {
  buildBreadcrumbs,
  type BreadcrumbSourceNote,
} from '../../lib/content/build-breadcrumbs.js';
import {
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  RESOLVED_THEME_ATTRIBUTE,
} from '../lib/theme/theme-manager.js';
import { resolveNoteSurfacePolicy } from '../types/note-surface-policy.js';

export interface BaseLayoutData {
  title?: string;
  description?: string;
  content: string;
  note?: BreadcrumbSourceNote;
  notes?: BreadcrumbSourceNote[];
  corpusPages?: readonly CorpusPageEntry[];
  currentCorpusKey?: string;
  clientBundle?: ClientBundleData;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class BaseLayout {
  data() {
    return {
      title: 'Rouault',
    };
  }

  render(data: BaseLayoutData) {
    const title = data.title ? `${data.title} - Rouault` : 'Rouault';
    const description = data.description ?? '個人ノートを静かに読むためのWebアプリケーション';
    const noteLayoutAttribute = data.note ? ' note-layout' : '';
    const clientScriptSrc = data.clientBundle?.scriptSrc ?? '/src/client.ts';
    const currentCorpusKey = resolveCurrentCorpusKey(data);
    const noteSurfacePolicy = resolveNoteSurfacePolicy(data.note?.['kind']);
    const pagefindIgnoreAttribute =
      data.note && !noteSurfacePolicy.pagefind ? ' data-pagefind-ignore' : '';
    const corporaJson = JSON.stringify(buildCorpusNavigation(data.corpusPages ?? []))
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const breadcrumbsJson = JSON.stringify(buildBreadcrumbs(data.note, data.notes ?? []))
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const themeBootstrapScript = `
(() => {
  const root = document.documentElement;
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  const themeAttribute = ${JSON.stringify(THEME_ATTRIBUTE)};
  const resolvedThemeAttribute = ${JSON.stringify(RESOLVED_THEME_ATTRIBUTE)};
  let preference = 'system';

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      preference = stored;
    }
  } catch {
    preference = 'system';
  }

  const resolvedTheme = preference === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;

  root.setAttribute(themeAttribute, preference);
  root.setAttribute(resolvedThemeAttribute, resolvedTheme);
  root.style.colorScheme = preference === 'system' ? 'light dark' : preference;
})();
    `.trim();

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${escapeAttribute(description)}">
  <script>${themeBootstrapScript}</script>
  <link rel="stylesheet" href="/assets/css/main.css">
  <script type="module" src="${escapeAttribute(clientScriptSrc)}"></script>
</head>
<body${pagefindIgnoreAttribute}>
  <ui-skip-link
    href="#main-content"
    label="メインコンテンツへ移動"
    data-hydration-scope="skip-link"
    data-hydration-capability="interactive"
    data-hydration-trigger="initial"
  ></ui-skip-link>
  <div id="app" class="app-root" data-hydration-scope="app-shell">
    <layout-header
      ${noteLayoutAttribute}
      breadcrumbs-json="${breadcrumbsJson}"
      corpora-json="${corporaJson}"
      current-corpus-key="${escapeAttribute(currentCorpusKey)}"
      data-hydration-capability="interactive"
      data-hydration-trigger="initial"
    ></layout-header>
    <app-router
      data-hydration-capability="interactive"
      data-hydration-trigger="initial"
    >
      <main id="main-content" tabindex="-1">
        ${data.content}
      </main>
    </app-router>
    <layout-footer></layout-footer>
  </div>
  <ui-search-dialog
    id="global-search-dialog"
    data-hydration-scope="global-search"
    data-hydration-capability="interactive"
    data-hydration-trigger="initial"
  ></ui-search-dialog>
</body>
</html>
    `.trim();
  }
}

export default BaseLayout;
