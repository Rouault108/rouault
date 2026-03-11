import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './tree-item';
import type { TreeItem } from './tree-item';

/**
 * ## ツリーアイテム (Tree Item)
 *
 * 階層化された情報を探索するためのナビゲーション・コンポーネントです。
 * ネスト構造（Recursive Nesting）により、DOM構造と視覚階層を一致させ、
 * 堅牢なアクセシビリティを担保します。
 *
 * ### デザイン哲学
 *
 * - **Structural Visibility**: 階層構造は「無意識のオリエンテーション」の基盤です。
 *   インデントガイド（ツリー線）は、視覚的ノイズにならない極限の低コントラスト（Subtle）で常時表示し、
 *   ユーザーが能動的に探すことなく構造を把握できるようにします。
 * - **Smooth Expansion**: 展開/収縮のアニメーションは `--duration-slow` (200ms) で行い、
 *   視覚的なレイアウトシフトに対する認知負荷（驚き）を最小化します。
 * - **Recursive Nesting**: DOM構造と視覚階層を一致させることで、`aria-level` やグループ化の
 *   セマンティクスをブラウザ標準の挙動に委ね、堅牢なアクセシビリティを担保します。
 *
 * ### 使用上の注意
 *
 * - **単独では不完全**: このコンポーネントは `ui-file-tree` コンテナ内で使用することを前提としています。
 *   `Up` / `Down` / `Home` / `End` / `Esc` / Type-ahead などのキーボード操作は、
 *   ルートコンテナ側の Event Delegation で管理されます。
 * - **シングルセレクト**: マルチセレクトは採用せず、閲覧体験に特化しています。
 * - **密度の選択**: Compact密度は視覚サイズ24px、物理タッチターゲット44pxを確保します。
 */
