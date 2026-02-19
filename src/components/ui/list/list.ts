import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { map } from 'lit/directives/map.js';
import { ifDefined } from 'lit/directives/if-defined.js';

/**
 * リストアイテムのデータ型。
 * `id` は必須で一意でなければなりません。
 * `href` が存在する場合、プライマリ列がリンクとして描画されます。
 */
export interface ListItemData {
  id: string;
  href?: string;
  [key: string]: unknown;
}

/**
 * 列定義型。
 * `width` は CSS 値で指定します。
 */
export interface ColumnDef {
  /** 列の一意識別子（ListItemData のキーに対応） */
  id: string;
  /** ヘッダーに表示されるラベル */
  label: string;
  /**
   * CSS 値 (例: "200px", "1fr", "minmax(...)").
   * Subgrid 非対応環境では `1fr` が minmax に変換されます。
   */
  width: string;
  /** ソート可能か（デフォルト: false） */
  sortable?: boolean;
  /** モバイル表示時に非表示にするか（デフォルト: false） */
  hideOnMobile?: boolean;
  /**
   * プライマリ列（メインリンク含む）か（デフォルト: false）。
   * プライマリ列は hideOnMobile 禁止・Roving Tabindex の起点となります。
   */
  primary?: boolean;
}

/** ソート方向型 */
type SortDirection = 'asc' | 'desc' | null;

/**
 * リストビュー (List View) コンポーネント `<ui-list>`
 *
 * ユーザーがアイテムを探索・操作するための主要インターフェースです。
 * WAI-ARIA Grid Pattern (Roving Tabindex) に準拠し、高密度かつアクセシブルな
 * 一覧表示を実現します。
 *
 * ## 設計原則
 *
 * - **High Density**: Linear Style の情報密度を目指し、最小限の行高さに凝縮
 * - **Browsing First**: 閲覧を最優先とし、複雑な操作を排除
 * - **Event Delegation**: 親要素でのイベント一括管理によりメモリ効率を最適化
 * - **No Virtualization**: ブラウザ検索 (`Ctrl+F`) を阻害しないため仮想スクロール不採用
 *
 * ## レイアウト戦略
 *
 * - **Modern (Subgrid)**: 全行が親グリッドのトラックを継承し完全な列揃えを実現
 * - **Fallback**: Subgrid 非対応環境では各行が同一の明示的列幅を保持
 * - **display: contents 不使用**: role="row" のセマンティクス剥落バグを回避
 *
 * ## ソート処理
 *
 * ソートは外部委譲です。`ui-sort-change` イベントを購読し、
 * 親コンポーネントが `items` を並び替えて再代入する責務を持ちます。
 *
 * @property {ListItemData[]} items - データ配列
 * @property {ColumnDef[]} columns - 列定義
 * @property {string | null} activeRow - 現在アクティブな行の ID
 * @property {string | null} sortKey - ソート基準列 ID
 * @property {SortDirection} sortDirection - ソート方向
 *
 * @fires ui-sort-change - ソート変更 detail: { key: string | null, direction: SortDirection }
 * @fires ui-active-change - アクティブ行変更 detail: { rowId: string }
 * @fires ui-preview-request - Quick Look 要求 (Shift+Space) detail: { rowId: string }
 * @fires ui-context-request - コンテキストメニュー要求 detail: { rowId: string, anchor: { x: number, y: number } }
 *
 * @example
 * ```html
 * <ui-list
 *   .columns="${columns}"
 *   .items="${items}"
 *   sort-key="date"
 *   sort-direction="desc"
 *   @ui-sort-change="${handleSort}"
 * ></ui-list>
 * ```
 */
