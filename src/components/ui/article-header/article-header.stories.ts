import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './article-header';
import type { ArticleHeader, TagClickDetail } from './article-header';

const meta: Meta<ArticleHeader> = {
  title: 'Components/Article Header',
  component: 'ui-article-header',
  tags: ['autodocs'],
  argTypes: {
    heading: {
      control: 'text',
      description: '記事タイトル',
    },
    published: {
      control: 'text',
      description: '公開日 (`YYYY-MM-DD`)',
    },
    created: {
      control: 'text',
      description: '作成日 (`YYYY-MM-DD`)',
    },
    updatedDate: {
      control: 'text',
      description:
        '更新日 (`YYYY-MM-DD`)。HTML属性は `updated`。LitElementの `updated()` との衝突回避のためプロパティ名は `updatedDate`',
    },
    tags: {
      control: 'object',
      description: 'タグ配列（property only）',
    },
    readingTime: {
      control: 'number',
      description: '読了時間（分）',
    },
    status: {
      control: 'select',
      options: ['', 'draft', 'archived', 'wip', 'deprecated'],
      description: 'ステータス',
    },
    source: {
      control: 'text',
      description: '出典URL',
    },
    license: {
      control: 'text',
      description: 'ライセンス名',
    },
  },
};

export default meta;
type Story = StoryObj<ArticleHeader>;

/**
 * フル状態（更新日優先 + タグ + 読了時間 + 出典/ライセンス + ステータス）
 */
export const CompleteState: Story = {
  args: {
    heading: 'バッハ《マタイ受難曲》の構造美',
    updatedDate: '2026-02-12',
    published: '2025-12-01',
    created: '2025-11-20',
    tags: ['音楽', 'バッハ', '宗教音楽'],
    readingTime: 8,
    status: 'draft',
    source: 'https://example.com/original',
    license: 'CC BY 4.0',
  },
  render: (args) => {
    const tags = Array.isArray(args.tags) ? args.tags : [];
    const status = args.status;
    const readingTime = args.readingTime;

    return html`
      <ui-article-header
        id="complete-state"
        heading="${args.heading}"
        updated="${args.updatedDate}"
        published="${args.published}"
        created="${args.created}"
        status="${status}"
        source="${args.source}"
        license="${args.license}"
        .tags="${tags}"
        .readingTime="${readingTime}"
      ></ui-article-header>
    `;
  },
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#complete-state');
    if (!header) throw new Error('#complete-state not found');
    await header.updateComplete;

    const title = header.shadowRoot?.querySelector('.heading');
    if (!title) throw new Error('.heading not found');
    const titleText = title.textContent.trim();
    if (titleText !== 'バッハ《マタイ受難曲》の構造美') {
      throw new Error(`Expected heading text to be "バッハ《マタイ受難曲》の構造美", got "${titleText}"`);
    }

    const time = header.shadowRoot?.querySelector('time');
    if (!time) throw new Error('time element not found');
    if (time.getAttribute('datetime') !== '2026-02-12') {
      throw new Error(`Expected datetime to be "2026-02-12", got "${time.getAttribute('datetime') ?? 'null'}"`);
    }

    const dateAria = time.getAttribute('aria-label') ?? '';
    if (!dateAria.includes('最終更新日: 2026-02-12')) {
      throw new Error(`Expected aria-label to include updated context, got "${dateAria}"`);
    }
    if (!dateAria.includes('作成日: 2025-11-20')) {
      throw new Error(`Expected aria-label to include created context, got "${dateAria}"`);
    }

    const tagLinks = header.shadowRoot?.querySelectorAll<HTMLElement>('.tag-link');
    const tagLinkCount = tagLinks?.length ?? 0;
    if (tagLinkCount !== 3) {
      throw new Error(`Expected 3 tag links, got ${String(tagLinkCount)}`);
    }

    const status = header.shadowRoot?.querySelector('.status');
    if (!status) throw new Error('.status not found');
    if (!status.classList.contains('status-draft')) {
      throw new Error('Expected status tone class "status-draft"');
    }
    const statusText = status.textContent.trim();
    if (!statusText.includes('下書き')) {
      throw new Error(`Expected status text to include "下書き", got "${statusText}"`);
    }

    const sourceLink = header.shadowRoot?.querySelector<HTMLAnchorElement>('.source-link');
    if (!sourceLink) throw new Error('.source-link not found');
    if (sourceLink.getAttribute('href') !== 'https://example.com/original') {
      throw new Error(`Expected source href to be "https://example.com/original", got "${sourceLink.getAttribute('href') ?? 'null'}"`);
    }
    if (sourceLink.getAttribute('target') !== '_blank') {
      throw new Error('Expected source link to open in a new tab');
    }
    if (sourceLink.getAttribute('rel') !== 'noopener noreferrer') {
      throw new Error('Expected source link rel to be "noopener noreferrer"');
    }

  },
};

