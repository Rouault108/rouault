import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * ui-pagination - アクセシブルなページネーションコンポーネント
 *
 * @fires page-change - ページが変更されたときに発火 { detail: { page: number } }
 * @fires page-hover - ページ番号にホバーしたときに発火 { detail: { page: number } }
 *
 * @cssprop --pagination-gap - ページネーションアイテム間のギャップ
 * @cssprop --pagination-button-size - ページボタンのサイズ
 */
@customElement('ui-pagination')
export class UiPagination extends LitElement {
  static override styles = css`
    /* -------------------------------------------------------------
     * ホスト要素
     * ------------------------------------------------------------- */
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: var(--text-sm, 0.8125rem);
      line-height: 1.5;
    }

    /* -------------------------------------------------------------
     * ナビゲーション
     * ------------------------------------------------------------- */
    nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--pagination-gap, var(--space-1, 0.25rem));
      flex-wrap: wrap;
    }

    /* -------------------------------------------------------------
     * ボタン共通スタイル（Ghost ベース - Linear/Raycast 風）
     * ------------------------------------------------------------- */
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      
      min-width: var(--pagination-button-size, 2rem);
      height: var(--pagination-button-size, 2rem);
      padding: 0 var(--space-2, 0.5rem);
      
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-md, 0.375rem);
      
      color: var(--color-foreground-muted, #6b7280);
      font-family: inherit;
      font-size: inherit;
      font-weight: var(--font-medium, 500);
      line-height: 1;
      
      cursor: pointer;
      user-select: none;
      
      transition: 
        color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        background-color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        border-color var(--motion-duration, 200ms) var(--motion-easing, ease-out);
    }

    button:hover:not(:disabled) {
      background-color: var(--color-background-subtle, #f3f4f6);
      color: var(--color-foreground, #111827);
    }

    button:focus-visible {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
    }

    button:active:not(:disabled) {
      transform: scale(0.98);
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* -------------------------------------------------------------
     * 現在のページ
     * ------------------------------------------------------------- */
    button[aria-current="page"] {
      background-color: var(--color-primary, #3b82f6);
      color: #ffffff;
      font-weight: var(--font-semibold, 600);
    }

    button[aria-current="page"]:hover {
      background-color: var(--color-primary-hover, #2563eb);
      color: #ffffff;
    }

    /* -------------------------------------------------------------
     * 前へ/次へボタン
     * ------------------------------------------------------------- */
    .prev-next {
      padding: 0 var(--space-3, 0.75rem);
    }

    /* -------------------------------------------------------------
     * 省略記号
     * ------------------------------------------------------------- */
    .ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: var(--pagination-button-size, 2rem);
      height: var(--pagination-button-size, 2rem);
      color: var(--color-foreground-muted, #6b7280);
      user-select: none;
    }

    /* -------------------------------------------------------------
     * コンパクトバリアント
     * ------------------------------------------------------------- */
    :host([variant="compact"]) nav {
      gap: var(--space-2, 0.5rem);
    }

    :host([variant="compact"]) button {
      min-width: 1.75rem;
      height: 1.75rem;
      padding: 0 var(--space-1, 0.25rem);
      font-size: var(--text-xs, 0.75rem);
    }

    :host([variant="compact"]) .prev-next {
      padding: 0 var(--space-2, 0.5rem);
    }

    /* -------------------------------------------------------------
     * アイコン（Lucide chevron-left/right）
     * ------------------------------------------------------------- */
    svg {
      width: 1em;
      height: 1em;
      stroke: currentColor;
      flex-shrink: 0;
    }

    /* -------------------------------------------------------------
     * ダークモード対応（グローバルトークンを使用）
     * ------------------------------------------------------------- */
    @media (prefers-color-scheme: dark) {
      button:hover:not(:disabled) {
        background-color: var(--bg-surface-1, #171717);
      }

      button[aria-current="page"] {
        background-color: var(--color-primary, #60a5fa);
      }

      button[aria-current="page"]:hover {
        background-color: var(--color-primary-hover, #93c5fd);
      }
    }

    /* data-theme="dark" 対応 */
    :host-context([data-theme='dark']) button:hover:not(:disabled) {
      background-color: var(--bg-surface-1, #171717);
    }

    :host-context([data-theme='dark']) button[aria-current="page"] {
      background-color: var(--color-primary, #60a5fa);
    }

    :host-context([data-theme='dark']) button[aria-current="page"]:hover {
      background-color: var(--color-primary-hover, #93c5fd);
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      button {
        transition: none;
      }
    }
  `;

  @property({ type: Number, attribute: 'current-page' })
  currentPage = 1;

  @property({ type: Number, attribute: 'total-pages' })
  totalPages = 1;

  @property({ type: Number, attribute: 'sibling-count' })
  siblingCount = 1;

  @state()
  private _isMobile = false;

  private _resizeObserver: ResizeObserver | null = null;

  @property({ type: String, reflect: true })
  variant: 'default' | 'compact' = 'default';

