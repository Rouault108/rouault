import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../../../lib/icons';

type MathScrollState = 'none' | 'start' | 'middle' | 'end';

const PRIMARY_REGION_LABEL = '数式（横スクロール可能）';
const LATEX_BRACE_ERROR_MESSAGE = 'LaTeX構文エラー: 波括弧の対応が取れていません。';
const LATEX_ENV_ERROR_MESSAGE = 'LaTeX構文エラー: \\begin と \\end の対応が取れていません。';
const LATEX_DELIMITER_ERROR_MESSAGE = 'LaTeX構文エラー: latex プロパティに $$ は含めないでください。';
const ERROR_DETAILS_SUMMARY = '数式ソースを表示';

@customElement('ui-math')
export class UiMath extends LitElement {
  static override styles = css`
    :host {
      display: inline;
      color: var(--fg-default, oklch(20% 0.03 250));
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
      scrollbar-color: var(--fg-muted, oklch(45% 0.02 250)) transparent;
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
      background-color: var(--fg-muted, oklch(45% 0.02 250));
      border: 4px solid transparent;
      border-radius: var(--radius-full, 999px);
      background-clip: content-box;
    }

    .math-display::-webkit-scrollbar-thumb:hover {
      background-color: var(--scrollbar-thumb-hover, var(--fg-default, oklch(20% 0.03 250)));
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

    .runtime-mathml {
      color: inherit;
    }

    .katex-html {
      color: inherit;
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

    .math-error-header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2, 8px);
    }

    .math-error-header iconify-icon {
      margin-top: 0.15em;
      flex-shrink: 0;
    }

    .math-error-message {
      margin: 0;
      font-size: var(--text-sm, 13px);
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
      background: var(--bg-fill-muted, oklch(95% 0.01 250));
      color: var(--fg-default, oklch(20% 0.03 250));
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

  @property({ type: String, attribute: false })
  latex = '';

  @property({ type: Boolean, reflect: true })
  block = false;

  @property({ type: Boolean, reflect: true })
  primary = false;

  @property({ type: String, attribute: 'aria-label' })
  accessibleLabel = '';

  @property({ type: String, attribute: 'error-message' })
  errorMessage = '';

  @state()
  private _hasSlottedContent = false;

  @state()
  private _runtimeLatex = '';

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
  private readonly _managedMathMlElements = new WeakSet<Element>();

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
    this._syncSlottedMathMlVisibility();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    const internalChanges = changedProperties as Map<string, unknown>;

    if (
      changedProperties.has('latex') ||
      changedProperties.has('errorMessage') ||
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

    if (
      changedProperties.has('accessibleLabel') ||
      internalChanges.has('_hasSlottedContent') ||
      internalChanges.has('_runtimeLatex')
    ) {
      this._syncSlottedMathMlVisibility();
    }
  }

  private get _resolvedAccessibleLabel(): string {
    return this.accessibleLabel.trim();
  }

  private get _hasAccessibleLabel(): boolean {
    return this._resolvedAccessibleLabel !== '';
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

  private get _isDynamicError(): boolean {
    if (this.errorMessage.trim() !== '') return false;
    return this._runtimeErrorMessage !== '' && this._runtimeErrorIsDynamic;
  }

  private _onSlotChange = (): void => {
    this._syncSlottedContent();
    this._syncRuntimeState();
    this._queueOverflowMeasurement();
    this._syncSlottedMathMlVisibility();
  };

  private _onScroll = (): void => {
    this._updateOverflowState();
  };

  private _syncSlottedContent(): void {
    const assignedNodes = this._defaultSlot?.assignedNodes({ flatten: true }) ?? [];
    const hasMeaningfulNode = assignedNodes.some(node => this._isMeaningfulNode(node));

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
    if (this._hasSlottedContent) {
      this._setRuntimeState('', '', false);
      return;
    }

    if (this.errorMessage.trim() !== '') {
      this._setRuntimeState('', '', false);
      return;
    }

    const latex = this._resolvedLatex;
    if (latex === '') {
      this._setRuntimeState('', '', false);
      return;
    }

    const validationError = this._validateLatex(latex);
    if (validationError !== null) {
      this._setRuntimeState('', validationError, true);
      return;
    }

    this._setRuntimeState(latex, '', false);
  }

  private _setRuntimeState(runtimeLatex: string, runtimeErrorMessage: string, runtimeErrorIsDynamic: boolean): void {
    if (this._runtimeLatex !== runtimeLatex) {
      this._runtimeLatex = runtimeLatex;
    }
    if (this._runtimeErrorMessage !== runtimeErrorMessage) {
      this._runtimeErrorMessage = runtimeErrorMessage;
    }
    if (this._runtimeErrorIsDynamic !== runtimeErrorIsDynamic) {
      this._runtimeErrorIsDynamic = runtimeErrorIsDynamic;
    }
  }

  // ランタイム入力の最小検証で事故頻度の高い構文崩れを早期に検出する。
  private _validateLatex(latex: string): string | null {
    if (this._containsUnescapedDoubleDollar(latex)) {
      return LATEX_DELIMITER_ERROR_MESSAGE;
    }

    if (!this._hasBalancedBraces(latex)) {
      return LATEX_BRACE_ERROR_MESSAGE;
    }

    if (!this._hasBalancedEnvironments(latex)) {
      return LATEX_ENV_ERROR_MESSAGE;
    }

    return null;
  }

  private _containsUnescapedDoubleDollar(latex: string): boolean {
    return /(^|[^\\])\$\$/.test(latex);
  }

  private _hasBalancedBraces(latex: string): boolean {
    let depth = 0;

    for (let index = 0; index < latex.length; index += 1) {
      const current = latex[index];
      if (current === '\\') {
        index += 1;
        continue;
      }

      if (current === '{') {
        depth += 1;
        continue;
      }

      if (current === '}') {
        depth -= 1;
        if (depth < 0) return false;
      }
    }

    return depth === 0;
  }

  private _hasBalancedEnvironments(latex: string): boolean {
    const pattern = /\\(begin|end)\{([a-zA-Z*]+)\}/g;
    const stack: string[] = [];

    let matched: RegExpExecArray | null = pattern.exec(latex);
    while (matched !== null) {
      const action = matched[1] ?? '';
      const environmentName = matched[2] ?? '';
      if (environmentName === '') return false;

      if (action === 'begin') {
        stack.push(environmentName);
      } else {
        const latestEnvironment = stack.pop();
        if (latestEnvironment !== environmentName) return false;
      }

      matched = pattern.exec(latex);
    }

    return stack.length === 0;
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

  private _syncSlottedMathMlVisibility(): void {
    const slot = this._defaultSlot;
    if (!slot) return;

    const assignedElements = slot.assignedElements({ flatten: true });
    const mathElements: Element[] = [];

    for (const element of assignedElements) {
      if (element.localName === 'math') {
        mathElements.push(element);
      }

      const nestedMathElements = element.querySelectorAll('math');
      mathElements.push(...nestedMathElements);
    }

    const shouldHideMathMl = this._hasAccessibleLabel;
    for (const mathElement of mathElements) {
      if (shouldHideMathMl) {
        if (!mathElement.hasAttribute('aria-hidden')) {
          mathElement.setAttribute('aria-hidden', 'true');
          this._managedMathMlElements.add(mathElement);
        }
        continue;
      }

      if (this._managedMathMlElements.has(mathElement)) {
        mathElement.removeAttribute('aria-hidden');
      }
    }
  }

  private _renderRuntimeMath(): TemplateResult {
    return html`
      <math
        class="runtime-mathml"
        xmlns="http://www.w3.org/1998/Math/MathML"
        aria-hidden="${ifDefined(this._hasAccessibleLabel ? 'true' : undefined)}"
      >
        <mtext>${this._runtimeLatex}</mtext>
      </math>
      <span class="katex-html" aria-hidden="true">${this._runtimeLatex}</span>
    `;
  }

  private _renderMathPayload(): TemplateResult {
    return html`
      <slot @slotchange="${this._onSlotChange}"></slot>
      ${this._hasSlottedContent || !this._hasRuntimeMath ? nothing : this._renderRuntimeMath()}
    `;
  }

  private _renderErrorUi(): TemplateResult {
    const message = this._resolvedErrorMessage;
    const source = this._resolvedLatex;
    const errorBody = html`
      <div class="math-error" role="${ifDefined(this._isDynamicError ? 'alert' : undefined)}">
        <div class="math-error-header">
          <iconify-icon icon="lucide:triangle-alert" aria-hidden="true"></iconify-icon>
          <p class="math-error-message">${message}</p>
        </div>
        ${source === ''
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

    return html`
      <div class="math-display" data-scroll="none">
        ${errorBody}
      </div>
    `;
  }

  private _renderInline(): TemplateResult {
    return html`
      <span class="math-inline" role="math" aria-label="${ifDefined(this._resolvedAccessibleLabel || undefined)}">
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
        <div class="math-content" role="math" aria-label="${ifDefined(this._resolvedAccessibleLabel || undefined)}">
          ${this._renderMathPayload()}
        </div>
      </div>
    `;
  }

  override render(): TemplateResult {
    if (this._resolvedErrorMessage !== '') {
      return this._renderErrorUi();
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
