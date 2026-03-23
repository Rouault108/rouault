import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

/** カードの外観スタイルを定義するバリアント型 */
export type CardVariant = 'outlined' | 'elevated' | 'flat' | 'ghost';
export type CardKind = 'generic' | 'link';

const truncateDescription = (value: string, maxLength = 140): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const isDescriptionTextTruncated = (value: string, maxLength = 140): boolean =>
  value.length > maxLength;

const INTERACTIVE_TARGET_SELECTOR = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * カード (Card) コンポーネント `<ui-card>`
 *
 * 関連する情報をひとまとまりの読解単位として提示するコンテナです。
 * `cardKind` は要求モードを表し、実際の描画は trim 後の入力完全性から解決した
 * 有効モードに従います。`cardKind="link"` でも `href` と `cardTitle` が揃わなければ
 * generic カードとして縮退します。
 *
 * @slot header - カードヘッダー
 * @slot - カードコンテンツ（デフォルトスロット）
 * @slot footer - カードフッター
 *
 * @property {'outlined'|'elevated'|'flat'|'ghost'} variant - 外観スタイル（デフォルト: 'outlined'）
 * @property {boolean} clickable - generic カードの背景クリック委譲を有効化
 * @property {'generic'|'link'} cardKind - 要求モード
 * @property {string} href - リンクカードの遷移先
 * @property {string} cardTitle - リンクカードの見出し
 * @property {string} description - リンクカードの補足説明
 * @property {string} imageSrc - リンクカードの補助画像 URL
 * @property {string} siteName - リンクカードの出典サイト名
 *
 * @cssprop --space-4 - カードのパディング（デフォルト: 1rem）
 * @cssprop --radius-md - カードの角丸（デフォルト: 6px）
 * @cssprop --border-width - 枠線の太さ
 * @cssprop --border-default - outlined バリアントの枠線色
 * @cssprop --border-muted - outlined hover / focus 時の枠線色
 * @cssprop --border-ghost - ghost バリアントの枠線色
 * @cssprop --bg-surface-2 - elevated バリアントの背景色
 * @cssprop --bg-fill-muted - flat バリアントの背景色
 * @cssprop --fg-muted - 補助テキスト色
 * @cssprop --elevation-md - 標準シャドウ
 * @cssprop --elevation-lg - 強調シャドウ
 * @cssprop --duration-normal - トランジション時間
 * @cssprop --duration-instant - reduced motion 時のトランジション時間
 * @cssprop --ease-out - イージング関数
 * @cssprop --focus-ring-width - フォーカスリングの太さ
 * @cssprop --focus-ring-color - フォーカスリングの色
 * @cssprop --focus-ring-offset - フォーカスリングのオフセット
 * @cssprop --animation-focus - フォーカスリングのアニメーション
 * @cssprop --ui-card-description-fade - 説明文省略フェードの背景色
 */
