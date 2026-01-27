import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

/**
 * ui-blockquote - セマンティックな引用ブロック
 * 
 * Markdownやコンテンツ内の引用をDesign Systemに基づいてスタイリングします。
 * アクセシビリティを考慮し、セマンティックなマークアップと適切なコントラスト比、
 * およびReduced Motionへの対応を提供します。
 * 
 * @element ui-blockquote
 * 
 * @slot - 引用内容（<p>要素を推奨）
 * 
 * @property variant - スタイルバリアント ('default' | 'highlighted' | 'bordered')
 * @property cite - 引用元URL。指定しない場合は属性が出力されません。
 * @property author - 著者名
 * @property source - 出典名
 * 
 * @csspart blockquote - 引用ブロック本体
 * @csspart footer - 著者情報フッター
 * @csspart author - 著者名
 * @csspart source - 出典元
 * 
 * @cssprop --blockquote-bg - 背景色（HSL計算ベース）
 * @cssprop --blockquote-border-color - ボーダー色
 * @cssprop --blockquote-text-color - テキスト色
 * @cssprop --blockquote-footer-color - フッターテキスト色
 */
@customElement('ui-blockquote')
export class UiBlockquote extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin: 0;

      /* -------------------------------------------------------------
       * HSL Color Workflow & Design Tokens
       * ------------------------------------------------------------- */
      --blockquote-bg: var(--color-primary-bg);
      --blockquote-border-color: var(--color-primary);
      --blockquote-text-color: var(--color-foreground);
      --blockquote-footer-color: var(--color-foreground-muted);
    }

    blockquote {
      margin: 0;
      padding: var(--space-4) var(--space-6);
      border-left: var(--border-width-3) solid var(--blockquote-border-color);
      background-color: var(--blockquote-bg);
      font-size: var(--text-base);
      line-height: var(--line-height-relaxed);
      color: var(--blockquote-text-color);
      border-radius: var(--radius-sm);
      transition: 
        background-color var(--motion-duration) var(--ease-out),
        border-color var(--motion-duration) var(--ease-out),
        color var(--motion-duration) var(--ease-out);
    }

    /* -------------------------------------------------------------
     * Variants
     * ------------------------------------------------------------- */

    /* Default (Simple) */
    :host([variant="default"]) blockquote,
    :host(:not([variant])) blockquote {
      background-color: transparent;
    }

    /* Bordered (背景色は Highlighted と同じ --color-primary-bg を使用、微差は統一) */
    :host([variant="bordered"]) blockquote {
      border: 1px solid var(--color-border);
      border-left: 3px solid var(--blockquote-border-color);
      background-color: var(--blockquote-bg);
    }

    /* -------------------------------------------------------------
     * Content Styling
     * ------------------------------------------------------------- */
     
    ::slotted(p) {
      margin: 0;
      margin-bottom: var(--space-3);
    }

    ::slotted(p:last-child) {
      margin-bottom: 0;
    }

    /* -------------------------------------------------------------
     * Footer (Author Info)
     * ------------------------------------------------------------- */
    
    footer {
      margin-top: var(--space-4);
      font-size: var(--text-sm);
      color: var(--blockquote-footer-color);
      font-style: normal;
    }

    .author {
      font-weight: var(--font-medium);
      color: var(--blockquote-text-color);
    }

    .source {
      margin-left: var(--space-2);
    }
    
    .source::before {
      content: "— ";
    }

    /* Links within cite */
    a {
      color: inherit;
      text-decoration: none;
      transition: color var(--duration-fast) ease-out;
      border-bottom: var(--link-decoration-thickness) solid transparent;
    }

    a:hover {
      color: var(--color-primary);
      border-color: var(--color-primary);
    }
    
    a:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-primary);
      outline-offset: var(--focus-ring-offset);
      border-radius: var(--radius-sm);
    }

    /* -------------------------------------------------------------
     * Accessibility: Reduced Motion
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      blockquote, 
      a,
      ::slotted(*) {
        transition-duration: 0.01ms !important;
      }
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
      <blockquote part="blockquote" cite=${ifDefined(this.cite || undefined)}>
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
      <footer part="footer">
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
          <span class="author" part="author">${this.author}</span>
          <span class="source" part="source">${this.source}</span>
        </cite>
      `;
    }

    if (this.author) {
      return html`<cite class="author" part="author">${this.author}</cite>`;
    }

    if (this.source) {
      return html`<cite class="source" part="source">${this.source}</cite>`;
    }

    return '';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-blockquote': UiBlockquote;
  }
}
