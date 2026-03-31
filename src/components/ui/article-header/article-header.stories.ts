import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './article-header';
import type { ArticleHeader, TagClickDetail } from './article-header';
import type { IconName } from '../../../../shared/icons/icons-catalog.js';

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

function getShadowStylesText(shadowRoot: ShadowRoot | null): string {
  if (!shadowRoot) return '';

  const inlineStyles = Array.from(shadowRoot.querySelectorAll('style'))
    .map((style) => style.textContent)
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

/**
 * フル状態（更新日優先 + タグ + 読了時間 + 出典/ライセンス + ステータス）
 */
export const CompleteState: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    heading: 'バッハ《マタイ受難曲》の構造美',
    updatedDate: '2026-02-12',
    published: '2025-12-01',
    created: '2025-11-20',
    tags: ['音楽', 'バッハ', '宗教音楽'],
    readingTime: 8,
    status: 'wip',
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
    if (!header) throw new Error('#complete-state が見つかりません');
    await header.updateComplete;

    const title = header.shadowRoot?.querySelector('.heading');
    if (!title) throw new Error('.heading が見つかりません');
    const titleText = title.textContent.trim();
    if (titleText !== 'バッハ《マタイ受難曲》の構造美') {
      throw new Error(
        `タイトルに "バッハ《マタイ受難曲》の構造美" を期待していましたが、実際には "${titleText}" でした`,
      );
    }

    const time = header.shadowRoot?.querySelector('time');
    if (!time) throw new Error('time 要素が見つかりません');
    if (time.getAttribute('datetime') !== '2026-02-12') {
      throw new Error(
        `datetime 属性に "2026-02-12" を期待していましたが、実際には "${time.getAttribute('datetime') ?? 'null'}" でした`,
      );
    }

    const dateAria = time.getAttribute('aria-label') ?? '';
    if (!dateAria.includes('最終更新日: 2026-02-12')) {
      throw new Error(
        `aria-label に最終更新日の文脈が含まれていることを期待していましたが、実際には "${dateAria}" でした`,
      );
    }
    if (!dateAria.includes('作成日: 2025-11-20')) {
      throw new Error(
        `aria-label に作成日の文脈が含まれていることを期待していましたが、実際には "${dateAria}" でした`,
      );
    }

    const tagLinks = header.shadowRoot?.querySelectorAll<HTMLElement>('.tag-link');
    const tagLinkCount = tagLinks?.length ?? 0;
    if (tagLinkCount !== 3) {
      throw new Error(
        `3つのタグリンクを期待していましたが、実際には ${String(tagLinkCount)}個でした`,
      );
    }

    const tagsNav = header.shadowRoot?.querySelector('nav[aria-label="タグ"]');
    if (!tagsNav) throw new Error('タグナビゲーションが見つかりません');

    const tagList = tagsNav.querySelector('.tag-list');
    if (!tagList) throw new Error('.tag-list が見つかりません');

    const tagItems = tagList.querySelectorAll('.tag-item');
    if (tagItems.length !== 3) {
      throw new Error(
        `3つの .tag-item を期待していましたが、実際には ${String(tagItems.length)}個でした`,
      );
    }

    const status = header.shadowRoot?.querySelector('.status');
    if (!status) throw new Error('.status が見つかりません');
    if (!status.classList.contains('status-wip')) {
      throw new Error(
        `status のトーンクラスに "status-wip" を期待していましたが、実際には "${status.className}" でした`,
      );
    }
    const statusText = status.textContent.trim();
    if (!statusText.includes('作業中')) {
      throw new Error(
        `status テキストに "作業中" が含まれていることを期待していましたが、実際には "${statusText}" でした`,
      );
    }

    const sourceLink = header.shadowRoot?.querySelector<HTMLAnchorElement>('.source-link');
    if (!sourceLink) throw new Error('.source-link が見つかりません');
    if (sourceLink.getAttribute('href') !== 'https://example.com/original') {
      throw new Error(
        `出典 URL に "https://example.com/original" を期待していましたが、実際には "${sourceLink.getAttribute('href') ?? 'null'}" でした`,
      );
    }
    if (sourceLink.getAttribute('target') !== '_blank') {
      throw new Error(
        `出典リンクの target="_blank" を期待していましたが、実際には "${sourceLink.getAttribute('target') ?? 'null'}" でした`,
      );
    }
    if (sourceLink.getAttribute('rel') !== 'noopener noreferrer') {
      throw new Error(
        `出典リンクの rel="noopener noreferrer" を期待していましたが、実際には "${sourceLink.getAttribute('rel') ?? 'null'}" でした`,
      );
    }

    const sourceStyle = getComputedStyle(sourceLink);
    if (sourceStyle.textDecorationLine !== 'underline') {
      throw new Error('source-link はデフォルト状態で下線が表示される必要があります');
    }
  },
};

