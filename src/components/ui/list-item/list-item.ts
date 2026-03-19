import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface ListColumnContext {
  id: string;
  label: string;
  width: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  primary?: boolean;
}

interface ListContextPayload {
  columns: ListColumnContext[];
  isMobile: boolean;
}

interface ListContextRequestDetail {
  callback: (payload: ListContextPayload) => void;
}

interface UiActiveChangeDetail {
  rowId: string;
  colIndex: number;
}

/**
 * リストアイテム行コンポーネント。
 *
 * `<ui-list>` から列定義コンテキストを受け取り、
 * `columns[].id` に対応する named slot を `role="gridcell"` でラップして描画します。
 */
@customElement('ui-list-item')
export class ListItem extends LitElement {
  static override styles = css`
    :host {
      display: grid;
      grid-column: 1 / -1;
      align-items: center;
      min-height: var(--control-height-md, 32px);
      cursor: pointer;
      position: relative;

      border-left: var(--border-width-thick, 2px) solid transparent;
      background-color: transparent;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));

      content-visibility: auto;
      contain-intrinsic-height: var(--control-height-md, 32px);
      user-select: text;
    }

    :host {
      /* スロット越しにsubgridチェーンが解決できないため、親の --_gtc を継承して使用する */
      grid-template-columns: var(--_gtc, 1fr);
    }

    :host(:hover),
    :host(:focus-within) {
      background-color: var(--bg-hover, oklch(0% 0 0 / 0.05));
    }

    :host([active]) {
      background-color: var(--bg-surface-active, oklch(0% 0 0 / 0.08));
      border-left-color: var(--primary, oklch(60% 0.15 250));
    }

    :host::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      min-height: var(--control-min-touch, 24px);
      pointer-events: auto;
      z-index: 0;
    }

    .cell {
      display: flex;
      align-items: center;
      min-height: var(--control-height-md, 32px);
      padding: 0 var(--space-4, 16px);
      overflow: hidden;
      position: relative;
      z-index: 1;
      outline: none;
    }

    .cell:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: -2px; // var(--focus-ring-offset, 2px) だとフォーカスリングがはみ出るので、はみ出さないようにする
      border-radius: var(--focus-ring-radius, 2px);
    }

    .cell-content {
      display: flex;
      align-items: center;
      min-width: 0;
      width: 100%;
      overflow: hidden;
    }

    .cell--primary {
      font-size: var(--text-base, 14px);
      font-weight: var(--font-normal, 400);
      color: var(--fg-default, oklch(20% 0 0));
    }

    .cell--primary ::slotted(a.primary-link) {
      color: inherit;
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
      width: 100%;
    }

    .cell--primary ::slotted(a.primary-link:hover) {
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
      margin-left: var(--space-2, 8px);
      font-size: var(--text-sm, 13px);
      color: var(--fg-muted, oklch(48% 0 0));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cell--action {
      justify-content: flex-end;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--space-1, 4px);
      opacity: 0;
      transition: opacity var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host(:hover) .actions,
    :host(:focus-within) .actions,
    :host([active]) .actions {
      opacity: 1;
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
      :host([active]) {
        border-left-color: Highlight;
      }

      :host(:focus-within) {
        outline: 2px solid CanvasText;
        outline-offset: -2px;
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

  /** この行のID */
  @property({ type: String, attribute: 'item-id', reflect: true })
  itemId = '';

  /** 行のメイン遷移先 */
  @property({ type: String, reflect: true })
  href: string | null = null;

  /** この行がアクティブ状態か */
  @property({ type: Boolean, reflect: true })
  active = false;

  /** 行内フォーカスセル（0始まり） */
  @property({ type: Number, attribute: 'active-cell-index', reflect: true })
  activeCellIndex = 0;

  /** 全体の中での行番号（ヘッダー込み論理位置） */
  @property({ type: Number, attribute: 'row-index', reflect: true })
  rowIndex: number | null = null;

  /** 親 `<ui-list>` 管理下か */
  @property({ type: Boolean, reflect: true })
  managed = false;

  @state()
  private _columns: ListColumnContext[] = [];

  @state()
  private _isMobile = false;

  private _warnedPrimaryMobile = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.requestListContext();
    this.addEventListener('keydown', this._handleHostKeyDown);
    this.addEventListener('click', this._handleHostClick);
    this.addEventListener('focusin', this._handleHostFocusIn);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this._handleHostKeyDown);
    this.removeEventListener('click', this._handleHostClick);
    this.removeEventListener('focusin', this._handleHostFocusIn);
    super.disconnectedCallback();
  }

  override updated(changed: PropertyValues<this>): void {
    const changedKeys = changed as Map<PropertyKey, unknown>;
    this._syncHostA11y();

    if (changedKeys.has('_columns') || changedKeys.has('_isMobile')) {
      this._syncPrimaryLinkClasses();
    }

    if (
      changed.has('active') ||
      changed.has('activeCellIndex') ||
      changedKeys.has('_columns') ||
      changedKeys.has('_isMobile')
    ) {
      this._focusActiveCell();
    }
  }

  /**
   * 親 `<ui-list>` へ列定義コンテキストを要求します。
   * Lit Context 相当のイベントベース供給を利用します。
   */
  requestListContext(): void {
    const event = new CustomEvent<ListContextRequestDetail>('ui-list-context-request', {
      detail: {
        callback: (payload) => {
          this._columns = payload.columns;
          this._isMobile = payload.isMobile;
        },
      },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private get _primaryColumnId(): string | null {
    const primary = this._columns.find((col) => col.primary === true);
    if (primary) return primary.id;
    return this._columns[0]?.id ?? null;
  }

  private get _effectiveVisibleColumns(): ListColumnContext[] {
    if (this._columns.length === 0) {
      return [
        {
          id: '__default__',
          label: '',
          width: '1fr',
          primary: true,
        },
      ];
    }

    return this._columns.filter((col) => {
      if (col.primary === true && col.hideOnMobile === true && !this._warnedPrimaryMobile) {
        this._warnedPrimaryMobile = true;
        // 仕様違反の列定義は警告しつつ常時表示にフォールバックする
        console.warn(
          '[ui-list-item] primary 列に hideOnMobile=true は指定できません。常時表示します。',
        );
      }

      if (col.primary === true) return true;
      if (!this._isMobile) return true;
      return col.hideOnMobile !== true;
    });
  }

  private _getLogicalColIndex(visibleIndex: number): number {
    if (this._columns.length === 0) return 1;

    const visible = this._effectiveVisibleColumns;
    const target = visible[visibleIndex];
    if (!target) return visibleIndex + 1;

    return this._columns.findIndex((col) => col.id === target.id) + 1;
  }

  private _normalizeCellIndex(index: number): number {
    const maxIndex = this._effectiveVisibleColumns.length;
    return Math.max(0, Math.min(index, maxIndex));
  }

  private _syncHostA11y(): void {
    this.setAttribute('role', 'row');
    this.setAttribute('aria-selected', String(this.active));
    this.setAttribute('aria-haspopup', 'dialog');
    this.setAttribute('aria-keyshortcuts', 'Space Shift+Space');
    this.setAttribute('aria-description', 'Spaceキーでスクロール');

    if (this.rowIndex !== null) {
      this.setAttribute('aria-rowindex', String(this.rowIndex));
    } else {
      this.removeAttribute('aria-rowindex');
    }
  }

  private _syncPrimaryLinkClasses(): void {
    const primaryId = this._primaryColumnId;
    if (!primaryId) return;

    const primarySlot = this.shadowRoot?.querySelector<HTMLSlotElement>(
      `slot[name="${CSS.escape(primaryId)}"]`,
    );
    if (!primarySlot) return;

    const assigned = primarySlot.assignedElements({ flatten: true });
    for (const node of assigned) {
      if (node instanceof HTMLAnchorElement) {
        node.classList.add('primary-link');
        node.tabIndex = -1;
        continue;
      }

      const anchors = node.querySelectorAll<HTMLAnchorElement>('a[href]');
      anchors.forEach((anchor) => {
        anchor.classList.add('primary-link');
        anchor.tabIndex = -1;
      });
    }
  }

  private _focusActiveCell(): void {
    if (!this.active) return;

    const targetIndex = this._normalizeCellIndex(this.activeCellIndex);
    const cells = this.shadowRoot?.querySelectorAll<HTMLElement>('.cell[role="gridcell"]');
    if (!cells || cells.length === 0) return;

    const target = cells[targetIndex];
    if (!target) return;
    target.focus({ preventScroll: true });
  }

  private _getCellFromEvent(event: Event): HTMLElement | null {
    const path = event.composedPath();
    for (const node of path) {
      if (node instanceof HTMLElement && node.classList.contains('cell')) {
        return node;
      }
    }
    return null;
  }

  private _getCellIndex(cell: HTMLElement | null): number {
    if (!cell) return this._normalizeCellIndex(this.activeCellIndex);

    const value = cell.dataset['colIndex'];
    if (!value) return this._normalizeCellIndex(this.activeCellIndex);

    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return this._normalizeCellIndex(this.activeCellIndex);
    return this._normalizeCellIndex(parsed);
  }

  private _dispatchActiveChange(colIndex: number): void {
    const rowId = this.itemId;
    if (rowId.length === 0) return;

    this.dispatchEvent(
      new CustomEvent<UiActiveChangeDetail>('ui-active-change', {
        detail: { rowId, colIndex },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private readonly _handleHostClick = (event: Event): void => {
    const cell = this._getCellFromEvent(event);
    const colIndex = this._getCellIndex(cell);
    this._dispatchActiveChange(colIndex);
  };

  private readonly _handleHostFocusIn = (event: FocusEvent): void => {
    if (!this.active) return;

    const cell = this._getCellFromEvent(event);
    const colIndex = this._getCellIndex(cell);
    if (colIndex === this._normalizeCellIndex(this.activeCellIndex)) return;
    this._dispatchActiveChange(colIndex);
  };

  private readonly _handleHostKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const currentCell = this._getCellFromEvent(event);
    const currentIndex = this._getCellIndex(currentCell);
    const maxIndex = this._effectiveVisibleColumns.length;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const nextIndex = Math.max(currentIndex - 1, 0);
      if (nextIndex === currentIndex) return;
      this._dispatchActiveChange(nextIndex);
      return;
    }

    event.preventDefault();
    const nextIndex = Math.min(currentIndex + 1, maxIndex);
    if (nextIndex === currentIndex) return;
    this._dispatchActiveChange(nextIndex);
  };

  private _renderFallbackCells(): TemplateResult {
    const normalized = this._normalizeCellIndex(this.activeCellIndex);
    const mainTabIndex = this.active ? (normalized === 0 ? '0' : '-1') : '-1';
    const actionTabIndex = this.active ? (normalized === 1 ? '0' : '-1') : '-1';

    return html`
      <div
        role="gridcell"
        class="cell cell--primary"
        aria-colindex="1"
        data-col-index="0"
        tabindex="${mainTabIndex}"
      >
        <div class="cell-content">
          <slot></slot>
        </div>
      </div>

