import {
  buildCorpusNavigation,
  resolveCurrentCorpusKey,
  type CorpusPageEntry,
} from '../data/corpusPages.js';
import { loadBuildMetadataData, type BuildMetadataData } from '../data/buildMetadata.js';
import { loadSiteUrlContextData, type SiteUrlContextData } from '../data/siteUrlContext.js';
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
import { createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';
import { normalizeRouaultPathname } from '../../shared/url/rouault-url-policy.js';
import { validateGeneratedPageHtmlLinkContracts } from '../../build/content/page-html-link-contracts.js';
import { resolveEffectiveNoteChromeProfile } from '../../shared/note/note-chrome-profile.js';
import { resolveNoteChromePolicy } from '../../shared/note/note-chrome-policy.js';
import type { TocPresence } from '../../shared/note/toc-presence.js';
import { createHydrationMarkerAttributes } from '../../shared/hydration/hydration-markers.js';
import {
  INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION,
  resolveInternalDocumentRouteManifestUrl,
} from '../../shared/navigation/internal-document-route-manifest-path.js';
import { buildDocumentTitle } from '../../shared/document-title.js';
import {
  escapeHtmlText,
  escapeInlineExecutableScriptText,
  serializeHtmlAttributes,
} from './html-output.js';
import { renderSearchDialogHtml } from './search-dialog-html.js';
import { renderDefaultLayoutFooterHtml } from './footer-html.js';
import { FOOTER_DOCUMENT_CSS, FOOTER_DOCUMENT_STYLE_ID } from '../components/ui/footer/footer.js';
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import type { NoteNavigationEntry } from '../../build/navigation/index.js';
import {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT_ATTRIBUTE,
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_PRESENTATION,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from '../../shared/navigation/sidebar-shell-defaults.js';
import { createCorpusNavigationProjectionPayload } from '../../shared/navigation/corpus-navigation-projection.js';
import { validateCorpusRouteRootHrefForRender } from '../../shared/link/corpus-link-validation.js';

export interface BaseLayoutData {
  title?: string;
  description?: string;
  content: string;
  notePage?: NotePageProjection;
  note?: NoteNavigationEntry;
  notes?: NoteNavigationEntry[];
  corpusPages?: readonly CorpusPageEntry[];
  tagPages?: readonly { readonly tag?: string }[];
  currentCorpusKey?: string;
  buildMetadata?: BuildMetadataData;
  siteUrlContext?: SiteUrlContextData;
  clientBundle?: unknown;
  headerTocPresence?: TocPresence;
  headerTocRuntimeId?: string;
  headerTocOwnerId?: string;
  headerTocShouldHydrate?: boolean;
  page?: { readonly url?: string };
}

type BaseLayoutRenderInput = Omit<BaseLayoutData, 'buildMetadata' | 'siteUrlContext'> & {
  buildMetadata?: BuildMetadataData | null;
  siteUrlContext?: SiteUrlContextData | null;
};

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


const STATIC_GENERATED_DOCUMENT_ROUTES = ['/', '/about/', '/search/', '/corpora/'] as const;

const normalizeGeneratedRoutePathname = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  let pathname: string;
  try {
    pathname = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed).pathname
      : new URL(trimmed, 'https://rouault.invalid').pathname;
  } catch {
    return null;
  }
  if (pathname.endsWith('/index.html')) {
    pathname = `${pathname.slice(0, -'/index.html'.length)}/`;
  } else if (pathname === '/index.html') {
    pathname = '/';
  }
  if (pathname === '/404.html') {
    return null;
  }
  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }
  return pathname.endsWith('/') || /\.[^/]+$/u.test(pathname) ? pathname : `${pathname}/`;
};

const addGeneratedRoute = (routes: Set<string>, value: unknown): void => {
  const pathname = normalizeGeneratedRoutePathname(value);
  if (pathname !== null) {
    routes.add(pathname);
    routes.add(normalizeRouaultPathname(pathname));
  }
};

