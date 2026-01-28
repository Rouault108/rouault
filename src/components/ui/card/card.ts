import { LitElement, css, html, type CSSResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('ui-card')
export class UiCard extends LitElement {
  static override get styles(): CSSResult[] {
    return [
      css`
        :host {
          /* -------------------------------------------------------------
           * 基本スタイル
           * ------------------------------------------------------------- */
          display: block;
          border-radius: var(--radius-lg);
          background-color: var(--color-background);
          color: var(--color-foreground);
          font-family: var(--font-sans);
          
          /* モーション */
          transition: 
            transform var(--motion-duration) var(--motion-easing),
            box-shadow var(--motion-duration) var(--motion-easing),
            background-color var(--motion-duration) var(--motion-easing),
            border-color var(--motion-duration) var(--motion-easing);

          /* Nested Radius 計算用: Paddingを引いた内側の角丸 */
          --_inner-radius: calc(var(--radius-lg) - var(--card-padding-x));
        }

        /* コンテナ（内部構造） */
        .card-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: inherit;
          text-decoration: none;
          color: inherit;
          outline: none;
        }
        
        /* コンテンツラッパー（Header + Body + Footer） */
        .card-content {
          display: flex;
          flex-direction: column;
          flex: 1; /* Bodyが伸びるように */
        }

        /* -------------------------------------------------------------
         * パディング制御 (Padding Logic)
         * - X方向(左右): 一貫性を保つためサイズに関わらず固定（あるいは微調整のみ）
         * - Y方向(上下): Density（密度）を制御するために大きく変動させる
         * ------------------------------------------------------------- */
        
        :host {
          --card-padding-x: var(--space-6); /* 24px - デフォルト左右 */
          --card-padding-y: var(--space-6); /* 24px - デフォルト上下 */
          
          --card-header-gap: var(--space-4); /* HeaderとBodyの間 */
          --card-footer-gap: var(--space-4); /* FooterとBodyの間 */
        }

        .card-header {
          padding-top: var(--card-padding-y);
          padding-left: var(--card-padding-x);
          padding-right: var(--card-padding-x);
          padding-bottom: var(--card-header-gap);
        }

        .card-body {
          padding-top: 0; /* Headerとの兼ね合いで調整 */
          padding-bottom: 0;
          padding-left: var(--card-padding-x);
          padding-right: var(--card-padding-x);
          flex: 1; /* Bodyが伸びるように */
        }
        
        /* Headerがない場合のBody上部余白 */
        .card-header[hidden] + .card-body {
          padding-top: var(--card-padding-y);
        }

        /* Footerがない（または隠れている）場合のBody下部余白 */
        .card-body:last-child,
        .card-body:has(+ .card-footer[hidden]) {
          padding-bottom: var(--card-padding-y);
        }

        .card-footer {
          padding-top: var(--card-footer-gap);
          padding-left: var(--card-padding-x);
          padding-right: var(--card-padding-x);
          padding-bottom: var(--card-padding-y);
          
          /* デフォルトレイアウト */
          display: flex;
          align-items: center;
          gap: var(--space-2, 0.5rem);
        }

        /* -------------------------------------------------------------
         * スロット要素の基本挙動
         * ------------------------------------------------------------- */

        /**
         * 非表示制御
         * content/design-system.md の規定「視覚的に情報を隠す場合は .sr-only クラスを使用し、display: none は使用しない」
         * に対する例外: コンテンツが存在しないスロットラッパー自体はレイアウト崩れを防ぐため完全に削除する。
         * これはアクセシビリティ上の隠蔽ではなく、構造上の不在であるため display: none が適切。
         */
        .card-header[hidden],
        .card-footer[hidden] {
          display: none;
        }

        /* スロット内の要素のマージンをリセット
        .card-header ::slotted(h1),
        .card-header ::slotted(h2),
        .card-header ::slotted(h3),
        .card-header ::slotted(h4),
        .card-header ::slotted(h5),
        .card-header ::slotted(h6),
        .card-header ::slotted(p),
        .card-body ::slotted(h1),
        .card-body ::slotted(h2),
        .card-body ::slotted(h3),
        .card-body ::slotted(h4),
        .card-body ::slotted(h5),
        .card-body ::slotted(h6),
        .card-body ::slotted(p),
        .card-footer ::slotted(p) {
          margin: 0;
        }

        .card-media {
          overflow: hidden;
          /* デフォルト(Vertical)の角丸 - Nested Radius 適用 */
          /* padding が無い(0)の場合は外側と同じ角丸、paddingがある場合は計算値を適用したいが、
             Vertical配置のMediaは通常「カードの端まである」デザインなので、上部は外側の角丸を継承するのが自然 */
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          
          /* Flexアイテムとしての挙動（Horizontal時などに重要） */
          display: flex; 
          flex-direction: column;
        }

        .card-media ::slotted(img),
        .card-media ::slotted(video) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* ダミー画像用の div には flex レイアウトを提供 */
        .card-media ::slotted(div) {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-media[hidden] {
          display: none;
        }

        /* 最初の要素がメディアなら角丸を上部のみに (Vertical) */
        :host(:not([orientation="horizontal"])) .card-media:first-child {
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        }

        /* メディアがあるときは、他のセクションの上部角丸を削除 (Vertical) */
        :host(:not([orientation="horizontal"])) .card-media:first-child + .card-content {
          border-top-left-radius: 0;
          border-top-right-radius: 0;
        }
        
        /* -------------------------------------------------------------
         * 水平レイアウト (Horizontal Orientation)
         * ------------------------------------------------------------- */
         
        :host([orientation="horizontal"]) .card-container {
          flex-direction: row;
        }

        :host([orientation="horizontal"]) .card-media {
          width: 33%; /* デフォルトで1/3幅 */
          min-width: 150px; /* 最小幅確保 */
          height: auto; /* Flexboxのstretchにより親の高さに追従 */
          min-height: 200px; /* 最小高さ確保 */
          flex-shrink: 0;
          border-radius: var(--radius-lg) 0 0 var(--radius-lg); /* 左側のみ角丸 */
        }
        
        :host([orientation="horizontal"]) .card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0; /* Flexbox内でのテキスト折り返し用 */
        }

        /* -------------------------------------------------------------
         * バリアント (Variants)
         * ------------------------------------------------------------- */

        /* Elevated (デフォルト) - 属性なし or elevated */
        :host(:not([variant])),
        :host([variant="elevated"]) {
          box-shadow: var(--shadow-md);
          border: none;
        }

        /* ダークモード時は影ではなく Elevation Tones で高さを表現 */
        @media (prefers-color-scheme: dark) {
          :host(:not([variant]):not([data-theme="light"])),
          :host([variant="elevated"]:not([data-theme="light"])) {
            background-color: var(--bg-surface-1);
            box-shadow: none;
          }
        }

        :root[data-theme="dark"] :host([variant="elevated"]) {
          background-color: var(--bg-surface-1);
          box-shadow: none;
        }

        /* Outlined - 枠線 */
        :host([variant="outlined"]) {
          border: 1px solid var(--color-border);
          box-shadow: none;
        }

        /* Filled - 背景色 */
        :host([variant="filled"]) {
          background-color: var(--color-background-subtle);
          border: none;
          box-shadow: none;
        }
        
        /* -------------------------------------------------------------
         * パディングバリアント (Padding Variants)
         * 左右(X)は固定し、上下(Y)のみを変動させて密度を変える
         * ------------------------------------------------------------- */

        :host([padding="none"]) {
          --card-padding-x: 0;
          --card-padding-y: 0;
          --card-header-gap: 0;
          --card-footer-gap: 0;
        }

        :host([padding="sm"]) {
          --card-padding-y: var(--space-3); /* 12px */
          --card-header-gap: var(--space-2);
          --card-footer-gap: var(--space-3);
        }

        :host([padding="md"]) {
          --card-padding-y: var(--space-5); /* 20px */
          --card-header-gap: var(--space-3);
          --card-footer-gap: var(--space-5);
        }

        :host([padding="lg"]) {
          --card-padding-y: var(--space-8); /* 32px */
          --card-header-gap: var(--space-4);
          --card-footer-gap: var(--space-8);
        }

        /* -------------------------------------------------------------
         * インタラクティブ (Interactive / Link)
         * ------------------------------------------------------------- */

        :host([interactive]),
        :host([href]) {
          cursor: pointer;
        }

        /* Elevated Hover - シャドウを強調 */
        :host([interactive][variant="elevated"]:hover),
        :host([interactive]:not([variant]):hover),
        :host([href][variant="elevated"]:hover),
        :host([href]:not([variant]):hover) {
          box-shadow: var(--shadow-lg);
        }

        /* Outlined Hover - ボーダー色変更 + 微細なシャドウ */
        :host([interactive][variant="outlined"]:hover),
        :host([href][variant="outlined"]:hover) {
          border-color: var(--color-border-hover);
          box-shadow: var(--shadow-sm);
        }

        /* Filled Hover - 背景維持 + シャドウ追加 */
        :host([interactive][variant="filled"]:hover),
        :host([href][variant="filled"]:hover) {
          box-shadow: var(--shadow-md);
        }

        :host([interactive]:active),
        :host([href]:active) {
          box-shadow: var(--shadow-sm);
        }

        /* フォーカス（キーボードナビゲーション対応） 
           リンク時(aタグ)は、aタグ自体にフォーカスが当たるが、
           :host側でスタイルを見せたい場合は focus-within 等を活用するか、
           aタグのスタイルを消して:hostにフォーカスリングを出すか。
           ここでは :focus-visible を :host に適用し、内部の a タグは outline: none とする方針が一般的だが、
           Shadow DOM 内の a タグにフォーカスが当たるため :host:focus-within で反応させる。
        */
        :host([interactive]:focus-visible),
        :host([href]:focus-within) {
          outline: var(--focus-ring-width) solid var(--color-primary);
          outline-offset: var(--focus-ring-offset);
        }

        // ハイコントラストモード対応
        @media (prefers-contrast: more) {
          :host([variant="elevated"]),
          :host(:not([variant])) {
            border: 2px solid var(--color-border);
          }
          
          :host([interactive]:focus-visible),
          :host([href]:focus-within) {
            outline-width: 3px;
          }
        }

        /* Windows High Contrast Mode */
        @media (forced-colors: active) {
          /* 影や背景が消えるため、必ずボーダーを表示 */
          :host {
            border: 1px solid CanvasText;
          }
          
          /* インタラクティブなカードのフォーカスリング */
          :host([interactive]:focus-visible),
          :host([href]:focus-within) {
            outline: 3px solid Highlight;
            outline-offset: 2px;
          }
        }
      `
    ];
  }

  @property({ type: String, reflect: true })
  variant: 'elevated' | 'outlined' | 'filled' = 'elevated';

  @property({ type: String, reflect: true })
  padding: 'none' | 'sm' | 'md' | 'lg' = 'md';

  /**
   * カードをインタラクティブ（クリック可能）にします。
   * ホバーエフェクトが適用されます。
   * href プロパティがある場合は自動的に true として扱われます。
   */
  @property({ type: Boolean, reflect: true })
  interactive = false;

  /**
   * リンク先 URL。
   * 指定された場合、カード全体がリンク（<a>）としてレンダリングされます。
   * アクセシビリティの観点から、カード全体をクリック可能にする場合はこのプロパティを使用してください。
   */
  @property({ type: String, reflect: true })
  href?: string;

  /**
   * リンクのターゲット（例: _blank）
   */
  @property({ type: String, reflect: true })
  target?: '_blank' | '_self' | '_parent' | '_top';

  @property({ type: String, reflect: true })
  orientation: 'vertical' | 'horizontal' = 'vertical';

  // スロット内容の監視用
  @state()
  private _hasHeaderContent = false;

  @state()
  private _hasFooterContent = false;

  @state()
  private _hasMediaContent = false;

  private _onHeaderSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasHeaderContent = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private _onFooterSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasFooterContent = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private _onMediaSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasMediaContent = slot.assignedNodes({ flatten: true }).length > 0;
  }

  override render() {
    // 実際にレンダリングされる内部コンテンツ
    const content = html`
      <div class="card-media" part="media" ?hidden="${!this._hasMediaContent}">
        <slot name="media" @slotchange="${this._onMediaSlotChange}"></slot>
      </div>
      
      <div class="card-content">
        <div class="card-header" part="header" ?hidden="${!this._hasHeaderContent}">
          <slot name="header" @slotchange="${this._onHeaderSlotChange}"></slot>
        </div>
        <div class="card-body" part="body">
          <slot></slot>
        </div>
        <div class="card-footer" part="footer" ?hidden="${!this._hasFooterContent}">
          <slot name="footer" @slotchange="${this._onFooterSlotChange}"></slot>
        </div>
      </div>
    `;

    // リンク機能の提供
    // アクセシビリティの観点から、クリック可能なカードは <a> タグでラップする
    if (this.href) {
      return html`
        <a 
          class="card-container" 
          part="container"
          href="${this.href}"
          target="${this.target || ''}"
          rel="${this.target === '_blank' ? 'noopener noreferrer' : ''}"
        >
          ${content}
        </a>
      `;
    }

    return html`
      <div class="card-container" part="container">
        ${content}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-card': UiCard;
  }
}
