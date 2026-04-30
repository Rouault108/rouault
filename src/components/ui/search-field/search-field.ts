import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import '../icon/icon.js';

let searchFieldInstanceCounter = 0;

type AriaExpandedValue = 'true' | 'false' | '';
type AriaAutocompleteValue = 'list' | 'both' | 'inline' | 'none' | '';
type SelectionDirectionValue = 'forward' | 'backward' | 'none';

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
 * 検索入力フィールド (Search Field) コンポーネント
 *
 * 検索専用の入力体験を統一するための軽量コンポーネントです。
 * 検索アイコン、クリアボタン、Combobox 用 ARIA の受け皿を内包します。
 */
@customElement('ui-search-field')
export class SearchField extends LitElement {
  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 8px);
      inline-size: 100%;
      --ui-search-field-height: 44px;
      --ui-search-field-radius: var(--radius-sm, 4px);
      --ui-search-field-bg: var(--bg-control-muted, var(--bg-fill-muted, oklch(95% 0 0)));
      --ui-search-field-border-width: 0px;
      --ui-search-field-border-color: transparent;
      --ui-search-field-shadow: none;
      --ui-search-field-font-size: var(--text-xl, 18px);
      --ui-search-field-icon-color: var(--fg-control-affordance, var(--fg-subtle));
    }

    [hidden] {
      display: none !important;
    }

    .label {
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      color: var(--fg-default, oklch(20% 0 0));
    }

    .label--hidden {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }

    .field {
      box-sizing: border-box;
      position: relative;
      display: flex;
      align-items: center;
      min-block-size: var(--ui-search-field-height);
      border: var(--ui-search-field-border-width) solid var(--ui-search-field-border-color);
      border-radius: var(--ui-search-field-radius);
      background: var(--ui-search-field-bg);
      box-shadow: var(--ui-search-field-shadow);
    }

    .field::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      inline-size: 100%;
      block-size: var(--control-min-touch, 24px);
      pointer-events: none;
    }

    .icon {
      position: absolute;
      inset-block-start: 50%;
      inset-inline-start: var(--space-3, 12px);
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--ui-search-field-icon-color);
      pointer-events: none;
    }

    .icon ui-icon {
      inline-size: var(--icon-md, 18px);
      block-size: var(--icon-md, 18px);
      font-size: var(--icon-md, 18px);
    }

    input {
      -webkit-appearance: none;
      appearance: none;
      margin: 0;
      display: block;

      inline-size: 100%;
      min-block-size: var(--ui-search-field-height);
      block-size: var(--ui-search-field-height);

      border: none;
      background: transparent;
      color: var(--fg-default, oklch(20% 0 0));
      font: inherit;
      font-size: var(--ui-search-field-font-size);

      line-height: var(--ui-search-field-height);
      padding-block: 0;

      padding-inline-start: calc(16px + var(--space-5, 20px));
      padding-inline-end: calc(28px + var(--space-4, 16px));

      outline: none;
      box-sizing: border-box;
    }

    input::placeholder {
      color: var(--fg-placeholder, var(--fg-muted));
      opacity: 1;
    }

    input::-webkit-search-cancel-button,
    input::-webkit-search-decoration,
    input::-webkit-search-results-button,
    input::-webkit-search-results-decoration {
      -webkit-appearance: none;
      appearance: none;
      display: none;
    }

    input::-ms-clear,
    input::-ms-reveal {
      display: none;
      inline-size: 0;
      block-size: 0;
    }

    input:focus-visible {
      outline: var(--focus-ring-width, 2px) solid
        var(--ui-search-field-focus-ring-color, var(--focus-ring-color, oklch(60% 0.15 250)));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
      border-radius: var(--radius-sm, 6px);
    }

    input:disabled {
      color: var(--fg-disabled);
      cursor: not-allowed;
    }

    input:read-only:not(:disabled) {
      cursor: default;
    }

    .clear-button {
      position: absolute;
      inset-block-start: 50%;
      inset-inline-end: var(--space-2, 8px);
      transform: translateY(-50%);
      inline-size: 28px;
      block-size: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: var(--radius-sm, 6px);
      background: transparent;
      color: var(--fg-control-affordance, var(--fg-subtle));
      cursor: pointer;
      padding: 0;
      transition:
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)),
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    .clear-button::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      inline-size: var(--control-min-touch, 24px);
      block-size: var(--control-min-touch, 24px);
      pointer-events: none;
    }

    .clear-button:hover {
      color: var(--fg-default, oklch(20% 0 0));
      background: var(--bg-hover, oklch(93% 0 0));
    }

    .clear-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid
        var(--ui-search-field-focus-ring-color, var(--focus-ring-color, oklch(60% 0.15 250)));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
    }

    .clear-button ui-icon {
      inline-size: var(--icon-sm, 14px);
      block-size: var(--icon-sm, 14px);
      font-size: var(--icon-sm, 14px);
    }

    @media (prefers-reduced-motion: reduce) {
      input,
      .clear-button {
        transition-duration: 0.01ms;
      }
    }

    @media (forced-colors: active) {
      .field {
        background: Field;
        border-color: FieldText;
      }

      input {
        color: FieldText;
      }

      input:disabled {
        color: GrayText;
      }

      .clear-button {
        border: var(--border-width, 1px) solid ButtonText;
        color: ButtonText;
      }
    }

    :host([disabled]) {
      --ui-search-field-icon-color: var(--fg-disabled);
    }
  `;

  @property({ type: String })
  label = '';

  @property({ type: Boolean, attribute: 'hide-label' })
  hideLabel = false;

  @property({ type: String })
  name = '';

  @property({ type: String })
  placeholder = '';

  @property({ type: String })
  value = '';

  @property({ type: String })
  autocomplete = 'off';

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  readonly = false;

  @property({ type: Boolean, reflect: true })
  clearable = true;

  @property({ type: String, attribute: 'clear-button-label' })
  clearButtonLabel = '検索をクリア';

  @property({ type: String, attribute: false })
  inputRole = '';

  @property({ type: String, attribute: false })
  inputAriaControls = '';

  @property({ type: String, attribute: false })
  inputAriaExpanded: AriaExpandedValue = '';

  @property({ type: String, attribute: false })
  inputAriaAutocomplete: AriaAutocompleteValue = '';

  @property({ type: String, attribute: false })
  inputAriaActivedescendant = '';

  @property({ type: String, attribute: false })
  inputAriaBusy: AriaExpandedValue = '';

  @property({ type: String, attribute: false })
  inputAriaDescribedby = '';

  @property({ type: String, attribute: 'enterkeyhint' })
  override enterKeyHint = '';

  @property({ type: String, attribute: 'inputmode' })
  override inputMode = '';

  @property({ attribute: 'spellcheck', converter: spellcheckConverter })
  override spellcheck = false;

  @property({ type: String })
  override autocapitalize = '';

  @query('input')
  private _input!: HTMLInputElement;

  @query('.clear-button')
  private _clearButton?: HTMLButtonElement;

  private readonly _instanceId = `ui-search-field-${(++searchFieldInstanceCounter).toString()}`;
  private readonly _inputId = `${this._instanceId}-input`;
  private _hasExplicitSpellcheck = false;

  override connectedCallback(): void {
    super.connectedCallback();

    if (!this.label) {
      console.error(
        '[ui-search-field]: label は必須です。アクセシビリティのためにラベルを提供してください。',
        this,
      );
    }
  }

  override willUpdate(changedProperties: Map<string, unknown>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('spellcheck') || this.hasAttribute('spellcheck')) {
      this._hasExplicitSpellcheck = true;
    }
  }

  get clearButtonVisible(): boolean {
    return this.clearable && !this.disabled && !this.readonly && this.value.length > 0;
  }

  override focus(options?: FocusOptions): void {
    this._input.focus(options);
  }

  override blur(): void {
    this._input.blur();
  }

  select(): void {
    this._input.select();
  }

  setSelectionRange(start: number, end: number, direction?: SelectionDirectionValue): void {
    this._input.setSelectionRange(start, end, direction);
  }

  clear(options?: FocusOptions): void {
    if (this.disabled || this.readonly) return;

    this.value = '';
    this._input.value = '';

    this._dispatchInputEvent();
    this.focus(options);
  }

  focusClearButton(): void {
    if (!this.clearButtonVisible) return;
    this._clearButton?.focus();
  }

  private _handleInput = (event: Event): void => {
    event.stopPropagation();

    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    this.value = input.value;
    this._dispatchInputEvent();
  };

  private _handleChange = (event: Event): void => {
    event.stopPropagation();

    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    this.value = input.value;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  private _handleFocus = (): void => {
    this.dispatchEvent(new FocusEvent('focus'));
  };

  private _handleBlur = (): void => {
    this.dispatchEvent(new FocusEvent('blur'));
  };

  private _handleClearClick = (): void => {
    this.clear({ preventScroll: true });
  };

  private _dispatchInputEvent(): void {
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  override render() {
    const labelClasses = {
      label: true,
      'label--hidden': this.hideLabel,
    };

    return html`
      <label for=${this._inputId} class=${classMap(labelClasses)}> ${this.label} </label>

      <div class="field">
        <span class="icon" aria-hidden="true">
          <ui-icon name="search"></ui-icon>
        </span>

        <input
          id=${this._inputId}
          type="search"
          name=${this.name}
          .value=${live(this.value)}
          placeholder=${this.placeholder}
          autocomplete=${this.autocomplete}
          .disabled=${this.disabled}
          .readOnly=${this.readonly}
          role=${ifDefined(this.inputRole || undefined)}
          aria-controls=${ifDefined(this.inputAriaControls || undefined)}
          aria-expanded=${ifDefined(this.inputAriaExpanded || undefined)}
          aria-autocomplete=${ifDefined(this.inputAriaAutocomplete || undefined)}
          aria-activedescendant=${ifDefined(this.inputAriaActivedescendant || undefined)}
          aria-busy=${ifDefined(this.inputAriaBusy || undefined)}
          aria-describedby=${ifDefined(this.inputAriaDescribedby || undefined)}
          enterkeyhint=${ifDefined(this.enterKeyHint || undefined)}
          inputmode=${ifDefined(this.inputMode || undefined)}
          spellcheck=${ifDefined(this._hasExplicitSpellcheck ? String(this.spellcheck) : undefined)}
          autocapitalize=${ifDefined(this.autocapitalize || undefined)}
          @input=${this._handleInput}
          @change=${this._handleChange}
          @focus=${this._handleFocus}
          @blur=${this._handleBlur}
        />

        <button
          class="clear-button"
          type="button"
          aria-label=${this.clearButtonLabel}
          .hidden=${!this.clearButtonVisible}
          @click=${this._handleClearClick}
        >
          <ui-icon name="circle-x" aria-hidden="true"></ui-icon>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-search-field': SearchField;
  }
}
