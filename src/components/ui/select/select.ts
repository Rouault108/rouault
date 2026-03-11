import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
    autoUpdate,
    computePosition,
    flip,
    offset,
    shift,
    size,
    type ComputePositionReturn,
} from '@floating-ui/dom';
import '../../../lib/icons';

// ============================================================
// 型定義
// ============================================================

/** セレクトの選択肢 */
export interface SelectOption {
    /** 送信値・内部値 */
    value: string | number;
    /** 表示ラベル */
    label: string;
    /** 無効化フラグ */
    disabled?: boolean;
}

// ============================================================
// セレクトボックス (Select) コンポーネント
// ============================================================

/**
 * セレクトボックス (Select) コンポーネント
 *
 * ユーザーが既定の選択肢から「値を選ぶ」ためのコンポーネントです。
 * WAI-ARIA Combobox パターンに準拠し、キーボード操作・スクリーンリーダー対応を実現します。
 *
 * @property {string} label - 入力ラベル（必須）
 * @property {boolean} hideLabel - ラベルを視覚的に非表示
 * @property {string} name - フォーム送信時のフィールド名
 * @property {string | number} modelValue - 選択された値
 * @property {string} placeholder - 未選択時に表示するテキスト
 * @property {boolean} opened - リストボックスの開閉状態
 * @property {string} helpText - 補助テキスト
 * @property {string} errorMessage - エラーメッセージ
 * @property {boolean} error - エラー状態の強制
 * @property {boolean} disabled - 操作無効化
 * @property {boolean} readonly - 読み取り専用モード
 * @property {SelectOption[]} options - 選択肢の配列
 *
 * @fires change - 選択値が変更された時（detail: { value: string | number }）
 *
 * @example
 * ```html
 * <ui-select
 *   label="都道府県"
 *   name="prefecture"
 *   placeholder="選択してください"
 * ></ui-select>
 * ```
 */
