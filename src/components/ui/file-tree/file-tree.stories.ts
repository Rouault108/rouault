import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './file-tree';
import type { FileTree, TreeNode } from './file-tree';

/**
 * ## ファイルツリー (File Tree)
 *
 * 複数のツリーアイテムを包含し、ディレクトリ構造を管理するルートコンテナです。
 * フォーカス管理、キーボードナビゲーション、データフローの統合管理を担います。
 *
 * ### デザイン哲学
 *
 * - **UI Transparency**: デフォルトでは枠線や背景を持たず、インデントとタイポグラフィのみで構造を示唆
 * - **Robustness**: データのロード状態や空の状態を適切にハンドリング
 * - **Flow State**: 不必要なローディング表示（フリッカー）を回避し、思考の連続性を保つ
 *
 * ### キーボードナビゲーション
 *
 * - `↑` / `↓`: 前後の可視項目へフォーカス移動
 * - `→` / `←`: 展開/収縮、または親子間の移動（tree-item で処理）
 * - `Home` / `End`: 最初/最後の項目へ移動
 * - `Enter` / `Space`: 項目を選択（tree-item で処理）
 * - `Esc`: ツリー全体からフォーカスを外す
 * - Type-ahead: 文字入力で該当項目へフォーカス移動
 *
 * ### 使用上の注意
 *
 * - **Loading State**: 500ms未満で完了する場合、スケルトンを表示しません（視覚的フリッカー回避）
 * - **Auto Expansion**: `selected: true` なノードまでのパスを自動展開します
 * - **Auto Scroll**: 初期化時に `selected` 項目を画面内にスクロールします
 */
