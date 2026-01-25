import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// グローバルスタイルのID（重複注入防止）
const GLOBAL_STYLE_ID = 'ui-task-list-global-styles';

// Light DOM に適用するグローバルスタイル
const globalStyles = `
  /* ui-task-list 内のリストスタイル */
  ui-task-list ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* リスト項目の基本スタイル */
  ui-task-list li {
    padding: 0.75rem 0;
    font-size: var(--text-sm, 0.875rem);
    line-height: 1.5;
    color: var(--color-foreground, #0a0a0a);
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    transition: opacity 200ms ease-out, background-color 100ms ease-out;
    cursor: pointer;
  }

  /* ホバー効果 */
  ui-task-list li:hover {
    background-color: var(--list-hover-bg, rgba(0, 0, 0, 0.02));
  }

  /* チェックボックス */
  ui-task-list input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 1.125rem;
    height: 1.125rem;
    border: 2px solid var(--color-border, #d1d5db);
    border-radius: var(--radius-sm, 0.25rem);
    background-color: var(--color-background, #ffffff);
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 0.125rem;
    transition: background-color 100ms ease-out, border-color 100ms ease-out;
    position: relative;
  }

  ui-task-list input[type="checkbox"]:hover {
    border-color: var(--color-primary, #3b82f6);
  }

  ui-task-list input[type="checkbox"]:focus-visible {
    outline: 2px solid var(--color-primary, #3b82f6);
    outline-offset: 2px;
  }

  /* チェック済みのチェックボックス */
  ui-task-list input[type="checkbox"]:checked {
    background-color: var(--color-primary, #3b82f6);
    border-color: var(--color-primary, #3b82f6);
  }

  /* チェックマーク */
  ui-task-list input[type="checkbox"]:checked::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -60%) rotate(45deg);
    width: 5px;
    height: 9px;
    border: solid white;
    border-width: 0 2px 2px 0;
  }

  /* 完了したタスクのテキスト */
  ui-task-list li:has(input[type="checkbox"]:checked) {
    opacity: 0.6;
  }

  ui-task-list li:has(input[type="checkbox"]:checked) > :not(input) {
    text-decoration: line-through;
    text-decoration-color: var(--color-foreground-muted, #9ca3af);
  }

  /* デフォルトバリアント */
  ui-task-list:not([variant]) li:not(:last-child),
  ui-task-list[variant="default"] li:not(:last-child) {
    border-bottom: 1px solid var(--list-border, rgba(0, 0, 0, 0.08));
  }

  /* カードバリアント */
  ui-task-list[variant="card"] li {
    padding: 1rem;
    border: 1px solid var(--list-border, rgba(0, 0, 0, 0.08));
    border-radius: var(--radius-md, 0.375rem);
    background-color: var(--color-background, #ffffff);
  }

  ui-task-list[variant="card"] li:not(:last-child) {
    margin-bottom: 0.5rem;
  }

  /* コンパクトモード */
  ui-task-list[compact] li {
    padding: 0.5rem 0;
    font-size: 0.8125rem;
  }

  ui-task-list[compact][variant="card"] li {
    padding: 0.75rem;
  }

  /* ダークモード */
  @media (prefers-color-scheme: dark) {
    ui-task-list:not([data-theme="light"]) {
      --list-border: rgba(255, 255, 255, 0.1);
      --color-border: #4b5563;
    }
    
    ui-task-list:not([data-theme="light"]) li {
      color: var(--color-foreground, #ededed);
    }

    ui-task-list:not([data-theme="light"]) input[type="checkbox"] {
      background-color: var(--color-background, #0a0a0a);
      border-color: #4b5563;
    }

    ui-task-list:not([data-theme="light"]) input[type="checkbox"]:hover {
      border-color: var(--color-primary, #3b82f6);
    }

    ui-task-list:not([data-theme="light"]) li:has(input[type="checkbox"]:checked) > :not(input) {
      text-decoration-color: var(--color-foreground-muted, #6b7280);
    }
  }

  [data-theme="dark"] ui-task-list {
    --list-border: rgba(255, 255, 255, 0.1);
    --color-border: #4b5563;
  }
  
  [data-theme="dark"] ui-task-list li {
    color: var(--color-foreground, #ededed);
  }

  [data-theme="dark"] ui-task-list input[type="checkbox"] {
    background-color: var(--color-background, #0a0a0a);
    border-color: #4b5563;
  }

  [data-theme="dark"] ui-task-list input[type="checkbox"]:hover {
    border-color: var(--color-primary, #3b82f6);
  }

  [data-theme="dark"] ui-task-list li:has(input[type="checkbox"]:checked) > :not(input) {
    text-decoration-color: var(--color-foreground-muted, #6b7280);
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
 * ui-task-list - タスクリスト（チェックボックス付きリスト）コンポーネント
 * 
 * Markdownのタスクリストや TODO リストをLinear/Raycast風にスタイリングします
 * 
 * @element ui-task-list
 * 
 * @slot - リスト要素 (<ul> または <ol>)
 * 
 * @fires task-change - タスクの完了状態が変更された時に発火
 */
@customElement('ui-task-list')
export class UiTaskList extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      
      /* CSS変数をホストに設定 */
      --list-border: color-mix(in srgb, var(--color-border, #e5e7eb), transparent 20%);
    }

    /* ダークモード変数 */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        --list-border: rgba(255, 255, 255, 0.1);
      }
    }

    :host-context([data-theme="dark"]) {
      --list-border: rgba(255, 255, 255, 0.1);
    }

    .task-list-container {
      display: block;
      width: 100%;
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'default' | 'card' = 'default';

  @property({ type: Boolean, reflect: true })
  compact = false;

  override connectedCallback() {
    super.connectedCallback();
    injectGlobalStyles();
    this.addEventListener('change', this._handleChange);
    this.addEventListener('click', this._handleClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('change', this._handleChange);
    this.removeEventListener('click', this._handleClick);
  }

  private _handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    
    // チェックボックス自体のクリックは無視（重複発火防止）
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      return;
    }

    // テキスト選択中の場合は何もしない（コピー操作の妨げ防止）
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    // クリックされた要素の親liを探す
    const li = target.closest('li');
    // ui-task-list内のliであることを確認
    if (!li || !this.contains(li)) return;

    // li内のチェックボックスを探してクリック
    const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (checkbox) {
      checkbox.click();
    }
  }

  private _handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    
    if (target.type === 'checkbox') {
      // イベント発火
      this.dispatchEvent(new CustomEvent('task-change', {
        bubbles: true,
        composed: true,
        detail: {
          checked: target.checked,
          taskElement: target.closest('li')
        }
      }));
    }
  }

  private _handleSlotChange() {
    // 初期化: アクセシビリティ用の role 設定
    const list = this.querySelector('ul, ol');
    if (list) {
      list.setAttribute('role', 'list');
      
      const items = Array.from(list.querySelectorAll('li'));
      items.forEach((item) => {
        item.setAttribute('role', 'listitem');
      });
    }
  }

  override render() {
    return html`
      <div class="task-list-container">
        <slot @slotchange=${this._handleSlotChange}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-task-list': UiTaskList;
  }
}
