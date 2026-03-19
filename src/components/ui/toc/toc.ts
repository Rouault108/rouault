import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { map } from 'lit/directives/map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { updateHashInCurrentUrl } from '../../../lib/url-hash.js';
import '../tooltip/tooltip';

/**
 * 見出しデータの型定義
 */
export interface Heading {
  /** 一意の識別子。アンカーリンクおよびObserverのターゲットIDに使用。 */
  id: string;
  /** 表示テキスト */
  text: string;
  /** 見出しレベル (1–6)。H2なら2、H3なら3。 */
  level: number;
}

export interface UiTocActiveChangeDetail {
  id: string;
  source: 'scroll' | 'click';
  index: number;
  total: number;
}

/**
 * 目次 (Table of Contents) コンポーネント `<ui-toc>`
 *
 * 記事内の見出し構造を可視化し、読者が現在地を把握しながらコンテンツを
 * ナビゲートするための「周辺視野の計器（Peripheral Indicator）」として機能します。
 *
 * ## 設計思想
 *
 * - **Visual Silence**: 背景色・常時ボーダーを排除し、低密度な「静謐」を実現します。
 * - **周辺視野の計器**: 操作パネルではなく、現在地と残量を無意識に感じさせます。
 * - **Context Awareness**: アクティブセクションのみハイライト、他は控えめに配置します。
 *
 * ## データフロー
 *
 * - `headers` プロパティで見出しデータを受け取ります（クライアントDOM解析は行いません）。
 * - `IntersectionObserver` でビューポート内のヘッダー要素を監視し、`activeId` を動的に更新します。
 *
 * ## インタラクション
 *
 * - **Smooth Scroll**: 移動距離に応じた適応的アニメーション（最大 `--duration-slower` = 300ms）。
 * - **Conflict Resolution**: クリック移動中は Observer を一時停止し、完了後に再開します。
 *   これによりインジケーターの明滅（Flickering）を防止します。
 * - **Transition Strategy**:
 *   - スクロール起因: `--duration-instant`（ゼロ）で即座に反映（計器としての正確性）。
 *   - クリック起因: `opacity` のフェードイン（`--duration-fast`）で着地確信を与えます。
 *
 * ## レベル正規化
 *
 * 表示上の相対階層（0 start）を算出します。`headers` 内の最小レベルを基準にします。
 * 例: H2 のみなら全て 0。H2+H3 なら H2=0、H3=1。
 *
 * @property {Heading[]} headers   - 見出しデータの配列 `{ id, text, level }`
 * @property {string}   activeId  - 現在アクティブな見出しのID（Observerにより自動更新）
 *
 * @cssprop --fg-muted            - 通常テキスト色（WCAG AA: 4.8:1 vs --bg-default）
 * @cssprop --fg-default          - ホバー時テキスト色
 * @cssprop --primary             - アクティブ項目テキスト色・インジケーター色（WCAG AA: 7.1:1）
 * @cssprop --text-sm             - フォントサイズ (13px)
 * @cssprop --space-1             - 垂直パディング (4px)
 * @cssprop --space-2             - インデント単位 (8px)
 * @cssprop --space-3             - 左パディングベース (12px)
 * @cssprop --border-width-thick  - インジケーター幅 (2px)
 * @cssprop --radius-full         - インジケーター角丸 (9999px)
 * @cssprop --duration-fast       - クリック起因フェードイン時間 (70ms)
 * @cssprop --duration-slower     - スクロールアニメーション最大時間 (300ms)
 * @cssprop --ease-out            - イージング関数
 * @cssprop --focus-ring-width    - フォーカスリング幅
 * @cssprop --focus-ring-color    - フォーカスリング色
 * @cssprop --focus-ring-offset   - フォーカスリングオフセット
 * @cssprop --focus-ring-radius   - フォーカスリング角丸
 * @cssprop --animation-focus     - Adaptive Focusアニメーション
 * @cssprop --header-height       - ヘッダー高さ（スクロールオフセット補正に使用）
 *
 * @example
 * ```html
 * <ui-toc
 *   .headers="${[
 *     { id: 'intro', text: 'はじめに', level: 2 },
 *     { id: 'details', text: '詳細', level: 3 },
 *     { id: 'summary', text: 'まとめ', level: 2 },
 *   ]}"
 *   active-id="intro"
 * ></ui-toc>
 * ```
 */
