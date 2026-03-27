import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

/** ナビゲーションランドマークのラベル */
const NAV_LABEL = 'メインナビゲーション';

/** フォーカス可能要素のセレクタ */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Fixed/Overlay切替の最小許容値 */
const MIN_BREAKPOINT = 320;

/** LocalStorage 永続化キー */
const STORAGE_KEY = 'rouault.sidebar.state';

export type SidebarState = 'expanded' | 'collapsed';
export type SidebarMode = 'fixed' | 'overlay';

export interface UiSidebarStateChangeDetail {
  state: SidebarState;
  mode: SidebarMode;
}

@customElement('ui-sidebar-shell')
export class UiSidebarShell extends LitElement {
  static override styles = css`
    /* ── ホスト: Grid Item として機能 ── */
    :host {
      display: block;
      block-size: 100%;
      min-block-size: 0;
      overflow: visible;

      /* パブリックトークン（外部からオーバーライド可能） */
      --ui-sidebar-scrim-opacity: var(--opacity-scrim, 0.6);
    }

    /* ── ナビゲーション本体 ── */
    nav {
      box-sizing: border-box;
      block-size: 100%;
      overflow: hidden;
      background: var(--bg-surface-1, oklch(98% 0.01 250));
      border-right: var(--border-width, 1px) solid var(--border-ghost, oklch(20% 0 0 / 0.04));
      display: flex;
      flex-direction: column;
      opacity: 1;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    /* ── Fixed Mode: 基本レイアウト ── */
    :host([mode='fixed']) nav {
      position: sticky;
      top: var(--header-height);
      inline-size: 100%;
      max-block-size: var(--layout-sticky-max-block-size, calc(100vh - var(--header-height)));
    }

    .sidebar-header,
    .sidebar-content {
      opacity: 1;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    :host([data-state='collapsed']) nav,
    :host([data-state='collapsed']) .sidebar-header,
    :host([data-state='collapsed']) .sidebar-content {
      opacity: 0;
    }

    /* ── Overlay Mode: 前景補助面 ── */
    :host([mode='overlay']) nav {
      position: fixed;
      inset-block: 0;
      inset-inline-start: 0;
      inline-size: var(--sidebar-width, 240px);
      z-index: var(--z-modal, 300);
    }

    /* ── Header スロット: Fixed では非表示 ── */
    :host([mode='fixed']) .sidebar-header {
      display: none;
    }

    .sidebar-header {
      flex-shrink: 0;
      background: var(--bg-surface-2, oklch(100% 0 0));
      border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(20% 0 0 / 0.12));
    }

    /* スロットが空の場合はヘッダーエリアを隠す */
    .sidebar-header:empty,
    .sidebar-header:not(:has(::slotted(*))) {
      display: none;
    }

    /* ── コンテンツエリア ── */
    .sidebar-content {
      flex: 1 1 auto;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      min-block-size: 0;
    }

    /* ── スクリム（Overlay Mode 背景遮蔽） ── */
    .scrim {
      position: fixed;
      inset: 0;
      background: oklch(0% 0 0 / var(--ui-sidebar-scrim-opacity));
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
      z-index: var(--z-backdrop, 200);
    }

    :host([mode='overlay'][data-state='expanded']) .scrim {
      opacity: 1;
      pointer-events: auto;
    }

    /* Fixed Mode ではスクリムを完全非表示 */
    :host([mode='fixed']) .scrim {
      display: none;
    }

    /* ── Dark Mode ── */
    @media (prefers-color-scheme: dark) {
      nav {
        border-color: var(--border-ghost, oklch(90% 0 0 / 0.04));
      }
    }

    /* ── Forced Colors Mode ── */
    @media (forced-colors: active) {
      nav {
        background: Canvas;
        border-right: var(--border-width, 1px) solid CanvasText;
      }

      ::slotted([aria-current='page']) {
        outline: 2px solid Highlight;
        outline-offset: -2px;
      }
    }

    /* ── Reduced Motion ── */
    @media (prefers-reduced-motion: reduce) {
      nav,
      .sidebar-content,
      .sidebar-header,
      .scrim {
        animation: none !important;
        transition: none !important;
      }
    }

    /* ── Print ── */
    @media print {
      :host {
        display: none !important;
      }
    }
  `;

  @property({ reflect: true, attribute: 'data-state' })
  state: SidebarState = 'expanded';

  @property({ reflect: true })
  mode: SidebarMode = 'fixed';

  @property({ type: Number, reflect: true, attribute: 'fixed-breakpoint' })
  fixedBreakpoint = 1280;

  @query('nav')
  private _navElement!: HTMLElement;

  /** メディアクエリリスナー */
  private _mediaQuery: MediaQueryList | null = null;

  /** フォーカス返却先のトリガー要素 */
  private _triggerElement: HTMLElement | null = null;

  /** 初回レンダリング完了フラグ（初期値でのイベント発火を防止） */
  private _hasRendered = false;

