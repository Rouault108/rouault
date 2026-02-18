import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, queryAssignedElements } from 'lit/decorators.js';
import {
    autoUpdate,
    computePosition,
    flip,
    offset,
    shift,
    type Placement,
} from '@floating-ui/dom';

export type DropdownAlign = 'start' | 'end' | 'center';
export type DropdownPlacement = Placement;
export type MenuItemVariant = 'default' | 'danger';

// ──────────────────────────────────────────────
// Dropdown
// ──────────────────────────────────────────────

/**
 * ドロップダウンメニュー (Dropdown Menu) コンポーネント
 *
 * 値の入力ではなく、「アクション（操作）」や「ナビゲーション」の選択肢を提示するために使用します。
 * Ephemeral UI として、必要な瞬間に現れ、用が済めば消えます。
 *
 * @slot trigger - トリガーボタンの内容（ボタン、アイコンボタン等）
 * @slot - メニュー項目のリスト（`<ui-menu-item>` 要素を配置）
 *
 * @property {boolean} opened - 開閉状態。プログラム的に制御可能。デフォルト: false
 * @property {DropdownAlign} align - トリガーに対する配置基準位置。デフォルト: 'start'
 * @property {DropdownPlacement} placement - 出現方向（Floating UI準拠）。デフォルト: 'bottom-start'
 * @property {boolean} disabled - トリガーボタンの操作無効化。デフォルト: false
 *
 * @fires menu-item-select - メニュー項目が選択された時。detail: { value: string, label: string }
 * @fires open - メニューが開いた時
 * @fires close - メニューが閉じた時
 *
 * @cssprop --bg-surface-2 - パネル背景色
 * @cssprop --border-default - パネルボーダー色
 * @cssprop --border-width - ボーダー幅
 * @cssprop --radius-md - パネル角丸 (6px)
 * @cssprop --radius-sm - メニュー項目角丸 (4px)
 * @cssprop --elevation-lg - パネルシャドウ
 * @cssprop --z-popover - パネルのz-index (400)
 * @cssprop --control-height-md - メニュー項目の高さ (32px)
 * @cssprop --space-1 - セパレータマージン (4px)
 * @cssprop --space-2 - アイコン-テキスト間隔 (8px)
 * @cssprop --space-3 - 左右パディング (12px)
 * @cssprop --text-base - メニュー項目フォントサイズ (14px)
 * @cssprop --fg-default - メニュー項目テキスト色
 * @cssprop --fg-subtle - disabled項目テキスト色
 * @cssprop --bg-surface-active - ホバー/フォーカス背景色
 * @cssprop --danger - Destructiveバリアントのテキスト色
 * @cssprop --bg-danger-subtle - Destructiveバリアントのホバー背景色
 * @cssprop --opacity-disabled - disabled状態の不透明度 (0.5)
 * @cssprop --duration-normal - 開くアニメーション時間 (150ms)
 * @cssprop --duration-instant - 閉じるアニメーション時間 (0ms)
 * @cssprop --duration-fast - メニュー項目ホバー遷移時間 (70ms)
 * @cssprop --ease-out - イージング関数
 * @cssprop --scale-enter - 開くアニメーションの初期スケール (0.97)
 * @cssprop --focus-ring-width - フォーカスリング幅
 * @cssprop --focus-ring-color - フォーカスリング色
 * @cssprop --focus-ring-offset - フォーカスリングオフセット
 * @cssprop --animation-focus - Adaptive Focusアニメーション
 * @cssprop --control-min-touch - タッチターゲット最小サイズ (44px)
 * @cssprop --border-muted - セパレータ色
 * @cssprop --icon-base - アイコンサイズ (16px)
 *
 * @example
 * ```html
 * <ui-dropdown>
 *   <ui-button slot="trigger">メニュー</ui-button>
 *   <ui-menu-item value="edit">編集</ui-menu-item>
 *   <ui-menu-item value="copy">コピー</ui-menu-item>
 *   <ui-menu-separator></ui-menu-separator>
 *   <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
 * </ui-dropdown>
 * ```
 */
