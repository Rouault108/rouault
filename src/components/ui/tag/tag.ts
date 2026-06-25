import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * タグ (Tag) コンポーネント `<ui-tag>`
 *
 * コンテンツのメタデータやカテゴリーを表現します。
 * 「静謐さ」を最優先し、デフォルトでは彩度を抑えた Subtle Style を採用します。
 *
 * ## 構造パターン
 *
 * - **通常（装飾的）**: `<span>` ルート
 * - **Link Only (`href` のみ)**: ルートが `<a>` タグ
 * - **Removable Only (`removable` のみ)**: `<span>` ルート + 内部に `<button>`
 * - **Link + Removable**: `<div role="group">` + `<a>` + `<button>` の並列配置
 *   （HTML 仕様: Interactive content nesting 禁止に準拠）
 *
 * ## 補助ターゲット
 *
 * タグ自体のサイズが小さい（xs: 20px / sm: 24px）ため、
 * すべてのインタラクティブ要素に `::after` 疑似要素で最小 24×24px を確保します。
 * タッチ主体の配置では、周辺レイアウト側で 44×44px 相当の余白確保を推奨します。
 *
 * @property {'default' | 'outline' | 'solid' | 'plain'} variant - スタイルバリアント
 * @property {'xs' | 'sm'} size - サイズ
 * @property {'neutral' | 'red' | 'blue' | 'violet' | 'pink' | 'gold'} color - 意味的カラー
 * @property {boolean} removable - 削除ボタンを表示するか
 * @property {string | undefined} href - リンク先URL
 * @property {boolean} disabled - 非活性状態
 *
 * @fires ui-tag-remove - 削除ボタンがクリックされた時に発火。detail: { value: string }
 *
 * @slot icon - 先頭に配置するアイコン（自動的に 12px に調整）
 * @slot - タグのテキスト内容
 *
 * @cssprop --hue-base     - ベース色相
 * @cssprop --hue-blue     - Blue 色相 (デフォルト: 230)
 * @cssprop --hue-violet   - Violet 色相 (デフォルト: 280)
 * @cssprop --hue-pink     - Pink 色相 (デフォルト: 340)
 * @cssprop --hue-gold     - Gold 色相 (デフォルト: 85)
 * @cssprop --chroma-subtle  - Subtle 彩度
 * @cssprop --chroma-ui      - UI 彩度
 * @cssprop --chroma-neutral - Neutral 彩度 (0)
 * @cssprop --chroma-high    - High 彩度
 * @cssprop --border-width   - ボーダー幅
 * @cssprop --border-default - ホバー時ボーダー色
 * @cssprop --space-1        - gap (4px)
 * @cssprop --space-2        - padding (8px)
 * @cssprop --radius-sm      - 角丸 (4px)
 * @cssprop --text-xs        - フォントサイズ (12px)
 * @cssprop --font-medium    - フォントウェイト (500)
 * @cssprop --icon-xs        - アイコンサイズ (12px)
 * @cssprop --control-height-xs - xs 高さ (20px)
 * @cssprop --control-height-sm - sm 高さ (24px)
 * @cssprop --control-min-touch - 最低タッチターゲット (24px)
 * @cssprop --opacity-disabled  - 無効時の不透明度 (0.5)
 * @cssprop --focus-ring-width  - フォーカスリング幅
 * @cssprop --focus-ring-color  - フォーカスリング色
 * @cssprop --focus-ring-offset - フォーカスリングオフセット
 * @cssprop --animation-focus   - Adaptive Focus アニメーション
 * @cssprop --white             - 白色 (solid バリアントの文字色)
 *
 * @example
 * ```html
 * <!-- 基本的なタグ -->
 * <ui-tag>JavaScript</ui-tag>
 *
 * <!-- カラー付き -->
 * <ui-tag color="blue">Computer Science</ui-tag>
 * <ui-tag color="gold">Literature</ui-tag>
 *
 * <!-- リンク付き -->
 * <ui-tag href="/tags/javascript">JavaScript</ui-tag>
 *
 * <!-- 削除可能 -->
 * <ui-tag removable>Python</ui-tag>
 *
 * <!-- リンク + 削除（並列配置） -->
 * <ui-tag href="/tags/rust" removable>Rust</ui-tag>
 *
 * <!-- アイコン付き -->
 * <ui-tag color="blue">
 *   <svg slot="icon" viewBox="0 0 12 12">...</svg>
 *   TypeScript
 * </ui-tag>
 *
 * <!-- Solid バリアント -->
 * <ui-tag variant="solid" color="red">New</ui-tag>
 *
 * <!-- Plain バリアント -->
 * <ui-tag variant="plain" color="blue">Muted</ui-tag>
 * ```
 */
