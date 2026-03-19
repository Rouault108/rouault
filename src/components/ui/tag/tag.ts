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
 * ## タッチターゲット (WCAG 2.5.5)
 *
 * タグ自体のサイズが小さい（xs: 20px / sm: 24px）ため、
 * すべてのインタラクティブ要素に `::after` 疑似要素で最小 44×44px を確保します。
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
       CSS カスタムプロパティ: カラーシステム
    ────────────────────────────────────────────── */
    :host {
      /* --- Default (Subtle) Configuration --- */
      --bg-l: 96%;
      --fg-l: 45%;

      /* Hue マッピング（上位から上書き可能） */
      --ui-tag-hue-blue: var(--hue-blue, 230);
      --ui-tag-hue-violet: var(--hue-violet, 280);
      --ui-tag-hue-pink: var(--hue-pink, 340);
      --ui-tag-hue-gold: var(--hue-gold, 85);

      /* Chroma */
      --chroma-bg: var(--chroma-neutral, 0);
      --chroma-fg: var(--chroma-neutral, 0);

      /* Delta L: 背景用・文字用を分離独立 */
      --delta-l-bg: 0%;
      --delta-l-fg: 0%;

      /* Border */
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
        calc(var(--bg-l) + var(--delta-l-bg)) var(--chroma-bg) var(--tag-hue, var(--hue-base, 0))
      );
      color: oklch(
        calc(var(--fg-l) + var(--delta-l-fg)) var(--chroma-fg) var(--tag-hue, var(--hue-base, 0))
      );
      border: var(--border-width, 1px) solid var(--border-color);

      /* Transition */
      transition: border-color var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
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
      --chroma-bg: var(--chroma-neutral, 0);
      --chroma-fg: var(--chroma-neutral, 0);
      --delta-l-bg: 2%;
    }

    :host([color='red']) {
      --tag-hue: var(--hue-base, 0);
      --chroma-bg: var(--chroma-subtle, 0.02);
      --chroma-fg: var(--chroma-ui, 0.05);
    }

    :host([color='blue']) {
      --tag-hue: var(--ui-tag-hue-blue);
      --chroma-bg: var(--chroma-subtle, 0.02);
      --chroma-fg: var(--chroma-ui, 0.05);
    }

    :host([color='violet']) {
      --tag-hue: var(--ui-tag-hue-violet);
      --chroma-bg: var(--chroma-subtle, 0.02);
      --chroma-fg: var(--chroma-ui, 0.05);
    }

    :host([color='pink']) {
      --tag-hue: var(--ui-tag-hue-pink);
      --chroma-bg: var(--chroma-subtle, 0.02);
      --chroma-fg: var(--chroma-ui, 0.05);
    }

    /* Gold (Literature): 高明度背景での白飛び防止 */
    :host([color='gold']) {
      --tag-hue: var(--ui-tag-hue-gold);
      --chroma-bg: var(--chroma-subtle, 0.02);
      --chroma-fg: var(--chroma-ui, 0.05);
      /* 背景: L96 では白飛びするため、わずかに暗くして黄色味を出す (-3%) */
      --delta-l-bg: -3%;
      /* 文字: 背景とのコントラストを稼ぐため、茶色方向へ大きく暗くする (-15%) */
      --delta-l-fg: -15%;
    }

    /* ── Dark Mode ── */
    /* OS設定のダークモード */
    @media (prefers-color-scheme: dark) {
      :host {
        --bg-l: 17%;
        --fg-l: 90%;
      }

      :host([color='neutral']) {
        --chroma-bg: 0;
        --chroma-fg: 0;
        --delta-l-bg: 5%;
        --delta-l-fg: 0%;
      }

      :host([color='red']),
      :host([color='blue']),
      :host([color='violet']),
      :host([color='pink']) {
        --chroma-bg: 0.04;
        --chroma-fg: 0.12;
        --delta-l-bg: 5%;
        --delta-l-fg: 0%;
      }

      :host([color='gold']) {
        --chroma-bg: 0.04;
        --chroma-fg: 0.12;
        --delta-l-bg: 5%;
        --delta-l-fg: -5%;
      }
    }

    /* サイト設定のダークモード */
    :host-context([data-theme='dark']) {
      --bg-l: 17%;
      --fg-l: 90%;
    }

    :host-context([data-theme='dark'])[color='neutral'] {
      --chroma-bg: 0;
      --chroma-fg: 0;
      --delta-l-bg: 5%;
      --delta-l-fg: 0%;
    }

    :host-context([data-theme='dark'])[color='red'],
    :host-context([data-theme='dark'])[color='blue'],
    :host-context([data-theme='dark'])[color='violet'],
    :host-context([data-theme='dark'])[color='pink'] {
      --chroma-bg: 0.04;
      --chroma-fg: 0.12;
      --delta-l-bg: 5%;
      --delta-l-fg: 0%;
    }

    :host-context([data-theme='dark'])[color='gold'] {
      --chroma-bg: 0.04;
      --chroma-fg: 0.12;
      --delta-l-bg: 5%;
      --delta-l-fg: -5%;
    }

    /* ── Variant: Outline ── */
    :host([variant='outline']) {
      background-color: transparent;
      --border-color: oklch(
        calc(var(--fg-l) + var(--delta-l-fg)) var(--chroma-fg) var(--tag-hue, var(--hue-base, 0))
      );
    }

    /* ── Variant: Solid ── */
    :host([variant='solid']) {
      --bg-l: 55%;
      --chroma-bg: var(--chroma-high, 0.2);
      --border-color: transparent;
    }

    :host([variant='solid']) .tag-root,
    :host([variant='solid']) .tag-link,
    :host([variant='solid']) .tag-group {
      color: var(--white, oklch(100% 0 0));
    }

    /* Solid + Neutral: 濃いグレー背景 + 白文字で他の solid カラーと一貫性を保つ */
    :host([variant='solid'][color='neutral']) {
      --chroma-bg: 0;
    }

    @media (prefers-color-scheme: dark) {
      :host([variant='solid']) {
        --bg-l: 40%;
      }

      :host([variant='solid'][color='neutral']) {
        --bg-l: 30%;
      }
    }

    :host-context([data-theme='dark'])[variant='solid'] {
      --bg-l: 40%;
    }

    :host-context([data-theme='dark'])[variant='solid'][color='neutral'] {
      --bg-l: 30%;
    }

    /* ── Variant: Plain ── */
    :host([variant='plain']) {
      background-color: transparent;
      border-color: transparent;
      --tag-hue: var(--hue-base, 0);
      --chroma-bg: var(--chroma-neutral, 0);
      --chroma-fg: var(--chroma-neutral, 0);
      --delta-l-bg: 0%;
      --delta-l-fg: 0%;
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

    /* ルート要素（非インタラクティブ） */
    .tag-root {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
      width: 100%;
      overflow: hidden;
    }

    /* リンク要素 */
    .tag-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
      width: 100%;
      min-width: 0;
      overflow: hidden;
      color: inherit;
      /* 例外許可: Tagはチップ型リンク。枠線・形状・フォーカスリングで識別する。 */
      text-decoration: none;
      border-radius: inherit;
      position: relative;
      /* ボーダーはホスト側で管理するため、リンク自体は transparent */
    }

    /* リンク側のタッチターゲット: 最低 44×44px を ::after で確保 (WCAG 2.5.5) */
    .tag-link::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: max(100%, var(--control-min-touch, 24px));
      height: max(100%, var(--control-min-touch, 24px));
    }

    /* Link + Removable のグループコンテナ */
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

    /* Link + Removable ではリンク領域と削除領域を重ねない */
    .tag-group .tag-link::after {
      left: 0;
      transform: translateY(-50%);
      width: 100%;
    }

    /* ── アイコンスロット ── */
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

    /* ── テキストスロット ── */
    .text-slot {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    /* ── 削除ボタン ── */
    .tag-remove-button {
      /* Reset */
      appearance: none;
      background: none;
      border: none;
      padding: 0;
      margin: 0;

      /* Layout */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;

      /* Size */
      width: var(--icon-xs, 12px);
      height: var(--icon-xs, 12px);

      /* Style */
      color: currentColor;
      opacity: 0.5;
      cursor: pointer;
      border-radius: 2px;

      /* Transition */
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

    /* タッチターゲット: 最低 44×44px を ::after で確保 (WCAG 2.5.5) */
    .tag-remove-button::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: max(100%, var(--control-min-touch, 24px));
      height: max(100%, var(--control-min-touch, 24px));
    }

    /* Link + Removable: 右側に削除ターゲットを固定して誤タップを防ぐ */
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

    /* ── リンクのフォーカスリング ── */
    .tag-link:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
    }

    /* ── Forced Colors Mode ── */
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

    /* ── Reduced Motion ── */
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
    const textContent = this.textContent.trim();

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
    const text = this.textContent.trim();
    return text ? `${text}を削除` : '削除';
  }

  /** アイコンスロットのレンダリング */
  private _renderIcon() {
    const lightDomChildren = Array.from(this.children);
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
        ?disabled="${this.disabled}"
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
        <div class="tag-group" role="group" aria-label="${this.textContent.trim()} タグ">
          <a
            class="tag-link"
            href="${this.disabled ? nothing : this.href}"
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
