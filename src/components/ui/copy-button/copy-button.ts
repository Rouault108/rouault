import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../button/button';

/**
 * コピーボタン (Copy Button) コンポーネント
 * 
 * 「コピー」というアクションとその結果（成功・失敗）を自己完結して提供する機能特化型コンポーネントです。
 * プリミティブである ui-button variant="ghost" をラップして使用します。
 * 
 * @slot - デフォルトスロット（使用しません。内部でアイコンを管理します）
 * 
 * @property {string} value - クリップボードに書き込むテキスト
 * @property {string} label - **必須**。aria-label のベースとなるテキスト
 * 
 * @fires copy - コピー成功時
 * @fires copy-error - コピー失敗時
 * 
 * @cssprop --_copy-button-scale-pressed - アイコン専用の押下スケール（0.9）
 * @cssprop --_flash-color-success - 成功時のフラッシュ背景色
 * @cssprop --_flash-color-error - 失敗時のフラッシュ背景色
 * @cssprop --icon-base - アイコンサイズ
 * @cssprop --fg-muted - 待機状態のアイコン色
 * @cssprop --success - 成功状態のアイコン色
 * @cssprop --danger - エラー状態のアイコン色
 * @cssprop --bg-success-subtle - 成功時の背景色
 * @cssprop --bg-danger-subtle - エラー時の背景色
 * @cssprop --duration-fast - アニメーション速度
 * @cssprop --ease-out - イージング関数
 * @cssprop --control-min-touch - 最小タッチターゲットサイズ (44px)
 * 
 * @example
 * ```html
 * <ui-copy-button
 *   value="コピーするテキスト"
 *   label="コードをコピー"
 * ></ui-copy-button>
 * ```
 */
@customElement('ui-copy-button')
export class CopyButton extends LitElement {
  static override styles = css`
    :host {
      /* コンポーネントローカル変数 */
      --_copy-button-scale-pressed: 0.9;
      
      /* フラッシュ用のローカルカラー変数 */
      --_flash-color-success: var(--bg-success-subtle, oklch(from var(--success, oklch(60% 0.15 160)) l c h / 0.15));
      --_flash-color-error: var(--bg-danger-subtle, oklch(from var(--danger, oklch(55% 0.2 28)) l c h / 0.1));

      /* Hit Area Requirement: 視覚サイズ 24px / ヒット領域 44px */
      position: relative;
      display: inline-flex;
      
      /* フラッシュ効果の範囲を制限 */
      width: fit-content;
      border-radius: var(--radius-sm, 4px);
    }

    /* Hit Area Extension: 視覚サイズより大きなタッチ領域を確保 */
    :host::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: var(--control-min-touch, 44px);
      height: var(--control-min-touch, 44px);
      /* クリックイベントを下のボタンに通過させる */
      pointer-events: none;
    }

    /* Layout Stability: アイコン切り替え時のガタつき防止 */
    .copy-button-icon-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
    }

    iconify-icon {
      font-size: var(--icon-base, 16px);
      transition: 
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Icon Color States */
    :host([state="idle"]) iconify-icon {
      color: var(--fg-muted, oklch(48% 0.01 250));
    }

    :host([state="success"]) iconify-icon {
      color: var(--success, oklch(60% 0.15 160));
    }

    :host([state="error"]) iconify-icon {
      color: var(--danger, oklch(55% 0.2 28));
    }

    /* Icon Swap with Snappy Scale */
    ui-button:active iconify-icon {
      transform: scale(var(--_copy-button-scale-pressed));
    }

    /* Flash Effect Keyframes */
    @keyframes flash-copy-success {
      0% { background-color: var(--_flash-color-success); }
      100% { background-color: transparent; }
    }

    @keyframes flash-copy-error {
      0% { background-color: var(--_flash-color-error); }
      100% { background-color: transparent; }
    }

    /* Flash Animation on State Change (仕様: :host に適用) */
    :host([state="success"]) {
      animation: flash-copy-success var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host([state="error"]) {
      animation: flash-copy-error var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Screen Reader Only Status */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border-width: 0;
    }

    /* Motion Reduction: アニメーションを即時完了 */
    @media (prefers-reduced-motion: reduce) {
      iconify-icon {
        transition-duration: 0.01ms;
      }

      :host([state="success"]),
      :host([state="error"]) {
        animation-duration: 0.01ms;
      }
    }

    /* Forced Colors Mode */
    @media (forced-colors: active) {
      :host {
        border: var(--border-width, 1px) solid CanvasText;
      }

      :host([state="success"]) iconify-icon {
        color: Highlight;
      }

      :host([state="error"]) iconify-icon {
        color: CanvasText;
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }
    }

    /* Print Styles: コピーボタンは印刷時に非表示 */
    @media print {
      :host {
        display: none;
      }
    }
  `;

