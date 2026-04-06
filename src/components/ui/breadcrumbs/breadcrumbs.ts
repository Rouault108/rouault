import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import '../button/button';
import '../dropdown/dropdown';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export type BreadcrumbAlignment = 'start' | 'center';

interface EllipsisItem {
  isEllipsis: true;
  hiddenItems: BreadcrumbItem[];
}

type DisplayItem = BreadcrumbItem | EllipsisItem;

const NARROW_BREAKPOINT_QUERY = '(max-width: 640px)';

@customElement('ui-breadcrumbs')
export class Breadcrumbs extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    :host([align='start']) nav {
      justify-content: flex-start;
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

    .breadcrumb-ellipsis-button ui-icon {
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
    }

    @media (max-width: 640px) {
      :host {
        display: none !important;
      }
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

  @property({ type: String, attribute: 'items-json' })
  itemsJson = '';

  @property({ type: Number, attribute: 'max-items' })
  maxItems = 5;

  @property({ type: Boolean, attribute: 'omit-root' })
  omitRoot = false;

  @property({ type: String, attribute: 'aria-label' })
  override ariaLabel = 'パンくずリスト';

  @property({ type: String, reflect: true })
  align: BreadcrumbAlignment = 'center';

  private _narrowMediaQuery: MediaQueryList | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    const mediaQuery = this._getNarrowMediaQuery();
    if (!mediaQuery) return;
    mediaQuery.addEventListener('change', this._handleNarrowQueryChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    const mediaQuery = this._getNarrowMediaQuery();
    if (!mediaQuery) return;
    mediaQuery.removeEventListener('change', this._handleNarrowQueryChange);
  }

  protected override willUpdate(changedProperties: Map<PropertyKey, unknown>): void {
    const rawAlign = this.getAttribute('align');
    if (
      changedProperties.has('align') &&
      rawAlign !== null &&
      rawAlign !== 'start' &&
      rawAlign !== 'center'
    ) {
      this.align = 'center';
    }
  }

  private readonly _handleNarrowQueryChange = (): void => {
    this.requestUpdate();
  };

  private _getNarrowMediaQuery(): MediaQueryList | null {
    if (this._narrowMediaQuery) return this._narrowMediaQuery;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return null;
    }
    this._narrowMediaQuery = window.matchMedia(NARROW_BREAKPOINT_QUERY);
    return this._narrowMediaQuery;
  }

  private get _isNarrowViewport(): boolean {
    return this._getNarrowMediaQuery()?.matches ?? false;
  }

  private get _normalizedMaxItems(): number {
    const safeValue = Number.isFinite(this.maxItems) ? Math.trunc(this.maxItems) : 5;
    return Math.max(1, safeValue);
  }

  private _normalizeItems(value: unknown): BreadcrumbItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is BreadcrumbItem => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return false;
      }

      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate['label'] === 'string' &&
        (candidate['href'] === undefined || typeof candidate['href'] === 'string')
      );
    });
  }

  private get _resolvedItems(): BreadcrumbItem[] {
    const propertyItems = this._normalizeItems(this.items);
    if (propertyItems.length > 0) {
      return propertyItems;
    }

    const normalized = this.itemsJson.trim();
    if (normalized.length === 0) {
      return [];
    }

    try {
      return this._normalizeItems(JSON.parse(normalized) as unknown);
    } catch {
      return [];
    }
  }

  private get _sourceItemsForDesktop(): BreadcrumbItem[] {
    const items = this._resolvedItems;
    if (!this.omitRoot || items.length <= 1) {
      return items;
    }
    return items.slice(1);
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
    const currentItem = sourceItems[sourceItems.length - 1];
    const middleStart = Math.max(sourceItems.length - max, 1);
    const middleEnd = Math.max(sourceItems.length - 2, middleStart);
    const middleItems = sourceItems.slice(middleStart, middleEnd);
    const hiddenItems = [
      ...sourceItems.slice(1, middleStart),
      ...sourceItems.slice(middleEnd, sourceItems.length - 1),
    ];

    if (!firstItem) return sourceItems;
    if (!currentItem) return sourceItems;
    if (middleItems.length === 0 || hiddenItems.length === 0) return sourceItems;

    return [firstItem, { isEllipsis: true, hiddenItems }, ...middleItems, currentItem];
  }

  private get _displayItems(): DisplayItem[] {
    return this._createDesktopDisplayItems();
  }

  override render() {
    if (this._isNarrowViewport) {
      return nothing;
    }

    const displayItems = this._displayItems;
    if (displayItems.length === 0) {
      return nothing;
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
        <ui-icon name="chevron-right"></ui-icon>
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
          <ui-icon name="more-horizontal" aria-hidden="true"></ui-icon>
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