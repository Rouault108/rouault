import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { live } from 'lit/directives/live.js';

/**
 * テキストエリア (Textarea) コンポーネント
 *
 * 複数行のテキスト入力（メモ本文、説明文）を提供します。
 * ユーザーの思考（入力）に合わせて領域が自動的に拡張（Auto Grow）し、
 * スクロール操作による中断を物理的に排除します（Flow State）。
 *
 * ## デザイン哲学
 *
 * - **Flow State**: Auto Grow により入力に対して即応（0ms）し、キャレット位置を安定させます
 * - **Universal Clarity**: `--bg-fill-muted` で入力領域を静かに明示します
 * - **Clear Canvas**: フォーカス時は白地に戻し、執筆に集中させます
 *
 * ## バリアント
 *
 * - **default**: UI 用（14px, 密度優先）
 * - **prose**: コンテンツ執筆用（16px, 可読性優先）
 *
 * @property {string} label - 入力項目のラベル（必須）
 * @property {boolean} hideLabel - ラベルを視覚的に非表示（aria-label には反映）
 * @property {string} name - フォーム送信時のフィールド名
 * @property {string} placeholder - ヒントテキスト
 * @property {string} value - 入力値
 * @property {string} helpText - 補助テキスト
 * @property {string} errorMessage - エラーメッセージ
 * @property {boolean} error - エラー状態の強制
 * @property {boolean} disabled - 操作無効化
 * @property {boolean} readonly - 読み取り専用モード
 * @property {boolean} required - 必須入力フラグ
 * @property {'default' | 'prose'} variant - タイポグラフィモード
 * @property {number} rows - 初期表示行数（デフォルト: 3）
 * @property {number} maxRows - 自動伸長時の最大行数
 * @property {boolean} autoGrow - 自動高さ拡張（デフォルト: true）
 * @property {'none' | 'vertical'} resize - CSS resize プロパティ
 *
 * @fires input - 入力値が変更された時
 * @fires change - 入力がコミットされた時
 * @fires focus - フォーカスが当たった時
 * @fires blur - フォーカスが外れた時
 *
 * @cssprop --bg-fill-muted - デフォルト背景色
 * @cssprop --bg-default - フォーカス時の背景色
 * @cssprop --bg-danger-subtle - エラー時の背景色
 * @cssprop --fg-default - デフォルトテキスト色
 * @cssprop --fg-subtle - Disabled 時のテキスト色
 * @cssprop --fg-muted - Help Text のテキスト色
 * @cssprop --fg-danger - エラーメッセージのテキスト色
 * @cssprop --border-default - デフォルトボーダー色
 * @cssprop --border-danger - エラーボーダー色
 * @cssprop --border-width - ボーダー幅
 * @cssprop --border-width-thick - 太いボーダー幅
 * @cssprop --radius-md - 角丸 (6px)
 * @cssprop --space-1 - 小スペーシング (4px)
 * @cssprop --space-2 - 中スペーシング (8px)
 * @cssprop --space-3 - 大スペーシング (12px)
 * @cssprop --text-sm - 小フォントサイズ (13px)
 * @cssprop --text-base - 標準フォントサイズ (14px)
 * @cssprop --text-lg - 大フォントサイズ (16px)
 * @cssprop --font-medium - 中フォントウェイト (500)
 * @cssprop --line-height-normal - 標準行間 (1.5)
 * @cssprop --line-height-relaxed - ゆったり行間 (1.75)
 * @cssprop --duration-fast - 速い遷移時間 (70ms)
 * @cssprop --ease-out - イージング関数
 * @cssprop --focus-ring-width - フォーカスリング幅
 * @cssprop --focus-ring-color - フォーカスリング色
 * @cssprop --focus-ring-offset - フォーカスリングオフセット
 * @cssprop --animation-focus - Adaptive Focus アニメーション
 * @cssprop --opacity-disabled - Disabled 時の不透明度 (0.5)
 * @cssprop --scrollbar-width - スクロールバー幅 (12px)
 * @cssprop --scrollbar-thumb - スクロールバーサム色
 * @cssprop --scrollbar-thumb-hover - スクロールバーサムホバー色
 *
 * @example
 * ```html
 * <!-- 基本的な使用 -->
 * <ui-textarea label="メモ" name="memo"></ui-textarea>
 *
 * <!-- Prose バリアント（執筆用） -->
 * <ui-textarea label="本文" variant="prose" rows="6"></ui-textarea>
 *
 * <!-- 最大行数制限 -->
 * <ui-textarea label="説明" max-rows="5"></ui-textarea>
 *
 * <!-- Auto Grow 無効（手動リサイズ） -->
 * <ui-textarea label="メモ" auto-grow="false"></ui-textarea>
 *
 * <!-- エラー状態 -->
 * <ui-textarea label="本文" error error-message="本文を入力してください"></ui-textarea>
 * ```
 */
