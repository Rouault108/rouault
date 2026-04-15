import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './tree-item';
import type { TreeItem } from './tree-item';

const meta: Meta<TreeItem> = {
  title: 'Components/Tree Item',
  component: 'ui-tree-item',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
階層化された情報を探索するためのナビゲーション・コンポーネントです。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
role / aria-level / aria-selected / aria-expanded、branch の click toggle、leaf の keyboard activate、
ArrowRight / ArrowLeft の委譲、長いラベル時の tooltip、icon なし時の縮退、focus() 委譲は
\`test/browser/tree-item.browser.test.ts\` を正本とします。

今回の実装では、行背景は **.item 全体** ではなく **.surface** に描かれ、
ancestor rails と selected / hover surface を分離しています。
そのため、ネスト構造と背景面の関係は story 上でも確認しやすいように比較 story を追加しています。

なお、\`ui-tree-item\` は **単独で完結する tree widget ではなく \`ui-file-tree\` の内部要素** です。  
Up / Down / Home / End / Escape / type-ahead は \`ui-file-tree\` 側の browser contract を正本とします。
        `,
      },
    },
  },
  argTypes: {
    expanded: {
      control: 'boolean',
      description: '子要素の展開状態',
    },
    selected: {
      control: 'boolean',
      description: '現在選択されているか',
    },
    label: {
      control: 'text',
      description: '表示ラベル',
    },
    icon: {
      control: 'text',
      description: 'アイコン名',
    },
    density: {
      control: 'select',
      options: ['normal', 'compact'],
      description: '行の密度',
    },
  },
};

export default meta;
type Story = StoryObj<TreeItem>;

export const DefaultLeaf: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story:
          'leaf の代表表示用 smoke story です。role / aria / tabindex の合否は browser test を正本とします。',
      },
    },
  },
  render: () => html`
    <ui-tree-item label="ファイル.txt" icon="file-text" density="normal"></ui-tree-item>
  `,
};

export const BranchExpanded: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'branch + expanded の代表表示用 smoke story です。expanded / children visibility の合否は browser test を正本とします。',
      },
    },
  },
  render: () => html`
    <ui-tree-item label="src" icon="folder" expanded>
      <ui-tree-item slot="children" label="components" icon="folder"></ui-tree-item>
      <ui-tree-item slot="children" label="utils" icon="folder"></ui-tree-item>
      <ui-tree-item slot="children" label="index.ts" icon="file-code"></ui-tree-item>
    </ui-tree-item>
  `,
};

export const DensityReference: Story = {
  render: () => html`
    <style>
      .density-showcase {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .density-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .density-label {
        font-weight: var(--font-medium, 500);
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, #666);
      }
    </style>

    <div class="density-showcase">
      <div class="density-group">
        <span class="density-label">Normal</span>
        <ui-tree-item label="ドキュメント" icon="file-text" density="normal"></ui-tree-item>
      </div>

      <div class="density-group">
        <span class="density-label">Compact</span>
        <ui-tree-item label="ドキュメント" icon="file-text" density="compact"></ui-tree-item>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'density の視覚比較用 docs story です。高さや hit area の最終合否は browser / CSS contract を正本とします。',
      },
    },
  },
};

export const SelectedReference: Story = {
  render: () => html` <ui-tree-item label="README.md" icon="file-text" selected></ui-tree-item> `,
  parameters: {
    docs: {
      description: {
        story:
          'selected 状態の見本です。aria-selected と active surface の意味論的合否は browser test を正本とします。',
      },
    },
  },
};

export const DeepNestingReference: Story = {
  render: () => html`
    <ui-tree-item label="プロジェクト" icon="folder" expanded>
      <ui-tree-item slot="children" label="src" icon="folder" expanded>
        <ui-tree-item slot="children" label="components" icon="folder" expanded>
          <ui-tree-item slot="children" label="button.ts" icon="file-code"></ui-tree-item>
          <ui-tree-item slot="children" label="input.ts" icon="file-code"></ui-tree-item>
        </ui-tree-item>

        <ui-tree-item slot="children" label="utils" icon="folder">
          <ui-tree-item slot="children" label="helpers.ts" icon="file-code"></ui-tree-item>
        </ui-tree-item>
      </ui-tree-item>

      <ui-tree-item slot="children" label="README.md" icon="file-text"></ui-tree-item>
    </ui-tree-item>
  `,
  parameters: {
    docs: {
      description: {
        story:
          '深いネスト構造の docs story です。aria-level の算出契約は browser test を正本とします。',
      },
    },
  },
};

export const LinkLeafReference: Story = {
  render: () => html`
    <ui-tree-item
      label="楽曲分析: くるみ割り人形"
      icon="file-text"
      href="/notes/music/classical/tchaikovsky/the-nutcracker"
    ></ui-tree-item>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'href を持つ leaf の見本です。Enter/Space による選択と anchor activation の合否は browser test を正本とします。',
      },
    },
  },
};

