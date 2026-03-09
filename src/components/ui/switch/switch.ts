import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * トグルスイッチ (Toggle Switch) コンポーネント
 *
 * 設定の「即時反映（Instant Reflection）」を司るメタファーです。
 * 保存操作を待たず、システムの状態をダイレクトに変更します。
 *
 * ## デザイン哲学
 *
 * - **静かな状態遷移**: 状態変化はサム位置と淡いトラック差分で示し、
 *   読書体験を邪魔しない抑制的なコントラストに保ちます。
 * - **フォーム非依存**: `name` / `required` / `value` は非対応。状態管理は親で行います。
 *
 * ## キーボード操作
 *
 * - **Space**: トグル操作。
 * - **Enter**: トグル操作（フォーム送信はブロック）。
 *
 * @property {boolean} checked  - ON/OFF 状態
 * @property {string}  label    - スイッチのラベル（aria-labelledby で関連付け）
 * @property {boolean} disabled - 操作無効化
 *
 * @fires change - ユーザー操作によって状態が変化した後に発火
 * @fires input  - change と同タイミングで発火（リアルタイム監視用）
 *
 * @cssprop --switch-thumb-size     - Thumb サイズ (16px)
 * @cssprop --switch-track-padding  - Thumb とトラック境界の余白 (4px)
 * @cssprop --switch-track-height   - トラック高さ (24px)
 * @cssprop --switch-track-width    - トラック幅 (42px)
 * @cssprop --switch-thumb-pos-off  - Thumb OFF 位置 (3px)
 * @cssprop --switch-thumb-pos-on   - Thumb ON 位置 (21px)
 * @cssprop --primary               - ON 時のアクセント色
 * @cssprop --primary-hover         - ON + Hover 時のアクセント色
 * @cssprop --bg-fill-muted         - OFF 時のトラック色
 * @cssprop --border-muted          - OFF 時のトラック境界色
 * @cssprop --border-default        - Hover 時のトラック境界色
 * @cssprop --fg-muted              - 無効時のラベル色
 * @cssprop --white                 - Thumb の基準色
 * @cssprop --shadow-sm             - Thumb のシャドウ
 * @cssprop --scale-pressed         - 押下時の Thumb 縮尺 (0.98)
 * @cssprop --duration-fast         - 色変化アニメーション時間 (70ms)
 * @cssprop --duration-normal       - Thumb 移動アニメーション時間 (150ms)
 * @cssprop --ease-out              - 色変化イージング
 * @cssprop --ease-spring           - Thumb 移動イージング (Overdamped Spring)
 * @cssprop --focus-ring-width      - フォーカスリング幅
 * @cssprop --focus-ring-color      - フォーカスリング色
 * @cssprop --focus-ring-offset     - フォーカスリングオフセット
 * @cssprop --control-min-touch     - 最低タッチターゲットサイズ (32px)
 * @cssprop --control-height-sm     - バウンディングボックス高さ (32px)
 * @cssprop --radius-full           - 完全な角丸 (9999px)
 * @cssprop --border-width          - ボーダー幅 (1px)
 * @cssprop --fg-default            - ラベルテキスト色
 * @cssprop --text-base             - 標準フォントサイズ (14px)
 * @cssprop --space-2               - スペーシング (8px)
 * @cssprop --line-height-normal    - 標準行間 (1.5)
 *
 * @csspart track - トラック要素（スタイリング用）
 * @csspart thumb - Thumb 要素（スタイリング用）
 * @csspart label - ラベルテキスト要素
 *
 * @example
 * ```html
 * <!-- 基本的な使用 -->
 * <ui-switch label="ダークモード"></ui-switch>
 *
 * <!-- ON 状態 -->
 * <ui-switch label="通知を受け取る" checked></ui-switch>
 *
 * <!-- 無効 -->
 * <ui-switch label="変更不可" disabled></ui-switch>
 * ```
 */
