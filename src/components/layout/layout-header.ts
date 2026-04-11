import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../ui/icon/icon.js';
import '../ui/header/header.js';
import '../ui/search-trigger/search-trigger.js';
import '../ui/breadcrumbs/breadcrumbs.js';
import '../ui/button/button.js';
import '../ui/dropdown/dropdown.js';
import type { BreadcrumbItem } from '../ui/breadcrumbs/breadcrumbs.js';
import {
  DEFAULT_LAYOUT_SIDEBAR_ID,
  layoutSidebarController,
} from './layout-sidebar-controller.js';
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

@customElement('layout-header')
export class LayoutHeader extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: var(--z-fixed, 100);
      container-type: inline-size;
      container-name: layout-header-shell;
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

    .breadcrumbs {
      inline-size: 100%;
      max-inline-size: 100%;
      min-inline-size: 0;
    }

    .slot-group {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      min-inline-size: 0;
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
        calc(
          var(--note-toc-width, 216px) +
            var(--note-shell-column-gap, var(--space-8, 32px))
        )
      );
    }

    :host([sidebar-enabled]) ui-header {
      --ui-header-center-start-inset: 44px;
    }

    :host([note-layout][sidebar-enabled]) ui-header {
      /* fixed sidebar でも header 自体の外形は note frame と揃える。
       * sidebarExpanded は start zone の予約可否だけを表し、max width の契約とは切り離す */
      --ui-header-max-inline-size: calc(
        var(--note-fixed-frame-max-width, 1440px) - (var(--space-4, 16px) * 2)
      );
      --ui-header-max-inline-size-with-sidebar: var(--ui-header-max-inline-size);
    }

    .sidebar-toggle {
      display: inline-flex;
    }

    .theme-trigger-label,
    .theme-menu-label,
    .corpus-trigger-label {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      min-inline-size: 0;
      max-inline-size: 100%;
    }

    .corpus-trigger-label {
      color: var(--fg-default);
    }

    .corpus-trigger-text {
      display: inline-block;
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
      color: var(--fg-subtle, var(--fg-muted));
    }

    .theme-trigger-text {
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .corpus-chevron,
    .theme-menu-icon,
    .theme-trigger-icon,
    .theme-chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      flex-shrink: 0;
    }

    .theme-trigger-icon,
    .corpus-chevron,
    .theme-chevron {
      opacity: 0.78;
    }

    @container layout-header-shell (min-width: 1024px) {
      :host([note-layout]) ui-header {
        --ui-header-center-end-inset: calc(
          var(--note-toc-width, 216px) +
            var(--note-shell-column-gap, var(--space-8, 32px))
        );
      }

      :host([sidebar-enabled]) ui-header {
        --ui-header-center-start-inset: var(--note-sidebar-width, 248px);
      }

      :host([note-layout][sidebar-enabled]) .corpus-switcher {
        margin-inline-start: clamp(var(--space-2, 8px), 2vw, var(--space-6, 24px));
      }

      .sidebar-toggle {
        display: none;
      }
    }

    @container layout-header-shell (max-width: 639px) {
      .corpus-trigger-text {
        max-inline-size: min(9rem, 42vw);
      }

      .theme-trigger-text {
        display: none;
      }
    }
  `;

  @property({ type: String, attribute: 'breadcrumbs-json' })
  breadcrumbsJson = '';

  @property({ type: String, attribute: 'corpora-json' })
  corporaJson = '';

  @property({ type: String, attribute: 'current-corpus-key' })
  currentCorpusKey = 'all';

  @property({ type: Boolean, reflect: true, attribute: 'note-layout' })
  noteLayout = false;

  @property({ type: Boolean, reflect: true, attribute: 'sidebar-enabled' })
  sidebarEnabled = false;

  @property({ type: String, attribute: 'sidebar-id' })
  sidebarId = DEFAULT_LAYOUT_SIDEBAR_ID;

  @state()
  private _headerSidebarReserved = false;

  @state()
  private _sidebarOpen = false;

  @state()
  private _themePreference: ThemePreference = 'system';

  @query('[data-dropdown="theme"]')
  private _themeDropdownElement!: HTMLElement | null;

  private _sidebarControllerCleanup: (() => void) | null = null;

  applyShellProjection(snapshot: HeaderShellProjection): void {
    // router は route 由来表示値のみを注入し、toggle 状態などの一時 UI 状態は component が保持する。
    this.breadcrumbsJson = JSON.stringify(snapshot.breadcrumbs);
    this.corporaJson = JSON.stringify(snapshot.corpora);
    this.currentCorpusKey = snapshot.currentCorpusKey;
    this.noteLayout = snapshot.noteLayout;
    this.sidebarEnabled = snapshot.sidebarEnabled;
  }

  readShellProjection(): HeaderShellProjection {
    return {
      breadcrumbs: this._breadcrumbItems,
      corpora: this._corpusItems,
      currentCorpusKey: this.currentCorpusKey.trim() || 'all',
      noteLayout: this.noteLayout,
      sidebarEnabled: this.sidebarEnabled,
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
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('sidebarEnabled') || changedProperties.has('sidebarId')) {
      this._connectSidebarController();
    }
  }

  override disconnectedCallback(): void {
    this._sidebarControllerCleanup?.();
    this._sidebarControllerCleanup = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener(THEME_CHANGE_EVENT, this._handleThemeChange as EventListener);
    }
    super.disconnectedCallback();
  }

  private _connectSidebarController(): void {
    this._sidebarControllerCleanup?.();
    this._sidebarControllerCleanup = null;

    if (!this.sidebarEnabled) {
      this._headerSidebarReserved = false;
      this._sidebarOpen = false;
      return;
    }

    this._sidebarControllerCleanup = layoutSidebarController.subscribe(
      this._resolveSidebarId(),
      (snapshot) => {
        // note layout では本文列と header 内部幅を同じ上限で止め、
        // fixed sidebar であっても header 側に追加の幅予約を持ち込まない。
        this._headerSidebarReserved = !this.noteLayout && snapshot.mode === 'fixed';
        this._sidebarOpen = snapshot.state === 'expanded';
      },
    );
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

  private get _breadcrumbItems(): BreadcrumbItem[] {
    const normalized = this.breadcrumbsJson.trim();
    if (normalized.length === 0) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item): item is BreadcrumbItem => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return false;
        }

        const candidate = item as Record<string, unknown>;
        return (
          typeof candidate['label'] === 'string' &&
          (candidate['href'] === undefined || typeof candidate['href'] === 'string')
        );
      });
    } catch {
      return [];
    }
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

  override render() {
    const breadcrumbs = this._breadcrumbItems;
    const sidebarToggleLabel = this._sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く';
    const currentThemeOption = THEME_OPTIONS[this._themePreference];
    const corpusItems = this._corpusItems;
    const currentCorpusLabel = this._currentCorpusItem?.label ?? 'すべてのノート';
    const hasBreadcrumbs = breadcrumbs.length > 0;
    const shouldRenderHeaderBreadcrumbs = hasBreadcrumbs && !this.noteLayout;

    return html`
      <ui-header .sidebarExpanded=${this._headerSidebarReserved}>
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
                <span class="corpus-trigger-text">${currentCorpusLabel}</span>
              </span>
              <ui-icon
                class="corpus-chevron"
                name="chevron-down"
                aria-hidden="true"
                style="width:14px;height:14px;"
              ></ui-icon>
            </ui-button>
            ${corpusItems.map(
              (item) => html`<ui-menu-item value=${item.href}>${item.label}</ui-menu-item>`,
            )}
          </ui-dropdown>
        </div>
        ${shouldRenderHeaderBreadcrumbs
          ? html`
              <ui-breadcrumbs
                slot="center"
                class="breadcrumbs"
                items-json=${JSON.stringify(breadcrumbs)}
                aria-label="現在の階層"
              ></ui-breadcrumbs>
            `
          : nothing}
        <div slot="end" class="slot-group">
          <ui-search-trigger density="auto"></ui-search-trigger>
          <ui-dropdown
            data-dropdown="theme"
            align="end"
            @menu-item-select=${this._handleThemeSelect}
          >
            <ui-button slot="trigger" variant="ghost">
              <span class="theme-trigger-label">
                <ui-icon
                  class="theme-trigger-icon"
                  name=${currentThemeOption.icon}
                  aria-hidden="true"
                ></ui-icon>
                <span class="theme-trigger-text">テーマ</span>
              </span>
              <ui-icon class="theme-chevron" name="chevron-down" aria-hidden="true"></ui-icon>
            </ui-button>
            ${(
              Object.entries(THEME_OPTIONS) as [
                ThemePreference,
                (typeof THEME_OPTIONS)[ThemePreference],
              ][]
            ).map(
              ([value, option]) => html`
                <ui-menu-item value=${value}>
                  <span class="theme-menu-label">
                    <ui-icon
                      class="theme-menu-icon"
                      name=${option.icon}
                      aria-hidden="true"
                    ></ui-icon>
                    <span>${option.label}</span>
                  </span>
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
