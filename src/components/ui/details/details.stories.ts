import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './details';
import type { Details } from './details';

const meta: Meta<Details> = {
  title: 'Components/Details',
  component: 'ui-details',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
details の **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
toggle event、aria-expanded、content wrapper の inert / aria-hidden、region landmark、
summary slot 優先、icon-only accessible name は
\`test/browser/details.browser.test.ts\` を正本とします。  
CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Details>;

export const Default: Story = {
  tags: ['smoke'],
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-details summary="補足情報">
        <p style="margin: 0;">本文に対する補足説明を格納する代表表示です。</p>
      </ui-details>
    </div>
  `,
};

export const Bordered: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-details summary="境界付きパネル" variant="bordered" open>
        <p style="margin: 0;">bordered variant の表示見本です。</p>
      </ui-details>
    </div>
  `,
};

export const SummarySlot: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-details summary="property summary" open>
        <span slot="summary"><strong>slot summary</strong> を使った見出し</span>
        <p style="margin: 0;">summary property より slot を優先する surface です。</p>
      </ui-details>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'summary slot 優先の見本です。優先順位の合否は browser test を正本とします。',
      },
    },
  },
};

export const RegionLandmark: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-details summary="関連節" region open>
        <p style="margin: 0;">region=true により landmark として扱う surface です。</p>
      </ui-details>
    </div>
  `,
};

export const IconOnly: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-details aria-label="追加情報を表示">
        <p style="margin: 0;">icon-only 利用時の代表表示です。</p>
      </ui-details>
    </div>
  `,
};

export const ManualDisclosureReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-details summary="手動確認用 disclosure" variant="bordered">
        <p style="margin: 0 0 0.5rem;">
          開閉・フォーカスリング・summary surface を手動確認するための story です。
        </p>
        <button type="button">内部アクション</button>
      </ui-details>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- trigger surface
- icon の回転
- bordered variant の見え方
- focus ring と content reveal の印象

合否は Storybook ではなく \`test/browser/details.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const ContrastAndMotionManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 1rem; padding: 2rem;">
      <section
        style="
          max-width: 720px;
          padding: 1rem;
          background: #ffffff;
          color: #111827;
          border-radius: 8px;
        "
      >
        <ui-details summary="Light theme" variant="bordered" open>
          <p style="margin: 0;">light surface での見え方です。</p>
        </ui-details>
      </section>

      <section
        style="
          max-width: 720px;
          padding: 1rem;
          background: #121419;
          color: #f3f4f6;
          border-radius: 8px;
        "
      >
        <ui-details summary="Dark theme" variant="bordered" open>
          <p style="margin: 0;">dark surface での見え方です。</p>
        </ui-details>
      </section>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'forced-colors / reduced-motion / contrast の手動確認用 story です。CSS 構造契約は SSR 側を正本とします。',
      },
    },
  },
};