@customElement('ui-select')
export class Select extends LitElement {
    static override styles = css`
    /* ============================================================
     * Host Container
     * ============================================================ */
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 8px);
    }

    /* ============================================================
     * Label Element
     * ============================================================ */
    .label {
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      color: var(--fg-default, oklch(20% 0 0));
    }

    .label--hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }

    /* ============================================================
     * Trigger (Invoker)
     * ============================================================ */
    .trigger-wrapper {
      position: relative;
      width: 100%;
      max-width: 100%;
    }

    .trigger {
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      height: var(--control-height-md, 32px);
      padding: 0 calc(var(--space-2, 8px) + var(--icon-base, 16px) + var(--space-2, 8px)) 0 var(--space-2, 8px);

      border-radius: var(--radius-md, 6px);
      border: var(--border-width, 1px) solid transparent;

      font-family: inherit;
      font-size: var(--text-base, 14px);
      text-align: left;

      background: var(--bg-fill-muted, oklch(95% 0 0));
      color: var(--fg-default, oklch(20% 0 0));

      cursor: pointer;

      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;

      transition:
        background-color var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        outline-color var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .trigger:focus {
      outline: none;
    }

    .trigger--placeholder {
      color: var(--fg-subtle, oklch(48% 0 0));
    }

    .trigger:hover:not(:disabled):not(:focus) {
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
    }

    .trigger:focus {
      background: var(--bg-default, oklch(100% 0 0));
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
    }

    .trigger:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--radius-md, 6px);
      animation: var(--animation-focus);
    }

    .trigger--opened {
      background: var(--bg-active, oklch(93% 0 0));
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
    }

    .trigger--error {
      border-color: var(--border-danger, oklch(55% 0.2 28));
      background: var(--bg-danger-subtle, oklch(95% 0.02 28));
    }

    .trigger:disabled,
    :host([disabled]) .trigger {
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
      color: var(--fg-subtle, oklch(48% 0 0));
    }

    :host([readonly]) .trigger {
      border-color: var(--border-default, oklch(90% 0 0 / 0.12));
      background: var(--bg-fill-muted, oklch(95% 0 0));
      cursor: default;
    }

    /* ============================================================
     * ChevronDown Icon
     * ============================================================ */
    .icon-chevron {
      position: absolute;
      display: inline-grid;
      place-items: center;
      inset-inline-end: var(--space-2, 8px);
      top: 50%;
      transform: translateY(-50%);
      line-height: 1;
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      color: var(--fg-muted, oklch(48% 0 0));
      pointer-events: none;
      flex-shrink: 0;
      transition:
        transform var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        color var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Hover/Focus 時のアイコン色 */
    .trigger:hover ~ .icon-chevron,
    .trigger:focus ~ .icon-chevron {
      color: var(--fg-default, oklch(20% 0 0));
    }

    /* Opened 時のアイコン回転 */
    .icon-chevron--opened {
      transform: translateY(-50%) rotate(180deg);
      color: var(--fg-default, oklch(20% 0 0));
    }

    /* ============================================================
     * Help Text / Error Message
     * ============================================================ */
    .help-text {
      font-size: var(--text-sm, 13px);
      color: var(--fg-muted, oklch(48% 0 0));
      margin-top: var(--space-1, 4px);
      line-height: var(--line-height-normal, 1.5);
    }

    .error-message {
      font-size: var(--text-sm, 13px);
      color: var(--fg-danger, oklch(55% 0.2 28));
      margin-top: var(--space-1, 4px);
      line-height: var(--line-height-normal, 1.5);
      display: none;
    }

    .error-message--visible {
      display: block;
    }

    /* ============================================================
     * Motion Reduction
     * ============================================================ */
    @media (prefers-reduced-motion: reduce) {
      .trigger,
      .icon-chevron {
        transition-duration: 0.01ms;
      }
    }

    /* ============================================================
     * Forced Colors Mode
     * ============================================================ */
    @media (forced-colors: active) {
      .trigger {
        border: var(--border-width, 1px) solid CanvasText !important;
        background: Canvas !important;
        color: CanvasText !important;
      }

      :host([error]) .trigger {
        border-color: LinkText;
        border-width: var(--border-width-thick, 2px);
      }

      .trigger:focus-visible {
        outline: 3px solid CanvasText;
        box-shadow: none;
      }

      :host([disabled]) .trigger,
      :host([readonly]) .trigger {
        border-color: GrayText;
        opacity: 1;
      }

      .icon-chevron {
        stroke: CanvasText;
      }
    }

    /* ============================================================
     * Print Styles
     * ============================================================ */
    @media print {
      .trigger {
        background: transparent !important;
        border: var(--border-width, 1px) solid currentColor !important;
        color: var(--fg-default, oklch(20% 0 0)) !important;
      }

      .icon-chevron {
        display: none;
      }

      :host([error]) .trigger {
        border-color: var(--fg-muted, oklch(48% 0 0)) !important;
      }

      :host([disabled]) .trigger,
      :host([readonly]) .trigger {
        opacity: 0.6;
      }
    }
  `;

    // Form Association を有効化
    static formAssociated = true;

    // ============================================================
    // プロパティ定義
    // ============================================================

    /** 入力ラベル（必須） */
    @property({ type: String, reflect: true })
    label = '';

    /** ラベルを視覚的に非表示（aria-label には常に反映） */
    @property({ type: Boolean, attribute: 'hide-label', reflect: true })
    hideLabel = false;

    /** フォーム送信時のフィールド名 */
    @property({ type: String, reflect: true })
    name = '';

    /** 選択された値 */
    @property({ attribute: 'model-value', reflect: true })
    modelValue: string | number = '';

    /** 未選択時に表示するテキスト */
    @property({ type: String, reflect: true })
    placeholder = '';

    /** リストボックスの開閉状態 */
    @property({ type: Boolean, reflect: true })
    opened = false;

    /** 補助テキスト */
    @property({ type: String, attribute: 'help-text', reflect: true })
    helpText = '';

    /** エラーメッセージ */
    @property({ type: String, attribute: 'error-message', reflect: true })
    errorMessage = '';

