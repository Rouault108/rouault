import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './tag';
import type { Tag } from './tag';

const meta: Meta<Tag> = {
  title: 'Components/Tag',
  component: 'ui-tag',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
タグコンポーネントは、コンテンツのメタデータやカテゴリーを表現します。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
root 構造の切り替え、link/removable の並列配置、disabled の非活性化、remove event、
icon slot の有無は \`test/browser/tag.browser.test.ts\` を正本とします。  
forced-colors / reduced-motion を含む CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'solid', 'plain'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm'],
    },
    color: {
      control: 'select',
      options: ['neutral', 'red', 'blue', 'violet', 'pink', 'gold'],
    },
    removable: {
      control: 'boolean',
    },
    href: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<Tag>;

export const Default: Story = {
  tags: ['smoke'],
  render: () => html`<ui-tag id="default-tag">JavaScript</ui-tag>`,
};

export const VariantColorMatrix: Story = {
  render: () => {
    const variants = ['default', 'outline', 'solid', 'plain'] as const;
    const colors = ['neutral', 'red', 'blue', 'violet', 'pink', 'gold'] as const;

    return html`
      <style>
        .matrix {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .matrix-row {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .matrix-label {
          font-size: 11px;
          font-weight: 500;
          color: oklch(48% 0.01 250);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .matrix-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
      </style>

      <div class="matrix">
        ${variants.map(
          (variant) => html`
            <div class="matrix-row">
              <div class="matrix-label">${variant}</div>
              <div class="matrix-tags">
                ${colors.map((color) =>
                  variant === 'plain'
                    ? html`<ui-tag variant="plain" color="${color}">${color}</ui-tag>`
                    : html`<ui-tag variant="${variant}" color="${color}">${color}</ui-tag>`,
                )}
              </div>
            </div>
          `,
        )}
      </div>
    `;
  },
  parameters: {
    docs: {
      description: {
        story: 'variant × color の視覚比較用 docs story です。',
      },
    },
  },
};

export const LinkAndRemovableReference: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-tag href="/tags/javascript">JavaScript</ui-tag>
      <ui-tag removable>Python</ui-tag>
      <ui-tag href="/tags/rust" removable>Rust</ui-tag>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'link only / removable only / link + removable の代表表示用 smoke story です。構造切り替えの合否は browser test を正本とします。',
      },
    },
  },
};

export const DisabledReference: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-tag href="/tags/lit" disabled>Lit</ui-tag>
      <ui-tag removable disabled>TypeScript</ui-tag>
      <ui-tag href="/tags/rust" removable disabled>Rust</ui-tag>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'disabled 状態の見本です。link/remove の非活性化と event 抑止の合否は browser test を正本とします。',
      },
    },
  },
};

export const IconSlotReference: Story = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <ui-tag color="blue">
        <svg slot="icon" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="5" fill="currentColor"></circle>
        </svg>
        Computer Science
      </ui-tag>

      <ui-tag color="gold" variant="outline">
        <svg slot="icon" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <rect x="2" y="2" width="8" height="8" fill="currentColor"></rect>
        </svg>
        Literature
      </ui-tag>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'icon slot の見本です。slot の有無による DOM 切り替え合否は browser test を正本とします。',
      },
    },
  },
};

export const ManualInteractionReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-tag href="/tags/javascript">JavaScript</ui-tag>
        <ui-tag removable>Python</ui-tag>
        <ui-tag href="/tags/rust" removable>Rust</ui-tag>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-tag href="/tags/lit" disabled>Lit</ui-tag>
        <ui-tag removable disabled>TypeScript</ui-tag>
        <ui-tag href="/tags/rust" removable disabled>Rust</ui-tag>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- link / remove affordance の見え方
- group 構造での並び
- disabled の視覚状態
- icon slot を含む行内密度

合否は Storybook ではなく \`test/browser/tag.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const ContrastAndMotionManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <section
        style="
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding: 1rem;
          background: #ffffff;
          color: #111827;
          border-radius: 8px;
        "
      >
        <ui-tag>Default</ui-tag>
        <ui-tag variant="outline" color="blue">Outline</ui-tag>
        <ui-tag variant="solid" color="red">Solid</ui-tag>
        <ui-tag variant="plain" color="gold">Plain</ui-tag>
      </section>

      <section
        style="
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding: 1rem;
          background: #121419;
          color: #f3f4f6;
          border-radius: 8px;
        "
      >
        <ui-tag>Default</ui-tag>
        <ui-tag variant="outline" color="blue">Outline</ui-tag>
        <ui-tag variant="solid" color="red">Solid</ui-tag>
        <ui-tag variant="plain" color="gold">Plain</ui-tag>
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