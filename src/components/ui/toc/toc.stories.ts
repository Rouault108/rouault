import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './toc';
import type { Heading, Toc } from './toc';

/**
 * ## 目次 (Table of Contents) `<ui-toc>`
 *
 * 記事内の見出し構造を可視化する「周辺視野の計器」コンポーネントです。
 * 読者が現在地を把握しながらコンテンツをナビゲートするための静謐な UI を提供します。
 *
 * ### 設計思想
 *
 * - **Visual Silence**: 低密度・控えめなデザインで「静謐」を実現します。
 * - **周辺視野の計器**: 操作パネルではなく、現在地を無意識に感じさせるインジケーター。
 * - **Context Awareness**: アクティブセクションのみハイライト、他は控えめに配置。
 *
 * ### アクセシビリティ
 *
 * - `<nav aria-label="Table of Contents">` で意味論的なナビゲーションを提供します。
 * - アクティブなリンクに `aria-current="location"` を設定します。
 * - キーボードの Tab キーによる標準的なナビゲーションをサポートします。
 * - タッチターゲット: モバイルは 44px、デスクトップは最低 24px を保証します。
 *
 * ### インタラクション戦略
 *
 * - **スクロール起因**: インジケーター即座（ゼロ遅延）で現在地を反映（計器の正確性）。
 * - **クリック起因**: インジケーターが opacity フェードインし「着地確信」を与えます。
 * - **Conflict Resolution**: クリック移動中は IntersectionObserver を一時停止し、
 *   インジケーターの明滅（Flickering）を防止します。
 */
const meta: Meta<Toc> = {
	title: 'Components/Toc',
	component: 'ui-toc',
	tags: ['autodocs'],
	parameters: {
		docs: {
			description: {
				component: `
目次コンポーネントは、記事内の見出し構造を可視化し、
読者が現在地を把握しながらコンテンツをナビゲートするための「周辺視野の計器」です。

## 使用方法

\`\`\`html
<ui-toc
  .headers="\${[
    { id: 'intro', text: 'はじめに', level: 2 },
    { id: 'details', text: '詳細', level: 3 },
    { id: 'summary', text: 'まとめ', level: 2 },
  ]}"
  active-id="intro"
></ui-toc>
\`\`\`

## 注意事項

- **\`headers\` プロパティ**: Velite 等が生成したメタデータをそのまま渡します。クライアントDOM解析は行いません。
- **\`active-id\` 属性**: IntersectionObserver により自動更新されますが、外部からも設定可能です。
- **レベル正規化**: 最小レベルを基準に相対階層を算出します（H2のみなら全て 0）。
- **空の配列**: \`headers\` が空の場合、何も表示されません。
				`,
			},
		},
	},
	argTypes: {
		headers: {
			control: 'object',
			description: '見出しデータの配列 `{ id, text, level }`',
			table: { type: { summary: 'Heading[]' }, defaultValue: { summary: '[]' } },
		},
		activeId: {
			control: 'text',
			description: '現在アクティブな見出しのID',
			table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
		},
	},
};

export default meta;
type Story = StoryObj<Toc>;

function getShadowStylesText(shadowRoot: ShadowRoot): string {
	const inlineStyles = Array.from(shadowRoot.querySelectorAll('style'))
		.map((style) => style.textContent ?? '')
		.join('\n');

	const adoptedStyles = shadowRoot.adoptedStyleSheets
		.map((sheet) => {
			try {
				return Array.from(sheet.cssRules)
					.map((rule) => rule.cssText)
					.join('\n');
			} catch {
				return '';
			}
		})
		.join('\n');

	return `${inlineStyles}\n${adoptedStyles}`;
}

// ──────────────────────────────────────────────
// サンプルデータ
// ──────────────────────────────────────────────

/** H2 のみのフラット構造（5件） */
const flatH2Headers: Heading[] = [
	{ id: 'intro', text: 'はじめに', level: 2 },
	{ id: 'background', text: '背景と目的', level: 2 },
	{ id: 'implementation', text: '実装方法', level: 2 },
	{ id: 'results', text: '結果と考察', level: 2 },
	{ id: 'conclusion', text: 'まとめ', level: 2 },
];

/** H2 + H3 の階層構造 */
const nestedHeaders: Heading[] = [
	{ id: 'intro', text: 'はじめに', level: 2 },
	{ id: 'background', text: '背景', level: 3 },
	{ id: 'purpose', text: '目的と動機', level: 3 },
	{ id: 'implementation', text: '実装', level: 2 },
	{ id: 'setup', text: '環境構築', level: 3 },
	{ id: 'code', text: 'コード実装', level: 3 },
	{ id: 'testing', text: 'テスト', level: 3 },
	{ id: 'conclusion', text: 'まとめ', level: 2 },
];

/** H2 + H3 + H4 の深いネスト */
const deepNestedHeaders: Heading[] = [
	{ id: 'intro', text: 'はじめに', level: 2 },
	{ id: 'overview', text: '概要', level: 3 },
	{ id: 'motivation', text: '動機', level: 4 },
	{ id: 'goals', text: 'ゴール', level: 4 },
	{ id: 'implementation', text: '実装', level: 2 },
	{ id: 'architecture', text: 'アーキテクチャ', level: 3 },
	{ id: 'frontend', text: 'フロントエンド', level: 4 },
	{ id: 'backend', text: 'バックエンド', level: 4 },
	{ id: 'conclusion', text: 'まとめ', level: 2 },
];

// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * デフォルトの目次（H2 × 5、アクティブなし）。
 *
 * 最も一般的な使用例です。全リンクが `--fg-muted` で表示され、
 * アクティブインジケーターは表示されません。
 */