const meta: Meta<TreeItem> = {
  title: 'Components/Tree Item',
  component: 'ui-tree-item',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
階層化された情報を探索するためのナビゲーション・コンポーネントです。

## 使用方法

\`\`\`html
<!-- 単独アイテム -->
<ui-tree-item label="ファイル.txt" icon="lucide:file"></ui-tree-item>

<!-- ネスト構造 -->
<ui-tree-item label="フォルダ" icon="lucide:folder" expanded>
  <ui-tree-item slot="children" label="サブファイル.txt" icon="lucide:file"></ui-tree-item>
</ui-tree-item>

<!-- Compact密度 -->
<ui-tree-item label="アイテム" density="compact"></ui-tree-item>
\`\`\`

## 重要な注意事項

このコンポーネントは **ui-file-tree コンテナ内で使用することを前提** としています。
単独で使用した場合、以下のキーボード操作が正常に動作しません：

- Up / Down キーによるフォーカス移動
- Home / End キーによる先頭/末尾へのジャンプ
- Type-ahead による検索
- Esc キーによるフォーカス解除

これらの操作は、ルートコンテナ側の Event Delegation で管理されます。
        `,
      },
    },
  },
  argTypes: {
    expanded: {
      control: 'boolean',
      description: '子要素の展開状態',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    selected: {
      control: 'boolean',
      description: '現在選択されているか（カレント）',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    label: {
      control: 'text',
      description: '表示ラベル',
      table: {
        type: { summary: 'string' },
      },
    },
    icon: {
      control: 'text',
      description: 'コンテンツアイコン（例: "lucide:folder", "lucide:file"）',
      table: {
        type: { summary: 'string' },
      },
    },
    density: {
      control: 'select',
      options: ['normal', 'compact'],
      description: '行の高さ密度（normal: 32px, compact: 24px）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'normal' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<TreeItem>;

const nextFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const getTooltipPanel = (host: HTMLElement): HTMLElement => {
  const tooltipId = host.dataset['tooltipId'];
  if (!tooltipId) {
    throw new Error('tooltip id が見つかりません');
  }
  const panel = host.ownerDocument.getElementById(tooltipId);
  if (!panel) {
    throw new Error('tooltip panel が見つかりません');
  }
  return panel;
};

/**
 * デフォルトのツリーアイテム（Normal密度）。
 *
 * 閲覧・操作に適した標準サイズ（32px）です。Linear Docs準拠。
 */
export const Default: Story = {
  args: {
    label: 'ファイル.txt',
    icon: 'lucide:file',
    density: 'normal',
    selected: false,
    expanded: false,
  },
  render: (args) => html`
    <ui-tree-item
      label="${args.label}"
      icon="${args.icon}"
      density="${args.density}"
      ?selected="${args.selected}"
      ?expanded="${args.expanded}"
    ></ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector('ui-tree-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    // テスト: デフォルトのdensityが"normal"であること
    if (treeItem.density !== 'normal') {
      throw new Error(`density="normal" を期待していましたが、実際には "${treeItem.density}" でした`);
    }

    // テスト: role="treeitem"が設定されていること
    if (treeItem.getAttribute('role') !== 'treeitem') {
      throw new Error('TreeItem は role="treeitem" を持つ必要があります');
    }

    // テスト: aria-selectedが設定されていること
    if (treeItem.getAttribute('aria-selected') !== 'false') {
      throw new Error('aria-selected="false" を期待していましたが、実際には違います');
    }

    if (treeItem.getAttribute('aria-level') !== '1') {
      throw new Error(
        `aria-level="1" を期待していましたが、実際には "${String(treeItem.getAttribute('aria-level'))}" でした`,
      );
    }

    const itemElement = treeItem.shadowRoot?.querySelector<HTMLElement>('.item');
    if (!itemElement) {
      throw new Error('アイテム要素が見つかりませんでした');
    }

    if (itemElement.getAttribute('tabindex') !== '0') {
      throw new Error(
        `アイテムの tabindex="0" を期待していましたが、実際には "${String(itemElement.getAttribute('tabindex'))}" でした`,
      );
    }
  },
};

/**
 * 全密度の一覧。
 *
 * Normal（32px）とCompact（24px）の2つの密度を比較できます。
 * Compact密度では、視覚サイズは24pxですが、物理タッチターゲットは44pxに拡張されています。
 */
export const AllDensities: Story = {
  render: () => html`
    <style>
      .density-showcase {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
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
        margin-bottom: 0.25rem;
      }
    </style>

    <div class="density-showcase">
      <div class="density-group">
        <span class="density-label">Normal (32px) - 標準サイズ</span>
        <ui-tree-item label="ドキュメント" icon="lucide:file-text" density="normal"></ui-tree-item>
      </div>

      <div class="density-group">
        <span class="density-label">Compact (24px) - 高密度表示</span>
        <ui-tree-item label="ドキュメント" icon="lucide:file-text" density="compact"></ui-tree-item>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const treeItems = canvasElement.querySelectorAll<TreeItem>('ui-tree-item');
    if (treeItems.length !== 2) {
      throw new Error(`2つのツリーアイテムを期待していましたが、実際には ${String(treeItems.length)}個でした`);
    }

    const normal = treeItems[0];
    const compact = treeItems[1];
    if (!normal || !compact) {
      throw new Error('ツリーアイテムが見つかりませんでした');
    }

    await normal.updateComplete;
    await compact.updateComplete;

    const normalRow = normal.shadowRoot?.querySelector<HTMLElement>('.item');
    const compactRow = compact.shadowRoot?.querySelector<HTMLElement>('.item');
    if (!normalRow || !compactRow) {
      throw new Error('アイテムの行（row）が見つかりませんでした');
    }

    const normalHeight = Math.round(normalRow.getBoundingClientRect().height);
    const compactHeight = Math.round(compactRow.getBoundingClientRect().height);

    if (normalHeight < 30 || normalHeight > 34) {
      throw new Error(`Normal 密度の高さは約 32px であるべきですが、実際には ${String(normalHeight)}px でした`);
    }
    if (compactHeight < 22 || compactHeight > 26) {
      throw new Error(
        `Compact 密度の高さは約 24px であるべきですが、実際には ${String(compactHeight)}px でした`,
      );
    }
  },
};

/**
 * 選択状態（Selected）。
 *
 * 現在選択されているアイテムを示します。背景色が変化し、テキスト色がプライマリカラーになります。
 */
export const Selected: Story = {
  args: {
    label: 'README.md',
    icon: 'lucide:file-text',
    selected: true,
  },
  render: (args) => html`
    <ui-tree-item
      label="${args.label}"
      icon="${args.icon}"
      ?selected="${args.selected}"
    ></ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector('ui-tree-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    // テスト: aria-selected="true"が設定されていること
    if (treeItem.getAttribute('aria-selected') !== 'true') {
      throw new Error('aria-selected="true" を期待していましたが、実際には違います');
    }

    // テスト: selected属性が設定されていること
    if (!treeItem.selected) {
      throw new Error('selected プロパティが true であるべきです');
    }
  },
};

/**
 * ネスト構造（基本）。
 *
 * 親アイテムと子アイテムの階層構造を示します。
 * 展開アイコン（ChevronRight）は左端に配置され、展開時に90度回転します。
 */
export const WithChildren: Story = {
  render: () => html`
    <ui-tree-item label="src" icon="lucide:folder" expanded>
      <ui-tree-item slot="children" label="components" icon="lucide:folder"></ui-tree-item>
      <ui-tree-item slot="children" label="utils" icon="lucide:folder"></ui-tree-item>
      <ui-tree-item slot="children" label="index.ts" icon="lucide:file-code"></ui-tree-item>
    </ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector('ui-tree-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    // テスト: aria-expandedが設定されていること（子要素がある場合）
    const ariaExpanded = treeItem.getAttribute('aria-expanded');
    if (ariaExpanded !== 'true') {
      throw new Error(`aria-expanded="true" を期待していましたが、実際には "${String(ariaExpanded)}" でした`);
    }

    // テスト: 子要素が存在すること
    const children = treeItem.querySelectorAll('ui-tree-item[slot="children"]');
    if (children.length !== 3) {
      throw new Error(`3つの子要素を期待していましたが、実際には ${String(children.length)}個でした`);
    }
  },
};

/**
 * 深いネスト構造（3階層）。
 *
 * 複数レベルの階層構造を示します。
 * インデントガイド（ツリー線）により、構造が一目で把握できます。
 */
export const DeepNesting: Story = {
  render: () => html`
    <ui-tree-item label="プロジェクト" icon="lucide:folder" expanded>
      <ui-tree-item slot="children" label="src" icon="lucide:folder" expanded>
        <ui-tree-item slot="children" label="components" icon="lucide:folder" expanded>
          <ui-tree-item slot="children" label="button.ts" icon="lucide:file-code"></ui-tree-item>
          <ui-tree-item slot="children" label="input.ts" icon="lucide:file-code"></ui-tree-item>
        </ui-tree-item>
        <ui-tree-item slot="children" label="utils" icon="lucide:folder">
          <ui-tree-item slot="children" label="helpers.ts" icon="lucide:file-code"></ui-tree-item>
        </ui-tree-item>
      </ui-tree-item>
      <ui-tree-item slot="children" label="README.md" icon="lucide:file-text"></ui-tree-item>
    </ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('ui-tree-item');
    if (!root) {
      throw new Error('ルートツリーアイテムが見つかりませんでした');
    }

    await root.updateComplete;

    const nestedItems = canvasElement.querySelectorAll<TreeItem>('ui-tree-item');
    if (nestedItems.length < 5) {
      throw new Error(`深いネスト構造のアイテムを期待していましたが、実際には ${String(nestedItems.length)}個でした`);
    }

    const rootLevel = root.getAttribute('aria-level');
    if (rootLevel !== '1') {
      throw new Error(`ルートの aria-level="1" を期待していましたが、実際には "${String(rootLevel)}" でした`);
    }

    const thirdLevelNode = canvasElement.querySelector<TreeItem>(
      'ui-tree-item[label="components"]',
    );
    if (!thirdLevelNode) {
      throw new Error('3階層目のツリーアイテムが見つかりませんでした');
    }
    await thirdLevelNode.updateComplete;

    const thirdLevel = thirdLevelNode.getAttribute('aria-level');
    if (thirdLevel !== '3') {
      throw new Error(`3階層目の aria-level="3" を期待していましたが、実際には "${String(thirdLevel)}" でした`);
    }
  },
};

/**
 * 収縮状態（Collapsed）。
 *
 * 子要素を持つアイテムの収縮状態を示します。
 * 展開アイコンは右向き（0度）を維持します。
 */
export const Collapsed: Story = {
  render: () => html`
    <ui-tree-item label="node_modules" icon="lucide:folder" ?expanded="${false}">
      <ui-tree-item slot="children" label="react" icon="lucide:folder"></ui-tree-item>
      <ui-tree-item slot="children" label="vue" icon="lucide:folder"></ui-tree-item>
    </ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector('ui-tree-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    // テスト: aria-expanded="false"が設定されていること
    if (treeItem.getAttribute('aria-expanded') !== 'false') {
      throw new Error('aria-expanded="false" を期待していましたが、実際には違います');
    }

    // テスト: expanded属性がfalseであること
    if (treeItem.expanded) {
      throw new Error('expanded プロパティが false であるべきです');
    }

    const childrenContainer = treeItem.shadowRoot?.querySelector<HTMLElement>('.children');
    if (!childrenContainer) {
      throw new Error('子要素コンテナが見つかりませんでした');
    }

    if (childrenContainer.getAttribute('aria-hidden') !== 'true') {
      throw new Error('収縮状態の子要素は aria-hidden="true" を持つべきです');
    }
  },
};

/**
 * 選択済み + 展開済みの組み合わせ。
 *
 * 選択されたフォルダが展開されている状態を示します。
 * インデントガイドの色が強化され、Active Context を視覚化します。
 */
export const SelectedAndExpanded: Story = {
  render: () => html`
    <ui-tree-item label="components" icon="lucide:folder" selected expanded>
      <ui-tree-item slot="children" label="button.ts" icon="lucide:file-code"></ui-tree-item>
      <ui-tree-item slot="children" label="input.ts" icon="lucide:file-code"></ui-tree-item>
      <ui-tree-item slot="children" label="tree-item.ts" icon="lucide:file-code"></ui-tree-item>
    </ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector('ui-tree-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    // テスト: 両方の状態が設定されていること
    if (!treeItem.selected) {
      throw new Error('selected プロパティが true であるべきです');
    }
    if (!treeItem.expanded) {
      throw new Error('expanded プロパティが true であるべきです');
    }

    // テスト: aria属性が正しく設定されていること
    if (treeItem.getAttribute('aria-selected') !== 'true') {
      throw new Error('aria-selected="true" ではなく false でした');
    }
    if (treeItem.getAttribute('aria-expanded') !== 'true') {
      throw new Error('aria-expanded="true" ではなく false でした');
    }
  },
};

/**
 * Compact + Selected + Expanded の複合状態。
 * 密度変更時でも選択状態・展開状態・ARIA属性が一貫することを確認します。
 */
export const CompactSelectedExpanded: Story = {
  render: () => html`
    <ui-tree-item label="components" icon="lucide:folder" density="compact" selected expanded>
      <ui-tree-item
        slot="children"
        label="button.ts"
        icon="lucide:file-code"
        density="compact"
      ></ui-tree-item>
      <ui-tree-item
        slot="children"
        label="input.ts"
        icon="lucide:file-code"
        density="compact"
      ></ui-tree-item>
    </ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector<TreeItem>('ui-tree-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    if (treeItem.density !== 'compact') {
      throw new Error(`density="compact" を期待していましたが、実際には "${treeItem.density}" でした`);
    }

    if (treeItem.getAttribute('aria-selected') !== 'true') {
      throw new Error('aria-selected="true" を期待していました');
    }

    if (treeItem.getAttribute('aria-expanded') !== 'true') {
      throw new Error('aria-expanded="true" を期待していました');
    }
  },
};

/**
 * 境界条件: 長いラベルテキスト。
 *
 * ラベルが長い場合、text-overflow: ellipsis により省略されます。
 */
export const LongLabel: Story = {
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
        icon="lucide:file-code"
      ></ui-tree-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector('ui-tree-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;
    await nextFrame();
    await nextFrame();

    const labelElement = treeItem.shadowRoot?.querySelector('.label');
    if (!labelElement) {
      throw new Error('ラベル要素が見つかりませんでした');
    }

    // テスト: text-overflow: ellipsis が適用されていること
    const computedStyle = window.getComputedStyle(labelElement);
    if (computedStyle.textOverflow !== 'ellipsis') {
      throw new Error('text-overflow="ellipsis" を期待していましたが違います');
    }

    const tooltipHost = treeItem.shadowRoot?.querySelector<HTMLElement & { disabled?: boolean }>(
      'ui-tooltip.item-tooltip',
    );
    if (!tooltipHost) {
      throw new Error('ui-tooltip.item-tooltip が見つかりません');
    }
    if (tooltipHost.disabled === true) {
      throw new Error('長いラベルでは tooltip が無効化されてはいけません');
    }

    const trigger = treeItem.shadowRoot?.querySelector<HTMLElement>('.item');
    if (!trigger) {
      throw new Error('.item trigger が見つかりません');
    }

    const panel = getTooltipPanel(tooltipHost);

    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    await nextFrame();
    await nextFrame();

    if (panel.getAttribute('aria-hidden') !== 'false') {
      throw new Error('hover 時に tooltip が表示される必要があります');
    }

    trigger.dispatchEvent(new MouseEvent('mouseleave'));
    await nextFrame();
    await nextFrame();

    if (panel.getAttribute('aria-hidden') !== 'true') {
      throw new Error('leave 後に tooltip が閉じる必要があります');
    }
  },
};

/**
 * 境界条件: アイコンなし。
 *
 * アイコンプロパティを省略した場合、アイコンスロットが使用されます。
 * スロットにも何も提供しない場合、アイコン領域は空になります。
 */
export const NoIcon: Story = {
  render: () => html` <ui-tree-item label="テキストのみのアイテム"></ui-tree-item> `,
};

/**
 * 境界条件: カスタムアイコンスロット。
 *
 * icon プロパティの代わりに、slot="icon" でカスタムアイコンを提供できます。
 */
export const CustomIconSlot: Story = {
  render: () => html`
    <ui-tree-item label="カスタムアイコン">
      <iconify-icon slot="icon" icon="lucide:star" style="color: gold;"></iconify-icon>
    </ui-tree-item>
  `,
};

/**
 * 境界条件: 子要素なし（リーフノード）。
 *
 * 子要素がない場合、展開アイコンは非表示になります（スペースは維持）。
 */
export const LeafNode: Story = {
  render: () => html` <ui-tree-item label="index.ts" icon="lucide:file-code"></ui-tree-item> `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector('ui-tree-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    // テスト: aria-expandedが設定されていないこと（子要素なし）
    const ariaExpanded = treeItem.getAttribute('aria-expanded');
    if (ariaExpanded !== null) {
      throw new Error(`aria-expanded が null であることを期待していましたが、実際には "${ariaExpanded}" でした`);
    }

    // テスト: 展開アイコンがhiddenクラスを持つこと
    const expandIcon = treeItem.shadowRoot?.querySelector('.expand-icon');
    if (!expandIcon?.classList.contains('hidden')) {
      throw new Error('リーフノードでは展開アイコンが "hidden" クラスを持つべきです');
    }
  },
};

/**
 * インタラクティブテスト: キーボード操作。
 *
 * Enter / Space キーによる選択、Arrow キーによる展開/収縮を確認します。
 */
export const KeyboardInteraction: Story = {
  render: () => html`
    <style>
      .keyboard-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }
    </style>

    <div class="keyboard-info">
      <strong>操作方法</strong>:
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        <li><kbd>Enter</kbd> / <kbd>Space</kbd>: アイテムを選択</li>
        <li><kbd>→</kbd>: フォルダを展開（展開済みの場合は子へ移動 ※file-tree内で動作）</li>
        <li><kbd>←</kbd>: フォルダを収縮（収縮済みの場合は親へ移動 ※file-tree内で動作）</li>
      </ul>
      <p style="margin: 0.5rem 0 0 0;">
        ※ Up/Down/Home/End/Esc は ui-file-tree コンテナ内で動作します。
      </p>
    </div>

    <ui-tree-item id="keyboard-test-item" label="components" icon="lucide:folder">
      <ui-tree-item slot="children" label="button.ts" icon="lucide:file-code"></ui-tree-item>
      <ui-tree-item slot="children" label="input.ts" icon="lucide:file-code"></ui-tree-item>
    </ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector<TreeItem>('#keyboard-test-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    const itemElement = treeItem.shadowRoot?.querySelector<HTMLElement>('.item');
    if (!itemElement) {
      throw new Error('アイテム要素が見つかりませんでした');
    }

    // テスト: Enter キーで選択状態になること
    let selectedEventFired = false;
    treeItem.addEventListener('selected-change', () => {
      selectedEventFired = true;
    });

    itemElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await treeItem.updateComplete;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!selectedEventFired) {
      throw new Error('Enter キーの押下時に selected-change イベントが発火することを期待していましたが、発火しませんでした');
    }

    if (!treeItem.selected) {
      throw new Error('Enter キーの押下後に selected=true になりませんでした');
    }

    // テスト: Space キーでも選択イベントが発火すること
    selectedEventFired = false;
    treeItem.selected = false;
    await treeItem.updateComplete;

    itemElement.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await treeItem.updateComplete;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!selectedEventFired) {
      throw new Error('Space キーの押下時に selected-change イベントが発火することを期待していましたが、発火しませんでした');
    }

    // テスト: ArrowRight キーで展開すること
    let expandedEventFired = false;
    treeItem.addEventListener('expanded-change', () => {
      expandedEventFired = true;
    });

    itemElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await treeItem.updateComplete;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!expandedEventFired) {
      throw new Error('ArrowRight キーの押下時に expanded-change イベントが発火することを期待していましたが、発火しませんでした');
    }

    if (!treeItem.expanded) {
      throw new Error('ArrowRight キーの押下後に expanded=true になることを期待していました');
    }

    // テスト: ArrowRight キー（展開済み）で委譲イベントが発火すること
    let arrowRightDelegated = false;
    treeItem.addEventListener('tree-item-arrow-right', () => {
      arrowRightDelegated = true;
    });
    itemElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await treeItem.updateComplete;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!arrowRightDelegated) {
      throw new Error(
        '展開済みの状態で ArrowRight キーが押された際に tree-item-arrow-right イベントが発火することを期待していましたが、発火しませんでした',
      );
    }

    // テスト: ArrowLeft キーで収縮すること
    expandedEventFired = false;
    itemElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await treeItem.updateComplete;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!expandedEventFired) {
      throw new Error('ArrowLeft キーの押下時に expanded-change イベントが発火することを期待していましたが、発火しませんでした');
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (treeItem.expanded) {
      throw new Error('ArrowLeft キーの押下後に expanded=false になりませんでした');
    }

    // テスト: ArrowLeft キー（収縮済み）で委譲イベントが発火すること
    let arrowLeftDelegated = false;
    treeItem.addEventListener('tree-item-arrow-left', () => {
      arrowLeftDelegated = true;
    });
    itemElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await treeItem.updateComplete;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!arrowLeftDelegated) {
      throw new Error('収縮済みの状態で ArrowLeft キーが押された際に tree-item-arrow-left イベントが発火することを期待していましたが、発火しませんでした');
    }
  },
};

/**
 * インタラクティブテスト: クリック操作。
 *
 * アイテムクリックによる選択、展開アイコンクリックによる展開/収縮を確認します。
 */
export const ClickInteraction: Story = {
  render: () => html`
    <style>
      .click-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }
    </style>

    <div class="click-info">
      <strong>操作方法</strong>:
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        <li>アイテム行をクリック: 選択状態にする</li>
        <li>展開アイコン（ChevronRight）をクリック: 展開/収縮を切り替える（選択はしない）</li>
      </ul>
    </div>

    <ui-tree-item id="click-test-item" label="src" icon="lucide:folder">
      <ui-tree-item slot="children" label="index.ts" icon="lucide:file-code"></ui-tree-item>
    </ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector<TreeItem>('#click-test-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    const itemElement = treeItem.shadowRoot?.querySelector<HTMLElement>('.item');
    const expandIcon = treeItem.shadowRoot?.querySelector<HTMLElement>('.expand-icon');

    if (!itemElement || !expandIcon) {
      throw new Error('必要な要素が見つかりませんでした');
    }

    // テスト: 展開アイコンクリックで展開すること（選択はされない）
    let expandedEventFired = false;
    treeItem.addEventListener('expanded-change', () => {
      expandedEventFired = true;
    });

    expandIcon.click();
    await treeItem.updateComplete;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!expandedEventFired) {
      throw new Error('展開アイコンのクリック時に expanded-change イベントが発火することを期待していましたが、発火しませんでした');
    }

    if (!treeItem.expanded) {
      throw new Error('展開アイコンのクリック後に expanded=true になりませんでした');
    }

    if (treeItem.selected) {
      throw new Error('展開アイコンのクリック後も selected=false を維持することを期待していましたが、維持されませんでした');
    }

    // テスト: アイテムクリックで選択されること
    let selectedEventFired = false;
    treeItem.addEventListener('selected-change', () => {
      selectedEventFired = true;
    });

    itemElement.click();
    await treeItem.updateComplete;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!selectedEventFired) {
      throw new Error('アイテムのクリック時に selected-change イベントが発火することを期待していましたが、発火しませんでした');
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!treeItem.selected) {
      throw new Error('アイテムのクリック後に selected=true になりませんでした');
    }
  },
};

