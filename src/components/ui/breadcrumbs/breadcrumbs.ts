import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

/**
 * パンくずリストアイテムの型定義
 */
export interface BreadcrumbItem {
	/** 表示ラベル */
	label: string;
	/** リンク先URL（省略時は非リンク） */
	href?: string;
}

/**
 * パンくずリスト (Breadcrumbs) コンポーネント `<ui-breadcrumbs>`
 *
 * ユーザーが現在のページに至るまでのナビゲーション階層を視覚化し、
 * 上位階層へのナビゲーションを提供します。
 *
 * ## 設計思想
 *
 * - **階層の可視化**: 現在位置をコンテキスト内で明確化し、迷子を防止します。
 * - **静謐な存在**: コンテンツの主役を圧迫しない、控えめな UI として機能します。
 * - **省略戦略**: 深い階層では中間要素を省略し、最小限の情報で全体像を伝えます。
 *
 * ## アクセシビリティ
 *
 * - `<nav>` 要素に `aria-label="breadcrumb"` を付与します。
 * - 最後のアイテム（現在ページ）には `aria-current="page"` を付与します。
 * - セパレーターは装飾的なので `aria-hidden="true"` を付与します。
 * - スクリーンリーダーによる読み上げ順序を考慮しています。
 *
 * ## 省略ロジック
 *
 * `maxItems` が設定され、アイテム数がそれを超える場合：
 * - 最初のアイテム（ルート）と最後のアイテム（現在ページ）を常に表示します。
 * - 中間アイテムを省略記号（...）で置き換えます。
 * - 例: `Home / Projects / ... / Settings / General` (maxItems=4 の場合)
 *
 * ## 長いラベルの扱い
 *
 * - 各アイテムは `max-width` でトランケートされ、`text-overflow: ellipsis` で省略されます。
 * - ホバー時に `title` 属性で全文を表示します（実装者が `title` を設定する責任があります）。
 *
 * @property {BreadcrumbItem[]} items - パンくずアイテムの配列
 * @property {string} separator - セパレーター文字（デフォルト: `/`）
 * @property {number | null} maxItems - 最大表示アイテム数（null = 無制限）
 * @property {string} ariaLabel - nav 要素の aria-label（デフォルト: "パンくずリスト"）
 *
 * @cssprop --fg-muted           - テキスト色（控えめ）
 * @cssprop --fg-default         - リンクのホバー色
 * @cssprop --text-sm            - フォントサイズ (13px)
 * @cssprop --font-medium        - フォントウェイト (500)
 * @cssprop --space-1            - セパレーター間隔 (4px)
 * @cssprop --space-2            - 垂直パディング (8px)
 * @cssprop --duration-fast      - トランジション時間 (70ms)
 * @cssprop --ease-out           - イージング関数
 *
 * @example
 * ```html
 * <!-- 基本的な使用 -->
 * <ui-breadcrumbs .items="${[
 *   { label: 'ホーム', href: '/' },
 *   { label: 'プロジェクト', href: '/projects' },
 *   { label: '設定' }
 * ]}"></ui-breadcrumbs>
 *
 * <!-- カスタムセパレーター -->
 * <ui-breadcrumbs separator=">" .items="${items}"></ui-breadcrumbs>
 *
 * <!-- 省略機能（最大4アイテム） -->
 * <ui-breadcrumbs max-items="4" .items="${manyItems}"></ui-breadcrumbs>
 * ```
 */
@customElement('ui-breadcrumbs')
export class Breadcrumbs extends LitElement {
	static override styles = css`
		/* ──────────────────────────────────────────────
		   レイアウト & ベーススタイル
		────────────────────────────────────────────── */
		:host {
			display: block;
		}

		nav {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			padding: var(--space-2, 8px) 0;
			gap: var(--space-1, 4px);
			font-size: var(--text-sm, 13px);
			color: var(--fg-muted, oklch(48% 0.01 250));
		}

		/* ── アイテムリスト ── */
		.breadcrumb-list {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: var(--space-1, 4px);
			list-style: none;
			margin: 0;
			padding: 0;
		}

		.breadcrumb-item {
			display: inline-flex;
			align-items: center;
			gap: var(--space-1, 4px);
		}

		/* ── リンクスタイル ── */
		.breadcrumb-link {
			color: inherit;
			text-decoration: none;
			max-width: 20ch;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			transition: color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
		}

		.breadcrumb-link:hover {
			color: var(--fg-default, oklch(20% 0.01 250));
			text-decoration: underline;
		}

		.breadcrumb-link:focus-visible {
			outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
			outline-offset: var(--focus-ring-offset, 2px);
			border-radius: 2px;
		}

		/* ── 現在ページ（非リンク） ── */
		.breadcrumb-current {
			color: var(--fg-default, oklch(20% 0.01 250));
			font-weight: var(--font-medium, 500);
			max-width: 20ch;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		/* ── セパレーター ── */
		.breadcrumb-separator {
			color: var(--fg-muted, oklch(48% 0.01 250));
			user-select: none;
			flex-shrink: 0;
		}

		/* ── 省略記号 ── */
		.breadcrumb-ellipsis {
			color: var(--fg-muted, oklch(48% 0.01 250));
			cursor: default;
			user-select: none;
		}

		/* ── Forced Colors Mode ── */
		@media (forced-colors: active) {
			.breadcrumb-link {
				border-bottom: 1px solid LinkText;
			}

			.breadcrumb-link:hover {
				border-bottom-width: 2px;
			}

			.breadcrumb-current {
				border-bottom: 2px solid CanvasText;
			}
		}

		/* ── Motion Reduction ── */
		@media (prefers-reduced-motion: reduce) {
			.breadcrumb-link {
				transition-duration: 0.01ms;
			}
		}
	`;