@customElement('ui-switch')
export class Switch extends LitElement {
    static override styles = css`
    /* ── コンポーネントローカルトークン ── */
    :host {
      --switch-thumb-size: 18px;
      --switch-track-padding: 4px;
      --switch-track-height: calc(var(--switch-thumb-size) + var(--switch-track-padding) * 2);
      --switch-track-width: calc(var(--switch-thumb-size) * 2 + var(--switch-track-padding) * 2);
      /* トラックの内側基準で絶対配置されるため、ボーダー幅を差し引いて視覚上の余白を揃える */
      --switch-thumb-pos-off: calc(var(--switch-track-padding) - var(--border-width, 1px));
      --switch-thumb-pos-on: calc(
        var(--switch-track-width) - var(--switch-thumb-size) - var(--switch-track-padding) -
          var(--border-width, 1px)
      );
      --switch-track-bg-off: color-mix(
        in oklch,
        var(--bg-fill-muted, oklch(96% 0 0)) 92%,
        var(--fg-default, oklch(20% 0 0)) 8%
      );
      --switch-track-bg-on: color-mix(
        in oklch,
        var(--bg-fill-muted, oklch(96% 0 0)) 62%,
        var(--fg-default, oklch(20% 0 0)) 38%
      );
      --switch-track-border-off: color-mix(
        in oklch,
        var(--border-muted, oklch(20% 0 0 / 0.06)) 72%,
        transparent
      );
      --switch-track-border-on: color-mix(
        in oklch,
        var(--fg-default, oklch(20% 0 0)) 18%,
        var(--border-default, oklch(20% 0 0 / 0.12))
      );
      --switch-track-border-hover: color-mix(
        in oklch,
        var(--border-default, oklch(20% 0 0 / 0.12)) 68%,
        transparent
      );
      --switch-focus-ring-resolved: var(
        --focus-ring-color,
        color-mix(in oklch, var(--primary, oklch(55% 0.2 250)) 58%, white)
      );
      --switch-thumb-bg-off: var(--white, oklch(100% 0 0));
      --switch-thumb-bg-on: var(--switch-thumb-bg-off);
      --switch-thumb-border-off: color-mix(
        in oklch,
        var(--border-default, oklch(20% 0 0 / 0.12)) 55%,
        white
      );
      --switch-thumb-border-on: var(--switch-thumb-border-off);
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
      min-height: var(--control-height-sm, 32px);
    }

    /* Disabled: ラベル行全体を薄く */
    :host([disabled]) .wrapper {
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ── トラック ── */
    .track {
      position: relative;
      flex-shrink: 0;
      width: var(--switch-track-width);
      height: var(--switch-track-height);
      border-radius: var(--radius-full, 9999px);
      border: var(--border-width, 1px) solid var(--switch-track-border-off);
      background-color: var(--switch-track-bg-off);
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        box-shadow var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
      box-sizing: border-box;
      box-shadow: inset 0 0 0 0.5px color-mix(in oklch, var(--switch-track-border-off) 50%, transparent);
    }

    .track::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width: var(--control-min-touch, 32px);
      min-height: var(--control-min-touch, 32px);
      pointer-events: auto;
    }

    :host([checked]) .track {
      background-color: var(--switch-track-bg-on);
      border-color: var(--switch-track-border-on);
      box-shadow: inset 0 0 0 0.5px color-mix(in oklch, var(--switch-track-border-on) 45%, transparent);
    }

    .wrapper:hover .track {
      background-color: color-mix(in oklch, var(--switch-track-bg-off) 96%, var(--fg-default, oklch(20% 0 0)) 4%);
      border-color: var(--switch-track-border-hover);
      box-shadow: inset 0 0 0 0.5px
        color-mix(in oklch, var(--switch-track-border-hover) 55%, transparent);
    }

    :host([checked]) .wrapper:hover .track {
      background-color: color-mix(
        in oklch,
        var(--switch-track-bg-on) 92%,
        var(--fg-default, oklch(20% 0 0)) 8%
      );
      border-color: color-mix(
        in oklch,
        var(--switch-track-border-on) 88%,
        var(--fg-default, oklch(20% 0 0)) 12%
      );
    }

    .track:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--switch-focus-ring-resolved);
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--radius-full, 9999px);
    }

    /* ── Thumb (Knob) ── */
    .thumb {
      position: absolute;
      top: 50%;
      left: 0;
      box-sizing: border-box;
      width: var(--switch-thumb-size);
      height: var(--switch-thumb-size);
      border-radius: var(--radius-full, 9999px);
      border: 1px solid var(--switch-thumb-border-off);
      background-color: var(--switch-thumb-bg-off);
      box-shadow:
        0 1px 2px oklch(0% 0 0 / 0.06),
        0 0 0 0.5px oklch(100% 0 0 / 0.72);
      transform: translateX(var(--switch-thumb-pos-off)) translateY(-50%);
      transition:
        transform var(--duration-normal, 150ms)
          var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        box-shadow var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host([checked]) .thumb {
      background-color: var(--switch-thumb-bg-on);
      border-color: var(--switch-thumb-border-on);
      transform: translateX(var(--switch-thumb-pos-on)) translateY(-50%);
    }

    .wrapper:active .thumb {
      transform: translateX(var(--switch-thumb-pos-off)) translateY(-50%) scaleX(1.03)
        scaleY(0.99);
    }

    :host([checked]) .wrapper:active .thumb {
      transform: translateX(var(--switch-thumb-pos-on)) translateY(-50%) scaleX(1.03)
        scaleY(0.99);
    }

    :host([disabled]) .track {
      background-color: color-mix(in oklch, var(--switch-track-bg-off) 95%, white);
      border-color: color-mix(in oklch, var(--switch-track-border-off) 56%, transparent);
      box-shadow: none;
    }

    :host([disabled][checked]) .track {
      background-color: color-mix(in oklch, var(--switch-track-bg-on) 88%, white);
      border-color: color-mix(in oklch, var(--switch-track-border-on) 72%, transparent);
    }

    :host([disabled]) .wrapper:hover .track {
      background-color: color-mix(in oklch, var(--switch-track-bg-off) 95%, white);
      border-color: color-mix(in oklch, var(--switch-track-border-off) 56%, transparent);
      box-shadow: none;
    }

    :host([disabled][checked]) .wrapper:hover .track {
      background-color: color-mix(in oklch, var(--switch-track-bg-on) 88%, white);
      border-color: color-mix(in oklch, var(--switch-track-border-on) 72%, transparent);
      box-shadow: none;
    }

    :host([disabled]) .thumb {
      box-shadow: none;
      border-color: color-mix(in oklch, var(--switch-thumb-border-off) 70%, transparent);
    }

    :host([disabled][checked]) .thumb {
      background-color: color-mix(in oklch, var(--switch-thumb-bg-off) 97%, var(--primary, oklch(55% 0.2 250)) 3%);
      border-color: color-mix(in oklch, var(--primary, oklch(55% 0.2 250)) 8%, transparent);
    }

    .label {
      font-size: var(--text-base, 14px);
      color: var(--fg-default, oklch(20% 0 0));
      line-height: var(--line-height-normal, 1.5);
    }

    :host([disabled]) .label {
      color: var(--fg-muted, oklch(52% 0 0));
    }

    @media (prefers-reduced-motion: reduce) {
      .track,
      .thumb {
        transition-duration: 0.01ms;
      }
    }

    @media (forced-colors: active) {
      .track {
        border: 1px solid CanvasText;
        background: Canvas;
        box-shadow: none;
      }

      .thumb {
        background: CanvasText;
        border-color: CanvasText;
      }

      :host([checked]) .track {
        background: Canvas;
        border-color: Highlight;
      }

      :host([checked]) .thumb {
        background: Highlight;
        border-color: Highlight;
      }

      .track:focus-visible {
        outline: 3px solid CanvasText;
        box-shadow: none;
      }
    }
  `;


