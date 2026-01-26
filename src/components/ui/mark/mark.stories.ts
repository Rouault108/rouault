import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within } from 'storybook/test';
import type { UiMark } from './mark';
import './mark.ts';

const meta: Meta<UiMark> = {
  title: 'Components/Mark',
  component: 'ui-mark',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'success', 'warning', 'danger', 'subtle'],
      description: 'ハイライトの色バリアント',
    },
  },
};

export default meta;
type Story = StoryObj<UiMark>;

/**
 * デフォルト: モダンな青系ハイライト
 */
export const Default: Story = {
  render: () => html`
    <p>This is a sentence with <ui-mark>highlighted text</ui-mark> in it.</p>
  `,
};

/**
 * すべてのバリアント
 */
export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <p>Default: <ui-mark variant="default">Important information</ui-mark></p>
      <p>Success: <ui-mark variant="success">Successfully added</ui-mark></p>
      <p>Warning: <ui-mark variant="warning">Needs attention</ui-mark></p>
      <p>Danger: <ui-mark variant="danger">Critical error</ui-mark></p>
      <p>Subtle: <ui-mark variant="subtle">Subtle emphasis</ui-mark></p>
    </div>
  `,
};

/**
 * サクセスバリアント
 */
export const Success: Story = {
  render: () => html`
    <p>
      The deployment was <ui-mark variant="success">successful</ui-mark> and the
      application is now live.
    </p>
  `,
};

/**
 * ワーニングバリアント
 */
export const Warning: Story = {
  render: () => html`
    <p>
      <ui-mark variant="warning">Warning:</ui-mark> This action cannot be undone.
      Please proceed with caution.
    </p>
  `,
};

/**
 * デンジャーバリアント
 */
export const Danger: Story = {
  render: () => html`
    <p>
      <ui-mark variant="danger">Error:</ui-mark> Failed to connect to the database.
      Please check your connection.
    </p>
  `,
};

/**
 * サブトルバリアント
 */
export const Subtle: Story = {
  render: () => html`
    <p>
      This is a <ui-mark variant="subtle">subtle highlight</ui-mark> that doesn't
      draw too much attention but still marks the text.
    </p>
  `,
};

/**
 * 検索結果での使用例
 */
export const SearchResults: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div>
        <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">
          Introduction to <ui-mark>Design Systems</ui-mark>
        </h4>
        <p style="color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">
          A comprehensive guide to building and maintaining <ui-mark>design systems</ui-mark>
          for modern web applications...
        </p>
      </div>
      
      <div>
        <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">
          Best Practices for <ui-mark>Design Systems</ui-mark>
        </h4>
        <p style="color: var(--color-foreground-muted, #6b7280); font-size: 0.875rem;">
          Learn how to create scalable <ui-mark>design systems</ui-mark> that work
          across multiple platforms...
        </p>
      </div>
    </div>
  `,
};

/**
 * コード内での使用例
 */
export const InCode: Story = {
  render: () => html`
    <pre style="background-color: #f9fafb; padding: 1rem; border-radius: 0.5rem; overflow-x: auto;"><code>function calculateTotal(items) {
  return items.reduce((sum, item) => {
    return sum + <ui-mark variant="warning">item.price * item.quantity</ui-mark>;
  }, 0);
}</code></pre>
  `,
};

/**
 * 文書内での使用例
 */
export const InDocument: Story = {
  render: () => html`
    <article style="max-width: 600px;">
      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">
        Understanding Accessibility
      </h2>
      <p style="line-height: 1.7; margin-bottom: 1rem;">
        Accessibility is not just a feature, it's a <ui-mark>fundamental requirement</ui-mark>
        for modern web applications. By ensuring our applications are accessible, we make them
        usable for everyone, regardless of their abilities.
      </p>
      <p style="line-height: 1.7;">
        Key principles include <ui-mark>semantic HTML</ui-mark>, <ui-mark>keyboard navigation</ui-mark>,
        and <ui-mark>screen reader support</ui-mark>. These are not optional—they are essential.
      </p>
    </article>
  `,
};

/**
 * ダークモード表示確認
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background-color: #0a0a0a; padding: 2rem; border-radius: 8px;">
      <p style="color: #ededed; margin-bottom: 1rem;">
        Default: <ui-mark variant="default">Highlighted text</ui-mark>
      </p>
      <p style="color: #ededed; margin-bottom: 1rem;">
        Success: <ui-mark variant="success">Success message</ui-mark>
      </p>
      <p style="color: #ededed; margin-bottom: 1rem;">
        Warning: <ui-mark variant="warning">Warning message</ui-mark>
      </p>
      <p style="color: #ededed;">
        Danger: <ui-mark variant="danger">Error message</ui-mark>
      </p>
    </div>
  `,
};

/**
 * BDD: バリアント属性テスト
 */
export const BDD_VariantAttribute: Story = {
  tags: ['test'],
  render: () => html`
    <ui-mark data-testid="mark-variant" variant="success">Test</ui-mark>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const mark = canvas.getByTestId('mark-variant') as UiMark;

    await mark.updateComplete;

    // variant 属性が正しく反映されているか
    await expect(mark.getAttribute('variant')).toBe('success');
  },
};

/**
 * BDD: セマンティックHTMLテスト
 */
export const BDD_SemanticHTML: Story = {
  tags: ['test'],
  render: () => html`
    <ui-mark data-testid="mark-semantic">Semantic test</ui-mark>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const mark = canvas.getByTestId('mark-semantic') as UiMark;

    await mark.updateComplete;

    // Shadow DOM内にmark要素があるか
    const markElement = mark.shadowRoot?.querySelector('mark');
    await expect(markElement).toBeTruthy();
  },
};

/**
 * BDD: スロットコンテンツテスト
 */
export const BDD_SlotContent: Story = {
  tags: ['test'],
  render: () => html`
    <ui-mark data-testid="mark-slot">Test Content</ui-mark>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const mark = canvas.getByTestId('mark-slot') as UiMark;

    await mark.updateComplete;

    // スロットコンテンツが正しく表示されているか
    await expect(mark.textContent?.trim()).toBe('Test Content');
  },
};
