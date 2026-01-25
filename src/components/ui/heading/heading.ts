import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * ui-heading - 見出しスタイリングコンポーネント
 * 
 * Markdownの見出しやコンテンツ内の見出しをLinear/Raycast風にスタイリングします
 * 
 * @element ui-heading
 * 
 * @slot - 見出しテキスト
 */
@customElement('ui-heading')
export class UiHeading extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    h1, h2, h3, h4, h5, h6 {
      margin: 0;
      padding: 0;
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      color: var(--color-foreground, #0a0a0a);
      line-height: 1.2;
      letter-spacing: -0.01em;
    }

    /* タイポグラフィスケール */
    h1 {
      font-size: 2.25rem; /* 36px */
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 1rem;
    }

    h2 {
      font-size: 1.875rem; /* 30px */
      font-weight: 700;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
    }

    h3 {
      font-size: 1.5rem; /* 24px */
      font-weight: 600;
      margin-top: 1.75rem;
      margin-bottom: 0.5rem;
    }

    h4 {
      font-size: 1.25rem; /* 20px */
      font-weight: 600;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }

    h5 {
      font-size: 1.125rem; /* 18px */
      font-weight: 600;
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
    }

    h6 {
      font-weight: 600;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.875rem; /* h6は少し小さめ */
    }

    /* グラデーションバリアント */
    :host([variant="gradient"]) h1,
    :host([variant="gradient"]) h2,
    :host([variant="gradient"]) h3,
    :host([variant="gradient"]) h4,
    :host([variant="gradient"]) h5,
    :host([variant="gradient"]) h6 {
      background: linear-gradient(
        135deg,
        var(--color-primary, #3b82f6) 0%,
        var(--color-accent, #8b5cf6) 100%
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      padding-bottom: 0.1em;
    }

    /* アンダーラインバリアント */
    :host([variant="underlined"]) h1,
    :host([variant="underlined"]) h2,
    :host([variant="underlined"]) h3,
    :host([variant="underlined"]) h4,
    :host([variant="underlined"]) h5,
    :host([variant="underlined"]) h6 {
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--color-border, #e5e7eb);
    }

    /* プレーンバリアント */
    :host([variant="plain"]) h1,
    :host([variant="plain"]) h2,
    :host([variant="plain"]) h3,
    :host([variant="plain"]) h4,
    :host([variant="plain"]) h5,
    :host([variant="plain"]) h6 {
      font-weight: 500;
      letter-spacing: 0;
    }

    /* Muted（控えめな色） */
    :host([muted]) h1,
    :host([muted]) h2,
    :host([muted]) h3,
    :host([muted]) h4,
    :host([muted]) h5,
    :host([muted]) h6 {
      color: var(--color-foreground-muted, #6b7280);
    }

    /* マージンなし */
    :host([noMargin]) h1,
    :host([noMargin]) h2,
    :host([noMargin]) h3,
    :host([noMargin]) h4,
    :host([noMargin]) h5,
    :host([noMargin]) h6 {
      margin: 0;
    }

    /* ダークモード */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) h1,
      :host(:not([data-theme="light"])) h2,
      :host(:not([data-theme="light"])) h3,
      :host(:not([data-theme="light"])) h4,
      :host(:not([data-theme="light"])) h5,
      :host(:not([data-theme="light"])) h6 {
        color: var(--color-foreground, #ededed);
      }

      :host(:not([data-theme="light"])[muted]) h1,
      :host(:not([data-theme="light"])[muted]) h2,
      :host(:not([data-theme="light"])[muted]) h3,
      :host(:not([data-theme="light"])[muted]) h4,
      :host(:not([data-theme="light"])[muted]) h5,
      :host(:not([data-theme="light"])[muted]) h6 {
        color: var(--color-foreground-muted, #a1a1aa);
      }

      :host(:not([data-theme="light"])[variant="underlined"]) h1,
      :host(:not([data-theme="light"])[variant="underlined"]) h2,
      :host(:not([data-theme="light"])[variant="underlined"]) h3,
      :host(:not([data-theme="light"])[variant="underlined"]) h4,
      :host(:not([data-theme="light"])[variant="underlined"]) h5,
      :host(:not([data-theme="light"])[variant="underlined"]) h6 {
        border-color: var(--color-border, rgba(255, 255, 255, 0.1));
      }
    }

    :host-context([data-theme="dark"]) h1,
    :host-context([data-theme="dark"]) h2,
    :host-context([data-theme="dark"]) h3,
    :host-context([data-theme="dark"]) h4,
    :host-context([data-theme="dark"]) h5,
    :host-context([data-theme="dark"]) h6 {
      color: var(--color-foreground, #ededed);
    }

    :host-context([data-theme="dark"])[muted] h1,
    :host-context([data-theme="dark"])[muted] h2,
    :host-context([data-theme="dark"])[muted] h3,
    :host-context([data-theme="dark"])[muted] h4,
    :host-context([data-theme="dark"])[muted] h5,
    :host-context([data-theme="dark"])[muted] h6 {
      color: var(--color-foreground-muted, #a1a1aa);
    }

    :host-context([data-theme="dark"])[variant="underlined"] h1,
    :host-context([data-theme="dark"])[variant="underlined"] h2,
    :host-context([data-theme="dark"])[variant="underlined"] h3,
    :host-context([data-theme="dark"])[variant="underlined"] h4,
    :host-context([data-theme="dark"])[variant="underlined"] h5,
    :host-context([data-theme="dark"])[variant="underlined"] h6 {
      border-color: var(--color-border, rgba(255, 255, 255, 0.1));
    }
  `;

  @property({ type: Number, reflect: true })
  level: 1 | 2 | 3 | 4 | 5 | 6 = 1;

  @property({ type: String, reflect: true })
  variant: 'default' | 'gradient' | 'underlined' | 'plain' = 'default';

  @property({ type: Boolean, reflect: true })
  muted = false;

  @property({ type: Boolean, reflect: true })
  noMargin = false;

  override render() {
    // Litのhtml関数で動的タグを作成
    // 注: Litでは動的タグ名を直接サポートしていないため、unsafeHTMLまたは条件分岐が必要
    switch (this.level) {
      case 1:
        return html`<h1><slot></slot></h1>`;
      case 2:
        return html`<h2><slot></slot></h2>`;
      case 3:
        return html`<h3><slot></slot></h3>`;
      case 4:
        return html`<h4><slot></slot></h4>`;
      case 5:
        return html`<h5><slot></slot></h5>`;
      case 6:
        return html`<h6><slot></slot></h6>`;
      default:
        return html`<h2><slot></slot></h2>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-heading': UiHeading;
  }
}
