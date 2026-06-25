import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './tooltip';
import type { UiTooltip } from './tooltip';

const buttonStyle = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid oklch(90% 0.01 250 / 0.3);
  border-radius: 6px;
  background: oklch(97% 0 0);
  cursor: pointer;
`;

const meta: Meta<UiTooltip> = {
  title: 'Components/Tooltip',
  component: 'ui-tooltip',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
tooltipの **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
hover / focus / Escape / aria-describedby / document.body への portal-like surface / disabled / 空文字抑止は
\`test/browser/tooltip.browser.test.ts\` を正本とします。

tooltip の媒体差分や document.body へ出る surface は Storybook で合否判定しません。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiTooltip>;

export const DefaultInfoIcon: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story:
          '代表表示用の smoke story です。trigger と tooltip surface の基本的な見え方だけを残します。',
      },
    },
  },
  render: () => html`
    <div style="padding: 4rem;">
      <ui-tooltip text="保存前の補足説明です。">
        <button type="button" style="${buttonStyle}">保存</button>
      </ui-tooltip>
    </div>
  `,
};

export const VariantStateMatrix: Story = {
  render: () => html`
    <div
      style="display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 1rem; padding: 4rem 2rem;"
    >
      <ui-tooltip text="default tooltip" variant="default">
        <button type="button" style="${buttonStyle}">default</button>
      </ui-tooltip>

      <ui-tooltip text="subtle tooltip" variant="subtle">
        <button type="button" style="${buttonStyle}">subtle</button>
      </ui-tooltip>

      <ui-tooltip text="inverse tooltip" variant="inverse">
        <button type="button" style="${buttonStyle}">inverse</button>
      </ui-tooltip>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'variantごとの視覚差を観察するdocs storyです。',
      },
    },
  },
};

export const PlacementAndDelaySurface: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'placement と delay 設定の代表表示用 smoke story です。最終的な open/close timing の合否は browser test を正本とします。',
      },
    },
  },
  render: () => html`
    <div
      style="display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 2rem; padding: 5rem 2rem;"
    >
      <ui-tooltip text="上に表示" placement="top" open-delay="120" close-delay="120">
        <button type="button" style="${buttonStyle}">top</button>
      </ui-tooltip>

      <ui-tooltip text="右に表示" placement="right" open-delay="120" close-delay="120">
        <button type="button" style="${buttonStyle}">right</button>
      </ui-tooltip>

      <ui-tooltip text="下に表示" placement="bottom" open-delay="120" close-delay="120">
        <button type="button" style="${buttonStyle}">bottom</button>
      </ui-tooltip>

      <ui-tooltip text="左に表示" placement="left" open-delay="120" close-delay="120">
        <button type="button" style="${buttonStyle}">left</button>
      </ui-tooltip>
    </div>
  `,
};

export const DisabledAndEmptyTextReference: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; padding: 4rem 2rem;">
      <ui-tooltip text="無効時は出ません" disabled>
        <button type="button" style="${buttonStyle}">disabled</button>
      </ui-tooltip>

      <ui-tooltip text="   ">
        <span
          style="
            display: inline-flex;
            align-items: center;
            min-height: 32px;
            padding: 0 12px;
            border: 1px dashed oklch(80% 0.01 250);
            border-radius: 6px;
          "
        >
          empty text
        </span>
      </ui-tooltip>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'disabled と空文字 text の見本です。抑止の合否は Storybook ではなく browser test を正本とします。',
      },
    },
  },
};

export const ManualHoverReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: flex; gap: 2rem; padding: 5rem 2rem;">
      <ui-tooltip text="hover / focus / escape を手動確認" variant="default">
        <button type="button" style="${buttonStyle}">manual review</button>
      </ui-tooltip>

      <ui-tooltip text="inverse hover surface" variant="inverse" placement="right">
        <button type="button" style="${buttonStyle}">inverse</button>
      </ui-tooltip>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- hover / focus 時の surface
- inverse variant の視覚差
- placement に応じた見え方
- trigger 周辺の hit area の印象

合否は Storybook ではなく \`test/browser/tooltip.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};
