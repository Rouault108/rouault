import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

type TreeItemDensity = 'normal' | 'compact';

/**
 * ツリーアイテム (Tree Item) コンポーネント
 *
 * 階層化された情報を探索するためのナビゲーション・コンポーネントです。
 * ネスト構造（Recursive Nesting）により、DOM構造と視覚階層を一致させ、
 * 堅牢なアクセシビリティを担保します。
 *
 * @slot children - 子ツリーアイテム（ネスト構造）
 * @slot icon - カスタムアイコン（icon プロパティの代わりに使用可能）
 *
 * @property {boolean} expanded - 子要素の展開状態
 * @property {boolean} selected - 現在選択されているか（カレント）
 * @property {string} label - 表示ラベル
 * @property {string} icon - コンテンツアイコン（例: "lucide:folder", "lucide:file"）
 * @property {string} density - 行の高さ密度（normal: 32px, compact: 24px）
 *
 * @fires expanded-change - 展開状態が変化した時
 * @fires selected-change - 選択状態が変化した時
 *
 * @cssprop --control-height-md - Normal密度の高さ (32px)
 * @cssprop --control-height-sm - Compact密度の高さ (24px)
 * @cssprop --control-min-touch - 最低タッチターゲットサイズ (44px)
 * @cssprop --space-4 - パディング (16px)
 * @cssprop --space-2 - 内部スペーシング (8px)
 * @cssprop --bg-hover - ホバー時の背景色
 * @cssprop --bg-surface-active - 選択時の背景色
 * @cssprop --fg-muted - デフォルトテキスト色
 * @cssprop --fg-default - ホバー時のテキスト色
 * @cssprop --primary - 選択時のテキスト色
 * @cssprop --font-medium - 選択時のフォントウェイト (500)
 * @cssprop --border-ghost - インデントガイドのデフォルト色
 * @cssprop --border-width - ボーダー幅
 * @cssprop --duration-slow - 展開/収縮アニメーション時間 (200ms)
 * @cssprop --duration-fast - 色遷移時間 (70ms)
 * @cssprop --ease-out - イージング関数
 * @cssprop --focus-ring-width - フォーカスリング幅
 * @cssprop --focus-ring-color - フォーカスリング色
 * @cssprop --focus-ring-offset - フォーカスリングオフセット
 * @cssprop --focus-ring-radius - フォーカスリング角丸
 * @cssprop --animation-focus - Adaptive Focusアニメーション
 *
 * @example
 * ```html
 * <!-- 単独アイテム -->
 * <ui-tree-item label="ファイル.txt" icon="lucide:file"></ui-tree-item>
 *
 * <!-- ネスト構造 -->
 * <ui-tree-item label="フォルダ" icon="lucide:folder" expanded>
 *   <ui-tree-item slot="children" label="サブファイル.txt" icon="lucide:file"></ui-tree-item>
 * </ui-tree-item>
 *
 * <!-- Compact密度 -->
 * <ui-tree-item label="アイテム" density="compact"></ui-tree-item>
 * ```
 */
