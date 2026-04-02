import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './tabs';
import type { Tabs } from './tabs';

const renderBasicTabs = (options: {
  orientation?: 'horizontal' | 'vertical';
  automaticActivation?: boolean;
  selectedValue?: string | null;
  defaultSelectedValue?: string | null;
  urlSync?: boolean;
}) => html`
  <ui-tabs
    .orientation=${options.orientation ?? 'horizontal'}
    .selectedValue=${options.selectedValue ?? null}
    .defaultSelectedValue=${options.defaultSelectedValue ?? null}
    ?automatic-activation=${options.automaticActivation ?? false}
    ?url-sync=${options.urlSync ?? false}
  >
    <button slot="tab" value="overview">概要</button>
    <div slot="panel" style="padding: 1rem;">概要パネル</div>
    <button slot="tab" value="details">詳細</button>
    <div slot="panel" style="padding: 1rem;">詳細パネル</div>
    <button slot="tab" value="settings">設定</button>
    <div slot="panel" style="padding: 1rem;">設定パネル</div>
  </ui-tabs>
`;

const meta: Meta<Tabs> = {
  title: 'Components/Tabs',
  component: 'ui-tabs',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
\`ui-tabs\` は同一コンテキスト内の panel 切り替えを提供します。

- Storybook は representative display と manual QA の面に限定します
- keyboard navigation、event detail、url-sync などの browser contract は \`test/browser/**\` を正本とします
        `,
      },
    },
  },
  argTypes: {
    selectedValue: {
      control: 'text',
      description: '現在選択値 / 外部制御値',
      table: {
        type: { summary: 'string | null' },
        defaultValue: { summary: 'null' },
      },
    },
    defaultSelectedValue: {
      control: 'text',
      description: '初期選択値（初回のみ評価）',
      table: {
        type: { summary: 'string | null' },
        defaultValue: { summary: 'null' },
      },
    },
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'タブの配置方向',
    },
    automaticActivation: {
      control: 'boolean',
      description: '矢印キー移動と同時に選択するか',
    },
  },
};

export default meta;
type Story = StoryObj<Tabs>;

export const Default: Story = {
  args: {
    orientation: 'horizontal',
    automaticActivation: false,
  },
  render: (args) => renderBasicTabs(args),
};

export const DefaultSelectedValue: Story = {
  render: () => renderBasicTabs({ defaultSelectedValue: 'details' }),
};

export const Vertical: Story = {
  render: () => html`
    <div style="min-height: 220px;">${renderBasicTabs({ orientation: 'vertical' })}</div>
  `,
};

export const AutomaticActivation: Story = {
  render: () => renderBasicTabs({ automaticActivation: true }),
};

export const WithIcons: Story = {
  render: () => html`
    <ui-tabs>
      <button slot="tab" value="overview">🏠 概要</button>
      <div slot="panel" style="padding: 1rem;">概要パネル</div>
      <button slot="tab" value="details">🧪 詳細</button>
      <div slot="panel" style="padding: 1rem;">詳細パネル</div>
      <button slot="tab" value="settings">⚙️ 設定</button>
      <div slot="panel" style="padding: 1rem;">設定パネル</div>
    </ui-tabs>
  `,
};

export const UrlSyncPrimaryTab: Story = {
  tags: ['manual-only'],
  render: () => renderBasicTabs({ urlSync: true }),
};

export const IntegrationExample: Story = {
  render: () => html`
    <section style="display: grid; gap: 16px;">
      <header>
        <h2 style="margin: 0;">API Reference</h2>
        <p style="margin: 0; color: var(--fg-muted, #666);">
          仕様・サンプル・注意事項を切り替えて表示します。
        </p>
      </header>
      <ui-tabs default-selected-value="reference">
        <button slot="tab" value="reference">Reference</button>
        <div slot="panel" style="padding: 1rem; border: 1px solid var(--border-default, #ddd);">
          API リファレンス本文
        </div>
        <button slot="tab" value="example">Example</button>
        <div slot="panel" style="padding: 1rem; border: 1px solid var(--border-default, #ddd);">
          使用例
        </div>
        <button slot="tab" value="notes">Notes</button>
        <div slot="panel" style="padding: 1rem; border: 1px solid var(--border-default, #ddd);">
          補足事項
        </div>
      </ui-tabs>
    </section>
  `,
};
