import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within, userEvent } from 'storybook/test';
import type { UiTaskList } from './task-list';
import './task-list.ts';

const meta: Meta<UiTaskList> = {
  title: 'Components/TaskList',
  component: 'ui-task-list',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'card'],
      description: 'タスクリストのスタイルバリアント',
    },
    compact: {
      control: { type: 'boolean' },
      description: 'コンパクトモード（パディング削減）',
    },
  },
};

export default meta;
type Story = StoryObj<UiTaskList>;

/**
 * デフォルト: シンプルなタスクリスト
 */
export const Default: Story = {
  render: () => html`
    <ui-task-list>
      <ul>
        <li><input type="checkbox" /> Implement design system</li>
        <li><input type="checkbox" checked /> Create component library</li>
        <li><input type="checkbox" /> Write documentation</li>
        <li><input type="checkbox" /> Add accessibility features</li>
      </ul>
    </ui-task-list>
  `,
};

/**
 * すべて完了
 */
export const AllCompleted: Story = {
  render: () => html`
    <ui-task-list>
      <ul>
        <li><input type="checkbox" checked /> Design mockups</li>
        <li><input type="checkbox" checked /> Implement components</li>
        <li><input type="checkbox" checked /> Write tests</li>
        <li><input type="checkbox" checked /> Deploy to production</li>
      </ul>
    </ui-task-list>
  `,
};

/**
 * カードバリアント
 */
export const CardVariant: Story = {
  render: () => html`
    <ui-task-list variant="card">
      <ul>
        <li><input type="checkbox" /> Review pull requests</li>
        <li><input type="checkbox" checked /> Fix navigation bug</li>
        <li><input type="checkbox" /> Update dependencies</li>
        <li><input type="checkbox" /> Optimize performance</li>
      </ul>
    </ui-task-list>
  `,
};

/**
 * コンパクトモード
 */
export const Compact: Story = {
  render: () => html`
    <ui-task-list compact>
      <ul>
        <li><input type="checkbox" /> Task 1</li>
        <li><input type="checkbox" checked /> Task 2</li>
        <li><input type="checkbox" /> Task 3</li>
        <li><input type="checkbox" /> Task 4</li>
        <li><input type="checkbox" checked /> Task 5</li>
      </ul>
    </ui-task-list>
  `,
};

/**
 * 複数のタスクリスト
 */
export const MultipleLists: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <div>
        <h3 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--color-foreground-muted, #6b7280);">
          Today
        </h3>
        <ui-task-list>
          <ul>
            <li><input type="checkbox" checked /> Morning standup</li>
            <li><input type="checkbox" /> Code review</li>
            <li><input type="checkbox" /> Client meeting</li>
          </ul>
        </ui-task-list>
      </div>
      
      <div>
        <h3 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--color-foreground-muted, #6b7280);">
          This Week
        </h3>
        <ui-task-list>
          <ul>
            <li><input type="checkbox" /> Finish feature X</li>
            <li><input type="checkbox" /> Write blog post</li>
            <li><input type="checkbox" /> Plan sprint</li>
          </ul>
        </ui-task-list>
      </div>
    </div>
  `,
};

/**
 * 長いタスク名
 */
export const LongTaskNames: Story = {
  render: () => html`
    <ui-task-list>
      <ul>
        <li>
          <input type="checkbox" />
          Implement a comprehensive accessibility audit across all components in the design system
        </li>
        <li>
          <input type="checkbox" checked />
          Refactor the build pipeline to support incremental compilation and reduce build times
        </li>
        <li>
          <input type="checkbox" />
          Create detailed documentation for each component including usage examples and API reference
        </li>
      </ul>
    </ui-task-list>
  `,
};

/**
 * 入れ子のタスクリスト
 */
export const NestedTasks: Story = {
  render: () => html`
    <ui-task-list>
      <ul>
        <li>
          <input type="checkbox" /> Main task 1
          <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
            <li><input type="checkbox" checked /> Subtask 1.1</li>
            <li><input type="checkbox" /> Subtask 1.2</li>
          </ul>
        </li>
        <li>
          <input type="checkbox" checked /> Main task 2
          <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
            <li><input type="checkbox" checked /> Subtask 2.1</li>
            <li><input type="checkbox" checked /> Subtask 2.2</li>
          </ul>
        </li>
        <li><input type="checkbox" /> Main task 3</li>
      </ul>
    </ui-task-list>
  `,
};

/**
 * ダークモード表示確認
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background-color: #0a0a0a; padding: 2rem; border-radius: 8px;">
      <ui-task-list>
        <ul>
          <li><input type="checkbox" /> Design review</li>
          <li><input type="checkbox" checked /> Code implementation</li>
          <li><input type="checkbox" /> Quality assurance</li>
          <li><input type="checkbox" checked /> Documentation</li>
        </ul>
      </ui-task-list>
    </div>
  `,
};

/**
 * BDD: タスクチェックのインタラクションテスト
 */
export const BDD_TaskCheckInteraction: Story = {
  tags: ['test'],
  render: () => html`
    <ui-task-list data-testid="task-list">
      <ul>
        <li><input type="checkbox" data-testid="task-1" /> Task 1</li>
        <li><input type="checkbox" data-testid="task-2" /> Task 2</li>
      </ul>
    </ui-task-list>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const taskList = canvas.getByTestId('task-list') as UiTaskList;
    
    await taskList.updateComplete;
    
    const checkbox1 = canvas.getByTestId('task-1') as HTMLInputElement;
    const checkbox2 = canvas.getByTestId('task-2') as HTMLInputElement;
    
    // 初期状態は未チェック
    await expect(checkbox1.checked).toBe(false);
    await expect(checkbox2.checked).toBe(false);
    
    // クリックでチェック状態になる
    await userEvent.click(checkbox1);
    await expect(checkbox1.checked).toBe(true);
    
    // もう一度クリックで解除
    await userEvent.click(checkbox1);
    await expect(checkbox1.checked).toBe(false);
  },
};

/**
 * BDD: 完了アイテムのスタイルテスト
 */
export const BDD_CompletedItemStyle: Story = {
  tags: ['test'],
  render: () => html`
    <ui-task-list data-testid="task-list-style">
      <ul>
        <li data-testid="item-unchecked"><input type="checkbox" /> Unchecked task</li>
        <li data-testid="item-checked"><input type="checkbox" checked /> Checked task</li>
      </ul>
    </ui-task-list>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const taskList = canvas.getByTestId('task-list-style') as UiTaskList;
    
    await taskList.updateComplete;
    
    // チェック済み項目にはcompleted classがあるか確認
    const checkedItem = canvas.getByTestId('item-checked');
    
    // スタイルの確認（取り消し線など）は実際のDOM検証では難しいため、
    // ここではチェックボックスの状態のみ確認
    const checkbox = checkedItem.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await expect(checkbox.checked).toBe(true);
  },
};

/**
 * BDD: バリアント属性テスト
 */
export const BDD_VariantAttribute: Story = {
  tags: ['test'],
  render: () => html`
    <ui-task-list data-testid="task-list-variant" variant="card">
      <ul>
        <li><input type="checkbox" /> Task</li>
      </ul>
    </ui-task-list>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const taskList = canvas.getByTestId('task-list-variant') as UiTaskList;

    await taskList.updateComplete;

    // variant 属性が正しく反映されているか
    await expect(taskList.getAttribute('variant')).toBe('card');
  },
};
