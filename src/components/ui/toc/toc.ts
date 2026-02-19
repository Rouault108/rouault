import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { map } from 'lit/directives/map.js';
import { styleMap } from 'lit/directives/style-map.js';

/**
 * 見出しデータの型定義
 */
export interface Heading {
	/** 一意の識別子。アンカーリンクおよびObserverのターゲットIDに使用。 */
	id: string;
	/** 表示テキスト */
	text: string;
	/** 見出しレベル (1–6)。H2なら2、H3なら3。 */
	level: number;
}

/**
 * 目次 (Table of Contents) コンポーネント `<ui-toc>`
 *
 * 記事内の見出し構造を可視化し、読者が現在地を把握しながらコンテンツを
 * ナビゲートするための「周辺視野の計器（Peripheral Indicator）」として機能します。
 *
 * ## 設計思想
 *
 * - **Visual Silence**: 背景色・常時ボーダーを排除し、低密度な「静謐」を実現します。
 * - **周辺視野の計器**: 操作パネルではなく、現在地と残量を無意識に感じさせます。
 * - **Context Awareness**: アクティブセクションのみハイライト、他は控えめに配置します。
 *
 * ## データフロー
 *
 * - `headers` プロパティで見出しデータを受け取ります（クライアントDOM解析は行いません）。
 * - `IntersectionObserver` でビューポート内のヘッダー要素を監視し、`activeId` を動的に更新します。
 *
 * ## インタラクション
 *
 * - **Smooth Scroll**: 移動距離に応じた適応的アニメーション（最大 `--duration-slower` = 300ms）。
 * - **Conflict Resolution**: クリック移動中は Observer を一時停止し、完了後に再開します。
 *   これによりインジケーターの明滅（Flickering）を防止します。
 * - **Transition Strategy**:
 *   - スクロール起因: `--duration-instant`（ゼロ）で即座に反映（計器としての正確性）。
 *   - クリック起因: `opacity` のフェードイン（`--duration-fast`）で着地確信を与えます。
 *
 * ## レベル正規化
 *
 * 表示上の相対階層（0 start）を算出します。`headers` 内の最小レベルを基準にします。
 * 例: H2 のみなら全て 0。H2+H3 なら H2=0、H3=1。
 *
 * @property {Heading[]} headers   - 見出しデータの配列 `{ id, text, level }`
 * @property {string}   activeId  - 現在アクティブな見出しのID（Observerにより自動更新）
 *
 * @cssprop --fg-muted            - 通常テキスト色（WCAG AA: 4.8:1 vs --bg-default）
 * @cssprop --fg-default          - ホバー時テキスト色
 * @cssprop --primary             - アクティブ項目テキスト色・インジケーター色（WCAG AA: 7.1:1）
 * @cssprop --text-sm             - フォントサイズ (13px)
 * @cssprop --space-1             - 垂直パディング (4px)
 * @cssprop --space-2             - インデント単位 (8px)
 * @cssprop --space-3             - 左パディングベース (12px)
 * @cssprop --border-width-thick  - インジケーター幅 (2px)
 * @cssprop --radius-full         - インジケーター角丸 (9999px)
 * @cssprop --duration-fast       - クリック起因フェードイン時間 (70ms)
 * @cssprop --duration-slower     - スクロールアニメーション最大時間 (300ms)
 * @cssprop --ease-out            - イージング関数
 * @cssprop --focus-ring-width    - フォーカスリング幅
 * @cssprop --focus-ring-color    - フォーカスリング色
 * @cssprop --focus-ring-offset   - フォーカスリングオフセット
 * @cssprop --focus-ring-radius   - フォーカスリング角丸
 * @cssprop --header-height       - ヘッダー高さ（スクロールオフセット補正に使用）
 * @cssprop --control-min-touch   - 最小タッチターゲットサイズ (44px)
 *
 * @example
 * ```html
 * <ui-toc
 *   .headers="${[
 *     { id: 'intro', text: 'はじめに', level: 2 },
 *     { id: 'details', text: '詳細', level: 3 },
 *     { id: 'summary', text: 'まとめ', level: 2 },
 *   ]}"
 *   active-id="intro"
 * ></ui-toc>
 * ```
 */