export const Default: Story = {
	render: () => html`
		<div style="width: 200px;">
			<ui-toc id="default-toc" .headers="${flatH2Headers}"></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#default-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		// テスト: nav 要素が存在する
		const nav = toc.shadowRoot?.querySelector('nav');
		if (!nav) throw new Error('nav element not found');

		// テスト: aria-label が仕様どおりに設定されている
		if (nav.getAttribute('aria-label') !== 'Table of Contents') {
			throw new Error(
				`Expected aria-label="Table of Contents", got "${nav.getAttribute('aria-label') ?? 'null'}"`,
			);
		}

		// テスト: ul > li > a の構造になっている
		const ul = toc.shadowRoot?.querySelector('ul');
		if (!ul) throw new Error('ul element not found');

		// テスト: 5つのリンクが存在する
		const links = toc.shadowRoot?.querySelectorAll('a.toc-link');
		if (links?.length !== 5) {
			throw new Error(`Expected 5 links, got ${String(links?.length ?? 0)}`);
		}

		// テスト: アクティブリンクが存在しない
		const activeLinks = toc.shadowRoot?.querySelectorAll('[aria-current="location"]');
		if (activeLinks && activeLinks.length > 0) {
			throw new Error(`Expected 0 active links, got ${String(activeLinks.length)}`);
		}

		// テスト: 各リンクの href が正しいフォーマット
		const firstLink = links[0];
		if (!firstLink?.getAttribute('href')?.startsWith('#')) {
			throw new Error('Link href should start with "#"');
		}
		if (firstLink.getAttribute('href') !== '#intro') {
			throw new Error(`Expected href="#intro", got "${firstLink.getAttribute('href') ?? 'null'}"`);
		}

		// テスト: テキスト内容が正しい
		if (firstLink.textContent.trim() !== 'はじめに') {
			throw new Error(
				`Expected text "はじめに", got "${firstLink.textContent.trim()}"`,
			);
		}

		console.log('✅ All tests passed for Default story');
	},
};

// ──────────────────────────────────────────────
// アクティブアイテムあり
// ──────────────────────────────────────────────

/**
 * 中間のアイテムがアクティブ（クリック起因）。
 *
 * `active-id` を設定するとそのリンクがハイライトされ、
 * 左端のインジケーター（2px 幅の Pill）が表示されます。
 * 外部からの設定はクリック起因として扱われ、フェードインします。
 */
export const WithActiveItem: Story = {
	render: () => html`
		<div style="width: 200px;">
			<ui-toc
				id="active-toc"
				.headers="${flatH2Headers}"
				active-id="implementation"
			></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#active-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		// テスト: activeId が設定されている
		if (toc.activeId !== 'implementation') {
			throw new Error(
				`Expected activeId="implementation", got "${toc.activeId}"`,
			);
		}

		// テスト: 該当リンクに aria-current="location" がある
		const activeLink = toc.shadowRoot?.querySelector('[aria-current="location"]');
		if (!activeLink) throw new Error('aria-current="location" not found');
		if (activeLink.getAttribute('href') !== '#implementation') {
			throw new Error(
				`Expected active link href="#implementation", got "${activeLink.getAttribute('href') ?? 'null'}"`,
			);
		}

		// テスト: アクティブリンクが 1 つのみ
		const allActiveLinks = toc.shadowRoot?.querySelectorAll('[aria-current="location"]');
		if (allActiveLinks?.length !== 1) {
			throw new Error(`Expected 1 active link, got ${String(allActiveLinks?.length ?? 0)}`);
		}

		// テスト: アクティブリンクに is-active クラスがある
		if (!activeLink.classList.contains('is-active')) {
			throw new Error('Active link should have is-active class');
		}

		// テスト: 非アクティブリンクに aria-current がない
		const links = toc.shadowRoot?.querySelectorAll('a.toc-link');
		links?.forEach((link) => {
			if (link !== activeLink && link.hasAttribute('aria-current')) {
				throw new Error('Non-active links should not have aria-current');
			}
		});

		console.log('✅ All tests passed for WithActiveItem story');
	},
};

// ──────────────────────────────────────────────
// ネスト階層（H2 + H3）
// ──────────────────────────────────────────────

/**
 * H2 + H3 の階層構造。
 *
 * H3 項目は H2 よりも `--space-2` (8px) 分インデントされます。
 * `var(--level)` CSS カスタムプロパティが各 `<li>` に設定されます。
 * - H2 → `--level: 0`
 * - H3 → `--level: 1`
 */
