import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './file-tree';
import type { FileTree, TreeNode } from './file-tree';

const createLeaf = (
  id: string,
  label: string,
  href: string,
  icon = 'file-text',
): TreeNode => ({
  kind: 'leaf',
  id,
  label,
  href,
  icon,
});

const createBranch = (
  id: string,
  label: string,
  children: readonly TreeNode[],
  icon = 'folder',
): TreeNode => ({
  kind: 'branch',
  id,
  label,
  children,
  icon,
});

const sampleTree: readonly TreeNode[] = [
  createBranch('notes', 'Notes', [
    createLeaf('notes/index', 'Index.md', '/notes/index'),
    createBranch('notes/design', 'Design', [
      createLeaf('notes/design/file-tree', 'File Tree.md', '/notes/design/file-tree'),
      createLeaf('notes/design/tree-item', 'Tree Item.md', '/notes/design/tree-item'),
    ]),
  ]),
  createBranch('daily', 'Daily', [createLeaf('daily/2026-03-24', '2026-03-24.md', '/daily/2026-03-24')]),
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

const meta: Meta<FileTree> = {
  title: 'Components/FileTree',
  component: 'ui-file-tree',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
仕様書準拠の \`ui-file-tree\` です。

- 構造データは \`TreeNode\` の discriminated union
- 選択は \`selectedId\`、展開は \`expandedIds\` / \`defaultExpandedIds\`
- root 公開イベントは request / commit の二段階
- ローディングは \`retain\` / \`replace\` で制御
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'card'],
    },
    density: {
      control: 'select',
      options: ['normal', 'compact'],
    },
    loadingStrategy: {
      control: 'select',
      options: ['retain', 'replace'],
    },
  },
};

export default meta;
type Story = StoryObj<FileTree>;

export const Default: Story = {
  args: {
    variant: 'default',
    density: 'normal',
    loading: false,
    loadingStrategy: 'retain',
  },
  render: (args) => html`
    <ui-file-tree
      .items=${cloneTree(sampleTree)}
      .defaultExpandedIds=${new Set(['notes'])}
      selected-id="notes/index"
      variant=${args.variant}
      density=${args.density}
      ?loading=${args.loading}
      loading-strategy=${args.loadingStrategy}
    ></ui-file-tree>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector<FileTree>('ui-file-tree');
    if (!fileTree) {
      throw new Error('ui-file-tree が見つかりません');
    }

    await fileTree.updateComplete;

    if (fileTree.getAttribute('role') !== 'tree') {
      throw new Error('role="tree" が必要です');
    }

    if (fileTree.selectedId !== 'notes/index') {
      throw new Error(`selectedId が反映されていません: ${String(fileTree.selectedId)}`);
    }

    const selectedItem = fileTree.shadowRoot?.querySelector('ui-tree-item[selected]');
    if (!selectedItem) {
      throw new Error('selectedId に対応する行が selected 表示になる必要があります');
    }
  },
};

export const ControlledSelectionAndExpansion: Story = {
  render: () => html`
    <ui-file-tree
      .items=${cloneTree(sampleTree)}
      .expandedIds=${new Set(['notes', 'notes/design'])}
      selected-id="notes/design/file-tree"
      variant="card"
    ></ui-file-tree>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector<FileTree>('ui-file-tree');
    if (!fileTree) {
      throw new Error('ui-file-tree が見つかりません');
    }

    await fileTree.updateComplete;

    const selectedItem = fileTree.shadowRoot?.querySelector<HTMLElement>(
      'ui-tree-item[data-id="notes/design/file-tree"]',
    );
    if (!selectedItem?.hasAttribute('selected')) {
      throw new Error('controlled selectedId が行へ伝播していません');
    }

    const expandedBranch = fileTree.shadowRoot?.querySelector<HTMLElement>(
      'ui-tree-item[data-id="notes/design"]',
    );
    if (!expandedBranch?.hasAttribute('expanded')) {
      throw new Error('controlled expandedIds が branch へ伝播していません');
    }
  },
};

export const LoadingRetain: Story = {
  render: () => html`
    <ui-file-tree
      .items=${cloneTree(sampleTree)}
      .defaultExpandedIds=${new Set(['notes'])}
      selected-id="notes/index"
      loading
      loading-strategy="retain"
    ></ui-file-tree>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector<FileTree>('ui-file-tree');
    if (!fileTree) {
      throw new Error('ui-file-tree が見つかりません');
    }

    await fileTree.updateComplete;

    if (fileTree.getAttribute('aria-busy') !== 'true') {
      throw new Error('retain loading では aria-busy="true" が必要です');
    }

    if (fileTree.shadowRoot?.querySelector('.skeleton')) {
      throw new Error('retain loading では skeleton に置き換えてはいけません');
    }
  },
};

