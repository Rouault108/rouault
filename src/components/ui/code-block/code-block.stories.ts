import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within } from 'storybook/test';
import type { UiCodeBlock } from './code-block';
import './code-block.ts';

const meta: Meta<UiCodeBlock> = {
  title: 'Components/CodeBlock',
  component: 'ui-code-block',
  tags: ['autodocs'],
  argTypes: {
    language: {
      control: { type: 'text' },
      description: 'プログラミング言語',
    },
    filename: {
      control: { type: 'text' },
      description: 'ファイル名（オプション）',
    },
    showLineNumbers: {
      control: { type: 'boolean' },
      description: '行番号を表示するか',
    },
    highlightLines: {
      control: { type: 'text' },
      description: 'ハイライトする行（例: "1,3-5,8"）',
    },
    rawHtml: {
      control: { type: 'boolean' },
      description: 'HTMLモード（ハイライト済みHTMLを表示）',
    },
    collapsible: {
      control: { type: 'boolean' },
      description: '折りたたみ機能を有効にするか',
    },
    maxHeight: {
      control: { type: 'number' },
      description: '折りたたみ時の最大高さ(px)',
    },
  },
};

export default meta;
type Story = StoryObj<UiCodeBlock>;

const jsCode = `function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');`;

const tsCode = `interface User {
  id: number;
  name: string;
}

const user: User = {
  id: 1,
  name: 'Alice',
};`;

const cssCode = `.button {
  display: inline-flex;
  padding: 0.5rem 1rem;
  background-color: var(--color-primary);
  color: white;
  border-radius: 0.375rem;
  transition: background-color 200ms ease;
}

.button:hover {
  background-color: var(--color-primary-hover);
}`;

const htmlCode = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>サンプルページ</title>
</head>
<body>
  <h1>Hello, World!</h1>
</body>
</html>`;

/**
 * デフォルトスタイル
 */
export const Default: Story = {
  render: () => html`
    <ui-code-block language="javascript">
${jsCode}
    </ui-code-block>
  `,
};

/**
 * TypeScript
 */
export const TypeScript: Story = {
  render: () => html`
    <ui-code-block language="typescript">
${tsCode}
    </ui-code-block>
  `,
};

/**
 * CSS
 */
export const CSS: Story = {
  render: () => html`
    <ui-code-block language="css">
${cssCode}
    </ui-code-block>
  `,
};

/**
 * HTML
 */
export const HTML: Story = {
  render: () => html`
    <ui-code-block language="html">
${htmlCode}
    </ui-code-block>
  `,
};

/**
 * 行番号付き
 */
export const WithLineNumbers: Story = {
  render: () => html`
    <ui-code-block language="typescript" showLineNumbers>
${tsCode}
    </ui-code-block>
  `,
};

/**
 * ファイル名付き
 */
export const WithFilename: Story = {
  render: () => html`
    <ui-code-block language="typescript" filename="user.ts">
${tsCode}
    </ui-code-block>
  `,
};

/**
 * 行番号とファイル名
 */
export const WithLineNumbersAndFilename: Story = {
  render: () => html`
    <ui-code-block language="typescript" filename="user.ts" showLineNumbers>
${tsCode}
    </ui-code-block>
  `,
};

/**
 * ハイライト行
 */
export const WithHighlight: Story = {
  render: () => html`
    <ui-code-block language="typescript" showLineNumbers highlightLines="3-7">
${tsCode}
    </ui-code-block>
  `,
};

/**
 * Diff表示
 * コードの追加・削除箇所をハイライトします。
 */
export const DiffView: Story = {
  render: () => html`
    <ui-code-block language="javascript">
${`function calculateTotal(price, tax) {
  // [!code --]
  return price + tax;
  // [!code ++]
  return price * (1 + tax);
}

const total = calculateTotal(100, 0.1);
console.log(total); // [!code ++]`}
    </ui-code-block>
  `,
};

/**
 * 長いコード
 */
export const LongCode: Story = {
  render: () => html`
    <ui-code-block language="javascript" filename="example.js" showLineNumbers>
${`// Lorem ipsum dolor sit amet
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

for (let i = 0; i < 20; i++) {
  console.log(\`fibonacci(\${i}) = \${fibonacci(i)}\`);
}

// More code...
const data = [1, 2, 3, 4, 5];
const squared = data.map(x => x * x);
console.log(squared);

function* range(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

for (const value of range(1, 10)) {
  console.log(value);
}`}
    </ui-code-block>
  `,
};

/**
 * 横に長いコード
 */
export const LongCodeHorizontal: Story = {
  render: () => html`
  <ui-code-block language="javascript" filename="long-horizontal-code.js">const veryLongVariableName = 'This is a very long variable name that will likely cause the code block to overflow if not handled properly.';</ui-code-block>
  `
}

/**
 * 折りたたみ機能 (Collapse)
 * 長いコードを指定された高さで省略表示し、展開できます。
 */
export const Collapsible: Story = {
  render: () => html`
    <ui-code-block language="javascript" filename="long-script.js" showLineNumbers collapsible>
