import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * ラジオボタン (Radio) コンポーネント
 *
 * 同一グループ（`name` 属性）内で排他的な選択を提供します。
 * Form-Associated Custom Element として、標準フォームとシームレスに統合します。
 *
 * ## グループ化とキーボード操作
 *
 * - 同一 `name` を持つ `<ui-radio>` 要素は自動的にグループとして扱われます。
 * - **Roving Tabindex**: 選択中のラジオのみ `tabindex="0"`、他は `tabindex="-1"`。
 * - **Arrow Keys**: グループ内を循環移動し、即座に選択状態を変更します。
 * - **Circular Navigation**: 最後から最初へ（または逆方向へ）循環します。
 *
 * @property {boolean} checked  - 選択状態
 * @property {string}  name     - フォーム送信時の識別子。グループ化にも使用。
 * @property {string}  value    - フォーム送信時の値（デフォルト: "on"）
 * @property {string}  label    - ラベルテキスト
 * @property {boolean} disabled - 無効化
 * @property {boolean} invalid  - バリデーションエラー状態
 * @property {string}  errorMessage - エラーメッセージ
 *
 * @fires change - ユーザー操作によって選択状態が変化した後に発火
 * @fires input  - change と同タイミングで発火（リアルタイム監視用）
 *
 * @cssprop --primary           - 選択時のボーダー色
 * @cssprop --bg-default        - 選択時の中心穴の背景色
 * @cssprop --bg-fill-muted     - 未選択時の背景色
 * @cssprop --border-muted      - 未選択時のボーダー色
 * @cssprop --border-default    - ホバー時のボーダー色
 * @cssprop --border-danger     - エラー時のボーダー色
 * @cssprop --border-width      - ボーダー幅
 * @cssprop --fg-default        - ラベルテキスト色
 * @cssprop --fg-danger         - エラーメッセージ色
 * @cssprop --opacity-disabled  - 無効時の不透明度 (0.5)
 * @cssprop --scale-pressed     - 押下時のスケール (0.96)
 * @cssprop --duration-fast     - アニメーション時間 (70ms)
 * @cssprop --ease-out          - イージング関数
 * @cssprop --focus-ring-width  - フォーカスリング幅
 * @cssprop --focus-ring-color  - フォーカスリング色
 * @cssprop --focus-ring-offset - フォーカスリングオフセット
 * @cssprop --animation-focus   - Adaptive Focus アニメーション
 * @cssprop --control-min-touch - 最低タッチターゲットサイズ (24px)
 * @cssprop --text-base         - 標準フォントサイズ (14px)
 * @cssprop --text-sm           - 小フォントサイズ (13px)
 * @cssprop --space-2           - スペーシング (8px)
 * @cssprop --line-height-normal - 標準行間 (1.5)
 *
 * @csspart control - ラジオボタンのコントロール要素（スタイリング用）
 * @csspart label   - ラベルテキスト要素
 *
 * @example
 * ```html
 * <!-- 基本的なグループ -->
 * <ui-radio name="color" value="red"   label="赤"></ui-radio>
 * <ui-radio name="color" value="green" label="緑" checked></ui-radio>
 * <ui-radio name="color" value="blue"  label="青"></ui-radio>
 *
 * <!-- 無効 -->
 * <ui-radio name="size" value="xl" label="XL（在庫なし）" disabled></ui-radio>
 * ```
 */
