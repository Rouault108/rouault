import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './popover';
import type { UiPopover } from './popover';

const meta: Meta<UiPopover> = {
  title: 'Components/Popover',
  component: 'ui-popover',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
意味論を持たない anchored popover shell です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
open / close / dismiss reason / active trigger / controlled/uncontrolled / slot resync は
\`test/browser/popover.browser.test.ts\` を正本とします。  
CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['default', 'subtle', 'inverse'],
    },
    placement: {
      control: 'text',
    },
    offset: {
      control: { type: 'number', min: 0, step: 1 },
    },
    opened: {
      control: 'boolean',
    },
    defaultOpened: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<UiPopover>;

const movedToBrowserDocs = (story: string): Pick<Story, 'tags' | 'parameters'> => ({
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story,
      },
    },
  },
});

export const BasicContract: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story:
          '代表表示用の smoke story です。trigger と content surface の基本構成だけを残します。',
      },
    },
  },
  render: () => html`
    <div style="padding: 2rem;">
      <ui-popover>
        <button slot="trigger" type="button">詳細を開く</button>
        <div slot="content">Popover 本文です。</div>
      </ui-popover>
      <button type="button">次要素</button>
    </div>
  `,
};

export const VariantAndPlacementReference: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 3rem;">
      <ui-popover variant="default" placement="bottom-start" opened>
        <button slot="trigger" type="button">default</button>
        <div slot="content">default surface</div>
      </ui-popover>

      <ui-popover variant="subtle" placement="right" opened>
        <button slot="trigger" type="button">subtle</button>
        <div slot="content">subtle surface</div>
      </ui-popover>

      <ui-popover variant="inverse" placement="top-end" opened>
        <button slot="trigger" type="button">inverse</button>
        <div slot="content">inverse surface</div>
      </ui-popover>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'variant / placement の見え方を手で比較するための manual-only story です。配置と開閉の合否は `test/browser/popover.browser.test.ts` を正本とします。',
      },
    },
  },
};

export const ControlledReference: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; padding: 2rem;">
      <ui-popover defaultOpened>
        <button slot="trigger" type="button">uncontrolled</button>
        <div slot="content">uncontrolled content</div>
      </ui-popover>

      <ui-popover opened>
        <button slot="trigger" type="button">controlled</button>
        <div slot="content">controlled content</div>
      </ui-popover>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'controlled / uncontrolled の surface 参照です。開閉責務の合否は browser test を正本とします。',
      },
    },
  },
};

export const RequestCancelContract: Story = {
  ...movedToBrowserDocs(
    'open-change-request cancel の契約は test/browser/popover.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="padding: 2rem;">
      <ui-popover>
        <button slot="trigger" type="button">request cancel</button>
        <div slot="content">request cancel content</div>
      </ui-popover>
    </div>
  `,
};

export const ControlledAndUncontrolledContract: Story = {
  ...movedToBrowserDocs(
    'controlled / uncontrolled の分離契約は test/browser/popover.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="display: grid; gap: 1rem; padding: 2rem;">
      <ui-popover defaultOpened>
        <button slot="trigger" type="button">uncontrolled</button>
        <div slot="content">uncontrolled content</div>
      </ui-popover>

      <ui-popover opened>
        <button slot="trigger" type="button">controlled</button>
        <div slot="content">controlled content</div>
      </ui-popover>
    </div>
  `,
};

export const SlotInvalidationContract: Story = {
  ...movedToBrowserDocs(
    'trigger/content slot invalidation と active trigger の再同期は test/browser/popover.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="padding: 2rem;">
      <ui-popover opened>
        <button slot="trigger" type="button">slot resync</button>
        <div slot="content">slot invalidation content</div>
      </ui-popover>
    </div>
  `,
};

export const ManualDismissReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: flex; gap: 2rem; padding: 2rem;">
      <ui-popover>
        <button slot="trigger" type="button">popover A</button>
        <div slot="content">outside click / escape の手動確認</div>
      </ui-popover>

      <ui-popover variant="inverse">
        <button slot="trigger" type="button">popover B</button>
        <div slot="content">inverse surface</div>
      </ui-popover>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- trigger click での開閉
- outside click / Escape
- active trigger の見え方
- inverse surface の印象

合否は Storybook ではなく \`test/browser/popover.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};