    /** エラー状態の強制 */
    @property({ type: Boolean, reflect: true })
    error = false;

    /** 操作無効化 */
    @property({ type: Boolean, reflect: true })
    disabled = false;

    /** 読み取り専用モード */
    @property({ type: Boolean, reflect: true })
    readonly = false;

    /** 選択肢の配列 */
    @property({ type: Array })
    options: SelectOption[] = [];

    // ============================================================
    // 内部状態
    // ============================================================

    /** キーボードフォーカス中のオプションインデックス（-1 = なし） */
    @state()
    private _activeIndex = -1;

    @query('.trigger')
    private _trigger!: HTMLInputElement;

    private _internals: ElementInternals;

    /** Floating UI で生成したリストボックス要素（Portal） */
    private _listboxEl: HTMLElement | null = null;

    /** Click Outside ハンドラの参照（removeEventListener 用） */
    private _handleClickOutside: ((e: MouseEvent) => void) | null = null;

    /** Scroll Close ハンドラの参照 */
    private _handleScrollClose: ((e: Event) => void) | null = null;

    /** Type-ahead バッファ */
    private _typeaheadBuffer = '';

    /** Type-ahead タイマーID */
    private _typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

    /** autoUpdate のクリーンアップ関数 */
    private _cleanupAutoUpdate: (() => void) | null = null;

    /** Portal 用のグローバルスタイルを一度だけ注入 */
    private static _portalStylesInjected = false;

    // ============================================================
    // 一意なID生成（レンダリング毎の再生成を防止）
    // ============================================================
    private readonly _selectId = `select-${Math.random().toString(36).substring(2, 11)}`;
    private readonly _listboxId = `listbox-${Math.random().toString(36).substring(2, 11)}`;
    private readonly _errorId = `error-${Math.random().toString(36).substring(2, 11)}`;
    private readonly _helpId = `help-${Math.random().toString(36).substring(2, 11)}`;
    private readonly _labelId = `label-${Math.random().toString(36).substring(2, 11)}`;
    private readonly _triggerId = `trigger-${Math.random().toString(36).substring(2, 11)}`;

    constructor() {
        super();
        this._internals = this.attachInternals();

        // delegatesFocus: true により外部フォーカスをトリガーに転送
        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open', delegatesFocus: true });
        }
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this._ensurePortalStyles();

        if (!this.label) {
            console.error(
                '[ui-select]: label は必須です。アクセシビリティのためにラベルを提供してください。',
                this
            );
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        // クリーンアップ
        this._closeListbox();
        this._destroyListbox();
    }

    override firstUpdated(): void {
        this._internals.setFormValue(String(this.modelValue));
        this._ensurePortalStyles();
    }

    override willUpdate(changedProperties: PropertyValues): void {
        if (changedProperties.has('opened') && !this.opened) {
            this._activeIndex = -1;
        }
    }

    override updated(changedProperties: PropertyValues): void {
        super.updated(changedProperties);

        if (changedProperties.has('modelValue')) {
            this._internals.setFormValue(String(this.modelValue));
        }

        if (changedProperties.has('label') && !this.label) {
            console.error(
                '[ui-select]: label は必須です。アクセシビリティのためにラベルを提供してください。',
                this
            );
        }

        if (changedProperties.has('opened')) {
            if (this.opened) {
                this._openListbox();
            } else {
                this._closeListbox();
            }
        }

        // リストボックスが開いている場合、アクティブ項目を更新
        if (this.opened && changedProperties.has('_activeIndex')) {
            this._updateActiveDescendant();
            this._scrollActiveIntoView();
        }
    }

    // ============================================================
    // レンダリング
    // ============================================================