	/**
	 * パンくずアイテムの配列
	 * @default []
	 */
	@property({ type: Array })
	items: BreadcrumbItem[] = [];

	/**
	 * セパレーター文字
	 * @default '/'
	 */
	@property({ type: String })
	separator = '/';

	/**
	 * 最大表示アイテム数（null = 無制限）
	 * 超過した場合、中間アイテムを省略記号（...）で置き換えます。
	 * @default null
	 */
	@property({ type: Number, attribute: 'max-items' })
	maxItems: number | null = null;

	/**
	 * nav 要素の aria-label
	 * @default 'パンくずリスト'
	 */
	@property({ type: String, attribute: 'aria-label' })
	override ariaLabel = 'パンくずリスト';

	/**
	 * アイテムを省略するかどうかを判定
	 */
	private get _shouldCollapse(): boolean {
		return this.maxItems !== null && this.items.length > this.maxItems;
	}

	/**
	 * 省略後のアイテム配列を返す
	 * - 最初と最後を保持
	 * - 中間を省略記号で置き換え
	 */
	private get _displayItems(): (BreadcrumbItem | { isEllipsis: true })[] {
		if (!this._shouldCollapse || this.maxItems === null || this.items.length === 0) {
			return this.items;
		}

		const max = this.maxItems;
		const items = this.items;

		// maxItems が 1 の場合: 最後のアイテムのみ表示
		if (max === 1) {
			const lastItem = items[items.length - 1];
			return lastItem ? [lastItem] : [];
		}

		// maxItems が 2 の場合: 最初と最後を表示
		if (max === 2) {
			const firstItem = items[0];
			const lastItem = items[items.length - 1];
			return firstItem && lastItem ? [firstItem, lastItem] : items;
		}

		// maxItems が 3 以上: 最初、省略記号、最後の (max - 2) 個
		const firstItems = items.slice(0, 1);
		const lastItems = items.slice(-(max - 2));

		return [...firstItems, { isEllipsis: true }, ...lastItems];
	}

	override render() {
		// 空の場合は何も表示しない
		if (this.items.length === 0) {
			return html``;
		}

		const displayItems = this._displayItems;
		const lastIndex = displayItems.length - 1;

		return html`
			<nav aria-label="${this.ariaLabel}">
				<ol class="breadcrumb-list">
					${map(
						displayItems,
						(item, index) => html`
							<li class="breadcrumb-item">
								${this._renderItem(item, index === lastIndex)}
								${index < lastIndex
									? html`<span class="breadcrumb-separator" aria-hidden="true">${this.separator}</span>`
									: ''}
							</li>
						`,
					)}
				</ol>
			</nav>
		`;
	}

	/**
	 * 個別アイテムをレンダリング
	 */
	private _renderItem(item: BreadcrumbItem | { isEllipsis: true }, isLast: boolean) {
		// 省略記号の場合
		if ('isEllipsis' in item) {
			return html`<span class="breadcrumb-ellipsis" aria-hidden="true">…</span>`;
		}

		// 最後のアイテム（現在ページ）
		if (isLast) {
			return html`<span class="breadcrumb-current" aria-current="page">${item.label}</span>`;
		}

		// リンクありの場合
		if (item.href) {
			return html`<a class="breadcrumb-link" href="${item.href}">${item.label}</a>`;
		}

		// リンクなし（通常のテキスト）
		return html`<span class="breadcrumb-link">${item.label}</span>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'ui-breadcrumbs': Breadcrumbs;
	}
}