/**
 * フォーカス状態のデモ。
 *
 * Adaptive Focus により、移動中のノイズを低減し、停止時に明確化します。
 */
export const FocusState: Story = {
  render: () => html`
    <style>
      .focus-demo {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .focus-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
      }
    </style>

    <div class="focus-demo">
      <div class="focus-info">
        <strong>操作方法</strong>: アイテムをクリックしてフォーカスを当ててください。 Adaptive Focus
        により、フォーカスリングが適切に表示されます。
      </div>

      <ui-tree-item
        id="focus-test-item"
        label="README.md"
        icon="lucide:file-text"
        selected
      ></ui-tree-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector<TreeItem>('#focus-test-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    // フォーカスを当てる
    treeItem.focus();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const itemElement = treeItem.shadowRoot?.querySelector<HTMLElement>('.item');
    if (!itemElement) {
      throw new Error('アイテム要素が見つかりませんでした');
    }

    // テスト: フォーカスが当たっていること
    if (treeItem.shadowRoot?.activeElement !== itemElement) {
      throw new Error('アイテムがフォーカスされている必要があります');
    }
  },
};

/**
 * Compact密度のタッチターゲット確認。
 *
 * Compact密度では、視覚サイズは24pxですが、物理タッチターゲットは44pxに拡張されています。
 * ::after 疑似要素により、WCAG 2.5.5（Target Size: Enhanced）に準拠します。
 */
export const CompactDensityTouchTarget: Story = {
  render: () => html`
    <style>
      .touch-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }

      .touch-showcase {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
    </style>

    <div class="touch-info">
      <strong>Compact密度のタッチターゲット仕様</strong>:
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        <li>視覚サイズ: 24px（WCAG 2.5.8 AA 最小要件）</li>
        <li>物理タッチターゲット: 44px（WCAG 2.5.5 推奨、::after疑似要素で拡張）</li>
      </ul>
      <p style="margin: 0.5rem 0 0 0;">
        開発者ツールで ::after 疑似要素を検証して、44px
        の高さが確保されていることを確認してください。
      </p>
    </div>

    <div class="touch-showcase">
      <ui-tree-item label="アイテム 1" icon="lucide:file" density="compact"></ui-tree-item>
      <ui-tree-item label="アイテム 2" icon="lucide:file" density="compact"></ui-tree-item>
      <ui-tree-item label="アイテム 3" icon="lucide:file" density="compact"></ui-tree-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const treeItems = canvasElement.querySelectorAll<TreeItem>('ui-tree-item');
    if (treeItems.length !== 3) {
      throw new Error(`3つのツリーアイテムを期待していましたが、実際には ${String(treeItems.length)}個でした`);
    }

    const firstItem = treeItems[0];
    if (!firstItem) {
      throw new Error('最初のツリーアイテムが見つかりませんでした');
    }
    await firstItem.updateComplete;

    if (!firstItem.shadowRoot) {
      throw new Error('Shadow root が見つかりませんでした');
    }

    const itemElement = firstItem.shadowRoot.querySelector<HTMLElement>('.item');
    if (!itemElement) {
      throw new Error('アイテム要素が見つかりませんでした');
    }

    // テスト: Compact密度のアイテムの高さが24px前後であること
    const height = itemElement.getBoundingClientRect().height;
    if (height < 20 || height > 28) {
      throw new Error(`アイテムの高さが 24px 前後であることを期待していましたが、実際には ${String(height)}px でした`);
    }
  },
};

