import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// グローバルスタイルのID（重複注入防止）
const GLOBAL_STYLE_ID = 'ui-table-global-styles';

// Light DOM に適用するグローバルスタイル
const globalStyles = `
  /* ui-table 内のテーブルスタイル */
  ui-table table {
    width: 100%;
    border-collapse: separate; /* Sticky Headerのためにseparateが必要 */
    border-spacing: 0;
    font-size: var(--text-sm, 0.8125rem);
    line-height: 1.5;
  }

  /* ヘッダー */
  ui-table thead {
    background-color: var(--table-header-bg, #f9fafb);
  }

  /* スティッキーヘッダー */
  ui-table[stickyHeader] th {
    position: sticky;
    top: 0;
    z-index: 20;
    box-shadow: 0 1px 0 0 var(--table-border, rgba(0, 0, 0, 0.08));
    background-color: var(--table-header-bg, #f9fafb); /* 背景色を明示しないと透ける */
  }

  /* ダークモード時のスティッキーヘッダー背景 */
  @media (prefers-color-scheme: dark) {
    ui-table[stickyHeader]:not([data-theme="light"]) th {
      background-color: rgba(30, 30, 30, 1); /* 完全に不透明な色が必要 */
      /* var(--table-header-bg) は半透明かもしれないので、不透明色を計算すべきだが、
         ここでは簡易的にダークな背景色を指定 */
      background-color: var(--color-background-subtle, #171717); 
    }
  }

  [data-theme="dark"] ui-table[stickyHeader] th {
    background-color: var(--color-background-subtle, #171717);
  }

  ui-table th {
    padding: 0.5rem 0.75rem;
    text-align: left;
    font-weight: 500;
    font-size: 0.6875rem; /* 11px */
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--table-header-text, #6b7280);
    border-bottom: 1px solid var(--table-border, rgba(0, 0, 0, 0.08));
    white-space: nowrap;
    transition: background-color 100ms ease-out, color 100ms ease-out;
  }

  /* ソート可能なヘッダー */
  ui-table th[aria-sort],
  ui-table th[sortable] {
    cursor: pointer;
    user-select: none;
  }

  ui-table th[aria-sort]:hover,
  ui-table th[sortable]:hover {
    color: var(--table-text, #111827);
    background-color: rgba(0, 0, 0, 0.03);
  }

  /* ボディセル */
  ui-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--table-border, rgba(0, 0, 0, 0.08));
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }

  /* 最終行のボーダー削除 */
  ui-table tbody tr:last-child td {
    border-bottom: none;
  }

  /* コンパクトモード */
  ui-table[compact] th,
  ui-table[compact] td {
    padding: 0.375rem 0.75rem;
  }

  /* ストライプバリアント */
  ui-table[variant="striped"] tbody tr:nth-child(even) {
    background-color: var(--table-stripe-bg, rgba(0, 0, 0, 0.02));
  }

  /* ボーダーバリアント（縦線追加） */
  ui-table[variant="bordered"] th:not(:last-child),
  ui-table[variant="bordered"] td:not(:last-child) {
    border-right: 1px solid var(--table-border, rgba(0, 0, 0, 0.08));
  }

  /* ホバー効果 */
  ui-table[hoverable] tbody tr {
    transition: background-color 100ms ease-out;
  }

  ui-table[hoverable] tbody tr:hover {
    background-color: var(--table-hover-bg, rgba(0, 0, 0, 0.02));
  }

  /* 選択可能な行 */
  ui-table[selectable] tbody tr {
    cursor: pointer;
  }

  /* 選択状態 (aria-selected="true") */
  ui-table tbody tr[aria-selected="true"] {
    background-color: var(--table-selected-bg, rgba(59, 130, 246, 0.08)) !important;
  }
  
  /* フォーカスリング (キーボード操作用) */
  ui-table tbody tr:focus-visible,
  ui-table td:focus-visible,
  ui-table th:focus-visible {
    outline: 2px solid var(--color-primary, #3b82f6);
    outline-offset: -2px;
  }

  /* 行選択時のフォーカス背景色 */
  ui-table tbody tr:focus-visible {
    background-color: var(--table-hover-bg, rgba(0, 0, 0, 0.02));
  }

  /* 四隅の角丸処理 */
  ui-table thead tr:first-child th:first-child {
    border-top-left-radius: calc(var(--radius-lg, 0.5rem) - 1px);
  }
  ui-table thead tr:first-child th:last-child {
    border-top-right-radius: calc(var(--radius-lg, 0.5rem) - 1px);
  }
  ui-table tbody tr:last-child td:first-child {
    border-bottom-left-radius: calc(var(--radius-lg, 0.5rem) - 1px);
  }
  ui-table tbody tr:last-child td:last-child {
    border-bottom-right-radius: calc(var(--radius-lg, 0.5rem) - 1px);
  }

  /* フッター */
  ui-table tfoot {
    background-color: var(--table-header-bg, #f9fafb);
  }

  ui-table tfoot td {
    font-weight: 500;
    border-top: 2px solid var(--table-border, rgba(0, 0, 0, 0.08));
    border-bottom: none;
  }

  /* ダークモード */
  @media (prefers-color-scheme: dark) {
    ui-table:not([data-theme="light"]) {
      --table-border: rgba(255, 255, 255, 0.1);
      --table-header-bg: rgba(255, 255, 255, 0.03);
      --table-header-text: #a1a1aa;
      --table-stripe-bg: rgba(255, 255, 255, 0.02);
      --table-hover-bg: rgba(255, 255, 255, 0.04);
      --table-selected-bg: rgba(59, 130, 246, 0.15);
    }
    
    ui-table:not([data-theme="light"]) th[aria-sort]:hover,
    ui-table:not([data-theme="light"]) th[sortable]:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: #ededed;
    }
  }

  [data-theme="dark"] ui-table {
    --table-border: rgba(255, 255, 255, 0.1);
    --table-header-bg: rgba(255, 255, 255, 0.03);
    --table-header-text: #a1a1aa;
    --table-stripe-bg: rgba(255, 255, 255, 0.02);
    --table-hover-bg: rgba(255, 255, 255, 0.04);
    --table-selected-bg: rgba(59, 130, 246, 0.15);
  }
  
  [data-theme="dark"] ui-table th[aria-sort]:hover,
  [data-theme="dark"] ui-table th[sortable]:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: #ededed;
  }
  
  /* チェックボックス */
  ui-table input[type="checkbox"] {
    accent-color: var(--color-primary, #3b82f6);
    cursor: pointer;
    width: 1rem;
    height: 1rem;
    margin: 0;
    vertical-align: middle;
  }
  
  ui-table input[type="checkbox"]:focus-visible {
    outline: 2px solid var(--color-primary, #3b82f6);
    outline-offset: 2px;
  }
`;

