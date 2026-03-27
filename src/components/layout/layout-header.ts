import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../ui/icon/icon';
import '../ui/header/header';
import '../ui/search-trigger/search-trigger';
import '../ui/breadcrumbs/breadcrumbs';
import '../ui/button/button';
import '../ui/dropdown/dropdown';
import type { BreadcrumbItem } from '../ui/breadcrumbs/breadcrumbs';
import { navigateToUrl } from '../../lib/search/navigation.js';
import {
  THEME_CHANGE_EVENT,
  applyThemePreference,
  readStoredThemePreference,
  type ThemeChangeDetail,
  type ThemePreference,
} from '../../lib/theme/theme-manager.js';
import type { IconName } from '../../icons/catalog.js';

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
    }

    :host([note-layout]) ui-header {
      --ui-header-center-end-inset: max(200px, 34vw);
    }

    .theme-trigger-label,
    .theme-menu-label,
    .corpus-trigger-label {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      min-inline-size: 0;
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

    .theme-trigger-label {
      color: var(--fg-subtle, var(--fg-muted));
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

    @media (min-width: 768px) {
      :host([note-layout]) ui-header {
        --ui-header-center-start-inset: var(--sidebar-width, 272px);
        --ui-header-center-end-inset: var(--aside-width, 240px);
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

  @state()
  private _sidebarExpanded = true;

  @state()
  private _themePreference: ThemePreference = 'system';

  private _mediaQuery: MediaQueryList | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof window === 'undefined') {
      return;
    }

    this._themePreference = readStoredThemePreference();
    this._mediaQuery = window.matchMedia('(min-width: 768px)');
    this._syncFromMediaQuery();
    this._mediaQuery.addEventListener('change', this._onMediaQueryChange);
    window.addEventListener(THEME_CHANGE_EVENT, this._handleThemeChange as EventListener);
  }

  override disconnectedCallback(): void {
    this._mediaQuery?.removeEventListener('change', this._onMediaQueryChange);
    this._mediaQuery = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener(THEME_CHANGE_EVENT, this._handleThemeChange as EventListener);
    }
    super.disconnectedCallback();
  }

  private _syncFromMediaQuery(): void {
    this._sidebarExpanded = this._mediaQuery?.matches ?? true;
  }

  private _onMediaQueryChange = (): void => {
    this._syncFromMediaQuery();
  };

  private _handleSidebarToggleClick = (event: Event): void => {
    const trigger = event.currentTarget;
    this._sidebarExpanded = !this._sidebarExpanded;

    window.dispatchEvent(
      new CustomEvent('layout-sidebar-toggle-request', {
        detail: {
          trigger: trigger instanceof HTMLElement ? trigger : undefined,
        },
      }),
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
  };

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

  private get _compactContextLabel(): string {
    const breadcrumbs = this._breadcrumbItems;
    const lastItem = breadcrumbs.at(-1);

    if (lastItem?.label.trim()) {
      return lastItem.label.trim();
    }

    return this.noteLayout ? 'ノート' : 'ホーム';
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
    const sidebarToggleLabel = this._sidebarExpanded ? 'サイドバーを閉じる' : 'サイドバーを開く';
    const currentThemeOption = THEME_OPTIONS[this._themePreference];
    const corpusItems = this._corpusItems;
    const currentCorpusLabel = this._currentCorpusItem?.label ?? 'すべてのノート';
    const hasBreadcrumbs = breadcrumbs.length > 0;

    return html`
      <ui-header .sidebarExpanded=${this._sidebarExpanded}>
        <div slot="start" class="slot-group">
          ${this.noteLayout
            ? html`
                <ui-button
                  variant="ghost"
                  icon-only
                  aria-label="${sidebarToggleLabel}"
                  @click=${this._handleSidebarToggleClick}
                >
                  <ui-icon name="panel-left" aria-hidden="true"></ui-icon>
                </ui-button>
              `
            : null}
          <ui-dropdown @menu-item-select=${this._handleCorpusSelect}>
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
        ${hasBreadcrumbs
          ? html`
              <ui-breadcrumbs
                slot="center"
                class="breadcrumbs"
                .items=${breadcrumbs}
                aria-label="現在の階層"
              ></ui-breadcrumbs>
            `
          : nothing}
        ${hasBreadcrumbs
          ? html`<span slot="compact-center" class="context">${this._compactContextLabel}</span>`
          : nothing}
        <div slot="end" class="slot-group">
          <ui-search-trigger density=${this.noteLayout ? 'auto' : 'compact'}></ui-search-trigger>
          <ui-dropdown align="end" @menu-item-select=${this._handleThemeSelect}>
            <ui-button slot="trigger" variant="ghost">
              <span class="theme-trigger-label">
                <ui-icon
                  class="theme-trigger-icon"
                  name=${currentThemeOption.icon}
                  aria-hidden="true"
                ></ui-icon>
                <span>テーマ</span>
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
