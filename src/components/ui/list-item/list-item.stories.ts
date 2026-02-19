import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './list-item';
import type { ListItem } from './list-item';

/**
 * ## リストアイテム (List Item)
 *
 * リストビュー (`<ui-list>`) 内で使用される行コンポーネントです。
 * WAI-ARIA Grid Pattern に準拠し、高密度かつアクセシブルな一覧表示を実現します。
 *
 * ### デザイン哲学
 *
 * - **High Density**: 装飾的なカードスタイルではなく、情報は最小限の高さの「行」に凝縮
 * - **Browsing First**: 「読むこと」を最優先とし、閲覧の邪魔になる複雑な操作を排除
 * - **Web Standard**: WAI-ARIA Grid Pattern (Roving Tabindex) に厳密に準拠
 *
 * ### 使用上の注意
 *
 * - 通常は `<ui-list>` コンポーネント内で使用します
 * - 各セルには `role="gridcell"` を付与してください
 * - Primary Action（メインリンク）は最初のセル内に配置してください
 */
const meta: Meta<ListItem> = {
  title: 'Components/ListItem',
  component: 'ui-list-item',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
リストアイテムコンポーネントは、リストビュー内で使用される行です。

## 使用方法

\`\`\`html
<ui-list-item item-id="1" href="/notes/1">
  <div role="gridcell">
    <a href="/notes/1">ノートタイトル</a>
  </div>
  <div role="gridcell">2024-01-01</div>
</ui-list-item>
\`\`\`

## アクセシビリティ

- \`role="row"\` により、スクリーンリーダーに行として認識されます
- \`aria-selected\` により、アクティブ状態が通知されます
- \`aria-haspopup="dialog"\` により、Quick Look機能の存在が通知されます

## 状態

- **Default**: 通常状態（背景透明）
- **Hover / Focus Within**: ホバー・フォーカス時（薄いグレー背景）
- **Active**: アクティブ（フォーカス）時（強調背景 + 左ボーダー）
        `,
      },
    },
  },
  argTypes: {
    itemId: {
      control: 'text',
      description: 'この行のID',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    href: {
      control: 'text',
      description: '行のメインコンテンツへの遷移先',
      table: {
        type: { summary: 'string | null' },
        defaultValue: { summary: 'null' },
      },
    },
    active: {
      control: 'boolean',
      description: 'この行がアクティブ（フォーカス）かどうか',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    rowIndex: {
      control: 'number',
      description: 'ページネーション時の全体の中での位置',
      table: {
        type: { summary: 'number | null' },
        defaultValue: { summary: 'null' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<ListItem>;

/**
 * デフォルトのリストアイテム。
 *
 * 通常状態の行です。背景は透明で、ホバー時に薄いグレー背景が表示されます。
 */
export const Default: Story = {
  args: {
    itemId: '1',
    href: '/notes/1',
    active: false,
  },
  render: (args) => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell a:hover {
        text-decoration: underline;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }
    </style>

    <div class="list-container">
      <ui-list-item
        item-id="${args.itemId}"
        href="${args.href ?? ''}"
        ?active="${args.active}"
        row-index="${String(args.rowIndex ?? 1)}"
      >
        <div class="gridcell" role="gridcell">
          <a href="${args.href ?? '#'}">リストアイテムのタイトル</a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-01</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell">
          <!-- アクションボタンエリア -->
        </div>
      </ui-list-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const listItem = canvasElement.querySelector('ui-list-item');
    if (!listItem) {
      throw new Error('ListItem component not found');
    }

    await listItem.updateComplete;

    // テスト: item-id が設定されていること
    if (listItem.itemId !== '1') {
      throw new Error(`Expected itemId to be '1', got '${listItem.itemId}'`);
    }

    // テスト: active がデフォルトで false であること
    if (listItem.active) {
      throw new Error('Expected active to be false by default');
    }

    // テスト: role="row" が設定されていること
    const row = listItem.shadowRoot?.querySelector('[role="row"]');
    if (!row) {
      throw new Error('Expected role="row" to be set');
    }

    console.log('✅ All tests passed for Default story');
  },
};

/**
 * アクティブ状態のリストアイテム。
 *
 * フォーカスされた行です。強調背景と左ボーダーが表示されます。
 */
export const Active: Story = {
  args: {
    itemId: '2',
    href: '/notes/2',
    active: true,
  },
  render: (args) => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }
    </style>

    <div class="list-container">
      <ui-list-item
        item-id="${args.itemId}"
        href="${args.href ?? ''}"
        ?active="${args.active}"
        row-index="${String(args.rowIndex ?? 1)}"
      >
        <div class="gridcell" role="gridcell">
          <a href="${args.href ?? '#'}">アクティブなリストアイテム</a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-02</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell">
          <!-- アクションボタンエリア -->
        </div>
      </ui-list-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const listItem = canvasElement.querySelector('ui-list-item');
    if (!listItem) {
      throw new Error('ListItem component not found');
    }

    await listItem.updateComplete;

    // テスト: active が true であること
    if (!listItem.active) {
      throw new Error('Expected active to be true');
    }

    // テスト: aria-selected="true" が設定されていること
    const row = listItem.shadowRoot?.querySelector('[role="row"]');
    if (row?.getAttribute('aria-selected') !== 'true') {
      throw new Error('Expected aria-selected to be "true"');
    }

    console.log('✅ All tests passed for Active story');
  },
};

/**
 * すべての状態の比較。
 *
 * Default、Hover、Active の3つの状態を並べて比較できます。
 */
export const AllStates: Story = {
  render: () => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        margin-bottom: 1rem;
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }

      .state-label {
        font-weight: var(--font-medium, 500);
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, #666);
        margin-bottom: 0.5rem;
      }

      .state-group {
        margin-bottom: 2rem;
      }
    </style>

    <div class="state-group">
      <div class="state-label">Default</div>
      <div class="list-container">
        <ui-list-item item-id="1" href="/notes/1">
          <div class="gridcell" role="gridcell">
            <a href="/notes/1">通常状態のアイテム</a>
          </div>
          <div class="gridcell meta" role="gridcell">2024-01-01</div>
          <div class="gridcell meta" role="gridcell">タグ</div>
          <div class="gridcell" role="gridcell"></div>
        </ui-list-item>
      </div>
    </div>

    <div class="state-group">
      <div class="state-label">Hover（マウスを乗せてください）</div>
      <div class="list-container">
        <ui-list-item item-id="2" href="/notes/2">
          <div class="gridcell" role="gridcell">
            <a href="/notes/2">ホバー状態を確認</a>
          </div>
          <div class="gridcell meta" role="gridcell">2024-01-02</div>
          <div class="gridcell meta" role="gridcell">タグ</div>
          <div class="gridcell" role="gridcell"></div>
        </ui-list-item>
      </div>
    </div>

    <div class="state-group">
      <div class="state-label">Active</div>
      <div class="list-container">
        <ui-list-item item-id="3" href="/notes/3" active>
          <div class="gridcell" role="gridcell">
            <a href="/notes/3">アクティブ状態のアイテム</a>
          </div>
          <div class="gridcell meta" role="gridcell">2024-01-03</div>
          <div class="gridcell meta" role="gridcell">タグ</div>
          <div class="gridcell" role="gridcell"></div>
        </ui-list-item>
      </div>
    </div>
  `,
};

/**
 * アクションボタン付きリストアイテム。
 *
 * 行の右端にアクションボタンを配置できます。
 * デフォルトでは非表示、ホバー・フォーカス・アクティブ時に表示されます。
 */
export const WithActions: Story = {
  args: {
    itemId: '3',
    href: '/notes/3',
    active: false,
  },
  render: (args) => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }

      .action-button {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm, 4px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }

      .action-button:hover {
        background: var(--bg-hover, oklch(0% 0 0 / 0.05));
      }
    </style>

    <div class="list-container">
      <ui-list-item
        item-id="${args.itemId}"
        href="${args.href ?? ''}"
        ?active="${args.active}"
      >
        <div class="gridcell" role="gridcell">
          <a href="${args.href ?? '#'}">アクションボタン付きアイテム</a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-03</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell">
          <button
            slot="actions"
            class="action-button"
            aria-label="詳細メニュー"
            @click="${(e: Event) => {
              e.stopPropagation();
              console.log('Action button clicked');
            }}"
          >
            <iconify-icon icon="lucide:more-horizontal" style="font-size: 16px;"></iconify-icon>
          </button>
        </div>
      </ui-list-item>
    </div>
  `,
};

/**
 * モバイル補足情報付きリストアイテム。
 *
 * モバイル表示で非表示にした列の情報を、プライマリ列内に統合表示できます。
 */
export const MobileSupplement: Story = {
  args: {
    itemId: '4',
    href: '/notes/4',
    active: false,
  },
  render: (args) => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }

      @media (max-width: 768px) {
        .gridcell.meta {
          display: none;
        }
      }

      .mobile-info {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }
    </style>

    <div style="font-size: var(--text-sm, 13px); color: var(--fg-muted, #666); margin-bottom: 1rem;">
      📱 ウィンドウ幅を768px以下にすると、日付とタグが非表示になり、タイトル内に統合表示されます。
    </div>

    <div class="list-container">
      <ui-list-item
        item-id="${args.itemId}"
        href="${args.href ?? ''}"
        ?active="${args.active}"
      >
        <div class="gridcell" role="gridcell">
          <a href="${args.href ?? '#'}">モバイル対応アイテム</a>
          <span slot="mobile-supplement" class="mobile-info">
            ・ 2024-01-04 ・ タグ
          </span>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-04</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell"></div>
      </ui-list-item>
    </div>
  `,
};

/**
 * 長いコンテンツの境界条件テスト。
 *
 * 非常に長いタイトルや大量のタグがある場合の表示を確認します。
 */
export const LongContent: Story = {
  args: {
    itemId: '5',
    href: '/notes/5',
    active: false,
  },
  render: (args) => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 150px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }

      .tags {
        display: flex;
        gap: 4px;
        overflow: hidden;
      }

      .tag {
        display: inline-block;
        padding: 2px 8px;
        background: var(--bg-fill-neutral, oklch(0% 0 0 / 0.05));
        border-radius: var(--radius-sm, 4px);
        font-size: var(--text-xs, 12px);
        white-space: nowrap;
      }
    </style>

    <div style="font-size: var(--text-sm, 13px); color: var(--fg-muted, #666); margin-bottom: 1rem;">
      ⚠️ 境界条件: 非常に長いタイトルや大量のタグがある場合の表示を確認します。
    </div>

    <div class="list-container">
      <ui-list-item
        item-id="${args.itemId}"
        href="${args.href ?? ''}"
        ?active="${args.active}"
      >
        <div class="gridcell" role="gridcell">
          <a href="${args.href ?? '#'}">
            これは非常に長いタイトルのテストケースです。タイトルが長すぎる場合、適切に切り詰められるかを確認します。
          </a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-05</div>
        <div class="gridcell meta" role="gridcell">
          <div class="tags">
            <span class="tag">タグ1</span>
            <span class="tag">タグ2</span>
            <span class="tag">タグ3</span>
            <span class="tag">タグ4</span>
          </div>
        </div>
        <div class="gridcell" role="gridcell"></div>
      </ui-list-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const listItem = canvasElement.querySelector('ui-list-item');
    if (!listItem) {
      throw new Error('ListItem component not found');
    }

    await listItem.updateComplete;

    // テスト: 長いコンテンツでもレイアウトが崩れないこと
    const row = listItem.shadowRoot?.querySelector('[role="row"]');
    if (!row) {
      throw new Error('Row element not found');
    }

    const height = (row as HTMLElement).offsetHeight;
    // 高さが32px〜44pxの範囲内であること（タッチターゲット含む）
    if (height < 32 || height > 50) {
      throw new Error(`Expected height to be between 32-50px, got ${height.toString()}px`);
    }

    console.log('✅ All tests passed for LongContent story');
  },
};

/**
 * 空のコンテンツの境界条件テスト。
 *
 * コンテンツが空またはnullの場合の表示を確認します。
 */
export const EmptyContent: Story = {
  args: {
    itemId: '6',
    href: null,
    active: false,
  },
  render: (args) => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }
    </style>

    <div style="font-size: var(--text-sm, 13px); color: var(--fg-muted, #666); margin-bottom: 1rem;">
      ⚠️ 境界条件: コンテンツが空の場合の表示を確認します。
    </div>

    <div class="list-container">
      <ui-list-item
        item-id="${args.itemId}"
        href="${args.href ?? ''}"
        ?active="${args.active}"
      >
        <div class="gridcell" role="gridcell"></div>
        <div class="gridcell meta" role="gridcell"></div>
        <div class="gridcell meta" role="gridcell"></div>
        <div class="gridcell" role="gridcell"></div>
      </ui-list-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const listItem = canvasElement.querySelector('ui-list-item');
    if (!listItem) {
      throw new Error('ListItem component not found');
    }

    await listItem.updateComplete;

    // テスト: 空のコンテンツでもレイアウトが崩れないこと
    const row = listItem.shadowRoot?.querySelector('[role="row"]');
    if (!row) {
      throw new Error('Row element not found');
    }

    // 高さが最小限維持されていること
    const height = (row as HTMLElement).offsetHeight;
    if (height < 32) {
      throw new Error(`Expected height to be at least 32px, got ${height.toString()}px`);
    }

    console.log('✅ All tests passed for EmptyContent story');
  },
};

/**
 * クリック委譲の動作テスト。
 *
 * 行の余白クリック時に、プライマリリンクへ委譲されることを確認します。
 */
export const ClickDelegation: Story = {
  args: {
    itemId: '7',
    href: '/notes/7',
    active: false,
  },
  render: (args) => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }
    </style>

    <div style="font-size: var(--text-sm, 13px); color: var(--fg-muted, #666); margin-bottom: 1rem;">
      💡 タイトル以外の余白部分をクリックすると、ui-item-click イベントが発火します。
      コンソールでイベントを確認してください。
    </div>

    <div id="click-log" style="padding: 0.75rem; background: var(--bg-surface-2, #f5f5f5); border-radius: var(--radius-md, 6px); margin-bottom: 1rem; font-size: var(--text-sm, 13px);">
      クリックログ: まだクリックされていません
    </div>

    <div class="list-container">
      <ui-list-item
        id="test-item"
        item-id="${args.itemId}"
        href="${args.href ?? ''}"
        ?active="${args.active}"
        @ui-item-click="${(e: CustomEvent<{ itemId: string; event: MouseEvent }>) => {
          const log = document.getElementById('click-log');
          if (log) {
            log.textContent = `クリックログ: アイテムID ${e.detail.itemId} がクリックされました`;
          }
          console.log('ui-item-click:', e.detail);
        }}"
      >
        <div class="gridcell" role="gridcell">
          <a href="${args.href ?? '#'}" @click="${(e: Event) => {
            e.preventDefault();
            const log = document.getElementById('click-log');
            if (log) {
              log.textContent = 'クリックログ: リンクがクリックされました（ページ遷移は無効化）';
            }
          }}">クリック委譲テスト</a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-07</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell"></div>
      </ui-list-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const listItem = canvasElement.querySelector<ListItem>('#test-item');
    if (!listItem) {
      throw new Error('ListItem component not found');
    }

    await listItem.updateComplete;

    const clickEventPromise = new Promise<void>(resolve => {
      listItem.addEventListener(
        'ui-item-click',
        () => {
          resolve();
        },
        { once: true },
      );
    });

    // 行をクリック
    const row = listItem.shadowRoot?.querySelector('[role="row"]') as HTMLElement | null;
    if (!row) {
      throw new Error('Row element not found');
    }
    row.click();
    const clickResult = await Promise.race([
      clickEventPromise.then(() => 'event' as const),
      new Promise<'timeout'>(resolve => {
        setTimeout(() => {
          resolve('timeout');
        }, 100);
      }),
    ]);

    // テスト: イベントが発火されたこと
    if (clickResult === 'timeout') {
      throw new Error('Expected ui-item-click event to be fired');
    }

    console.log('✅ All tests passed for ClickDelegation story');
  },
};

/**
 * 修飾キー押下時の挙動テスト。
 *
 * Cmd/Ctrl キーを押しながらクリックした場合、委譲がキャンセルされます。
 */
export const ModifierKeys: Story = {
  args: {
    itemId: '8',
    href: '/notes/8',
    active: false,
  },
  render: (args) => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }
    </style>

    <div style="font-size: var(--text-sm, 13px); color: var(--fg-muted, #666); margin-bottom: 1rem;">
      💡 修飾キー（Cmd/Ctrl, Shift, Alt）を押しながら行をクリックすると、
      クリック委譲がキャンセルされ、ブラウザのネイティブ動作（別タブで開く等）が維持されます。
    </div>

    <div class="list-container">
      <ui-list-item
        item-id="${args.itemId}"
        href="${args.href ?? ''}"
        ?active="${args.active}"
        @ui-item-click="${(e: CustomEvent) => {
          console.log('ui-item-click fired (should not fire when modifier key is pressed):', e.detail);
        }}"
      >
        <div class="gridcell" role="gridcell">
          <a href="${args.href ?? '#'}">修飾キーテスト（Cmd/Ctrl + クリック）</a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-08</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell"></div>
      </ui-list-item>
    </div>
  `,
};

/**
 * ページネーション時のARIA属性テスト。
 *
 * `aria-rowindex` が正しく設定されることを確認します。
 */
export const PaginationAria: Story = {
  render: () => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        margin-bottom: 0.5rem;
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }
    </style>

    <div style="font-size: var(--text-sm, 13px); color: var(--fg-muted, #666); margin-bottom: 1rem;">
      💡 ページネーション時、各行の <code>aria-rowindex</code> が全体の中での位置を示します。
    </div>

    <div class="list-container">
      <ui-list-item item-id="21" href="/notes/21" row-index="${21}">
        <div class="gridcell" role="gridcell">
          <a href="/notes/21">アイテム 21（全体の21番目）</a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-21</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell"></div>
      </ui-list-item>
    </div>

    <div class="list-container">
      <ui-list-item item-id="22" href="/notes/22" row-index="${22}">
        <div class="gridcell" role="gridcell">
          <a href="/notes/22">アイテム 22（全体の22番目）</a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-22</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell"></div>
      </ui-list-item>
    </div>

    <div class="list-container">
      <ui-list-item item-id="23" href="/notes/23" row-index="${23}">
        <div class="gridcell" role="gridcell">
          <a href="/notes/23">アイテム 23（全体の23番目）</a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-23</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell"></div>
      </ui-list-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const listItems = canvasElement.querySelectorAll<ListItem>('ui-list-item');
    if (listItems.length !== 3) {
      throw new Error(`Expected 3 list items, got ${listItems.length.toString()}`);
    }

    await Promise.all(Array.from(listItems).map(item => item.updateComplete));

    // テスト: aria-rowindex が正しく設定されていること
    const expectedIndices = [21, 22, 23];
    listItems.forEach((item, index) => {
      const expectedIndex = expectedIndices[index];
      if (expectedIndex === undefined) {
        throw new Error(`Missing expected index at position ${index.toString()}`);
      }
      const row = item.shadowRoot?.querySelector('[role="row"]');
      if (!row) {
        throw new Error('Row element not found');
      }
      const rowIndex = row.getAttribute('aria-rowindex');
      if (rowIndex !== String(expectedIndex)) {
        throw new Error(`Expected aria-rowindex to be ${String(expectedIndex)}, got ${rowIndex ?? 'null'}`);
      }
    });

    console.log('✅ All tests passed for PaginationAria story');
  },
};

