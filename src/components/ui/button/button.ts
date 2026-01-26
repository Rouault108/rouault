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
           * 基本カラー設定 & 変数定義
           * ------------------------------------------------------------- */
          --btn-h: var(--color-primary-hue, 220);
          --btn-s: var(--color-primary-sat, 90%);
          --btn-l: var(--color-primary-lightness, 55%);
          
          /* 状態ごとの色 (デフォルト) - Primary */
          --bg-default: hsl(var(--btn-h) var(--btn-s) var(--btn-l));
          --bg-hover:   hsl(var(--btn-h) var(--btn-s) calc(var(--btn-l) - 5%));
          --bg-active:  hsl(var(--btn-h) var(--btn-s) calc(var(--btn-l) - 10%));
          
          --text-default: var(--color-background); /* Light: White, Dark: Black */
          --text-disabled: hsl(220, 10%, 60%);
          
          --border-color: transparent;
          --outline-color: hsl(var(--btn-h), var(--btn-s), calc(var(--btn-l) + 10%));

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
          gap: var(--space-2, 0.5rem); /* アイコンとテキストの間隔 */
          
          background-color: var(--btn-bg);
          color: var(--btn-text);
          border: 1px solid var(--btn-border);
          border-radius: var(--radius-md, 6px); /* デザインシステムトークン */
          padding: var(--space-2, 0.5rem) var(--space-4, 1rem); /* 8px 16px */
          
          cursor: pointer;
          font-family: var(--font-sans, inherit);
          font-size: var(--text-base, 0.875rem); /* 14px */
          line-height: var(--line-height-normal, 1.5);
          font-weight: var(--font-medium, 500);
          text-decoration: none;
          
          /* モーション（デザインシステムトークン使用） */
          transition: 
            background-color var(--motion-duration, 200ms) var(--ease-out, ease-out),
            color var(--motion-duration, 200ms) var(--ease-out, ease-out),
            border-color var(--motion-duration, 200ms) var(--ease-out, ease-out),
            transform var(--duration-fast, 100ms) var(--ease-out, ease-out),
            box-shadow var(--motion-duration, 200ms) var(--ease-out, ease-out),
            opacity var(--motion-duration, 200ms) var(--ease-out, ease-out);
        }

        /* -------------------------------------------------------------
         * 状態 (States)
         * ------------------------------------------------------------- */

        /* 2. Hover (マウスオーバー) */
        :host(:hover:not([disabled])) {
          background-color: var(--bg-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1)); /* デザインシステムトークン */
          z-index: var(--z-base, 1);
        }

        /* 3. Focus (フォーカス) */
        :host(:focus:not([disabled])),
        :host(:focus-visible:not([disabled])) {
          outline: 2px solid var(--outline-color);
          outline-offset: 2px; /* デザインシステム推奨値 */
          position: relative;
          z-index: calc(var(--z-base, 0) + 2);
        }

        /* 4. Active / Pressed (押し込み中) */
        :host(:active:not([disabled])) {
          background-color: var(--bg-active);
          transform: translateY(0);
          box-shadow: none;
        }

        /* 5-6. Disabled / Inactive (無効) */
        :host([disabled]) {
          --btn-bg: var(--color-disabled-bg);
          --btn-text: var(--color-disabled-text);
          --btn-border: var(--color-disabled-border);
          
          background-color: var(--btn-bg);
          color: var(--btn-text);
          border-color: var(--btn-border);
          
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
          --btn-h: var(--color-secondary-hue);
          --btn-s: var(--color-secondary-sat);
          --btn-l: var(--color-secondary-lightness);
          
          --bg-default: hsl(var(--btn-h) var(--btn-s) var(--btn-l));
          --bg-hover:   hsl(var(--btn-h) var(--btn-s) 40%);
          --bg-active:  hsl(var(--btn-h) var(--btn-s) 35%);
          
          --outline-color: hsl(var(--btn-h) var(--btn-s) 60%);
        }

        /* Outline (アウトライン) */
        :host([variant="outline"]) {
          --bg-default: transparent;
          --bg-hover:   hsla(var(--btn-h), var(--btn-s), var(--btn-l), 0.1);
          --bg-active:  hsla(var(--btn-h), var(--btn-s), var(--btn-l), 0.2);
          
          --text-default: hsl(var(--btn-h), var(--btn-s), var(--btn-l));
          --border-color: hsl(var(--btn-h), var(--btn-s), var(--btn-l));
        }
        
        :host([variant="outline"][disabled]) {
           background-color: transparent;
           border-color: var(--text-disabled);
        }

        /* Ghost (ゴースト) - ナビゲーション用 */
        :host([variant="ghost"]) {
          --bg-default: transparent;
          --bg-hover:   hsla(var(--btn-h), var(--btn-s), var(--btn-l), 0.08);
          --bg-active:  hsla(var(--btn-h), var(--btn-s), var(--btn-l), 0.15);
          
          --text-default: hsl(var(--btn-h), var(--btn-s), var(--btn-l));
          --border-color: transparent;
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
          --btn-h: var(--color-error-hue);
          --btn-s: var(--color-error-sat);
          --btn-l: var(--color-error-lightness);
          
          --bg-default: hsl(var(--btn-h) var(--btn-s) var(--btn-l));
          --bg-hover:   hsl(var(--btn-h) var(--btn-s) calc(var(--btn-l) - 5%));
          --bg-active:  hsl(var(--btn-h) var(--btn-s) calc(var(--btn-l) - 10%));
          
          --text-default: var(--color-background);
          --outline-color: hsl(var(--btn-h) var(--btn-s) calc(var(--btn-l) + 10%));
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
          font-size: var(--text-xs, 0.75rem); /* 12px */
          padding: 0 var(--space-3, 0.75rem);
          height: 1.75rem; /* 28px */
          border-radius: var(--radius-sm, 4px);
        }

        /* Medium (md) - Default (High Density) */
        :host([size="md"]) {
          font-size: var(--text-base, 0.875rem); /* 14px */
          padding: 0 var(--space-4, 1rem);
          height: var(--space-10, 2.5rem); /* 40px */
          border-radius: var(--radius-md, 6px);
        }

        /* Large (lg) - Prominent but Refined */
        :host([size="lg"]) {
          font-size: var(--text-lg, 1rem); /* 16px */
          padding: 0 var(--space-6, 1.5rem);
          height: var(--space-12, 3rem); /* 48px */
          border-radius: var(--radius-lg, 8px);
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

        /* -------------------------------------------------------------
         * ダークモード対応
         * Elevation Tones に基づく背景色とコントラスト改善
         * ------------------------------------------------------------- */
        
        /* OS設定によるダークモード */
        @media (prefers-color-scheme: dark) {
          :host {
            --text-default: var(--color-foreground, #ededed);
          }

          :host([variant="secondary"]) {
            --bg-default: var(--bg-surface-1, #171717);
            --bg-hover: var(--bg-surface-2, #262626);
            --bg-active: var(--bg-surface-3, #404040);
            --text-default: var(--color-foreground, #ededed);
            --border-color: var(--color-border, #27272a);
          }

          :host([variant="outline"]) {
            --bg-hover: hsla(var(--btn-h), 60%, 50%, 0.15);
            --bg-active: hsla(var(--btn-h), 60%, 50%, 0.25);
            --text-default: var(--color-primary, #60a5fa);
            --border-color: var(--color-primary, #60a5fa);
          }

          :host([variant="ghost"]) {
            --bg-hover: var(--bg-surface-1, #171717);
            --bg-active: var(--bg-surface-2, #262626);
            --text-default: var(--color-foreground, #ededed);
          }

          :host([disabled]) {
            --btn-bg: var(--bg-surface-1, #171717);
            --btn-text: var(--color-foreground-muted, #a1a1aa);
          }
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