@customElement('ui-tag')
export class Tag extends LitElement {
  static override styles = css`
    /* ──────────────────────────────────────────────
       CSS カスタムプロパティ: Tag Recipe
       テーマ解決は tokens.css 側に集約し、このコンポーネントは
       root から供給される tag 専用 semantic token を読むだけにする。
    ────────────────────────────────────────────── */
    :host {
      /* Hue マッピング（上位から上書き可能） */
      --ui-tag-hue-blue: var(--hue-blue, 230);
      --ui-tag-hue-violet: var(--hue-violet, 280);
      --ui-tag-hue-pink: var(--hue-pink, 340);
      --ui-tag-hue-gold: var(--hue-gold, 85);

      /* Recipe defaults */
      --tag-bg-l: var(--tag-surface-l, 96%);
      --tag-fg-l: var(--tag-content-l, 45%);
      --tag-bg-chroma: var(--tag-neutral-bg-chroma, 0);
      --tag-fg-chroma: var(--tag-neutral-fg-chroma, 0);
      --tag-delta-bg-l: var(--tag-neutral-delta-bg-l, 2%);
      --tag-delta-fg-l: var(--tag-neutral-delta-fg-l, 0%);
      --border-color: transparent;

      /* Layout */
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      gap: var(--space-1, 4px);
      max-width: 100%;
      position: relative;

      /* Typography */
      font-size: var(--text-xs, 12px);
      font-weight: var(--font-medium, 500);
      white-space: nowrap;
      overflow: visible;

      /* Shape */
      padding: 0 var(--space-2, 8px);
      border-radius: var(--radius-sm, 4px);

      /* Final Color Calculation */
      background-color: oklch(
        calc(var(--tag-bg-l) + var(--tag-delta-bg-l)) var(--tag-bg-chroma)
          var(--tag-hue, var(--hue-base, 0))
      );
      color: oklch(
        calc(var(--tag-fg-l) + var(--tag-delta-fg-l)) var(--tag-fg-chroma)
          var(--tag-hue, var(--hue-base, 0))
      );
      border: var(--border-width, 1px) solid var(--border-color);

      /* Transition */
      transition:
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* ── Size ── */
    :host([size='sm']) {
      height: var(--control-height-sm, 24px);
    }

    :host(:not([size='sm'])) {
      height: var(--control-height-xs, 20px);
    }

    /* ── Color Mapping ── */
    :host([color='neutral']) {
      --tag-hue: var(--hue-base, 0);
      --tag-bg-chroma: var(--tag-neutral-bg-chroma, 0);
      --tag-fg-chroma: var(--tag-neutral-fg-chroma, 0);
      --tag-delta-bg-l: var(--tag-neutral-delta-bg-l, 2%);
      --tag-delta-fg-l: var(--tag-neutral-delta-fg-l, 0%);
    }

    :host([color='red']) {
      --tag-hue: var(--hue-base, 0);
      --tag-bg-chroma: var(--tag-accent-bg-chroma, var(--chroma-subtle, 0.02));
      --tag-fg-chroma: var(--tag-accent-fg-chroma, var(--chroma-ui, 0.05));
      --tag-delta-bg-l: var(--tag-accent-delta-bg-l, 0%);
      --tag-delta-fg-l: var(--tag-accent-delta-fg-l, 0%);
    }

    :host([color='blue']) {
      --tag-hue: var(--ui-tag-hue-blue);
      --tag-bg-chroma: var(--tag-accent-bg-chroma, var(--chroma-subtle, 0.02));
      --tag-fg-chroma: var(--tag-accent-fg-chroma, var(--chroma-ui, 0.05));
      --tag-delta-bg-l: var(--tag-accent-delta-bg-l, 0%);
      --tag-delta-fg-l: var(--tag-accent-delta-fg-l, 0%);
    }

    :host([color='violet']) {
      --tag-hue: var(--ui-tag-hue-violet);
      --tag-bg-chroma: var(--tag-accent-bg-chroma, var(--chroma-subtle, 0.02));
      --tag-fg-chroma: var(--tag-accent-fg-chroma, var(--chroma-ui, 0.05));
      --tag-delta-bg-l: var(--tag-accent-delta-bg-l, 0%);
      --tag-delta-fg-l: var(--tag-accent-delta-fg-l, 0%);
    }

    :host([color='pink']) {
      --tag-hue: var(--ui-tag-hue-pink);
      --tag-bg-chroma: var(--tag-accent-bg-chroma, var(--chroma-subtle, 0.02));
      --tag-fg-chroma: var(--tag-accent-fg-chroma, var(--chroma-ui, 0.05));
      --tag-delta-bg-l: var(--tag-accent-delta-bg-l, 0%);
      --tag-delta-fg-l: var(--tag-accent-delta-fg-l, 0%);
    }

    :host([color='gold']) {
      --tag-hue: var(--ui-tag-hue-gold);
      --tag-bg-chroma: var(--tag-gold-bg-chroma, var(--chroma-subtle, 0.02));
      --tag-fg-chroma: var(--tag-gold-fg-chroma, var(--chroma-ui, 0.05));
      --tag-delta-bg-l: var(--tag-gold-delta-bg-l, -3%);
      --tag-delta-fg-l: var(--tag-gold-delta-fg-l, -15%);
    }

    /* ── Variant: Outline ── */
    :host([variant='outline']) {
      background-color: transparent;
      --border-color: oklch(
        calc(var(--tag-fg-l) + var(--tag-delta-fg-l)) var(--tag-fg-chroma)
          var(--tag-hue, var(--hue-base, 0))
      );
    }

    /* ── Variant: Solid ── */
    :host([variant='solid']) {
      --tag-bg-l: var(--tag-solid-surface-l, 55%);
      --tag-bg-chroma: var(--chroma-high, 0.2);
      --border-color: transparent;
    }

    :host([variant='solid']) .tag-root,
    :host([variant='solid']) .tag-link,
    :host([variant='solid']) .tag-group {
      color: var(--tag-solid-fg, var(--white, oklch(100% 0 0)));
    }

    :host([variant='solid'][color='neutral']) {
      --tag-bg-l: var(--tag-solid-neutral-surface-l, var(--tag-solid-surface-l, 55%));
      --tag-bg-chroma: 0;
    }

    /* ── Variant: Plain ── */
    :host([variant='plain']) {
      background-color: transparent;
      border-color: transparent;
      --tag-hue: var(--hue-base, 0);
      --tag-bg-chroma: 0;
      --tag-fg-chroma: 0;
      --tag-delta-bg-l: 0%;
      --tag-delta-fg-l: 0%;
    }

    /* ── Hover (Default / Outline のみ) ── */
    :host(:not([disabled]):not([variant='solid']):not([variant='plain'])):hover {
      --border-color: var(--border-default, oklch(70% 0 0 / 0.6));
    }

    /* ── Disabled ── */
    :host([disabled]) {
      opacity: var(--opacity-disabled, 0.5);
      pointer-events: none;
      cursor: not-allowed;
    }

    /* ──────────────────────────────────────────────
       内部レイアウト共通
    ────────────────────────────────────────────── */

    .tag-root {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
      width: 100%;
      overflow: hidden;
    }

    .tag-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
      width: 100%;
      min-width: 0;
      overflow: hidden;
      color: inherit;
      text-decoration: none;
      border-radius: inherit;
      position: relative;
    }

    .tag-link::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: max(100%, var(--control-min-touch, 24px));
      height: max(100%, var(--control-min-touch, 24px));
    }

    .tag-group {
      display: inline-flex;
      align-items: center;
      gap: 0;
      width: 100%;
      overflow: hidden;
      position: relative;
      padding-right: calc(var(--control-min-touch, 24px) - var(--icon-xs, 12px));
    }

    .tag-group .tag-link {
      flex: 1;
      min-width: var(--control-min-touch, 24px);
      overflow: hidden;
      padding-right: var(--space-1, 4px);
    }

    .tag-group .tag-link::after {
      left: 0;
      transform: translateY(-50%);
      width: 100%;
    }

    .icon-slot {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      width: var(--icon-xs, 12px);
      height: var(--icon-xs, 12px);
      color: currentColor;
      user-select: none;
    }

    ::slotted([slot='icon']) {
      width: var(--icon-xs, 12px);
      height: var(--icon-xs, 12px);
    }

    .text-slot {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    .tag-remove-button {
      appearance: none;
      background: none;
      border: none;
      padding: 0;
      margin: 0;

      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;

      width: var(--icon-xs, 12px);
      height: var(--icon-xs, 12px);

      color: currentColor;
      opacity: 0.5;
      cursor: pointer;
      border-radius: 2px;

      transition: opacity var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .tag-remove-button:hover {
      opacity: 1;
    }

    .tag-remove-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
      opacity: 1;
    }

    .tag-remove-button::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: max(100%, var(--control-min-touch, 24px));
      height: max(100%, var(--control-min-touch, 24px));
    }

    .tag-group .tag-remove-button {
      position: absolute;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      width: var(--control-min-touch, 24px);
      height: max(100%, var(--control-min-touch, 24px));
      justify-content: flex-end;
      padding-right: calc((var(--control-min-touch, 24px) - var(--icon-xs, 12px)) / 2);
      border-radius: var(--radius-sm, 4px);
    }

    .tag-group .tag-remove-button::after {
      top: 50%;
      right: 0;
      left: auto;
      transform: translateY(-50%);
      width: 100%;
      height: 100%;
    }

    .tag-link:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
    }

    @media (forced-colors: active) {
      :host {
        border: var(--border-width, 1px) solid CanvasText;
        background: Canvas;
        color: CanvasText;
      }

      .tag-remove-button {
        color: CanvasText;
        border: 1px solid CanvasText;
      }

      .tag-link {
        color: LinkText;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        transition-duration: 0.01ms;
      }

      .tag-remove-button {
        transition-duration: 0.01ms;
      }
    }
  `;