/**
 * 更新日なし（公開日フォールバック）
 */
export const PublishedFallback: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
    if (!header) throw new Error('#published-fallback が見つかりません');
    await header.updateComplete;

    const time = header.shadowRoot?.querySelector('time');
    if (!time) throw new Error('time 要素が見つかりません');
    if (time.getAttribute('datetime') !== '2026-01-10') {
      throw new Error(
        `datetime 属性に "2026-01-10" を期待していましたが、実際には "${time.getAttribute('datetime') ?? 'null'}" でした`,
      );
    }

    const dateAria = time.getAttribute('aria-label') ?? '';
    if (!dateAria.includes('公開日: 2026-01-10')) {
      throw new Error(
        `aria-label に公開日の文脈が含まれていることを期待していましたが、実際には "${dateAria}" でした`,
      );
    }
    if (!dateAria.includes('作成日: 2026-01-02')) {
      throw new Error(
        `aria-label に作成日の文脈が含まれていることを期待していましたが、実際には "${dateAria}" でした`,
      );
    }
  },
};

/**
 * ステータス状態の意味ある組み合わせ
 */
export const StatusStateMatrix: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
      }
    </style>
    <div class="matrix">
      <ui-article-header
        id="status-draft"
        heading="下書き記事"
        published="2026-01-01"
        status="draft"
      ></ui-article-header>
      <ui-article-header
        id="status-archived"
        heading="アーカイブ記事"
        published="2026-01-01"
        status="archived"
      ></ui-article-header>
      <ui-article-header
        id="status-wip"
        heading="作業中記事"
        published="2026-01-01"
        status="wip"
      ></ui-article-header>
      <ui-article-header
        id="status-deprecated"
        heading="非推奨記事"
        published="2026-01-01"
        status="deprecated"
      ></ui-article-header>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checks: {
      id: string;
      toneClass: string;
      name: IconName;
      label: string;
    }[] = [
      {
        id: '#status-draft',
        toneClass: 'status-draft',
        name: 'file-pen',
        label: '下書き',
      },
      {
        id: '#status-archived',
        toneClass: 'status-archived',
        name: 'archive',
        label: 'アーカイブ',
      },
      { id: '#status-wip', toneClass: 'status-wip', name: 'construction', label: '作業中' },
      {
        id: '#status-deprecated',
        toneClass: 'status-deprecated',
        name: 'alert-triangle',
        label: '非推奨',
      },
    ];

    for (const check of checks) {
      const header = canvasElement.querySelector<ArticleHeader>(check.id);
      if (!header) throw new Error(`${check.id} が見つかりません`);
      await header.updateComplete;

      const status = header.shadowRoot?.querySelector('.status');
      if (!status) throw new Error(`${check.id} の status 要素が見つかりません`);
      if (!status.classList.contains(check.toneClass)) {
        throw new Error(
          `${check.id} に "${check.toneClass}" クラスが含まれていることを期待していました`,
        );
      }
      const statusText = status.textContent.trim();
      if (!statusText.includes(check.label)) {
        throw new Error(
          `${check.id} のテキストに "${check.label}" が含まれていることを期待していましたが、実際には "${statusText}" でした`,
        );
      }

      const icon = status.querySelector('ui-icon');
      if (!(icon instanceof HTMLElement)) throw new Error(`${check.id} の ui-icon が見つかりません`);
      const actualName = icon.getAttribute('name') ?? 'null';
      const expectedName = check.name;
      if (actualName !== expectedName) {
        throw new Error(
          `${check.id} の icon 属性に "${expectedName}" を期待していましたが、実際には "${actualName}" でした`,
        );
      }
    }
  },
};

