import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * バッジ (Badge) コンポーネント `<ui-badge>`
 *
 * UIの一部として、数値（件数）やステータス（New, Draft）などのシステム的な「状態」を通知します。
 * カプセル型（Pill Shape）を採用し、ユーザー定義の分類である「タグ（矩形）」と形状レベルで区別します。
 *
 * ## コンテンツ優先ロジック
 *
 * - `count` が `number` の場合: スロット内容は無視され、数値のみが表示されます。
 * - `count` が `null` / `undefined` かつ `variant !== "dot"`: スロット内容が表示されます。
 * - `variant === "dot"`: `count` およびスロット内容は物理的にレンダリングされません。
 *
 * ## 値の正規化ルール
 *
 * - `count` が `NaN` / `Infinity` / `-Infinity`: `0` として扱います。
 * - `count` が負数: `0` として扱います。
 * - `count` は `Math.floor()` で整数化します。
 * - `max` は `Math.floor()` で整数化し、`1` 未満は `1` に補正します。
 * - 表示値: `count > max ? \`${max}+\` : \`${count}\``
 * - `aria-label` は正規化後の実数値を使用します（例: 表示 `99+`、読み上げ `128 件`）。
 *
 * ## 非インタラクティブ設計
 *
 * バッジは情報表示専用コンポーネントです。`disabled`・`error` 状態は存在せず、
 * カスタムイベントも発行しません。フォーカス不可（`tabindex` なし）。
 *
 * @property {'solid' | 'subtle' | 'dot'} variant - 視覚スタイル
 * @property {number | null} count - 表示する数値。`null` の場合はスロットを表示
 * @property {number} max - 数値の最大表示リミット（デフォルト: 99）
 * @property {'danger' | 'primary' | 'neutral' | 'success' | 'warning'} color - 意味的カラー
 *
 * @slot - バッジのテキスト内容（`count` が `null` かつ `variant !== "dot"` の場合に表示）
 *
 * @cssprop --primary         - Primary 背景色（Semantic Token）
 * @cssprop --on-primary      - Primary 文字色（Semantic Token）
 * @cssprop --success         - Success 背景色（Semantic Token）
 * @cssprop --on-success      - Success 文字色（Semantic Token）
 * @cssprop --danger          - Danger 背景色（Semantic Token）
 * @cssprop --on-danger       - Danger 文字色（Semantic Token）
 * @cssprop --warning         - Warning 背景色（Semantic Token）
 * @cssprop --on-warning      - Warning 文字色（Semantic Token）
 * @cssprop --fg-default      - Neutral 背景色（Semantic Token）
 * @cssprop --bg-default      - Neutral 文字色（Semantic Token）
 * @cssprop --text-2xs        - フォントサイズ (11px)
 * @cssprop --font-bold       - フォントウェイト (700)
 * @cssprop --tracking-wider  - 文字間隔 (0.05em)
 * @cssprop --control-height-2xs - バッジ高さ (16px)
 * @cssprop --radius-full     - 角丸（全てのバッジは正円または楕円）
 * @cssprop --space-1         - padding-inline (solid: 4px)
 * @cssprop --space-2         - padding-inline (subtle: 8px)
 * @cssprop --border-width    - ボーダー幅
 *
 * @example
 * ```html
 * <!-- 数値バッジ（未読数） -->
 * <ui-badge count="5"></ui-badge>
 * <ui-badge count="128" max="99"></ui-badge>
 *
 * <!-- テキストバッジ -->
 * <ui-badge variant="subtle">New</ui-badge>
 * <ui-badge variant="subtle" color="success">Beta</ui-badge>
 *
 * <!-- Dot バッジ（更新有無） -->
 * <ui-badge variant="dot" color="danger" aria-label="未読の更新があります"></ui-badge>
 *
 * <!-- カラー指定 -->
 * <ui-badge color="danger" count="3"></ui-badge>
 * <ui-badge color="warning" variant="subtle">Draft</ui-badge>
 * ```
 */
