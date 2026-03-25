import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type DividerVariant = 'section' | 'layout';

export const DEFAULT_DIVIDER_VARIANT: DividerVariant = 'section';

const VALID_VARIANTS = new Set<DividerVariant>([DEFAULT_DIVIDER_VARIANT, 'layout']);

/** ドキュメントに注入するスタイルタグのID（重複注入防止） */
export const DOCUMENT_STYLE_ID = 'ui-divider-document-styles';

/**
 * 区切り線スタイルの適用スコープ。
 *
 * - `.prose hr`
 * - `<ui-divider>` 内部の `hr`
 * - レイアウト境界用 `hr[data-divider-variant="layout"]`
 */
export const DIVIDER_SCOPE_SELECTOR =
  ':where(.prose hr, ui-divider > hr, hr[data-divider-variant="layout"])';

const DOCUMENT_CSS = `
ui-divider {
  display: block;
}

${DIVIDER_SCOPE_SELECTOR} {
  border: 0;
  border-top: var(--border-style-subtle, 1px solid var(--border-default, oklch(20% 0 0 / 0.12)));
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
 * 公開列挙外の値を `section` へ解決する。
 *
 * `variant` は意味分類であり、未知の値を拡張点として扱わない。
 */
export const resolveDividerVariant = (
  variant: string | null | undefined,
): DividerVariant => {
  if (variant && VALID_VARIANTS.has(variant as DividerVariant)) {
    return variant as DividerVariant;
  }

  return DEFAULT_DIVIDER_VARIANT;
};

/**
 * Divider スタイルをドキュメントへ注入する。
 * `.prose hr` 契約を満たすため、コンポーネント実体の有無に依存させない。
 */
export const ensureDividerDocumentStyles = (): void => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(DOCUMENT_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = DOCUMENT_STYLE_ID;
  style.textContent = DOCUMENT_CSS;
  document.head.appendChild(style);
};

/**
 * 区切り線コンポーネント。
 *
 * ネイティブ `hr` を最終DOMとして出力し、意味論を維持する。
 */
@customElement('ui-divider')
export class Divider extends LitElement {
  @property({ type: String, reflect: true })
  variant: DividerVariant = DEFAULT_DIVIDER_VARIANT;

  override createRenderRoot(): this {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    ensureDividerDocumentStyles();
  }

  private get _resolvedVariant(): DividerVariant {
    return resolveDividerVariant(this.variant);
  }

  override render() {
    return html`<hr data-divider-variant="${this._resolvedVariant}" />`;
  }
}

ensureDividerDocumentStyles();

declare global {
  interface HTMLElementTagNameMap {
    'ui-divider': Divider;
  }
}