const meta: Meta<FileTree> = {
  title: 'Components/FileTree',
  component: 'ui-file-tree',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
ファイルツリーコンポーネントは、ディレクトリ構造を階層的に表示し、ナビゲーションを提供します。

## 使用方法

\\\`\\\`\\\`html
<ui-file-tree .items="\\\${treeData}"></ui-file-tree>
\\\`\\\`\\\`

## TreeNode 型定義

\\\`\\\`\\\`typescript
interface TreeNode {
  id: string;          // 一意の識別子（必須）
  label: string;       // 表示ラベル（必須）
  icon?: string;       // アイコン名（lucide）
  children?: TreeNode[]; // 子ノード
  href?: string;       // リンク先URL
  expanded?: boolean;  // 初期展開状態
  selected?: boolean;  // 選択状態
}
\\\`\\\`\\\`

## バリアント選択

- **default**: 背景なし。サイドバーなどの補助的なナビゲーションに使用
- **card**: 独立したウィジェットとして使用する場合（背景・境界線・シャドウあり）

## 注意事項

- **Loading Threshold**: データ取得が500ms未満で完了する場合、スケルトンを表示しません
- **Auto Expansion**: selected: true なノードまでのパスを自動展開します
- **Roving Tabindex**: Tab キーでツリーに入る際、選択項目（または最初の項目）に直接フォーカスします
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'card'],
      description: 'バリアント（default: 背景なし、card: 独立ウィジェット）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'default' },
      },
    },
    density: {
      control: 'select',
      options: ['normal', 'compact'],
      description: '全アイテムの高さ密度',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'normal' },
      },
    },
    loading: {
      control: 'boolean',
      description: 'データ取得中の状態フラグ',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<FileTree>;

// ──────────────────────────────────────────────
// サンプルデータ
// ──────────────────────────────────────────────

const simpleTreeData: TreeNode[] = [
  {
    id: '1',
    label: 'src',
    icon: 'lucide:folder',
    expanded: true,
    children: [
      { id: '1-1', label: 'main.ts', icon: 'lucide:file-code' },
      { id: '1-2', label: 'utils.ts', icon: 'lucide:file-code' },
    ],
  },
  {
    id: '2',
    label: 'public',
    icon: 'lucide:folder',
    children: [{ id: '2-1', label: 'index.html', icon: 'lucide:file-text' }],
  },
  { id: '3', label: 'package.json', icon: 'lucide:file-json' },
  { id: '4', label: 'README.md', icon: 'lucide:file-text' },
];

const deepNestedTreeData: TreeNode[] = [
  {
    id: 'root',
    label: 'project',
    icon: 'lucide:folder',
    expanded: true,
    children: [
      {
        id: 'src',
        label: 'src',
        icon: 'lucide:folder',
        expanded: true,
        children: [
          {
            id: 'components',
            label: 'components',
            icon: 'lucide:folder',
            expanded: true,
            children: [
              {
                id: 'ui',
                label: 'ui',
                icon: 'lucide:folder',
                expanded: true,
                children: [
                  {
                    id: 'button',
                    label: 'button',
                    icon: 'lucide:folder',
                    children: [
                      { id: 'button-ts', label: 'button.ts', icon: 'lucide:file-code' },
                      {
                        id: 'button-stories',
                        label: 'button.stories.ts',
                        icon: 'lucide:file-code',
                      },
                    ],
                  },
                  {
                    id: 'input',
                    label: 'input',
                    icon: 'lucide:folder',
                    children: [
                      { id: 'input-ts', label: 'input.ts', icon: 'lucide:file-code' },
                      {
                        id: 'input-stories',
                        label: 'input.stories.ts',
                        icon: 'lucide:file-code',
                        selected: true,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          { id: 'main', label: 'main.ts', icon: 'lucide:file-code' },
        ],
      },
      { id: 'readme', label: 'README.md', icon: 'lucide:file-text' },
    ],
  },
];

const manyItemsTreeData: TreeNode[] = Array.from({ length: 50 }, (_, i) => {
  const index = i;
  const baseNode: TreeNode = {
    id: `item-${String(index)}`,
    label: `Item ${String(index + 1)}`,
    icon: index % 3 === 0 ? 'lucide:folder' : 'lucide:file',
  };

  if (index % 3 === 0) {
    baseNode.children = Array.from({ length: 5 }, (_, j) => {
      const childIndex = j;
      return {
        id: `item-${String(index)}-${String(childIndex)}`,
        label: `Subitem ${String(index + 1)}-${String(childIndex + 1)}`,
        icon: 'lucide:file',
      };
    });
  }

  return baseNode;
});

const cloneTree = (nodes: TreeNode[]): TreeNode[] =>
  nodes.map((node) => {
    const cloned: TreeNode = { ...node };
    if (node.children) {
      cloned.children = cloneTree(node.children);
    } else {
      delete cloned.children;
    }
    return cloned;
  });

// ──────────────────────────────────────────────
// ストーリー
// ──────────────────────────────────────────────

/**
 * デフォルトのファイルツリー。
 *
 * 背景なし（transparent）で、サイドバーなどの補助的なナビゲーションに使用します。
 */
export const Default: Story = {
  args: {
    variant: 'default',
    density: 'normal',
    loading: false,
  },
  render: (args) => html`
    <ui-file-tree
      .items="${cloneTree(simpleTreeData)}"
      variant="${args.variant}"
      density="${args.density}"
      ?loading="${args.loading}"
    ></ui-file-tree>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector('ui-file-tree');
    if (!fileTree) {
      throw new Error('FileTree コンポーネントが見つかりません');
    }

    await fileTree.updateComplete;

    // テスト: role="tree" が設定されていること
    if (fileTree.getAttribute('role') !== 'tree') {
      throw new Error(
        `role="tree" を期待していましたが、実際には "${fileTree.getAttribute('role') ?? 'null'}" でした`,
      );
    }

    // テスト: aria-orientation="vertical" が設定されていること
    if (fileTree.getAttribute('aria-orientation') !== 'vertical') {
      throw new Error(
        `aria-orientation="vertical" を期待していましたが、実際には "${fileTree.getAttribute('aria-orientation') ?? 'null'}" でした`,
      );
    }

    // テスト: デフォルトのバリアントが "default" であること
    if (fileTree.variant !== 'default') {
      throw new Error(
        `variant="default" を期待していましたが、実際には "${fileTree.variant}" でした`,
      );
    }
  },
};

