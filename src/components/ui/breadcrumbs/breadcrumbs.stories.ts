import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './breadcrumbs';
import type { Breadcrumbs } from './breadcrumbs';

const BASE_ITEMS = [
	{ label: 'ホーム', href: '/' },
	{ label: 'プロジェクト', href: '/projects' },
	{ label: 'ウェブアプリ', href: '/projects/web' },
	{ label: 'バックエンド', href: '/projects/web/backend' },
	{ label: 'API', href: '/projects/web/backend/api' },
	{ label: 'エンドポイント', href: '/projects/web/backend/api/endpoints' },
	{ label: 'ユーザー管理' },
];

const meta: Meta<Breadcrumbs> = {
	title: 'Components/Breadcrumbs',
	component: 'ui-breadcrumbs',
	tags: ['autodocs'],
	argTypes: {
		items: {
			control: 'object',
			description: 'パンくずアイテム配列',
			table: { type: { summary: '{ label: string, href?: string }[]' }, defaultValue: { summary: '[]' } },
		},
		maxItems: {
			control: 'number',
			description: '省略適用の閾値。デフォルトは 5',
			table: { type: { summary: 'number' }, defaultValue: { summary: '5' } },
		},
		omitRoot: {
			control: 'boolean',
			description: 'デスクトップで最初の項目を非表示にする',
			table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
		},
		ariaLabel: {
			control: 'text',
			description: 'ナビゲーションの aria-label',
			table: { type: { summary: 'string' }, defaultValue: { summary: 'パンくずリスト' } },
		},
	},
};

export default meta;
type Story = StoryObj<Breadcrumbs>;

const createMatchMediaMock = (matches: boolean) => {
	return (query: string): MediaQueryList =>
		({
			matches,
			media: query,
			onchange: null,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			addListener: () => undefined,
			removeListener: () => undefined,
			dispatchEvent: () => false,
		}) as MediaQueryList;
};

export const Default: Story = {
	render: () => html`
		<ui-breadcrumbs
			id="default-breadcrumb"
			.items=${[
				{ label: 'ホーム', href: '/' },
				{ label: 'プロジェクト', href: '/projects' },
				{ label: '設定' },
			]}
		></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const host = canvasElement.querySelector<Breadcrumbs>('#default-breadcrumb');
		if (!host) throw new Error('ui-breadcrumbs not found');
		await host.updateComplete;

		const nav = host.shadowRoot?.querySelector('nav');
		if (!nav) throw new Error('nav element not found');
		if (nav.getAttribute('aria-label') !== 'パンくずリスト') {
			throw new Error('aria-label should be パンくずリスト');
		}

		const separators = host.shadowRoot?.querySelectorAll('.breadcrumb-separator iconify-icon');
		if (separators?.length !== 2) {
			throw new Error(`Expected 2 chevron separators, got ${String(separators?.length ?? 0)}`);
		}

		const current = host.shadowRoot?.querySelector('[aria-current="page"]');
		if (current?.textContent.trim() !== '設定') {
			throw new Error('Current page should be 設定');
		}
	},
};

export const CollapsedWithDropdown: Story = {
	render: () => html`
		<ui-breadcrumbs id="collapsed-dropdown" max-items="4" .items=${BASE_ITEMS}></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const host = canvasElement.querySelector<Breadcrumbs>('#collapsed-dropdown');
		if (!host) throw new Error('ui-breadcrumbsが見つかりません');
		await host.updateComplete;

		const items = host.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items?.length !== 4) {
			throw new Error(`Expected 4 rendered items, got ${String(items?.length ?? 0)}`);
		}

		const dropdown = host.shadowRoot?.querySelector<HTMLElement>('ui-dropdown');
		if (!dropdown) throw new Error('Collapsed dropdown not found');

		const trigger = dropdown.querySelector<HTMLElement>('ui-button[slot="trigger"]');
		if (!trigger) throw new Error('Ellipsis trigger button not found');
		if (trigger.getAttribute('aria-label') !== '中間ページを表示') {
			throw new Error('Ellipsis trigger should have aria-label="中間ページを表示"');
		}

		trigger.click();
		await new Promise((resolve) => setTimeout(resolve, 0));

		if (trigger.getAttribute('aria-haspopup') !== 'menu') {
			throw new Error('Ellipsis trigger should have aria-haspopup="menu"');
		}
		if (trigger.getAttribute('aria-expanded') !== 'true') {
			throw new Error('Ellipsis trigger should be expanded after click');
		}

		const hiddenMenuItems = dropdown.querySelectorAll('ui-menu-item');
		if (hiddenMenuItems.length !== 4) {
			throw new Error(`4つの hidden menu itemsを期待しましたが、 ${String(hiddenMenuItems.length)}となりました`);
		}
	},
};

