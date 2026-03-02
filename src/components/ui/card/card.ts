import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/** カードの外観スタイルを定義するバリアント型 */
export type CardVariant = 'outlined' | 'elevated' | 'flat' | 'ghost';

/**
 * カード (Card) コンポーネント `<ui-card>`
 *
 * 関連する情報をグルーピングし、一つのまとまりとして提示するコンテナです。
 * Light モードでは「影」で、Dark モードでは「表面の質感（Surface Tone & Edge）」で
 * 背景からの物理的な分離を表現します。
 *
 * ## スロット
 *
 * - `header` - カードのヘッダーエリア
 * - (default) - カードのメインコンテンツ
 * - `footer` - カードのフッターエリア
 *
 * ## バリアント
 *
 * - `outlined` (デフォルト): 枠線で輪郭を示す。Hover 時に浮上（shadow 獲得・背景不透明化）。
 * - `elevated`: 影で背景から浮き上がっていることを示す。Hover 時にシャドウ強化。
 * - `flat`: 背景色で領域を示す（影なし）。影が不要だが明確な視覚的分離が必要な場面。
 * - `ghost`: 最小限の枠線のみ。最も静謐。
 *
 * ## クリック委譲戦略 (Robust Delegation)
 *
 * `clickable` 属性が有効な場合、カード全体のクリックを内部の主要リンク（最初の `<a href>`）へ
 * 委譲します。以下の条件では委譲をキャンセルし、ネイティブ挙動・コピー操作を阻害しません:
 *
 * - 主ボタン以外のクリック（中クリック・右クリック等）
 * - 修飾キー押下（metaKey / ctrlKey / shiftKey / altKey）- 別タブで開く等の操作を優先
 * - テキスト選択中 - コピー操作を阻害しない
 * - `<a>` / `<button>` / `[role="button"]` への直接クリック - ネイティブ挙動を優先
 *
 * ## アクセシビリティ
 *
 * - **Role**: `role="article"` がデフォルトで設定されます（属性未指定時のみ）。
 *   独立記事でない場合は `role="section"` や `role="none"` を明示してください。
 * - **Focusable Container Anti-pattern の回避**: カード自体はフォーカス対象外。
 *   内部リンク・ボタンにフォーカスを当てる構造を採用します。
 * - **視覚的フォーカスリング**: CSS `:focus-within` によりカード全体にフォーカスリングを描画。
 *   「クリック可能な領域＝フォーカス領域」のメンタルモデルを一致させます。
 * - **Flush Content**: カバー画像等をパディングなしで配置する場合、画像に
 *   `border-radius: inherit` を指定し、カードの角丸に従わせてください。
 *
 * @slot header - カードヘッダー
 * @slot - カードコンテンツ（デフォルトスロット）
 * @slot footer - カードフッター
 *
 * @property {'outlined'|'elevated'|'flat'|'ghost'} variant - 外観スタイル（デフォルト: 'outlined'）
 * @property {boolean} clickable - クリック可能モード（ホバーエフェクト + クリック委譲を有効化）
 *
 * @cssprop --space-4 - カードのパディング（デフォルト: 1rem）
 * @cssprop --radius-md - カードの角丸（デフォルト: 6px）
 * @cssprop --border-width - 枠線の太さ
 * @cssprop --border-default - outlined バリアントの枠線色
 * @cssprop --border-muted - outlined hover 時の枠線色
 * @cssprop --border-ghost - ghost バリアントの枠線色
 * @cssprop --bg-surface-1 - outlined hover 時の背景色
 * @cssprop --bg-surface-2 - elevated バリアントの背景色
 * @cssprop --bg-fill-muted - flat バリアントの背景色
 * @cssprop --elevation-md - elevated バリアントのシャドウ
 * @cssprop --elevation-lg - hover 時の浮上シャドウ
 * @cssprop --scale-hover-sm - hover 時のスケール（デフォルト: 1.02）
 * @cssprop --duration-normal - トランジション時間
 * @cssprop --ease-out - イージング関数
 * @cssprop --focus-ring-width - フォーカスリングの太さ
 * @cssprop --focus-ring-color - フォーカスリングの色
 * @cssprop --focus-ring-offset - フォーカスリングのオフセット
 * @cssprop --animation-focus - フォーカスリングのアニメーション
 */