/**
 * Cardバリアントのファイルツリー。
 *
 * 背景・境界線・シャドウを持ち、独立したウィジェットとして使用します。
 */
export const CardVariant: Story = {
  args: {
    variant: 'card',
    density: 'normal',
    loading: false,
  },
  render: (args) => html`
    <ui-file-tree
      .items="${cloneTree(simpleTreeData)}"
      variant="${args.variant}"
      density="${args.density}"
      ?loading="${args.loading}"
    ></ui-file-tree>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector('ui-file-tree');
    if (!fileTree) {
      throw new Error('FileTree コンポーネントが見つかりません');
    }

    await fileTree.updateComplete;

    // テスト: variant が "card" であること
    if (fileTree.variant !== 'card') {
      throw new Error(`variant="card" を期待していましたが、実際には "${fileTree.variant}" でした`);
    }

    // テスト: variant 属性が反映されていること
    if (fileTree.getAttribute('variant') !== 'card') {
      throw new Error(
        `variant 属性が "card" であることを期待していましたが、実際には "${fileTree.getAttribute('variant') ?? 'null'}" でした`,
      );
    }
  },
};

/**
 * Compact密度のファイルツリー。
 *
 * 行の高さが24pxに縮小され、より多くの項目を表示できます。
 */
export const CompactDensity: Story = {
  args: {
    variant: 'default',
    density: 'compact',
    loading: false,
  },
  render: (args) => html`
    <ui-file-tree
      .items="${cloneTree(simpleTreeData)}"
      variant="${args.variant}"
      density="${args.density}"
      ?loading="${args.loading}"
    ></ui-file-tree>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector('ui-file-tree');
    if (!fileTree) {
      throw new Error('FileTree コンポーネントが見つかりません');
    }

    await fileTree.updateComplete;

    // テスト: density が "compact" であること
    if (fileTree.density !== 'compact') {
      throw new Error(
        `density="compact" を期待していましたが、実際には "${fileTree.density}" でした`,
      );
    }
  },
};

/**
 * 空の状態（Empty State）。
 *
 * データが存在しない場合、簡略版のエンプティステート（テキストのみ）を表示します。
 */
export const EmptyState: Story = {
  args: {
    variant: 'default',
    density: 'normal',
    loading: false,
  },
  render: (args) => html`
    <ui-file-tree
      .items="${[]}"
      variant="${args.variant}"
      density="${args.density}"
      ?loading="${args.loading}"
    ></ui-file-tree>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector('ui-file-tree');
    if (!fileTree) {
      throw new Error('FileTree コンポーネントが見つかりません');
    }

    await fileTree.updateComplete;

    // テスト: items が空であること
    if (fileTree.items.length !== 0) {
      throw new Error(
        `items が空であることを期待していましたが、実際には長さ ${String(fileTree.items.length)} でした`,
      );
    }

    // テスト: Empty State が表示されていること
    const emptyState = fileTree.shadowRoot?.querySelector('.empty-state');
    if (!emptyState) {
      throw new Error('エンプティステートがレンダリングされている必要があります');
    }

    // テスト: role="status" が設定されていること
    if (emptyState.getAttribute('role') !== 'status') {
      throw new Error(
        `エンプティステートに role="status" が設定されていることを期待していましたが、実際には "${emptyState.getAttribute('role') ?? 'null'}" でした`,
      );
    }
  },
};

/**
 * ローディング状態（Loading State）。
 *
 * **重要**: 500ms未満で完了する場合、スケルトンを表示しません（視覚的フリッカー回避）。
 * このストーリーでは、ローディングが継続している状態を表示しています。
 */
export const LoadingState: Story = {
  args: {
    variant: 'default',
    density: 'normal',
    loading: true,
  },
  render: (args) => html`
    <ui-file-tree
      .items="${[]}"
      variant="${args.variant}"
      density="${args.density}"
      ?loading="${args.loading}"
    ></ui-file-tree>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector('ui-file-tree');
    if (!fileTree) {
      throw new Error('FileTree コンポーネントが見つかりません');
    }

    await fileTree.updateComplete;

    // テスト: loading が true であること
    if (!fileTree.loading) {
      throw new Error('loading が true である必要があります');
    }

    // テスト: 500ms未満では aria-busy / skeleton を表示しないこと
    if (fileTree.getAttribute('aria-busy') !== 'false') {
      throw new Error('しきい値を超える前は aria-busy="false" である必要があります');
    }
    if (fileTree.shadowRoot?.querySelector('.skeleton')) {
      throw new Error('しきい値を超える前はスケルトンを表示してはいけません');
    }

    // 500ms 待機してスケルトンが表示されることを確認
    await new Promise((resolve) => setTimeout(resolve, 600));
    await fileTree.updateComplete;

    if (fileTree.getAttribute('aria-busy') !== 'true') {
      throw new Error('しきい値を超えた後は aria-busy="true" である必要があります');
    }

    const skeleton = fileTree.shadowRoot?.querySelector('.skeleton');
    if (!skeleton) {
      throw new Error('500ms 経過後はスケルトンが表示されている必要があります');
    }
  },
};

