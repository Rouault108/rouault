import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

type BadgeVariant = 'solid' | 'subtle' | 'dot';
type BadgeColor = 'danger' | 'primary' | 'neutral' | 'success' | 'warning';
type BadgeAnnounceMode = 'auto' | 'off';
type BadgeRenderState = 'dot' | 'count' | 'slot' | 'empty';

const DEFAULT_MAX = 99;

const VALID_VARIANTS = new Set<BadgeVariant>(['solid', 'subtle', 'dot']);
const VALID_COLORS = new Set<BadgeColor>(['danger', 'primary', 'neutral', 'success', 'warning']);

const numberAttributeConverter = {
  fromAttribute(value: string | null): number | null {
    if (value === null) return null;

    const normalized = value.trim();
    if (normalized.length === 0) return null;

    return Number(normalized);
  },
  toAttribute(value: number | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return String(value);
  },
};

/**
 * バッジ (Badge) コンポーネント `<ui-badge>`
 *
 * `ui-badge` は、件数、状態、更新有無などの小さなシステム状態を提示します。
 * 形状は pill を基本とし、`variant="dot"` の場合に限って最小の視覚インジケーターとして正円を採用します。
 *
 * ## 公開契約
 *
 * - 表示優先順位は `dot > count > slot`
 * - `variant="dot"` は `aria-label` がある場合に限って成立
 * - 数値状態は既定で静的表示、`announce="auto"` の場合のみ `role="status"` を付与
 * - `countAriaLabel` がある場合は数値状態のアクセシブルネームを明示値で上書き
 * - `count` / `max` は契約どおりに正規化し、不正値は `count` では不在、`max` では既定値へ収束
 *
 * @property {'solid' | 'subtle' | 'dot'} variant - 視覚バリアント。未知値は既定値 `solid` として扱う
 * @property {number | null | undefined} count - 件数。数値として解釈できない場合は不在として扱う
 * @property {number | null | undefined} max - 表示上限。不正値は既定値 `99` として扱う
 * @property {'danger' | 'primary' | 'neutral' | 'success' | 'warning'} color - 意味色。未知値は `primary` として扱う
 * @property {string | null} ariaLabelText - `aria-label` 属性に対応する dot 用代替テキスト
 * @property {string | null} countAriaLabel - 数値状態のアクセシブルネーム上書き
 * @property {'auto' | 'off'} announce - 数値状態の通知モード
 *
 * @slot - `count` が不在かつ `variant="dot"` が不成立のときに表示する短いラベル
 */
@customElement('ui-badge')
export class Badge extends LitElement {
  static override styles = css`
    :host {
      --badge-bg: var(--primary);
      --badge-fg: var(--on-primary);
      --badge-dot: var(--badge-bg);

      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      font-size: var(--text-2xs, 11px);
      font-weight: var(--font-bold, 700);
      letter-spacing: var(--tracking-wider, 0.05em);
      line-height: 1;

      height: var(--control-height-2xs, 16px);
      border-radius: var(--radius-full, 9999px);
    }

    :host([data-render-state='empty']) {
      display: none;
    }

    :host([data-color='neutral']) {
      --badge-bg: var(--fg-default);
      --badge-fg: var(--bg-default);
    }

    :host([data-color='primary']) {
      --badge-bg: var(--primary);
      --badge-fg: var(--on-primary);
    }

    :host([data-color='success']) {
      --badge-bg: var(--success);
      --badge-fg: var(--on-success);
    }

    :host([data-color='danger']) {
      --badge-bg: var(--danger);
      --badge-fg: var(--on-danger);
    }

    :host([data-color='warning']) {
      --badge-bg: var(--warning);
      --badge-fg: var(--on-warning);
    }

    :host([data-variant='solid']) {
      min-width: var(--control-height-2xs, 16px);
      max-width: 12ch;
      padding: 0 var(--space-1, 4px);
      background: var(--badge-bg);
      color: var(--badge-fg);
    }

    :host([data-variant='subtle']) {
      padding: 0 var(--space-2, 8px);
      background: var(--bg-surface-2, var(--bg-default));
      color: var(--badge-bg);
      border: var(--border-width, 1px) solid var(--badge-bg);
    }

    :host([data-variant='dot']) {
      width: var(--space-2, 8px);
      min-width: 8px;
      height: var(--space-2, 8px);
      min-height: 8px;
      padding: 0;
      background: var(--badge-dot);
    }

    span {
      transform: translateY(-0.05em);
    }

    @media (forced-colors: active) {
      :host {
        border: var(--border-width, 1px) solid ButtonText;
      }

      :host([data-variant='solid']) {
        background-color: ButtonText;
        color: ButtonFace;
        border: var(--border-width, 1px) solid ButtonText;
      }

      :host([data-variant='subtle']) {
        background-color: ButtonFace;
        color: ButtonText;
        border: var(--border-width, 1px) solid ButtonText;
      }

      :host([data-variant='dot']) {
        width: 10px;
        height: 10px;
        background-color: ButtonText;
        border: var(--border-width, 1px) solid ButtonText;
      }
    }
  `;

