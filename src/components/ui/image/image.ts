import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
  parseMediaSourcesAttribute,
  serializeMediaSources,
  type MediaSourceDescriptor,
} from '../../../../shared/media/media-source-attributes.js';
import '../icon/icon.js';

export type ImageLoading = 'lazy' | 'eager';

const VALID_LOADING = new Set<ImageLoading>(['lazy', 'eager']);
const FALSE_BOOLEAN_ATTRIBUTE_VALUES = new Set(['false', '0', 'off', 'no']);
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const zoomableAttributeConverter = {
  fromAttribute: (value: string | null): boolean => {
    if (value === null) {
      return false;
    }

    return !FALSE_BOOLEAN_ATTRIBUTE_VALUES.has(value.trim().toLowerCase());
  },
  toAttribute: (value: boolean): string | null => (value ? '' : null),
};

const mediaSourcesAttributeConverter = {
  fromAttribute: (value: string | null): MediaSourceDescriptor[] => parseMediaSourcesAttribute(value),
  toAttribute: (value: MediaSourceDescriptor[]): string | null =>
    value.length > 0 ? serializeMediaSources(value) : null,
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

    picture {
      display: block;
      width: 100%;
      height: 100%;
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

    .error-fallback ui-icon {
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
      position: relative;
      display: grid;
      gap: var(--space-3, 12px);
      margin: 0;
      outline: none;
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
    }

    .close-button {
      position: absolute;
      inset-block-start: var(--space-2, 8px);
      inset-inline-end: var(--space-2, 8px);
      display: inline-grid;
      place-items: center;
      width: calc(var(--space-8, 2rem) + var(--space-2, 8px));
      height: calc(var(--space-8, 2rem) + var(--space-2, 8px));
      padding: 0;
      border: var(--border-width, 1px) solid var(--border-ghost, oklch(20% 0 0 / 0.08));
      border-radius: 999px;
      background: oklch(100% 0 0 / 0.78);
      color: var(--fg-muted, oklch(48% 0 0));
      cursor: pointer;
      backdrop-filter: blur(var(--blur-md, 12px));
      -webkit-backdrop-filter: blur(var(--blur-md, 12px));
    }

    .close-button ui-icon {
      font-size: var(--icon-lg, 20px);
    }

    .close-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
    }

    @media (prefers-color-scheme: dark) {
      .thumbnail-image {
        filter: brightness(var(--brightness-dimmed, 0.85));
      }

      .trigger:hover:not(:disabled) .thumbnail-image,
      .trigger:focus-visible .thumbnail-image,
      .static-frame:hover .thumbnail-image,
      .close-button,
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
  srcset = '';

  @property({ type: String })
  sizes = '';

  @property({ type: String })
  placeholder = '';

  @property({ attribute: 'sources', converter: mediaSourcesAttributeConverter })
  sources: MediaSourceDescriptor[] = [];

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

  @property({ type: String, attribute: 'lightbox-src' })
  lightboxSrc = '';

  @property({ type: String, attribute: 'lightbox-srcset' })
  lightboxSrcset = '';

  @property({ type: String, attribute: 'lightbox-sizes' })
  lightboxSizes = '';

  @property({ attribute: 'lightbox-sources', converter: mediaSourcesAttributeConverter })
  lightboxSources: MediaSourceDescriptor[] = [];

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

  @query('.close-button')
  private _closeButtonElement?: HTMLButtonElement;

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

    if ((changedProperties as Map<string, unknown>).has('_expanded')) {
      if (this._expanded) {
        this._lockScroll();
        requestAnimationFrame(() => {
          if (this._closeButtonElement) {
            this._closeButtonElement.focus();
            return;
          }
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

  private get _resolvedSrcset(): string {
    return this.srcset.trim();
  }

  private get _resolvedSizes(): string {
    return this.sizes.trim();
  }

  private get _resolvedPlaceholder(): string {
    return this.placeholder.trim();
  }

  private get _resolvedSources(): MediaSourceDescriptor[] {
    return this.sources.filter((entry) => entry.type.trim().length > 0 && entry.srcset.trim().length > 0);
  }

  private get _resolvedCaption(): string {
    return this.caption.trim();
  }

  private get _resolvedAlt(): string {
    return this.alt.trim();
  }

  private get _resolvedLoading(): ImageLoading {
    return VALID_LOADING.has(this.loading) ? this.loading : 'lazy';
  }

  private get _resolvedLightboxSrc(): string {
    return this.lightboxSrc.trim() || this._resolvedSrc;
  }

  private get _resolvedLightboxSrcset(): string {
    return this.lightboxSrcset.trim();
  }

  private get _resolvedLightboxSizes(): string {
    return this.lightboxSizes.trim();
  }

  private get _resolvedLightboxSources(): MediaSourceDescriptor[] {
    if (this.lightboxSources.length > 0) {
      return this.lightboxSources.filter(
        (entry) => entry.type.trim().length > 0 && entry.srcset.trim().length > 0,
      );
    }
    return this._resolvedSources;
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

  private get _isEmptyState(): boolean {
    return this._resolvedSrc === '';
  }

  private get _isErrorState(): boolean {
    return this._hasError;
  }

  private get _isBusy(): boolean {
    return this._resolvedSrc !== '' && !this._isLoaded && !this._hasError;
  }

  private get _canOpenLightbox(): boolean {
    return this.zoomable && this._resolvedSrc !== '' && this._isLoaded && !this._hasError;
  }

  private get _triggerLabel(): string {
    const alt = this._resolvedAlt;
    return alt === '' ? '画像を拡大' : `${alt}を拡大`;
  }

  private get _dialogLabel(): string {
    const alt = this._resolvedAlt;
    return alt === '' ? '画像' : alt;
  }

  private get _captionRef(): string | undefined {
    return this._resolvedCaption === '' ? undefined : this._captionId;
  }

  private get _surfaceStyle(): string | undefined {
    const declarations: string[] = [];

    if (this._hasAspectRatio) {
      declarations.push(`aspect-ratio: ${String(this._resolvedWidth)} / ${String(this._resolvedHeight)};`);
    }

    if (this._isBusy || this._isErrorState || this._isEmptyState) {
      declarations.push('min-height: calc(var(--space-20, 5rem) * 2);');
    }

    if (this._resolvedPlaceholder !== '') {
      declarations.push(`background: ${this._resolvedPlaceholder};`);
    }

    return declarations.length > 0 ? declarations.join(' ') : undefined;
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
    if (this._resolvedSrc === '') {
      this._setImageState(false, false);
      return;
    }
    if (!image.complete) return;

    if (image.naturalWidth > 0) {
      this._setImageState(true, false);
      return;
    }

    this._setImageState(false, true);
  }

  private _restoreTriggerFocus(): void {
    const trigger = this._triggerElement;
    if (!trigger || trigger.disabled || !this.isConnected) return;

    requestAnimationFrame(() => {
      trigger.focus();
    });
  }

  private _getFocusableElements(): HTMLElement[] {
    const dialog = this._dialogElement;
    if (!dialog) return [];

    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => !element.hasAttribute('disabled') && !element.hasAttribute('inert'),
    );
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

  private _onLightboxClick = (event: MouseEvent): void => {
    if (event.target !== event.currentTarget) return;
    this.closeLightbox();
  };

  private _onCloseButtonClick = (): void => {
    this.closeLightbox();
  };

  private _onLightboxKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeLightbox();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();

      const focusables = this._getFocusableElements();
      if (focusables.length === 0) {
        this._dialogElement?.focus();
        return;
      }

      const activeElement = this.shadowRoot?.activeElement;
      const currentIndex = activeElement instanceof HTMLElement ? focusables.indexOf(activeElement) : -1;

      if (currentIndex === -1) {
        const fallbackTarget = event.shiftKey ? focusables.at(-1) : focusables[0];
        fallbackTarget?.focus();
        return;
      }

      const nextIndex =
        (currentIndex + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
      focusables[nextIndex]?.focus();
    }
  };

  private _renderPicture(
    imageClassName: string,
    src: string,
    alt: string,
    describedBy: string | undefined,
    loading: ImageLoading,
    srcset: string,
    sizes: string,
    sources: readonly MediaSourceDescriptor[],
    onLoad?: () => void,
    onError?: () => void,
  ): TemplateResult {
    return html`
      <picture>
        ${sources.map(
          (source) => html`
            <source
              type="${source.type}"
              srcset="${source.srcset}"
              sizes="${ifDefined(source.sizes)}"
            />
          `,
        )}
        <img
          class="${imageClassName}"
          src="${src}"
          srcset="${ifDefined(srcset !== '' ? srcset : undefined)}"
          sizes="${ifDefined(sizes !== '' ? sizes : undefined)}"
          alt="${alt}"
          aria-describedby="${ifDefined(describedBy)}"
          loading="${loading}"
          decoding="async"
          width="${ifDefined(this._resolvedWidth !== null ? String(this._resolvedWidth) : undefined)}"
          height="${ifDefined(
            this._resolvedHeight !== null ? String(this._resolvedHeight) : undefined,
          )}"
          @load="${onLoad}"
          @error="${onError}"
        />
      </picture>
    `;
  }

  private _renderThumbnailImage(describedBy: string | undefined): TemplateResult {
    return this._renderPicture(
      `thumbnail-image ${this._isLoaded ? 'is-loaded' : ''}`,
      this._resolvedSrc,
      this.alt,
      describedBy,
      this._resolvedLoading,
      this._resolvedSrcset,
      this._resolvedSizes,
      this._resolvedSources,
      this._onThumbnailLoad,
      this._onThumbnailError,
    );
  }

  private _renderEmptyFallback(): TemplateResult {
    return html`
      <div class="error-fallback" role="status" aria-live="polite">
        <ui-icon name="image" aria-hidden="true"></ui-icon>
        <span class="error-text">画像が指定されていません</span>
      </div>
    `;
  }

  private _renderErrorFallback(): TemplateResult {
    return html`
      <div class="error-fallback" role="status" aria-live="polite">
        <ui-icon name="image-off" aria-hidden="true"></ui-icon>
        <span class="error-text">画像を読み込めませんでした</span>
      </div>
    `;
  }

  private _renderMediaSurface(describedBy: string | undefined): TemplateResult {
    return html`
      <div class="media-shell" style="${ifDefined(this._surfaceStyle)}">
        ${this._isBusy ? html`<div class="placeholder" aria-hidden="true"></div>` : nothing}
        ${this._isEmptyState
          ? this._renderEmptyFallback()
          : this._isErrorState
            ? this._renderErrorFallback()
            : this._renderThumbnailImage(describedBy)}
      </div>
    `;
  }

  private _renderLightbox(): TemplateResult | typeof nothing {
    if (!this.zoomable) return nothing;

    const isOpen = this._expanded && this._canOpenLightbox;
    return html`
      <div
        class="lightbox ${isOpen ? 'is-open' : ''}"
        aria-hidden="${String(!isOpen)}"
        ?inert=${!isOpen}
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
          <button
            type="button"
            class="close-button"
            aria-label="閉じる"
            @click="${this._onCloseButtonClick}"
          >
            <ui-icon name="x" aria-hidden="true"></ui-icon>
          </button>
          ${this._resolvedSrc !== '' && !this._isErrorState
            ? this._renderPicture(
                'lightbox-image',
                this._resolvedLightboxSrc,
                this.alt,
                this._captionRef,
                'eager',
                this._resolvedLightboxSrcset,
                this._resolvedLightboxSizes,
                this._resolvedLightboxSources,
                undefined,
                undefined,
              )
            : nothing}
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
                ?disabled=${!this._canOpenLightbox}
                @click="${this._onTriggerClick}"
              >
                ${this._renderMediaSurface(undefined)}
              </button>
            `
          : html`
              <div class="static-frame">
                ${this._renderMediaSurface(this._captionRef)}
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
