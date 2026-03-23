import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * チェックボックス (Checkbox) コンポーネント
 *
 * 選択状態（ON/OFF）を一目で識別可能にし、ラベルとの関連性を明確にします。
 * Form-Associated Custom Element として、標準フォームとシームレスに統合します。
 *
 * @property {boolean} checked - 選択状態
 * @property {boolean} indeterminate - 中間状態（プログラム的にのみ設定可能）
 * @property {string}  name  - フォーム送信時の識別子
 * @property {string}  value - フォーム送信時の値（デフォルト: "on"）
 * @property {string}  label - ラベルテキスト
 * @property {boolean} disabled - 無効化
 * @property {boolean} required - 必須入力
 *
 * @fires input  - ユーザー操作によって選択状態が変化した直後に発火
 * @fires change - input の後に発火
 *
 * @cssprop --primary          - チェック時の背景・ボーダー色
 * @cssprop --on-primary       - チェック時のアイコン色
 * @cssprop --bg-fill-muted    - 未選択時の背景色
 * @cssprop --border-muted     - 未選択時のボーダー色
 * @cssprop --border-default   - ホバー時のボーダー色
 * @cssprop --border-danger    - エラー時のボーダー色
 * @cssprop --border-width     - ボーダー幅
 * @cssprop --radius-sm        - コントロールの角丸 (4px)
 * @cssprop --fg-default       - ラベルテキスト色
 * @cssprop --fg-danger        - エラーメッセージ色
 * @cssprop --opacity-disabled - 無効時の不透明度 (0.5)
 * @cssprop --scale-pressed    - 押下時のスケール (0.96)
 * @cssprop --duration-fast    - アニメーション時間 (70ms)
 * @cssprop --ease-out         - イージング関数
 * @cssprop --focus-ring-width  - フォーカスリング幅
 * @cssprop --focus-ring-color  - フォーカスリング色
 * @cssprop --focus-ring-offset - フォーカスリングオフセット
 * @cssprop --animation-focus  - Adaptive Focus アニメーション
 * @cssprop --control-min-touch - 最低タッチターゲットサイズ (44px)
 * @cssprop --text-base        - 標準フォントサイズ (14px)
 * @cssprop --text-sm          - 小フォントサイズ (13px)
 * @cssprop --space-2          - スペーシング (8px)
 * @cssprop --line-height-normal - 標準行間 (1.5)
 *
 * @csspart control - チェックボックスのコントロール要素（スタイリング用）
 * @csspart label   - ラベルテキスト要素
 *
 * @example
 * ```html
 * <!-- 基本的な使用 -->
 * <ui-checkbox label="利用規約に同意する" name="agree" value="yes"></ui-checkbox>
 *
 * <!-- 必須 -->
 * <ui-checkbox label="必須項目" name="required-check" required></ui-checkbox>
 *
 * <!-- 無効 -->
 * <ui-checkbox label="変更不可" name="locked" checked disabled></ui-checkbox>
 *
 * <!-- 中間状態（プログラム的に設定） -->
 * <ui-checkbox id="parent" label="すべて選択"></ui-checkbox>
 * <script>
 *   document.querySelector('#parent').indeterminate = true;
 * </script>
 * ```
 */