/**
 * ローディング完了（500ms未満）。
 *
 * データ取得が500ms未満で完了する場合、スケルトンを表示せず即座にツリーをレンダリングします。
 * これにより視覚的フリッカー（ノイズ）を回避し、Flow State を維持します。
 */
export const LoadingCompletedQuickly: Story = {
  render: () => html`
    <div>
      <p style="margin-bottom: 1rem; color: var(--fg-muted);">
        ローディングは300msで完了します。スケルトンは表示されません。
      </p>
      <ui-file-tree id="quick-load-tree" .items="${[]}" ?loading="${true}"></ui-file-tree>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector<FileTree>('#quick-load-tree');
    if (!fileTree) {
      throw new Error('FileTree コンポーネントが見つかりません');
    }

    await fileTree.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 300));
    fileTree.items = cloneTree(simpleTreeData);
    fileTree.loading = false;
    await fileTree.updateComplete;

    const skeleton = fileTree.shadowRoot?.querySelector('.skeleton');
    if (skeleton) {
      throw new Error(
        '500ms 以内にローディングが終了した場合、スケルトンは表示されない必要があります',
      );
    }
  },
};

/**
 * 深いネスト構造。
 *
 * selected 項目までのパスを自動展開し、画面内にスクロールします。
 */
export const DeepNested: Story = {
  args: {
    variant: 'default',
    density: 'normal',
    loading: false,
  },
  render: (args) => html`
    <div style="max-height: 400px; overflow: auto; border: 1px solid var(--border-default);">
      <ui-file-tree
        .items="${cloneTree(deepNestedTreeData)}"
        variant="${args.variant}"
        density="${args.density}"
        ?loading="${args.loading}"
      ></ui-file-tree>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector('ui-file-tree');
    if (!fileTree) {
      throw new Error('FileTree コンポーネントが見つかりません');
    }

    await fileTree.updateComplete;

    // テスト: selected 項目が存在すること
    const selectedItem = fileTree.shadowRoot?.querySelector('ui-tree-item[selected]');
    if (!selectedItem) {
      throw new Error('選択された項目が存在する必要があります');
    }

    const inputStoriesItem = fileTree.shadowRoot?.querySelector<HTMLElement>(
      'ui-tree-item[data-id="input-stories"]',
    );
    if (!inputStoriesItem) {
      throw new Error('input-stories 項目が存在する必要があります');
    }

    const parentIds = ['root', 'src', 'components', 'ui', 'input'];
    for (const id of parentIds) {
      const node = fileTree.shadowRoot?.querySelector<HTMLElement>(`ui-tree-item[data-id="${id}"]`);
      if (node?.getAttribute('expanded') === null) {
        throw new Error(`親ノード "${id}" が展開されている必要があります`);
      }
    }
  },
};

