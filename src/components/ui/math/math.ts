import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ParseError, renderToString } from 'katex';
import '../icon/icon.js';

type MathScrollState = 'none' | 'start' | 'middle' | 'end';
type MathSpeechMode = 'mathml' | 'label';
type MathErrorKind =
  | 'build-failed'
  | 'data-missing'
  | 'runtime-failed'
  | 'upstream-invalid'
  | 'unspecified';
type MathErrorTone = 'danger' | 'muted';

interface ErrorPresentation {
  description: string;
  title: string;
  tone: MathErrorTone;
}

const PRIMARY_REGION_LABEL = '数式（横スクロール可能）';
const LATEX_DELIMITER_ERROR_MESSAGE =
  'LaTeX構文エラー: latex プロパティに $$ は含めないでください。';
const LATEX_PARSE_ERROR_PREFIX = 'LaTeX構文エラー: ';
const ERROR_DETAILS_SUMMARY = '数式ソースを表示';
const AUTHOR_INVALID_TITLE = 'LaTeX構文エラー';
const AUTHOR_INVALID_DESCRIPTION =
  '入力された LaTeX が契約違反または構文不正のため、数式を表示できません。';
const DEFAULT_EXTERNAL_ERROR_KIND: MathErrorKind = 'unspecified';
const VALID_SPEECH_MODES: ReadonlySet<MathSpeechMode> = new Set(['mathml', 'label']);
const VALID_ERROR_KINDS: ReadonlySet<MathErrorKind> = new Set([
  'build-failed',
  'data-missing',
  'runtime-failed',
  'upstream-invalid',
  'unspecified',
]);
const EXTERNAL_ERROR_PRESENTATIONS: Record<MathErrorKind, ErrorPresentation> = {
  'build-failed': {
    title: '生成失敗',
    description: 'ビルドまたは事前生成で描画不能になったため、数式を表示できません。',
    tone: 'danger',
  },
  'data-missing': {
    title: '欠落',
    description: '数式ソースまたは参照先が見つからないため、数式を表示できません。',
    tone: 'muted',
  },
  'runtime-failed': {
    title: '実行時失敗',
    description: '実行時条件が満たされないため、数式を表示できません。',
    tone: 'danger',
  },
  'upstream-invalid': {
    title: '上流契約違反',
    description: '上流で整形された入力が契約違反のため、数式を表示できません。',
    tone: 'danger',
  },
  unspecified: {
    title: '外部エラー',
    description: '外部要因により数式を表示できません。',
    tone: 'muted',
  },
};

