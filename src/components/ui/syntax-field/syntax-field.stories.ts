import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './syntax-field';
import type { SyntaxField } from './syntax-field';

const meta: Meta<SyntaxField> = {
  title: 'Components/Syntax Field',
  component: 'ui-syntax-field',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
syntax-field の **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
light DOM structure / required badge / type / default rendering / style injection / media contract の合否は Storybook で判定しません。

browser contract は別途 \
\`test/browser/syntax-field.browser.test.ts\` 側へ移してください。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<SyntaxField>;

export const RequiredWithTypeAndDefault: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: '必須 + 型 + 既定値の代表表示用 smoke story です。',
      },
    },
  },
  render: () => html`
    <dl class="syntax-fields">
      <ui-syntax-field id="required-field" name="props" type="object" required default="{}">
        コンポーネントに渡すプロパティオブジェクト。
      </ui-syntax-field>
    </dl>
  `,
};

export const OptionalMinimalField: Story = {
  parameters: {
    docs: {
      description: {
        story: '任意項目の最小構成を見る docs story です。',
      },
    },
  },
  render: () => html`
    <dl class="syntax-fields">
      <ui-syntax-field id="optional-field" name="bio">
        ユーザーの自己紹介テキスト。
      </ui-syntax-field>
    </dl>
  `,
};

export const MixedVariantsInDescriptionList: Story = {
  parameters: {
    docs: {
      description: {
        story: '必須 / 任意 / 型付きの混在例を見る smoke story です。',
      },
    },
  },
  render: () => html`
    <dl class="syntax-fields" style="display: grid; gap: 0.75rem;">
      <ui-syntax-field name="title" required>見出しテキスト。</ui-syntax-field>
      <ui-syntax-field name="slug" type="string" default="auto-generated">
        URL 用の識別子。
      </ui-syntax-field>
      <ui-syntax-field name="tags" type="string[]">任意のタグ一覧。</ui-syntax-field>
    </dl>
  `,
};

export const ManualResponsiveReview: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- description list 内での縦リズム
- required / type / default の情報密度
- dark / print / responsive での見え方

light DOM structure / style injection の合否は browser test 側へ移してください。
        `,
      },
    },
  },
  render: () => html`
    <dl class="syntax-fields" style="display: grid; gap: 1rem; max-width: 720px;">
      <ui-syntax-field name="query" type="string" required default="''">
        検索クエリ文字列。
      </ui-syntax-field>
      <ui-syntax-field name="limit" type="number" default="20"> 最大件数。 </ui-syntax-field>
      <ui-syntax-field name="highlight" type="boolean">ハイライト表示の有効化。</ui-syntax-field>
    </dl>
  `,
};