  /** 順次実行キュー（dialogパターン） */
  private _operation: Promise<void> = Promise.resolve();

  override connectedCallback(): void {
    super.connectedCallback();
    this._restoreState();
    this._initMediaQuery();
  }

  override disconnectedCallback(): void {
    this._destroyMediaQuery();
    super.disconnectedCallback();
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (!this._hasRendered) {
      this._hasRendered = true;
      /* 初期状態に合わせて inert/visibility を同期 */
      this._syncInitialVisibility();
      return;
    }

    if (changedProperties.has('fixedBreakpoint')) {
      this._initMediaQuery();
    }

    if (changedProperties.has('state')) {
      const previousState = changedProperties.get('state');
      /* 同値の場合はスキップ */
      if (previousState === this.state) return;

      this._persistState();
      this._enqueue(async () => {
        if (this.state === 'expanded') {
          await this._expandSidebar();
          return;
        }
        await this._collapseSidebar();
      });
    }
  }

  /* ===================================================================
   * パブリック API
   * =================================================================== */

  /** サイドバーを展開する */
  expand(trigger?: HTMLElement): void {
    this._captureTrigger(trigger);
    if (this.state === 'expanded') return;
    this.state = 'expanded';
  }

  /** サイドバーを格納する */
  collapse(): void {
    if (this.state === 'collapsed') return;
    this.state = 'collapsed';
  }

  /** サイドバーの開閉をトグルする */
  toggle(trigger?: HTMLElement): void {
    if (this.state === 'expanded') {
      this._captureTrigger(trigger);
      this.collapse();
    } else {
      this.expand(trigger);
    }
  }

  /* ===================================================================
   * ライフサイクルヘルパー
   * =================================================================== */