export const OmitRootDesktop: Story = {
	render: () => html`
		<ui-breadcrumbs id="omit-root" omit-root max-items="5" .items=${BASE_ITEMS}></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const host = canvasElement.querySelector<Breadcrumbs>('#omit-root');
		if (!host) throw new Error('ui-breadcrumbs not found');
		await host.updateComplete;

		const firstLink = host.shadowRoot?.querySelector<HTMLAnchorElement>('a.breadcrumb-link');
		if (!firstLink) throw new Error('First breadcrumb link not found');
		if (firstLink.textContent.trim() === 'ホーム') {
			throw new Error('omit-root=true ではルート項目を表示しない想定です');
		}
	},
};

export const MobileAutoCollapse: Story = {
	render: () => html`<div id="mobile-host"></div>`,
	play: async ({ canvasElement }) => {
		const mount = canvasElement.querySelector<HTMLDivElement>('#mobile-host');
		if (!mount) throw new Error('mount not found');

		const originalMatchMedia = window.matchMedia;
		window.matchMedia = createMatchMediaMock(true);

		try {
			const host = document.createElement('ui-breadcrumbs');
			host.id = 'mobile-breadcrumb';
			host.items = [...BASE_ITEMS];
			mount.append(host);
			await host.updateComplete;

			const renderedItems = host.shadowRoot?.querySelectorAll('.breadcrumb-item');
			if (renderedItems?.length !== 3) {
				throw new Error(`Mobile collapse should render 3 items, got ${String(renderedItems?.length ?? 0)}`);
			}

			const dropdown = host.shadowRoot?.querySelector('ui-dropdown');
			if (!dropdown) throw new Error('Mobile collapse should render ellipsis dropdown');
		} finally {
			window.matchMedia = originalMatchMedia;
			mount.replaceChildren();
		}
	},
};

export const MaxItemsEdgeCases: Story = {
	render: () => html`
		<div style="display: grid; gap: 1rem;">
			<ui-breadcrumbs id="max-1" max-items="1" .items=${BASE_ITEMS}></ui-breadcrumbs>
			<ui-breadcrumbs id="max-2" max-items="2" .items=${BASE_ITEMS}></ui-breadcrumbs>
			<ui-breadcrumbs id="max-0" max-items="0" .items=${BASE_ITEMS}></ui-breadcrumbs>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const max1 = canvasElement.querySelector<Breadcrumbs>('#max-1');
		const max2 = canvasElement.querySelector<Breadcrumbs>('#max-2');
		const max0 = canvasElement.querySelector<Breadcrumbs>('#max-0');
		if (!max1 || !max2 || !max0) throw new Error('edge-case hosts not found');
		await Promise.all([max1.updateComplete, max2.updateComplete, max0.updateComplete]);

		const items1 = max1.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items1?.length !== 1) throw new Error('max-items=1 should render one item');

		const items2 = max2.shadowRoot?.querySelectorAll('.breadcrumb-item');
		if (items2?.length !== 2) throw new Error('max-items=2 should render two items');

		const current0 = max0.shadowRoot?.querySelector('[aria-current="page"]');
		if (!current0) throw new Error('max-items=0 should be normalized and keep current page');
	},
};

export const EmptyItems: Story = {
	render: () => html`<ui-breadcrumbs id="empty-items" .items=${[]}></ui-breadcrumbs>`,
	play: async ({ canvasElement }) => {
		const host = canvasElement.querySelector<Breadcrumbs>('#empty-items');
		if (!host) throw new Error('ui-breadcrumbs not found');
		await host.updateComplete;

		const nav = host.shadowRoot?.querySelector('nav');
		if (nav) {
			throw new Error('empty items should render nothing');
		}
	},
};