const buildGeneratedPageRouteSet = (data: BaseLayoutRenderInput): Set<string> => {
  const routes = new Set<string>(STATIC_GENERATED_DOCUMENT_ROUTES);
  addGeneratedRoute(routes, data.page?.url);
  addGeneratedRoute(routes, data.note?.permalink);

  for (const note of data.notes ?? []) {
    addGeneratedRoute(routes, note.permalink);
    const genres = Array.isArray((note as { readonly genre?: unknown }).genre)
      ? ((note as { readonly genre?: unknown[] }).genre ?? [])
      : [];
    for (const genre of genres) {
      if (typeof genre === 'string' && genre.trim().length > 0) {
        addGeneratedRoute(routes, `/tags/${encodeURIComponent(genre.trim())}/`);
      }
    }
  }

  for (const corpusPage of data.corpusPages ?? []) {
    addGeneratedRoute(routes, corpusPage.href);
  }

  for (const tagPage of data.tagPages ?? []) {
    if (typeof tagPage.tag === 'string' && tagPage.tag.trim().length > 0) {
      addGeneratedRoute(routes, `/tags/${encodeURIComponent(tagPage.tag.trim())}/`);
    }
  }

  return routes;
};

const buildGeneratedPageCurrentUrl = (
  data: BaseLayoutRenderInput,
  siteUrlContext: SiteUrlContextData,
): string => {
  const pagePathname =
    normalizeGeneratedRoutePathname(data.note?.permalink) ??
    normalizeGeneratedRoutePathname(data.page?.url) ??
    '/';
  return `${siteUrlContext.siteOrigin}${siteUrlContext.basePath}${pagePathname}`;
};

const validateBaseLayoutGeneratedHtmlLinks = (
  html: string,
  data: BaseLayoutRenderInput,
  siteUrlContext: SiteUrlContextData,
): void => {
  const routeSet = buildGeneratedPageRouteSet(data);
  validateGeneratedPageHtmlLinkContracts({
    html,
    sourceLabel: `generated-page:${data.page?.url ?? 'unknown'}`,
    scope: 'generated-page',
    siteUrlContext,
    currentUrl: buildGeneratedPageCurrentUrl(data, siteUrlContext),
    routeClassificationMode: createManifestLoadedRouteClassificationMode({
      isInternalDocumentPathname: (pathname) => routeSet.has(pathname),
    }),
  });
};

