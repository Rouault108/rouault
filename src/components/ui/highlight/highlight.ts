import { html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export const HIGHLIGHT_RULE_TEMPLATE = (scopeSelector: string): string => `
${scopeSelector} {
  background: transparent;
  color: inherit;
  padding: 0;
  border-radius: 0;
  text-decoration: none;
  box-shadow: inset 0 -0.5em 0 color-mix(in oklch, var(--bg-highlight-subtle) 88%, transparent);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

${scopeSelector}[data-current-match='true'] {
  box-shadow:
    inset 0 -0.68em 0 color-mix(in oklch, var(--bg-highlight-current, var(--bg-highlight-subtle)) 72%, transparent),
    inset 0 -0.32em 0 color-mix(in oklch, var(--bg-highlight-subtle) 92%, transparent);
}

@media (forced-colors: active) {
  ${scopeSelector} {
    background: transparent;
    color: inherit;
    text-decoration-line: underline;
    text-decoration-style: solid;
    text-decoration-thickness: from-font;
    text-underline-offset: 0.08em;
    box-shadow: none;
    forced-color-adjust: auto;
  }
}

@media print {
  ${scopeSelector} {
    background: transparent !important;
    color: currentColor;
    text-decoration-line: underline;
    text-decoration-style: solid;
    text-decoration-thickness: from-font;
    text-underline-offset: 0.08em;
    box-shadow: none;
  }
}
`;

const HIGHLIGHT_MARK_SELECTOR = 'ui-highlight > mark';
export const DOCUMENT_STYLE_ID = 'ui-highlight-styles';
export const DOCUMENT_CSS = HIGHLIGHT_RULE_TEMPLATE(HIGHLIGHT_MARK_SELECTOR);

/**
 * 本文中の検索ハイライトを表現するコンポーネント。
 * 最終DOMはホスト直下のネイティブ `<mark>` を使用する。
 */
@customElement('ui-highlight')
export class Highlight extends LitElement {
  @property({ attribute: 'current-match', type: Boolean, reflect: true })
  currentMatch = false;

  @property({ attribute: 'text' })
  text: string | null = null;

  private initialText: string | null = null;
  private didAdoptInitialContent = false;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    if (!this.didAdoptInitialContent) {
      this.initialText = this.extractInitialText();
      this.replaceChildren();
      this.didAdoptInitialContent = true;
    }

    super.connectedCallback();
    this.injectDocumentStyles();
  }

  private extractInitialText(): string | null {
    if (this.text !== null) {
      return null;
    }

    const hasElementChild = Array.from(this.childNodes).some(
      (node) => node.nodeType === Node.ELEMENT_NODE,
    );
    if (hasElementChild) {
      return null;
    }

    const directText = Array.from(this.childNodes)
      .filter((node): node is Text => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join('')
      .trim();

    return directText === '' ? null : directText;
  }

  private injectDocumentStyles(): void {
    const ownerDocument = this.ownerDocument;
    if (ownerDocument.getElementById(DOCUMENT_STYLE_ID)) {
      return;
    }

    const style = ownerDocument.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    ownerDocument.head.append(style);
  }

  private get resolvedText(): string | null {
    const source = this.text ?? this.initialText;
    return source === null || source === '' ? null : source;
  }

  override render() {
    const resolvedText = this.resolvedText;
    if (resolvedText === null) {
      return nothing;
    }

    return html`<mark data-current-match="${String(this.currentMatch)}">${resolvedText}</mark>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-highlight': Highlight;
  }
}
