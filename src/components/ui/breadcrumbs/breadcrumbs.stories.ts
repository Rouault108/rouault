import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './breadcrumbs';
import type { Breadcrumbs } from './breadcrumbs';

/**
 * ## パンくずリスト (Breadcrumbs) `<ui-breadcrumbs>`
 *
 * ユーザーが現在のページに至るまでのナビゲーション階層を視覚化し、
 * 上位階層へのナビゲーションを提供します。
 *
 * ### 設計思想
 *
 * - **階層の可視化**: 現在位置をコンテキスト内で明確化し、迷子を防止します。
 * - **静謐な存在**: コンテンツの主役を圧迫しない、控えめな UI として機能します。
 * - **省略戦略**: 深い階層では中間要素を省略し、最小限の情報で全体像を伝えます。
 *
 * ### アクセシビリティ
 *
 * - `<nav>` 要素に `aria-label="パンくずリスト"` を付与します。
 * - 最後のアイテム（現在ページ）には `aria-current="page"` を付与します。
 * - セパレーターは装飾的なので `aria-hidden="true"` を付与します。
 * - `<ol>` でセマンティックな順序付きリストを使用します。
 *
 * ### 省略ロジック
 *
 * `maxItems` が設定され、アイテム数がそれを超える場合：
 * - 最初のアイテム（ルート）と最後のアイテム（現在ページ）を常に表示します。
 * - 中間アイテムを省略記号（...）で置き換えます。
 */
const meta: Meta<Breadcrumbs> = {
	title: 'Components/Breadcrumbs',
	component: 'ui-breadcrumbs',
	tags: ['autodocs'],
	parameters: {
		docs: {
			description: {
				component: `
パンくずリストコンポーネントは、ユーザーが現在のページに至るまでのナビゲーション階層を視覚化します。

## 使用方法

\`\`\`html
<!-- 基本的な使用 -->
<ui-breadcrumbs .items="\${[
  { label: 'ホーム', href: '/' },
  { label: 'プロジェクト', href: '/projects' },
  { label: '設定' }
]}"></ui-breadcrumbs>

<!-- カスタムセパレーター -->
<ui-breadcrumbs separator="&gt;" .items="\${items}"></ui-breadcrumbs>

<!-- 省略機能（最大4アイテム） -->
<ui-breadcrumbs max-items="4" .items="\${manyItems}"></ui-breadcrumbs>
\`\`\`

## 注意事項

- **最後のアイテム**: 現在ページを表すため、リンクとして表示されません（\`href\` を省略）。
- **省略ロジック**: \`maxItems\` を超える場合、中間アイテムが省略されます。
- **長いラベル**: 各アイテムは \`max-width: 20ch\` でトランケートされます。
				`,
			},
		},
	},
	argTypes: {
		items: {
			control: 'object',
			description: 'パンくずアイテムの配列',
			table: { type: { summary: 'BreadcrumbItem[]' }, defaultValue: { summary: '[]' } },
		},
		separator: {
			control: 'text',
			description: 'セパレーター文字',
			table: { type: { summary: 'string' }, defaultValue: { summary: '/' } },
		},
		maxItems: {
			control: 'number',
			description: '最大表示アイテム数（null = 無制限）',
			table: { type: { summary: 'number | null' }, defaultValue: { summary: 'null' } },
		},
		ariaLabel: {
			control: 'text',
			description: 'nav 要素の aria-label',
			table: { type: { summary: 'string' }, defaultValue: { summary: 'パンくずリスト' } },
		},
	},
};

export default meta;
type Story = StoryObj<Breadcrumbs>;

// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * デフォルトのパンくずリスト（3階層）。
 *
 * 最も一般的な使用例です。最後のアイテムは現在ページを表すため、リンクではありません。
 */