@customElement('ui-toc')
export class Toc extends LitElement {
	static override styles = css`
		/* ──────────────────────────────────────────────
		   レイアウト & ベーススタイル
		────────────────────────────────────────────── */
		:host {
			display: block;
		}

		nav {
			display: block;
		}

		ul {
			list-style: none;
			margin: 0;
			padding: 0;
		}

		/* ──────────────────────────────────────────────
		   目次リンク
		────────────────────────────────────────────── */
		.toc-link {
			position: relative;
			display: flex;
			align-items: center;
			/*
			 * 最低保証タッチターゲット 24px
			 * モバイルでは --control-min-touch (44px) へ拡張（後述のメディアクエリ参照）
			 */
			min-height: 24px;
			padding-block: var(--space-1, 4px);
			/*
			 * インデント: var(--level) はインラインスタイルで親 <li> に設定される CSS 変数。
			 * CSS カスタムプロパティの継承により子の <a> へ伝播する。
			 * Padding Left: calc(var(--level) * var(--space-2) + var(--space-3))
			 */
			padding-inline-start: calc(
				var(--level, 0) * var(--space-2, 8px) + var(--space-3, 12px)
			);
			padding-inline-end: var(--space-2, 8px);
			/*
			 * Typography: --text-sm (13px), Weight 400
			 * "Small Text Rule" (12px以下補正) を回避するため --text-sm を採用。
			 * Weight 400 を保ったまま --fg-muted を使用し、視覚的静謐さを維持。
			 */
			font-size: var(--text-sm, 13px);
			font-weight: 400;
			line-height: 1.5;
			/* テキストのオーバーフロー処理 */
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			color: var(--fg-muted, oklch(48% 0.01 250));
			text-decoration: none;
			border-radius: var(--radius-sm, 4px);
			/*
			 * ホバー時は文字色のみ変化させる（背景色変更は視覚ノイズになるため禁止）
			 */
			transition: color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
		}

		/* ── ホバー: 文字色のみ変更 ── */
		.toc-link:hover {
			color: var(--fg-default, oklch(20% 0.01 250));
		}

		/* ── フォーカス: Adaptive Focus ── */
		.toc-link:focus-visible {
			outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
			outline-offset: var(--focus-ring-offset, 2px);
			border-radius: var(--focus-ring-radius, 4px);
		}

		/* ── アクティブ状態: テキスト色を --primary に変更 ── */
		.toc-link.is-active {
			color: var(--primary, oklch(55% 0.2 250));
		}

		/* ──────────────────────────────────────────────
		   アクティブインジケーター (::before 疑似要素)
		   - 左端に絶対配置 (2px幅)
		   - Shape: border-radius: --radius-full (単なる線ではなくオブジェクトとして扱う)
		   - 常時表示ではなくアクティブ時のみ出現
		────────────────────────────────────────────── */
		.toc-link::before {
			content: '';
			position: absolute;
			inset-inline-start: 0;
			top: 50%;
			transform: translateY(-50%);
			width: var(--border-width-thick, 2px);
			height: 0.75em;
			border-radius: var(--radius-full, 9999px);
			background-color: var(--primary, oklch(55% 0.2 250));
			/* デフォルト: 非表示 */
			opacity: 0;
			/* トランジションなし（スクロール起因のデフォルト動作を即座にするため） */
		}

		/*
		 * スクロール起因のアクティブ切り替え:
		 * アニメーション時間ゼロで即座に反映（「計器としての正確性」）
		 * 遅れてくるアニメーションは情報の同期ズレ（Lag）になるため禁止。
		 */
		.toc-link.is-active.is-scroll::before {
			opacity: 1;
		}

		/*
		 * クリック起因のアクティブ切り替え:
		 * opacity フェードイン（--duration-fast）で「着地した」という物理的確信を与える。
		 */
		.toc-link.is-active.is-click::before {
			animation: toc-indicator-fade-in var(--duration-fast, 70ms)
				var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)) both;
		}

		@keyframes toc-indicator-fade-in {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}

		/* ──────────────────────────────────────────────
		   モバイル: タッチターゲット拡張
		────────────────────────────────────────────── */
		@media (max-width: 1023px) {
			/*
			 * モバイル (< --bp-lg) では --control-min-touch (44px) を必須とする。
			 * 視覚サイズとは独立してヒットエリアを確保。
			 */
			.toc-link {
				min-height: var(--control-min-touch, 44px);
			}
		}

		/* ──────────────────────────────────────────────
		   Reduced Motion
		────────────────────────────────────────────── */
		@media (prefers-reduced-motion: reduce) {
			.toc-link {
				/*
				 * ホバートランジションを実質瞬時化（状態認知は維持）
				 */
				transition-duration: 0.01ms;
			}

			.toc-link.is-active.is-click::before {
				/*
				 * クリック起因のフェードインも実質瞬時化
				 */
				animation-duration: 0.01ms;
			}
		}

		/* ──────────────────────────────────────────────
		   Forced Colors Mode (高コントラストモード)
		────────────────────────────────────────────── */
		@media (forced-colors: active) {
			/*
			 * システムカラーへのマッピング:
			 * --fg-muted → GrayText, --fg-default → CanvasText, --primary → Highlight
			 */
			.toc-link {
				color: GrayText;
			}

			.toc-link:hover {
				color: CanvasText;
			}

			.toc-link.is-active {
				color: Highlight;
			}

			/*
			 * Forced Colors では background-color が消失するため、
			 * インジケーター (::before) を border で可視化する（現在地の物理的可視化）。
			 */
			.toc-link.is-active::before {
				background-color: transparent;
				border: var(--border-width-thick, 2px) solid Highlight;
			}
		}
	`;

