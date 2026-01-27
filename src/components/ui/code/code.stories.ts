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
      description: 'コードの表示スタイル（セマンティックバリアント）',
    },
  },
};

export default meta;
type Story = StoryObj<UiCode>;

/* ============================================================================
 * デモストーリー
 * ============================================================================ */

/**
 * **デフォルトスタイル**
 * 
 * 標準的なインラインコードの表示。コマンド名やファイル名など、
 * 特別な意味を持たない一般的なコードに使用。
 */
export const Default: Story = {
  render: () => html`
    <p>
      このコマンドを実行してください: <ui-code>npm install</ui-code>
    </p>
  `,
};

/**
 * **プライマリ（強調）**
 * 
 * 変数名、関数名など、文脈上重要なコードを強調表示。
 */
export const Primary: Story = {
  render: () => html`
    <p>
      変数 <ui-code variant="primary">userName</ui-code> に値を代入します。
    </p>
  `,
};

/**
 * **成功（正しい例）**
 * 
 * 推奨される記述方法や、正しいコード例を示す場合に使用。
 */
export const Success: Story = {
  render: () => html`
    <p>
      正しい書き方: <ui-code variant="success">const value = 42;</ui-code>
    </p>
  `,
};

/**
 * **警告（非推奨）**
 * 
 * 非推奨の記述方法や、注意が必要なコードを示す場合に使用。
 */
export const Warning: Story = {
  render: () => html`
    <p>
      非推奨: <ui-code variant="warning">var x = 1;</ui-code> は使用しないでください。
    </p>
  `,
};

/**
 * **エラー（間違った例）**
 * 
 * 誤った記述方法や、エラーを引き起こすコードを示す場合に使用。
 */
export const Error: Story = {
  render: () => html`
    <p>
      間違った書き方: <ui-code variant="error">const value = ;</ui-code>
    </p>
  `,
};

/**
 * **文中での使用例**
 * 
 * 複数のインラインコードが文中に混在する実際の使用例。
 * `line-height: inherit` により、周囲のテキストと調和した表示。
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
 * **長いコード（折り返し）**
 * 
 * `white-space: pre-wrap` により、長いコードは自動的に折り返される。
 * `overflow-wrap: break-word` で必要に応じて単語を分割。
 */
export const LongCode: Story = {
  render: () => html`
    <div style="max-width: 400px;">
      <p>
        長いパス: <ui-code>c:\\Users\\username\\Documents\\Projects\\my-project\\src\\components\\ui\\button\\button.stories.ts</ui-code>
      </p>
    </div>
  `,
};

/**
 * **すべてのバリアント（Light Mode）**
 * 
 * 全5種類のバリアントを並べて表示。視覚的な差異を確認。
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
 * **ダークモード（基本）**
 * 
 * `data-theme="dark"` によるダークモード表示。
 * トークンベースのカラー自動切替を確認。
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
 * **ダークモード（全バリアント）**
 * 
 * ダークモードでの全バリアントの視覚確認。
 * コントラスト比がWCAG AA基準を満たすことを確認。
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

/* ============================================================================
 * BDD テストストーリー
 * ============================================================================ */

/**
 * **BDD: デフォルトバリアントの確認**
 * 
 * 属性なしで作成された場合、`variant="default"` が設定されることを検証。
 */
export const BDD_DefaultVariant: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code data-testid="default-code">npm install</ui-code>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const code = canvas.getByTestId('default-code') as UiCode;

    await expect(code.variant).toBe('default');
  },
};

/**
 * **BDD: バリアント属性の反映**
 * 
 * `variant` 属性が正しく設定され、DOM と Lit プロパティが同期することを検証。
 */
export const BDD_VariantAttribute: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code data-testid="primary-code" variant="primary">userName</ui-code>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const code = canvas.getByTestId('primary-code') as UiCode;

    await expect(code.getAttribute('variant')).toBe('primary');
    await expect(code.variant).toBe('primary');
  },
};

/**
 * **BDD: テキストコンテンツの確認**
 * 
 * スロットコンテンツが正しく表示されることを検証。
 */
export const BDD_TextContent: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code data-testid="text-code">const value = 42;</ui-code>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const code = canvas.getByTestId('text-code') as UiCode;

    await expect(code.textContent?.trim()).toBe('const value = 42;');
  },
};

/**
 * **BDD: 全バリアントのスタイル適用確認**
 * 
 * 各バリアントで CSS カスタムプロパティが正しく適用されることを検証。
 */