@customElement('ui-card')
export class Card extends LitElement {
  static override styles = css`
    /* ────────────────────────────────────────────
       ホスト（カード本体）
       Outlined スタイルをデフォルトとして定義。他バリアントは上書きで対応。
    ──────────────────────────────────────────── */
    :host {
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-md, 6px);
      padding: var(--space-4, 1rem);
      position: relative;

      /* Outlined デフォルトスタイル */
      border: var(--border-width, 1px) solid var(--border-default);
      background: transparent;
      box-shadow: none;

      /* トランジション対象に background-color を含めることで
         Outlined Hover 時の背景変化を滑らかにする。
         border-color は linear でシャープに変化させる。 */
      transition:
        transform var(--duration-normal, 150ms) var(--ease-out),
        background-color var(--duration-normal, 150ms) var(--ease-out),
        box-shadow var(--duration-normal, 150ms) var(--ease-out),
        border-color var(--duration-normal, 150ms) linear,
        outline-color var(--duration-normal, 150ms) var(--ease-out);
    }

    /* ────────────────────────────────────────────
       バリアント: Elevated
       Note: Dark モードでも枠線は引かず、
       inset shadow (Edge Highlight) のみで階層を表現。
    ──────────────────────────────────────────── */
    :host([variant='elevated']) {
      border: none;
      background: var(--bg-surface-2);
      box-shadow: var(--elevation-md), inset 0 1px 0 0 oklch(100% 0 0 / 0.1);
    }

    /* ────────────────────────────────────────────
       バリアント: Flat（Filled）
       影なしで領域を明示。bg-fill-muted を使用（bg-surface-2 ではない）。
    ──────────────────────────────────────────── */
    :host([variant='flat']) {
      border: none;
      background: var(--bg-fill-muted);
      box-shadow: none;
    }

    /* ────────────────────────────────────────────
       バリアント: Ghost
       最小限の枠線のみ。最も静謐な表現。
    ──────────────────────────────────────────── */
    :host([variant='ghost']) {
      border: var(--border-width, 1px) solid var(--border-ghost);
      background: transparent;
      box-shadow: none;
    }

    /* ────────────────────────────────────────────
       Clickable: カーソルとインタラクション
    ──────────────────────────────────────────── */
    :host([clickable]) {
      cursor: pointer;
    }

    /* Hover & :focus-within 共通: Scale（Tactility） */
    :host([clickable]:hover),
    :host([clickable]:focus-within) {
      transform: scale(var(--scale-hover-sm, 1.02));
    }

    /* フォーカスリング: 内部要素にフォーカスがある時、カード全体に描画する。
       これにより「クリック可能な領域＝フォーカス領域」のメンタルモデルが一致する。 */
    :host([clickable]:focus-within) {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus);
    }

    /* ────────────────────────────────────────────
       State Mutation: Outlined クリッカブル Hover
       「枠」から「物体（面）」へ。背景不透明化・Shadow 獲得・枠線が光に溶け込む。
    ──────────────────────────────────────────── */
    :host([clickable][variant='outlined']:hover),
    :host([clickable][variant='outlined']:focus-within) {
      background: var(--bg-surface-1);
      box-shadow: var(--elevation-lg);
      border-color: var(--border-muted);
    }

    /* ────────────────────────────────────────────
       State Mutation: Elevated クリッカブル Hover
       Shadow が elevation-md から elevation-lg へ強化。
    ──────────────────────────────────────────── */
    :host([clickable][variant='elevated']:hover),
    :host([clickable][variant='elevated']:focus-within) {
      box-shadow: var(--elevation-lg), inset 0 1px 0 0 oklch(100% 0 0 / 0.1);
    }

    /* ────────────────────────────────────────────
       Reduced Motion
       transform を無効化し、色変化のみを即時適用。
    ──────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      :host {
        transition-duration: var(--duration-instant, 0ms);
      }

      :host([clickable]:hover),
      :host([clickable]:focus-within) {
        transform: none;
      }
    }

    /* ────────────────────────────────────────────
       Forced Colors Mode
       シャドウ・背景が消失する環境でも構造を維持するため境界線を強制付与。
    ──────────────────────────────────────────── */
    @media (forced-colors: active) {
      :host {
        border: var(--border-width, 1px) solid CanvasText !important;
      }

      :host([clickable]:hover),
      :host([clickable]:focus-within) {
        outline: 2px solid Highlight;
        outline-offset: -2px;
      }
    }

    /* ────────────────────────────────────────────
       Print
       シャドウと背景色を除去しインク効率・可読性を優先。
       break-inside: avoid でカードのページ分割を防止。
    ──────────────────────────────────────────── */
    @media print {
      :host {
        box-shadow: none !important;
        background: transparent !important;
        break-inside: avoid;
      }

      :host([variant='elevated']),
      :host([variant='flat']) {
        border: 1px solid #000 !important;
      }

      :host([variant='outlined']),
      :host([variant='ghost']) {
        border-color: #000 !important;
      }
    }
  `;

