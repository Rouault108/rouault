import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { map } from 'lit/directives/map.js';
import '../list-item/list-item';
import '../pagination/pagination';

export interface ColumnDef {
  id: string;
  label: string;
  width: string;
  sortable?: boolean;
  sortKey?: string;
  hideOnMobile?: boolean;
  lead?: boolean;
  defaultAction?: boolean;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  key: string | null;
  direction: SortDirection;
}

export interface PaginationState {
  offset: number;
  limit: number;
  total: number;
}

export interface AnchorPoint {
  x: number;
  y: number;
}

export interface DOMRectLike {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface UiCurrentChangeDetail {
  rowId: string;
  columnId: string;
}

export interface UiSortChangeDetail {
  key: string | null;
  direction: SortDirection;
}

export interface UiPreviewRequestDetail {
  rowId: string;
}

export interface UiContextRequestDetail {
  rowId: string;
  origin: 'keyboard' | 'pointer';
  anchorPoint?: AnchorPoint;
  anchorRect?: DOMRectLike;
}

interface ListContextPayload {
  columns: ColumnDef[];
  isMobile: boolean;
  showActions: boolean;
}

interface ListContextRequestDetail {
  callback: (payload: ListContextPayload) => void;
}

interface UiListItemLike extends HTMLElement {
  rowId?: string;
  current?: boolean;
  currentColumnId?: string | null;
  rowIndex?: number | null;
  requestListContext?: () => void;
}

const DEFAULT_SORT_STATE: SortState = {
  key: null,
  direction: null,
};

const DEFAULT_LOADING_LABEL = '読み込み中です';
const EMPTY_STATE_LABEL = '表示するアイテムがありません';
const PAGE_STEP = 10;

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