/**
 * Forced Colors Mode での表示確認。
 *
 * Windows の高コントラストモードなど、強制カラーモード環境での表示を確認します。
 * システムカラー（Highlight, HighlightText, CanvasText）へのフォールバックを検証できます。
 */
export const ForcedColorsMode: Story = {
  render: () => html`
    <style>
      .forced-colors-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
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
      <p style="margin: 0.5rem 0 0 0;">
        インデントガイドが CanvasText で表示され、選択状態が Highlight/HighlightText
        で明確化されることを確認してください。
      </p>
    </div>

    <ui-tree-item label="src" icon="lucide:folder" expanded>
      <ui-tree-item slot="children" label="components" icon="lucide:folder" selected>
        <ui-tree-item slot="children" label="button.ts" icon="lucide:file-code"></ui-tree-item>
      </ui-tree-item>
      <ui-tree-item slot="children" label="utils" icon="lucide:folder">
        <ui-tree-item slot="children" label="helpers.ts" icon="lucide:file-code"></ui-tree-item>
      </ui-tree-item>
    </ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const selectedItem = canvasElement.querySelector<TreeItem>('ui-tree-item[label="components"]');
    if (!selectedItem) {
      throw new Error('選択されたアイテムが見つかりませんでした');
    }

    await selectedItem.updateComplete;

    if (selectedItem.getAttribute('aria-selected') !== 'true') {
      throw new Error('選択されたアイテムが aria-selected="true" を持っていません');
    }

    const childrenContainer = selectedItem.shadowRoot?.querySelector<HTMLElement>('.children');
    if (!childrenContainer) {
      throw new Error('子要素コンテナが見つかりませんでした');
    }

    if (childrenContainer.getAttribute('role') !== 'group') {
      throw new Error('子要素コンテナは role="group" を持つ必要があります');
    }
  },
  parameters: {
    docs: {
      description: {
        story:
          'Forced Colors Mode（高コントラストモード）での表示を確認します。インデントガイドと選択状態がシステムカラーで明確化されます。',
      },
    },
  },
};

/**
 * Reduced Motion での表示確認。
 *
 * prefers-reduced-motion 環境下でのアニメーション抑制を確認します。
 * 展開/収縮のトランジションが即座に適用され、色遷移も短縮されます。
 */
export const ReducedMotion: Story = {
  render: () => html`
    <style>
      .reduced-motion-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }

      /* このストーリー内で reduced-motion を強制 */
      @media (prefers-reduced-motion: no-preference) {
        .reduced-motion-showcase ui-tree-item {
          --duration-slow: 0.01ms;
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
        展開アイコンをクリックして、アニメーションが即座に適用されることを確認してください。
      </p>
    </div>

    <div class="reduced-motion-showcase">
      <ui-tree-item label="アニメーションテスト" icon="lucide:folder">
        <ui-tree-item slot="children" label="ファイル1.ts" icon="lucide:file-code"></ui-tree-item>
        <ui-tree-item slot="children" label="ファイル2.ts" icon="lucide:file-code"></ui-tree-item>
      </ui-tree-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector<TreeItem>('ui-tree-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    const children = treeItem.shadowRoot?.querySelector<HTMLElement>('.children');
    if (!children) {
      throw new Error('子要素コンテナが見つかりませんでした');
    }

    const durations = window.getComputedStyle(children).transitionDuration;
    // ブラウザは 0.01ms を秒単位 (0.00001s / 1e-05s) に変換して報告する場合がある
    if (!durations.includes('0.01ms') && !durations.includes('0s') && !durations.includes('1e-05s') && !durations.includes('0.00001s')) {
      throw new Error(`reduced-motion 時のような transition-duration を期待していましたが、実際には "${durations}" でした`);
    }
  },
  parameters: {
    docs: {
      description: {
        story:
          'prefers-reduced-motion 環境下でのアニメーション抑制を確認します。展開/収縮のトランジションが即座に適用されます。',
      },
    },
  },
};

/**
 * ダークトーン背景での視認性確認。
 * 実際のダークモードトークン適用時の読みやすさを確認するための境界条件ストーリーです。
 */
export const DarkSurfaceContrast: Story = {
  render: () => html`
    <style>
      .dark-surface {
        background: #111417;
        color: #e6edf3;
        border-radius: 8px;
        padding: 12px;
        max-width: 360px;
      }

      .dark-surface ui-tree-item {
        --fg-muted: oklch(84% 0.01 250);
        --fg-default: oklch(96% 0.01 250);
        --bg-hover: oklch(100% 0 0 / 0.08);
        --bg-surface-active: oklch(70% 0.14 250 / 0.22);
        --primary: oklch(78% 0.13 250);
        --border-ghost: oklch(100% 0 0 / 0.12);
      }
    </style>
    <div class="dark-surface">
      <ui-tree-item label="src" icon="lucide:folder" expanded>
        <ui-tree-item
          slot="children"
          label="components"
          icon="lucide:folder"
          selected
        ></ui-tree-item>
        <ui-tree-item slot="children" label="README.md" icon="lucide:file-text"></ui-tree-item>
      </ui-tree-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const selectedItem = canvasElement.querySelector<TreeItem>('ui-tree-item[label="components"]');
    if (!selectedItem) {
      throw new Error('選択された子アイテムが見つかりませんでした');
    }

    await selectedItem.updateComplete;

    if (selectedItem.getAttribute('aria-selected') !== 'true') {
      throw new Error('選択されたアイテムが aria-selected="true" を持っていません');
    }
  },
};

/**
 * 実用例: ファイルツリー。
 *
 * 実際のファイルツリーを模した複雑な階層構造を示します。
 * フォルダとファイルの混在、複数レベルのネスト、選択状態の表現を確認できます。
 */
export const RealWorldFileTree: Story = {
  render: () => html`
    <style>
      .file-tree-demo {
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        padding: var(--space-2, 8px);
        max-width: 400px;
      }
    </style>

    <div class="file-tree-demo">
      <ui-tree-item label="my-project" icon="lucide:folder" expanded>
        <ui-tree-item slot="children" label="src" icon="lucide:folder" expanded>
          <ui-tree-item slot="children" label="components" icon="lucide:folder" expanded>
            <ui-tree-item slot="children" label="ui" icon="lucide:folder">
              <ui-tree-item
                slot="children"
                label="button.ts"
                icon="lucide:file-code"
              ></ui-tree-item>
              <ui-tree-item slot="children" label="input.ts" icon="lucide:file-code"></ui-tree-item>
              <ui-tree-item
                slot="children"
                label="tree-item.ts"
                icon="lucide:file-code"
                selected
              ></ui-tree-item>
            </ui-tree-item>
          </ui-tree-item>
          <ui-tree-item slot="children" label="utils" icon="lucide:folder">
            <ui-tree-item slot="children" label="helpers.ts" icon="lucide:file-code"></ui-tree-item>
            <ui-tree-item
              slot="children"
              label="validators.ts"
              icon="lucide:file-code"
            ></ui-tree-item>
          </ui-tree-item>
          <ui-tree-item slot="children" label="index.ts" icon="lucide:file-code"></ui-tree-item>
        </ui-tree-item>
        <ui-tree-item slot="children" label="public" icon="lucide:folder">
          <ui-tree-item slot="children" label="favicon.ico" icon="lucide:file-image"></ui-tree-item>
          <ui-tree-item slot="children" label="index.html" icon="lucide:file-code"></ui-tree-item>
        </ui-tree-item>
        <ui-tree-item slot="children" label="package.json" icon="lucide:file-code"></ui-tree-item>
        <ui-tree-item slot="children" label="README.md" icon="lucide:file-text"></ui-tree-item>
        <ui-tree-item slot="children" label="tsconfig.json" icon="lucide:file-code"></ui-tree-item>
      </ui-tree-item>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          '実際のファイルツリーを模した複雑な階層構造です。インデントガイドと選択状態により、構造とカレント位置が一目で把握できます。',
      },
    },
  },
};