	/**
	 * 見出しデータの配列。レンダリングの唯一のソース。
	 * Velite 等が生成したメタデータをそのまま渡す想定。
	 * @default []
	 */
	@property({ type: Array })
	headers: Heading[] = [];

	/**
	 * 現在アクティブな見出しのID。
	 * IntersectionObserver により自動更新されるが、外部からも設定可能。
	 * @default ''
	 */
	@property({ type: String, attribute: 'active-id', reflect: true })
	activeId = '';

	/** アクティブID更新の起源（インジケーターのトランジション戦略を決定） */
	@state() private _activeIdSource: 'scroll' | 'click' = 'scroll';

	/** IntersectionObserver インスタンス */
	private _observer: IntersectionObserver | null = null;

	/**
	 * Observer 一時停止フラグ。
	 * クリックによるスクロール中はインジケーターの明滅防止のため停止する。
	 */
	private _observerPaused = false;

	/** ビューポート内に存在する見出しIDのセット */
	private _visibleIds = new Set<string>();

	/**
	 * 内部からの activeId 更新フラグ。
	 * updated() で外部更新と内部更新を区別するために使用。
	 */
	private _internalUpdate = false;

	override connectedCallback() {
		super.connectedCallback();
		this._setupObserver();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this._teardownObserver();
	}

	override updated(changedProperties: Map<string, unknown>) {
		super.updated(changedProperties);

		if (changedProperties.has('headers')) {
			// headers 変更時: 監視対象が変わるため Observer を再設定
			this._setupObserver();
		}

		if (changedProperties.has('activeId') && !this._internalUpdate) {
			// 外部からの activeId 変更: クリック相当として扱い、フェードイン適用
			this._activeIdSource = 'click';
		}

		// 内部更新フラグをリセット
		this._internalUpdate = false;
	}

	/**
	 * headers 内の最小レベルを返す（レベル正規化の基準値）
	 */
	private get _minLevel(): number {
		if (this.headers.length === 0) return 1;
		return Math.min(...this.headers.map((h) => h.level));
	}

	/**
	 * 表示上の相対階層（0 start）を返す。
	 * 例: H2=0, H3=1, H4=2（H2 が最小の場合）
	 */
	private _normalizedLevel(heading: Heading): number {
		return heading.level - this._minLevel;
	}

	/**
	 * IntersectionObserver を設定し、ドキュメント内の見出し要素の監視を開始する。
	 * headers 変更時や connectedCallback 時に呼び出す。
	 */
	private _setupObserver() {
		this._teardownObserver();
		this._visibleIds.clear();

		if (this.headers.length === 0) return;

		this._observer = new IntersectionObserver(
			(entries) => {
				// クリックスクロール中は無視（Flickering 防止）
				if (this._observerPaused) return;

				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						this._visibleIds.add(entry.target.id);
					} else {
						this._visibleIds.delete(entry.target.id);
					}
				});

