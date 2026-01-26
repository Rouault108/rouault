import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within } from 'storybook/test';
import type { UiProgress } from './progress';
import './progress.ts';

const meta: Meta<UiProgress> = {
  title: 'Components/Progress',
  component: 'ui-progress',
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['bar', 'circle'],
      description: 'プログレスバーのタイプ',
    },
    value: {
      control: { type: 'number', min: 0, max: 100, step: 1 },
      description: '進捗値 (0-100)',
    },
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg'],
      description: 'サイズ',
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'success', 'warning', 'danger'],
      description: '色バリアント',
    },
    indeterminate: {
      control: { type: 'boolean' },
      description: '不確定状態（ローディング）',
    },
    showLabel: {
      control: { type: 'boolean' },
      description: 'パーセンテージラベル表示',
    },
  },
};

export default meta;
type Story = StoryObj<UiProgress>;

/**
 * デフォルト: 線形プログレスバー
 */
export const Default: Story = {
  args: {
    value: 60,
  },
};

/**
 * 様々な進捗値
 */
export const VariousValues: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">0%</p>
        <ui-progress value="0"></ui-progress>
      </div>
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">25%</p>
        <ui-progress value="25"></ui-progress>
      </div>
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">50%</p>
        <ui-progress value="50"></ui-progress>
      </div>
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">75%</p>
        <ui-progress value="75"></ui-progress>
      </div>
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">100%</p>
        <ui-progress value="100"></ui-progress>
      </div>
    </div>
  `,
};

/**
 * サイズバリエーション
 */
export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Extra Small</p>
        <ui-progress value="60" size="xs"></ui-progress>
      </div>
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Small (Default)</p>
        <ui-progress value="60" size="sm"></ui-progress>
      </div>
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Medium</p>
        <ui-progress value="60" size="md"></ui-progress>
      </div>
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Large</p>
        <ui-progress value="60" size="lg"></ui-progress>
      </div>
    </div>
  `,
};

/**
 * 色バリアント
 */
export const Variants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Default</p>
        <ui-progress value="60" variant="default"></ui-progress>
      </div>
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Success</p>
        <ui-progress value="60" variant="success"></ui-progress>
      </div>
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Warning</p>
        <ui-progress value="60" variant="warning"></ui-progress>
      </div>
      <div>
        <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Danger</p>
        <ui-progress value="60" variant="danger"></ui-progress>
      </div>
    </div>
  `,
};

/**
 * ラベル表示
 */
export const WithLabel: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <ui-progress value="30" showLabel></ui-progress>
      <ui-progress value="60" variant="success" showLabel></ui-progress>
      <ui-progress value="90" variant="danger" showLabel></ui-progress>
    </div>
  `,
};

/**
 * 不確定状態（ローディング）
 */
export const Indeterminate: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <ui-progress indeterminate></ui-progress>
      <ui-progress indeterminate variant="success"></ui-progress>
    </div>
  `,
};

/**
 * 円形プログレスバー
 */
export const CircularProgress: Story = {
  render: () => html`
    <div style="display: flex; gap: 2rem; align-items: center; flex-wrap: wrap;">
      <ui-progress type="circle" value="25"></ui-progress>
      <ui-progress type="circle" value="50"></ui-progress>
      <ui-progress type="circle" value="75"></ui-progress>
      <ui-progress type="circle" value="100"></ui-progress>
    </div>
  `,
};

/**
 * 円形プログレスバー - サイズ
 */
export const CircularSizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 2rem; align-items: center;">
      <div style="text-align: center;">
        <ui-progress type="circle" value="60" size="xs"></ui-progress>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Extra Small</p>
      </div>
      <div style="text-align: center;">
        <ui-progress type="circle" value="60" size="sm"></ui-progress>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Small</p>
      </div>
      <div style="text-align: center;">
        <ui-progress type="circle" value="60" size="md"></ui-progress>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Medium</p>
      </div>
      <div style="text-align: center;">
        <ui-progress type="circle" value="60" size="lg"></ui-progress>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Large</p>
      </div>
    </div>
  `,
};

/**
 * 円形プログレスバー - ラベル付き
 */
export const CircularWithLabel: Story = {
  render: () => html`
    <div style="display: flex; gap: 2rem; align-items: center;">
      <ui-progress type="circle" value="30" size="lg" showLabel></ui-progress>
      <ui-progress type="circle" value="60" size="lg" variant="success" showLabel></ui-progress>
      <ui-progress type="circle" value="90" size="lg" variant="danger" showLabel></ui-progress>
    </div>
  `,
};

/**
 * 円形プログレスバー - 不確定状態
 */
export const CircularIndeterminate: Story = {
  render: () => html`
    <div style="display: flex; gap: 2rem; align-items: center;">
      <ui-progress type="circle" indeterminate></ui-progress>
      <ui-progress type="circle" indeterminate variant="success"></ui-progress>
    </div>
  `,
};

/**
 * ダークモード表示確認
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background-color: #0a0a0a; padding: 2rem; border-radius: 8px;">
      <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem;">
        <ui-progress value="40"></ui-progress>
        <ui-progress value="60" variant="success" showLabel></ui-progress>
        <ui-progress indeterminate variant="warning"></ui-progress>
      </div>
      <div style="display: flex; gap: 2rem; align-items: center;">
        <ui-progress type="circle" value="50" showLabel></ui-progress>
        <ui-progress type="circle" value="75" variant="success"></ui-progress>
        <ui-progress type="circle" indeterminate></ui-progress>
      </div>
    </div>
  `,
};

/**
 * BDD: 進捗値テスト
 */
export const BDD_ProgressValue: Story = {
  tags: ['test'],
  render: () => html`
    <ui-progress data-testid="progress-value" value="75"></ui-progress>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const progress = canvas.getByTestId('progress-value') as UiProgress;

    await progress.updateComplete;

    // value 属性が正しく反映されているか
    await expect(progress.value).toBe(75);
  },
};

/**
 * BDD: タイプ属性テスト
 */
export const BDD_TypeAttribute: Story = {
  tags: ['test'],
  render: () => html`
    <ui-progress data-testid="progress-type" type="circle" value="50"></ui-progress>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const progress = canvas.getByTestId('progress-type') as UiProgress;

    await progress.updateComplete;

    // type 属性が正しく反映されているか
    await expect(progress.getAttribute('type')).toBe('circle');
  },
};

/**
 * BDD: ARIA属性テスト
 */
export const BDD_AriaAttributes: Story = {
  tags: ['test'],
  render: () => html`
    <ui-progress data-testid="progress-aria" value="60"></ui-progress>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const progress = canvas.getByTestId('progress-aria') as UiProgress;

    await progress.updateComplete;

    // Shadow DOM内のprogressbar要素にrole属性があるか
    const progressElement = progress.shadowRoot?.querySelector('[role="progressbar"]');
    await expect(progressElement).toBeTruthy();
    await expect(progressElement?.getAttribute('aria-valuenow')).toBe('60');
    await expect(progressElement?.getAttribute('aria-valuemin')).toBe('0');
    await expect(progressElement?.getAttribute('aria-valuemax')).toBe('100');
  },
};
