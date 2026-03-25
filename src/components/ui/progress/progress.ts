import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface ImportMetaEnvLike {
  DEV?: boolean;
}

const DEFAULT_MAX = 100;
const DEFAULT_VALUE = 0;
const MIN_VALUE = 0;
const DECIMAL_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/u;
const IS_DEVELOPMENT = (import.meta as ImportMeta & { env?: ImportMetaEnvLike }).env?.DEV ?? true;

const strictNumberConverter = {
  fromAttribute(value: string | null): number | null {
    if (value === null) {
      return null;
    }

    const normalized = value.trim();
    if (normalized === '' || !DECIMAL_NUMBER_PATTERN.test(normalized)) {
      return Number.NaN;
    }

    return Number(normalized);
  },
  toAttribute(value: number): string | null {
    return String(value);
  },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const normalizeText = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized === '' ? undefined : normalized;
};

@customElement('ui-progress')
export class UiProgress extends LitElement {
  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'role'];
  }

  static override styles = css`
    :host {
      --ui-progress-track-size: 4px;
      --ui-progress-fill-color: var(--primary, oklch(56% 0.16 252));
      --ui-progress-track-color: var(--bg-fill-neutral, oklch(92% 0 0));
      --ui-progress-radius: var(--radius-full, 9999px);
      --ui-progress-duration: var(--duration-normal, 150ms);
      --ui-progress-easing: var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));

      display: block;
    }

    .track {
      position: relative;
      overflow: hidden;
      block-size: var(--ui-progress-track-size);
      border-radius: var(--ui-progress-radius);
      background: var(--ui-progress-track-color);
    }

    .fill {
      block-size: 100%;
      inline-size: calc(var(--_ui-progress-ratio, 0) * 100%);
      border-radius: inherit;
      background: var(--ui-progress-fill-color);
      transition: inline-size var(--ui-progress-duration) var(--ui-progress-easing);
    }

    .print-value {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      margin: -1px;
      padding: 0;
      border: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      clip-path: inset(50%);
      white-space: nowrap;
    }

    @media (prefers-reduced-motion: reduce) {
      .fill {
        transition: none;
      }
    }

    @media (forced-colors: active) {
      .track {
        border: 1px solid CanvasText;
        background: Canvas;
      }

      .fill {
        background: Highlight;
      }
    }

    @media print {
      .track {
        display: none;
      }

      .print-value {
        position: static;
        inline-size: auto;
        block-size: auto;
        margin: 0;
        clip: auto;
        clip-path: none;
        overflow: visible;
        white-space: normal;
        color: black;
        font-size: 12pt;
        font-variant-numeric: tabular-nums;
      }
    }
  `;

  @property({ type: Number, reflect: true, converter: strictNumberConverter })
  value = DEFAULT_VALUE;

  @property({ type: Number, reflect: true, converter: strictNumberConverter })
  max = DEFAULT_MAX;

  @property({ type: String })
  label?: string;

  @property({ type: String, reflect: true, attribute: 'label-ref' })
  labelRef?: string;

  @property({ type: String, reflect: true, attribute: 'value-text' })
  valueText?: string;

  override connectedCallback(): void {
    super.connectedCallback();
    this._syncHostA11y();
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value);

    if (name === 'role' && old !== value) {
      this._syncHostA11y();
    }
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    this._warnContractViolations();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    this._syncHostA11y();
  }

  private get _normalizedLabel(): string | undefined {
    return normalizeText(this.label);
  }

  private get _normalizedLabelRef(): string | undefined {
    return normalizeText(this.labelRef);
  }

  private get _normalizedValueText(): string | undefined {
    return normalizeText(this.valueText);
  }

  private get _resolvedLabelElement(): HTMLElement | null {
    const labelRef = this._normalizedLabelRef;
    if (labelRef === undefined) {
      return null;
    }

    return this.ownerDocument.getElementById(labelRef);
  }

  private get _effectiveMax(): number {
    if (Number.isFinite(this.max) && this.max > 0) {
      return this.max;
    }

    return DEFAULT_MAX;
  }

  private get _effectiveValue(): number {
    if (!Number.isFinite(this.value)) {
      return DEFAULT_VALUE;
    }

    return clamp(this.value, MIN_VALUE, this._effectiveMax);
  }

  private get _progressRatio(): number {
    return this._effectiveValue / this._effectiveMax;
  }

  private get _roundedPercentage(): number {
    return Math.round(this._progressRatio * 100);
  }

  private get _resolvedValueText(): string {
    return this._normalizedValueText ?? `${String(this._roundedPercentage)}%`;
  }

  private get _resolvedAriaLabel(): string | undefined {
    if (this._normalizedLabelRef !== undefined) {
      return undefined;
    }

    return this._normalizedLabel;
  }

  private get _resolvedAriaLabelledby(): string | undefined {
    const labelRef = this._normalizedLabelRef;
    if (labelRef === undefined) {
      return undefined;
    }

    return this._resolvedLabelElement === null ? undefined : labelRef;
  }

  private _warn(message: string): void {
    if (!IS_DEVELOPMENT) {
      return;
    }

    console.warn(`[ui-progress] ${message}`);
  }

  private _warnContractViolations(): void {
    if (Number.isFinite(this.max) && this.max <= 0) {
      this._warn(`max は 0 より大きい有限数である必要があります。received=${String(this.max)}`);
    } else if (!Number.isFinite(this.max)) {
      this._warn(`max は有限数である必要があります。received=${String(this.max)}`);
    }

    if (Number.isFinite(this.value)) {
      if (this.value < MIN_VALUE) {
        this._warn(`value は 0 以上である必要があります。received=${String(this.value)}`);
      }

      if (Number.isFinite(this.max) && this.max > 0 && this.value > this.max) {
        this._warn(
          `value は max 以下である必要があります。value=${String(this.value)}, max=${String(this.max)}`,
        );
      }
    } else {
      this._warn(`value は有限数である必要があります。received=${String(this.value)}`);
    }

    const labelRef = this._normalizedLabelRef;
    if (labelRef !== undefined) {
      if (this._resolvedLabelElement === null) {
        this._warn(`labelRef の参照先が見つかりません。labelRef=${labelRef}`);
      }
      return;
    }

    if (this._normalizedLabel === undefined) {
      this._warn('label または labelRef によるアクセシブル名が必要です。');
    }
  }

  private _syncHostA11y(): void {
    if (this.getAttribute('role') !== 'progressbar') {
      this.setAttribute('role', 'progressbar');
    }

    this.setAttribute('aria-valuemin', String(MIN_VALUE));
    this.setAttribute('aria-valuemax', String(this._effectiveMax));
    this.setAttribute('aria-valuenow', String(this._effectiveValue));
    this.setAttribute('aria-valuetext', this._resolvedValueText);

    const ariaLabel = this._resolvedAriaLabel;
    if (ariaLabel === undefined) {
      this.removeAttribute('aria-label');
    } else {
      this.setAttribute('aria-label', ariaLabel);
    }

    const ariaLabelledby = this._resolvedAriaLabelledby;
    if (ariaLabelledby === undefined) {
      this.removeAttribute('aria-labelledby');
    } else {
      this.setAttribute('aria-labelledby', ariaLabelledby);
    }

    this.removeAttribute('aria-live');
  }

  override render(): TemplateResult {
    return html`
      <div class="track" aria-hidden="true">
        <div class="fill" style=${`--_ui-progress-ratio: ${String(this._progressRatio)};`}></div>
      </div>
      <span class="print-value">${this._resolvedValueText}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-progress': UiProgress;
  }
}
