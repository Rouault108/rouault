import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../../../lib/icons';

export type ImageLoading = 'lazy' | 'eager';

const VALID_LOADING = new Set<ImageLoading>(['lazy', 'eager']);
const FALSE_BOOLEAN_ATTRIBUTE_VALUES = new Set(['false', '0', 'off', 'no']);

const zoomableAttributeConverter = {
  fromAttribute: (value: string | null): boolean => {
    if (value === null) {
      return true;
    }

    return !FALSE_BOOLEAN_ATTRIBUTE_VALUES.has(value.trim().toLowerCase());
  },
  toAttribute: (value: boolean): string | null => (value ? '' : 'false'),
};

let imageUid = 0;

@customElement('ui-image')
export class UiImage extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .root {
      margin: 0;
    }

    :host-context(.prose) .root {
      width: 100%;
      margin-inline: 0;
    }

    .trigger {
      width: 100%;
      display: block;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      font: inherit;
      color: inherit;
      text-align: inherit;
      appearance: none;
    }

    .trigger:not(:disabled) {
      cursor: zoom-in;
    }

    .trigger:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--radius-md, 6px);
      animation: var(--animation-focus);
    }

    .media-shell {
      position: relative;
      display: grid;
      width: 100%;
      overflow: hidden;
      border: var(--border-width, 1px) solid var(--border-ghost, oklch(20% 0 0 / 0.04));
      border-radius: var(--radius-md, 6px);
      background: var(--bg-fill-neutral, oklch(95% 0 0));
    }

    .media-shell > * {
      grid-area: 1 / 1;
    }

    .placeholder {
      width: 100%;
      height: 100%;
      min-height: inherit;
      background: var(--bg-fill-neutral, oklch(95% 0 0));
    }

    .thumbnail-image {
      display: block;
      width: 100%;
      height: auto;
      max-width: 100%;
      opacity: 0;
    }

    .thumbnail-image.is-loaded {
      opacity: 1;
    }

    .static-frame .thumbnail-image {
      opacity: 1;
    }

    .error-fallback {
      display: grid;
      place-items: center;
      gap: var(--space-2, 8px);
      width: 100%;
      height: 100%;
      min-height: inherit;
      padding: var(--space-4, 16px);
      box-sizing: border-box;
      color: var(--fg-muted, oklch(48% 0 0));
      background: var(--bg-fill-neutral, oklch(95% 0 0));
      text-align: center;
    }

    .error-fallback iconify-icon {
      font-size: var(--icon-xl, 32px);
    }

    .error-text {
      font-size: var(--text-sm, 13px);
      line-height: var(--line-height-normal, 1.5);
      word-break: break-word;
    }

    .caption {
      margin-block-start: var(--space-2, 8px);
      color: var(--fg-muted, oklch(48% 0 0));
      font-size: var(--text-sm, 13px);
      line-height: var(--line-height-relaxed, 1.75);
      text-align: left;
    }

    @media (max-width: 767px) {
      :host-context(.prose) .caption {
        padding-inline: var(--space-4, 1rem);
      }
    }

    .lightbox {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal, 500);
      display: grid;
      place-items: center;
      padding: var(--space-4, 1rem);
      box-sizing: border-box;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      background-color: oklch(0% 0 0 / var(--opacity-scrim, 0.6));
      backdrop-filter: blur(var(--blur-md, 12px));
      -webkit-backdrop-filter: blur(var(--blur-md, 12px));
      transition:
        opacity var(--duration-slower, 300ms) var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45)),
        visibility 0s linear var(--duration-slower, 300ms);
    }

    .lightbox.is-open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transition:
        opacity var(--duration-slower, 300ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        visibility 0s linear 0s;
    }

    .lightbox-dialog {
      margin: 0;
      outline: none;
      cursor: zoom-out;
      transform: scale(var(--scale-enter, 0.97));
      transition: transform var(--duration-slower, 300ms)
        var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45));
    }

    .lightbox.is-open .lightbox-dialog {
      transform: scale(1);
      transition-timing-function: var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .lightbox-image {
      display: block;
      max-width: calc(100vw - var(--space-8, 2rem));
      max-height: calc(100vh - var(--space-8, 2rem));
      width: auto;
      height: auto;
      border: var(--border-width, 1px) solid var(--border-ghost, oklch(20% 0 0 / 0.04));
      border-radius: var(--radius-md, 6px);
      object-fit: contain;
      cursor: zoom-out;
    }

    @media (prefers-color-scheme: dark) {
      .thumbnail-image {
        filter: brightness(var(--brightness-dimmed, 0.85));
      }

      .trigger:hover:not(:disabled) .thumbnail-image,
      .trigger:focus-visible .thumbnail-image,
      .static-frame:hover .thumbnail-image,
      .lightbox-image {
        filter: brightness(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .thumbnail-image,
      .lightbox,
      .lightbox-dialog {
        transition-duration: 0.01ms !important;
      }
    }

    @media (forced-colors: active) {
      .trigger {
        border: none !important;
        background: transparent !important;
      }

      .media-shell,
      .lightbox-image {
        border-color: CanvasText;
      }

      .error-fallback {
        color: GrayText;
      }
    }

    @media print {
      .lightbox {
        display: none !important;
      }

      .thumbnail-image {
        filter: none !important;
        transform: none !important;
      }
    }
  `;

  @property({ type: String })
  src = '';

  @property({ type: String })
  alt = '';

  @property({ type: String })
  caption = '';

  @property({ reflect: true, converter: zoomableAttributeConverter })
  zoomable = true;

  @property({ type: Number })
  width?: number;

  @property({ type: Number })
  height?: number;

  @property({ type: String, reflect: true })
  loading: ImageLoading = 'lazy';

  @state()
  private _isLoaded = false;

  @state()
  private _hasError = false;

  @state()
  private _expanded = false;

  @query('.trigger')
  private _triggerElement?: HTMLButtonElement;

  @query('.thumbnail-image')
  private _thumbnailImage?: HTMLImageElement;

  @query('.lightbox-dialog')
  private _dialogElement?: HTMLElement;

  private readonly _uid = ++imageUid;
  private readonly _captionId = `image-caption-${String(this._uid)}`;
  private readonly _dialogId = `ui-image-dialog-${String(this._uid)}`;

  private static _scrollLockCount = 0;
  private static _previousBodyOverflow: string | null = null;
  private static _previousHtmlOverflow: string | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._expanded) {
      this._expanded = false;
      this._unlockScroll();
    }
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('loading') && !VALID_LOADING.has(this.loading)) {
      this.loading = 'lazy';
    }

    if (changedProperties.has('src')) {
      this._isLoaded = false;
      this._hasError = false;
      if (this._expanded) {
        this._expanded = false;
      }
    }

    if (
      (changedProperties.has('zoomable') || changedProperties.has('src')) &&
      this._expanded &&
      !this._canOpenLightbox
    ) {
      this._expanded = false;
    }
  }

  override firstUpdated(): void {
    this._syncImageStateFromDom();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('src')) {
      this._syncImageStateFromDom();
    }

    if ((changedProperties as Map<string, unknown>).has('_expanded')) {
      if (this._expanded) {
        this._lockScroll();
        requestAnimationFrame(() => {
          this._dialogElement?.focus();
        });
      } else {
        this._unlockScroll();
        this._restoreTriggerFocus();
      }
    }
  }

  openLightbox(): void {
    if (!this._canOpenLightbox) return;
    this._expanded = true;
  }

  closeLightbox(): void {
    if (!this._expanded) return;
    this._expanded = false;
  }

  private get _resolvedSrc(): string {
    return this.src.trim();
  }

  private get _resolvedCaption(): string {
    return this.caption.trim();
  }

  private get _resolvedLoading(): ImageLoading {
    return VALID_LOADING.has(this.loading) ? this.loading : 'lazy';
  }

  private get _resolvedWidth(): number | null {
    return this._normalizeDimension(this.width);
  }

  private get _resolvedHeight(): number | null {
    return this._normalizeDimension(this.height);
  }

  private get _hasAspectRatio(): boolean {
    return this._resolvedWidth !== null && this._resolvedHeight !== null;
  }

  private get _isErrorState(): boolean {
    return this._hasError || this._resolvedSrc === '';
  }

  private get _isBusy(): boolean {
    return this._resolvedSrc !== '' && !this._isLoaded && !this._hasError;
  }

  private get _canOpenLightbox(): boolean {
    return this.zoomable && !this._isBusy && !this._isErrorState;
  }

  private get _triggerLabel(): string {
    const alt = this.alt.trim();
    return alt === '' ? '画像を拡大' : `${alt}を拡大`;
  }

  private get _dialogLabel(): string {
    const alt = this.alt.trim();
    return alt === '' ? '画像' : alt;
  }

  private get _captionRef(): string | undefined {
    return this._resolvedCaption === '' ? undefined : this._captionId;
  }

  private get _surfaceStyle(): string | undefined {
    if (this._hasAspectRatio) {
      return `aspect-ratio: ${String(this._resolvedWidth)} / ${String(this._resolvedHeight)};`;
    }

    if (this._isBusy || this._isErrorState) {
      return 'min-height: calc(var(--space-20, 5rem) * 2);';
    }

    return undefined;
  }

  private _normalizeDimension(value: number | undefined): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;

    const normalized = Math.trunc(value);
    return normalized > 0 ? normalized : null;
  }

  private _setImageState(isLoaded: boolean, hasError: boolean): void {
    if (this._isLoaded !== isLoaded) {
      this._isLoaded = isLoaded;
    }

    if (this._hasError !== hasError) {
      this._hasError = hasError;
    }
  }

  private _syncImageStateFromDom(): void {
    const image = this._thumbnailImage;
    if (!image) return;
    if (this._resolvedSrc === '') return;
    if (!image.complete) return;

    if (image.naturalWidth > 0) {
      this._setImageState(true, false);
      return;
    }

    this._setImageState(false, true);
  }

  private _restoreTriggerFocus(): void {
    const trigger = this._triggerElement;
    if (!trigger) return;

    requestAnimationFrame(() => {
      trigger.focus();
    });
  }

  private _lockScroll(): void {
    if (typeof document === 'undefined') return;

    if (UiImage._scrollLockCount === 0) {
      UiImage._previousBodyOverflow = document.body.style.overflow;
      UiImage._previousHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    UiImage._scrollLockCount += 1;
  }

  private _unlockScroll(): void {
    if (typeof document === 'undefined') return;
    if (UiImage._scrollLockCount === 0) return;

    UiImage._scrollLockCount -= 1;

    if (UiImage._scrollLockCount === 0) {
      document.body.style.overflow = UiImage._previousBodyOverflow ?? '';
      document.documentElement.style.overflow = UiImage._previousHtmlOverflow ?? '';
      UiImage._previousBodyOverflow = null;
      UiImage._previousHtmlOverflow = null;
    }
  }

  private _onTriggerClick = (): void => {
    this.openLightbox();
  };

  private _onThumbnailLoad = (): void => {
    this._setImageState(true, false);
  };

  private _onThumbnailError = (): void => {
    this._setImageState(false, true);
    if (this._expanded) {
      this.closeLightbox();
    }
  };

  private _onLightboxClick = (): void => {
    this.closeLightbox();
  };

  private _onLightboxKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeLightbox();
      return;
    }

    if (event.key === 'Tab') {
      // Lightbox 内のフォーカス可能要素がダイアログ自身のみのため循環させる。
      event.preventDefault();
      this._dialogElement?.focus();
    }
  };

  private _renderThumbnailImage(describedBy: string | undefined): TemplateResult {
    return html`
      <img
        class="thumbnail-image ${this._isLoaded ? 'is-loaded' : ''}"
        src="${this._resolvedSrc}"
        alt="${this.alt}"
        aria-describedby="${ifDefined(describedBy)}"
        loading="${this._resolvedLoading}"
        decoding="async"
        width="${ifDefined(this._resolvedWidth !== null ? String(this._resolvedWidth) : undefined)}"
        height="${ifDefined(
          this._resolvedHeight !== null ? String(this._resolvedHeight) : undefined,
        )}"
        @load="${this._onThumbnailLoad}"
        @error="${this._onThumbnailError}"
      />
    `;
  }

  private _renderErrorFallback(): TemplateResult {
    const errorText = this.alt.trim() === '' ? '画像を読み込めませんでした' : this.alt.trim();
    return html`
      <div class="error-fallback" role="status" aria-live="polite">
        <iconify-icon icon="lucide:image-off" aria-hidden="true"></iconify-icon>
        <span class="error-text">${errorText}</span>
      </div>
    `;
  }

  private _renderMediaSurface(): TemplateResult {
    return html`
      <div class="media-shell" style="${ifDefined(this._surfaceStyle)}">
        ${this._isBusy ? html`<div class="placeholder" aria-hidden="true"></div>` : nothing}
        ${this._isErrorState ? this._renderErrorFallback() : this._renderThumbnailImage(undefined)}
      </div>
    `;
  }

  private _renderLightbox(): TemplateResult | typeof nothing {
    if (!this.zoomable || this._isErrorState || this._resolvedSrc === '') return nothing;

    const isOpen = this._expanded && this._canOpenLightbox;
    return html`
      <div
        class="lightbox ${isOpen ? 'is-open' : ''}"
        aria-hidden="${String(!isOpen)}"
        @click="${this._onLightboxClick}"
        @keydown="${this._onLightboxKeyDown}"
      >
        <div
          id="${this._dialogId}"
          class="lightbox-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="${this._dialogLabel}"
          aria-describedby="${ifDefined(this._captionRef)}"
          tabindex="-1"
        >
          <img
            class="lightbox-image"
            src="${this._resolvedSrc}"
            alt="${this.alt}"
            loading="eager"
            decoding="sync"
          />
        </div>
      </div>
    `;
  }

  override render() {
    const caption = this._resolvedCaption;

    return html`
      <figure class="root" aria-busy="${String(this._isBusy)}">
        ${this.zoomable
          ? html`
              <button
                type="button"
                class="trigger"
                aria-label="${this._triggerLabel}"
                aria-expanded="${String(this._expanded && this._canOpenLightbox)}"
                aria-haspopup="dialog"
                aria-controls="${this._dialogId}"
                aria-describedby="${ifDefined(this._captionRef)}"
                ?disabled="${!this._canOpenLightbox}"
                @click="${this._onTriggerClick}"
              >
                ${this._renderMediaSurface()}
              </button>
            `
          : html`
              <div class="static-frame">
                <div class="media-shell" style="${ifDefined(this._surfaceStyle)}">
                  ${this._isBusy
                    ? html`<div class="placeholder" aria-hidden="true"></div>`
                    : nothing}
                  ${this._isErrorState
                    ? this._renderErrorFallback()
                    : this._renderThumbnailImage(this._captionRef)}
                </div>
              </div>
            `}
        ${caption === ''
          ? nothing
          : html` <figcaption id="${this._captionId}" class="caption">${caption}</figcaption> `}
        ${this._renderLightbox()}
      </figure>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-image': UiImage;
  }
}