  /**
   * カードの外観スタイルを決定するバリアント。
   * - `outlined` (デフォルト): 枠線で輪郭。Hover で浮上（shadow + 背景）
   * - `elevated`: 影で浮き上がりを表現。Hover でシャドウ強化
   * - `flat`: 背景色で領域を示す（影なし）
   * - `ghost`: 最小限の枠線のみ（最も静謐）
   */
  @property({ type: String, reflect: true })
  variant: CardVariant = 'outlined';

  /**
   * `true` の場合、以下を有効化:
   * - `cursor: pointer`
   * - Hover 時の Scale（Tactility）と各バリアントの State Mutation
   * - `focus-within` 時のカード全体へのフォーカスリング描画
   * - カード全体クリックの内部主要リンクへの委譲
   */
  @property({ type: Boolean, reflect: true })
  clickable = false;

  /**
   * クリックイベントの経路上にインタラクティブ要素が含まれるか判定。
   * Shadow DOM 内要素も `composedPath()` で判定する。
   */
  private _isInteractiveTarget(event: Event): boolean {
    const path = event.composedPath();
    for (const node of path) {
      if (!(node instanceof HTMLElement)) continue;
      if (
        node.matches(
          'a, button, input, textarea, select, [role="button"], [contenteditable="true"]',
        )
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * クリックイベントの委譲ハンドラ。
   * カード全体のクリックを内部の最初の `<a href>` へ委譲します。
   * 以下の条件では委譲をキャンセルします:
   * - 主ボタン以外（中クリック・右クリック等）
   * - 修飾キー押下（metaKey / ctrlKey / shiftKey / altKey）
   * - テキスト選択中（コピー操作を阻害しない）
   * - `<a>` / `<button>` / `[role="button"]` への直接クリック
   */
  private readonly _handleClick = (e: MouseEvent): void => {
    if (!this.clickable) return;

    // 主ボタン（左クリック）のみ委譲
    if (e.button !== 0) return;

    // 修飾キー押下時はブラウザのネイティブ操作を優先（別タブで開く等）
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // テキスト選択中は委譲しない（コピー操作を阻害しない）
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;

    // インタラクティブ要素への直接クリックは委譲しない
    if (this._isInteractiveTarget(e)) return;

    // ライト DOM から主要リンクを検索して委譲
    const primaryLink = this.querySelector<HTMLAnchorElement>('a[href]');
    if (primaryLink) {
      e.preventDefault();
      primaryLink.click();
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    // role が未指定の場合のみ article を自動設定（上書きを阻害しない）
    if (!this.getAttribute('role')) {
      this.setAttribute('role', 'article');
    }
    this.addEventListener('click', this._handleClick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleClick);
  }

  override render() {
    return html`
      <slot name="header"></slot>
      <slot></slot>
      <slot name="footer"></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-card': Card;
  }
}
