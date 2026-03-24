import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

export type ScoreLoading = 'lazy' | 'eager';

const VALID_LOADING = new Set<ScoreLoading>(['lazy', 'eager']);
const VALID_SRC_PROTOCOLS = new Set(['http:', 'https:', 'data:']);
const DEFAULT_ASPECT_RATIO = '3 / 1';
const LAZY_ROOT_MARGIN = '200px 0px';
const LOAD_ERROR_MESSAGE = '楽譜を読み込めませんでした';
const INVALID_SRC_ERROR_MESSAGE = '不正な楽譜ソースです';

let scoreUid = 0;

@customElement('ui-score')
export class UiScore extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .root {
      margin: 0;
    }

    :host-context(.prose) .root {
      width: calc(100% + var(--space-8, 2rem));
      margin-inline: var(--space-n4, -1rem);
    }

    @media (min-width: 768px) {
      :host-context(.prose) .root {
        width: calc(100% + var(--space-16, 4rem));
        margin-inline: var(--space-n8, -2rem);
      }
    }

    .score-scroll {
      position: relative;
      overflow-x: auto;
      overflow-y: hidden;
      border: var(--border-width, 1px) solid var(--border-muted, oklch(20% 0 0 / 0.06));
      border-radius: var(--radius-md, 6px);
      background: var(--bg-score-paper, oklch(100% 0 0));
      color: var(--score-ink, oklch(0% 0 0));
      padding: var(--space-4, 16px);
      scrollbar-width: auto;
      scrollbar-color: var(--fg-muted, oklch(45% 0 0)) transparent;
      scrollbar-gutter: stable both-edges;
    }

    @media (prefers-color-scheme: dark) {
      .score-scroll {
        border-color: var(--border-default, oklch(90% 0 0 / 0.12));
      }
    }

    .score-scroll:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    .score-scroll::-webkit-scrollbar {
      width: var(--scrollbar-width, 12px);
      height: var(--scrollbar-width, 12px);
    }

    .score-scroll::-webkit-scrollbar-track {
      background: transparent;
    }

    .score-scroll::-webkit-scrollbar-thumb {
      background-color: var(--fg-muted, oklch(45% 0 0));
      border: 4px solid transparent;
      background-clip: content-box;
      border-radius: var(--radius-full, 999px);
    }

    .score-scroll::-webkit-scrollbar-thumb:hover {
      background-color: var(--scrollbar-thumb-hover, var(--fg-default, oklch(20% 0 0)));
    }

    .score-scroll.has-overflow.has-left-fade.has-right-fade {
      mask-image: linear-gradient(
        to right,
        transparent 0,
        black var(--space-4, 16px),
        black calc(100% - var(--space-4, 16px)),
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0,
        black var(--space-4, 16px),
        black calc(100% - var(--space-4, 16px)),
        transparent 100%
      );
    }

    .score-scroll.has-overflow.has-left-fade:not(.has-right-fade) {
      mask-image: linear-gradient(to right, transparent 0, black var(--space-4, 16px), black 100%);
      -webkit-mask-image: linear-gradient(
        to right,
        transparent 0,
        black var(--space-4, 16px),
        black 100%
      );
    }

    .score-scroll.has-overflow.has-right-fade:not(.has-left-fade) {
      mask-image: linear-gradient(
        to right,
        black 0,
        black calc(100% - var(--space-4, 16px)),
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to right,
        black 0,
        black calc(100% - var(--space-4, 16px)),
        transparent 100%
      );
    }

    .score-stage {
      position: relative;
      min-width: max-content;
    }

    .score-stage > * {
      grid-area: 1 / 1;
    }

    .score-stage {
      display: grid;
    }

    .skeleton {
      width: 100%;
      min-width: max-content;
      background: var(--skeleton-bg, var(--bg-fill-neutral, oklch(95% 0 0)));
      border-radius: var(--radius-sm, 4px);
      overflow: hidden;
      opacity: 0;
      transition: opacity var(--duration-fast, 70ms) var(--ease-in, cubic-bezier(0.32, 0, 0.67, 1));
    }

    .skeleton::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0,
        var(--skeleton-shimmer, oklch(95% 0.01 250 / 0.6)) 50%,
        transparent 100%
      );
      animation: ui-score-shimmer 1.5s linear infinite;
    }

    .skeleton.is-visible {
      opacity: 1;
    }

    .score-content {
      opacity: 0;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .score-content.is-visible {
      opacity: 1;
    }

    .inline-slot,
    .score-svg-host {
      display: inline-block;
      min-width: max-content;
    }

    .inline-slot::slotted(svg),
    .score-svg-host svg {
      display: block;
      width: auto;
      height: auto;
      max-width: none;
      min-width: max-content;
    }

    .error {
      margin-top: var(--space-2, 8px);
      min-height: calc(var(--text-sm, 13px) * var(--line-height-normal, 1.5));
      color: var(--fg-danger, oklch(55% 0.2 25));
      font-size: var(--text-sm, 13px);
      line-height: var(--line-height-normal, 1.5);
      text-align: center;
    }

    .caption {
      margin-top: var(--space-2, 8px);
      color: var(--fg-muted, oklch(45% 0 0));
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-normal, 400);
      line-height: var(--line-height-relaxed, 1.75);
      text-align: center;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      border: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      clip-path: inset(50%);
      white-space: nowrap;
    }

    @media (prefers-reduced-motion: reduce) {
      .skeleton::after {
        animation: none;
      }

      .skeleton,
      .score-content {
        transition-duration: 0.01ms !important;
      }
    }

    @media (forced-colors: active) {
      .score-scroll {
        border-color: CanvasText;
        background: Canvas;
        scrollbar-color: CanvasText transparent;
      }

      .score-scroll.has-overflow {
        mask-image: none;
        -webkit-mask-image: none;
      }

      .score-scroll:focus-visible {
        outline: 3px solid CanvasText;
        box-shadow: none;
      }
    }

    @media print {
      .root {
        break-inside: auto;
      }

      :host-context(.prose) .root {
        width: 100% !important;
        margin-inline: 0 !important;
      }

      .score-scroll {
        overflow: visible;
        mask-image: none !important;
        -webkit-mask-image: none !important;
      }
    }

    @keyframes ui-score-shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
  `;

  @property({ type: String })
  src = '';

  @property({ type: String })
  caption = '';

  @property({ type: String })
  label = '';

  @property({ type: String })
  description = '';

  @property({ type: String, attribute: 'aspect-ratio' })
  aspectRatio = '';

  @property({ type: String, reflect: true })
  loading: ScoreLoading = 'lazy';

  @property({ type: Boolean, reflect: true })
  primary = false;

  @state()
  private _hasInlineSvg = false;

  @state()
  private _svgMarkup = '';

  @state()
  private _isLoading = false;

  @state()
  private _errorMessage = '';

  @state()
  private _isOverflowing = false;

  @state()
  private _showLeftFade = false;

  @state()
  private _showRightFade = false;

  @state()
  private _hasRequested = false;

  @query('.score-scroll')
  private _scrollContainer?: HTMLDivElement;

  @query('slot:not([name])')
  private _defaultSlot?: HTMLSlotElement;

  private readonly _uid = ++scoreUid;
  private readonly _descriptionId = `score-desc-${String(this._uid)}`;

  private _intersectionObserver: IntersectionObserver | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _fetchAbortController: AbortController | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardownIntersectionObserver();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._cancelFetch();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('loading') && !VALID_LOADING.has(this.loading)) {
      this.loading = 'lazy';
    }

    if (changedProperties.has('src')) {
      this._svgMarkup = '';
      this._hasRequested = false;
      this._errorMessage = '';
      this._cancelFetch();
      this._teardownIntersectionObserver();
    }
  }

  override firstUpdated(): void {
    this._syncInlineSvgState();
    this._setupResizeObserver();
    this._scheduleLoad();
    this._queueOverflowMeasurement();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    const internalChanges = changedProperties as Map<string, unknown>;

    if (
      changedProperties.has('src') ||
      changedProperties.has('loading') ||
      internalChanges.has('_hasInlineSvg')
    ) {
      this._scheduleLoad();
    }

    if (
      internalChanges.has('_svgMarkup') ||
      internalChanges.has('_isLoading') ||
      internalChanges.has('_errorMessage') ||
      internalChanges.has('_hasInlineSvg')
    ) {
      this._applyRuntimeSvgAccessibilityAttributes();
      this._queueOverflowMeasurement();
    }
  }

  private get _resolvedSrc(): string {
    return this.src.trim();
  }

  private get _resolvedCaption(): string {
    return this.caption.trim();
  }

  private get _resolvedLabel(): string {
    const trimmedLabel = this.label.trim();
    return trimmedLabel === '' ? '楽譜' : trimmedLabel;
  }

  private get _resolvedDescription(): string {
    return this.description.trim();
  }

  private get _resolvedLoading(): ScoreLoading {
    return VALID_LOADING.has(this.loading) ? this.loading : 'lazy';
  }

  private get _resolvedAspectRatio(): string {
    return this._normalizeAspectRatio(this.aspectRatio);
  }

  private get _hasValidRuntimeSource(): boolean {
    const resolvedSrc = this._resolvedSrc;
    if (resolvedSrc === '') return false;

    try {
      const baseUrl = typeof window === 'undefined' ? 'http://localhost/' : window.location.href;
      const url = new URL(resolvedSrc, baseUrl);
      return VALID_SRC_PROTOCOLS.has(url.protocol);
    } catch {
      return false;
    }
  }

  private get _isRuntimeMode(): boolean {
    return !this._hasInlineSvg;
  }

  private get _descriptionRef(): string | undefined {
    if (this._resolvedDescription === '') return undefined;
    return this._descriptionId;
  }

  private get _ariaLabel(): string {
    return this._resolvedLabel;
  }

  private get _effectiveErrorMessage(): string {
    if (this._errorMessage !== '') return this._errorMessage;
    return '';
  }

  private get _isBusy(): boolean {
    if (!this._isRuntimeMode) return false;
    if (this._effectiveErrorMessage !== '') return false;
    if (!this._hasValidRuntimeSource) return false;
    return this._isLoading || this._svgMarkup === '';
  }

  private get _showSkeleton(): boolean {
    if (!this._isRuntimeMode) return false;
    if (this._effectiveErrorMessage !== '') return false;
    if (!this._hasValidRuntimeSource) return false;
    return this._isBusy || this._svgMarkup === '';
  }

  private get _showScoreContent(): boolean {
    if (this._hasInlineSvg) return true;
    return this._svgMarkup !== '' && this._effectiveErrorMessage === '';
  }

  private get _scrollClassName(): string {
    const classes = ['score-scroll'];
    if (this._isOverflowing) classes.push('has-overflow');
    if (this._showLeftFade) classes.push('has-left-fade');
    if (this._showRightFade) classes.push('has-right-fade');
    return classes.join(' ');
  }

  private _setupResizeObserver(): void {
    const container = this._scrollContainer;
    if (!container || typeof ResizeObserver === 'undefined') return;

    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(() => {
      this._updateOverflowState();
    });

    this._resizeObserver.observe(container);
  }

  private _queueOverflowMeasurement(): void {
    requestAnimationFrame(() => {
      this._updateOverflowState();
    });
  }

  private _updateOverflowState(): void {
    const container = this._scrollContainer;
    if (!container) return;

    const isOverflowing = container.scrollWidth > container.clientWidth + 1;
    if (!isOverflowing) {
      this._setOverflowFlags(false, false, false);
      return;
    }

    const maxScrollLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
    const showLeftFade = container.scrollLeft > 1;
    const showRightFade = container.scrollLeft < maxScrollLeft - 1;
    this._setOverflowFlags(isOverflowing, showLeftFade, showRightFade);
  }

  private _setOverflowFlags(
    isOverflowing: boolean,
    showLeftFade: boolean,
    showRightFade: boolean,
  ): void {
    if (this._isOverflowing !== isOverflowing) {
      this._isOverflowing = isOverflowing;
    }
    if (this._showLeftFade !== showLeftFade) {
      this._showLeftFade = showLeftFade;
    }
    if (this._showRightFade !== showRightFade) {
      this._showRightFade = showRightFade;
    }
  }

  private _onScroll = (): void => {
    this._updateOverflowState();
  };

  private _onSlotChange = (): void => {
    this._syncInlineSvgState();
    this._scheduleLoad();
    this._queueOverflowMeasurement();
  };

  public override focus(options?: FocusOptions): void {
    this._scrollContainer?.focus(options);
  }

  public override blur(): void {
    this._scrollContainer?.blur();
  }

  private _syncInlineSvgState(): void {
    const slot = this._defaultSlot;
    const assignedNodes = slot?.assignedNodes({ flatten: true }) ?? [];
    let inlineSvg: SVGSVGElement | null = null;

    for (const node of assignedNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === '') {
        continue;
      }

      if (node instanceof SVGSVGElement && inlineSvg === null) {
        inlineSvg = node;
        continue;
      }

      inlineSvg = null;
      break;
    }

    const hasInlineSvg = inlineSvg !== null;
    const hadInlineSvg = this._hasInlineSvg;

    if (this._hasInlineSvg !== hasInlineSvg) {
      this._hasInlineSvg = hasInlineSvg;
    }

    if (inlineSvg) {
      this._applySvgAccessibilityAttributes(inlineSvg);
      this._teardownIntersectionObserver();
      this._cancelFetch();
      this._svgMarkup = '';
      this._errorMessage = '';
      this._hasRequested = false;
      return;
    }

    if (hadInlineSvg) {
      this._svgMarkup = '';
      this._errorMessage = '';
      this._hasRequested = false;
    }
  }

  private _scheduleLoad(): void {
    if (this._hasInlineSvg) return;

    this._teardownIntersectionObserver();

    if (this._resolvedSrc === '') {
      this._errorMessage = '';
      this._hasRequested = false;
      return;
    }

    if (!this._hasValidRuntimeSource) {
      this._errorMessage = INVALID_SRC_ERROR_MESSAGE;
      this._hasRequested = false;
      return;
    }

    if (this._svgMarkup !== '' || this._isLoading || this._hasRequested) return;
    this._errorMessage = '';

    if (this._resolvedLoading === 'eager') {
      void this._loadSvg();
      return;
    }

    this._setupIntersectionObserver();
  }

  private _setupIntersectionObserver(): void {
    this._teardownIntersectionObserver();

    const target = this._scrollContainer;
    if (!target) {
      requestAnimationFrame(() => {
        this._setupIntersectionObserver();
      });
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      void this._loadSvg();
      return;
    }

    this._intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            this._teardownIntersectionObserver();
            void this._loadSvg();
            break;
          }
        }
      },
      {
        root: null,
        rootMargin: LAZY_ROOT_MARGIN,
        threshold: 0.01,
      },
    );

    this._intersectionObserver.observe(target);
  }

  private _teardownIntersectionObserver(): void {
    this._intersectionObserver?.disconnect();
    this._intersectionObserver = null;
  }

  private _cancelFetch(): void {
    this._fetchAbortController?.abort();
    this._fetchAbortController = null;
    this._isLoading = false;
  }

  private async _loadSvg(): Promise<void> {
    if (this._resolvedSrc === '' || this._hasInlineSvg || !this._hasValidRuntimeSource) return;
    if (this._isLoading || this._svgMarkup !== '') return;

    this._cancelFetch();

    const abortController = new AbortController();
    this._fetchAbortController = abortController;
    this._hasRequested = true;
    this._isLoading = true;
    this._errorMessage = '';

    try {
      const response = await fetch(this._resolvedSrc, { signal: abortController.signal });
      if (!response.ok) {
        throw new Error(`HTTP status ${String(response.status)}`);
      }

      const svgText = await response.text();
      const sanitizedSvg = this._sanitizeSvgMarkup(svgText);
      if (sanitizedSvg === null) {
        throw new Error('SVGのサニタイズに失敗しました');
      }

      this._svgMarkup = sanitizedSvg;
      this._errorMessage = '';
    } catch {
      if (abortController.signal.aborted) return;
      this._svgMarkup = '';
      this._errorMessage = LOAD_ERROR_MESSAGE;
    } finally {
      if (this._fetchAbortController === abortController) {
        this._fetchAbortController = null;
      }
      this._isLoading = false;
    }
  }

  // SVGの危険な要素・属性を除去し、描画専用として安全側に寄せる。
  private _sanitizeSvgMarkup(rawSvg: string): string | null {
    const parser = new DOMParser();
    const svgDocument = parser.parseFromString(rawSvg, 'image/svg+xml');
    const parserError = svgDocument.querySelector('parsererror');
    if (parserError) return null;

    const root = svgDocument.documentElement;
    if (!(root instanceof SVGSVGElement)) return null;
    if (root.tagName.toLowerCase() !== 'svg') return null;

    svgDocument.querySelectorAll('script, foreignObject').forEach((element) => {
      element.remove();
    });

    const allElements = svgDocument.querySelectorAll('*');
    for (const element of allElements) {
      for (const attributeName of element.getAttributeNames()) {
        const value = element.getAttribute(attributeName);
        if (value === null) continue;

        const normalizedName = attributeName.toLowerCase();
        if (normalizedName.startsWith('on')) {
          element.removeAttribute(attributeName);
          continue;
        }

        if (
          (normalizedName === 'href' || normalizedName === 'xlink:href') &&
          this._isJavaScriptProtocol(value)
        ) {
          element.removeAttribute(attributeName);
          continue;
        }

        if (normalizedName === 'style' && /javascript:/i.test(value)) {
          element.removeAttribute(attributeName);
          continue;
        }

        if (normalizedName === 'stroke' || normalizedName === 'fill') {
          const replacedColor = this._replaceHardcodedBlack(value);
          if (replacedColor !== value) {
            element.setAttribute(attributeName, replacedColor);
          }
        }
      }
    }

    this._applySvgAccessibilityAttributes(root);
    return new XMLSerializer().serializeToString(root);
  }

  private _isJavaScriptProtocol(value: string): boolean {
    return /^\s*javascript:/i.test(value);
  }

  private _replaceHardcodedBlack(value: string): string {
    const normalized = value.trim().toLowerCase();
    const isBlackKeyword = normalized === 'black';
    const isHexBlack = normalized === '#000' || normalized === '#000000';
    const isRgbBlack = /^rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(normalized);

    if (isBlackKeyword || isHexBlack || isRgbBlack) {
      return 'currentColor';
    }

    return value;
  }

  private _applySvgAccessibilityAttributes(svg: SVGSVGElement): void {
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.removeAttribute('role');
  }

  private _applyRuntimeSvgAccessibilityAttributes(): void {
    const svgElement = this.shadowRoot?.querySelector<SVGSVGElement>('.score-svg-host svg');
    if (!svgElement) return;
    this._applySvgAccessibilityAttributes(svgElement);
  }

  private _normalizeAspectRatio(value: string): string {
    const normalizedValue = value.trim();
    const matched = /^([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)$/.exec(normalizedValue);
    if (!matched) return DEFAULT_ASPECT_RATIO;

    const numerator = Number.parseFloat(matched[1] ?? '');
    const denominator = Number.parseFloat(matched[2] ?? '');
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return DEFAULT_ASPECT_RATIO;
    if (numerator <= 0 || denominator <= 0) return DEFAULT_ASPECT_RATIO;

    return `${String(numerator)} / ${String(denominator)}`;
  }

  private _renderRuntimeSvg(): TemplateResult | typeof nothing {
    if (this._svgMarkup === '') return nothing;
    return html`<div class="score-svg-host" aria-hidden="true">${unsafeSVG(this._svgMarkup)}</div>`;
  }

  override render(): TemplateResult {
    const caption = this._resolvedCaption;
    const description = this._resolvedDescription;
    const errorMessage = this._effectiveErrorMessage;

    return html`
      <figure class="root" aria-busy="${String(this._isBusy)}">
        <div
          class="${this._scrollClassName}"
          tabindex="0"
          role="${ifDefined(this.primary ? 'region' : undefined)}"
          aria-label="${this._ariaLabel}"
          aria-describedby="${ifDefined(this._descriptionRef)}"
          @scroll="${this._onScroll}"
        >
          <div class="score-stage">
            ${this._hasInlineSvg
              ? nothing
              : html`
                  <div
                    class="skeleton ${this._showSkeleton ? 'is-visible' : ''}"
                    style="aspect-ratio: ${this._resolvedAspectRatio};"
                    aria-hidden="true"
                  ></div>
                `}

            <div class="score-content ${this._showScoreContent ? 'is-visible' : ''}">
              <slot class="inline-slot" @slotchange="${this._onSlotChange}"></slot>
              ${this._hasInlineSvg ? nothing : this._renderRuntimeSvg()}
            </div>

            ${description === ''
              ? nothing
              : html`<p id="${this._descriptionId}" class="sr-only">${description}</p>`}
          </div>
        </div>

        <div class="error" aria-live="polite">${errorMessage}</div>
        ${caption === '' ? nothing : html`<figcaption class="caption">${caption}</figcaption>`}
      </figure>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-score': UiScore;
  }
}