@customElement('ui-dropdown')
export class Dropdown extends LitElement {
    static override styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    /* Disabled State */
    :host([disabled]) ::slotted([slot='trigger']) {
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
      pointer-events: none;
    }

    /* Panel (Menu Container) */
    .panel {
      position: fixed;
      min-width: 180px;
      max-width: 280px;
      /* Nested Geometry: R_outer(6px) - R_inner(4px) = 2px */
      padding: calc(var(--radius-md, 6px) - var(--radius-sm, 4px));
      background: var(--bg-surface-2, oklch(97% 0 0));
      border: var(--border-width, 1px) solid var(--border-default, oklch(90% 0.01 250 / 0.12));
      border-radius: var(--radius-md, 6px);
      box-shadow:
        var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12)),
        inset 0 1px 0 0 oklch(100% 0 0 / 0.05);
      z-index: var(--z-popover, 400);
      max-height: calc(var(--control-height-md, 32px) * 10);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: oklch(0% 0 0 / 0.2) transparent;

      /* Initial state: closed */
      opacity: 0;
      transform: scale(var(--scale-enter, 0.97));
      pointer-events: none;
      /* Exit: 即時 */
      transition:
        opacity var(--duration-instant, 0ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-instant, 0ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Dark Mode: より強い光の反射 */
    @media (prefers-color-scheme: dark) {
      .panel {
        box-shadow:
          var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.3)),
          inset 0 1px 0 0 oklch(100% 0 0 / 0.1);
      }
    }

    /* Panel: Opened State */
    :host([opened]) .panel {
      opacity: 1;
      transform: scale(1);
      pointer-events: auto;
      /* Enter: 通常速度 */
      transition:
        opacity var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Motion Reduction */
    @media (prefers-reduced-motion: reduce) {
      .panel,
      :host([opened]) .panel {
        transition-duration: 0.01ms;
      }
    }

    /* Forced Colors Mode */
    @media (forced-colors: active) {
      .panel {
        background: Canvas !important;
        border: var(--border-width, 1px) solid CanvasText !important;
        box-shadow: none;
      }

      :host([disabled]) ::slotted([slot='trigger']) {
        border-color: GrayText !important;
        color: GrayText !important;
        opacity: 1;
      }
    }

    /* Print Styles */
    @media print {
      .panel {
        display: none !important;
      }

      ::slotted([slot='trigger']) {
        opacity: 0.6;
      }

      :host([disabled]) ::slotted([slot='trigger']) {
        opacity: 0.4;
      }
    }
  `;

    /**
     * 開閉状態。プログラム的に制御可能。
     * @default false
     */
    @property({ type: Boolean, reflect: true })
    opened = false;

    /**
     * トリガーに対する配置基準位置
     * @type {'start' | 'end' | 'center'}
     * @default 'start'
     */
    @property({ type: String, reflect: true })
    align: DropdownAlign = 'start';

    /**
     * 出現方向（Floating UI準拠）
     * @type {Placement}
     * @default 'bottom-start'
     */
    @property({ type: String, reflect: true })
    placement: DropdownPlacement = 'bottom-start';

    /**
     * トリガーボタンの操作無効化
     * @default false
     */
    @property({ type: Boolean, reflect: true })
    disabled = false;

    @queryAssignedElements({ slot: 'trigger' })
    private _triggerElements!: HTMLElement[];

    // Floating UI の cleanup 関数
    private _floatingCleanup: (() => void) | null = null;

    // Click Outside / Scroll Close のクリーンアップ
    private _clickOutsideCleanup: (() => void) | null = null;
    private _scrollCloseCleanup: (() => void) | null = null;

    // Type-ahead バッファ
    private _typeaheadBuffer = '';
    private _typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

    // 一意なIDを生成
    private readonly _menuId = `dropdown-menu-${Math.random().toString(36).substring(2, 11)}`;
    private readonly _triggerId = `dropdown-trigger-${Math.random().toString(36).substring(2, 11)}`;

    override connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener('menu-item-click', this._handleMenuItemClick as EventListener);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener('menu-item-click', this._handleMenuItemClick as EventListener);
        this._cleanupFloating();
        this._cleanupClickOutside();
        this._cleanupScrollClose();
        if (this._typeaheadTimer !== null) {
            clearTimeout(this._typeaheadTimer);
        }
    }

    override updated(changedProperties: PropertyValues<this>): void {
        super.updated(changedProperties);

        if (changedProperties.has('opened')) {
            if (this.opened) {
                this._onOpen();
            } else {
                this._onClose();
            }
        }
    }

    // ──────────────────────────────────────────────
    // Open / Close
    // ──────────────────────────────────────────────

    private _onOpen(): void {
        this._setupFloating();
        this._setupClickOutside();
        this._setupScrollClose();
        this._updateTriggerAria(true);

        // フォーカスを最初の有効なメニュー項目へ
        requestAnimationFrame(() => {
            const items = this._getMenuItems();
            const first = items.find(item => !item.disabled);
            first?.focus();
        });
    }

    private _onClose(): void {
        this._cleanupFloating();
        this._cleanupClickOutside();
        this._cleanupScrollClose();
        this._updateTriggerAria(false);
    }

    /**
     * メニューを開く
     */
    open(): void {
        if (this.disabled || this.opened) return;
        this.opened = true;
        this.dispatchEvent(new CustomEvent('open', { bubbles: true, composed: true }));
    }

    /**
     * メニューを閉じる
     */
    close(): void {
        if (!this.opened) return;
        this.opened = false;
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    /**
     * メニューの開閉を切り替える
     */
    toggle(): void {
        if (this.opened) {
            this.close();
        } else {
            this.open();
        }
    }

    // ──────────────────────────────────────────────
    // Floating UI
    // ──────────────────────────────────────────────

    private _setupFloating(): void {
        const trigger = this._getTriggerElement();
        const panel = this.shadowRoot?.querySelector<HTMLElement>('.panel');
        if (!trigger || !panel) return;

        const update = (): void => {
            void computePosition(trigger, panel, {
                placement: this.placement,
                middleware: [offset(4), flip(), shift({ padding: 8 })],
            }).then(({ x, y }) => {
                Object.assign(panel.style, {
                    left: `${String(x)}px`,
                    top: `${String(y)}px`,
                });
            });
        };

        this._floatingCleanup = autoUpdate(trigger, panel, update);
    }

    private _cleanupFloating(): void {
        this._floatingCleanup?.();
        this._floatingCleanup = null;
    }

    // ──────────────────────────────────────────────
    // Click Outside / Scroll Close
    // ──────────────────────────────────────────────

    private _setupClickOutside(): void {
        const handler = (e: MouseEvent) => {
            const path = e.composedPath();
            if (!path.includes(this)) {
                this.close();
            }
        };
        document.addEventListener('mousedown', handler, { capture: true });
        this._clickOutsideCleanup = () => {
            document.removeEventListener('mousedown', handler, { capture: true });
        };
    }

    private _cleanupClickOutside(): void {
        this._clickOutsideCleanup?.();
        this._clickOutsideCleanup = null;
    }

    private _setupScrollClose(): void {
        const handler = () => {
            if (this.opened) this.close();
        };
        window.addEventListener('scroll', handler, { capture: true, passive: true });
        this._scrollCloseCleanup = () => {
            window.removeEventListener('scroll', handler, { capture: true });
        };
    }

    private _cleanupScrollClose(): void {
        this._scrollCloseCleanup?.();
        this._scrollCloseCleanup = null;
    }

    // ──────────────────────────────────────────────
    // ARIA
    // ──────────────────────────────────────────────

    private _updateTriggerAria(expanded: boolean): void {
        const trigger = this._getTriggerElement();
        if (!trigger) return;
        trigger.setAttribute('aria-expanded', String(expanded));
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-controls', this._menuId);
        if (!trigger.id) {
            trigger.id = this._triggerId;
        }
    }

    // ──────────────────────────────────────────────
    // Menu Items
    // ──────────────────────────────────────────────

    private _getMenuItems(): MenuItem[] {
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('.menu-slot');
        if (!slot) return [];
        return slot
            .assignedElements({ flatten: true })
            .filter((el): el is MenuItem => el instanceof MenuItem);
    }

    private _getTriggerElement(): HTMLElement | null {
        return this._triggerElements[0] ?? null;
    }

    // ──────────────────────────────────────────────
    // Keyboard Interaction
    // ──────────────────────────────────────────────

    private _handleTriggerKeyDown = (e: KeyboardEvent): void => {
        if (this.disabled) return;

        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.toggle();
                if (!this.opened) {
                    // toggle で開いた場合、フォーカスは _onOpen で処理される
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (!this.opened) {
                    this.open();
                    // フォーカスは _onOpen で処理される
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (!this.opened) {
                    this.open();
                    requestAnimationFrame(() => {
                        const items = this._getMenuItems();
                        const last = [...items].reverse().find(item => !item.disabled);
                        last?.focus();
                    });
                }
                break;
        }
    };

    private _handleMenuKeyDown = (e: KeyboardEvent): void => {
        const items = this._getMenuItems();
        const activeEl = this.shadowRoot?.activeElement ?? document.activeElement;
        // MenuItem の Shadow DOM 内の button がフォーカスを持つため、
        // host 要素（MenuItem）を特定する
        const currentItem = items.find(item => item === activeEl || item.shadowRoot?.activeElement !== null && item.contains(activeEl as Node));
        const currentIndex = currentItem ? items.indexOf(currentItem) : -1;

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.close();
                this._getTriggerElement()?.focus();
                break;

            case 'ArrowDown': {
                e.preventDefault();
                const next = this._findNextEnabled(items, currentIndex, 1);
                next?.focus();
                break;
            }

            case 'ArrowUp': {
                e.preventDefault();
                const prev = this._findNextEnabled(items, currentIndex, -1);
                prev?.focus();
                break;
            }

            case 'Home': {
                e.preventDefault();
                const first = items.find(item => !item.disabled);
                first?.focus();
                break;
            }

            case 'End': {
                e.preventDefault();
                const last = [...items].reverse().find(item => !item.disabled);
                last?.focus();
                break;
            }

            case 'Tab':
                // Focus Trap なし: Tab でメニューを閉じ、次の要素へ
                this.close();
                break;

            case 'Enter':
            case ' ': {
                e.preventDefault();
                if (currentItem && !currentItem.disabled) {
                    this._selectItem(currentItem);
                }
                break;
            }

            default:
                // Type-ahead
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    this._handleTypeahead(e.key, items);
                }
                break;
        }
    };

    private _findNextEnabled(items: MenuItem[], currentIndex: number, direction: 1 | -1): MenuItem | null {
        const len = items.length;
        if (len === 0) return null;

        let idx = currentIndex < 0 ? (direction === 1 ? -1 : len) : currentIndex;
        for (let i = 0; i < len; i++) {
            idx = ((idx + direction) + len) % len;
            const item = items[idx];
            if (item && !item.disabled) {
                return item;
            }
        }
        return null;
    }

    private _handleTypeahead(char: string, items: MenuItem[]): void {
        this._typeaheadBuffer += char.toLowerCase();

        if (this._typeaheadTimer !== null) {
            clearTimeout(this._typeaheadTimer);
        }
        this._typeaheadTimer = setTimeout(() => {
            this._typeaheadBuffer = '';
            this._typeaheadTimer = null;
        }, 1000);

        const buffer = this._typeaheadBuffer;
        const enabledItems = items.filter(item => !item.disabled);
        const match = enabledItems.find(item => {
            const label = item.textContent.trim().toLowerCase();
            return label.startsWith(buffer);
        });
        match?.focus();
    }

    private _selectItem(item: MenuItem): void {
        const value = item.value;
        const label = item.textContent.trim();
        this.dispatchEvent(
            new CustomEvent('menu-item-select', {
                bubbles: true,
                composed: true,
                detail: { value, label },
            }),
        );
        this.close();
        this._getTriggerElement()?.focus();
    }

    // MenuItem の click イベントを受け取り、menu-item-select として再発火
    private _handleMenuItemClick = (e: CustomEvent<{ value: string; label: string }>): void => {
        e.stopPropagation();
        const { value, label } = e.detail;
        this.dispatchEvent(
            new CustomEvent('menu-item-select', {
                bubbles: true,
                composed: true,
                detail: { value, label },
            }),
        );
        this.close();
        this._getTriggerElement()?.focus();
    };

    // ──────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────

    override render() {
        return html`
      <slot
        name="trigger"
        @click="${this._handleTriggerClick}"
        @keydown="${this._handleTriggerKeyDown}"
        @slotchange="${this._onTriggerSlotChange}"
      ></slot>

      <div
        class="panel"
        role="menu"
        id="${this._menuId}"
        aria-labelledby="${this._triggerId}"
        @keydown="${this._handleMenuKeyDown}"
      >
        <slot class="menu-slot"></slot>
      </div>
    `;
    }

    private _handleTriggerClick = (e: Event): void => {
        if (this.disabled) {
            e.preventDefault();
            return;
        }
        this.toggle();
    };

    private _onTriggerSlotChange = (): void => {
        const trigger = this._getTriggerElement();
        if (!trigger) return;
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', String(this.opened));
        trigger.setAttribute('aria-controls', this._menuId);
        if (!trigger.id) {
            trigger.id = this._triggerId;
        }
    };
}

// ──────────────────────────────────────────────
// MenuItem
// ──────────────────────────────────────────────

/**
 * メニュー項目 (Menu Item) コンポーネント
 *
 * `<ui-dropdown>` 内で使用するメニュー項目です。
 *
 * @slot - メニュー項目のラベルテキストまたはコンテンツ（アイコンを含む）
 *
 * @property {string} value - 選択時に `menu-item-select` イベントの detail.value として渡される値
 * @property {MenuItemVariant} variant - バリアント（'default' | 'danger'）
 * @property {boolean} disabled - 操作無効化
 *
 * @example
 * ```html
 * <ui-menu-item value="edit">編集</ui-menu-item>
 * <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
 * <ui-menu-item value="copy" disabled>コピー（無効）</ui-menu-item>
 * ```
 */
@customElement('ui-menu-item')
export class MenuItem extends LitElement {
    static override styles = css`
    :host {
      display: block;
    }

    button {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      height: var(--control-height-md, 32px);
      padding: 0 var(--space-3, 12px);
      font-size: var(--text-base, 14px);
      font-weight: var(--font-normal, 400);
      color: var(--fg-default, oklch(20% 0.01 250));
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      position: relative;
      min-height: var(--control-height-md, 32px);
      background: transparent;
      border: none;
      width: 100%;
      text-align: start;
      box-sizing: border-box;
      font-family: inherit;
      transition: background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Touch Target: Invisible Hit Area */
    button::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      min-height: var(--control-min-touch, 44px);
      z-index: 0;
    }

    button > * {
      position: relative;
      z-index: 1;
    }

    /* Hover / Focus */
    button:hover:not(:disabled),
    button:focus-visible:not(:disabled) {
      background: var(--bg-surface-active, oklch(0% 0 0 / 0.05));
    }

    /* Active */
    button:active:not(:disabled) {
      background: var(--bg-surface-active, oklch(0% 0 0 / 0.05));
    }

    /* Disabled */
    button:disabled {
      color: var(--fg-subtle, oklch(48% 0.01 250));
      cursor: default;
      pointer-events: none;
    }

    /* Destructive Variant */
    :host([variant='danger']) button {
      color: var(--danger, oklch(55% 0.2 28));
    }

    :host([variant='danger']) button:hover:not(:disabled),
    :host([variant='danger']) button:focus-visible:not(:disabled) {
      background: var(--bg-danger-subtle, oklch(from var(--danger, oklch(55% 0.2 28)) l c h / 0.1));
    }

    /* Focus Indicator: Adaptive Focus */
    button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    /* Icon */
    ::slotted(iconify-icon),
    ::slotted(svg) {
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      font-size: var(--icon-base, 16px);
      flex-shrink: 0;
    }

    /* Motion Reduction */
    @media (prefers-reduced-motion: reduce) {
      button {
        transition-duration: 0.01ms;
      }
    }

    /* Forced Colors Mode */
    @media (forced-colors: active) {
      button {
        color: CanvasText !important;
      }

      button:hover:not(:disabled),
      button:focus-visible:not(:disabled) {
        background: Highlight !important;
        color: HighlightText !important;
      }

      button:disabled {
        color: GrayText !important;
        background: transparent !important;
      }

      :host([variant='danger']) button {
        color: CanvasText !important;
        outline: 1px solid CanvasText;
        outline-offset: -1px;
      }

      :host([variant='danger']) button:hover:not(:disabled),
      :host([variant='danger']) button:focus-visible:not(:disabled) {
        background: Highlight !important;
        color: HighlightText !important;
      }

      button:focus-visible {
        outline: 3px solid CanvasText;
        box-shadow: none;
      }
    }
  `;

    /**
     * 選択時に `menu-item-select` イベントの detail.value として渡される値
     */
    @property({ type: String, reflect: true })
    value = '';

    /**
     * バリアント
     * @type {'default' | 'danger'}
     * @default 'default'
     */
    @property({ type: String, reflect: true })
    variant: MenuItemVariant = 'default';

    /**
     * 操作無効化
     * @default false
     */
    @property({ type: Boolean, reflect: true })
    disabled = false;

    override render() {
        return html`
      <button
        role="menuitem"
        tabindex="-1"
        ?disabled="${this.disabled}"
        aria-disabled="${this.disabled ? 'true' : nothing}"
        @click="${this._handleClick}"
      >
        <slot></slot>
      </button>
    `;
    }

    private _handleClick = (e: Event): void => {
        if (this.disabled) {
            e.preventDefault();
            return;
        }
        this.dispatchEvent(
            new CustomEvent('menu-item-click', {
                bubbles: true,
                composed: true,
                detail: {
                    value: this.value,
                    label: this.textContent.trim(),
                },
            }),
        );
    };

    /**
     * メニュー項目にフォーカスを当てる（Roving Tabindex 管理用）
     */
    override focus(options?: FocusOptions): void {
        const button = this.shadowRoot?.querySelector('button');
        button?.focus(options);
    }
}

// ──────────────────────────────────────────────
// MenuSeparator
// ──────────────────────────────────────────────

/**
 * メニューセパレータ (Menu Separator) コンポーネント
 *
 * `<ui-dropdown>` 内でメニュー項目を視覚的に区切るために使用します。
 *
 * @example
 * ```html
 * <ui-menu-separator></ui-menu-separator>
 * ```
 */
@customElement('ui-menu-separator')
export class MenuSeparator extends LitElement {
    static override styles = css`
    :host {
      display: block;
    }

    .separator {
      height: 1px;
      margin: var(--space-1, 4px) 0;
      background: var(--border-muted, oklch(90% 0.01 250 / 0.08));
    }

    @media (forced-colors: active) {
      .separator {
        background: CanvasText !important;
      }
    }
  `;

    override render() {
        return html`<div class="separator" role="separator"></div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ui-dropdown': Dropdown;
        'ui-menu-item': MenuItem;
        'ui-menu-separator': MenuSeparator;
    }
}