@customElement('ui-math')
export class UiMath extends LitElement {
  static override styles = css`
    :host {
      display: inline;
      color: var(--fg-default, oklch(20% 0 0));
    }

    :host([block]) {
      display: block;
    }

    .math-inline {
      display: inline;
      color: inherit;
      vertical-align: baseline;
      font-size: calc(1em * var(--text-math-scale, 1));
      line-height: inherit;
    }

    .math-display {
      --fade-width: var(--space-4, 16px);

      margin: var(--space-6, 24px) 0;
      padding: var(--space-4, 16px) 0;
      overflow-x: auto;
      overflow-y: hidden;
      text-align: center;
      color: inherit;
      scrollbar-width: thin;
      scrollbar-gutter: stable both-edges;
      scrollbar-color: var(--fg-muted, oklch(45% 0 0)) transparent;
      -webkit-mask-image: none;
      mask-image: none;
    }

    .math-display::-webkit-scrollbar {
      width: var(--scrollbar-width, 12px);
      height: var(--scrollbar-width, 12px);
    }

    .math-display::-webkit-scrollbar-track {
      background: transparent;
    }

    .math-display::-webkit-scrollbar-thumb {
      background-color: var(--fg-muted, oklch(45% 0 0));
      border: 4px solid transparent;
      border-radius: var(--radius-full, 999px);
      background-clip: content-box;
    }

    .math-display::-webkit-scrollbar-thumb:hover {
      background-color: var(--scrollbar-thumb-hover, var(--fg-default, oklch(20% 0 0)));
    }

    .math-display:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    .math-display[data-scroll='none'] {
      -webkit-mask-image: none;
      mask-image: none;
    }

    .math-display[data-scroll='start'] {
      -webkit-mask-image: linear-gradient(
        to right,
        black calc(100% - var(--fade-width)),
        transparent
      );
      mask-image: linear-gradient(to right, black calc(100% - var(--fade-width)), transparent);
    }

    .math-display[data-scroll='middle'] {
      -webkit-mask-image: linear-gradient(
        to right,
        transparent,
        black var(--fade-width),
        black calc(100% - var(--fade-width)),
        transparent
      );
      mask-image: linear-gradient(
        to right,
        transparent,
        black var(--fade-width),
        black calc(100% - var(--fade-width)),
        transparent
      );
    }

    .math-display[data-scroll='end'] {
      -webkit-mask-image: linear-gradient(to right, transparent, black var(--fade-width));
      mask-image: linear-gradient(to right, transparent, black var(--fade-width));
    }

    .math-content {
      display: inline-block;
      min-width: max-content;
      color: inherit;
      line-height: inherit;
    }

    .math-content slot,
    .math-inline slot {
      display: contents;
    }

    .math-content ::slotted(.katex),
    .math-inline ::slotted(.katex),
    .katex,
    .katex .mord,
    .katex .mbin,
    .katex .mrel,
    .katex .mopen,
    .katex .mclose,
    .katex .mpunct {
      color: inherit;
    }

    .katex-html {
      color: inherit;
    }

    .katex .katex-mathml {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      border: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .math-error {
      display: grid;
      gap: var(--space-3, 12px);
      margin: 0;
      padding: var(--space-3, 12px);
      border: var(--border-width, 1px) solid var(--border-danger, oklch(70% 0.11 25));
      border-radius: var(--radius-md, 6px);
      background: var(--bg-danger-subtle, oklch(98% 0.02 25));
      color: var(--fg-danger, oklch(55% 0.2 25));
      line-height: var(--line-height-relaxed, 1.75);
    }

    .math-error[data-tone='muted'] {
      border-color: var(--border-subtle, oklch(85% 0 0));
      background: var(--bg-fill-muted, oklch(95% 0 0));
      color: var(--fg-default, oklch(20% 0 0));
    }

    .math-error-header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2, 8px);
    }

    .math-error-header ui-icon {
      margin-top: 0.15em;
      flex-shrink: 0;
    }

    .math-error-header-text {
      display: grid;
      gap: var(--space-1, 4px);
    }

    .math-error-title {
      margin: 0;
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-weight-semibold, 600);
    }

    .math-error-message {
      margin: 0;
      font-size: var(--text-sm, 13px);
    }

    .math-error-code {
      margin: 0;
      font-family: var(--font-family-mono, 'JetBrains Mono', monospace);
      font-size: var(--text-xs, 12px);
      color: inherit;
    }

    .math-error-details {
      color: inherit;
      font-size: var(--text-sm, 13px);
    }

    .math-error-details summary {
      cursor: pointer;
      user-select: none;
    }

    .math-error-details pre {
      margin: var(--space-2, 8px) 0 0;
      padding: var(--space-2, 8px);
      border-radius: var(--radius-sm, 4px);
      background: var(--bg-fill-muted, oklch(95% 0 0));
      color: var(--fg-default, oklch(20% 0 0));
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media (forced-colors: active) {
      .math-display,
      .math-display[data-scroll] {
        -webkit-mask-image: none;
        mask-image: none;
        scrollbar-color: CanvasText transparent;
      }

      .math-display:focus-visible {
        outline: 3px solid CanvasText;
      }

      .math-error {
        border-color: CanvasText;
        background: Canvas;
        color: CanvasText;
      }
    }

    @media print {
      .math-display {
        overflow: visible;
        max-width: 100%;
        margin: var(--space-4, 16px) 0;
        padding: 0;
        page-break-inside: avoid;
        break-inside: avoid;
        -webkit-mask-image: none !important;
        mask-image: none !important;
      }
    }
  `;

  @property({ type: String, attribute: 'latex' })
  latex = '';

  @property({ type: Boolean, reflect: true })
  block = false;

  @property({ type: Boolean, reflect: true })
  primary = false;

  @property({ type: String, attribute: 'speech-mode' })
  speechMode = '';

  @property({ type: String, attribute: 'aria-label' })
  accessibleLabel = '';

  @property({ type: String, attribute: 'error-message' })
  errorMessage = '';

  @property({ type: String, attribute: 'error-kind' })
  errorKind = DEFAULT_EXTERNAL_ERROR_KIND;