/**
 * グローバルスタイルを document.head に注入（一度だけ）
 */
function injectGlobalStyles() {
  if (document.getElementById(GLOBAL_STYLE_ID)) return;
  
  const styleEl = document.createElement('style');
  styleEl.id = GLOBAL_STYLE_ID;
  styleEl.textContent = globalStyles;
  document.head.appendChild(styleEl);
}

/**
 * ui-table - テーブルスタイリングコンポーネント
 * 
 * Markdownのテーブルやコンテンツ内のテーブルをLinear/Raycast風にスタイリングします
 * 
 * @element ui-table
 * 
 * @slot - テーブル要素 (<table>)
 */
@customElement('ui-table')
export class UiTable extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      
      /* スクロール制御 */
      overflow-x: auto;
      
      /* コンテナスタイルをホストに適用 */
      border: 1px solid var(--table-border);
      border-radius: var(--radius-lg, 0.5rem);
      background-color: var(--color-background, #ffffff);

      /* スクロールバー設定 */
      scrollbar-width: thin;
      scrollbar-color: var(--table-border) transparent;
      
      /* CSS変数をホストに設定 */
      --table-border: color-mix(in srgb, var(--color-border, #e5e7eb), transparent 20%);
      --table-header-bg: var(--color-background-subtle, #f9fafb);
      --table-header-text: var(--color-foreground-muted, #6b7280);
      --table-stripe-bg: var(--color-background-subtle, #f9fafb);
      --table-hover-bg: rgba(0, 0, 0, 0.02);
      --table-selected-bg: color-mix(in srgb, var(--color-primary, #3b82f6), transparent 92%);
    }

    /* Sticky Header時は親のスクロールに追従させるためvisibleにする */
    :host([stickyHeader]) {
      overflow: visible;
      border-radius: 0; /* Sticky時は角丸が邪魔になることがあるのでリセットが無難だが、今回は残すか要検討 */
    }
    
    :host::-webkit-scrollbar {
      height: 6px;
    }
    
    :host::-webkit-scrollbar-thumb {
      background-color: var(--table-border);
      border-radius: 3px;
    }

    /* ダークモード変数 */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        background-color: var(--color-background, #0a0a0a);
        --table-border: rgba(255, 255, 255, 0.1);
        --table-header-bg: rgba(255, 255, 255, 0.03);
        --table-header-text: var(--color-foreground-muted, #a1a1aa);
        --table-stripe-bg: rgba(255, 255, 255, 0.02);
        --table-hover-bg: rgba(255, 255, 255, 0.04);
        --table-selected-bg: rgba(59, 130, 246, 0.15);
      }
    }

    :host-context([data-theme="dark"]) {
      background-color: var(--color-background, #0a0a0a);
      --table-border: rgba(255, 255, 255, 0.1);
      --table-header-bg: rgba(255, 255, 255, 0.03);
      --table-header-text: var(--color-foreground-muted, #a1a1aa);
      --table-stripe-bg: rgba(255, 255, 255, 0.02);
      --table-hover-bg: rgba(255, 255, 255, 0.04);
      --table-selected-bg: rgba(59, 130, 246, 0.15);
    }

    /* テーブルコンテナ（ラッパーとしての役割のみ） */
    .table-container {
      display: block;
      width: 100%;
    }

    .table-container:focus-visible {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
      border-radius: var(--radius-lg, 0.5rem);
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'default' | 'striped' | 'bordered' = 'default';

  @property({ type: Boolean, reflect: true })
  hoverable = false;

  @property({ type: Boolean, reflect: true })
  compact = false;

  @property({ type: Boolean, reflect: true })
  stickyHeader = false;

  @property({ type: Boolean, reflect: true })
  selectable = false;

  @property({ type: String })
  label = 'データテーブル';

  override connectedCallback() {
    super.connectedCallback();
    injectGlobalStyles();
    this.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  private _handleKeyDown(e: KeyboardEvent) {
    // 行 (TR) またはその内部でのキー操作
    const path = e.composedPath();
    const cell = path.find(el => (el as Element).tagName === 'TD' || (el as Element).tagName === 'TH') as HTMLTableCellElement;
    
    if (!cell) return;
    const tr = cell.parentElement as HTMLTableRowElement;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const nextCell = cell.nextElementSibling as HTMLTableCellElement;
        if (nextCell) this._focusCell(nextCell);
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prevCell = cell.previousElementSibling as HTMLTableCellElement;
        if (prevCell) this._focusCell(prevCell);
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        this._moveVertical(cell, 1);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        this._moveVertical(cell, -1);
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (cell.tagName === 'TH' && (cell.hasAttribute('sortable') || cell.hasAttribute('aria-sort'))) {
          this._handleSort(cell);
        } else if (this.selectable && tr.parentElement?.tagName === 'TBODY') {
          // 行選択
          const checkbox = tr.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            this._updateRowSelection(tr, checkbox.checked);
          } else {
            const isSelected = tr.getAttribute('aria-selected') === 'true';
            this._updateRowSelection(tr, !isSelected);
          }
        }
        break;
      }
    }
  }

  // 垂直移動ヘルパー
  private _moveVertical(currentCell: HTMLTableCellElement, direction: 1 | -1) {
    const table = currentCell.closest('table');
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr'));
    const currentRow = currentCell.parentElement as HTMLTableRowElement;
    const rowIndex = rows.indexOf(currentRow);
    
    const targetRow = rows[rowIndex + direction];
    if (targetRow) {
      // colspan等を考慮しない簡易実装（cellIndexベース）
      const targetCell = targetRow.children[currentCell.cellIndex] as HTMLTableCellElement;
      if (targetCell) this._focusCell(targetCell);
    }
  }

  private _focusCell(cell: HTMLTableCellElement) {
    const table = cell.closest('table');
    if (table) {
      table.querySelectorAll('th, td').forEach(c => c.setAttribute('tabindex', '-1'));
    }
    cell.setAttribute('tabindex', '0');
    cell.focus();
  }
  
  private _handleClick(e: MouseEvent) {
    const path = e.composedPath();
    
    // クリックされたセルにフォーカス
    const cell = path.find(el => (el as Element).tagName === 'TD' || (el as Element).tagName === 'TH') as HTMLTableCellElement;
    if (cell) {
      this._focusCell(cell);
    }

    // 1. ソート処理 (THクリック)
    const th = path.find(el => (el as Element).tagName === 'TH') as HTMLTableCellElement;
    if (th && (th.hasAttribute('sortable') || th.hasAttribute('aria-sort'))) {
      this._handleSort(th);
      return; 
    }

    // 2. 行クリック処理
    const tr = path.find(el => (el as Element).tagName === 'TR') as HTMLTableRowElement;
    if (tr && tr.parentElement?.tagName === 'TBODY') {
      // 行選択処理
      if (this.selectable) {
        const target = e.target as HTMLElement;
        const checkbox = tr.querySelector('input[type="checkbox"]') as HTMLInputElement;
  
        // チェックボックス自体をクリックした場合
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
          const isChecked = (target as HTMLInputElement).checked;
          this._updateRowSelection(tr, isChecked);
          return;
        }
  
        // 行の他の部分をクリックした場合
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          this._updateRowSelection(tr, checkbox.checked);
        } else {
          const isSelected = tr.getAttribute('aria-selected') === 'true';
          this._updateRowSelection(tr, !isSelected);
        }
      }
    }
  }

  private _handleSort(th: HTMLTableCellElement) {
    const table = th.closest('table');
    if (!table) return;

    // 現在のソート状態
    const currentSort = th.getAttribute('aria-sort');
    let nextSort: 'ascending' | 'descending' = 'ascending';

    // トグルロジック
    if (currentSort === 'ascending') {
        nextSort = 'descending';
    } else if (currentSort === 'descending') {
        nextSort = 'ascending';
    } else {
        nextSort = 'ascending';
    }

    // 他のヘッダーのソート状態をクリア
    const headers = table.querySelectorAll('th');
    headers.forEach(h => {
        if (h !== th && (h.hasAttribute('sortable') || h.hasAttribute('aria-sort'))) {
            h.setAttribute('aria-sort', 'none');
        }
    });

    th.setAttribute('aria-sort', nextSort);
    this._performSort(th, nextSort);

    // イベント発火
    this.dispatchEvent(new CustomEvent('sort-change', {
        bubbles: true,
        composed: true,
        detail: {
            colIndex: th.cellIndex,
            direction: nextSort,
            column: th.innerText.trim()
        }
    }));
  }

  // 実際のソート実行ロジック
  private _performSort(th: HTMLTableCellElement, directionStr: 'ascending' | 'descending') {
    const table = th.closest('table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // アイコンの更新
    const icon = th.querySelector('iconify-icon');
    if (icon) {
        if (directionStr === 'ascending') {
            icon.setAttribute('icon', 'lucide:arrow-up');
        } else {
            icon.setAttribute('icon', 'lucide:arrow-down');
        }
    }

    const colIndex = th.cellIndex;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const direction = directionStr === 'ascending' ? 1 : -1;

    rows.sort((a, b) => {
        const cellA = a.cells[colIndex]?.innerText?.trim() || '';
        const cellB = b.cells[colIndex]?.innerText?.trim() || '';

        // 日付判定 (簡易) YYYY-MM-DD
        const dateA = Date.parse(cellA);
        const dateB = Date.parse(cellB);
        if (!isNaN(dateA) && !isNaN(dateB) && cellA.includes('-')) {
            return (dateA - dateB) * direction;
        }

        // 数値判定
        // カンマや通貨記号を除去して数値パース
        const numA = parseFloat(cellA.replace(/[$,]/g, ''));
        const numB = parseFloat(cellB.replace(/[$,]/g, ''));

        // 両方とも数値として有効かつ、文字列が数字っぽい場合
        if (!isNaN(numA) && !isNaN(numB) && 
            /^[\d\.,$]+$/.test(cellA) && /^[\d\.,$]+$/.test(cellB)) {
            return (numA - numB) * direction;
        }

        // 文字列比較 (numeric: true で "Item 10" > "Item 2" を正しく判定)
        return cellA.localeCompare(cellB, undefined, { numeric: true }) * direction;
    });

    rows.forEach(row => tbody.appendChild(row));
  }

  private _handleSlotChange() {
    // 初期ソートの実行
    const table = this.querySelector('table');
    if (table) {
        // キーボード操作用の初期化: 全セル tabindex=-1
        const cells = table.querySelectorAll('th, td');
        cells.forEach(c => c.setAttribute('tabindex', '-1'));
        if (cells.length > 0) {
            cells[0]?.setAttribute('tabindex', '0');
        }

        const ths = Array.from(table.querySelectorAll('th'));
        const sortedTh = ths.find(th => 
            th.getAttribute('aria-sort') === 'ascending' || 
            th.getAttribute('aria-sort') === 'descending'
        );

        if (sortedTh) {
            const sortDir = sortedTh.getAttribute('aria-sort') as 'ascending' | 'descending';
            this._performSort(sortedTh, sortDir);
        }
    }
  }

  private _updateRowSelection(row: HTMLTableRowElement, isSelected: boolean) {
    if (isSelected) {
      row.setAttribute('aria-selected', 'true');
    } else {
      row.removeAttribute('aria-selected');
    }

    // イベント発火
    this.dispatchEvent(new CustomEvent('row-selection-change', {
      bubbles: true,
      composed: true,
      detail: {
        row,
        selected: isSelected,
        rowIndex: row.rowIndex
      }
    }));
  }

  override render() {
    return html`
      <div class="table-container" role="region" aria-label="${this.label}">
        <slot @slotchange=${this._handleSlotChange}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-table': UiTable;
  }
}
