import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within } from 'storybook/test';
import type { UiCode } from './code';
import './code.ts';

const meta: Meta<UiCode> = {
  title: 'Components/Code',
  component: 'ui-code',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'primary', 'success', 'warning', 'error'],
      description: 'コードの表示スタイル',
    },
  },
};

export default meta;
type Story = StoryObj<UiCode>;

/**
 * デフォルトスタイル
 */
export const Default: Story = {
  render: () => html`
    <p>
      このコマンドを実行してください: <ui-code>npm install</ui-code>
    </p>
  `,
};

/**
 * プライマリ（強調）
 */
export const Primary: Story = {
  render: () => html`
    <p>
      変数 <ui-code variant="primary">userName</ui-code> に値を代入します。
    </p>
  `,
};

/**
 * 成功（正しい例）
 */
export const Success: Story = {
  render: () => html`
    <p>
      正しい書き方: <ui-code variant="success">const value = 42;</ui-code>
    </p>
  `,
};

/**
 * 警告
 */
export const Warning: Story = {
  render: () => html`
    <p>
      非推奨: <ui-code variant="warning">var x = 1;</ui-code> は使用しないでください。
    </p>
  `,
};

/**
 * エラー（間違った例）
 */
export const Error: Story = {
  render: () => html`
    <p>
      間違った書き方: <ui-code variant="error">const value = ;</ui-code>
    </p>
  `,
};

/**
 * 文中での使用例
 */
export const InParagraph: Story = {
  render: () => html`
    <div style="max-width: 600px; line-height: 1.6;">
      <p>
        <ui-code>React</ui-code> のコンポーネントでは、<ui-code>useState</ui-code> や 
        <ui-code>useEffect</ui-code> などのフックを使用します。例えば、
        <ui-code variant="primary">const [count, setCount] = useState(0)</ui-code> のように記述します。
      </p>
      <p>
        ファイルパスは <ui-code>/src/components/Button.tsx</ui-code> のように記述できます。
      </p>
    </div>
  `,
};

/**
 * 長いコード
 */
export const LongCode: Story = {
  render: () => html`
    <p>
      長いパス: <ui-code>c:\\Users\\username\\Documents\\Projects\\my-project\\src\\components\\ui\\button\\button.stories.ts</ui-code>
    </p>
  `,
};

/**
 * すべてのバリアント
 */
export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
      <p>Default: <ui-code>npm install</ui-code></p>
      <p>Primary: <ui-code variant="primary">userName</ui-code></p>
      <p>Success: <ui-code variant="success">const value = 42;</ui-code></p>
      <p>Warning: <ui-code variant="warning">var x = 1;</ui-code></p>
      <p>Error: <ui-code variant="error">const value = ;</ui-code></p>
    </div>
  `,
};

/**
 * ダークモード
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background: #0a0a0a; padding: 2rem;">
      <p style="color: #ededed; line-height: 1.6;">
        コマンド <ui-code>pnpm install</ui-code> を実行し、
        <ui-code variant="primary">package.json</ui-code> を確認してください。
      </p>
    </div>
  `,
};

/**
 * ダークモード（全バリアント）
 */
export const DarkMode_AllVariants: Story = {
  render: () => html`
    <div data-theme="dark" style="background: #0a0a0a; padding: 2rem; display: flex; flex-direction: column; gap: var(--space-3);">
      <p style="color: #ededed;">Default: <ui-code>npm install</ui-code></p>
      <p style="color: #ededed;">Primary: <ui-code variant="primary">userName</ui-code></p>
      <p style="color: #ededed;">Success: <ui-code variant="success">const value = 42;</ui-code></p>
      <p style="color: #ededed;">Warning: <ui-code variant="warning">var x = 1;</ui-code></p>
      <p style="color: #ededed;">Error: <ui-code variant="error">const value = ;</ui-code></p>
    </div>
  `,
};

/**
 * BDD: デフォルトバリアントの確認
 */
export const BDD_DefaultVariant: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code data-testid="default-code">npm install</ui-code>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const code = canvas.getByTestId('default-code') as UiCode;

    // デフォルトvariantが設定されているか
    await expect(code.variant).toBe('default');
  },
};

/**
 * BDD: バリアント属性の反映
 */
export const BDD_VariantAttribute: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code data-testid="primary-code" variant="primary">userName</ui-code>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const code = canvas.getByTestId('primary-code') as UiCode;

    // variant属性が正しく設定されているか
    await expect(code.getAttribute('variant')).toBe('primary');
    await expect(code.variant).toBe('primary');
  },
};

/**
 * BDD: テキストコンテンツの確認
 */
export const BDD_TextContent: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code data-testid="text-code">const value = 42;</ui-code>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const code = canvas.getByTestId('text-code') as UiCode;

    // テキストコンテンツが正しく表示されているか
    await expect(code.textContent?.trim()).toBe('const value = 42;');
  },
};
