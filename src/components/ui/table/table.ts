import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * テーブルの行密度
 */
export type TableDensity = 'compact' | 'normal';

/** ドキュメントに注入するスタイルタグのID（重複防止） */
const DOCUMENT_STYLE_ID = 'ui-table-document-styles';

/**
 * Shadow DOM の ::slotted() はスロット直下の要素にしか適用できず、
 * th / td などの孫要素にはスタイルを適用できない。
 * そのため、テーブル内部要素のスタイルはドキュメントに直接注入する。
 */
const DOCUMENT_CSS = `/* ============================================================
   <ui-table> ドキュメントスタイル
   Shadow DOM の ::slotted() 制限を回避するためドキュメントに注入
   ============================================================ */

/* ── テーブルベース ── */
ui-table table {
  border-collapse: collapse;
  border-spacing: 0;
  width: 100%;
}

/* ── キャプション ── */
ui-table caption {
  caption-side: top;
  font-size: var(--text-xs, 0.75rem);
  color: var(--fg-muted, oklch(48% 0.01 250));
  padding: var(--space-2, 0.5rem) 0;
  text-align: left;
}

/* ── ヘッダーセル ── */
ui-table th {
  font-size: var(--text-xs, 0.75rem);
  font-weight: var(--font-medium, 500);
  letter-spacing: var(--tracking-wide, 0.04em);
  color: var(--fg-muted, oklch(48% 0.01 250));
  vertical-align: bottom;
  padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
  border-bottom: var(--border-width-thick, 2px) solid var(--border-default, oklch(0% 0 0 / 0.08));
  text-align: left;
}

/* ── データセル ── */
ui-table td {
  font-size: var(--text-base, 0.875rem);
  color: var(--fg-default, oklch(20% 0.01 250));
  vertical-align: top;
  padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
  white-space: normal;
}

/* ── 行: 横線のみ（縦線排除でスキャンを助ける） ── */
ui-table tr {
  border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.08));
  transition: background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
}

/* Active Ruler: pointer: fine のみ有効（縦線のない行識別子として機能） */
@media (hover: hover) and (pointer: fine) {
  ui-table tbody tr:hover {
    background-color: var(--bg-table-ruler, oklch(0% 0 0 / 0.04));
  }
}

/* タッチデバイスでは :hover を無効化 */
@media (hover: none) and (pointer: coarse) {
  ui-table tbody tr:hover {
    background-color: transparent;
  }
}

/* ── tfoot: 境界線強調 ── */
ui-table tfoot tr:first-child {
  border-top: var(--border-width-thick, 2px) solid var(--border-default, oklch(0% 0 0 / 0.08));
}

/* ── 複数 tbody: 境界線強調（Long Table Strategy） ── */
ui-table tbody + tbody {
  border-top: var(--border-width-thick, 2px) solid var(--border-default, oklch(0% 0 0 / 0.08));
}

/* ── コンパクト密度 ── */
ui-table[density="compact"] th {
  padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
}

ui-table[density="compact"] td {
  font-size: var(--text-sm, 0.8125rem);
  padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
}

/* ── align 属性サポート（Markdown 互換、HTML5 非推奨属性の例外対応） ── */
ui-table th[align="center"],
ui-table td[align="center"] { text-align: center; }

ui-table th[align="right"],
ui-table td[align="right"] { text-align: right; }

ui-table th[align="left"],
ui-table td[align="left"] { text-align: left; }

/* 右揃えセルに等幅数値フォントを自動適用（tnum）*/
ui-table td[align="right"] {
  font-feature-settings: "tnum";
}

/* ── モバイル・タッチ: 省略を強制解除 ── */
@media (hover: none) and (pointer: coarse) {
  ui-table td {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }
}

/* ── Forced Colors Mode（高コントラスト） ── */
@media (forced-colors: active) {
  ui-table tr {
    border-bottom: 1px solid CanvasText;
  }

  ui-table tfoot tr:first-child {
    border-top: 2px solid CanvasText;
  }

  ui-table tbody + tbody {
    border-top: 2px solid CanvasText;
  }
}

/* ── Reduced Motion ── */
@media (prefers-reduced-motion: reduce) {
  ui-table tr {
    transition-duration: 0.01ms;
  }
}
`;