@customElement('ui-radio')
export class Radio extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      flex-direction: column;
      gap: var(--space-1, 4px);
    }

    /* ── ラベル行 ── */
    .wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      cursor: pointer;
      position: relative;
      user-select: none;
    }

    /* Disabled: ラベル行全体を薄く */
    :host([disabled]) .wrapper {
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
    }

    /* ── コントロール（見た目のラジオボタン） ── */
    .control {
      position: relative;
      flex-shrink: 0;
      box-sizing: border-box;
      width: 16px;
      height: 16px;
      border-radius: var(--radius-full, 9999px);
      /*
       * Ring Style (Checked):
       *   border: 4px solid var(--primary) → 中心に 8px の穴が残る
       *   background: var(--bg-default)    → 穴の色 = ページ背景
       *
       * Unchecked:
       *   border: 1px solid var(--border-muted)
       *   background: var(--bg-fill-muted)
       */
      border: var(--border-width, 1px) solid var(--border-muted, oklch(80% 0 0 / 0.4));
      background: var(--bg-fill-muted, oklch(95% 0 0));
    }

    /* Touch Target: ::before で最低 44×44px を確保 */
    .control::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width: var(--control-min-touch, 24px);
      min-height: var(--control-min-touch, 24px);
      pointer-events: none;
    }

    /* Hover */
    .wrapper:hover:not([aria-disabled='true']) .control {
      border-color: var(--border-default, oklch(70% 0 0 / 0.6));
    }

    :host([checked]) .wrapper:hover .control {
      border-color: var(--primary, oklch(60% 0.15 250));
      background: var(--bg-default, oklch(100% 0 0));
    }

    /* Active: タクタイルフィードバック */
    .wrapper:active:not([aria-disabled='true']) .control {
      transform: scale(var(--scale-pressed, 0.96));
    }

    /* Checked: Ring Style（ドーナツ型） */
    :host([checked]) .control {
      border: 4px solid var(--primary, oklch(60% 0.15 250));
      background: var(--bg-default, oklch(100% 0 0));
    }

    /* Error State */
    :host([invalid]) .control {
      border-color: var(--border-danger, oklch(55% 0.2 28));
    }

    /* ── フォーカスリング ── */
    .control:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    :host([invalid]) .control:focus-visible {
      outline-color: var(--border-danger, oklch(55% 0.2 28));
    }

    /* ── ラベルテキスト ── */
    .label {
      font-size: var(--text-base, 14px);
      color: var(--fg-default, oklch(20% 0 0));
      line-height: var(--line-height-normal, 1.5);
    }

    /* ── エラーメッセージ ── */
    .error-message {
      font-size: var(--text-sm, 13px);
      color: var(--fg-danger, oklch(55% 0.2 28));
      line-height: var(--line-height-normal, 1.5);
    }

    /* ── Reduced Motion ── */
    @media (prefers-reduced-motion: reduce) {
      .control {
        transition-duration: 0.01ms;
      }
    }

    /* ── Forced Colors Mode ── */
    @media (forced-colors: active) {
      .control {
        border: 2px solid CanvasText;
        background: Canvas;
      }

      :host([checked]) .control {
        background: Highlight;
        border-color: CanvasText;
      }

      .control:focus-visible {
        outline: 3px solid CanvasText;
        box-shadow: none;
      }
    }
  `;

  // Form Association を有効化
  static formAssociated = true;

  /**
   * 選択状態
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  checked = false;

  /**
   * フォーム送信時の識別子。同一 `name` でグループを形成します。
   */
  @property({ type: String, reflect: true })
  name = '';

  /**
   * フォーム送信時の値
   * @default 'on'
   */
  @property({ type: String, reflect: true })
  value = 'on';

  /**
   * ラベルテキスト
   */
  @property({ type: String, reflect: true })
  label = '';

  /**
   * 無効化
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * バリデーションエラー状態（外部から設定）
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  invalid = false;

  /**
   * エラーメッセージ
   */
  @property({ type: String, attribute: 'error-message', reflect: true })
  errorMessage = '';

  private _internals: ElementInternals;

  // 一意な ID（レンダリング毎の再生成を防止）
  private readonly _controlId = `radio-${Math.random().toString(36).substring(2, 11)}`;
  private readonly _labelId = `radio-label-${Math.random().toString(36).substring(2, 11)}`;
  private readonly _errorId = `radio-error-${Math.random().toString(36).substring(2, 11)}`;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._syncFormValue();
    this._syncValidity();
    // Roving Tabindex の初期化
    this._updateTabindex();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._notifyGroupTabindexUpdate();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (
      changedProperties.has('checked') ||
      changedProperties.has('disabled') ||
      changedProperties.has('name') ||
      changedProperties.has('value')
    ) {
      this._syncFormValue();
    }

    if (
      changedProperties.has('checked') ||
      changedProperties.has('invalid') ||
      changedProperties.has('errorMessage')
    ) {
      this._syncValidity();
    }

    // Roving Tabindex の更新
    if (
      changedProperties.has('checked') ||
      changedProperties.has('disabled') ||
      changedProperties.has('name')
    ) {
      this._updateTabindex();
      this._notifyGroupTabindexUpdate();
    }

    // ARIA 属性を Control 要素に反映
    const control = this.shadowRoot?.querySelector<HTMLElement>('.control');
    if (control) {
      control.setAttribute('aria-checked', String(this.checked));
      if (this.disabled) {
        control.setAttribute('aria-disabled', 'true');
      } else {
        control.removeAttribute('aria-disabled');
      }
      const showError = this.invalid && !!this.errorMessage;
      const externalLabel = this.getAttribute('aria-label');
      const externalLabelledBy = this.getAttribute('aria-labelledby');
      const externalDescribedBy = this.getAttribute('aria-describedby');
      const describedByIds: string[] = [];
      if (externalDescribedBy) describedByIds.push(externalDescribedBy);
      if (showError) describedByIds.push(this._errorId);
      const describedBy = describedByIds.join(' ');

      if (this.label) {
        control.setAttribute('aria-labelledby', this._labelId);
      } else if (externalLabelledBy) {
        control.setAttribute('aria-labelledby', externalLabelledBy);
      } else {
        control.removeAttribute('aria-labelledby');
      }

      if (externalLabel) {
        control.setAttribute('aria-label', externalLabel);
      } else {
        control.removeAttribute('aria-label');
      }

      if (showError) {
        control.setAttribute('aria-invalid', 'true');
      } else {
        control.removeAttribute('aria-invalid');
      }

      if (describedBy.length > 0) {
        control.setAttribute('aria-describedby', describedBy);
      } else {
        control.removeAttribute('aria-describedby');
      }
    }
  }

  /** フォーム値を ElementInternals に同期 */
  private _syncFormValue(): void {
    if (this.checked && !this.disabled && this.name) {
      this._internals.setFormValue(this.value);
    } else {
      this._internals.setFormValue(null);
    }
  }

  /** バリデーション状態を ElementInternals に同期 */
  private _syncValidity(): void {
    if (this.invalid && this.errorMessage) {
      this._internals.setValidity({ customError: true }, this.errorMessage);
      return;
    }
    this._internals.setValidity({});
  }

  /**
   * Roving Tabindex の更新。
   * - グループ内に checked なラジオがある場合: checked のみ tabindex="0"
   * - グループ内に checked なラジオがない場合: 最初の非 disabled ラジオが tabindex="0"
   */
  private _updateTabindex(): void {
    const group = this._getGroupMembers();
    if (group.length === 0) return;

    const checkedMember = group.find((r) => r.checked && !r.disabled);
    if (checkedMember) {
      // checked なラジオのみ tabindex="0"
      group.forEach((r) => {
        const ctrl = r.shadowRoot?.querySelector<HTMLElement>('.control');
        if (ctrl) {
          ctrl.setAttribute('tabindex', r === checkedMember ? '0' : '-1');
        }
      });
    } else {
      // checked がない場合: 最初の非 disabled ラジオが tabindex="0"
      const firstEnabled = group.find((r) => !r.disabled);
      group.forEach((r) => {
        const ctrl = r.shadowRoot?.querySelector<HTMLElement>('.control');
        if (ctrl) {
          ctrl.setAttribute('tabindex', r === firstEnabled ? '0' : '-1');
        }
      });
    }
  }

  /** 同一グループの roving tabindex を再同期 */
  private _notifyGroupTabindexUpdate(): void {
    const group = this._getGroupMembers();
    group.forEach((radio) => {
      radio._updateTabindex();
    });
  }

  /**
   * 同一 `name` を持つグループメンバーを取得（DOM順）
   */
  private _getGroupMembers(): Radio[] {
    if (!this.name) return [this];
    // フォームが存在する場合はフォーム内を、なければ document 全体を検索
    const root = this.closest('form') ?? (this.getRootNode() as Document | ShadowRoot);
    const all = root.querySelectorAll<Radio>(`ui-radio[name="${CSS.escape(this.name)}"]`);
    return [...all];
  }

  /**
   * このラジオを選択し、同一グループの他のラジオを未選択にします。
   * `change` / `input` イベントを発火します。
   */
  private _select(): void {
    if (this.disabled || this.checked) return;

    // グループ内の他のラジオを未選択に
    const group = this._getGroupMembers();
    group.forEach((r) => {
      if (r !== this && r.checked) {
        r.checked = false;
        void r.updateComplete;
      }
    });

    this.checked = true;
    this._syncFormValue();
    this._syncValidity();
    this._updateTabindex();

    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  /** クリックによる選択 */
  private _handleClick = (): void => {
    this._select();
  };

  /** ラベルクリックで選択（span は labelable ではないため手動連携） */
  private _handleLabelClick = (e: MouseEvent): void => {
    e.preventDefault();
    this.focus();
    this._select();
  };

  /** ラベルのキーボード操作: Enter で選択（ESLint: click-events-have-key-events 対応） */
  private _handleLabelKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._select();
    }
  };

  /**
   * キーボード操作:
   * - Arrow Keys: グループ内を循環移動・即時選択
   * - Space: 現在のラジオを選択（未選択の場合）
   */
  private _handleKeyDown = (e: KeyboardEvent): void => {
    const group = this._getGroupMembers().filter((r) => !r.disabled);
    if (group.length === 0) return;

    const currentIndex = group.indexOf(this);

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % group.length;
        const next = group[nextIndex];
        if (next) {
          next._select();
          next.focus();
        }
        break;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + group.length) % group.length;
        const prev = group[prevIndex];
        if (prev) {
          prev._select();
          prev.focus();
        }
        break;
      }
      case ' ': {
        e.preventDefault();
        this._select();
        break;
      }
      default:
        break;
    }
  };

  /**
   * バリデーション状態をチェック
   */
  checkValidity(): boolean {
    return this._internals.checkValidity();
  }

  /**
   * バリデーション状態をレポート
   */
  reportValidity(): boolean {
    return this._internals.reportValidity();
  }

  /**
   * コントロールにフォーカスを当てる
   */
  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLElement>('.control')?.focus(options);
  }

  /**
   * コントロールからフォーカスを外す
   */
  override blur(): void {
    this.shadowRoot?.querySelector<HTMLElement>('.control')?.blur();
  }

  override render() {
    const showError = this.invalid && !!this.errorMessage;
    const externalLabel = this.getAttribute('aria-label');
    const externalLabelledBy = this.getAttribute('aria-labelledby');
    const externalDescribedBy = this.getAttribute('aria-describedby');
    const ariaDescribedByIds: string[] = [];
    if (externalDescribedBy) ariaDescribedByIds.push(externalDescribedBy);
    if (showError) ariaDescribedByIds.push(this._errorId);
    const ariaDescribedBy = ariaDescribedByIds.join(' ');
    const ariaLabelledBy = this.label ? this._labelId : externalLabelledBy;

    // Roving Tabindex: checked なら 0、そうでなければ -1（_updateTabindex で上書きされる）
    // 初期レンダリング時のデフォルト値として設定
    const tabindex = this.checked ? '0' : '-1';

    return html`
      <div class="wrapper" aria-disabled="${this.disabled ? 'true' : nothing}">
        <!-- Control: キーボードフォーカスを受け取る。クリックで選択 -->
        <span
          id="${this._controlId}"
          class="control"
          part="control"
          role="radio"
          aria-checked="${String(this.checked)}"
          aria-disabled="${this.disabled ? 'true' : nothing}"
          aria-invalid="${showError ? 'true' : nothing}"
          aria-describedby="${ariaDescribedBy || nothing}"
          aria-label="${externalLabel ?? nothing}"
          aria-labelledby="${ariaLabelledBy ?? nothing}"
          tabindex="${tabindex}"
          @click="${this._handleClick}"
          @keydown="${this._handleKeyDown}"
        >
        </span>

        <!-- ラベル: クリックでコントロールにフォーカスを移して選択 -->
        ${this.label
          ? html`<label
              id="${this._labelId}"
              class="label"
              part="label"
              @click="${this._handleLabelClick}"
              @keydown="${this._handleLabelKeyDown}"
              >${this.label}</label
            >`
          : nothing}
      </div>

      <!-- エラーメッセージ -->
      ${showError
        ? html`
            <span id="${this._errorId}" class="error-message" role="status" aria-live="polite">
              ${this.errorMessage}
            </span>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-radio': Radio;
  }
}