@customElement('ui-toc')
export class Toc extends LitElement {
  static override styles = css`
    /* ──────────────────────────────────────────────
		   レイアウト & ベーススタイル
		────────────────────────────────────────────── */
    :host {
      display: block;
      min-inline-size: 0;
    }

    nav {
      display: block;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .toc-tooltip {
      display: block;
      inline-size: 100%;
      min-inline-size: 0;
    }

    /* ──────────────────────────────────────────────
		   目次リンク
		────────────────────────────────────────────── */
    .toc-link {
      --_toc-indicator-width: var(--border-width-thick, 2px);
      --_toc-indicator-gap: var(--space-2, 8px);

      position: relative;
      display: flex;
      align-items: center;
      column-gap: var(--_toc-indicator-gap);
      min-height: 24px;
      padding-block: var(--space-1, 4px);
      /*
			 * インジケーター列は常にトップレベル見出しと同じ基準線に固定する。
			 * 階層によるインデントはラベル側で表現し、active 時も indicator の X 座標を変えない。
			 */
      padding-inline-start: calc(
        var(--space-3, 12px) - var(--_toc-indicator-width) - var(--_toc-indicator-gap)
      );
      padding-inline-end: var(--space-2, 8px);
      /*
			 * Typography: --text-sm (13px), Weight 400
			 * "Small Text Rule" (12px以下補正) を回避するため --text-sm を採用。
			 * Weight 400 を保ったまま --fg-muted を使用し、視覚的静謐さを維持。
			 */
      font-size: var(--text-base, 14px);
      font-weight: 400;
      line-height: 1.5;
      color: var(--fg-muted, oklch(48% 0 0));
      /* 例外許可: TOCは構造型リンク。現在地インジケータとフォーカスリングで非色シグナルを担保する。 */
      text-decoration: none;
      border-radius: var(--radius-sm, 4px);
      transition: color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .toc-link-label {
      display: block;
      flex: 1 1 auto;
      min-inline-size: 0;
      padding-inline-start: calc(var(--level, 0) * var(--space-2, 8px));
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .toc-link:not(.is-active)[data-heading-level='3'] .toc-link-label {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .toc-link:not(.is-active):is(
        [data-heading-level='4'],
        [data-heading-level='5'],
        [data-heading-level='6']
      )
      .toc-link-label {
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .toc-link.is-active .toc-link-label {
      display: block;
      overflow: visible;
      -webkit-line-clamp: unset;
      line-clamp: unset;
      white-space: normal;
      text-overflow: clip;
    }

    /* ── ホバー: 文字色のみ変更 ── */
    .toc-link:hover {
      color: var(--fg-default, oklch(20% 0 0));
    }

    /* ── フォーカス: Adaptive Focus ── */
    .toc-link:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--focus-ring-radius, 4px);
      animation: var(--animation-focus, none);
    }

    /* ── アクティブ状態: テキスト色を --primary に変更 ── */
    .toc-link.is-active {
      color: var(--primary, oklch(55% 0.2 250));
    }

    /* ──────────────────────────────────────────────
		   アクティブインジケーター (::before 疑似要素)
		   - flex item として通常フローに参加しつつ中央揃え
		   - Shape: border-radius: --radius-full (単なる線ではなくオブジェクトとして扱う)
		   - 常時表示ではなくアクティブ時のみ出現
		────────────────────────────────────────────── */
    .toc-link::before {
      content: '';
      display: block;
      flex: 0 0 var(--_toc-indicator-width);
      inline-size: var(--_toc-indicator-width);
      block-size: 1.25em;
      align-self: center;
      border-radius: var(--radius-full, 9999px);
      background-color: var(--primary, oklch(55% 0.2 250));
      opacity: 0;
      transform: translateY(1px);
    }

    /*
		 * スクロール起因のアクティブ切り替え:
		 * アニメーション時間ゼロで即座に反映（「計器としての正確性」）
		 * 遅れてくるアニメーションは情報の同期ズレ（Lag）になるため禁止。
		 */
    .toc-link.is-active.is-scroll::before {
      opacity: 1;
    }

    /*
		 * クリック起因のアクティブ切り替え:
		 * opacity フェードイン（--duration-fast）で「着地した」という物理的確信を与える。
		 */
    .toc-link.is-active.is-click::before {
      animation: toc-indicator-fade-in var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)) both;
    }

    @keyframes toc-indicator-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* ──────────────────────────────────────────────
			   タッチ環境: 粗いポインタでの誤タップ耐性
			────────────────────────────────────────────── */
    @media (hover: none) and (pointer: coarse) {
      /*
				 * viewport 幅ではなく入力方式で判定する。
				 * 項目間に最小限の余白を追加して隣接ターゲットの干渉を抑える。
				 */
      li + li {
        margin-block-start: 2px;
      }
    }

    /* ──────────────────────────────────────────────
		   Reduced Motion
		────────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .toc-link {
        /*
				 * ホバートランジションを実質瞬時化（状態認知は維持）
				 */
        transition-duration: 0.01ms;
      }

      .toc-link.is-active.is-click::before {
        /*
				 * クリック起因のフェードインも実質瞬時化
				 */
        animation-duration: 0.01ms;
      }
    }

    /* ──────────────────────────────────────────────
		   Forced Colors Mode (高コントラストモード)
		────────────────────────────────────────────── */
    @media (forced-colors: active) {
      /*
			 * システムカラーへのマッピング:
			 * --fg-muted → GrayText, --fg-default → CanvasText, --primary → Highlight
			 */
      .toc-link {
        color: GrayText;
      }

      .toc-link:hover {
        color: CanvasText;
      }

      .toc-link.is-active {
        color: Highlight;
      }

      /*
			 * Forced Colors では background-color が消失するため、
			 * インジケーター (::before) を border で可視化する（現在地の物理的可視化）。
			 */
      .toc-link.is-active::before {
        background-color: transparent;
        border: var(--border-width-thick, 2px) solid Highlight;
      }
    }
  `;

