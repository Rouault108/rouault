import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within } from 'storybook/test';
import type { UiSpinner } from './spinner';
import './spinner.ts';

const meta: Meta<UiSpinner> = {
  title: 'Components/Spinner',
  component: 'ui-spinner',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg'],
      description: 'スピナーのサイズ',
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'success', 'warning', 'danger'],
      description: '色バリアント',
    },
    label: {
      control: { type: 'text' },
      description: 'アクセシビリティ用ラベル',
    },
  },
};

export default meta;
type Story = StoryObj<UiSpinner>;

/**
 * デフォルト: シンプルなスピナー
 */
export const Default: Story = {
  args: {
    size: 'md',
  },
};

/**
 * サイズバリエーション
 */
export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 2rem; align-items: center;">
      <div style="text-align: center;">
        <ui-spinner size="xs"></ui-spinner>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Extra Small</p>
      </div>
      <div style="text-align: center;">
        <ui-spinner size="sm"></ui-spinner>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Small</p>
      </div>
      <div style="text-align: center;">
        <ui-spinner size="md"></ui-spinner>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Medium</p>
      </div>
      <div style="text-align: center;">
        <ui-spinner size="lg"></ui-spinner>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Large</p>
      </div>
    </div>
  `,
};

/**
 * 色バリアント
 */
export const Variants: Story = {
  render: () => html`
    <div style="display: flex; gap: 2rem; align-items: center;">
      <div style="text-align: center;">
        <ui-spinner variant="default"></ui-spinner>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Default</p>
      </div>
      <div style="text-align: center;">
        <ui-spinner variant="success"></ui-spinner>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Success</p>
      </div>
      <div style="text-align: center;">
        <ui-spinner variant="warning"></ui-spinner>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Warning</p>
      </div>
      <div style="text-align: center;">
        <ui-spinner variant="danger"></ui-spinner>
        <p style="margin-top: 0.5rem; color: var(--color-foreground-muted, #6b7280); font-size: 0.75rem;">Danger</p>
      </div>
    </div>
  `,
};

/**
 * ラベル付き
 */
export const WithLabel: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <ui-spinner size="sm"></ui-spinner>
        <span style="color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Loading...</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <ui-spinner size="sm" variant="success"></ui-spinner>
        <span style="color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Processing...</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <ui-spinner size="sm" variant="warning"></ui-spinner>
        <span style="color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">Uploading...</span>
      </div>
    </div>
  `,
};

/**
 * ボタン内での使用
 */
export const InButton: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem;">
      <button style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--color-primary, #3b82f6); color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
        <ui-spinner size="xs" style="--spinner-color: white;"></ui-spinner>
        <span>Loading...</span>
      </button>
      <button style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: transparent; color: var(--color-foreground, #0a0a0a); border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.375rem; cursor: pointer;">
        <ui-spinner size="xs"></ui-spinner>
        <span>Processing...</span>
      </button>
    </div>
  `,
};

/**
 * カード内での使用
 */
export const InCard: Story = {
  render: () => html`
    <div style="max-width: 400px; padding: 2rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.5rem;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <ui-spinner size="lg"></ui-spinner>
        <div style="text-align: center;">
          <h3 style="font-size: 1rem; font-weight: 600; margin: 0 0 0.5rem 0;">Loading content</h3>
          <p style="font-size: 0.875rem; color: var(--color-foreground-muted, #6b7280); margin: 0;">
            Please wait while we fetch your data...
          </p>
        </div>
      </div>
    </div>
  `,
};

/**
 * ページセンター配置
 */
export const PageCenter: Story = {
  render: () => html`
    <div style="display: flex; align-items: center; justify-content: center; min-height: 300px; background-color: var(--color-background, #fafafa); border-radius: 0.5rem;">
      <ui-spinner size="lg"></ui-spinner>
    </div>
  `,
};

/**
 * ダークモード表示確認
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background-color: #0a0a0a; padding: 2rem; border-radius: 8px;">
      <div style="display: flex; gap: 2rem; align-items: center; margin-bottom: 2rem;">
        <ui-spinner size="xs"></ui-spinner>
        <ui-spinner size="sm"></ui-spinner>
        <ui-spinner size="md"></ui-spinner>
        <ui-spinner size="lg"></ui-spinner>
      </div>
      <div style="display: flex; gap: 2rem; align-items: center;">
        <ui-spinner variant="default"></ui-spinner>
        <ui-spinner variant="success"></ui-spinner>
        <ui-spinner variant="warning"></ui-spinner>
        <ui-spinner variant="danger"></ui-spinner>
      </div>
    </div>
  `,
};

/**
 * BDD: サイズ属性テスト
 */
export const BDD_SizeAttribute: Story = {
  tags: ['test'],
  render: () => html`
    <ui-spinner data-testid="spinner-size" size="lg"></ui-spinner>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const spinner = canvas.getByTestId('spinner-size') as UiSpinner;

    await spinner.updateComplete;

    // size 属性が正しく反映されているか
    await expect(spinner.getAttribute('size')).toBe('lg');
  },
};

/**
 * BDD: バリアント属性テスト
 */
export const BDD_VariantAttribute: Story = {
  tags: ['test'],
  render: () => html`
    <ui-spinner data-testid="spinner-variant" variant="success"></ui-spinner>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const spinner = canvas.getByTestId('spinner-variant') as UiSpinner;

    await spinner.updateComplete;

    // variant 属性が正しく反映されているか
    await expect(spinner.getAttribute('variant')).toBe('success');
  },
};

/**
 * BDD: ARIA属性テスト
 */
export const BDD_AriaAttributes: Story = {
  tags: ['test'],
  render: () => html`
    <ui-spinner data-testid="spinner-aria" label="Loading data"></ui-spinner>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const spinner = canvas.getByTestId('spinner-aria') as UiSpinner;

    await spinner.updateComplete;

    // Shadow DOM内のstatus要素にrole属性があるか
    const statusElement = spinner.shadowRoot?.querySelector('[role="status"]');
    await expect(statusElement).toBeTruthy();
    await expect(statusElement?.getAttribute('aria-live')).toBe('polite');
    await expect(statusElement?.getAttribute('aria-label')).toBe('Loading data');
  },
};
