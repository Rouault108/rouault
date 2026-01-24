import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * ui-code - インラインコード表示用コンポーネント
 * 
 * @element ui-code
 * 
 * @slot - コードの内容
 * 
 * @cssprop --code-bg - 背景色
 * @cssprop --code-text - テキスト色
 * @cssprop --code-border - ボーダー色
 */
@customElement('ui-code')
export class UiCode extends LitElement {
  static override styles = css`
    :host {
      display: inline;
      /* デフォルトカラー */
      --code-bg: var(--color-background-subtle, #f9fafb);
      --code-text: var(--color-foreground, #111827);
      --code-border: var(--color-border, #e5e7eb);
    }

    /* コードコンテナ */
    .code {
      display: inline;
      padding: 0.125rem 0.375rem; /* 2px 6px */
      background-color: var(--code-bg);
      border: 1px solid var(--code-border);
      border-radius: 3px; /* トークンにないためハードコーディング */
      color: var(--code-text);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.9em; /* 親要素のフォントサイズの90% */
      line-height: var(--line-height-none, 1);
      white-space: nowrap;
      word-break: break-all;
    }

    /* バリアント: Primary */
    :host([variant="primary"]) {
      --code-bg: color-mix(in srgb, var(--color-primary, #3b82f6), transparent 92%);
      --code-text: var(--color-primary, #3b82f6);
      --code-border: color-mix(in srgb, var(--color-primary, #3b82f6), transparent 70%);
    }

    /* バリアント: Success */
    :host([variant="success"]) {
      --code-bg: color-mix(in srgb, var(--color-success, #22c55e), transparent 92%);
      --code-text: var(--color-success-text, #166534);
      --code-border: color-mix(in srgb, var(--color-success, #22c55e), transparent 70%);
    }

    /* バリアント: Warning */
    /* tokens.cssに Amber 600 の定義がないため、アクセシビリティ向上のため直接指定 */
    :host([variant="warning"]) {
      --code-bg: color-mix(in srgb, #d97706, transparent 92%);
      --code-text: var(--color-warning-text, #92400e);
      --code-border: color-mix(in srgb, #d97706, transparent 70%);
    }

    /* バリアント: Error */
    :host([variant="error"]) {
      --code-bg: color-mix(in srgb, var(--color-error, #ef4444), transparent 92%);
      --code-text: var(--color-error-text, #991b1b);
      --code-border: color-mix(in srgb, var(--color-error, #ef4444), transparent 70%);
    }

    /* ダークモード対応 */
    @media (prefers-color-scheme: dark) {
      :host:not([data-theme="light"]) {
        --code-bg: var(--color-background-subtle, #171717);
        --code-text: var(--color-foreground, #ededed);
        --code-border: var(--color-border, #27272a);
      }

      :host([variant="primary"]):not([data-theme="light"]) {
        --code-bg: color-mix(in srgb, var(--color-primary, #60a5fa), transparent 88%);
        --code-text: var(--color-primary, #60a5fa);
        --code-border: color-mix(in srgb, var(--color-primary, #60a5fa), transparent 70%);
      }

      :host([variant="success"]):not([data-theme="light"]) {
        --code-bg: color-mix(in srgb, var(--color-success, #4ade80), transparent 88%);
        --code-text: #86efac; /* tokens.css未定義のため直接指定 */
        --code-border: color-mix(in srgb, var(--color-success, #4ade80), transparent 70%);
      }

      :host([variant="warning"]):not([data-theme="light"]) {
        --code-bg: color-mix(in srgb, #fbbf24, transparent 88%); /* tokens.css未定義 */
        --code-text: #fcd34d; /* tokens.css未定義 */
        --code-border: color-mix(in srgb, #fbbf24, transparent 70%);
      }

      :host([variant="error"]):not([data-theme="light"]) {
        --code-bg: color-mix(in srgb, var(--color-error, #f87171), transparent 88%);
        --code-text: #fca5a5; /* tokens.css未定義のため直接指定 */
        --code-border: color-mix(in srgb, var(--color-error, #f87171), transparent 70%);
      }
    }

    :host-context([data-theme="dark"]) {
      --code-bg: var(--color-background-subtle, #171717);
      --code-text: var(--color-foreground, #ededed);
      --code-border: var(--color-border, #27272a);
    }

    :host-context([data-theme="dark"]):host([variant="primary"]) {
      --code-bg: color-mix(in srgb, var(--color-primary, #60a5fa), transparent 88%);
      --code-text: var(--color-primary, #60a5fa);
      --code-border: color-mix(in srgb, var(--color-primary, #60a5fa), transparent 70%);
    }

    :host-context([data-theme="dark"]):host([variant="success"]) {
      --code-bg: color-mix(in srgb, var(--color-success, #4ade80), transparent 88%);
      --code-text: #86efac; /* tokens.css未定義のため直接指定 */
      --code-border: color-mix(in srgb, var(--color-success, #4ade80), transparent 70%);
    }

    :host-context([data-theme="dark"]):host([variant="warning"]) {
      --code-bg: color-mix(in srgb, #fbbf24, transparent 88%); /* tokens.css未定義 */
      --code-text: #fcd34d; /* tokens.css未定義 */
      --code-border: color-mix(in srgb, #fbbf24, transparent 70%);
    }

    :host-context([data-theme="dark"]):host([variant="error"]) {
      --code-bg: color-mix(in srgb, var(--color-error, #f87171), transparent 88%);
      --code-text: #fca5a5; /* tokens.css未定義のため直接指定 */
      --code-border: color-mix(in srgb, var(--color-error, #f87171), transparent 70%);
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'default' | 'primary' | 'success' | 'warning' | 'error' = 'default';

  override render() {
    return html`<code class="code"><slot></slot></code>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-code': UiCode;
  }
}
