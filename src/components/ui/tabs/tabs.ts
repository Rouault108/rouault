import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

type TabsOrientation = 'horizontal' | 'vertical';

/** ユニークIDカウンター（同一ページ内で複数の ui-tabs が共存できるよう） */
let _uidCounter = 0;

/**
 * タブ (Tabs) コンポーネント `<ui-tabs>`
 *
 * 同一コンテキスト内でのビュー（パネル）切り替えを提供します。
 * WAI-ARIA Tabs パターン（Roving Tabindex）に準拠し、
 * スライディングインジケーターと opacity クロスフェードを実装します。
 *
 * ## 使用方法
 *
 * ```html
 * <ui-tabs selected-index="0">
 *   <button slot="tab">概要</button>
 *   <div slot="panel">概要コンテンツ</div>
 *   <button slot="tab">詳細</button>
 *   <div slot="panel">詳細コンテンツ</div>
 * </ui-tabs>
 * ```
 *
 * ## API Resolution Rules
 *
 * 1. `selected-value` が指定されていれば優先（URL連携時の安定性のため）
 * 2. `selected-value` が一致しない場合は `selected-index` を評価
 * 3. 両方が無効な場合は先頭タブ (index=0) を選択し、開発時に `console.warn` で通知
 *
 * @slot tab - タブボタン要素（複数可）。`value` 属性で `selected-value` と対応付けられます。
 * @slot panel - パネル要素（tab と 1:1 対応）
 *
 * @fires ui-tab-change - タブ変更時 detail: { index: number, value: string | null, prevIndex: number }
 *
 * @property {number} selected-index - 選択タブのインデックス（0始まり）
 * @property {string} selected-value - 選択タブの値（value 属性と対応）
 * @property {'horizontal' | 'vertical'} orientation - タブ配置方向（デフォルト: horizontal）
 * @property {boolean} automatic-activation - 矢印キーで即座に選択するか（デフォルト: false）
 *
 * @attr [hydrated] - JS初期化完了後に自動付与。SSR/SSGのフォールバックCSSと切り替えに使用。
 *
 * @csspart tablist - タブリスト要素
 * @csspart indicator - スライディングインジケーター要素
 * @csspart panels - パネルコンテナ要素
 *
 * @cssprop --primary - アクティブなタブとインジケーターの色
 * @cssprop --fg-muted - デフォルトのタブテキスト色
 * @cssprop --fg-default - ホバー時のタブテキスト色
 * @cssprop --border-default - タブリストのボーダー色
 * @cssprop --border-width - ボーダー幅
 * @cssprop --border-width-thick - インジケーターの幅/高さ
 * @cssprop --control-height-md - タブの高さ（32px）
 * @cssprop --text-base - タブのフォントサイズ（14px）
 * @cssprop --font-medium - タブのフォントウェイト（500）
 * @cssprop --font-sans - タブのフォントファミリー
 * @cssprop --space-1 - スペーシング（4px）
 * @cssprop --space-3 - スペーシング（12px）
 * @cssprop --space-4 - スペーシング（16px）
 * @cssprop --duration-fast - タブカラートランジション（70ms）
 * @cssprop --duration-normal - パネルフェードトランジション（150ms）
 * @cssprop --duration-slow - インジケータートランジション（200ms）
 * @cssprop --ease-out - イージング関数
 * @cssprop --ease-spring - インジケーターのスプリングイージング
 * @cssprop --focus-ring-width - フォーカスリング幅
 * @cssprop --focus-ring-color - フォーカスリング色
 * @cssprop --focus-ring-offset - フォーカスリングオフセット
 * @cssprop --animation-focus - Adaptive Focusアニメーション
 * @cssprop --radius-sm - タブのフォーカスリング角丸
 * @cssprop --scrollbar-width - スクロールバー幅
 * @cssprop --scrollbar-thumb - スクロールバーのサム色
 */