  @property({ type: Boolean, attribute: 'show-first-last' })
  showFirstLast = false;

  @property({ type: String, attribute: 'aria-label' })
  override ariaLabel = 'ページネーション';

  @property({ type: String, attribute: 'prev-label' })
  prevLabel = '前のページ';

  @property({ type: String, attribute: 'next-label' })
  nextLabel = '次のページ';

  @property({ type: String, attribute: 'first-label' })
  firstLabel = '最初のページ';

  @property({ type: String, attribute: 'last-label' })
  lastLabel = '最後のページ';

  override connectedCallback() {
    super.connectedCallback();
    this._setupResizeObserver();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  private _setupResizeObserver() {
    // コンポーネントの幅に基づいてモバイル表示を判定
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // 約 600px 以下をモバイルとみなして siblingCount を減らす
        this._isMobile = entry.contentRect.width < 600;
        this.requestUpdate();
      }
    });
    this._resizeObserver.observe(this);
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this._handlePageChange(this.currentPage - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this._handlePageChange(this.currentPage + 1);
    }
  }

  private _handlePageHover(page: number) {
    // プリフェッチ等の最適化のためのイベント
    this.dispatchEvent(
      new CustomEvent('page-hover', {
        detail: { page },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handlePageChange(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent('page-change', {
        detail: { page },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * ページ番号の配列を生成（省略機能付き）
   * Linear/Raycast 風に現在のページ周辺のみ表示
   */
  private _generatePageNumbers(): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = [];
    const { currentPage, totalPages } = this;
    
    // モバイル時は siblingCount を 0（現在ページのみ）、そうでなければ設定値を使用
    const effectiveSiblingCount = this._isMobile ? 0 : this.siblingCount;

    // 総ページ数が少ない場合はすべて表示
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // 最初のページは常に表示
    pages.push(1);

    // 現在のページ周辺の範囲を計算
    const leftSiblingIndex = Math.max(currentPage - effectiveSiblingCount, 2);
    const rightSiblingIndex = Math.min(currentPage + effectiveSiblingCount, totalPages - 1);

    // 左側の省略記号
    const showLeftEllipsis = leftSiblingIndex > 2;
    // 右側の省略記号
    const showRightEllipsis = rightSiblingIndex < totalPages - 1;

    if (showLeftEllipsis) {
      pages.push('ellipsis');
    }

    // 現在のページ周辺を表示
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      pages.push(i);
    }

    if (showRightEllipsis) {
      pages.push('ellipsis');
    }

    // 最後のページは常に表示
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }

  private _renderChevronLeft() {
    return html`
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    `;
  }

  private _renderChevronRight() {
    return html`
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    `;
  }

  private _renderChevronsLeft() {
    return html`
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="11 17 6 12 11 7" />
        <polyline points="18 17 13 12 18 7" />
      </svg>
    `;
  }

  private _renderChevronsRight() {
    return html`
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="13 17 18 12 13 7" />
        <polyline points="6 17 11 12 6 7" />
      </svg>
    `;
  }

  override render() {
    const pages = this._generatePageNumbers();
    const isFirstPage = this.currentPage === 1;
    const isLastPage = this.currentPage === this.totalPages;

    return html`
      <nav 
        aria-label="${this.ariaLabel}" 
        role="navigation"
        tabindex="0"
        @keydown=${this._handleKeyDown}
      >
        ${this.showFirstLast
          ? html`
              <button
                class="prev-next"
                @click=${() => this._handlePageChange(1)}
                ?disabled=${isFirstPage}
                aria-label="${this.firstLabel}"
              >
                ${this._renderChevronsLeft()}
              </button>
            `
          : ''}
        
        <button
          class="prev-next"
          @click=${() => this._handlePageChange(this.currentPage - 1)}
          ?disabled=${isFirstPage}
          aria-label="${this.prevLabel}"
        >
          ${this._renderChevronLeft()}
        </button>

        ${pages.map((page) => {
          if (page === 'ellipsis') {
            return html`<span class="ellipsis" aria-hidden="true">…</span>`;
          }

          return html`
            <button
              @click=${() => this._handlePageChange(page)}
              @mouseenter=${() => this._handlePageHover(page)}
              aria-current=${page === this.currentPage ? 'page' : nothing}
              aria-label="${page === this.currentPage ? `現在のページ、${page}` : `ページ ${page}`}"
            >
              ${page}
            </button>
          `;
        })}

        <button
          class="prev-next"
          @click=${() => this._handlePageChange(this.currentPage + 1)}
          ?disabled=${isLastPage}
          aria-label="${this.nextLabel}"
        >
          ${this._renderChevronRight()}
        </button>

        ${this.showFirstLast
          ? html`
              <button
                class="prev-next"
                @click=${() => this._handlePageChange(this.totalPages)}
                ?disabled=${isLastPage}
                aria-label="${this.lastLabel}"
              >
                ${this._renderChevronsRight()}
              </button>
            `
          : ''}
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-pagination': UiPagination;
  }
}