  /**
   * スタイルバリアント
   * @default 'default'
   */
  @property({ type: String, reflect: true })
  variant: 'default' | 'outline' | 'solid' | 'plain' = 'default';

  /**
   * サイズ
   * @default 'xs'
   */
  @property({ type: String, reflect: true })
  size: 'xs' | 'sm' = 'xs';

  /**
   * 意味的カラー
   * @default 'neutral'
   */
  @property({ type: String, reflect: true })
  color: 'neutral' | 'red' | 'blue' | 'violet' | 'pink' | 'gold' = 'neutral';

  /**
   * 削除ボタンを表示するか
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  removable = false;

  /**
   * リンク先URL。指定するとテキスト部分が `<a>` タグになります。
   */
  @property({ type: String, reflect: true })
  href: string | undefined = undefined;

  /**
   * 非活性状態
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    // disabled + href の場合: aria-disabled と tabindex を設定
    if (changedProperties.has('disabled') || changedProperties.has('href')) {
      const link = this.shadowRoot?.querySelector<HTMLAnchorElement>('.tag-link');
      if (link) {
        if (this.disabled) {
          link.setAttribute('aria-disabled', 'true');
          link.setAttribute('tabindex', '-1');
        } else {
          link.removeAttribute('aria-disabled');
          link.removeAttribute('tabindex');
        }
      }

      const removeBtn = this.shadowRoot?.querySelector<HTMLButtonElement>('.tag-remove-button');
      if (removeBtn) {
        if (this.disabled) {
          removeBtn.setAttribute('tabindex', '-1');
          removeBtn.setAttribute('aria-disabled', 'true');
        } else {
          removeBtn.removeAttribute('tabindex');
          removeBtn.removeAttribute('aria-disabled');
        }
      }
    }
  }

  /** 削除ボタンのクリックハンドラ */
  private _handleRemove = (e: Event): void => {
    e.stopPropagation();
    if (this.disabled) return;

    // タグのテキスト内容を取得
    const textContent = this._textLabel;

    this.dispatchEvent(
      new CustomEvent<{ value: string }>('ui-tag-remove', {
        bubbles: true,
        composed: true,
        detail: { value: textContent },
      }),
    );
  };