/**
 * 事故が多い契約: tagsのproperty-only + tag-clickイベント契約
 */
export const TagEventContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
    if (!header) throw new Error('#tag-contract が見つかりません');
    await header.updateComplete;

    if (header.hasAttribute('tags')) {
      throw new Error('tags は property-only である必要があり、属性として存在してはいけません');
    }

    const tagLink = header.shadowRoot?.querySelector<HTMLElement>('.tag-link');
    if (!tagLink) throw new Error('.tag-link が見つかりません');

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

    if (!event) throw new Error('tag-click イベントが発生しませんでした');
    if (!event.bubbles) throw new Error('tag-click がバブリングすることを期待していました');
    if (!event.composed) throw new Error('tag-click が composed であることを期待していました');
    if (!event.cancelable)
      throw new Error('tag-click がキャンセル可能であることを期待していました');

    const expectedTag = '設計と実装';
    const expectedHref = `/tags/${encodeURIComponent(expectedTag)}/`;
    if (event.detail.tag !== expectedTag) {
      throw new Error(
        `detail.tag に "${expectedTag}" を期待していましたが、実際には "${event.detail.tag}" でした`,
      );
    }
    if (event.detail.href !== expectedHref) {
      throw new Error(
        `detail.href に "${expectedHref}" を期待していましたが、実際には "${event.detail.href}" でした`,
      );
    }

    if (!clickCanceled) {
      throw new Error(
        'tag-click が preventDefault されたとき、ネイティブのクリックナビゲーションがキャンセルされることを期待していました',
      );
    }
  },
};

/**
 * 境界条件: メタデータゼロ（見出しのみ）
 */
export const HeadingOnlyBoundary: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <ui-article-header id="heading-only" heading="見出しのみの最小構成"></ui-article-header>
  `,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#heading-only');
    if (!header) throw new Error('#heading-only が見つかりません');
    await header.updateComplete;

    const title = header.shadowRoot?.querySelector('.heading');
    if (!title) throw new Error('.heading が見つかりません');
    const titleText = title.textContent.trim();
    if (titleText !== '見出しのみの最小構成') {
      throw new Error(
        `タイトルに "見出しのみの最小構成" を期待していましたが、実際には "${titleText}" でした`,
      );
    }

    const metadata = header.shadowRoot?.querySelector('.metadata-list');
    if (metadata) {
      throw new Error('すべてのメタデータ入力が空のとき、metadata-list は存在してはいけません');
    }
  },
};

/**
 * 事故が多い境界条件: 値の正規化（tags/readTime/source）
 */
export const NormalizationBoundary: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
    if (!header) throw new Error('#normalization-boundary が見つかりません');
    await header.updateComplete;

    const tagLinks = header.shadowRoot?.querySelectorAll<HTMLElement>('.tag-link');
    const tagTexts = Array.from(tagLinks ?? []).map((link) => link.textContent.trim());
    if (tagTexts.length !== 2) {
      throw new Error(
        `正規化されたタグを2つ期待していましたが、実際には ${String(tagTexts.length)}つでした`,
      );
    }
    if (!tagTexts.includes('設計') || !tagTexts.includes('実装')) {
      throw new Error(
        `正規化されたタグに 設計 と 実装 が含まれていることを期待していました。実際: "${tagTexts.join(', ')}"`,
      );
    }

    const tagsNav = header.shadowRoot?.querySelector('nav[aria-label="タグ"]');
    if (!tagsNav) throw new Error('タグナビゲーションが見つかりません');

    const tagItems = tagsNav.querySelectorAll('.tag-item');
    if (tagItems.length !== 2) {
      throw new Error(
        `2つの .tag-item を期待していましたが、実際には ${String(tagItems.length)}個でした`,
      );
    }

    const reading = header.shadowRoot?.querySelector('.reading-time');
    if (!reading)
      throw new Error(
        '読了時間がレンダリングされていることを期待していましたが、見つかりませんでした',
      );
    const readingText = reading.textContent.trim();
    if (readingText !== '読了目安 2分') {
      throw new Error(
        `読了時間の丸め結果に "読了目安 2分" を期待していましたが、実際には "${readingText}" でした`,
      );
    }

    const source = header.shadowRoot?.querySelector('.source-link');
    if (source) {
      throw new Error('安全でない出典 URL は存在してはいけません');
    }
  },
};

/**
 * 境界条件: 日付は strict YYYY-MM-DD のみ表示し、空白ライセンスは補助行を作らない
 */
export const StrictDateBoundary: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <ui-article-header
      id="strict-date-boundary"
      heading="strict date 境界"
      updated="2026-02-01T00:00:00.000Z"
      published="2026/02/01"
      created="2026-01-15T09:30:00.000Z"
      license="   "
    ></ui-article-header>
  `,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#strict-date-boundary');
    if (!header) throw new Error('#strict-date-boundary が見つかりません');
    await header.updateComplete;

    const time = header.shadowRoot?.querySelector('time');
    if (time) {
      throw new Error('非正規日付のみが与えられたとき、time 要素は存在してはいけません');
    }

    const primaryMetadata = header.shadowRoot?.querySelector('.metadata-list--primary');
    if (primaryMetadata) {
      throw new Error('非正規日付のみが与えられたとき、主要メタデータ行は存在してはいけません');
    }

    const secondaryMetadata = header.shadowRoot?.querySelector('.metadata-list--secondary');
    if (secondaryMetadata) {
      throw new Error('空白のみライセンスでは補助メタデータ行は存在してはいけません');
    }
  },
};