  /**
   * ON/OFF 状態
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  checked = false;

  /**
   * スイッチのラベル。
   * 内部的に `aria-labelledby` で関連付けられ、ラベル要素全体がクリック可能領域となります。
   */
  @property({ type: String, reflect: true })
  label = '';

  /**
   * 操作無効化
   * @default false
   */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  // 一意な ID（レンダリング毎の再生成を防止）
  private readonly _labelId = `switch-label-${Math.random().toString(36).substring(2, 11)}`;

  /**
   * トグル操作。`change` / `input` イベントを発火します。
   */
  private _toggle(): void {
    if (this.disabled) return;

    this.checked = !this.checked;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  /** クリックによるトグル */
  private _handleClick = (): void => {
    this._toggle();
  };

  /**
   * キーボード操作:
   * - Space: トグル
   * - Enter: トグル（フォーム送信はブロック）
   */
  private _handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault(); // Enter によるフォーム送信をブロック
      this._toggle();
    }
  };

  /**
   * コントロールにフォーカスを当てる
   */
  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLElement>('.track')?.focus(options);
  }

  /**
   * コントロールからフォーカスを外す
   */
  override blur(): void {
    this.shadowRoot?.querySelector<HTMLElement>('.track')?.blur();
  }

  override render() {
    const hostAriaLabel = this.getAttribute('aria-label');
    const ariaLabel = this.label ? nothing : (hostAriaLabel ?? nothing);
    return html`
      <div class="wrapper">
        <span
          class="track"
          part="track"
          role="switch"
          aria-checked="${String(this.checked)}"
          aria-disabled="${this.disabled ? 'true' : nothing}"
          aria-labelledby="${this.label ? this._labelId : nothing}"
          aria-label="${ariaLabel}"
          tabindex="${this.disabled ? '-1' : '0'}"
          @click="${this._handleClick}"
          @keydown="${this._handleKeyDown}"
        >
          <span class="thumb" part="thumb"></span>
        </span>

        ${this.label
          ? html`<label
              id="${this._labelId}"
              class="label"
              part="label"
              @click="${this._handleClick}"
              @keydown="${this._handleKeyDown}"
              >${this.label}</label
            >`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-switch': Switch;
  }
}
