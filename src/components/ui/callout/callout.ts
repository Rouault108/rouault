import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * ui-callout - 記事内のコールアウト（注意書き、ヒント、警告など）
 * 
 * GitHub Flavored Markdown の Alert 記法（> [!NOTE]）から生成されることを想定
 * 
 * @element ui-callout
 * @fires callout-toggle - 折りたたみ状態が変更された時に発火
 * 
 * @slot - コールアウトのメインコンテンツ
 */
@customElement('ui-callout')
export class UiCallout extends LitElement {
  static override styles = css`
    :host {
      display: block;
      
      /* カラー変数（design-system.md準拠） */
      --callout-bg: var(--color-info-bg, #eff6ff);
      --callout-border: color-mix(in srgb, var(--color-info, #3b82f6), transparent 70%);
      --callout-text: var(--color-foreground, #111827);
      --callout-title: var(--color-info, #3b82f6);
      --callout-icon: var(--color-info, #3b82f6);
    }

    /* ダークモード変数オーバーライド */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        --callout-bg: rgba(59, 130, 246, 0.15);
        --callout-border: rgba(59, 130, 246, 0.3);
        --callout-text: var(--color-foreground, #ededed);
        --callout-title: #93c5fd;
        --callout-icon: #60a5fa;
      }
    }

    :host-context([data-theme="dark"]) {
      --callout-bg: rgba(59, 130, 246, 0.15);
      --callout-border: rgba(59, 130, 246, 0.3);
      --callout-text: var(--color-foreground, #ededed);
      --callout-title: #93c5fd;
      --callout-icon: #60a5fa;
    }

    /* バリアント: Tip（ヒント - 緑） */
    :host([variant="tip"]) {
      --callout-bg: var(--color-success-bg, #f0fdf4);
      --callout-border: color-mix(in srgb, var(--color-success, #22c55e), transparent 70%);
      --callout-title: var(--color-success, #22c55e);
      --callout-icon: var(--color-success, #22c55e);
    }

    @media (prefers-color-scheme: dark) {
      :host([variant="tip"]):not([data-theme="light"]) {
        --callout-bg: rgba(34, 197, 94, 0.15);
        --callout-border: rgba(34, 197, 94, 0.3);
        --callout-title: #86efac;
        --callout-icon: #4ade80;
      }
    }

    :host-context([data-theme="dark"]):host([variant="tip"]) {
      --callout-bg: rgba(34, 197, 94, 0.15);
      --callout-border: rgba(34, 197, 94, 0.3);
      --callout-title: #86efac;
      --callout-icon: #4ade80;
    }

    /* バリアント: Important（重要 - 紫） */
    :host([variant="important"]) {
      --callout-bg: #faf5ff;
      --callout-border: color-mix(in srgb, #a855f7, transparent 70%);
      --callout-title: #a855f7;
      --callout-icon: #a855f7;
    }

    @media (prefers-color-scheme: dark) {
      :host([variant="important"]):not([data-theme="light"]) {
        --callout-bg: rgba(168, 85, 247, 0.15);
        --callout-border: rgba(168, 85, 247, 0.3);
        --callout-title: #d8b4fe;
        --callout-icon: #c084fc;
      }
    }

    :host-context([data-theme="dark"]):host([variant="important"]) {
      --callout-bg: rgba(168, 85, 247, 0.15);
      --callout-border: rgba(168, 85, 247, 0.3);
      --callout-title: #d8b4fe;
      --callout-icon: #c084fc;
    }

    /* バリアント: Warning（警告 - オレンジ） */
    :host([variant="warning"]) {
      --callout-bg: var(--color-warning-bg, #fffbeb);
      --callout-border: color-mix(in srgb, #d97706, transparent 70%);
      --callout-title: #d97706;
      --callout-icon: #d97706;
    }

    @media (prefers-color-scheme: dark) {
      :host([variant="warning"]):not([data-theme="light"]) {
        --callout-bg: rgba(245, 158, 11, 0.15);
        --callout-border: rgba(245, 158, 11, 0.3);
        --callout-title: #fcd34d;
        --callout-icon: #fbbf24;
      }
    }

    :host-context([data-theme="dark"]):host([variant="warning"]) {
      --callout-bg: rgba(245, 158, 11, 0.15);
      --callout-border: rgba(245, 158, 11, 0.3);
      --callout-title: #fcd34d;
      --callout-icon: #fbbf24;
    }

    /* バリアント: Caution（注意 - 赤） */
    :host([variant="caution"]) {
      --callout-bg: var(--color-error-bg, #fef2f2);
      --callout-border: color-mix(in srgb, var(--color-error, #ef4444), transparent 70%);
      --callout-title: var(--color-error, #ef4444);
      --callout-icon: var(--color-error, #ef4444);
    }

    @media (prefers-color-scheme: dark) {
      :host([variant="caution"]):not([data-theme="light"]) {
        --callout-bg: rgba(239, 68, 68, 0.15);
        --callout-border: rgba(239, 68, 68, 0.3);
        --callout-title: #fca5a5;
        --callout-icon: #f87171;
      }
    }

    :host-context([data-theme="dark"]):host([variant="caution"]) {
      --callout-bg: rgba(239, 68, 68, 0.15);
      --callout-border: rgba(239, 68, 68, 0.3);
      --callout-title: #fca5a5;
      --callout-icon: #f87171;
    }

    /* コールアウトコンテナ */
    .callout {
      position: relative;
      padding: var(--space-4, 1rem);
      background-color: var(--callout-bg);
      border: 1px solid var(--callout-border);
      border-radius: var(--radius-md, 0.375rem);
      color: var(--callout-text);
      font-size: var(--text-base, 0.875rem);
      line-height: var(--line-height-relaxed, 1.6);
    }

    /* ヘッダー部分（アイコン + タイトル + 折りたたみボタン） */
    .header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3, 0.75rem);
      margin-bottom: var(--space-3, 0.75rem);
      transition: margin-bottom 150ms var(--ease-out, ease-out); /* 150ms: Snappy feel */
    }

    /* 折りたたみ時はマージン削除 */
    :host([collapsed]) .header {
      margin-bottom: 0;
    }

    /* タイトルなしの場合はmarginを削除 */
    .header:empty {
      display: none;
    }

    /* アイコン */
    .icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-md, 20px);
      height: var(--icon-md, 20px);
      color: var(--callout-icon);
    }

    .icon iconify-icon {
      font-size: var(--icon-md, 20px);
      line-height: 1;
    }

    /* タイトル */
    .title {
      flex: 1;
      font-size: var(--text-base, 0.875rem);
      font-weight: var(--font-semibold, 600);
      color: var(--callout-title);
      margin: 0;
      line-height: 1.5;
    }

    /* 折りたたみボタン（collapsible時のみ表示） */
    .title-button {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3, 0.75rem);
      width: 100%;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      cursor: pointer;
      text-align: left;
      outline: none;
      transition: 
        opacity 100ms var(--ease-out, ease-out),
        background-color 100ms var(--ease-out, ease-out);
    }

    .title-button:hover {
      opacity: 0.8;
      background-color: rgba(0, 0, 0, 0.03);
    }

    .title-button:focus-visible {
      outline: 2px solid var(--callout-border);
      outline-offset: 2px;
      border-radius: var(--radius-sm, 0.25rem);
    }

    /* ダークモード時のホバー効果 */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) .title-button:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }
    }

    :host-context([data-theme="dark"]) .title-button:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }

    /* 折りたたみアイコン */
    .collapse-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-sm, 16px);
      height: var(--icon-sm, 16px);
      color: var(--callout-icon);
      transition: transform 150ms var(--ease-out, ease-out);
    }

    :host([collapsed]) .collapse-icon {
      transform: rotate(-90deg);
    }

    .collapse-icon iconify-icon {
      font-size: var(--icon-sm, 16px);
    }

    /* コンテンツエリア */
    .content {
      font-size: var(--text-base, 0.875rem);
      line-height: var(--line-height-relaxed, 1.6);
      transition: 
        max-height 150ms var(--ease-out, ease-out),
        opacity 150ms var(--ease-out, ease-out);
      overflow: hidden;
    }

    /* 折りたたみ時 */
    :host([collapsed]) .content {
      max-height: 0;
      opacity: 0;
    }

    /* タイトルがない場合は margin を削除 */
    .callout:not(:has(.header:not(:empty))) .content {
      margin-top: 0;
    }

    /* スロットコンテンツのスタイル */
    .content ::slotted(p) {
      margin: 0 0 var(--space-3, 0.75rem) 0;
    }

    .content ::slotted(p:last-child) {
      margin-bottom: 0;
    }

    .content ::slotted(code) {
      padding: 0.125rem var(--space-1, 0.25rem);
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: var(--radius-sm, 0.25rem);
      font-family: var(--font-mono, monospace);
      font-size: 0.9em;
    }

    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) .content ::slotted(code) {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }

    :host-context([data-theme="dark"]) .content ::slotted(code) {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .content ::slotted(a) {
      color: var(--callout-border);
      text-decoration: underline;
      font-weight: var(--font-medium, 500);
    }

    .content ::slotted(a:hover) {
      text-decoration: none;
    }

    .content ::slotted(ul),
    .content ::slotted(ol) {
      margin: var(--space-2, 0.5rem) 0;
      padding-left: var(--space-5, 1.25rem);
    }

    .content ::slotted(pre) {
      margin: var(--space-3, 0.75rem) 0;
      padding: var(--space-3, 0.75rem);
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: var(--radius-sm, 0.25rem);
      overflow-x: auto;
    }

    /* prefers-reduced-motion対応 */
    @media (prefers-reduced-motion: reduce) {
      .content,
      .collapse-icon {
        transition: none;
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'note' | 'tip' | 'important' | 'warning' | 'caution' = 'note';

  @property({ type: String })
  override title = '';

  @property({ type: Boolean, reflect: true })
  collapsible = false;

  @property({ type: Boolean, reflect: true })
  collapsed = false;

  @property({ type: Boolean })
  showIcon = true;

  @state()
  private _contentId = `callout-content-${Math.random().toString(36).substr(2, 9)}`;

  protected override firstUpdated() {
    this._setupAccessibility();
  }

  private _setupAccessibility() {
    // role属性を設定（コールアウトは補足情報なので 'note' が適切）
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'note');
    }
  }

  private _getIcon() {
    switch (this.variant) {
      case 'tip':
        return html`<iconify-icon icon="lucide:lightbulb"></iconify-icon>`;
      case 'important':
        return html`<iconify-icon icon="lucide:badge-alert"></iconify-icon>`;
      case 'warning':
        return html`<iconify-icon icon="lucide:alert-triangle"></iconify-icon>`;
      case 'caution':
        return html`<iconify-icon icon="lucide:octagon-alert"></iconify-icon>`;
      default: // note
        return html`<iconify-icon icon="lucide:info"></iconify-icon>`;
    }
  }

  private _handleToggle() {
    if (!this.collapsible) return;

    this.collapsed = !this.collapsed;
    
    this.dispatchEvent(new CustomEvent('callout-toggle', {
      bubbles: true,
      composed: true,
      detail: {
        collapsed: this.collapsed,
      },
    }));
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleToggle();
    }
  }

  override render() {
    const hasTitle = this.title.trim().length > 0;
    const showHeader = hasTitle || this.showIcon;

    return html`
      <div class="callout">
        ${showHeader ? html`
          <div class="header">
            ${this.collapsible ? html`
              <button
                class="title-button"
                @click=${this._handleToggle}
                @keydown=${this._handleKeyDown}
                aria-expanded="${!this.collapsed}"
                aria-controls="${this._contentId}"
              >
                ${this.showIcon ? html`<div class="icon">${this._getIcon()}</div>` : ''}
                ${hasTitle ? html`<h3 class="title">${this.title}</h3>` : ''}
                <div class="collapse-icon">
                  <iconify-icon icon="lucide:chevron-down"></iconify-icon>
                </div>
              </button>
            ` : html`
              ${this.showIcon ? html`<div class="icon">${this._getIcon()}</div>` : ''}
              ${hasTitle ? html`<h3 class="title">${this.title}</h3>` : ''}
            `}
          </div>
        ` : ''}
        
        <div 
          class="content"
          id="${this._contentId}"
          aria-hidden="${this.collapsed}"
        >
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-callout': UiCallout;
  }
}
