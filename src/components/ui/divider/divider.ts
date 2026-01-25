import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * ui-divider - 水平区切り線コンポーネント
 * 
 * Markdownやコンテンツ内の区切り線をLinear/Raycast風にスタイリングします
 * 
 * @element ui-divider
 * 
 * @fires - このコンポーネントはイベントを発火しません
 */
@customElement('ui-divider')
export class UiDivider extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
    }

    /* スペーシング */
    :host([spacing="tight"]) {
      margin: 0.75rem 0;
    }

    :host([spacing="normal"]),
    :host(:not([spacing])) {
      margin: 1.5rem 0;
    }

    :host([spacing="loose"]) {
      margin: 3rem 0;
    }

    .divider-container {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    /* 基本の区切り線 */
    hr {
      flex: 1;
      border: none;
      margin: 0;
      height: 1px;
      background-color: var(--divider-color, rgba(0, 0, 0, 0.1));
    }

    /* 太さバリエーション */
    :host([thickness="thin"]) hr,
    :host(:not([thickness])) hr {
      height: 1px;
    }

    :host([thickness="normal"]) hr {
      height: 2px;
    }

    :host([thickness="thick"]) hr {
      height: 3px;
    }

    /* スタイルバリアント */
    :host([variant="dashed"]) hr {
      background: none;
      border-top: 1px dashed var(--divider-color, rgba(0, 0, 0, 0.1));
    }

    :host([variant="dotted"]) hr {
      background: none;
      border-top: 1px dotted var(--divider-color, rgba(0, 0, 0, 0.1));
    }

    :host([variant="gradient"]) hr {
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--color-primary, #3b82f6) 20%,
        var(--color-accent, #8b5cf6) 80%,
        transparent 100%
      );
      opacity: 0.3;
    }

    /* ラベル付きディバイダー */
    .divider-label {
      padding: 0 1rem;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-foreground-muted, #6b7280);
      white-space: nowrap;
      background-color: var(--color-background, #ffffff);
    }

    /* ラベルがある場合の線 */
    :host([label]) .divider-container hr {
      flex: 1;
    }

    /* ダークモード */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        --divider-color: rgba(255, 255, 255, 0.1);
      }

      :host(:not([data-theme="light"])) .divider-label {
        color: var(--color-foreground-muted, #a1a1aa);
        background-color: var(--color-background, #0a0a0a);
      }
    }

    :host-context([data-theme="dark"]) {
      --divider-color: rgba(255, 255, 255, 0.1);
    }

    :host-context([data-theme="dark"]) .divider-label {
      color: var(--color-foreground-muted, #a1a1aa);
      background-color: var(--color-background, #0a0a0a);
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'solid' | 'dashed' | 'dotted' | 'gradient' = 'solid';

  @property({ type: String, reflect: true })
  spacing: 'tight' | 'normal' | 'loose' = 'normal';

  @property({ type: String, reflect: true })
  thickness: 'thin' | 'normal' | 'thick' = 'thin';

  @property({ type: String, reflect: true })
  label?: string;

  override render() {
    if (this.label) {
      // ラベル付きディバイダー
      return html`
        <div class="divider-container" role="separator" aria-orientation="horizontal">
          <hr aria-hidden="true" />
          <span class="divider-label">${this.label}</span>
          <hr aria-hidden="true" />
        </div>
      `;
    }

    // 通常のディバイダー
    return html`
      <hr role="separator" aria-orientation="horizontal" />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-divider': UiDivider;
  }
}
