import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * スキップリンクコンポーネント
 *
 * キーボード利用時に最初のフォーカス対象となり、
 * メインコンテンツ領域へ素早く移動するためのリンクを提供します。
 */
@customElement('ui-skip-link')
export class SkipLink extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = css`
    :host {
      display: block;
    }

    a {
      position: fixed;
      top: var(--space-2, 8px);
      left: 50%;
      z-index: var(--z-max, 1000);

      transform: translate(-50%, -100%);
      clip-path: inset(50%);
      opacity: 0;
      transition: none;

      background: var(--fg-default);
      color: var(--bg-default);
      border: var(--border-width, 1px) solid var(--border-on-inverted);
      padding: var(--space-2, 8px) var(--space-4, 16px);
      border-radius: var(--radius-full, 9999px);
      box-shadow: var(--shadow-lg);

      font-family: var(--font-sans);
      font-weight: var(--font-medium, 500);
      font-size: var(--text-sm, 13px);
      line-height: var(--line-height-normal, 1.5);
      white-space: nowrap;
      max-inline-size: calc(100vw - var(--space-4, 16px));
      overflow: hidden;
      text-overflow: ellipsis;
      text-decoration: none;
    }

    @media (prefers-color-scheme: dark) {
      a {
        box-shadow: none;
      }
    }

    :host(:focus-visible) a,
    a:focus-visible {
      transform: translateX(-50%);
      clip-path: none;
      opacity: 1;
      outline: none;
    }

    @media (forced-colors: active) {
      a:focus-visible {
        outline: 3px solid CanvasText;
        background: Canvas;
        color: CanvasText;
        border-color: CanvasText;
      }
    }

    @media print {
      :host {
        display: none;
      }
    }
  `;

  /**
   * スキップ先のIDセレクタ
   */
  @property({ attribute: 'href', type: String })
  href = '#main-content';

  /**
   * 表示ラベル
   */
  @property({ type: String })
  label = 'メインコンテンツへスキップ';

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('tabindex')) {
      this.tabIndex = 0;
    }
  }

  override render() {
    return html`
      <a
        href="${this.href}"
        part="link"
        @click="${this.handleLinkClick}"
      >
        ${this.label}
      </a>
    `;
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (changedProperties.has('label')) {
      this.setAttribute('aria-label', this.label);
    }
    if (!changedProperties.has('href')) {
      return;
    }
    this.validateTargetConfiguration();
  }

  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLAnchorElement>('a')?.focus(options);
  }

  private readonly handleLinkClick = (): void => {
    const targetElement = this.getTargetElementFromHref();
    if (!targetElement) {
      return;
    }
    targetElement.focus();
  };

  /**
   * 開発時に設定不備を検出しやすくするための検証
   */
  private validateTargetConfiguration(): void {
    const targetId = this.getTargetIdFromHref();
    if (!targetId) {
      return;
    }

    const targetElement = this.ownerDocument.getElementById(targetId);
    if (!targetElement) {
      this.warnConfiguration(
        `[ui-skip-link]: Target element with selector '${this.href}' not found in the document.`,
      );
      return;
    }

    if (targetElement.getAttribute('tabindex') !== '-1') {
      this.warnConfiguration(
        `[ui-skip-link]: Target element '${this.href}' should have tabindex="-1" to guarantee programmatic focus.`,
      );
    }
  }

  private getTargetIdFromHref(): string | null {
    if (!this.href.startsWith('#')) {
      return null;
    }

    const targetId = this.href.slice(1).trim();
    if (!targetId) {
      return null;
    }

    return targetId;
  }

  private getTargetElementFromHref(): HTMLElement | null {
    const targetId = this.getTargetIdFromHref();
    if (!targetId) {
      return null;
    }
    return this.ownerDocument.getElementById(targetId);
  }

  private warnConfiguration(message: string): void {
    if (!this.shouldWarnInDevelopment()) {
      return;
    }
    console.warn(message);
  }

  private shouldWarnInDevelopment(): boolean {
    let nodeEnv: string | undefined;
    if ('process' in globalThis) {
      const processValue = globalThis.process as { env?: { NODE_ENV?: string } };
      nodeEnv = processValue.env?.NODE_ENV;
    }
    if (typeof nodeEnv === 'string') {
      return nodeEnv !== 'production';
    }

    const hostname = this.ownerDocument.defaultView?.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-skip-link': SkipLink;
  }
}
