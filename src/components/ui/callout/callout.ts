import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * ui-callout - 記事内のコールアウト（注意書き、ヒント、警告など）
 * 
 * GitHub Flavored Markdown の Alert 記法（> [!NOTE]）から生成されることを想定
 * 
 * @element ui-callout
 * @fires callout-toggle - 折りたたみ状態が変更された時に発火
 * 
 * @slot - コールアウトのメインコンテンツ
 */
@customElement('ui-callout')
export class UiCallout extends LitElement {
  static override styles = css`
    :host {
      display: block;
      
      /* デフォルトトークンマッピング (Note/Info) */
      --_c-base: var(--color-info);
      --_c-bg: var(--color-info-bg);
      --_c-text: var(--color-foreground);
      
      /* アニメーション設定 */
      --_anim-duration: 150ms;
      --_anim-ease: var(--ease-out);
    }

    /* バリアント定義: CSS変数を切り替えるだけで全スタイルに適用 */
    :host([variant="tip"]) {
      --_c-base: var(--color-success);
      --_c-bg: var(--color-success-bg);
    }

    :host([variant="important"]) {
      --_c-base: var(--color-important);
      --_c-bg: var(--color-important-bg);
    }

    :host([variant="warning"]) {
      --_c-base: var(--color-warning);
      --_c-bg: var(--color-warning-bg);
    }

    :host([variant="caution"]) {
      --_c-base: var(--color-error);
      --_c-bg: var(--color-error-bg);
    }

    /* コールアウトコンテナ */
    .callout {
      position: relative;
      padding: var(--space-4, 1rem);
      background-color: color-mix(in srgb, var(--_c-bg), transparent 20%);
      border: 1px solid color-mix(in srgb, var(--_c-base), transparent 70%);
      border-radius: var(--radius-md);
      color: var(--_c-text);
      font-size: var(--text-base);
      line-height: var(--line-height-relaxed);
      
      /* ハイコントラストモード対応 */
      @media (prefers-contrast: more) {
        border-width: 2px;
        border-color: var(--_c-base);
      }
    }

    /* ヘッダー部分 */
    .header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
      transition: margin-bottom var(--_anim-duration) var(--_anim-ease);
    }

    /* 折りたたみ時はマージン削除 */
    :host([collapsed]) .header {
      margin-bottom: 0;
    }

    /* タイトルもアイコンもない場合はヘッダー非表示 */
    .header:empty {
      display: none;
    }

    /* アイコン */
    .icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-md);
      height: var(--icon-md);
      color: var(--_c-base);
    }

    .icon iconify-icon {
      font-size: var(--icon-md);
      line-height: 1;
    }

    /* 見出し（Heading） */
    .heading {
      flex: 1;
      font-size: var(--text-base);
      font-weight: var(--font-semibold);
      color: var(--_c-base);
      margin: 0;
      line-height: 1.5;
    }

    /* 折りたたみボタン（ヘッダー全体を覆わない、アイコン+タイトルの横に配置などレイアウト要調整だが、
       ここではLinear風に「アイコン+タイトル」自体をクリック可能にするパターンを採用） */
    .toggle-button {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      width: 100%;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      text-align: left;
      color: inherit; /* 親の色を継承 */
      
      /* フォーカスリングの視認性確保のためにマージンを少し吸う */
      margin: calc(var(--space-1) * -1);
      padding: var(--space-1);
      width: calc(100% + var(--space-2));

      transition: background-color 100ms var(--ease-out);
    }

    .toggle-button:hover {
      background-color: rgba(0, 0, 0, 0.03);
    }

    /* ダークモードでのホバー */
    @media (prefers-color-scheme: dark) {
      .toggle-button:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }
    }

    .toggle-button:focus-visible {
      outline: 2px solid var(--color-primary); /* デザインシステム準拠 */
      outline-offset: 2px;
    }

    /* ハイコントラストモードでのフォーカス */
    @media (prefers-contrast: more) {
      .toggle-button:focus-visible {
        outline-width: 3px;
        outline-offset: 4px;
      }
    }

    /* シェブロンアイコン */
    .chevron {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-sm, 16px);
      height: var(--icon-sm, 16px);
      color: var(--_c-base);
      transition: transform var(--_anim-duration) var(--_anim-ease);
      margin-top: 0.125rem; /* テキストのベースラインに合わせる微調整 */
    }

    :host([collapsed]) .chevron {
      transform: rotate(-90deg);
    }

    .chevron iconify-icon {
      font-size: var(--icon-sm, 16px);
    }

    /* コンテンツエリア (Grid Template Rows Animation) */
    .content-wrapper {
      display: grid;
      grid-template-rows: 1fr;
      transition: grid-template-rows var(--_anim-duration) var(--_anim-ease);
    }

    :host([collapsed]) .content-wrapper {
      grid-template-rows: 0fr;
    }

    .content {
      overflow: hidden;
      min-width: 0; /* Grid item overflow fix */
    }

    /* コンテンツ内部のスタイル */
    .content-inner {
      /* アニメーション中にパディングが邪魔しないよう、ラッパーではなくここでマージン制御はしない。
         Grid Animationの場合、内部の高さが0になると消える。
         ただし、collapsed状態での視覚的な余白（margin-bottom）はGridの外側(.header)で制御している。
      */
    }
    
    /* スロットコンテンツのスタイル調整 */
    .content ::slotted(p) {
      margin: 0 0 var(--space-3, 0.75rem) 0;
    }
    .content ::slotted(*:last-child) {
      margin-bottom: 0;
    }
    .content ::slotted(a) {
      color: var(--_c-base);
      text-decoration: underline;
      font-weight: var(--font-medium);
      text-underline-offset: 2px;
    }
    .content ::slotted(code) {
      padding: 0.125rem var(--space-1);
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 0.9em;
    }

    @media (prefers-color-scheme: dark) {
      .content ::slotted(code) {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
    
    @media (prefers-reduced-motion: reduce) {
      .header,
      .toggle-button,
      .chevron,
      .content-wrapper {
        transition: none;
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'note' | 'tip' | 'important' | 'warning' | 'caution' = 'note';

  @property({ type: String })
  heading = '';

  @property({ type: Boolean, reflect: true })
  collapsible = false;

  @property({ type: Boolean, reflect: true })
  collapsed = false;

  @property({ type: Boolean })
  showIcon = true;

  @state()
  private _headingId = `callout-heading-${Math.random().toString(36).substring(2, 11)}`;
  
  @state()
  private _contentId = `callout-content-${Math.random().toString(36).substring(2, 11)}`;

  private _handleToggle() {
    if (!this.collapsible) return;
    this.collapsed = !this.collapsed;
    this.dispatchEvent(new CustomEvent('callout-toggle', {
      bubbles: true,
      composed: true,
      detail: { collapsed: this.collapsed },
    }));
  }

  private _getIcon() {
    switch (this.variant) {
      case 'tip':       return html`<iconify-icon icon="lucide:lightbulb"></iconify-icon>`;
      case 'important': return html`<iconify-icon icon="lucide:badge-alert"></iconify-icon>`; // Alert Badge for consistency
      case 'warning':   return html`<iconify-icon icon="lucide:alert-triangle"></iconify-icon>`;
      case 'caution':   return html`<iconify-icon icon="lucide:octagon-alert"></iconify-icon>`;
      default:          return html`<iconify-icon icon="lucide:info"></iconify-icon>`;
    }
  }

  protected override render() {
    const hasHeading = this.heading.trim().length > 0;
    
    // アイコンの描画
    const iconTemplate = this.showIcon 
      ? html`<div class="icon" aria-hidden="true">${this._getIcon()}</div>` 
      : null;

    // 見出しの描画（buttonの中にh3を入れないための分離）
    // collapsibleの場合は button がラッパーになるが、セマンティクスとして h3 を維持するため
    // button の aria-labelledby で h3 を参照する形、あるいは
    // 単純に button の中に div.heading を入れ、視覚的に見出しとして扱う。
    // アクセシビリティ的には、Callout全体のラベルとして機能させるべき。
    
    // アプローチ:
    // ヘッダー全体を見出し(h3)とはせず、視覚的なタイトルをdivで表現し、
    // button がそのテキストを含む形にする。
    
    const headingContent = hasHeading 
      ? html`<div id="${this._headingId}" class="heading">${this.heading}</div>` 
      : null;

    const toggleButton = this.collapsible
      ? html`
        <button
          class="toggle-button"
          @click=${this._handleToggle}
          aria-expanded="${!this.collapsed}"
          aria-controls="${this._contentId}"
          aria-labelledby="${hasHeading ? this._headingId : ''}"
        >
          ${iconTemplate}
          ${headingContent}
          <div class="chevron">
            <iconify-icon icon="lucide:chevron-down"></iconify-icon>
          </div>
        </button>
      `
      : html`
        ${iconTemplate}
        ${headingContent}
      `;

    // ヘッダーが表示される条件: タイトルがある or アイコンがある
    const showHeader = hasHeading || this.showIcon;

    return html`
      <div 
        class="callout"
        role="${this.variant === 'warning' || this.variant === 'caution' ? 'alert' : 'note'}"
        aria-labelledby="${hasHeading ? this._headingId : ''}"
      >
        ${showHeader ? html`<div class="header">${toggleButton}</div>` : ''}
        
        <div 
          class="content-wrapper"
          aria-hidden="${this.collapsed}"
        >
          <div 
            id="${this._contentId}" 
            class="content"
          >
             <!-- コンテンツのフォーカス制御（inert相当の処理）は、
                  display: none 相当になる grid-template-rows: 0fr によって
                  視覚的・操作的に隠蔽されるため、追加のinert属性は必須ではないが
                  安全のために intert を検討してもよい。今回はCSSのみで対応。 -->
            <div class="content-inner">
              <slot></slot>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-callout': UiCallout;
  }
}