  /** LocalStorage から状態を復元する */
  private _restoreState(): void {
    /* data-state 属性が明示的に指定されている場合は復元しない（親コンポーネントの意図を尊重） */
    if (this.hasAttribute('data-state')) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'expanded' || stored === 'collapsed') {
        this.state = stored;
      }
    } catch {
      /* localStorage アクセス不可（SSR / プライバシー設定等） */
    }
  }

  /** 状態を LocalStorage に永続化する */
  private _persistState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, this.state);
    } catch {
      /* 永続化失敗時は無視 */
    }
  }

  /** matchMedia を初期化しモードを自動判定する */
  private _initMediaQuery(): void {
    if (typeof window === 'undefined') return;
    /* mode 属性が明示的に指定されている場合は自動判定しない */
    if (this.hasAttribute('mode')) return;
    this._destroyMediaQuery();

    this._mediaQuery = window.matchMedia(this._buildMediaQuery());
    this._applyModeFromMediaQuery(this._mediaQuery.matches);
    this._mediaQuery.addEventListener('change', this._onMediaQueryChange);
  }

  /** matchMedia リスナーを解除する */
  private _destroyMediaQuery(): void {
    this._mediaQuery?.removeEventListener('change', this._onMediaQueryChange);
    this._mediaQuery = null;
  }

  /** 現在の固定ブレークポイントから media query 文字列を組み立てる */
  private _buildMediaQuery(): string {
    const resolved = this._resolveFixedBreakpoint(this.fixedBreakpoint);
    return `(min-width: ${String(resolved)}px)`;
  }

  /** 不正値を保護した固定ブレークポイントを返す */
  private _resolveFixedBreakpoint(value: number): number {
    if (!Number.isFinite(value)) {
      return 1280;
    }
    const normalized = Math.trunc(value);
    return normalized >= MIN_BREAKPOINT ? normalized : MIN_BREAKPOINT;
  }

  /** matchMedia の評価結果を mode に反映する */
  private _applyModeFromMediaQuery(isFixed: boolean): void {
    this.mode = isFixed ? 'fixed' : 'overlay';
  }

  /** 初回レンダリング時に collapsed なら即座に inert/visibility を同期 */
  private _syncInitialVisibility(): void {
    if (this.state === 'collapsed') {
      this._navElement.inert = true;
      this._navElement.style.visibility = 'hidden';
    }
  }

  /* ===================================================================
   * オペレーションキュー（dialog パターン）
   * =================================================================== */

  private _enqueue(task: () => Promise<void>): void {
    this._operation = this._operation.then(task).catch((error: unknown) => {
      console.error('[ui-sidebar] operation failed', error);
    });
  }

  /** 展開処理 */
  private async _expandSidebar(): Promise<void> {
    const nav = this._navElement;

    /* Step 1: visibility 復元 + inert 解除（アニメーション前） */
    nav.style.visibility = 'visible';
    nav.inert = false;

    /* Step 2: アニメーション待機 */
    await this._waitForAnimations(nav);

    /* Step 3: Overlay モードのみ — 先頭フォーカス可能要素へ移動 */
    if (this.mode === 'overlay') {
      this._focusFirstElement();
    }

    /* Step 4: イベント発火 */
    this._dispatchStateChange();
  }

  /** 格納処理 */
  private async _collapseSidebar(): Promise<void> {
    const nav = this._navElement;

    /* Step 1: inert を即座に付与（アニメーション前にフォーカス無効化） */
    nav.inert = true;

    /* Step 2: アニメーション待機 */
    await this._waitForAnimations(nav);

    /* Step 3: アニメーション完了後に visibility: hidden */
    nav.style.visibility = 'hidden';

    /* Step 4: Overlay モードのみ — トリガーへフォーカス返却 */
    if (this.mode === 'overlay') {
      this._restoreTriggerFocus();
    }

    /* Step 5: イベント発火 */
    this._dispatchStateChange();
  }

  /** 要素上のアニメーション（CSS transition / animation）完了を待機 */
  private async _waitForAnimations(element: Element): Promise<void> {
    if (this._prefersReducedMotion()) {
      return;
    }

    /* ブラウザに transition 開始の機会を与える */
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    const animations = element.getAnimations();
    if (animations.length === 0) return;
    await Promise.allSettled(animations.map((a) => a.finished));
  }

  /* ===================================================================
   * フォーカス管理
   * =================================================================== */

  /** トリガー要素をキャプチャする */
  private _captureTrigger(trigger?: HTMLElement): void {
    if (trigger instanceof HTMLElement) {
      this._triggerElement = trigger;
      return;
    }
    const active = this.ownerDocument.activeElement;
    this._triggerElement = active instanceof HTMLElement ? active : null;
  }

  /** サイドバー内の最初のフォーカス可能要素にフォーカスを移動する */
  private _focusFirstElement(): void {
    const target = this._resolveInitialFocusTarget();
    if (!target) {
      return;
    }

    if (this._prefersReducedMotion()) {
      target.focus({ preventScroll: true });
      return;
    }

    requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
    });
  }

  /** トリガー要素へフォーカスを返却する */
  private _restoreTriggerFocus(): void {
    const target = this._triggerElement;
    if (!target?.isConnected) return;
    target.focus({ preventScroll: true });
  }

  /** 要素リストから最初のフォーカス可能要素を検索する */
  private _findFirstFocusable(elements: readonly Element[]): HTMLElement | null {
    for (const el of elements) {
      if (el instanceof HTMLElement && el.matches(FOCUSABLE_SELECTOR)) {
        return el;
      }
      const nested = el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (nested) return nested;
    }
    return null;
  }

  /** 初期フォーカス候補を解決する */
  private _resolveInitialFocusTarget(): HTMLElement | null {
    /* header スロットの slotted 要素を優先的に探索 */
    const headerSlot = this.shadowRoot?.querySelector<HTMLSlotElement>(
      '.sidebar-header slot[name="header"]',
    );
    const headerElements = headerSlot?.assignedElements({ flatten: true }) ?? [];
    const headerFocusable = this._findFirstFocusable(headerElements);
    if (headerFocusable) {
      return headerFocusable;
    }

    /* デフォルトスロットの slotted 要素を探索 */
    const defaultSlot = this.shadowRoot?.querySelector<HTMLSlotElement>(
      '.sidebar-content slot:not([name])',
    );
    const defaultElements = defaultSlot?.assignedElements({ flatten: true }) ?? [];
    return this._findFirstFocusable(defaultElements);
  }

  /** reduced motion が有効かを判定する */
  private _prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /* ===================================================================
   * イベント
   * =================================================================== */

  /** 状態変更イベントを発火する */
  private _dispatchStateChange(): void {
    this.dispatchEvent(
      new CustomEvent<UiSidebarStateChangeDetail>('ui-sidebar-state-change', {
        bubbles: false,
        composed: false,
        detail: { state: this.state, mode: this.mode },
      }),
    );
  }

  /* ===================================================================
   * イベントハンドラ
   * =================================================================== */

  /** メディアクエリ変更ハンドラ */
  private _onMediaQueryChange = (event: MediaQueryListEvent): void => {
    this._applyModeFromMediaQuery(event.matches);
  };

  /** スクリムクリックハンドラ */
  private _onScrimClick = (): void => {
    this.collapse();
  };

  /** Esc キーハンドラ（Overlay モードのみ） */
  private _onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    if (this.mode !== 'overlay') return;
    if (this.state !== 'expanded') return;
    event.preventDefault();
    this.collapse();
  };

  /* ===================================================================
   * レンダリング
   * =================================================================== */

  override render() {
    return html`
      <nav aria-label=${NAV_LABEL} @keydown=${this._onKeydown}>
        <div class="sidebar-header">
          <slot name="header"></slot>
        </div>
        <div class="sidebar-content">
          <slot></slot>
        </div>
      </nav>
      <div class="scrim" aria-hidden="true" @click=${this._onScrimClick}></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-sidebar-shell': UiSidebarShell;
  }
}
