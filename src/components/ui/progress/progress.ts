import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

/**
 * ui-progress - プログレスバーコンポーネント
 * 
 * 線形および円形のプログレスバーを表示します
 * 
 * @element ui-progress
 */
@customElement('ui-progress')
export class UiProgress extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    /* 線形プログレスバー */
    .progress-bar {
      width: 100%;
      background-color: var(--progress-bg, rgba(0, 0, 0, 0.04));
      border-radius: var(--radius-full, 9999px);
      overflow: hidden;
      position: relative;
    }

    /* 高さバリエーション */
    :host([size="xs"]) .progress-bar {
      height: 2px;
    }

    :host([size="sm"]) .progress-bar,
    :host(:not([size])) .progress-bar {
      height: 4px;
    }

    :host([size="md"]) .progress-bar {
      height: 6px;
    }

    :host([size="lg"]) .progress-bar {
      height: 8px;
    }

    /* プログレスバーの塗り */
    .progress-fill {
      height: 100%;
      background-color: var(--color-primary, #3b82f6);
      /* シマー効果 */
      background-image: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.3) 50%,
        transparent 100%
      );
      background-size: 200% 100%;
      border-radius: var(--radius-full, 9999px);
      transition: width 300ms ease-out;
      animation: shimmer 3s linear infinite;
    }

    /* シマーアニメーション */
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* 色バリアント */
    :host([variant="success"]) .progress-fill {
      background-color: var(--color-success, #16a34a);
    }

    :host([variant="warning"]) .progress-fill {
      background-color: var(--color-warning, #c2410c);
    }

    :host([variant="danger"]) .progress-fill {
      background-color: var(--color-danger, #dc2626);
    }

    /* 不確定状態のアニメーション */
    @keyframes indeterminate {
      0% {
        left: -100%;
        width: 50%;
      }
      50% {
        left: 30%;
        width: 90%;
      }
      100% {
        left: 100%;
        width: 10%;
      }
    }

    .progress-fill.indeterminate {
      width: auto !important;
      position: absolute;
      top: 0;
      bottom: 0;
      background-image: none;
      animation: indeterminate 1.5s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
    }

    /* ラベル */
    .progress-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .progress-percentage {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-foreground-muted, #6b7280);
    }

    /* 円形プログレスバー */
    .progress-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    :host([size="xs"]) .progress-circle {
      width: 16px;
      height: 16px;
      --stroke-width: 2;
    }

    :host([size="sm"]) .progress-circle,
    :host(:not([size])) .progress-circle {
      width: 24px;
      height: 24px;
      --stroke-width: 2.5;
    }

    :host([size="md"]) .progress-circle {
      width: 32px;
      height: 32px;
      --stroke-width: 3;
    }

    :host([size="lg"]) .progress-circle {
      width: 48px;
      height: 48px;
      --stroke-width: 4;
    }

    .progress-circle svg {
      transform: rotate(-90deg);
    }

    .progress-circle-bg {
      fill: none;
      stroke: var(--progress-bg, rgba(0, 0, 0, 0.04));
      stroke-width: var(--stroke-width, 2.5);
    }

    .progress-circle-fill {
      fill: none;
      stroke: var(--color-primary, #3b82f6);
      stroke-width: var(--stroke-width, 2.5);
      stroke-linecap: round;
      transition: stroke-dashoffset 300ms ease-out;
    }

    :host([variant="success"]) .progress-circle-fill {
      stroke: var(--color-success, #16a34a);
    }

    :host([variant="warning"]) .progress-circle-fill {
      stroke: var(--color-warning, #c2410c);
    }

    :host([variant="danger"]) .progress-circle-fill {
      stroke: var(--color-danger, #dc2626);
    }

    .circle-label {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 0.625rem;
      font-weight: 600;
      color: var(--color-foreground, #0a0a0a);
    }

    :host([size="xs"]) .circle-label,
    :host([size="sm"]) .circle-label {
      display: none; /* 小さすぎるので非表示 */
    }

    :host([size="lg"]) .circle-label {
      font-size: 0.875rem;
    }

    /* 円形の不確定状態 */
    @keyframes spin {
      0% {
        transform: rotate(-90deg);
      }
      100% {
        transform: rotate(270deg);
      }
    }

    .progress-circle.indeterminate svg {
      animation: spin 1.5s linear infinite;
    }

    /* ダークモード */
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        --progress-bg: rgba(255, 255, 255, 0.1);
      }

      :host(:not([data-theme="light"])) .circle-label {
        color: var(--color-foreground, #ededed);
      }

      :host(:not([data-theme="light"])) .progress-percentage {
        color: var(--color-foreground-muted, #a1a1aa);
      }
    }

    :host-context([data-theme="dark"]) {
      --progress-bg: rgba(255, 255, 255, 0.1);
    }

    :host-context([data-theme="dark"]) .circle-label {
      color: var(--color-foreground, #ededed);
    }

    :host-context([data-theme="dark"]) .progress-percentage {
      color: var(--color-foreground-muted, #a1a1aa);
    }
  `;

  @property({ type: String, reflect: true })
  type: 'bar' | 'circle' = 'bar';

  @property({ type: Number })
  value = 0;

  @property({ type: String, reflect: true })
  size: 'xs' | 'sm' | 'md' | 'lg' = 'sm';

  @property({ type: String, reflect: true })
  variant: 'default' | 'success' | 'warning' | 'danger' = 'default';

  @property({ type: Boolean, reflect: true })
  indeterminate = false;

  @property({ type: Boolean })
  showLabel = false;

  private get normalizedValue(): number {
    return Math.max(0, Math.min(100, this.value));
  }

  private renderBarProgress() {
    const fillStyle = {
      width: this.indeterminate ? undefined : `${this.normalizedValue}%`,
    };

    return html`
      ${this.showLabel
        ? html`
            <div class="progress-label">
              <span class="progress-percentage">${this.normalizedValue}%</span>
            </div>
          `
        : ''}
      <div
        class="progress-bar"
        role="progressbar"
        aria-valuenow="${this.indeterminate ? undefined : this.normalizedValue}"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="${this.indeterminate ? 'Loading...' : `Progress: ${this.normalizedValue}%`}"
      >
        <div
          class="progress-fill ${this.indeterminate ? 'indeterminate' : ''}"
          style=${styleMap(fillStyle)}
        ></div>
      </div>
    `;
  }

  private renderCircleProgress() {
    // デフォルト sm (24px, 2.5px)
    let size = 24;
    let strokeWidth = 2.5;

    if (this.size === 'xs') {
      size = 16;
      strokeWidth = 2;
    } else if (this.size === 'md') {
      size = 32;
      strokeWidth = 3;
    } else if (this.size === 'lg') {
      size = 48;
      strokeWidth = 4;
    }

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = this.indeterminate
      ? circumference * 0.75
      : circumference - (this.normalizedValue / 100) * circumference;

    return html`
      <div
        class="progress-circle ${this.indeterminate ? 'indeterminate' : ''}"
        role="progressbar"
        aria-valuenow="${this.indeterminate ? undefined : this.normalizedValue}"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="${this.indeterminate ? 'Loading...' : `Progress: ${this.normalizedValue}%`}"
      >
        <svg width="${size}" height="${size}">
          <circle
            class="progress-circle-bg"
            cx="${size / 2}"
            cy="${size / 2}"
            r="${radius}"
          />
          <circle
            class="progress-circle-fill"
            cx="${size / 2}"
            cy="${size / 2}"
            r="${radius}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
          />
        </svg>
        ${this.showLabel && !this.indeterminate
          ? html`<span class="circle-label">${this.normalizedValue}%</span>`
          : ''}
      </div>
    `;
  }

  override render() {
    return this.type === 'circle' ? this.renderCircleProgress() : this.renderBarProgress();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-progress': UiProgress;
  }
}
