import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sidebar';
import type { UiSidebar } from './sidebar';
import type { TreeNode } from '../file-tree/file-tree';

const createLeaf = (id: string, label: string, href: string): TreeNode => ({
  kind: 'leaf',
  id,
  label,
  href,
  icon: 'file-text',
});

const sampleItems: readonly TreeNode[] = [
  {
    kind: 'branch',
    id: 'notes',
    label: 'Notes',
    icon: 'folder',
    children: [
      createLeaf('notes/reading', '読書メモ.md', '/notes/reading'),
      createLeaf('notes/ideas', 'アイデア.md', '/notes/ideas'),
    ],
  },
  {
    kind: 'branch',
    id: 'daily',
    label: 'Daily',
    icon: 'folder',
    children: [createLeaf('daily/2026-03-24', '2026-03-24.md', '/daily/2026-03-24')],
  },
];

const cloneTree = (nodes: readonly TreeNode[]): TreeNode[] =>
  nodes.map((node) =>
    node.kind === 'branch'
      ? {
          ...node,
          children: cloneTree(node.children),
        }
      : { ...node },
  );

const meta: Meta<UiSidebar> = {
  title: 'Components/Sidebar',
  component: 'ui-sidebar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
sidebar は file-tree と sidebar-shell を束ねる host です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
state / mode / fixedBreakpoint の shell 同期、variant の file-tree 伝播、
ui-tree-* から ui-sidebar-* への event bridge は
\`test/browser/sidebar.browser.test.ts\` を正本として検査します。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiSidebar>;

export const FixedExpandedDefault: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story:
          'fixed + expanded の代表表示用 smoke story です。state / mode / shell 同期の合否は test/browser/sidebar.browser.test.ts を正本とします。',
      },
    },
  },
  render: () => html`
    <div
      style="display: grid; grid-template-columns: var(--sidebar-width, 240px) 1fr; min-height: 420px;"
    >
      <ui-sidebar
        id="sidebar-fixed-expanded"
        data-state="expanded"
        mode="fixed"
        heading="知識ベース"
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['notes'])}
        selected-id="notes/reading"
      ></ui-sidebar>
      <main style="padding: 1.5rem;">本文エリア</main>
    </div>
  `,
};

export const OverlayExpandedCard: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'overlay + card variant の見え方を手で確認するための manual-only story です。variant の file-tree 伝播と state 同期の合否は `test/browser/sidebar.browser.test.ts` を正本とします。',
      },
    },
  },
  render: () => html`
    <div style="min-height: 420px; position: relative;">
      <ui-sidebar
        id="sidebar-overlay-expanded"
        data-state="expanded"
        mode="overlay"
        variant="card"
        heading="移動"
        .items=${cloneTree(sampleItems)}
        .expandedIds=${new Set(['notes'])}
        selected-id="notes/reading"
      ></ui-sidebar>
    </div>
  `,
};

export const StateReflectionManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
\`ui-sidebar\` の \`data-state\` / \`state\` が shell と整合して見えることを手で確認するための story です。  
合否判定は Storybook ではなく browser test 側で行います。
        `,
      },
    },
  },
  render: () => html`
    <ui-sidebar
      data-state="expanded"
      mode="fixed"
      heading="状態反映"
      .items=${cloneTree(sampleItems)}
      .expandedIds=${new Set(['notes'])}
      selected-id="notes/reading"
    ></ui-sidebar>
  `,
};

export const ShellSyncManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
overlay モードでの shell 同期を観察するための story です。  
\`collapse()\` と state-change の合否は \`test/browser/sidebar.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
  render: () => html`
    <ui-sidebar
      data-state="expanded"
      mode="overlay"
      heading="shell 同期"
      .items=${cloneTree(sampleItems)}
      .expandedIds=${new Set(['notes'])}
      selected-id="notes/reading"
    ></ui-sidebar>
  `,
};

export const EventBridgeManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- ui-sidebar-select / ui-sidebar-toggle / ui-sidebar-active-change の利用例
- host 側でイベントを購読したときの UI 応答の見え方

event bridge の合否は Storybook ではなく
\`test/browser/sidebar.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
  render: () => {
    const updateLog = (label: string, detail: object): void => {
      const log = document.querySelector<HTMLElement>('#sidebar-event-log');
      if (log) {
        log.textContent = `${label}: ${JSON.stringify(detail)}`;
      }
    };

    return html`
      <div style="display: grid; gap: 12px;">
        <div
          id="sidebar-event-log"
          style="padding: 12px; border: 1px solid var(--border-default); border-radius: 6px;"
        >
          イベント待機中
        </div>
        <ui-sidebar
          .items=${cloneTree(sampleItems)}
          .expandedIds=${new Set(['notes'])}
          selected-id="notes/reading"
          @ui-sidebar-select=${(event: CustomEvent<{ id: string }>) => {
            updateLog('select', event.detail);
          }}
          @ui-sidebar-toggle=${(event: CustomEvent<{ id: string; expanded: boolean }>) => {
            updateLog('toggle', event.detail);
          }}
          @ui-sidebar-active-change=${(event: CustomEvent<{ id: string }>) => {
            updateLog('active-change', event.detail);
          }}
        ></ui-sidebar>
      </div>
    `;
  },
};