      <div
        role="gridcell"
        class="cell cell--action"
        aria-colindex="2"
        data-col-index="1"
        tabindex="${actionTabIndex}"
      >
        <div class="actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `;
  }

  override render(): TemplateResult {
    const visibleColumns = this._effectiveVisibleColumns;
    const hasContextColumns = this._columns.length > 0;

    if (!hasContextColumns) {
      return this._renderFallbackCells();
    }

    const normalized = this._normalizeCellIndex(this.activeCellIndex);
    const primaryId = this._primaryColumnId;

    return html`
      ${visibleColumns.map((column, visibleIndex) => {
        const isPrimary = column.primary === true || column.id === primaryId;
        const logicalColIndex = this._getLogicalColIndex(visibleIndex);
        const colIndex = logicalColIndex - 1;
        const tabIndex = this.active && normalized === colIndex ? '0' : '-1';

        return html`
          <div
            role="gridcell"
            class="cell ${isPrimary ? 'cell--primary' : 'cell--meta'}"
            aria-colindex="${logicalColIndex}"
            data-col-index="${String(colIndex)}"
            tabindex="${tabIndex}"
          >
            <div class="cell-content">
              <slot name="${column.id}"></slot>
              ${isPrimary && this._isMobile
                ? html`
                    <span class="mobile-supplement">
                      <slot name="mobile-supplement"></slot>
                    </span>
                  `
                : nothing}
            </div>
          </div>
        `;
      })}
      ${(() => {
        const actionIndex = this._columns.length;
        const actionTabIndex = this.active && normalized === actionIndex ? '0' : '-1';

        return html`
          <div
            role="gridcell"
            class="cell cell--action"
            aria-colindex="${String(this._columns.length + 1)}"
            data-col-index="${String(actionIndex)}"
            tabindex="${actionTabIndex}"
          >
            <div class="actions">
              <slot name="actions"></slot>
            </div>
          </div>
        `;
      })()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-list-item': ListItem;
  }
}
