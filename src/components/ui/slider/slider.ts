import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * スライダー (Slider) コンポーネント
 *
 * 音量やサイズなど、連続的な値や「強度」の調整に使用します。
 *
 * ## デザイン哲学
 *
 * - **Tactility**: つまみ（Thumb）はユーザーの入力に対し、1:1で即座に追従（Snappiness）します。
 * - **Input-on-Top Overlay パターン**: ネイティブ `<input type="range">` を透明にして最前面に配置し、
 *   全てのユーザー操作を直接受け取らせます。視覚的なカスタムトラックとThumbは背面に配置します。
 *
 * ## Value Normalization (Deterministic Rules)
 *
 * - `min > max` の場合は値を入れ替えて正規化します。
 * - `step <= 0` または非数値は `1` にフォールバックします。
 * - `value` は `min...max` にクランプした後、最も近い有効ステップへ丸めます。
 * - 小数ステップでの浮動小数点誤差を避けるため、`step` の小数桁精度に合わせて丸めます。
 *
 * @property {number}  min      - 最小値（デフォルト: 0）
 * @property {number}  max      - 最大値（デフォルト: 100）
 * @property {number}  step     - 増減の刻み幅（デフォルト: 1）
 * @property {number}  value    - 現在の値（未指定時は min）
 * @property {string}  label    - **必須**。スクリーンリーダー用のラベル
 * @property {boolean} disabled - 無効状態
 *
 * @fires input  - ドラッグ中など、値が変化するたびに発火（連続発火）
 * @fires change - ドラッグ終了時など、値の変更が確定した時点で発火
 *
 * @slot prefix - 左端（最小値側）のアイコンやテキスト
 * @slot suffix - 右端（最大値側）のアイコンや現在値表示
 *
 * @cssprop --primary              - フィル（アクティブ部分）の色
 * @cssprop --border-default       - トラック背景色
 * @cssprop --white                - Thumb の背景色
 * @cssprop --border-width         - Thumb のボーダー幅
 * @cssprop --elevation-md         - Thumb のシャドウ
 * @cssprop --icon-base            - Thumb のサイズ (16px)
 * @cssprop --radius-full          - 完全な角丸 (9999px)
 * @cssprop --control-min-touch    - 最低タッチターゲットサイズ (44px)
 * @cssprop --focus-ring-width     - フォーカスリング幅
 * @cssprop --focus-ring-color     - フォーカスリング色
 * @cssprop --focus-ring-offset    - フォーカスリングオフセット
 * @cssprop --animation-focus      - フォーカスアニメーション
 * @cssprop --opacity-disabled     - 無効時の不透明度 (0.5)
 * @cssprop --scale-hover-lg       - Hover 時の Thumb スケール
 * @cssprop --scale-dragging       - ドラッグ中の Thumb スケール
 * @cssprop --space-2              - スペーシング (8px)
 * @cssprop --border-width-thick   - 太いボーダー幅（Forced Colors 用）
 *
 * @csspart track  - トラック要素
 * @csspart fill   - フィル（アクティブ部分）要素
 * @csspart thumb  - Thumb（つまみ）要素
 *
 * @example
 * ```html
 * <!-- 基本的な使用 -->
 * <ui-slider label="音量" value="50"></ui-slider>
 *
 * <!-- prefix/suffix スロット -->
 * <ui-slider label="明るさ" min="0" max="100" value="70">
 *   <span slot="prefix">🌑</span>
 *   <span slot="suffix">🌕</span>
 * </ui-slider>
 *
 * <!-- 無効 -->
 * <ui-slider label="変更不可" value="30" disabled></ui-slider>
 * ```
 */
