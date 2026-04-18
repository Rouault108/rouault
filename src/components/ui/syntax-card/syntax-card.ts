import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../copy-button/copy-button';
import '../syntax-field/syntax-field';
import './syntax-section';

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * 構文カード (Syntax Card) コンポーネント
 *
 * Signature（コード）と Members（詳細）を分離し、
 * 多様な言語要素を統一レイアウトで提示します。
 *
 * signature スロットには素の <pre> を直接配置します。
 */
@customElement('ui-syntax-card')
export class SyntaxCard extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: var(--ui-syntax-card-breakout-width, 100%);
      margin-inline: var(--ui-syntax-card-breakout-margin, 0);
      margin-block: var(--space-8, 2rem);
      border: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
      border-radius: var(--radius-sm, 0.25rem);
      background: var(--bg-default, oklch(100% 0 0));
      color: var(--fg-default, oklch(20% 0 0));
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--space-3, 0.75rem);
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
      min-height: var(--control-min-touch, 24px);
    }

    .kind-tag {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: calc(var(--space-1, 0.25rem) * 0.5) var(--space-2, 0.5rem);
      border-radius: var(--radius-sm, 4px);
      border: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
      background: transparent;
      color: var(--fg-muted, oklch(48% 0 0));
      font-size: var(--text-xs, 0.75rem);
      font-weight: var(--font-semibold, 600);
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
      color: var(--fg-default, oklch(20% 0 0));
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
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
      overflow-x: auto;
    }

    /* signature スロットに直接配置された <pre> のリセット */
    .signature-area ::slotted(pre) {
      margin: 0;
      padding: 0;
      background: transparent;
      font-family: var(--font-mono, monospace);
      font-size: var(--text-sm, 0.8125rem);
      line-height: var(--line-height-relaxed, 1.625);
      white-space: pre;
    }

    :host([data-content-empty]) .signature-area {
      border-bottom: none;
    }

    .content-area {
      display: flex;
      flex-direction: column;
      gap: var(--space-6, 1.5rem);
      padding: var(--space-4, 1rem);
    }

    :host([data-content-empty]) .content-area {
      display: none;
    }

    @media (forced-colors: active) {
      :host {
        border-color: CanvasText;
      }

      .header {
        border-bottom-color: CanvasText;
      }

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
        background: transparent !important;
      }

      .copy-action {
        display: none;
      }
    }
  `;

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
  private _contentSlot?: HTMLSlotElement;

  @state()
  private _copyValue = '';

  @state()
  private _copyDisabled = true;

  @state()
  private _copyLabel = 'コードをコピー';

  override connectedCallback(): void {
    super.connectedCallback();
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

  private _syncContentState(): void {
    const slot = this._contentSlot;
    if (!slot) {
      const hasSections = Array.from(this.children).some((el) => el.matches('ui-syntax-section'));
      this.toggleAttribute('data-content-empty', !hasSections);
      return;
    }

    const hasSections = slot
      .assignedElements({ flatten: true })
      .some((el) => el.matches('ui-syntax-section'));

    this.toggleAttribute('data-content-empty', !hasSections);
  }

  /** signature スロットに直接配置された <pre> 要素を収集する */
  private _getSignaturePreElements(): HTMLElement[] {
    const assignedElements = this._signatureSlot?.assignedElements({ flatten: true }) ?? [];
    const slotElements = assignedElements.filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.tagName === 'PRE',
    );

    if (slotElements.length > 0) {
      return slotElements;
    }

    return Array.from(this.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.tagName === 'PRE',
    );
  }

  private _normalizeCodeContent(source: string): string {
    const normalized = source.replace(/\r\n?/g, '\n');
    if (normalized.trim().length === 0) return '';
    return normalized;
  }

  private _extractCodeContent(pre: HTMLElement): string {
    const codeEl = pre.querySelector('code');
    return this._normalizeCodeContent(codeEl !== null ? codeEl.textContent : pre.textContent);
  }

  private _syncCopyLabel(): void {
    const resolvedName = this._resolvedName;
    this._copyLabel = resolvedName === '' ? 'コードをコピー' : `${resolvedName} のコードをコピー`;
  }

  private _syncSignatureState(): void {
    this._copyDisabled = true;
    this._copyValue = '';

    const preElements = this._getSignaturePreElements();
    if (preElements.length !== 1) return;

    const pre = preElements[0];
    if (!pre) return;

    const content = this._extractCodeContent(pre);
    if (content === '') return;

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
        ${this._renderKindTag()} ${this._renderNameHeading()}
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
        <slot @slotchange=${this._onContentSlotChange}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-syntax-card': SyntaxCard;
  }
}
