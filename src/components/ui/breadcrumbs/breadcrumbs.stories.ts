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
  parameters: {
    docs: {
      description: {
        component: `
\`ui-breadcrumbs\` は Storybook では **display / smoke / manual review** に限定します。

desktop collapse、mobile auto collapse、ellipsis dropdown、\`breadcrumb-navigate\`、
omit-root、focus を含む browser contract は
\`test/browser/helpers/breadcrumbs.browser.test.ts\` を正本とします。  
forced-colors / reduced-motion / print の CSS 構造契約は
\`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
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
  },
};

export default meta;
type Story = StoryObj<Breadcrumbs>;

export const Default: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: '短いパンくずの代表表示用 smoke story です。',
      },
    },
  },
  render: () => html`
    <ui-breadcrumbs
      .items=${[
        { label: 'ホーム', href: '/' },
        { label: 'プロジェクト', href: '/projects' },
        { label: '設定' },
      ]}
    ></ui-breadcrumbs>
  `,
};

export const CollapsedWithDropdown: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'desktop で ellipsis dropdown が入る見え方を手で確認するための manual-only story です。collapse の合否は `test/browser/helpers/breadcrumbs.browser.test.ts` を正本とします。',
      },
    },
  },
  render: () => html`
    <ui-breadcrumbs id="collapsed-dropdown" max-items="4" .items=${BASE_ITEMS}></ui-breadcrumbs>
  `,
};

export const OmitRootDesktop: Story = {
  render: () => html`
    <ui-breadcrumbs id="omit-root" omit-root max-items="5" .items=${BASE_ITEMS}></ui-breadcrumbs>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'omit-root の docs story です。先頭項目の除去合否は Storybook ではなく browser test を正本とします。',
      },
    },
  },
};

export const SingleLineEllipsis: Story = {
  render: () => html`
    <div style="max-width: 320px;">
      <ui-breadcrumbs
        .items=${[
          { label: 'ホーム', href: '/' },
          { label: '非常に長い親セクション名', href: '/section' },
          { label: 'さらに長い現在ページのタイトル' },
        ]}
      ></ui-breadcrumbs>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: '長いラベルの省略表示を観察する docs story です。',
      },
    },
  },
};

export const AllStatesReference: Story = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      <ui-breadcrumbs .items=${BASE_ITEMS.slice(0, 3)}></ui-breadcrumbs>
      <ui-breadcrumbs max-items="4" .items=${BASE_ITEMS}></ui-breadcrumbs>
      <ui-breadcrumbs omit-root .items=${BASE_ITEMS}></ui-breadcrumbs>
    </div>
  `,
};

export const MobileAutoCollapseManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="max-width: 420px; border: 1px dashed var(--border-default); padding: 16px;">
      <ui-breadcrumbs .items=${BASE_ITEMS}></ui-breadcrumbs>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- モバイル幅での root / ellipsis / current への縮退
- dropdown trigger の見え方
- 長い current label の切り詰め
- focus ring

合否は Storybook ではなく \`test/browser/helpers/breadcrumbs.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};