import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface ListColumnContext {
  id: string;
  label: string;
  width: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  lead?: boolean;
}

interface ListContextPayload {
  columns: ListColumnContext[];
  isMobile: boolean;
  showActions: boolean;
}

interface ListContextRequestDetail {
  callback: (payload: ListContextPayload) => void;
}

interface UiCurrentChangeDetail {
  rowId: string;
  columnId: string;
}

const ACTIONS_SLOT_NAME = 'actions';
const MOBILE_SUPPLEMENT_SLOT_NAME = 'mobile-supplement';

@customElement('ui-list-item')
export class ListItem extends LitElement {
  static override styles = css`
    :host {
      display: grid;
      grid-column: 1 / -1;
      align-items: center;
      min-height: var(--control-height-md, 32px);
      position: relative;
      border-left: var(--border-width-thick, 2px) solid transparent;
      background-color: transparent;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
      content-visibility: auto;
      contain-intrinsic-height: var(--control-height-md, 32px);
      user-select: text;
      grid-template-columns: var(--_gtc, 1fr);
    }

    :host(:hover),
    :host(:focus-within) {
      background-color: var(--bg-hover, oklch(0% 0 0 / 0.05));
    }

    :host([current]) {
      background-color: var(--bg-surface-active, oklch(0% 0 0 / 0.08));
      border-left-color: var(--primary, oklch(60% 0.15 250));
    }

    .cell {
      display: flex;
      align-items: center;
      min-height: var(--control-height-md, 32px);
      min-width: 0;
      padding: 0 var(--space-4, 16px);
      overflow: hidden;
      position: relative;
      z-index: 1;
      outline: none;
    }

    .cell--data {
      cursor: pointer;
    }

    .cell--data:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: -2px;
      border-radius: var(--focus-ring-radius, 2px);
    }

    .cell--current {
      background-color: var(--bg-subtle, oklch(0% 0 0 / 0.045));
    }

    .cell-content {
      display: flex;
      align-items: center;
      min-width: 0;
      width: 100%;
      overflow: hidden;
    }

    .cell--lead {
      font-size: var(--text-base, 14px);
      font-weight: var(--font-normal, 400);
      color: var(--fg-default, oklch(20% 0 0));
    }

    .lead-stack {
      display: flex;
      align-items: center;
      min-width: 0;
      width: 100%;
      gap: var(--space-2, 8px);
    }

    .lead-text {
      display: -webkit-box;
      min-width: 0;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 1;
      line-clamp: 1;
      width: 100%;
    }

    :host([lead-line-clamp='2']) .lead-text {
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .cell--lead ::slotted(a) {
      color: inherit;
      text-decoration: none;
      display: block;
    }

    .cell--lead ::slotted(a:hover) {
      text-decoration: underline;
    }

    .cell--meta {
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-normal, 400);
      color: var(--fg-muted, oklch(48% 0 0));
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .mobile-supplement {
      display: none;
      min-width: 0;
      font-size: var(--text-sm, 13px);
      color: var(--fg-muted, oklch(48% 0 0));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cell--actions {
      justify-content: flex-end;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--space-1, 4px);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition:
        opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        visibility var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host(:hover) .actions,
    :host(:focus-within) .actions,
    :host([current]) .actions {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    @media (max-width: 768px) {
      .mobile-supplement {
        display: inline;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host,
      .actions {
        transition-duration: 0.01ms;
      }
    }

    @media (forced-colors: active) {
      :host([current]) {
        border-left-color: Highlight;
      }

      .cell--data:focus-visible {
        outline-color: CanvasText;
      }

      .cell--current {
        background-color: Highlight;
        color: HighlightText;
      }
    }

    @media print {
      :host {
        border-left: none !important;
        background: transparent !important;
      }

      .actions {
        display: none !important;
      }
    }
  `;

  @property({ type: String, attribute: 'row-id', reflect: true })
  rowId = '';

  @property({ type: Boolean, reflect: true })
  current = false;

  @property({ type: String, attribute: 'current-column-id', reflect: true })
  currentColumnId: string | null = null;

  @property({ type: Number, attribute: 'row-index', reflect: true })
  rowIndex: number | null = null;

  @property({ type: Number, attribute: 'lead-line-clamp', reflect: true })
  leadLineClamp = 1;

  @state()
  private _columns: ListColumnContext[] = [];

  @state()
  private _isMobile = false;

  @state()
  private _showActions = false;

