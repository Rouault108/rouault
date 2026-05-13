import {
  buildCorpusNavigation,
  resolveCurrentCorpusKey,
  type CorpusPageEntry,
} from '../data/corpusPages.js';
import { loadBuildMetadataData, type BuildMetadataData } from '../data/buildMetadata.js';
import {
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  RESOLVED_THEME_ATTRIBUTE,
} from '../theme/theme-manager.js';
import {
  APP_ROUTER_ANNOUNCEMENT_ARIA_ATOMIC,
  APP_ROUTER_ANNOUNCEMENT_ARIA_LIVE,
  APP_ROUTER_ANNOUNCEMENT_ATTRIBUTE,
  APP_ROUTER_ANNOUNCEMENT_CLASS_NAME,
} from '../../shared/app-router/app-router-announcement-contract.js';
import { MAIN_CONTENT_ID } from '../../shared/navigation/main-landmark-contract.js';
import { resolveEffectiveNoteChromeProfile } from '../../shared/note/note-chrome-profile.js';
import { resolveNoteChromePolicy } from '../../shared/note/note-chrome-policy.js';
import type { TocPresence } from '../../shared/note/toc-presence.js';
import { createHydrationMarkerAttributes } from '../../shared/hydration/hydration-markers.js';
import { buildDocumentTitle } from '../../shared/document-title.js';
import {
  escapeHtmlText,
  escapeInlineExecutableScriptText,
  serializeHtmlAttributes,
} from './html-output.js';
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import type { NoteNavigationEntry } from '../../build/navigation/index.js';
import {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT_ATTRIBUTE,
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_PRESENTATION,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from '../../shared/navigation/sidebar-shell-defaults.js';

export interface BaseLayoutData {
  title?: string;
  description?: string;
  content: string;
  notePage?: NotePageProjection;
  note?: NoteNavigationEntry;
  notes?: NoteNavigationEntry[];
  corpusPages?: readonly CorpusPageEntry[];
  currentCorpusKey?: string;
  buildMetadata?: BuildMetadataData | null;
  clientBundle?: unknown;
  headerTocPresence?: TocPresence;
  headerTocRuntimeId?: string;
  headerTocOwnerId?: string;
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

const DEFAULT_CLIENT_SCRIPT_SRC = '/src/client.ts';
const DEFAULT_CLIENT_STYLE_SRCS = ['/src/assets/css/main.css'] as const;
const SKIP_LINK_LABEL = 'メインコンテンツへ移動';
const SKIP_LINK_HREF = `#${MAIN_CONTENT_ID}`;

interface ClientBundleView {
  scriptSrc?: string;
  styleSrcs?: readonly string[];
}

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) &&
  value.every((entry: unknown): entry is string => typeof entry === 'string');

const normalizeClientBundle = (
  value: unknown,
): { scriptSrc: string; styleSrcs: readonly string[] } => {
  const candidate: ClientBundleView =
    typeof value === 'object' && value !== null ? (value as ClientBundleView) : {};

  return {
    scriptSrc:
      typeof candidate.scriptSrc === 'string' ? candidate.scriptSrc : DEFAULT_CLIENT_SCRIPT_SRC,
    styleSrcs: isStringArray(candidate.styleSrcs) ? candidate.styleSrcs : DEFAULT_CLIENT_STYLE_SRCS,
  };
};

const buildSidebarAttributes = (sidebar: NonNullable<NotePageProjection['sidebar']>): string =>
  serializeHtmlAttributes([
    { name: 'state-scope-id', value: sidebar.stateScopeId },
    { name: 'selected-id', value: sidebar.selectedId },
    { name: 'initial-expanded-ids', value: sidebar.initialExpandedIds, kind: 'json' },
    { name: 'topology-revision', value: sidebar.topologyRevision },
    { name: 'heading', value: sidebar.heading },
    { name: 'fixed-breakpoint', value: sidebar.fixedBreakpoint },
    { name: 'sidebar-id', value: sidebar.sidebarId },
    { name: 'presentation', value: sidebar.presentation },
    { name: 'data-sidebar-boot-state', value: 'ssr' },
    { name: 'data-hydration-capability', value: 'interactive' },
    { name: 'data-hydration-trigger', value: 'initial' },
  ]);

export class BaseLayout {
  render(data: BaseLayoutData) {
    if (data.buildMetadata === undefined || data.buildMetadata === null) {
      throw new Error('BaseLayout requires buildMetadata.');
    }

    const title = buildDocumentTitle(data.title);
    const description = data.description ?? '個人ノートを静かに読むためのWebアプリケーション';
    const clientBundle = normalizeClientBundle(data.clientBundle);
    const clientScriptSrc: string = clientBundle.scriptSrc;
    const clientStyleSrcs: readonly string[] = clientBundle.styleSrcs;
    const clientStyleLinks: string = clientStyleSrcs
      .map(
        (href: string): string =>
          `<link rel="stylesheet"${serializeHtmlAttributes([{ name: 'href', value: href }])}>`,
      )
      .join('\n  ');
    const currentCorpusKey = resolveCurrentCorpusKey(data);
    const noteChromePolicy = resolveNoteChromePolicy(
      resolveEffectiveNoteChromeProfile(data.note?.kind, data.note?.chromeProfile),
    );
    const isNotePage = data.note !== undefined;
    const shouldIgnorePagefind = isNotePage && (data.notePage?.pagefind ?? null) === null;
    const corpora = buildCorpusNavigation(data.corpusPages ?? []);
    const buildMetadata = loadBuildMetadataData({
      buildId: data.buildMetadata.buildId,
      buildLabel: data.buildMetadata.buildLabel,
      generatedAt: data.buildMetadata.generatedAt,
      sourceLabel: 'BaseLayout',
    });

    const footerAttributes = serializeHtmlAttributes([
      { name: 'build-label', value: buildMetadata.buildLabel },
      { name: 'data-hydration-capability', value: 'static' },
      { name: 'data-hydration-trigger', value: 'initial' },
    ]);
    const themeBootstrapScript = buildThemeBootstrapScript();
    const buildIdMeta = [
      `<meta name="rouault-build-id"${serializeHtmlAttributes([
        { name: 'content', value: buildMetadata.buildId },
      ])}>`,
      `<meta name="rouault-generated-at"${serializeHtmlAttributes([
        { name: 'content', value: buildMetadata.generatedAt },
      ])}>`,
    ].join('\n  ');
    const bodyAttributes = serializeHtmlAttributes([
      {
        name: 'data-pagefind-ignore',
        value: shouldIgnorePagefind,
        kind: 'boolean',
      },
    ]);
    const skipLinkAttributes = serializeHtmlAttributes([
      { name: 'class', value: 'skip-link' },
      { name: 'href', value: SKIP_LINK_HREF },
    ]);
    const tocPresence: TocPresence =
      data.notePage?.tocPresence ?? data.headerTocPresence ?? 'absent';
    const tocRuntimeId =
      data.notePage?.tocPresence === 'present'
        ? data.notePage.toc.runtimeId
        : (data.headerTocRuntimeId ?? '');
    const explicitHeaderTocOwnerId = data.headerTocOwnerId?.trim() ?? '';
    const tocOwnerId =
      data.notePage?.tocPresence === 'present'
        ? data.notePage.toc.ownerId
        : explicitHeaderTocOwnerId.length > 0
          ? explicitHeaderTocOwnerId
          : tocRuntimeId;
    const tocTriggerReserved = tocPresence === 'present' && tocOwnerId.length > 0;
    const headerAttributes = serializeHtmlAttributes([
      { name: 'note-layout', value: Boolean(data.note), kind: 'boolean' },
      {
        name: 'sidebar-enabled',
        value: Boolean(data.note && noteChromePolicy.sidebar),
        kind: 'boolean',
      },
      {
        name: 'sidebar-id',
        value: data.notePage?.sidebar?.sidebarId ?? DEFAULT_SIDEBAR_ID,
      },
      { name: 'toc-presence', value: tocPresence },
      { name: 'toc-runtime-id', value: tocRuntimeId },
      { name: 'toc-trigger-reserved', value: tocTriggerReserved ? 'true' : 'false' },
      { name: 'data-toc-owner-id', value: tocOwnerId },
      { name: 'corpora-json', value: corpora, kind: 'json' },
      { name: 'current-corpus-key', value: currentCorpusKey },
      { name: 'data-hydration-capability', value: 'interactive' },
      { name: 'data-hydration-trigger', value: 'initial' },
    ]);
    const sidebarPresence =
      data.notePage?.showSidebar && data.notePage.sidebar ? 'present' : 'absent';
    const shellMarkerAttributes = serializeHtmlAttributes(
      Object.entries(
        createHydrationMarkerAttributes({
          marker: 'reading-shell',
          ownerId: 'app-shell',
          scopeId: 'app-shell',
        }),
      ).map(([name, value]) => ({ name, value })),
    );

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <title>${escapeHtmlText(title)}</title>
  <meta name="description"${serializeHtmlAttributes([{ name: 'content', value: description }])}>
  ${buildIdMeta}
  <script>${escapeInlineExecutableScriptText(themeBootstrapScript)}</script>
  ${clientStyleLinks}
  <script type="module"${serializeHtmlAttributes([{ name: 'src', value: clientScriptSrc }])}></script>
</head>
<body${bodyAttributes}>
  <a${skipLinkAttributes}>${escapeHtmlText(SKIP_LINK_LABEL)}</a>
  <div id="app" class="app-root"${shellMarkerAttributes}>
    <layout-header${headerAttributes}></layout-header>
    <app-router
      data-sidebar-presence="${sidebarPresence}"
      data-hydration-capability="interactive"
      data-hydration-trigger="initial"
    >
      <div
        ${APP_ROUTER_ANNOUNCEMENT_ATTRIBUTE}
        aria-live="${APP_ROUTER_ANNOUNCEMENT_ARIA_LIVE}"
        aria-atomic="${APP_ROUTER_ANNOUNCEMENT_ARIA_ATOMIC}"
        class="${APP_ROUTER_ANNOUNCEMENT_CLASS_NAME}"
      ></div>
      <aside
        class="layout-sidebar-col"
        aria-label="ナビゲーション"
        data-app-shell-sidebar-host
        ${sidebarPresence === 'absent' ? 'hidden' : ''}
      >
        <layout-sidebar
          ${sidebarPresence === 'absent' ? 'hidden' : ''}
          ${
            data.notePage?.showSidebar && data.notePage.sidebar
              ? buildSidebarAttributes(data.notePage.sidebar)
              : serializeHtmlAttributes([
                  { name: 'sidebar-id', value: DEFAULT_SIDEBAR_ID },
                  { name: 'state-scope-id', value: DEFAULT_SIDEBAR_STATE_SCOPE_ID },
                  { name: 'fixed-breakpoint', value: DEFAULT_SIDEBAR_FIXED_BREAKPOINT_ATTRIBUTE },
                  { name: 'presentation', value: DEFAULT_SIDEBAR_PRESENTATION },
                  { name: 'data-hydration-capability', value: 'interactive' },
                  { name: 'data-hydration-trigger', value: 'initial' },
                ])
          }
        >${data.notePage?.showSidebar && data.notePage.sidebar ? data.notePage.sidebar.navHtml : ''}</layout-sidebar>
      </aside>
      <main id="${MAIN_CONTENT_ID}" tabindex="-1">
        ${data.content}
      </main>
    </app-router>
    <div class="layout-sidebar-overlay-layer" data-app-shell-sidebar-overlay-layer></div>
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