export const Nested: Story = {
	render: () => html`
		<div style="width: 220px;">
			<ui-toc
				id="nested-toc"
				.headers="${nestedHeaders}"
				active-id="setup"
			></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#nested-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		const listItems = toc.shadowRoot?.querySelectorAll('li');
		if (!listItems) throw new Error('No list items found');

		// テスト: 8つのアイテムが存在する（nestedHeaders の件数に一致）
		if (listItems.length !== nestedHeaders.length) {
			throw new Error(
				`Expected ${String(nestedHeaders.length)} items, got ${String(listItems.length)}`,
			);
		}

		// テスト: H2 アイテム（index 0, 3, 7）は --level: 0
		const h2Indices = [0, 3, 7];
		for (const idx of h2Indices) {
			const li = listItems[idx];
			const level = li?.style.getPropertyValue('--level').trim();
			if (level !== '0') {
				throw new Error(`H2 item at index ${String(idx)} should have --level: 0, got "${level ?? 'undefined'}"`);
			}
		}

		// テスト: H3 アイテム（index 1, 2, 4, 5, 6）は --level: 1
		const h3Indices = [1, 2, 4, 5, 6];
		for (const idx of h3Indices) {
			const li = listItems[idx];
			const level = li?.style.getPropertyValue('--level').trim();
			if (level !== '1') {
				throw new Error(`H3 item at index ${String(idx)} should have --level: 1, got "${level ?? 'undefined'}"`);
			}
		}

		// テスト: アクティブな H3 アイテムに aria-current="location" がある
		const activeLink = toc.shadowRoot?.querySelector('[aria-current="location"]');
		if (!activeLink) throw new Error('Active link not found');
		if (activeLink.getAttribute('href') !== '#setup') {
			throw new Error(
				`Expected active href="#setup", got "${activeLink.getAttribute('href') ?? 'null'}"`,
			);
		}

		console.log('✅ All tests passed for Nested story');
	},
};

// ──────────────────────────────────────────────
// 深いネスト（H2 + H3 + H4）
// ──────────────────────────────────────────────

/**
 * H2 + H3 + H4 の深い階層構造。
 *
 * 各レベルは正規化され:
 * - H2 → `--level: 0`
 * - H3 → `--level: 1`
 * - H4 → `--level: 2`
 */
export const DeepNesting: Story = {
	render: () => html`
		<div style="width: 240px;">
			<ui-toc
				id="deep-toc"
				.headers="${deepNestedHeaders}"
				active-id="frontend"
			></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#deep-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		const listItems = toc.shadowRoot?.querySelectorAll('li');
		if (!listItems) throw new Error('No list items found');

		if (listItems.length !== deepNestedHeaders.length) {
			throw new Error(
				`Expected ${String(deepNestedHeaders.length)} items, got ${String(listItems.length)}`,
			);
		}

		// テスト: H2 アイテム（index 0, 4, 8）は --level: 0
		const h2Indices = [0, 4, 8];
		for (const idx of h2Indices) {
			const li = listItems[idx];
			const level = li?.style.getPropertyValue('--level').trim();
			if (level !== '0') {
				throw new Error(`H2 item at index ${String(idx)} should have --level: 0, got "${level ?? 'undefined'}"`);
			}
		}

		// テスト: H3 アイテム（index 1, 5）は --level: 1
		const h3Indices = [1, 5];
		for (const idx of h3Indices) {
			const li = listItems[idx];
			const level = li?.style.getPropertyValue('--level').trim();
			if (level !== '1') {
				throw new Error(`H3 item at index ${String(idx)} should have --level: 1, got "${level ?? 'undefined'}"`);
			}
		}

		// テスト: H4 アイテム（index 2, 3, 6, 7）は --level: 2
		const h4Indices = [2, 3, 6, 7];
		for (const idx of h4Indices) {
			const li = listItems[idx];
			const level = li?.style.getPropertyValue('--level').trim();
			if (level !== '2') {
				throw new Error(`H4 item at index ${String(idx)} should have --level: 2, got "${level ?? 'undefined'}"`);
			}
		}

		// テスト: H4 アクティブアイテムのインジケーターが表示されている
		const activeLink = toc.shadowRoot?.querySelector('[aria-current="location"]');
		if (!activeLink) throw new Error('Active link not found');
		if (activeLink.getAttribute('href') !== '#frontend') {
			throw new Error(
				`Expected active href="#frontend", got "${activeLink.getAttribute('href') ?? 'null'}"`,
			);
		}

		console.log('✅ All tests passed for DeepNesting story');
	},
};

// ──────────────────────────────────────────────
// 境界条件: 先頭アイテムがアクティブ
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: 先頭アイテムがアクティブ。
 *
 * リストの最初の項目にインジケーターが表示されます。
 * ページ冒頭を読んでいる状態を表します。
 */
export const ActiveFirst: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: 先頭アイテムがアクティブ。ページ冒頭を読んでいる状態。',
			},
		},
	},
	render: () => html`
		<div style="width: 200px;">
			<ui-toc id="first-toc" .headers="${flatH2Headers}" active-id="intro"></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#first-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		// テスト: 最初のリンクがアクティブ
		const links = toc.shadowRoot?.querySelectorAll('a.toc-link');
		if (!links || links.length === 0) throw new Error('No links found');

		const firstLink = links[0];
		if (!firstLink) throw new Error('First link not found');

		if (firstLink.getAttribute('aria-current') !== 'location') {
			throw new Error('First link should have aria-current="location"');
		}
		if (!firstLink.classList.contains('is-active')) {
			throw new Error('First link should have is-active class');
		}

		// テスト: 他のリンクはアクティブでない
		for (let i = 1; i < links.length; i++) {
			if (links[i]?.hasAttribute('aria-current')) {
				throw new Error(`Link at index ${String(i)} should not have aria-current`);
			}
		}

		console.log('✅ All tests passed for ActiveFirst story');
	},
};

// ──────────────────────────────────────────────
// 境界条件: 末尾アイテムがアクティブ
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: 末尾アイテムがアクティブ。
 *
 * リストの最後の項目にインジケーターが表示されます。
 * 記事末尾（まとめ等）を読んでいる状態を表します。
 */
export const ActiveLast: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: 末尾アイテムがアクティブ。記事末尾を読んでいる状態。',
			},
		},
	},
	render: () => html`
		<div style="width: 200px;">
			<ui-toc id="last-toc" .headers="${flatH2Headers}" active-id="conclusion"></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#last-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		const links = toc.shadowRoot?.querySelectorAll('a.toc-link');
		if (!links || links.length === 0) throw new Error('No links found');

		const lastLink = links[links.length - 1];
		if (!lastLink) throw new Error('Last link not found');

		// テスト: 最後のリンクがアクティブ
		if (lastLink.getAttribute('aria-current') !== 'location') {
			throw new Error('Last link should have aria-current="location"');
		}
		if (!lastLink.classList.contains('is-active')) {
			throw new Error('Last link should have is-active class');
		}

		// テスト: 最後のリンクの href が正しい
		if (lastLink.getAttribute('href') !== '#conclusion') {
			throw new Error(
				`Expected last link href="#conclusion", got "${lastLink.getAttribute('href') ?? 'null'}"`,
			);
		}

		console.log('✅ All tests passed for ActiveLast story');
	},
};

// ──────────────────────────────────────────────
// 境界条件: アイテムが 1 件
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: 見出しが 1 件のみ。
 *
 * 単一見出しの記事（または目次が 1 項目のみ表示される場合）。
 * アイテムが 1 件でも正常に動作することを確認します。
 */