  /** disabled + href の場合: クリックを抑止 */
  private _handleLinkClick = (e: MouseEvent): void => {
    if (this.disabled) {
      e.preventDefault();
    }
  };

  /** 削除ボタンのラベル */
  private get _removeLabel(): string {
    const text = this._textLabel;
    return text ? `${text}を削除` : '削除';
  }

  /** SSR でも安全に使えるタグ本文のラベル。 */
  private get _textLabel(): string {
    const textContent = typeof this.textContent === 'string' ? this.textContent : '';
    return textContent.trim();
  }

  /** アイコンスロットのレンダリング */
  private _renderIcon() {
    const lightDomChildren =
      'children' in this
        ? Array.from((this as typeof this & { children?: ArrayLike<Element> }).children)
        : [];
    const hasIcon = lightDomChildren.some((child) => child.getAttribute('slot') === 'icon');
    if (!hasIcon) return nothing;

    return html`
      <span class="icon-slot" aria-hidden="true">
        <slot name="icon"></slot>
      </span>
    `;
  }

  /** テキストスロットのレンダリング */
  private _renderText() {
    return html`<span class="text-slot"><slot></slot></span>`;
  }

  /** 削除ボタンのレンダリング */
  private _renderRemoveButton() {
    return html`
      <button
        class="tag-remove-button"
        type="button"
        aria-label="${this._removeLabel}"
        ?disabled=${this.disabled}
        @click="${this._handleRemove}"
      >
        <!-- × アイコン (12×12px) -->
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <line x1="2" y1="2" x2="10" y2="10" />
          <line x1="10" y1="2" x2="2" y2="10" />
        </svg>
      </button>
    `;
  }

