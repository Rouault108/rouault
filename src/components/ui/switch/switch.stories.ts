import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './switch';
import type { Switch } from './switch';

const meta: Meta<Switch> = {
  title: 'Components/Switch',
  component: 'ui-switch',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
トグルスイッチコンポーネントは、設定の即時反映を司るコントロールです。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
role=switch、aria-checked、label 関連付け、track / label click、Space / Enter、disabled、
label なし時の aria-label 委譲、focus()/blur() は
\`test/browser/switch.browser.test.ts\` を正本とします。  
forced-colors / reduced-motion を含む CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
  argTypes: {
    checked: {
      control: 'boolean',
    },
    label: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<Switch>;

export const Default: Story = {
  tags: ['smoke'],
  render: () => html`<ui-switch label="ダークモード"></ui-switch>`,
};

export const StateMatrix: Story = {
  render: () => html`
    <style>
      .states-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem 1.5rem;
        max-width: 520px;
      }
      .state-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .state-label {
        font-size: 11px;
        font-weight: 500;
        color: oklch(48% 0.01 250);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>

    <div class="states-grid">
      <div class="state-group">
        <div class="state-label">off</div>
        <ui-switch label="OFF"></ui-switch>
      </div>

      <div class="state-group">
        <div class="state-label">on</div>
        <ui-switch label="ON" checked></ui-switch>
      </div>

      <div class="state-group">
        <div class="state-label">off + disabled</div>
        <ui-switch label="OFF・無効" disabled></ui-switch>
      </div>

      <div class="state-group">
        <div class="state-label">on + disabled</div>
        <ui-switch label="ON・無効" checked disabled></ui-switch>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          '主要状態の見本です。checked / disabled の意味論的合否は browser test を正本とします。',
      },
    },
  },
};

export const LabelAndAriaReference: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <ui-switch label="通知を受け取る"></ui-switch>
      <ui-switch aria-label="ラベルなしスイッチ"></ui-switch>
      <ui-switch label="非常に長いラベルテキストのテスト用スイッチ"></ui-switch>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'label あり / label なし / 長い label の見本です。aria-labelledby / aria-label の合否は browser test を正本とします。',
      },
    },
  },
};

export const InteractionReference: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <ui-switch label="クリックでトグル"></ui-switch>
      <ui-switch label="キーボードでトグル" checked></ui-switch>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'track click / label click / keyboard toggle の代表表示です。change / input / Enter 抑止の合否は browser test を正本とします。',
      },
    },
  },
};

export const FormBoundaryManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <form style="display: flex; flex-direction: column; gap: 1rem; max-width: 24rem;">
      <ui-switch label="フォーム内で Enter を押す"></ui-switch>
      <button type="submit">送信</button>
    </form>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- track にフォーカスした状態で Space / Enter がトグルを行うこと
- Enter がフォーム送信を引き起こさないこと

合否は Storybook ではなく \`test/browser/switch.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const MotionAndContrastManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <section
        style="
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: #ffffff;
          color: #111827;
          border-radius: 8px;
        "
      >
        <ui-switch label="通常"></ui-switch>
        <ui-switch label="ON" checked></ui-switch>
        <ui-switch label="無効" disabled></ui-switch>
      </section>

      <section
        style="
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: #121419;
          color: #f3f4f6;
          border-radius: 8px;
        "
      >
        <ui-switch label="通常"></ui-switch>
        <ui-switch label="ON" checked></ui-switch>
        <ui-switch label="無効" disabled></ui-switch>
      </section>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'forced-colors / reduced-motion / contrast の手動確認用 story です。CSS 構造契約の合否は test/ssr/css-structure-contracts.test.ts を正本とします。',
      },
    },
  },
};