export const SingleItem: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: 見出しが 1 件のみ。単一のリンクが正常にレンダリングされます。',
			},
		},
	},
	render: () => html`
		<div style="width: 200px;">
			<ui-toc
				id="single-toc"
				.headers="${[{ id: 'only', text: '唯一の見出し', level: 2 }]}"
				active-id="only"
			></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#single-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		// テスト: nav が存在する
		const nav = toc.shadowRoot?.querySelector('nav');
		if (!nav) throw new Error('nav element not found');

		// テスト: リンクが 1 件
		const links = toc.shadowRoot?.querySelectorAll('a.toc-link');
		if (links?.length !== 1) {
			throw new Error(`Expected 1 link, got ${String(links?.length ?? 0)}`);
		}

		// テスト: アイテムの --level が 0（単一レベルの正規化）
		const li = toc.shadowRoot?.querySelector('li');
		const level = li?.style.getPropertyValue('--level').trim();
		if (level !== '0') {
			throw new Error(`Expected --level: 0 for single H2, got "${level ?? 'undefined'}"`);
		}

		// テスト: アクティブ状態
		const activeLink = links[0];
		if (!activeLink) throw new Error('Link not found');
		if (activeLink.getAttribute('aria-current') !== 'location') {
			throw new Error('Single link should have aria-current="location"');
		}

		console.log('✅ All tests passed for SingleItem story');
	},
};

// ──────────────────────────────────────────────
// 境界条件: 空の配列
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: `headers` が空の配列。
 *
 * 見出しがない場合、コンポーネントは何も表示しません。
 * `nav` 要素も生成されません。
 */
export const EmptyHeaders: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: `headers` が空の配列の場合、何も表示されません（`nav` 要素も生成されません）。',
			},
		},
	},
	render: () => html`
		<div
			style="border: 1px dashed oklch(80% 0.05 250 / 0.4); padding: 1rem; min-height: 50px; width: 200px;"
		>
			<div
				style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem;"
			>
				空の配列（何も表示されない）
			</div>
			<ui-toc id="empty-toc" .headers="${[]}"></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#empty-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		// テスト: nav 要素が存在しない（nothing を返す）
		const nav = toc.shadowRoot?.querySelector('nav');
		if (nav) throw new Error('nav element should not exist for empty headers');

		// テスト: リンクが存在しない
		const links = toc.shadowRoot?.querySelectorAll('a');
		if (links && links.length > 0) {
			throw new Error(`Expected 0 links, got ${String(links.length)}`);
		}

		console.log('✅ All tests passed for EmptyHeaders story');
	},
};

// ──────────────────────────────────────────────
// 境界条件: H3 のみ（レベル正規化）
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: H3 のみの見出し一覧。
 *
 * 最小レベルが H3 の場合、全アイテムは `--level: 0` に正規化されます。
 * H2 が存在しなくても、インデントなしで正常に表示されます。
 */
export const OnlySubheadings: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: H3 のみの場合、最小レベル(H3=3)を基準に全アイテムが `--level: 0` に正規化されます。',
			},
		},
	},
	render: () => html`
		<div style="width: 200px;">
			<ui-toc
				id="h3only-toc"
				.headers="${[
					{ id: 'setup', text: '環境構築', level: 3 },
					{ id: 'config', text: '設定', level: 3 },
					{ id: 'deploy', text: 'デプロイ', level: 3 },
				]}"
				active-id="config"
			></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#h3only-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		// テスト: 3件のリンクが存在する
		const links = toc.shadowRoot?.querySelectorAll('a.toc-link');
		if (links?.length !== 3) {
			throw new Error(`Expected 3 links, got ${String(links?.length ?? 0)}`);
		}

		// テスト: 全ての <li> の --level が 0（H3 を基準に正規化）
		const listItems = toc.shadowRoot?.querySelectorAll('li');
		listItems?.forEach((li, idx) => {
			const level = li.style.getPropertyValue('--level').trim();
			if (level !== '0') {
				throw new Error(
					`H3 item at index ${String(idx)} should normalize to --level: 0, got "${level}"`,
				);
			}
		});

		// テスト: アクティブアイテムが正しい
		const activeLink = toc.shadowRoot?.querySelector('[aria-current="location"]');
		if (!activeLink) throw new Error('Active link not found');
		if (activeLink.getAttribute('href') !== '#config') {
			throw new Error(
				`Expected active href="#config", got "${activeLink.getAttribute('href') ?? 'null'}"`,
			);
		}

		console.log('✅ All tests passed for OnlySubheadings story');
	},
};

// ──────────────────────────────────────────────
// 境界条件: スパースなレベル（H1, H3, H5）
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: H1, H3, H5 のような歯抜けのレベル構造。
 *
 * 正規化ロジックは `level - minLevel` で算出するため:
 * - H1 → `--level: 0`（最小）
 * - H3 → `--level: 2`（歯抜け）
 * - H5 → `--level: 4`（歯抜け）
 *
 * 意図的にインデントが大きくなります（歯抜けの見出し構造は避けることを推奨）。
 */
export const SparseLevels: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: H1, H3, H5 のような歯抜け構造。正規化は `level - minLevel` で算出するため、インデントが飛び飛びになります。',
			},
		},
	},
	render: () => html`
		<div style="width: 240px;">
			<ui-toc
				id="sparse-toc"
				.headers="${[
					{ id: 'top', text: 'トップレベル見出し', level: 1 },
					{ id: 'sub', text: '第三レベル見出し', level: 3 },
					{ id: 'deep', text: '第五レベル見出し', level: 5 },
				]}"
				active-id="sub"
			></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#sparse-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		const listItems = toc.shadowRoot?.querySelectorAll('li');
		if (listItems?.length !== 3) {
			throw new Error(`Expected 3 items, got ${String(listItems?.length ?? 0)}`);
		}

		// テスト: H1 → --level: 0
		const h1Level = listItems[0]?.style.getPropertyValue('--level').trim();
		if (h1Level !== '0') {
			throw new Error(`H1 should have --level: 0, got "${h1Level ?? 'undefined'}"`);
		}

		// テスト: H3 → --level: 2 (3 - 1 = 2)
		const h3Level = listItems[1]?.style.getPropertyValue('--level').trim();
		if (h3Level !== '2') {
			throw new Error(`H3 should have --level: 2, got "${h3Level ?? 'undefined'}"`);
		}

		// テスト: H5 → --level: 4 (5 - 1 = 4)
		const h5Level = listItems[2]?.style.getPropertyValue('--level').trim();
		if (h5Level !== '4') {
			throw new Error(`H5 should have --level: 4, got "${h5Level ?? 'undefined'}"`);
		}

		console.log('✅ All tests passed for SparseLevels story');
	},
};

