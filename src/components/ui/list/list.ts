import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { map } from 'lit/directives/map.js';
import '../list-item/list-item';
import '../pagination/pagination';

/**
 * リストアイテムのメタデータ型。
 * `id` は一意である必要があります。
 */
export interface ListItemData {
  id: string;
  href?: string;
  [key: string]: unknown;
}

/**
 * 列定義。
 */
export interface ColumnDef {
  id: string;
  label: string;
  width: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  primary?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface UiActiveChangeDetail {
  rowId: string;
  colIndex: number;
}

interface ListContextPayload {
  columns: ColumnDef[];
  isMobile: boolean;
}

interface ListContextRequestDetail {
  callback: (payload: ListContextPayload) => void;
}

interface UiListItemLike extends HTMLElement {
  itemId?: string;
  managed?: boolean;
  active?: boolean;
  activeCellIndex?: number;
  rowIndex?: number | null;
  requestListContext?: () => void;
}

/**
 * リストビューコンポーネント `<ui-list>`。
 *
 * 行DOMは外部で宣言された `<ui-list-item>` を slot で受け取り、
 * `<ui-list>` はヘッダー生成とイベント委譲・フォーカス管理のみを担当します。
 */
@customElement('ui-list')
export class List extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .grid {
      display: grid;
      border: 1px solid var(--border-default, oklch(90% 0 0));
      border-radius: var(--radius-md, 6px);
      overflow: hidden;
    }

    .header-rowgroup,
    .body-rowgroup {
      display: grid;
      grid-column: 1 / -1;
    }

    @supports (grid-template-columns: subgrid) {
      .header-rowgroup,
      .body-rowgroup {
        grid-template-columns: subgrid;
      }
    }

    @supports not (grid-template-columns: subgrid) {
      .header-rowgroup,
      .body-rowgroup {
        grid-template-columns: var(--_gtc);
      }
    }

    .header-rowgroup {
      border-bottom: 1px solid var(--border-default, oklch(90% 0 0));
    }

    .header-row {
      display: grid;
      grid-column: 1 / -1;
      align-items: center;
    }

    @supports (grid-template-columns: subgrid) {
      .header-row {
        grid-template-columns: subgrid;
      }
    }

    @supports not (grid-template-columns: subgrid) {
      .header-row {
        grid-template-columns: var(--_gtc);
      }
    }

    .header-cell {
      display: flex;
      align-items: center;
      gap: var(--space-1, 4px);
      min-height: var(--control-height-md, 32px);
      padding: 0 var(--space-4, 16px);
      font-size: var(--text-xs, 12px);
      font-weight: var(--font-medium, 500);
      color: var(--fg-muted, oklch(48% 0 0));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-cell--sortable {
      cursor: pointer;
      user-select: none;
    }

    .header-cell--sortable:hover,
    .header-cell--sorted {
      color: var(--fg-default, oklch(20% 0 0));
    }

    .header-cell--sortable:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: -2px;
      border-radius: var(--radius-sm, 4px);
    }

    .body-rowgroup > slot {
      display: contents;
      grid-column: 1 / -1;
    }

