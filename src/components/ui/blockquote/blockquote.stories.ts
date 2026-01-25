import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within } from 'storybook/test';
import type { UiBlockquote } from './blockquote';
import './blockquote.ts';

const meta: Meta<UiBlockquote> = {
  title: 'Components/Blockquote',
  component: 'ui-blockquote',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'highlighted', 'bordered'],
      description: '引用ブロックのスタイルバリアント',
    },
    cite: {
      control: { type: 'text' },
      description: '引用元のURL',
    },
    author: {
      control: { type: 'text' },
      description: '著者名（オプション）',
    },
    source: {
      control: { type: 'text' },
      description: '出典（オプション）',
    },
  },
};

export default meta;
type Story = StoryObj<UiBlockquote>;

/**
 * デフォルト: シンプルな引用ブロック
 */
export const Default: Story = {
  render: () => html`
    <ui-blockquote>
      <p>The best way to predict the future is to invent it.</p>
    </ui-blockquote>
  `,
};

/**
 * 著者名付き
 */
export const WithAuthor: Story = {
  render: () => html`
    <ui-blockquote author="Alan Kay">
      <p>The best way to predict the future is to invent it.</p>
    </ui-blockquote>
  `,
};

/**
 * 出典付き
 */
export const WithSource: Story = {
  render: () => html`
    <ui-blockquote author="Steve Jobs" source="Stanford Commencement Speech, 2005">
      <p>Stay hungry, stay foolish.</p>
    </ui-blockquote>
  `,
};

/**
 * cite属性付き（引用元URL）
 */
export const WithCite: Story = {
  render: () => html`
    <ui-blockquote 
      cite="https://example.com/article" 
      author="John Doe" 
      source="Example Blog">
      <p>Design is not just what it looks like and feels like. Design is how it works.</p>
    </ui-blockquote>
  `,
};

/**
 * ハイライトバリアント
 */
export const Highlighted: Story = {
  render: () => html`
    <ui-blockquote variant="highlighted" author="Albert Einstein">
      <p>Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.</p>
    </ui-blockquote>
  `,
};

/**
 * ボーダーバリアント
 */
export const Bordered: Story = {
  render: () => html`
    <ui-blockquote variant="bordered" author="Maya Angelou" source="Letter to My Daughter">
      <p>There is no greater agony than bearing an untold story inside you.</p>
    </ui-blockquote>
  `,
};

/**
 * 長い引用
 */
export const LongQuote: Story = {
  render: () => html`
    <ui-blockquote author="Martin Luther King Jr." source="I Have a Dream Speech, 1963">
      <p>
        I have a dream that one day this nation will rise up and live out the true meaning of its creed: 
        "We hold these truths to be self-evident, that all men are created equal."
      </p>
      <p>
        I have a dream that one day on the red hills of Georgia, the sons of former slaves and the sons 
        of former slave owners will be able to sit down together at the table of brotherhood.
      </p>
    </ui-blockquote>
  `,
};

/**
 * 複数の引用ブロック
 */
export const MultipleQuotes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <ui-blockquote author="Leonardo da Vinci">
        <p>Simplicity is the ultimate sophistication.</p>
      </ui-blockquote>
      
      <ui-blockquote variant="highlighted" author="Dieter Rams">
        <p>Good design is as little design as possible.</p>
      </ui-blockquote>
      
      <ui-blockquote variant="bordered" author="Massimo Vignelli">
        <p>The life of a designer is a life of fight: fight against the ugliness.</p>
      </ui-blockquote>
    </div>
  `,
};

/**
 * 文書内での使用例
 */
export const InDocument: Story = {
  render: () => html`
    <article style="max-width: 600px;">
      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Design Philosophy</h2>
      <p style="line-height: 1.7; color: var(--color-foreground, #0a0a0a); margin-bottom: 1.5rem;">
        Great designers throughout history have shared their insights on what makes design truly effective.
        Here are some of the most influential quotes:
      </p>
      
      <ui-blockquote author="Dieter Rams">
        <p>Good design is innovative, useful, aesthetic, understandable, unobtrusive, honest, long-lasting, 
        thorough, and environmentally friendly.</p>
      </ui-blockquote>
      
      <p style="line-height: 1.7; color: var(--color-foreground, #0a0a0a); margin-top: 1.5rem;">
        These principles continue to influence modern design systems and interface design.
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
      <ui-blockquote author="Steve Jobs">
        <p style="color: #ededed;">Design is not just what it looks like and feels like. Design is how it works.</p>
      </ui-blockquote>
      
      <ui-blockquote variant="highlighted" author="Jony Ive" style="margin-top: 1.5rem;">
        <p style="color: #ededed;">We try to develop products that seem somehow inevitable.</p>
      </ui-blockquote>
    </div>
  `,
};

/**
 * BDD: バリアント属性テスト
 */
export const BDD_VariantAttribute: Story = {
  tags: ['test'],
  render: () => html`
    <ui-blockquote data-testid="blockquote-variant" variant="highlighted">
      <p>Test quote</p>
    </ui-blockquote>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const blockquote = canvas.getByTestId('blockquote-variant') as UiBlockquote;

    await blockquote.updateComplete;

    // variant 属性が正しく反映されているか
    await expect(blockquote.getAttribute('variant')).toBe('highlighted');
  },
};

/**
 * BDD: 著者名表示テスト
 */
export const BDD_AuthorDisplay: Story = {
  tags: ['test'],
  render: () => html`
    <ui-blockquote data-testid="blockquote-author" author="Test Author" source="Test Source">
      <p>Test quote with author</p>
    </ui-blockquote>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const blockquote = canvas.getByTestId('blockquote-author') as UiBlockquote;

    await blockquote.updateComplete;

    // author 属性が正しく反映されているか
    await expect(blockquote.getAttribute('author')).toBe('Test Author');
    
    // Shadow DOM内にfooter（著者情報）が表示されているか
    const footer = blockquote.shadowRoot?.querySelector('footer');
    await expect(footer).toBeTruthy();
    await expect(footer?.textContent).toContain('Test Author');
    await expect(footer?.textContent).toContain('Test Source');
  },
};

/**
 * BDD: セマンティックHTMLテスト
 */
export const BDD_SemanticHTML: Story = {
  tags: ['test'],
  render: () => html`
    <ui-blockquote data-testid="blockquote-semantic" cite="https://example.com">
      <p>Semantic test</p>
    </ui-blockquote>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const blockquote = canvas.getByTestId('blockquote-semantic') as UiBlockquote;

    await blockquote.updateComplete;

    // Shadow DOM内にblockquote要素があるか
    const blockquoteElement = blockquote.shadowRoot?.querySelector('blockquote');
    await expect(blockquoteElement).toBeTruthy();
    
    // cite属性が正しく設定されているか
    await expect(blockquoteElement?.getAttribute('cite')).toBe('https://example.com');
  },
};
