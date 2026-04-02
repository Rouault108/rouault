import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './button';
import type { Button } from './button';

const meta: Meta<Button> = {
  title: 'Components/Button',
  component: 'ui-button',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
ボタンの **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
form submit / reset / icon-only a11y / pressed / expanded / media 契約の合否は Storybook で判定しません。

browser contract は別途 \
\`test/browser/button.browser.test.ts\` 側へ移してください。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Button>;

export const Default: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: 'secondary 相当の代表表示用 smoke story です。基本 surface の見え方だけを残します。',
      },
    },
  },
  render: () => html`<ui-button>保存</ui-button>`,
};

export const AllVariants: Story = {
  parameters: {
    docs: {
      description: {
        story: 'primary / secondary / outline / ghost / danger の視覚差を見る docs story です。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
      <ui-button variant="primary">Primary</ui-button>
      <ui-button>Secondary</ui-button>
      <ui-button variant="outline">Outline</ui-button>
      <ui-button variant="ghost">Ghost</ui-button>
      <ui-button variant="danger">Danger</ui-button>
    </div>
  `,
};

export const StatesAndSizes: Story = {
  parameters: {
    docs: {
      description: {
        story: 'loading / disabled / icon-only / size の代表面をまとめた smoke story です。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 640px;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
        <ui-button size="sm">Small</ui-button>
        <ui-button>Default</ui-button>
        <ui-button size="lg">Large</ui-button>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
        <ui-button loading>保存中...</ui-button>
        <ui-button disabled>無効</ui-button>
        <ui-button icon-only aria-label="設定を開く">⚙</ui-button>
      </div>
    </div>
  `,
};

export const UsageContexts: Story = {
  parameters: {
    docs: {
      description: {
        story: 'form / dialog trigger / toolbar の配置例を見る docs story です。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 720px;">
      <form>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <ui-button type="submit" variant="primary">送信</ui-button>
          <ui-button type="reset" variant="ghost">リセット</ui-button>
        </div>
      </form>

      <div style="display: flex; gap: 0.75rem; align-items: center;">
        <ui-button variant="ghost" aria-expanded="false" aria-controls="menu-panel" aria-haspopup="menu">
          メニュー
        </ui-button>
        <ui-button variant="outline">補助アクション</ui-button>
      </div>
    </div>
  `,
};

export const ManualInteractiveReview: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- hover / focus-visible / active の触感
- icon-only の密度
- dark / forced-colors / print での見え方

submit / reset / aria-expanded / pressed の合否は browser test 側へ移してください。
        `,
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 640px;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
        <ui-button variant="primary">Primary action</ui-button>
        <ui-button aria-pressed="true">Pressed state</ui-button>
        <ui-button variant="ghost" aria-expanded="true" aria-controls="manual-panel">Expanded</ui-button>
      </div>
      <div id="manual-panel" style="padding: 1rem; border: 1px solid color-mix(in oklab, currentColor 12%, transparent);">
        手動確認用 panel
      </div>
    </div>
  `,
};