/**
 * 多数のアイテム。
 *
 * パフォーマンスとスクロール挙動を確認するためのストーリーです。
 */
export const ManyItems: Story = {
  args: {
    variant: 'default',
    density: 'compact',
    loading: false,
  },
  render: (args) => html`
    <div style="max-height: 500px; overflow: auto; border: 1px solid var(--border-default);">
      <ui-file-tree
        .items="${cloneTree(manyItemsTreeData)}"
        variant="${args.variant}"
        density="${args.density}"
        ?loading="${args.loading}"
      ></ui-file-tree>
    </div>
  `,
};

/**
 * バリアント比較。
 *
 * default と card の違いを並べて比較します。
 */
export const VariantComparison: Story = {
  render: () => html`
    <style>
      .comparison-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
      }

      .comparison-item {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .comparison-label {
        font-weight: var(--font-semibold, 600);
        font-size: var(--text-base, 14px);
        color: var(--fg-default);
      }
    </style>

    <div class="comparison-container">
      <div class="comparison-item">
        <span class="comparison-label">Default (背景なし)</span>
        <ui-file-tree .items="${cloneTree(simpleTreeData)}" variant="default"></ui-file-tree>
      </div>

      <div class="comparison-item">
        <span class="comparison-label">Card (独立ウィジェット)</span>
        <ui-file-tree .items="${cloneTree(simpleTreeData)}" variant="card"></ui-file-tree>
      </div>
    </div>
  `,
};

/**
 * 密度比較。
 *
 * normal と compact の違いを並べて比較します。
 */
export const DensityComparison: Story = {
  render: () => html`
    <style>
      .density-comparison {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
      }

      .density-item {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .density-label {
        font-weight: var(--font-semibold, 600);
        font-size: var(--text-base, 14px);
        color: var(--fg-default);
      }
    </style>

    <div class="density-comparison">
      <div class="density-item">
        <span class="density-label">Normal (32px)</span>
        <ui-file-tree
          .items="${cloneTree(simpleTreeData)}"
          density="normal"
          variant="card"
        ></ui-file-tree>
      </div>

      <div class="density-item">
        <span class="density-label">Compact (24px)</span>
        <ui-file-tree
          .items="${cloneTree(simpleTreeData)}"
          density="compact"
          variant="card"
        ></ui-file-tree>
      </div>
    </div>
  `,
};

/**
 * イベントハンドリングのデモ。
 *
 * ui-tree-select, ui-tree-expand, ui-tree-focus-change イベントを確認できます。
 */
export const EventHandling: Story = {
  render: () => {
    const handleSelect = (e: CustomEvent) => {
      const detail = e.detail as { id: string; node: TreeNode };
      const log = document.querySelector('#event-log');
      if (log) {
        log.textContent = `Selected: ${detail.node.label} (id: ${detail.id})`;
      }
    };

    const handleExpand = (e: CustomEvent) => {
      const detail = e.detail as { id: string; expanded: boolean };
      const log = document.querySelector('#event-log');
      if (log) {
        log.textContent = `Expanded: ${detail.id} → ${String(detail.expanded)}`;
      }
    };

    const handleFocusChange = (e: CustomEvent) => {
      const detail = e.detail as { id: string };
      const log = document.querySelector('#event-log');
      if (log) {
        log.textContent = `Focus changed: ${detail.id}`;
      }
    };

    return html`
      <style>
        .event-demo {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .event-log {
          padding: 0.75rem;
          background: var(--bg-surface-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md, 6px);
          font-family: var(--font-mono, monospace);
          font-size: var(--text-sm, 13px);
          color: var(--fg-muted);
        }
      </style>

      <div class="event-demo">
        <div class="event-log" id="event-log">イベントログがここに表示されます</div>
        <ui-file-tree
          .items="${cloneTree(simpleTreeData)}"
          variant="card"
          @ui-tree-select="${handleSelect}"
          @ui-tree-expand="${handleExpand}"
          @ui-tree-focus-change="${handleFocusChange}"
        ></ui-file-tree>
      </div>
    `;
  },
};