    .status {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-12, 48px) var(--space-4, 16px);
      font-size: var(--text-base, 14px);
      color: var(--fg-muted, oklch(48% 0 0));
    }
  `;

  @property({ type: Array })
  columns: ColumnDef[] = [];

  @property({ type: String, attribute: 'current-row-id', reflect: true })
  currentRowId: string | null = null;

  @property({ type: String, attribute: 'current-column-id', reflect: true })
  currentColumnId: string | null = null;

  @property({ attribute: false })
  sort: SortState | null = null;

  @property({ attribute: false })
  pagination: PaginationState | null = null;

  @property({ attribute: false })
  getPageHref: ((page: number) => string) | null = null;

  @property({ type: Boolean, reflect: true })
  loading = false;

  @property({ type: String, attribute: 'loading-label' })
  loadingLabel: string | null = null;

  @property({ type: Boolean, attribute: 'auto-reveal-current', reflect: true })
  autoRevealCurrent = false;

  @property({ type: Boolean, attribute: 'show-actions', reflect: true })
  showActions = false;

  @property({ type: String, attribute: 'aria-label', reflect: true })
  override ariaLabel: string | null = null;

  @state()
  private _isMobile = false;

  @state()
  private _rowElements: UiListItemLike[] = [];

  private _mql: MediaQueryList | null = null;
  private _warnedLeadMobile = false;

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
    this._collectRowElements();
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
    if (
      changed.has('columns') ||
      changed.has('currentColumnId') ||
      changed.has('currentRowId') ||
      changed.has('sort') ||
      changed.has('pagination')
    ) {
      this._validateConfiguration();
    }

    if (changed.has('columns') || changed.has('showActions') || changedKeys.has('_isMobile')) {
      this.style.setProperty('--_gtc', this._gridTemplateColumns);
    }

    if (
      changedKeys.has('_rowElements') ||
      changed.has('currentRowId') ||
      changed.has('currentColumnId') ||
      changed.has('pagination') ||
      changed.has('columns') ||
      changedKeys.has('_isMobile') ||
      changed.has('showActions')
    ) {
      this._syncRowsFromState();
    }

    if (
      this.autoRevealCurrent &&
      !this.loading &&
      (changedKeys.has('_rowElements') ||
        changed.has('currentRowId') ||
        changed.has('currentColumnId') ||
        changed.has('autoRevealCurrent'))
    ) {
      this.revealCurrent();
    }
  }

  revealCurrent(): void {
    const row = this._getCurrentRowElement();
    row?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  scrollCurrentIntoView(): void {
    this.revealCurrent();
  }

  private _isDevelopment(): boolean {
    return globalThis.location.hostname === 'localhost';
  }

  private _warn(message: string): void {
    if (!this._isDevelopment()) return;
    console.warn(message);
  }

  private _validateConfiguration(): void {
    const ids = new Set<string>();
    let leadCount = 0;

    for (const column of this.columns) {
      if (ids.has(column.id)) {
        this._warn(`[ui-list] columns.id が重複しています: ${column.id}`);
      }
      ids.add(column.id);

      if (column.lead === true) {
        leadCount += 1;
      }

      if (column.lead === true && column.hideOnMobile === true && !this._warnedLeadMobile) {
        this._warnedLeadMobile = true;
        this._warn('[ui-list] lead 列に hideOnMobile=true は指定できません。lead を優先します。');
      }
    }

    if (leadCount > 1) {
      this._warn('[ui-list] lead 列は 1 つまでです。');
    }

    if (
      this.currentColumnId !== null &&
      !this.columns.some((column) => column.id === this.currentColumnId)
    ) {
      this._warn(`[ui-list] currentColumnId が columns.id に存在しません: ${this.currentColumnId}`);
    }

    const currentPairCount =
      Number(this.currentRowId !== null && this.currentRowId.length > 0) +
      Number(this.currentColumnId !== null && this.currentColumnId.length > 0);
    if (currentPairCount === 1) {
      this._warn('[ui-list] currentRowId と currentColumnId は組で指定してください。');
    }

    const runtimeDirection = (this.sort as { direction?: unknown } | null)?.direction;
    if (
      runtimeDirection !== undefined &&
      runtimeDirection !== null &&
      runtimeDirection !== 'asc' &&
      runtimeDirection !== 'desc'
    ) {
      this._warn('[ui-list] sort.direction は asc / desc / null のみ指定できます。');
    }

    if (this.pagination !== null && this.pagination.limit < 1) {
      this._warn('[ui-list] pagination.limit は 1 以上でなければなりません。');
    }

    for (const row of this._rowElements) {
      if (this._getRowId(row) !== null) continue;
      this._warn('[ui-list] row-id を持たない ui-list-item を検出しました。');
    }
  }

  private get _leadColumnId(): string | null {
    const explicitLead = this.columns.find((column) => column.lead === true);
    if (explicitLead) return explicitLead.id;
    return this.columns[0]?.id ?? null;
  }

  private get _visibleColumns(): ColumnDef[] {
    const leadColumnId = this._leadColumnId;
    if (!this._isMobile) return this.columns;

    return this.columns.filter((column) => {
      if (column.id === leadColumnId) return true;
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

    if (this.showActions) {
      widths.push('40px');
    }

    return widths.join(' ');
  }

  private get _resolvedSort(): SortState {
    return this.sort ?? DEFAULT_SORT_STATE;
  }

  private _collectRowElements(): void {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[data-list-rows]');
    const rows = slot
      ? slot
          .assignedElements({ flatten: true })
          .filter((element): element is UiListItemLike => {
            return (
              element instanceof HTMLElement && element.tagName.toLowerCase() === 'ui-list-item'
            );
          })
      : Array.from(this.children).filter(
          (element): element is UiListItemLike =>
            element instanceof HTMLElement && element.tagName.toLowerCase() === 'ui-list-item',
        );

    if (
      rows.length === this._rowElements.length &&
      rows.every((row, index) => row === this._rowElements[index])
    ) {
      return;
    }

    this._rowElements = rows;
  }

  private _getCurrentRowElement(): UiListItemLike | null {
    if (!this._hasCurrentPair()) return null;
    return this._rowElements.find((row) => this._getRowId(row) === this.currentRowId) ?? null;
  }

  private _getRowId(row: UiListItemLike): string | null {
    const attrId = row.getAttribute('row-id');
    if (attrId && attrId.length > 0) return attrId;

    if (typeof row.rowId === 'string' && row.rowId.length > 0) {
      row.setAttribute('row-id', row.rowId);
      return row.rowId;
    }

    return null;
  }

  private _hasCurrentPair(): boolean {
    return (
      this.currentRowId !== null &&
      this.currentRowId.length > 0 &&
      this.currentColumnId !== null &&
      this.currentColumnId.length > 0
    );
  }

  private _syncRowsFromState(): void {
    const hasCurrentPair = this._hasCurrentPair();
    const rowIndexOffset = this.pagination?.offset ?? 0;

    this._rowElements.forEach((row, index) => {
      const rowId = this._getRowId(row);
      const isCurrent = hasCurrentPair && rowId !== null && rowId === this.currentRowId;

      row.current = isCurrent;
      row.currentColumnId = isCurrent ? this.currentColumnId : null;
      row.rowIndex = rowIndexOffset + index + 2;
      row.requestListContext?.();
    });
  }

  private _getRowFromEvent(event: Event): UiListItemLike | null {
    for (const node of event.composedPath()) {
      if (node instanceof HTMLElement && node.tagName.toLowerCase() === 'ui-list-item') {
        return node as UiListItemLike;
      }
    }
    return null;
  }

  private _getColumnIdFromEvent(event: Event): string | null {
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement)) continue;
      const columnId = node.dataset['columnId'];
      if (columnId) return columnId;
    }

    return this.currentColumnId;
  }

  private _isInteractiveTarget(event: Event): boolean {
    for (const node of event.composedPath()) {
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

  private _getDefaultActionLink(row: UiListItemLike): HTMLAnchorElement | null {
    const defaultActionColumn =
      this.columns.find((column) => column.defaultAction === true) ??
      this.columns.find((column) => column.id === this._leadColumnId) ??
      this.columns[0];

    if (defaultActionColumn) {
      const selector = `[slot="${CSS.escape(defaultActionColumn.id)}"]`;
      const primaryNode = row.querySelector(selector);
      if (primaryNode instanceof HTMLAnchorElement && primaryNode.hasAttribute('href')) {
        return primaryNode;
      }

      const nested = primaryNode?.querySelector<HTMLAnchorElement>('a[href]');
      if (nested) return nested;
    }

    return row.querySelector<HTMLAnchorElement>(':scope a[href]:not([slot="actions"])');
  }

  private _requestCurrentChange(rowId: string, columnId: string): void {
    this.dispatchEvent(
      new CustomEvent<UiCurrentChangeDetail>('ui-current-change', {
        detail: { rowId, columnId },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  private _requestCurrentChangeForRow(row: UiListItemLike, columnId: string | null): void {
    const rowId = this._getRowId(row);
    if (!rowId || !columnId) return;
    this._requestCurrentChange(rowId, columnId);
  }

  private _dispatchPreviewRequest(rowId: string): void {
    this.dispatchEvent(
      new CustomEvent<UiPreviewRequestDetail>('ui-preview-request', {
        detail: { rowId },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  private _toDOMRectLike(rect: DOMRect): DOMRectLike {
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    };
  }

  private _dispatchContextRequest(detail: UiContextRequestDetail): void {
    this.dispatchEvent(
      new CustomEvent<UiContextRequestDetail>('ui-context-request', {
        detail,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  private _handleSortClick(column: ColumnDef): void {
    const sortKey = column.sortKey ?? column.id;
    const currentSort = this._resolvedSort;
    let nextKey: string | null = sortKey;
    let nextDirection: SortDirection;

    if (currentSort.key !== sortKey) {
      nextDirection = 'asc';
    } else if (currentSort.direction === 'asc') {
      nextDirection = 'desc';
    } else if (currentSort.direction === 'desc') {
      nextKey = null;
      nextDirection = null;
    } else {
      nextDirection = 'asc';
    }

    this.dispatchEvent(
      new CustomEvent<UiSortChangeDetail>('ui-sort-change', {
        detail: { key: nextKey, direction: nextDirection },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  private _handleHeaderKeyDown(event: KeyboardEvent, column: ColumnDef): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._handleSortClick(column);
    }
  }

  private readonly _handleGridKeyDown = (event: KeyboardEvent): void => {
    const row = this._getRowFromEvent(event);
    if (!row) return;

    const currentIndex = this._rowElements.indexOf(row);
    if (currentIndex === -1) return;

    const columnId = this._getColumnIdFromEvent(event);
    const rowId = this._getRowId(row);
    if (!columnId || !rowId) return;

    switch (event.key) {
      case 'ArrowDown': {
        if (currentIndex === this._rowElements.length - 1) return;
        event.preventDefault();
        this._requestCurrentChangeForRow(this._rowElements[currentIndex + 1] ?? row, columnId);
        break;
      }
      case 'ArrowUp': {
        if (currentIndex === 0) return;
        event.preventDefault();
        this._requestCurrentChangeForRow(this._rowElements[currentIndex - 1] ?? row, columnId);
        break;
      }
      case 'Home': {
        event.preventDefault();
        this._requestCurrentChangeForRow(this._rowElements[0] ?? row, columnId);
        break;
      }
      case 'End': {
        event.preventDefault();
        this._requestCurrentChangeForRow(
          this._rowElements[this._rowElements.length - 1] ?? row,
          columnId,
        );
        break;
      }
      case 'PageDown': {
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + PAGE_STEP, this._rowElements.length - 1);
        this._requestCurrentChangeForRow(this._rowElements[nextIndex] ?? row, columnId);
        break;
      }
      case 'PageUp': {
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - PAGE_STEP, 0);
        this._requestCurrentChangeForRow(this._rowElements[prevIndex] ?? row, columnId);
        break;
      }
      case 'Enter': {
        if (this._isInteractiveTarget(event)) return;
        event.preventDefault();
        this._requestCurrentChange(rowId, columnId);
        this._getDefaultActionLink(row)?.click();
        break;
      }
      case ' ': {
        if (!event.shiftKey) return;
        event.preventDefault();
        this._requestCurrentChange(rowId, columnId);
        this._dispatchPreviewRequest(rowId);
        break;
      }
      case 'F10': {
        if (!event.shiftKey) return;
        event.preventDefault();
        const rect = row.getBoundingClientRect();
        this._requestCurrentChange(rowId, columnId);
        this._dispatchContextRequest({
          rowId,
          origin: 'keyboard',
          anchorRect: this._toDOMRectLike(rect),
        });
        break;
      }
      default:
        break;
    }
  };

  private readonly _handleGridContextMenu = (event: MouseEvent): void => {
    const row = this._getRowFromEvent(event);
    if (!row) return;

    const rowId = this._getRowId(row);
    const columnId = this._getColumnIdFromEvent(event);
    if (!rowId || !columnId) return;

    event.preventDefault();
    this._requestCurrentChange(rowId, columnId);
    this._dispatchContextRequest({
      rowId,
      origin: 'pointer',
      anchorPoint: { x: event.clientX, y: event.clientY },
      anchorRect: this._toDOMRectLike(row.getBoundingClientRect()),
    });
  };

  private readonly _handleRowsSlotChange = (): void => {
    this._collectRowElements();
  };

  private readonly _handleListContextRequest = (event: Event): void => {
    const source = event.target;
    if (!(source instanceof HTMLElement) || source.tagName.toLowerCase() !== 'ui-list-item') return;

    const customEvent = event as CustomEvent<ListContextRequestDetail>;
    customEvent.detail.callback({
      columns: this.columns,
      isMobile: this._isMobile,
      showActions: this.showActions,
    });
    event.stopPropagation();
  };

  private _getAriaSort(column: ColumnDef): string | typeof nothing {
    if (!column.sortable) return nothing;
    const sortKey = column.sortKey ?? column.id;
    const currentSort = this._resolvedSort;
    if (currentSort.key !== sortKey) return 'none';
    return currentSort.direction === 'asc' ? 'ascending' : 'descending';
  }

  private _renderSortIcon(column: ColumnDef): TemplateResult | typeof nothing {
    if (!column.sortable) return nothing;

    const sortKey = column.sortKey ?? column.id;
    const currentSort = this._resolvedSort;
    if (currentSort.key === sortKey) {
      const icon = currentSort.direction === 'asc' ? 'chevron-up' : 'chevron-down';
      return html`<ui-icon
        name="${icon}"
        style="font-size: var(--icon-sm, 14px);"
        aria-hidden="true"
      ></ui-icon>`;
    }

    return html`<ui-icon
      name="chevrons-up-down"
      style="font-size: var(--icon-sm, 14px); opacity: 0.4;"
      aria-hidden="true"
    ></ui-icon>`;
  }

  override render(): TemplateResult {
    const visibleColumns = this._visibleColumns;
    const renderedRowCount = this._rowElements.length;
    const hasRows = renderedRowCount > 0;
    const logicalColCount = this.columns.length + (this.showActions ? 1 : 0);
    const pagination = this.pagination;
    const currentSort = this._resolvedSort;

    const shouldShowLoading = this.loading;
    const shouldShowEmpty = !this.loading && !hasRows;
    const shouldShowPagination = pagination !== null && hasRows;
    const currentPage =
      pagination === null ? 1 : Math.floor(pagination.offset / Math.max(1, pagination.limit)) + 1;
    const totalPages =
      pagination === null
        ? 1
        : Math.max(1, Math.ceil(pagination.total / Math.max(1, pagination.limit)));

    return html`
      <section aria-label="${ifDefined(this.ariaLabel ?? undefined)}">
        <div
          role="grid"
          class="grid"
          style="grid-template-columns: ${this._gridTemplateColumns}; --_gtc: ${this
            ._gridTemplateColumns};"
          aria-colcount="${String(logicalColCount)}"
          aria-rowcount="${ifDefined(pagination !== null ? String(pagination.total) : undefined)}"
          aria-label="${ifDefined(this.ariaLabel ?? undefined)}"
          @keydown="${this._handleGridKeyDown}"
          @contextmenu="${this._handleGridContextMenu}"
        >
          <div role="rowgroup" class="header-rowgroup">
            <div role="row" class="header-row">
              ${map(visibleColumns, (column, visibleIndex) => {
                const ariaSort = this._getAriaSort(column);
                const logicalColIndex =
                  this.columns.findIndex((candidate) => candidate.id === column.id) + 1;

                return html`
                  <div
                    role="columnheader"
                    class="${classMap({
                      'header-cell': true,
                      'header-cell--sortable': Boolean(column.sortable),
                      'header-cell--sorted':
                        Boolean(column.sortable) &&
                        currentSort.key === (column.sortKey ?? column.id),
                    })}"
                    aria-colindex="${String(logicalColIndex || visibleIndex + 1)}"
                    aria-sort="${ifDefined(typeof ariaSort === 'string' ? ariaSort : undefined)}"
                    tabindex="${column.sortable ? '0' : nothing}"
                    @click="${column.sortable
                      ? () => {
                          this._handleSortClick(column);
                        }
                      : nothing}"
                    @keydown="${column.sortable
                      ? (event: KeyboardEvent) => {
                          this._handleHeaderKeyDown(event, column);
                        }
                      : nothing}"
                  >
                    <span>${column.label}</span>
                    ${this._renderSortIcon(column)}
                  </div>
                `;
              })}
              ${this.showActions
                ? html`
                    <div
                      role="columnheader"
                      class="header-cell"
                      aria-label="操作"
                      aria-colindex="${String(this.columns.length + 1)}"
                    ></div>
                  `
                : nothing}
            </div>
          </div>

          <div role="rowgroup" class="body-rowgroup">
            <slot data-list-rows @slotchange="${this._handleRowsSlotChange}"></slot>
          </div>
        </div>

        ${shouldShowLoading
          ? html`
              <div role="status" aria-live="polite" class="status">
                <span>${this.loadingLabel ?? DEFAULT_LOADING_LABEL}</span>
              </div>
            `
          : nothing}
        ${shouldShowEmpty
          ? html`
              <div role="status" aria-live="polite" class="status">
                <span>${EMPTY_STATE_LABEL}</span>
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

  interface GlobalEventHandlersEventMap {
    'ui-current-change': CustomEvent<UiCurrentChangeDetail>;
    'ui-sort-change': CustomEvent<UiSortChangeDetail>;
    'ui-preview-request': CustomEvent<UiPreviewRequestDetail>;
    'ui-context-request': CustomEvent<UiContextRequestDetail>;
  }
}