    override render() {
        const hasError = this.error;
        const selectedOption = this._findOption(this.modelValue);
        const displayText = selectedOption?.label ?? '';
        const isPlaceholder = !selectedOption;

        const labelClasses = {
            label: true,
            'label--hidden': this.hideLabel,
        };

        const triggerClasses = {
            trigger: true,
            'trigger--placeholder': isPlaceholder,
            'trigger--opened': this.opened,
            'trigger--error': hasError,
        };

        const chevronClasses = {
            'icon-chevron': true,
            'icon-chevron--opened': this.opened,
        };

        const errorMessageClasses = {
            'error-message': true,
            'error-message--visible': hasError && !!this.errorMessage,
        };

        // aria-describedby の決定
        // エラー時: エラーメッセージがあれば errorId、なければ空文字列（helpText は非表示）
        // 通常時: helpText があれば helpId、なければ undefined
        const describedBy = hasError
            ? (this.errorMessage ? this._errorId : '')
            : (this.helpText ? this._helpId : undefined);

        // aria-activedescendant の決定
        const activeDescendant = this.opened && this._activeIndex >= 0
            ? this._getOptionId(this._activeIndex)
            : undefined;

        return html`
      <label class="${classMap(labelClasses)}" id="${this._labelId}" for="${this._triggerId}">
        ${this.label}
      </label>

      <div class="trigger-wrapper">
        <input
          id="${this._triggerId}"
          type="text"
          readonly
          class="${classMap(triggerClasses)}"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded="${this.opened}"
          aria-controls="${this._listboxId}"
          aria-label="${this.label}"
          aria-labelledby="${this._labelId}"
          aria-invalid="${hasError}"
          aria-describedby="${ifDefined(describedBy)}"
          aria-activedescendant="${ifDefined(activeDescendant)}"
          aria-disabled="${this.disabled ? 'true' : 'false'}"
          aria-readonly="${this.readonly ? 'true' : 'false'}"
          ?disabled="${this.disabled}"
          tabindex="${this.disabled ? '-1' : '0'}"
          .value="${isPlaceholder ? '' : displayText}"
          placeholder="${isPlaceholder ? this.placeholder : ''}"
          @click="${this._handleTriggerClick}"
          @keydown="${this._handleKeyDown}"
          @focus="${this._handleFocus}"
          @blur="${this._handleBlur}"
        />

        <iconify-icon
          class="${classMap(chevronClasses)}"
          icon="lucide:chevron-down"
          aria-hidden="true"
        ></iconify-icon>
      </div>

      ${this.helpText && !hasError
                ? html`<div class="help-text" id="${this._helpId}">${this.helpText}</div>`
                : ''}

      ${this.errorMessage
                ? html`<div
            class="${classMap(errorMessageClasses)}"
            id="${this._errorId}"
            role="status"
            aria-live="polite"
          >
            ${this.errorMessage}
          </div>`
                : ''}
    `;
    }

    // ============================================================
    // イベントハンドラ
    // ============================================================

    private _handleTriggerClick = (): void => {
        if (this.disabled || this.readonly) return;
        this._toggleListbox();
    };

    private _handleFocus = (): void => {
        this.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
    };

    private _handleBlur = (): void => {
        this.dispatchEvent(new FocusEvent('blur', { bubbles: true, composed: true }));
    };

