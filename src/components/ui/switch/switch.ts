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
 * - **Digital Tactility**: 0から1へのデジタルな状態遷移を、Springアニメーション
 *   (`--ease-spring`) を用いて「即時かつ滑らか」に表現します。
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
 * @cssprop --switch-track-padding  - Thumb とトラック境界の余白 (2px)
 * @cssprop --switch-track-height   - トラック高さ (20px)
 * @cssprop --switch-track-width    - トラック幅 (36px)
 * @cssprop --switch-thumb-pos-off  - Thumb OFF 位置 (2px)
 * @cssprop --switch-thumb-pos-on   - Thumb ON 位置 (18px)
 * @cssprop --primary               - ON 時のトラック色
 * @cssprop --primary-hover         - ON + Hover 時のトラック色
 * @cssprop --bg-fill-muted         - OFF 時のトラック色
 * @cssprop --white                 - Thumb の色
 * @cssprop --shadow-sm             - Thumb のシャドウ
 * @cssprop --opacity-disabled      - 無効時の不透明度 (0.5)
 * @cssprop --scale-pressed         - 押下時の Thumb スケール (0.96)
 * @cssprop --duration-fast         - 色変化アニメーション時間 (70ms)
 * @cssprop --duration-normal       - Thumb 移動アニメーション時間 (150ms)
 * @cssprop --ease-out              - 色変化イージング
 * @cssprop --ease-spring           - Thumb 移動イージング (Overdamped Spring)
 * @cssprop --focus-ring-width      - フォーカスリング幅
 * @cssprop --focus-ring-color      - フォーカスリング色
 * @cssprop --focus-ring-offset     - フォーカスリングオフセット
 * @cssprop --control-min-touch     - 最低タッチターゲットサイズ (24px)
 * @cssprop --control-height-sm     - バウンディングボックス高さ (24px)
 * @cssprop --radius-full           - 完全な角丸 (9999px)
 * @cssprop --border-width-thick    - 太いボーダー幅 (2px)
 * @cssprop --border-transparent    - 透明ボーダー
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
      /* Thumb サイズ: アイコンサイズ (16px) と統一 */
      --switch-thumb-size: var(--icon-base, 16px);
      /* Thumb とトラック境界の余白: 太いボーダー幅 (2px) */
      --switch-track-padding: var(--border-width-thick, 2px);
      /* トラック高さ: 16px + 2px × 2 = 20px */
      --switch-track-height: calc(
        var(--switch-thumb-size) + var(--switch-track-padding) * 2
      );
      /* トラック幅: 16px × 2 + 2px × 2 = 36px */
      --switch-track-width: calc(
        var(--switch-thumb-size) * 2 + var(--switch-track-padding) * 2
      );
      /* Thumb OFF 位置: 左端の余白 (2px) */
      --switch-thumb-pos-off: var(--switch-track-padding);
      /* Thumb ON 位置: 36px - 16px - 2px = 18px */
      --switch-thumb-pos-on: calc(
        var(--switch-track-width) - var(--switch-thumb-size) - var(--switch-track-padding)
      );

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
      /* バウンディングボックス高さ: システムグリッドに準拠 (24px) */
      min-height: var(--control-height-sm, 24px);
    }

    /* Disabled: ラベル行全体を薄く */
    :host([disabled]) .wrapper {
      opacity: var(--opacity-disabled, 0.5);
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
      /* High Contrast Mode 用のフックとして領域確保 */
      border: var(--border-width-thick, 2px) solid var(--border-transparent, transparent);
      background-color: var(--bg-fill-muted, oklch(93% 0 0));
      transition: background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
      box-sizing: border-box;
    }

    /* Touch Target: ::after で最低 44×44px を確保（単体使用時） */
    .track::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width: var(--control-min-touch, 24px);
      min-height: var(--control-min-touch, 24px);
      pointer-events: auto;
    }

    /* ON 状態: トラック色を primary に */
    :host([checked]) .track {
      background-color: var(--primary, oklch(60% 0.15 250));
    }

    /* Hover (OFF) */
    .wrapper:hover .track {
      background-color: oklch(from var(--bg-fill-muted, oklch(93% 0 0)) calc(l - 3%) c h);
    }

    /* Hover (ON) */
    :host([checked]) .wrapper:hover .track {
      background-color: var(--primary-hover, oklch(55% 0.15 250));
    }

    /* フォーカスリング: トラック形状に合わせて radius-full */
    .track:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--radius-full, 9999px);
    }

    /* ── Thumb (Knob) ── */
    .thumb {
      position: absolute;
      top: 50%;
      left: 0;
      width: var(--switch-thumb-size);
      height: var(--switch-thumb-size);
      border-radius: var(--radius-full, 9999px);
      /* Dark Mode でも白を維持し、トラック色でコントラストを確保 */
      background-color: var(--white, #ffffff);
      box-shadow: var(--shadow-sm, 0 1px 3px oklch(0% 0 0 / 0.15));
      /* OFF 位置: translateX(2px) + translateY(-50%) で垂直中央 */
      transform: translateX(var(--switch-thumb-pos-off)) translateY(-50%);
      /* Springアニメーション: 余韻やバウンスを排除し、指の動きに吸い付く追従性 */
      transition: transform var(--duration-normal, 150ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
    }

    /* ON 状態: Thumb を右端へ */
    :host([checked]) .thumb {
      transform: translateX(var(--switch-thumb-pos-on)) translateY(-50%);
    }

    /* Active (押下中): Thumb にスケールを追加 — 触覚的フィードバック */
    .wrapper:active .thumb {
      transform: translateX(var(--switch-thumb-pos-off)) translateY(-50%) scale(var(--scale-pressed, 0.96));
    }

    :host([checked]) .wrapper:active .thumb {
      transform: translateX(var(--switch-thumb-pos-on)) translateY(-50%) scale(var(--scale-pressed, 0.96));
    }

    /* ── ラベルテキスト ── */
    .label {
      font-size: var(--text-base, 14px);
      color: var(--fg-default, oklch(20% 0.01 250));
      line-height: var(--line-height-normal, 1.5);
    }

    /* ── Forced Colors Mode ── */
    @media (forced-colors: active) {
      .track {
        /* 境界を強制表示し、スイッチ領域を明確化 */
        border: var(--border-width-thick, 2px) solid CanvasText;
      }

      .thumb {
        /* OFF 状態: CanvasText で Thumb を表示 */
        background: CanvasText;
      }

      :host([checked]) .thumb {
        /* ON 状態: Highlight で Thumb を表示（位置変化が主要シグナル） */
        background: Highlight;
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
        <!--
          Track: role="switch" でキーボードフォーカスを受け取る。
          ラベルが存在する場合は aria-labelledby で関連付け。
        -->
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

        <!-- ラベル: クリックでトグル -->
        ${this.label
                ? html`<label
              id="${this._labelId}"
              class="label"
              part="label"
              @click="${this._handleClick}"
              @keydown="${this._handleKeyDown}"
            >${this.label}</label>`
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
