import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within, userEvent } from 'storybook/test';
import type { UiTable } from './table';
import './table.ts';

const meta: Meta<UiTable> = {
  title: 'Components/Table',
  component: 'ui-table',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'striped', 'bordered'],
      description: 'テーブルのスタイルバリアント',
    },
    hoverable: {
      control: { type: 'boolean' },
      description: '行ホバー効果を有効にするか',
    },
    compact: {
      control: { type: 'boolean' },
      description: 'コンパクトモード（パディング削減）',
    },
    selectable: {
      control: { type: 'boolean' },
      description: '行選択機能を有効にするか',
    },
    stickyHeader: {
      control: { type: 'boolean' },
      description: 'ヘッダーを上部に固定するか',
    },
  },
};

export default meta;
type Story = StoryObj<UiTable>;

/**
 * デフォルト: シンプルなテーブル
 */
export const Default: Story = {
  render: () => html`
    <ui-table>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Alice Johnson</td>
            <td>Engineer</td>
            <td>Active</td>
          </tr>
          <tr>
            <td>Bob Smith</td>
            <td>Designer</td>
            <td>Active</td>
          </tr>
          <tr>
            <td>Carol White</td>
            <td>Product Manager</td>
            <td>Away</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
};

/**
 * ストライプバリアント
 */
export const Striped: Story = {
  render: () => html`
    <ui-table variant="striped">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Task</th>
            <th>Assignee</th>
            <th>Due Date</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Implement authentication</td>
            <td>Alice</td>
            <td>2024-02-15</td>
            <td>High</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Design landing page</td>
            <td>Bob</td>
            <td>2024-02-20</td>
            <td>Medium</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Write documentation</td>
            <td>Carol</td>
            <td>2024-02-25</td>
            <td>Low</td>
          </tr>
          <tr>
            <td>4</td>
            <td>Fix bug #123</td>
            <td>Alice</td>
            <td>2024-02-18</td>
            <td>High</td>
          </tr>
          <tr>
            <td>5</td>
            <td>Refactor API</td>
            <td>Bob</td>
            <td>2024-03-01</td>
            <td>Medium</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
};

/**
 * ボーダーバリアント
 */
export const Bordered: Story = {
  render: () => html`
    <ui-table variant="bordered">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Widget A</td>
            <td>$29.99</td>
            <td>120</td>
          </tr>
          <tr>
            <td>Widget B</td>
            <td>$49.99</td>
            <td>45</td>
          </tr>
          <tr>
            <td>Widget C</td>
            <td>$19.99</td>
            <td>200</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
};

/**
 * ホバー効果付き
 */
export const Hoverable: Story = {
  render: () => html`
    <ui-table hoverable>
      <table>
        <thead>
          <tr>
            <th>File Name</th>
            <th>Type</th>
            <th>Size</th>
            <th>Modified</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>README.md</td>
            <td>Markdown</td>
            <td>4.2 KB</td>
            <td>2024-01-20</td>
          </tr>
          <tr>
            <td>package.json</td>
            <td>JSON</td>
            <td>1.8 KB</td>
            <td>2024-01-25</td>
          </tr>
          <tr>
            <td>index.ts</td>
            <td>TypeScript</td>
            <td>12.5 KB</td>
            <td>2024-01-24</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
};

/**
 * コンパクトモード
 */
export const Compact: Story = {
  render: () => html`
    <ui-table compact hoverable>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Last Login</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>alice@example.com</td>
            <td>Active</td>
            <td>2 hours ago</td>
          </tr>
          <tr>
            <td>bob@example.com</td>
            <td>Active</td>
            <td>1 day ago</td>
          </tr>
          <tr>
            <td>carol@example.com</td>
            <td>Inactive</td>
            <td>2 weeks ago</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
};

/**
 * フッター付き
 */
export const WithFooter: Story = {
  render: () => html`
    <ui-table variant="striped">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Item A</td>
            <td>10</td>
            <td>$100</td>
          </tr>
          <tr>
            <td>Item B</td>
            <td>5</td>
            <td>$75</td>
          </tr>
          <tr>
            <td>Item C</td>
            <td>8</td>
            <td>$120</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total</strong></td>
            <td><strong>23</strong></td>
            <td><strong>$295</strong></td>
          </tr>
        </tfoot>
      </table>
    </ui-table>
  `,
};

/**
 * スティッキーヘッダー
 * 親要素の高さを制限してスクロールを発生させる
 */
export const StickyHeader: Story = {
  render: () => html`
    <div style="height: 200px; overflow: auto; border: 1px solid #e5e5e5; border-radius: 8px;">
      <ui-table stickyHeader>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: 20 }).map((_, i) => html`
              <tr>
                <td>${i + 1}</td>
                <td>User ${i + 1}</td>
                <td>2024-01-${String((i % 30) + 1).padStart(2, '0')}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </ui-table>
    </div>
  `,
};

/**
 * 選択可能な行（Selectable）
 */