@customElement('ui-card')
export class Card extends LitElement {
  static override styles = css`
    /* ────────────────────────────────────────────
       ホスト（カード本体）
       Outlined スタイルをデフォルトとして定義。他バリアントは上書きで対応。
    ──────────────────────────────────────────── */
    :host {
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-md, 6px);
      padding: var(--space-4, 1rem);
      position: relative;

      /* Outlined デフォルトスタイル */
      border: var(--border-width, 1px) solid var(--border-default);
      background: transparent;
      box-shadow: none;

      /* hover / focus 時の輪郭とシャドウ変化を滑らかにする。 */
      transition:
        box-shadow var(--duration-normal, 150ms) var(--ease-out),
        border-color var(--duration-normal, 150ms) linear,
        outline-color var(--duration-normal, 150ms) var(--ease-out);
    }

    /* ────────────────────────────────────────────
       バリアント: Elevated
       Note: Dark モードでも枠線は引かず、
       inset shadow (Edge Highlight) のみで階層を表現。
    ──────────────────────────────────────────── */
    :host([variant='elevated']) {
      border: none;
      background: var(--bg-surface-2);
      box-shadow:
        var(--elevation-md),
        inset 0 1px 0 0 oklch(100% 0 0 / 0.1);
    }

    /* ────────────────────────────────────────────
       バリアント: Flat（Filled）
       影なしで領域を明示。bg-fill-muted を使用（bg-surface-2 ではない）。
    ──────────────────────────────────────────── */
    :host([variant='flat']) {
      border: none;
      background: var(--bg-fill-muted);
      box-shadow: none;
    }

    /* ────────────────────────────────────────────
       バリアント: Ghost
       最小限の枠線のみ。最も静謐な表現。
    ──────────────────────────────────────────── */
    :host([variant='ghost']) {
      border: var(--border-width, 1px) solid var(--border-ghost);
      background: transparent;
      box-shadow: none;
    }

    /* ────────────────────────────────────────────
       Clickable: カーソルとインタラクション
    ──────────────────────────────────────────── */
    :host([data-interactive]) {
      cursor: pointer;
    }

    /* フォーカスリング: 内部要素にフォーカスがある時、カード全体に描画する。
       これにより「クリック可能な領域＝フォーカス領域」のメンタルモデルが一致する。 */
    :host([data-interactive]:focus-within) {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    /* ────────────────────────────────────────────
       State Mutation: Outlined クリッカブル Hover
       outlined は hover / focus 時にシャドウと枠線色で操作可能性を示す。
    ──────────────────────────────────────────── */
    :host([data-interactive][variant='outlined']:hover),
    :host([data-interactive][variant='outlined']:focus-within) {
      box-shadow: var(--elevation-md);
      border-color: var(--border-muted);
    }

    /* ────────────────────────────────────────────
       State Mutation: Elevated クリッカブル Hover
       Shadow が elevation-md から elevation-lg へ強化。
    ──────────────────────────────────────────── */
    :host([data-interactive][variant='elevated']:hover),
    :host([data-interactive][variant='elevated']:focus-within) {
      box-shadow:
        var(--elevation-lg),
        inset 0 1px 0 0 oklch(100% 0 0 / 0.1);
    }

    .link-card {
      color: inherit;
      display: grid;
      gap: var(--space-4, 1rem);
      grid-template-columns: minmax(0, 1fr) auto;
      text-decoration: none;
    }

    /* link mode ではカード全体の focus-within リングを唯一の視覚シグナルにする。
       内部リンクの既定 outline は抑止し、二重リングを防ぐ。 */
    .link-card:focus-visible {
      outline: none;
    }

    .link-card--no-image {
      grid-template-columns: minmax(0, 1fr);
    }

    .link-card__body {
      display: grid;
      gap: var(--space-2, 0.5rem);
      min-width: 0;
    }

    .link-card__eyebrow {
      color: var(--fg-muted);
      font-size: var(--text-xs);
      letter-spacing: 0.02em;
      line-height: var(--line-height-snug, 1.35);
      margin: 0;
    }

    .link-card__title {
      --link-card-title-lines: 2;
      --link-card-title-line-height: 1.3;

      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      display: -webkit-box;
      font-size: var(--text-base);
      font-weight: var(--font-semibold, 600);
      line-height: var(--line-height-tight, var(--link-card-title-line-height));
      margin: 0;
      max-block-size: calc(
        1em * var(--link-card-title-line-height) * var(--link-card-title-lines) + 1px
      );
      overflow: hidden;
      overflow-wrap: anywhere;
    }

    .link-card__description {
      --link-card-description-lines: 2;
      --link-card-description-line-height: 1.65;

      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      display: -webkit-box;
      color: var(--fg-muted);
      font-size: var(--text-xs);
      line-height: var(--line-height-relaxed, var(--link-card-description-line-height));
      margin: 0;
      max-block-size: calc(
        1em * var(--link-card-description-line-height) * var(--link-card-description-lines) + 1px
      );
      overflow: hidden;
      overflow-wrap: anywhere;
      position: relative;
    }

    .link-card__description[data-line-overflowed='true'][data-text-truncated='false']::after {
      background: linear-gradient(
        to right,
        transparent 0%,
        var(--ui-card-description-fade, var(--bg-surface-2)) 45%
      );
      bottom: 0;
      content: '…';
      inset-inline-end: 0;
      padding-inline-start: 0.25em;
      position: absolute;
    }

    .link-card__media {
      align-self: stretch;
      block-size: clamp(96px, 16vw, 124px);
      border-radius: calc(var(--radius-md, 6px) - 2px);
      inline-size: clamp(96px, 18vw, 156px);
      object-fit: cover;
    }

    /* ────────────────────────────────────────────
       Reduced Motion
       トランジション時間を短縮し、動きの知覚を最小化する。
    ──────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      :host {
        transition-duration: var(--duration-instant, 0ms);
      }
    }

    /* ────────────────────────────────────────────
       Forced Colors Mode
       シャドウ・背景が消失する環境でも構造を維持するため境界線を強制付与。
    ──────────────────────────────────────────── */
    @media (forced-colors: active) {
      :host {
        border: var(--border-width, 1px) solid CanvasText !important;
      }

      :host([data-interactive]:hover),
      :host([data-interactive]:focus-within) {
        outline: 2px solid Highlight;
        outline-offset: -2px;
      }
    }

    /* ────────────────────────────────────────────
       Print
       シャドウと背景色を除去しインク効率・可読性を優先。
       break-inside: avoid でカードのページ分割を防止。
    ──────────────────────────────────────────── */
    @media print {
      :host {
        box-shadow: none !important;
        background: transparent !important;
        break-inside: avoid;
      }

      :host([variant='elevated']),
      :host([variant='flat']) {
        border: 1px solid #000 !important;
      }

      :host([variant='outlined']),
      :host([variant='ghost']) {
        border-color: #000 !important;
      }
    }
  `;

