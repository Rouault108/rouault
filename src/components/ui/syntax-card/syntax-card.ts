import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../codeblock/codeblock';
import '../copy-button/copy-button';

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

type CodeBlockElement = HTMLElement & {
  getCodeContent?: () => string;
  lang?: string;
};

/**
 * 構文カード (Syntax Card) コンポーネント
 *
 * Signature（コード）と Members（詳細）を分離し、
 * 多様な言語要素を統一レイアウトで提示します。
 */
@customElement('ui-syntax-card')
export class SyntaxCard extends LitElement {
  static override styles = css`
    :host {
      --_ui-syntax-card-breakout-width-default: calc(100% + var(--space-8, 2rem));
      --_ui-syntax-card-breakout-margin-default: var(--space-n4, -1rem);

      display: block;
      width: var(
        --ui-syntax-card-breakout-width,
        var(--_ui-syntax-card-breakout-width-default)
      );
      margin-inline: var(
        --ui-syntax-card-breakout-margin,
        var(--_ui-syntax-card-breakout-margin-default)
      );
      margin-block: var(--space-8, 2rem);

      border: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
      border-radius: var(--radius-md, 6px);
      overflow: hidden;
      box-shadow: var(--elevation-sm, 0 2px 8px oklch(0% 0 0 / 0.08));
      background: var(--bg-surface-1, oklch(100% 0 0));
      color: var(--fg-default, oklch(20% 0.03 250));
    }

    @media (min-width: 768px) {
      :host {
        --_ui-syntax-card-breakout-width-default: calc(100% + var(--space-16, 4rem));
        --_ui-syntax-card-breakout-margin-default: var(--space-n8, -2rem);
      }
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--space-3, 0.75rem);
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      background: var(--bg-surface-2, oklch(98% 0.01 250));
      border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
      min-height: var(--control-min-touch, 44px);
    }

    .kind-tag {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: calc(var(--space-1, 0.25rem) * 0.5) var(--space-2, 0.5rem);
      border-radius: var(--radius-sm, 4px);
      border: none;
      background: var(--bg-fill-neutral, oklch(0% 0 0 / 0.06));
      color: var(--fg-default, oklch(20% 0.03 250));
      font-size: var(--text-xs, 0.75rem);
      font-weight: var(--font-bold, 700);
      letter-spacing: var(--tracking-wider, 0.08em);
      text-transform: uppercase;
      line-height: 1.2;
    }

    .name {
      margin: 0;
      min-width: 0;
      font-size: var(--text-base, 0.875rem);
      font-weight: var(--font-semibold, 600);
      font-family: var(--font-mono, monospace);
      color: var(--fg-default, oklch(20% 0.03 250));
      overflow-wrap: anywhere;
      line-height: var(--line-height-normal, 1.5);
    }

    .copy-action {
      margin-inline-start: auto;
      flex-shrink: 0;
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    :host(:hover) .copy-action,
    :host(:focus-within) .copy-action {
      opacity: 1;
      pointer-events: auto;
    }

    .copy-action[aria-disabled='true'] {
      opacity: var(--opacity-disabled, 0.45);
      pointer-events: none;
    }

    @media (hover: none) and (pointer: coarse) {
      .copy-action {
        opacity: var(--opacity-link-touch, 0.75);
        pointer-events: auto;
      }
    }

    .signature-area {
      background: var(--bg-fill-muted, oklch(96% 0.01 250));
      border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
      padding: var(--space-3, 0.75rem);
    }

    .signature-area ::slotted(ui-code-block) {
      --ui-code-block-padding: 0;
      --ui-code-block-breakout-width: 100%;
      --ui-code-block-breakout-margin: 0;

      width: 100%;
      margin-inline: 0;
      display: block;
    }

    :host([data-content-empty]) .signature-area {
      border-bottom: none;
      border-radius: 0 0 var(--radius-md, 6px) var(--radius-md, 6px);
    }

    .content-area {
      background: var(--bg-default, oklch(100% 0 0));
      padding: var(--space-4, 1rem);
    }

    :host([data-content-empty]) .content-area {
      display: none;
    }

    .section + .section {
      margin-top: var(--space-6, 1.5rem);
    }

    .section-title {
      margin: 0 0 var(--space-2, 0.5rem);
      font-size: var(--text-xs, 0.75rem);
      font-weight: var(--font-bold, 700);
      letter-spacing: var(--tracking-wide, 0.04em);
      color: var(--fg-muted, oklch(48% 0.01 250));
      text-transform: uppercase;
    }

    .default-slot[hidden],
    .returns-slot[hidden] {
      display: none;
    }

    @media (forced-colors: active) {
      :host {
        border-color: CanvasText;
      }

      .header,
      .signature-area {
        border-bottom-color: CanvasText;
      }

      .kind-tag {
        border: var(--border-width, 1px) solid CanvasText;
      }

      .copy-action {
        border: var(--border-width, 1px) solid CanvasText;
      }
    }

    @media print {
      :host {
        width: 100% !important;
        margin-inline: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
      }

      .copy-action {
        display: none;
      }

      .header,
      .signature-area,
      .content-area {
        background: transparent !important;
        box-shadow: none !important;
      }

      :host([data-print-color='signature']) .signature-area {
        background: var(--bg-fill-muted, oklch(96% 0.01 250)) !important;
        print-color-adjust: exact;
      }
    }
  `;