export const SelectableRows: Story = {
  render: () => html`
    <ui-table selectable hoverable>
      <table>
        <thead>
          <tr>
            <th>Select</th>
            <th>Task</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input type="checkbox" aria-label="Select row"></td>
            <td>Update documentation</td>
            <td>Done</td>
          </tr>
          <tr>
            <td><input type="checkbox" aria-label="Select row"></td>
            <td>Fix navigation bug</td>
            <td>In Progress</td>
          </tr>
          <tr>
            <td><input type="checkbox" aria-label="Select row"></td>
            <td>Add unit tests</td>
            <td>Todo</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
};

/**
 * ソート可能なヘッダー（インタラクティブ）
 * 注: ui-tableは静的なスタイルのみを提供するコンポーネントだが、
 * sortable属性があればカーソルスタイルなどを適用する
 */
export const SortableHeaders: Story = {
  render: () => html`
    <ui-table>
      <table>
        <thead>
          <tr>
            <th aria-sort="descending" style="cursor: pointer;">
              Name <iconify-icon icon="lucide:arrow-down" style="vertical-align: middle;"></iconify-icon>
            </th>
            <th style="cursor: pointer;">
              Role
            </th>
            <th style="cursor: pointer;">
              Joined
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bob</td>
            <td>User</td>
            <td>2023-02-15</td>
          </tr>
          <tr>
            <td>Alice</td>
            <td>Admin</td>
            <td>2023-01-01</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
};

/**
 * ダークモード表示確認
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background-color: #0a0a0a; padding: 2rem; border-radius: 8px;">
      <ui-table variant="striped" hoverable>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Alice Johnson</td>
              <td>alice@example.com</td>
              <td>Active</td>
            </tr>
            <tr>
              <td>Bob Smith</td>
              <td>bob@example.com</td>
              <td>Active</td>
            </tr>
            <tr>
              <td>Carol White</td>
              <td>carol@example.com</td>
              <td>Away</td>
            </tr>
          </tbody>
        </table>
      </ui-table>
    </div>
  `,
};

/**
 * BDD: バリアント切り替えテスト
 */
export const BDD_VariantSwitch: Story = {
  tags: ['test'],
  render: () => html`
    <ui-table data-testid="table-variant" variant="striped">
      <table>
        <thead>
          <tr>
            <th>Column 1</th>
            <th>Column 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Data 1</td>
            <td>Data 2</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const table = canvas.getByTestId('table-variant') as UiTable;

    await table.updateComplete;

    // variant 属性が正しく反映されているか
    await expect(table.getAttribute('variant')).toBe('striped');
  },
};

/**
 * BDD: ホバー効果テスト
 */
export const BDD_HoverableRows: Story = {
  tags: ['test'],
  render: () => html`
    <ui-table data-testid="table-hoverable" hoverable>
      <table>
        <thead>
          <tr>
            <th>Column</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Row 1</td>
          </tr>
          <tr>
            <td>Row 2</td>
          </tr>
        </tbody>
      </table>
    </ui-table>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const table = canvas.getByTestId('table-hoverable') as UiTable;

    await table.updateComplete;

    // hoverable 属性が正しく反映されているか
    await expect(table.hasAttribute('hoverable')).toBe(true);
  },
};

/**
 * BDD: 選択機能テスト
 */
export const BDD_Selection: Story = {
  tags: ['test'],
  render: () => html`
    <ui-table data-testid="table-selection" selectable>
      <table>
        <tbody>
          <tr data-testid="row-1"><td>Row 1</td></tr>
          <tr data-testid="row-2"><td>Row 2</td></tr>
        </tbody>
      </table>
    </ui-table>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const table = canvas.getByTestId('table-selection') as UiTable;
    
    await table.updateComplete;
    
    // 行をクリックして選択状態になるかテスト
    const row1 = canvas.getByTestId('row-1');
    await userEvent.click(row1);
    
    // aria-selected が true になっているか
    await expect(row1.getAttribute('aria-selected')).toBe('true');
    
    // もう一度クリックで解除
    await userEvent.click(row1);
    await expect(row1.hasAttribute('aria-selected')).toBe(false);
  },
};

/**
 * BDD: ソート機能テスト
 */
export const BDD_SortFunction: Story = {
  tags: ['test'],
  render: () => html`
    <ui-table data-testid="table-sort">
      <table>
        <thead>
          <tr>
            <th data-testid="th-name" aria-sort="none">
              Name <iconify-icon icon="lucide:arrow-up"></iconify-icon>
            </th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="row-alice"><td>Alice</td><td>Admin</td></tr>
          <tr data-testid="row-bob"><td>Bob</td><td>User</td></tr>
        </tbody>
      </table>
    </ui-table>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const table = canvas.getByTestId('table-sort') as UiTable;
    const thName = canvas.getByTestId('th-name');
    
    await table.updateComplete;
    
    // 初期状態: Alice, Bob の順（昇順）
    const tbody = table.querySelector('tbody');
    let rows = Array.from(tbody?.querySelectorAll('tr') || []);
    await expect(rows[0]?.querySelector('td')?.textContent).toBe('Alice');
    await expect(rows[1]?.querySelector('td')?.textContent).toBe('Bob');
    
    // ヘッダークリックで昇順に
    await userEvent.click(thName);
    await table.updateComplete;
    
    // aria-sort が ascending に
    await expect(thName.getAttribute('aria-sort')).toBe('ascending');
    
    // もう一度クリックで降順に
    await userEvent.click(thName);
    await table.updateComplete;
    
    // aria-sort が descending に
    await expect(thName.getAttribute('aria-sort')).toBe('descending');
    
    // 並び順が逆転
    rows = Array.from(tbody?.querySelectorAll('tr') || []);
    await expect(rows[0]?.querySelector('td')?.textContent).toBe('Bob');
    await expect(rows[1]?.querySelector('td')?.textContent).toBe('Alice');
  },
};