    private _handleKeyDown = (e: KeyboardEvent): void => {
        if (this.disabled || this.readonly) return;

        switch (e.key) {
            case 'Enter':
            case ' ':
            case 'Spacebar':
                e.preventDefault();
                if (!this.opened) {
                    this._openListboxAndFocusFirst();
                } else {
                    this._selectActiveOption();
                }
                break;

            case 'Escape':
                e.preventDefault();
                if (this.opened) {
                    this.opened = false;
                    this._trigger.focus();
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (!this.opened) {
                    this._openListboxAndFocusFirst();
                } else {
                    this._moveActiveIndex(1);
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (!this.opened) {
                    this._openListboxAndFocusLast();
                } else {
                    this._moveActiveIndex(-1);
                }
                break;

            case 'Home':
                e.preventDefault();
                if (this.opened) {
                    this._activeIndex = this._findFirstEnabledIndex();
                }
                break;

            case 'End':
                e.preventDefault();
                if (this.opened) {
                    this._activeIndex = this._findLastEnabledIndex();
                }
                break;

            case 'Tab':
                // Focus Trap は行わない。Tab でリストボックスを閉じる
                if (this.opened) {
                    this.opened = false;
                }
                break;

            default:
                // Type-ahead: 印字可能文字（1文字）のみ処理
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    this._handleTypeahead(e.key);
                }
                break;
        }
    };

    // ============================================================
    // リストボックス開閉制御
    // ============================================================

    private _toggleListbox(): void {
        if (this.opened) {
            this.opened = false;
        } else {
            this._openListboxAndFocusFirst();
        }
    }

    private _openListboxAndFocusFirst(): void {
        this.opened = true;
        // 現在の選択値がある場合はそのインデックスにフォーカス、なければ最初の有効項目
        const selectedIndex = this.options.findIndex(
            (opt) => opt.value === this.modelValue && !opt.disabled
        );
        this._activeIndex = selectedIndex >= 0 ? selectedIndex : this._findFirstEnabledIndex();
    }

    private _openListboxAndFocusLast(): void {
        this.opened = true;
        this._activeIndex = this._findLastEnabledIndex();
    }

    // ============================================================
    // リストボックス DOM 操作（Portal）
    // ============================================================

    private _openListbox(): void {
        this._createListbox();
        void this._positionListbox();
        this._setupAutoUpdate();
        this._attachOutsideListeners();
    }

    private _closeListbox(): void {
        this._cleanupAutoUpdatePositioning();
        this._detachOutsideListeners();
        this._destroyListbox();
        this._clearTypeahead();
    }

    private _createListbox(): void {
        if (this._listboxEl) return;

        const listbox = document.createElement('div');
        listbox.setAttribute('role', 'listbox');
        listbox.setAttribute('id', this._listboxId);
        listbox.setAttribute('aria-label', this.label);
        listbox.setAttribute('data-ui-select-listbox', '');

        // スタイル適用
        Object.assign(listbox.style, {
            position: 'fixed',
            zIndex: 'var(--z-popover, 400)',
            background: 'var(--bg-surface-2, oklch(97% 0 0))',
            border: 'var(--border-width, 1px) solid var(--border-default, oklch(90% 0 0 / 0.12))',
            borderRadius: 'var(--radius-md, 6px)',
            boxShadow: this._getListboxShadow(),
            maxWidth: '320px',
            maxHeight: 'calc(var(--control-height-md, 32px) * 7.5)',
            overflowY: 'auto',
            padding: 'calc(var(--radius-md, 6px) - var(--radius-sm, 4px))',
            // スクロールバー: 物理幅 12px、視覚的には 4px のみ
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border-default, oklch(90% 0 0 / 0.12)) transparent',
            // Enter アニメーション
            opacity: '0',
            transform: 'scale(var(--scale-enter, 0.97))',
            transformOrigin: 'top left',
            transition: [
                'opacity var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9))',
                'transform var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9))',
            ].join(', '),
        });

        // オプション項目を生成
        this.options.forEach((opt, index) => {
            const item = this._createOptionItem(opt, index);
            listbox.appendChild(item);
        });

        document.body.appendChild(listbox);
        this._listboxEl = listbox;

        // Enter アニメーション（次フレームで適用）
        requestAnimationFrame(() => {
            if (this._listboxEl) {
                this._listboxEl.style.opacity = '1';
                this._listboxEl.style.transform = 'scale(1)';
            }
        });
    }