// ──────────────────────────────────────────────
// 境界条件: 長いテキスト
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: 非常に長い見出しテキスト。
 *
 * `text-overflow: ellipsis` と `white-space: nowrap` により、
 * コンテナ幅を超える長いテキストが省略表示されます。
 * コンポーネントのレイアウトが崩れないことを確認します。
 */
export const LongText: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: 長い見出しテキスト。`text-overflow: ellipsis` で省略表示されます。',
			},
		},
	},
	render: () => html`
		<div style="width: 200px;">
			<ui-toc
				id="longtext-toc"
				.headers="${[
					{
						id: 'long1',
						text: 'とても長い見出しテキストがここに入ります：これはオーバーフローテストです',
						level: 2,
					},
					{
						id: 'long2',
						text: '通常の長さ',
						level: 2,
					},
					{
						id: 'long3',
						text: 'Another extremely long heading text that should be truncated with ellipsis in the TOC sidebar',
						level: 3,
					},
				]}"
				active-id="long1"
			></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#longtext-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		// テスト: 3件のリンクが存在する
		const links = toc.shadowRoot?.querySelectorAll('a.toc-link');
		if (links?.length !== 3) {
			throw new Error(`Expected 3 links, got ${String(links?.length ?? 0)}`);
		}

		// テスト: コンポーネントが存在し、コンテナ幅を超えていない
		const hostRect = toc.getBoundingClientRect();
		if (hostRect.width > 220) {
			// 200px コンテナ + 余裕
			throw new Error(`TOC width (${String(Math.round(hostRect.width))}px) exceeds container`);
		}

		// テスト: long1 がアクティブ
		const activeLink = toc.shadowRoot?.querySelector('[aria-current="location"]');
		if (!activeLink) throw new Error('Active link not found');
		if (activeLink.getAttribute('href') !== '#long1') {
			throw new Error(
				`Expected active href="#long1", got "${activeLink.getAttribute('href') ?? 'null'}"`,
			);
		}

		// テスト: 長いテキストリンクに text-overflow スタイルが適用されている
		const firstLink = links[0];
		if (!firstLink) throw new Error('First link not found');
		const computedStyle = window.getComputedStyle(firstLink);
		if (computedStyle.overflow !== 'hidden') {
			throw new Error(`Expected overflow: hidden, got "${computedStyle.overflow}"`);
		}
		if (computedStyle.textOverflow !== 'ellipsis') {
			throw new Error(
				`Expected text-overflow: ellipsis, got "${computedStyle.textOverflow}"`,
			);
		}

		console.log('✅ All tests passed for LongText story');
	},
};

// ──────────────────────────────────────────────
// クリックインタラクション（アクティブID の更新）
// ──────────────────────────────────────────────

/**
 * クリックインタラクション: リンクをクリックすると activeId が更新される。
 *
 * - `event.preventDefault()` でページ遷移をキャンセルします。
 * - `activeId` が即座に更新され、`aria-current="location"` が切り替わります。
 * - クリック起因のため `is-click` クラスが付与され、フェードインアニメーションが動作します。
 *
 * **テスト内容**: play() 関数でリンクをクリックし、DOM の更新を検証します。
 */
export const ClickToActivate: Story = {
	render: () => html`
		<div style="display: grid; grid-template-columns: 220px minmax(280px, 1fr); gap: 1.5rem;">
			<div style="width: 200px;">
				<ui-toc
					id="click-toc"
					.headers="${flatH2Headers}"
					active-id="intro"
				></ui-toc>
			</div>
			<article style="max-width: 600px;">
				<h2 id="intro">はじめに</h2>
				<div style="height: 180px;"></div>
				<h2 id="background">背景と目的</h2>
				<div style="height: 180px;"></div>
				<h2 id="implementation">実装方法</h2>
				<div style="height: 180px;"></div>
				<h2 id="results">結果と考察</h2>
				<div style="height: 180px;"></div>
				<h2 id="conclusion">まとめ</h2>
				<div style="height: 180px;"></div>
			</article>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#click-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		// テスト: ターゲット見出しが存在し、スクロール経路が有効である
		const targetHeading = document.getElementById('implementation');
		if (!targetHeading) throw new Error('Expected #implementation heading in document');

		// 初期状態の確認: intro がアクティブ
		let activeLink = toc.shadowRoot?.querySelector('[aria-current="location"]');
		if (!activeLink) throw new Error('Initial active link not found');
		if (activeLink.getAttribute('href') !== '#intro') {
			throw new Error(
				`Expected initial active href="#intro", got "${activeLink.getAttribute('href') ?? 'null'}"`,
			);
		}

		// 「実装方法」リンクをクリック
		const implementationLink = toc.shadowRoot?.querySelector<HTMLAnchorElement>(
			'a[href="#implementation"]',
		);
		if (!implementationLink) throw new Error('Implementation link not found');
		implementationLink.click();
		await toc.updateComplete;

		// テスト: activeId が更新されている
		if (toc.activeId !== 'implementation') {
			throw new Error(
				`Expected activeId="implementation" after click, got "${toc.activeId}"`,
			);
		}

		// テスト: 新しいアクティブリンクに aria-current="location" がある
		activeLink = toc.shadowRoot?.querySelector('[aria-current="location"]');
		if (!activeLink) throw new Error('Active link not found after click');
		if (activeLink.getAttribute('href') !== '#implementation') {
			throw new Error(
				`Expected active href="#implementation" after click, got "${activeLink.getAttribute('href') ?? 'null'}"`,
			);
		}

		// テスト: クリック起因のクラスが付与されている
		if (!activeLink.classList.contains('is-click')) {
			throw new Error('Clicked link should have is-click class');
		}
		if (!activeLink.classList.contains('is-active')) {
			throw new Error('Clicked link should have is-active class');
		}

		// テスト: 旧アクティブリンクがアクティブでなくなっている
		const oldLink = toc.shadowRoot?.querySelector<HTMLAnchorElement>('a[href="#intro"]');
		if (!oldLink) throw new Error('Old link not found');
		if (oldLink.hasAttribute('aria-current')) {
			throw new Error('Old active link should no longer have aria-current');
		}
		if (oldLink.classList.contains('is-active')) {
			throw new Error('Old active link should not have is-active class');
		}

		// 「まとめ」リンクをクリック（連続クリックのテスト）
		const conclusionLink = toc.shadowRoot?.querySelector<HTMLAnchorElement>(
			'a[href="#conclusion"]',
		);
		if (!conclusionLink) throw new Error('Conclusion link not found');
		conclusionLink.click();
		await toc.updateComplete;

		// TypeScript のフロー解析が以前の narrowing を引き継ぐため、as string でリセット
		const activeIdAfterSecond = toc.activeId as string;
		if (activeIdAfterSecond !== 'conclusion') {
			throw new Error(
				`Expected activeId="conclusion" after second click, got "${activeIdAfterSecond}"`,
			);
		}

		const finalActive = toc.shadowRoot?.querySelector('[aria-current="location"]');
		if (finalActive?.getAttribute('href') !== '#conclusion') {
			throw new Error('Final active link should be "#conclusion"');
		}

		console.log('✅ All tests passed for ClickToActivate story');
	},
};

