import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../lib/icons';
import '../ui/header/header';
import '../ui/search-trigger/search-trigger';
import '../ui/breadcrumbs/breadcrumbs';
import '../ui/button/button';
import '../ui/dropdown/dropdown';
import type { BreadcrumbItem } from '../ui/breadcrumbs/breadcrumbs';

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

    @media (min-width: 768px) {
      :host([note-layout]) ui-header {
        --ui-header-center-start-inset: var(--sidebar-width, 272px);
        --ui-header-center-end-inset: var(--aside-width, 240px);
      }
    }
  `;

  @property({ type: String, attribute: 'breadcrumbs-json' })
  breadcrumbsJson = '';

  @property({ type: Boolean, reflect: true, attribute: 'note-layout' })
  noteLayout = false;

  @state()
  private _sidebarExpanded = true;

  private _mediaQuery: MediaQueryList | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof window === 'undefined') {
      return;
    }

    this._mediaQuery = window.matchMedia('(min-width: 768px)');
    this._syncFromMediaQuery();
    this._mediaQuery.addEventListener('change', this._onMediaQueryChange);
  }

  override disconnectedCallback(): void {
    this._mediaQuery?.removeEventListener('change', this._onMediaQueryChange);
    this._mediaQuery = null;
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

  private _handleGenreSelect = (event: CustomEvent<{ value: string }>): void => {
    const href = event.detail.value.trim();
    if (href.length === 0 || typeof window === 'undefined') {
      return;
    }

    window.location.assign(href);
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

  override render() {
    const breadcrumbs = this._breadcrumbItems;
    const sidebarToggleLabel = this._sidebarExpanded ? 'サイドバーを閉じる' : 'サイドバーを開く';

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
                  <iconify-icon icon="lucide:panel-left" aria-hidden="true"></iconify-icon>
                </ui-button>
              `
            : null}
          <ui-dropdown @menu-item-select=${this._handleGenreSelect}>
            <ui-button slot="trigger" variant="ghost">
              ジャンル
              <iconify-icon
                icon="lucide:chevron-down"
                aria-hidden="true"
                style="width:14px;height:14px;"
              ></iconify-icon>
            </ui-button>
            <ui-menu-item value="/tags/content/">コンテンツ</ui-menu-item>
            <ui-menu-item value="/tags/internal/">内部</ui-menu-item>
          </ui-dropdown>
        </div>
        ${breadcrumbs.length > 0
          ? html`
              <ui-breadcrumbs
                slot="center"
                class="breadcrumbs"
                .items=${breadcrumbs}
                aria-label="現在の階層"
              ></ui-breadcrumbs>
            `
          : html`<span slot="center" class="context">Personal Notes</span>`}
        <div slot="end" class="slot-group">
          <ui-search-trigger></ui-search-trigger>
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
