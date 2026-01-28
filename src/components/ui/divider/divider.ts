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
      --line-thickness: var(--border-width-1);
    }

    /* スペーシング */
    :host([spacing="tight"]) {
      margin: var(--space-3) var(--space-none);
    }

    :host([spacing="normal"]),
    :host(:not([spacing])) {
      margin: var(--space-6) var(--space-none);
    }

    :host([spacing="loose"]) {
      margin: var(--space-12) var(--space-none);
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
      margin: var(--space-none);
      height: var(--line-thickness);
      background-color: var(--color-border);
      transition:
        background-color var(--motion-duration) var(--motion-easing),
        border-color var(--motion-duration) var(--motion-easing),
        opacity var(--motion-duration) var(--motion-easing);
    }

    /* 太さの定義 */
    :host([thickness="thin"]),
    :host(:not([thickness])) {
      --line-thickness: var(--border-width-1);
    }

    :host([thickness="normal"]) {
      --line-thickness: var(--border-width-2);
    }

    :host([thickness="thick"]) {
      --line-thickness: var(--border-width-3);
    }

    /* スタイルバリアント */
    :host([variant="dashed"]) hr {
      background: none;
      height: 0;
      border-top-style: dashed;
      border-top-width: var(--line-thickness);
      border-top-color: var(--color-border);
    }

    :host([variant="dotted"]) hr {
      background: none;
      height: 0;
      border-top-style: dotted;
      border-top-width: var(--line-thickness);
      border-top-color: var(--color-border);
    }

    :host([variant="gradient"]) hr {
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--color-primary) 20%,
        var(--color-accent) 80%,
        transparent 100%
      );
      opacity: var(--opacity-30);
    }

    /* ラベル付きディバイダー */
    .divider-label {
      padding: var(--space-none) var(--space-4);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wider);
      color: var(--color-foreground-muted);
      white-space: nowrap;
      background-color: var(--color-background);
    }
    @media (prefers-contrast: more) {
      hr {
        height: var(--border-width-2);
        background-color: var(--color-foreground-muted);
      }
    }

    /* Windows High Contrast Mode (forced-colors) */
    @media (forced-colors: active) {
      hr {
        /* 背景色による線は消えるため、ボーダーに置換 */
        background-color: transparent;
        border-top: 1px solid CanvasText;
        height: 0;
      }
      
      /* 太さのバリエーション対応 */
      :host([thickness="normal"]) hr {
        border-top-width: 2px;
      }
      
      :host([thickness="thick"]) hr {
        border-top-width: 3px;
      }
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