/**
 * テーブル (Table) コンポーネント `<ui-table>`
 *
 * 構造化されたデータを比較・閲覧するための表示ビューです。
 * ネイティブ `<table>` のセマンティクスを壊さずに、
 * スクロール制御・密度切替・A11y補助を提供します。
 *
 * ## 設計思想
 *
 * - **横線のみ**: 縦線を排除して視線の水平移動（Scanning）を助けます。
 * - **データの主役化**: 枠線というノイズを減らし、データそのものを際立たせます。
 * - **Active Ruler**: ホバー時に現在行を強調（pointer: fine のみ）。
 * - **Shadow DOM + グローバルスタイル注入**: コンポーネントのカプセル化を維持しつつ、
 *   `th` / `td` 等の孫要素への深いスタイリングを実現します。
 *
 * ## 使用方法
 *
 * ```html
 * <ui-table density="normal" aria-label="売上データ">
 *   <table>
 *     <caption>2024年 四半期別売上</caption>
 *     <thead>
 *       <tr>
 *         <th scope="col">四半期</th>
 *         <th scope="col" align="right">売上高</th>
 *       </tr>
 *     </thead>
 *     <tbody>
 *       <tr><td>Q1</td><td align="right">¥1,234,000</td></tr>
 *     </tbody>
 *   </table>
 * </ui-table>
 * ```
 *
 * ## density の使い分け
 *
 * - `normal`: 標準（12px 16px パディング）。デフォルト。
 * - `compact`: 高密度（8px 16px パディング）。多行表示や比較用途に。
 *
 * @property {'compact' | 'normal'} density  - 行の高さ密度（デフォルト: `'normal'`）
 * @property {string | null}        ariaLabel - スクロール領域のアクセシブルネーム
 *
 * @cssprop --bg-table-ruler       - Active Ruler の背景色（テーブル専用トークン）
 * @cssprop --border-default       - 行区切り線の色
 * @cssprop --border-width         - 通常ボーダー幅 (1px)
 * @cssprop --border-width-thick   - 強調ボーダー幅 (2px)
 * @cssprop --fg-default           - データセル文字色
 * @cssprop --fg-muted             - ヘッダー文字色・キャプション文字色
 * @cssprop --font-medium          - ヘッダーフォントウェイト (500)
 * @cssprop --text-xs              - ヘッダーフォントサイズ (12px)
 * @cssprop --text-sm              - コンパクト時データセルフォントサイズ (13px)
 * @cssprop --text-base            - 通常時データセルフォントサイズ (14px)
 * @cssprop --space-2              - コンパクト時パディング (8px)
 * @cssprop --space-3              - 通常時パディング (12px)
 * @cssprop --space-4              - 横パディング (16px)
 * @cssprop --tracking-wide        - ヘッダーレタースペーシング (0.04em)
 * @cssprop --duration-fast        - ホバートランジション時間 (70ms)
 * @cssprop --ease-out             - イージング関数
 * @cssprop --focus-ring-width     - フォーカスリング幅 (2px)
 * @cssprop --focus-ring-color     - フォーカスリング色
 * @cssprop --focus-ring-offset    - フォーカスリングオフセット
 * @cssprop --radius-sm            - フォーカスリング角丸 (4px)
 * @cssprop --animation-focus      - Adaptive Focus アニメーション
 */
@customElement('ui-table')
export class Table extends LitElement {
	static override styles = css`
		/* ──────────────────────────────────────────────
		   レイアウト & ベーススタイル
		────────────────────────────────────────────── */
		:host {
			display: block;
		}

		/* ──────────────────────────────────────────────
		   スクロールコンテナ
		────────────────────────────────────────────── */
		.table-container {
			overflow-x: auto;
			overflow-y: visible;
		}

		/* ── フォーカスリング（Adaptive Focus） ── */
		.table-container:focus-visible {
			outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
			outline-offset: var(--focus-ring-offset, 2px);
			border-radius: var(--radius-sm, 4px);
			/*
			 * --animation-focus はデザイントークンで定義される Adaptive Focus アニメーション。
			 * 移動中はサブトルなリング、停止後にプライマリへ強調する。
			 */
			animation: var(--animation-focus);
		}

		/* ──────────────────────────────────────────────
		   Reduced Motion
		────────────────────────────────────────────── */
		@media (prefers-reduced-motion: reduce) {
			.table-container:focus-visible {
				animation: none;
			}
		}
	`;

	/**
	 * 行の高さ密度。
	 * `reflect: true` により HTML 属性として反映され、
	 * ドキュメントに注入された CSS セレクター `ui-table[density="compact"]` が機能する。
	 * @default 'normal'
	 */
	@property({ type: String, reflect: true })
	density: TableDensity = 'normal';

	/**
	 * スクロール領域のアクセシブルネーム。
	 * `tabindex="0"` を持つ `role="region"` にはアクセシブルネームが推奨される。
	 * ホストの `aria-label` 属性から受け取り、内部コンテナに反映する。
	 * @default null
	 */
	@property({ type: String, attribute: 'aria-label' })
	override ariaLabel: string | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		/*
		 * Shadow DOM の ::slotted() は孫要素にスタイルを適用できないため、
		 * th / td 等の内部要素スタイルをドキュメントに注入する。
		 */
		this._injectDocumentStyles();
	}

	/**
	 * テーブル内部要素（th / td / tr 等）のスタイルをドキュメントに注入する。
	 * 同一ドキュメント内で複数の <ui-table> が存在しても重複注入しない。
	 * SSR 環境（document が未定義）では何もしない。
	 */
	private _injectDocumentStyles(): void {
		if (typeof document === 'undefined') return;
		if (document.getElementById(DOCUMENT_STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = DOCUMENT_STYLE_ID;
		style.textContent = DOCUMENT_CSS;
		document.head.appendChild(style);
	}

	override render() {
		return html`
			<div
				class="table-container"
				role="region"
				tabindex="0"
				aria-label="${this.ariaLabel}"
			>
				<slot></slot>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'ui-table': Table;
	}
}