/**
 * 境界条件: unsafe source のみ指定時はメタデータ行ごと非表示
 */
export const UnsafeSourceOnlyBoundary: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <ui-article-header
      id="unsafe-source-only"
      heading="unsafe source 単独境界"
      source="javascript:alert(1)"
    ></ui-article-header>
  `,
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector<ArticleHeader>('#unsafe-source-only');
    if (!header) throw new Error('#unsafe-source-only が見つかりません');
    await header.updateComplete;

    const metadata = header.shadowRoot?.querySelector('.metadata-list');
    if (metadata) {
      throw new Error('安全でない出典のみが指定されたとき、metadata-list は存在してはいけません');
    }
  },
};

/**
 * 受け入れ基準: touch/reduced-motion/forced-colors の契約定義が存在すること
 */
export const AccessibilityMediaContracts: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
    if (!header) throw new Error('#a11y-media-contracts が見つかりません');
    await header.updateComplete;

    const stylesText = getShadowStylesText(header.shadowRoot ?? null);
    if (!stylesText.includes('@media (hover: none) and (pointer: coarse)')) {
      throw new Error('タッチデバイス向けの discoverability メディアクエリを期待していました');
    }
    if (!stylesText.includes('text-decoration: underline')) {
      throw new Error('リンクテキストの下線 discoverability 契約を期待していました');
    }
    if (!stylesText.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error('reduced-motion メディアクエリを期待していました');
    }
    if (!stylesText.includes('transition-duration: 0.01ms')) {
      throw new Error('reduced-motion 時のトランジション短縮を期待していました');
    }
    if (!stylesText.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors メディアクエリを期待していました');
    }
    const lowerStylesText = stylesText.toLowerCase();
    if (
      !lowerStylesText.includes('canvastext') ||
      !lowerStylesText.includes('graytext') ||
      !lowerStylesText.includes('linktext')
    ) {
      throw new Error('forced-colors システムカラーのフォールバックを期待していました');
    }
  },
};

/**
 * Dark Mode契約: コンポーネント側はセマンティックトークン参照でモード分岐不要
 */
export const DarkModeTokenContract: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
    if (!header) throw new Error('#dark-mode-token-contract が見つかりません');
    await header.updateComplete;

    const stylesText = getShadowStylesText(header.shadowRoot ?? null);
    if (!stylesText.includes('var(--fg-default')) {
      throw new Error('--fg-default トークンの使用を期待していました');
    }
    if (!stylesText.includes('var(--fg-muted')) {
      throw new Error('--fg-muted トークンの使用を期待していました');
    }
    if (!stylesText.includes('var(--fg-subtle')) {
      throw new Error('--fg-subtle トークンの使用を期待していました');
    }
    if (!stylesText.includes('var(--focus-ring-color')) {
      throw new Error('--focus-ring-color トークンの使用を期待していました');
    }
  },
};