/**
 * 更新日なし（公開日フォールバック）
 */
export const PublishedFallback: Story = {
  args: {
    heading: '公開日のみで表示するケース',
    published: '2026-01-10',
    created: '2026-01-02',
    updatedDate: '',
    tags: ['設計'],
    readingTime: null,
    status: '',
    source: '',
    license: '',
  },
  render: (args) => {
    const tags = Array.isArray(args.tags) ? args.tags : [];
    const status = args.status;
    const readingTime = args.readingTime;

    return html`
      <ui-article-header
        id="published-fallback"
        heading="${args.heading}"
        published="${args.published}"
        created="${args.created}"
        updated="${args.updatedDate}"
        status="${status}"
        source="${args.source}"
        license="${args.license}"
        .tags="${tags}"
        .readingTime="${readingTime}"
      ></ui-article-header>
    `;
  },
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#published-fallback');
    if (!header) throw new Error('#published-fallback not found');
    await header.updateComplete;

    const time = header.shadowRoot?.querySelector('time');
    if (!time) throw new Error('time element not found');
    if (time.getAttribute('datetime') !== '2026-01-10') {
      throw new Error(`Expected datetime to be "2026-01-10", got "${time.getAttribute('datetime') ?? 'null'}"`);
    }

    const dateAria = time.getAttribute('aria-label') ?? '';
    if (!dateAria.includes('公開日: 2026-01-10')) {
      throw new Error(`Expected aria-label to include published context, got "${dateAria}"`);
    }
    if (!dateAria.includes('作成日: 2026-01-02')) {
      throw new Error(`Expected aria-label to include created context, got "${dateAria}"`);
    }

  },
};

/**
 * ステータス状態の意味ある組み合わせ
 */
export const StatusStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
      }
    </style>
    <div class="matrix">
      <ui-article-header id="status-draft" heading="下書き記事" published="2026-01-01" status="draft"></ui-article-header>
      <ui-article-header id="status-archived" heading="アーカイブ記事" published="2026-01-01" status="archived"></ui-article-header>
      <ui-article-header id="status-wip" heading="作業中記事" published="2026-01-01" status="wip"></ui-article-header>
      <ui-article-header id="status-deprecated" heading="非推奨記事" published="2026-01-01" status="deprecated"></ui-article-header>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checks: {
      id: string;
      toneClass: string;
      icon: string;
      label: string;
    }[] = [
      { id: '#status-draft', toneClass: 'status-draft', icon: 'lucide:file-dashed', label: '下書き' },
      { id: '#status-archived', toneClass: 'status-archived', icon: 'lucide:archive', label: 'アーカイブ' },
      { id: '#status-wip', toneClass: 'status-wip', icon: 'lucide:construction', label: '作業中' },
      { id: '#status-deprecated', toneClass: 'status-deprecated', icon: 'lucide:alert-triangle', label: '非推奨' },
    ];

    for (const check of checks) {
      const header = canvasElement.querySelector<ArticleHeader>(check.id);
      if (!header) throw new Error(`${check.id} not found`);
      await header.updateComplete;

      const status = header.shadowRoot?.querySelector('.status');
      if (!status) throw new Error(`status element not found for ${check.id}`);
      if (!status.classList.contains(check.toneClass)) {
        throw new Error(`Expected ${check.id} to include class "${check.toneClass}"`);
      }
      const statusText = status.textContent.trim();
      if (!statusText.includes(check.label)) {
        throw new Error(`Expected ${check.id} text to include "${check.label}", got "${statusText}"`);
      }

      const icon = status.querySelector('iconify-icon');
      if (!icon) throw new Error(`iconify-icon not found for ${check.id}`);
      if (icon.getAttribute('icon') !== check.icon) {
        throw new Error(`Expected ${check.id} icon="${check.icon}", got "${icon.getAttribute('icon') ?? 'null'}"`);
      }
    }
  },
};

