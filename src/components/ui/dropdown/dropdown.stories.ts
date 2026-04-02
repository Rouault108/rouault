import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import '../icon/icon';
import './dropdown';
import type { Dropdown } from './dropdown';

const triggerStyle = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 32px;
  border: 1px solid oklch(90% 0.01 250 / 0.3);
  border-radius: 6px;
  background: oklch(97% 0 0);
  cursor: pointer;
  font-size: 14px;
`;

const renderTrigger = (label: string) => html`
  <button slot="trigger" type="button" style="${triggerStyle}">
    ${label}
    <ui-icon name="chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></ui-icon>
  </button>
`;

const meta: Meta<Dropdown> = {
  title: 'Components/Dropdown',
  component: 'ui-dropdown',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
dropdown の **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
keyboard navigation / typeahead / click outside / open / close / menu-item-select / trigger aria は
\`test/browser/dropdown.browser.test.ts\` を正本とします。  
forced-colors / reduced-motion / print の CSS 構造契約は
\`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Dropdown>;

export const Default: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: '代表表示用の smoke story です。trigger と panel の基本 surface だけを残します。',
      },
    },
  },
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown>
        ${renderTrigger('メニュー')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
};

export const PlacementMatrix: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'placement の見え方を手で確認するための manual-only story です。最終的な位置計算の合否は `test/browser/dropdown.browser.test.ts` を正本とします。',
      },
    },
  },
  render: () => html`
    <div
      style="display: grid; grid-template-columns: repeat(2, minmax(240px, 1fr)); gap: 2rem; padding: 4rem 2rem;"
    >
      <ui-dropdown side="bottom" align="start" opened>
        ${renderTrigger('bottom / start')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
      </ui-dropdown>

      <ui-dropdown side="bottom" align="end" opened>
        ${renderTrigger('bottom / end')}
        <ui-menu-item value="share">共有</ui-menu-item>
        <ui-menu-item value="archive">アーカイブ</ui-menu-item>
      </ui-dropdown>

      <ui-dropdown side="top" align="start" opened>
        ${renderTrigger('top / start')}
        <ui-menu-item value="rename">名前変更</ui-menu-item>
        <ui-menu-item value="duplicate">複製</ui-menu-item>
      </ui-dropdown>

      <ui-dropdown side="right" align="center" opened>
        ${renderTrigger('right / center')}
        <ui-menu-item value="export">書き出し</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
};

export const DisabledAndDangerReference: Story = {
  render: () => html`
    <div style="display: grid; gap: 1.5rem; padding: 2rem;">
      <ui-dropdown opened>
        ${renderTrigger('通常項目')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="archive" disabled>アーカイブ</ui-menu-item>
        <ui-menu-item value="duplicate">複製</ui-menu-item>
      </ui-dropdown>

      <ui-dropdown opened>
        ${renderTrigger('危険操作')}
        <ui-menu-item value="archive">アーカイブ</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>

      <ui-dropdown disabled>
        ${renderTrigger('disabled')}
        <ui-menu-item value="noop">無効</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'disabled trigger と danger item の docs story です。選択抑止や event の合否は browser test を正本とします。',
      },
    },
  },
};

export const NonButtonTriggerSurface: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown>
        <div
          slot="trigger"
          style="display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; height: 32px; border: 1px dashed oklch(80% 0.01 250); border-radius: 6px;"
        >
          div trigger
          <ui-icon name="chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></ui-icon>
        </div>
        <ui-menu-item value="open">開く</ui-menu-item>
        <ui-menu-item value="rename">名前変更</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          '非 button trigger の surface 参照です。trigger aria fallback や keyboard 合否は browser test を正本とします。',
      },
    },
  },
};

export const ManualKeyboardReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown opened>
        ${renderTrigger('手動確認')}
        <ui-menu-item value="edit" text-value="edit">編集</ui-menu-item>
        <ui-menu-item value="duplicate" text-value="duplicate">複製</ui-menu-item>
        <ui-menu-item value="archive" disabled text-value="archive">アーカイブ</ui-menu-item>
        <ui-menu-item value="delete" variant="danger" text-value="delete">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- ArrowUp / ArrowDown / Home / End
- typeahead
- disabled item の視覚差
- danger item の見え方

合否は Storybook ではなく \`test/browser/dropdown.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};