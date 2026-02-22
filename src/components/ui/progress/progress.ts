import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

interface ImportMetaEnvLike {
  DEV?: boolean;
}

const DEFAULT_MAX = 100;
const DEFAULT_VALUE = 0;
const MIN_VALUE = 0;
const IS_DEVELOPMENT = (import.meta as ImportMeta & { env?: ImportMetaEnvLike }).env?.DEV ?? true;

const normalizeNumber = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

@customElement('ui-progress')
export class UiProgress extends LitElement {
  static override styles = css`
    :host {
      display: block;
      --ui-progress-track-height: 4px;
      --ui-progress-bar-background: var(--primary);
    }

    .track {
      position: relative;
      overflow: hidden;
      block-size: var(--ui-progress-track-height);
      border-radius: var(--radius-full, 9999px);
      background: var(--bg-fill-neutral, oklch(92% 0.01 250));
    }

    .bar {
      block-size: 100%;
      inline-size: 0%;
      border-radius: var(--radius-full, 9999px);
      background: var(--ui-progress-bar-background);
      transition: width var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    @media (prefers-reduced-motion: reduce) {
      .bar {
        transition: none;
      }
    }

    @media (forced-colors: active) {
      .track {
        border: 1px solid CanvasText;
        background: Canvas;
      }

      .bar {
        background: Highlight;
        border: 1px solid Highlight;
      }
    }

    @media print {
      .track {
        border: 1px solid black;
        background: white !important;
      }

      .bar {
        background: black !important;
        transition: none;
      }
    }
  `;

  @property({ type: Number, reflect: true })
  value = DEFAULT_VALUE;

  @property({ type: Number, reflect: true })
  max = DEFAULT_MAX;

  @property({ type: String })
  label?: string;

  @property({ type: String, attribute: 'value-text' })
  valueText?: string;

  @property({ type: String, attribute: 'aria-labelledby' })
  ariaLabelledBy?: string;

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('max')) {
      const normalizedMax = this._normalizeMax(this.max);
      if (this.max !== normalizedMax) {
        this.max = normalizedMax;
      }
    }

    if (changedProperties.has('value') || changedProperties.has('max')) {
      const normalizedValue = this._normalizeValue(this.value, this.max);
      if (this.value !== normalizedValue) {
        this.value = normalizedValue;
      }
    }
  }

  private _normalizeMax(candidate: number): number {
    const normalized = normalizeNumber(candidate, DEFAULT_MAX);
    if (normalized > 0) return normalized;

    if (IS_DEVELOPMENT) {
      console.error(
        `[ui-progress] max には 0 より大きい数値を指定してください。received=${String(candidate)}。max=${String(DEFAULT_MAX)} にフォールバックします。`,
      );
    }

    return DEFAULT_MAX;
  }

  private _normalizeValue(candidate: number, max: number): number {
    const normalized = normalizeNumber(candidate, DEFAULT_VALUE);
    return clamp(normalized, MIN_VALUE, max);
  }

  private get _clampedValue(): number {
    return this._normalizeValue(this.value, this.max);
  }

  private get _rawPercentage(): number {
    if (this.max <= 0) return 0;
    return (this._clampedValue / this.max) * 100;
  }

  private get _roundedPercentage(): number {
    return Math.round(this._rawPercentage);
  }

  private get _resolvedValueText(): string {
    const normalized = this.valueText?.trim();
    if (normalized && normalized.length > 0) {
      return normalized;
    }

    return `${String(this._roundedPercentage)}%`;
  }

  private get _resolvedAriaLabelledBy(): string | undefined {
    const normalized = this.ariaLabelledBy?.trim();
    if (!normalized) return undefined;
    return normalized;
  }

  private get _resolvedAriaLabel(): string | undefined {
    if (this._resolvedAriaLabelledBy !== undefined) {
      return undefined;
    }

    const normalized = this.label?.trim();
    if (!normalized) return undefined;
    return normalized;
  }

  private get _barWidth(): string {
    return `${String(this._rawPercentage)}%`;
  }

  override render(): TemplateResult {
    return html`
      <div
        class="track"
        role="progressbar"
        aria-valuenow="${this._clampedValue}"
        aria-valuemin="${MIN_VALUE}"
        aria-valuemax="${this.max}"
        aria-valuetext="${this._resolvedValueText}"
        aria-label="${ifDefined(this._resolvedAriaLabel)}"
        aria-labelledby="${ifDefined(this._resolvedAriaLabelledBy)}"
      >
        <div class="bar" style="width: ${this._barWidth};"></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-progress': UiProgress;
  }
}