export const Default: Story = {
	args: {
		separator: '/',
		maxItems: null,
		ariaLabel: 'パンくずリスト',
	},
	render: (args) => html`
		<ui-breadcrumbs
			id="default-breadcrumb"
			separator="${args.separator}"
			.maxItems="${args.maxItems}"
			aria-label="${args.ariaLabel}"
			.items="${[
				{ label: 'ホーム', href: '/' },
				{ label: 'プロジェクト', href: '/projects' },
				{ label: '設定' },
			]}"
		></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const breadcrumbs = canvasElement.querySelector<Breadcrumbs>('#default-breadcrumb');
		if (!breadcrumbs) throw new Error('ui-breadcrumbs not found');
		await breadcrumbs.updateComplete;

		// テスト: nav 要素が存在する
		const nav = breadcrumbs.shadowRoot?.querySelector('nav');
		if (!nav) throw new Error('nav element not found');

		// テスト: aria-label が設定されている
		if (nav.getAttribute('aria-label') !== 'パンくずリスト') {
			throw new Error(`Expected aria-label="パンくずリスト", got "${nav.getAttribute('aria-label') ?? 'null'}"`);
		}

		// テスト: 3つのアイテムが存在する
		const items = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items?.length !== 3) {
			throw new Error(`Expected 3 items, got ${String(items?.length ?? 0)}`);
		}

		// テスト: 最後のアイテムに aria-current="page" がある
		const currentPage = breadcrumbs.shadowRoot?.querySelector('[aria-current="page"]');
		if (!currentPage) throw new Error('aria-current="page" not found on last item');
		if (currentPage.textContent.trim() !== '設定') {
			throw new Error(`Expected current page to be "設定", got "${currentPage.textContent.trim()}"`);
		}

		// テスト: リンクが2つ存在する（最後以外）
		const links = breadcrumbs.shadowRoot?.querySelectorAll('a.breadcrumb-link');
		if (links?.length !== 2) {
			throw new Error(`Expected 2 links, got ${String(links?.length ?? 0)}`);
		}

		// テスト: セパレーターが2つ存在する
		const separators = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-separator');
		if (separators?.length !== 2) {
			throw new Error(`Expected 2 separators, got ${String(separators?.length ?? 0)}`);
		}

		// テスト: セパレーターに aria-hidden="true" がある
		const firstSeparator = separators[0];
		if (firstSeparator?.getAttribute('aria-hidden') !== 'true') {
			throw new Error('Separator should have aria-hidden="true"');
		}

		console.log('✅ All tests passed for Default story');
	},
};

// ──────────────────────────────────────────────
// 単一アイテム（ルートのみ）
// ──────────────────────────────────────────────

/**
 * 単一アイテム（ルートページのみ）。
 *
 * トップページや単一階層の場合に使用します。
 * セパレーターは表示されません。
 */
export const SingleItem: Story = {
	render: () => html`
		<ui-breadcrumbs
			id="single-breadcrumb"
			.items="${[{ label: 'ホーム' }]}"
		></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const breadcrumbs = canvasElement.querySelector<Breadcrumbs>('#single-breadcrumb');
		if (!breadcrumbs) throw new Error('ui-breadcrumbs not found');
		await breadcrumbs.updateComplete;

		// テスト: 1つのアイテムのみ存在する
		const items = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items?.length !== 1) {
			throw new Error(`Expected 1 item, got ${String(items?.length ?? 0)}`);
		}

		// テスト: セパレーターが存在しない
		const separators = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-separator');
		if (separators && separators.length > 0) {
			throw new Error(`Expected 0 separators, got ${String(separators.length)}`);
		}

		// テスト: aria-current="page" が設定されている
		const currentPage = breadcrumbs.shadowRoot?.querySelector('[aria-current="page"]');
		if (!currentPage) throw new Error('aria-current="page" not found on single item');

		console.log('✅ All tests passed for SingleItem story');
	},
};

// ──────────────────────────────────────────────
// 深い階層
// ──────────────────────────────────────────────

/**
 * 深い階層（7階層）のパンくずリスト。
 *
 * ECサイトやドキュメントサイトなど、深いナビゲーション階層を持つ場合の表示例です。
 * 折り返しにより複数行に表示されることがあります。
 */
