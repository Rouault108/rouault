import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { srOnlyStyle } from '../../../styles/a11y.js';

/**
 * ui-link - アクセシブルなリンクコンポーネント
 *
 * @cssprop --link-color - リンクの色
 * @cssprop --link-hover-color - ホバー時のリンク色
 *
 * @slot - リンクテキスト
 *
 * @fires click - リンクがクリックされたときに発火（disabled でない場合）
 */
@customElement('ui-link')
export class UiLink extends LitElement {
  static override styles = [
    srOnlyStyle,
    css`
    /* -------------------------------------------------------------
     * ホスト要素
     * ------------------------------------------------------------- */
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: var(--text-base, 0.875rem);
      line-height: var(--line-height-normal, 1.5);
    }

    /* -------------------------------------------------------------
     * リンク要素
     * ------------------------------------------------------------- */
    a {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      
      color: var(--link-color, var(--color-primary, #3b82f6));
      text-decoration: none;
      
      font-weight: var(--font-medium, 500);
      
      transition:
        color var(--motion-duration, 200ms) var(--ease-out, ease-out),
        text-decoration var(--motion-duration, 200ms) var(--ease-out, ease-out);
      
      cursor: pointer;
    }

    a:hover {
      color: var(--link-hover-color, var(--color-primary-hover, #2563eb));
    }

    a:focus-visible {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
      border-radius: var(--radius-sm, 0.25rem);
    }

    /* -------------------------------------------------------------
     * バリアント: Primary（デフォルト）
     * ------------------------------------------------------------- */
    :host([variant='primary']) a {
      color: var(--color-primary, #3b82f6);
      text-decoration: none;
    }

    :host([variant='primary']) a:hover {
      color: var(--color-primary-hover, #2563eb);
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    /* -------------------------------------------------------------
     * バリアント: Secondary
     * ------------------------------------------------------------- */
    :host([variant='secondary']) a {
      color: var(--color-foreground, #111827);
      text-decoration: none;
    }

    :host([variant='secondary']) a:hover {
      color: var(--color-primary, #3b82f6);
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    /* -------------------------------------------------------------
     * バリアント: Subtle
     * ------------------------------------------------------------- */
    :host([variant='subtle']) a {
      color: var(--color-foreground-muted, #6b7280);
      text-decoration: none;
      font-weight: var(--font-normal, 400);
    }

    :host([variant='subtle']) a:hover {
      color: var(--color-foreground, #111827);
    }

    /* -------------------------------------------------------------
     * バリアント: Underline
     * ------------------------------------------------------------- */
    :host([variant='underline']) a {
      color: var(--color-foreground, #111827);
      text-decoration: underline;
      text-underline-offset: 0.2em;
      text-decoration-thickness: 1px;
    }

    :host([variant='underline']) a:hover {
      color: var(--color-primary, #3b82f6);
      text-decoration-thickness: 2px;
    }

    /* -------------------------------------------------------------
     * 無効状態
     * ------------------------------------------------------------- */
    :host([disabled]) a {
      color: var(--color-foreground-muted, #6b7280);
      opacity: 0.5;
      cursor: not-allowed;
      text-decoration: none;
      pointer-events: none;
    }

    /* -------------------------------------------------------------
     * 外部リンクアイコン
     * ------------------------------------------------------------- */
    .external-icon {
      display: inline-block;
      width: 1em;
      height: 1em;
      margin-left: 0.125em;
      flex-shrink: 0;
    }
  ];

    /* -------------------------------------------------------------
     * サイズバリエーション
     * ------------------------------------------------------------- */
    :host([size='sm']) {
      font-size: var(--text-sm, 0.8125rem);
    }

    :host([size='md']) {
      font-size: var(--text-base, 0.875rem);
    }

    :host([size='lg']) {
      font-size: var(--text-lg, 1rem);
    }

    /* -------------------------------------------------------------
     * ダークモード対応
     * ------------------------------------------------------------- */
    @media (prefers-color-scheme: dark) {
      :host([variant='primary']) a {
        color: var(--color-primary, #60a5fa);
      }

      :host([variant='primary']) a:hover {
        color: var(--color-primary-hover, #93c5fd);
      }

      :host([variant='secondary']) a {
        color: var(--color-foreground, #ededed);
      }

      :host([variant='secondary']) a:hover {
        color: var(--color-primary, #60a5fa);
      }

      :host([variant='subtle']) a {
        color: var(--color-foreground-muted, #a1a1aa);
      }

      :host([variant='subtle']) a:hover {
        color: var(--color-foreground, #ededed);
      }

      :host([variant='underline']) a {
        color: var(--color-foreground, #ededed);
      }

      :host([variant='underline']) a:hover {
        color: var(--color-primary, #60a5fa);
      }

      :host([disabled]) a {
        color: var(--color-foreground-muted, #71717a);
      }
    }

    /* data-theme="dark" 対応 */
    :host-context([data-theme='dark']):host([variant='primary']) a {
      color: var(--color-primary, #60a5fa);
    }

    :host-context([data-theme='dark']):host([variant='primary']) a:hover {
      color: var(--color-primary-hover, #93c5fd);
    }

    :host-context([data-theme='dark']):host([variant='secondary']) a {
      color: var(--color-foreground, #ededed);
    }

    :host-context([data-theme='dark']):host([variant='secondary']) a:hover {
      color: var(--color-primary, #60a5fa);
    }

    :host-context([data-theme='dark']):host([variant='subtle']) a {
      color: var(--color-foreground-muted, #a1a1aa);
    }

    :host-context([data-theme='dark']):host([variant='subtle']) a:hover {
      color: var(--color-foreground, #ededed);
    }

    :host-context([data-theme='dark']):host([variant='underline']) a {
      color: var(--color-foreground, #ededed);
    }

    :host-context([data-theme='dark']):host([variant='underline']) a:hover {
      color: var(--color-primary, #60a5fa);
    }

    :host-context([data-theme='dark']):host([disabled]) a {
      color: var(--color-foreground-muted, #71717a);
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      a {
        transition: none;
      }
    }
  `];

  @property({ type: String })
  href = '';

  @property({ type: String, reflect: true })
  variant: 'primary' | 'secondary' | 'subtle' | 'underline' = 'primary';

  @property({ type: String, reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md';

  @property({ type: Boolean, reflect: true })
  external = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  private _handleClick(e: MouseEvent) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // カスタムイベントを発火
    this.dispatchEvent(
      new CustomEvent('click', {
        detail: { href: this.href },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <a
        href=${this.disabled ? 'javascript:void(0);' : this.href}
        target=${this.external ? '_blank' : nothing}
        rel=${this.external ? 'noopener noreferrer' : nothing}
        aria-disabled=${this.disabled ? 'true' : nothing}
        @click=${this._handleClick}
      >
        <slot></slot>
        ${this.external && !this.disabled
          ? html`
              <span class="sr-only">（外部リンク、新しいタブで開きます）</span>
              <!-- Lucide external-link icon (Inline SVG) -->
              <svg
                class="external-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" x2="21" y1="14" y2="3" />
              </svg>
            `
          : ''}
      </a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-link': UiLink;
  }
}
