import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../../../lib/icons';

export type InfoBoxVariant = 'default' | 'filled';

const VALID_VARIANTS = new Set<InfoBoxVariant>(['default', 'filled']);

let infoBoxHeadingId = 0;

/**
 * インフォボックス (Info Box) コンポーネント。
 *
 * 価値中立な参照情報を構造化して提示するための静的コンテナです。
 * `landmark=true` かつ `heading` がある場合のみ `role="region"` とし、
 * それ以外は `role="note"` へフォールバックします。
 */
@customElement('ui-info-box')
export class InfoBox extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .info-box {
      display: grid;
      border: var(--border-style-subtle, 1px solid oklch(20% 0.03 250 / 0.12));
      border-radius: var(--radius-md, 6px);
      overflow: hidden;
      background: transparent;
      color: var(--fg-default, oklch(20% 0.01 250));
    }

    .info-box[data-variant='filled'] {
      background: var(--bg-fill-muted, oklch(96% 0.01 250));
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      padding: var(--space-3, 12px) var(--space-4, 16px);
      border-bottom: var(--border-style-subtle, 1px solid oklch(20% 0.03 250 / 0.12));
      font-size: var(--text-xs, 12px);
      font-weight: var(--font-semibold, 600);
      letter-spacing: var(--tracking-wide, 0.025em);
      line-height: var(--line-height-tight, 1.4);
      font-feature-settings: 'palt';
      color: var(--fg-muted, oklch(48% 0.01 250));
    }

    .info-box[data-variant='filled'] .header {
      color: var(--fg-default, oklch(20% 0.01 250));
    }

    .icon {
      flex-shrink: 0;
      width: var(--icon-xs, 12px);
      height: var(--icon-xs, 12px);
      color: currentColor;
      stroke-width: 1.5;
    }

    .heading {
      min-width: 0;
      color: currentColor;
    }

    .body {
      padding: var(--space-4, 16px);
      min-width: 0;
      color: var(--fg-default, oklch(20% 0.01 250));
      line-height: var(--line-height-relaxed, 1.75);
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
  `;

  /**
   * ヘッダーラベルテキスト。空文字ならヘッダーは描画しません。
   */
  @property({ type: String, reflect: true })
  heading = '';

  /**
   * ヘッダー左側のアイコン名（`lucide:*`）。
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

  private readonly _headingId = `ui-info-box-heading-${String(++infoBoxHeadingId)}`;

  override connectedCallback(): void {
    super.connectedCallback();
    this._syncHostSemantics();
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('heading') || changedProperties.has('landmark')) {
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

    const normalized = Math.trunc(this.headingLevel);
    if (normalized < 1 || normalized > 6) return null;

    return normalized;
  }

  private get _resolvedIcon(): string {
    if (!this._hasHeading) return '';
    return this.icon.trim();
  }

  /**
   * ホスト要素のセマンティクスを受け入れ基準に沿って同期します。
   */
  private _syncHostSemantics(): void {
    if (this.landmark && this._hasHeading) {
      this.setAttribute('role', 'region');
      this.setAttribute('aria-labelledby', this._headingId);
      return;
    }

    this.setAttribute('role', 'note');
    this.removeAttribute('aria-labelledby');
  }

  override render() {
    const heading = this._resolvedHeading;
    const hasHeading = heading.length > 0;
    const headingLevel = this._resolvedHeadingLevel;
    const icon = this._resolvedIcon;

    return html`
      <section class="info-box" data-variant="${this._resolvedVariant}">
        ${hasHeading
          ? html`
              <div class="header">
                ${icon.length > 0
                  ? html`<iconify-icon class="icon" icon="lucide:${icon}" aria-hidden="true"></iconify-icon>`
                  : nothing}
                <div
                  id="${this._headingId}"
                  class="heading"
                  role="${headingLevel !== null ? 'heading' : nothing}"
                  aria-level="${ifDefined(headingLevel !== null ? String(headingLevel) : undefined)}"
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
