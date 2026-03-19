import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface RadioLikeElement extends HTMLElement {
  checked: boolean;
  disabled: boolean;
}

/**
 * ラジオグループコンテナ。
 *
 * - `role="radiogroup"` とラベル付けを提供
 * - `required` 時に「いずれか1つ選択」の検証を提供
 */
@customElement('ui-radio-group')
export class RadioGroup extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 8px);
    }

    .error-message {
      margin-top: var(--space-1, 4px);
      font-size: var(--text-sm, 13px);
      color: var(--fg-danger, oklch(55% 0.2 28));
      line-height: var(--line-height-normal, 1.5);
    }
  `;

  @property({ type: String })
  label = '';

  @property({ type: Boolean, reflect: true })
  required = false;

  @property({ type: Boolean, reflect: true })
  invalid = false;

  @property({ type: String, attribute: 'error-message' })
  errorMessage = '';

  @state()
  private _errorId = `radio-group-error-${Math.random().toString(36).substring(2, 11)}`;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('change', this._handleChange as EventListener);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('change', this._handleChange as EventListener);
    super.disconnectedCallback();
  }

  /** グループ内の選択が有効か判定 */
  checkValidity(): boolean {
    if (!this.required) return true;
    return this._getRadios().some((radio) => radio.checked && !radio.disabled);
  }

  /** 検証して invalid/errorMessage を同期 */
  reportValidity(): boolean {
    const valid = this.checkValidity();
    this.invalid = !valid;
    if (!valid && !this.errorMessage) {
      this.errorMessage = 'いずれか1つを選択してください。';
    }
    if (valid && this.errorMessage === 'いずれか1つを選択してください。') {
      this.errorMessage = '';
    }
    return valid;
  }

  private _getRadios(): RadioLikeElement[] {
    const radios = this.querySelectorAll<RadioLikeElement>('ui-radio');
    return [...radios];
  }

  private _handleChange = (): void => {
    if (this.required) {
      this.reportValidity();
    }
  };

  override render() {
    const externalLabelledBy = this.getAttribute('aria-labelledby');
    const externalLabel = this.getAttribute('aria-label');
    const showError = this.invalid && this.errorMessage.length > 0;
    const describedBy = showError ? this._errorId : nothing;

    return html`
      <div
        class="group"
        role="radiogroup"
        aria-label="${this.label ? this.label : (externalLabel ?? nothing)}"
        aria-labelledby="${this.label ? nothing : (externalLabelledBy ?? nothing)}"
        aria-invalid="${showError ? 'true' : nothing}"
        aria-describedby="${describedBy}"
      >
        <slot
          @slotchange="${() => {
            this.requestUpdate();
          }}"
        ></slot>
      </div>
      ${showError
        ? html`
            <span id="${this._errorId}" class="error-message" aria-live="polite">
              ${this.errorMessage}
            </span>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-radio-group': RadioGroup;
  }
}
