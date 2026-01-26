import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * ui-spinner - ローディングスピナーコンポーネント
 * 
 * ローディング状態を示すシンプルなスピナー
 * 
 * @element ui-spinner
 * 
 * @property {('xs'|'sm'|'md'|'lg')} size - スピナーのサイズ
 * @property {('default'|'success'|'warning'|'danger')} variant - 色バリアント
 * @property {string} label - アクセシビリティ用のラベル（デフォルト: "Loading..."）
 */
@customElement('ui-spinner')
export class UiSpinner extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      --spinner-color: var(--color-primary, #3b82f6);
    }

    .spinner {
      display: inline-block;
      position: relative;
    }

    /* サイズバリエーション */
    :host([size="xs"]) .spinner {
      width: 12px;
      height: 12px;
    }

    :host([size="sm"]) .spinner {
      width: 16px;
      height: 16px;
    }

    :host([size="md"]) .spinner,
    :host(:not([size])) .spinner {
      width: 24px;
      height: 24px;
    }

    :host([size="lg"]) .spinner {
      width: 32px;
      height: 32px;
    }

    /* 円形スピナー */
    .spinner-circle {
      width: 100%;
      height: 100%;
      border: 2px solid transparent;
      border-top-color: var(--spinner-color);
      border-right-color: var(--spinner-color);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* xs/sm サイズは細い線 */
    :host([size="xs"]) .spinner-circle {
      border-width: 1.5px;
    }

    :host([size="sm"]) .spinner-circle {
      border-width: 2px;
    }

    /* 回転アニメーション */
    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    /* アニメーション削減設定への対応 */
    @media (prefers-reduced-motion: reduce) {
      .spinner-circle {
        animation: none;
        /* アニメーションなしでも視覚的フィードバックを提供 */
        opacity: 0.7;
      }
    }

    /* 色バリアント */
    :host([variant="success"]) {
      --spinner-color: var(--color-success, #16a34a);
    }

    :host([variant="warning"]) {
      --spinner-color: var(--color-warning, #c2410c);
    }

    :host([variant="danger"]) {
      --spinner-color: var(--color-danger, #dc2626);
    }

    /* アクセシビリティ用の非表示テキスト */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* ダークモード */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        --spinner-color: var(--color-primary, #60a5fa);
      }

      :host(:not([data-theme="light"])[variant="success"]) {
        --spinner-color: var(--color-success, #4ade80);
      }

      :host(:not([data-theme="light"])[variant="warning"]) {
        --spinner-color: var(--color-warning, #fb923c);
      }

      :host(:not([data-theme="light"])[variant="danger"]) {
        --spinner-color: var(--color-danger, #f87171);
      }
    }

    :host-context([data-theme="dark"]) {
      --spinner-color: var(--color-primary, #60a5fa);
    }

    :host-context([data-theme="dark"][variant="success"]) {
      --spinner-color: var(--color-success, #4ade80);
    }

    :host-context([data-theme="dark"][variant="warning"]) {
      --spinner-color: var(--color-warning, #fb923c);
    }

    :host-context([data-theme="dark"][variant="danger"]) {
      --spinner-color: var(--color-danger, #f87171);
    }
  `;

  @property({ type: String, reflect: true })
  size: 'xs' | 'sm' | 'md' | 'lg' = 'md';

  @property({ type: String, reflect: true })
  variant: 'default' | 'success' | 'warning' | 'danger' = 'default';

  @property({ type: String })
  label = 'Loading...';

  override render() {
    return html`
      <div class="spinner" role="status" aria-live="polite" aria-label="${this.label}">
        <div class="spinner-circle"></div>
        <span class="sr-only">${this.label}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-spinner': UiSpinner;
  }
}