  @property({ type: String, attribute: 'error-code' })
  errorCode = '';

  @property({ type: Boolean, attribute: 'show-error-source' })
  showErrorSource = false;

  @state()
  private _hasSlottedContent = false;

  @state()
  private _runtimeLatex = '';

  @state()
  private _runtimeRenderedHtml = '';

  @state()
  private _runtimeErrorMessage = '';

  @state()
  private _runtimeErrorIsDynamic = false;

  @state()
  private _scrollState: MathScrollState = 'none';

  @state()
  private _isScrollable = false;

  @query('slot:not([name])')
  private _defaultSlot?: HTMLSlotElement;

  @query('.math-display')
  private _displayContainer?: HTMLDivElement;

  private _resizeObserver: ResizeObserver | null = null;
  private _measurementQueued = false;
  private _settledEventToken = 0;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
  }

  override firstUpdated(): void {
    this._syncSlottedContent();
    this._syncRuntimeState();
    this._syncResizeObserver();
    this._queueOverflowMeasurement();
    this._syncRuntimeMathMlVisibility();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    const internalChanges = changedProperties as Map<string, unknown>;

    if (
      changedProperties.has('latex') ||
      changedProperties.has('errorMessage') ||
      changedProperties.has('block') ||
      internalChanges.has('_hasSlottedContent')
    ) {
      this._syncRuntimeState();
    }

    if (
      changedProperties.has('block') ||
      internalChanges.has('_hasSlottedContent') ||
      internalChanges.has('_runtimeLatex') ||
      internalChanges.has('_runtimeErrorMessage')
    ) {
      this._syncResizeObserver();
      this._queueOverflowMeasurement();
    }

    if (changedProperties.has('accessibleLabel') || internalChanges.has('_runtimeRenderedHtml')) {
      this._syncRuntimeMathMlVisibility();
    }

    this._queueSettledEvent();
  }

  private get _resolvedAccessibleLabel(): string {
    return this.accessibleLabel.trim();
  }

  private get _hasAccessibleLabel(): boolean {
    return this._resolvedAccessibleLabel !== '';
  }

  private get _resolvedSpeechMode(): MathSpeechMode {
    const rawSpeechMode = this.speechMode.trim();
    if (VALID_SPEECH_MODES.has(rawSpeechMode as MathSpeechMode)) {
      if (rawSpeechMode === 'label' && !this._hasAccessibleLabel) {
        return 'mathml';
      }
      return rawSpeechMode as MathSpeechMode;
    }

    if (rawSpeechMode === '' && this._hasAccessibleLabel) {
      return 'label';
    }

    return 'mathml';
  }

  private get _resolvedLatex(): string {
    return this.latex.trim();
  }

  private get _resolvedErrorMessage(): string {
    const staticError = this.errorMessage.trim();
    if (staticError !== '') return staticError;
    return this._runtimeErrorMessage;
  }

  private get _hasRuntimeMath(): boolean {
    return this._runtimeLatex !== '';
  }

  private get _hasLightDomContent(): boolean {
    return Array.from(this.childNodes).some((node) => this._isMeaningfulNode(node));
  }

  private get _hasSlotContent(): boolean {
    return this._hasSlottedContent || this._hasLightDomContent;
  }

  private get _hasVisiblePayload(): boolean {
    return this._hasSlotContent || this._hasRuntimeMath;
  }

  private get _isDynamicError(): boolean {
    if (this.errorMessage.trim() !== '') return false;
    return this._runtimeErrorMessage !== '' && this._runtimeErrorIsDynamic;
  }

  private get _resolvedExternalErrorKind(): MathErrorKind {
    const rawErrorKind = this.errorKind.trim();
    if (VALID_ERROR_KINDS.has(rawErrorKind as MathErrorKind)) {
      return rawErrorKind as MathErrorKind;
    }
    return DEFAULT_EXTERNAL_ERROR_KIND;
  }

  private get _resolvedErrorCode(): string {
    return this.errorCode.trim();
  }

  private get _shouldShowErrorSource(): boolean {
    return this.showErrorSource;
  }

  private _onSlotChange = (): void => {
    this._syncSlottedContent();
    this._syncRuntimeState();
    this._queueOverflowMeasurement();
    this._syncRuntimeMathMlVisibility();
  };

  private _onScroll = (): void => {
    this._updateOverflowState();
  };

  private _syncSlottedContent(): void {
    const assignedNodes = this._defaultSlot?.assignedNodes({ flatten: true }) ?? [];
    const hasMeaningfulNode = assignedNodes.some((node) => this._isMeaningfulNode(node));

    if (this._hasSlottedContent !== hasMeaningfulNode) {
      this._hasSlottedContent = hasMeaningfulNode;
    }
  }

  private _isMeaningfulNode(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').trim() !== '';
    }

    return node.nodeType === Node.ELEMENT_NODE;
  }

  private _syncRuntimeState(): void {
    if (this._hasSlotContent) {
      this._setRuntimeState('', '', '', false);
      return;
    }

    if (this.errorMessage.trim() !== '') {
      this._setRuntimeState('', '', '', false);
      return;
    }

    const latex = this._resolvedLatex;
    if (latex === '') {
      this._setRuntimeState('', '', '', false);
      return;
    }

    if (this._containsUnescapedDoubleDollar(latex)) {
      this._setRuntimeState('', '', LATEX_DELIMITER_ERROR_MESSAGE, true);
      return;
    }

    try {
      const renderedHtml = renderToString(latex, {
        displayMode: this.block,
        output: 'htmlAndMathml',
        throwOnError: true,
        strict: 'warn',
      });
      this._setRuntimeState(latex, renderedHtml, '', false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : '数式をレンダリングできませんでした。';

      if (error instanceof ParseError) {
        this._setRuntimeState('', '', `${LATEX_PARSE_ERROR_PREFIX}${message}`, true);
        return;
      }

      this._setRuntimeState('', '', `${LATEX_PARSE_ERROR_PREFIX}${message}`, true);
    }
  }

  private _setRuntimeState(
    runtimeLatex: string,
    runtimeRenderedHtml: string,
    runtimeErrorMessage: string,
    runtimeErrorIsDynamic: boolean,
  ): void {
    if (this._runtimeLatex !== runtimeLatex) {
      this._runtimeLatex = runtimeLatex;
    }
    if (this._runtimeRenderedHtml !== runtimeRenderedHtml) {
      this._runtimeRenderedHtml = runtimeRenderedHtml;
    }
    if (this._runtimeErrorMessage !== runtimeErrorMessage) {
      this._runtimeErrorMessage = runtimeErrorMessage;
    }
    if (this._runtimeErrorIsDynamic !== runtimeErrorIsDynamic) {
      this._runtimeErrorIsDynamic = runtimeErrorIsDynamic;
    }
  }

  private _containsUnescapedDoubleDollar(latex: string): boolean {
    return /(^|[^\\])\$\$/.test(latex);
  }

  private _syncResizeObserver(): void {
    this._resizeObserver?.disconnect();

    if (!this.block) {
      this._setOverflowState(false, 'none');
      return;
    }

    if (typeof ResizeObserver === 'undefined') return;

    this._resizeObserver ??= new ResizeObserver(() => {
      this._updateOverflowState();
    });

    if (this._displayContainer) {
      this._resizeObserver.observe(this._displayContainer);
    }
  }

  private _queueOverflowMeasurement(): void {
    if (!this.block) {
      this._setOverflowState(false, 'none');
      return;
    }

    if (this._measurementQueued) return;
    this._measurementQueued = true;

    requestAnimationFrame(() => {
      this._measurementQueued = false;
      this._updateOverflowState();
    });
  }

  private _updateOverflowState(): void {
    const container = this._displayContainer;
    if (!this.block || !container) {
      this._setOverflowState(false, 'none');
      return;
    }

    const isScrollable = container.scrollWidth > container.clientWidth + 1;
    if (!isScrollable) {
      this._setOverflowState(false, 'none');
      return;
    }

    const maxScrollLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
    const isAtStart = container.scrollLeft <= 1;
    const isAtEnd = container.scrollLeft >= maxScrollLeft - 1;

    if (isAtStart) {
      this._setOverflowState(true, 'start');
      return;
    }

    if (isAtEnd) {
      this._setOverflowState(true, 'end');
      return;
    }

    this._setOverflowState(true, 'middle');
  }

  private _setOverflowState(isScrollable: boolean, scrollState: MathScrollState): void {
    if (this._isScrollable !== isScrollable) {
      this._isScrollable = isScrollable;
    }
    if (this._scrollState !== scrollState) {
      this._scrollState = scrollState;
    }
  }

  // ランタイム描画時のみ MathML の公開状態を切り替える。
  private _syncRuntimeMathMlVisibility(): void {
    const runtimeMathElements = this.renderRoot.querySelectorAll('.runtime-katex math');
    const shouldHideMathMl = this._resolvedSpeechMode === 'label';
    for (const mathElement of runtimeMathElements) {
      if (shouldHideMathMl) {
        mathElement.setAttribute('aria-hidden', 'true');
      } else {
        mathElement.removeAttribute('aria-hidden');
      }
    }
  }

  private _queueSettledEvent(): void {
    const token = ++this._settledEventToken;

    requestAnimationFrame(() => {
      void this.updateComplete.then(() => {
        requestAnimationFrame(() => {
          if (token !== this._settledEventToken) {
            return;
          }

          this.dispatchEvent(
            new CustomEvent('math-settled', {
              bubbles: true,
              composed: true,
            }),
          );
        });
      });
    });
  }

  private _renderRuntimeMath(): TemplateResult {
    return html` <span class="runtime-katex"> ${unsafeHTML(this._runtimeRenderedHtml)} </span> `;
  }

  private _renderMathPayload(): TemplateResult {
    return html`
      <slot @slotchange="${this._onSlotChange}"></slot>
      ${this._hasSlotContent || !this._hasRuntimeMath ? nothing : this._renderRuntimeMath()}
    `;
  }

  private _renderErrorUi(): TemplateResult {
    const message = this._resolvedErrorMessage;
    const source = this._resolvedLatex;
    const errorCode = this._resolvedErrorCode;
    const isExternalError = this.errorMessage.trim() !== '';
    const presentation = isExternalError
      ? EXTERNAL_ERROR_PRESENTATIONS[this._resolvedExternalErrorKind]
      : {
          title: AUTHOR_INVALID_TITLE,
          description: AUTHOR_INVALID_DESCRIPTION,
          tone: 'danger',
        };
    const errorBody = html`
      <div
        class="math-error"
        data-tone="${presentation.tone}"
        role="${ifDefined(this._isDynamicError ? 'alert' : undefined)}"
      >
        <div class="math-error-header">
          <ui-icon name="triangle-alert" aria-hidden="true"></ui-icon>
          <div class="math-error-header-text">
            <p class="math-error-title">${presentation.title}</p>
            <p class="math-error-message">${presentation.description}</p>
            <p class="math-error-message">${message}</p>
            ${errorCode === '' ? nothing : html`<p class="math-error-code">code: ${errorCode}</p>`}
          </div>
        </div>
        ${!this._shouldShowErrorSource || source === ''
          ? nothing
          : html`
              <details class="math-error-details">
                <summary>${ERROR_DETAILS_SUMMARY}</summary>
                <pre><code>${source}</code></pre>
              </details>
            `}
      </div>
    `;

    if (!this.block) return errorBody;

    return html` <div class="math-display" data-scroll="none">${errorBody}</div> `;
  }

  private _renderInline(): TemplateResult {
    return html`
      <span
        class="math-inline"
        role="math"
        aria-label="${ifDefined(
          this._resolvedSpeechMode === 'label' ? this._resolvedAccessibleLabel : undefined,
        )}"
      >
        ${this._renderMathPayload()}
      </span>
    `;
  }

  private _renderBlock(): TemplateResult {
    return html`
      <div
        class="math-display"
        data-scroll="${this._scrollState}"
        tabindex="${ifDefined(this._isScrollable ? '0' : undefined)}"
        role="${ifDefined(this.primary ? 'region' : undefined)}"
        aria-label="${ifDefined(this.primary ? PRIMARY_REGION_LABEL : undefined)}"
        @scroll="${this._onScroll}"
      >
        <div
          class="math-content"
          role="math"
          aria-label="${ifDefined(
            this._resolvedSpeechMode === 'label' ? this._resolvedAccessibleLabel : undefined,
          )}"
        >
          ${this._renderMathPayload()}
        </div>
      </div>
    `;
  }

  override render(): TemplateResult | typeof nothing {
    if (this._resolvedErrorMessage !== '') {
      return this._renderErrorUi();
    }

    if (!this._hasVisiblePayload) {
      return nothing;
    }

    if (this.block) {
      return this._renderBlock();
    }

    return this._renderInline();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-math': UiMath;
  }
}
