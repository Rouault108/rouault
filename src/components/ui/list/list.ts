import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// グローバルスタイルのID（重複注入防止）
const GLOBAL_STYLE_ID = 'ui-list-global-styles';

// Light DOM に適用するグローバルスタイル
const globalStyles = `
  /* ui-list 内のリストスタイル */
  ui-list ul,
  ui-list ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* リスト項目の基本スタイル */
  ui-list li {
    padding: 0.75rem 1rem;
    font-size: var(--text-sm, 0.875rem);
    line-height: 1.5;
    color: var(--color-foreground, #0a0a0a);
    transition: background-color 100ms ease-out, border-color 100ms ease-out;
    display: flex;
    align-items: center;
    position: relative;
  }

  /* デフォルトバリアント（微妙なボーダー） */
  ui-list:not([variant]) li:not(:last-child),
  ui-list[variant="default"] li:not(:last-child) {
    border-bottom: 1px solid var(--list-border, rgba(0, 0, 0, 0.08));
  }

  /* ボーダーバリアント */
  ui-list[variant="bordered"] li {
    border: 1px solid var(--list-border, rgba(0, 0, 0, 0.08));
    border-radius: var(--radius-md, 0.375rem);
  }

  ui-list[variant="bordered"] li:not(:last-child) {
    margin-bottom: 0.5rem;
  }

  /* カードバリアント */
  ui-list[variant="card"] li {
    border: 1px solid var(--list-border, rgba(0, 0, 0, 0.08));
    border-radius: var(--radius-lg, 0.5rem);
    padding: 1rem 1.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }

  ui-list[variant="card"] li:not(:last-child) {
    margin-bottom: 0.75rem;
  }

  /* シンプルバリアント（ボーダーなし） */
  ui-list[variant="simple"] li {
    border: none;
  }

  /* バレットバリアント (文書用) */
  ui-list[variant="bullet"] li {
    border: none;
    padding: 0.375rem 0;
    padding-left: 0.5rem;
  }

  ui-list[variant="bullet"] li::before {
    content: "";
    display: inline-block;
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
    background-color: var(--color-foreground-muted, #a1a1aa);
    margin-right: 0.75rem;
    flex-shrink: 0;
  }

  /* ネストリストのバレット（白丸） */
  ui-list[variant="bullet"] ul li ul li::before,
  ui-list[variant="bullet"] ul li ol li::before {
    background-color: transparent;
    border: 1px solid var(--color-foreground-muted, #a1a1aa);
  }

  /* コンパクトモード */
  ui-list[compact] li {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
  }
  
  /* バレットの場合はコンパクトでもpadding微調整 */
  ui-list[variant="bullet"][compact] li {
    padding: 0.25rem 0 0.25rem 0.5rem;
  }

  /* Divider (区切り線) */
  ui-list[divider] li:not(:last-child) {
    border-bottom: 1px solid var(--list-border, rgba(0, 0, 0, 0.08)) !important;
  }

  /* ホバー効果 */
  ui-list[hoverable] li {
    cursor: pointer;
  }

  ui-list[hoverable] li:hover {
    background-color: var(--list-hover-bg, rgba(0, 0, 0, 0.03));
  }

  /* 選択可能な項目 */
  ui-list[selectable] li {
    cursor: pointer;
    user-select: none;
  }

  /* 選択状態 */
  ui-list li[aria-selected="true"] {
    background-color: var(--list-selected-bg, rgba(59, 130, 246, 0.08)) !important;
    border-color: var(--list-selected-border, rgba(59, 130, 246, 0.2));
  }

  /* フォーカスリング */
  ui-list li:focus-visible {
    outline: 2px solid var(--color-primary, #3b82f6);
    outline-offset: -2px;
    z-index: 1;
  }

  /* 順序付きリストの番号 */
  ui-list ol {
    counter-reset: list-counter;
  }

  ui-list ol li {
    counter-increment: list-counter;
  }

  ui-list ol li::before {
    content: counter(list-counter) ".";
    display: inline-block;
    width: 1.5rem;
    margin-right: 0.75rem;
    font-weight: 500;
    color: var(--color-foreground-muted, #6b7280);
    flex-shrink: 0;
  }

  /* アイコンのスタイル調整 */
  ui-list li iconify-icon {
    flex-shrink: 0;
    font-size: 1.25rem;
    color: var(--color-foreground-muted, #6b7280);
  }

  /* ダークモード */
  @media (prefers-color-scheme: dark) {
    ui-list:not([data-theme="light"]) {
      --list-border: rgba(255, 255, 255, 0.1);
      --list-hover-bg: rgba(255, 255, 255, 0.05);
      --list-selected-bg: rgba(59, 130, 246, 0.15);
      --list-selected-border: rgba(59, 130, 246, 0.3);
    }
    
    ui-list:not([data-theme="light"]) li {
      color: var(--color-foreground, #ededed);
    }
  }

  [data-theme="dark"] ui-list {
    --list-border: rgba(255, 255, 255, 0.1);
    --list-hover-bg: rgba(255, 255, 255, 0.05);
    --list-selected-bg: rgba(59, 130, 246, 0.15);
    --list-selected-border: rgba(59, 130, 246, 0.3);
  }
  
  [data-theme="dark"] ui-list li {
    color: var(--color-foreground, #ededed);
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
 * ui-list - リストスタイリングコンポーネント
 * 
 * Markdownのリストやコンテンツ内のリストをLinear/Raycast風にスタイリングします
 * 
 * @element ui-list
 * 
 * @slot - リスト要素 (<ul> または <ol>)
 * 
 * @fires item-click - リスト項目がクリックされた時に発火
 * @fires item-selection-change - 項目の選択状態が変更された時に発火
 */
@customElement('ui-list')
export class UiList extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      
      /* CSS変数をホストに設定 */
      --list-border: color-mix(in srgb, var(--color-border, #e5e7eb), transparent 20%);
      --list-hover-bg: rgba(0, 0, 0, 0.03);
      --list-selected-bg: color-mix(in srgb, var(--color-primary, #3b82f6), transparent 92%);
      --list-selected-border: rgba(59, 130, 246, 0.2);
    }

    /* ダークモード変数 */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        --list-border: rgba(255, 255, 255, 0.1);
        --list-hover-bg: rgba(255, 255, 255, 0.05);
        --list-selected-bg: rgba(59, 130, 246, 0.15);
        --list-selected-border: rgba(59, 130, 246, 0.3);
      }
    }

    :host-context([data-theme="dark"]) {
      --list-border: rgba(255, 255, 255, 0.1);
      --list-hover-bg: rgba(255, 255, 255, 0.05);
      --list-selected-bg: rgba(59, 130, 246, 0.15);
      --list-selected-border: rgba(59, 130, 246, 0.3);
    }

    .list-container {
      display: block;
      width: 100%;
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'default' | 'bordered' | 'card' | 'simple' | 'bullet' = 'default';

  @property({ type: Boolean, reflect: true })
  hoverable = false;

  @property({ type: Boolean, reflect: true })
  compact = false;

  @property({ type: Boolean, reflect: true })
  selectable = false;

  @property({ type: Boolean, reflect: true })
  divider = false;

  @property({ type: String })
  label = 'リスト';

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

  private _handleClick(e: MouseEvent) {
    const path = e.composedPath();
    const li = path.find(el => (el as Element).tagName === 'LI') as HTMLLIElement;
    
    if (li) {
      // クリックされた項目にフォーカス
      this._focusItem(li);

      // イベント発火
      this.dispatchEvent(new CustomEvent('item-click', {
        bubbles: true,
        composed: true,
        detail: {
          item: li,
          index: this._getItemIndex(li)
        }
      }));

      // 選択処理
      if (this.selectable) {
        this._toggleItemSelection(li);
      }
    }
  }

  private _handleKeyDown(e: KeyboardEvent) {
    const path = e.composedPath();
    const li = path.find(el => (el as Element).tagName === 'LI') as HTMLLIElement;
    
    if (!li) return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextItem = li.nextElementSibling as HTMLLIElement;
        if (nextItem && nextItem.tagName === 'LI') {
          this._focusItem(nextItem);
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevItem = li.previousElementSibling as HTMLLIElement;
        if (prevItem && prevItem.tagName === 'LI') {
          this._focusItem(prevItem);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (this.selectable) {
          this._toggleItemSelection(li);
        }
        
        // クリックイベントも発火
        this.dispatchEvent(new CustomEvent('item-click', {
          bubbles: true,
          composed: true,
          detail: {
            item: li,
            index: this._getItemIndex(li)
          }
        }));
        break;
      }
    }
  }

  private _focusItem(item: HTMLLIElement) {
    const list = item.closest('ul, ol');
    if (!list) return;

    // Roving Tabindex: フォーカス項目のみ 0、他は -1
    const items = Array.from(list.querySelectorAll('li'));
    items.forEach(i => i.setAttribute('tabindex', '-1'));
    
    item.setAttribute('tabindex', '0');
    item.focus();
  }

  private _toggleItemSelection(item: HTMLLIElement) {
    const isSelected = item.getAttribute('aria-selected') === 'true';
    
    if (isSelected) {
      item.removeAttribute('aria-selected');
    } else {
      item.setAttribute('aria-selected', 'true');
    }

    // イベント発火
    this.dispatchEvent(new CustomEvent('item-selection-change', {
      bubbles: true,
      composed: true,
      detail: {
        item,
        selected: !isSelected,
        index: this._getItemIndex(item)
      }
    }));
  }

  private _getItemIndex(item: HTMLLIElement): number {
    const list = item.closest('ul, ol');
    if (!list) return -1;
    
    const items = Array.from(list.querySelectorAll('li'));
    return items.indexOf(item);
  }

  private _handleSlotChange() {
    // 初期化: キーボードナビゲーション用の tabindex 設定
    const list = this.querySelector('ul, ol');
    if (list) {
      const items = Array.from(list.querySelectorAll('li'));
      items.forEach((item, index) => {
        // 最初の項目のみ tabindex="0"、他は "-1"
        item.setAttribute('tabindex', index === 0 ? '0' : '-1');
        
        // selectable モードの場合、role 追加
        if (this.selectable) {
          item.setAttribute('role', 'option');
          item.setAttribute('aria-selected', 'false');
        }
      });

      // リスト自体に role 設定
      if (this.selectable) {
        list.setAttribute('role', 'listbox');
      } else {
        list.setAttribute('role', 'list');
      }
    }
  }

  override render() {
    return html`
      <div class="list-container">
        <slot @slotchange=${this._handleSlotChange}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-list': UiList;
  }
}
