import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonType = 'button' | 'submit' | 'reset';

/** @deprecated size="lg" は非推奨です。デザインレビュー承認済みケースでのみ使用してください。 */
export const BUTTON_SIZE_LG_DEPRECATED = 'lg' as const;

interface IconOnlyA11yRequired {
  iconOnly: true;
  ariaLabel: string;
}

interface IconOnlyA11yOptional {
  iconOnly?: false;
  ariaLabel?: string | null;
}

export type ButtonA11yContract = IconOnlyA11yRequired | IconOnlyA11yOptional;

export const defineButtonA11yContract = <T extends ButtonA11yContract>(contract: T): T => contract;

/**
 * ボタン (Button) コンポーネント
 *
 * アクションの優先度を視覚的な「重さ（Weight）」で制御します。
 * 「静謐さ」を保つため、画面内に Primary（塗りつぶし）ボタンは原則1つのみとし、
 * 残りは Secondary または Ghost を使用することで視覚的ノイズを極限まで抑制します。
 *
 * @slot - ボタンのラベルテキストまたはコンテンツ（アイコンを含む）
 * @slot spinner - ローディングスピナー（カスタマイズ時に使用）
 *
 * @property {string} variant - 視覚的強度を決定するバリアント
 * @property {string} size - ボタンのサイズ
 * @property {boolean} iconOnly - アイコンのみのボタン（aria-label必須）
 * @property {boolean} loading - 処理中状態
 * @property {boolean} disabled - 不活性状態
 * @property {string} type - フォーム内での挙動制御
 * @property {string} form - フォームオーナーの明示
 *
 * @fires click - ボタンがクリックされた時
 *
 * @cssprop --primary - プライマリカラー
 * @cssprop --primary-hover - プライマリカラーのホバー状態
 * @cssprop --on-primary - プライマリカラー上のテキスト色
 * @cssprop --bg-surface-2 - セカンダリ背景色
 * @cssprop --bg-fill-muted - ホバー時の背景色
 * @cssprop --bg-hover - ゴーストホバー時の背景色
 * @cssprop --bg-danger-subtle - Danger背景色
 * @cssprop --border-default - デフォルト境界線色
 * @cssprop --border-danger - Danger境界線色
 * @cssprop --fg-default - デフォルトテキスト色
 * @cssprop --fg-muted - 控えめなテキスト色
 * @cssprop --danger - Dangerカラー
 * @cssprop --on-danger - Dangerカラー上のテキスト色
 * @cssprop --elevation-sm - 小さめのセマンティックシャドウ
 * @cssprop --elevation-md - 中程度のセマンティックシャドウ
 * @cssprop --radius-md - 中程度の角丸
 * @cssprop --font-sans - サンセリフフォントファミリー
 * @cssprop --font-medium - 中程度のフォントウェイト
 * @cssprop --control-height-sm - 小サイズの高さ
 * @cssprop --control-height-md - 中サイズの高さ
 * @cssprop --control-height-lg - 大サイズの高さ
 * @cssprop --space-2 - スペーシング（8px）
 * @cssprop --space-3 - スペーシング（12px）
 * @cssprop --space-4 - スペーシング（16px）
 * @cssprop --icon-sm - 小アイコンサイズ
 * @cssprop --icon-base - 標準アイコンサイズ
 * @cssprop --icon-md - 中アイコンサイズ
 * @cssprop --duration-fast - 速い遷移時間
 * @cssprop --ease-out - イージング関数
 * @cssprop --scale-pressed - 押下時のスケール
 * @cssprop --focus-ring-width - フォーカスリング幅
 * @cssprop --focus-ring-color - フォーカスリング色
 * @cssprop --focus-ring-offset - フォーカスリングオフセット
 * @cssprop --animation-focus - Adaptive Focusアニメーション
 *
 * @csspart button - 内部のbutton要素
 * @csspart label - ラベルのスパン要素
 * @csspart spinner - スピナーのコンテナ
 *
 * @example
 * ```html
 * <!-- デフォルト（Secondary） -->
 * <ui-button>保存</ui-button>
 *
 * <!-- プライマリ -->
 * <ui-button variant="primary">送信</ui-button>
 *
 * <!-- フォーム送信 -->
 * <ui-button type="submit" variant="primary">保存</ui-button>
 *
 * <!-- アイコンのみ -->
 * <ui-button icon-only aria-label="設定を開く">
 *   <iconify-icon icon="lucide:settings"></iconify-icon>
 * </ui-button>
 *
 * <!-- ローディング状態 -->
 * <ui-button loading>保存中...</ui-button>
 * ```
 */
