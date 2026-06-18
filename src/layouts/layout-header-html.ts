import type { TocPresence } from '../../shared/note/toc-presence.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import type { CorpusNavigationProjectionPayload } from '../../shared/navigation/corpus-navigation-projection.js';
import { DEFAULT_SIDEBAR_ID } from '../../shared/navigation/sidebar-shell-defaults.js';
import { validateCorpusRouteRootHrefForRender } from '../../shared/link/corpus-link-validation.js';
import { renderStaticIconHtml } from '../../shared/icons/render-static-icon-html.js';
import { resolveLayoutTocStaticRootId } from '../../shared/toc/layout-toc-static-root-id.js';
import { THEME_UI_OPTIONS } from '../theme/theme-ui-options.js';
import type { ThemePreference } from '../theme/theme-manager.js';
import { escapeHtmlAttribute, escapeHtmlText, serializeHtmlAttributes } from './html-output.js';

export interface LayoutHeaderHtmlInput {
  readonly noteLayout: boolean;
  readonly sidebarEnabled: boolean;
  readonly sidebarId: string;
  readonly tocPresence: TocPresence;
  readonly tocRuntimeId?: string | undefined;
  readonly tocOwnerId?: string | undefined;
  readonly tocTriggerReserved: boolean;
  readonly corpora: CorpusNavigationProjectionPayload;
  readonly currentCorpusKey: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly searchHref: string;
}

const DEFAULT_CORPUS_LABEL = 'すべてのノート';

const renderSidebarToggle = (input: LayoutHeaderHtmlInput): string => {
  if (!input.sidebarEnabled) {
    return '';
  }

  return `
    <button
      class="sidebar-toggle"
      type="button"
      aria-label="サイドバーを開く"
      aria-expanded="false"
      data-layout-sidebar-toggle
      data-sidebar-id="${escapeHtmlAttribute(input.sidebarId)}"
    >
      ${renderStaticIconHtml('panel-left')}
    </button>
  `.trim();
};

const renderCorpusSwitcher = (input: LayoutHeaderHtmlInput): string => {
  const items = input.corpora.items.flatMap((item) => {
    const href = validateCorpusRouteRootHrefForRender({
      href: item.href,
      siteUrlContext: input.siteUrlContext,
    });
    if (href === null) {
      return [];
    }
    return [{ ...item, href }];
  });
  const current = items.find((item) => item.key === input.currentCorpusKey);
  const currentLabel = current?.label ?? DEFAULT_CORPUS_LABEL;
  const links = items
    .map((item) =>
      `
        <li>
          <a${serializeHtmlAttributes([
            { name: 'href', value: item.href },
            { name: 'data-link-kind', value: 'internal-document' },
            { name: 'data-link-surface', value: 'header' },
            { name: 'data-header-menu-item', value: 'true' },
            { name: 'data-header-menu-text', value: item.label },
            {
              name: 'aria-current',
              value: item.key === input.currentCorpusKey ? 'page' : undefined,
            },
          ])}>${escapeHtmlText(item.label)}</a>
        </li>
      `.trim(),
    )
    .join('');

  return `
    <details${serializeHtmlAttributes([
      { name: 'class', value: 'corpus-switcher' },
      { name: 'data-header-menu', value: 'corpus' },
    ])}>
      <summary${serializeHtmlAttributes([
        { name: 'class', value: 'corpus-trigger-label' },
        { name: 'aria-label', value: `コーパス: ${currentLabel}` },
        { name: 'data-header-menu-trigger', value: 'true' },
      ])}>
        <span class="corpus-trigger-main">
          <span class="corpus-trigger-text">${escapeHtmlText(currentLabel)}</span>
        </span>
        ${renderStaticIconHtml('chevron-down', 'corpus-trigger-icon')}
      </summary>
      <nav${serializeHtmlAttributes([
        { name: 'class', value: 'corpus-switcher__menu' },
        { name: 'aria-label', value: 'コーパス' },
        { name: 'data-header-menu-panel', value: 'true' },
      ])}>
        <ul>${links}</ul>
      </nav>
    </details>
  `.trim();
};

