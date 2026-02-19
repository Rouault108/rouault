import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './list';
import type { ColumnDef, List, ListItemData } from './list';

// ────────────────────────────────────────────
// 共通テストデータ
// ────────────────────────────────────────────

const defaultColumns: ColumnDef[] = [
  { id: 'title', label: 'タイトル', width: '1fr', primary: true, sortable: false },
  { id: 'date', label: '日付', width: '100px', sortable: true, hideOnMobile: true },
  { id: 'tags', label: 'タグ', width: '120px', sortable: false, hideOnMobile: true },
];

const defaultItems: ListItemData[] = [
  { id: '1', href: '/notes/1', title: 'はじめてのノート', date: '2024-01-01', tags: 'lit, web' },
  { id: '2', href: '/notes/2', title: '設計ドキュメント', date: '2024-01-15', tags: 'css, a11y' },
  { id: '3', href: '/notes/3', title: 'リファクタリングメモ', date: '2024-02-03', tags: 'ts' },
  { id: '4', href: '/notes/4', title: 'アクセシビリティ調査', date: '2024-03-10', tags: 'wcag' },
  { id: '5', href: '/notes/5', title: 'パフォーマンス最適化', date: '2024-04-22', tags: 'perf' },
];

/** ListItemData の date フィールドを安全に文字列として取得 */
const getDateString = (item: ListItemData): string =>
  typeof item['date'] === 'string' ? item['date'] : '';

/**
 * ## リストビュー (List View)
 *
 * WAI-ARIA Grid Pattern (Roving Tabindex) に準拠した高密度リストコンポーネントです。
 *
 * ### 設計原則
 *
 * - **High Density**: Linear Style の情報密度（行高さ32px）
 * - **Browsing First**: 閲覧を最優先とした設計
 * - **Event Delegation**: 親要素での一括イベント管理
 * - **Progressive Enhancement**: CSS Subgrid 対応/非対応環境の両方で動作
 *
 * ### ソート処理
 *
 * ソートは **外部委譲** です。`ui-sort-change` イベントを購読し、
 * 親コンポーネントが `items` を並び替えて再代入してください。
 *
 * ### キーボード操作
 *
 * | キー | 動作 |
 * |------|------|
 * | `ArrowDown/Up` | 前後の行へ移動 |
 * | `Home/End` | 最初/最後の行へ移動 |
 * | `PageDown/Up` | 10件単位でスクロール移動 |
 * | `Enter` | プライマリリンクへ遷移 |
 * | `Space` | ブラウザスクロール |
 * | `Shift+Space` | Quick Look (プレビュー) |
 * | `Shift+F10` | コンテキストメニュー |
 */
