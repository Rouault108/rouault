import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';

let inputInstanceCounter = 0;

/**
 * 入力フィールド (Input) コンポーネント
 *
 * 思考を妨げない「透明な」入力インターフェースを提供します。
 * Universal Clarity（入力領域の明示）とContextual Feedback（近接したエラー表示）を実現します。
 *
 * @slot - デフォルトスロット（使用されません）
 *
 * @property {string} label - 入力項目のラベル（必須）
 * @property {boolean} hideLabel - ラベルを視覚的に非表示（スクリーンリーダーには残る）
 * @property {'filled' | 'outline'} variant - 外観バリアント
 * @property {string} type - 入力フィールドのタイプ
 * @property {string} name - フォーム送信時のフィールド名
 * @property {string} placeholder - ヒントテキスト
 * @property {string} value - 入力値
 * @property {string} helpText - 補助テキスト
 * @property {string} errorMessage - エラーメッセージ
 * @property {boolean} error - エラー状態の強制
 * @property {boolean} disabled - 操作無効化
 * @property {boolean} readonly - 読み取り専用モード
 * @property {boolean} required - 必須フィールド
 * @property {string} pattern - バリデーションパターン（正規表現）
 * @property {number} minlength - 最小文字数
 * @property {number} maxlength - 最大文字数
 * @property {string} autocomplete - オートコンプリート設定
 *
 * @fires input - 入力値が変更された時
 * @fires change - 入力がコミットされた時（フォーカスを外した時等）
 * @fires focus - フォーカスが当たった時
 * @fires blur - フォーカスが外れた時
 *
 * @cssprop --bg-fill-muted - デフォルト背景色
 * @cssprop --bg-default - フォーカス時の背景色
 * @cssprop --bg-danger-subtle - エラー時の背景色
 * @cssprop --fg-default - デフォルトテキスト色
 * @cssprop --fg-subtle - Disabled時のテキスト色
 * @cssprop --fg-muted - Help Textのテキスト色
 * @cssprop --fg-danger - エラーメッセージのテキスト色
 * @cssprop --border-default - デフォルトボーダー色
 * @cssprop --border-danger - エラーボーダー色
 * @cssprop --border-width-thick - 太いボーダー幅
 * @cssprop --border-width - ボーダー幅
 * @cssprop --radius-md - 角丸
 * @cssprop --control-height-md - 入力フィールドの高さ
 * @cssprop --space-1 - 小スペーシング (4px)
 * @cssprop --space-2 - 中スペーシング (8px)
 * @cssprop --text-sm - 小フォントサイズ (13px)
 * @cssprop --text-base - 標準フォントサイズ (14px)
 * @cssprop --font-medium - 中フォントウェイト (500)
 * @cssprop --duration-fast - 速い遷移時間
 * @cssprop --ease-out - イージング関数
 * @cssprop --focus-ring-width - フォーカスリング幅
 * @cssprop --focus-ring-color - フォーカスリング色
 * @cssprop --focus-ring-offset - フォーカスリングオフセット
 * @cssprop --animation-focus - Adaptive Focusアニメーション
 * @cssprop --opacity-disabled - Disabled時の不透明度
 * @cssprop --line-height-normal - 標準行間 (1.5)
 *
 * @example
 * ```html
 * <!-- 基本的な使用 -->
 * <ui-input label="メールアドレス" type="email" name="email"></ui-input>
 *
 * <!-- ヘルプテキスト付き -->
 * <ui-input
 *   label="パスワード"
 *   type="password"
 *   help-text="8文字以上で入力してください"
 * ></ui-input>
 *
 * <!-- エラー状態 -->
 * <ui-input
 *   label="ユーザー名"
 *   error
 *   error-message="このユーザー名は既に使用されています"
 * ></ui-input>
 *
 * <!-- ラベルを視覚的に非表示 -->
 * <ui-input
 *   label="ユーザーID"
 *   hide-label
 *   type="text"
 *   placeholder="ユーザーIDを入力"
 * ></ui-input>
 * ```
 */