    private _createOptionItem(opt: SelectOption, index: number): HTMLElement {
        const item = document.createElement('div');
        item.setAttribute('role', 'option');
        item.setAttribute('id', this._getOptionId(index));
        item.setAttribute('aria-selected', String(opt.value === this.modelValue));
        item.setAttribute('data-ui-select-option', '');
        item.setAttribute('data-index', String(index));

        if (opt.disabled === true) {
            item.setAttribute('aria-disabled', 'true');
        }

        // スタイル
        Object.assign(item.style, {
            display: 'flex',
            alignItems: 'center',
            height: 'var(--control-height-md, 32px)',
            paddingLeft: 'var(--space-6, 24px)',
            paddingRight: 'var(--space-3, 12px)',
            borderRadius: 'var(--radius-sm, 4px)',
            fontSize: 'var(--text-base, 14px)',
            cursor: opt.disabled === true ? 'not-allowed' : 'pointer',
            opacity: opt.disabled === true ? 'var(--opacity-disabled, 0.5)' : '1',
            color: opt.value === this.modelValue
                ? 'var(--primary, oklch(60% 0.15 250))'
                : 'var(--fg-default, oklch(20% 0 0))',
            fontWeight: opt.value === this.modelValue
                ? 'var(--font-medium, 500)'
                : 'var(--font-normal, 400)',
            background: 'transparent',
            transition: 'background-color var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9))',
            position: 'relative',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        });

        // チェックアイコン（選択済み項目）
        if (opt.value === this.modelValue) {
            const checkIcon = document.createElement('span');
            const checkGlyph = document.createElement('iconify-icon');
            checkGlyph.setAttribute('icon', 'lucide:check');
            checkGlyph.setAttribute('aria-hidden', 'true');
            checkIcon.setAttribute('aria-hidden', 'true');
            checkIcon.style.cssText = `
        position: absolute;
        left: var(--space-2, 8px);
        top: 50%;
        transform: translateY(-50%);
        width: var(--icon-base, 16px);
        height: var(--icon-base, 16px);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary, oklch(60% 0.15 250));
      `;
            Object.assign(checkGlyph.style, {
                width: '14px',
                height: '14px',
            });
            checkIcon.appendChild(checkGlyph);
            item.appendChild(checkIcon);
        }

        // テキストノード
        item.appendChild(document.createTextNode(opt.label));

        // ホバーイベント
        if (opt.disabled !== true) {
            item.addEventListener('mouseenter', () => {
                this._activeIndex = index;
                this._applyActiveStyle(item, true);
            });
            item.addEventListener('mouseleave', () => {
                this._applyActiveStyle(item, false);
            });

            // クリックで選択
            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); // blur を防ぐ
                this._selectOption(opt);
            });
        }

        return item;
    }

    private _destroyListbox(): void {
        if (this._listboxEl) {
            // Exit: 即座に消滅（duration-instant = 0ms）
            this._listboxEl.style.transition = 'none';
            this._listboxEl.style.opacity = '0';
            this._listboxEl.remove();
            this._listboxEl = null;
        }
    }

    private async _positionListbox(): Promise<void> {
        const listboxEl = this._listboxEl;
        // shadowRoot 経由で取得（@query は firstUpdated 前は null の可能性がある）
        const trigger = this.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
        if (!listboxEl || !trigger) return;

        const triggerRect = trigger.getBoundingClientRect();

        const result: ComputePositionReturn = await computePosition(
            trigger,
            listboxEl,
            {
                placement: 'bottom-start',
                middleware: [
                    offset(4),
                    flip(),
                    shift({ padding: 8 }),
                    size({
                        apply({ rects, elements }) {
                            // トリガーと同じ幅を最小幅として設定
                            Object.assign(elements.floating.style, {
                                minWidth: `${rects.reference.width.toString()}px`,
                            });
                        },
                    }),
                ],
            }
        );

        // await 後に listboxEl が破棄されている可能性があるため再チェック
        if (!this._listboxEl) return;

        Object.assign(this._listboxEl.style, {
            left: `${result.x.toString()}px`,
            top: `${result.y.toString()}px`,
            minWidth: `${triggerRect.width.toString()}px`,
        });
    }

    // ============================================================
    // アクティブ状態管理
    // ============================================================

    private _updateActiveDescendant(): void {
        if (!this._listboxEl) return;

        const items = this._listboxEl.querySelectorAll<HTMLElement>('[data-ui-select-option]');
        items.forEach((item, i) => {
            const isActive = i === this._activeIndex;
            item.setAttribute('data-active', isActive ? 'true' : 'false');
            this._applyActiveStyle(item, isActive);
        });

        // トリガーの aria-activedescendant を更新
        const activeId = this._activeIndex >= 0 ? this._getOptionId(this._activeIndex) : '';
        this._trigger.setAttribute('aria-activedescendant', activeId);
    }

    private _applyActiveStyle(item: HTMLElement, isActive: boolean): void {
        const index = parseInt(item.getAttribute('data-index') ?? '-1', 10);
        const opt = this.options[index];
        if (!opt) return;

        const isSelected = opt.value === this.modelValue;

        item.style.background = isActive
            ? 'var(--bg-surface-active, oklch(93% 0 0))'
            : 'transparent';
        item.style.color = isSelected
            ? 'var(--primary, oklch(60% 0.15 250))'
            : 'var(--fg-default, oklch(20% 0 0))';
    }

    private _scrollActiveIntoView(): void {
        if (!this._listboxEl || this._activeIndex < 0) return;

        const items = this._listboxEl.querySelectorAll<HTMLElement>('[data-ui-select-option]');
        const activeItem = items[this._activeIndex];
        activeItem?.scrollIntoView({ block: 'nearest' });
    }

    // ============================================================
    // 選択操作
    // ============================================================

    private _selectActiveOption(): void {
        if (this._activeIndex < 0) return;
        const opt = this.options[this._activeIndex];
        if (opt && opt.disabled !== true) {
            this._selectOption(opt);
        }
    }

    private _selectOption(opt: SelectOption): void {
        const prevValue = this.modelValue;
        this.modelValue = opt.value;
        this.opened = false;
        this._trigger.focus();

        if (prevValue !== opt.value) {
            this.dispatchEvent(
                new CustomEvent('change', {
                    detail: { value: opt.value },
                    bubbles: true,
                    composed: true,
                })
            );
        }
    }

    // ============================================================
    // インデックス移動
    // ============================================================

    private _moveActiveIndex(delta: number): void {
        const enabledIndices = this.options
            .map((opt, i) => ({ opt, i }))
            .filter(({ opt }) => opt.disabled !== true)
            .map(({ i }) => i);

        if (enabledIndices.length === 0) return;

        const currentPos = enabledIndices.indexOf(this._activeIndex);

        if (currentPos === -1) {
            // 現在アクティブな項目がない場合
            this._activeIndex = delta > 0
                ? (enabledIndices[0] ?? 0)
                : (enabledIndices[enabledIndices.length - 1] ?? 0);
            return;
        }

        // 循環移動
        const nextPos = (currentPos + delta + enabledIndices.length) % enabledIndices.length;
        this._activeIndex = enabledIndices[nextPos] ?? 0;
    }

    private _findFirstEnabledIndex(): number {
        return this.options.findIndex((opt) => opt.disabled !== true);
    }

    private _findLastEnabledIndex(): number {
        for (let i = this.options.length - 1; i >= 0; i--) {
            if (this.options[i]?.disabled !== true) return i;
        }
        return -1;
    }

    // ============================================================
    // Type-ahead
    // ============================================================

    private _handleTypeahead(char: string): void {
        if (!this.opened) {
            this.opened = true;
        }

        // バッファに追加
        this._typeaheadBuffer += char.toLowerCase();

        // 1秒後にバッファをリセット
        if (this._typeaheadTimer !== null) {
            clearTimeout(this._typeaheadTimer);
        }
        this._typeaheadTimer = setTimeout(() => {
            this._clearTypeahead();
        }, 1000);

        // バッファにマッチする最初の有効項目を探す
        const matchIndex = this.options.findIndex(
            (opt, i) =>
                opt.disabled !== true &&
                opt.label.toLowerCase().startsWith(this._typeaheadBuffer) &&
                i !== this._activeIndex
        );

        if (matchIndex >= 0) {
            this._activeIndex = matchIndex;
        } else {
            // 先頭から再検索（循環）
            const fallbackIndex = this.options.findIndex(
                (opt) =>
                    opt.disabled !== true &&
                    opt.label.toLowerCase().startsWith(this._typeaheadBuffer)
            );
            if (fallbackIndex >= 0) {
                this._activeIndex = fallbackIndex;
            }
        }
    }

    private _clearTypeahead(): void {
        this._typeaheadBuffer = '';
        if (this._typeaheadTimer !== null) {
            clearTimeout(this._typeaheadTimer);
            this._typeaheadTimer = null;
        }
    }

    // ============================================================
    // Click Outside / Scroll Close
    // ============================================================

    private _attachOutsideListeners(): void {
        this._handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (!this.contains(target) && !(this._listboxEl?.contains(target) ?? false)) {
                this.opened = false;
            }
        };

        this._handleScrollClose = (e: Event) => {
            const target = e.target;
            if (target instanceof Node) {
                if (this.contains(target)) return;
                if (this._listboxEl?.contains(target) ?? false) return;
            }
            this.opened = false;
        };

        const clickHandler = this._handleClickOutside;
        const scrollHandler = this._handleScrollClose;

        // 次フレームで登録（現在のクリックイベントを無視するため）
        requestAnimationFrame(() => {
            document.addEventListener('mousedown', clickHandler);
            window.addEventListener('scroll', scrollHandler, {
                capture: true,
                passive: true,
            });
        });
    }

    private _detachOutsideListeners(): void {
        if (this._handleClickOutside) {
            document.removeEventListener('mousedown', this._handleClickOutside);
            this._handleClickOutside = null;
        }
        if (this._handleScrollClose) {
            window.removeEventListener('scroll', this._handleScrollClose, { capture: true });
            this._handleScrollClose = null;
        }
    }

    // ============================================================
    // ユーティリティ
    // ============================================================

    private _getOptionId(index: number): string {
        return `${this._selectId}-option-${index.toString()}`;
    }

    private _setupAutoUpdate(): void {
        const trigger = this.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
        const listbox = this._listboxEl;
        if (!trigger || !listbox) return;
        this._cleanupAutoUpdatePositioning();
        this._cleanupAutoUpdate = autoUpdate(trigger, listbox, () => {
            void this._positionListbox();
        });
    }

    private _cleanupAutoUpdatePositioning(): void {
        if (this._cleanupAutoUpdate) {
            this._cleanupAutoUpdate();
            this._cleanupAutoUpdate = null;
        }
    }

    private _getListboxShadow(): string {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const highlight = isDark
            ? 'inset 0 1px 0 0 oklch(100% 0 0 / 0.1)'
            : 'inset 0 1px 0 0 oklch(100% 0 0 / 0.05)';
        return ['var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12))', highlight].join(', ');
    }

    private _ensurePortalStyles(): void {
        if (Select._portalStylesInjected) return;
        const style = document.createElement('style');
        style.setAttribute('data-ui-select-portal-style', '');
        style.textContent = `
      @media (forced-colors: active) {
        [data-ui-select-listbox] {
          background: Canvas !important;
          border: var(--border-width, 1px) solid CanvasText !important;
          box-shadow: none !important;
        }

        [data-ui-select-option][aria-selected="true"] {
          background: Highlight !important;
          color: HighlightText !important;
          outline: 2px solid CanvasText;
          outline-offset: -2px;
        }

        [data-ui-select-option]:hover,
        [data-ui-select-option][data-active="true"] {
          background: Highlight !important;
          color: HighlightText !important;
        }
      }

      @media print {
        [data-ui-select-listbox] {
          display: none !important;
        }
      }
    `;
        document.head.appendChild(style);
        Select._portalStylesInjected = true;
    }

    private _findOption(value: string | number): SelectOption | undefined {
        return this.options.find((opt) => opt.value === value);
    }

    // ============================================================
    // 公開 API
    // ============================================================

    /** フォーカスをトリガーに当てる */
    override focus(options?: FocusOptions): void {
        this._trigger.focus(options);
    }

    /** フォーカスを外す */
    override blur(): void {
        this._trigger.blur();
    }

    /** バリデーション状態をチェック */
    checkValidity(): boolean {
        return this._internals.checkValidity();
    }

    /** バリデーション状態をレポート */
    reportValidity(): boolean {
        return this._internals.reportValidity();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ui-select': Select;
    }
}
