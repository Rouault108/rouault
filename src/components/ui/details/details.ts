import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';

export type DetailsVariant = 'default' | 'bordered';

let detailsUidCounter = 0;

/**
 * 詳細折りたたみ (Details) コンポーネント `<ui-details>`
 *
 * Progressive Disclosure（段階的開示）を実現するための開閉コンポーネントです。
 * Native `<details>` は閉じるアニメーションが困難なため採用せず、
 * `button + grid-template-rows + opacity + inert` で実装します。
 *
 * @slot summary - リッチな見出し領域。指定時は `summary` プロパティより優先。
 * @slot - 折りたたみコンテンツ本体
 *
 * @property {string} ariaLabel - トリガーのアクセシブルネーム（必須）
 * @property {string} summary - 見出しテキスト（summary slot 未指定時のフォールバック）
 * @property {boolean} open - 開閉状態
 * @property {'default' | 'bordered'} variant - 外枠バリアント
 * @property {boolean} region - コンテンツをランドマーク領域として扱うか
 *
 * @fires toggle - 開閉状態が変化した時（detail: { open: boolean }）
 */
@customElement('ui-details')
export class Details extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .root {
      display: block;
    }

    :host([variant='bordered']) .root {
      border: var(--border-width, 1px) solid var(--border-default, oklch(90% 0 0 / 0.12));
      border-radius: var(--radius-md, 6px);
      overflow: hidden;
    }

    .trigger {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      padding: var(--space-2, 8px) 0;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      color: var(--fg-default, oklch(20% 0 0));
      font-size: var(--text-base, 14px);
      font-weight: var(--font-medium, 500);
      line-height: var(--line-height-normal, 1.5);
      font-family: var(--font-sans);
      transition: color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
      -webkit-tap-highlight-color: transparent;
    }

    :host([variant='bordered']) .trigger {
      padding: var(--space-3, 12px);
    }

    .trigger::after {
      content: '';
      position: absolute;
      inset-inline: 0;
      top: 50%;
      min-height: var(--control-min-touch, 24px);
      transform: translateY(-50%);
      pointer-events: none;
    }

    .trigger:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
      border-radius: var(--radius-sm, 4px);
      z-index: 1;
    }

    .icon {
      flex-shrink: 0;
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      align-self: flex-start;
      margin-top: var(
        --ui-details-icon-offset-block-start,
        calc((1em * var(--line-height-normal, 1.5) - var(--icon-base, 16px)) / 2)
      );
      color: var(--fg-muted, oklch(48% 0 0));
      transform: rotate(0deg);
      transition:
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host([open]) .icon {
      transform: rotate(90deg);
    }

    .icon iconify-icon {
      display: block;
      font-size: var(--icon-base, 16px);
      stroke-width: 1.5;
      --svg-stroke-width: 1.5;
    }

    .summary {
      min-width: 0;
      color: var(--fg-default, oklch(20% 0 0));
      line-height: var(--line-height-normal, 1.5);
    }

    .content-wrapper {
      display: grid;
      grid-template-rows: 0fr;
      opacity: 0;
      overflow: hidden;
      visibility: hidden;
      transition:
        grid-template-rows var(--duration-slow, 200ms) var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45)),
        opacity var(--duration-slow, 200ms) var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45)),
        visibility 0s linear var(--duration-slow, 200ms);
    }

    :host([open]) .content-wrapper {
      grid-template-rows: 1fr;
      opacity: 1;
      visibility: visible;
      transition:
        grid-template-rows var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        opacity var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        visibility 0s linear 0s;
    }

    .content-inner {
      min-height: 0;
    }

    .content-body {
      margin-left: calc(var(--icon-base, 16px) + var(--space-2, 8px));
      padding: 0 0 var(--space-4, 16px) 0;
      color: var(--fg-default, oklch(20% 0 0));
      line-height: var(--line-height-normal, 1.5);
    }

    :host([variant='bordered']) .content-body {
      padding: 0 var(--space-4, 16px) var(--space-4, 16px);
    }

    @media (prefers-reduced-motion: reduce) {
      .icon,
      .content-wrapper {
        transition-duration: 0.01ms !important;
        transition-delay: 0ms !important;
      }
    }

    @media (forced-colors: active) {
      .icon {
        color: CanvasText;
      }

      :host([variant='bordered']) .root {
        border-color: CanvasText;
      }

      .trigger:focus-visible {
        outline: 2px solid CanvasText;
      }
    }
  `;

  private readonly _uid = ++detailsUidCounter;
  private readonly _contentId = `ui-details-content-${String(this._uid)}`;
  private readonly _summaryId = `ui-details-summary-${String(this._uid)}`;

  private _isReady = false;

  /**
   * トリガーのアクセシブルネーム（必須）
   */
  @property({ type: String, attribute: 'aria-label' })
  override ariaLabel = '';

  /**
   * サマリー文字列（slot未指定時のみ使用）
   */
  @property({ type: String, reflect: true })
  summary = '';

  /**
   * 開閉状態
   */
  @property({ type: Boolean, reflect: true })
  open = false;

  /**
   * 外枠バリアント
   */
  @property({ type: String, reflect: true })
  variant: DetailsVariant = 'default';

  /**
   * コンテンツを独立したセクションとして扱う時に有効化
   */
  @property({ type: Boolean, reflect: true })
  region = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._validateAccessibleName();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('ariaLabel')) {
      this._validateAccessibleName();
    }

    if (changedProperties.has('open') && this._isReady) {
      this._dispatchToggleEvent();
    }

    if (!this._isReady) {
      this._isReady = true;
    }
  }

  private _validateAccessibleName(): void {
    if (this.ariaLabel.trim().length > 0) return;
    throw new Error('[ui-details] `aria-label` は必須です。空文字または未指定は許可されません。');
  }

  private _dispatchToggleEvent(): void {
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>('toggle', {
        detail: { open: this.open },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onTriggerClick = (): void => {
    this.open = !this.open;
  };

  override render() {
    const normalizedAriaLabel = this.ariaLabel.trim();
    const hasAriaLabel = normalizedAriaLabel.length > 0;

    return html`
      <div class="${classMap({ root: true, bordered: this.variant === 'bordered' })}">
        <button
          type="button"
          class="trigger"
          part="trigger"
          id="${this._summaryId}"
          aria-expanded="${String(this.open)}"
          aria-controls="${this._contentId}"
          aria-label="${ifDefined(hasAriaLabel ? normalizedAriaLabel : undefined)}"
          @click="${this._onTriggerClick}"
        >
          <span class="icon" aria-hidden="true">
            <iconify-icon icon="lucide:chevron-right"></iconify-icon>
          </span>
          <span class="summary" part="summary">
            <slot name="summary">${this.summary}</slot>
          </span>
        </button>

        <div
          id="${this._contentId}"
          class="content-wrapper"
          part="content-wrapper"
          role="${ifDefined(this.region ? 'region' : undefined)}"
          aria-labelledby="${ifDefined(this.region ? this._summaryId : undefined)}"
          aria-hidden="${String(!this.open)}"
          ?inert="${!this.open}"
        >
          <div class="content-inner">
            <div class="content-body" part="content">
              <slot></slot>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-details': Details;
  }
}