/**
 * Forced Colors Mode での表示確認。
 *
 * 高コントラストモード環境での表示を確認します。
 */
export const ForcedColorsMode: Story = {
  render: () => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        margin-bottom: 0.5rem;
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }

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
        <li><strong>Windows</strong>: 設定 > アクセシビリティ > コントラストテーマ で高コントラストモードを有効化</li>
        <li><strong>開発者ツール</strong>: Chrome DevTools > Rendering > Emulate CSS media feature forced-colors: active</li>
      </ul>
    </div>

    <div class="list-container">
      <ui-list-item item-id="1" href="/notes/1">
        <div class="gridcell" role="gridcell">
          <a href="/notes/1">通常状態のアイテム</a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-01</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell"></div>
      </ui-list-item>
    </div>

    <div class="list-container">
      <ui-list-item item-id="2" href="/notes/2" active>
        <div class="gridcell" role="gridcell">
          <a href="/notes/2">アクティブ状態のアイテム</a>
        </div>
        <div class="gridcell meta" role="gridcell">2024-01-02</div>
        <div class="gridcell meta" role="gridcell">タグ</div>
        <div class="gridcell" role="gridcell"></div>
      </ui-list-item>
    </div>
  `,
};

/**
 * Reduced Motion での表示確認。
 *
 * prefers-reduced-motion 環境下でのアニメーション抑制を確認します。
 */
export const ReducedMotion: Story = {
  render: () => html`
    <style>
      .list-container {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 120px 80px 40px;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
      }

      .gridcell {
        padding: 0 var(--space-2, 8px);
        font-size: var(--text-base, 14px);
        color: var(--fg-default, oklch(20% 0.01 250));
      }

      .gridcell a {
        color: inherit;
        text-decoration: none;
      }

      .gridcell.meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, oklch(48% 0.01 250));
      }

      .reduced-motion-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1.5rem;
      }

      /* このストーリー内で reduced-motion を強制 */
      @media (prefers-reduced-motion: no-preference) {
        .reduced-motion-showcase ui-list-item {
          --duration-fast: 0.01ms;
        }
      }
    </style>

    <div class="reduced-motion-info">
      <strong>確認方法</strong>:
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        <li><strong>Windows</strong>: 設定 > アクセシビリティ > 視覚効果 > アニメーション効果をオフ</li>
        <li><strong>macOS</strong>: システム設定 > アクセシビリティ > ディスプレイ > 視差効果を減らす</li>
        <li><strong>このストーリー</strong>: reduced-motion を強制的にシミュレートしています</li>
      </ul>
      <p style="margin: 0.5rem 0 0 0;">
        ホバー時のトランジションが即座に適用されることを確認してください。
      </p>
    </div>

    <div class="reduced-motion-showcase">
      <div class="list-container">
        <ui-list-item item-id="1" href="/notes/1">
          <div class="gridcell" role="gridcell">
            <a href="/notes/1">Reduced Motion テスト（ホバーしてみる）</a>
          </div>
          <div class="gridcell meta" role="gridcell">2024-01-01</div>
          <div class="gridcell meta" role="gridcell">タグ</div>
          <div class="gridcell" role="gridcell"></div>
        </ui-list-item>
      </div>
    </div>
  `,
};