export const SpecialCharacters: Story = {
	render: () => html`
		<ui-breadcrumbs
			id="special-chars"
			.items=${[
				{ label: 'ホーム', href: '/' },
				{ label: '<script>alert("XSS")</script>', href: '/xss' },
				{ label: 'A & B < C > D', href: '/entity' },
				{ label: '🏠 ホーム 🎉' },
			]}
		></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const host = canvasElement.querySelector<Breadcrumbs>('#special-chars');
		if (!host) throw new Error('ui-breadcrumbs not found');
		await host.updateComplete;

		const links = host.shadowRoot?.querySelectorAll('a.breadcrumb-link');
		if (links?.length !== 3) {
			throw new Error(`Expected 3 links, got ${String(links?.length ?? 0)}`);
		}

		const scriptText = links[1]?.textContent.trim() ?? '';
		if (!scriptText.includes('<script>') || !scriptText.includes('</script>')) {
			throw new Error('script tag should be escaped as text');
		}

		const entityText = links[2]?.textContent.trim() ?? '';
		if (!entityText.includes('&') || !entityText.includes('<') || !entityText.includes('>')) {
			throw new Error('entity text should include &, <, >');
		}

		const current = host.shadowRoot?.querySelector('[aria-current="page"]');
		if (!current?.textContent.includes('🎉')) {
			throw new Error('current item should render emoji label');
		}
	},
};

export const ForcedColorsMode: Story = {
	render: () => html`
		<ui-breadcrumbs id="forced-colors" max-items="3" .items=${BASE_ITEMS}></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const host = canvasElement.querySelector<Breadcrumbs>('#forced-colors');
		if (!host) throw new Error('ui-breadcrumbs not found');
		await host.updateComplete;

		const trigger = host.shadowRoot?.querySelector('ui-button[slot="trigger"]');
		if (!trigger) throw new Error('forced-colors scenario should include ellipsis trigger');

		const separator = host.shadowRoot?.querySelector('.breadcrumb-separator');
		if (separator?.getAttribute('aria-hidden') !== 'true') {
			throw new Error('separator should stay aria-hidden in forced-colors scenario');
		}
	},
};

export const ReducedMotion: Story = {
	render: () => html`
		<ui-breadcrumbs
			id="reduced-motion"
			.items=${[
				{ label: 'ホーム', href: '/' },
				{ label: 'プロジェクト', href: '/projects' },
				{ label: '設定' },
			]}
		></ui-breadcrumbs>
	`,
	play: async ({ canvasElement }) => {
		const host = canvasElement.querySelector<Breadcrumbs>('#reduced-motion');
		if (!host) throw new Error('ui-breadcrumbs not found');
		await host.updateComplete;

		const link = host.shadowRoot?.querySelector<HTMLAnchorElement>('a.breadcrumb-link');
		if (!link) throw new Error('link not found');
		const transitionDuration = getComputedStyle(link).transitionDuration;
		if (!transitionDuration) {
			throw new Error('breadcrumb link should define transition');
		}
	},
};

export const DarkMode: Story = {
	render: () => html`
		<div style="color-scheme: dark; background: oklch(18% 0.02 250); color: oklch(95% 0.01 250); padding: 1rem; border-radius: 8px;">
			<ui-breadcrumbs
				id="dark-mode"
				.items=${[
					{ label: 'ホーム', href: '/' },
					{ label: 'プロジェクト', href: '/projects' },
					{ label: '設定' },
				]}
			></ui-breadcrumbs>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const host = canvasElement.querySelector<Breadcrumbs>('#dark-mode');
		if (!host) throw new Error('ui-breadcrumbs not found');
		await host.updateComplete;

		const current = host.shadowRoot?.querySelector('[aria-current="page"]');
		if (!current) throw new Error('dark-mode story should render current page');
	},
};

export const AllStates: Story = {
	render: () => html`
		<div style="display: grid; gap: 1rem;">
			<ui-breadcrumbs .items=${[{ label: 'ホーム', href: '/' }, { label: '設定' }]}></ui-breadcrumbs>
			<ui-breadcrumbs max-items="4" .items=${BASE_ITEMS}></ui-breadcrumbs>
			<ui-breadcrumbs omit-root .items=${BASE_ITEMS}></ui-breadcrumbs>
			<ui-breadcrumbs .items=${[{ label: 'ホーム' }, { label: 'プロジェクト' }, { label: '設定' }]}></ui-breadcrumbs>
		</div>
	`,
	play: async ({ canvasElement }) => {
		const hosts = canvasElement.querySelectorAll<Breadcrumbs>('ui-breadcrumbs');
		await Promise.all([...hosts].map((host) => host.updateComplete));
		if (hosts.length !== 4) {
			throw new Error(`Expected 4 state samples, got ${String(hosts.length)}`);
		}
	},
};
