import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('ui-tag')
export class UiTag extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      font-family: var(--font-sans, system-ui, sans-serif);
      cursor: default;
    }

    :host([href]) {
      cursor: pointer;
    }

    :host([disabled]) {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* -------------------------------------------------------------
     * タグ本体
     * ------------------------------------------------------------- */
    .tag {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      border-radius: var(--radius-md, 0.375rem);
      font-weight: var(--font-medium, 500);
      line-height: 1; /* 垂直中央揃えのため */
      white-space: nowrap;
      text-decoration: none;
      transition:
        background-color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        border-color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        box-shadow var(--motion-duration, 200ms) var(--motion-easing, ease-out);
    }

    /* リンクの場合のホバー効果 */
    :host([href]) .tag:hover {
      /* transformなし。背景色やボーダーのみ変化 */
    }

    /* フォーカス状態 */
    .tag:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: var(--ring-offset, 2px);
    }

    /* -------------------------------------------------------------
     * サイズバリエーション（高密度化）
     * ------------------------------------------------------------- */
    :host([size="sm"]) .tag {
      padding: 3px 8px; /* 上下3px, 左右8px */
      font-size: 10px;
    }

    :host([size="md"]) .tag {
      padding: 4px 10px; /* 上下4px, 左右10px */
      font-size: 11px;
    }

    :host([size="lg"]) .tag {
      padding: 5px 12px; /* 上下5px, 左右12px */
      font-size: 12px;
    }

    /* -------------------------------------------------------------
     * バリアント × カラー
     * ------------------------------------------------------------- */

    /* Solid（塗りつぶし） */
    :host([variant="solid"]) .tag {
      background-color: var(--tag-bg);
      color: white;
      border: none;
    }

    :host([variant="solid"][href]) .tag:hover {
      filter: brightness(1.1);
    }

    /* Outlined（枠線のみ） */
    :host([variant="outlined"]) .tag {
      background-color: transparent;
      color: var(--tag-bg);
      border: 1px solid var(--tag-bg);
    }

    :host([variant="outlined"][href]) .tag:hover {
      background-color: var(--tag-bg);
      color: white;
    }

    /* Subtle（薄い背景・デフォルト） */
    :host([variant="subtle"]) .tag {
      background-color: color-mix(in srgb, var(--tag-bg) 12%, transparent);
      color: var(--tag-bg);
      border: none;
      /* font-weight: 600; 削除して 500 に戻す（知的で繊細な印象へ） */
    }

    :host([variant="subtle"][href]) .tag:hover {
      /* 背景色は変えず、内側に薄いボーダーを表示 */
      box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 30%, transparent);
    }

    /* -------------------------------------------------------------
     * カラー（ジャンル別）
     * ------------------------------------------------------------- */
    :host([color="music"]) {
      --tag-bg: var(--tag-music);
    }

    :host([color="literature"]) {
      --tag-bg: var(--tag-literature);
    }

    :host([color="art"]) {
      --tag-bg: var(--tag-art);
    }

    :host([color="cs"]) {
      --tag-bg: var(--tag-cs);
    }

    :host([color="economics"]) {
      --tag-bg: var(--tag-economics);
    }

    :host([color="sociology"]) {
      --tag-bg: var(--tag-sociology);
    }

    :host([color="politics"]) {
      --tag-bg: var(--tag-politics);
    }

    :host([color="law"]) {
      --tag-bg: var(--tag-law);
    }

    :host([color="math"]) {
      --tag-bg: var(--tag-math);
    }

    :host([color="default"]) {
      --tag-bg: var(--tag-default);
    }

    /* -------------------------------------------------------------
     * Prefix / Suffix スロット
     * ------------------------------------------------------------- */
    .prefix,
    .suffix {
      display: flex;
      align-items: center;
    }

    .prefix[hidden],
    .suffix[hidden] {
      display: none;
    }

    /* -------------------------------------------------------------
     * 削除ボタン
     * ------------------------------------------------------------- */
    .dismiss-button {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      margin-left: var(--space-1, 0.25rem);
      color: inherit;
      opacity: 0.7;
      transition: opacity var(--motion-duration, 200ms) var(--motion-easing, ease-out);
    }

    .dismiss-button:hover {
      opacity: 1;
    }

    .dismiss-button:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 1px;
      border-radius: 50%;
    }

    /* サイズごとの削除ボタン */
    :host([size="sm"]) .dismiss-button {
      width: 12px;
      height: 12px;
      font-size: 10px;
    }

    :host([size="md"]) .dismiss-button {
      width: 14px;
      height: 14px;
      font-size: 12px;
    }

    :host([size="lg"]) .dismiss-button {
      width: 16px;
      height: 16px;
      font-size: 14px;
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'solid' | 'outlined' | 'subtle' = 'subtle';

  @property({ type: String, reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md';

  @property({ type: String, reflect: true })
  color:
    | 'music'
    | 'literature'
    | 'art'
    | 'cs'
    | 'economics'
    | 'sociology'
    | 'politics'
    | 'law'
    | 'math'
    | 'default' = 'default';

  @property({ type: Boolean, reflect: true })
  dismissible = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: String })
  href = '';

  @state()
  private _hasPrefixContent = false;

  @state()
  private _hasSuffixContent = false;

  private _onPrefixSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasPrefixContent = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private _onSuffixSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasSuffixContent = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private _onDismiss(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('dismiss', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onClick(e: Event) {
    if (this.disabled) {
      e.preventDefault();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('click', {
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    const content = html`
      <div class="prefix" ?hidden="${!this._hasPrefixContent}">
        <slot name="prefix" @slotchange="${this._onPrefixSlotChange}"></slot>
      </div>
      <slot></slot>
      <div class="suffix" ?hidden="${!this._hasSuffixContent}">
        <slot name="suffix" @slotchange="${this._onSuffixSlotChange}"></slot>
      </div>
      ${this.dismissible
        ? html`
            <button
              class="dismiss-button"
              aria-label="削除"
              @click="${this._onDismiss}"
            >
              ✕
            </button>
          `
        : nothing}
    `;

    if (this.href && !this.disabled) {
      return html`
        <a
          class="tag"
          href="${this.href}"
          @click="${this._onClick}"
          tabindex="0"
        >
          ${content}
        </a>
      `;
    }

    return html`
      <span class="tag" @click="${this._onClick}" tabindex="${this.href ? 0 : -1}">
        ${content}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-tag': UiTag;
  }
}
