import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type SpinnerSize = 'default' | 'lg';

const VALID_SIZES = new Set<SpinnerSize>(['default', 'lg']);
const DEFAULT_LABEL = '読み込み中';

@customElement('ui-spinner')
export class UiSpinner extends LitElement {
  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'role'];
  }

  static override styles = css`
    :host {
      --spinner-size: 1em;
      --spinner-rotation-duration: 2s;
      --spinner-dash-duration: 1.5s;
      --spinner-stroke-width: 10%;

      display: inline-flex;
      inline-size: var(--spinner-size);
      block-size: var(--spinner-size);
      color: currentColor;
      vertical-align: middle;
    }

    :host([size='lg']) {
      --spinner-size: var(--icon-xl, 32px);
    }

    svg {
      inline-size: 100%;
      block-size: 100%;
      transform-origin: center;
      animation: ui-spinner-rotate var(--spinner-rotation-duration) linear infinite;
    }

    .spinner-circle {
      fill: none;
      stroke: currentColor;
      stroke-width: var(--spinner-stroke-width);
      stroke-linecap: round;
      stroke-dasharray: 1 126;
      stroke-dashoffset: 0;
      animation: ui-spinner-dash var(--spinner-dash-duration)
        var(--ease-in-out, cubic-bezier(0.4, 0, 0.2, 1)) infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      svg,
      .spinner-circle {
        animation: none;
      }

      .spinner-circle {
        stroke-dasharray: 80 126;
        stroke-dashoffset: -20;
      }
    }

    @media (forced-colors: active) {
      :host {
        color: CanvasText;
        forced-color-adjust: auto;
      }
    }

    @media print {
      :host {
        display: none !important;
      }
    }

    @keyframes ui-spinner-rotate {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes ui-spinner-dash {
      0% {
        stroke-dasharray: 1 126;
        stroke-dashoffset: 0;
      }

      50% {
        stroke-dasharray: 80 126;
        stroke-dashoffset: -20;
      }

      100% {
        stroke-dasharray: 80 126;
        stroke-dashoffset: -100;
      }
    }
  `;

  @property({ type: String, reflect: true })
  size: SpinnerSize = 'default';

  @property({ type: String, attribute: 'aria-label' })
  label = DEFAULT_LABEL;

  private _isSyncingA11y = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._syncHostA11y();
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value);

    if ((name === 'role' || name === 'aria-label') && !this._isSyncingA11y) {
      this._syncHostA11y();
    }
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('size') && !VALID_SIZES.has(this.size)) {
      this.size = 'default';
    }
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('size') || changedProperties.has('label')) {
      this._syncHostA11y();
    }
  }

  private get _resolvedLabel(): string {
    const rawLabel = typeof this.label === 'string' ? this.label : '';
    const trimmedLabel = rawLabel.trim();
    return trimmedLabel === '' ? DEFAULT_LABEL : trimmedLabel;
  }

  private _syncHostA11y(): void {
    if (this._isSyncingA11y) {
      return;
    }

    this._isSyncingA11y = true;
    try {
      if (this.getAttribute('role') !== 'status') {
        this.setAttribute('role', 'status');
      }

      const resolvedLabel = this._resolvedLabel;
      if (this.getAttribute('aria-label') !== resolvedLabel) {
        this.setAttribute('aria-label', resolvedLabel);
      }
    } finally {
      this._isSyncingA11y = false;
    }
  }

  override render(): TemplateResult {
    return html`
      <svg viewBox="0 0 50 50" aria-hidden="true" focusable="false">
        <circle class="spinner-circle" cx="25" cy="25" r="20"></circle>
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-spinner': UiSpinner;
  }
}