@customElement('ui-input')
export class Input extends LitElement {
  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 8px);
    }

    :host([variant='outline']) input {
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
      background: var(--bg-default, oklch(100% 0 0));
    }

    /* Label Element */
    .label {
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      color: var(--fg-default, oklch(20% 0 0));
    }

    /* Label Hidden Implementation */
    .label--hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }

    /* Input Element */
    input {
      width: 100%;
      max-width: 100%;
      height: var(--control-height-md, 32px);
      padding: 0 var(--space-2, 8px);
      box-sizing: border-box;

      /* Border & Radius */
      border-radius: var(--radius-md, 6px);
      border: var(--border-width, 1px) solid transparent;

      /* Typography */
      font-family: inherit;
      font-size: var(--text-base, 14px);

      /* Default State: Universal Clarity */
      background: var(--bg-fill-muted, oklch(95% 0 0));
      color: var(--fg-default, oklch(20% 0 0));

      /* Transition: 明示的なプロパティリストを使用 */
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        outline-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Remove default outline */
    input:focus {
      outline: none;
    }

    /* Hover State: Tactility */
    input:hover:not(:disabled):not(:focus) {
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
    }

    /* Focus State: Clear Canvas */
    input:focus {
      background: var(--bg-default, oklch(100% 0 0));
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
    }

    :host([variant='outline']) input:focus {
      background: var(--bg-default, oklch(100% 0 0));
    }

    /* Focus Indicator: Adaptive Focus */
    input:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    /* Error State */
    input.error {
      border-color: var(--border-danger, oklch(55% 0.2 28));
      background: var(--bg-danger-subtle, oklch(95% 0.02 28));
    }

    /* Disabled State */
    input:disabled {
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
      color: var(--fg-subtle, oklch(48% 0 0));
    }

    /* Readonly State */
    input:read-only {
      background: var(--bg-fill-muted, oklch(95% 0 0));
      cursor: default;
    }

    :host([variant='outline']) input:read-only {
      background: var(--bg-default, oklch(100% 0 0));
    }

    /* Help Text */
    .help-text {
      font-size: var(--text-sm, 13px);
      color: var(--fg-muted, oklch(48% 0 0));
      margin-top: var(--space-1, 4px);
      line-height: var(--line-height-normal, 1.5);
    }

    /* Error Message */
    .error-message {
      font-size: var(--text-sm, 13px);
      color: var(--fg-danger, oklch(55% 0.2 28));
      margin-top: var(--space-1, 4px);
      line-height: var(--line-height-normal, 1.5);
      display: none;
    }

    .error-message--visible {
      display: block;
    }

    /* Motion Reduction */
    @media (prefers-reduced-motion: reduce) {
      input {
        transition-duration: 0.01ms;
      }
    }

    /* Forced Colors Mode */
    @media (forced-colors: active) {
      input {
        border: var(--border-width, 1px) solid CanvasText !important;
        background: Canvas !important;
        color: CanvasText !important;
      }

      input.error {
        border-width: var(--border-width-thick, 2px);
        border-color: CanvasText !important;
      }

      input:focus-visible {
        outline: 3px solid CanvasText;
        box-shadow: none;
      }

      input:disabled {
        border-color: GrayText;
        color: GrayText !important;
        opacity: 1;
      }
    }

    /* Print Styles */
    @media print {
      input {
        background: transparent !important;
        border: var(--border-width, 1px) solid currentColor !important;
        color: var(--fg-default, oklch(20% 0 0)) !important;
      }

      input.error {
        border-color: var(--border-danger, oklch(55% 0.2 28)) !important;
      }

      input:disabled,
      input:read-only {
        opacity: 0.6;
      }
    }
  `;

  // Form Association を有効化
  static formAssociated = true;

  /**
   * 入力項目のラベル（必須）
   */
  @property({ type: String, reflect: true })
  label = '';

  /**
   * ラベルを視覚的に非表示（aria-labelには反映）
   * @default false
   */
  @property({ type: Boolean, attribute: 'hide-label', reflect: true })
  hideLabel = false;

  /**
   * 外観バリアント
   * @default 'filled'
   */
  @property({ type: String, reflect: true })
  variant: 'filled' | 'outline' = 'filled';

  /**
   * 入力フィールドのタイプ
   * @type {'text' | 'email' | 'password' | 'number' | 'tel' | 'url'}
   * @default 'text'
   */
  @property({ type: String, reflect: true })
  type = 'text';

  /**
   * フォーム送信時のフィールド名
   */
  @property({ type: String, reflect: true })
  name = '';

  /**
   * ヒントテキスト
   */
  @property({ type: String, reflect: true })
  placeholder = '';

  /**
   * 入力値
   */
  @property({ type: String })
  value = '';

  /**
   * 補助テキスト
   */
  @property({ type: String, attribute: 'help-text', reflect: true })
  helpText = '';

  /**
   * エラーメッセージ
   */
  @property({ type: String, attribute: 'error-message', reflect: true })
  errorMessage = '';

  /**
   * エラー状態の強制
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  error = false;

  /**
   * 操作無効化
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * 読み取り専用モード
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  readonly = false;

  /**
   * 必須フィールド
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  required = false;

  /**
   * バリデーションパターン（正規表現）
   */
  @property({ type: String, reflect: true })
  pattern = '';

  /**
   * 最小文字数
   * @type {number | undefined}
   */
  @property({ type: Number, reflect: true })
  minlength?: number;

  /**
   * 最大文字数
   * @type {number | undefined}
   */
  @property({ type: Number, reflect: true })
  maxlength?: number;

  /**
   * オートコンプリート設定
   */
  @property({ type: String, reflect: true })
  autocomplete = '';

  @query('input')
  private _input!: HTMLInputElement;

  private _internals: ElementInternals;
  private _nativeErrorMessage = '';
  private _hasNativeError = false;
  private _formDisabled = false;

  // サポートされている type のリスト
  private readonly _supportedTypes: readonly string[] = [
    'text',
    'email',
    'password',
    'number',
    'tel',
    'url',
  ];

  // 一意なIDを生成（レンダリング毎の再生成を防止）
  private readonly _instanceId = `ui-input-${(++inputInstanceCounter).toString()}`;
  private readonly _inputId = `${this._instanceId}-input`;
  private readonly _errorId = `${this._instanceId}-error`;
  private readonly _helpId = `${this._instanceId}-help`;

  constructor() {
    super();
    this._internals = this.attachInternals();

    // delegatesFocus を有効化（外部からのフォーカスを内部inputに転送）
  }

  override connectedCallback(): void {
    super.connectedCallback();

    // labelが空の場合の警告
    if (!this.label) {
      console.error(
        '[ui-input]: label は必須です。アクセシビリティのためにラベルを提供してください。',
        this,
      );
    }
  }

  override firstUpdated(): void {
    this._syncFormValue();
    this._syncValidity();
  }

  override willUpdate(changedProperties: Map<string, unknown>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('type')) {
      this._normalizeType();
    }
  }

  override updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);

    // ElementInternals を使ってフォーム値を設定
    if (changedProperties.has('value') || changedProperties.has('disabled')) {
      this._syncFormValue();
    }

    if (changedProperties.has('label') && !this.label) {
      console.error(
        '[ui-input]: label は必須です。アクセシビリティのためにラベルを提供してください。',
        this,
      );
    }

    // バリデーション関連のプロパティが変更された場合、バリデーション状態を同期
    const validationProps = [
      'value',
      'required',
      'pattern',
      'minlength',
      'maxlength',
      'type',
      'error',
      'errorMessage',
      'disabled',
    ];
    if (validationProps.some((prop) => changedProperties.has(prop))) {
      this._syncValidity();
    }
  }

  private _handleInput = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
  };

  private _handleChange = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
  };

  private _handleKeyDown = (e: KeyboardEvent): void => {
    // IME変換中でないEnterキーの押下のみ処理
    if (e.key === 'Enter' && !e.isComposing) {
      if (this._internals.form) {
        // フォームバリデーションを行い、問題なければ送信
        // これにより、標準のinput要素でEnterを押した際（最初のsubmitボタンをクリック）と同様の挙動を実現
        this._internals.form.requestSubmit();
      }
    }
  };

  private _handleFocus = (): void => {
    this.dispatchEvent(new FocusEvent('focus'));
  };

  private _handleBlur = (): void => {
    this.dispatchEvent(new FocusEvent('blur'));
  };

  override render() {
    const currentErrorMessage = this._currentErrorMessage;
    const hasError = this._hasError;

    const labelClasses = {
      label: true,
      'label--hidden': this.hideLabel,
    };

    const inputClasses = {
      error: hasError,
    };

    const errorMessageClasses = {
      'error-message': true,
      'error-message--visible': hasError && !!currentErrorMessage,
    };

    // aria-describedby の値を決定
    // エラー状態時はエラーメッセージがある場合のみ errorId を参照し、
    // helpText は非エラー時のみ参照（エラー時は help-text が DOM から除去される）
    const describedBy =
      hasError && currentErrorMessage
        ? this._errorId
        : !hasError && this.helpText
          ? this._helpId
          : undefined;

    return html`
      <label for="${this._inputId}" class="${classMap(labelClasses)}">
        ${this.label}${this.required ? '（必須）' : ''}
      </label>

      <input
        id="${this._inputId}"
        type="${this.type}"
        name="${this.name}"
        .value="${live(this.value)}"
        placeholder="${this.placeholder}"
        ?disabled="${this._isDisabled}"
        ?readonly="${this.readonly}"
        ?required="${this.required}"
        pattern="${this.pattern || nothing}"
        minlength="${this.minlength ?? nothing}"
        maxlength="${this.maxlength ?? nothing}"
        autocomplete="${this.autocomplete}"
        aria-label="${this.label}"
        aria-invalid="${hasError}"
        aria-describedby="${ifDefined(describedBy)}"
        class="${classMap(inputClasses)}"
        @input="${this._handleInput}"
        @change="${this._handleChange}"
        @keydown="${this._handleKeyDown}"
        @focus="${this._handleFocus}"
        @blur="${this._handleBlur}"
      />

      ${this.helpText && !hasError
        ? html`<div class="help-text" id="${this._helpId}">${this.helpText}</div>`
        : ''}
      ${currentErrorMessage
        ? html`<div
            class="${classMap(errorMessageClasses)}"
            id="${this._errorId}"
            role="status"
            aria-live="polite"
          >
            ${currentErrorMessage}
          </div>`
        : ''}
    `;
  }

  /**
   * 入力フィールドにフォーカスを当てる
   */
  override focus(options?: FocusOptions): void {
    this._input.focus(options);
  }

  /**
   * 入力フィールドからフォーカスを外す
   */
  override blur(): void {
    this._input.blur();
  }

  /**
   * 入力フィールドを選択状態にする
   */
  select(): void {
    this._input.select();
  }

  /**
   * バリデーション状態をチェック
   * 内部の<input>要素のネイティブバリデーション（required, pattern等）を反映します。
   */
  checkValidity(): boolean {
    // 内部inputのバリデーション状態をElementInternalsに同期
    this._syncValidity();
    return this._internals.checkValidity();
  }

  /**
   * バリデーション状態をレポート
   * 内部の<input>要素のネイティブバリデーション（required, pattern等）を反映します。
   */
  reportValidity(): boolean {
    // 内部inputのバリデーション状態をElementInternalsに同期
    this._syncValidity();
    return this._internals.reportValidity();
  }

  /**
   * フォームリセット時に初期値へ戻します。
   */
  formResetCallback(): void {
    this.value = this.getAttribute('value') ?? '';
    this.error = false;
    this.errorMessage = '';
    this._syncFormValue();
    this._syncValidity();
  }

  /**
   * fieldset由来のdisabled状態を反映します。
   */
  formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled;
    this._syncFormValue();
    this._syncValidity();
    this.requestUpdate();
  }

  /**
   * ブラウザ復元時の値を取り込みます。
   */
  formStateRestoreCallback(state: File | FormData | string | null): void {
    if (typeof state === 'string') {
      this.value = state;
    }
  }

  /**
   * 強制エラーとネイティブバリデーションを統合して同期
   */
  private _syncValidity(): void {
    if (this._isDisabled) {
      this._hasNativeError = false;
      this._nativeErrorMessage = '';
      this._internals.setValidity({});
      return;
    }

    // 強制エラー（customError）を優先
    if (this.error && this.errorMessage) {
      this._hasNativeError = false;
      this._nativeErrorMessage = '';
      this._internals.setValidity({ customError: true }, this.errorMessage, this._input);
      return;
    }

    // 内部inputのネイティブバリデーション状態を同期
    const validity = this._input.validity;

    // ブラウザはプログラム的に設定した値では tooShort/tooLong を検出しない場合があるため手動確認
    const currentValue = this._input.value;
    const manualTooShort =
      this.minlength !== undefined &&
      currentValue.length > 0 &&
      currentValue.length < this.minlength;
    const manualTooLong = this.maxlength !== undefined && currentValue.length > this.maxlength;

    if (!validity.valid || manualTooShort || manualTooLong) {
      this._hasNativeError = true;
      this._nativeErrorMessage = this._input.validationMessage || 'Invalid input';
      // バリデーションエラーがある場合、ElementInternalsに反映
      this._internals.setValidity(
        {
          valueMissing: validity.valueMissing,
          typeMismatch: validity.typeMismatch,
          patternMismatch: validity.patternMismatch,
          tooShort: validity.tooShort || manualTooShort,
          tooLong: validity.tooLong || manualTooLong,
          rangeUnderflow: validity.rangeUnderflow,
          rangeOverflow: validity.rangeOverflow,
          stepMismatch: validity.stepMismatch,
          badInput: validity.badInput,
        },
        this._nativeErrorMessage,
        this._input,
      );
    } else {
      // バリデーション成功
      this._hasNativeError = false;
      this._nativeErrorMessage = '';
      this._internals.setValidity({});
    }
  }

  private _syncFormValue(): void {
    this._internals.setFormValue(this._isDisabled ? null : this.value);
  }

  private _normalizeType(): void {
    if (this._isSupportedType(this.type)) {
      return;
    }

    console.warn(
      `[ui-input]: type="${this.type}" はサポートされていません。text にフォールバックします。`,
      `サポートされているtype: ${this._supportedTypes.join(', ')}`,
      this,
    );
    this.type = 'text';
  }

  private _isSupportedType(type: string): boolean {
    return this._supportedTypes.includes(type);
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled;
  }

  private get _hasError(): boolean {
    return this.error || this._hasNativeError;
  }

  private get _currentErrorMessage(): string {
    if (this.error && this.errorMessage) {
      return this.errorMessage;
    }

    if (this._hasNativeError) {
      return this._nativeErrorMessage;
    }

    return '';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-input': Input;
  }
}
