import { css, html, LitElement, nothing, type TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';

let inputInstanceCounter = 0;

type InputVariant = 'filled' | 'outline';
type InputType = 'text' | 'email' | 'password' | 'tel' | 'url';
type RequiredIndicator = 'text' | 'asterisk' | 'none';

const SUPPORTED_VARIANTS: readonly InputVariant[] = ['filled', 'outline'];
const SUPPORTED_TYPES: readonly InputType[] = ['text', 'email', 'password', 'tel', 'url'];
const SUPPORTED_REQUIRED_INDICATORS: readonly RequiredIndicator[] = ['text', 'asterisk', 'none'];

const spellcheckConverter = {
  fromAttribute(value: string | null): boolean | undefined {
    if (value === null) {
      return undefined;
    }

    return value !== 'false';
  },
  toAttribute(value: boolean | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    return value ? 'true' : 'false';
  },
};

/**
 * 単一行の text-like 入力を提供するフォーム関連付けコンポーネントです。
 *
 * `label` をアクセシブル名の正準ソースとし、`helpText` / `errorMessage` /
 * ElementInternals の妥当性同期を一体で扱います。
 */
@customElement('ui-input')
export class Input extends LitElement {
  static formAssociated = true;

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

    .label {
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      color: var(--fg-default, oklch(20% 0 0));
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
    }

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

    .required-indicator {
      color: inherit;
    }

    input {
      width: 100%;
      max-width: 100%;
      height: var(--control-height-md, 32px);
      padding: 0 var(--space-2, 8px);
      box-sizing: border-box;
      border-radius: var(--radius-md, 6px);
      border: var(--border-width, 1px) solid transparent;
      font-family: inherit;
      font-size: var(--text-base, 14px);
      background: var(--bg-fill-muted, oklch(95% 0 0));
      color: var(--fg-default, oklch(20% 0 0));
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        outline-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    input:focus {
      outline: none;
      background: var(--bg-default, oklch(100% 0 0));
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
    }

    input:hover:not(:disabled):not(:focus) {
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
    }

    input:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    input.error {
      border-color: var(--border-danger, oklch(55% 0.2 28));
      background: var(--bg-danger-subtle, oklch(95% 0.02 28));
    }

    input:disabled {
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
      color: var(--fg-subtle, oklch(48% 0 0));
    }

    input:read-only {
      background: var(--bg-fill-muted, oklch(95% 0 0));
      cursor: default;
    }

    :host([variant='outline']) input:read-only {
      background: var(--bg-default, oklch(100% 0 0));
    }

    .help-text,
    .error-message {
      font-size: var(--text-sm, 13px);
      margin-top: var(--space-1, 4px);
      line-height: var(--line-height-normal, 1.5);
    }

    .help-text {
      color: var(--fg-muted, oklch(48% 0 0));
    }

    .error-message {
      color: var(--fg-danger, oklch(55% 0.2 28));
    }

    @media (prefers-reduced-motion: reduce) {
      input {
        transition-duration: 0.01ms;
      }
    }

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

  @property({ type: String, reflect: true })
  label = '';

  @property({ type: Boolean, attribute: 'hide-label', reflect: true })
  hideLabel = false;

  @property({ type: String, reflect: true })
  variant: InputVariant = 'filled';

  @property({ type: String, reflect: true })
  type: InputType = 'text';

  @property({ type: String, reflect: true })
  name = '';

  @property({ type: String, reflect: true })
  placeholder = '';

  @property({ type: String })
  value = '';

  @property({ type: String, attribute: 'default-value', reflect: true })
  defaultValue = '';

  @property({ type: String, attribute: 'help-text', reflect: true })
  helpText = '';

  @property({ type: String, attribute: 'error-message', reflect: true })
  errorMessage = '';

  @property({ type: Boolean, reflect: true })
  error = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  readonly = false;

  @property({ type: Boolean, reflect: true })
  required = false;

  @property({ type: String, attribute: 'required-indicator', reflect: true })
  requiredIndicator: RequiredIndicator = 'text';

  @property({ type: String, reflect: true })
  pattern = '';

  @property({ type: Number, reflect: true })
  minlength?: number;

  @property({ type: Number, reflect: true })
  maxlength?: number;

  @property({ type: String, reflect: true })
  autocomplete = '';

  @property({ type: String, reflect: true })
  inputmode = '';

  @property({ type: String, reflect: true })
  enterkeyhint = '';

  @property({ type: String, reflect: true })
  override autocapitalize = '';

  @property({ attribute: 'spellcheck', reflect: true, converter: spellcheckConverter })
  override spellcheck = false;

  @property({ type: String, attribute: 'described-by', reflect: true })
  describedBy = '';

  @query('input')
  private _input?: HTMLInputElement;

  private readonly _internals: ElementInternals;
  private readonly _instanceId = `ui-input-${(++inputInstanceCounter).toString()}`;
  private readonly _inputId = `${this._instanceId}-input`;
  private readonly _helpId = `${this._instanceId}-help`;
  private readonly _errorId = `${this._instanceId}-error`;

  private _nativeErrorMessage = '';
  private _hasNativeError = false;
  private _formDisabled = false;
  private _hasExplicitSpellcheck = false;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._warnIfLabelMissing();
  }

  override firstUpdated(): void {
    this._syncFormValue();
    this._syncValidity();
  }

  override willUpdate(changedProperties: Map<string, unknown>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('type')) {
      this.type = this._normalizeEnumValue(
        'type',
        this.type,
        SUPPORTED_TYPES,
        'text',
        '[ui-input]: text-like 以外の type はサポートしません。',
      );
    }

    if (changedProperties.has('variant')) {
      this.variant = this._normalizeEnumValue(
        'variant',
        this.variant,
        SUPPORTED_VARIANTS,
        'filled',
      );
    }

    if (changedProperties.has('requiredIndicator')) {
      this.requiredIndicator = this._normalizeEnumValue(
        'requiredIndicator',
        this.requiredIndicator,
        SUPPORTED_REQUIRED_INDICATORS,
        'text',
      );
    }

    if (changedProperties.has('spellcheck') || this.hasAttribute('spellcheck')) {
      this._hasExplicitSpellcheck = true;
    }
  }

  override updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);

    if (changedProperties.has('label')) {
      this._warnIfLabelMissing();
    }

    if (changedProperties.has('value') || changedProperties.has('disabled')) {
      this._syncFormValue();
    }

    if (
      changedProperties.has('value') ||
      changedProperties.has('required') ||
      changedProperties.has('pattern') ||
      changedProperties.has('minlength') ||
      changedProperties.has('maxlength') ||
      changedProperties.has('type') ||
      changedProperties.has('error') ||
      changedProperties.has('errorMessage') ||
      changedProperties.has('disabled')
    ) {
      this._syncValidity();
    }

    if (changedProperties.has('error') || changedProperties.has('errorMessage')) {
      this._warnIfForcedErrorIsInvalid();
    }
  }

  override render(): TemplateResult {
    const hasError = this._hasError;
    const currentErrorMessage = this._currentErrorMessage;

    return html`
      <label
        for="${this._inputId}"
        class="${classMap({
      label: true,
      'label--hidden': this.hideLabel,
    })}"
      >
        <span>${this.label}</span>
        ${this._renderRequiredIndicator()}
      </label>

      <input
        id="${this._inputId}"
        type="${this.type}"
        name="${this.name}"
        .value="${live(this.value)}"
        placeholder="${this.placeholder}"
        ?disabled=${this._isDisabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        pattern="${ifDefined(this.pattern || undefined)}"
        minlength="${ifDefined(this.minlength?.toString())}"
        maxlength="${ifDefined(this.maxlength?.toString())}"
        autocomplete="${ifDefined(this.autocomplete || undefined)}"
        inputmode="${ifDefined(this.inputmode || undefined)}"
        enterkeyhint="${ifDefined(this.enterkeyhint || undefined)}"
        autocapitalize="${ifDefined(this.autocapitalize || undefined)}"
        spellcheck="${ifDefined(this._hasExplicitSpellcheck ? String(this.spellcheck) : undefined)}"
        aria-invalid="${String(hasError)}"
        aria-describedby="${ifDefined(this._ariaDescribedBy)}"
        class="${classMap({ error: hasError })}"
        @input="${this._handleInput}"
        @change="${this._handleChange}"
        @keydown="${this._handleKeyDown}"
        @focus="${this._handleFocus}"
        @blur="${this._handleBlur}"
      />

      ${!hasError && this.helpText
        ? html`<div class="help-text" id="${this._helpId}">${this.helpText}</div>`
        : nothing}
      ${currentErrorMessage
        ? html`<div class="error-message" id="${this._errorId}" role="status" aria-live="polite">
            ${currentErrorMessage}
          </div>`
        : nothing}
    `;
  }

  override focus(options?: FocusOptions): void {
    this._input?.focus(options);
  }

  override blur(): void {
    this._input?.blur();
  }

  select(): void {
    this._input?.select();
  }

  checkValidity(): boolean {
    this._syncValidity();
    return this._internals.checkValidity();
  }

  reportValidity(): boolean {
    this._syncValidity();
    return this._internals.reportValidity();
  }

  formResetCallback(): void {
    this.value = this.defaultValue;
    this.error = false;
    this.errorMessage = '';
    this._syncFormValue();
    this._syncValidity();
  }

  formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled;
    this._syncFormValue();
    this._syncValidity();
    this.requestUpdate();
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') {
      return;
    }

    this.value = state;
    this._syncFormValue();
    this._syncValidity();
  }

  private _handleInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.value = target.value;
  };

  private _handleChange = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.value = target.value;
  };

  private _handleKeyDown = (event: KeyboardEvent): void => {
    if (
      event.key !== 'Enter' ||
      event.isComposing ||
      this._isDisabled ||
      this.readonly ||
      !this._internals.form
    ) {
      return;
    }

    this._internals.form.requestSubmit();
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

  private _syncFormValue(): void {
    this._internals.setFormValue(this._isDisabled ? null : this.value);
  }

  private _syncValidity(): void {
    const previousHasNativeError = this._hasNativeError;
    const previousNativeErrorMessage = this._nativeErrorMessage;

    if (this._isDisabled) {
      this._hasNativeError = false;
      this._nativeErrorMessage = '';
      this._internals.setValidity({});
      this._requestErrorStateUpdate(previousHasNativeError, previousNativeErrorMessage);
      return;
    }

    if (this._hasForcedError) {
      this._hasNativeError = false;
      this._nativeErrorMessage = '';
      this._internals.setValidity({ customError: true }, this.errorMessage, this._input);
      this._requestErrorStateUpdate(previousHasNativeError, previousNativeErrorMessage);
      return;
    }

    if (!this._input) {
      return;
    }

    const validity = this._input.validity;
    const manualTooShort =
      this.minlength !== undefined && this.value.length > 0 && this.value.length < this.minlength;
    const manualTooLong = this.maxlength !== undefined && this.value.length > this.maxlength;

    if (!validity.valid || manualTooShort || manualTooLong) {
      this._hasNativeError = true;
      this._nativeErrorMessage = this._input.validationMessage || 'Invalid input';
      this._internals.setValidity(
        {
          valueMissing: validity.valueMissing,
          typeMismatch: validity.typeMismatch,
          patternMismatch: validity.patternMismatch,
          tooShort: validity.tooShort || manualTooShort,
          tooLong: validity.tooLong || manualTooLong,
          badInput: validity.badInput,
        },
        this._nativeErrorMessage,
        this._input,
      );
      this._requestErrorStateUpdate(previousHasNativeError, previousNativeErrorMessage);
      return;
    }

    this._hasNativeError = false;
    this._nativeErrorMessage = '';
    this._internals.setValidity({});
    this._requestErrorStateUpdate(previousHasNativeError, previousNativeErrorMessage);
  }

  private _requestErrorStateUpdate(
    previousHasNativeError: boolean,
    previousNativeErrorMessage: string,
  ): void {
    if (
      previousHasNativeError !== this._hasNativeError ||
      previousNativeErrorMessage !== this._nativeErrorMessage
    ) {
      queueMicrotask(() => {
        this.requestUpdate();
      });
    }
  }

  private _renderRequiredIndicator(): TemplateResult | typeof nothing {
    if (!this.required) {
      return nothing;
    }

    switch (this.requiredIndicator) {
      case 'asterisk':
        return html`<span class="required-indicator" aria-hidden="true">*</span>`;
      case 'none':
        return nothing;
      case 'text':
      default:
        return html`<span class="required-indicator">（必須）</span>`;
    }
  }

  private _warnIfLabelMissing(): void {
    if (this.label) {
      return;
    }

    console.error('[ui-input]: label は必須です。', this);
  }

  private _warnIfForcedErrorIsInvalid(): void {
    if (!this.error || this.errorMessage) {
      return;
    }

    console.warn('[ui-input]: error=true の場合、errorMessage は空にできません。', this);
  }

  private _normalizeEnumValue<T extends string>(
    propertyName: string,
    actualValue: string,
    supportedValues: readonly T[],
    fallbackValue: T,
    extraMessage = '',
  ): T {
    if (supportedValues.includes(actualValue as T)) {
      return actualValue as T;
    }

    console.warn(
      `[ui-input]: ${propertyName}="${actualValue}" はサポートされていません。${fallbackValue} に正規化します。`,
      extraMessage,
      this,
    );
    return fallbackValue;
  }

  private _joinDescribedByIds(internalId?: string): string | undefined {
    const ids = new Set<string>();
    for (const token of this.describedBy.split(/\s+/)) {
      const trimmed = token.trim();
      if (trimmed) {
        ids.add(trimmed);
      }
    }

    if (internalId) {
      ids.add(internalId);
    }

    if (ids.size === 0) {
      return undefined;
    }

    return Array.from(ids).join(' ');
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled;
  }

  private get _hasForcedError(): boolean {
    return this.error && this.errorMessage.length > 0;
  }

  private get _hasError(): boolean {
    if (this._isDisabled) {
      return false;
    }

    return this._hasForcedError || this._hasNativeError;
  }

  private get _currentErrorMessage(): string {
    if (this._isDisabled) {
      return '';
    }

    if (this._hasForcedError) {
      return this.errorMessage;
    }

    if (this._hasNativeError) {
      return this._nativeErrorMessage;
    }

    return '';
  }

  private get _ariaDescribedBy(): string | undefined {
    if (this._hasError && this._currentErrorMessage) {
      return this._joinDescribedByIds(this._errorId);
    }

    if (!this._hasError && this.helpText) {
      return this._joinDescribedByIds(this._helpId);
    }

    return this._joinDescribedByIds();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-input': Input;
  }
}