  private readonly _slotContentObserver =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => {
          this.requestUpdate();
        });

  @property({ type: String, reflect: true })
  variant: BadgeVariant = 'solid';

  @property({ reflect: true, converter: numberAttributeConverter })
  count: number | null | undefined = null;

  @property({ reflect: true, converter: numberAttributeConverter })
  max: number | null | undefined = DEFAULT_MAX;

  @property({ type: String, reflect: true })
  color: BadgeColor = 'primary';

  @property({ attribute: 'aria-label', type: String })
  ariaLabelText: string | null = null;

  @property({ attribute: 'count-aria-label', type: String })
  countAriaLabel: string | null = null;

  @property({ type: String, reflect: true })
  announce: BadgeAnnounceMode = 'off';

  override connectedCallback(): void {
    super.connectedCallback();

    this._slotContentObserver?.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  override disconnectedCallback(): void {
    this._slotContentObserver?.disconnect();
    super.disconnectedCallback();
  }

  protected override willUpdate(): void {
    const renderState = this._renderState;
    const renderVariant = this._renderVariant;

    this.setAttribute('data-render-state', renderState);
    this.setAttribute('data-variant', renderVariant);
    this.setAttribute('data-color', this._normalizedColor);
  }

  private _parseFiniteNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized.length === 0) return null;

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private _normalizeNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private get _normalizedVariant(): BadgeVariant {
    return VALID_VARIANTS.has(this.variant) ? this.variant : 'solid';
  }

  private get _normalizedColor(): BadgeColor {
    return VALID_COLORS.has(this.color) ? this.color : 'primary';
  }

  private get _normalizedAnnounce(): BadgeAnnounceMode {
    return this.announce === 'auto' ? 'auto' : 'off';
  }

  private get _normalizedCount(): number | null {
    const parsed = this._parseFiniteNumber(this.count);
    if (parsed === null) return null;
    return Math.max(0, Math.floor(parsed));
  }

  private get _normalizedMax(): number {
    const parsed = this._parseFiniteNumber(this.max);
    if (parsed === null) return DEFAULT_MAX;
    return Math.max(1, Math.floor(parsed));
  }

  private get _normalizedDotLabel(): string | null {
    return this._normalizeNonEmptyString(this.ariaLabelText);
  }

  private get _normalizedCountAriaLabel(): string | null {
    return this._normalizeNonEmptyString(this.countAriaLabel);
  }

  private get _hasVisibleSlotContent(): boolean {
    return [...this.childNodes].some((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent?.trim().length ?? 0) > 0;
      }

      return node.nodeType === Node.ELEMENT_NODE;
    });
  }

  private get _renderState(): BadgeRenderState {
    if (this._normalizedVariant === 'dot' && this._normalizedDotLabel !== null) {
      return 'dot';
    }

    if (this._normalizedCount !== null) {
      return 'count';
    }

    if (this._hasVisibleSlotContent) {
      return 'slot';
    }

    return 'empty';
  }

  private get _renderVariant(): BadgeVariant {
    if (this._renderState === 'dot') return 'dot';
    return this._normalizedVariant === 'subtle' ? 'subtle' : 'solid';
  }

  private get _displayText(): string | null {
    const count = this._normalizedCount;
    if (count === null) return null;

    const max = this._normalizedMax;
    return count > max ? `${String(max)}+` : String(count);
  }

  private get _generatedCountAriaLabel(): string | null {
    const count = this._normalizedCount;
    if (count === null) return null;
    return `${String(count)} 件`;
  }

  private get _countAccessibleName(): string | null {
    return this._normalizedCountAriaLabel ?? this._generatedCountAriaLabel;
  }

  override render() {
    if (this._renderState === 'empty') {
      return nothing;
    }

    if (this._renderState === 'dot') {
      return html`<span
        role="img"
        aria-label=${ifDefined(this._normalizedDotLabel ?? undefined)}
      ></span>`;
    }

    if (this._renderState === 'count') {
      return html`<span
        role=${ifDefined(this._normalizedAnnounce === 'auto' ? 'status' : undefined)}
        aria-label=${ifDefined(this._countAccessibleName ?? undefined)}
        >${this._displayText}</span
      >`;
    }

    return html`<span><slot></slot></span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-badge': Badge;
  }
}
