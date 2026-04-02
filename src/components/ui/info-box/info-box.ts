import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../icon/icon.js';

export type InfoBoxVariant = 'default' | 'filled';
export type InfoBoxDensity = 'comfortable' | 'compact';

const VALID_VARIANTS = new Set<InfoBoxVariant>(['default', 'filled']);
const VALID_DENSITIES = new Set<InfoBoxDensity>(['comfortable', 'compact']);

let infoBoxHeadingUid = 0;

/**
 * インフォボックス (Info Box) コンポーネント。
 *
 * 価値中立な参照情報を構造化して提示するための静的コンテナです。
 * `landmark=true`、`heading` あり、`headingLevel` 有効、本文が非空のときのみ
 * `role="region"` を公開し、それ以外は追加の意味ロールを公開しません。
 */
@customElement('ui-info-box')
export class InfoBox extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .info-box {
      display: grid;
      border: var(--border-style-subtle, 1px solid oklch(20% 0 0 / 0.12));
      border-radius: var(--radius-md, 6px);
      overflow: hidden;
      background: transparent;
      color: var(--fg-default, oklch(20% 0 0));
    }

    .info-box[data-variant='filled'] {
      background: var(--bg-fill-muted, oklch(96% 0 0));
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      padding: var(--space-3, 12px) var(--space-4, 16px);
      border-bottom: var(--border-style-subtle, 1px solid oklch(20% 0 0 / 0.12));
      font-size: var(--text-xs, 12px);
      font-weight: var(--font-semibold, 600);
      letter-spacing: var(--tracking-wide, 0.025em);
      line-height: var(--line-height-tight, 1.4);
      font-feature-settings: 'palt';
      color: var(--fg-muted, oklch(48% 0 0));
    }

    .info-box[data-variant='filled'] .header {
      color: var(--fg-default, oklch(20% 0 0));
    }

    .icon {
      display: flex;
      align-items: end;
      flex-shrink: 0;
      width: var(--icon-xs, 12px);
      height: calc(1em * var(--line-height-tight, 1.4));
      color: currentColor;
      stroke-width: 1.5;
      transform: translateY(0.5px);
    }

    .heading {
      min-width: 0;
      color: currentColor;
    }

    .body {
      padding: var(--space-4, 16px);
      min-width: 0;
    }

    :host([density='compact']) .header {
      padding: var(--space-2, 8px) var(--space-3, 12px);
    }

    :host([density='compact']) .body {
      padding: var(--space-3, 12px);
    }

    @media (forced-colors: active) {
      .info-box {
        border-color: CanvasText;
      }

      .header {
        border-bottom-color: CanvasText;
        color: CanvasText;
      }

      .icon {
        color: CanvasText;
      }
    }

    @media print {
      .info-box,
      .info-box[data-variant='filled'] {
        background: transparent;
      }
    }
  `;

  /**
   * ヘッダーラベルテキスト。空文字ならヘッダーは描画しません。
   */
  @property({ type: String, reflect: true })
  heading = '';

  /**
   * ヘッダー左側のアイコン名（プレフィックスなしの Lucide 名）。
   */
  @property({ type: String, reflect: true })
  icon = '';

  /**
   * ヘッダーの aria-level。1-6 のときのみ適用します。
   */
  @property({ type: Number, attribute: 'heading-level', reflect: true })
  headingLevel: number | undefined = undefined;

  /**
   * `true` かつ heading がある場合のみ region ランドマークとして公開します。
   */
  @property({ type: Boolean, reflect: true })
  landmark = false;

  /**
   * スタイルバリアント。
   */
  @property({ type: String, reflect: true })
  variant: InfoBoxVariant = 'default';

  /**
   * 視覚密度。
   */
  @property({ type: String, reflect: true })
  density: InfoBoxDensity = 'comfortable';

  private _headingId: string | null = null;
  private _contentObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._observeLightDomContent();
    this._syncHostSemantics();
  }

  override disconnectedCallback(): void {
    this._contentObserver?.disconnect();
    this._contentObserver = null;
    super.disconnectedCallback();
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (
      changedProperties.has('heading') ||
      changedProperties.has('headingLevel') ||
      changedProperties.has('landmark')
    ) {
      this._syncHostSemantics();
    }
  }

  private get _resolvedVariant(): InfoBoxVariant {
    if (VALID_VARIANTS.has(this.variant)) return this.variant;
    return 'default';
  }

  private get _resolvedHeading(): string {
    return this.heading.trim();
  }

  private get _hasHeading(): boolean {
    return this._resolvedHeading.length > 0;
  }

  private get _resolvedHeadingLevel(): number | null {
    if (!this._hasHeading) return null;
    if (typeof this.headingLevel !== 'number' || !Number.isFinite(this.headingLevel)) return null;
    if (!Number.isInteger(this.headingLevel)) return null;
    if (this.headingLevel < 1 || this.headingLevel > 6) return null;
    return this.headingLevel;
  }

  private get _resolvedIcon(): string {
    if (!this._hasHeading) return '';
    return this.icon.trim();
  }

  private get _resolvedDensity(): InfoBoxDensity {
    if (VALID_DENSITIES.has(this.density)) return this.density;
    return 'comfortable';
  }

  private _observeLightDomContent(): void {
    if (this._contentObserver) return;

    this._contentObserver = new MutationObserver(() => {
      this.requestUpdate();
    });
    this._contentObserver.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private _ensureHeadingId(): string {
    if (this._headingId) return this._headingId;

    const uid = ++infoBoxHeadingUid;
    const baseId = `info-box-heading-${String(uid)}`;

    let resolvedId = baseId;
    let suffix = 1;
    while (this.ownerDocument.querySelector(`#${resolvedId}`)) {
      resolvedId = `${baseId}-${String(suffix)}`;
      suffix += 1;
    }

    this._headingId = resolvedId;
    return resolvedId;
  }

  private _hasMeaningfulSlotContent(): boolean {
    return Array.from(this.childNodes).some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return true;
      if (node.nodeType !== Node.TEXT_NODE) return false;
      return (node.textContent ?? '').trim().length > 0;
    });
  }

  /**
   * ホスト要素のセマンティクスを受け入れ基準に沿って同期します。
   */
  private _syncHostSemantics(): void {
    if (!this._hasMeaningfulSlotContent()) {
      this.removeAttribute('role');
      this.removeAttribute('aria-labelledby');
      return;
    }

    if (this.landmark && this._hasHeading && this._resolvedHeadingLevel !== null) {
      const headingId = this._ensureHeadingId();
      this.setAttribute('role', 'region');
      this.setAttribute('aria-labelledby', headingId);
      return;
    }

    this.removeAttribute('role');
    this.removeAttribute('aria-labelledby');
  }

  override render() {
    if (!this._hasMeaningfulSlotContent()) return nothing;

    const heading = this._resolvedHeading;
    const hasHeading = heading.length > 0;
    const headingLevel = this._resolvedHeadingLevel;
    const icon = this._resolvedIcon;
    const headingId = hasHeading ? this._ensureHeadingId() : '';

    return html`
      <section
        class="info-box"
        data-variant="${this._resolvedVariant}"
        data-density="${this._resolvedDensity}"
      >
        ${hasHeading
          ? html`
              <div class="header">
                ${icon.length > 0
                  ? html`<ui-icon class="icon" name="${icon}" aria-hidden="true"></ui-icon>`
                  : nothing}
                <div
                  id="${headingId}"
                  class="heading"
                  role="${headingLevel !== null ? 'heading' : nothing}"
                  aria-level="${ifDefined(
                    headingLevel !== null ? String(headingLevel) : undefined,
                  )}"
                >
                  ${heading}
                </div>
              </div>
            `
          : nothing}

        <div class="body">
          <slot></slot>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-info-box': InfoBox;
  }
}