  /**
   * カードの外観スタイルを決定するバリアント。
   * - `outlined` (デフォルト): 枠線で輪郭。Hover / focus でシャドウと枠線色を変化
   * - `elevated`: 影で浮き上がりを表現。Hover でシャドウ強化
   * - `flat`: 背景色で領域を示す（影なし）
   * - `ghost`: 最小限の枠線のみ（最も静謐）
   */
  @property({ type: String, reflect: true })
  variant: CardVariant = 'outlined';

  /**
   * `generic` カードで `true` の場合、背景クリック委譲とフォーカスリングを有効化します。
   * `link` 有効モードではこの値に関わらず、カード全体が主リンクとして振る舞います。
   */
  @property({ type: Boolean, reflect: true })
  clickable = false;

  /** カードの描画モード。既定は既存のスロットベースカード。 */
  @property({ type: String, reflect: true, attribute: 'card-kind' })
  cardKind: CardKind = 'generic';

  /** リンクカードの遷移先 URL。 */
  @property({ type: String })
  href = '';

  /** リンクカードの見出し。 */
  @property({ type: String, attribute: 'card-title' })
  cardTitle = '';

  /** リンクカードの補足説明。 */
  @property({ type: String })
  description = '';

  /** リンクカードの右側画像 URL。 */
  @property({ type: String, attribute: 'image-src' })
  imageSrc = '';

  /** リンクカードの出典サイト名。 */
  @property({ type: String, attribute: 'site-name' })
  siteName = '';

  @state()
  private _descriptionLineOverflowed = false;

  private _descriptionObserver: ResizeObserver | null = null;
  private _observedDescription: HTMLElement | null = null;
  private _overflowMeasureFrame = 0;

  private get _normalizedHref(): string {
    return this.href.trim();
  }

  private get _normalizedCardTitle(): string {
    return this.cardTitle.trim();
  }

  private get _normalizedDescription(): string {
    return this.description.trim();
  }

  private get _normalizedImageSrc(): string {
    return this.imageSrc.trim();
  }

  private get _normalizedSiteName(): string {
    return this.siteName.trim();
  }

  private get _isLinkCard(): boolean {
    return (
      this.cardKind === 'link' &&
      this._normalizedHref.length > 0 &&
      this._normalizedCardTitle.length > 0
    );
  }

  private get _isInteractiveCard(): boolean {
    return this._isLinkCard || this.clickable;
  }