export const LoadingReplace: Story = {
  render: () => html`
    <ui-file-tree
      .items=${cloneTree(sampleTree)}
      loading
      loading-strategy="replace"
      variant="card"
    ></ui-file-tree>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector<FileTree>('ui-file-tree');
    if (!fileTree) {
      throw new Error('ui-file-tree が見つかりません');
    }

    await fileTree.updateComplete;

    if (!fileTree.shadowRoot?.querySelector('.skeleton')) {
      throw new Error('replace loading では skeleton が必要です');
    }
  },
};

export const EventContract: Story = {
  render: () => {
    const logEvent = (label: string, detail: object): void => {
      const target = document.querySelector<HTMLElement>('#file-tree-event-log');
      if (target) {
        target.textContent = `${label}: ${JSON.stringify(detail)}`;
      }
    };

    return html`
      <div style="display: grid; gap: 12px;">
        <div
          id="file-tree-event-log"
          style="padding: 12px; border: 1px solid var(--border-default); border-radius: 6px; font-family: var(--font-mono, monospace);"
        >
          イベント待機中
        </div>
        <ui-file-tree
          .items=${cloneTree(sampleTree)}
          .defaultExpandedIds=${new Set(['notes'])}
          @ui-tree-request-select=${(event: CustomEvent<{ id: string }>) =>
            { logEvent('request-select', event.detail); }}
          @ui-tree-select=${(event: CustomEvent<{ id: string }>) =>
            { logEvent('select', event.detail); }}
          @ui-tree-request-toggle=${(event: CustomEvent<{ id: string; expanded: boolean }>) =>
            { logEvent('request-toggle', event.detail); }}
          @ui-tree-toggle=${(event: CustomEvent<{ id: string; expanded: boolean }>) =>
            { logEvent('toggle', event.detail); }}
          @ui-tree-active-change=${(event: CustomEvent<{ id: string }>) =>
            { logEvent('active-change', event.detail); }}
        ></ui-file-tree>
      </div>
    `;
  },
};

export const KeyboardNavigation: Story = {
  render: () => html`
    <div>
      <button id="tree-trigger" type="button">Tree Trigger</button>
      <div
        style="max-height: 280px; overflow: auto; border: 1px solid var(--border-default); margin-top: 8px;"
      >
        <ui-file-tree
          .items=${cloneTree(sampleTree)}
          .defaultExpandedIds=${new Set(['notes', 'notes/design'])}
          selected-id="notes/design/file-tree"
        ></ui-file-tree>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector<FileTree>('ui-file-tree');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#tree-trigger');
    if (!fileTree || !trigger) {
      throw new Error('必要な要素が見つかりません');
    }

    await fileTree.updateComplete;
    trigger.focus();
    fileTree.focusSelected();
    await fileTree.updateComplete;

    const container = fileTree.shadowRoot?.querySelector<HTMLElement>('.container');
    if (!container) {
      throw new Error('container が見つかりません');
    }

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }),
    );
    await fileTree.updateComplete;
    const activeIdAfterArrowDown = fileTree.activeId;
    if (activeIdAfterArrowDown !== 'notes/design/tree-item') {
      throw new Error(`ArrowDown 後の activeId が不正です: ${String(activeIdAfterArrowDown)}`);
    }

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true }),
    );
    await fileTree.updateComplete;
    const activeIdAfterHome = fileTree.activeId;
    if ((activeIdAfterHome ?? '') !== 'notes') {
      throw new Error(`Home 後の activeId が不正です: ${String(activeIdAfterHome)}`);
    }

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    await Promise.resolve();
    if (document.activeElement !== trigger) {
      throw new Error('Escape で直前の外部フォーカスへ戻る必要があります');
    }
  },
};

export const PrintableCard: Story = {
  render: () => html`
    <ui-file-tree
      .items=${cloneTree(sampleTree)}
      .defaultExpandedIds=${new Set(['notes'])}
      selected-id="notes/design/file-tree"
      variant="card"
      printable
    ></ui-file-tree>
  `,
};