  /**
   * クリップボードに書き込むテキスト
   * @type {string}
   * @default ''
   */
  @property({ type: String })
  value = '';

  /**
   * aria-label のベースとなるテキスト（必須）
   * @type {string}
   * @default ''
   */
  @property({ type: String })
  label = '';

  /**
   * 内部状態
   * @type {'idle' | 'success' | 'error'}
   * @internal
   */
  @state()
  private _internalState: 'idle' | 'success' | 'error' = 'idle';

  /**
   * タイマーID（状態リセット用）
   * @internal
   */
  private _stateTimer: number | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    // 初期状態を設定（CSS セレクタで使用するため）
    this.setAttribute('state', 'idle');

    // label が必須であることを警告
    if (!this.label) {
      console.error(
        '[ui-copy-button]: label 属性は必須です。アクセシビリティのために代替テキストを提供してください。',
        this
      );
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearStateTimer();
  }

  /**
   * 状態タイマーをクリア
   * @private
   */
  private _clearStateTimer(): void {
    if (this._stateTimer !== null) {
      window.clearTimeout(this._stateTimer);
      this._stateTimer = null;
    }
  }

  /**
   * 現在の状態に基づいた aria-label を取得
   * @private
   */
  private get _ariaLabel(): string {
    switch (this._internalState) {
      case 'success':
        return `${this.label} - コピーしました`;
      case 'error':
        return `${this.label} - コピー失敗`;
      default:
        return this.label;
    }
  }

  /**
   * 現在の状態に基づいたアイコンを取得
   * @private
   */
  private get _icon(): string {
    switch (this._internalState) {
      case 'success':
        return 'lucide:check';
      case 'error':
        return 'lucide:alert-triangle';
      default:
        return 'lucide:copy';
    }
  }

  /**
   * スクリーンリーダー用のステータステキストを取得
   * @private
   */
  private get _statusText(): string {
    switch (this._internalState) {
      case 'success':
        return 'コピーしました';
      case 'error':
        return 'コピー失敗';
      default:
        return '';
    }
  }

  /**
   * コピーボタンクリック時の処理
   * @private
   */
  private async _handleCopy(): Promise<void> {
    // 既存のタイマーをクリア
    this._clearStateTimer();

    try {
      await navigator.clipboard.writeText(this.value);
      
      // Success 状態に遷移
      this._internalState = 'success';
      this.setAttribute('state', 'success');
      
      // 成功イベントを発火
      this.dispatchEvent(new CustomEvent('copy', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }));

      // 2000ms 後に Idle に戻す
      this._stateTimer = window.setTimeout(() => {
        this._internalState = 'idle';
        this.setAttribute('state', 'idle');
        this.requestUpdate();
      }, 2000);

    } catch (error) {
      // Error 状態に遷移
      this._internalState = 'error';
      this.setAttribute('state', 'error');
      
      // エラーイベントを発火
      this.dispatchEvent(new CustomEvent('copy-error', {
        detail: { error, value: this.value },
        bubbles: true,
        composed: true,
      }));

      // 3000ms 後に Idle に戻す（エラーは予期せぬ結果のため長め）
      this._stateTimer = window.setTimeout(() => {
        this._internalState = 'idle';
        this.setAttribute('state', 'idle');
        this.requestUpdate();
      }, 3000);
    }
  }

  override render() {
    return html`
      <ui-button
        variant="ghost"
        size="sm"
        icon-only
        aria-label="${this._ariaLabel}"
        @click="${this._handleCopy}"
      >
        <span class="copy-button-icon-container">
          <iconify-icon icon="${this._icon}"></iconify-icon>
        </span>
      </ui-button>
      
      <!-- Self-Contained Feedback: スクリーンリーダー用の状態通知 -->
      <div class="sr-only" role="status" aria-live="polite">
        ${this._statusText}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-copy-button': CopyButton;
  }
}
