import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './file-tree';
import type { FileTree, TreeNode } from './file-tree';
import type { IconName } from '../../../../shared/icons/icon-paths.js';

const createLeaf = (
  id: string,
  label: string,
  href: string,
  icon: IconName = 'file-text',
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
  icon: IconName = 'folder',
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
  createBranch('daily', 'Daily', [
    createLeaf('daily/2026-03-24', '2026-03-24.md', '/daily/2026-03-24'),
  ]),
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

この story ファイルは **docs / smoke / 手動確認** に限定します。  
controlled / uncontrolled の選択・展開、request / commit event、keyboard navigation、
type-ahead、Escape による外部フォーカス復帰、loading retain/replace、printable の挙動は
\`test/browser/file-tree.browser.test.ts\` を正本とします。  
motion / forced-colors / print の CSS 構造契約は
\`test/ssr/css-structure-contracts.test.ts\` を正本とします。
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
  tags: ['smoke'],
  args: {
    variant: 'default',
    density: 'normal',
    loading: false,
    loadingStrategy: 'retain',
  },
  parameters: {
    docs: {
      description: {
        story:
          'default variant の代表表示用 smoke story です。tree root と item の基本密度だけを残します。',
      },
    },
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
};

export const ControlledCardSelection: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'controlled selection / expansion と card variant の見え方を手で確認するための manual-only story です。DOM 反映の合否は `test/browser/file-tree.browser.test.ts` を正本とします。',
      },
    },
  },
  render: () => html`
    <ui-file-tree
      .items=${cloneTree(sampleTree)}
      .expandedIds=${new Set(['notes', 'notes/design'])}
      selected-id="notes/design/file-tree"
      variant="card"
      density="compact"
    ></ui-file-tree>
  `,
};

export const LoadingStrategiesReference: Story = {
  render: () => html`
    <div style="display: grid; gap: 1.5rem; max-width: 420px;">
      <section>
        <h3 style="margin: 0 0 0.5rem; font-size: 13px;">retain</h3>
        <ui-file-tree
          .items=${cloneTree(sampleTree)}
          .defaultExpandedIds=${new Set(['notes'])}
          selected-id="notes/index"
          loading
          loading-strategy="retain"
        ></ui-file-tree>
      </section>

      <section>
        <h3 style="margin: 0 0 0.5rem; font-size: 13px;">replace</h3>
        <ui-file-tree
          .items=${cloneTree(sampleTree)}
          loading
          loading-strategy="replace"
          variant="card"
        ></ui-file-tree>
      </section>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'retain / replace の視覚差を比較する docs story です。aria-busy と skeleton 置換の合否は browser test を正本とします。',
      },
    },
  },
};

export const EmptyStateReference: Story = {
  render: () => html` <ui-file-tree .items=${[]}></ui-file-tree> `,
  parameters: {
    docs: {
      description: {
        story:
          'empty state の docs story です。文言完全一致ではなく empty surface の存在のみを前提にします。',
      },
    },
  },
};

export const KeyboardNavigationManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <style>
      .manual-shell {
        display: grid;
        gap: 1rem;
        max-width: 480px;
      }

      .manual-note {
        padding: 0.75rem;
        border: 1px solid var(--border-default, #ddd);
        border-radius: 8px;
        background: var(--bg-surface-2, #f7f7f7);
        font-size: 13px;
      }
    </style>

    <div class="manual-shell">
      <button type="button">外部フォーカス復帰先</button>

      <div class="manual-note">
        Home / End / ArrowUp / ArrowDown / type-ahead / Escape を手動確認するための story です。
      </div>

      <ui-file-tree
        .items=${cloneTree(sampleTree)}
        .defaultExpandedIds=${new Set(['notes', 'notes/design'])}
        selected-id="notes/design/file-tree"
      ></ui-file-tree>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- roving tabindex による移動感
- type-ahead の体感
- Escape で外部要素へ戻ること
- selected / active の視覚差

合否は Storybook ではなく \`test/browser/file-tree.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const PrintableManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-file-tree
      .items=${cloneTree(sampleTree)}
      .defaultExpandedIds=${new Set(['notes'])}
      selected-id="notes/design/file-tree"
      variant="card"
      printable
    ></ui-file-tree>
  `,
  parameters: {
    docs: {
      description: {
        story: `
印刷確認用 story です。

確認内容:
- printable=true の surface
- print preview 時の見え方
- card variant の印刷時縮退

beforeprint / afterprint による全 branch 展開の合否は Storybook ではなく
\`test/browser/file-tree.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};