// ──────────────────────────────────────────────
// 境界条件: activeId がどの見出しにも一致しない
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: `activeId` がどの見出し ID にも一致しない。
 *
 * 存在しない ID を `activeId` に設定した場合、
 * どのリンクもアクティブにならず、コンポーネントが正常に表示されることを確認します。
 */
export const ActiveIdNotFound: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: `activeId` がどの見出し ID にも一致しない。どのリンクもアクティブにならず、正常にレンダリングされます。',
			},
		},
	},
	render: () => html`
		<div style="width: 200px;">
			<ui-toc
				id="notfound-toc"
				.headers="${flatH2Headers}"
				active-id="nonexistent-id"
			></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#notfound-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		// テスト: nav が存在する（壊れていない）
		const nav = toc.shadowRoot?.querySelector('nav');
		if (!nav) throw new Error('nav element not found');

		// テスト: 5件のリンクが正常に表示されている
		const links = toc.shadowRoot?.querySelectorAll('a.toc-link');
		if (links?.length !== 5) {
			throw new Error(`Expected 5 links, got ${String(links?.length ?? 0)}`);
		}

		// テスト: どのリンクも aria-current を持たない
		const activeLinks = toc.shadowRoot?.querySelectorAll('[aria-current]');
		if (activeLinks && activeLinks.length > 0) {
			throw new Error(`Expected 0 active links when ID not found, got ${String(activeLinks.length)}`);
		}

		// テスト: どのリンクも is-active クラスを持たない
		const activeClassLinks = toc.shadowRoot?.querySelectorAll('.is-active');
		if (activeClassLinks && activeClassLinks.length > 0) {
			throw new Error(`Expected 0 is-active links, got ${String(activeClassLinks.length)}`);
		}

		console.log('✅ All tests passed for ActiveIdNotFound story');
	},
};

// ──────────────────────────────────────────────
// アクセシビリティ: ARIA 構造確認
// ──────────────────────────────────────────────

/**
 * アクセシビリティ: ARIA 構造の確認。
 *
 * スクリーンリーダーが正しく解釈できる構造を検証します:
 * - `<nav aria-label="Table of Contents">`: ランドマークナビゲーション
 * - `<ul>` > `<li>` > `<a>`: ネイティブリンクのリスト
 * - `aria-current="location"`: アクティブ位置の通知
 * - `href="#id"`: アンカーリンク（標準的なナビゲーション）
 */
export const AccessibilityStructure: Story = {
	render: () => html`
		<div style="width: 200px;">
			<ui-toc
				id="a11y-toc"
				.headers="${nestedHeaders}"
				active-id="implementation"
			></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#a11y-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		const shadow = toc.shadowRoot;
		if (!shadow) throw new Error('shadowRoot not found');

		// テスト: nav > ul > li > a の正しい構造
		const nav = shadow.querySelector('nav');
		if (!nav) throw new Error('nav not found');

		const ul = nav.querySelector('ul');
		if (!ul) throw new Error('ul not found inside nav');

		const listItems = ul.querySelectorAll(':scope > li');
		if (listItems.length !== nestedHeaders.length) {
			throw new Error(
				`Expected ${String(nestedHeaders.length)} li elements, got ${String(listItems.length)}`,
			);
		}

		// テスト: 各 li に a 要素が 1 つだけある
		listItems.forEach((li, idx) => {
			const anchors = li.querySelectorAll('a');
			if (anchors.length !== 1) {
				throw new Error(
					`Expected 1 anchor in li[${String(idx)}], got ${String(anchors.length)}`,
				);
			}
		});

		// テスト: nav の aria-label が正しい
		if (nav.getAttribute('aria-label') !== 'Table of Contents') {
			throw new Error(
				`Expected aria-label="Table of Contents", got "${nav.getAttribute('aria-label') ?? 'null'}"`,
			);
		}

		// テスト: アクティブリンクの aria-current="location"（"page" ではなく "location"）
		const activeLink = shadow.querySelector('[aria-current]');
		if (!activeLink) throw new Error('No element with aria-current found');
		if (activeLink.getAttribute('aria-current') !== 'location') {
			throw new Error(
				`Expected aria-current="location", got "${activeLink.getAttribute('aria-current') ?? 'null'}"`,
			);
		}

		// テスト: 非アクティブリンクに aria-current 属性が存在しない（false ではなく属性なし）
		const allLinks = shadow.querySelectorAll('a.toc-link');
		let ariaCurrentCount = 0;
		allLinks.forEach((link) => {
			if (link.hasAttribute('aria-current')) {
				ariaCurrentCount++;
			}
		});
		if (ariaCurrentCount !== 1) {
			throw new Error(
				`Expected exactly 1 link with aria-current, got ${String(ariaCurrentCount)}`,
			);
		}

			// テスト: 全リンクの href が # で始まる
			allLinks.forEach((link, idx) => {
				const href = link.getAttribute('href');
				if (!href?.startsWith('#')) {
					throw new Error(`Link[${String(idx)}] href should start with "#", got "${href ?? 'null'}"`);
				}
			});

			// 構造型リンク契約: デフォルトは下線なし
			const firstLink = allLinks[0];
			if (!firstLink) throw new Error('first toc-link not found');
			if (getComputedStyle(firstLink).textDecorationLine !== 'none') {
				throw new Error('toc-link は構造型リンクとしてデフォルト下線なしである必要があります');
			}

			// 構造型リンク契約: 現在地はインジケータ定義と active class の組み合わせで識別できる
			if (!activeLink.classList.contains('is-active')) {
				throw new Error('active toc-link に is-active クラスが必要です');
			}

			// 構造型リンク契約: focus-visible のルールが定義されている
			const styleText = getShadowStylesText(shadow);
			if (!styleText.includes('.toc-link:focus-visible')) {
				throw new Error('toc-link の focus-visible 契約が不足しています');
			}
			if (!styleText.includes('.toc-link.is-active.is-scroll::before')) {
				throw new Error('toc-link の現在地インジケータ契約が不足しています');
			}

			console.log('✅ All tests passed for AccessibilityStructure story');
		},
	};