/**
 * 事故が多い契約: tagsのproperty-only + tag-clickイベント契約
 */
export const TagEventContract: Story = {
  render: () => html`
    <ui-article-header
      id="tag-contract"
      heading="タグイベントの契約確認"
      published="2026-02-20"
      .tags="${['設計と実装']}"
    ></ui-article-header>
  `,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#tag-contract');
    if (!header) throw new Error('#tag-contract not found');
    await header.updateComplete;

    if (header.hasAttribute('tags')) {
      throw new Error('tags should be property only and must not exist as an attribute');
    }

    const tagLink = header.shadowRoot?.querySelector<HTMLElement>('.tag-link');
    if (!tagLink) throw new Error('.tag-link not found');

    const eventPromise = new Promise<CustomEvent<TagClickDetail>>((resolve) => {
      header.addEventListener(
        'tag-click',
        (event) => {
          const customEvent = event as CustomEvent<TagClickDetail>;
          customEvent.preventDefault();
          resolve(customEvent);
        },
        { once: true },
      );
    });

    const clickCanceled = !tagLink.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );

    const event = await Promise.race([
      eventPromise,
      new Promise<null>((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, 500);
      }),
    ]);

    if (!event) throw new Error('tag-click event did not fire');
    if (!event.bubbles) throw new Error('Expected tag-click to bubble');
    if (!event.composed) throw new Error('Expected tag-click to be composed');
    if (!event.cancelable) throw new Error('Expected tag-click to be cancelable');

    const expectedTag = '設計と実装';
    const expectedHref = `/tags/${encodeURIComponent(expectedTag)}`;
    if (event.detail.tag !== expectedTag) {
      throw new Error(`Expected detail.tag="${expectedTag}", got "${event.detail.tag}"`);
    }
    if (event.detail.href !== expectedHref) {
      throw new Error(`Expected detail.href="${expectedHref}", got "${event.detail.href}"`);
    }

    if (!clickCanceled) {
      throw new Error('Expected native click navigation to be canceled when tag-click is prevented');
    }
  },
};

/**
 * 境界条件: メタデータゼロ（見出しのみ）
 */
export const HeadingOnlyBoundary: Story = {
  render: () => html`
    <ui-article-header id="heading-only" heading="見出しのみの最小構成"></ui-article-header>
  `,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#heading-only');
    if (!header) throw new Error('#heading-only not found');
    await header.updateComplete;

    const title = header.shadowRoot?.querySelector('.heading');
    if (!title) throw new Error('.heading not found');
    const titleText = title.textContent.trim();
    if (titleText !== '見出しのみの最小構成') {
      throw new Error(`Expected heading text to be "見出しのみの最小構成", got "${titleText}"`);
    }

    const metadata = header.shadowRoot?.querySelector('.metadata-list');
    if (metadata) {
      throw new Error('metadata-list should not render when all metadata inputs are empty');
    }

  },
};

/**
 * 事故が多い境界条件: 値の正規化（tags/readTime/source）
 */
