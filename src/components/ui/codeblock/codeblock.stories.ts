import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './codeblock';
import type { CodeBlock } from './codeblock';

type CopyButtonElement = HTMLElement & { label: string; value: string };

const getCodeBlock = (canvasElement: Element, id: string): CodeBlock => {
  const block = canvasElement.querySelector<CodeBlock>(`#${id}`);
  if (!block) throw new Error(`ui-code-block#${id} が見つかりません`);
  return block;
};

const getPre = (block: CodeBlock): HTMLPreElement => {
  const pre = block.querySelector('pre');
  if (!pre) throw new Error('pre 要素が見つかりません');
  return pre;
};

const getRootFigure = (block: CodeBlock): HTMLElement => {
  const root = block.shadowRoot?.querySelector<HTMLElement>('figure.root');
  if (!root) throw new Error('figure.root が見つかりません');
  return root;
};

const getCopyButton = (block: CodeBlock): CopyButtonElement => {
  const copyButton = block.shadowRoot?.querySelector<CopyButtonElement>('ui-copy-button');
  if (!copyButton) throw new Error('ui-copy-button が見つかりません');
  return copyButton;
};

const meta: Meta<CodeBlock> = {
  title: 'Components/Code Block',
  component: 'ui-code-block',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
コードブロックコンポーネントです。Shikiで生成された \`pre/code\` を受け取り、ヘッダー・Copy Action・A11y文言を統合します。

## このストーリーで検証する観点
- \`intent\`（neutral/valid/invalid）に応じた文脈表現
- \`--ui-code-block-header-display\` > \`headless\` の表示優先順位
- \`show-line-numbers\` の挙動とコピー内容の純度
- 長行オーバーフロー時の \`tabindex="0"\` + \`aria-label\`
- 境界条件（不正intent・メタデータ欠落）
        `,
      },
    },
  },
  argTypes: {
    filename: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'ヘッダーに表示するファイル名',
    },
    lang: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '言語名（例: ts, css）。data-lang属性とA11y文言に使用',
    },
    label: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'Code Group連携用ラベル',
    },
    intent: {
      control: 'inline-radio',
      options: ['neutral', 'valid', 'invalid'],
      table: {
        type: { summary: "'neutral' | 'valid' | 'invalid'" },
        defaultValue: { summary: "'neutral'" },
      },
      description: 'コード例の意味状態（正しい例/誤り例）',
    },
    showLineNumbers: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: '行番号表示',
    },
    headless: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: '外装（ヘッダー/コピー/枠）を初期的に無効化',
    },
  },
};

export default meta;
type Story = StoryObj<CodeBlock>;

/**
 * デフォルト状態。
 * neutral + filename + lang の基本ケースを確認します。
 */
