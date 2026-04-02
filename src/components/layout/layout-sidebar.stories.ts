import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './layout-sidebar';
import type { LayoutSidebar } from './layout-sidebar';
import type { TreeNode } from '../ui/file-tree/file-tree';

const sampleItems: readonly TreeNode[] = [
  {
    kind: 'branch',
    id: 'music',
    label: 'Music',
    icon: 'folder',
    children: [
      {
        kind: 'branch',
        id: 'music/classical',
        label: 'Classical',
        icon: 'folder',
        children: [
          {
            kind: 'leaf',
            id: 'music/classical/beethoven/symphony-9',
            label: '交響曲第9番 ニ短調',
            href: '/notes/music/classical/beethoven/symphony-9',
            icon: 'file-text',
          },
          {
            kind: 'leaf',
            id: 'music/classical/tchaikovsky/the-nutcracker',
            label: 'くるみ割り人形',
            href: '/notes/music/classical/tchaikovsky/the-nutcracker',
            icon: 'file-text',
          },
        ],
      },
    ],
  },
];

const sampleItemsJson = JSON.stringify(sampleItems);

const renderSidebar = ({
  id,
  selectedId,
  heading = 'ナビゲーション',
  fixedBreakpoint,
}: {
  id: string;
  selectedId: string;
  heading?: string;
  fixedBreakpoint?: number;
}) => html`
  <div style="min-height: 420px;">
    <layout-sidebar
      id="${id}"
      .itemsJson=${sampleItemsJson}
      selected-id="${selectedId}"
      heading="${heading}"
      ${fixedBreakpoint === undefined ? '' : html`fixed-breakpoint="${String(fixedBreakpoint)}"`}
    ></layout-sidebar>
  </div>
`;

const meta: Meta<LayoutSidebar> = {
  title: 'Layout/Layout Sidebar',
  component: 'layout-sidebar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
layout-sidebar の docs / 手動確認用 story です。

このファイルは **Storybook 上で contract を判定しません**。  
expandedIds の永続化と overlay での selection collapse は
\`test/browser/layout-sidebar.browser.test.ts\` を正本とし、  
保存キーや state merge の純粋ロジックは
\`test/node/layout-sidebar-tree-state.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<LayoutSidebar>;

export const Default: Story = {
  render: () =>
    renderSidebar({
      id: 'layout-sidebar-default',
      selectedId: 'music/classical/beethoven/symphony-9',
    }),
};

export const PersistedExpandedIdsManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- branch 展開後に見た目が保たれること
- 再描画してもナビゲーションの骨格が崩れないこと

expandedIds の保存そのものの合否は \`test/browser/layout-sidebar.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
  render: () =>
    renderSidebar({
      id: 'layout-sidebar-persist',
      selectedId: 'music/classical/beethoven/symphony-9',
      heading: 'ナビゲーション',
    }),
};

export const OverlaySelectionManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- 狭い画面相当の overlay で表示できること
- 選択後に本文優先へ戻る設計であることを docs 上で説明できること

overlay での collapse 合否は \`test/browser/layout-sidebar.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
  render: () =>
    renderSidebar({
      id: 'layout-sidebar-overlay',
      selectedId: 'music/classical/beethoven/symphony-9',
      fixedBreakpoint: 99999,
    }),
};
