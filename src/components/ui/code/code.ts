import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * ui-code - インラインコード表示用コンポーネント
 * 
 * インラインコードのマークアップに使用される、アクセシブルでセマンティックなコンポーネント。
 * 複数のバリアントを通じて、コードの文脈（成功、警告、エラーなど）を視覚的に伝達。
 * 
 * @element ui-code
 * 
 * @slot - コードの内容（テキストノード）
 * 
 * @cssprop --code-bg - 背景色（カスタム可能）
 * @cssprop --code-text - テキスト色（カスタム可能）
 * @cssprop --code-border - ボーダー色（カスタム可能）
 * 
 * @example
 * ```html
 * <p>コマンド <ui-code>npm install</ui-code> を実行してください。</p>
 * <p>変数 <ui-code variant="primary">userName</ui-code> を使用します。</p>
 * <p>エラー: <ui-code variant="error">undefined is not a function</ui-code></p>
 * ```
 */
@customElement('ui-code')
export class UiCode extends LitElement {
  static override styles = css`
    /* =====================================================================
     * ホスト要素（ui-code）
     * ===================================================================== */
    :host {
      display: inline;
      
      /* デフォルトカラー（Light Mode） */
      --code-bg: var(--color-background-subtle);
      --code-text: var(--color-foreground);
      --code-border: var(--color-border);
    }

    /* =====================================================================
     * コードコンテナ（.code）
     * ===================================================================== */
    .code {
      display: inline;
      padding: calc(var(--space-1) / 2) var(--space-2);
      background-color: var(--code-bg);
      border: var(--border-width-1) solid var(--code-border);
      border-radius: var(--radius-sm);
      color: var(--code-text);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      letter-spacing: var(--tracking-tight);
      line-height: inherit;
      white-space: pre-wrap;
      overflow-wrap: break-word;
      
      /* Delightful Motion: テーマ切替時のトランジション */
      transition:
        background-color var(--motion-duration) var(--motion-easing),
        color var(--motion-duration) var(--motion-easing),
        border-color var(--motion-duration) var(--motion-easing);
    }

    /* =====================================================================
     * バリアント: Primary（強調）
     * ===================================================================== */
    :host([variant="primary"]) {
      --code-bg: color-mix(
        in srgb,
        var(--color-primary) 8%,
        transparent
      );
      --code-text: var(--color-primary);
      --code-border: color-mix(
        in srgb,
        var(--color-primary) 30%,
        transparent
      );
    }

    /* =====================================================================
     * バリアント: Success（成功、正しい例）
     * ===================================================================== */
    :host([variant="success"]) {
      --code-bg: color-mix(
        in srgb,
        var(--color-success) 8%,
        transparent
      );
      --code-text: var(--color-success-text);
      --code-border: color-mix(
        in srgb,
        var(--color-success) 30%,
        transparent
      );
    }

    /* =====================================================================
     * バリアント: Warning（警告、非推奨）
     * ===================================================================== */
    :host([variant="warning"]) {
      --code-bg: color-mix(
        in srgb,
        var(--color-warning) 8%,
        transparent
      );
      --code-text: var(--color-warning-text);
      --code-border: color-mix(
        in srgb,
        var(--color-warning) 30%,
        transparent
      );
    }

    /* =====================================================================
     * バリアント: Error（エラー、間違った例）
     * ===================================================================== */
    :host([variant="error"]) {
      --code-bg: color-mix(
        in srgb,
        var(--color-error) 8%,
        transparent
      );
      --code-text: var(--color-error-text);
      --code-border: color-mix(
        in srgb,
        var(--color-error) 30%,
        transparent
      );
    }

    /* =====================================================================
     * アクセシビリティ: ハイコントラストモード対応
     * prefers-contrast: more の場合、ボーダーを強調
     * ===================================================================== */
    @media (prefers-contrast: more) {
      .code {
        border-width: var(--border-width-2);
        --code-border: var(--color-border-hover);
      }
    }

    /* Windows High Contrast Mode (forced-colors) */
    @media (forced-colors: active) {
      .code {
        /* 背景色が消えるため、ボーダーで囲む */
        border: 1px solid CanvasText;
      }
    }

    /* =====================================================================
     * モーション軽減（prefers-reduced-motion）
     * アニメーションを無効化してアクセシビリティを確保
     * ===================================================================== */
    @media (prefers-reduced-motion: reduce) {
      .code {
        transition: none;
      }
    }
  `;

  /**
   * コードのバリアント（見た目の種類）
   * 
   * - `default`: 標準スタイル
   * - `primary`: 強調表示（変数名など）
   * - `success`: 成功・正しい例
   * - `warning`: 警告・非推奨
   * - `error`: エラー・間違った例
   */
  @property({ type: String, reflect: true })
  variant: 'default' | 'primary' | 'success' | 'warning' | 'error' = 'default';

  override render() {
    return html`<code class="code"><slot></slot></code>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-code': UiCode;
  }
}