				// headers の順序で最初に可視状態の見出しをアクティブにする
				const activeHeading = this.headers.find((h) => this._visibleIds.has(h.id));
				if (activeHeading && activeHeading.id !== this.activeId) {
					this._setActiveId(activeHeading.id, 'scroll');
				}
			},
			{
				/*
				 * rootMargin でビューポート上部20%の帯域を観測領域とする。
				 * ヘッダー高さ相当の上部マージンと下部70%除外で、
				 * スクロール中にビューポート最上部近傍の見出しを捕捉する。
				 */
				rootMargin: '-20% 0px -70% 0px',
				threshold: 0,
			},
		);

		// ドキュメント内の各見出し要素を監視
		for (const heading of this.headers) {
			const el = document.getElementById(heading.id);
			if (el) {
				this._observer.observe(el);
			}
		}
	}

	/**
	 * IntersectionObserver を切断してリソースを解放する。
	 */
	private _teardownObserver() {
		if (this._observer) {
			this._observer.disconnect();
			this._observer = null;
		}
	}

	/**
	 * activeId を内部から更新する。
	 * _internalUpdate フラグで外部更新と区別し、_activeIdSource を正しく設定する。
	 */
	private _setActiveId(id: string, source: 'scroll' | 'click') {
		this._internalUpdate = true;
		this.activeId = id;
		this._activeIdSource = source;
	}

	/**
	 * 目次リンクのクリックハンドラー。
	 * - デフォルトのアンカーナビゲーションをキャンセル
	 * - Observer を一時停止してインジケーターの明滅を防止
	 * - activeId を即座にクリック起因として更新（視覚的即応性の確保）
	 * - スムーズスクロール後に Observer を再開
	 */
	private async _handleLinkClick(event: Event, headingId: string) {
		event.preventDefault();

		// スクロール完了まで Observer を停止（Flickering 防止）
		this._observerPaused = true;

		// activeId をクリック起因として即座に更新
		this._setActiveId(headingId, 'click');

		// ターゲット要素へスムーズスクロール
		const target = document.getElementById(headingId);
		if (target) {
			await this._smoothScrollTo(target);
		}

		// スクロール完了後に Observer を再開
		this._observerPaused = false;
	}

	/**
	 * スムーズスクロール実装。
	 *
	 * - 移動距離に応じた適応的アニメーション時間（最大 300ms）
	 * - 隣接セクションの小移動では短時間（例: 100ms）
	 * - prefers-reduced-motion: reduce 時は即座にジャンプ
	 * - --header-height + 32px (--space-8) のオフセット補正でヘッダー隠れを防止
	 */
	private _smoothScrollTo(target: HTMLElement): Promise<void> {
		return new Promise<void>((resolve) => {
			// Reduced Motion: アニメーション無効化・即座にジャンプ
			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
				target.scrollIntoView();
				resolve();
				return;
			}

			// ヘッダー高さの取得（CSS カスタムプロパティから）
			const headerHeightRaw = getComputedStyle(document.documentElement)
				.getPropertyValue('--header-height')
				.trim();
			const headerHeight = headerHeightRaw ? parseFloat(headerHeightRaw) : 0;
			// --space-8 (32px) 相当の余白を追加
			const EXTRA_PADDING = 32;

			const targetTop = target.getBoundingClientRect().top + window.scrollY;
			const targetY = Math.max(0, targetTop - headerHeight - EXTRA_PADDING);
			const startY = window.scrollY;
			const distance = Math.abs(targetY - startY);

			// 距離がほぼゼロの場合は即座に完了
			if (distance < 1) {
				resolve();
				return;
			}

			// 適応的アニメーション時間: 最大 300ms（--duration-slower）
			const MAX_DURATION = 300;
			const duration = Math.min(MAX_DURATION, distance * 0.5);

			const startTime = performance.now();

			const animate = (currentTime: number) => {
				const elapsed = currentTime - startTime;
				const progress = Math.min(elapsed / duration, 1);
				// ease-out cubic イージング（滑らかな減速）
				const eased = 1 - Math.pow(1 - progress, 3);

				window.scrollTo(0, startY + (targetY - startY) * eased);

				if (progress < 1) {
					requestAnimationFrame(animate);
				} else {
					resolve();
				}
			};

			requestAnimationFrame(animate);
		});
	}

	override render() {
		// headers が空の場合は何も表示しない
		if (this.headers.length === 0) {
			return nothing;
		}

		return html`
			<nav aria-label="目次">
				<ul>
					${map(this.headers, (heading) => {
						const isActive = heading.id === this.activeId;
						const normalizedLevel = this._normalizedLevel(heading);

						return html`
							<li style="${styleMap({ '--level': String(normalizedLevel) })}">
								<a
									class="${classMap({
										'toc-link': true,
										'is-active': isActive,
										'is-scroll': isActive && this._activeIdSource === 'scroll',
										'is-click': isActive && this._activeIdSource === 'click',
									})}"
									href="#${heading.id}"
									aria-current="${isActive ? 'location' : nothing}"
									@click="${(e: Event) => this._handleLinkClick(e, heading.id)}"
								>${heading.text}</a>
							</li>
						`;
					})}
				</ul>
			</nav>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'ui-toc': Toc;
	}
}
