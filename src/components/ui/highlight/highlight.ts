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
 * - `<ui-search-highlight>` 内部の `mark`
 */
const HIGHLIGHT_SCOPE_SELECTOR = ':where(.prose mark, ui-search-highlight > mark)';

const HIGHLIGHT_RULE_TEMPLATE = (scopeSelector: string): string => `
${scopeSelector} {
  background: var(--bg-highlight-subtle);
  color: var(--fg-default);
  padding: 0;
  border-radius: var(--radius-sm);
  text-decoration: none;
}

@media (forced-colors: active) {
  ${scopeSelector} {
    background: transparent;
    color: var(--fg-default);
    text-decoration-line: underline;
    text-decoration-style: solid;
    text-decoration-thickness: from-font;
    text-underline-offset: 0.08em;
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
  }
}
`;

const DOCUMENT_CSS = HIGHLIGHT_RULE_TEMPLATE(HIGHLIGHT_SCOPE_SELECTOR);

/**
 * 検索由来/ユーザー操作由来のハイライトを表現するコンポーネント。
 * 最終DOMはネイティブ `<mark>` を使用する。
 */
@customElement('ui-search-highlight')
export class SearchHighlight extends LitElement {
  @property({ type: String, reflect: true })
  origin: HighlightOrigin = 'search';

  @property({ type: Boolean, reflect: true })
  current = false;

  @property({ type: String })
  text = '';

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._injectDocumentStyles();
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
    return this.text === '' ? undefined : this.text;
  }

  override render() {
    return html`
      <mark
        data-origin="${this._resolvedOrigin}"
        data-current="${String(this.current)}"
        aria-current="${ifDefined(this.current ? 'true' : undefined)}"
      >
        <slot>${this._resolvedText}</slot>
      </mark>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-search-highlight': SearchHighlight;
  }
}

export { DOCUMENT_STYLE_ID, HIGHLIGHT_SCOPE_SELECTOR, HIGHLIGHT_RULE_TEMPLATE };