/**
 * Forced Colors Mode での表示確認。
 *
 * Windows の高コントラストモードなど、強制カラーモード環境での表示を確認します。
 */
export const ForcedColorsMode: Story = {
  render: () => html`
    <style>
      .forced-colors-info {
        padding: 1rem;
        background: var(--bg-surface-2);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }
    </style>

    <div class="forced-colors-info">
      <strong>確認方法</strong>:
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        <li>
          <strong>Windows</strong>: 設定 > アクセシビリティ > コントラストテーマ
          で高コントラストモードを有効化
        </li>
        <li>
          <strong>開発者ツール</strong>: Chrome DevTools > Rendering > Emulate CSS media feature
          forced-colors: active
        </li>
      </ul>
    </div>

    <ui-file-tree .items="${cloneTree(simpleTreeData)}" variant="card"></ui-file-tree>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Forced Colors Mode（高コントラストモード）での表示を確認します。境界線とシステムカラーにより構造が明確化されます。',
      },
    },
  },
};

/**
 * Reduced Motion での表示確認。
 *
 * prefers-reduced-motion 環境下でのアニメーション抑制を確認します。
 */
export const ReducedMotion: Story = {
  render: () => html`
    <style>
      .reduced-motion-info {
        padding: 1rem;
        background: var(--bg-surface-2);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }

      /* このストーリー内で reduced-motion を強制 */
      @media (prefers-reduced-motion: no-preference) {
        .reduced-motion-demo ui-file-tree {
          --duration-fast: 0.01ms;
        }
      }
    </style>

    <div class="reduced-motion-info">
      <strong>確認方法</strong>:
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        <li>
          <strong>Windows</strong>: 設定 > アクセシビリティ > 視覚効果 > アニメーション効果をオフ
        </li>
        <li>
          <strong>macOS</strong>: システム設定 > アクセシビリティ > ディスプレイ > 視差効果を減らす
        </li>
        <li><strong>このストーリー</strong>: reduced-motion を強制的にシミュレートしています</li>
      </ul>
      <p style="margin: 0.5rem 0 0 0;">
        スケルトンアニメーションが停止し、トランジションが即座に適用されることを確認してください。
      </p>
    </div>

    <div class="reduced-motion-demo">
      <ui-file-tree .items="${cloneTree(simpleTreeData)}" variant="card"></ui-file-tree>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'prefers-reduced-motion 環境下でのアニメーション抑制を確認します。スケルトンは静的になり、トランジションは即座に適用されます。',
      },
    },
  },
};

/**
 * 印刷スタイルの確認。
 *
 * @media print 時のスタイルを確認します。
 * デフォルトでは非表示、`variant="card"` かつ `data-printable="true"` の場合のみ表示されます。
 */
