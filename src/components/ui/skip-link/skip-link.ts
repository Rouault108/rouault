import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * スキップリンク (Skip Link) コンポーネント
 * 
 * キーボードユーザーやスクリーンリーダー利用者が、反復的なナビゲーション（ヘッダーやサイドバー）を
 * 飛び越え、メインコンテンツへ即座に到達するための特急レーンです。
 * 
 * @slot - スロットは使用せず、内部でラベルテキストを表示します
 * 
 * @property {string} href - スキップ先のIDセレクタ（デフォルト: `#main-content`）
 * @property {string} label - 表示ラベル（デフォルト: `メインコンテンツへスキップ`）
 * 
 * @fires {void} - このコンポーネントは独自のイベントを発火しません。ブラウザのネイティブなリンク挙動に委ねます。
 * 
 * @cssprop --z-max - システム最上位レイヤーのZ-Index（デフォルト: 1000）
 * @cssprop --bg-default - デフォルト背景色
 * @cssprop --fg-default - デフォルト前景色
 * @cssprop --border-width - 境界線の幅（デフォルト: 1px）
 * @cssprop --border-on-inverted - 反転背景上の境界線色
 * @cssprop --space-2 - スペーシングトークン（8px）
 * @cssprop --space-4 - スペーシングトークン（16px）
 * @cssprop --radius-full - 完全な角丸（ピル形状）
 * @cssprop --font-sans - サンセリフフォントファミリー
 * @cssprop --font-medium - 中程度のフォントウェイト（500）
 * @cssprop --text-sm - 小さめのテキストサイズ（13px）
 * @cssprop --line-height-normal - 標準の行高（1.5）
 * @cssprop --shadow-lg - 大きめのシャドウ（Light Modeのみ）
 * 
 * @csspart link - 内部のアンカー要素
 * 
 * @example
 * ```html
 * <!-- デフォルト -->
 * <ui-skip-link></ui-skip-link>
 * 
 * <!-- カスタムターゲット -->
 * <ui-skip-link target="#content" label="コンテンツへ移動"></ui-skip-link>
 * ```
 */
@customElement('ui-skip-link')
export class SkipLink extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    /* 内部のアンカー要素 */
    a {
      /* Position: 初期状態から固定配置 */
      position: fixed;
      top: var(--space-2, 8px);
      left: 50%;
      
      /* Z-Index: システム最上位レイヤー（Toast、Modalより上位） */
      z-index: var(--z-max, 1000);
      
      /* Visibility Strategy (Default State - 非表示) */
      /* Note: visibility: hidden や display: none は使用しない（A11yツリーから削除されるため） */
      transform: translate(-50%, -100%);
      clip-path: inset(50%);
      opacity: 0;
      
      /* Motion: 即時表示（transition: none） */
      /* 思考の即応性を最優先し、余韻（Fade）を排除 */
      transition: none;
      
      /* Appearance */
      background: var(--fg-default);
      color: var(--bg-default);
      border: var(--border-width, 1px) solid var(--border-on-inverted);
      padding: var(--space-2, 8px) var(--space-4, 16px);
      border-radius: var(--radius-full, 9999px);
      
      /* Typography */
      font-family: var(--font-sans);
      font-weight: var(--font-medium, 500);
      font-size: var(--text-sm, 13px);
      line-height: var(--line-height-normal, 1.5);
      white-space: nowrap;
      
      /* テキスト装飾を削除（リンクだが下線は不要） */
      text-decoration: none;
      
      /* Shadow (Light Mode): 浮遊感を表現 */
      box-shadow: var(--shadow-lg);
      
      /* Dark Mode: Shadow削除（闇の中の発光体として機能） */
      @media (prefers-color-scheme: dark) {
        box-shadow: none;
      }
    }

    /* Focus State (表示) */
    a:focus {
      /* Visibility Restoration */
      transform: translateX(-50%);
      clip-path: none;
      opacity: 1;
      
      /* Focus Ring Override: 出現すること自体が強力なフォーカス状態のため無効化 */
      outline: none;
    }

    /* Forced Colors Mode: アウトラインを強制的に適用 */
    @media (forced-colors: active) {
      a:focus {
        outline: 3px solid CanvasText;
        background: Canvas;
        color: CanvasText;
        border-color: CanvasText;
      }
    }

    /* Print Styles: 印刷時は非表示 */
    @media print {
      :host {
        display: none;
      }
    }
  `;

  /**
   * スキップ先のIDセレクタ
   * @type {string}
   * @default "#main-content"
   */
  @property({ attribute: 'href', type: String })
  href = '#main-content';

  /**
   * 表示ラベル
   * @type {string}
   * @default "メインコンテンツへスキップ"
   */
  @property({ type: String })
  label = 'メインコンテンツへスキップ';

  override render() {
    return html`
      <a 
        href="${this.href}"
        part="link"
      >
        ${this.label}
      </a>
    `;
  }

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);

    // 開発者への警告: ターゲット要素が存在しない場合
    if (this.href.startsWith('#')) {
      // Shadow DOM 内からドキュメント全体を検索
      const root = this.getRootNode() as Document | ShadowRoot;
      const targetElement = root.querySelector(this.href);
      
      if (!targetElement) {
        console.warn(`[ui-skip-link]: Target element with selector '${this.href}' not found in the document.`);
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-skip-link': SkipLink;
  }
}
