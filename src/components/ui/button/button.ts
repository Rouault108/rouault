import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonType = 'button' | 'submit' | 'reset';
type ButtonPressedState = boolean | undefined;

const pressedAttributeConverter = {
  fromAttribute(value: string | null): ButtonPressedState {
    if (value === null) {
      return undefined;
    }

    return value !== 'false';
  },
  toAttribute(value: ButtonPressedState): string | null {
    if (value === undefined) {
      return null;
    }

    return value ? '' : 'false';
  },
};

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
 * @property {string} ariaLabel - iconOnly=true の場合に使用するアクセシブル名
 * @property {boolean | undefined} pressed - 外部制御のトグル押下状態（undefined / true / false）
 * @property {boolean} loading - 処理中状態
 * @property {boolean} disabled - 不活性状態
 * @property {string} type - フォーム内での挙動制御
 * @property {string} form - フォームオーナーの明示
 * @property {string} ariaExpanded - trigger 用の開閉状態
 * @property {string} ariaControls - trigger 用の関連要素 ID
 * @property {string} ariaHasPopup - trigger 用の popup 種別
 * @property {string} ariaDescribedBy - trigger 用の説明要素 ID
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
 *   <ui-icon name="settings"></ui-icon>
 * </ui-button>
 *
 * <!-- ローディング状態 -->
 * <ui-button loading>保存中...</ui-button>
 *
 * <!-- trigger として使用 -->
 * <ui-button
 *   variant="ghost"
 *   aria-expanded="false"
 *   aria-controls="menu-panel"
 *   aria-haspopup="menu"
 * >
 *   操作
 * </ui-button>
 * ```
 */
@customElement('ui-button')
export class Button extends LitElement {
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

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
      border-radius: var(--radius-md);
      border: none;

      /* Typography */
      font-family: var(--font-sans);
      font-weight: var(--font-medium);
      font-size: inherit;
      font-feature-settings: 'palt';
      letter-spacing: 0.02em;
      line-height: var(--line-height-tight);

      /* Interaction */
      cursor: pointer;
      user-select: none;

      /* Transition: 明示的なプロパティリストを使用 */
      transition:
        background-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        transform var(--duration-fast) var(--ease-out);
    }

    /* Focus Indicator: Adaptive Focus */
    button:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
      animation: var(--animation-focus);
    }

    /* Disabled State */
    button:disabled {
      opacity: var(--opacity-disabled);
      cursor: not-allowed;
      pointer-events: none;
    }

    /* --- Size Variants --- */

    /* Small */
    .size-sm {
      --button-icon-size: var(--icon-sm);
      height: var(--control-height-sm);
      padding: 0 var(--space-2);
      font-size: var(--text-sm);
      gap: var(--space-1);
    }

    .size-sm.icon-only {
      width: var(--control-height-sm);
      padding: 0;
    }

    /* Medium (Default) */
    .size-md {
      --button-icon-size: var(--icon-base);
      height: var(--control-height-md);
      padding: 0 var(--space-3);
      font-size: var(--text-base);
      gap: var(--space-2);
    }

    .size-md.icon-only {
      width: var(--control-height-md);
      padding: 0;
    }

    /* Large (Deprecated) */
    .size-lg {
      --button-icon-size: var(--icon-md);
      height: var(--control-height-lg);
      padding: 0 var(--space-4);
      font-size: var(--text-base);
      gap: var(--space-2);
    }

    .size-lg.icon-only {
      width: var(--control-height-lg);
      padding: 0;
    }

    /* --- Variant Styles --- */

    /* Primary */
    .variant-primary {
      background: var(--primary);
      color: var(--on-primary);
      box-shadow:
        inset 0 1px 0 0 oklch(100% 0 0 / 0.15),
        var(--elevation-md);
    }

    .variant-primary:hover:not(:disabled) {
      background: var(--primary-hover);
    }

    /* Secondary */
    .variant-secondary {
      background: var(--bg-surface-2);
      color: var(--fg-default);
      border: var(--border-width) solid var(--border-default);
      box-shadow: var(--elevation-sm);
    }

    .variant-secondary:hover:not(:disabled) {
      background: var(--bg-fill-muted);
    }

    /* Dark Mode: Edge Highlight for Secondary */
    @media (prefers-color-scheme: dark) {
      .variant-secondary {
        box-shadow:
          inset 0 1px 0 0 oklch(100% 0 0 / 0.1),
          var(--elevation-sm);
      }
    }

    /* Outline */
    .variant-outline {
      background: transparent;
      color: var(--fg-default);
      border: var(--border-width) solid var(--border-default);
    }

    .variant-outline:hover:not(:disabled) {
      border-color: var(--fg-muted);
    }

    /* Ghost */
    .variant-ghost {
      background: transparent;
      color: var(--fg-muted);
    }

    .variant-ghost:hover:not(:disabled) {
      background: var(--bg-hover);
    }

    /* Danger */
    .variant-danger {
      background: var(--bg-danger-subtle);
      color: var(--danger);
      border: var(--border-width) solid var(--border-danger);
    }

    .variant-danger:hover:not(:disabled) {
      background: var(--danger);
      color: var(--on-danger);
    }

    /* --- Pressed State --- */

    button[aria-pressed='true'].variant-secondary {
      background: var(--bg-fill-muted);
      border-color: var(--fg-muted);
      box-shadow:
        inset 0 1px 0 0 oklch(0% 0 0 / 0.08),
        var(--elevation-sm);
    }

    button[aria-pressed='true'].variant-outline {
      background: var(--bg-hover);
      border-color: var(--fg-muted);
      color: var(--fg-default);
    }

    button[aria-pressed='true'].variant-ghost {
      background: oklch(from var(--bg-hover) l c h / 0.95);
      color: var(--fg-default);
      box-shadow: inset 0 0 0 1px oklch(from var(--border-default) l c h / 0.7);
    }

    button[aria-pressed='true'].variant-primary {
      box-shadow:
        inset 0 0 0 1px oklch(0% 0 0 / 0.12),
        inset 0 1px 0 0 oklch(100% 0 0 / 0.15),
        var(--elevation-md);
    }

    button[aria-pressed='true'].variant-danger {
      box-shadow: inset 0 0 0 1px oklch(0% 0 0 / 0.12);
    }

    /* --- Loading State --- */

    /* ラベルを非表示にしつつ幅を維持 */
    .label {
      display: inline-flex;
      align-items: center;
      gap: inherit;
      line-height: inherit;
    }

    .content-slot::slotted(ui-icon),
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

      button:focus-visible {
        animation: none;
        outline-color: var(--focus-ring-color);
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
        border: var(--border-width) solid CanvasText;
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

      button[aria-pressed='true'] {
        background: CanvasText;
        color: Canvas;
        border-color: CanvasText;
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }

      button[aria-pressed='true'].variant-primary,
      button[aria-pressed='true'].variant-danger {
        outline-width: 1px;
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
      inline-size: max(100%, 44px);
      block-size: max(100%, 44px);
      border-radius: inherit;
      pointer-events: auto;
      background: transparent;
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
   * トグルボタンの押下状態
   * @type {boolean | undefined}
   * @default undefined
   */
  @property({ reflect: true, converter: pressedAttributeConverter })
  pressed: ButtonPressedState = undefined;

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

  /**
   * trigger 用の開閉状態
   * @type {'true' | 'false' | null}
   */
  @property({ type: String, attribute: 'aria-expanded', reflect: true })
  override ariaExpanded: string | null = null;

  /**
   * trigger 用の関連要素 ID
   * @type {string | null}
   */
  @property({ type: String, attribute: 'aria-controls', reflect: true })
  ariaControls: string | null = null;

  /**
   * trigger 用の popup 種別
   * @type {string | null}
   */
  @property({ type: String, attribute: 'aria-haspopup', reflect: true })
  override ariaHasPopup: string | null = null;

  /**
   * trigger 用の説明要素 ID
   * @type {string | null}
   */
  @property({ type: String, attribute: 'aria-describedby', reflect: true })
  ariaDescribedBy: string | null = null;

  private _internals: ElementInternals;
  private readonly _isDevelopment: boolean;
  private _spaceKeyPressed = false;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._isDevelopment =
      (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ?? true;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._validateAccessibilityContract();
    this._warnUnsupportedAriaLabelUsage();
    this._warnDeprecatedSizeUsage();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('iconOnly') || changedProperties.has('ariaLabel')) {
      this._validateAccessibilityContract();
      this._warnUnsupportedAriaLabelUsage();
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
  };

  /**
   * Enter / Space のキーボード操作を click に正規化
   */
  private _handleKeyDown = (e: KeyboardEvent): void => {
    if (this.disabled || this.loading) {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLButtonElement).click();
    }

    if (e.key === ' ') {
      e.preventDefault();
      this._spaceKeyPressed = true;
    }
  };

  /**
   * Space は keyup でアクション発火（ネイティブ button と同等）
   */
  private _handleKeyUp = (e: KeyboardEvent): void => {
    if (this.disabled || this.loading) {
      return;
    }

    if (e.key === ' ' && this._spaceKeyPressed) {
      e.preventDefault();
      this._spaceKeyPressed = false;
      (e.currentTarget as HTMLButtonElement).click();
    }
  };

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
   * 可視ラベルを持つ button での aria-label 併用を開発時に警告
   */
  private _warnUnsupportedAriaLabelUsage(): void {
    if (!this._isDevelopment) {
      return;
    }

    if (!this.iconOnly && this.ariaLabel !== null) {
      console.warn(
        '[ui-button]: aria-label は icon-only="true" の場合にのみサポートします。可視ラベルを持つ button では aria-label を内部 button に反映しません。',
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
        ?disabled=${this.disabled || this.loading}
        aria-busy="${ifDefined(this.loading ? 'true' : undefined)}"
        aria-pressed="${ifDefined(this.pressed !== undefined ? String(this.pressed) : undefined)}"
        aria-label="${ifDefined(this.iconOnly ? (this.ariaLabel ?? undefined) : undefined)}"
        aria-expanded="${ifDefined(this.ariaExpanded ?? undefined)}"
        aria-controls="${ifDefined(this.ariaControls ?? undefined)}"
        aria-haspopup="${ifDefined(this.ariaHasPopup ?? undefined)}"
        aria-describedby="${ifDefined(this.ariaDescribedBy ?? undefined)}"
        class="${classMap(classes)}"
        @click="${this._handleClick}"
        @keydown="${this._handleKeyDown}"
        @keyup="${this._handleKeyUp}"
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
    this._spaceKeyPressed = false;
    const button = this.shadowRoot?.querySelector('button');
    button?.blur();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-button': Button;
  }
}
