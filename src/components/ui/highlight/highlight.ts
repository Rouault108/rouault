import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export type HighlightOrigin = 'search' | 'user';

const VALID_ORIGINS = new Set<HighlightOrigin>(['search', 'user']);

/** ドキュメントに注入するスタイルタグのID（重複注入防止） */
const DOCUMENT_STYLE_ID = 'ui-highlight-document-styles';

/**
 * ハイライトスタイルの適用スコープ。
 * - `.prose mark`
 * - `<ui-highlight>` 内部の `mark`
 * - `<ui-search-highlight>` 内部の `mark`
 */
const HIGHLIGHT_SCOPE_SELECTOR =
  ':where(.prose mark, ui-highlight > mark, ui-search-highlight > mark)';

const HIGHLIGHT_RULE_TEMPLATE = (scopeSelector: string): string => `
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

const DOCUMENT_CSS = HIGHLIGHT_RULE_TEMPLATE(HIGHLIGHT_SCOPE_SELECTOR);

/**
 * 本文中のハイライトを表現する基底コンポーネント。
 * 最終DOMはネイティブ `<mark>` を使用する。
 */
class HighlightBase extends LitElement {
  @property({ type: String, reflect: true })
  origin: HighlightOrigin = 'search';

  @property({ type: Boolean, reflect: true })
  current = false;

  @property({ type: String })
  text = '';

  private _fallbackText = '';
  private _didAdoptInitialContent = false;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    if (!this._didAdoptInitialContent) {
      if (this.text === '') {
        // Markdown/SSR 由来の初期子ノードから表示テキストだけを吸収する。
        this._fallbackText = this._extractInitialText();
      }

      // Light DOM 既存ノードを残すと、初回 render() 後に重複表示される。
      this.replaceChildren();
      this._didAdoptInitialContent = true;
    }

    super.connectedCallback();
    this._injectDocumentStyles();
  }

  private _extractInitialText(): string {
    const childNodes = Array.from(this.childNodes);

    const directText = childNodes
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    if (directText !== '') {
      return directText;
    }

    const directMarkText = childNodes
      .filter((node): node is HTMLElement => node instanceof HTMLElement && node.tagName === 'MARK')
      .map((node) => node.textContent)
      .join('')
      .trim();
    if (directMarkText !== '') {
      return directMarkText;
    }

    return this.textContent.trim();
  }

  private _injectDocumentStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DOCUMENT_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    document.head.appendChild(style);
  }

  private get _resolvedOrigin(): HighlightOrigin {
    return VALID_ORIGINS.has(this.origin) ? this.origin : 'search';
  }

  private get _resolvedText(): string | undefined {
    const source = this.text === '' ? this._fallbackText : this.text;
    return source === '' ? undefined : source;
  }

  override render() {
    return html`<mark
      data-origin="${this._resolvedOrigin}"
      data-current="${String(this.current)}"
      aria-current="${ifDefined(this.current ? 'true' : undefined)}"
      >${this._resolvedText}</mark
    >`;
  }
}

@customElement('ui-highlight')
export class Highlight extends HighlightBase {}

@customElement('ui-search-highlight')
export class SearchHighlight extends HighlightBase {}

declare global {
  interface HTMLElementTagNameMap {
    'ui-highlight': Highlight;
    'ui-search-highlight': SearchHighlight;
  }
}

export { DOCUMENT_CSS, DOCUMENT_STYLE_ID, HIGHLIGHT_SCOPE_SELECTOR, HIGHLIGHT_RULE_TEMPLATE };