@customElement('ui-tabs')
export class Tabs extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    /* ====== ルートレイアウト ====== */

    .root {
      display: flex;
      flex-direction: column;
    }

    .root.orient-vertical {
      flex-direction: row;
      align-items: flex-start;
    }

    /* ====== Tablist コンテナ ====== */

    .tablist-container {
      position: relative;
      flex-shrink: 0;
    }

    [role='tablist'] {
      display: flex;
      position: relative;
      /* Horizontal: 下ボーダー */
      border-bottom: var(--border-width, 1px) solid
        var(--border-default, oklch(90% 0.01 250 / 0.12));
      /* 幅超過時は横スクロール許容 */
      overflow-x: auto;
      overflow-y: visible;
      /* フォーカスリングがコンテナ端で隠れないよう余白 */
      scroll-padding-inline: var(--space-4, 16px);
      /* カスタムスクロールバー: 視覚的ノイズを最小化 */
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb, oklch(70% 0 0 / 0.3)) transparent;
      /* インジケーター + スクロールバーのクリアランス */
      padding-bottom: calc(var(--border-width-thick, 2px) + var(--space-1, 4px));
    }

    .orient-vertical [role='tablist'] {
      flex-direction: column;
      /* Vertical: 右ボーダー */
      border-bottom: none;
      border-right: var(--border-width, 1px) solid
        var(--border-default, oklch(90% 0.01 250 / 0.12));
      overflow-x: visible;
      overflow-y: auto;
      padding-bottom: 0;
      /* Vertical時の右クリアランス（インジケーターが右ボーダーに重なる分） */
      padding-right: calc(var(--border-width-thick, 2px) + var(--space-1, 4px));
    }

    /* ====== Tab ボタン (slotted) ====== */

    ::slotted([slot='tab']) {
      /* Layout */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-1, 4px);

      /* Size: High Density 準拠（32px） */
      height: var(--control-height-md, 32px);
      padding: 0 var(--space-3, 12px);
      flex-shrink: 0;
      white-space: nowrap;

      /* Typography */
      font-size: var(--text-base, 14px);
      font-weight: var(--font-medium, 500);
      font-family: var(--font-sans);

      /* Color: Muted（デフォルト） */
      color: var(--fg-muted, oklch(48% 0.01 250));

      /* Reset */
      background: none;
      border: none;
      cursor: pointer;
      user-select: none;
      text-decoration: none;
      -webkit-tap-highlight-color: transparent;

      /* タッチターゲット用 (::after 疑似要素が適用できないため相対位置のみ設定) */
      position: relative;

      /* Transition: color のみを明示指定（transition: all を回避） */
      transition: color var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    ::slotted([slot='tab']:hover) {
      color: var(--fg-default, oklch(20% 0.01 250));
    }

    ::slotted([slot='tab'][aria-selected='true']) {
      color: var(--primary, oklch(60% 0.15 250));
    }

    ::slotted([slot='tab']:focus-visible) {
      outline: var(--focus-ring-width, 2px) solid
        var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
      border-radius: var(--radius-sm, 3px);
      z-index: 2;
    }

    /* ====== Hydration フォールバック ====== */
    /* JSによるインジケーター位置計算前（またはJS無効時）は、
       CSSで直接アクティブタブにボーダーを描画して現在地を保証する */

    ::slotted([slot='tab'][aria-selected='true']) {
      /* Horizontal: デフォルト下線 */
      border-bottom: var(--border-width-thick, 2px) solid
        var(--primary, oklch(60% 0.15 250));
    }

    :host([orientation='vertical']) ::slotted([slot='tab'][aria-selected='true']) {
      /* Vertical: 右線 */
      border-bottom: none;
      border-right: var(--border-width-thick, 2px) solid
        var(--primary, oklch(60% 0.15 250));
    }

    /* Hydrated後: スライディングインジケーターへシームレスに引き継ぎ */
    :host([hydrated]) ::slotted([slot='tab'][aria-selected='true']) {
      border-bottom: none;
      border-right: none;
    }

    /* ====== スライディングインジケーター ====== */
    /* 独立した共有レイアウト軸（Shared Layout Axis）として実装。
       NOTE: CSS transition on left/width を使用。
             FLIP (translateX) の方が GPU合成を活かせるが、
             Light DOM タブの位置をフレーム間で計算する複雑性を避けるため
             CSS transition で実装している。視覚的結果は同等。 */

    .indicator {
      position: absolute;
      /* Horizontal: 下端（padding-bottomのクリアランスを打ち消す位置） */
      bottom: calc(var(--border-width-thick, 2px) + var(--space-1, 4px));
      height: var(--border-width-thick, 2px);
      background: var(--primary, oklch(60% 0.15 250));
      pointer-events: none;
      z-index: 1;
      transform-origin: left center;

      /* CSS Transition */
      transition:
        left var(--duration-slow, 200ms)
          var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
        width var(--duration-slow, 200ms)
          var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
    }

    /* Vertical: 右端（tablistの border-right に重なる） */
    .orient-vertical .indicator {
      right: calc(-1 * var(--border-width, 1px));
      left: auto !important;
      bottom: auto;
      width: var(--border-width-thick, 2px) !important;
      height: auto;
      transform-origin: center top;

      transition:
        top var(--duration-slow, 200ms)
          var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
        height var(--duration-slow, 200ms)
          var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
    }

    /* ====== パネル ====== */

    .panels {
      flex: 1;
      min-width: 0;
    }

    ::slotted([slot='panel']) {
      display: block;
      opacity: 0;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* hidden 属性で非表示（!important でユーザースタイルに勝つ） */
    ::slotted([slot='panel'][hidden]) {
      display: none !important;
    }

    /* アクティブパネル */
    ::slotted([slot='panel'][data-panel-active]) {
      opacity: 1;
    }

    /* ====== Reduced Motion ====== */
    /* 状態変化の認識に必須なため完全無効化せず 0.01ms に短縮 */

    @media (prefers-reduced-motion: reduce) {
      .indicator {
        transition-duration: 0.01ms !important;
      }

      ::slotted([slot='panel']) {
        transition-duration: 0.01ms !important;
      }

      ::slotted([slot='tab']) {
        transition-duration: 0.01ms !important;
      }
    }

    /* ====== Forced Colors Mode ====== */
    /* 背景色とシャドウが消失するため JS 制御インジケーターを非表示にし、
       タブ自体のボーダーで「ネイティブ回帰」戦略を採用 */

    @media (forced-colors: active) {
      .indicator {
        display: none;
      }

      /* 全タブに構造を示すボーダー */
      ::slotted([slot='tab']) {
        border: var(--border-width, 1px) solid CanvasText;
      }

      /* Horizontal: アクティブタブの下線（Highlight = システム選択色） */
      ::slotted([slot='tab'][aria-selected='true']) {
        border-bottom: var(--border-width-thick, 2px) solid Highlight !important;
        color: Highlight;
      }

      /* Vertical: アクティブタブの右線 */
      :host([orientation='vertical']) ::slotted([slot='tab'][aria-selected='true']) {
        border-bottom: var(--border-width, 1px) solid CanvasText !important;
        border-right: var(--border-width-thick, 2px) solid Highlight !important;
      }
    }
  `;

  /** インスタンスID（同一ページ内で一意なARIA IDを生成するため） */
  private readonly _uid = ++_uidCounter;

  /**
   * 現在選択されているタブのインデックス（0始まり）。
   * `selected-value` との競合時は `selected-value` が優先されます。
   */
  @property({ type: Number, attribute: 'selected-index', reflect: true })
  selectedIndex = 0;

  /**
   * 現在選択されているタブの値（tab要素の `value` 属性と対応）。
   * URL連携時はハッシュまたはクエリパラメータとして利用されることを想定。
   * `selected-index` より優先されます。
   */
  @property({ type: String, attribute: 'selected-value', reflect: true })
  selectedValue: string | null = null;

  /**
   * タブの配置方向。
   * - `horizontal`（デフォルト）: 水平タブリスト、矢印左右でナビゲーション
   * - `vertical`: 垂直タブリスト、矢印上下でナビゲーション
   */
  @property({ type: String, reflect: true })
  orientation: TabsOrientation = 'horizontal';

  /**
   * `true` の場合、矢印キーでのフォーカス移動と同時にタブを選択します。
   * 設定画面などコンテンツがローカルにあり即応性が求められる場面向け。
   * デフォルト（`false`）は Manual Activation: Enter/Space で選択。
   */
  @property({ type: Boolean, attribute: 'automatic-activation', reflect: true })
  automaticActivation = false;

  /** 現在アクティブな（選択済み）タブのインデックス */
  @state() private _activeIndex = 0;

  /**
   * Roving Tabindex でフォーカスがある（tabindex="0" の）タブのインデックス。
   * Manual Activation 時は _activeIndex と乖離することがある。
   */
  @state() private _focusedIndex = 0;

  /** スロットに割り当てられたタブ要素のリスト */
  @state() private _tabEls: Element[] = [];

  /** スロットに割り当てられたパネル要素のリスト */
  @state() private _panelEls: Element[] = [];

  @query('[role="tablist"]') private _tablistEl!: HTMLElement;
  @query('.indicator') private _indicatorEl!: HTMLElement;

  /** タブ要素ごとのクリックハンドラ（disconnectedCallback でクリーンアップ用） */
  private readonly _tabClickHandlers = new Map<Element, EventListener>();

  /** タブリストサイズ変化時にインジケーターを再計算するための ResizeObserver */
  private _resizeObserver?: ResizeObserver;

  /** 初期化済みフラグ（初回 _resolveAndApply は必ず適用するため） */
  private _initialized = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => {
      this._positionIndicator();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._cleanupTabListeners();
  }

  override firstUpdated(_changedProperties: PropertyValues<this>): void {
    super.firstUpdated(_changedProperties);

    // slotchange が firstUpdated より遅く発火する場合のフォールバック:
    // 初回レンダリング後にスロット要素を手動で取得して初期化する
    const tabSlot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="tab"]');
    const panelSlot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="panel"]');

    if (tabSlot) this._tabEls = tabSlot.assignedElements();
    if (panelSlot) this._panelEls = panelSlot.assignedElements();

    if (this._tabEls.length > 0) {
      this._resolveAndApply();
    }

    this._resizeObserver?.observe(this._tablistEl);

    // Hydration完了を示すマーカー属性を付与。
    // これにより CSS がフォールバック下線からスライディングインジケーターへ切り替わる。
    this.setAttribute('hydrated', '');
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (
      changedProperties.has('selectedIndex') ||
      changedProperties.has('selectedValue')
    ) {
      this._resolveAndApply();
    }

    if (changedProperties.has('orientation')) {
      void this.updateComplete.then(() => {
        this._positionIndicator();
      });
    }
  }

  // ─────────────────────────────────────────────────
  // Private: スロット変更
  // ─────────────────────────────────────────────────

  /** タブスロットの変更ハンドラ */
  private _onTabSlotChange = (e: Event): void => {
    const slot = e.target as HTMLSlotElement;
    this._tabEls = slot.assignedElements();
    this._onSlotChange();
  };

  /** パネルスロットの変更ハンドラ */
  private _onPanelSlotChange = (e: Event): void => {
    const slot = e.target as HTMLSlotElement;
    this._panelEls = slot.assignedElements();
    this._onSlotChange();
  };

  /** スロット変更後の共通処理 */
  private _onSlotChange(): void {
    this._initialized = false; // スロット内容が変わったため再初期化
    this._resolveAndApply();
    void this.updateComplete.then(() => {
      this._positionIndicator();
      this._scrollTabIntoView(this._activeIndex);
    });
  }

  // ─────────────────────────────────────────────────
  // Private: 選択解決
  // ─────────────────────────────────────────────────

  /**
   * selected-value / selected-index の優先解決を行い、
   * 変化があれば _setActive を呼び出す。
   *
   * Resolution Rules:
   * 1. selected-value が指定されていれば、value 属性が一致するタブを探す
   * 2. 一致しない場合は selected-index を評価
   * 3. 両方が無効なら先頭タブ (index=0) を選択し、開発時に console.warn
   */
  private _resolveAndApply(): void {
    if (this._tabEls.length === 0) return;

    let resolved = -1;

    // selected-value 優先（URL連携時の安定性）
    if (this.selectedValue !== null) {
      resolved = this._tabEls.findIndex(
        (tab) => tab.getAttribute('value') === this.selectedValue,
      );
    }

    // selected-value が一致しない場合は selected-index を評価
    if (resolved === -1) {
      if (this.selectedIndex >= 0 && this.selectedIndex < this._tabEls.length) {
        resolved = this.selectedIndex;
      }
    }

    // 両方が無効 → 先頭タブを選択し、開発時に警告
    if (resolved === -1) {
      const isDev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ?? true;
      if (isDev) {
        console.warn(
          `[ui-tabs]: selected-value="${String(this.selectedValue)}" および selected-index="${String(this.selectedIndex)}" が有効なタブに一致しません。先頭タブ (index=0) を選択します。`,
          this,
        );
      }
      resolved = 0;
    }

    // 変化なし かつ 初期化済みなら更新不要（無限ループ防止）
    if (resolved === this._activeIndex && this._initialized) return;

    this._initialized = true;
    this._setActive(resolved, false);
  }

  // ─────────────────────────────────────────────────
  // Private: 状態更新
  // ─────────────────────────────────────────────────

  /**
   * アクティブなタブを設定し、ARIA・パネル・インジケーターを更新する。
   * @param index - 新しいアクティブインデックス
   * @param emitEvent - ui-tab-change カスタムイベントを発火するか
   */
  private _setActive(index: number, emitEvent = true): void {
    const prevIndex = this._activeIndex;
    this._activeIndex = index;
    this._focusedIndex = index;

    this._applyAriaAndListeners();
    this._switchPanel(index, prevIndex);

    // 公開プロパティを同期（値が変わる場合のみ更新して不要な再レンダリングを防ぐ）
    if (this.selectedIndex !== index) {
      this.selectedIndex = index;
    }
    const newValue = this._tabEls[index]?.getAttribute('value') ?? null;
    if (this.selectedValue !== newValue) {
      this.selectedValue = newValue;
    }

    void this.updateComplete.then(() => {
      this._positionIndicator();
      this._scrollTabIntoView(index);
    });

    if (emitEvent && prevIndex !== index) {
      this.dispatchEvent(
        new CustomEvent('ui-tab-change', {
          detail: {
            index,
            value: newValue,
            prevIndex,
          },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  /**
   * タブを選択する（ユーザーアクション起点）。
   * 公開メソッドとしても使用可能。
   */
  private _selectTab(index: number): void {
    if (index < 0 || index >= this._tabEls.length) return;
    this._setActive(index, true);
  }

  /**
   * Roving Tabindex でフォーカスをタブに移動する。
   * Manual Activation モードでは選択は変更しない。
   */
  private _focusTab(index: number): void {
    if (index < 0 || index >= this._tabEls.length) return;

    this._focusedIndex = index;

    // Roving Tabindex の更新: フォーカスされるタブのみ tabindex="0"
    this._tabEls.forEach((tab, i) => {
      tab.setAttribute('tabindex', i === index ? '0' : '-1');
    });

    const tabEl = this._tabEls[index] as HTMLElement | undefined;
    tabEl?.focus();
    tabEl?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    // Automatic Activation: フォーカス移動と同時に選択
    if (this.automaticActivation) {
      this._selectTab(index);
    }
  }

  // ─────────────────────────────────────────────────
  // Private: ARIA
  // ─────────────────────────────────────────────────

  /**
   * ARIA属性とクリックリスナーをタブ・パネル要素に付与する。
   * スロット変更や選択変更のたびに呼び出される。
   */
  private _applyAriaAndListeners(): void {
    const { _tabEls, _panelEls, _uid, _activeIndex, _focusedIndex } = this;

    // 既存クリックリスナーをクリーンアップしてから再設定
    this._cleanupTabListeners();

    _tabEls.forEach((tab, i) => {
      // セマンティクス
      tab.setAttribute('role', 'tab');
      tab.setAttribute('id', `ui-tabs-${String(_uid)}-tab-${String(i)}`);
      tab.setAttribute('aria-controls', `ui-tabs-${String(_uid)}-panel-${String(i)}`);

      // 状態
      tab.setAttribute('aria-selected', i === _activeIndex ? 'true' : 'false');

      // Roving Tabindex: フォーカス位置の tab のみ tabindex="0"
      tab.setAttribute('tabindex', i === _focusedIndex ? '0' : '-1');

      // クリックリスナー（イベント委譲の代わりに各タブへ直接設定）
      const handler: EventListener = () => {
        this._selectTab(i);
      };
      this._tabClickHandlers.set(tab, handler);
      tab.addEventListener('click', handler);
    });

    _panelEls.forEach((panel, i) => {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('id', `ui-tabs-${String(_uid)}-panel-${String(i)}`);
      panel.setAttribute('aria-labelledby', `ui-tabs-${String(_uid)}-tab-${String(i)}`);
      // aria-busy のデフォルト値（非同期コンテンツ時は利用側が設定）
      if (!panel.hasAttribute('aria-busy')) {
        panel.setAttribute('aria-busy', 'false');
      }
    });
  }

  /** タブ要素のクリックリスナーをクリーンアップ */
  private _cleanupTabListeners(): void {
    for (const [tab, handler] of this._tabClickHandlers) {
      tab.removeEventListener('click', handler);
    }
    this._tabClickHandlers.clear();
  }

  // ─────────────────────────────────────────────────
  // Private: パネル切り替え
  // ─────────────────────────────────────────────────

  /**
   * パネルの切り替えを行う（opacity クロスフェード）。
   *
   * フロー:
   * 1. 新パネル: `hidden` を除去 → 次フレームで `data-panel-active` を付与（フェードイン）
   * 2. 旧パネル: `data-panel-active` を除去（フェードアウト開始）
   *             → transitionend 後に `hidden` を付与
   *             → フォールバック: transitionend が発火しない場合は 200ms 後に強制 hidden
   */
  private _switchPanel(newIndex: number, oldIndex: number): void {
    const newPanel = this._panelEls[newIndex] as HTMLElement | undefined;
    const oldPanel = this._panelEls[oldIndex] as HTMLElement | undefined;

    // 非アクティブパネルを全て隠す（初期化時のクリーンアップ）
    this._panelEls.forEach((panel, i) => {
      if (i !== newIndex) {
        (panel as HTMLElement).removeAttribute('data-panel-active');
        (panel as HTMLElement).setAttribute('aria-hidden', 'true');
        (panel as HTMLElement).setAttribute('hidden', '');
      }
    });

    // 新しいパネルをフェードイン
    if (newPanel) {
      newPanel.removeAttribute('hidden');
      newPanel.removeAttribute('aria-hidden');
      // hidden 除去後のスタイル計算を待ってからフェードイン開始
      requestAnimationFrame(() => {
        newPanel.setAttribute('data-panel-active', '');
      });
    }

    // 旧パネルをフェードアウト後に非表示（新パネルと異なる場合のみ）
    if (oldPanel && oldPanel !== newPanel) {
      oldPanel.removeAttribute('data-panel-active');
      oldPanel.setAttribute('aria-hidden', 'true');

      const onTransitionEnd = () => {
        oldPanel.setAttribute('hidden', '');
        oldPanel.removeEventListener('transitionend', onTransitionEnd);
      };
      oldPanel.addEventListener('transitionend', onTransitionEnd);

      // フォールバック: トランジションが発火しない環境（prefers-reduced-motion: reduce 等）
      setTimeout(() => {
        if (!oldPanel.hasAttribute('hidden')) {
          oldPanel.setAttribute('hidden', '');
        }
      }, 250);
    }
  }

  // ─────────────────────────────────────────────────
  // Private: インジケーター
  // ─────────────────────────────────────────────────

  /**
   * スライディングインジケーターの位置を計算し適用する。
   * CSS transition がブラウザ側で補間するため、
   * style.left / style.width（または top / height）を更新するだけでよい。
   */
  private _positionIndicator(): void {
    const indicator = this._indicatorEl;
    const tablist = this._tablistEl;
    const activeTab = this._tabEls[this._activeIndex] as HTMLElement | undefined;

    if (!activeTab) return;

    const tablistRect = tablist.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();

    if (this.orientation === 'horizontal') {
      const left = tabRect.left - tablistRect.left + tablist.scrollLeft;
      indicator.style.left = `${String(left)}px`;
      indicator.style.width = `${String(tabRect.width)}px`;
      indicator.style.removeProperty('top');
      indicator.style.removeProperty('height');
    } else {
      const top = tabRect.top - tablistRect.top + tablist.scrollTop;
      indicator.style.top = `${String(top)}px`;
      indicator.style.height = `${String(tabRect.height)}px`;
      indicator.style.removeProperty('left');
      indicator.style.removeProperty('width');
    }
  }

  /**
   * 指定インデックスのタブを可視領域にスクロールする。
   * ページロード時や選択変更時に自動的に呼び出される。
   */
  private _scrollTabIntoView(index: number): void {
    const tabEl = this._tabEls[index] as HTMLElement | undefined;
    if (!tabEl) return;
    tabEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // ─────────────────────────────────────────────────
  // Private: キーボードナビゲーション
  // ─────────────────────────────────────────────────

  /**
   * キーボードナビゲーションハンドラ。
   * tablist 要素上の keydown イベントを処理する。
   * composedPath()[0] を使用して、Shadow DOM 境界を越えた
   * 実際のフォーカス要素（Light DOM のタブ）を取得する。
   */
  private _onKeyDown = (e: KeyboardEvent): void => {
    // Shadow DOM 境界を越えて実際にフォーカスされている要素を取得
    const target = e.composedPath()[0] as Element;
    const tabIndex = this._tabEls.indexOf(target);

    // タブ要素からのイベントでなければ無視
    if (tabIndex === -1) return;

    const tabCount = this._tabEls.length;
    const isHorizontal = this.orientation === 'horizontal';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

    switch (e.key) {
      case prevKey:
        e.preventDefault();
        // 先頭から前へ → 末尾へ循環
        this._focusTab((tabIndex - 1 + tabCount) % tabCount);
        break;

      case nextKey:
        e.preventDefault();
        // 末尾から次へ → 先頭へ循環
        this._focusTab((tabIndex + 1) % tabCount);
        break;

      case 'Home':
        e.preventDefault();
        this._focusTab(0);
        break;

      case 'End':
        e.preventDefault();
        this._focusTab(tabCount - 1);
        break;

      case 'Enter':
      case ' ':
        // Manual Activation: Enter/Space で選択
        e.preventDefault();
        this._selectTab(this._focusedIndex);
        break;

      default:
        break;
    }
  };

  // ─────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────

  /**
   * プログラム的にタブを選択する。
   * @param index - 選択するタブのインデックス
   */
  select(index: number): void {
    this._selectTab(index);
  }

  // ─────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────

  override render() {
    const isVertical = this.orientation === 'vertical';

    return html`
      <div class="${classMap({ root: true, 'orient-vertical': isVertical })}">
        <div class="tablist-container">
          <div
            role="tablist"
            part="tablist"
            aria-orientation="${this.orientation}"
            @keydown="${this._onKeyDown}"
          >
            <slot name="tab" @slotchange="${this._onTabSlotChange}"></slot>
          </div>
          <div class="indicator" part="indicator" aria-hidden="true"></div>
        </div>

        <div class="panels" part="panels">
          <slot name="panel" @slotchange="${this._onPanelSlotChange}"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-tabs': Tabs;
  }
}
