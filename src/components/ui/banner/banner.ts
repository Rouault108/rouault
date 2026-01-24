import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../icon-button/icon-button.ts';

/**
 * ui-banner - ページ全体またはセクションに表示される通知バナー
 * 
 * @element ui-banner
 * @fires banner-close - バナーが閉じられた時に発火
 * 
 * @slot - バナーのメインメッセージ
 * @slot action - アクションボタン（CTAなど）
 */
@customElement('ui-banner')
export class UiBanner extends LitElement {
  static override styles = css`
    :host {
      display: block;
      /* カラー変数 */
      --banner-bg: var(--color-info-bg, #eff6ff);
      --banner-border: color-mix(in srgb, var(--color-info, #3b82f6), transparent 70%);
      --banner-text: var(--color-info-text, #1e40af);
      --banner-icon: var(--color-info, #3b82f6);
    }

    /* ホスト非表示時 */
    :host([hidden]) {
      display: none;
    }

    /* フェードアウトアニメーション */
    :host([closing]) .banner {
      animation: fade-out var(--duration-fast, 100ms) var(--ease-in, ease-in) forwards;
    }

    @keyframes fade-out {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-4px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host([closing]) .banner {
        animation: none;
        opacity: 0;
      }
    }

    /* バナーコンテナ */
    .banner {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3, 0.75rem);
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      background-color: var(--banner-bg);
      border: 1px solid var(--banner-border);
      border-radius: var(--radius-lg, 0.5rem);
      color: var(--banner-text);
      font-size: var(--text-sm, 0.8125rem);
      line-height: var(--line-height-relaxed, 1.6);
    }

    /* アイコンエリア */
    .icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-sm, 16px);
      height: calc(1em * var(--line-height-relaxed, 1.6));
      color: var(--banner-icon);
    }

    .icon iconify-icon {
      font-size: var(--icon-sm, 16px);
      line-height: 1;
    }

    /* コンテンツエリア */
    .content {
      flex: 1;
      min-width: 0;
    }

    .content ::slotted(a) {
      /* リンクの色はボーダー色ではなく、アイコンと同じ濃い色を使う方が視認性が良い */
      color: var(--banner-icon);
      text-decoration: underline;
      font-weight: var(--font-medium, 500);
    }

    .content ::slotted(a:hover) {
      text-decoration: none;
    }

    .content ::slotted(strong) {
      font-weight: var(--font-semibold, 600);
    }

    /* アクションエリア */
    .actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
    }

    /* 閉じるボタン */
    .close-button {
      flex-shrink: 0;
      /* ui-icon-button のスタイル上書き */
      --bg-hover: rgba(0, 0, 0, 0.05);
      --bg-active: rgba(0, 0, 0, 0.1);
      
      /* 行の高さに合わせて中央配置 */
      height: calc(1em * var(--line-height-relaxed, 1.6));
      display: flex;
      align-items: center;
    }

    .close-button iconify-icon {
      font-size: var(--icon-sm, 16px);
    }

    /* バリアント: Success */
    :host([variant="success"]) {
      --banner-bg: var(--color-success-bg, #f0fdf4);
      --banner-border: color-mix(in srgb, var(--color-success, #22c55e), transparent 70%);
      --banner-text: var(--color-success-text, #166534);
      --banner-icon: var(--color-success, #22c55e);
    }

    /* バリアント: Warning */
    :host([variant="warning"]) {
      --banner-bg: var(--color-warning-bg, #fffbeb);
      /* tokens.cssに Amber 600 の定義がないため、アクセシビリティ向上のため直接指定 */
      --banner-border: color-mix(in srgb, #d97706, transparent 70%);
      --banner-text: var(--color-warning-text, #92400e);
      --banner-icon: #d97706; /* Amber 600 */
    }

    /* バリアント: Error */
    :host([variant="error"]) {
      --banner-bg: var(--color-error-bg, #fef2f2);
      --banner-border: color-mix(in srgb, var(--color-error, #ef4444), transparent 70%);
      --banner-text: var(--color-error-text, #991b1b);
      --banner-icon: var(--color-error, #ef4444);
    }

    /* ダークモード対応 */
    @media (prefers-color-scheme: dark) {
      :host:not([data-theme="light"]) {
        --banner-bg: rgba(59, 130, 246, 0.1);
        --banner-text: #93c5fd;
        --banner-icon: #60a5fa;
      }

      :host([variant="success"]):not([data-theme="light"]) {
        --banner-bg: rgba(34, 197, 94, 0.1);
        --banner-text: #86efac;
        --banner-icon: #4ade80;
      }

      :host([variant="warning"]):not([data-theme="light"]) {
        --banner-bg: rgba(245, 158, 11, 0.1);
        --banner-text: #fcd34d;
        --banner-icon: #fbbf24;
      }

      :host([variant="error"]):not([data-theme="light"]) {
        --banner-bg: rgba(239, 68, 68, 0.1);
        --banner-text: #fca5a5;
        --banner-icon: #f87171;
      }

      :host:not([data-theme="light"]) .close-button {
        --bg-hover: rgba(255, 255, 255, 0.1);
        --bg-active: rgba(255, 255, 255, 0.2);
      }
    }

    :host-context([data-theme="dark"]) {
      --banner-bg: rgba(59, 130, 246, 0.1);
      --banner-text: #93c5fd;
      --banner-icon: #60a5fa;
    }

    :host-context([data-theme="dark"]):host([variant="success"]) {
      --banner-bg: rgba(34, 197, 94, 0.1);
      --banner-text: #86efac;
      --banner-icon: #4ade80;
    }

    :host-context([data-theme="dark"]):host([variant="warning"]) {
      --banner-bg: rgba(245, 158, 11, 0.1);
      --banner-text: #fcd34d;
      --banner-icon: #fbbf24;
    }

    :host-context([data-theme="dark"]):host([variant="error"]) {
      --banner-bg: rgba(239, 68, 68, 0.1);
      --banner-text: #fca5a5;
      --banner-icon: #f87171;
    }

    :host-context([data-theme="dark"]) .close-button {
      --bg-hover: rgba(255, 255, 255, 0.1);
      --bg-active: rgba(255, 255, 255, 0.2);
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'info' | 'success' | 'warning' | 'error' = 'info';

  @property({ type: Boolean, reflect: true })
  dismissible = false;

  @property({ type: Boolean })
  showIcon = true;

  @state()
  private _hasAction = false;

  protected override firstUpdated() {
    this._checkSlots();
    this._setupAccessibility();
    this._setupKeyboardHandling();
  }

  private _setupAccessibility() {
    // variantに応じてroleとaria-liveを設定
    if (!this.hasAttribute('role')) {
      const role = this.variant === 'error' ? 'alert' : 'status';
      this.setAttribute('role', role);
    }

    if (!this.hasAttribute('aria-live')) {
      const ariaLive = this.variant === 'error' ? 'assertive' : 'polite';
      this.setAttribute('aria-live', ariaLive);
    }
  }

  private _setupKeyboardHandling() {
    if (this.dismissible) {
      this.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this._handleClose();
        }
      });
    }
  }

  private _checkSlots() {
    const actionSlot = this.shadowRoot?.querySelector('slot[name="action"]') as HTMLSlotElement;
    if (actionSlot) {
      this._hasAction = actionSlot.assignedNodes({ flatten: true }).length > 0;
    }
  }

  private _onActionSlotChange() {
    this._checkSlots();
  }

  private _getIcon() {
    switch (this.variant) {
      case 'success':
        return html`<iconify-icon icon="lucide:circle-check-big"></iconify-icon>`;
      case 'warning':
        return html`<iconify-icon icon="lucide:alert-triangle"></iconify-icon>`;
      case 'error':
        return html`<iconify-icon icon="lucide:alert-circle"></iconify-icon>`;
      default: // info
        return html`<iconify-icon icon="lucide:info"></iconify-icon>`;
    }
  }

  private _handleClose() {
    this.dispatchEvent(new CustomEvent('banner-close', {
      bubbles: true,
      composed: true,
    }));

    // closing 属性を設定してアニメーション開始
    this.setAttribute('closing', '');

    // アニメーション完了後に非表示
    const duration = 100; // var(--duration-fast) のデフォルト値
    setTimeout(() => {
      this.setAttribute('hidden', '');
      this.removeAttribute('closing');
    }, duration);
  }

  override render() {
    return html`
      <div class="banner">
        ${this.showIcon ? html`<div class="icon">${this._getIcon()}</div>` : ''}
        
        <div class="content">
          <slot></slot>
        </div>

        ${this._hasAction ? html`
          <div class="actions">
            <slot name="action" @slotchange="${this._onActionSlotChange}"></slot>
          </div>
        ` : ''}

        ${this.dismissible ? html`
          <div class="close-button">
            <ui-icon-button 
              @click="${this._handleClose}"
              aria-label="バナーを閉じる"
              variant="ghost"
              size="sm"
            >
              <iconify-icon icon="lucide:x"></iconify-icon>
            </ui-icon-button>
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-banner': UiBanner;
  }
}
