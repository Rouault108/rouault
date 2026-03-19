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
      table: {
        type: { summary: '{ label: string, href?: string }[]' },
        defaultValue: { summary: '[]' },
      },
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
    if (!host) throw new Error('ui-breadcrumbs が見つかりません');
    await host.updateComplete;

    const nav = host.shadowRoot?.querySelector('nav');
    if (!nav) throw new Error('nav 要素が見つかりません');
    if (nav.getAttribute('aria-label') !== 'パンくずリスト') {
      throw new Error('aria-label は "パンくずリスト" である必要があります');
    }

    const separators = host.shadowRoot?.querySelectorAll('.breadcrumb-separator iconify-icon');
    if (separators?.length !== 2) {
      throw new Error(
        `2つのセパレーター（chevron）を期待していましたが、実際には ${String(separators?.length ?? 0)}個でした`,
      );
    }

    const firstItem = host.shadowRoot?.querySelector<HTMLElement>('.breadcrumb-item');
    const firstLabel = firstItem?.querySelector<HTMLElement>('.breadcrumb-link');
    const firstSeparator = firstItem?.querySelector<HTMLElement>(
      '.breadcrumb-separator iconify-icon',
    );
    if (!firstLabel || !firstSeparator) {
      throw new Error('中心線チェックに必要なラベルまたはセパレーターが見つかりません');
    }
    const labelRect = firstLabel.getBoundingClientRect();
    const separatorRect = firstSeparator.getBoundingClientRect();
    const labelCenterY = labelRect.top + labelRect.height / 2;
    const separatorCenterY = separatorRect.top + separatorRect.height / 2;
    const centerDelta = Math.abs(labelCenterY - separatorCenterY);
    if (centerDelta > 2) {
      throw new Error(
        `ラベルとセパレーターの中心線がずれています（差分: ${centerDelta.toFixed(2)}px, 許容値: 2px）`,
      );
    }

    const current = host.shadowRoot?.querySelector('[aria-current="page"]');
    if (current?.textContent.trim() !== '設定') {
      throw new Error('カレントページは "設定" である必要があります');
    }
  },
};

export const CollapsedWithDropdown: Story = {
  render: () => html`
    <ui-breadcrumbs id="collapsed-dropdown" max-items="4" .items=${BASE_ITEMS}></ui-breadcrumbs>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Breadcrumbs>('#collapsed-dropdown');
    if (!host) throw new Error('ui-breadcrumbs が見つかりません');
    await host.updateComplete;

    const items = host.shadowRoot?.querySelectorAll('.breadcrumb-item');
    if (items?.length !== 4) {
      throw new Error(
        `4つのレンダリングされた項目を期待していましたが、実際には ${String(items?.length ?? 0)}個でした`,
      );
    }

    const dropdown = host.shadowRoot?.querySelector<HTMLElement>('ui-dropdown');
    if (!dropdown) throw new Error('省略表示用のドロップダウンが見つかりません');

    const trigger = dropdown.querySelector<HTMLElement>('ui-button[slot="trigger"]');
    if (!trigger) throw new Error('省略（...）トリガーボタンが見つかりません');
    if (trigger.getAttribute('aria-label') !== '中間ページを表示') {
      throw new Error('省略トリガーの aria-label は "中間ページを表示" である必要があります');
    }

    trigger.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (trigger.getAttribute('aria-haspopup') !== 'menu') {
      throw new Error('省略トリガーは aria-haspopup="menu" を持っている必要があります');
    }
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('クリック後、省略トリガーは展開（expanded）されている必要があります');
    }

    const hiddenMenuItems = dropdown.querySelectorAll('ui-menu-item');
    if (hiddenMenuItems.length !== 4) {
      throw new Error(
        `4つのメニュー項目を期待していましたが、実際には ${String(hiddenMenuItems.length)}個でした`,
      );
    }
  },
};

export const OmitRootDesktop: Story = {
  render: () => html`
    <ui-breadcrumbs id="omit-root" omit-root max-items="5" .items=${BASE_ITEMS}></ui-breadcrumbs>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Breadcrumbs>('#omit-root');
    if (!host) throw new Error('ui-breadcrumbs が見つかりません');
    await host.updateComplete;

    const firstLink = host.shadowRoot?.querySelector<HTMLAnchorElement>('a.breadcrumb-link');
    if (!firstLink) throw new Error('最初のパンくずリンクが見つかりません');
    if (firstLink.textContent.trim() === 'ホーム') {
      throw new Error('omit-root=true ではルート項目を表示しない想定です');
    }
  },
};

