import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../ui/icon/icon.js';
import '../ui/header/header.js';
import '../ui/search-trigger/search-trigger.js';
import '../ui/button/button.js';
import '../ui/dropdown/dropdown.js';
import { DEFAULT_LAYOUT_SIDEBAR_ID, layoutSidebarController } from './layout-sidebar-controller.js';
import { layoutTocMobileController } from './layout-toc-mobile-controller.js';
import {
  layoutTocRuntimeStore,
  type LayoutTocRuntimeSnapshot,
} from './layout-toc-runtime-store.js';
import { navigateToUrl } from '../../search/navigation.js';
import {
  THEME_CHANGE_EVENT,
  applyThemePreference,
  readStoredThemePreference,
  type ThemeChangeDetail,
  type ThemePreference,
} from '../../theme/theme-manager.js';
import type { IconName } from '../../../shared/icons/icons-catalog.js';
import type { HeaderShellProjection } from '../../../shared/navigation/shell-projection.js';
import type { TocPresence } from '../../../shared/note/toc-presence.js';

interface CorpusNavigationItem {
  key: string;
  label: string;
  href: string;
}

const DEFAULT_CORPUS_ITEMS: readonly CorpusNavigationItem[] = [
  {
    key: 'all',
    label: 'すべてのノート',
    href: '/corpora/',
  },
];

const THEME_OPTIONS: Record<
  ThemePreference,
  {
    icon: IconName;
    label: string;
  }
> = {
  light: {
    icon: 'sun',
    label: 'ライト',
  },
  dark: {
    icon: 'moon',
    label: 'ダーク',
  },
  system: {
    icon: 'monitor',
    label: 'OSテーマ',
  },
};

const DEFAULT_TOC_RUNTIME_VIEW: LayoutTocRuntimeSnapshot = {
  ready: false,
  hasVisibleHeadings: false,
  activeId: null,
};

