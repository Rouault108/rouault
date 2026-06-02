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
import { buildThemeChromeBootstrapScript } from '../theme/theme-chrome-bootstrap.js';
import {
  APP_ROUTER_ANNOUNCEMENT_ARIA_ATOMIC,
  APP_ROUTER_ANNOUNCEMENT_ARIA_LIVE,
  APP_ROUTER_ANNOUNCEMENT_ATTRIBUTE,
  APP_ROUTER_ANNOUNCEMENT_CLASS_NAME,
} from '../../shared/app-router/app-router-announcement-contract.js';
import { MAIN_CONTENT_ID } from '../../shared/navigation/main-landmark-contract.js';
import { createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';
import { applyBasePathToRenderHref } from '../../shared/url/normalize-rouault-url.js';
import { validateGeneratedPageHtmlLinkContracts } from '../../build/content/page-html-link-contracts.js';
import {
  buildGeneratedDocumentRouteSet,
  resolveGeneratedDocumentCurrentUrl,
} from '../../build/content/generated-document-route-set.js';
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
import { renderLayoutHeaderHtml } from './layout-header-html.js';
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import type { NoteNavigationEntry } from '../../build/navigation/index.js';
import {
  DEFAULT_SIDEBAR_FIXED_BREAKPOINT_ATTRIBUTE,
  DEFAULT_SIDEBAR_ID,
  DEFAULT_SIDEBAR_PRESENTATION,
  DEFAULT_SIDEBAR_STATE_SCOPE_ID,
} from '../../shared/navigation/sidebar-shell-defaults.js';
import { createCorpusNavigationProjectionPayload } from '../../shared/navigation/corpus-navigation-projection.js';
import { createStaticRenderIdContext } from '../../shared/static-render-id-context.js';

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


const buildGeneratedPageRouteSet = (data: BaseLayoutRenderInput): Set<string> => {
  return buildGeneratedDocumentRouteSet({
    ...(data.page?.url !== undefined ? { pageUrl: data.page.url } : {}),
    ...(data.note?.permalink !== undefined ? { notePermalink: data.note.permalink } : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
    ...(data.corpusPages !== undefined ? { corpusPages: data.corpusPages } : {}),
    ...(data.tagPages !== undefined ? { tagPages: data.tagPages } : {}),
  });
};

const buildGeneratedPageCurrentUrl = (
  data: BaseLayoutRenderInput,
  siteUrlContext: SiteUrlContextData,
): string => {
  return resolveGeneratedDocumentCurrentUrl({
    pathname: data.note?.permalink,
    fallbackPathname: data.page?.url,
    siteUrlContext,
  });
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

    const idContext = createStaticRenderIdContext(
      data.page?.url ? `shell:${data.page.url}` : `shell:${title}`,
    );
    const footerHtml = renderDefaultLayoutFooterHtml(buildMetadata.buildLabel, { idContext });
    const themeBootstrapScript = buildThemeBootstrapScript();
    const themeChromeBootstrapScript = buildThemeChromeBootstrapScript();
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
    const searchHref = applyBasePathToRenderHref({
      pathname: '/search/',
      search: '',
      hash: '',
      siteUrlContext,
    });
    const headerHtml = renderLayoutHeaderHtml({
      noteLayout: Boolean(data.note),
      sidebarEnabled: Boolean(data.note && noteChromePolicy.sidebar),
      sidebarId: data.notePage?.sidebar?.sidebarId ?? DEFAULT_SIDEBAR_ID,
      tocPresence,
      tocRuntimeId,
      tocOwnerId,
      tocTriggerReserved,
      corpora,
      currentCorpusKey,
      siteUrlContext,
      searchHref,
    });
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
  ${clientStyleLinks}
  <script type="module"${serializeHtmlAttributes([{ name: 'src', value: clientScriptSrc }])}></script>
</head>
<body${bodyAttributes}>
  <a${skipLinkAttributes}>${escapeHtmlText(SKIP_LINK_LABEL)}</a>
  <div id="app" class="app-root"${shellMarkerAttributes}>
    <span
      hidden
      data-layout-header-enhancer-root
      data-hydration-key="layout-header-enhancer"
      data-hydration-capability="interactive"
      data-hydration-trigger="initial"
    ></span>
    ${headerHtml}
    <script data-theme-chrome-bootstrap>${escapeInlineExecutableScriptText(themeChromeBootstrapScript)}</script>
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
  ${renderSearchDialogHtml({ idContext })}
</body>
</html>
    `.trim();

    validateBaseLayoutGeneratedHtmlLinks(html, data, siteUrlContext);

    return html;
  }
}

export default BaseLayout;