const renderTocTrigger = (input: LayoutHeaderHtmlInput): string => {
  const hasToc = input.tocPresence === 'present';
  if (!hasToc || !input.tocRuntimeId) {
    return '';
  }
  const staticTocRootId = resolveLayoutTocStaticRootId(input.tocRuntimeId);
  return `
    <a${serializeHtmlAttributes([
      { name: 'class', value: 'toc-trigger' },
      { name: 'href', value: `#${staticTocRootId}` },
      { name: 'data-visible', value: 'false' },
      { name: 'data-reserved', value: input.tocTriggerReserved ? 'true' : 'false' },
      { name: 'data-toc-trigger-reserved', value: input.tocTriggerReserved ? 'true' : 'false' },
      { name: 'data-toc-trigger-interactive', value: 'false' },
      { name: 'data-toc-hydration-state', value: 'unhydrated' },
      { name: 'data-toc-trigger', value: 'true' },
      { name: 'data-toc-runtime-id', value: input.tocRuntimeId },
      { name: 'data-link-kind', value: 'internal-fragment' },
      { name: 'data-link-surface', value: 'header' },
      { name: 'aria-label', value: '目次を開く' },
      { name: 'aria-expanded', value: 'false' },
      { name: 'aria-controls', value: staticTocRootId },
    ])}>
      ${renderStaticIconHtml('menu', 'toc-trigger-icon')}
      <span class="toc-trigger-text">目次</span>
    </a>
  `.trim();
};

const renderSearchTrigger = (input: LayoutHeaderHtmlInput): string =>
  `
  <a${serializeHtmlAttributes([
    { name: 'class', value: 'search-trigger' },
    { name: 'href', value: input.searchHref },
    { name: 'data-search-dialog-trigger', value: 'true' },
    { name: 'data-no-router', value: 'true' },
    { name: 'data-link-kind', value: 'internal-document' },
    { name: 'data-link-surface', value: 'header' },
    { name: 'aria-haspopup', value: 'dialog' },
    { name: 'aria-controls', value: 'global-search-dialog' },
    { name: 'aria-expanded', value: 'false' },
    { name: 'aria-label', value: '検索ダイアログを開く' },
  ])}>
    ${renderStaticIconHtml('search', 'search-trigger__icon')}
    <span class="search-trigger__placeholder" aria-hidden="true">検索...</span>
  </a>
`.trim();

const renderThemeSwitcher = (): string => {
  const preference: ThemePreference = 'system';
  const current = THEME_UI_OPTIONS[preference];
  const items = (
    Object.entries(THEME_UI_OPTIONS) as [
      ThemePreference,
      (typeof THEME_UI_OPTIONS)[ThemePreference],
    ][]
  )
    .map(([value, option]) => {
      const selected = value === preference;
      return `
        <li>
          <button${serializeHtmlAttributes([
            { name: 'type', value: 'button' },
            { name: 'data-theme-value', value },
            { name: 'data-selected', value: selected ? 'true' : undefined },
            { name: 'data-header-menu-item', value: 'true' },
            { name: 'data-header-menu-text', value: option.label },
            { name: 'aria-pressed', value: selected ? 'true' : 'false' },
          ])}>
            ${renderStaticIconHtml(selected ? 'check' : option.icon)}
            <span>${escapeHtmlText(option.label)}</span>
          </button>
        </li>
      `.trim();
    })
    .join('');

  return `
    <details${serializeHtmlAttributes([
      { name: 'class', value: 'theme-switcher' },
      { name: 'data-theme-switcher', value: 'true' },
      { name: 'data-header-menu', value: 'theme' },
    ])}>
      <summary${serializeHtmlAttributes([
        { name: 'class', value: 'theme-trigger-label' },
        { name: 'aria-label', value: `テーマ: ${current.label}` },
        { name: 'data-header-menu-trigger', value: 'true' },
      ])}>
        <span class="theme-trigger-main" data-theme-preference="${preference}">
          ${renderStaticIconHtml(current.icon, 'theme-trigger-icon')}
          <span class="theme-trigger-text" data-theme-current-label>${escapeHtmlText(current.label)}</span>
        </span>
        ${renderStaticIconHtml('chevron-down', 'theme-trigger-chevron')}
      </summary>
      <div${serializeHtmlAttributes([
        { name: 'class', value: 'theme-switcher__menu' },
        { name: 'role', value: 'group' },
        { name: 'aria-label', value: 'テーマ' },
        { name: 'data-header-menu-panel', value: 'true' },
      ])}>
        <ul>${items}</ul>
      </div>
    </details>
  `.trim();
};

export const renderLayoutHeaderHtml = (input: LayoutHeaderHtmlInput): string => {
  const sidebarId = input.sidebarId.trim() || DEFAULT_SIDEBAR_ID;
  const hasTocIdentity = input.tocPresence === 'present';
  return `
<header${serializeHtmlAttributes([
    { name: 'class', value: 'layout-header' },
    { name: 'data-layout-header', value: 'true' },
    { name: 'data-note-layout', value: input.noteLayout ? 'true' : 'false' },
    { name: 'data-sidebar-enabled', value: input.sidebarEnabled ? 'true' : 'false' },
    { name: 'data-sidebar-id', value: sidebarId },
    { name: 'data-toc-presence', value: input.tocPresence },
    { name: 'data-toc-runtime-id', value: hasTocIdentity ? input.tocRuntimeId : undefined },
    { name: 'data-toc-owner-id', value: hasTocIdentity ? input.tocOwnerId : undefined },
    { name: 'data-toc-trigger-reserved', value: input.tocTriggerReserved ? 'true' : 'false' },
    { name: 'data-current-corpus-key', value: input.currentCorpusKey },
  ])}>
  <div class="layout-header__inner">
    <div class="layout-header__start slot-group start-slot-group">
      ${renderSidebarToggle({ ...input, sidebarId })}
      ${renderCorpusSwitcher(input)}
    </div>
    <div class="layout-header__center"></div>
    <div class="layout-header__compact-center"></div>
    <div class="layout-header__end slot-group end-slot-group">
      ${renderTocTrigger(input)}
      ${renderSearchTrigger(input)}
      ${renderThemeSwitcher()}
    </div>
  </div>
</header>
  `.trim();
};