@customElement('ui-slider')
export class Slider extends LitElement {
    static override styles = css`
    /* ── ホスト: flex コンテナ ── */
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      /* 内部 z-index をカプセル化 */
      isolation: isolate;
      /* スロットアイコンとスライダー本体の垂直軸を維持 */
      width: 100%;
    }

    /* ── スロット（prefix / suffix） ── */
    ::slotted(*) {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    /* suffix 内の数値表示: Jitter 防止 */
    ::slotted([slot="suffix"]) {
      font-variant-numeric: tabular-nums;
    }

    /* ── スライダー本体コンテナ ── */
    .slider-container {
      position: relative;
      flex: 1;
      /* タッチターゲット確保のため最低高さを設定 */
      height: var(--control-min-touch, 44px);
      display: flex;
      align-items: center;
    }

    /* ── トラック（ベース） ── */
    .track {
      position: relative;
      width: 100%;
      /* Track 高さ: スライダー固有の視覚的バランス（ハードコード例外） */
      height: 4px;
      background: var(--border-default, oklch(85% 0.01 250));
      border-radius: var(--radius-full, 9999px);
      /* z-index: 1 — Input (z-index: 2) の背面 */
      z-index: 1;
      pointer-events: none;
    }

    /* ── フィル（アクティブ部分） ── */
    .fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: var(--primary, oklch(60% 0.15 250));
      border-radius: var(--radius-full, 9999px);
      /* width は JS で動的に設定 */
      pointer-events: none;
    }

    /* ── Thumb（つまみ） ── */
    .thumb {
      position: absolute;
      top: 50%;
      /* left は JS で動的に設定 */
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      border-radius: var(--radius-full, 9999px);
      background: var(--white, #ffffff);
      border: var(--border-width, 1px) solid var(--border-default, oklch(85% 0.01 250));
      box-shadow: var(--elevation-md, 0 2px 8px oklch(0% 0 0 / 0.12));
      transform: translateX(-50%) translateY(-50%);
      pointer-events: none;
      transition: transform 70ms var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Thumb: Hover 時にスケールアップ */
    .slider-container:hover .thumb {
      transform: translateX(-50%) translateY(-50%) scale(var(--scale-hover-lg, 1.2));
    }

    /* Thumb: ドラッグ中（Active）にスケール変化 */
    .slider-container:has(input:active) .thumb {
      transform: translateX(-50%) translateY(-50%) scale(var(--scale-dragging, 0.9));
    }

    /* ── フォーカスリング: Proxy Style ── */
    /*
     * DOM 順序: <input> → <div class="track"> の順に配置。
     * 兄弟セレクタで input のフォーカス状態を Thumb に移譲（Proxy）。
     * NOTE: :has() を使用して input のフォーカス状態を検出します。
     */
    .slider-container:has(input:focus-visible) .thumb {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--radius-full, 9999px);
      animation: var(--animation-focus, none);
    }

    /* Reduced Motion: フォーカスアニメーションを無効化 */
    @media (prefers-reduced-motion: reduce) {
      .slider-container:has(input:focus-visible) .thumb {
        animation: none;
      }
    }

    /* ── ネイティブ input（透明・最前面） ── */
    input[type="range"] {
      /* 完全透明: 視覚的には非表示 */
      opacity: 0;
      /* 最前面: z-index: 2 */
      position: absolute;
      inset: 0;
      z-index: 2;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      cursor: pointer;
      /* ネイティブスタイルをリセット */
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
    }

    /* タッチターゲット: input 自体で 44px × 44px を確保 */
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: var(--control-min-touch, 44px);
      height: var(--control-min-touch, 44px);
    }

    input[type="range"]::-moz-range-thumb {
      width: var(--control-min-touch, 44px);
      height: var(--control-min-touch, 44px);
      border: none;
      background: transparent;
    }

    /* フォーカスアウトラインを非表示（Proxy で Thumb に移譲） */
    input[type="range"]:focus {
      outline: none;
    }

    input[type="range"]:focus-visible {
      outline: none;
    }

    /* ── Disabled 状態 ── */
    :host([disabled]) {
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
    }

    :host([disabled]) input[type="range"] {
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ── Forced Colors Mode ── */
    @media (forced-colors: active) {
      .thumb {
        /* 影が消えるため、太いボーダーで Thumb を明確化 */
        border: var(--border-width-thick, 2px) solid CanvasText;
        box-shadow: none;
      }

      .fill {
        background: Highlight;
      }

      .track {
        background: ButtonBorder;
      }
    }
  `;

    /**
     * 最小値
     * @default 0
     */
    @property({ type: Number, reflect: true })
    min = 0;

    /**
     * 最大値
     * @default 100
     */
    @property({ type: Number, reflect: true })
    max = 100;

    /**
     * 増減の刻み幅
     * @default 1
     */
    @property({ type: Number, reflect: true })
    step = 1;

    /**
     * 現在の値。未指定時は正規化後の min を採用。
     */
    @property({ type: Number, reflect: true })
    value: number | undefined = undefined;

    /**
     * スクリーンリーダー用のラベル（必須）
     */
    @property({ type: String, reflect: true })
    label = '';

    /**
     * 無効状態
     * @default false
     */
    @property({ type: Boolean, reflect: true })
    disabled = false;

    /** 正規化済みの内部値 */
    @state()
    private _normalizedValue = 0;

    /** 正規化済みの min */
    @state()
    private _normalizedMin = 0;

    /** 正規化済みの max */
    @state()
    private _normalizedMax = 100;

    /** 正規化済みの step */
    @state()
    private _normalizedStep = 1;

    // ──────────────────────────────────────────────
    // Value Normalization
    // ──────────────────────────────────────────────

    /**
     * step の小数桁数を計算します。
     * 浮動小数点誤差を避けるための精度計算に使用します。
     */
    private _getStepPrecision(step: number): number {
        const str = step.toString();
        const dotIndex = str.indexOf('.');
        return dotIndex === -1 ? 0 : str.length - dotIndex - 1;
    }

    /**
     * 値を指定精度で丸めます（浮動小数点誤差対策）。
     */
    private _roundToPrecision(value: number, precision: number): number {
        const factor = Math.pow(10, precision);
        return Math.round(value * factor) / factor;
    }