export const PrintStyles: Story = {
  render: () => html`
    <style>
      .print-info {
        padding: 1rem;
        background: var(--bg-surface-2);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }

      .print-showcase {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .print-label {
        font-weight: var(--font-medium, 500);
        font-size: var(--text-sm, 13px);
        margin-bottom: 0.5rem;
      }
    </style>

    <div class="print-info">
      <strong>確認方法</strong>: ブラウザの印刷プレビュー（Ctrl+P /
      Cmd+P）を開いて、以下の挙動を確認してください：
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        <li>デフォルトのツリーは非表示になる</li>
        <li>data-printable="true" のツリーのみ表示される</li>
        <li>背景色とシャドウが除去され、境界線のみで構造を示す</li>
      </ul>
    </div>

    <div class="print-showcase">
      <div>
        <div class="print-label">Default (印刷時は非表示)</div>
        <ui-file-tree .items="${cloneTree(simpleTreeData)}" variant="card"></ui-file-tree>
      </div>

      <div>
        <div class="print-label">Printable (印刷時も表示)</div>
        <ui-file-tree
          .items="${cloneTree(simpleTreeData)}"
          variant="card"
          data-printable="true"
        ></ui-file-tree>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          '印刷時の仕様確認です。ui-file-tree はナビゲーション用途のため印刷時に非表示となりますが、data-printable="true" を設定することで例外的に表示できます。',
      },
    },
  },
};

export const KeyboardNavigation: Story = {
  render: () => html`
    <div>
      <button id="tree-trigger" type="button">Tree Trigger</button>
      <div
        style="max-height: 280px; overflow: auto; border: 1px solid var(--border-default); margin-top: 8px;"
      >
        <ui-file-tree .items="${cloneTree(simpleTreeData)}"></ui-file-tree>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fileTree = canvasElement.querySelector('ui-file-tree');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#tree-trigger');
    if (!fileTree || !trigger) {
      throw new Error('Required elements not found');
    }

    await fileTree.updateComplete;
    trigger.focus();

    const firstTreeItem = fileTree.shadowRoot?.querySelector<HTMLElement>(
      'ui-tree-item[tabindex="0"]',
    );
    if (!firstTreeItem) {
      throw new Error('Expected first tree item with tabindex=0');
    }
    firstTreeItem.focus();

    const container = fileTree.shadowRoot?.querySelector<HTMLElement>('.container');
    if (!container) {
      throw new Error('Container not found');
    }

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }),
    );
    await fileTree.updateComplete;
    const afterArrowDown = fileTree.activeId;
    if (afterArrowDown !== '1-1') {
      throw new Error(`Expected activeId to be "1-1", got "${afterArrowDown}"`);
    }

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }),
    );
    await fileTree.updateComplete;
    const afterEnd = fileTree.activeId;
    if (afterEnd !== '4') {
      throw new Error(`Expected activeId to be "4" after End, got "${afterEnd}"`);
    }

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true }),
    );
    await fileTree.updateComplete;
    const afterHome = fileTree.activeId;
    if (afterHome !== '1') {
      throw new Error(`Expected activeId to be "1" after Home, got "${afterHome}"`);
    }

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'r', bubbles: true, composed: true }),
    );
    await fileTree.updateComplete;
    const afterTypeAhead = fileTree.activeId;
    if (afterTypeAhead !== '4') {
      throw new Error(`Expected type-ahead to move focus to "4", got "${afterTypeAhead}"`);
    }

    const activeItems = Array.from(
      fileTree.shadowRoot?.querySelectorAll<HTMLElement>('ui-tree-item[tabindex="0"]') ?? [],
    );
    if (activeItems.length !== 1) {
      throw new Error(`Expected exactly one tabindex=0 item, got ${String(activeItems.length)}`);
    }

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    await Promise.resolve();
    if (document.activeElement !== trigger) {
      throw new Error('Escape should restore focus to the previous external trigger');
    }
  },
};

export const CardStateMatrix: Story = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      <ui-file-tree .items="${cloneTree(simpleTreeData)}" variant="card"></ui-file-tree>
      <ui-file-tree .items="${[]}" variant="card"></ui-file-tree>
      <ui-file-tree .items="${[]}" variant="card" loading></ui-file-tree>
      <ui-file-tree
        .items="${cloneTree(simpleTreeData)}"
        variant="card"
        density="compact"
      ></ui-file-tree>
    </div>
  `,
};

export const DarkModeCard: Story = {
  render: () => html`
    <div style="background: oklch(22% 0.02 250); padding: 16px;">
      <ui-file-tree .items="${cloneTree(simpleTreeData)}" variant="card"></ui-file-tree>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Dark Mode相当の背景上で、Cardのエッジハイライト（inset shadow）と可読性を確認します。',
      },
    },
  },
};