export const DeepHierarchy: Story = {
	render: () => html`
		<ui-breadcrumbs
			id="deep-breadcrumb"
			.items="${[
				{ label: 'ホーム', href: '/' },
				{ label: 'プロジェクト', href: '/projects' },
				{ label: 'ウェブアプリ', href: '/projects/web' },
				{ label: 'バックエンド', href: '/projects/web/backend' },
				{ label: 'API', href: '/projects/web/backend/api' },
				{ label: 'エンドポイント', href: '/projects/web/backend/api/endpoints' },
				{ label: 'ユーザー管理' },
			]}"
		></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const breadcrumbs = canvasElement.querySelector<Breadcrumbs>('#deep-breadcrumb');
		if (!breadcrumbs) throw new Error('ui-breadcrumbs not found');
		await breadcrumbs.updateComplete;

		// テスト: 7つのアイテムが存在する
		const items = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items?.length !== 7) {
			throw new Error(`Expected 7 items, got ${String(items?.length ?? 0)}`);
		}

		// テスト: 6つのセパレーターが存在する
		const separators = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-separator');
		if (separators?.length !== 6) {
			throw new Error(`Expected 6 separators, got ${String(separators?.length ?? 0)}`);
		}

		// テスト: 最後のアイテムが現在ページ
		const currentPage = breadcrumbs.shadowRoot?.querySelector('[aria-current="page"]');
		if (!currentPage) throw new Error('aria-current="page" not found');
		if (currentPage.textContent.trim() !== 'ユーザー管理') {
			throw new Error(`Expected current page to be "ユーザー管理", got "${currentPage.textContent.trim()}"`);
		}

		console.log('✅ All tests passed for DeepHierarchy story');
	},
};

// ──────────────────────────────────────────────
// 省略機能（maxItems）
// ──────────────────────────────────────────────

/**
 * 省略機能（maxItems = 4）。
 *
 * 深い階層でも、指定された最大アイテム数までに制限し、
 * 中間アイテムを省略記号（…）で置き換えます。
 *
 * **ロジック**: 最初と最後を保持し、中間を省略します。
 * - 例: `Home / Projects / ... / Settings / General` (maxItems=4 の場合)
 */
export const CollapsedBreadcrumbs: Story = {
	render: () => html`
		<div style="display: flex; flex-direction: column; gap: 1.5rem;">
			<div>
				<div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
					maxItems = 4（7アイテム → 4アイテムに省略）
				</div>
				<ui-breadcrumbs
					id="collapsed-4"
					max-items="4"
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: 'ウェブアプリ', href: '/projects/web' },
						{ label: 'バックエンド', href: '/projects/web/backend' },
						{ label: 'API', href: '/projects/web/backend/api' },
						{ label: 'エンドポイント', href: '/projects/web/backend/api/endpoints' },
						{ label: 'ユーザー管理' },
					]}"
				></ui-breadcrumbs>
			</div>

			<div>
				<div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
					maxItems = 3（7アイテム → 3アイテムに省略）
				</div>
				<ui-breadcrumbs
					id="collapsed-3"
					max-items="3"
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: 'ウェブアプリ', href: '/projects/web' },
						{ label: 'バックエンド', href: '/projects/web/backend' },
						{ label: 'API', href: '/projects/web/backend/api' },
						{ label: 'エンドポイント', href: '/projects/web/backend/api/endpoints' },
						{ label: 'ユーザー管理' },
					]}"
				></ui-breadcrumbs>
			</div>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const collapsed4 = canvasElement.querySelector<Breadcrumbs>('#collapsed-4');
		const collapsed3 = canvasElement.querySelector<Breadcrumbs>('#collapsed-3');
		if (!collapsed4 || !collapsed3) throw new Error('ui-breadcrumbs not found');
		await Promise.all([collapsed4.updateComplete, collapsed3.updateComplete]);

		// テスト: maxItems=4 の場合、4つのアイテムが表示される
		const items4 = collapsed4.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items4?.length !== 4) {
			throw new Error(`Expected 4 items for maxItems=4, got ${String(items4?.length ?? 0)}`);
		}

		// テスト: 省略記号が存在する
		const ellipsis4 = collapsed4.shadowRoot?.querySelector('.breadcrumb-ellipsis');
		if (!ellipsis4) throw new Error('Ellipsis not found for maxItems=4');
		if (ellipsis4.textContent.trim() !== '…') {
			throw new Error(`Expected ellipsis "…", got "${ellipsis4.textContent.trim()}"`);
		}

		// テスト: 省略記号に aria-hidden="true" がある
		if (ellipsis4.getAttribute('aria-hidden') !== 'true') {
			throw new Error('Ellipsis should have aria-hidden="true"');
		}

		// テスト: maxItems=3 の場合、3つのアイテムが表示される
		const items3 = collapsed3.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items3?.length !== 3) {
			throw new Error(`Expected 3 items for maxItems=3, got ${String(items3?.length ?? 0)}`);
		}

		// テスト: 最初と最後が保持されている
		const firstLink4 = items4[0]?.querySelector('a');
		const lastCurrent4 = items4[items4.length - 1]?.querySelector('[aria-current="page"]');
		if (!firstLink4) throw new Error('First link not found');
		if (firstLink4.textContent.trim() !== 'ホーム') throw new Error('First item should be "ホーム"');
		if (!lastCurrent4) throw new Error('Last current not found');
		if (lastCurrent4.textContent.trim() !== 'ユーザー管理') throw new Error('Last item should be "ユーザー管理"');

		console.log('✅ All tests passed for CollapsedBreadcrumbs story');
	},
};