@customElement('ui-textarea')
export class Textarea extends LitElement {
    static override styles = css`
    /* ── ホスト: 縦並びコンテナ ── */
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 8px);
    }

    /* ── Label ── */
    .label {
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      color: var(--fg-default, oklch(20% 0.01 250));
    }

    /* sr-only 相当: 視覚的に非表示だがスクリーンリーダーには残る */
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

    /* ── Textarea 本体 ── */
    textarea {
      /* Layout */
      display: block;
      width: 100%;
      box-sizing: border-box;

      /* Border & Radius */
      border-radius: var(--radius-md, 6px);
      border: var(--border-width, 1px) solid transparent;

      /* Default State: Universal Clarity */
      background: var(--bg-fill-muted, oklch(95% 0 0));
      color: var(--fg-default, oklch(20% 0.01 250));

      /* Typography (default variant) */
      font-family: inherit;
      font-size: var(--text-base, 14px);
      line-height: var(--line-height-normal, 1.5);
      letter-spacing: var(--tracking-normal, 0em);
      font-feature-settings: normal;

      /* Padding (default variant) */
      padding: var(--space-2, 8px) var(--space-3, 12px);

      /* Resize: auto-grow 時は none */
      resize: none;

      /* Overflow: auto-grow 時は hidden（スクロールバー非表示） */
      overflow-y: hidden;

      /* Transition: height は対象外（Auto Grow の即応性を維持） */
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        outline-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Remove default outline */
    textarea:focus {
      outline: none;
    }

    /* Hover State: Tactility */
    textarea:hover:not(:disabled):not(:read-only):not(:focus) {
      border-color: var(--border-default, oklch(85% 0.01 250));
    }

    /* Focus State: Clear Canvas */
    textarea:focus {
      background: var(--bg-default, oklch(100% 0 0));
      border-color: var(--border-default, oklch(85% 0.01 250));
    }

    /* Focus Indicator: Adaptive Focus */
    textarea:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    /* Error State */
    textarea.error {
      border-color: var(--border-danger, oklch(55% 0.2 28));
      background: var(--bg-danger-subtle, oklch(95% 0.02 28));
    }

    /* Disabled State */
    textarea:disabled {
      border-color: var(--border-default, oklch(85% 0.01 250));
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
      color: var(--fg-subtle, oklch(48% 0.01 250));
      resize: none;
    }

    /* Readonly State */
    textarea:read-only {
      background: var(--bg-fill-muted, oklch(95% 0 0));
      cursor: default;
      resize: none;
    }

    /* ── Prose バリアント ── */
    textarea.prose {
      font-size: var(--text-lg, 16px);
      line-height: var(--line-height-relaxed, 1.75);
      letter-spacing: 0;
      padding: var(--space-3, 12px) var(--space-3, 12px);
    }

    /* ── Auto Grow 無効時: vertical resize を許容 ── */
    textarea.resize-vertical {
      resize: vertical;
    }

    /* ── max-rows 超過時: 内部スクロール ── */
    textarea.overflow-scroll {
      overflow-y: auto;
    }

    /* ── Scrollbar スタイル（「見えないヒットエリア」手法） ── */
    textarea {
      /* Firefox */
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb, oklch(65% 0.01 250)) transparent;
    }

    textarea::-webkit-scrollbar {
      width: var(--scrollbar-width, 12px);
      height: var(--scrollbar-width, 12px);
    }

    textarea::-webkit-scrollbar-track {
      background: transparent;
    }

    textarea::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-thumb, oklch(65% 0.01 250));
      border: 4px solid transparent;
      background-clip: content-box;
      border-radius: var(--radius-full, 9999px);
    }

    textarea::-webkit-scrollbar-thumb:hover {
      background-color: var(--scrollbar-thumb-hover, oklch(48% 0.01 250));
    }

    /* ── Help Text ── */
    .help-text {
      font-size: var(--text-sm, 13px);
      color: var(--fg-muted, oklch(48% 0.01 250));
      margin-top: var(--space-1, 4px);
      line-height: var(--line-height-normal, 1.5);
    }

    /* ── Error Message ── */
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

    /* ── Motion Reduction ── */
    @media (prefers-reduced-motion: reduce) {
      textarea {
        transition-duration: 0.01ms;
      }
    }

    /* ── Forced Colors Mode ── */
    @media (forced-colors: active) {
      textarea {
        border: var(--border-width, 1px) solid CanvasText !important;
        background: Canvas !important;
        color: CanvasText !important;
      }

      textarea.error {
        border-width: var(--border-width-thick, 2px);
        border-color: CanvasText !important;
      }

      textarea:focus-visible {
        outline: 3px solid CanvasText;
        box-shadow: none;
      }

      textarea:disabled {
        border-color: GrayText;
        color: GrayText !important;
        opacity: 1;
      }
    }

    /* ── Print Styles ── */
    @media print {
      textarea {
        background: transparent !important;
        border: var(--border-width, 1px) solid currentColor !important;
        color: var(--fg-default, oklch(20% 0.01 250)) !important;
      }

      textarea.error {
        border-color: var(--border-danger, oklch(55% 0.2 28)) !important;
      }

      textarea:disabled,
      textarea:read-only {
        opacity: 0.6;
      }
    }
  `;