// ──────────────────────────────────────────────
// アクセシビリティ: キーボード / タッチターゲット
// ──────────────────────────────────────────────

/**
 * キーボードナビゲーションとタッチターゲット寸法の確認。
 *
 * - Roving Tabindex を使用しない（`tabindex` を各リンクに付与しない）
 * - リンクの最小高さが 24px 以上
 * - モバイル幅では 44px 以上
 */
export const KeyboardAndTouchTarget: Story = {
	render: () => html`
		<div style="width: 220px;">
			<ui-toc id="kbd-touch-toc" .headers="${nestedHeaders}" active-id="implementation"></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#kbd-touch-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		const links = toc.shadowRoot?.querySelectorAll<HTMLAnchorElement>('a.toc-link');
		if (!links || links.length === 0) throw new Error('No toc links found');

		// テスト: Roving Tabindex を使用しない（属性なし）
		links.forEach((link, idx) => {
			if (link.hasAttribute('tabindex')) {
				throw new Error(`Link[${String(idx)}] should not have tabindex`);
			}
		});

		// テスト: 最小タッチターゲット寸法
		const firstLink = links[0];
		if (!firstLink) throw new Error('first link not found');
		const minHeight = Number.parseFloat(getComputedStyle(firstLink).minHeight);
		if (!Number.isFinite(minHeight) || minHeight < 24) {
			throw new Error(`Expected min-height >= 24px, got ${String(minHeight)}`);
		}

		// モバイル幅での要件（環境依存のため条件付き）
		if (window.matchMedia('(max-width: 1023px)').matches && minHeight < 44) {
			throw new Error(`Expected mobile min-height >= 44px, got ${String(minHeight)}`);
		}
	},
};

// ──────────────────────────────────────────────
// ダークモード
// ──────────────────────────────────────────────

/**
 * ダークモードでの視認性確認。
 *
 * `prefers-color-scheme: dark` が有効なとき、
 * 非アクティブとアクティブの色差が維持されることを確認します。
 */
export const DarkMode: Story = {
	render: () => html`
		<div style="width: 220px;">
			<ui-toc id="dark-toc" .headers="${flatH2Headers}" active-id="implementation"></ui-toc>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#dark-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		const activeLink = toc.shadowRoot?.querySelector<HTMLAnchorElement>('a.toc-link.is-active');
		const inactiveLink = toc.shadowRoot?.querySelector<HTMLAnchorElement>(
			'a.toc-link:not(.is-active)',
		);
		if (!activeLink || !inactiveLink) {
			throw new Error('Expected active and inactive links');
		}

		const activeColor = getComputedStyle(activeLink).color;
		const inactiveColor = getComputedStyle(inactiveLink).color;
		if (activeColor === inactiveColor) {
			throw new Error('Active and inactive text colors should differ');
		}

		if (!window.matchMedia('(prefers-color-scheme: dark)').matches) {
			console.warn(
				'DarkMode story: prefers-color-scheme: dark を有効化して暗色環境の最終色を確認してください',
			);
		}
	},
};

// ──────────────────────────────────────────────
// 全状態一覧
// ──────────────────────────────────────────────

/**
 * 全状態の一覧。
 *
 * すべての主要な状態・バリアントを一覧で確認できます。
 * デザインレビューやビジュアルリグレッションテストに使用します。
 */
