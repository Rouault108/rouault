import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface RadioGroupStateDetail {
  reason: 'connected' | 'disconnected' | 'checked' | 'disabled' | 'name';
}

const RADIO_STATE_CHANGE_EVENT = 'ui-radio-state-change';

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
 */
@customElement('ui-radio')
export class Radio extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      flex-direction: column;
      gap: var(--space-1, 4px);
    }

    .wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      cursor: pointer;
      position: relative;
      user-select: none;
    }

    :host([disabled]) .wrapper {
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
    }

    .control {
      position: relative;
      flex-shrink: 0;
      box-sizing: border-box;
      width: 16px;
      height: 16px;
      border-radius: var(--radius-full, 9999px);
      border: var(--border-width, 1px) solid var(--border-muted, oklch(80% 0 0 / 0.4));
      background: var(--bg-fill-muted, oklch(95% 0 0));
    }

    /* 最低操作領域は 24px を保証し、より大きい hit target は上位で補います。 */
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

    .wrapper:hover:not([aria-disabled='true']) .control {
      border-color: var(--border-default, oklch(70% 0 0 / 0.6));
    }

    :host([checked]) .wrapper:hover .control {
      border-color: var(--primary, oklch(60% 0.15 250));
      background: var(--bg-default, oklch(100% 0 0));
    }

    .wrapper:active:not([aria-disabled='true']) .control {
      transform: scale(var(--scale-pressed, 0.96));
    }

    :host([checked]) .control {
      border: 4px solid var(--primary, oklch(60% 0.15 250));
      background: var(--bg-default, oklch(100% 0 0));
    }

    :host([invalid]) .control {
      border-color: var(--border-danger, oklch(55% 0.2 28));
    }

    .control:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    :host([invalid]) .control:focus-visible {
      outline-color: var(--border-danger, oklch(55% 0.2 28));
    }

    .label {
      font-size: var(--text-base, 14px);
      color: var(--fg-default, oklch(20% 0 0));
      line-height: var(--line-height-normal, 1.5);
    }

    .error-message {
      font-size: var(--text-sm, 13px);
      color: var(--fg-danger, oklch(55% 0.2 28));
      line-height: var(--line-height-normal, 1.5);
    }

    @media (prefers-reduced-motion: reduce) {
      .control {
        transition-duration: 0.01ms;
      }
    }

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

  static formAssociated = true;

  @property({ type: Boolean, reflect: true })
  checked = false;

  @property({ type: String, reflect: true })
  name = '';

  @property({ type: String, reflect: true })
  value = 'on';

  @property({ type: String, reflect: true })
  label = '';

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  invalid = false;

  @property({ type: String, attribute: 'error-message', reflect: true })
  errorMessage = '';

  private readonly _internals: ElementInternals;
  private readonly _controlId = `radio-${Math.random().toString(36).substring(2, 11)}`;
  private readonly _labelId = `radio-label-${Math.random().toString(36).substring(2, 11)}`;
  private readonly _errorId = `radio-error-${Math.random().toString(36).substring(2, 11)}`;
  private _groupSyncQueued = false;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._syncFormValue();
    this._syncValidity();

    queueMicrotask(() => {
      if (!this.isConnected) {
        return;
      }

      this._scheduleGroupSync();
      this._emitGroupStateChange('connected');
    });
  }

  override disconnectedCallback(): void {
    const groupState = this.name === '' ? [] : this._getResolvedGroupMembers();
    super.disconnectedCallback();
    this._syncResolvedGroupTabindex(groupState.filter((radio) => radio !== this));
    this._emitGroupStateChange('disconnected');
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    const previousName = changedProperties.get('name');
    if (typeof previousName === 'string' && previousName !== this.name) {
      this._syncResolvedGroupTabindex(this._getResolvedGroupMembersForName(previousName));
    }

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

    if (
      changedProperties.has('checked') ||
      changedProperties.has('disabled') ||
      changedProperties.has('name')
    ) {
      this._scheduleGroupSync();
    }
  }

  private _scheduleGroupSync(): void {
    if (this._groupSyncQueued) {
      return;
    }

    this._groupSyncQueued = true;
    queueMicrotask(() => {
      this._groupSyncQueued = false;

      if (!this.isConnected && this.name !== '') {
        return;
      }

      this._normalizeResolvedGroup();
      this._syncResolvedGroupState();
    });
  }

  private _emitGroupStateChange(reason: RadioGroupStateDetail['reason']): void {
    this.dispatchEvent(
      new CustomEvent<RadioGroupStateDetail>(RADIO_STATE_CHANGE_EVENT, {
        bubbles: true,
        composed: true,
        detail: { reason },
      }),
    );
  }

  private _syncFormValue(): void {
    if (this.checked && !this.disabled && this.name !== '') {
      this._internals.setFormValue(this.value);
      return;
    }

    this._internals.setFormValue(null);
  }

  private _syncValidity(): void {
    if (this.invalid && this.errorMessage !== '') {
      this._internals.setValidity({ customError: true }, this.errorMessage);
      return;
    }

    this._internals.setValidity({});
  }

  private _getGroupScope(): ParentNode {
    return this.closest('form') ?? (this.getRootNode() as Document | ShadowRoot);
  }

  private _getResolvedGroupMembers(): Radio[] {
    return this._getResolvedGroupMembersForName(this.name);
  }

  private _getResolvedGroupMembersForName(name: string): Radio[] {
    if (name === '') {
      return [this];
    }

    const scope = this._getGroupScope();
    return [...scope.querySelectorAll<Radio>(`ui-radio[name="${CSS.escape(name)}"]`)];
  }

  private _normalizeResolvedGroup(): void {
    const group = this._getResolvedGroupMembers();
    if (group.length <= 1) {
      return;
    }

    const checkedMembers = group.filter((radio) => radio.checked);
    if (checkedMembers.length <= 1) {
      return;
    }

    const winner = checkedMembers.at(-1);
    if (!winner) {
      return;
    }

    group.forEach((radio) => {
      const nextChecked = radio === winner;
      if (radio.checked !== nextChecked) {
        radio.checked = nextChecked;
      }
    });
  }

  private _syncResolvedGroupState(): void {
    this._syncResolvedGroupTabindex(this._getResolvedGroupMembers());
    this._getResolvedGroupMembers().forEach((radio) => {
      radio._syncFormValue();
    });
  }

  private _syncResolvedGroupTabindex(group: Radio[]): void {
    if (group.length === 0) {
      return;
    }

    const checkedMember = group.find((radio) => radio.checked && !radio.disabled);
    const focusTarget = checkedMember ?? group.find((radio) => !radio.disabled);

    group.forEach((radio) => {
      const control = radio.shadowRoot?.querySelector<HTMLElement>('.control');
      if (!control) {
        return;
      }

      control.tabIndex = radio === focusTarget ? 0 : -1;
    });
  }

  private _selectFromUser(): void {
    if (this.disabled || this.checked) {
      return;
    }

    const group = this._getResolvedGroupMembers();
    group.forEach((radio) => {
      if (radio !== this && radio.checked) {
        radio.checked = false;
      }
    });

    this.checked = true;
    this._syncResolvedGroupState();
    this._emitGroupStateChange('checked');

    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  private _handleWrapperClick = (): void => {
    if (this.disabled) {
      return;
    }

    this.focus();
    this._selectFromUser();
  };

  private _handleWrapperKeyDown = (event: KeyboardEvent): void => {
    void event;
  };

  private _handleKeyDown = (event: KeyboardEvent): void => {
    const group = this._getResolvedGroupMembers().filter((radio) => !radio.disabled);
    if (group.length === 0) {
      return;
    }

    const currentIndex = group.indexOf(this);
    if (currentIndex === -1) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        event.preventDefault();
        const next = group[(currentIndex + 1) % group.length];
        if (!next) {
          return;
        }

        next._selectFromUser();
        next.focus();
        break;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        event.preventDefault();
        const previous = group[(currentIndex - 1 + group.length) % group.length];
        if (!previous) {
          return;
        }

        previous._selectFromUser();
        previous.focus();
        break;
      }
      case ' ': {
        event.preventDefault();
        this._selectFromUser();
        break;
      }
      default:
        break;
    }
  };

  checkValidity(): boolean {
    return this._internals.checkValidity();
  }

  reportValidity(): boolean {
    return this._internals.reportValidity();
  }

  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLElement>('.control')?.focus(options);
  }

  override blur(): void {
    this.shadowRoot?.querySelector<HTMLElement>('.control')?.blur();
  }

  override render() {
    const showError = this.invalid && this.errorMessage !== '';
    const externalLabel = this.getAttribute('aria-label');
    const externalLabelledBy = this.getAttribute('aria-labelledby');
    const externalDescribedBy = this.getAttribute('aria-describedby');
    const describedByIds: string[] = [];
    if (externalDescribedBy) {
      describedByIds.push(externalDescribedBy);
    }
    if (showError) {
      describedByIds.push(this._errorId);
    }

    const ariaDescribedBy = describedByIds.join(' ');
    const ariaLabel = this.label === '' ? externalLabel : nothing;
    const ariaLabelledBy = this.label
      ? this._labelId
      : (externalLabelledBy ?? nothing);

    return html`
      <div
        class="wrapper"
        aria-disabled="${this.disabled ? 'true' : nothing}"
        @click="${this._handleWrapperClick}"
        @keydown="${this._handleWrapperKeyDown}"
      >
        <span
          id="${this._controlId}"
          class="control"
          part="control"
          role="radio"
          aria-checked="${String(this.checked)}"
          aria-disabled="${this.disabled ? 'true' : nothing}"
          aria-invalid="${showError ? 'true' : nothing}"
          aria-describedby="${ariaDescribedBy || nothing}"
          aria-label="${ariaLabel}"
          aria-labelledby="${ariaLabelledBy}"
          tabindex="${this.checked && !this.disabled ? '0' : '-1'}"
          @keydown="${this._handleKeyDown}"
        ></span>

        ${this.label
          ? html`<label id="${this._labelId}" class="label" part="label">${this.label}</label>`
          : nothing}
      </div>

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
  interface HTMLElementEventMap {
    [RADIO_STATE_CHANGE_EVENT]: CustomEvent<RadioGroupStateDetail>;
  }

  interface HTMLElementTagNameMap {
    'ui-radio': Radio;
  }
}
