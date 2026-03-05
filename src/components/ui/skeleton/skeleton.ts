import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';

const VALID_VARIANTS = new Set<SkeletonVariant>(['text', 'circular', 'rectangular']);

@customElement('ui-skeleton')
export class UiSkeleton extends LitElement {
  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'aria-hidden'];
  }

  static override styles = css`
    :host {
      --shimmer-duration: 1.5s;
      --shimmer-highlight: var(--skeleton-shimmer, oklch(95% 0.01 250 / 0.6));

      position: relative;
      display: block;
      overflow: hidden;
      inline-size: var(--ui-skeleton-inline-size, auto);
      block-size: var(--ui-skeleton-block-size, auto);
      border-radius: var(--radius-sm, 4px);
      background-color: var(--bg-fill-neutral, oklch(95% 0.01 250));
    }

    :host([variant='circular']) {
      border-radius: var(--radius-full, 9999px);
    }

    :host([animated])::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      transform: translateX(-100%);
      background: linear-gradient(90deg, transparent 0%, var(--shimmer-highlight) 50%, transparent 100%);
      animation: ui-skeleton-shimmer var(--shimmer-duration) linear infinite;
    }

    @keyframes ui-skeleton-shimmer {
      from {
        transform: translateX(-100%);
      }

      to {
        transform: translateX(100%);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host([animated])::after {
        content: none;
        animation: none;
      }
    }

    @media (forced-colors: active) {
      :host {
        background-color: Canvas;
        border: var(--border-width, 1px) solid CanvasText;
        forced-color-adjust: auto;
      }

      :host([animated])::after {
        content: none;
        animation: none;
      }
    }

    @media print {
      :host {
        display: none !important;
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: SkeletonVariant = 'rectangular';

  @property({ type: String, reflect: true })
  width = '';

  @property({ type: String, reflect: true })
  height = '';

  @property({ type: Boolean, reflect: true })
  animated = false;

  private _isSyncingA11y = false;
  private _hasWarnedMissingRectangularSize = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._syncHostA11y();
    this._syncDimensionStyles();
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value);

    if (name === 'aria-hidden' && !this._isSyncingA11y) {
      this._syncHostA11y();
    }
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('variant') && !VALID_VARIANTS.has(this.variant)) {
      this.variant = 'rectangular';
    }

    if (changedProperties.has('width')) {
      const normalizedWidth = this._normalizeDimension(this.width);
      if (this.width !== normalizedWidth) {
        this.width = normalizedWidth;
      }
    }

    if (changedProperties.has('height')) {
      const normalizedHeight = this._normalizeDimension(this.height);
      if (this.height !== normalizedHeight) {
        this.height = normalizedHeight;
      }
    }
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (
      changedProperties.has('variant') ||
      changedProperties.has('width') ||
      changedProperties.has('height')
    ) {
      this._syncDimensionStyles();
    }

    if (changedProperties.has('variant') || changedProperties.has('animated')) {
      this._syncHostA11y();
    }
  }

  private _normalizeDimension(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private get _resolvedInlineSize(): string | undefined {
    const resolvedWidth = this._normalizeDimension(this.width);
    const resolvedHeight = this._normalizeDimension(this.height);

    if (resolvedWidth !== '') {
      return resolvedWidth;
    }

    if (this.variant === 'circular' && resolvedHeight !== '') {
      return resolvedHeight;
    }

    if (this.variant === 'circular') {
      return '1em';
    }

    return undefined;
  }

  private get _resolvedBlockSize(): string | undefined {
    const resolvedWidth = this._normalizeDimension(this.width);
    const resolvedHeight = this._normalizeDimension(this.height);

    if (this.variant === 'text') {
      return resolvedHeight === '' ? '1em' : resolvedHeight;
    }

    if (this.variant === 'circular') {
      if (resolvedHeight !== '') {
        return resolvedHeight;
      }

      if (resolvedWidth !== '') {
        return resolvedWidth;
      }

      return '1em';
    }

    return resolvedHeight === '' ? undefined : resolvedHeight;
  }

  private _setHostStyleVar(name: string, value: string | undefined): void {
    if (value === undefined) {
      this.style.removeProperty(name);
      return;
    }

    this.style.setProperty(name, value);
  }

  private _syncDimensionStyles(): void {
    const inlineSize = this._resolvedInlineSize;
    const blockSize = this._resolvedBlockSize;

    this._setHostStyleVar('--ui-skeleton-inline-size', inlineSize);
    this._setHostStyleVar('--ui-skeleton-block-size', blockSize);

    const computedAspectRatio = this.isConnected ? getComputedStyle(this).aspectRatio : '';
    const hasAspectRatio = this.style.aspectRatio !== '' || computedAspectRatio !== 'auto';
    const needsRectangularGuard = this.variant === 'rectangular' && blockSize === undefined && !hasAspectRatio;

    if (needsRectangularGuard && !this._hasWarnedMissingRectangularSize) {
      this._hasWarnedMissingRectangularSize = true;
      console.warn(
        '[ui-skeleton] rectangular は height または aspect-ratio を指定してください（CLS防止）。',
      );
    }

    if (!needsRectangularGuard) {
      this._hasWarnedMissingRectangularSize = false;
    }
  }

  private _syncHostA11y(): void {
    if (this._isSyncingA11y) {
      return;
    }

    this._isSyncingA11y = true;
    try {
      if (this.getAttribute('aria-hidden') !== 'true') {
        this.setAttribute('aria-hidden', 'true');
      }
    } finally {
      this._isSyncingA11y = false;
    }
  }

  override render(): TemplateResult {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-skeleton': UiSkeleton;
  }
}