export const MobileAutoCollapse: Story = {
  render: () => html`<div id="mobile-host"></div>`,
  play: async ({ canvasElement }) => {
    const mount = canvasElement.querySelector<HTMLDivElement>('#mobile-host');
    if (!mount) throw new Error('マウントポイント（#mobile-host）が見つかりません');

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
        throw new Error(
          `モバイル表示では3つの項目が表示されるべきですが、実際には ${String(renderedItems?.length ?? 0)}個でした`,
        );
      }

      const dropdown = host.shadowRoot?.querySelector('ui-dropdown');
      if (!dropdown)
        throw new Error('モバイル表示では省略ドロップダウンが表示される必要があります');
    } finally {
      window.matchMedia = originalMatchMedia;
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
    if (!max1 || !max2 || !max0) throw new Error('エッジケース確認用の要素が見つかりません');
    await Promise.all([max1.updateComplete, max2.updateComplete, max0.updateComplete]);

    const items1 = max1.shadowRoot?.querySelectorAll('.breadcrumb-item');
    if (items1?.length !== 1)
      throw new Error('max-items=1 のとき、1つの項目がレンダリングされる必要があります');

    const items2 = max2.shadowRoot?.querySelectorAll('.breadcrumb-item');
    if (items2?.length !== 2)
      throw new Error('max-items=2 のとき、2つの項目がレンダリングされる必要があります');

    const current0 = max0.shadowRoot?.querySelector('[aria-current="page"]');
    if (!current0)
      throw new Error('max-items=0 は正規化され、カレントページが維持される必要があります');
  },
};

export const EmptyItems: Story = {
  render: () => html`<ui-breadcrumbs id="empty-items" .items=${[]}></ui-breadcrumbs>`,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Breadcrumbs>('#empty-items');
    if (!host) throw new Error('ui-breadcrumbs が見つかりません');
    await host.updateComplete;

    const nav = host.shadowRoot?.querySelector('nav');
    if (nav) {
      throw new Error('アイテムが空の場合、何もレンダリングされない必要があります');
    }
  },
};

