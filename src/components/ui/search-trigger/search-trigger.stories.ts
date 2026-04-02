import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import './search-trigger';
import type { SearchTrigger } from './search-trigger';

const meta: Meta<SearchTrigger> = {
  title: 'Components/SearchTrigger',
  component: 'ui-search-trigger',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
検索トリガーは検索ダイアログを開く **request event の起点** です。  
検索語、ショートカット登録、ダイアログ開閉状態は所有しません。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
button semantics、aria delegation、density 正規化、request event は
\`test/browser/search-trigger.browser.test.ts\` を正本とします。  
forced-colors / reduced-motion などの CSS 構造契約は SSR 側を正本とします。
        `,
      },
    },
  },
  argTypes: {
    placeholder: {
      control: 'text',
      description: '視覚表示専用のラベル',
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
    },
    density: {
      control: 'select',
      options: ['auto', 'default', 'compact', 'icon-only'],
      description: '視覚密度',
    },
    ariaLabel: {
      control: 'text',
      name: 'aria-label',
    },
    ariaControls: {
      control: 'text',
      name: 'aria-controls',
    },
    ariaExpanded: {
      control: 'text',
      name: 'aria-expanded',
    },
  },
};

export default meta;
type Story = StoryObj<SearchTrigger>;

export const Default: Story = {
  tags: ['smoke'],
  args: {
    placeholder: '検索...',
    disabled: false,
    density: 'auto',
  },
  render: (args) => html`
    <ui-search-trigger
      .placeholder=${args.placeholder}
      ?disabled=${args.disabled}
      density="${args.density}"
      aria-label=${args.ariaLabel ?? '検索ダイアログを開く'}
      aria-controls=${ifDefined(args.ariaControls ?? undefined)}
      aria-expanded=${ifDefined(args.ariaExpanded ?? undefined)}
    ></ui-search-trigger>
  `,
};

export const DensityShowcase: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 28rem;">
      <ui-search-trigger density="auto"></ui-search-trigger>
      <ui-search-trigger density="default"></ui-search-trigger>
      <ui-search-trigger density="compact"></ui-search-trigger>
      <ui-search-trigger density="icon-only"></ui-search-trigger>
    </div>
  `,
};

export const AriaDelegationReference: Story = {
  render: () => html`
    <ui-search-trigger
      aria-label="ノート内検索を開く"
      aria-controls="global-search-dialog"
      aria-expanded="true"
    ></ui-search-trigger>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'aria-label / aria-controls / aria-expanded を外部から委譲する参照 story です。合否は test/browser/search-trigger.browser.test.ts を正本とします。',
      },
    },
  },
};

export const BoundaryManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 22rem;">
      <ui-search-trigger placeholder=""></ui-search-trigger>
      <ui-search-trigger placeholder=${'一行目\n二行目\n三行目'}></ui-search-trigger>
      <ui-search-trigger
        placeholder="これは非常に長いプレースホルダーテキストであり、表示幅を超えた場合でも 1 行のまま省略表示される必要があります"
      ></ui-search-trigger>
      <ui-search-trigger density="icon-only"></ui-search-trigger>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- 長文 placeholder の省略表示
- icon-only の見た目
- compact / auto / default の視覚差
- 狭幅時の表示縮退

契約の合否は Storybook ではなく \`test/browser/search-trigger.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const ForcedColorsAndMotionManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 22rem;">
      <ui-search-trigger></ui-search-trigger>
      <ui-search-trigger density="compact"></ui-search-trigger>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'forced-colors / reduced-motion の手動確認用 story です。rule existence の合否は SSR 側 CSS contract test を正本とします。',
      },
    },
  },
};