// ──────────────────────────────────────────────
// カスタムセパレーター
// ──────────────────────────────────────────────

/**
 * カスタムセパレーター。
 *
 * セパレーターをカスタマイズできます。
 * - 右向き矢印（>）
 * - 右シェブロン（›）
 * - その他の記号
 */
export const CustomSeparator: Story = {
	render: () => html`
		<div style="display: flex; flex-direction: column; gap: 1.5rem;">
			<div>
				<div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
					Separator: >
				</div>
				<ui-breadcrumbs
					id="sep-gt"
					separator="&gt;"
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: '設定' },
					]}"
				></ui-breadcrumbs>
			</div>

			<div>
				<div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
					Separator: ›
				</div>
				<ui-breadcrumbs
					id="sep-chevron"
					separator="›"
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: '設定' },
					]}"
				></ui-breadcrumbs>
			</div>

			<div>
				<div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
					Separator: •
				</div>
				<ui-breadcrumbs
					id="sep-bullet"
					separator="•"
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: '設定' },
					]}"
				></ui-breadcrumbs>
			</div>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const sepGt = canvasElement.querySelector<Breadcrumbs>('#sep-gt');
		const sepChevron = canvasElement.querySelector<Breadcrumbs>('#sep-chevron');
		const sepBullet = canvasElement.querySelector<Breadcrumbs>('#sep-bullet');
		if (!sepGt || !sepChevron || !sepBullet) throw new Error('ui-breadcrumbs not found');
		await Promise.all([sepGt.updateComplete, sepChevron.updateComplete, sepBullet.updateComplete]);

		// テスト: セパレーターが正しく表示されている
		const separatorsGt = sepGt.shadowRoot?.querySelectorAll('.breadcrumb-separator');
		if (!separatorsGt || separatorsGt.length === 0) throw new Error('Separators not found for >');
		const firstSepGt = separatorsGt[0];
		if (!firstSepGt) throw new Error('First separator not found');
		if (firstSepGt.textContent.trim() !== '>') {
			throw new Error(`Expected separator ">", got "${firstSepGt.textContent.trim()}"`);
		}

		const separatorsChevron = sepChevron.shadowRoot?.querySelectorAll('.breadcrumb-separator');
		if (!separatorsChevron || separatorsChevron.length === 0) throw new Error('Separators not found for ›');
		const firstSepChevron = separatorsChevron[0];
		if (!firstSepChevron) throw new Error('First separator not found');
		if (firstSepChevron.textContent.trim() !== '›') {
			throw new Error(`Expected separator "›", got "${firstSepChevron.textContent.trim()}"`);
		}

		const separatorsBullet = sepBullet.shadowRoot?.querySelectorAll('.breadcrumb-separator');
		if (!separatorsBullet || separatorsBullet.length === 0) throw new Error('Separators not found for •');
		const firstSepBullet = separatorsBullet[0];
		if (!firstSepBullet) throw new Error('First separator not found');
		if (firstSepBullet.textContent.trim() !== '•') {
			throw new Error(`Expected separator "•", got "${firstSepBullet.textContent.trim()}"`);
		}

		console.log('✅ All tests passed for CustomSeparator story');
	},
};

// ──────────────────────────────────────────────
// 長いラベル
// ──────────────────────────────────────────────

/**
 * 長いラベルのトランケート。
 *
 * 各アイテムは `max-width: 20ch` でトランケートされ、
 * `text-overflow: ellipsis` で省略表示されます。
 *
 * **注意**: ホバー時に全文を表示するには、実装者が `title` 属性を設定する責任があります。
 */
export const LongLabels: Story = {
	render: () => html`
		<div style="padding: 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; margin-bottom: 1rem; font-size: 13px;">
			<strong>長いラベル</strong>: 各アイテムは <code>max-width: 20ch</code> でトランケートされます。
		</div>
		<ui-breadcrumbs
			id="long-labels"
			.items="${[
				{ label: 'ホーム', href: '/' },
				{ label: 'とても長いプロジェクト名がここに表示されます', href: '/projects' },
				{ label: '非常に詳細な設定ページの名前がここに入ります' },
			]}"
		></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const breadcrumbs = canvasElement.querySelector<Breadcrumbs>('#long-labels');
		if (!breadcrumbs) throw new Error('ui-breadcrumbs not found');
		await breadcrumbs.updateComplete;

		// テスト: アイテムが存在する
		const items = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items?.length !== 3) {
			throw new Error(`Expected 3 items, got ${String(items?.length ?? 0)}`);
		}

		// テスト: リンクが max-width を持つ
		const firstLink = breadcrumbs.shadowRoot?.querySelector('a.breadcrumb-link');
		if (!firstLink) throw new Error('Link not found');
		const computedStyle = window.getComputedStyle(firstLink);
		// max-width が設定されていることを確認（具体的な値は環境依存のため、存在チェックのみ）
		if (!computedStyle.maxWidth || computedStyle.maxWidth === 'none') {
			throw new Error('Link should have max-width set');
		}

		console.log('✅ All tests passed for LongLabels story');
	},
};

