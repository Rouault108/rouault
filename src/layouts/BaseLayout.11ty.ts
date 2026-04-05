import type { ClientBundleData } from '../data/clientBundle.js';
import {
  buildNoteNavigationModel,
  type NoteNavigationEntry,
} from '../../build/navigation/index.js';
import {
  buildCorpusNavigation,
  resolveCurrentCorpusKey,
  type CorpusPageEntry,
} from '../data/corpusPages.js';
import { type BuildMetadataData } from '../data/buildMetadata.js';
import {
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  RESOLVED_THEME_ATTRIBUTE,
} from '../theme/theme-manager.js';
import { resolveNoteSurfacePolicy } from '../../shared/note/note-surface-policy.js';
import { escapeHtmlText, escapeInlineScriptText, serializeHtmlAttributes } from './html-output.js';

export interface BaseLayoutData {
  title?: string;
  description?: string;
  content: string;
  note?: NoteNavigationEntry;
  notes?: NoteNavigationEntry[];
  corpusPages?: readonly CorpusPageEntry[];
  currentCorpusKey?: string;
  buildMetadata?: BuildMetadataData;
  clientBundle?: ClientBundleData;
}

const buildThemeBootstrapScript = (): string =>
  `
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

export class BaseLayout {
  data() {
    return {
      title: 'Rouault',
    };
  }

  render(data: BaseLayoutData) {
    const title = data.title ? `${data.title} - Rouault` : 'Rouault';
    const description = data.description ?? '個人ノートを静かに読むためのWebアプリケーション';
    const clientScriptSrc = data.clientBundle?.scriptSrc ?? '/src/client.ts';
    const currentCorpusKey = resolveCurrentCorpusKey(data);
    const noteSurfacePolicy = resolveNoteSurfacePolicy(data.note?.kind);
    const corpora = buildCorpusNavigation(data.corpusPages ?? []);
    const breadcrumbs = buildNoteNavigationModel({
      currentNote: data.note,
      notes: data.notes ?? [],
    }).breadcrumbs;
    const footerAttributes = serializeHtmlAttributes([
      { name: 'build-label', value: data.buildMetadata?.buildLabel },
      { name: 'data-hydration-capability', value: 'static' },
      { name: 'data-hydration-trigger', value: 'initial' },
    ]);
    const themeBootstrapScript = buildThemeBootstrapScript();
    const bodyAttributes = serializeHtmlAttributes([
      {
        name: 'data-pagefind-ignore',
        value: Boolean(data.note && !noteSurfacePolicy.pagefind),
        kind: 'boolean',
      },
    ]);
    const headerAttributes = serializeHtmlAttributes([
      { name: 'note-layout', value: Boolean(data.note), kind: 'boolean' },
      { name: 'breadcrumbs-json', value: breadcrumbs, kind: 'json' },
      { name: 'corpora-json', value: corpora, kind: 'json' },
      { name: 'current-corpus-key', value: currentCorpusKey },
      { name: 'data-hydration-capability', value: 'interactive' },
      { name: 'data-hydration-trigger', value: 'initial' },
    ]);

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlText(title)}</title>
  <meta name="description"${serializeHtmlAttributes([{ name: 'content', value: description }])}>
  <script>${escapeInlineScriptText(themeBootstrapScript)}</script>
  <link rel="stylesheet" href="/assets/css/main.css">
  <script type="module"${serializeHtmlAttributes([{ name: 'src', value: clientScriptSrc }])}></script>
</head>
<body${bodyAttributes}>
  <ui-skip-link
    href="#main-content"
    label="メインコンテンツへ移動"
    data-hydration-scope="skip-link"
    data-hydration-capability="interactive"
    data-hydration-trigger="initial"
  ></ui-skip-link>
  <div id="app" class="app-root" data-hydration-scope="app-shell">
    <layout-header${headerAttributes}></layout-header>
    <app-router
      data-hydration-capability="interactive"
      data-hydration-trigger="initial"
    >
      <main id="main-content" tabindex="-1">
        ${data.content}
      </main>
    </app-router>
    <layout-footer${footerAttributes}></layout-footer>
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