const meta: Meta<List> = {
  title: 'Components/List',
  component: 'ui-list',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
リストビューコンポーネントは、WAI-ARIA Grid Pattern に準拠した高密度の一覧表示UIです。

## 使用方法

\`\`\`html
<ui-list
  .columns="\${columns}"
  .items="\${items}"
  @ui-sort-change="\${handleSort}"
  @ui-active-change="\${handleActiveChange}"
></ui-list>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    items: {
      control: 'object',
      description: 'データ配列。各アイテムは一意の `id` を持つ必要があります。',
    },
    columns: {
      control: 'object',
      description: '列定義',
    },
    activeRow: {
      control: 'text',
      description: '現在アクティブな行の ID',
    },
    sortKey: {
      control: 'text',
      description: 'ソート基準列 ID',
    },
    sortDirection: {
      control: { type: 'select' },
      options: ['asc', 'desc'],
      description: 'ソート方向',
    },
  },
};

export default meta;
type Story = StoryObj<List>;

// ────────────────────────────────────────────
// 1. Default: 基本的な使用例
// ────────────────────────────────────────────

/**
 * 5件のアイテムと3列（タイトル・日付・タグ）を持つ標準的なリストです。
 *
 * ### 確認ポイント
 * - ヘッダー行が列定義通りに描画されること
 * - データ行が items 配列に対応して描画されること
 * - タイトル列にリンクが含まれること
 * - 日付・タグ列がメタスタイル（小さめ・グレー）で表示されること
 */
export const Default: Story = {
  args: {
    columns: defaultColumns,
    items: defaultItems,
  },
  render: args => html`
    <ui-list .columns="${args.columns}" .items="${args.items}"></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    // テスト: グリッドが描画されていること
    const grid = list.shadowRoot?.querySelector('[role="grid"]');
    if (!grid) throw new Error('[role="grid"] が見つかりません');

    // テスト: aria-colcount が全列数 + アクション列を反映していること（3列 + 1 = 4）
    const ariaColCount = grid.getAttribute('aria-colcount');
    if (ariaColCount !== '4') {
      throw new Error(`aria-colcount が 4 であるべきですが "${ariaColCount ?? 'null'}" です`);
    }

    // テスト: ヘッダーセルが列定義通りに描画されていること（3列 + アクション列 = 4つ）
    const columnHeaders = list.shadowRoot?.querySelectorAll('[role="columnheader"]');
    if (columnHeaders?.length !== 4) {
      throw new Error(`ヘッダーセル数が 4 であるべきですが ${String(columnHeaders?.length)} です`);
    }

    // テスト: データ行が5件描画されていること
    const dataRows = list.shadowRoot?.querySelectorAll('[role="row"][data-item-id]');
    if (dataRows?.length !== 5) {
      throw new Error(`データ行が 5 行であるべきですが ${String(dataRows?.length)} 行です`);
    }

    // テスト: プライマリセルにリンクが含まれること
    const firstRow = dataRows[0];
    const primaryLink = firstRow?.querySelector<HTMLAnchorElement>('a.primary-link');
    if (!primaryLink) throw new Error('プライマリリンク <a> が見つかりません');
    if (primaryLink.getAttribute('href') !== '/notes/1') {
      throw new Error(`href が "/notes/1" であるべきですが "${primaryLink.getAttribute('href') ?? 'null'}" です`);
    }

    console.log('✅ Default: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 2. Empty: 空状態
// ────────────────────────────────────────────

/**
 * items が空配列の場合の表示です。
 *
 * ### 確認ポイント
 * - グリッドの外に `role="status"` の空状態メッセージが表示されること
 * - `aria-live="polite"` が設定されており、動的な変化を通知できること
 */
export const Empty: Story = {
  args: {
    columns: defaultColumns,
    items: [],
  },
  render: args => html`
    <ui-list .columns="${args.columns}" .items="${args.items}"></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    // テスト: データ行が0件であること
    const dataRows = list.shadowRoot?.querySelectorAll('[role="row"][data-item-id]');
    if (dataRows?.length !== 0) {
      throw new Error(`データ行が 0 行であるべきですが ${String(dataRows?.length)} 行です`);
    }

    // テスト: 空状態メッセージが表示されること
    const emptyState = list.shadowRoot?.querySelector('[role="status"]');
    if (!emptyState) throw new Error('[role="status"] の空状態要素が見つかりません');

    // テスト: aria-live="polite" が設定されていること
    if (emptyState.getAttribute('aria-live') !== 'polite') {
      throw new Error('aria-live="polite" が設定されていません');
    }

    // テスト: grid 要素は存在すること
    const grid = list.shadowRoot?.querySelector('[role="grid"]');
    if (!grid) throw new Error('空でも [role="grid"] は存在すべきです');

    console.log('✅ Empty: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 3. SingleItem: 境界条件 - 1件のみ
// ────────────────────────────────────────────

/**
 * **境界条件**: アイテムが1件のみの場合。
 *
 * ArrowUp/Down が範囲外に出ないことを確認します。
 */
export const SingleItem: Story = {
  args: {
    columns: defaultColumns,
    items: [{ id: '1', href: '/notes/1', title: '唯一のノート', date: '2024-01-01', tags: 'test' }],
    activeRow: '1',
  },
  render: args => html`
    <ui-list
      .columns="${args.columns}"
      .items="${args.items}"
      .activeRow="${args.activeRow ?? null}"
    ></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    // テスト: 1件のみ描画されていること
    const dataRows = list.shadowRoot?.querySelectorAll('[role="row"][data-item-id]');
    if (dataRows?.length !== 1) {
      throw new Error(`データ行が 1 行であるべきですが ${String(dataRows?.length)} 行です`);
    }

    // ArrowDown: 1件しかないので ui-active-change は発火しない
    let activeChangeCount = 0;
    list.addEventListener('ui-active-change', () => {
      activeChangeCount++;
    });

    const activeRowEl = list.shadowRoot?.querySelector<HTMLElement>('[data-item-id="1"]');
    const primaryCell = activeRowEl?.querySelector<HTMLElement>('.cell--primary');
    primaryCell?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await list.updateComplete;

    if (activeChangeCount !== 0) {
      throw new Error('1件のみの場合、ArrowDown で ui-active-change は発火しないはずです');
    }

    console.log('✅ SingleItem: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 4. SortableColumns: ソータブル列のデフォルト表示
// ────────────────────────────────────────────

/**
 * ソータブル列を持つリストです。未ソート状態での初期表示を確認します。
 *
 * ### 確認ポイント
 * - ソータブル列ヘッダーに `aria-sort="none"` が設定されること
 * - 非ソータブル列に `aria-sort` が設定されないこと
 * - ソート可能列ヘッダーが `tabindex="0"` を持ちフォーカス可能であること
 */
export const SortableColumns: Story = {
  args: {
    columns: [
      { id: 'title', label: 'タイトル', width: '1fr', primary: true, sortable: false },
      { id: 'date', label: '日付', width: '100px', sortable: true },
      { id: 'updatedAt', label: '更新日', width: '100px', sortable: true },
    ],
    items: defaultItems,
  },
  render: args => html`
    <ui-list .columns="${args.columns}" .items="${args.items}"></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    const columnHeaders = list.shadowRoot?.querySelectorAll('[role="columnheader"]');
    if (!columnHeaders) throw new Error('columnheader が見つかりません');

    // テスト: タイトル列（非ソータブル）に aria-sort がないこと
    const titleHeader = columnHeaders[0];
    if (titleHeader?.hasAttribute('aria-sort')) {
      throw new Error('非ソータブル列に aria-sort が設定されています');
    }

    // テスト: 日付列（ソータブル）に aria-sort="none" が設定されること
    const dateHeader = columnHeaders[1];
    if (dateHeader?.getAttribute('aria-sort') !== 'none') {
      throw new Error(`日付列の aria-sort が "none" であるべきですが "${dateHeader?.getAttribute('aria-sort') ?? 'null'}" です`);
    }

    // テスト: ソータブル列ヘッダーが tabindex="0" を持つこと
    if (dateHeader.getAttribute('tabindex') !== '0') {
      throw new Error('ソータブル列ヘッダーの tabindex が "0" であるべきです');
    }

    // テスト: 非ソータブル列ヘッダーに tabindex がないこと
    if (titleHeader?.hasAttribute('tabindex')) {
      throw new Error('非ソータブル列ヘッダーに tabindex が設定されています');
    }

    console.log('✅ SortableColumns: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 5. SortedAscending: ソート済み（昇順）状態
// ────────────────────────────────────────────

/**
 * 日付列で昇順ソートが適用された状態です。
 *
 * ### 確認ポイント
 * - ソート対象列の `aria-sort="ascending"` が設定されること
 * - ソート対象列に `header-cell--sorted` クラスが付与されること
 * - チェブロン上向きアイコンが表示されること
 */
export const SortedAscending: Story = {
  args: {
    columns: defaultColumns,
    items: [...defaultItems].sort((a, b) => getDateString(a).localeCompare(getDateString(b))),
    sortKey: 'date',
    sortDirection: 'asc',
  },
  render: args => html`
    <ui-list
      .columns="${args.columns}"
      .items="${args.items}"
      .sortKey="${args.sortKey ?? null}"
      .sortDirection="${args.sortDirection ?? null}"
    ></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    const columnHeaders = list.shadowRoot?.querySelectorAll('[role="columnheader"]');
    if (!columnHeaders) throw new Error('columnheader が見つかりません');

    // テスト: 日付列に aria-sort="ascending" が設定されること
    const dateHeader = columnHeaders[1];
    if (dateHeader?.getAttribute('aria-sort') !== 'ascending') {
      throw new Error(`aria-sort が "ascending" であるべきですが "${dateHeader?.getAttribute('aria-sort') ?? 'null'}" です`);
    }

    // テスト: ソート対象列に --sorted クラスが付与されること
    if (!dateHeader.classList.contains('header-cell--sorted')) {
      throw new Error('ソート対象列に header-cell--sorted クラスがありません');
    }

    // テスト: chevron-up アイコンが描画されること
    const sortIcon = dateHeader.querySelector('iconify-icon');
    if (!sortIcon) throw new Error('ソートアイコンが見つかりません');
    if (sortIcon.getAttribute('icon') !== 'lucide:chevron-up') {
      throw new Error(`ソートアイコンが "lucide:chevron-up" であるべきですが "${sortIcon.getAttribute('icon') ?? 'null'}" です`);
    }

    console.log('✅ SortedAscending: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 6. SortedDescending: ソート済み（降順）状態
// ────────────────────────────────────────────

/**
 * 日付列で降順ソートが適用された状態です。
 */
export const SortedDescending: Story = {
  args: {
    columns: defaultColumns,
    items: [...defaultItems].sort((a, b) => getDateString(b).localeCompare(getDateString(a))),
    sortKey: 'date',
    sortDirection: 'desc',
  },
  render: args => html`
    <ui-list
      .columns="${args.columns}"
      .items="${args.items}"
      .sortKey="${args.sortKey ?? null}"
      .sortDirection="${args.sortDirection ?? null}"
    ></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    const columnHeaders = list.shadowRoot?.querySelectorAll('[role="columnheader"]');
    const dateHeader = columnHeaders?.[1];

    // テスト: aria-sort="descending"
    if (dateHeader?.getAttribute('aria-sort') !== 'descending') {
      throw new Error(`aria-sort が "descending" であるべきですが "${dateHeader?.getAttribute('aria-sort') ?? 'null'}" です`);
    }

    // テスト: chevron-down アイコン
    const sortIcon = dateHeader.querySelector('iconify-icon');
    if (sortIcon?.getAttribute('icon') !== 'lucide:chevron-down') {
      throw new Error(`ソートアイコンが "lucide:chevron-down" であるべきですが "${sortIcon?.getAttribute('icon') ?? 'null'}" です`);
    }

    console.log('✅ SortedDescending: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 7. SortCycling: ソートサイクル（なし→昇順→降順→なし）
// ────────────────────────────────────────────

/**
 * ヘッダーをクリックするとソートが `なし → 昇順 → 降順 → なし` の順に循環します。
 *
 * ### ソートは外部委譲
 * このコンポーネントは `items` を並び替えません。
 * `ui-sort-change` イベントを購読した親が `items` を再代入する責務を持ちます。
 */
export const SortCycling: Story = {
  render: () => {
    const columns: ColumnDef[] = [
      { id: 'title', label: 'タイトル', width: '1fr', primary: true },
      { id: 'date', label: '日付', width: '100px', sortable: true },
    ];

    return html`
      <div id="sort-log" style="
        padding: 0.75rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1rem;
        font-family: monospace;
      ">
        ヘッダーをクリックしてソートサイクルを確認してください
      </div>

      <ui-list
        id="sortable-list"
        .columns="${columns}"
        .items="${defaultItems}"
        @ui-sort-change="${(e: CustomEvent<{ key: string | null; direction: string | null }>) => {
          const log = document.getElementById('sort-log');
          if (log) {
            log.textContent = `ui-sort-change → key: "${String(e.detail.key)}", direction: "${String(e.detail.direction)}"`;
          }
          const listEl = document.getElementById('sortable-list') as List | null;
          if (listEl) {
            listEl.sortKey = e.detail.key;
            listEl.sortDirection = e.detail.direction as 'asc' | 'desc' | null;
          }
        }}"
      ></ui-list>
    `;
  },
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('#sortable-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    const events: { key: string | null; direction: string | null }[] = [];
    list.addEventListener('ui-sort-change', (e: Event) => {
      const detail = (e as CustomEvent<{ key: string | null; direction: string | null }>).detail;
      events.push(detail);
    });

    const dateHeader = list.shadowRoot?.querySelectorAll('[role="columnheader"]')[1] as HTMLElement | undefined;
    if (!dateHeader) throw new Error('日付ヘッダーが見つかりません');

    // 1回目クリック: なし → 昇順
    dateHeader.click();
    await list.updateComplete;

    const event1 = events[0];
    if (event1?.key !== 'date' || event1.direction !== 'asc') {
      throw new Error(`1回目: { key: "date", direction: "asc" } が期待されますが ${JSON.stringify(event1)} です`);
    }

    // 2回目クリック: 昇順 → 降順
    dateHeader.click();
    await list.updateComplete;

    const event2 = events[1];
    if (event2?.key !== 'date' || event2.direction !== 'desc') {
      throw new Error(`2回目: { key: "date", direction: "desc" } が期待されますが ${JSON.stringify(event2)} です`);
    }

    // 3回目クリック: 降順 → なし（リセット）
    dateHeader.click();
    await list.updateComplete;

    const event3 = events[2];
    if (event3?.key !== null || event3.direction !== null) {
      throw new Error(`3回目: { key: null, direction: null } が期待されますが ${JSON.stringify(event3)} です`);
    }

    // 4回目クリック: なし → 昇順（サイクル継続）
    dateHeader.click();
    await list.updateComplete;

    const event4 = events[3];
    if (event4?.key !== 'date' || event4.direction !== 'asc') {
      throw new Error(`4回目: サイクルが最初に戻り "asc" が期待されますが ${JSON.stringify(event4)} です`);
    }

    console.log('✅ SortCycling: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 8. ActiveRow: アクティブ行の状態表示
// ────────────────────────────────────────────

/**
 * `active-row` プロパティでアクティブ行を指定した状態です。
 *
 * ### 確認ポイント
 * - アクティブ行の `aria-selected="true"` が設定されること
 * - アクティブ行のプライマリセルに `tabindex="0"` が設定されること（Roving Tabindex）
 * - 他の行のプライマリセルは `tabindex="-1"` であること
 */
export const ActiveRow: Story = {
  args: {
    columns: defaultColumns,
    items: defaultItems,
    activeRow: '3',
  },
  render: args => html`
    <ui-list
      .columns="${args.columns}"
      .items="${args.items}"
      .activeRow="${args.activeRow ?? null}"
    ></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    // テスト: アクティブ行に aria-selected="true" が設定されること
    const activeRowEl = list.shadowRoot?.querySelector('[data-item-id="3"]');
    if (!activeRowEl) throw new Error('[data-item-id="3"] の行が見つかりません');

    if (activeRowEl.getAttribute('aria-selected') !== 'true') {
      throw new Error('アクティブ行の aria-selected が "true" でありません');
    }

    // テスト: data-row--active クラスが付与されること
    if (!activeRowEl.classList.contains('data-row--active')) {
      throw new Error('data-row--active クラスが付与されていません');
    }

    // テスト: アクティブ行のプライマリセルに tabindex="0" が設定されること
    const activePrimaryCell = activeRowEl.querySelector('.cell--primary');
    if (activePrimaryCell?.getAttribute('tabindex') !== '0') {
      throw new Error('アクティブ行のプライマリセルの tabindex が "0" ではありません');
    }

    // テスト: 非アクティブ行のプライマリセルは tabindex="-1"
    const inactiveRow = list.shadowRoot?.querySelector('[data-item-id="1"]');
    const inactivePrimaryCell = inactiveRow?.querySelector('.cell--primary');
    if (inactivePrimaryCell?.getAttribute('tabindex') !== '-1') {
      throw new Error('非アクティブ行のプライマリセルの tabindex が "-1" ではありません');
    }

    console.log('✅ ActiveRow: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 9. KeyboardNavigation: キーボード操作テスト
// ────────────────────────────────────────────

/**
 * ArrowDown/Up・Home/End によるキーボードナビゲーションを確認します。
 *
 * ### 確認ポイント
 * - ArrowDown で次の行がアクティブになり `ui-active-change` が発火すること
 * - ArrowUp で前の行がアクティブになること
 * - Home で最初の行に移動すること
 * - End で最後の行に移動すること
 */
export const KeyboardNavigation: Story = {
  render: () => html`
    <div id="nav-log" style="
      padding: 0.75rem;
      background: var(--bg-surface-2, #f5f5f5);
      border-radius: var(--radius-md, 6px);
      font-size: var(--text-sm, 13px);
      margin-bottom: 1rem;
    ">
      アクティブ行: なし
    </div>

    <ui-list
      id="nav-list"
      .columns="${defaultColumns}"
      .items="${defaultItems}"
      active-row="1"
      @ui-active-change="${(e: CustomEvent<{ rowId: string }>) => {
        const log = document.getElementById('nav-log');
        if (log) {
          log.textContent = `アクティブ行: ${e.detail.rowId}`;
        }
        const listEl = document.getElementById('nav-list') as List | null;
        if (listEl) listEl.activeRow = e.detail.rowId;
      }}"
    ></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('#nav-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    const activeChangeEvents: string[] = [];
    list.addEventListener('ui-active-change', (e: Event) => {
      activeChangeEvents.push((e as CustomEvent<{ rowId: string }>).detail.rowId);
    });

    const getActivePrimaryCell = (): HTMLElement | null => {
      const activeId = list.activeRow;
      if (!activeId) return null;
      const rowEl = list.shadowRoot?.querySelector<HTMLElement>(`[data-item-id="${activeId}"]`);
      return rowEl?.querySelector<HTMLElement>('.cell--primary') ?? null;
    };

    if (list.activeRow !== '1') throw new Error('初期 activeRow が "1" ではありません');

    // ArrowDown: 1 → 2
    getActivePrimaryCell()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await list.updateComplete;

    if (activeChangeEvents[0] !== '2') {
      throw new Error(`ArrowDown で "2" に移動すべきですが "${activeChangeEvents[0] ?? 'なし'}" です`);
    }

    // ArrowDown: 2 → 3
    getActivePrimaryCell()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await list.updateComplete;

    if (activeChangeEvents[1] !== '3') {
      throw new Error(`2回目 ArrowDown で "3" に移動すべきですが "${activeChangeEvents[1] ?? 'なし'}" です`);
    }

    // ArrowUp: 3 → 2
    getActivePrimaryCell()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await list.updateComplete;

    if (activeChangeEvents[2] !== '2') {
      throw new Error(`ArrowUp で "2" に移動すべきですが "${activeChangeEvents[2] ?? 'なし'}" です`);
    }

    // End: 最後の行（id: '5'）へ
    getActivePrimaryCell()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await list.updateComplete;

    const afterEnd = activeChangeEvents[activeChangeEvents.length - 1];
    if (afterEnd !== '5') {
      throw new Error(`End で "5" に移動すべきですが "${afterEnd ?? 'なし'}" です`);
    }

    // Home: 最初の行（id: '1'）へ
    getActivePrimaryCell()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await list.updateComplete;

    const afterHome = activeChangeEvents[activeChangeEvents.length - 1];
    if (afterHome !== '1') {
      throw new Error(`Home で "1" に移動すべきですが "${afterHome ?? 'なし'}" です`);
    }

    console.log('✅ KeyboardNavigation: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 10. QuickLookPreview: Shift+Space でプレビュー要求
// ────────────────────────────────────────────

/**
 * アクティブ行で `Shift+Space` を押すと `ui-preview-request` イベントが発火します。
 *
 * Space 単体はブラウザのスクロールに使用するため `preventDefault()` しません。
 */
export const QuickLookPreview: Story = {
  render: () => html`
    <div id="preview-log" style="
      padding: 0.75rem;
      background: var(--bg-surface-2, #f5f5f5);
      border-radius: var(--radius-md, 6px);
      font-size: var(--text-sm, 13px);
      margin-bottom: 1rem;
    ">
      Shift+Space で Quick Look を要求してください
    </div>

    <ui-list
      id="preview-list"
      .columns="${defaultColumns}"
      .items="${defaultItems}"
      active-row="2"
      @ui-preview-request="${(e: CustomEvent<{ rowId: string }>) => {
        const log = document.getElementById('preview-log');
        if (log) {
          log.textContent = `ui-preview-request → rowId: "${e.detail.rowId}"`;
        }
      }}"
    ></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('#preview-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    const previewEvents: string[] = [];
    list.addEventListener('ui-preview-request', (e: Event) => {
      previewEvents.push((e as CustomEvent<{ rowId: string }>).detail.rowId);
    });

    const activeRow = list.shadowRoot?.querySelector<HTMLElement>('[data-item-id="2"]');
    const primaryCell = activeRow?.querySelector<HTMLElement>('.cell--primary');
    if (!primaryCell) throw new Error('アクティブ行のプライマリセルが見つかりません');

    // Shift+Space = Quick Look
    primaryCell.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', shiftKey: true, bubbles: true }),
    );
    await list.updateComplete;

    if (previewEvents.length !== 1) {
      throw new Error(`Shift+Space で ui-preview-request が1回発火すべきですが ${String(previewEvents.length)} 回です`);
    }

    if (previewEvents[0] !== '2') {
      throw new Error(`rowId が "2" であるべきですが "${previewEvents[0] ?? 'なし'}" です`);
    }

    // Space のみでは発火しないこと（独立したリスナーで確認）
    const spaceOnlyEvents: string[] = [];
    list.addEventListener('ui-preview-request', (e: Event) => {
      spaceOnlyEvents.push((e as CustomEvent<{ rowId: string }>).detail.rowId);
    });

    primaryCell.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', shiftKey: false, bubbles: true }),
    );
    await list.updateComplete;

    if (spaceOnlyEvents.length !== 0) {
      throw new Error('Space のみでは ui-preview-request が発火しないはずです');
    }

    console.log('✅ QuickLookPreview: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 11. ContextMenu: 右クリック でコンテキストメニュー
// ────────────────────────────────────────────

/**
 * 行を右クリックすると `ui-context-request` イベントが発火します。
 *
 * ### 確認ポイント
 * - イベント detail に `rowId` と `anchor: { x, y }` が含まれること
 */
export const ContextMenu: Story = {
  render: () => html`
    <div id="context-log" style="
      padding: 0.75rem;
      background: var(--bg-surface-2, #f5f5f5);
      border-radius: var(--radius-md, 6px);
      font-size: var(--text-sm, 13px);
      margin-bottom: 1rem;
    ">
      行を右クリックしてコンテキストメニューを要求してください
    </div>

    <ui-list
      id="context-list"
      .columns="${defaultColumns}"
      .items="${defaultItems}"
      @ui-context-request="${(e: CustomEvent<{ rowId: string; anchor: { x: number; y: number } }>) => {
        const log = document.getElementById('context-log');
        if (log) {
          log.textContent = `ui-context-request → rowId: "${e.detail.rowId}", anchor: (${String(e.detail.anchor.x)}, ${String(e.detail.anchor.y)})`;
        }
      }}"
    ></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('#context-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    const contextEvents: { rowId: string; anchor: { x: number; y: number } }[] = [];
    list.addEventListener('ui-context-request', (e: Event) => {
      contextEvents.push(
        (e as CustomEvent<{ rowId: string; anchor: { x: number; y: number } }>).detail,
      );
    });

    const firstRow = list.shadowRoot?.querySelector<HTMLElement>('[data-item-id="1"]');
    if (!firstRow) throw new Error('[data-item-id="1"] の行が見つかりません');

    firstRow.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }),
    );
    await list.updateComplete;

    if (contextEvents.length !== 1) {
      throw new Error('右クリックで ui-context-request が発火すべきです');
    }

    const firstEvent = contextEvents[0];
    if (!firstEvent) throw new Error('コンテキストメニューイベントが取得できません');

    if (firstEvent.rowId !== '1') {
      throw new Error(`rowId が "1" であるべきですが "${firstEvent.rowId}" です`);
    }

    if (firstEvent.anchor.x !== 100 || firstEvent.anchor.y !== 200) {
      throw new Error(`anchor が { x: 100, y: 200 } であるべきですが ${JSON.stringify(firstEvent.anchor)} です`);
    }

    console.log('✅ ContextMenu: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 12. ItemWithoutHref: href なしのアイテム（境界条件）
// ────────────────────────────────────────────

/**
 * **境界条件**: `href` を持たないアイテムの表示。
 *
 * href がない行はリンクではなく `<span>` で表示されます。
 */
export const ItemWithoutHref: Story = {
  args: {
    columns: defaultColumns,
    items: [
      { id: '1', href: '/notes/1', title: 'リンクあり', date: '2024-01-01', tags: 'link' },
      { id: '2', title: 'リンクなし（href なし）', date: '2024-01-02', tags: 'no-link' },
    ],
  },
  render: args => html`
    <ui-list .columns="${args.columns}" .items="${args.items}"></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    // テスト: href ありのアイテムは <a> タグで描画されること
    const firstRow = list.shadowRoot?.querySelector('[data-item-id="1"]');
    const firstLink = firstRow?.querySelector<HTMLAnchorElement>('a.primary-link');
    if (!firstLink) throw new Error('href ありのアイテムに <a> タグがありません');

    // テスト: href なしのアイテムは <span> で描画されること
    const secondRow = list.shadowRoot?.querySelector('[data-item-id="2"]');
    const secondLink = secondRow?.querySelector<HTMLAnchorElement>('a.primary-link');
    const secondSpan = secondRow?.querySelector<HTMLElement>('span.primary-link');

    if (secondLink) {
      throw new Error('href なしのアイテムに <a> タグが描画されるべきではありません');
    }
    if (!secondSpan) {
      throw new Error('href なしのアイテムに <span> タグが描画されるべきです');
    }

    console.log('✅ ItemWithoutHref: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 13. ClickDelegation: 行クリック委譲
// ────────────────────────────────────────────

/**
 * 行の余白クリックをプライマリリンクへ委譲する動作を確認します。
 *
 * ### 委譲がキャンセルされる条件（境界条件）
 * - 修飾キー押下（Ctrl/Cmd/Alt）
 * - 中クリック
 * - `<a>` / `<button>` への直接クリック
 */
export const ClickDelegation: Story = {
  render: () => html`
    <div id="click-log" style="
      padding: 0.75rem;
      background: var(--bg-surface-2, #f5f5f5);
      border-radius: var(--radius-md, 6px);
      font-size: var(--text-sm, 13px);
      margin-bottom: 1rem;
    ">
      行をクリックしてください
    </div>

    <ui-list
      id="click-list"
      .columns="${defaultColumns}"
      .items="${defaultItems}"
      @ui-active-change="${(e: CustomEvent<{ rowId: string }>) => {
        const log = document.getElementById('click-log');
        if (log) {
          log.textContent = `クリック → rowId: "${e.detail.rowId}"`;
        }
      }}"
    ></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('#click-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    // 修飾キー押下時はアクティブ行が変わらないこと
    list.activeRow = '1';
    await list.updateComplete;

    const prevActiveRow = list.activeRow;

    const secondRow = list.shadowRoot?.querySelector<HTMLElement>('[data-item-id="2"]');
    const secondMetaCell = secondRow?.querySelector<HTMLElement>('.cell--meta');

    secondMetaCell?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true, button: 0 }),
    );
    await list.updateComplete;

    if (list.activeRow !== prevActiveRow) {
      throw new Error('修飾キー押下時はアクティブ行が変わらないはずです');
    }

    console.log('✅ ClickDelegation: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 14. MobileColumns: モバイルでの列非表示（視覚確認）
// ────────────────────────────────────────────

/**
 * `hideOnMobile: true` の列をモバイル幅（768px以下）で非表示にします。
 *
 * ### 確認ポイント
 * - `aria-colcount` は論理的な全列数（非表示含む）を維持すること
 *
 * ### 確認方法
 * ブラウザウィンドウを768px以下に縮小して確認してください。
 */
export const MobileColumns: Story = {
  render: () => html`
    <div style="font-size: var(--text-sm, 13px); color: var(--fg-muted, #666); margin-bottom: 1rem;">
      ウィンドウ幅を768px以下に縮小すると、日付・タグ列が非表示になります。
    </div>
    <ui-list .columns="${defaultColumns}" .items="${defaultItems}"></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    // テスト: aria-colcount が論理的な全列数（3列 + アクション = 4）を維持すること
    const grid = list.shadowRoot?.querySelector('[role="grid"]');
    const ariaColCount = grid?.getAttribute('aria-colcount');

    if (ariaColCount !== '4') {
      throw new Error(`aria-colcount が 4 であるべきですが "${ariaColCount ?? 'null'}" です`);
    }

    console.log('✅ MobileColumns: テストを通過しました（視覚確認は手動で行ってください）');
  },
};

// ────────────────────────────────────────────
// 15. LargeDataset: 大量データのパフォーマンス確認
// ────────────────────────────────────────────

/**
 * **パフォーマンス境界条件**: 200件のアイテムを表示します。
 *
 * `content-visibility: auto` により画面外のレンダリングコストを最適化します。
 * 全件が DOM 上に存在するため `Ctrl+F` によるブラウザ検索が有効です。
 */
export const LargeDataset: Story = {
  render: () => {
    const topics = ['Lit', 'TypeScript', 'CSS Grid', 'WAI-ARIA', 'Storybook'];
    const tagNames = ['lit', 'ts', 'css', 'a11y', 'perf'];

    const largeItems: ListItemData[] = Array.from({ length: 200 }, (_, i) => ({
      id: String(i + 1),
      href: `/notes/${String(i + 1)}`,
      title: `ノート ${String(i + 1).padStart(3, '0')}: ${topics[i % 5] ?? 'その他'} に関するメモ`,
      date: new Date(2024, 0, (i % 28) + 1).toISOString().slice(0, 10),
      tags: tagNames[i % 5] ?? 'other',
    }));

    return html`
      <div style="font-size: var(--text-sm, 13px); color: var(--fg-muted, #666); margin-bottom: 1rem;">
        200件のアイテムを表示しています。
      </div>
      <div style="height: 400px; overflow-y: auto;">
        <ui-list id="large-list" .columns="${defaultColumns}" .items="${largeItems}"></ui-list>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('#large-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    const dataRows = list.shadowRoot?.querySelectorAll('[role="row"][data-item-id]');
    if (dataRows?.length !== 200) {
      throw new Error(`200行が描画されるべきですが ${String(dataRows?.length)} 行です`);
    }

    const grid = list.shadowRoot?.querySelector('[role="grid"]');
    const ariaRowCount = grid?.getAttribute('aria-rowcount');
    if (ariaRowCount !== '200') {
      throw new Error(`aria-rowcount が "200" であるべきですが "${ariaRowCount ?? 'null'}" です`);
    }

    console.log('✅ LargeDataset: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 16. PaginationAria: ページネーション時の ARIA 属性
// ────────────────────────────────────────────

/**
 * ページネーション使用時の ARIA 属性設定例です。
 *
 * - `aria-rowcount` で全体行数を通知
 * - 各行の `aria-rowindex` は `index + 2`（ヘッダー行 = 1）
 */
export const PaginationAria: Story = {
  render: () => {
    const pageItems: ListItemData[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(21 + i),
      href: `/notes/${String(21 + i)}`,
      title: `ノート ${String(21 + i)}`,
      date: '2024-01-01',
      tags: 'pagination',
    }));

    return html`
      <div style="font-size: var(--text-sm, 13px); color: var(--fg-muted, #666); margin-bottom: 1rem;">
        全体500件中、21〜30件目を表示しています。
      </div>
      <ui-list id="pagination-list" .columns="${defaultColumns}" .items="${pageItems}"></ui-list>
    `;
  },
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('#pagination-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    const grid = list.shadowRoot?.querySelector('[role="grid"]');
    const ariaRowCount = grid?.getAttribute('aria-rowcount');
    if (ariaRowCount !== '10') {
      throw new Error(`aria-rowcount が "10" であるべきですが "${ariaRowCount ?? ''}" です`);
    }

    // 最初のデータ行の aria-rowindex が 2（ヘッダー行=1 の次）
    const firstDataRow = list.shadowRoot?.querySelector('[role="row"][data-item-id]');
    const firstRowIndex = firstDataRow?.getAttribute('aria-rowindex');
    if (firstRowIndex !== '2') {
      throw new Error(`最初のデータ行の aria-rowindex が "2" であるべきですが "${firstRowIndex ?? ''}" です`);
    }

    console.log('✅ PaginationAria: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 17. LongContent: 長いテキストの境界条件
// ────────────────────────────────────────────

/**
 * **境界条件**: 非常に長いタイトルを持つアイテムの表示。
 *
 * ### 確認ポイント
 * - 行の高さが 32px を維持すること
 * - テキストが `text-overflow: ellipsis` で省略されること
 */
export const LongContent: Story = {
  args: {
    columns: defaultColumns,
    items: [
      {
        id: '1',
        href: '/notes/1',
        title:
          'これは非常に長いタイトルのテストケースです。タイトルが長すぎる場合に適切に省略されるかを確認します。この文章はレイアウト崩壊のテスト用です。',
        date: '2024-01-01',
        tags: 'long-title, ellipsis, overflow, test, boundary',
      },
      { id: '2', href: '/notes/2', title: '通常のタイトル（比較用）', date: '2024-12-31', tags: 'normal' },
    ],
  },
  render: args => html`
    <ui-list .columns="${args.columns}" .items="${args.items}"></ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    await list.updateComplete;

    const dataRows = list.shadowRoot?.querySelectorAll('[role="row"][data-item-id]');
    if (dataRows?.length !== 2) {
      throw new Error(`2行が描画されるべきですが ${String(dataRows?.length)} 行です`);
    }

    // 各行の高さが最小 32px を保持していること
    dataRows.forEach((row, i) => {
      const height = (row as HTMLElement).offsetHeight;
      if (height < 32) {
        throw new Error(`行 ${String(i + 1)} の高さが 32px 未満です: ${String(height)}px`);
      }
    });

    console.log('✅ LongContent: すべてのテストを通過しました');
  },
};

// ────────────────────────────────────────────
// 18. ForcedColorsMode: 高コントラストモード
// ────────────────────────────────────────────

/**
 * 高コントラストモード（Forced Colors Mode）での表示確認です。
 *
 * ### 確認方法
 * Chrome DevTools → Rendering → Emulate CSS media feature `forced-colors: active`
 */
export const ForcedColorsMode: Story = {
  render: () => html`
    <div style="
      padding: 1rem;
      background: var(--bg-surface-2, #f5f5f5);
      border-radius: var(--radius-md, 6px);
      font-size: var(--text-sm, 13px);
      margin-bottom: 1.5rem;
    ">
      Chrome DevTools → Rendering → <code>forced-colors: active</code> を有効にしてください。
    </div>
    <ui-list .columns="${defaultColumns}" .items="${defaultItems}" active-row="2"></ui-list>
  `,
};

// ────────────────────────────────────────────
// 19. ReducedMotion: アニメーション抑制
// ────────────────────────────────────────────

/**
 * `prefers-reduced-motion: reduce` 環境でのアニメーション抑制確認です。
 *
 * OS のモーション低減設定を有効にすると、トランジションが即座（`0.01ms`）になります。
 */
export const ReducedMotion: Story = {
  render: () => html`
    <div style="
      padding: 1rem;
      background: var(--bg-surface-2, #f5f5f5);
      border-radius: var(--radius-md, 6px);
      font-size: var(--text-sm, 13px);
      margin-bottom: 1.5rem;
    ">
      OS のモーション低減設定を有効にすると、ホバー時のトランジションが即座になります。
    </div>
    <ui-list .columns="${defaultColumns}" .items="${defaultItems}"></ui-list>
  `,
};

// ────────────────────────────────────────────
// 20. AllStates: すべての状態の比較表示
// ────────────────────────────────────────────

/**
 * Default・Active・Sorted・Empty の状態を並べて比較できます。
 * デザインレビューや視覚的なリグレッションテストに使用します。
 */
export const AllStates: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <div>
        <div style="font-size: var(--text-sm, 13px); font-weight: 500; color: var(--fg-muted, #666); margin-bottom: 0.5rem;">
          Default（アクティブ行なし）
        </div>
        <ui-list .columns="${defaultColumns}" .items="${defaultItems}"></ui-list>
      </div>

      <div>
        <div style="font-size: var(--text-sm, 13px); font-weight: 500; color: var(--fg-muted, #666); margin-bottom: 0.5rem;">
          Active（3番目の行がアクティブ）
        </div>
        <ui-list .columns="${defaultColumns}" .items="${defaultItems}" active-row="3"></ui-list>
      </div>

      <div>
        <div style="font-size: var(--text-sm, 13px); font-weight: 500; color: var(--fg-muted, #666); margin-bottom: 0.5rem;">
          Sorted Ascending（日付昇順）
        </div>
        <ui-list
          .columns="${defaultColumns}"
          .items="${[...defaultItems].sort((a, b) => getDateString(a).localeCompare(getDateString(b)))}"
          .sortKey="${'date'}"
          .sortDirection="${'asc' as const}"
        ></ui-list>
      </div>

      <div>
        <div style="font-size: var(--text-sm, 13px); font-weight: 500; color: var(--fg-muted, #666); margin-bottom: 0.5rem;">
          Empty（0件）
        </div>
        <ui-list .columns="${defaultColumns}" .items="${[]}"></ui-list>
      </div>
    </div>
  `,
};
