import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * ui-blockquote - 引用ブロックコンポーネント
 * 
 * Markdownやコンテンツ内の引用をLinear/Raycast風にスタイリングします
 * 
 * @element ui-blockquote
 * 
 * @slot - 引用内容
 */
@customElement('ui-blockquote')
export class UiBlockquote extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin: 1.5rem 0;
    }

    blockquote {
      margin: 0;
      padding: 1rem 1.5rem;
      border-left: 3px solid var(--blockquote-border-color, var(--color-primary, #3b82f6));
      background-color: var(--blockquote-bg, rgba(0, 0, 0, 0.02));
      font-size: 1rem;
      line-height: 1.7;
      color: var(--color-foreground, #0a0a0a);
    }

    /* バリアント: デフォルト */
    :host([variant="default"]) blockquote,
    :host(:not([variant])) blockquote {
      background-color: transparent;
    }

    /* バリアント: ハイライト */
    :host([variant="highlighted"]) blockquote {
      background-color: var(--blockquote-bg, rgba(0, 0, 0, 0.03));
    }

    /* バリアント: ボーダー */
    :host([variant="bordered"]) blockquote {
      border: 1px solid var(--color-border, #e5e7eb);
      border-left: 3px solid var(--blockquote-border-color, var(--color-primary, #3b82f6));
      background-color: var(--blockquote-bg, rgba(0, 0, 0, 0.01));
    }

    /* スロットコンテンツのスタイリング */
    ::slotted(p) {
      margin: 0;
      margin-bottom: 0.75rem;
    }

    ::slotted(p:last-child) {
      margin-bottom: 0;
    }

    /* フッター（著者情報） */
    footer {
      margin-top: 1rem;
      font-size: 0.875rem;
      color: var(--color-foreground-muted, #6b7280);
      font-style: normal;
    }

    .author {
      font-weight: 500;
      color: var(--color-foreground, #0a0a0a);
    }

    .source {
      margin-left: 0.5rem;
    }

    .source::before {
      content: "— ";
    }

    /* cite リンク */
    a {
      color: inherit;
      text-decoration: none;
      transition: color 100ms ease-out;
    }

    a:hover {
      color: var(--color-primary, #3b82f6);
    }

    /* ダークモード */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) blockquote {
        --blockquote-bg: rgba(255, 255, 255, 0.03);
        color: var(--color-foreground, #ededed);
      }

      :host(:not([data-theme="light"])[variant="default"]) blockquote,
      :host(:not([data-theme="light"]):not([variant])) blockquote {
        background-color: transparent;
      }

      :host(:not([data-theme="light"])[variant="highlighted"]) blockquote {
        background-color: rgba(255, 255, 255, 0.05);
      }

      :host(:not([data-theme="light"])[variant="bordered"]) blockquote {
        border-color: var(--color-border, rgba(255, 255, 255, 0.1));
        background-color: rgba(255, 255, 255, 0.02);
      }

      :host(:not([data-theme="light"])) .author {
        color: var(--color-foreground, #ededed);
      }

      :host(:not([data-theme="light"])) footer {
        color: var(--color-foreground-muted, #a1a1aa);
      }
    }

    :host-context([data-theme="dark"]) blockquote {
      --blockquote-bg: rgba(255, 255, 255, 0.03);
      color: var(--color-foreground, #ededed);
    }

    :host-context([data-theme="dark"][variant="default"]) blockquote,
    :host-context([data-theme="dark"]:not([variant])) blockquote {
      background-color: transparent;
    }

    :host-context([data-theme="dark"][variant="highlighted"]) blockquote {
      background-color: rgba(255, 255, 255, 0.05);
    }

    :host-context([data-theme="dark"][variant="bordered"]) blockquote {
      border-color: var(--color-border, rgba(255, 255, 255, 0.1));
      background-color: rgba(255, 255, 255, 0.02);
    }

    :host-context([data-theme="dark"]) .author {
      color: var(--color-foreground, #ededed);
    }

    :host-context([data-theme="dark"]) footer {
      color: var(--color-foreground-muted, #a1a1aa);
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'default' | 'highlighted' | 'bordered' = 'default';

  @property({ type: String })
  cite?: string;

  @property({ type: String })
  author?: string;

  @property({ type: String })
  source?: string;

  override render() {
    return html`
      <blockquote cite=${this.cite || ''}>
        <slot></slot>
        ${this.renderFooter()}
      </blockquote>
    `;
  }

  private renderFooter() {
    if (!this.author && !this.source) {
      return '';
    }

    return html`
      <footer>
        ${this.cite
          ? html`<a href=${this.cite} target="_blank" rel="noopener noreferrer">${this.renderCitation()}</a>`
          : this.renderCitation()}
      </footer>
    `;
  }

  private renderCitation() {
    if (this.author && this.source) {
      return html`
        <cite>
          <span class="author">${this.author}</span>
          <span class="source">${this.source}</span>
        </cite>
      `;
    }

    if (this.author) {
      return html`<cite class="author">${this.author}</cite>`;
    }

    if (this.source) {
      return html`<cite class="source">${this.source}</cite>`;
    }

    return '';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-blockquote': UiBlockquote;
  }
}