    // Form Association を有効化
    static formAssociated = true;

    // ──────────────────────────────────────────────
    // Properties
    // ──────────────────────────────────────────────

    /**
     * 入力項目のラベル（必須）
     */
    @property({ type: String, reflect: true })
    label = '';

    /**
     * ラベルを視覚的に非表示（aria-label には反映）
     * @default false
     */
    @property({ type: Boolean, attribute: 'hide-label', reflect: true })
    hideLabel = false;

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
     * 必須入力フラグ
     * @default false
     */
    @property({ type: Boolean, reflect: true })
    required = false;

    /**
     * タイポグラフィモード
     * - `default`: UI 用（14px, 密度優先）
     * - `prose`: コンテンツ執筆用（16px, 可読性優先）
     * @default 'default'
     */
    @property({ type: String, reflect: true })
    variant: 'default' | 'prose' = 'default';

    /**
     * 初期表示行数
     * @default 3
     */
    @property({ type: Number, reflect: true })
    rows = 3;

    /**
     * 自動伸長時の最大行数。
     * 未指定時は無制限に伸長します。
     */
    @property({ type: Number, attribute: 'max-rows', reflect: true })
    maxRows?: number;

    /**
     * 自動高さ拡張の有効化
     * @default true
     */
    @property({ type: Boolean, attribute: 'auto-grow', reflect: true })
    autoGrow = true;

    /**
     * CSS resize プロパティ。
     * `auto-grow=false` の場合のみ `'vertical'` を許容します。
     * @default 'none'
     */
    @property({ type: String, reflect: true })
    resize: 'none' | 'vertical' = 'none';

    // ──────────────────────────────────────────────
    // Private fields
    // ──────────────────────────────────────────────

    @query('textarea')
    private _textarea?: HTMLTextAreaElement;

    private _internals: ElementInternals;
    private _nativeErrorMessage = '';
    private _hasNativeError = false;

    // 一意な ID を生成（レンダリング毎の再生成を防止）
    private readonly _textareaId = `textarea-${Math.random().toString(36).substring(2, 11)}`;
    private readonly _errorId = `error-${Math.random().toString(36).substring(2, 11)}`;
    private readonly _helpId = `help-${Math.random().toString(36).substring(2, 11)}`;