@customElement('ui-list')
export class List extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    /* ────────────────────────────────────────────
       グリッドコンテナ
       grid-template-columns は style 属性で動的設定
    ──────────────────────────────────────────── */
    .grid {
      display: grid;
      border: 1px solid var(--border-default, oklch(90% 0.01 250));
      border-radius: var(--radius-md, 6px);
      overflow: hidden;
    }

    /* ────────────────────────────────────────────
       Rowgroup（ヘッダー・ボディ共通）
       Subgrid 対応時: subgrid で親トラックを継承
       Subgrid 非対応時: --_gtc カスタムプロパティで同一列幅を明示
    ──────────────────────────────────────────── */
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

    /* ────────────────────────────────────────────
       ヘッダー区切り線
    ──────────────────────────────────────────── */
    .header-rowgroup {
      border-bottom: 1px solid var(--border-default, oklch(90% 0.01 250));
    }

    /* ────────────────────────────────────────────
       Row（ヘッダー・データ共通）
       grid-column: 1 / -1 で Rowgroup の全列をスパン
    ──────────────────────────────────────────── */
    .header-row,
    .data-row {
      display: grid;
      grid-column: 1 / -1;
      align-items: center;
    }

    @supports (grid-template-columns: subgrid) {
      .header-row,
      .data-row {
        grid-template-columns: subgrid;
      }
    }

    @supports not (grid-template-columns: subgrid) {
      .header-row,
      .data-row {
        grid-template-columns: var(--_gtc);
      }
    }

    /* ────────────────────────────────────────────
       ヘッダーセル
    ──────────────────────────────────────────── */
    .header-cell {
      display: flex;
      align-items: center;
      gap: var(--space-1, 4px);
      min-height: var(--control-height-md, 32px);
      padding: 0 var(--space-2, 8px);
      font-size: var(--text-xs, 12px);
      font-weight: var(--font-medium, 500);
      color: var(--fg-muted, oklch(48% 0.01 250));
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
      color: var(--fg-default, oklch(20% 0.01 250));
    }

    .header-cell--sortable:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: -2px;
      border-radius: var(--radius-sm, 4px);
    }

    /* ────────────────────────────────────────────
       データ行
    ──────────────────────────────────────────── */
    .data-row {
      position: relative;
      min-height: var(--control-height-md, 32px);
      cursor: pointer;

      /* Forced Colors Mode でのレイアウトシフト防止のため透明ボーダーを常に配置 */
      border-left: var(--border-width-thick, 2px) solid transparent;

      background-color: transparent;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));

      /* content-visibility: auto でオフスクリーンのレンダリングを最適化 */
      content-visibility: auto;
      contain-intrinsic-height: var(--control-height-md, 32px);
    }

    .data-row:hover,
    .data-row:focus-within {
      background-color: var(--bg-hover, oklch(0% 0 0 / 0.05));
    }

    .data-row--active {
      background-color: var(--bg-surface-active, oklch(0% 0 0 / 0.08));
      border-left-color: var(--primary, oklch(60% 0.15 250));
    }

    /* タッチターゲット（物理32px → ヒットエリア44px） */
    .data-row::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      min-height: var(--control-min-touch, 44px);
      pointer-events: auto;
      z-index: 0;
    }

    /* ────────────────────────────────────────────
       セル（共通）
    ──────────────────────────────────────────── */
    .cell {
      display: flex;
      align-items: center;
      padding: 0 var(--space-2, 8px);
      overflow: hidden;
      /* タッチターゲット拡大 ::after より前面に配置 */
      position: relative;
      z-index: 1;
    }

    .cell--primary {
      font-size: var(--text-base, 14px);
      font-weight: var(--font-normal, 400);
      color: var(--fg-default, oklch(20% 0.01 250));
    }

    /* プライマリセルにシステム共通のフォーカスリング */
    .cell--primary:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--focus-ring-radius, 2px);
    }

    .cell--meta {
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-normal, 400);
      color: var(--fg-muted, oklch(48% 0.01 250));
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .cell--action {
      justify-content: flex-end;
    }

    /* ────────────────────────────────────────────
       プライマリリンク
    ──────────────────────────────────────────── */
    .primary-link {
      color: inherit;
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      /* ブロック表示で幅いっぱいに広げ、クリック領域を最大化 */
      display: block;
      width: 100%;
    }

    .primary-link:hover {
      text-decoration: underline;
    }

    /* ────────────────────────────────────────────
       アクションボタンコンテナ
       デフォルト非表示 → Hover/Focus-within/Active 時に表示
    ──────────────────────────────────────────── */
    .actions {
      display: flex;
      align-items: center;
      gap: var(--space-1, 4px);
      opacity: 0;
      transition: opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .data-row:hover .actions,
    .data-row:focus-within .actions,
    .data-row--active .actions {
      opacity: 1;
    }

    /* ────────────────────────────────────────────
       空状態
       grid の外に兄弟要素として配置し role="status" を設定
    ──────────────────────────────────────────── */
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-12, 48px) var(--space-4, 16px);
      font-size: var(--text-base, 14px);
      color: var(--fg-muted, oklch(48% 0.01 250));
    }

    /* ────────────────────────────────────────────
       Reduced Motion
    ──────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .data-row,
      .actions {
        transition-duration: 0.01ms;
      }
    }

    /* ────────────────────────────────────────────
       Forced Colors Mode
    ──────────────────────────────────────────── */
    @media (forced-colors: active) {
      /* Active: システムカラー Highlight でボーダーを可視化 */
      .data-row--active {
        border-left-color: Highlight;
      }

      /* Focus-within: アウトラインで行全体の位置を補助表示 */
      .data-row:focus-within {
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }
    }

    /* ────────────────────────────────────────────
       Print
    ──────────────────────────────────────────── */
    @media print {
      .actions {
        display: none !important;
      }

      .data-row {
        border-left: none !important;
        background: transparent !important;
      }
    }
  `;

  /** データ配列。各アイテムは一意の `id` を持つ必要があります。 */
  @property({ type: Array })
  items: ListItemData[] = [];

  /** 列定義。順序がそのまま表示列順になります。 */
  @property({ type: Array })
  columns: ColumnDef[] = [];

  /**
   * 現在フォーカスされている行の ID。
   * 未選択時は `null`。
   */
  @property({ type: String, attribute: 'active-row', reflect: true })
  activeRow: string | null = null;

  /**
   * 現在ソート基準となっている列 ID。
   * 未ソート時は `null`。
   */
  @property({ type: String, attribute: 'sort-key', reflect: true })
  sortKey: string | null = null;

  /**
   * ソート方向。
   * 未ソート時は `null`。
   */
  @property({ type: String, attribute: 'sort-direction', reflect: true })
  sortDirection: SortDirection = null;

  /** モバイル判定状態 */
  @state()
  private _isMobile = false;

  private _mql: MediaQueryList | null = null;

  private readonly _mqlHandler = (e: MediaQueryListEvent): void => {
    this._isMobile = e.matches;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this._mql = window.matchMedia('(max-width: 768px)');
    this._isMobile = this._mql.matches;
    this._mql.addEventListener('change', this._mqlHandler);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._mql?.removeEventListener('change', this._mqlHandler);
    this._mql = null;
  }

  /**
   * モバイル時は hideOnMobile 列を除外。
   * ただし primary 列は常に表示（hideOnMobile 禁止）。
   */
  private get _visibleColumns(): ColumnDef[] {
    if (this._isMobile) {
      return this.columns.filter(col => col.primary === true || col.hideOnMobile !== true);
    }
    return this.columns;
  }

  /**
   * CSS grid-template-columns 文字列を計算。
   * Subgrid 非対応環境では `1fr` を minmax に変換して列揃えを保証します。
   * 末尾にアクション列（40px）を追加します。
   */
  private get _gridTemplateColumns(): string {
    const supportsSubgrid = CSS.supports('grid-template-columns', 'subgrid');
    const cols = this._visibleColumns;

    const widths = cols.map(col => {
      // Subgrid 非対応時: 相対値は各行でコンテンツ量により不揃いになるため変換
      if (!supportsSubgrid && col.width === '1fr') {
        return 'minmax(calc(var(--space-12, 48px) + var(--space-20, 80px)), 1fr)';
      }
      return col.width;
    });

    // アクション列（固定幅 40px）
    return [...widths, '40px'].join(' ');
  }

  /**
   * ソートサイクル: なし → asc → desc → なし
   * ソート処理は外部委譲のため、イベントのみ発火します。
   */
  private _handleSortClick(columnId: string): void {
    let newKey: string | null = columnId;
    let newDirection: SortDirection;

    if (this.sortKey !== columnId) {
      // 別の列をクリック: 昇順から開始
      newDirection = 'asc';
    } else if (this.sortDirection === 'asc') {
      newDirection = 'desc';
    } else if (this.sortDirection === 'desc') {
      // 降順 → リセット
      newKey = null;
      newDirection = null;
    } else {
      newDirection = 'asc';
    }

    this.dispatchEvent(
      new CustomEvent('ui-sort-change', {
        detail: { key: newKey, direction: newDirection },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** ヘッダーセルのキーボード操作（Enter/Space でソート切り替え） */
  private _handleHeaderKeyDown(e: KeyboardEvent, columnId: string): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleSortClick(columnId);
    }
  }

  /**
   * グリッド全体のキーボードイベント委譲。
   * WAI-ARIA Grid Pattern のキーボード操作を実装します。
   */
  private readonly _handleGridKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement;
    // データ行を特定
    const dataRow = target.closest<HTMLElement>('[data-item-id]');
    if (!dataRow) return;

    const currentId = dataRow.dataset['itemId'] ?? '';
    const currentIndex = this.items.findIndex(item => item.id === currentId);
    if (currentIndex === -1) return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, this.items.length - 1);
        this._activateRow(this.items[nextIndex]?.id ?? null);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        this._activateRow(this.items[prevIndex]?.id ?? null);
        break;
      }
      case 'Home': {
        e.preventDefault();
        this._activateRow(this.items[0]?.id ?? null);
        break;
      }
      case 'End': {
        e.preventDefault();
        const lastIndex = this.items.length - 1;
        this._activateRow(this.items[lastIndex]?.id ?? null);
        break;
      }
      case 'PageDown': {
        e.preventDefault();
        // 表示領域単位（概算10件）でスクロール移動
        const pdIndex = Math.min(currentIndex + 10, this.items.length - 1);
        this._activateRow(this.items[pdIndex]?.id ?? null);
        break;
      }
      case 'PageUp': {
        e.preventDefault();
        const puIndex = Math.max(currentIndex - 10, 0);
        this._activateRow(this.items[puIndex]?.id ?? null);
        break;
      }
      case 'Enter': {
        // プライマリリンクへ遷移
        e.preventDefault();
        const primaryLink = dataRow.querySelector<HTMLAnchorElement>('.primary-link[href]');
        primaryLink?.click();
        break;
      }
      case ' ': {
        if (e.shiftKey) {
          // Shift + Space = Quick Look
          e.preventDefault();
          this.dispatchEvent(
            new CustomEvent('ui-preview-request', {
              detail: { rowId: currentId },
              bubbles: true,
              composed: true,
            }),
          );
        }
        // Space 単体 = ブラウザのスクロール（preventDefault しない）
        break;
      }
      case 'F10': {
        if (e.shiftKey) {
          // Shift + F10 = コンテキストメニュー
          e.preventDefault();
          const rect = dataRow.getBoundingClientRect();
          this.dispatchEvent(
            new CustomEvent('ui-context-request', {
              detail: { rowId: currentId, anchor: { x: rect.left, y: rect.bottom } },
              bubbles: true,
              composed: true,
            }),
          );
        }
        break;
      }
    }
  }

  /**
   * グリッドのクリックイベント委譲。
   * 行の余白クリックをプライマリリンクへ委譲します。
   *
   * 以下のケースでは委譲をキャンセルします:
   * - テキスト選択中
   * - 修飾キー押下時（別タブで開く等のネイティブ操作を優先）
   * - a / button / [role="button"] への直接クリック
   */
  private readonly _handleGridClick = (e: MouseEvent): void => {
    // 左クリックのみ（中クリック等は除外）
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const dataRow = target.closest<HTMLElement>('[data-item-id]');
    if (!dataRow) return;

    const itemId = dataRow.dataset['itemId'] ?? '';

    // テキスト選択中は委譲しない
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;

    // 修飾キー押下時は委譲しない（ブラウザのネイティブ操作を優先）
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // a / button / [role="button"] への直接クリックは委譲しない
    if (target.closest('a, button, [role="button"]')) return;

    // プライマリリンクへ委譲
    const primaryLink = dataRow.querySelector<HTMLAnchorElement>('.primary-link[href]');
    if (primaryLink) {
      e.preventDefault();
      primaryLink.click();
    }

    // アクティブ行を更新
    if (itemId !== this.activeRow) {
      this._activateRow(itemId);
    }
  }

  /** コンテキストメニュー委譲 */
  private readonly _handleGridContextMenu = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    const dataRow = target.closest<HTMLElement>('[data-item-id]');
    if (!dataRow) return;

    e.preventDefault();
    const itemId = dataRow.dataset['itemId'] ?? '';
    this.dispatchEvent(
      new CustomEvent('ui-context-request', {
        detail: { rowId: itemId, anchor: { x: e.clientX, y: e.clientY } },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * 行をアクティブ化し、プライマリセルへ Roving Tabindex でフォーカスを移動します。
   */
  private _activateRow(id: string | null): void {
    if (!id || id === this.activeRow) return;

    this.activeRow = id;
    this.dispatchEvent(
      new CustomEvent('ui-active-change', {
        detail: { rowId: id },
        bubbles: true,
        composed: true,
      }),
    );

    // Roving Tabindex: 更新完了後にプライマリセルへフォーカス移動
    void this.updateComplete.then(() => {
      const primaryCell = this.shadowRoot?.querySelector<HTMLElement>(
        `[data-item-id="${CSS.escape(id)}"] .cell--primary`,
      );
      primaryCell?.focus();
    });
  }

  /**
   * 論理列インデックスを返します。
   * モバイルで列が非表示になっていても、スクリーンリーダーの
   * aria-colindex 計算は全列数を基準とします。
   */
  private _getLogicalColIndex(visibleIndex: number): number {
    if (!this._isMobile) return visibleIndex + 1;

    // モバイル時: 非表示列を考慮した論理インデックスを計算
    const visibleCols = this._visibleColumns;
    const targetCol = visibleCols[visibleIndex];
    if (!targetCol) return visibleIndex + 1;

    return this.columns.findIndex(col => col.id === targetCol.id) + 1;
  }

  /** ソートアイコンのレンダリング */
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

    // 未ソート時: 中立アイコン（薄く表示）
    return html`<iconify-icon
      icon="lucide:chevrons-up-down"
      style="font-size: var(--icon-sm, 14px); opacity: 0.4;"
      aria-hidden="true"
    ></iconify-icon>`;
  }

  /** aria-sort 属性値を返します（非ソータブル列は nothing） */
  private _getAriaSort(column: ColumnDef): string | typeof nothing {
    if (!column.sortable) return nothing;
    if (this.sortKey !== column.id) return 'none';
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  /** データ行のレンダリング */
  private _renderDataRow(item: ListItemData, index: number): TemplateResult {
    const isActive = item.id === this.activeRow;
    const visibleCols = this._visibleColumns;

    const rowClasses = {
      'data-row': true,
      'data-row--active': isActive,
    };

    return html`
      <div
        role="row"
        class="${classMap(rowClasses)}"
        data-item-id="${item.id}"
        aria-rowindex="${index + 2}"
        aria-selected="${isActive}"
        aria-haspopup="dialog"
        aria-keyshortcuts="Shift+Space"
      >
        ${map(visibleCols, (col, colIndex) => {
          const value = item[col.id];
          // unknown 型の安全な文字列変換（Object 等はスキップ）
          const cellText =
            value !== undefined && value !== null
              ? typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                ? String(value)
                : ''
              : '';
          const logicalColIndex = this._getLogicalColIndex(colIndex);

          if (col.primary) {
            return html`
              <div
                role="gridcell"
                class="cell cell--primary"
                aria-colindex="${logicalColIndex}"
                tabindex="${isActive ? '0' : '-1'}"
              >
                ${item.href
                  ? html`<a href="${item.href}" class="primary-link">${cellText}</a>`
                  : html`<span class="primary-link">${cellText}</span>`}
              </div>
            `;
          }

          return html`
            <div
              role="gridcell"
              class="cell cell--meta"
              aria-colindex="${logicalColIndex}"
            >
              ${cellText}
            </div>
          `;
        })}

        <!-- アクション列（各行のアクションボタンを受け取る） -->
        <div
          role="gridcell"
          class="cell cell--action"
          aria-colindex="${visibleCols.length + 1}"
        >
          <div class="actions">
            <slot name="actions-${item.id}"></slot>
          </div>
        </div>
      </div>
    `;
  }

  override render(): TemplateResult {
    const visibleCols = this._visibleColumns;
    const hasItems = this.items.length > 0;
    const gtc = this._gridTemplateColumns;

    // 論理列数: 全列 + アクション列
    const logicalColCount = this.columns.length + 1;

    return html`
      <section aria-label="リスト">
        <div
          role="grid"
          class="grid"
          style="grid-template-columns: ${gtc}; --_gtc: ${gtc};"
          aria-colcount="${logicalColCount}"
          aria-rowcount="${ifDefined(hasItems ? this.items.length : undefined)}"
          @keydown="${this._handleGridKeyDown}"
          @click="${this._handleGridClick}"
          @contextmenu="${this._handleGridContextMenu}"
        >
          <!-- ヘッダー rowgroup -->
          <div role="rowgroup" class="header-rowgroup">
            <div role="row" class="header-row">
              ${map(visibleCols, (col, i) => {
                const ariaSort = this._getAriaSort(col);
                return html`
                  <div
                    role="columnheader"
                    class="${classMap({
                      'header-cell': true,
                      'header-cell--sortable': !!col.sortable,
                      'header-cell--sorted': !!col.sortable && this.sortKey === col.id,
                    })}"
                    aria-colindex="${this._getLogicalColIndex(i)}"
                    aria-sort="${ifDefined(typeof ariaSort === 'string' ? ariaSort : undefined)}"
                    tabindex="${col.sortable ? '0' : nothing}"
                    @click="${col.sortable ? () => { this._handleSortClick(col.id); } : nothing}"
                    @keydown="${col.sortable ? (e: KeyboardEvent) => { this._handleHeaderKeyDown(e, col.id); } : nothing}"
                  >
                    <span class="header-label">${col.label}</span>
                    ${this._renderSortIcon(col)}
                  </div>
                `;
              })}

              <!-- アクション列ヘッダー（視覚的に空だがグリッド構造を維持） -->
              <div
                role="columnheader"
                class="header-cell header-cell--action"
                aria-label="操作"
                aria-colindex="${visibleCols.length + 1}"
              ></div>
            </div>
          </div>

          <!-- ボディ rowgroup -->
          <div role="rowgroup" class="body-rowgroup">
            ${hasItems ? map(this.items, (item, index) => this._renderDataRow(item, index)) : nothing}
          </div>
        </div>

        <!-- 空状態: grid の外に兄弟要素として配置し混在を防ぐ -->
        ${!hasItems
          ? html`
              <div role="status" aria-live="polite" class="empty-state">
                <span>表示するアイテムがありません</span>
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