  private readonly _warnedUnknownSlots = new Set<string>();
  private _warnedLeadMobile = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.requestListContext();
    this.addEventListener('keydown', this._handleHostKeyDown);
    this.addEventListener('click', this._handleHostClick);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this._handleHostKeyDown);
    this.removeEventListener('click', this._handleHostClick);
    super.disconnectedCallback();
  }

  override updated(changed: PropertyValues<this>): void {
    const changedKeys = changed as Map<PropertyKey, unknown>;
    this._syncHostA11y();

    if (changed.has('leadLineClamp')) {
      this._normalizeLeadLineClamp();
    }

    if (
      changed.has('current') ||
      changed.has('currentColumnId') ||
      changedKeys.has('_columns') ||
      changedKeys.has('_isMobile') ||
      changedKeys.has('_showActions')
    ) {
      this._syncLeadLinkTabIndex();
    }

    if (changed.has('current') || changed.has('currentColumnId') || changedKeys.has('_columns')) {
      this._focusCurrentCell();
    }

    if (changedKeys.has('_columns')) {
      this._warnUnknownSlots();
    }
  }

  requestListContext(): void {
    const event = new CustomEvent<ListContextRequestDetail>('ui-list-context-request', {
      detail: {
        callback: (payload) => {
          this._columns = payload.columns;
          this._isMobile = payload.isMobile;
          this._showActions = payload.showActions;
        },
      },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private get _leadColumn(): ListColumnContext | null {
    const explicitLead = this._columns.find((column) => column.lead === true);
    if (explicitLead) {
      return explicitLead;
    }

    return this._columns[0] ?? null;
  }

  private get _visibleColumns(): ListColumnContext[] {
    if (this._columns.length === 0) {
      return [
        {
          id: '__default__',
          label: '',
          width: '1fr',
          lead: true,
        },
      ];
    }

    const leadColumnId = this._leadColumn?.id ?? null;
    return this._columns.filter((column) => {
      if (column.id === leadColumnId && column.hideOnMobile === true && !this._warnedLeadMobile) {
        this._warnedLeadMobile = true;
        this._warn('[ui-list-item] lead 列に hideOnMobile=true は指定できません。常時表示します。');
      }

      if (column.id === leadColumnId) return true;
      if (!this._isMobile) return true;
      return column.hideOnMobile !== true;
    });
  }

  private get _renderActionsCell(): boolean {
    if (this._columns.length === 0) {
      return this._hasAssignedElements(ACTIONS_SLOT_NAME);
    }

    return this._showActions;
  }

  private _normalizeLeadLineClamp(): void {
    const normalized = this.leadLineClamp === 2 ? 2 : 1;
    if (normalized !== this.leadLineClamp) {
      this.leadLineClamp = normalized;
    }
  }

  private _syncHostA11y(): void {
    this.setAttribute('role', 'row');

    if (this.rowIndex !== null) {
      this.setAttribute('aria-rowindex', String(this.rowIndex));
    } else {
      this.removeAttribute('aria-rowindex');
    }
  }

  private _focusCurrentCell(): void {
    if (!this.current || this.currentColumnId === null) return;

    const target = this.shadowRoot?.querySelector<HTMLElement>(
      `.cell--data[data-column-id="${CSS.escape(this.currentColumnId)}"]`,
    );
    target?.focus({ preventScroll: true });
  }

  private _syncLeadLinkTabIndex(): void {
    const leadColumn = this._leadColumn;
    if (!leadColumn) return;

    const leadSlot = this.shadowRoot?.querySelector<HTMLSlotElement>(
      `slot[name="${CSS.escape(leadColumn.id)}"]`,
    );
    if (!leadSlot) return;

    const assigned = leadSlot.assignedElements({ flatten: true });
    for (const node of assigned) {
      if (node instanceof HTMLAnchorElement) {
        node.tabIndex = -1;
        continue;
      }

      const anchors = node.querySelectorAll<HTMLAnchorElement>('a[href]');
      anchors.forEach((anchor) => {
        anchor.tabIndex = -1;
      });
    }
  }

  private _isDevelopment(): boolean {
    return globalThis.location?.hostname === 'localhost';
  }

  private _warn(message: string): void {
    if (!this._isDevelopment()) return;
    console.warn(message);
  }

  private _warnUnknownSlots(): void {
    if (!this._isDevelopment()) return;

    const knownSlots = new Set<string>([
      ...this._columns.map((column) => column.id),
      ACTIONS_SLOT_NAME,
      MOBILE_SUPPLEMENT_SLOT_NAME,
      '',
    ]);

    for (const child of Array.from(this.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const slotName = child.getAttribute('slot') ?? '';
      if (knownSlots.has(slotName)) continue;
      if (this._warnedUnknownSlots.has(slotName)) continue;

      this._warnedUnknownSlots.add(slotName);
      this._warn(`[ui-list-item] 未知の slot を無視しました: ${slotName}`);
    }

    if (this.currentColumnId === null) return;
    const exists = this._columns.some((column) => column.id === this.currentColumnId);
    if (!exists) {
      this._warn(`[ui-list-item] currentColumnId が columns.id に存在しません: ${this.currentColumnId}`);
    }
  }

  private _hasAssignedElements(slotName: string): boolean {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>(
      `slot[name="${CSS.escape(slotName)}"]`,
    );
    if (!slot) return false;
    return slot.assignedElements({ flatten: true }).length > 0;
  }

  private _getDataCellFromEvent(event: Event): HTMLElement | null {
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement)) continue;
      if (!node.classList.contains('cell')) continue;
      if (!node.classList.contains('cell--data')) return null;
      return node;
    }
    return null;
  }

  private _getVisibleColumnIds(): string[] {
    return this._visibleColumns.map((column) => column.id);
  }

  private _dispatchCurrentChange(columnId: string): void {
    if (this.rowId.length === 0) return;

    this.dispatchEvent(
      new CustomEvent<UiCurrentChangeDetail>('ui-current-change', {
        detail: {
          rowId: this.rowId,
          columnId,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private readonly _handleHostClick = (event: Event): void => {
    if (!(event instanceof MouseEvent)) return;
    if (event.button !== 0) return;
    if (event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;

    const cell = this._getDataCellFromEvent(event);
    if (!cell) return;

    const columnId = cell.dataset['columnId'];
    if (!columnId) return;
    this._dispatchCurrentChange(columnId);
  };

  private readonly _handleHostKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const cell = this._getDataCellFromEvent(event);
    const visibleColumnIds = this._getVisibleColumnIds();
    if (visibleColumnIds.length === 0) return;

    const basisColumnId = cell?.dataset['columnId'] ?? this.currentColumnId;
    if (!basisColumnId) return;

    const currentIndex = visibleColumnIds.indexOf(basisColumnId);
    if (currentIndex === -1) return;

    if (event.key === 'ArrowLeft') {
      if (currentIndex === 0) return;
      event.preventDefault();
      this._dispatchCurrentChange(visibleColumnIds[currentIndex - 1] ?? basisColumnId);
      return;
    }

    if (currentIndex === visibleColumnIds.length - 1) return;
    event.preventDefault();
    this._dispatchCurrentChange(visibleColumnIds[currentIndex + 1] ?? basisColumnId);
  };

  private _renderFallback(): TemplateResult {
    return html`
      <div
        role="gridcell"
        class="cell cell--data cell--lead ${this.current ? 'cell--current' : ''}"
        data-column-id="__default__"
        tabindex="${this.current ? '0' : '-1'}"
      >
        <div class="lead-stack">
          <div class="lead-text">
            <slot></slot>
          </div>
        </div>
      </div>

      ${this._renderActionsCell
        ? html`
            <div role="gridcell" class="cell cell--actions">
              <div class="actions">
                <slot name="${ACTIONS_SLOT_NAME}"></slot>
              </div>
            </div>
          `
        : nothing}
    `;
  }

  private _renderDataCell(column: ListColumnContext, ariaColIndex: number): TemplateResult {
    const leadColumnId = this._leadColumn?.id ?? null;
    const isLead = column.id === leadColumnId;
    const isCurrentColumn = this.current && this.currentColumnId === column.id;
    const tabIndex = isCurrentColumn ? '0' : '-1';

    return html`
      <div
        role="gridcell"
        class="cell cell--data ${isLead ? 'cell--lead' : 'cell--meta'} ${isCurrentColumn
          ? 'cell--current'
          : ''}"
        aria-colindex="${String(ariaColIndex)}"
        data-column-id="${column.id}"
        tabindex="${tabIndex}"
      >
        ${isLead
          ? html`
              <div class="lead-stack">
                <div class="lead-text">
                  <slot name="${column.id}"></slot>
                </div>
                ${this._isMobile
                  ? html`
                      <span class="mobile-supplement">
                        <slot name="${MOBILE_SUPPLEMENT_SLOT_NAME}"></slot>
                      </span>
                    `
                  : nothing}
              </div>
            `
          : html`
              <div class="cell-content">
                <slot name="${column.id}"></slot>
              </div>
            `}
      </div>
    `;
  }

  override render(): TemplateResult {
    if (this._columns.length === 0) {
      return this._renderFallback();
    }

    const visibleColumns = this._visibleColumns;
    return html`
      ${visibleColumns.map((column, index) => this._renderDataCell(column, index + 1))}
      ${this._renderActionsCell
        ? html`
            <div role="gridcell" class="cell cell--actions" aria-colindex="${String(visibleColumns.length + 1)}">
              <div class="actions">
                <slot name="${ACTIONS_SLOT_NAME}"></slot>
              </div>
            </div>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-list-item': ListItem;
  }

  interface GlobalEventHandlersEventMap {
    'ui-current-change': CustomEvent<UiCurrentChangeDetail>;
  }
}