export const Default: Story = {
  render: () => html`
    <ui-code-block
      id="default-block"
      filename="index.ts"
      lang="ts"
      style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
    >
      <pre class="shiki"><code>const greeting = 'hello';
console.log(greeting);</code></pre>
    </ui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'default-block');
    await block.updateComplete;

    if (block.getAttribute('data-lang') !== 'ts') {
      throw new Error(`Expected data-lang="ts", got "${block.getAttribute('data-lang') ?? 'null'}"`);
    }

    const root = getRootFigure(block);
    if (root.getAttribute('aria-description') !== 'TypeScript のコード') {
      throw new Error('aria-description が期待値（TypeScript のコード）と一致しません');
    }

    const filename = block.shadowRoot?.querySelector<HTMLElement>('.filename');
    if (!filename) {
      throw new Error('filename 表示が見つかりません');
    }
    if (!filename.textContent.includes('index.ts')) {
      throw new Error('filename 表示が見つからないか、内容が不正です');
    }

    const pre = getPre(block);
    if (pre.hasAttribute('tabindex')) {
      throw new Error('短いコードでは tabindex が不要です');
    }

    const copyButton = getCopyButton(block);
    if (copyButton.label !== 'index.ts のコードをコピー') {
      throw new Error(`copy button label が不正です: "${copyButton.label}"`);
    }

    const codeContent = block.getCodeContent();
    if (!codeContent.includes("const greeting = 'hello';")) {
      throw new Error('getCodeContent() がコード本文を返していません');
    }
    if (copyButton.value !== codeContent) {
      throw new Error('copy button value と getCodeContent() の結果が一致しません');
    }
  },
};

/**
 * 意味状態の組み合わせ。
 * neutral/valid/invalid の文脈表示とA11y文言を確認します。
 */
export const IntentStates: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-block
        id="intent-neutral"
        filename="neutral.ts"
        lang="ts"
        intent="neutral"
        style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
      >
        <pre><code>const value = 1;</code></pre>
      </ui-code-block>

      <ui-code-block
        id="intent-valid"
        filename="valid.ts"
        lang="ts"
        intent="valid"
        style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
      >
        <pre><code>const message = 'ok';</code></pre>
      </ui-code-block>

      <ui-code-block
        id="intent-invalid"
        filename="invalid.ts"
        lang="ts"
        intent="invalid"
        style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
      >
        <pre><code>const message = ;</code></pre>
      </ui-code-block>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const neutral = getCodeBlock(canvasElement, 'intent-neutral');
    const valid = getCodeBlock(canvasElement, 'intent-valid');
    const invalid = getCodeBlock(canvasElement, 'intent-invalid');
    await Promise.all([neutral.updateComplete, valid.updateComplete, invalid.updateComplete]);

    const neutralIntent = neutral.shadowRoot?.querySelector('.intent');
    if (neutralIntent) {
      throw new Error('neutral では intent ラベルを表示しない想定です');
    }

    const validRoot = getRootFigure(valid);
    if (!validRoot.getAttribute('aria-description')?.includes('正しいコード例')) {
      throw new Error('valid の aria-description に状態情報が含まれていません');
    }

    const validIntent = valid.shadowRoot?.querySelector<HTMLElement>('.intent');
    if (!validIntent?.textContent.includes('正しい例')) {
      throw new Error('valid の intent ラベル表示が不正です');
    }
    const validIcon = valid.shadowRoot?.querySelector<HTMLElement>('.intent iconify-icon');
    if (validIcon?.getAttribute('icon') !== 'lucide:check-circle') {
      throw new Error('valid の intent アイコンが不正です');
    }

    const invalidRoot = getRootFigure(invalid);
    if (!invalidRoot.getAttribute('aria-description')?.includes('誤りコード例')) {
      throw new Error('invalid の aria-description に状態情報が含まれていません');
    }

    const invalidIntent = invalid.shadowRoot?.querySelector<HTMLElement>('.intent');
    if (!invalidIntent?.textContent.includes('誤り例')) {
      throw new Error('invalid の intent ラベル表示が不正です');
    }
    const invalidIcon = invalid.shadowRoot?.querySelector<HTMLElement>('.intent iconify-icon');
    if (invalidIcon?.getAttribute('icon') !== 'lucide:alert-triangle') {
      throw new Error('invalid の intent アイコンが不正です');
    }
  },
};

/**
 * 表示制御の優先順位。
 * 親CSS変数 > headless > default を確認します。
 */
export const HeaderDisplayPriority: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-block
        id="priority-show"
        headless
        filename="priority-show.ts"
        lang="ts"
        style="
          --ui-code-block-breakout-width: 100%;
          --ui-code-block-breakout-margin: 0;
          --ui-code-block-header-display: block;
        "
      >
        <pre><code>const shouldShowHeader = true;</code></pre>
      </ui-code-block>

      <ui-code-block
        id="priority-hide"
        filename="priority-hide.ts"
        lang="ts"
        style="
          --ui-code-block-breakout-width: 100%;
          --ui-code-block-breakout-margin: 0;
          --ui-code-block-header-display: none;
        "
      >
        <pre><code>const shouldHideHeader = true;</code></pre>
      </ui-code-block>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const showBlock = getCodeBlock(canvasElement, 'priority-show');
    const hideBlock = getCodeBlock(canvasElement, 'priority-hide');
    await Promise.all([showBlock.updateComplete, hideBlock.updateComplete]);

    const showCaption = showBlock.shadowRoot?.querySelector<HTMLElement>('.caption');
    const hideCaption = hideBlock.shadowRoot?.querySelector<HTMLElement>('.caption');
    if (!showCaption || !hideCaption) {
      throw new Error('caption が見つかりません');
    }

    if (getComputedStyle(showCaption).display === 'none') {
      throw new Error('親CSS変数 block 指定時は headless より優先して caption が表示されるべきです');
    }

    if (getComputedStyle(hideCaption).display !== 'none') {
      throw new Error('親CSS変数 none 指定時は caption が非表示になるべきです');
    }
  },
};

/**
 * 行番号表示。
 * show-line-numbers 時のみ line ラッパーが整備されることを確認します。
 */
export const ShowLineNumbers: Story = {
  render: () => html`
    <ui-code-block
      id="line-number-block"
      filename="line-number.ts"
      lang="ts"
      show-line-numbers
      style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
    >
      <pre><code>const first = 1;
const second = 2;
console.log(first + second);</code></pre>
    </ui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'line-number-block');
    await block.updateComplete;

    const pre = getPre(block);
    const lines = pre.querySelectorAll<HTMLElement>('code .line');
    if (lines.length !== 3) {
      throw new Error(`Expected 3 line wrappers, got ${String(lines.length)}`);
    }

    const firstLine = lines[0];
    if (!firstLine) {
      throw new Error('1行目の line 要素が見つかりません');
    }

    const firstLineBeforeContent = getComputedStyle(firstLine, '::before').content;
    if (firstLineBeforeContent === 'none' || firstLineBeforeContent === '""') {
      throw new Error('show-line-numbers 時に行番号疑似要素が描画されていません');
    }

    const content = block.getCodeContent();
    if (content !== 'const first = 1;\nconst second = 2;\nconsole.log(first + second);') {
      throw new Error(`getCodeContent() の内容が不正です: "${content}"`);
    }
  },
};