    /**
     * 全プロパティを正規化します。
     * - min > max: 入れ替え
     * - step <= 0 または非数値: 1 にフォールバック
     * - value: min...max にクランプ後、最も近い有効ステップへ丸め
     */
    private _normalize(): void {
        // min / max の正規化
        let normalizedMin = isFinite(this.min) ? this.min : 0;
        let normalizedMax = isFinite(this.max) ? this.max : 100;

        if (normalizedMin > normalizedMax) {
            [normalizedMin, normalizedMax] = [normalizedMax, normalizedMin];
        }

        // step の正規化
        const normalizedStep =
            typeof this.step === 'number' && isFinite(this.step) && this.step > 0
                ? this.step
                : 1;

        const precision = this._getStepPrecision(normalizedStep);

        // value の正規化
        const rawValue = this.value ?? normalizedMin;
        // クランプ
        const clamped = Math.min(Math.max(rawValue, normalizedMin), normalizedMax);
        // 最も近い有効ステップへ丸め（min 基準）
        const stepsFromMin = Math.round((clamped - normalizedMin) / normalizedStep);
        const snapped = normalizedMin + stepsFromMin * normalizedStep;
        // 精度で丸め（浮動小数点誤差対策）
        const normalizedValue = this._roundToPrecision(
            Math.min(Math.max(snapped, normalizedMin), normalizedMax),
            precision,
        );

        this._normalizedMin = normalizedMin;
        this._normalizedMax = normalizedMax;
        this._normalizedStep = normalizedStep;
        this._normalizedValue = normalizedValue;
    }

    /**
     * フィルとThumbの位置を計算するパーセンテージ（0〜100）。
     */
    private get _fillPercent(): number {
        const range = this._normalizedMax - this._normalizedMin;
        if (range === 0) return 0;
        return ((this._normalizedValue - this._normalizedMin) / range) * 100;
    }

    // ──────────────────────────────────────────────
    // Lifecycle
    // ──────────────────────────────────────────────

    override willUpdate(changedProperties: PropertyValues<this>): void {
        super.willUpdate(changedProperties);

        if (
            changedProperties.has('min') ||
            changedProperties.has('max') ||
            changedProperties.has('step') ||
            changedProperties.has('value')
        ) {
            this._normalize();
        }
    }

    // ──────────────────────────────────────────────
    // Event Handlers
    // ──────────────────────────────────────────────

    /** input イベント: 値が変化するたびに発火（連続発火） */
    private _handleInput = (e: Event): void => {
        if (this.disabled) return;

        const input = e.target as HTMLInputElement;
        const rawValue = parseFloat(input.value);
        const precision = this._getStepPrecision(this._normalizedStep);
        this._normalizedValue = this._roundToPrecision(rawValue, precision);
        this.value = this._normalizedValue;

        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    };

    /** change イベント: 値の変更が確定した時点で発火 */
    private _handleChange = (): void => {
        if (this.disabled) return;
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    };

    // ──────────────────────────────────────────────
    // Public API
    // ──────────────────────────────────────────────

    /**
     * input 要素にフォーカスを当てます。
     */
    override focus(options?: FocusOptions): void {
        this.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]')?.focus(options);
    }

    /**
     * input 要素からフォーカスを外します。
     */
    override blur(): void {
        this.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]')?.blur();
    }

    // ──────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────

    override render() {
        const fillPercent = this._fillPercent;
        // Thumb の left 位置: Thumb 幅の半分（8px）を考慮してオフセット
        // CSS では transform: translateX(-50%) で中央合わせするため、left = fillPercent%
        const thumbLeft = `${String(fillPercent)}%`;
        const fillWidth = `${String(fillPercent)}%`;

        return html`
      <!-- prefix スロット: 左端アイコン -->
      <slot name="prefix"></slot>

      <!-- スライダー本体 -->
      <div class="slider-container">
        <!--
          ネイティブ input: 透明・最前面（z-index: 2）
          全てのユーザー操作（クリック・ドラッグ・キーボード）を直接受け取る。
          DOM 順序: input → .track の順（:has() セレクタのため）
        -->
        <input
          type="range"
          .value="${String(this._normalizedValue)}"
          min="${this._normalizedMin}"
          max="${this._normalizedMax}"
          step="${this._normalizedStep}"
          ?disabled="${this.disabled}"
          aria-label="${this.label || nothing}"
          aria-valuemin="${this._normalizedMin}"
          aria-valuemax="${this._normalizedMax}"
          aria-valuenow="${this._normalizedValue}"
          aria-disabled="${this.disabled ? 'true' : nothing}"
          @input="${this._handleInput}"
          @change="${this._handleChange}"
        />

        <!-- カスタムトラック: 背面（z-index: 1, pointer-events: none） -->
        <div class="track" part="track">
          <!-- フィル（アクティブ部分） -->
          <div
            class="fill"
            part="fill"
            style="width: ${fillWidth}"
          ></div>

          <!-- Thumb（つまみ） -->
          <div
            class="thumb"
            part="thumb"
            style="left: ${thumbLeft}"
          ></div>
        </div>
      </div>

      <!-- suffix スロット: 右端アイコン・現在値表示 -->
      <slot name="suffix"></slot>
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ui-slider': Slider;
    }
}