@customElement('layout-header')
export class LayoutHeader extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: var(--z-page-chrome, var(--z-fixed, 100));
      container-type: inline-size;
      container-name: layout-header-shell;
      --_layout-header-trigger-content-gap-default: var(
        --layout-header-trigger-content-gap-default,
        var(--space-2, 8px)
      );
      --_layout-header-trigger-content-gap-compact: var(
        --layout-header-trigger-content-gap-compact,
        var(--space-1, 4px)
      );
      --_layout-header-trigger-affordance-gap-default: var(
        --layout-header-trigger-affordance-gap-default,
        var(--space-2, 8px)
      );
      --_layout-header-trigger-affordance-gap-compact: var(
        --layout-header-trigger-affordance-gap-compact,
        var(--space-1, 4px)
      );
      --_layout-header-trigger-padding-inline-default: var(
        --layout-header-trigger-padding-inline-default,
        var(--space-3, 12px)
      );
      --_layout-header-trigger-padding-inline-compact: var(
        --layout-header-trigger-padding-inline-compact,
        var(--space-2, 8px)
      );
    }

    .brand {
      display: inline-flex;
      align-items: center;
      color: var(--fg-default);
      text-decoration: none;
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-semibold, 600);
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .brand:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--focus-ring-radius, 4px);
    }

    .context {
      color: var(--fg-muted);
      font-family: var(--font-mono);
      font-size: var(--text-xs, 12px);
      letter-spacing: var(--tracking-wide, 0.05em);
      text-transform: uppercase;
    }

    .slot-group {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      min-inline-size: 0;
      overflow: visible;
    }

    .slot-group > :focus-within {
      position: relative;
      z-index: 1;
    }

    ui-header {
      --ui-header-center-start-inset: 0px;
      --ui-header-center-end-inset: 0px;
      --ui-header-max-inline-size: var(--layout-chrome-max-width, 1280px);
      --ui-header-max-inline-size-with-sidebar: var(--ui-header-max-inline-size);
    }

    :host([note-layout]) ui-header {
      --ui-header-center-end-inset: clamp(
        184px,
        24vw,
        calc(var(--note-toc-width, 216px) + var(--note-shell-column-gap, var(--space-8, 32px)))
      );
    }

    :host([sidebar-enabled]) ui-header {
      --ui-header-center-start-inset: 44px;
    }

    :host([note-layout][sidebar-enabled]) ui-header {
      --ui-header-max-inline-size: calc(
        var(--note-fixed-frame-max-width, 1440px) - (var(--space-4, 16px) * 2)
      );
      --ui-header-max-inline-size-with-sidebar: var(--ui-header-max-inline-size);
    }

    .sidebar-toggle {
      display: inline-flex;
    }

    .theme-trigger-label,
    .corpus-trigger-label {
      display: inline-flex;
      align-items: center;
      gap: var(--_layout-header-trigger-affordance-gap-default);
      min-inline-size: 0;
      max-inline-size: 100%;
    }

    .theme-trigger-main,
    .corpus-trigger-main {
      display: inline-flex;
      align-items: center;
      gap: var(--_layout-header-trigger-content-gap-default);
      min-inline-size: 0;
      max-inline-size: 100%;
    }

    .corpus-trigger-label {
      color: var(--fg-default);
    }

    .corpus-trigger-main,
    .theme-trigger-main {
      min-inline-size: 0;
    }

    .corpus-trigger-text {
      display: inline-block;
      min-inline-size: 0;
      max-inline-size: min(13rem, 28vw);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .corpus-switcher {
      display: inline-flex;
      min-inline-size: 0;
    }

    .theme-trigger-label {
      color: var(--fg-control-label, var(--fg-muted));
    }

    [data-dropdown='theme'] {
      --ui-dropdown-max-inline-size: 240px;
    }

    .theme-trigger-text {
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .theme-trigger-icon,
    .theme-trigger-chevron,
    .toc-trigger-icon,
    .corpus-trigger-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      flex-shrink: 0;
    }

    .theme-trigger-icon {
      color: var(--fg-control-affordance, var(--fg-subtle));
    }

    .theme-trigger-chevron {
      color: var(--fg-control-affordance, var(--fg-subtle));
    }

    .corpus-trigger-icon {
      color: var(--fg-control-affordance, var(--fg-subtle));
    }

    .toc-trigger {
      display: none;
      align-items: center;
      gap: var(--_layout-header-trigger-content-gap-compact);
      min-inline-size: 0;
      max-inline-size: min(16rem, 42vw);
      block-size: var(--control-height-md, 36px);
      padding-inline: var(--_layout-header-trigger-padding-inline-compact);
      border: none;
      background: transparent;
      color: var(--fg-default);
      border-radius: var(--radius-md, 8px);
      cursor: pointer;
      font: inherit;
    }

    .toc-trigger:hover {
      background: var(--bg-hover, color-mix(in srgb, var(--bg-default) 88%, var(--fg-default) 12%));
    }

    .toc-trigger:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .toc-trigger-text {
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--text-sm, 13px);
    }

    ui-search-trigger {
      --search-trigger-gap: var(--_layout-header-trigger-content-gap-default);
      --search-trigger-gap-compact: var(--_layout-header-trigger-content-gap-compact);
      --search-trigger-padding-inline: var(--_layout-header-trigger-padding-inline-default);
      --search-trigger-padding-inline-compact: var(--_layout-header-trigger-padding-inline-compact);
    }

    @container layout-header-shell (min-width: 1024px) {
      :host([note-layout]) ui-header {
        --ui-header-center-end-inset: calc(
          var(--note-toc-width, 216px) + var(--note-shell-column-gap, var(--space-8, 32px))
        );
      }

      :host([sidebar-enabled]) ui-header {
        --ui-header-center-start-inset: calc(
          var(--note-sidebar-width, 248px) + var(--note-sidebar-main-gap, 0px)
        );
      }

      :host([note-layout][sidebar-enabled]) .corpus-switcher {
        margin-inline-start: clamp(var(--space-2, 8px), 2vw, var(--space-6, 24px));
      }

      .sidebar-toggle {
        display: none;
      }
    }

    @container layout-header-shell (max-width: 639px) {
      :host {
        z-index: var(--z-anchored-overlay, var(--z-popover, 400));
      }

      :host([note-layout][sidebar-enabled]) .corpus-switcher {
        display: none;
      }

      :host([note-layout]) .toc-trigger {
        max-inline-size: min(11rem, 32vw);
      }

      .corpus-trigger-text {
        max-inline-size: min(9rem, 42vw);
      }

      .theme-trigger-text {
        display: none;
      }

      .theme-trigger-label,
      .corpus-trigger-label {
        gap: var(--_layout-header-trigger-affordance-gap-compact);
      }

      .theme-trigger-main,
      .corpus-trigger-main {
        gap: var(--_layout-header-trigger-content-gap-compact);
      }

      .toc-trigger[data-visible='true'] {
        display: inline-flex;
      }
    }

    @container layout-header-shell (max-width: 399px) {
      .toc-trigger-text {
        display: none;
      }
    }
  `;

  @property({ type: String, attribute: 'corpora-json' })
  corporaJson = '';

  @property({ type: String, attribute: 'current-corpus-key' })
  currentCorpusKey = 'all';

  @property({ type: Boolean, reflect: true, attribute: 'note-layout' })
  noteLayout = false;

  @property({ type: Boolean, reflect: true, attribute: 'sidebar-enabled' })
  sidebarEnabled = false;

  @property({ type: String, reflect: true, attribute: 'toc-presence' })
  tocPresence: TocPresence = 'absent';

  @property({ type: String, attribute: 'toc-runtime-id' })
  tocRuntimeId = '';

  @property({ type: String, attribute: 'sidebar-id' })
  sidebarId = DEFAULT_LAYOUT_SIDEBAR_ID;

  @state()
  private _headerSidebarReserved = false;

  @state()
  private _sidebarOpen = false;

  @state()
  private _overlaySidebarOpen = false;

  @state()
  private _themePreference: ThemePreference = 'system';

  @state()
  private _tocRuntimeView: LayoutTocRuntimeSnapshot = DEFAULT_TOC_RUNTIME_VIEW;

  @state()
  private _tocPanelOpen = false;

  @state()
  private _isNarrowLayout = false;

  @query('[data-dropdown="theme"]')
  private _themeDropdownElement!: HTMLElement | null;

  @query('.toc-trigger')
  private _tocTriggerElement!: HTMLButtonElement | null;

  private _sidebarControllerCleanup: (() => void) | null = null;
  private _tocRuntimeCleanup: (() => void) | null = null;
  private _tocMobileCleanup: (() => void) | null = null;
  private _resizeObserver: ResizeObserver | null = null;

  applyShellProjection(snapshot: HeaderShellProjection): void {
    this.corporaJson = JSON.stringify(snapshot.corpora);
    this.currentCorpusKey = snapshot.currentCorpusKey;
    this.noteLayout = snapshot.noteLayout;
    this.sidebarEnabled = snapshot.sidebarEnabled;
    this.tocPresence = snapshot.tocPresence;
    this.tocRuntimeId = snapshot.tocRuntimeId ?? '';
  }

  readShellProjection(): HeaderShellProjection {
    return {
      corpora: this._corpusItems,
      currentCorpusKey: this.currentCorpusKey.trim() || 'all',
      noteLayout: this.noteLayout,
      sidebarEnabled: this.sidebarEnabled,
      tocPresence: this.tocPresence,
      tocRuntimeId: this._readTocRuntimeId(),
    };
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof window === 'undefined') {
      return;
    }

    this._themePreference = readStoredThemePreference();
    window.addEventListener(THEME_CHANGE_EVENT, this._handleThemeChange as EventListener);
    this._connectSidebarController();
    this._connectTocControllers();
    this._syncResponsiveState(this.getBoundingClientRect().width);
    this._startResizeObserver();
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('sidebarEnabled') || changedProperties.has('sidebarId')) {
      this._connectSidebarController();
    }

    if (changedProperties.has('tocRuntimeId') || changedProperties.has('tocPresence')) {
      this._connectTocControllers();
    }
  }

  override disconnectedCallback(): void {
    this._sidebarControllerCleanup?.();
    this._sidebarControllerCleanup = null;
    this._tocRuntimeCleanup?.();
    this._tocRuntimeCleanup = null;
    this._tocMobileCleanup?.();
    this._tocMobileCleanup = null;
    this._stopResizeObserver();

    if (typeof window !== 'undefined') {
      window.removeEventListener(THEME_CHANGE_EVENT, this._handleThemeChange as EventListener);
    }
    super.disconnectedCallback();
  }

  private _startResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this._stopResizeObserver();
    this._resizeObserver = new ResizeObserver((entries) => {
      const entry = entries.at(0);
      if (!entry) {
        return;
      }

      this._syncResponsiveState(entry.contentRect.width);
    });
    this._resizeObserver.observe(this);
  }

  private _stopResizeObserver(): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
  }

  private _syncResponsiveState(width: number): void {
    const nextIsNarrowLayout = width > 0 && width <= 639;
    if (this._isNarrowLayout !== nextIsNarrowLayout) {
      this._isNarrowLayout = nextIsNarrowLayout;
    }
  }

  private _connectSidebarController(): void {
    this._sidebarControllerCleanup?.();
    this._sidebarControllerCleanup = null;

    if (!this.sidebarEnabled) {
      this._headerSidebarReserved = false;
      this._sidebarOpen = false;
      this._overlaySidebarOpen = false;
      return;
    }

    this._sidebarControllerCleanup = layoutSidebarController.subscribe(
      this._resolveSidebarId(),
      (snapshot) => {
        this._headerSidebarReserved = !this.noteLayout && snapshot.mode === 'fixed';
        this._sidebarOpen = snapshot.state === 'expanded';
        this._overlaySidebarOpen = snapshot.mode === 'overlay' && snapshot.state === 'expanded';
      },
    );
  }

  private _connectTocControllers(): void {
    this._tocRuntimeCleanup?.();
    this._tocRuntimeCleanup = null;
    this._tocMobileCleanup?.();
    this._tocMobileCleanup = null;

    const runtimeId = this._readTocRuntimeId();
    if (runtimeId === null || this.tocPresence !== 'present') {
      this._tocRuntimeView = DEFAULT_TOC_RUNTIME_VIEW;
      this._tocPanelOpen = false;
      return;
    }

    this._tocRuntimeCleanup = layoutTocRuntimeStore.subscribe(runtimeId, (snapshot) => {
      this._tocRuntimeView = snapshot;
    });
    this._tocMobileCleanup = layoutTocMobileController.subscribe(runtimeId, (snapshot) => {
      this._tocPanelOpen = snapshot.panelOpen;
    });
  }

  private _readTocRuntimeId(): string | null {
    const normalized = this.tocRuntimeId.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private _resolveSidebarId(): string {
    const normalized = this.sidebarId.trim();
    return normalized.length > 0 ? normalized : DEFAULT_LAYOUT_SIDEBAR_ID;
  }

  private _handleSidebarToggleClick = (event: Event): void => {
    if (!this.sidebarEnabled) {
      return;
    }

    const trigger = event.currentTarget;
    layoutSidebarController.toggle(
      this._resolveSidebarId(),
      trigger instanceof HTMLElement ? trigger : undefined,
    );
  };

  private _handleTocTriggerClick = (): void => {
    const runtimeId = this._readTocRuntimeId();
    if (runtimeId === null) {
      return;
    }

    layoutTocMobileController.toggle(runtimeId, this._tocTriggerElement ?? undefined);
  };

  private _handleCorpusSelect = (event: CustomEvent<{ value: string }>): void => {
    const href = event.detail.value.trim();
    if (href.length === 0 || typeof window === 'undefined') {
      return;
    }

    void navigateToUrl(href);
  };

  private _handleThemeChange = (event: CustomEvent<ThemeChangeDetail>): void => {
    this._themePreference = event.detail.preference;
  };

  private _handleThemeSelect = (event: CustomEvent<{ value: string }>): void => {
    const nextPreference = event.detail.value;
    if (nextPreference !== 'light' && nextPreference !== 'dark' && nextPreference !== 'system') {
      return;
    }

    this._themePreference = nextPreference;
    applyThemePreference(nextPreference);
    void this._settleThemeDropdownFocus();
  };

  private async _settleThemeDropdownFocus(): Promise<void> {
    this._blurThemeDropdownTrigger();
    await this.updateComplete;
    this._blurThemeDropdownTrigger();
  }

  private _blurThemeDropdownTrigger(): void {
    const trigger = this._themeDropdownElement?.querySelector<HTMLElement>('[slot="trigger"]');
    trigger?.blur();
  }

  private get _corpusItems(): CorpusNavigationItem[] {
    const normalized = this.corporaJson.trim();
    if (normalized.length === 0) {
      return [...DEFAULT_CORPUS_ITEMS];
    }

    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (!Array.isArray(parsed)) {
        return [...DEFAULT_CORPUS_ITEMS];
      }

      const items = parsed.filter((item): item is CorpusNavigationItem => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return false;
        }

        const candidate = item as Record<string, unknown>;
        return (
          typeof candidate['key'] === 'string' &&
          typeof candidate['label'] === 'string' &&
          typeof candidate['href'] === 'string'
        );
      });

      return items.length > 0 ? items : [...DEFAULT_CORPUS_ITEMS];
    } catch {
      return [...DEFAULT_CORPUS_ITEMS];
    }
  }

  private get _currentCorpusItem(): CorpusNavigationItem | null {
    const currentKey = this.currentCorpusKey.trim() || 'all';
    return this._corpusItems.find((item) => item.key === currentKey) ?? null;
  }

  private _shouldRenderMobileTocTrigger(): boolean {
    return (
      this.tocPresence === 'present' &&
      this._tocRuntimeView.ready &&
      this._tocRuntimeView.hasVisibleHeadings
    );
  }

  private _readTocTriggerLabel(): string {
    return '目次';
  }

  private _readTocPanelId(): string | null {
    const runtimeId = this._readTocRuntimeId();
    return runtimeId ? `layout-toc-panel-${runtimeId}` : null;
  }

  override render() {
    const sidebarToggleLabel = this._sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く';
    const currentThemeOption = THEME_OPTIONS[this._themePreference];
    const corpusItems = this._corpusItems;
    const currentCorpusLabel = this._currentCorpusItem?.label ?? 'すべてのノート';
    const shouldRenderTocTrigger = this._shouldRenderMobileTocTrigger();
    const tocTriggerLabel = this._readTocTriggerLabel();
    const tocPanelId = this._readTocPanelId();
    const tocTriggerAriaLabel = this._tocPanelOpen ? '目次を閉じる' : '目次を開く';

    return html`
      <ui-header
        .sidebarExpanded=${this._headerSidebarReserved}
        .overlaySidebarOpen=${this._overlaySidebarOpen}
      >
        <div slot="start" class="slot-group">
          ${this.sidebarEnabled
            ? html`
                <ui-button
                  class="sidebar-toggle"
                  variant="ghost"
                  icon-only
                  aria-label="${sidebarToggleLabel}"
                  aria-expanded=${String(this._sidebarOpen)}
                  @click=${this._handleSidebarToggleClick}
                >
                  <ui-icon name="panel-left" aria-hidden="true"></ui-icon>
                </ui-button>
              `
            : null}
          <ui-dropdown class="corpus-switcher" @menu-item-select=${this._handleCorpusSelect}>
            <ui-button slot="trigger" variant="ghost">
              <span class="corpus-trigger-label">
                <span class="corpus-trigger-main">
                  <span class="corpus-trigger-text">${currentCorpusLabel}</span>
                </span>
                <ui-icon
                  class="corpus-trigger-icon"
                  name="chevron-down"
                  aria-hidden="true"
                ></ui-icon>
              </span>
            </ui-button>
            ${corpusItems.map(
              (item) => html`<ui-menu-item value=${item.href}>${item.label}</ui-menu-item>`,
            )}
          </ui-dropdown>
        </div>

        <div slot="end" class="slot-group">
          <button
            class="toc-trigger"
            type="button"
            data-visible=${String(shouldRenderTocTrigger)}
            aria-label=${tocTriggerAriaLabel}
            aria-expanded=${String(this._tocPanelOpen)}
            aria-controls=${tocPanelId ?? nothing}
            @click=${this._handleTocTriggerClick}
          >
            <ui-icon class="toc-trigger-icon" name="menu" aria-hidden="true"></ui-icon>
            <span class="toc-trigger-text">${tocTriggerLabel}</span>
          </button>

          <ui-search-trigger density="auto"></ui-search-trigger>

          <ui-dropdown
            data-dropdown="theme"
            align="end"
            @menu-item-select=${this._handleThemeSelect}
          >
            <ui-button slot="trigger" variant="ghost" accessible-name="テーマ">
              <span class="theme-trigger-label">
                <span class="theme-trigger-main">
                  <ui-icon
                    class="theme-trigger-icon"
                    name=${currentThemeOption.icon}
                    aria-hidden="true"
                  ></ui-icon>
                  <span class="theme-trigger-text">テーマ</span>
                </span>
                <ui-icon
                  class="theme-trigger-chevron"
                  name="chevron-down"
                  aria-hidden="true"
                ></ui-icon>
              </span>
            </ui-button>
            ${(
              Object.entries(THEME_OPTIONS) as [
                ThemePreference,
                (typeof THEME_OPTIONS)[ThemePreference],
              ][]
            ).map(
              ([value, option]) => html`
                <ui-menu-item value=${value} text-value=${option.label}>
                  <ui-icon name=${option.icon} aria-hidden="true"></ui-icon>
                  ${option.label}
                </ui-menu-item>
              `,
            )}
          </ui-dropdown>
        </div>
      </ui-header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-header': LayoutHeader;
  }
}