/**
 * 長行オーバーフロー境界。
 * オーバーフロー時のみ pre に tabindex/aria-label が付与されることを確認します。
 */
export const OverflowScrollableArea: Story = {
  render: () => html`
    <div style="width: 280px;">
      <ui-code-block
        id="overflow-block"
        filename="overflow.ts"
        lang="ts"
        style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
      >
        <pre><code>const veryLongLine = '0123456789'.repeat(30) + '_this_line_must_overflow_the_container_width';</code></pre>
      </ui-code-block>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'overflow-block');
    await block.updateComplete;

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => { resolve(); });
    });

    const pre = getPre(block);
    if (pre.getAttribute('tabindex') !== '0') {
      throw new Error('オーバーフロー時は pre に tabindex="0" が必要です');
    }
    if (pre.getAttribute('aria-label') !== 'overflow.ts コード') {
      throw new Error(`aria-label が不正です: "${pre.getAttribute('aria-label') ?? 'null'}"`);
    }
  },
};

/**
 * 事故が多い境界条件。
 * - 不正 intent のフォールバック
 * - line-number 要素が混在しても getCodeContent が純粋なコードを返す
 */
export const BoundaryFallbacksAndCopyExtraction: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-block
        id="fallback-block"
        intent="mystery"
        style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
      >
        <pre><code>const fallback = true;</code></pre>
      </ui-code-block>

      <ui-code-block
        id="copy-boundary-block"
        filename="copy-boundary.ts"
        lang="ts"
        style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
      >
        <pre><code><span class="line"><span class="line-number" aria-hidden="true">1</span>const ok = true;</span>
<span class="line"><span class="line-number" aria-hidden="true">2</span>console.log(ok);</span></code></pre>
      </ui-code-block>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fallback = getCodeBlock(canvasElement, 'fallback-block');
    const copyBoundary = getCodeBlock(canvasElement, 'copy-boundary-block');
    await Promise.all([fallback.updateComplete, copyBoundary.updateComplete]);

    if (fallback.intent !== 'neutral') {
      throw new Error(`不正 intent は neutral にフォールバックすべきです。現在: "${fallback.intent}"`);
    }

    const fallbackRoot = getRootFigure(fallback);
    if (fallbackRoot.getAttribute('aria-description') !== 'コード') {
      throw new Error(
        `メタデータ欠落時の aria-description は "コード" の想定です。現在: "${fallbackRoot.getAttribute('aria-description') ?? 'null'}"`,
      );
    }

    const extracted = copyBoundary.getCodeContent();
    if (extracted.includes('1const') || extracted.includes('2console')) {
      throw new Error('line-number がコピー内容に混入しています');
    }
    if (extracted !== 'const ok = true;\nconsole.log(ok);') {
      throw new Error(`抽出コードが不正です: "${extracted}"`);
    }

    const copyButton = getCopyButton(copyBoundary);
    if (copyButton.value !== extracted) {
      throw new Error('copy-button の value が抽出コードと一致しません');
    }
  },
};
