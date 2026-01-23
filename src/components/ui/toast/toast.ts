import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * ui-toast - モダンなトースト通知コンポーネント
 * 
 * @fires toast-dismiss - トーストが閉じられたときに発火
 * 
 * @slot title - トーストのタイトル
 * @slot - トーストのメインコンテンツ
 */
@customElement('ui-toast')
export class UiToast extends LitElement {
  // アニメーション時間（CSSのduration-normalと同期）
  private static readonly ANIMATION_DURATION = 200;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, sans-serif);
      margin-bottom: var(--space-2, 0.5rem);
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3, 0.75rem);
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      background: var(--color-background, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: var(--radius-lg, 0.5rem);
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.05),
        0 10px 15px -3px rgba(0, 0, 0, 0.05),
        0 0 0 1px rgba(0, 0, 0, 0.02); 
      min-width: 300px;
      max-width: 420px;
      position: relative;
      overflow: hidden;
      
      /* アニメーション */
      animation: toast-slide-in var(--duration-normal, 200ms) var(--ease-out, ease-out);
      opacity: 1;
      transform: translateX(0) scale(1);
      transition: 
        opacity var(--duration-normal, 200ms) var(--ease-out, ease-out),
        transform var(--duration-normal, 200ms) var(--ease-out, ease-out);
    }

    :host([data-dismissing]) .toast {
      animation: toast-slide-out var(--duration-normal, 200ms) var(--ease-in, ease-in);
      opacity: 0;
      transform: scale(0.95);
    }

    @keyframes toast-slide-in {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes toast-slide-out {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
    }

    /* アイコンコンテナ */
    .icon {
      flex-shrink: 0;
      width: var(--icon-lg, 24px);
      height: var(--icon-lg, 24px);
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-2xl, 1rem);
      padding: var(--space-1, 0.25rem);
      background: var(--toast-icon-bg, transparent);
      color: var(--toast-icon-color-light);
    }

    .icon svg,
    .icon iconify-icon {
      width: 100%;
      height: 100%;
    }

    /* コンテンツエリア */
    .content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 0.25rem);
    }

    .title {
      font-size: var(--text-base, 0.875rem);
      font-weight: var(--font-semibold, 600);
      color: var(--color-foreground, #111827);
      line-height: 1.25;
      letter-spacing: -0.01em;
    }

    .message {
      font-size: var(--text-sm, 0.8125rem);
      color: var(--color-foreground-muted, #6b7280);
      line-height: 1.4;
    }

    .title:empty,
    .message:empty {
      display: none;
    }

    /* クローズボタン */
    .close-button {
      flex-shrink: 0;
      margin-top: -6px;
      margin-right: -6px;
      opacity: 0;
      transition: opacity var(--duration-normal, 200ms) var(--ease-out, ease-out);
    }

    .toast:hover .close-button {
      opacity: 1;
    }

    /* モバイルなどのタッチデバイスでは常時表示 */
    @media (hover: none) {
      .close-button {
        opacity: 1;
      }
    }

    /* バリアント用のCSS変数定義 */
    :host([variant="info"]) {
      --toast-icon-color-light: var(--color-info, hsl(217, 91%, 60%));
      --toast-icon-color-dark: hsl(217, 100%, 75%);
      --toast-icon-bg: hsla(217, 91%, 60%, 0.1);
      --toast-icon-bg-dark: hsla(217, 100%, 75%, 0.2);
    }

    :host([variant="success"]) {
      --toast-icon-color-light: var(--color-success, hsl(142, 71%, 45%));
      --toast-icon-color-dark: hsl(142, 70%, 65%);
      --toast-icon-bg: hsla(142, 71%, 45%, 0.1);
      --toast-icon-bg-dark: hsla(142, 70%, 65%, 0.2);
    }

    :host([variant="warning"]) {
      --toast-icon-color-light: var(--color-warning, hsl(48, 96%, 53%));
      --toast-icon-color-dark: hsl(48, 100%, 65%);
      --toast-icon-bg: hsla(48, 96%, 53%, 0.1);
      --toast-icon-bg-dark: hsla(48, 100%, 65%, 0.2);
    }

    :host([variant="error"]) {
      --toast-icon-color-light: var(--color-error, hsl(0, 84%, 60%));
      --toast-icon-color-dark: hsl(0, 100%, 80%);
      --toast-icon-bg: hsla(0, 84%, 60%, 0.1);
      --toast-icon-bg-dark: hsla(0, 100%, 80%, 0.2);
    }

    @media (prefers-color-scheme: dark) {
      .toast {
        background: var(--bg-surface-2, #1f1f22);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 
          0 4px 6px -1px rgba(0, 0, 0, 0.3),
          0 10px 15px -3px rgba(0, 0, 0, 0.3);
      }

      .icon {
        color: var(--toast-icon-color-dark);
        background: var(--toast-icon-bg-dark);
      }
    }

    :host-context([data-theme='dark']) .toast {
      background: var(--bg-surface-2, #1f1f22);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.3),
        0 10px 15px -3px rgba(0, 0, 0, 0.3);
    }

    :host-context([data-theme='dark']) .icon {
      color: var(--toast-icon-color-dark);
      background: var(--toast-icon-bg-dark);
    }

    @media (prefers-reduced-motion: reduce) {
      .toast {
        animation: none;
        transition: none;
      }

      .close-button {
        transition: none;
      }

      @keyframes toast-slide-in {
        from, to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes toast-slide-out {
        from, to {
          opacity: 0;
          transform: translateX(0);
        }
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'info' | 'success' | 'warning' | 'error' = 'info';

  @property({ type: Number })
  duration = 0;

  @property({ type: Boolean, reflect: true })
  dismissible = false;

  @property({ type: String })
  closeLabel = '閉じる';

  @state()
  private _hasTitle = false;

  @state()
  private _hasMessage = false;

  private _dismissTimer: number | null = null;

  override connectedCallback() {
    super.connectedCallback();
    
    if (this.duration > 0) {
      this._startDismissTimer();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._clearDismissTimer();
  }

  private _startDismissTimer() {
    this._clearDismissTimer();
    this._dismissTimer = window.setTimeout(() => {
      this._handleDismiss();
    }, this.duration);
  }

  private _clearDismissTimer() {
    if (this._dismissTimer !== null) {
      clearTimeout(this._dismissTimer);
      this._dismissTimer = null;
    }
  }

  private _handleDismiss() {
    // アニメーションのために dismissing 属性を設定
    this.setAttribute('data-dismissing', '');
    
    // イベントを発火
    this.dispatchEvent(
      new CustomEvent('toast-dismiss', {
        bubbles: true,
        composed: true,
      })
    );

    // アニメーション完了後に要素を削除
    setTimeout(() => {
      this.remove();
    }, UiToast.ANIMATION_DURATION);
  }

  private _onTitleSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasTitle = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private _onMessageSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasMessage = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private _getIcon() {
    switch (this.variant) {
      case 'success':
        return html`<iconify-icon icon="lucide:check-circle-2"></iconify-icon>`;
      case 'warning':
        return html`<iconify-icon icon="lucide:alert-triangle"></iconify-icon>`;
      case 'error':
        return html`<iconify-icon icon="lucide:x-circle"></iconify-icon>`;
      case 'info':
      default:
        return html`<iconify-icon icon="lucide:info"></iconify-icon>`;
    }
  }

  override render() {
    const role = this.variant === 'error' || this.variant === 'warning' ? 'alert' : 'status';
    const ariaLive = this.variant === 'error' || this.variant === 'warning' ? 'assertive' : 'polite';

    return html`
      <div class="toast" role="${role}" aria-live="${ariaLive}" aria-atomic="true">
        <div class="icon" aria-hidden="true">
          ${this._getIcon()}
        </div>
        
        <div class="content">
          <div class="title" ?hidden="${!this._hasTitle}">
            <slot name="title" @slotchange="${this._onTitleSlotChange}"></slot>
          </div>
          <div class="message" ?hidden="${!this._hasMessage}">
            <slot @slotchange="${this._onMessageSlotChange}"></slot>
          </div>
        </div>

        ${this.dismissible
          ? html`
              <div class="close-button">
                <ui-icon-button
                  @click="${this._handleDismiss}"
                  aria-label="${this.closeLabel}"
                  variant="ghost"
                  size="sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </ui-icon-button>
              </div>
            `
          : ''}
      </div>
    `;
  }
}

/**
 * ui-toast-container - トースト通知を配置するコンテナ
 * 
 * @slot - ui-toast コンポーネント
 */
@customElement('ui-toast-container')
export class UiToastContainer extends LitElement {
  @property({ type: String, reflect: true })
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';

  @property({ type: Boolean, reflect: true })
  absolute = false;

  static override styles = css`
    :host {
      position: fixed;
      z-index: var(--z-toast, 500);
      display: flex;
      flex-direction: column;
      pointer-events: none;
      max-width: 100%;
    }

    :host([absolute]) {
      position: absolute;
      z-index: 10; /* コンテナ内での表示なので控えめに */
    }

    ::slotted(*) {
      pointer-events: auto;
    }

    /* 位置: top-right (デフォルト) */
    :host,
    :host([position="top-right"]) {
      top: var(--space-4, 1rem);
      right: var(--space-4, 1rem);
      align-items: flex-end;
    }

    /* 位置: top-left */
    :host([position="top-left"]) {
      top: var(--space-4, 1rem);
      left: var(--space-4, 1rem);
      align-items: flex-start;
    }

    /* 位置: bottom-right */
    :host([position="bottom-right"]) {
      bottom: var(--space-4, 1rem);
      right: var(--space-4, 1rem);
      align-items: flex-end;
      flex-direction: column-reverse; /* 新しいものが下に出るように逆順 */
    }

    /* 位置: bottom-left */
    :host([position="bottom-left"]) {
      bottom: var(--space-4, 1rem);
      left: var(--space-4, 1rem);
      align-items: flex-start;
      flex-direction: column-reverse;
    }

    /* レスポンシブ対応 */
    @media (max-width: 640px) {
      :host {
        left: var(--space-2, 0.5rem);
        right: var(--space-2, 0.5rem);
        align-items: stretch;
      }
      
      /* absolute指定時はレスポンシブ挙動を無効化（親コンテナに依存するため） */
      :host([absolute]) {
        left: var(--space-4, 1rem);
        right: var(--space-4, 1rem);
        align-items: inherit;
      }

      ::slotted(*) {
        max-width: 100%;
        min-width: auto;
      }
    }
  `;

  override render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-toast': UiToast;
    'ui-toast-container': UiToastContainer;
  }
}