@customElement('ui-badge')
export class Badge extends LitElement {
    static override styles = css`
    /* ──────────────────────────────────────────────
       CSS カスタムプロパティ: カラーシステム
    ────────────────────────────────────────────── */
    :host {
      /* Solid の参照元（Semantic Token） */
      --badge-bg: var(--primary);
      --badge-fg: var(--on-primary);
      /* Dot は Solid と同じ色を利用 */
      --badge-dot: var(--badge-bg);

      /* Subtle 派生用 Delta。warning のみ上書き */
      --badge-subtle-bg-delta: 41%;
      --badge-subtle-fg-delta: -15%;
      --badge-subtle-border-delta: 36%;

      /* Layout */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;

      /* Typography */
      font-size: var(--text-2xs, 11px);
      font-weight: var(--font-bold, 700);
      letter-spacing: var(--tracking-wider, 0.05em);
      line-height: 1;

      /* Shape */
      height: var(--control-height-2xs, 16px);
      border-radius: var(--radius-full, 9999px);
    }

    /* ── Color Mapping (Semantic Token Only) ── */
    :host([color='neutral']) {
      --badge-bg: var(--fg-default);
      --badge-fg: var(--bg-default);
    }

    :host([color='primary']) {
      --badge-bg: var(--primary);
      --badge-fg: var(--on-primary);
    }

    :host([color='success']) {
      --badge-bg: var(--success);
      --badge-fg: var(--on-success);
    }

    :host([color='danger']) {
      --badge-bg: var(--danger);
      --badge-fg: var(--on-danger);
    }

    :host([color='warning']) {
      --badge-bg: var(--warning);
      --badge-fg: var(--on-warning);
      --badge-subtle-bg-delta: 16%;
      --badge-subtle-fg-delta: -35%;
      --badge-subtle-border-delta: 10%;
    }

    /* ── Variant: Solid ── */
    :host([variant='solid']),
    :host(:not([variant])) {
      min-width: var(--control-height-2xs, 16px);
      padding: 0 var(--space-1, 4px);
      max-width: 12ch;
      background: var(--badge-bg);
      color: var(--badge-fg);
    }

    /* ── Variant: Subtle ── */
    :host([variant='subtle']) {
      padding: 0 var(--space-2, 8px);
      background: oklch(from var(--badge-bg) calc(l + var(--badge-subtle-bg-delta)) calc(c * 0.35) h);
      color: oklch(from var(--badge-bg) calc(l + var(--badge-subtle-fg-delta)) calc(c * 0.85) h);
      border: var(--border-width, 1px) solid oklch(from var(--badge-bg) calc(l + var(--badge-subtle-border-delta)) calc(c * 0.45) h);
    }

    /* ── Variant: Dot ── */
    :host([variant='dot']) {
      width: var(--space-2, 8px);
      height: var(--space-2, 8px);
      min-width: 8px;
      min-height: 8px;
      padding: 0;
      background: var(--badge-dot);
    }

    /* ── Forced Colors Mode ── */
    @media (forced-colors: active) {
      :host {
        border: var(--border-width, 1px) solid ButtonText;
      }

      :host([variant='solid']),
      :host(:not([variant])) {
        background-color: ButtonText;
        color: ButtonFace;
        border: var(--border-width, 1px) solid ButtonText;
      }

      :host([variant='dot']) {
        background-color: ButtonText;
        border: var(--border-width, 1px) solid ButtonText;
        width: 10px;
        height: 10px;
      }
    }
  `;

    /**
     * 視覚スタイル
     * @default 'solid'
     */
    @property({ type: String, reflect: true })
    variant: 'solid' | 'subtle' | 'dot' = 'solid';

    /**
     * 表示する数値。`null` の場合はスロットを表示。
     * `number` の場合は正規化ルールを適用。
     * @default null
     */
    @property({ type: Number, reflect: true })
    count: number | null = null;

    /**
     * 数値の最大表示リミット。表示は `{max}+`。
     * `Math.floor()` で整数化し、`1` 未満は `1` に補正。
     * @default 99
     */
    @property({ type: Number, reflect: true })
    max = 99;

    /**
     * 意味的カラー
     * @default 'primary'
     */
    @property({ type: String, reflect: true })
    color: 'danger' | 'primary' | 'neutral' | 'success' | 'warning' = 'primary';

    /**
     * `count` の正規化処理。
     * - `NaN` / `Infinity` / `-Infinity` → `0`
     * - 負数 → `0`
     * - `Math.floor()` で整数化
     */
    private get _normalizedCount(): number | null {
        if (this.count === null) return null;
        const n = this.count;
        if (!isFinite(n) || isNaN(n)) return 0;
        return Math.max(0, Math.floor(n));
    }

    /**
     * `max` の正規化処理。
     * - `Math.floor()` で整数化
     * - `1` 未満は `1` に補正
     */
    private get _normalizedMax(): number {
        const m = this.max;
        if (!isFinite(m) || isNaN(m)) return 1;
        return Math.max(1, Math.floor(m));
    }

    /**
     * 表示文字列を返す。
     * `count > max ? \`${max}+\` : \`${count}\``
     */
    private get _displayText(): string | null {
        const count = this._normalizedCount;
        if (count === null) return null;
        const max = this._normalizedMax;
        return count > max ? `${String(max)}+` : String(count);
    }

    /**
     * `aria-label` 用の実数値文字列を返す。
     * 表示が `99+` でも実際の件数（例: 128）を使用する。
     */
    private get _ariaLabel(): string | null {
        const count = this._normalizedCount;
        if (count === null) return null;
        return `${String(count)} 件`;
    }

    override render() {
        // Dot バリアント: コンテンツを物理的にレンダリングしない
        if (this.variant === 'dot') {
            return html`<span role="img" aria-label="${this.getAttribute('aria-label') ?? '更新があります'}"></span>`;
        }

        const displayText = this._displayText;

        // count が number の場合: Live Notification として role="status" でレンダリング
        if (displayText !== null) {
            return html`<span role="status" aria-label="${this._ariaLabel ?? ''}">${displayText}</span>`;
        }

        // count が null の場合: スロットをレンダリング（Static Label）
        return html`<span>${nothing}<slot></slot></span>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ui-badge': Badge;
    }
}
