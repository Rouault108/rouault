import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { t } from '../../../lib/i18n.js';
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
      --banner-bg: var(--color-info-bg);
      --banner-border: color-mix(in srgb, var(--color-info), transparent 90%);
      --banner-text: var(--color-info-text);
      --banner-icon: var(--color-info);
    }

    /* ホスト非表示時 */
    :host([hidden]) {
      display: none;
    }

    /* フェードアウトアニメーション */
    :host([closing]) .banner {
      animation: fade-out var(--duration-fast) var(--ease-in) forwards;
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
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background-color: var(--banner-bg);
      border: 1px solid var(--banner-border);
      border-radius: var(--radius-lg);
      color: var(--banner-text);
      font-size: var(--text-sm);
      line-height: var(--line-height-relaxed);
    }

    /* アイコンエリア */
    .icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-sm);
      height: calc(1em * var(--line-height-relaxed));
      color: var(--banner-icon);
    }

    .icon iconify-icon {
      font-size: var(--icon-sm);
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
      text-decoration-thickness: var(--link-decoration-thickness);
      text-underline-offset: var(--link-underline-offset);
      font-weight: var(--font-medium);
    }

    .content ::slotted(a:hover) {
      text-decoration-thickness: var(--link-decoration-hover-thickness);
    }

    .content ::slotted(strong) {
      font-weight: var(--font-semibold);
    }

    /* アクションエリア */
    .actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    /* 閉じるボタン */
    .close-button {
      flex-shrink: 0;
      /* ui-icon-button のスタイル上書き */
      --bg-hover: var(--color-surface-hover);
      --bg-active: var(--color-surface-active);
      
      /* 行の高さに合わせて中央配置 */
      height: calc(1em * var(--line-height-relaxed));
      display: flex;
      align-items: center;
    }

    .close-button iconify-icon {
      font-size: var(--icon-sm);
    }

    /* バリアント: Success */
    :host([variant="success"]) {
      --banner-bg: var(--color-success-bg);
      --banner-border: color-mix(in srgb, var(--color-success), transparent 90%);
      --banner-text: var(--color-success-text);
      --banner-icon: var(--color-success);
    }

    /* バリアント: Warning */
    :host([variant="warning"]) {
      --banner-bg: var(--color-warning-bg);
      --banner-border: color-mix(in srgb, var(--color-warning), transparent 90%);
      --banner-text: var(--color-warning-text);
      --banner-icon: var(--color-warning);
    }

    /* バリアント: Error */
    :host([variant="error"]) {
      --banner-bg: var(--color-error-bg);
      --banner-border: color-mix(in srgb, var(--color-error), transparent 90%);
      --banner-text: var(--color-error-text);
      --banner-icon: var(--color-error);
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
    const actionSlot = this.shadowRoot?.querySelector('slot[name="action"]');
    if (actionSlot instanceof HTMLSlotElement) {
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

  private _getCloseLabel(): string {
    return t('banner.close');
  }

  private _handleClose() {
    this.dispatchEvent(new CustomEvent('banner-close', {
      bubbles: true,
      composed: true,
    }));

    // closing 属性を設定してアニメーション開始
    this.setAttribute('closing', '');

    // animationendイベントで非表示（CSS変数と同期）
    const banner = this.shadowRoot?.querySelector('.banner');
    if (banner) {
      banner.addEventListener(
        'animationend',
        () => {
          this.setAttribute('hidden', '');
          this.removeAttribute('closing');
        },
        { once: true }
      );
    } else {
      // フォールバック（アニメーションなしの場合）
      this.setAttribute('hidden', '');
      this.removeAttribute('closing');
    }
  }

  override render() {
    return html`
      <div class="banner">
        ${this.showIcon ? html`<div class="icon">${this._getIcon()}</div>` : ''}
        
        <div class="content">
          <slot></slot>
        </div>

        <div class="actions" style="display: ${this._hasAction ? 'flex' : 'none'}">
          <slot name="action" @slotchange="${this._onActionSlotChange}"></slot>
        </div>

        ${this.dismissible ? html`
          <div class="close-button">
            <ui-icon-button 
              @click="${this._handleClose}"
              aria-label="${this._getCloseLabel()}"
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
