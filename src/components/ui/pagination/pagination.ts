import { css, html, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../icon/icon.js';

type PaginationMode = 'regular' | 'compact';
type RangeItem = number | 'ellipsis';

/** 数値を有限な整数へ正規化します。 */
function toFiniteInt(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

/** 契約外入力でも描画不能にならないよう防御的に補正します。 */
function normalizePagination(current: number, total: number): { current: number; total: number } {
  const normalizedTotal = Math.max(1, toFiniteInt(total, 1));
  const normalizedCurrent = Math.min(normalizedTotal, Math.max(1, toFiniteInt(current, 1)));
  return { current: normalizedCurrent, total: normalizedTotal };
}

/**
 * デスクトップ用のページ範囲を計算します。
 *
 * - total <= 7: 全ページを返す
 * - total >= 8: 1 と total を常時表示し、current±1 を近傍として表示。
 *              先頭・末尾では代表例に合わせて 3 ページぶんの塊を維持する。
 *              欠落が 2 ページ以上の場合は 'ellipsis'、1 ページのみの場合は実ページ番号を挿入。
 *
 * @param current - 現在のページ (1始まり)
 * @param total   - 総ページ数
 */
function computeRegularRange(current: number, total: number): RangeItem[] {
  const safeTotal = Math.max(0, toFiniteInt(total, 0));
  if (safeTotal <= 0) return [];
  if (safeTotal === 1) return [1];
  const safeCurrent = Math.min(safeTotal, Math.max(1, toFiniteInt(current, 1)));

  // total <= 7: 全ページ表示（省略なし）
  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  // total >= 8: 境界 (1, total) + 近傍 (current-1, current, current+1) を収集
  const visible = new Set<number>();
  visible.add(1);
  visible.add(safeTotal);
  for (let p = Math.max(1, safeCurrent - 1); p <= Math.min(safeTotal, safeCurrent + 1); p++) {
    visible.add(p);
  }
  if (safeCurrent === 1 && safeTotal >= 3) {
    visible.add(3);
  }
  if (safeCurrent === safeTotal && safeTotal >= 3) {
    visible.add(safeTotal - 2);
  }

  // ページ番号を昇順に並べ、ギャップを分析して省略記号を挿入
  const sorted = Array.from(visible).sort((a, b) => a - b);
  const result: RangeItem[] = [];

  // for...of で反復し、インデックスアクセス（undefined の可能性）を回避
  let prev: number | undefined;
  for (const curr of sorted) {
    if (prev !== undefined) {
      const gap = curr - prev;

      if (gap === 2) {
        // 欠落 1 ページ → 実ページ番号を表示（省略なし）
        result.push(prev + 1);
      } else if (gap > 2) {
        // 欠落 2 ページ以上 → 省略記号
        result.push('ellipsis');
      }
      // gap === 1: 連続 → 何も挿入しない
    }
    result.push(curr);
    prev = curr;
  }

  return result;
}

/**
 * コンパクト用のページ範囲を計算します。
 *
 * `@media (hover: none) and (pointer: coarse)` 環境向け。
 * 現在ページのみを表示し、省略不要な側（先頭・末尾）では省略記号を出しません。
 *
 * @param current - 現在のページ (1始まり)
 * @param total   - 総ページ数
 */
function computeCompactRange(current: number, total: number): RangeItem[] {
  const safeTotal = Math.max(0, toFiniteInt(total, 0));
  if (safeTotal <= 0) return [];
  const safeCurrent = Math.min(safeTotal, Math.max(1, toFiniteInt(current, 1)));

  const result: RangeItem[] = [];
  if (safeCurrent > 1) result.push('ellipsis');
  result.push(safeCurrent);
  if (safeCurrent < safeTotal) result.push('ellipsis');
  return result;
}

/**
 * ページネーション (Pagination) コンポーネント `<ui-pagination>`
 *
 * 大量データを分割表示する際のナビゲーション。
 * プログレッシブエンハンスメントを前提とし、SSR で静的な `<a href>` を出力します。
 * クライアントではルーターがリンクをインターセプトします。
 *
 * ## 使用方法
 *
 * ```html
 * <ui-pagination
 *   current="5"
 *   total="10"
 *   .getHref="${(p) => `/notes?page=${p}`}"
 * ></ui-pagination>
 * ```
 *
 * @property {number} current - 現在のページ（1始まり）
 * @property {number} total   - 総ページ数
 * @property {(page: number) => string} getHref - ページ番号から URL を生成する関数
 * @property {'regular' | 'compact'} mode - 表示モード
 *
 * @cssprop --bg-surface-active   - 現在ページの背景色
 * @cssprop --bg-hover            - ホバー時の背景色
 * @cssprop --primary             - 現在ページのテキスト色・インジケーター色
 * @cssprop --fg-muted            - 非アクティブなページのテキスト色
 * @cssprop --fg-subtle           - 省略記号の色
 * @cssprop --border-width-thick  - アクティブインジケーターの幅
 * @cssprop --opacity-disabled    - 無効状態の不透明度
 * @cssprop --control-height-md   - アイテムの高さ (32px)
 * @cssprop --control-min-touch   - タッチターゲットの最小サイズ (24px)
 * @cssprop --font-sans           - フォントファミリー
 * @cssprop --text-base           - フォントサイズ (14px)
 * @cssprop --space-1             - デスクトップ時のギャップ (4px)
 * @cssprop --space-3             - タッチ時のギャップ (12px)
 * @cssprop --radius-md           - ボーダー半径 (6px)
 * @cssprop --duration-fast       - トランジション時間 (70ms)
 * @cssprop --ease-out            - イージング関数
 * @cssprop --scale-pressed       - 押下時のスケール (0.96)
 * @cssprop --focus-ring-width    - フォーカスリング幅
 * @cssprop --focus-ring-color    - フォーカスリング色
 * @cssprop --focus-ring-offset   - フォーカスリングオフセット
 * @cssprop --animation-focus     - Adaptive Focus アニメーション
 * @cssprop --icon-base           - アイコンサイズ (16px)
 *
 * @csspart nav   - nav 要素
 * @csspart list  - ul 要素
 */
@customElement('ui-pagination')
export class Pagination extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
    }

    /* ====== リストコンテナ ====== */

    .list {
      display: flex;
      align-items: center;
      flex-wrap: nowrap; /* 折り返し禁止: 仕様の Layout Stability 要件 */
      list-style: none;
      margin: 0;
      padding: 0;
      gap: var(--space-1, 0.25rem); /* 4px */
    }

    /* タッチデバイス: ギャップを広げてヒットエリア重複を回避 */
    @media (hover: none) and (pointer: coarse) {
      .list {
        gap: var(--space-3, 0.75rem); /* 12px */
      }
    }

    /* ====== アイテム ====== */

    .item {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* ====== ページボタン・ナビゲーションボタン共通 ====== */

    .page-btn,
    .nav-btn {
      /* ゴーストボタン (ui-button variant="ghost" size="md") をベースに実装 */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;

      height: var(--control-height-md, 32px);
      min-width: var(--control-height-md, 32px);
      padding: 0;

      font-family: var(--font-sans);
      font-size: var(--text-base, 0.875rem);
      font-variant-numeric: tabular-nums; /* 等幅数字: 仕様の注記に従い font-mono は不使用 */
      line-height: 1;
      /* 例外許可: Paginationはボタン型リンク。輪郭・背景・現在地インジケータで非色シグナルを示す。 */
      text-decoration: none;

      border-radius: var(--radius-md, 0.375rem);

      background: transparent;
      color: var(--fg-muted, oklch(45% 0 0));

      /* Interaction */
      cursor: pointer;
      user-select: none;

      /* Transition: 明示的なプロパティリスト (transition: all は使用しない) */
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        box-shadow var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* ホバー */
    .page-btn:hover,
    .nav-btn:not([aria-disabled='true']):hover {
      background: var(--bg-hover, oklch(0% 0 0 / 0.05));
    }

    /* 押下 */
    .page-btn:active,
    .nav-btn:not([aria-disabled='true']):active {
      transform: scale(var(--scale-pressed, 0.96));
    }

    /* フォーカス */
    .page-btn:focus-visible,
    .nav-btn:not([aria-disabled='true']):focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(55% 0.2 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    /* ====== 現在ページ ====== */

    /* Markup: <a aria-current="page"> を使用し、再訪（リロード・新規タブ）を可能に */
    .page-btn[aria-current='page'] {
      background: var(--bg-surface-active, oklch(55% 0.2 250 / 0.08));
      color: var(--primary, oklch(55% 0.2 250));
      font-weight: 700;
    }

    /* 現在ページのホバー: 背景色を維持（変化させない） */
    .page-btn[aria-current='page']:hover {
      background: var(--bg-surface-active, oklch(55% 0.2 250 / 0.08));
    }

    /* 現在ページの押下: タクタイルフィードバック不要（既に「ここにいる」ため） */
    .page-btn[aria-current='page']:active {
      transform: none;
    }

    /* ====== 無効状態 (Prev/Next の先頭・末尾) ====== */

    /*
     * Disabled: <a> ではなく <span aria-disabled="true"> として描画。
     * フォーカス不能・遷移不能を物理的に担保。
     * href を持たないため、誤クリックでもナビゲーションが発生しない。
     */
    .nav-btn[aria-disabled='true'] {
      opacity: var(--opacity-disabled, 0.5);
      cursor: default;
      pointer-events: none;
    }

    /* ====== 省略記号 ====== */

    /*
     * Markup: <span aria-hidden="true"> として実装。
     * スクリーンリーダーには省略の存在を伝えず、各ページリンクの aria-label で文脈を提供。
     */
    .ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: var(--control-height-md, 32px);
      min-width: var(--control-height-md, 32px);
      color: var(--fg-subtle, oklch(60% 0 0));
      font-size: var(--text-base, 0.875rem);
      user-select: none;
    }

    /* ====== アイコン ====== */

    ui-icon {
      font-size: var(--icon-base, 16px);
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      flex-shrink: 0;
    }

    /* ====== タッチターゲット拡張 ====== */

    /*
     * coarse pointer のみ有効化。
     * デスクトップ (fine pointer) でヒットエリアが重複するのを防ぐため、
     * @media (hover: none) and (pointer: coarse) でのみ適用。
     */
    @media (hover: none) and (pointer: coarse) {
      .page-btn::after,
      .nav-btn::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        min-width: var(--control-min-touch, 24px);
        min-height: var(--control-min-touch, 24px);
        pointer-events: none;
      }
    }

    /* ====== Motion Reduction ====== */

    /*
     * prefers-reduced-motion: reduce の場合、トランジションを即座に完了。
     * 0.01ms への短縮はグローバルルールに準拠。
     */
    @media (prefers-reduced-motion: reduce) {
      .page-btn,
      .nav-btn {
        transition-duration: 0.01ms;
      }
    }

    /* ====== Forced Colors Mode ====== */

    /*
     * Windows 高コントラストモード等での対応。
     * box-shadow によるインジケーターは消失するため、outline でフォールバック。
     */
    @media (forced-colors: active) {
      /* 全アイテムに境界線を追加して構造を維持 */
      .page-btn,
      .nav-btn:not([aria-disabled='true']) {
        border: var(--border-width, 1px) solid CanvasText;
      }

      /* 現在ページ: outline で現在地を明示 */
      .page-btn[aria-current='page'] {
        outline: 2px solid Highlight;
        outline-offset: -2px;
        background: Highlight;
        color: HighlightText;
        box-shadow: none; /* システムカラー環境では box-shadow が消失するためリセット */
      }

      /* 無効状態: color: GrayText でシステムカラーによるフォールバック */
      .nav-btn[aria-disabled='true'] {
        color: GrayText;
        border: var(--border-width, 1px) solid GrayText;
        opacity: 1; /* forced-colors では opacity が無効化される場合があるため */
      }
    }
  `;

  /**
   * 現在のページ（1始まり）
   * @default 1
   */
  @property({ type: Number, reflect: true })
  current = 1;

  /**
   * 総ページ数
   * @default 1
   */
  @property({ type: Number, reflect: true })
  total = 1;

  /**
   * ページ番号から URL を生成する関数。
   * SSR 時に各リンクの静的 href を生成するために使用。
   * JavaScript 無効時でもリンク遷移が機能することを保証。
   *
   * @example
   * ```js
   * // Eleventy テンプレートの例
   * pagination.getHref = (page) => `/notes/page/${page}/`;
   * ```
   * @default (p) => `?page=${p}`
   */
  @property({ attribute: false })
  getHref: (page: number) => string = (p) => `?page=${String(p)}`;

  /**
   * 表示モード。
   * どの状況で compact を選ぶかは上位レイヤの責務です。
   */
  @property({ reflect: true })
  mode: PaginationMode = 'regular';

  override render(): TemplateResult {
    const { getHref } = this;
    const { current, total } = normalizePagination(this.current, this.total);
    const isFirst = current <= 1;
    const isLast = current >= total;
    const range =
      this.mode === 'compact'
        ? computeCompactRange(current, total)
        : computeRegularRange(current, total);

    return html`
      <nav aria-label="ページナビゲーション" part="nav">
        <ul class="list" part="list">
          ${this._renderPrevItem(isFirst, current, getHref)}
          ${range.map((item, i) => this._renderRangeItem(item, i, current, getHref))}
          ${this._renderNextItem(isLast, current, getHref)}
        </ul>
      </nav>
    `;
  }

  /** 「前のページへ」ナビゲーションアイテムを描画 */
  private _renderPrevItem(
    isFirst: boolean,
    current: number,
    getHref: (p: number) => string,
  ): TemplateResult {
    if (isFirst) {
      // 先頭ページ: <span aria-disabled="true"> で描画（フォーカス不能・遷移不能）
      return html`
        <li class="item">
          <span class="nav-btn" aria-disabled="true" aria-label="前のページへ移動">
            <ui-icon name="chevron-left" aria-hidden="true"></ui-icon>
          </span>
        </li>
      `;
    }
    return html`
      <li class="item">
        <a class="nav-btn" href="${getHref(current - 1)}" data-link-kind="internal-document" data-link-surface="navigation" aria-label="前のページへ移動">
          <ui-icon name="chevron-left" aria-hidden="true"></ui-icon>
        </a>
      </li>
    `;
  }

  /** 「次のページへ」ナビゲーションアイテムを描画 */
  private _renderNextItem(
    isLast: boolean,
    current: number,
    getHref: (p: number) => string,
  ): TemplateResult {
    if (isLast) {
      // 末尾ページ: <span aria-disabled="true"> で描画（フォーカス不能・遷移不能）
      return html`
        <li class="item">
          <span class="nav-btn" aria-disabled="true" aria-label="次のページへ移動">
            <ui-icon name="chevron-right" aria-hidden="true"></ui-icon>
          </span>
        </li>
      `;
    }
    return html`
      <li class="item">
        <a class="nav-btn" href="${getHref(current + 1)}" data-link-kind="internal-document" data-link-surface="navigation" aria-label="次のページへ移動">
          <ui-icon name="chevron-right" aria-hidden="true"></ui-icon>
        </a>
      </li>
    `;
  }

  /** 範囲アイテム（ページ番号 or 省略記号）を描画 */
  private _renderRangeItem(
    item: RangeItem,
    index: number,
    current: number,
    getHref: (p: number) => string,
  ): TemplateResult {
    if (item === 'ellipsis') {
      return html`
        <li class="item">
          <span class="ellipsis" aria-hidden="true" data-index="${index}">…</span>
        </li>
      `;
    }

    if (item === current) {
      // 現在ページ: <a aria-current="page" href="..."> を使用し再訪可能に
      return html`
        <li class="item">
          <a
            class="page-btn"
            href="${getHref(item)}"
            data-link-kind="internal-document"
            data-link-surface="navigation"
            aria-current="page"
            aria-label="現在のページ、${item}ページ"
          >
            ${item}
          </a>
        </li>
      `;
    }

    return html`
      <li class="item">
        <a class="page-btn" href="${getHref(item)}" data-link-kind="internal-document" data-link-surface="navigation" aria-label="${item}ページへ移動"> ${item} </a>
      </li>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-pagination': Pagination;
  }
}