export const NavigableRowActivation: Story = {
  render: () => html`
    <ui-tree-item
      label="ソートアルゴリズム比較"
      icon="lucide:file-text"
      href="/notes/computer-science/algorithms/sorting"
    ></ui-tree-item>
  `,
  play: async ({ canvasElement }) => {
    const treeItem = canvasElement.querySelector<TreeItem>('ui-tree-item');
    if (!treeItem) {
      throw new Error('TreeItem コンポーネントが見つかりません');
    }

    await treeItem.updateComplete;

    let selectedCount = 0;
    let anchorPathCount = 0;

    treeItem.addEventListener('selected-change', () => {
      selectedCount += 1;
    });

    const clickHandler = (event: Event): void => {
      const hasAnchorInPath = event.composedPath().some(
        (target) => target instanceof HTMLAnchorElement,
      );
      if (hasAnchorInPath) {
        anchorPathCount += 1;
      }
      event.preventDefault();
    };

    document.addEventListener('click', clickHandler);

    try {
      const row = treeItem.shadowRoot?.querySelector<HTMLElement>('.item');
      if (!row) {
        throw new Error('.item が見つかりませんでした');
      }

      row.click();
      await nextFrame();

      if (selectedCount !== 1) {
        throw new Error(`selected-change は 1 回だけ発火する必要があります: ${String(selectedCount)}`);
      }

      if (anchorPathCount < 1) {
        throw new Error('行クリック時に document から辿れるアンカー click が発火していません');
      }
    } finally {
      document.removeEventListener('click', clickHandler);
    }
  },
};