    .body-rowgroup > slot::slotted(ui-list-item) {
      box-shadow: inset 0 1px 0 0 var(--border-default, oklch(90% 0 0));
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-12, 48px) var(--space-4, 16px);
      font-size: var(--text-base, 14px);
      color: var(--fg-muted, oklch(48% 0 0));
    }
  `;

  /** ソート・フィルタ用メタデータ */
  @property({ type: Array })
  items: ListItemData[] = [];

  /** 列定義 */
  @property({ type: Array })
  columns: ColumnDef[] = [];

  /** 現在アクティブな行ID */
  @property({ type: String, attribute: 'active-row', reflect: true })
  activeRow: string | null = null;

  /** 現在アクティブなセルのインデックス（0始まり） */
  @property({ type: Number, attribute: 'active-cell-index', reflect: true })
  activeCellIndex = 0;

  /** 現在のソートキー */
  @property({ type: String, attribute: 'sort-key', reflect: true })
  sortKey: string | null = null;

  /** 現在のソート方向 */
  @property({ type: String, attribute: 'sort-direction', reflect: true })
  sortDirection: SortDirection = null;

  /** ページネーション時の総行数 */
  @property({ type: Number, attribute: 'total-row-count' })
  totalRowCount: number | null = null;

  /** 行インデックス開始オフセット（0始まり） */
  @property({ type: Number, attribute: 'row-index-offset' })
  rowIndexOffset = 0;

  /** ページ番号からURLを生成する関数 */
  @property({ attribute: false })
  getPageHref: ((page: number) => string) | null = null;

  @state()
  private _isMobile = false;

  @state()
  private _rowElements: UiListItemLike[] = [];

  private _mql: MediaQueryList | null = null;
  private _warnedPrimaryMobile = false;

  private readonly _mqlHandler = (event: MediaQueryListEvent): void => {
    this._isMobile = event.matches;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this._mql = window.matchMedia('(max-width: 768px)');
    this._isMobile = this._mql.matches;
    this._mql.addEventListener('change', this._mqlHandler);
    this.addEventListener(
      'ui-list-context-request',
      this._handleListContextRequest as EventListener,
    );
  }

  override disconnectedCallback(): void {
    this._mql?.removeEventListener('change', this._mqlHandler);
    this._mql = null;
    this.removeEventListener(
      'ui-list-context-request',
      this._handleListContextRequest as EventListener,
    );
    super.disconnectedCallback();
  }

  override firstUpdated(): void {
    this._collectRowElements();
    this.style.setProperty('--_gtc', this._gridTemplateColumns);
  }

  override updated(changed: PropertyValues<this>): void {
    const changedKeys = changed as Map<PropertyKey, unknown>;

    if (changed.has('columns')) {
      this._validateColumns();
    }

    if (changed.has('columns') || changedKeys.has('_isMobile')) {
      this.style.setProperty('--_gtc', this._gridTemplateColumns);
    }

    if (
      changedKeys.has('_rowElements') ||
      changed.has('activeRow') ||
      changed.has('activeCellIndex') ||
      changed.has('rowIndexOffset') ||
      changed.has('columns') ||
      changedKeys.has('_isMobile')
    ) {
      this._syncRowsFromState();
    }
  }

  private _validateColumns(): void {
    const ids = new Set<string>();
    for (const column of this.columns) {
      if (ids.has(column.id)) {
        console.warn(`[ui-list] columns.id が重複しています: ${column.id}`);
      }
      ids.add(column.id);

      if (column.primary === true && column.hideOnMobile === true && !this._warnedPrimaryMobile) {
        this._warnedPrimaryMobile = true;
        console.warn(
          '[ui-list] primary 列に hideOnMobile=true は指定できません。primary を優先します。',
        );
      }
    }
  }

  private get _visibleColumns(): ColumnDef[] {
    if (!this._isMobile) return this.columns;
    return this.columns.filter((column) => {
      if (column.primary === true) return true;
      return column.hideOnMobile !== true;
    });
  }

  private get _gridTemplateColumns(): string {
    const supportsSubgrid = CSS.supports('grid-template-columns', 'subgrid');
    const widths = this._visibleColumns.map((column) => {
      if (!supportsSubgrid && column.width === '1fr') {
        return 'minmax(calc(var(--space-12, 48px) + var(--space-20, 80px)), 1fr)';
      }
      return column.width;
    });
    return [...widths, '40px'].join(' ');
  }

  private _getLogicalColIndex(visibleIndex: number): number {
    if (!this._isMobile) return visibleIndex + 1;

    const visible = this._visibleColumns;
    const target = visible[visibleIndex];
    if (!target) return visibleIndex + 1;
    return this.columns.findIndex((column) => column.id === target.id) + 1;
  }

  private _normalizeCellIndex(index: number): number {
    const max = Math.max(0, this.columns.length);
    return Math.max(0, Math.min(index, max));
  }

  private _collectRowElements(): void {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[data-list-rows]');
    if (!slot) return;

    const assigned = slot.assignedElements({ flatten: true });
    const rows = assigned.filter((element): element is UiListItemLike => {
      return element instanceof HTMLElement && element.tagName.toLowerCase() === 'ui-list-item';
    });
    this._rowElements = rows;
  }

  private _getRowId(row: UiListItemLike, index: number): string | null {
    const attrId = row.getAttribute('item-id');
    if (attrId && attrId.length > 0) return attrId;

    if (typeof row.itemId === 'string' && row.itemId.length > 0) {
      row.setAttribute('item-id', row.itemId);
      return row.itemId;
    }

    const fallback = this.items[index]?.id;
    if (typeof fallback === 'string' && fallback.length > 0) {
      row.setAttribute('item-id', fallback);
      return fallback;
    }

    return null;
  }

  private _syncRowsFromState(): void {
    const normalizedCellIndex = this._normalizeCellIndex(this.activeCellIndex);

    this._rowElements.forEach((row, index) => {
      const rowId = this._getRowId(row, index);
      const isActive = rowId !== null && rowId === this.activeRow;

      row.managed = true;
      row.active = isActive;
      row.activeCellIndex = normalizedCellIndex;
      row.rowIndex = this.rowIndexOffset + index + 2;
      row.requestListContext?.();

      if (rowId) {
        row.setAttribute('data-item-id', rowId);
      } else {
        row.removeAttribute('data-item-id');
      }
    });
  }

  private _getRowFromEvent(event: Event): UiListItemLike | null {
    const path = event.composedPath();
    for (const node of path) {
      if (node instanceof HTMLElement && node.tagName.toLowerCase() === 'ui-list-item') {
        return node as UiListItemLike;
      }
    }
    return null;
  }

  private _getColIndexFromEvent(event: Event): number {
    const path = event.composedPath();
    for (const node of path) {
      if (node instanceof HTMLElement) {
        const value = node.dataset['colIndex'];
        if (!value) continue;

        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
          return this._normalizeCellIndex(parsed);
        }
      }
    }
    return this._normalizeCellIndex(this.activeCellIndex);
  }

  private _isInteractiveTarget(event: Event): boolean {
    const path = event.composedPath();
    for (const node of path) {
      if (!(node instanceof HTMLElement)) continue;
      if (
        node.matches(
          'a, button, input, textarea, select, [role="button"], [contenteditable="true"]',
        )
      ) {
        return true;
      }
    }
    return false;
  }

  private _getPrimaryLink(row: UiListItemLike): HTMLAnchorElement | null {
    const primaryColumn = this.columns.find((column) => column.primary === true) ?? this.columns[0];
    if (!primaryColumn) return null;

    const selector = `[slot="${CSS.escape(primaryColumn.id)}"]`;
    const primaryNode = row.querySelector(selector);
    if (primaryNode instanceof HTMLAnchorElement && primaryNode.hasAttribute('href'))
      return primaryNode;

    const nested = primaryNode?.querySelector<HTMLAnchorElement>('a[href]');
    if (nested) return nested;

    const fallback = row.querySelector<HTMLAnchorElement>('a[href]:not([slot="actions"])');
    return fallback;
  }

  private _dispatchActiveChange(rowId: string, colIndex: number): void {
    this.dispatchEvent(
      new CustomEvent<UiActiveChangeDetail>('ui-active-change', {
        detail: { rowId, colIndex },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async _activateRow(rowId: string, colIndex: number, focusCell: boolean): Promise<void> {
    const normalizedColIndex = this._normalizeCellIndex(colIndex);
    if (rowId === this.activeRow && normalizedColIndex === this.activeCellIndex) return;

    this.activeRow = rowId;
    this.activeCellIndex = normalizedColIndex;
    this._dispatchActiveChange(rowId, normalizedColIndex);

    if (!focusCell) return;

    await this.updateComplete;
    const row = this._rowElements.find(
      (candidate, index) => this._getRowId(candidate, index) === rowId,
    );
    if (!row) return;

    const target = row.shadowRoot?.querySelector<HTMLElement>(
      `.cell[data-col-index="${String(normalizedColIndex)}"]`,
    );
    target?.focus({ preventScroll: true });
  }

  private async _activateRowByIndex(index: number, colIndex: number): Promise<void> {
    const row = this._rowElements[index];
    if (!row) return;
    const rowId = this._getRowId(row, index);
    if (!rowId) return;
    await this._activateRow(rowId, colIndex, true);
  }

  private _handleSortClick(columnId: string): void {
    let nextKey: string | null = columnId;
    let nextDirection: SortDirection;

    if (this.sortKey !== columnId) {
      nextDirection = 'asc';
    } else if (this.sortDirection === 'asc') {
      nextDirection = 'desc';
    } else if (this.sortDirection === 'desc') {
      nextKey = null;
      nextDirection = null;
    } else {
      nextDirection = 'asc';
    }

    this.dispatchEvent(
      new CustomEvent('ui-sort-change', {
        detail: { key: nextKey, direction: nextDirection },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleHeaderKeyDown(event: KeyboardEvent, columnId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._handleSortClick(columnId);
    }
  }

  private readonly _handleGridKeyDown = (event: KeyboardEvent): void => {
    const row = this._getRowFromEvent(event);
    if (!row) return;

    const currentIndex = this._rowElements.indexOf(row);
    if (currentIndex === -1) return;

    const currentColIndex = this._getColIndexFromEvent(event);
    const rowId = this._getRowId(row, currentIndex);
    if (!rowId) return;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, this._rowElements.length - 1);
        void this._activateRowByIndex(nextIndex, currentColIndex);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        void this._activateRowByIndex(prevIndex, currentColIndex);
        break;
      }
      case 'Home': {
        event.preventDefault();
        void this._activateRowByIndex(0, currentColIndex);
        break;
      }
      case 'End': {
        event.preventDefault();
        void this._activateRowByIndex(this._rowElements.length - 1, currentColIndex);
        break;
      }
      case 'PageDown': {
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + 10, this._rowElements.length - 1);
        void this._activateRowByIndex(nextIndex, currentColIndex);
        break;
      }
      case 'PageUp': {
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 10, 0);
        void this._activateRowByIndex(prevIndex, currentColIndex);
        break;
      }
      case 'Enter': {
        if (this._isInteractiveTarget(event)) return;
        event.preventDefault();
        const primaryLink = this._getPrimaryLink(row);
        primaryLink?.click();
        break;
      }
      case ' ': {
        if (!event.shiftKey) {
          // Space 単体はスクロール用途のためブラウザ既定動作を維持
          return;
        }
        event.preventDefault();
        this.dispatchEvent(
          new CustomEvent('ui-preview-request', {
            detail: { rowId },
            bubbles: true,
            composed: true,
          }),
        );
        break;
      }
      case 'F10': {
        if (!event.shiftKey) return;
        event.preventDefault();
        const rect = row.getBoundingClientRect();
        this.dispatchEvent(
          new CustomEvent('ui-context-request', {
            detail: { rowId, anchor: { x: rect.left, y: rect.bottom } },
            bubbles: true,
            composed: true,
          }),
        );
        break;
      }
      default:
        break;
    }
  };

  private readonly _handleGridClick = (event: MouseEvent): void => {
    if (event.button !== 0) return;

    const row = this._getRowFromEvent(event);
    if (!row) return;

    const rowIndex = this._rowElements.indexOf(row);
    if (rowIndex === -1) return;

    const rowId = this._getRowId(row, rowIndex);
    if (!rowId) return;

    if ((window.getSelection()?.toString().length ?? 0) > 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (this._isInteractiveTarget(event)) return;

    const colIndex = this._getColIndexFromEvent(event);
    const primaryLink = this._getPrimaryLink(row);
    if (primaryLink) {
      event.preventDefault();
      primaryLink.click();
    }

    void this._activateRow(rowId, colIndex, true);
  };

  private readonly _handleGridContextMenu = (event: MouseEvent): void => {
    const row = this._getRowFromEvent(event);
    if (!row) return;

    const rowIndex = this._rowElements.indexOf(row);
    if (rowIndex === -1) return;

    const rowId = this._getRowId(row, rowIndex);
    if (!rowId) return;

    event.preventDefault();
    void this._activateRow(rowId, this._getColIndexFromEvent(event), true);

    this.dispatchEvent(
      new CustomEvent('ui-context-request', {
        detail: { rowId, anchor: { x: event.clientX, y: event.clientY } },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private readonly _handleRowsSlotChange = (): void => {
    this._collectRowElements();
  };

  private readonly _handleItemActiveChange = (event: Event): void => {
    const source = event.target;
    if (!(source instanceof HTMLElement) || source.tagName.toLowerCase() !== 'ui-list-item') return;

    const detail = (event as CustomEvent<UiActiveChangeDetail>).detail;
    if (typeof detail.rowId !== 'string' || typeof detail.colIndex !== 'number') return;

    event.stopPropagation();
    void this._activateRow(detail.rowId, detail.colIndex, true);
  };

  private readonly _handleListContextRequest = (event: Event): void => {
    const source = event.target;
    if (!(source instanceof HTMLElement) || source.tagName.toLowerCase() !== 'ui-list-item') return;

    const customEvent = event as CustomEvent<ListContextRequestDetail>;
    customEvent.detail.callback({
      columns: this.columns,
      isMobile: this._isMobile,
    });
    event.stopPropagation();
  };

  private _getAriaSort(column: ColumnDef): string | typeof nothing {
    if (!column.sortable) return nothing;
    if (this.sortKey !== column.id) return 'none';
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  private _renderSortIcon(column: ColumnDef): TemplateResult | typeof nothing {
    if (!column.sortable) return nothing;

    if (this.sortKey === column.id) {
      const icon = this.sortDirection === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down';
      return html`<iconify-icon
        icon="${icon}"
        style="font-size: var(--icon-sm, 14px);"
        aria-hidden="true"
      ></iconify-icon>`;
    }

    return html`<iconify-icon
      icon="lucide:chevrons-up-down"
      style="font-size: var(--icon-sm, 14px); opacity: 0.4;"
      aria-hidden="true"
    ></iconify-icon>`;
  }

  override render(): TemplateResult {
    const visibleColumns = this._visibleColumns;
    const renderedRowCount = this._rowElements.length;
    const effectiveRowCount = this.totalRowCount ?? renderedRowCount;
    const hasRows = renderedRowCount > 0;
    const logicalColCount = this.columns.length + 1;

    const pageSize = Math.max(1, renderedRowCount);
    const currentPage = Math.floor(this.rowIndexOffset / pageSize) + 1;
    const totalPages = Math.max(1, Math.ceil(effectiveRowCount / pageSize));
    const shouldShowPagination =
      this.totalRowCount !== null && hasRows && effectiveRowCount > renderedRowCount;

    return html`
      <section aria-label="リスト">
        <div
          role="grid"
          class="grid"
          style="grid-template-columns: ${this._gridTemplateColumns}; --_gtc: ${this
            ._gridTemplateColumns};"
          aria-colcount="${String(logicalColCount)}"
          aria-rowcount="${ifDefined(
            effectiveRowCount > 0 ? String(effectiveRowCount) : undefined,
          )}"
          @keydown="${this._handleGridKeyDown}"
          @click="${this._handleGridClick}"
          @contextmenu="${this._handleGridContextMenu}"
          @ui-active-change="${this._handleItemActiveChange}"
        >
          <div role="rowgroup" class="header-rowgroup">
            <div role="row" class="header-row">
              ${map(visibleColumns, (column, visibleIndex) => {
                const ariaSort = this._getAriaSort(column);
                return html`
                  <div
                    role="columnheader"
                    class="${classMap({
                      'header-cell': true,
                      'header-cell--sortable': Boolean(column.sortable),
                      'header-cell--sorted': Boolean(column.sortable) && this.sortKey === column.id,
                    })}"
                    aria-colindex="${String(this._getLogicalColIndex(visibleIndex))}"
                    aria-sort="${ifDefined(typeof ariaSort === 'string' ? ariaSort : undefined)}"
                    tabindex="${column.sortable ? '0' : nothing}"
                    @click="${column.sortable
                      ? () => {
                          this._handleSortClick(column.id);
                        }
                      : nothing}"
                    @keydown="${column.sortable
                      ? (event: KeyboardEvent) => {
                          this._handleHeaderKeyDown(event, column.id);
                        }
                      : nothing}"
                  >
                    <span>${column.label}</span>
                    ${this._renderSortIcon(column)}
                  </div>
                `;
              })}

              <div
                role="columnheader"
                class="header-cell"
                aria-label="操作"
                aria-colindex="${String(this.columns.length + 1)}"
              ></div>
            </div>
          </div>

          <div role="rowgroup" class="body-rowgroup">
            <slot data-list-rows @slotchange="${this._handleRowsSlotChange}"></slot>
          </div>
        </div>

        ${!hasRows
          ? html`
              <div role="status" aria-live="polite" class="empty-state">
                <span>表示するアイテムがありません</span>
              </div>
            `
          : nothing}
        ${shouldShowPagination
          ? html`
              <div
                style="margin-top: var(--space-3, 12px); display: flex; justify-content: center;"
              >
                <ui-pagination
                  .current="${currentPage}"
                  .total="${totalPages}"
                  .getHref="${this.getPageHref ??
                  ((page: number): string => `?page=${String(page)}`)}"
                ></ui-pagination>
              </div>
            `
          : nothing}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-list': List;
  }
}