  private static _instanceCount = 0;

  @property({ type: String })
  kind = '';

  @property({ type: String })
  name = '';

  @property({ type: String, attribute: 'data-lang' })
  override lang = '';

  @property({ type: Number, attribute: 'heading-level' })
  headingLevel = 4;

  @query('slot[name="signature"]')
  private _signatureSlot?: HTMLSlotElement;

  @query('slot:not([name])')
  private _defaultSlot?: HTMLSlotElement;

  @query('slot[name="returns"]')
  private _returnsSlot?: HTMLSlotElement;

  @state()
  private _hasDefaultContent = false;

  @state()
  private _hasReturnsContent = false;

  @state()
  private _copyValue = '';

  @state()
  private _copyDisabled = true;

  @state()
  private _copyLabel = 'コードをコピー';

  private readonly _returnsHeadingId = `ui-syntax-card-returns-${String(SyntaxCard._instanceCount++)}`;

  override firstUpdated(): void {
    this._syncCopyLabel();
    this._syncHostLangAttribute();
    this._syncContentState();
    this._syncSignatureState();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('name')) {
      this._syncCopyLabel();
    }

    if (changedProperties.has('lang')) {
      this._syncHostLangAttribute();
      this._syncSignatureState();
    }
  }

  private get _normalizedLang(): string {
    return this.lang.trim().toLowerCase();
  }

  private get _resolvedHeadingLevel(): HeadingLevel {
    const parsed = this.headingLevel;
    if (Number.isInteger(parsed) && parsed >= 2 && parsed <= 6) {
      return parsed as HeadingLevel;
    }
    return 4;
  }

  private get _resolvedName(): string {
    return this.name.trim();
  }

  private _syncHostLangAttribute(): void {
    const normalized = this._normalizedLang;
    const current = this.getAttribute('data-lang');

    if (normalized === '') {
      if (current !== null) {
        this.removeAttribute('data-lang');
      }
      return;
    }

    if (current !== normalized) {
      this.setAttribute('data-lang', normalized);
    }
  }

  private _hasMeaningfulNodes(slot?: HTMLSlotElement): boolean {
    if (!slot) return false;

    const assignedNodes = slot.assignedNodes({ flatten: true });
    return assignedNodes.some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return true;
      if (node.nodeType !== Node.TEXT_NODE) return false;
      return (node.textContent?.trim().length ?? 0) > 0;
    });
  }

  private _syncContentState(): void {
    this._hasDefaultContent = this._hasMeaningfulNodes(this._defaultSlot);
    this._hasReturnsContent = this._hasMeaningfulNodes(this._returnsSlot);

    const isContentEmpty = !this._hasDefaultContent && !this._hasReturnsContent;
    this.toggleAttribute('data-content-empty', isContentEmpty);
  }

  private _isCodeBlockElement(element: Element): element is CodeBlockElement {
    return element instanceof HTMLElement && element.tagName.toLowerCase() === 'ui-code-block';
  }

  private _collectSignatureCodeBlocks(): CodeBlockElement[] {
    const assignedElements = this._signatureSlot?.assignedElements({ flatten: true }) ?? [];
    const found: CodeBlockElement[] = [];
    const seen = new Set<HTMLElement>();

    for (const element of assignedElements) {
      if (this._isCodeBlockElement(element) && !seen.has(element)) {
        seen.add(element);
        found.push(element);
      }

      const nestedCodeBlocks = element.querySelectorAll<HTMLElement>('ui-code-block');
      for (const nested of nestedCodeBlocks) {
        if (seen.has(nested)) continue;
        seen.add(nested);
        found.push(nested as CodeBlockElement);
      }
    }

    return found;
  }

  private _readCodeBlockLang(block: CodeBlockElement): string {
    if (typeof block.lang === 'string' && block.lang.trim().length > 0) {
      return block.lang.trim().toLowerCase();
    }

    const fromAttr = block.getAttribute('lang');
    if (!fromAttr) return '';

    return fromAttr.trim().toLowerCase();
  }

  private _syncCodeBlockLangFallback(block: CodeBlockElement): void {
    const blockLang = this._readCodeBlockLang(block);
    if (blockLang !== '') return;

    const fallbackLang = this._normalizedLang;
    if (fallbackLang === '') return;

    if (typeof block.lang === 'string') {
      block.lang = fallbackLang;
    }

    if ((block.getAttribute('lang') ?? '').trim() === '') {
      block.setAttribute('lang', fallbackLang);
    }
  }

  private _normalizeCodeContent(source: string): string {
    const normalized = source.replace(/\r\n?/g, '\n');
    if (normalized.trim().length === 0) return '';
    return normalized;
  }

  private _extractCodeContent(block: CodeBlockElement): string {
    if (typeof block.getCodeContent === 'function') {
      try {
        const content = block.getCodeContent();
        if (typeof content === 'string') {
          return this._normalizeCodeContent(content);
        }
        return '';
      } catch {
        return '';
      }
    }

    const pre = block.querySelector('pre');
    if (!pre) return '';

    const source = (pre.querySelector('code') ?? pre).textContent;
    return this._normalizeCodeContent(source);
  }

  private _syncCopyLabel(): void {
    const resolvedName = this._resolvedName;
    this._copyLabel = resolvedName === '' ? 'コードをコピー' : `${resolvedName} のコードをコピー`;
  }

  private _syncSignatureState(): void {
    const codeBlocks = this._collectSignatureCodeBlocks();

    this._copyDisabled = true;
    this._copyValue = '';

    if (codeBlocks.length !== 1) {
      return;
    }

    const codeBlock = codeBlocks[0];
    if (!codeBlock) {
      return;
    }

    codeBlock.setAttribute('headless', '');
    this._syncCodeBlockLangFallback(codeBlock);

    const content = this._extractCodeContent(codeBlock);
    if (content === '') {
      return;
    }

    this._copyDisabled = false;
    this._copyValue = content;
  }

  private _onSignatureSlotChange = (): void => {
    this._syncSignatureState();
  };

  private _onContentSlotChange = (): void => {
    this._syncContentState();
  };

  private _renderKindTag(): TemplateResult | typeof nothing {
    const kind = this.kind.trim();
    if (kind === '') return nothing;

    return html`<span class="kind-tag">${kind}</span>`;
  }

  private _renderNameHeading(): TemplateResult {
    const name = this._resolvedName;

    switch (this._resolvedHeadingLevel) {
      case 2:
        return html`<h2 class="name">${name}</h2>`;
      case 3:
        return html`<h3 class="name">${name}</h3>`;
      case 4:
        return html`<h4 class="name">${name}</h4>`;
      case 5:
        return html`<h5 class="name">${name}</h5>`;
      case 6:
        return html`<h6 class="name">${name}</h6>`;
      default:
        return html`<h4 class="name">${name}</h4>`;
    }
  }

  override render() {
    return html`
      <header class="header">
        ${this._renderKindTag()}
        ${this._renderNameHeading()}
        <ui-copy-button
          class="copy-action"
          size="sm"
          .value=${this._copyValue}
          .label=${this._copyLabel}
          ?disabled=${this._copyDisabled}
          aria-disabled="${this._copyDisabled ? 'true' : 'false'}"
          tabindex="${this._copyDisabled ? '-1' : '0'}"
        ></ui-copy-button>
      </header>

      <div class="signature-area">
        <slot name="signature" @slotchange=${this._onSignatureSlotChange}></slot>
      </div>

      <div class="content-area">
        <section class="section default-slot" ?hidden=${!this._hasDefaultContent}>
          <slot @slotchange=${this._onContentSlotChange}></slot>
        </section>

        <section
          class="section returns-slot"
          ?hidden=${!this._hasReturnsContent}
          aria-labelledby="${this._returnsHeadingId}"
        >
          <p id="${this._returnsHeadingId}" class="section-title">Returns</p>
          <slot name="returns" @slotchange=${this._onContentSlotChange}></slot>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-syntax-card': SyntaxCard;
  }
}