// ──────────────────────────────────────────────
// 非リンクアイテム
// ──────────────────────────────────────────────

/**
 * すべて非リンク（href なし）。
 *
 * リンク先が存在しない場合や、静的な階層表示のみの場合に使用します。
 * 最後のアイテムには `aria-current="page"` が付与されます。
 */
export const NoLinks: Story = {
	render: () => html`
		<ui-breadcrumbs
			id="no-links"
			.items="${[
				{ label: 'ホーム' },
				{ label: 'プロジェクト' },
				{ label: '設定' },
			]}"
		></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const breadcrumbs = canvasElement.querySelector<Breadcrumbs>('#no-links');
		if (!breadcrumbs) throw new Error('ui-breadcrumbs not found');
		await breadcrumbs.updateComplete;

		// テスト: リンクが存在しない
		const links = breadcrumbs.shadowRoot?.querySelectorAll('a.breadcrumb-link');
		if (links && links.length > 0) {
			throw new Error(`Expected 0 links, got ${links.length.toString()}`);
		}

		// テスト: 最後のアイテムに aria-current="page" がある
		const currentPage = breadcrumbs.shadowRoot?.querySelector('[aria-current="page"]');
		if (!currentPage) throw new Error('aria-current="page" not found');

		// テスト: 3つのアイテムが存在する
		const items = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items?.length !== 3) {
			throw new Error(`Expected 3 items, got ${String(items?.length ?? 0)}`);
		}

		console.log('✅ All tests passed for NoLinks story');
	},
};

// ──────────────────────────────────────────────
// リンクあり/なしの混在
// ──────────────────────────────────────────────

/**
 * リンクあり/なしの混在。
 *
 * 一部のアイテムにのみリンクがある場合の表示例です。
 * リンクがないアイテムは通常のテキストとして表示されます。
 */
export const MixedLinks: Story = {
	render: () => html`
		<ui-breadcrumbs
			id="mixed-links"
			.items="${[
				{ label: 'ホーム', href: '/' },
				{ label: 'プロジェクト' },
				{ label: 'ウェブアプリ', href: '/projects/web' },
				{ label: '設定' },
			]}"
		></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const breadcrumbs = canvasElement.querySelector<Breadcrumbs>('#mixed-links');
		if (!breadcrumbs) throw new Error('ui-breadcrumbs not found');
		await breadcrumbs.updateComplete;

		// テスト: 4つのアイテムが存在する
		const items = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items?.length !== 4) {
			throw new Error(`Expected 4 items, got ${String(items?.length ?? 0)}`);
		}

		// テスト: 2つのリンクが存在する（ホーム、ウェブアプリ）
		const links = breadcrumbs.shadowRoot?.querySelectorAll('a.breadcrumb-link');
		if (links?.length !== 2) {
			throw new Error(`Expected 2 links, got ${String(links?.length ?? 0)}`);
		}

		// テスト: 最後のアイテムに aria-current="page" がある
		const currentPage = breadcrumbs.shadowRoot?.querySelector('[aria-current="page"]');
		if (!currentPage) throw new Error('aria-current="page" not found');

		console.log('✅ All tests passed for MixedLinks story');
	},
};

// ──────────────────────────────────────────────
// 境界条件：空の配列
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: 空の配列。
 *
 * `items` が空の場合、何も表示されません。
 */
