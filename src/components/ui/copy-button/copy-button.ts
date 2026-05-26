import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../button/button';
import { renderStaticIconTemplate } from '../icon/static-icon-template.js';
import type { IconName } from '../../../../shared/icons/icon-paths.js';

type CopyButtonState = 'idle' | 'success' | 'error';
type CopyButtonSize = 'sm' | 'md';
type LiveRegionMode = 'idle' | 'success' | 'error';

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
 * @property {'sm' | 'md'} size - ボタンサイズ
 *
 * @fires copy - コピー成功時
 * @fires copy-error - コピー失敗時
 *
 * @cssprop --_copy-button-scale-pressed - アイコン専用の押下スケール（0.9）
 * @cssprop --_flash-color-success - 成功時のフラッシュ背景色
 * @cssprop --_flash-color-error - 失敗時のフラッシュ背景色
 * @cssprop --_copy-button-icon-size - 内部アイコンサイズ
 * @cssprop --fg-muted - 待機状態のアイコン色
 * @cssprop --fg-success - 成功状態のアイコン色
 * @cssprop --fg-danger - エラー状態のアイコン色
 * @cssprop --bg-success-subtle - 成功時の背景色
 * @cssprop --bg-danger-subtle - エラー時の背景色
 * @cssprop --duration-fast - アニメーション速度
 * @cssprop --ease-out - イージング関数
 * @cssprop --timeout-async-threshold - 遅延時にローディング表示へ切り替える閾値（500ms）
 * @cssprop --control-min-touch - 最小タッチターゲットサイズ (24px)
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
      --_copy-button-icon-size: var(--icon-base, 16px);

      /* フラッシュ用のローカルカラー変数 */
      --_flash-color-success: var(
        --bg-success-subtle,
        oklch(from var(--fg-success, var(--success, oklch(60% 0.15 160))) l c h / 0.15)
      );
      --_flash-color-error: var(
        --bg-danger-subtle,
        oklch(from var(--fg-danger, var(--danger, oklch(55% 0.2 28))) l c h / 0.1)
      );

      /* Hit Area Requirement: 視覚サイズ 24px / ヒット領域 44px */
      position: relative;
      display: inline-flex;

      /* フラッシュ効果の範囲を制限 */
      width: fit-content;
      border-radius: var(--radius-sm, 4px);
    }

    :host([size='md']) {
      --_copy-button-icon-size: var(--icon-base, 16px);
    }

    :host([size='sm']) {
      --_copy-button-icon-size: var(--icon-base, 16px);
    }

    ui-button {
      position: relative;
      /* ui-button 側の 24px ヒットエリア実装へトークンを受け渡す */
      --control-min-touch: var(--control-min-touch, 24px);
    }

    /* Layout Stability: アイコン切り替え時のガタつき防止 */
    .copy-button-icon-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--_copy-button-icon-size);
      height: var(--_copy-button-icon-size);
    }

    [data-icon] {
      font-size: var(--_copy-button-icon-size);
      transition:
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Icon Color States */
    :host([state='idle']) [data-icon] {
      color: var(--fg-muted, oklch(48% 0 0));
    }

    :host([state='success']) [data-icon] {
      color: var(--fg-success, var(--success, oklch(60% 0.15 160)));
    }

    :host([state='error']) [data-icon] {
      color: var(--fg-danger, var(--danger, oklch(55% 0.2 28)));
    }

    /* Icon Swap with Snappy Scale */
    ui-button:active [data-icon] {
      transform: scale(var(--_copy-button-scale-pressed));
    }

    /* Flash Effect Keyframes */
    @keyframes flash-copy-success {
      0% {
        background-color: var(--_flash-color-success);
      }

      100% {
        background-color: transparent;
      }
    }

    @keyframes flash-copy-error {
      0% {
        background-color: var(--_flash-color-error);
      }

      100% {
        background-color: transparent;
      }
    }

    /* Flash Animation on State Change (仕様: :host に適用) */
    :host([state='success']) {
      animation: flash-copy-success var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host([state='error']) {
      animation: flash-copy-error var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
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
      [data-icon] {
        transition-duration: 0.01ms;
      }

      :host([state='success']),
      :host([state='error']) {
        animation-duration: 0.01ms;
      }
    }

    /* Forced Colors Mode */
    @media (forced-colors: active) {
      :host {
        border: var(--border-width, 1px) solid CanvasText;
      }

      :host([state='success']) [data-icon] {
        color: Highlight;
      }

      :host([state='error']) {
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }

      :host([state='error']) [data-icon] {
        color: CanvasText;
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
   * ボタンサイズ
   * @type {'sm' | 'md'}
   * @default 'sm'
   */
  @property({ type: String, reflect: true })
  size: CopyButtonSize = 'sm';

  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * 内部状態
   * @type {'idle' | 'success' | 'error'}
   * @internal
   */
  @state()
  private _internalState: CopyButtonState = 'idle';

  /**
   * 状態タイマーID（状態リセット用）
   * @internal
   */
  private _stateTimer: number | null = null;

  /**
   * ローディング表示タイマーID
   * @internal
   */
  private _loadingTimer: number | null = null;

  /**
   * 進行中コピーの世代。外部 reset で古い非同期完了を無効化する
   */
  private _copyRequestVersion = 0;

  /**
   * API応答待ち中であるか
   * @internal
   */
  @state()
  private _isCopyingVisible = false;

  /**
   * スクリーンリーダー通知の状態
   * @internal
   */
  @state()
  private _liveRegionMode: LiveRegionMode = 'idle';

  private readonly _isDevelopment: boolean;

  constructor() {
    super();
    this._isDevelopment =
      (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ?? true;
  }

  override connectedCallback(): void {
    super.connectedCallback();

    // 初期状態を設定（CSS セレクタで使用するため）
    this.setAttribute('state', 'idle');

    this._warnMissingLabel();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('label')) {
      this._warnMissingLabel();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearStateTimer();
    this._clearLoadingTimer();
  }

  /**
   * label 必須契約の検証（開発時）
   */
  private _warnMissingLabel(): void {
    if (!this._isDevelopment) {
      return;
    }

    if (!this.label.trim()) {
      console.error(
        '[ui-copy-button]: label 属性は必須です。アクセシビリティのために代替テキストを提供してください。',
        this,
      );
    }
  }

  /**
   * aria-label のベースラベル（欠落時は安全な既定値へフォールバック）
   */
  private get _baseLabel(): string {
    return this.label.trim() || 'コピー';
  }

  /**
   * 状態タイマーをクリア
   */
  private _clearStateTimer(): void {
    if (this._stateTimer !== null) {
      window.clearTimeout(this._stateTimer);
      this._stateTimer = null;
    }
  }

  /**
   * ローディングタイマーをクリア
   */
  private _clearLoadingTimer(): void {
    if (this._loadingTimer !== null) {
      window.clearTimeout(this._loadingTimer);
      this._loadingTimer = null;
    }
  }

  /**
   * 外部コンテキスト切り替え時に状態表示を初期化
   */
  resetState(): void {
    this._copyRequestVersion += 1;
    this._clearStateTimer();
    this._clearLoadingTimer();
    this._isCopyingVisible = false;
    this._internalState = 'idle';
    this._liveRegionMode = 'idle';
    this.setAttribute('state', 'idle');
  }

  /**
   * 状態遷移（同一状態再適用時の再通知を保証）
   */
  private async _transitionState(next: CopyButtonState): Promise<void> {
    if (this._internalState === next && next !== 'idle') {
      this._internalState = 'idle';
      this.setAttribute('state', 'idle');
      this._liveRegionMode = 'idle';
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    }

    this._internalState = next;
    this.setAttribute('state', next);

    if (next === 'success' || next === 'error') {
      this._liveRegionMode = next;
    } else {
      this._liveRegionMode = 'idle';
    }
  }

  /**
   * 現在の状態に基づいた aria-label を取得
   */
  private get _ariaLabel(): string {
    if (this._isCopyingVisible) {
      return `${this._baseLabel} - コピー中`;
    }

    switch (this._internalState) {
      case 'success':
        return `${this._baseLabel} - コピーしました`;
      case 'error':
        return `${this._baseLabel} - コピー失敗`;
      default:
        return this._baseLabel;
    }
  }

  /**
   * 現在の状態に基づいたアイコンを取得
   */
  private get _icon(): IconName {
    if (this._isCopyingVisible) {
      return 'loader-circle';
    }

    switch (this._internalState) {
      case 'success':
        return 'check';
      case 'error':
        return 'alert-triangle';
      default:
        return 'copy';
    }
  }

  /**
   * Live Region 用のテキスト
   */
  private get _liveRegionText(): string {
    switch (this._liveRegionMode) {
      case 'success':
        return 'コピーしました';
      case 'error':
        return 'コピー失敗';
      default:
        return '';
    }
  }

  /**
   * Live Region の role
   */
  private get _liveRegionRole(): 'status' | 'alert' {
    return this._liveRegionMode === 'error' ? 'alert' : 'status';
  }

  /**
   * Live Region の aria-live
   */
  private get _liveRegionAriaLive(): 'polite' | 'assertive' {
    return this._liveRegionMode === 'error' ? 'assertive' : 'polite';
  }

  /**
   * コピーボタンクリック時の処理
   */
  private _handleCopy = async (): Promise<void> => {
    if (this.disabled) {
      return;
    }

    const requestVersion = this._copyRequestVersion + 1;
    this._copyRequestVersion = requestVersion;

    // 既存タイマーをクリア
    this._clearStateTimer();
    this._clearLoadingTimer();
    this._isCopyingVisible = false;

    let requestSettled = false;

    // 仕様: API遅延が閾値を超える場合のみローディングを可視化
    const thresholdValue = Number.parseInt(
      getComputedStyle(this).getPropertyValue('--timeout-async-threshold').trim() || '500',
      10,
    );
    const thresholdMs = Number.isFinite(thresholdValue) ? thresholdValue : 500;

    this._loadingTimer = window.setTimeout(() => {
      if (!requestSettled && this._copyRequestVersion === requestVersion) {
        this._isCopyingVisible = true;
      }
    }, thresholdMs);

    try {
      await navigator.clipboard.writeText(this.value);
      if (this._copyRequestVersion !== requestVersion) {
        return;
      }
      requestSettled = true;
      this._clearLoadingTimer();
      this._isCopyingVisible = false;

      await this._transitionState('success');

      // 成功イベントを発火
      this.dispatchEvent(
        new CustomEvent('copy', {
          detail: { value: this.value },
          bubbles: true,
          composed: true,
        }),
      );

      // 2000ms 後に Idle に戻す
      this._stateTimer = window.setTimeout(() => {
        this._internalState = 'idle';
        this.setAttribute('state', 'idle');
        this._liveRegionMode = 'idle';
      }, 2000);
    } catch (error: unknown) {
      if (this._copyRequestVersion !== requestVersion) {
        return;
      }
      requestSettled = true;
      this._clearLoadingTimer();
      this._isCopyingVisible = false;

      await this._transitionState('error');

      // エラーイベントを発火
      this.dispatchEvent(
        new CustomEvent('copy-error', {
          detail: { error, value: this.value },
          bubbles: true,
          composed: true,
        }),
      );

      // 3000ms 後に Idle に戻す（エラーは予期せぬ結果のため長め）
      this._stateTimer = window.setTimeout(() => {
        this._internalState = 'idle';
        this.setAttribute('state', 'idle');
        this._liveRegionMode = 'idle';
      }, 3000);
    }
  };

  override render() {
    return html`
      <ui-button
        variant="ghost"
        size="${this.size}"
        icon-only
        ?disabled=${this.disabled}
        aria-label="${this._ariaLabel}"
        @click="${this._handleCopy}"
      >
        <span class="copy-button-icon-container">
          ${renderStaticIconTemplate(this._icon)}
        </span>
      </ui-button>

      <!-- Self-Contained Feedback: スクリーンリーダー用の状態通知 -->
      <div
        class="sr-only"
        role="${this._liveRegionRole}"
        aria-live="${this._liveRegionAriaLive}"
        aria-atomic="true"
      >
        ${this._liveRegionText}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-copy-button': CopyButton;
  }
}