${`// かなり長いコードのシミュレーション
// 1. 基本設定
const config = {
  port: 8080,
  env: 'production',
  db: {
    host: 'localhost',
    user: 'admin',
  }
};

// 2. 初期化処理
function initialize() {
  console.log('Initializing system...');
  // 複雑なセットアップ処理...
  setupDatabase();
  setupMiddleware();
  setupRoutes();
}

function setupDatabase() {
  console.log('Connecting to database...');
  // 接続処理...
}

function setupMiddleware() {
  console.log('Loading middleware...');
  // ミドルウェア登録...
}

function setupRoutes() {
  console.log('Registering routes...');
  // ルート定義...
}

// 3. メインループ
function startServer() {
  initialize();
  console.log(\`Server running on port \${config.port}\`);
  
  // サーバー待機...
  setInterval(() => {
    // ヘルスチェック
    checkStatus();
  }, 5000);
}

function checkStatus() {
  console.log('System OK');
}

// 4. エラーハンドリング
process.on('uncaughtException', (err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// 起動
startServer();
`}
    </ui-code-block>
  `,
};

/**
 * ダークモード
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background: #0a0a0a; padding: 2rem;">
      <ui-code-block language="typescript" filename="user.ts" showLineNumbers>
${tsCode}
      </ui-code-block>
    </div>
  `,
};

/**
 * BDD: 言語属性の確認
 */
export const BDD_Language: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-block data-testid="code-block" language="javascript">
${jsCode}
    </ui-code-block>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeBlock = canvas.getByTestId('code-block') as UiCodeBlock;

    // language属性が正しく設定されているか
    await expect(codeBlock.language).toBe('javascript');
  },
};

/**
 * BDD: ファイル名表示の確認
 */
export const BDD_Filename: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-block data-testid="code-block-filename" language="typescript" filename="test.ts">
${tsCode}
    </ui-code-block>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeBlock = canvas.getByTestId('code-block-filename') as UiCodeBlock;

    // filename属性が正しく設定されているか
    await expect(codeBlock.filename).toBe('test.ts');
  },
};

/**
 * BDD: 行番号表示の確認
 */
export const BDD_LineNumbers: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-block data-testid="code-block-lines" language="javascript" showLineNumbers>
${jsCode}
    </ui-code-block>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeBlock = canvas.getByTestId('code-block-lines') as UiCodeBlock;

    // showLineNumbers属性が正しく設定されているか
    await expect(codeBlock.showLineNumbers).toBe(true);

    // 行番号が表示されているか
    const lineNumbers = codeBlock.shadowRoot?.querySelectorAll('.line-number');
    await expect(lineNumbers && lineNumbers.length > 0).toBe(true);
  },
};

/**
 * BDD: コピー機能
 */
export const BDD_CopyButton: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-block data-testid="code-block-copy" language="javascript">
${jsCode}
    </ui-code-block>
  `,
  // Copy機能のテストにはclipboard APIのモックが必要な場合があるため簡易的に
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeBlock = canvas.getByTestId('code-block-copy') as UiCodeBlock;

    // コピーボタンが存在するか
    const copyButton = codeBlock.shadowRoot?.querySelector('.action-button') as HTMLElement;
    await expect(copyButton).toBeInTheDocument();
  },
};

/**
 * BDD: コピー機能（インタラクション）
 */
export const BDD_CopyInteraction: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-block data-testid="code-block-copy-interaction" language="javascript">
${jsCode}
    </ui-code-block>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeBlock = canvas.getByTestId('code-block-copy-interaction') as UiCodeBlock;

    // Clipboard APIをモック
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          // コピーされたテキストを検証
          await expect(text).toBe(jsCode);
        },
      },
      configurable: true,
      writable: true,
    });

    const copyButton = codeBlock.shadowRoot?.querySelector('.action-button[aria-label*="コピー"]') as HTMLElement;
    await expect(copyButton).toBeInTheDocument();

    // ボタンをクリック
    copyButton?.click();

    // 少し待機してから状態を確認
    await new Promise(resolve => setTimeout(resolve, 100));

    // copiedクラスが付与されているか
    const copiedButton = codeBlock.shadowRoot?.querySelector('.action-button.copied') as HTMLElement;
    await expect(copiedButton).toBeInTheDocument();

    // クリーンアップ
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  },
};

/**
 * BDD: Word Wrap機能
 */
export const BDD_WordWrap: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-block data-testid="code-block-wrap" language="javascript">
${jsCode}
    </ui-code-block>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeBlock = canvas.getByTestId('code-block-wrap') as UiCodeBlock;

    // 折り返しボタンを取得
    const wrapButton = codeBlock.shadowRoot?.querySelector('.action-button[aria-label*="折り返し"]') as HTMLElement;
    await expect(wrapButton).toBeInTheDocument();

    // 初期状態: word-wrapクラスがない
    const codeContentBefore = codeBlock.shadowRoot?.querySelector('.code-content');
    await expect(codeContentBefore?.classList.contains('word-wrap')).toBe(false);

    // ボタンをクリック
    wrapButton?.click();

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 100));

    // word-wrapクラスが付与されているか
    const codeContentAfter = codeBlock.shadowRoot?.querySelector('.code-content');
    await expect(codeContentAfter?.classList.contains('word-wrap')).toBe(true);

    // aria-pressedが true になっているか
    await expect(wrapButton.getAttribute('aria-pressed')).toBe('true');
  },
};

/**
 * BDD: Diff表示
 */
export const BDD_Diff: Story = {
  tags: ['test'],
  render: () => html`
    <ui-code-block data-testid="code-block-diff" language="javascript">
${`function test() {
  // [!code --]
  return old;
  // [!code ++]
  return new;
}`}
    </ui-code-block>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const codeBlock = canvas.getByTestId('code-block-diff') as UiCodeBlock;

    // Diffが検出されて has-diff クラスが付与されているか
    await new Promise(resolve => setTimeout(resolve, 500)); // ハイライト処理を待つ
    
    const codeContent = codeBlock.shadowRoot?.querySelector('.code-content');
    await expect(codeContent?.classList.contains('has-diff')).toBe(true);

    // Diff行が存在するか
    const diffLines = codeBlock.shadowRoot?.querySelectorAll('.line.diff');
    await expect(diffLines && diffLines.length > 0).toBe(true);
  },
};