export const EmptyItems: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: `items` が空の配列の場合、何も表示されません。',
			},
		},
	},
	render: () => html`
		<div style="padding: 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; margin-bottom: 1rem; font-size: 13px;">
			<strong>⚠️ 境界条件</strong>: <code>items</code> が空の配列の場合、何も表示されません。
		</div>
		<div style="border: 1px dashed oklch(80% 0.05 80 / 0.4); padding: 1rem; min-height: 50px;">
			<ui-breadcrumbs id="empty-items" .items="${[]}"></ui-breadcrumbs>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const breadcrumbs = canvasElement.querySelector<Breadcrumbs>('#empty-items');
		if (!breadcrumbs) throw new Error('ui-breadcrumbs not found');
		await breadcrumbs.updateComplete;

		// テスト: nav 要素が存在しない
		const nav = breadcrumbs.shadowRoot?.querySelector('nav');
		if (nav) throw new Error('nav element should not exist for empty items');

		// テスト: アイテムが存在しない
		const items = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items && items.length > 0) {
			throw new Error(`Expected 0 items, got ${items.length.toString()}`);
		}

		console.log('✅ All tests passed for EmptyItems story');
	},
};

// ──────────────────────────────────────────────
// 境界条件：maxItems のエッジケース
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: maxItems のエッジケース。
 *
 * - `maxItems = 1`: 最後のアイテムのみ表示
 * - `maxItems = 2`: 最初と最後を表示
 * - `maxItems = 3`: 最初、省略記号、最後を表示
 */
export const MaxItemsEdgeCases: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: `maxItems` が 1, 2, 3 の場合の挙動を確認します。',
			},
		},
	},
	render: () => html`
		<div style="display: flex; flex-direction: column; gap: 1.5rem;">
			<div>
				<div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
					maxItems = 1（最後のみ）
				</div>
				<ui-breadcrumbs
					id="max-1"
					max-items="1"
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: 'ウェブアプリ', href: '/projects/web' },
						{ label: '設定' },
					]}"
				></ui-breadcrumbs>
			</div>

			<div>
				<div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
					maxItems = 2（最初と最後）
				</div>
				<ui-breadcrumbs
					id="max-2"
					max-items="2"
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: 'ウェブアプリ', href: '/projects/web' },
						{ label: '設定' },
					]}"
				></ui-breadcrumbs>
			</div>

			<div>
				<div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
					maxItems = 3（最初、省略記号、最後）
				</div>
				<ui-breadcrumbs
					id="max-3"
					max-items="3"
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: 'ウェブアプリ', href: '/projects/web' },
						{ label: 'バックエンド', href: '/projects/web/backend' },
						{ label: '設定' },
					]}"
				></ui-breadcrumbs>
			</div>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const max1 = canvasElement.querySelector<Breadcrumbs>('#max-1');
		const max2 = canvasElement.querySelector<Breadcrumbs>('#max-2');
		const max3 = canvasElement.querySelector<Breadcrumbs>('#max-3');
		if (!max1 || !max2 || !max3) throw new Error('ui-breadcrumbs not found');
		await Promise.all([max1.updateComplete, max2.updateComplete, max3.updateComplete]);

		// テスト: maxItems=1 → 1つのアイテム（最後）
		const items1 = max1.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items1?.length !== 1) {
			throw new Error(`Expected 1 item for maxItems=1, got ${String(items1?.length ?? 0)}`);
		}
		const current1 = items1[0]?.querySelector('[aria-current="page"]');
		if (!current1) throw new Error('Current page not found for maxItems=1');
		if (current1.textContent.trim() !== '設定') throw new Error('maxItems=1 should show last item "設定"');

		// テスト: maxItems=2 → 2つのアイテム（最初と最後）
		const items2 = max2.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items2?.length !== 2) {
			throw new Error(`Expected 2 items for maxItems=2, got ${String(items2?.length ?? 0)}`);
		}
		const first2 = items2[0]?.querySelector('a');
		const current2 = items2[1]?.querySelector('[aria-current="page"]');
		if (!first2) throw new Error('First link not found for maxItems=2');
		if (first2.textContent.trim() !== 'ホーム') throw new Error('maxItems=2 should show first item "ホーム"');
		if (!current2) throw new Error('Current page not found for maxItems=2');
		if (current2.textContent.trim() !== '設定') throw new Error('maxItems=2 should show last item "設定"');

		// テスト: maxItems=3 → 3つのアイテム（最初、省略記号、最後）
		const items3 = max3.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items3?.length !== 3) {
			throw new Error(`Expected 3 items for maxItems=3, got ${String(items3?.length ?? 0)}`);
		}
		const ellipsis3 = max3.shadowRoot?.querySelector('.breadcrumb-ellipsis');
		if (!ellipsis3) throw new Error('Ellipsis not found for maxItems=3');

		console.log('✅ All tests passed for MaxItemsEdgeCases story');
	},
};

