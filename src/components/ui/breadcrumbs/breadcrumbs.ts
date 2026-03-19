import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import '../button/button';
import '../dropdown/dropdown';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface EllipsisItem {
  isEllipsis: true;
  hiddenItems: BreadcrumbItem[];
}

type DisplayItem = BreadcrumbItem | EllipsisItem;

const MOBILE_BREAKPOINT_QUERY = '(max-width: 640px)';

@customElement('ui-breadcrumbs')
export class Breadcrumbs extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    nav {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-block: var(--space-2, 8px);
      padding-inline: calc(var(--focus-ring-width, 2px) + var(--focus-ring-offset, 2px));
      gap: var(--space-1, 4px);
      font-size: var(--text-sm, 13px);
      color: var(--fg-muted, oklch(48% 0 0));
      inline-size: 100%;
      min-inline-size: 0;
      box-sizing: border-box;
      overflow: visible;
    }

    .breadcrumb-list {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      gap: var(--space-2, 8px);
      list-style: none;
      margin: 0;
      padding: 0;
      max-inline-size: 100%;
      min-inline-size: 0;
      overflow: visible;
    }

    .breadcrumb-item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      min-inline-size: 0;
      flex: 0 1 auto;
      overflow: visible;
    }

    .breadcrumb-link {
      display: inline-flex;
      align-items: center;
      position: relative;
      color: inherit;
      text-decoration: none;
      border-radius: var(--radius-sm, 4px);
      padding-block: 1px;
      padding-inline: var(--space-1, 4px);
      max-inline-size: min(18ch, 100%);
      min-inline-size: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* タッチ領域拡張はリンク本体の padding で担保する */
    .breadcrumb-link::after {
      content: none;
    }

    .breadcrumb-link:hover {
      color: var(--fg-default, oklch(20% 0 0));
    }

    .breadcrumb-link:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    .breadcrumb-current {
      display: block;
      color: var(--fg-default, oklch(20% 0 0));
      font-weight: var(--font-medium, 500);
      max-inline-size: 100%;
      min-inline-size: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .breadcrumb-separator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--fg-muted, oklch(48% 0 0));
      flex-shrink: 0;
    }

    .breadcrumb-ellipsis-button iconify-icon {
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
    }

    @media (forced-colors: active) {
      .breadcrumb-link {
        color: LinkText !important;
      }

      .breadcrumb-link:focus-visible {
        outline: var(--focus-ring-width, 2px) solid LinkText !important;
      }

      .breadcrumb-current {
        color: CanvasText !important;
        font-weight: var(--font-bold, 700);
      }

      .breadcrumb-separator {
        color: CanvasText !important;
      }

      .breadcrumb-ellipsis-button::part(button) {
        border: 1px solid ButtonBorder !important;
        background: ButtonFace !important;
        color: ButtonText !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .breadcrumb-link {
        transition-duration: 0.01ms;
      }
    }

    @media print {
      :host {
        display: none !important;
      }
    }
  `;

  @property({ type: Array })
  items: BreadcrumbItem[] = [];

  @property({ type: Number, attribute: 'max-items' })
  maxItems = 5;

  @property({ type: Boolean, attribute: 'omit-root' })
  omitRoot = false;

  @property({ type: String, attribute: 'aria-label' })
  override ariaLabel = 'パンくずリスト';

  private _mobileMediaQuery: MediaQueryList | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    const mediaQuery = this._getMobileMediaQuery();
    if (!mediaQuery) return;
    mediaQuery.addEventListener('change', this._handleMobileQueryChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    const mediaQuery = this._getMobileMediaQuery();
    if (!mediaQuery) return;
    mediaQuery.removeEventListener('change', this._handleMobileQueryChange);
  }

  private readonly _handleMobileQueryChange = (): void => {
    this.requestUpdate();
  };

  private _getMobileMediaQuery(): MediaQueryList | null {
    if (this._mobileMediaQuery) return this._mobileMediaQuery;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return null;
    }
    this._mobileMediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    return this._mobileMediaQuery;
  }

  private get _isMobileViewport(): boolean {
    return this._getMobileMediaQuery()?.matches ?? false;
  }

  private get _normalizedMaxItems(): number {
    const safeValue = Number.isFinite(this.maxItems) ? Math.trunc(this.maxItems) : 5;
    const normalized = Math.max(1, safeValue);
    if (this._isMobileViewport) {
      return 3;
    }
    return normalized;
  }

  private get _sourceItemsForDesktop(): BreadcrumbItem[] {
    if (!this.omitRoot || this.items.length <= 1) {
      return this.items;
    }
    return this.items.slice(1);
  }

  private _createDesktopDisplayItems(): DisplayItem[] {
    const sourceItems = this._sourceItemsForDesktop;
    if (sourceItems.length === 0) return [];

    const max = this._normalizedMaxItems;
    if (sourceItems.length <= max) {
      return sourceItems;
    }

    if (max === 1) {
      const lastItem = sourceItems[sourceItems.length - 1];
      return lastItem ? [lastItem] : [];
    }

    if (max === 2) {
      const firstItem = sourceItems[0];
      const lastItem = sourceItems[sourceItems.length - 1];
      return firstItem && lastItem ? [firstItem, lastItem] : sourceItems;
    }

    const firstItem = sourceItems[0];
    const trailingItems = sourceItems.slice(-(max - 2));
    const hiddenItems = sourceItems.slice(1, -(max - 2));

    if (!firstItem) return sourceItems;
    if (hiddenItems.length === 0) return sourceItems;

    return [firstItem, { isEllipsis: true, hiddenItems }, ...trailingItems];
  }

  private _createMobileDisplayItems(): DisplayItem[] {
    if (this.items.length <= 2) {
      return this.items;
    }

    const rootItem = this.items[0];
    const currentItem = this.items[this.items.length - 1];
    const hiddenItems = this.items.slice(1, -1);

    if (!rootItem || !currentItem || hiddenItems.length === 0) {
      return this.items;
    }

    return [rootItem, { isEllipsis: true, hiddenItems }, currentItem];
  }

  private get _displayItems(): DisplayItem[] {
    if (this._isMobileViewport) {
      return this._createMobileDisplayItems();
    }
    return this._createDesktopDisplayItems();
  }

  override render() {
    const displayItems = this._displayItems;
    if (displayItems.length === 0) {
      return html``;
    }

    const lastIndex = displayItems.length - 1;

    return html`
      <nav aria-label="${this.ariaLabel}">
        <ol class="breadcrumb-list">
          ${map(
            displayItems,
            (item, index) => html`
              <li class="breadcrumb-item">
                ${this._renderItem(item, index === lastIndex)}
                ${index < lastIndex ? this._renderSeparator() : ''}
              </li>
            `,
          )}
        </ol>
      </nav>
    `;
  }

  private _renderSeparator() {
    return html`
      <span class="breadcrumb-separator" aria-hidden="true">
        <iconify-icon icon="lucide:chevron-right"></iconify-icon>
      </span>
    `;
  }

  private _renderItem(item: DisplayItem, isLast: boolean) {
    if ('isEllipsis' in item) {
      return this._renderEllipsisDropdown(item.hiddenItems);
    }

    if (isLast) {
      return html`<span class="breadcrumb-current" aria-current="page">${item.label}</span>`;
    }

    if (item.href) {
      return html`<a class="breadcrumb-link" href="${item.href}">${item.label}</a>`;
    }

    return html`<span class="breadcrumb-link">${item.label}</span>`;
  }

  private _renderEllipsisDropdown(hiddenItems: BreadcrumbItem[]) {
    return html`
      <ui-dropdown @menu-item-select="${this._handleEllipsisSelect}">
        <ui-button
          slot="trigger"
          variant="ghost"
          icon-only
          class="breadcrumb-ellipsis-button"
          aria-label="中間ページを表示"
        >
          <iconify-icon icon="lucide:more-horizontal" aria-hidden="true"></iconify-icon>
        </ui-button>
        ${map(
          hiddenItems,
          (item) => html`
            <ui-menu-item .value=${item.href ?? ''} ?disabled=${!item.href}>
              ${item.label}
            </ui-menu-item>
          `,
        )}
      </ui-dropdown>
    `;
  }

  private readonly _handleEllipsisSelect = (
    event: CustomEvent<{ value: string; label: string }>,
  ): void => {
    const href = event.detail.value;
    if (!href) return;

    const navigateEvent = new CustomEvent<{ href: string }>('breadcrumb-navigate', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { href },
    });

    if (!this.dispatchEvent(navigateEvent)) return;
    if (typeof window === 'undefined') return;
    window.location.assign(href);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-breadcrumbs': Breadcrumbs;
  }
}
