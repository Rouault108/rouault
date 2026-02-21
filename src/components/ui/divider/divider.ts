import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export type DividerVariant = 'section' | 'layout';

const VALID_VARIANTS = new Set<DividerVariant>(['section', 'layout']);

/** ドキュメントに注入するスタイルタグのID（重複注入防止） */
const DOCUMENT_STYLE_ID = 'ui-divider-document-styles';

/**
 * 区切り線スタイルの適用スコープ。
 *
 * - `.prose hr`
 * - `<ui-divider>` 内部の `hr`
 * - レイアウト境界用 `hr[data-divider-variant="layout"]`
 */
const DIVIDER_SCOPE_SELECTOR = ':where(.prose hr, ui-divider > hr, hr[data-divider-variant="layout"])';

const DOCUMENT_CSS = `
${DIVIDER_SCOPE_SELECTOR} {
  border: 0;
  border-top: var(--border-width) solid var(--border-ghost);
  margin: var(--space-12) 0;
  width: 100%;
}

@media (forced-colors: active) {
  ${DIVIDER_SCOPE_SELECTOR} {
    border-top-color: var(--border-ghost);
    forced-color-adjust: auto;
  }
}

@media print {
  ${DIVIDER_SCOPE_SELECTOR} {
    margin: var(--space-12) 0;
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`;

/**
 * 区切り線コンポーネント。
 *
 * ネイティブ `hr` を最終DOMとして出力し、意味論を維持する。
 */
@customElement('ui-divider')
export class Divider extends LitElement {
  @property({ type: String, reflect: true })
  variant: DividerVariant = 'section';

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

  private get _resolvedVariant(): DividerVariant {
    return VALID_VARIANTS.has(this.variant) ? this.variant : 'section';
  }

  private get _resolvedAriaLabel(): string | undefined {
    const label = this.getAttribute('aria-label')?.trim() ?? '';
    return label === '' ? undefined : label;
  }

  override render() {
    return html`
      <hr
        data-divider-variant="${this._resolvedVariant}"
        aria-label="${ifDefined(this._resolvedAriaLabel)}"
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-divider': Divider;
  }
}