  /**
   * 見出しデータの配列。レンダリングの唯一のソース。
   * Velite 等が生成したメタデータをそのまま渡す想定。
   * @default []
   */
  @property({ type: Array })
  headers: Heading[] = [];

  /**
   * 現在アクティブな見出しのID。
   * IntersectionObserver により自動更新されるが、外部からも設定可能。
   * @default ''
   */
  @property({ type: String, attribute: 'active-id', reflect: true })
  activeId = '';

  /** アクティブID更新の起源（インジケーターのトランジション戦略を決定） */
  @state() private _activeIdSource: 'scroll' | 'click' = 'scroll';

  /** 省略表示中の見出しIDセット。tooltip の有効化判定に使用する。 */
  private _truncatedHeadingIds = new Set<string>();

  /** IntersectionObserver インスタンス */
  private _observer: IntersectionObserver | null = null;

  /**
   * Observer 一時停止フラグ。
   * クリックによるスクロール中はインジケーターの明滅防止のため停止する。
   */
  private _observerPaused = false;

  /** ビューポート内に存在する見出しIDのセット */
  private _visibleIds = new Set<string>();

  /** ラベル計測の同期用 ResizeObserver */
  private _labelResizeObserver: ResizeObserver | null = null;

  /** 同一フレーム内の重複計測を防ぐ */
  private _truncationSyncFrame: number | null = null;

  /**
   * 内部からの activeId 更新フラグ。
   * updated() で外部更新と内部更新を区別するために使用。
   */
  private _internalUpdate = false;

  override connectedCallback() {
    super.connectedCallback();
    this._setupObserver();
  }

  override firstUpdated() {
    this._labelResizeObserver = new ResizeObserver(() => {
      this._scheduleTruncationSync();
    });
    this._observeLabels();
    this._scheduleTruncationSync();
  }

