import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import './layout-sidebar';
import type { LayoutSidebar } from './layout-sidebar';

const sampleNavMarkup = `
<nav data-sidebar-nav aria-label="ノートナビゲーション" data-topology-revision="story:layout-sidebar">
  <ul>
    <li data-node-id="music" data-node-kind="branch" data-node-depth="0">
      <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="true" aria-controls="story-sidebar-music">
        <span data-sidebar-nav-label>Music</span>
        <span data-sidebar-nav-disclosure aria-hidden="true"></span>
      </button>
      <ul id="story-sidebar-music">
        <li data-node-id="music/classical" data-node-kind="branch" data-node-depth="1">
          <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="true" aria-controls="story-sidebar-classical">
            <span data-sidebar-nav-label>Classical</span>
            <span data-sidebar-nav-disclosure aria-hidden="true"></span>
          </button>
          <ul id="story-sidebar-classical">
            <li data-node-id="music/classical/beethoven/symphony-9" data-node-kind="leaf" data-node-depth="2">
              <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/music/classical/beethoven/symphony-9" data-link-kind="internal-document" data-link-surface="navigation" aria-current="page"><span data-sidebar-nav-label>交響曲第9番 ニ短調</span></a>
            </li>
            <li data-node-id="music/classical/tchaikovsky/the-nutcracker" data-node-kind="leaf" data-node-depth="2">
              <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/music/classical/tchaikovsky/the-nutcracker" data-link-kind="internal-document" data-link-surface="navigation"><span data-sidebar-nav-label>くるみ割り人形</span></a>
            </li>
          </ul>
        </li>
      </ul>
    </li>
  </ul>
</nav>
`.trim();

const renderSidebar = ({
  id,
  selectedId,
  heading,
  fixedBreakpoint,
}: {
  id: string;
  selectedId: string;
  heading?: string | null;
  fixedBreakpoint?: number;
}) => html`
  <div style="min-height: 420px;">
    <layout-sidebar
      id="${id}"
      selected-id="${selectedId}"
      heading=${ifDefined(heading ?? undefined)}
      ${fixedBreakpoint === undefined ? '' : html`fixed-breakpoint="${String(fixedBreakpoint)}"`}
      >${unsafeHTML(sampleNavMarkup)}</layout-sidebar
    >
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

note sidebar は visible heading を既定で持ちません。必要な場合だけ \`heading\` を明示します。

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
    }),
};

export const HeadingOptInManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- \`heading\` を明示した場合のみ補助ヘッダーが描画されること
- heading を省略した既定状態と見え方の責務差分が明確であること
        `,
      },
    },
  },
  render: () =>
    renderSidebar({
      id: 'layout-sidebar-heading-opt-in',
      selectedId: 'music/classical/beethoven/symphony-9',
      heading: '現在地',
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
