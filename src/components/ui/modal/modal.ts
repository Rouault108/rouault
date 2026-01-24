import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

/**
 * ui-modal - モダンなモーダルダイアログコンポーネント
 * 
 * @element ui-modal
 * @fires modal-open - モーダルが開かれた時に発火
 * @fires modal-close - モーダルが閉じられた時に発火
 * 
 * @slot header - モーダルのヘッダー（タイトル）
 * @slot - モーダルのメインコンテンツ
 * @slot footer - モーダルのフッター（ボタンなど）
 */
@customElement('ui-modal')
export class UiModal extends LitElement {
  // アニメーション時間（CSSのduration-normalと同期）
  private static readonly ANIMATION_DURATION = 200;

  static override styles = css`
    :host {
      display: contents;
      /* 基本変数 */
      --modal-z-index: var(--z-modal, 1000);
      --modal-padding: var(--space-6, 1.5rem);
      --modal-radius: var(--radius-xl, 0.75rem);
      --modal-bg: var(--color-background, #ffffff);
      --modal-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      --backdrop-bg: rgba(0, 0, 0, 0.5);
      --border-color-subtle: rgba(0, 0, 0, 0.1); /* ライトモード用 */
      
      /* アニメーション */
      --anim-duration: var(--duration-normal, 200ms);
      --anim-ease-out: var(--ease-out, ease-out);
      --anim-ease-in: var(--ease-in, ease-in);
    }

    /* ダークモード変数オーバーライド */
    @media (prefers-color-scheme: dark) {
      :host {
        --modal-bg: var(--bg-surface-2, #1f1f22);
        --modal-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
        --backdrop-bg: rgba(0, 0, 0, 0.7);
        --border-color: rgba(255, 255, 255, 0.08); /* 枠線 */
        --border-color-subtle: rgba(255, 255, 255, 0.08); /* 区切り線 */
      }
    }

    :host-context([data-theme='dark']) {
      --modal-bg: var(--bg-surface-2, #1f1f22);
      --modal-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
      --backdrop-bg: rgba(0, 0, 0, 0.7);
      --border-color: rgba(255, 255, 255, 0.08);
      --border-color-subtle: rgba(255, 255, 255, 0.08);
    }

    /* オーバーレイ */
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: var(--modal-z-index);
      display: none;
      align-items: center;
      justify-content: center;
      padding: var(--space-4, 1rem);
      overflow-y: auto;
    }

    /* flexで表示するためのヘルパークラス */
    :host([open]) .modal-overlay {
      display: flex;
    }

    /* バックドロップ */
    .backdrop {
      position: fixed;
      inset: 0;
      background: var(--backdrop-bg);
      backdrop-filter: blur(4px);
      animation: backdrop-fade-in var(--anim-duration) var(--anim-ease-out);
    }

    :host([data-closing]) .backdrop {
      animation: backdrop-fade-out var(--anim-duration) var(--anim-ease-in);
    }

    /* モーダル本体 */
    .modal {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: var(--modal-max-width, 500px);
      max-height: calc(100vh - var(--space-8, 2rem));
      background: var(--modal-bg);
      border-radius: var(--modal-radius);
      box-shadow: var(--modal-shadow);
      border: 1px solid var(--border-color, transparent);
      animation: modal-slide-in var(--anim-duration) var(--anim-ease-out);
    }

    :host([data-closing]) .modal {
      animation: modal-slide-out var(--anim-duration) var(--anim-ease-in);
    }

    /* アニメーション定義 */
    @keyframes backdrop-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes backdrop-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes modal-slide-in {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes modal-slide-out {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to { opacity: 0; transform: scale(0.95) translateY(-10px); }
    }

    /* サイズバリエーション */
    :host([size="sm"]) .modal { --modal-max-width: 400px; }
    :host([size="md"]) .modal { --modal-max-width: 500px; }
    :host([size="lg"]) .modal { --modal-max-width: 700px; }
    :host([size="xl"]) .modal { --modal-max-width: 900px; }

    /* ヘッダー */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4, 1rem) var(--space-6, 1.5rem);
    }

    .modal-header[hidden] {
      display: none;
    }

    .modal-header-content {
      flex: 1;
      min-width: 0;
    }

    .modal-header ::slotted(*) {
      margin: 0;
      font-size: var(--text-lg, 1rem);
      font-weight: var(--font-semibold, 600);
      color: var(--color-foreground, #111827);
    }

    /* クローズボタン共通スタイル */
    .close-button,
    .close-button-absolute {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--space-8, 2rem);
      height: var(--space-8, 2rem);
      opacity: 0.6;
      transition: all var(--anim-duration) var(--anim-ease-out);
      border-radius: var(--radius-full, 9999px);
    }

    .close-button:hover,
    .close-button-absolute:hover {
      opacity: 1;
      background-color: rgba(125, 125, 125, 0.1);
    }

    .close-button {
      flex-shrink: 0;
      margin-left: var(--space-4, 1rem);
    }

    /* 絶対配置のクローズボタン（ヘッダーなし用） */
    .close-button-absolute {
      position: absolute;
      top: var(--space-4, 1rem);
      right: var(--space-4, 1rem);
      z-index: 10;
    }

    /* コンテンツ */
    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--modal-padding);
    }

    /* ヘッダーがある場合のコンテンツ上部パディング調整 */
    .modal-header:not([hidden]) + .modal-content {
      padding-top: var(--space-2, 0.5rem);
    }

    /* ヘッダーがなく、クローズボタンが表示される場合の右パディング調整 */
    .modal-content.has-close-button-no-header {
      padding-right: var(--space-12, 3rem);
    }

    .modal-content ::slotted(*) {
      margin: 0;
      color: var(--color-foreground, #111827);
    }

    .modal-content ::slotted(p) {
      line-height: var(--line-height-relaxed, 1.6);
      color: var(--color-foreground-muted, #6b7280);
    }

    /* フッター */
    .modal-footer {
      padding: var(--space-4, 1rem) var(--space-6, 1.5rem);
    }

    .modal-footer[hidden] {
      display: none;
    }

    /* prefers-reduced-motion 対応 */
    @media (prefers-reduced-motion: reduce) {
      .backdrop, .modal {
        animation: none;
        transition: none;
      }
    }

    /* レスポンシブ対応 */
    @media (max-width: 640px) {
      .modal-overlay { padding: 0; }
      .modal {
        max-height: 100vh;
        border-radius: 0;
        --modal-max-width: 100% !important;
      }
    }
  `;

  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ type: String, reflect: true })
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  @property({ type: Boolean })
  preventBackdropClose = false;

  @property({ type: Boolean })
  showCloseButton = true;

  @property({ type: String })
  closeLabel = '閉じる';

  @query('.modal')
  private _modal?: HTMLElement;

  @query('.backdrop')
  private _backdrop?: HTMLElement;

  @state()
  private _hasHeader = false;

  @state()
  private _hasFooter = false;

  private _previouslyFocused: HTMLElement | null = null;
  private _headerId = `modal-header-${this._generateId()}`;
  private _contentId = `modal-content-${this._generateId()}`;

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this._handleKeydown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeydown);
    this._restoreFocus();
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        this._handleOpen();
      } else {
        this._handleClose();
      }
    }
  }

  protected override firstUpdated() {
    this._checkSlots();
  }

  /**
   * 一意のIDを生成するヘルパー
   */
  private _generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substr(2, 9);
  }

  private _checkSlots() {
    const headerSlot = this.shadowRoot?.querySelector('slot[name="header"]') as HTMLSlotElement;
    if (headerSlot) {
      this._hasHeader = headerSlot.assignedNodes({ flatten: true }).length > 0;
    }

    const footerSlot = this.shadowRoot?.querySelector('slot[name="footer"]') as HTMLSlotElement;
    if (footerSlot) {
      this._hasFooter = footerSlot.assignedNodes({ flatten: true }).length > 0;
    }
  }

  private _handleOpen() {
    this._previouslyFocused = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    
    this.dispatchEvent(new CustomEvent('modal-open', { bubbles: true, composed: true }));

    // アニメーションフレーム後にフォーカスを設定
    requestAnimationFrame(() => {
      this._setInitialFocus();
    });
  }

  private _handleClose() {
    document.body.style.overflow = '';
    
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));

    this._restoreFocus();
  }

  private _setInitialFocus() {
    const focusableElements = this._getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0]?.focus();
    } else {
      this._modal?.focus();
    }
  }

  private _restoreFocus() {
    if (this._previouslyFocused) {
      this._previouslyFocused.focus();
      this._previouslyFocused = null;
    }
  }

  private _getFocusableElements(): HTMLElement[] {
    if (!this._modal) return [];
    
    // Tabキーでフォーカス可能な要素を取得
    const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(this._modal.querySelectorAll(selector));
  }

  /**
   * キーボードイベントハンドラ（ESCとTabトラップ）
   */
  private _handleKeydown = (e: KeyboardEvent) => {
    if (!this.open) return;

    if (e.key === 'Escape') {
      this._closeModal();
      return;
    }

    // フォーカストラップ
    if (e.key === 'Tab') {
      const focusableElements = this._getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) { // Shift + Tab: 戻る
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else { // Tab: 進む
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  };

  private _handleBackdropClick = (e: MouseEvent) => {
    if (e.target === this._backdrop && !this.preventBackdropClose) {
      this._closeModal();
    }
  };

  private _closeModal = () => {
    this.setAttribute('data-closing', '');
    
    setTimeout(() => {
      this.open = false;
      this.removeAttribute('data-closing');
    }, UiModal.ANIMATION_DURATION);
  };

  private _onHeaderSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasHeader = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private _onFooterSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasFooter = slot.assignedNodes({ flatten: true }).length > 0;
  }

  /**
   * クローズボタンのレンダリング
   * @param isAbsolute 絶対配置にするかどうか
   */
  private _renderCloseButton(isAbsolute = false): TemplateResult {
    if (!this.showCloseButton) return html``;

    const buttonClass = isAbsolute ? 'close-button-absolute' : 'close-button';
    
    return html`
      <div class="${buttonClass}">
        <ui-icon-button
          @click="${this._closeModal}"
          aria-label="${this.closeLabel}"
          variant="ghost"
          size="sm"
        >
          <iconify-icon icon="lucide:x"></iconify-icon>
        </ui-icon-button>
      </div>
    `;
  }

  override render() {
    return html`
      <div class="modal-overlay" @click="${this._handleBackdropClick}">
        <div class="backdrop"></div>
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="${this._hasHeader ? this._headerId : undefined}"
          aria-label="${!this._hasHeader ? 'Dialog' : undefined}"
          aria-describedby="${this._contentId}"
          tabindex="-1"
          @click="${(e: Event) => e.stopPropagation()}"
        >
          ${!this._hasHeader ? this._renderCloseButton(true) : ''}

          <div class="modal-header" ?hidden="${!this._hasHeader}">
            <div class="modal-header-content" id="${this._headerId}">
              <slot name="header" @slotchange="${this._onHeaderSlotChange}"></slot>
            </div>
            ${this._hasHeader ? this._renderCloseButton(false) : ''}
          </div>

          <div 
            class="modal-content" 
            id="${this._contentId}"
          >
            <slot></slot>
          </div>

          <div class="modal-footer" ?hidden="${!this._hasFooter}">
            <slot name="footer" @slotchange="${this._onFooterSlotChange}"></slot>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-modal': UiModal;
  }
}