// ──────────────────────────────────────────────
// 境界条件：特殊文字
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: 特殊文字を含むラベル。
 *
 * HTML エンティティや特殊文字が適切にエスケープされることを確認します。
 * - `<script>` タグ
 * - HTML エンティティ（&amp;、&lt;、&gt;）
 * - 絵文字
 */
export const SpecialCharacters: Story = {
	parameters: {
		docs: {
			description: {
				story: '⚠️ **境界条件**: 特殊文字や HTML エンティティが適切にエスケープされることを確認します。',
			},
		},
	},
	render: () => html`
		<div style="padding: 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; margin-bottom: 1rem; font-size: 13px;">
			<strong>⚠️ 境界条件</strong>: 特殊文字や HTML エンティティが適切にエスケープされます。
		</div>
		<ui-breadcrumbs
			id="special-chars"
			.items="${[
				{ label: 'ホーム', href: '/' },
				{ label: '<script>alert("XSS")</script>', href: '/xss' },
				{ label: 'A & B < C > D' },
				{ label: '🏠 ホーム 🎉' },
			]}"
		></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const breadcrumbs = canvasElement.querySelector<Breadcrumbs>('#special-chars');
		if (!breadcrumbs) throw new Error('ui-breadcrumbs not found');
		await breadcrumbs.updateComplete;

		// テスト: script タグがエスケープされている
		const items = breadcrumbs.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items?.length !== 4) {
			throw new Error(`Expected 4 items, got ${String(items?.length ?? 0)}`);
		}

		// テスト: script タグがテキストとして表示されている（実行されない）
		const scriptLink = items[1]?.querySelector('a');
		if (!scriptLink) throw new Error('Script link not found');
		const scriptText = scriptLink.textContent.trim();
		if (!scriptText.includes('<script>') || !scriptText.includes('</script>')) {
			throw new Error('Script tag should be escaped as text');
		}

		// テスト: HTML エンティティが適切に表示されている
		const entityCurrent = items[2]?.querySelector('.breadcrumb-current');
		if (!entityCurrent) throw new Error('Entity current not found');
		const entityText = entityCurrent.textContent.trim();
		if (!entityText.includes('&') || !entityText.includes('<') || !entityText.includes('>')) {
			throw new Error('HTML entities should be displayed correctly');
		}

		// テスト: 絵文字が表示されている
		const emojiCurrent = items[3]?.querySelector('[aria-current="page"]');
		if (!emojiCurrent) throw new Error('Emoji current not found');
		const emojiText = emojiCurrent.textContent.trim();
		if (!emojiText.includes('🏠') || !emojiText.includes('🎉')) {
			throw new Error('Emojis should be displayed');
		}

		console.log('✅ All tests passed for SpecialCharacters story');
	},
};

// ──────────────────────────────────────────────
// Forced Colors Mode
// ──────────────────────────────────────────────

/**
 * Forced Colors Mode での表示確認。
 *
 * Windows の高コントラストモードなど、強制カラーモード環境での表示を確認します。
 * リンクと現在ページの境界線により、構造が明確化されます。
 */
export const ForcedColorsMode: Story = {
	render: () => html`
		<style>
			.forced-colors-info {
				padding: 1rem;
				background: var(--bg-surface-2, #f5f5f5);
				border-radius: var(--radius-md, 6px);
				font-size: var(--text-sm, 13px);
				margin-bottom: 1.5rem;
			}
		</style>

		<div class="forced-colors-info">
			<strong>確認方法</strong>:
			<ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
				<li><strong>Windows</strong>: 設定 > アクセシビリティ > コントラストテーマ で高コントラストモードを有効化</li>
				<li>
					<strong>開発者ツール</strong>: Chrome DevTools > Rendering > Emulate CSS media feature forced-colors:
					active
				</li>
			</ul>
		</div>

		<ui-breadcrumbs
			.items="${[
				{ label: 'ホーム', href: '/' },
				{ label: 'プロジェクト', href: '/projects' },
				{ label: 'ウェブアプリ', href: '/projects/web' },
				{ label: '設定' },
			]}"
		></ui-breadcrumbs>
	`,
	parameters: {
		docs: {
			description: {
				story: 'Forced Colors Mode（高コントラストモード）での表示を確認します。境界線により構造が明確化されます。',
			},
		},
	},
};

// ──────────────────────────────────────────────
// Reduced Motion
// ──────────────────────────────────────────────

/**
 * Reduced Motion での表示確認。
 *
 * prefers-reduced-motion 環境下でのアニメーション抑制を確認します。
 * トランジションが即座に適用されます。
 */
export const ReducedMotion: Story = {
	render: () => html`
		<style>
			.reduced-motion-info {
				padding: 1rem;
				background: var(--bg-surface-2, #f5f5f5);
				border-radius: var(--radius-md, 6px);
				font-size: var(--text-sm, 13px);
				margin-bottom: 1.5rem;
			}
		</style>

		<div class="reduced-motion-info">
			<strong>確認方法</strong>:
			<ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
				<li><strong>Windows</strong>: 設定 > アクセシビリティ > 視覚効果 > アニメーション効果をオフ</li>
				<li><strong>macOS</strong>: システム設定 > アクセシビリティ > ディスプレイ > 視差効果を減らす</li>
			</ul>
			<p style="margin: 0.5rem 0 0 0;">リンクのホバートランジションが即座に適用されることを確認してください。</p>
		</div>

		<ui-breadcrumbs
			.items="${[
				{ label: 'ホーム', href: '/' },
				{ label: 'プロジェクト', href: '/projects' },
				{ label: 'ウェブアプリ', href: '/projects/web' },
				{ label: '設定' },
			]}"
		></ui-breadcrumbs>
	`,
	parameters: {
		docs: {
			description: {
				story: 'prefers-reduced-motion 環境下でのアニメーション抑制を確認します。トランジションは即座に適用されます。',
			},
		},
	},
};

// ──────────────────────────────────────────────
// 全状態一覧
// ──────────────────────────────────────────────

/**
 * 全状態の一覧。
 *
 * すべての主要な状態を一覧で確認できます。
 * デザインレビューやビジュアルリグレッションテストに使用します。
 */
export const AllStates: Story = {
	render: () => html`
		<style>
			.states-list {
				display: flex;
				flex-direction: column;
				gap: 2rem;
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
		</style>
		<div class="states-list">
			<div class="state-group">
				<div class="state-label">基本（3階層）</div>
				<ui-breadcrumbs
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: '設定' },
					]}"
				></ui-breadcrumbs>
			</div>

			<div class="state-group">
				<div class="state-label">単一アイテム</div>
				<ui-breadcrumbs .items="${[{ label: 'ホーム' }]}"></ui-breadcrumbs>
			</div>

			<div class="state-group">
				<div class="state-label">深い階層（7階層）</div>
				<ui-breadcrumbs
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: 'ウェブアプリ', href: '/projects/web' },
						{ label: 'バックエンド', href: '/projects/web/backend' },
						{ label: 'API', href: '/projects/web/backend/api' },
						{ label: 'エンドポイント', href: '/projects/web/backend/api/endpoints' },
						{ label: 'ユーザー管理' },
					]}"
				></ui-breadcrumbs>
			</div>

			<div class="state-group">
				<div class="state-label">省略（maxItems=4）</div>
				<ui-breadcrumbs
					max-items="4"
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: 'ウェブアプリ', href: '/projects/web' },
						{ label: 'バックエンド', href: '/projects/web/backend' },
						{ label: 'API', href: '/projects/web/backend/api' },
						{ label: 'エンドポイント', href: '/projects/web/backend/api/endpoints' },
						{ label: 'ユーザー管理' },
					]}"
				></ui-breadcrumbs>
			</div>

			<div class="state-group">
				<div class="state-label">カスタムセパレーター（>）</div>
				<ui-breadcrumbs
					separator="&gt;"
					.items="${[
						{ label: 'ホーム', href: '/' },
						{ label: 'プロジェクト', href: '/projects' },
						{ label: '設定' },
					]}"
				></ui-breadcrumbs>
			</div>

			<div class="state-group">
				<div class="state-label">すべて非リンク</div>
				<ui-breadcrumbs
					.items="${[{ label: 'ホーム' }, { label: 'プロジェクト' }, { label: '設定' }]}"
				></ui-breadcrumbs>
			</div>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const breadcrumbs = canvasElement.querySelectorAll<Breadcrumbs>('ui-breadcrumbs');
		await Promise.all([...breadcrumbs].map((b) => b.updateComplete));

		// テスト: すべてのパンくずリストがレンダリングされている
		if (breadcrumbs.length !== 6) {
			throw new Error(`Expected 6 breadcrumbs, got ${String(breadcrumbs.length)}`);
		}

		console.log('✅ All tests passed for AllStates story');
	},
};