export const SingleLineEllipsis: Story = {
  render: () => html`
    <div style="width: 420px; border: 1px solid var(--border-default); padding-inline: 12px;">
      <ui-breadcrumbs
        id="single-line-ellipsis"
        .items=${[
          { label: 'Notes', href: '/' },
          { label: 'Music', href: '/music' },
          { label: 'Classical', href: '/music/classical' },
          { label: 'Tchaikovsky', href: '/music/classical/tchaikovsky' },
          { label: '楽曲分析: くるみ割り人形と組曲版の構造比較' },
        ]}
      ></ui-breadcrumbs>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Breadcrumbs>('#single-line-ellipsis');
    if (!host) throw new Error('ui-breadcrumbs が見つかりません');
    await host.updateComplete;

    const nav = host.shadowRoot?.querySelector<HTMLElement>('nav');
    const current = host.shadowRoot?.querySelector<HTMLElement>('.breadcrumb-current');
    if (!nav || !current) {
      throw new Error('省略確認に必要な要素が見つかりません');
    }

    if (nav.scrollHeight > nav.clientHeight + 2) {
      throw new Error('パンくずリストが複数行に折り返されています');
    }

    if (current.scrollWidth <= current.clientWidth) {
      throw new Error('カレント項目が省略されていません');
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
    if (!host) throw new Error('ui-breadcrumbs が見つかりません');
    await host.updateComplete;

    const links = host.shadowRoot?.querySelectorAll('a.breadcrumb-link');
    if (links?.length !== 3) {
      throw new Error(
        `3つのリンクを期待していましたが、実際には ${String(links?.length ?? 0)}個でした`,
      );
    }

    const scriptText = links[1]?.textContent.trim() ?? '';
    if (!scriptText.includes('<script>') || !scriptText.includes('</script>')) {
      throw new Error('script タグはテキストとしてエスケープされる必要があります');
    }

    const entityText = links[2]?.textContent.trim() ?? '';
    if (!entityText.includes('&') || !entityText.includes('<') || !entityText.includes('>')) {
      throw new Error('エンティティ形式のテキストには &、<、> が含まれている必要があります');
    }

    const current = host.shadowRoot?.querySelector('[aria-current="page"]');
    if (!current?.textContent.includes('🎉')) {
      throw new Error('カレントアイテムに絵文字ラベルがレンダリングされる必要があります');
    }
  },
};

export const ForcedColorsMode: Story = {
  render: () => html`
    <ui-breadcrumbs id="forced-colors" max-items="3" .items=${BASE_ITEMS}></ui-breadcrumbs>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<Breadcrumbs>('#forced-colors');
    if (!host) throw new Error('ui-breadcrumbs が見つかりません');
    await host.updateComplete;

    const trigger = host.shadowRoot?.querySelector('ui-button[slot="trigger"]');
    if (!trigger)
      throw new Error('forced-colors のシナリオでは省略トリガーが含まれている必要があります');

    const separator = host.shadowRoot?.querySelector('.breadcrumb-separator');
    if (separator?.getAttribute('aria-hidden') !== 'true') {
      throw new Error(
        'forced-colors のシナリオでもセパレーターは aria-hidden である必要があります',
      );
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
    if (!host) throw new Error('ui-breadcrumbs が見つかりません');
    await host.updateComplete;

    const link = host.shadowRoot?.querySelector<HTMLAnchorElement>('a.breadcrumb-link');
    if (!link) throw new Error('リンクが見つかりません');
    const transitionDuration = getComputedStyle(link).transitionDuration;
    if (!transitionDuration) {
      throw new Error('パンくずリンクは transition が定義されている必要があります');
    }
  },
};

export const DarkMode: Story = {
  render: () => html`
    <div
      style="color-scheme: dark; background: oklch(18% 0.02 250); color: oklch(95% 0.01 250); padding: 1rem; border-radius: 8px;"
    >
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
    if (!host) throw new Error('ui-breadcrumbs が見つかりません');
    await host.updateComplete;

    const current = host.shadowRoot?.querySelector('[aria-current="page"]');
    if (!current)
      throw new Error(
        'ダークモードのストーリーでもカレントページがレンダリングされる必要があります',
      );
  },
};

export const AllStates: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-breadcrumbs
        .items=${[{ label: 'ホーム', href: '/' }, { label: '設定' }]}
      ></ui-breadcrumbs>
      <ui-breadcrumbs max-items="4" .items=${BASE_ITEMS}></ui-breadcrumbs>
      <ui-breadcrumbs omit-root .items=${BASE_ITEMS}></ui-breadcrumbs>
      <ui-breadcrumbs
        .items=${[{ label: 'ホーム' }, { label: 'プロジェクト' }, { label: '設定' }]}
      ></ui-breadcrumbs>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const hosts = canvasElement.querySelectorAll<Breadcrumbs>('ui-breadcrumbs');
    await Promise.all([...hosts].map((host) => host.updateComplete));
    if (hosts.length !== 4) {
      throw new Error(
        `4つの状態サンプルを期待していましたが、実際には ${String(hosts.length)}個でした`,
      );
    }
  },
};
