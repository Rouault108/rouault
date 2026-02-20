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
      description: '更新日 (`YYYY-MM-DD`)。表示日は `updated > published`',
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
 * フル状態（更新日優先 + タグ + 読了時間 + 出典/ライセンス + ステータス + Lead）
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
      >
        <p>本稿では、対称構造と神学的意図の関係を分析します。</p>
      </ui-article-header>
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

    const tagLinks = header.shadowRoot?.querySelectorAll<HTMLAnchorElement>('.tag-link');
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

    const lead = header.shadowRoot?.querySelector('.lead');
    if (!lead) throw new Error('.lead not found');
    if (lead.hasAttribute('hidden')) {
      throw new Error('Expected lead to be visible');
    }
  },
};

/**
 * 更新日なし（公開日フォールバック）+ Leadなし
 */
export const PublishedFallbackWithoutLead: Story = {
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

    const root = header.shadowRoot?.querySelector('.article-header');
    if (!root) throw new Error('.article-header not found');
    if (!root.classList.contains('no-lead')) {
      throw new Error('Expected root class to include "no-lead"');
    }

    const lead = header.shadowRoot?.querySelector('.lead');
    if (!lead) throw new Error('.lead not found');
    if (!lead.hasAttribute('hidden')) {
      throw new Error('Expected lead to be hidden');
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

    const tagLink = header.shadowRoot?.querySelector<HTMLAnchorElement>('.tag-link');
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

    const lead = header.shadowRoot?.querySelector('.lead');
    if (!lead) throw new Error('.lead not found');
    if (!lead.hasAttribute('hidden')) {
      throw new Error('Expected lead to be hidden in heading-only boundary');
    }
  },
};
