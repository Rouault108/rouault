import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './checkbox';
import type { Checkbox } from './checkbox';

const meta: Meta<Checkbox> = {
  title: 'Components/Checkbox',
  component: 'ui-checkbox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
チェックボックスの **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
checked / indeterminate / label click / Space toggle / required / invalid / describedby /
aria-label / aria-labelledby / form reset / form restore は
\`test/browser/checkbox.browser.test.ts\` を正本とします。  
CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
  argTypes: {
    checked: { control: 'boolean' },
    label: { control: 'text' },
    name: { control: 'text' },
    value: { control: 'text' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    invalid: { control: 'boolean' },
    errorMessage: {
      control: 'text',
      name: 'error-message',
    },
  },
};

export default meta;
type Story = StoryObj<Checkbox>;

export const Default: Story = {
  tags: ['smoke'],
  render: () => html`
    <ui-checkbox
      id="default-checkbox"
      label="利用規約に同意する"
      name="agree"
      value="yes"
    ></ui-checkbox>
  `,
};

export const StateMatrix: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-checkbox label="未選択"></ui-checkbox>
      <ui-checkbox label="選択済み" checked></ui-checkbox>
      <ui-checkbox id="indeterminate-demo" label="一部選択"></ui-checkbox>
      <ui-checkbox label="無効" disabled></ui-checkbox>
      <ui-checkbox label="無効・選択済み" checked disabled></ui-checkbox>
    </div>

    <script>
      const target = document.getElementById('indeterminate-demo');
      if (target) target.indeterminate = true;
    </script>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'unchecked / checked / indeterminate / disabled の見本です。状態遷移の合否は browser test を正本とします。',
      },
    },
  },
};

export const ValidationReference: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <p id="checkbox-help" style="margin: 0;">選択すると保存できます。</p>

      <ui-checkbox
        label="必須項目"
        required
        invalid
        error-message="この項目は必須です"
        aria-describedby="checkbox-help"
      ></ui-checkbox>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'required / invalid / error-message / aria-describedby の見本です。妥当性とエラー表示の合否は browser test を正本とします。',
      },
    },
  },
};

export const ExternalAccessibleNameReference: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <span id="external-checkbox-label">外部ラベル</span>
      <ui-checkbox aria-label="単独ラベル"></ui-checkbox>
      <ui-checkbox aria-labelledby="external-checkbox-label"></ui-checkbox>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'label を持たない場合の aria-label / aria-labelledby 委譲の見本です。意味論的合否は browser test を正本とします。',
      },
    },
  },
};

export const ManualInteractionReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 28rem;">
      <ui-checkbox label="クリックと Space で切り替え"></ui-checkbox>
      <ui-checkbox label="ラベルクリック" checked></ui-checkbox>
      <ui-checkbox label="無効状態" checked disabled></ui-checkbox>
      <ui-checkbox label="エラー表示" invalid error-message="選択が必要です"></ui-checkbox>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- label と control の視覚的まとまり
- checked / unchecked / error / disabled の見え方
- focus ring
- アイコンの表示状態

契約の合否は Storybook ではなく \`test/browser/checkbox.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const ContrastAndMotionManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <section
        style="
          display: grid;
          gap: 0.75rem;
          padding: 1rem;
          background: #ffffff;
          color: #111827;
          border-radius: 8px;
        "
      >
        <ui-checkbox label="通常"></ui-checkbox>
        <ui-checkbox label="選択済み" checked></ui-checkbox>
        <ui-checkbox label="エラー" invalid error-message="必須項目です"></ui-checkbox>
      </section>

      <section
        style="
          display: grid;
          gap: 0.75rem;
          padding: 1rem;
          background: #121419;
          color: #f3f4f6;
          border-radius: 8px;
        "
      >
        <ui-checkbox label="通常"></ui-checkbox>
        <ui-checkbox label="選択済み" checked></ui-checkbox>
        <ui-checkbox label="エラー" invalid error-message="必須項目です"></ui-checkbox>
      </section>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'forced-colors / reduced-motion / contrast の手動確認用 story です。CSS 構造契約の合否は SSR 側を正本とします。',
      },
    },
  },
};