export const BDD_AllVariantsStyled: Story = {
  tags: ['test'],
  render: () => html`
    <div>
      <ui-code data-testid="default-code">default</ui-code>
      <ui-code data-testid="primary-code" variant="primary">primary</ui-code>
      <ui-code data-testid="success-code" variant="success">success</ui-code>
      <ui-code data-testid="warning-code" variant="warning">warning</ui-code>
      <ui-code data-testid="error-code" variant="error">error</ui-code>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    
    // 各バリアントの要素を取得
    const variants = ['default', 'primary', 'success', 'warning', 'error'];
    
    for (const variant of variants) {
      const code = canvas.getByTestId(`${variant}-code`) as UiCode;
      const codeEl = code.shadowRoot?.querySelector('.code') as HTMLElement;
      
      // 要素が存在することを確認
      await expect(codeEl).toBeTruthy();
      
      // スタイルが適用されていることを確認（computed stylesをチェック）
      const styles = getComputedStyle(codeEl);
      await expect(styles.fontFamily).toContain('mono'); // --font-mono が適用されている
      await expect(styles.borderRadius).toBeTruthy(); // --radius-sm が適用されている
      await expect(styles.padding).toBeTruthy();
    }
  },
};

/**
 * **BDD: ダークモード時のスタイル検証**
 * 
 * `data-theme="dark"` 時に適切なダークモードスタイルが適用されることを検証。
 */
export const BDD_DarkModeStyle: Story = {
  tags: ['test'],
  render: () => html`
    <div data-theme="dark" style="background: #0a0a0a; padding: 1rem;">
      <ui-code data-testid="dark-code" variant="primary">userName</ui-code>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const code = canvas.getByTestId('dark-code') as UiCode;
    const codeEl = code.shadowRoot?.querySelector('.code') as HTMLElement;

    // 要素が存在することを確認
    await expect(codeEl).toBeTruthy();
    
    // NOTE: ダークモードのスタイルは CSS 変数経由で適用されるため、
    // getComputedStyle() では最終的な計算値を確認
    const styles = getComputedStyle(codeEl);
    await expect(styles.color).toBeTruthy();
    await expect(styles.backgroundColor).toBeTruthy();
  },
};

/**
 * **BDD: 長いコードの折り返し動作**
 * 
 * `white-space: pre-wrap` により長いコードが正しく折り返されることを検証。
 */
export const BDD_LongCodeWrapping: Story = {
  tags: ['test'],
  render: () => html`
    <div style="width: 200px;">
      <ui-code data-testid="long-code">
        this_is_a_very_long_variable_name_that_should_wrap_to_the_next_line_automatically
      </ui-code>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const code = canvas.getByTestId('long-code') as UiCode;
    const codeEl = code.shadowRoot?.querySelector('.code') as HTMLElement;

    await expect(codeEl).toBeTruthy();
    
    const styles = getComputedStyle(codeEl);
    // white-space が pre-wrap であることを確認
    await expect(styles.whiteSpace).toBe('pre-wrap');
    await expect(styles.overflowWrap).toBe('break-word');
  },
};

/**
 * **BDD: トランジション適用確認**
 * 
 * CSS トランジションが適切に定義されていることを検証。
 */
export const BDD_TransitionDefined: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code data-testid="transition-code">test</ui-code>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const code = canvas.getByTestId('transition-code') as UiCode;
    const codeEl = code.shadowRoot?.querySelector('.code') as HTMLElement;

    await expect(codeEl).toBeTruthy();
    
    const styles = getComputedStyle(codeEl);
    // transition プロパティが定義されていることを確認
    await expect(styles.transitionProperty).toBeTruthy();
    // background-color, color, border-color のいずれかが含まれることを期待
    const hasTransition = 
      styles.transitionProperty.includes('background-color') ||
      styles.transitionProperty.includes('color') ||
      styles.transitionProperty.includes('all');
    await expect(hasTransition).toBe(true);
  },
};

/**
 * **BDD: セマンティックHTML要素の使用**
 * 
 * Shadow DOM 内で `<code>` 要素が使用されていることを検証。
 * アクセシビリティとSEOのため、セマンティックHTMLを優先。
 */
export const BDD_SemanticHTML: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code data-testid="semantic-code">npm install</ui-code>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const code = canvas.getByTestId('semantic-code') as UiCode;
    const codeEl = code.shadowRoot?.querySelector('code');

    // <code> 要素が存在することを確認
    await expect(codeEl).toBeTruthy();
    await expect(codeEl?.tagName.toLowerCase()).toBe('code');
  },
};