@customElement('ui-button')
export class Button extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      position: relative;
    }

    button {
      /* Layout */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;

      /* Border & Radius */
      border-radius: var(--radius-md, 6px);
      border: none;

      /* Typography */
      font-family: var(--font-sans);
      font-weight: var(--font-medium, 500);
      font-size: inherit;
      font-feature-settings: 'palt';
      letter-spacing: 0.02em;
      line-height: 1;

      /* Interaction */
      cursor: pointer;
      user-select: none;

      /* Transition: 明示的なプロパティリストを使用 */
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        box-shadow var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Active State: 押し込みのタクタイルシグナル */
    button:active:not(:disabled) {
      transform: scale(var(--scale-pressed, 0.96));
      box-shadow: none;
    }

    /* Focus Indicator: Adaptive Focus */
    button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    /* Disabled State */
    button:disabled {
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
      pointer-events: none;
    }

    /* --- Size Variants --- */

    /* Small */
    .size-sm {
      --button-icon-size: var(--icon-sm, 14px);
      height: var(--control-height-sm, 28px);
      padding: 0 var(--space-2, 8px);
      font-size: var(--text-sm, 13px);
      gap: var(--space-1, 4px);
    }

    .size-sm.icon-only {
      width: var(--control-height-sm, 28px);
      padding: 0;
    }

    /* Medium (Default) */
    .size-md {
      --button-icon-size: var(--icon-base, 16px);
      height: var(--control-height-md, 32px);
      padding: 0 var(--space-3, 12px);
      font-size: var(--text-base, 14px);
      gap: var(--space-2, 8px);
    }

    .size-md.icon-only {
      width: var(--control-height-md, 32px);
      padding: 0;
    }

    /* Large (Deprecated) */
    .size-lg {
      --button-icon-size: var(--icon-md, 20px);
      height: var(--control-height-lg, 40px);
      padding: 0 var(--space-4, 16px);
      font-size: var(--text-base, 14px);
      gap: var(--space-2, 8px);
    }

    .size-lg.icon-only {
      width: var(--control-height-lg, 40px);
      padding: 0;
    }

    /* --- Variant Styles --- */

    /* Primary */
    .variant-primary {
      background: var(--primary, oklch(60% 0.15 250));
      color: var(--on-primary, oklch(100% 0 0));
      box-shadow:
        inset 0 1px 0 0 oklch(100% 0 0 / 0.15),
        var(--elevation-md, 0 2px 8px oklch(0% 0 0 / 0.12));
    }

    .variant-primary:hover:not(:disabled) {
      background: var(--primary-hover, oklch(55% 0.15 250));
    }

    /* Secondary */
    .variant-secondary {
      background: var(--bg-surface-2, oklch(97% 0 0));
      color: var(--fg-default, oklch(20% 0.01 250));
      border: var(--border-width, 1px) solid var(--border-default, oklch(90% 0.01 250 / 0.12));
      box-shadow: var(--elevation-sm, 0 1px 2px oklch(0% 0 0 / 0.05));
    }

    .variant-secondary:hover:not(:disabled) {
      background: var(--bg-fill-muted, oklch(95% 0 0));
    }

    /* Dark Mode: Edge Highlight for Secondary */
    @media (prefers-color-scheme: dark) {
      .variant-secondary {
        box-shadow:
          inset 0 1px 0 0 oklch(100% 0 0 / 0.1),
          var(--elevation-sm, 0 1px 2px oklch(0% 0 0 / 0.05));
      }
    }

    /* Outline */
    .variant-outline {
      background: transparent;
      color: var(--fg-default, oklch(20% 0.01 250));
      border: var(--border-width, 1px) solid var(--border-default, oklch(90% 0.01 250 / 0.12));
    }

    .variant-outline:hover:not(:disabled) {
      border-color: var(--fg-muted, oklch(48% 0.01 250));
    }

    /* Ghost */
    .variant-ghost {
      background: transparent;
      color: var(--fg-muted, oklch(48% 0.01 250));
    }

    .variant-ghost:hover:not(:disabled) {
      background: var(--bg-hover, oklch(0% 0 0 / 0.05));
    }

    /* Danger */
    .variant-danger {
      background: var(--bg-danger-subtle, oklch(from var(--danger, oklch(55% 0.2 28)) l c h / 0.1));
      color: var(--danger, oklch(55% 0.2 28));
      border: var(--border-width, 1px) solid
        var(--border-danger, oklch(from var(--danger, oklch(55% 0.2 28)) l c h / 0.3));
    }

    .variant-danger:hover:not(:disabled) {
      background: var(--danger, oklch(55% 0.2 28));
      color: var(--on-danger, oklch(100% 0 0));
    }

    /* --- Loading State --- */

    /* ラベルを非表示にしつつ幅を維持 */
    .label {
      display: inline-flex;
      align-items: center;
      gap: inherit;
    }

    .content-slot::slotted(iconify-icon),
    .content-slot::slotted(svg) {
      inline-size: var(--button-icon-size);
      block-size: var(--button-icon-size);
      font-size: var(--button-icon-size);
      flex-shrink: 0;
    }

    button[aria-busy='true'] .label {
      visibility: hidden;
    }

    /* スピナーをオーバーレイ表示 */
    .spinner {
      position: absolute;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
    }

    button[aria-busy='true'] .spinner {
      display: flex;
    }

    /* デフォルトスピナー（シンプルなアニメーション） */
    .spinner-default {
      width: 1em;
      height: 1em;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Motion Reduction: スピナーアニメーションを停止 */
    @media (prefers-reduced-motion: reduce) {
      .spinner-default {
        animation: none;
        border-right-color: currentColor;
      }

      button {
        transition-duration: 0.01ms;
      }
    }

    /* --- Print Styles --- */
    @media print {
      :host {
        display: none !important;
      }
    }

    /* --- Forced Colors Mode --- */

    @media (forced-colors: active) {
      button {
        border: var(--border-width, 1px) solid CanvasText;
        box-shadow: none;
      }

      .variant-primary {
        background: Highlight;
        color: HighlightText;
        border-color: Highlight;
      }

      .variant-danger {
        background: Canvas;
        color: CanvasText;
        border-color: CanvasText;
      }

      button:focus-visible {
        outline: 3px solid CanvasText;
        box-shadow: none;
      }

      button[aria-selected='true'],
      button.active {
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }
    }

    /* --- Touch Target (最低44×44px) --- */

    /* ボタンが小さい場合に疑似要素でタッチ領域を拡張 */
    button::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width: 44px;
      min-height: 44px;
      pointer-events: none;
    }
  `;

  // Form Association を有効化
  static formAssociated = true;

  /**
   * 視覚的強度を決定するバリアント
   * @type {'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'}
   * @default 'secondary'
   */
  @property({ type: String, reflect: true })
  variant: ButtonVariant = 'secondary';

  /**
   * ボタンのサイズ
   * @type {'sm' | 'md' | 'lg'}
   * @default 'md'
   */
  @property({ type: String, reflect: true })
  size: ButtonSize = 'md';

  /**
   * アイコンのみのボタン（正方形を強制）
   * @default false
   *
   * **重要**: icon-only を true にする場合は、aria-label を必ず設定してください。
   */
  @property({ type: Boolean, attribute: 'icon-only', reflect: true })
  iconOnly = false;

  /**
   * アイコンのみボタンの代替テキスト
   * @type {string | undefined}
   */
  @property({ type: String, attribute: 'aria-label', reflect: true })
  override ariaLabel: string | null = null;

  /**
   * 処理中状態
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  loading = false;

  /**
   * 不活性状態
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * フォーム内での挙動制御
   * @type {'button' | 'submit' | 'reset'}
   * @default 'button'
   *
   * **注意**: ネイティブ <button> と異なり、デフォルトは 'button' です。
   * フォーム送信に使用する場合は type="submit" を明示してください。
   */
  @property({ type: String, reflect: true })
  type: ButtonType = 'button';

  /**
   * フォームオーナーの明示
   * @type {string | undefined}
   */
  @property({ type: String, reflect: true })
  form?: string;

  private _internals: ElementInternals;
  private readonly _isDevelopment: boolean;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._isDevelopment = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ?? true;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._validateAccessibilityContract();
    this._warnDeprecatedSizeUsage();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('iconOnly') || changedProperties.has('ariaLabel')) {
      this._validateAccessibilityContract();
    }
    if (changedProperties.has('size')) {
      this._warnDeprecatedSizeUsage();
    }
  }

  /**
   * 内部ボタンのクリックハンドラ
   * Shadow DOM 境界を越えてフォーム送信/リセットを行う
   */
  private _handleClick = (e: Event): void => {
    // disabled または loading 状態の場合は何もしない
    if (this.disabled || this.loading) {
      e.preventDefault();
      return;
    }

    // type="submit" の場合、フォームオーナーに送信をリクエスト
    if (this.type === 'submit' && this._internals.form) {
      e.preventDefault();
      this._internals.form.requestSubmit();
    }

    // type="reset" の場合、フォームオーナーをリセット
    if (this.type === 'reset' && this._internals.form) {
      e.preventDefault();
      this._internals.form.reset();
    }
  }

  /**
   * icon-only と aria-label の契約を開発時に検証
   */
  private _validateAccessibilityContract(): void {
    if (!this._isDevelopment) {
      return;
    }

    if (this.iconOnly && !this.ariaLabel) {
      console.error(
        '[ui-button]: icon-only="true" の場合、aria-label は必須です。アクセシビリティのために代替テキストを提供してください。',
        this,
      );
    }
  }

  /**
   * 非推奨サイズの使用を開発時に警告
   */
  private _warnDeprecatedSizeUsage(): void {
    if (!this._isDevelopment) {
      return;
    }

    if (this.size === 'lg') {
      console.warn(
        '[ui-button]: size="lg" は非推奨です。デザインレビューなしでの使用を禁止します。md サイズに variant="primary" を組み合わせることを検討してください。',
        this,
      );
    }
  }

  override render() {
    const classes = {
      [`variant-${this.variant}`]: true,
      [`size-${this.size}`]: true,
      'icon-only': this.iconOnly,
    };

    return html`
      <button
        part="button"
        type="${this.type}"
        form="${ifDefined(this.form)}"
        ?disabled="${this.disabled || this.loading}"
        aria-busy="${ifDefined(this.loading ? 'true' : undefined)}"
        aria-label="${ifDefined(this.ariaLabel ?? undefined)}"
        class="${classMap(classes)}"
        @click="${this._handleClick}"
      >
        <span class="label" part="label">
          <slot class="content-slot"></slot>
        </span>

        ${this.loading
        ? html`
              <span class="spinner" part="spinner">
                <slot name="spinner">
                  <span class="spinner-default"></span>
                </slot>
              </span>
            `
        : ''}
      </button>
    `;
  }

  /**
   * ボタンをプログラム的にクリック
   */
  override click() {
    const button = this.shadowRoot?.querySelector('button');
    button?.click();
  }

  /**
   * ボタンにフォーカスを当てる
   */
  override focus(options?: FocusOptions) {
    const button = this.shadowRoot?.querySelector('button');
    button?.focus(options);
  }

  /**
   * ボタンからフォーカスを外す
   */
  override blur() {
    const button = this.shadowRoot?.querySelector('button');
    button?.blur();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-button': Button;
  }
}
