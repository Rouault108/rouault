import { LionButton } from '@lion/ui/button.js';
import { css, html, type CSSResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { srOnlyStyle } from '../../../styles/a11y.js';
import { t } from '../../../lib/i18n.js';

@customElement('ui-button')
export class UiButton extends LionButton {
  static override get styles(): CSSResult[] {
    return [
      ...super.styles,
      srOnlyStyle,
      css`
        :host {
          /* -------------------------------------------------------------
           * 基本カラー設定 (コンポーネントトークン参照)
           * ------------------------------------------------------------- */
          
          /* Default (Primary) Variables */
          --bg-default: var(--btn-primary-bg);
          --bg-hover:   var(--btn-primary-bg-hover);
          --bg-active:  var(--btn-primary-bg-active);
          
          --text-default: var(--btn-primary-text);
          --border-color: var(--btn-primary-border);
          
          /* Focus Ring Base Color */
          --outline-color: var(--color-primary);

          /* 現在適用されている変数 */
          --btn-bg: var(--bg-default);
          --btn-text: var(--text-default);
          --btn-border: var(--border-color);

          /* -------------------------------------------------------------
           * スタイル適用（デザインシステムトークン使用）
           * ------------------------------------------------------------- */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2); /* アイコンとテキストの間隔 */
          
          background-color: var(--btn-bg);
          color: var(--btn-text);
          border: 1px solid var(--btn-border);
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-4);
          
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: var(--text-base);
          line-height: var(--line-height-normal);
          font-weight: var(--font-medium);
          text-decoration: none;
          
          /* モーション（デザインシステムトークン使用） */
          transition: 
            background-color var(--motion-duration) var(--ease-out),
            color var(--motion-duration) var(--ease-out),
            border-color var(--motion-duration) var(--ease-out),
            transform var(--duration-fast) var(--ease-out),
            box-shadow var(--motion-duration) var(--ease-out),
            opacity var(--motion-duration) var(--ease-out);
        }

        /* -------------------------------------------------------------
         * 状態 (States)
         * ------------------------------------------------------------- */

        /* 2. Hover (マウスオーバー) */
        :host(:hover:not([disabled])) {
          background-color: var(--bg-hover);
          box-shadow: var(--shadow-sm);
        }

        /* 3. Focus (フォーカス) */
        :host(:focus-visible:not([disabled])) {
          outline: var(--focus-ring-width) solid var(--outline-color);
          outline-offset: var(--focus-ring-offset);
          position: relative;
        }

        /* 4. Active / Pressed (押し込み中) */
        :host(:active:not([disabled])) {
          background-color: var(--bg-active);
          transform: scale(var(--scale-active));
          box-shadow: none;
        }

        /* 5. Disabled / Inactive (無効) */
        :host([disabled]) {
          --btn-bg: var(--btn-disabled-bg);
          --btn-text: var(--btn-disabled-text);
          --btn-border: var(--btn-disabled-border);
          
          cursor: not-allowed;
          opacity: 0.8;
          transform: none;
          pointer-events: none;
        }

        /* -------------------------------------------------------------
         * バリアント (Variants)
         * ------------------------------------------------------------- */

        /* Secondary (セカンダリ) */
        :host([variant="secondary"]) {
          --bg-default: var(--btn-secondary-bg);
          --bg-hover:   var(--btn-secondary-bg-hover);
          --bg-active:  var(--btn-secondary-bg-active);
          
          --text-default: var(--btn-secondary-text);
          --border-color: var(--btn-secondary-border);
          --outline-color: var(--btn-secondary-outline);
        }

        /* Outline (アウトライン) */
        :host([variant="outline"]) {
          --bg-default: var(--btn-outline-bg);
          --bg-hover:   var(--btn-outline-bg-hover);
          --bg-active:  var(--btn-outline-bg-active);
          
          --text-default: var(--btn-outline-text);
          --border-color: var(--btn-outline-border);
        }
        
        :host([variant="outline"][disabled]) {
           background-color: transparent;
           border-color: var(--btn-disabled-text);
        }

        /* Ghost (ゴースト) - ナビゲーション用 */
        :host([variant="ghost"]) {
          --bg-default: var(--btn-ghost-bg);
          --bg-hover:   var(--btn-ghost-bg-hover);
          --bg-active:  var(--btn-ghost-bg-active);
          
          --text-default: var(--btn-ghost-text);
          --border-color: var(--btn-ghost-border);
        }

        :host([variant="ghost"]:hover:not([disabled])) {
          box-shadow: none; /* ゴーストボタンは影なし */
        }

        :host([variant="ghost"][disabled]) {
          background-color: transparent;
          border-color: transparent;
        }

        /* Danger (削除、破壊的アクション) */
        :host([variant="danger"]) {
          --bg-default: var(--btn-danger-bg);
          --bg-hover:   var(--btn-danger-bg-hover);
          --bg-active:  var(--btn-danger-bg-active);
          
          --text-default: var(--btn-danger-text);
          --border-color: var(--btn-danger-border);
          --outline-color: var(--btn-danger-outline);
        }

        /* -------------------------------------------------------------
         * Loading (読み込み中)
         * ------------------------------------------------------------- */
        :host([loading]) {
          cursor: wait;
          pointer-events: none;
          opacity: 0.8;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner {
          display: block;
          width: 1em;
          height: 1em;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .spinner {
            animation: none;
          }
          :host {
            transition-duration: 0.01ms !important;
          }
        }

        /* -------------------------------------------------------------
         * サイズ (Sizes)
         * ------------------------------------------------------------- */

        /* Small (sm) - Compact & Dense */
        :host([size="sm"]) {
          font-size: var(--text-xs);
          padding: 0 var(--space-3);
          height: 1.75rem;
          border-radius: var(--radius-sm);
        }

        /* Medium (md) - Default (High Density) */
        :host([size="md"]) {
          font-size: var(--text-base);
          padding: 0 var(--space-4);
          height: var(--space-10);
          border-radius: var(--radius-md);
        }

        /* Large (lg) - Prominent but Refined */
        :host([size="lg"]) {
          font-size: var(--text-lg);
          padding: 0 var(--space-6);
          height: var(--space-12);
          border-radius: var(--radius-lg);
        }

        /* -------------------------------------------------------------
         * 配置 (Alignment)
         * ------------------------------------------------------------- */
        :host([align="center"]) { justify-content: center; }
        :host([align="start"])  { justify-content: flex-start; }
        :host([align="between"]) { justify-content: space-between; }
          
        /* -------------------------------------------------------------
         * スロット内要素のスタイル制御 (Slots)
         * ------------------------------------------------------------- */
        
        /* アイコンの色をテキスト色に強制的に合わせる */
        ::slotted(svg) {
          fill: none;
          stroke: currentColor;
        }

        /* Prefix/Suffix アイコンのサイズ制御
         * フォントサイズ(1em)に対して少し大きめ(1.2em)にすることで視認性を確保
         * これによりボタンサイズが変わっても自動で追従する
         */
        ::slotted([slot="prefix"]),
        ::slotted([slot="suffix"]) {
          width: 1.2em;
          height: 1.2em;
          flex-shrink: 0; /* テキストが長くてもアイコンは縮まない */
        }


      `
    ];
  }

  @property({ type: String, reflect: true })
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' = 'primary';

  @property({ type: String, reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md';

  @property({ type: String, reflect: true })
  align: 'center' | 'start' | 'between' = 'center';

  @property({ type: Boolean, reflect: true })
  loading = false;

  @property({ type: String })
  loadingLabel = t('button.loading');

  public override render() {
    return html`
      ${this.loading 
        ? html`
            <span class="spinner" aria-hidden="true"></span>
            <span class="sr-only">${this.loadingLabel}</span>
          ` 
        : html`<slot name="prefix"></slot>`
      }
      <slot></slot>
      ${!this.loading ? html`<slot name="suffix"></slot>` : ''}
    `;
  }
}