export class BaseLayout {
  render(data: BaseLayoutData): string;
  render(data: BaseLayoutRenderInput): string {
    const rawBuildMetadata = data.buildMetadata;
    const rawSiteUrlContext = data.siteUrlContext;

    if (rawBuildMetadata === undefined || rawBuildMetadata === null) {
      throw new Error('BaseLayout requires buildMetadata.');
    }

    if (rawSiteUrlContext === undefined || rawSiteUrlContext === null) {
      throw new Error('BaseLayout requires siteUrlContext.');
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
    const corpora = createCorpusNavigationProjectionPayload(
      buildCorpusNavigation(data.corpusPages ?? []),
    );
    const buildMetadata = loadBuildMetadataData({
      buildId: rawBuildMetadata.buildId,
      buildLabel: rawBuildMetadata.buildLabel,
      generatedAt: rawBuildMetadata.generatedAt,
      sourceLabel: 'BaseLayout',
    });
    const siteUrlContext = loadSiteUrlContextData({
      siteOrigin: rawSiteUrlContext.siteOrigin,
      basePath: rawSiteUrlContext.basePath,
      sourceLabel: 'BaseLayout',
    });

    const footerHtml = renderDefaultLayoutFooterHtml(buildMetadata.buildLabel);
    const themeBootstrapScript = buildThemeBootstrapScript();
    const routeManifestUrl = resolveInternalDocumentRouteManifestUrl({
      siteUrlContext,
      buildId: buildMetadata.buildId,
    });
    const buildIdMeta = [
      `<meta name="rouault-build-id"${serializeHtmlAttributes([
        { name: 'content', value: buildMetadata.buildId },
      ])}>`,
      `<meta name="rouault-generated-at"${serializeHtmlAttributes([
        { name: 'content', value: buildMetadata.generatedAt },
      ])}>`,
      `<meta name="rouault-site-origin"${serializeHtmlAttributes([
        { name: 'content', value: siteUrlContext.siteOrigin },
      ])}>`,
      `<meta name="rouault-base-path"${serializeHtmlAttributes([
        { name: 'content', value: siteUrlContext.basePath },
      ])}>`,
      `<meta name="rouault-route-manifest"${serializeHtmlAttributes([
        { name: 'content', value: routeManifestUrl },
      ])}>`,
      `<meta name="rouault-route-manifest-build-id"${serializeHtmlAttributes([
        { name: 'content', value: buildMetadata.buildId },
      ])}>`,
      `<meta name="rouault-route-manifest-version"${serializeHtmlAttributes([
        { name: 'content', value: String(INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION) },
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
      { name: 'data-link-kind', value: 'internal-fragment' },
      { name: 'data-link-surface', value: 'structural' },
    ]);
    const tocPresence: TocPresence =
      data.notePage?.tocPresence ?? data.headerTocPresence ?? 'absent';
    const explicitHeaderTocShouldHydrate = data.headerTocShouldHydrate === true;
    if (
      data.notePage === undefined &&
      tocPresence === 'present' &&
      !explicitHeaderTocShouldHydrate
    ) {
      throw new Error('BaseLayout requires hydrated TOC for non-note headerTocPresence=present.');
    }
    const rawTocRuntimeId =
      data.notePage?.tocPresence === 'present'
        ? data.notePage.toc.runtimeId
        : (data.headerTocRuntimeId ?? '').trim();
    const tocRuntimeId = tocPresence === 'present' && rawTocRuntimeId.length > 0 ? rawTocRuntimeId : undefined;
    const explicitHeaderTocOwnerId = data.headerTocOwnerId?.trim() ?? '';
    const rawTocOwnerId =
      data.notePage?.tocPresence === 'present'
        ? data.notePage.toc.ownerId
        : explicitHeaderTocOwnerId.length > 0
          ? explicitHeaderTocOwnerId
          : (tocRuntimeId ?? '');
    const tocOwnerId = tocPresence === 'present' && rawTocOwnerId.length > 0 ? rawTocOwnerId : undefined;
    const tocTriggerReserved =
      tocPresence === 'present' &&
      tocOwnerId !== undefined &&
      (data.notePage?.toc.shouldHydrate ?? explicitHeaderTocShouldHydrate);
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
      { name: 'site-origin', value: siteUrlContext.siteOrigin },
      { name: 'base-path', value: siteUrlContext.basePath },
      { name: 'data-hydration-capability', value: 'interactive' },
      { name: 'data-hydration-trigger', value: 'initial' },
    ]);
    const corpusFallbackAnchors = corpora.items
      .flatMap((item) => {
        const href = validateCorpusRouteRootHrefForRender({
          href: item.href,
          siteUrlContext,
        });
        if (href === null) {
          return [];
        }

        return [
          `<a${serializeHtmlAttributes([
            { name: 'href', value: href },
            { name: 'data-link-kind', value: 'internal-document' },
            { name: 'data-link-surface', value: 'header' },
          ])}>${escapeHtmlText(item.label)}</a>`,
        ];
      })
      .join('');
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

    const html = `
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
  <style id="${FOOTER_DOCUMENT_STYLE_ID}">${FOOTER_DOCUMENT_CSS}</style>
  ${clientStyleLinks}
  <script type="module"${serializeHtmlAttributes([{ name: 'src', value: clientScriptSrc }])}></script>
</head>
<body${bodyAttributes}>
  <a${skipLinkAttributes}>${escapeHtmlText(SKIP_LINK_LABEL)}</a>
  <div id="app" class="app-root"${shellMarkerAttributes}>
    <layout-header${headerAttributes}>${corpusFallbackAnchors}</layout-header>
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
    ${footerHtml}
  </div>
  ${renderSearchDialogHtml()}
</body>
</html>
    `.trim();

    validateBaseLayoutGeneratedHtmlLinks(html, data, siteUrlContext);

    return html;
  }
}

export default BaseLayout;