export const NormalizationBoundary: Story = {
  render: () => html`
    <ui-article-header
      id="normalization-boundary"
      heading="正規化境界ケース"
      updated="2026-02-01"
      created="2026-01-15"
      source="javascript:alert(1)"
      .tags="${['  設計  ', ' ', '', '実装']}"
      .readingTime="${1.6}"
    ></ui-article-header>
  `,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#normalization-boundary');
    if (!header) throw new Error('#normalization-boundary not found');
    await header.updateComplete;

    const tagLinks = header.shadowRoot?.querySelectorAll<HTMLElement>('.tag-link');
    const tagTexts = Array.from(tagLinks ?? []).map((link) => link.textContent.trim());
    if (tagTexts.length !== 2) {
      throw new Error(`Expected 2 normalized tags, got ${String(tagTexts.length)}`);
    }
    if (!tagTexts.includes('#設計') || !tagTexts.includes('#実装')) {
      throw new Error(`Expected normalized tags to include #設計 and #実装, got "${tagTexts.join(', ')}"`);
    }

    const reading = header.shadowRoot?.querySelector('.metadata-reading-time span');
    if (!reading) throw new Error('Expected reading time to render');
    const readingText = reading.textContent.trim();
    if (readingText !== '読了目安 2分') {
      throw new Error(`Expected rounded reading time to be "読了目安 2分", got "${readingText}"`);
    }

    const source = header.shadowRoot?.querySelector('.source-link');
    if (source) {
      throw new Error('Unsafe source URL must not render source link');
    }
  },
};

/**
 * 境界条件: unsafe source のみ指定時はメタデータ行ごと非表示
 */
export const UnsafeSourceOnlyBoundary: Story = {
  render: () => html`
    <ui-article-header
      id="unsafe-source-only"
      heading="unsafe source 単独境界"
      source="javascript:alert(1)"
    ></ui-article-header>
  `,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#unsafe-source-only');
    if (!header) throw new Error('#unsafe-source-only not found');
    await header.updateComplete;

    const metadata = header.shadowRoot?.querySelector('.metadata-list');
    if (metadata) {
      throw new Error('metadata-list should not render when only unsafe source is provided');
    }
  },
};

/**
 * 受け入れ基準: touch/reduced-motion/forced-colors の契約定義が存在すること
 */
export const AccessibilityMediaContracts: Story = {
  render: () => html`
    <ui-article-header
      id="a11y-media-contracts"
      heading="A11yメディア契約確認"
      published="2026-02-21"
      .tags="${['検証']}"
    ></ui-article-header>
  `,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#a11y-media-contracts');
    if (!header) throw new Error('#a11y-media-contracts not found');
    await header.updateComplete;

    const stylesText = header.shadowRoot?.querySelector('style')?.textContent ?? '';
    if (!stylesText.includes('@media (hover: none) and (pointer: coarse)')) {
      throw new Error('Expected touch discoverability media query');
    }
    if (!stylesText.includes('text-decoration: underline')) {
      throw new Error('Expected underline discoverability contract for silent-link');
    }
    if (!stylesText.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error('Expected reduced motion media query');
    }
    if (!stylesText.includes('transition-duration: 0.01ms')) {
      throw new Error('Expected reduced motion transition shortening');
    }
    if (!stylesText.includes('@media (forced-colors: active)')) {
      throw new Error('Expected forced-colors media query');
    }
    if (!stylesText.includes('CanvasText') || !stylesText.includes('GrayText') || !stylesText.includes('LinkText')) {
      throw new Error('Expected forced-colors system color fallbacks');
    }
  },
};

/**
 * Dark Mode契約: コンポーネント側はセマンティックトークン参照でモード分岐不要
 */
export const DarkModeTokenContract: Story = {
  render: () => html`
    <ui-article-header
      id="dark-mode-token-contract"
      heading="ダークモードトークン契約"
      published="2026-02-22"
      .tags="${['theme']}"
    ></ui-article-header>
  `,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#dark-mode-token-contract');
    if (!header) throw new Error('#dark-mode-token-contract not found');
    await header.updateComplete;

    const stylesText = header.shadowRoot?.querySelector('style')?.textContent ?? '';
    if (!stylesText.includes('var(--fg-default')) {
      throw new Error('Expected --fg-default token usage');
    }
    if (!stylesText.includes('var(--fg-muted')) {
      throw new Error('Expected --fg-muted token usage');
    }
    if (!stylesText.includes('var(--fg-subtle')) {
      throw new Error('Expected --fg-subtle token usage');
    }
    if (!stylesText.includes('var(--focus-ring-color')) {
      throw new Error('Expected --focus-ring-color token usage');
    }
  },
};