  override disconnectedCallback() {
    if (this._truncationSyncFrame !== null) {
      cancelAnimationFrame(this._truncationSyncFrame);
      this._truncationSyncFrame = null;
    }
    this._labelResizeObserver?.disconnect();
    this._labelResizeObserver = null;
    super.disconnectedCallback();
    this._teardownObserver();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('activeId') && !this._internalUpdate) {
      // 外部からの activeId 変更は描画前に click 起因へ寄せる。
      this._activeIdSource = 'click';
    }
  }

  override updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);

    if (changedProperties.has('headers')) {
      // headers 変更時: 監視対象が変わるため Observer を再設定
      this._setupObserver();
    }

    if (changedProperties.has('activeId')) {
      this._emitActiveChange();
    }

    if (changedProperties.has('headers') || changedProperties.has('activeId')) {
      this._syncActiveLinkVisibility();
    }

    // 内部更新フラグをリセット
    this._internalUpdate = false;
    this._observeLabels();
    this._scheduleTruncationSync();
  }

  /**
   * headers 内の最小レベルを返す（レベル正規化の基準値）
   */
  private get _minLevel(): number {
    if (this.headers.length === 0) return 1;
    return Math.min(...this.headers.map((h) => h.level));
  }

  /**
   * 表示上の相対階層（0 start）を返す。
   * 例: H2=0, H3=1, H4=2（H2 が最小の場合）
   */
  private _normalizedLevel(heading: Heading): number {
    return heading.level - this._minLevel;
  }

  /**
   * IntersectionObserver を設定し、ドキュメント内の見出し要素の監視を開始する。
   * headers 変更時や connectedCallback 時に呼び出す。
   */
  private _setupObserver() {
    this._teardownObserver();
    this._visibleIds.clear();

    if (this.headers.length === 0) return;

    // ヘッダー高さと padding からスクロール停止位置を計算
    const headerHeightRaw = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')
      .trim();
    const headerHeight = headerHeightRaw ? parseFloat(headerHeightRaw) : 0;
    const EXTRA_PADDING = 32;

    // スクロール先のオフセットと観測領域の上端を同期する
    // 要素が確実に IntersectionObserver の観測領域に入るよう、1px 余分にオフセットを調整する
    const topMargin = headerHeight + EXTRA_PADDING - 1;

    this._observer = new IntersectionObserver(
      (entries) => {
        // クリックスクロール中は無視（Flickering 防止）
        if (this._observerPaused) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this._visibleIds.add(entry.target.id);
          } else {
            this._visibleIds.delete(entry.target.id);
          }
        });

        // headers の順序で最初に可視状態の見出しをアクティブにする
        const activeHeading = this.headers.find((h) => this._visibleIds.has(h.id));
        if (activeHeading && activeHeading.id !== this.activeId) {
          this._setActiveId(activeHeading.id, 'scroll');
        }
      },
      {
        /*
         * rootMargin: 上部の除外領域をスクロール停止位置 (headerHeight + padding) と同期。
         * 下部70%除外で、スクロール中にビューポート最上部近傍の見出しを捕捉する。
         */
        rootMargin: `-${String(topMargin)}px 0px -70% 0px`,
        threshold: 0,
      },
    );

    // ドキュメント内の各見出し要素を監視
    for (const heading of this.headers) {
      const el = document.getElementById(heading.id);
      if (el) {
        this._observer.observe(el);
      }
    }
  }

  /**
   * IntersectionObserver を切断してリソースを解放する。
   */
  private _teardownObserver() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  /**
   * activeId を内部から更新する。
   * _internalUpdate フラグで外部更新と区別し、_activeIdSource を正しく設定する。
   */
  private _setActiveId(id: string, source: 'scroll' | 'click') {
    this._internalUpdate = true;
    this.activeId = id;
    this._activeIdSource = source;
  }

  /**
   * アクティブ項目が TOC の可視範囲から外れた場合のみ、
   * 最小移動でフレーム内へ戻す。
   */
  private _syncActiveLinkVisibility(): void {
    const activeLink = this.renderRoot.querySelector<HTMLAnchorElement>('a.toc-link.is-active');
    if (!activeLink || activeLink.getClientRects().length === 0) {
      return;
    }

    const scrollContainer = this._findScrollContainer(activeLink);
    if (!scrollContainer || scrollContainer.getClientRects().length === 0) {
      return;
    }

    if (this._isFullyVisibleInContainer(activeLink, scrollContainer)) {
      return;
    }

    activeLink.scrollIntoView({
      behavior: 'instant',
      block: 'nearest',
      inline: 'nearest',
    });
  }

  private _findScrollContainer(start: HTMLElement): HTMLElement | null {
    let current = start;

    for (;;) {
      const parent = this._getComposedParentElement(current);
      if (!parent) {
        return null;
      }

      const style = getComputedStyle(parent);
      const overflowY = style.overflowY || style.overflow;
      const isScrollable = ['auto', 'scroll', 'overlay'].includes(overflowY);
      if (isScrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }

      current = parent;
    }
  }

  private _getComposedParentElement(element: HTMLElement): HTMLElement | null {
    if (element.parentElement instanceof HTMLElement) {
      return element.parentElement;
    }

    const root = element.getRootNode();
    if (root instanceof ShadowRoot && root.host instanceof HTMLElement) {
      return root.host;
    }

    return null;
  }

  private _isFullyVisibleInContainer(element: HTMLElement, container: HTMLElement): boolean {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const tolerance = 1;

    return (
      elementRect.top >= containerRect.top - tolerance &&
      elementRect.bottom <= containerRect.bottom + tolerance
    );
  }

  private _observeLabels(): void {
    const observer = this._labelResizeObserver;
    if (!observer) return;

    observer.disconnect();
    const labels = this.renderRoot.querySelectorAll<HTMLElement>('.toc-link-label');
    for (const label of labels) {
      observer.observe(label);
    }
  }

  private _scheduleTruncationSync(): void {
    if (this._truncationSyncFrame !== null) return;

    // ui-tooltip 配下の初回レイアウト確定後に計測する
    this._truncationSyncFrame = requestAnimationFrame(() => {
      this._truncationSyncFrame = null;
      this._syncTruncationState();
    });
  }

  private _syncTruncationState(): void {
    const nextTruncatedIds = new Set<string>();
    const labels = this.renderRoot.querySelectorAll<HTMLElement>('.toc-link-label');

    for (const label of labels) {
      const headingId = label.dataset['headingId'];
      if (!headingId || headingId === this.activeId) continue;

      const isTruncated =
        label.scrollWidth - label.clientWidth > 1 || label.scrollHeight - label.clientHeight > 1;

      if (isTruncated) {
        nextTruncatedIds.add(headingId);
      }
    }

    if (!this._setsEqual(this._truncatedHeadingIds, nextTruncatedIds)) {
      this._truncatedHeadingIds = nextTruncatedIds;
    }

    this._syncTooltipDisabledState();
  }

  private _setsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
    if (left.size !== right.size) return false;
    for (const value of left) {
      if (!right.has(value)) return false;
    }
    return true;
  }

  private _syncTooltipDisabledState(): void {
    const tooltips = this.renderRoot.querySelectorAll<
      HTMLElement & { disabled: boolean; dataset: DOMStringMap }
    >('ui-tooltip.toc-tooltip');

    for (const tooltip of tooltips) {
      const headingId = tooltip.dataset['headingId'];
      if (!headingId) continue;

      tooltip.disabled = headingId === this.activeId || !this._truncatedHeadingIds.has(headingId);
    }
  }

  /** 現在のアクティブ見出し情報を外部へ通知する */
  private _emitActiveChange(): void {
    const index = this.headers.findIndex((heading) => heading.id === this.activeId);
    this.dispatchEvent(
      new CustomEvent<UiTocActiveChangeDetail>('ui-toc-active-change', {
        bubbles: true,
        composed: true,
        detail: {
          id: this.activeId,
          source: this._activeIdSource,
          index,
          total: this.headers.length,
        },
      }),
    );
  }

  /**
   * 目次リンクのクリックハンドラー。
   * - デフォルトのアンカーナビゲーションをキャンセル
   * - Observer を一時停止してインジケーターの明滅を防止
   * - activeId を即座にクリック起因として更新（視覚的即応性の確保）
   * - スムーズスクロール後に Observer を再開
   */
  private async _handleLinkClick(event: Event, headingId: string) {
    event.preventDefault();

    // スクロール完了まで Observer を停止（Flickering 防止）
    this._observerPaused = true;
    try {
      // activeId をクリック起因として即座に更新
      this._setActiveId(headingId, 'click');

      // ターゲット要素へスムーズスクロール
      const target = document.getElementById(headingId);
      if (target) {
        updateHashInCurrentUrl(headingId, 'push');
        await this._smoothScrollTo(target);
      }
    } finally {
      // スクロール処理中に例外が起きても Observer を再開する
      this._observerPaused = false;
    }
  }

  /**
   * スムーズスクロール実装。
   *
   * - 移動距離に応じた適応的アニメーション時間（最大 300ms）
   * - 隣接セクションの小移動では短時間（例: 100ms）
   * - prefers-reduced-motion: reduce 時は即座にジャンプ
   * - --header-height + 32px (--space-8) のオフセット補正でヘッダー隠れを防止
   */
  private _smoothScrollTo(target: HTMLElement): Promise<void> {
    return new Promise<void>((resolve) => {
      // ヘッダー高さの取得（CSS カスタムプロパティから）
      const headerHeightRaw = getComputedStyle(document.documentElement)
        .getPropertyValue('--header-height')
        .trim();
      const headerHeight = headerHeightRaw ? parseFloat(headerHeightRaw) : 0;
      // --space-8 (32px) 相当の余白を追加
      const EXTRA_PADDING = 32;

      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      const targetY = Math.max(0, targetTop - headerHeight - EXTRA_PADDING);

      // Reduced Motion: アニメーション無効化・即座にジャンプ
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo(0, targetY);
        resolve();
        return;
      }
      const startY = window.scrollY;
      const distance = Math.abs(targetY - startY);

      // 距離がほぼゼロの場合は即座に完了
      if (distance < 1) {
        resolve();
        return;
      }

      // 適応的アニメーション時間: 最大 300ms（--duration-slower）
      const MAX_DURATION = 300;
      const duration = Math.min(MAX_DURATION, distance * 0.5);

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic イージング（滑らかな減速）
        const eased = 1 - Math.pow(1 - progress, 3);

        window.scrollTo(0, startY + (targetY - startY) * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  override render() {
    // headers が空の場合は何も表示しない
    if (this.headers.length === 0) {
      return nothing;
    }

    return html`
      <nav aria-label="Table of Contents">
        <ul>
          ${map(this.headers, (heading) => {
            const isActive = heading.id === this.activeId;
            const normalizedLevel = this._normalizedLevel(heading);

            return html`
              <li style="${styleMap({ '--level': String(normalizedLevel) })}">
                <ui-tooltip
                  class="toc-tooltip"
                  text="${heading.text}"
                  variant="subtle"
                  placement="right-start"
                  data-heading-id="${heading.id}"
                  ?disabled="${isActive || !this._truncatedHeadingIds.has(heading.id)}"
                >
                  <a
                    class="${classMap({
                      'toc-link': true,
                      'is-active': isActive,
                      'is-scroll': isActive && this._activeIdSource === 'scroll',
                      'is-click': isActive && this._activeIdSource === 'click',
                    })}"
                    href="#${heading.id}"
                    data-heading-level="${String(heading.level)}"
                    aria-current="${isActive ? 'location' : nothing}"
                    @click="${(e: Event) => this._handleLinkClick(e, heading.id)}"
                  >
                    <span class="toc-link-label" data-heading-id="${heading.id}">
                      ${heading.text}
                    </span>
                  </a>
                </ui-tooltip>
              </li>
            `;
          })}
        </ul>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-toc': Toc;
  }
}