  override render() {
    const hasHref = this.href !== undefined && this.href !== '';
    const hasRemovable = this.removable;

    // ── パターン 1: Link + Removable（並列配置）──
    // HTML 仕様: Interactive content nesting 禁止のため、
    // <a> と <button> を Flexbox で並列配置する
    if (hasHref && hasRemovable) {
      return html`
        <div class="tag-group" role="group" aria-label="${this._textLabel}タグ">
          <a
            class="tag-link"
            href="${this.disabled ? nothing : this.href}"
            data-link-kind="internal-document"
            data-link-surface="control"
            @click="${this._handleLinkClick}"
          >
            ${this._renderIcon()} ${this._renderText()}
          </a>
          ${this._renderRemoveButton()}
        </div>
      `;
    }

    // ── パターン 2: Link Only ──
    if (hasHref) {
      return html`
        <a
          class="tag-link"
          href="${this.disabled ? nothing : this.href}"
          data-link-kind="internal-document"
          data-link-surface="control"
          @click="${this._handleLinkClick}"
        >
          ${this._renderIcon()} ${this._renderText()}
        </a>
      `;
    }

    // ── パターン 3: Removable Only ──
    if (hasRemovable) {
      return html`
        <span class="tag-root">
          ${this._renderIcon()} ${this._renderText()} ${this._renderRemoveButton()}
        </span>
      `;
    }

    // ── パターン 4: 通常（装飾的） ──
    return html` <span class="tag-root"> ${this._renderIcon()} ${this._renderText()} </span> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-tag': Tag;
  }
}