export const AllStates: Story = {
	render: () => html`
		<style>
			.states-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
				gap: 2rem;
				max-width: 900px;
			}

			.state-group {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
			}

			.state-label {
				font-size: 11px;
				font-weight: 500;
				color: oklch(48% 0.01 250);
				text-transform: uppercase;
				letter-spacing: 0.05em;
			}

			.toc-wrapper {
				padding: 0.5rem 0;
				border-inline-start: 1px solid oklch(0% 0 0 / 0.08);
				padding-inline-start: 0.5rem;
			}
		</style>

		<div class="states-grid">
			<div class="state-group">
				<div class="state-label">フラット H2（アクティブなし）</div>
				<div class="toc-wrapper">
					<ui-toc .headers="${flatH2Headers}"></ui-toc>
				</div>
			</div>

			<div class="state-group">
				<div class="state-label">フラット H2（中間アクティブ）</div>
				<div class="toc-wrapper">
					<ui-toc .headers="${flatH2Headers}" active-id="implementation"></ui-toc>
				</div>
			</div>

			<div class="state-group">
				<div class="state-label">ネスト H2 + H3</div>
				<div class="toc-wrapper">
					<ui-toc .headers="${nestedHeaders}" active-id="setup"></ui-toc>
				</div>
			</div>

			<div class="state-group">
				<div class="state-label">深いネスト H2 + H3 + H4</div>
				<div class="toc-wrapper">
					<ui-toc .headers="${deepNestedHeaders}" active-id="frontend"></ui-toc>
				</div>
			</div>

			<div class="state-group">
				<div class="state-label">先頭アクティブ</div>
				<div class="toc-wrapper">
					<ui-toc .headers="${flatH2Headers}" active-id="intro"></ui-toc>
				</div>
			</div>

			<div class="state-group">
				<div class="state-label">末尾アクティブ</div>
				<div class="toc-wrapper">
					<ui-toc .headers="${flatH2Headers}" active-id="conclusion"></ui-toc>
				</div>
			</div>

			<div class="state-group">
				<div class="state-label">1 件のみ</div>
				<div class="toc-wrapper">
					<ui-toc
						.headers="${[{ id: 'only', text: '唯一の見出し', level: 2 }]}"
						active-id="only"
					></ui-toc>
				</div>
			</div>

			<div class="state-group">
				<div class="state-label">H3 のみ（正規化 → level: 0）</div>
				<div class="toc-wrapper">
					<ui-toc
						.headers="${[
							{ id: 'a', text: '環境構築', level: 3 },
							{ id: 'b', text: '設定', level: 3 },
							{ id: 'c', text: 'デプロイ', level: 3 },
						]}"
						active-id="b"
					></ui-toc>
				</div>
			</div>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const allTocs = canvasElement.querySelectorAll<Toc>('ui-toc');
		await Promise.all([...allTocs].map((toc) => toc.updateComplete));

		// テスト: 8つのコンポーネントが存在する
		if (allTocs.length !== 8) {
			throw new Error(`Expected 8 toc components, got ${String(allTocs.length)}`);
		}

		// テスト: アクティブなしのコンポーネント（1番目）にアクティブリンクがない
		const firstToc = allTocs[0];
		if (!firstToc) throw new Error('First toc not found');
		const firstActiveLinks = firstToc.shadowRoot?.querySelectorAll('[aria-current="location"]');
		if (firstActiveLinks && firstActiveLinks.length > 0) {
			throw new Error('First TOC (no active-id) should have no active links');
		}

		// テスト: アクティブありのコンポーネント（2番目）にアクティブリンクが1つある
		const secondToc = allTocs[1];
		if (!secondToc) throw new Error('Second toc not found');
		const secondActiveLinks = secondToc.shadowRoot?.querySelectorAll(
			'[aria-current="location"]',
		);
		if (secondActiveLinks?.length !== 1) {
			throw new Error(
				`Second TOC should have 1 active link, got ${String(secondActiveLinks?.length ?? 0)}`,
			);
		}

		console.log('✅ All tests passed for AllStates story');
	},
};

// ──────────────────────────────────────────────
// Reduced Motion / Forced Colors（手動確認）
// ──────────────────────────────────────────────

/**
 * Reduced Motion および Forced Colors Mode の確認。
 *
 * 視覚確認を主目的としつつ、条件付きで最低限の自動検証も行います。
 *
 * **確認方法**:
 * - **Reduced Motion**: OS 設定でアニメーション削減を有効化し、クリック時にフェードインなしで
 *   インジケーターが即座に切り替わることを確認してください。
 * - **Forced Colors**: Chrome DevTools の Rendering タブから
 *   `forced-colors: active` をエミュレートし、インジケーターが `border` で表示されることを確認してください。
 */
export const VisualAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story: `
**Reduced Motion** と **Forced Colors Mode** の手動確認ストーリーです。

### Reduced Motion の確認
- Windows: 設定 > アクセシビリティ > 視覚効果 > アニメーション効果をオフ
- macOS: システム設定 > アクセシビリティ > ディスプレイ > 視差効果を減らす
- クリック時のフェードインが \`0.01ms\` になり、インジケーターが即座に切り替わることを確認

### Forced Colors Mode の確認
- Chrome DevTools: Rendering > Emulate CSS media feature \`forced-colors: active\`
- アクティブインジケーターが \`background-color\` ではなく \`border: Highlight\` で表示されることを確認
				`,
			},
		},
	},
	render: () => html`
		<div style="display: flex; gap: 3rem; flex-wrap: wrap;">
			<div>
				<div
					style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;"
				>
					Reduced Motion / Forced Colors のテスト
				</div>
				<div style="width: 200px;">
					<ui-toc
						id="visual-a11y-toc"
						.headers="${nestedHeaders}"
						active-id="implementation"
					></ui-toc>
				</div>
			</div>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const toc = canvasElement.querySelector<Toc>('#visual-a11y-toc');
		if (!toc) throw new Error('ui-toc not found');
		await toc.updateComplete;

		// click起因にして ::before の計算スタイルを評価
		const targetLink = toc.shadowRoot?.querySelector<HTMLAnchorElement>('a[href="#setup"]');
		if (!targetLink) throw new Error('target link not found');
		targetLink.click();
		await toc.updateComplete;

		const activeAfterClick = toc.shadowRoot?.querySelector<HTMLAnchorElement>(
			'a.toc-link.is-active.is-click',
		);
		if (!activeAfterClick) throw new Error('clicked active link not found');

		const beforeStyle = getComputedStyle(activeAfterClick, '::before');
		const animationDuration = beforeStyle.animationDuration;

		// Reduced Motion 時: click起因アニメーションが実質瞬時化される
		if (
			window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
			animationDuration !== '0.01ms'
		) {
			throw new Error(`Expected animation-duration 0.01ms in reduce mode, got "${animationDuration}"`);
		}

		// Forced Colors 時: インジケーターが border ベースで可視化される
		if (window.matchMedia('(forced-colors: active)').matches) {
			if (beforeStyle.borderStyle === 'none') {
				throw new Error('Expected active indicator border in forced-colors mode');
			}
		}
	},
};