    constructor() {
        super();
        this._internals = this.attachInternals();

        // delegatesFocus を有効化（外部からのフォーカスを内部 textarea に転送）
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open', delegatesFocus: true });
        }
    }

    // ──────────────────────────────────────────────
    // Lifecycle
    // ──────────────────────────────────────────────

    override connectedCallback(): void {
        super.connectedCallback();

        if (!this.label) {
            console.error(
                '[ui-textarea]: label は必須です。アクセシビリティのためにラベルを提供してください。',
                this,
            );
        }
    }

    override firstUpdated(): void {
        this._internals.setFormValue(this.value);
        this._syncValidity();
        // 初期高さを設定
        this._updateHeight();
    }

    override updated(changedProperties: Map<string, unknown>): void {
        super.updated(changedProperties);

        if (changedProperties.has('value')) {
            this._internals.setFormValue(this.value);
        }

        if (changedProperties.has('label') && !this.label) {
            console.error(
                '[ui-textarea]: label は必須です。アクセシビリティのためにラベルを提供してください。',
                this,
            );
        }

        const validationProps = ['value', 'required', 'error', 'errorMessage'];
        if (validationProps.some((prop) => changedProperties.has(prop))) {
            this._syncValidity();
        }

        // value や rows/maxRows が変わった場合は高さを再計算
        if (
            changedProperties.has('value') ||
            changedProperties.has('rows') ||
            changedProperties.has('maxRows') ||
            changedProperties.has('autoGrow') ||
            changedProperties.has('variant')
        ) {
            this._updateHeight();
        }
    }

    // ──────────────────────────────────────────────
    // Auto Grow
    // ──────────────────────────────────────────────

    /**
     * Auto Grow の高さ計算。
     *
     * **Implementation Contract**:
     * 1. `height: auto` へ一時リセット
     * 2. `scrollHeight` を採用して即時反映（0ms）
     * 3. `max-rows` 指定時は上限を設け、超過分のみ内部スクロール
     * 4. `rows` 未満には縮めない（最小高さを保証）
     */
    private _updateHeight(): void {
        const ta = this._textarea;
        if (!ta) return;

        if (!this.autoGrow) {
            // auto-grow 無効時: min-height のみ設定し、resize に委ねる
            const minH = this._calcMinHeight(ta);
            ta.style.minHeight = `${minH.toString()}px`;
            ta.style.height = '';
            ta.style.maxHeight = '';
            ta.classList.remove('overflow-scroll');
            return;
        }

        // 1. height を auto にリセットして scrollHeight を正確に取得
        ta.style.height = 'auto';

        const scrollH = ta.scrollHeight;
        const minH = this._calcMinHeight(ta);
        const newH = Math.max(scrollH, minH);

        if (this.maxRows !== undefined) {
            const maxH = this._calcMaxHeight(ta);
            if (newH > maxH) {
                // max-rows 超過: 上限で固定し内部スクロールを許可
                ta.style.height = `${maxH.toString()}px`;
                ta.classList.add('overflow-scroll');
            } else {
                ta.style.height = `${newH.toString()}px`;
                ta.classList.remove('overflow-scroll');
            }
        } else {
            // 無制限伸長
            ta.style.height = `${newH.toString()}px`;
            ta.classList.remove('overflow-scroll');
        }
    }

    /**
     * `rows` 属性に基づく最小高さを計算します。
     * padding と border を含む実際の高さを返します。
     */
    private _calcMinHeight(ta: HTMLTextAreaElement): number {
        const style = getComputedStyle(ta);
        const lineHeight = parseFloat(style.lineHeight) || (this.variant === 'prose' ? 28 : 21);
        const paddingTop = parseFloat(style.paddingTop) || 8;
        const paddingBottom = parseFloat(style.paddingBottom) || 8;
        const borderTop = parseFloat(style.borderTopWidth) || 1;
        const borderBottom = parseFloat(style.borderBottomWidth) || 1;
        return lineHeight * this.rows + paddingTop + paddingBottom + borderTop + borderBottom;
    }

    /**
     * `max-rows` 属性に基づく最大高さを計算します。
     */
    private _calcMaxHeight(ta: HTMLTextAreaElement): number {
        if (this.maxRows === undefined) return Infinity;
        const style = getComputedStyle(ta);
        const lineHeight = parseFloat(style.lineHeight) || (this.variant === 'prose' ? 28 : 21);
        const paddingTop = parseFloat(style.paddingTop) || 8;
        const paddingBottom = parseFloat(style.paddingBottom) || 8;
        const borderTop = parseFloat(style.borderTopWidth) || 1;
        const borderBottom = parseFloat(style.borderBottomWidth) || 1;
        return lineHeight * this.maxRows + paddingTop + paddingBottom + borderTop + borderBottom;
    }

    // ──────────────────────────────────────────────
    // Event Handlers
    // ──────────────────────────────────────────────

    private _handleInput = (e: Event): void => {
        const ta = e.target as HTMLTextAreaElement;
        this.value = ta.value;
        // Auto Grow: ユーザー入力起因の高さ変化は 0ms 固定
        this._updateHeight();
    };

    private _handleChange = (e: Event): void => {
        const ta = e.target as HTMLTextAreaElement;
        this.value = ta.value;
    };

    private _handleFocus = (): void => {
        this.dispatchEvent(
            new FocusEvent('focus', {
                bubbles: true,
                composed: true,
            }),
        );
    };

    private _handleBlur = (): void => {
        this.dispatchEvent(
            new FocusEvent('blur', {
                bubbles: true,
                composed: true,
            }),
        );
    };

    // ──────────────────────────────────────────────
    // Validation
    // ──────────────────────────────────────────────

    /**
     * バリデーション状態をチェック
     */
    checkValidity(): boolean {
        this._syncValidity();
        return this._internals.checkValidity();
    }

    /**
     * バリデーション状態をレポート
     */
    reportValidity(): boolean {
        this._syncValidity();
        return this._internals.reportValidity();
    }

    private _syncValidity(): void {
        // 強制エラー（customError）を優先
        if (this.error && this.errorMessage) {
            this._hasNativeError = false;
            this._nativeErrorMessage = '';
            this._internals.setValidity({ customError: true }, this.errorMessage, this._textarea);
            return;
        }

        if (!this._textarea) return;

        const validity = this._textarea.validity;

        if (!validity.valid) {
            this._hasNativeError = true;
            this._nativeErrorMessage = this._textarea.validationMessage || 'Invalid input';
            this._internals.setValidity(
                {
                    valueMissing: validity.valueMissing,
                    tooShort: validity.tooShort,
                    tooLong: validity.tooLong,
                    badInput: validity.badInput,
                },
                this._nativeErrorMessage,
                this._textarea,
            );
        } else {
            this._hasNativeError = false;
            this._nativeErrorMessage = '';
            this._internals.setValidity({});
        }
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

    // ──────────────────────────────────────────────
    // Public API
    // ──────────────────────────────────────────────

    /**
     * 内部 textarea にフォーカスを当てる
     */
    override focus(options?: FocusOptions): void {
        this._textarea?.focus(options);
    }

    /**
     * 内部 textarea からフォーカスを外す
     */
    override blur(): void {
        this._textarea?.blur();
    }

    /**
     * テキストを選択状態にする
     */
    select(): void {
        this._textarea?.select();
    }

    // ──────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────

    override render() {
        const currentErrorMessage = this._currentErrorMessage;
        const hasError = this._hasError;

        const labelClasses = {
            label: true,
            'label--hidden': this.hideLabel,
        };

        const textareaClasses = {
            error: hasError,
            prose: this.variant === 'prose',
            'resize-vertical': !this.autoGrow && this.resize === 'vertical',
        };

        const errorMessageClasses = {
            'error-message': true,
            'error-message--visible': hasError && !!currentErrorMessage,
        };

        // aria-describedby の値を決定
        const describedBy =
            hasError && currentErrorMessage
                ? this._errorId
                : this.helpText
                    ? this._helpId
                    : undefined;

        return html`
      <label for="${this._textareaId}" class="${classMap(labelClasses)}">
        ${this.label}
      </label>

      <textarea
        id="${this._textareaId}"
        name="${this.name}"
        .value="${live(this.value)}"
        placeholder="${this.placeholder}"
        ?disabled="${this.disabled}"
        ?readonly="${this.readonly}"
        ?required="${this.required}"
        rows="${this.rows}"
        aria-label="${this.label}"
        aria-invalid="${hasError}"
        aria-describedby="${describedBy ?? nothing}"
        class="${classMap(textareaClasses)}"
        @input="${this._handleInput}"
        @change="${this._handleChange}"
        @focus="${this._handleFocus}"
        @blur="${this._handleBlur}"
      ></textarea>

      ${this.helpText && !hasError
                ? html`<div class="help-text" id="${this._helpId}">${this.helpText}</div>`
                : ''
            }

      ${currentErrorMessage
                ? html`<div
            class="${classMap(errorMessageClasses)}"
            id="${this._errorId}"
            role="status"
            aria-live="polite"
          >
            ${currentErrorMessage}
          </div>`
                : ''
            }
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ui-textarea': Textarea;
    }
}