  /**
   * クリックイベントの経路上にインタラクティブ要素が含まれるか判定。
   * Shadow DOM 内要素も `composedPath()` で判定する。
   */
  private _isInteractiveTarget(event: Event): boolean {
    const path = event.composedPath();
    for (const node of path) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.matches(INTERACTIVE_TARGET_SELECTOR)) {
        return true;
      }
    }
    return false;
  }

  private _isNodeWithinCard(node: Node | null): boolean {
    if (!node) {
      return false;
    }

    if (node === this || this.contains(node)) {
      return true;
    }

    return this.shadowRoot !== null && node.getRootNode() === this.shadowRoot;
  }

  private _hasLocalTextSelection(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().length === 0) {
      return false;
    }

    if (
      this._isNodeWithinCard(selection.anchorNode) ||
      this._isNodeWithinCard(selection.focusNode)
    ) {
      return true;
    }

    for (let index = 0; index < selection.rangeCount; index += 1) {
      const range = selection.getRangeAt(index);
      if (
        this._isNodeWithinCard(range.commonAncestorContainer) ||
        this._isNodeWithinCard(range.startContainer) ||
        this._isNodeWithinCard(range.endContainer)
      ) {
        return true;
      }
    }

    return false;
  }

  private _syncHostState(): void {
    this.toggleAttribute('data-interactive', this._isInteractiveCard);
  }

  /**
   * クリックイベントの委譲ハンドラ。
   * カード全体のクリックを内部の最初の `<a href>` へ委譲します。
   * 以下の条件では委譲をキャンセルします:
   * - 主ボタン以外（中クリック・右クリック等）
   * - 修飾キー押下（metaKey / ctrlKey / shiftKey / altKey）
   * - 当該カード内部でテキスト選択中（コピー操作を阻害しない）
   * - 独立して操作可能な要素への直接クリック
   */
  private readonly _handleClick = (e: MouseEvent): void => {
    if (!this._isInteractiveCard) return;

    // 主ボタン（左クリック）のみ委譲
    if (e.button !== 0) return;

    // 修飾キー押下時はブラウザのネイティブ操作を優先（別タブで開く等）
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // テキスト選択中は委譲しない（コピー操作を阻害しない）
    if (this._hasLocalTextSelection()) return;

    // インタラクティブ要素への直接クリックは委譲しない
    if (this._isInteractiveTarget(e)) return;

    // link mode は Shadow DOM 内の主リンクを優先し、
    // generic mode は従来どおり Light DOM の最初のリンクへ委譲する。
    const primaryLink = this._isLinkCard
      ? (this.shadowRoot?.querySelector<HTMLAnchorElement>('a[href]') ?? null)
      : this.querySelector<HTMLAnchorElement>('a[href]');
    if (primaryLink) {
      e.preventDefault();
      primaryLink.click();
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    // role が未指定の場合のみ article を自動設定（上書きを阻害しない）
    if (!this.getAttribute('role')) {
      this.setAttribute('role', 'article');
    }
    this._syncHostState();
    this.addEventListener('click', this._handleClick);
  }

  protected override willUpdate(_changedProperties: PropertyValues<this>): void {
    this._syncHostState();
  }

  override firstUpdated(): void {
    this._descriptionObserver = new ResizeObserver(() => {
      this._scheduleDescriptionOverflowSync();
    });
    this._observeDescription();
    this._scheduleDescriptionOverflowSync();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
    this._descriptionObserver?.disconnect();
    this._descriptionObserver = null;
    this._observedDescription = null;
    if (this._overflowMeasureFrame !== 0) {
      cancelAnimationFrame(this._overflowMeasureFrame);
      this._overflowMeasureFrame = 0;
    }
  }

  override updated(): void {
    this._observeDescription();
    this._scheduleDescriptionOverflowSync();
  }

  private _observeDescription(): void {
    const description =
      this.shadowRoot?.querySelector<HTMLElement>('.link-card__description') ?? null;
    if (this._observedDescription === description) {
      return;
    }

    this._descriptionObserver?.disconnect();
    this._observedDescription = description;
    if (description) {
      this._descriptionObserver?.observe(description);
    }
  }

  private _scheduleDescriptionOverflowSync(): void {
    if (this._overflowMeasureFrame !== 0) {
      cancelAnimationFrame(this._overflowMeasureFrame);
    }

    this._overflowMeasureFrame = requestAnimationFrame(() => {
      this._overflowMeasureFrame = 0;
      this._syncDescriptionOverflow();
    });
  }

  private _syncDescriptionOverflow(): void {
    const description = this._observedDescription;
    if (!description) {
      if (this._descriptionLineOverflowed) {
        this._descriptionLineOverflowed = false;
      }
      return;
    }

    const nextOverflowed = description.scrollHeight > description.clientHeight + 1;
    if (this._descriptionLineOverflowed !== nextOverflowed) {
      this._descriptionLineOverflowed = nextOverflowed;
    }
  }

  private renderLinkCard() {
    const href = this._normalizedHref;
    const siteName = this._normalizedSiteName;
    const title = this._normalizedCardTitle;
    const rawDescription = this._normalizedDescription;
    const description = truncateDescription(rawDescription);
    const textTruncated = isDescriptionTextTruncated(rawDescription);
    const imageSrc = this._normalizedImageSrc;
    const hasImage = imageSrc.length > 0;

    return html`
      <a
        class="link-card ${hasImage ? '' : 'link-card--no-image'}"
        href=${ifDefined(href || undefined)}
      >
        <div class="link-card__body">
          ${siteName.length > 0 ? html`<p class="link-card__eyebrow">${siteName}</p>` : null}
          <h3 class="link-card__title">${title}</h3>
          ${description.length > 0
            ? html`
                <p
                  class="link-card__description"
                  data-line-overflowed=${this._descriptionLineOverflowed ? 'true' : 'false'}
                  data-text-truncated=${textTruncated ? 'true' : 'false'}
                >
                  ${description}
                </p>
              `
            : null}
        </div>
        ${hasImage
          ? html`<img class="link-card__media" src=${imageSrc} alt="" loading="lazy" />`
          : null}
      </a>
    `;
  }

  override render() {
    if (this._isLinkCard) {
      return this.renderLinkCard();
    }

    return html`
      <slot name="header"></slot>
      <slot></slot>
      <slot name="footer"></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-card': Card;
  }
}