@customElement('ui-checkbox')
export class Checkbox extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      flex-direction: column;
      gap: var(--space-1, 4px);
    }

    /* ── ラベル行 ── */
    .wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      cursor: pointer;
      position: relative;
      user-select: none;
    }

    /* Disabled: ラベル行全体を薄く */
    :host([disabled]) .wrapper {
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
    }

    /* ── コントロール（見た目のチェックボックス） ── */
    .control {
      position: relative;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      border-radius: var(--radius-sm, 4px);
      border: var(--border-width, 1px) solid var(--border-muted, oklch(80% 0 0 / 0.4));
      background: var(--bg-fill-muted, oklch(95% 0 0));
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Touch Target: ::before で最低 44×44px を確保 */
    .control::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width: var(--control-min-touch, 44px);
      min-height: var(--control-min-touch, 44px);
      pointer-events: none;
    }

    /* Hover */
    .wrapper:hover:not([aria-disabled='true']) .control {
      border-color: var(--border-default, oklch(70% 0 0 / 0.6));
    }

    /* Active: タクタイルフィードバック */
    .wrapper:active:not([aria-disabled='true']) .control {
      transform: scale(var(--scale-pressed, 0.96));
    }

    /* Checked / Indeterminate */
    .control[data-state='checked'],
    .control[data-state='mixed'] {
      background: var(--primary, oklch(60% 0.15 250));
      border-color: var(--primary, oklch(60% 0.15 250));
    }

    /* Error State: visible error 時のみ境界線を強調 */
    .control.control-error {
      border-color: var(--border-danger, oklch(55% 0.2 28));
    }

    /* ── SVG アイコン ── */
    .icon {
      display: none;
      width: 12px;
      height: 12px;
      color: var(--on-primary, oklch(100% 0 0));
      pointer-events: none;
      flex-shrink: 0;
    }

    .control[data-state='checked'] .icon-check {
      display: block;
    }

    .control[data-state='mixed'] .icon-minus {
      display: block;
    }

    /* ── フォーカスリング ── */
    .control:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    .control.control-error:focus-visible {
      outline-color: var(--border-danger, oklch(55% 0.2 28));
    }

    /* ── ラベルテキスト ── */
    .label {
      font-size: var(--text-base, 14px);
      color: var(--fg-default, oklch(20% 0 0));
      line-height: var(--line-height-normal, 1.5);
    }

    /* ── エラーメッセージ ── */
    .error-message {
      font-size: var(--text-sm, 13px);
      color: var(--fg-danger, oklch(55% 0.2 28));
      line-height: var(--line-height-normal, 1.5);
    }

    /* ── Reduced Motion ── */
    @media (prefers-reduced-motion: reduce) {
      .control {
        transition-duration: 0.01ms;
      }
    }

    /* ── Forced Colors Mode ── */
    @media (forced-colors: active) {
      .control {
        border: 2px solid CanvasText;
        background: Canvas;
      }

      .control[data-state='checked'],
      .control[data-state='mixed'] {
        background: Highlight;
        border-color: CanvasText;
      }

      .icon {
        color: HighlightText;
      }

      .control:focus-visible {
        outline: 3px solid CanvasText;
        box-shadow: none;
      }
    }
  `;

  // Form Association を有効化
  static formAssociated = true;

  /**
   * 選択状態
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  checked = false;

  /**
   * 中間状態（親項目の「一部選択」を示す）
   * プログラム的にのみ設定可能。属性での設定は無視します。
   * ユーザー操作（Space キー）による遷移先は checked: false です。
   * @default false
   */
  @property({ type: Boolean, attribute: false })
  indeterminate = false;

  /**
   * フォーム送信時の識別子
   */
  @property({ type: String, reflect: true })
  name = '';

  /**
   * フォーム送信時の値
   * @default 'on'
   */
  @property({ type: String, reflect: true })
  value = 'on';

  /**
   * ラベルテキスト
   */
  @property({ type: String, reflect: true })
  label = '';

  /**
   * 無効化
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * 必須入力（チェックが必須であることを示す）
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  required = false;

  /**
   * バリデーションエラー状態（外部から設定）
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  invalid = false;

  /**
   * エラーメッセージ
   */
  @property({ type: String, attribute: 'error-message', reflect: true })
  errorMessage = '';

  private _internals: ElementInternals;
  private _defaultChecked = false;
  private _hasInitializedDefaults = false;
  private readonly _ariaAttributeObserver =
    typeof MutationObserver === 'function'
      ? new MutationObserver((records) => {
          const hasRelevantChange = records.some(
            (record) =>
              record.type === 'attributes' &&
              (record.attributeName === 'aria-label' ||
                record.attributeName === 'aria-labelledby' ||
                record.attributeName === 'aria-describedby'),
          );

          if (hasRelevantChange) {
            this.requestUpdate();
          }
        })
      : null;

  // 一意な ID（レンダリング毎の再生成を防止）
  private readonly _controlId = `checkbox-${Math.random().toString(36).substring(2, 11)}`;
  private readonly _labelId = `checkbox-label-${Math.random().toString(36).substring(2, 11)}`;
  private readonly _errorId = `checkbox-error-${Math.random().toString(36).substring(2, 11)}`;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this._hasInitializedDefaults) {
      this._defaultChecked = this.checked;
      this._hasInitializedDefaults = true;
    }

    // indeterminate は属性から受け付けないため、初期化時に外部属性を除去
    this.removeAttribute('indeterminate');
    this._syncIndeterminateAttribute();
    this._syncFormValue();
    this._syncValidity();
    this._ariaAttributeObserver?.observe(this, {
      attributes: true,
      attributeFilter: ['aria-label', 'aria-labelledby', 'aria-describedby'],
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._ariaAttributeObserver?.disconnect();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    // checked と indeterminate の矛盾状態は保持しません。
    if (
      (changedProperties.has('checked') || changedProperties.has('indeterminate')) &&
      this.checked
    ) {
      this.indeterminate = false;
    }
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (
      changedProperties.has('indeterminate') ||
      changedProperties.has('checked') ||
      changedProperties.has('disabled') ||
      changedProperties.has('name') ||
      changedProperties.has('value')
    ) {
      this._syncIndeterminateAttribute();
      this._syncFormValue();
    }

    if (
      changedProperties.has('checked') ||
      changedProperties.has('required') ||
      changedProperties.has('invalid') ||
      changedProperties.has('errorMessage')
    ) {
      this._syncValidity();
    }
  }

  /** indeterminate 状態をスタイル用に属性へ反映 */
  private _syncIndeterminateAttribute(): void {
    if (this.indeterminate) {
      this.setAttribute('indeterminate', '');
      return;
    }
    this.removeAttribute('indeterminate');
  }

  /** フォーム値を ElementInternals に同期 */
  private _syncFormValue(): void {
    const formValue = this.checked && !this.disabled && this.name ? this.value : null;
    const formState = this.checked ? 'checked' : 'unchecked';
    this._internals.setFormValue(formValue, formState);
  }

  /** バリデーション状態を ElementInternals に同期 */
  private _syncValidity(): void {
    if (this.disabled) {
      this._internals.setValidity({});
      return;
    }

    if (this.invalid) {
      const message = this.errorMessage || '入力内容を確認してください。';
      this._internals.setValidity({ customError: true }, message);
      return;
    }

    if (this.required && !this.checked) {
      this._internals.setValidity({ valueMissing: true }, 'このチェックボックスは必須です。');
      return;
    }

    this._internals.setValidity({});
  }

  /** クリック / Space キーによるトグル */
  private _handleToggle = (): void => {
    if (this.disabled) return;

    if (this.indeterminate) {
      // Indeterminate → Unchecked（仕様: Space キーによる遷移先は false）
      this.indeterminate = false;
      this.checked = false;
    } else {
      this.checked = !this.checked;
    }

    this._syncFormValue();
    this._syncValidity();

    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  /** キーボード操作: Space でトグル */
  private _handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === ' ') {
      e.preventDefault();
      this._handleToggle();
    }
  };

  /** ラベルクリックでトグル（span は labelable ではないため手動連携） */
  private _handleLabelClick = (e: MouseEvent): void => {
    e.preventDefault();
    this.focus();
    this._handleToggle();
  };

  /**
   * label は通常フォーカスを受けないため、キーボード操作主体にはしません。
   * lit-a11y の契約を満たすために no-op で受け取ります。
   */
  private _handleLabelKeyDown = (event: KeyboardEvent): void => {
    void event;
  };

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

  /**
   * コントロールにフォーカスを当てる
   */
  override focus(options?: FocusOptions): void {
    if (this.disabled) return;
    this.shadowRoot?.querySelector<HTMLElement>('.control')?.focus(options);
  }

  /**
   * コントロールからフォーカスを外す
   */
  override blur(): void {
    this.shadowRoot?.querySelector<HTMLElement>('.control')?.blur();
  }

  /**
   * ラベルはクリック領域としてのみ扱い、キーボード操作主体にはしません。
   */
  private _renderLabel() {
    if (!this.label) {
      return nothing;
    }

    return html`<label
      id="${this._labelId}"
      class="label"
      part="label"
      @click="${this._handleLabelClick}"
      @keydown="${this._handleLabelKeyDown}"
      >${this.label}</label
    >`;
  }

  /**
   * フォームリセット時は初期 checked に戻し、indeterminate は常に解除します。
   */
  formResetCallback(): void {
    this.checked = this._defaultChecked;
    this.indeterminate = false;
    this._syncIndeterminateAttribute();
    this._syncFormValue();
    this._syncValidity();
  }

  /**
   * ブラウザ復元時は checked を復元し、indeterminate は復元対象に含めません。
   */
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string') {
      this.checked = state === 'checked';
    } else if (state === null) {
      this.checked = false;
    }

    this.indeterminate = false;
    this._syncIndeterminateAttribute();
    this._syncFormValue();
    this._syncValidity();
  }

  override render() {
    const ariaChecked = this.indeterminate ? 'mixed' : String(this.checked);
    const controlState = this.indeterminate ? 'mixed' : this.checked ? 'checked' : 'unchecked';
    const showError = this.invalid && this.errorMessage.length > 0;
    const isInvalid = this.invalid || (this.required && !this.checked && !this.disabled);
    const externalLabel = this.getAttribute('aria-label');
    const externalLabelledBy = this.getAttribute('aria-labelledby');
    const externalDescribedBy = this.getAttribute('aria-describedby');
    const ariaDescribedByIds: string[] = [];
    if (externalDescribedBy) ariaDescribedByIds.push(externalDescribedBy);
    if (showError) ariaDescribedByIds.push(this._errorId);
    const ariaDescribedBy = ariaDescribedByIds.join(' ');
    const ariaLabelledBy = this.label ? this._labelId : externalLabelledBy;
    const ariaLabel = this.label || externalLabelledBy ? nothing : (externalLabel ?? nothing);
    const controlClass = showError ? 'control control-error' : 'control';

    return html`
      <div class="wrapper" aria-disabled="${this.disabled ? 'true' : nothing}">
        <!-- Control: キーボードフォーカスを受け取る。クリック・Space でトグル -->
        <span
          id="${this._controlId}"
          class="${controlClass}"
          part="control"
          role="checkbox"
          data-state="${controlState}"
          aria-checked="${ariaChecked}"
          aria-disabled="${this.disabled ? 'true' : nothing}"
          aria-required="${this.required ? 'true' : nothing}"
          aria-invalid="${isInvalid ? 'true' : nothing}"
          aria-describedby="${ariaDescribedBy || nothing}"
          aria-label="${ariaLabel}"
          aria-labelledby="${ariaLabelledBy ?? nothing}"
          tabindex="${this.disabled ? '-1' : '0'}"
          @click="${this._handleToggle}"
          @keydown="${this._handleKeyDown}"
        >
          <!-- Check アイコン (checked 時) -->
          <svg
            class="icon icon-check"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="2,6 5,9 10,3"></polyline>
          </svg>

          <!-- Minus アイコン (indeterminate 時) -->
          <svg
            class="icon icon-minus"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <line x1="2" y1="6" x2="10" y2="6"></line>
          </svg>
        </span>

        <!-- ラベル: クリックでコントロールにフォーカスを移してトグル -->
        ${this._renderLabel()}
      </div>

      <!-- エラーメッセージ -->
      ${showError
        ? html`
            <span id="${this._errorId}" class="error-message" role="status" aria-live="polite">
              ${this.errorMessage}
            </span>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-checkbox': Checkbox;
  }
}
