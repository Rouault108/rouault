import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * 構文セクション (Syntax Section) コンポーネント
 *
 * ui-syntax-card のコンテンツ領域内で使用するセクションです。
 * ラベル付きの見出しとスロット化されたコンテンツを描画します。
 */
@customElement('ui-syntax-section')
export class SyntaxSection extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .section-title {
      margin: 0 0 var(--space-1, 0.25rem);
      font-size: var(--text-sm, 0.8125rem);
      font-weight: var(--font-bold, 700);
      color: var(--fg-muted, oklch(48% 0 0));
    }

    ::slotted(p) {
      padding: var(--space-2, 0.5rem);
    }

    @media (forced-colors: active) {
      .section-title {
        color: CanvasText;
      }
    }
  `;

  private static _instanceCount = 0;

  /** セクション見出しラベル */
  @property({ type: String })
  label = '';

  private readonly _headingId = `ui-syntax-section-${String(SyntaxSection._instanceCount++)}`;

  override render() {
    return html`
      <section aria-labelledby="${this._headingId}">
        <p id="${this._headingId}" class="section-title">${this.label}</p>
        <slot></slot>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-syntax-section': SyntaxSection;
  }
}
