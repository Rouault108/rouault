import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './search-field.js';
import type { SearchField } from './search-field.js';

const meta: Meta<SearchField> = {
  title: 'Components/SearchField',
  component: 'ui-search-field',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
検索専用の入力フィールドです。検索アイコン、clear button、combobox 用 ARIA の受け皿をひとまとめに提供します。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
input / clear / imperative API / aria delegation などの browser contract は
\`test/browser/search-field.browser.test.ts\` を正本とします。  
CSS 構造契約は SSR 側を正本とします。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<SearchField>;

export const Default: Story = {
  tags: ['smoke'],
  render: () => html`
    <div style="max-width: 32rem;">
      <ui-search-field
        label="検索"
        hide-label
        placeholder="メモを検索"
      ></ui-search-field>
    </div>
  `,
};

export const ClearableReference: Story = {
  render: () => html`
    <div style="max-width: 32rem;">
      <ui-search-field
        label="検索"
        hide-label
        placeholder="メモを検索"
        value="router"
      ></ui-search-field>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'clear button が表示される状態の docs story です。clear の合否は browser test を正本とします。',
      },
    },
  },
};

export const ComboboxReference: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.5rem; max-width: 32rem;">
      <ui-search-field
        label="検索"
        hide-label
        value="router"
        .inputRole=${'combobox'}
        .inputAriaExpanded=${'true'}
        .inputAriaAutocomplete=${'list'}
        .inputAriaControls=${'search-listbox'}
        .inputAriaActivedescendant=${'search-option-0'}
        .inputAriaBusy=${'false'}
        .inputAriaDescribedby=${'search-field-help search-field-shortcut'}
        enterkeyhint="search"
        inputmode="search"
        spellcheck="false"
        autocapitalize="off"
      ></ui-search-field>
      <p id="search-field-help">タグ・本文・タイトルを横断検索します。</p>
      <p id="search-field-shortcut">ショートカット: /</p>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'combobox 用 aria と native input hints の参照 story です。反映の合否は test/browser/search-field.browser.test.ts を正本とします。',
      },
    },
  },
};

export const ReadonlyAndDisabled: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 32rem;">
      <ui-search-field
        label="検索"
        hide-label
        value="router"
        readonly
      ></ui-search-field>
      <ui-search-field
        label="検索"
        hide-label
        value="router"
        disabled
      ></ui-search-field>
    </div>
  `,
};

export const ManualObservation: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 32rem;">
      <ui-search-field
        label="検索"
        hide-label
        placeholder="メモを検索"
      ></ui-search-field>
      <ui-search-field
        label="検索"
        hide-label
        value="router"
      ></ui-search-field>
      <ui-search-field
        label="検索"
        hide-label
        value="readonly"
        readonly
      ></ui-search-field>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- ラベル非表示時の見え方
- 値あり状態の clear affordance
- readonly の視覚状態
- アイコンと入力の整列

契約の合否は Storybook ではなく \`test/browser/search-field.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};