@customElement('ui-tree-item')
export class TreeItem extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
    }

    /* ── アイテム行 ── */
    .item {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      padding-left: var(--space-4, 16px);
      padding-right: var(--space-4, 16px);
      cursor: pointer;
      user-select: none;
      color: var(--fg-muted, oklch(48% 0.01 250));

      /* Transition: 色のみ高速遷移 */
      transition:
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Full Width Hover: 背景を親コンテナ幅いっぱいに */
    .item::before {
      content: '';
      position: absolute;
      left: calc(-1 * var(--space-4, 16px));
      right: calc(-1 * var(--space-4, 16px));
      top: 0;
      bottom: 0;
      background: transparent;
      z-index: -1;
      transition: background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Normal Density */
    .density-normal .item {
      height: var(--control-height-md, 32px);
    }

    /* Compact Density */
    .density-compact .item {
      height: var(--control-height-sm, 24px);
    }

    /* Hover */
    .item:hover::before {
      background: var(--bg-hover, oklch(0% 0 0 / 0.05));
    }

    .item:hover {
      color: var(--fg-default, oklch(20% 0.01 250));
    }

    /* Selected */
    :host([selected]) .item::before {
      background: var(--bg-surface-active, oklch(from var(--primary, oklch(60% 0.15 250)) l c h / 0.1));
    }

    :host([selected]) .item {
      color: var(--primary, oklch(60% 0.15 250));
      font-weight: var(--font-medium, 500);
    }

    /* Focus Indicator */
    .item:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--focus-ring-radius, 4px);
      animation: var(--animation-focus);
    }

    /* ── 展開アイコン (ChevronRight) ── */
    .expand-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(0deg);
      transition: transform var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* 展開時: 90度回転 */
    :host([expanded]) .expand-icon {
      transform: rotate(90deg);
    }

    /* 子要素がない場合は展開アイコンを非表示（スペースは維持） */
    .expand-icon.hidden {
      visibility: hidden;
    }

    .expand-icon iconify-icon {
      font-size: 16px;
      display: block;
    }

    /* ── コンテンツアイコン ── */
    .content-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .content-icon iconify-icon,
    .content-icon::slotted(*) {
      font-size: 16px;
      display: block;
    }

    /* ── ラベル ── */
    .label {
      flex: 1;
      font-size: var(--text-base, 14px);
      line-height: 1.5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .label-link {
      color: inherit;
      text-decoration: none;
      display: inline-block;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .overflow-tooltip {
      position: absolute;
      left: 0;
      top: calc(100% + 4px);
      max-width: min(420px, 90vw);
      padding: 6px 8px;
      border: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
      border-radius: var(--radius-sm, 4px);
      background: var(--bg-surface-2, oklch(98% 0 0));
      color: var(--fg-default, oklch(20% 0.01 250));
      font-size: var(--text-sm, 13px);
      line-height: 1.4;
      z-index: 3;
      opacity: 0;
      pointer-events: none;
      transform: translateY(2px);
      transition:
        opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .item:hover .overflow-tooltip,
    .item:focus-visible .overflow-tooltip {
      opacity: 1;
      transform: translateY(0);
    }

    /* ── 子要素コンテナ (role="group") ── */
    .children {
      position: relative;
      /* インデントガイド: 左端にボーダー */
      border-left: var(--border-width, 1px) solid var(--border-ghost, oklch(0% 0 0 / 0.04));
      margin-left: var(--space-4, 16px);
      transition: border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));

      /* 展開アニメーション */
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transition:
        max-height var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        opacity var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host([expanded]) .children {
      max-height: 10000px; /* 実用的に十分な高さ */
      opacity: 1;
    }

    /* Active Context: 選択中のアイテムを含むパス上のボーダーを強化 */
    :host([selected]) .children,
    :host(:has([selected])) > .children {
      border-left-color: var(--fg-muted, oklch(48% 0.01 250));
    }

    /* ── Compact密度のタッチターゲット拡張 ── */
    /* 視覚サイズは24px、物理ヒットエリアは44pxに拡張 */
    .density-compact .item::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      min-height: var(--control-min-touch, 44px);
      pointer-events: auto;
    }

    /* コンテンツを前面に配置（タッチターゲット拡張がテキストを覆わないように） */
    .expand-icon,
    .content-icon,
    .label {
      position: relative;
      z-index: 1;
    }

    /* ── Motion Reduction ── */
    @media (prefers-reduced-motion: reduce) {
      .expand-icon,
      .item::before,
      .children,
      .item {
        transition-duration: 0.01ms;
      }
    }

    /* ── Forced Colors Mode ── */
    @media (forced-colors: active) {
      .children {
        border-left-color: CanvasText;
      }

      :host([selected]) .item {
        background-color: Highlight;
        color: HighlightText;
        outline: var(--border-width-thick, 2px) solid CanvasText;
        outline-offset: -1px;
        forced-color-adjust: none;
      }

      :host([selected]) .item::before {
        background: Highlight;
      }

      .overflow-tooltip {
        background: Canvas;
        color: CanvasText;
        border-color: CanvasText;
      }
    }

    @media print {
      :host([print-mode]) .expand-icon {
        display: none;
      }

      :host([print-mode]) .children {
        max-height: none !important;
        opacity: 1 !important;
        overflow: visible !important;
      }
    }
  `;

  /**
   * 子要素の展開状態
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  expanded = false;

  /**
   * 現在選択されているか（カレント）
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  selected = false;

  /**
   * 表示ラベル
   */
  @property({ type: String, reflect: true })
  label = '';

  /**
   * コンテンツアイコン（lucide アイコン名）
   * 例: "lucide:folder", "lucide:file"
   */
  @property({ type: String, reflect: true })
  icon?: string;

  /**
   * リンク先URL
   */
  @property({ type: String, reflect: true })
  href?: string;

  /**
   * 行の高さ密度
   * - normal: 32px (--control-height-md)
   * - compact: 24px (--control-height-sm)
   * @default 'normal'
   */
  @property({ type: String, reflect: true })
  density: TreeItemDensity = 'normal';

  /**
   * 印刷時の全展開モード
   * @internal
   */
  @property({ type: Boolean, reflect: true, attribute: 'print-mode' })
  printMode = false;

  /**
   * 子要素が存在するか（内部状態）
   * @internal
   */
  @state()
  private hasChildren = false;

  /**
   * ラベルが省略表示されているか
   * @internal
   */
  @state()
  private isLabelTruncated = false;

  private readonly _slotChangeHandler = () => {
    const slot = this.shadowRoot?.querySelector('slot[name="children"]') as HTMLSlotElement | null;
    this.hasChildren = (slot?.assignedElements().length ?? 0) > 0;
  };

  private readonly _hostFocusHandler = (e: FocusEvent) => {
    if (e.target === this) {
      this.focus();
    }
  };

  private readonly _windowResizeHandler = () => {
    this._syncLabelTruncation();
  };

  private _computeAriaLevel(): number {
    let level = 1;
    let parent = this.parentElement;

    while (parent) {
      if (parent.tagName.toLowerCase() === 'ui-tree-item') {
        level += 1;
      }
      parent = parent.parentElement;
    }

    return level;
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'tabindex' && oldValue !== newValue) {
      this.requestUpdate();
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // role="treeitem" を設定
    this.setAttribute('role', 'treeitem');
    this.addEventListener('focus', this._hostFocusHandler);
    window.addEventListener('resize', this._windowResizeHandler);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('focus', this._hostFocusHandler);
    window.removeEventListener('resize', this._windowResizeHandler);
    super.disconnectedCallback();
  }

  override updated(): void {
    // aria-expanded: 子要素がある場合のみ付与
    if (this.hasChildren) {
      this.setAttribute('aria-expanded', String(this.expanded));
    } else {
      this.removeAttribute('aria-expanded');
    }

    // aria-selected: 選択状態と同期
    this.setAttribute('aria-selected', String(this.selected));
    this.setAttribute('aria-level', String(this._computeAriaLevel()));
    this._syncLabelTruncation();
  }

  /**
   * キーボード操作ハンドラ
   */
  private _handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this._handleSelect(true);
        break;

      case ' ':
        // 選択/アクション実行
        e.preventDefault();
        this._handleSelect(false);
        break;

      case 'ArrowRight':
        // 展開（展開済みの場合は最初の子へ移動 - file-treeで管理）
        e.preventDefault();
        if (this.hasChildren && !this.expanded) {
          this._toggleExpanded();
        } else {
          // 既に展開済みの場合は、file-treeが子へのフォーカス移動を処理
          this.dispatchEvent(
            new CustomEvent('tree-item-arrow-right', {
              bubbles: true,
              composed: true,
            }),
          );
        }
        break;

      case 'ArrowLeft':
        // 収縮（収縮済みの場合は親へ移動 - file-treeで管理）
        e.preventDefault();
        if (this.hasChildren && this.expanded) {
          this._toggleExpanded();
        } else {
          // 既に収縮済みの場合は、file-treeが親へのフォーカス移動を処理
          this.dispatchEvent(
            new CustomEvent('tree-item-arrow-left', {
              bubbles: true,
              composed: true,
            }),
          );
        }
        break;

      // その他のキー操作（Up/Down/Home/End/Esc/Type-ahead）は
      // file-treeコンテナ側で Event Delegation により管理される
    }
  };

  /**
   * クリックハンドラ
   */
  private _handleClick = (): void => {
    this._handleSelect(true);
  };

  /**
   * 展開アイコンクリックハンドラ
   */
  private _handleExpandIconClick = (e: MouseEvent): void => {
    e.stopPropagation(); // itemのクリックイベントを阻止
    this._toggleExpanded();
  };

  /**
   * 選択処理
   */
  private _handleSelect(allowNavigate = false): void {
    this.selected = true;
    this.dispatchEvent(
      new CustomEvent('selected-change', {
        detail: { selected: this.selected },
        bubbles: true,
        composed: true,
      }),
    );

    if (allowNavigate && this.href) {
      window.location.assign(this.href);
    }
  }

  /**
   * 展開/収縮のトグル
   */
  private _toggleExpanded(): void {
    if (!this.hasChildren) return;

    this.expanded = !this.expanded;
    this.dispatchEvent(
      new CustomEvent('expanded-change', {
        detail: { expanded: this.expanded },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * プログラム的にフォーカスを当てる
   */
  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLElement>('.item')?.focus(options);
  }

  override render() {
    const classes = {
      [`density-${this.density}`]: true,
    };

    return html`
      <div class="${classMap(classes)}">
        <!-- アイテム行 -->
        <div
          class="item"
          tabindex="${this.getAttribute('tabindex') ?? '0'}"
          @click="${this._handleClick}"
          @keydown="${this._handleKeyDown}"
        >
          <!-- 展開アイコン（左端配置） -->
          <span
            class="expand-icon ${this.hasChildren ? '' : 'hidden'}"
            @click="${this._handleExpandIconClick}"
            aria-hidden="true"
          >
            <iconify-icon icon="lucide:chevron-right"></iconify-icon>
          </span>

          <!-- コンテンツアイコン -->
          ${this.icon
            ? html`
                <span class="content-icon" aria-hidden="true">
                  <iconify-icon icon="${this.icon}"></iconify-icon>
                </span>
              `
            : html`<slot name="icon" class="content-icon"></slot>`}

          <!-- ラベル -->
          <span class="label">
            ${this.href
              ? html`<a class="label-link" href="${this.href}" @click="${(e: MouseEvent) => { e.stopPropagation(); }}">${this.label}</a>`
              : this.label}
          </span>
          ${this.isLabelTruncated ? html`<span class="overflow-tooltip" role="tooltip">${this.label}</span>` : nothing}
        </div>

        <!-- 子要素 (role="group") -->
        ${this.hasChildren
          ? html`
              <div class="children" role="group" aria-hidden="${String(!this.expanded)}" ?inert="${!this.expanded}">
                <slot name="children" @slotchange="${this._slotChangeHandler}"></slot>
              </div>
            `
          : html`<slot name="children" @slotchange="${this._slotChangeHandler}" style="display: none;"></slot>`}
      </div>
    `;
  }

  private _syncLabelTruncation(): void {
    const label = this.shadowRoot?.querySelector<HTMLElement>('.label');
    if (!label) return;
    this.isLabelTruncated = label.scrollWidth > label.clientWidth;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-tree-item': TreeItem;
  }
}