export const SurfaceStructureReference: Story = {
  render: () => html`
    <style>
      .surface-structure-showcase {
        max-width: 360px;
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        padding: var(--space-2, 8px);
      }
    </style>

    <div class="surface-structure-showcase">
      <ui-tree-item label="Collection" icon="folder" expanded>
        <ui-tree-item slot="children" label="Program" icon="folder" expanded>
          <ui-tree-item
            slot="children"
            label="JavaScriptの配列"
            icon="file-text"
            href="/notes/javascript/array"
            selected
          ></ui-tree-item>
          <ui-tree-item
            slot="children"
            label="TypeScriptの型"
            icon="file-text"
            href="/notes/typescript/types"
          ></ui-tree-item>
        </ui-tree-item>

        <ui-tree-item
          slot="children"
          label="ちくま学芸文庫蔵書"
          icon="file-text"
          href="/notes/library/chikuma-gakugei"
        ></ui-tree-item>
      </ui-tree-item>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'ancestor rails と surface の分離を視覚確認する story です。ネストされた selected leaf でも、背景が祖先レールまで塗りつぶされないことを確認します。',
      },
    },
  },
};

export const SelectedSurfaceComparisonReference: Story = {
  render: () => html`
    <style>
      .comparison {
        display: grid;
        gap: 1rem;
        max-width: 420px;
      }

      .comparison-group {
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        padding: var(--space-2, 8px);
      }

      .comparison-title {
        margin-bottom: 0.5rem;
        font-weight: var(--font-medium, 500);
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, #666);
      }
    </style>

    <div class="comparison">
      <div class="comparison-group">
        <div class="comparison-title">Top-level selected leaf</div>
        <ui-tree-item
          label="ちくま学芸文庫蔵書"
          icon="file-text"
          href="/notes/library/chikuma-gakugei"
          selected
        ></ui-tree-item>
      </div>

      <div class="comparison-group">
        <div class="comparison-title">Nested selected leaf</div>
        <ui-tree-item label="Collection" icon="folder" expanded>
          <ui-tree-item slot="children" label="Program" icon="folder" expanded>
            <ui-tree-item
              slot="children"
              label="JavaScriptの配列"
              icon="file-text"
              href="/notes/javascript/array"
              selected
            ></ui-tree-item>
          </ui-tree-item>
        </ui-tree-item>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'top-level selected leaf と nested selected leaf の背景面比較用 story です。背景が current slot から始まり、ancestor rail 領域とは分離されていることを確認します。',
      },
    },
  },
};

export const LongLabelTooltipManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <style>
      .container {
        max-width: 300px;
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        padding: var(--space-2, 8px);
      }
    </style>

    <div class="container">
      <ui-tree-item
        label="これは非常に長いファイル名でコンテナの幅を超える可能性があります.tsx"
        icon="file-code"
      ></ui-tree-item>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- 長いラベルの省略表示
- truncate 時のみ tooltip が有効になること
- hover / focus 時の tooltip surface

tooltip 有効化の合否は Storybook ではなく \`test/browser/tree-item.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const KeyboardAndClickManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <style>
      .info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1rem;
      }
    </style>

    <div class="info">
      Enter / Space / ArrowRight / ArrowLeft / click の操作感を手動確認するための story です。
      合否は browser test を正本とします。
    </div>

    <ui-tree-item label="components" icon="folder">
      <ui-tree-item slot="children" label="button.ts" icon="file-code"></ui-tree-item>
      <ui-tree-item slot="children" label="input.ts" icon="file-code"></ui-tree-item>
    </ui-tree-item>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'branch click toggle と keyboard interaction の手動確認用 story です。合否は test/browser/tree-item.browser.test.ts を正本とします。',
      },
    },
  },
};

export const NoIconAndCustomIconReference: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <ui-tree-item label="テキストのみのアイテム"></ui-tree-item>

      <ui-tree-item label="カスタムアイコン">
        <svg
          slot="icon"
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
          style="display: block; color: gold;"
        >
          <circle cx="6" cy="6" r="5" fill="currentColor"></circle>
        </svg>
      </ui-tree-item>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'icon なしと custom icon slot の見本です。content-icon の hidden 縮退合否は browser test を正本とします。',
      },
    },
  },
};
