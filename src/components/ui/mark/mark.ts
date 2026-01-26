import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * ui-mark - ハイライトテキストコンポーネント
 * 
 * テキストをマークアップ/ハイライトするためのコンポーネント
 * 
 * @element ui-mark
 * 
 * @slot - ハイライトするテキスト
 */
@customElement('ui-mark')
export class UiMark extends LitElement {
  static override styles = css`
    :host {
      display: inline;
    }

    mark {
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm, 0.25rem);
      font-weight: 500;
      font-style: normal;
      text-decoration: none;
    }

    /* デフォルトバリアント (モダンな青系に変更) */
    :host([variant="default"]) mark,
    :host(:not([variant])) mark {
      background-color: rgba(59, 130, 246, 0.15);
      color: var(--color-primary, #3b82f6);
    }

    /* サクセスバリアント (緑系) */
    :host([variant="success"]) mark {
      background-color: rgba(34, 197, 94, 0.15);
      color: var(--color-success, #16a34a);
    }

    /* ワーニングバリアント (オレンジ系) */
    :host([variant="warning"]) mark {
      background-color: rgba(251, 146, 60, 0.15);
      color: var(--color-warning, #c2410c);
    }

    /* デンジャーバリアント (赤系) */
    :host([variant="danger"]) mark {
      background-color: rgba(239, 68, 68, 0.15);
      color: var(--color-danger, #dc2626);
    }

    /* サブトルバリアント (控えめ) */
    :host([variant="subtle"]) mark {
      background-color: rgba(0, 0, 0, 0.05);
      color: var(--color-foreground, #0a0a0a);
    }

    /* ダークモード */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])[variant="default"]) mark,
      :host(:not([data-theme="light"]):not([variant])) mark {
        background-color: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
      }

      :host(:not([data-theme="light"])[variant="success"]) mark {
        background-color: rgba(34, 197, 94, 0.2);
        color: #4ade80;
      }

      :host(:not([data-theme="light"])[variant="warning"]) mark {
        background-color: rgba(251, 146, 60, 0.2);
        color: #fb923c;
      }

      :host(:not([data-theme="light"])[variant="danger"]) mark {
        background-color: rgba(239, 68, 68, 0.2);
        color: #f87171;
      }

      :host(:not([data-theme="light"])[variant="subtle"]) mark {
        background-color: rgba(255, 255, 255, 0.1);
        color: var(--color-foreground, #ededed);
      }
    }

    :host-context([data-theme="dark"][variant="default"]) mark,
    :host-context([data-theme="dark"]:not([variant])) mark {
      background-color: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }

    :host-context([data-theme="dark"][variant="success"]) mark {
      background-color: rgba(34, 197, 94, 0.2);
      color: #4ade80;
    }

    :host-context([data-theme="dark"][variant="warning"]) mark {
      background-color: rgba(251, 146, 60, 0.2);
      color: #fb923c;
    }

    :host-context([data-theme="dark"][variant="danger"]) mark {
      background-color: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    :host-context([data-theme="dark"][variant="subtle"]) mark {
      background-color: rgba(255, 255, 255, 0.1);
      color: var(--color-foreground, #ededed);
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'default' | 'success' | 'warning' | 'danger' | 'subtle' = 'default';

  override render() {
    return html`<mark><slot></slot></mark>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-mark': UiMark;
  }
}
