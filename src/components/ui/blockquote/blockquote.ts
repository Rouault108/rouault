import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export type BlockquoteVariant = 'default' | 'nested';

const VALID_VARIANTS = new Set<BlockquoteVariant>(['default', 'nested']);

/**
 * 引用セクション用コンポーネント。
 *
 * - 出典なし: `blockquote` 単体
 * - 出典あり: `figure > blockquote + figcaption > cite`
 */
@customElement('ui-blockquote')
export class Blockquote extends LitElement {
  static override styles = css`
    :host {
      display: block;
      color: var(--fg-default, oklch(20% 0 0));
    }

    figure {
      margin: 0;
    }

    .quote {
      margin-block: var(--space-6, 24px);
      margin-inline: 0;
      padding-block: 0;
      padding-inline: var(--space-4, 16px) 0;
      border-inline-start: var(--border-width-thick, 2px) solid
        var(--border-default, oklch(70% 0 0 / 0.28));
      color: var(--fg-default, oklch(20% 0 0));
      font-style: normal;
    }

    .quote > :first-child {
      margin-block-start: 0;
    }

    .quote > :last-child {
      margin-block-end: 0;
    }

    :host([variant='nested']) .quote {
      margin-block: var(--space-4, 16px);
      margin-inline-start: 0;
      padding-inline-start: var(--space-4, 16px);
      border-inline-start-color: var(--border-muted, var(--border-default, oklch(70% 0 0 / 0.28)));
    }

    .source {
      margin-block-start: var(--space-2, 8px);
      color: var(--fg-muted, oklch(48% 0 0));
      font-size: var(--text-xs, 12px);
      font-weight: var(--font-medium, 500);
      letter-spacing: var(--tracking-wide, 0.025em);
      line-height: var(--line-height-normal, 1.5);
    }

    .source cite {
      color: inherit;
      font-style: normal;
    }

    @media (forced-colors: active) {
      .quote {
        color: var(--fg-default, CanvasText);
        border-inline-start: var(--border-width-thick, 2px) solid var(--border-default, CanvasText);
        forced-color-adjust: auto;
      }

      .source,
      .source cite {
        color: var(--fg-muted, GrayText);
      }
    }

    @media print {
      .quote,
      figure {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .quote {
        border-inline-start-color: #000 !important;
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: BlockquoteVariant = 'default';

  @property({ type: String, reflect: true })
  source = '';

  @property({ type: String, reflect: true })
  cite = '';

  @property({ type: String, attribute: 'quote-lang', reflect: true })
  quoteLang = '';

  private get _resolvedVariant(): BlockquoteVariant {
    return VALID_VARIANTS.has(this.variant) ? this.variant : 'default';
  }

  private get _resolvedSourceText(): string {
    return this.source.trim();
  }

  private get _resolvedCite(): string | undefined {
    const value = this.cite.trim();
    return value === '' ? undefined : value;
  }

  private get _resolvedQuoteLang(): string | undefined {
    const explicit = this.quoteLang.trim();
    if (explicit !== '') return explicit;

    const hostLang = this.getAttribute('lang')?.trim() ?? '';
    return hostLang === '' ? undefined : hostLang;
  }

  private get _hasVisibleSourceSlot(): boolean {
    const children =
      'children' in this
        ? Array.from((this as typeof this & { children?: ArrayLike<Element> }).children ?? [])
        : [];

    return children.some((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.getAttribute('slot') !== 'source') return false;
      return (element.textContent?.trim() ?? '').length > 0;
    });
  }

  private get _hasSource(): boolean {
    return this._resolvedSourceText.length > 0 || this._hasVisibleSourceSlot;
  }

  private _renderSourceContent() {
    if (this._hasVisibleSourceSlot) {
      return html`<slot name="source"></slot>`;
    }

    return this._resolvedSourceText;
  }

  private _renderQuote() {
    return html`
      <blockquote
        class="quote"
        data-variant="${this._resolvedVariant}"
        cite="${ifDefined(this._resolvedCite)}"
        lang="${ifDefined(this._resolvedQuoteLang)}"
      >
        <slot></slot>
      </blockquote>
    `;
  }

  override render() {
    if (!this._hasSource) {
      return this._renderQuote();
    }

    return html`
      <figure>
        ${this._renderQuote()}
        <figcaption class="source">
          <cite>${this._renderSourceContent()}</cite>
        </figcaption>
      </figure>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-blockquote': Blockquote;
  }
}
