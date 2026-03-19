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

const nextFrame = async (): Promise<void> =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const isRendered = (element: Element): boolean => element.getClientRects().length > 0;

const getDocumentCodeBlockStyle = (): HTMLStyleElement => {
  const style = document.getElementById('ui-code-block-document-styles');
  if (!(style instanceof HTMLStyleElement)) {
    throw new Error('ui-code-block-document-styles が見つかりません');
  }
  return style;
};

const getShadowStylesText = (shadowRoot: ShadowRoot | null): string => {
  if (!shadowRoot) return '';

  const inlineStyles = Array.from(shadowRoot.querySelectorAll('style'))
    .map((style) => style.textContent)
    .join('\n');

  const adoptedStyles = shadowRoot.adoptedStyleSheets
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  return `${inlineStyles}\n${adoptedStyles}`;
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
- 例外折り返し（\`data-wrap="true"\`）の適用
- ダークトークン適応とメディア系CSS契約（forced-colors / print）
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
      throw new Error(
        `Expected data-lang="ts", got "${block.getAttribute('data-lang') ?? 'null'}"`,
      );
    }

    const root = getRootFigure(block);
    if (root.getAttribute('aria-description') !== 'TypeScript のコード') {
      throw new Error('aria-description が期待値（TypeScript のコード）と一致しません');
    }
    const rootStyle = getComputedStyle(root);
    if (rootStyle.borderTopStyle === 'none' || rootStyle.borderTopWidth === '0px') {
      throw new Error('コードブロック外枠が非表示です（border token の適用が必要）');
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
    const showCopy = showBlock.shadowRoot?.querySelector<HTMLElement>(
      '.copy-button-shell ui-copy-button',
    );
    const hideCopy = hideBlock.shadowRoot?.querySelector<HTMLElement>(
      '.copy-button-shell ui-copy-button',
    );
    if (!showCaption || !hideCaption) {
      throw new Error('caption が見つかりません');
    }
    if (!showCopy || !hideCopy) {
      throw new Error('ui-copy-button が見つかりません');
    }

    if (getComputedStyle(showCaption).display === 'none') {
      throw new Error(
        '親CSS変数 block 指定時は headless より優先して caption が表示されるべきです',
      );
    }

    if (getComputedStyle(hideCaption).display !== 'none') {
      throw new Error('親CSS変数 none 指定時は caption が非表示になるべきです');
    }
    if (!isRendered(showCopy)) {
      throw new Error(
        '親CSS変数 block 指定時は copy-button がレイアウト上で可視状態であるべきです',
      );
    }
    if (isRendered(hideCopy)) {
      throw new Error('親CSS変数 none 指定時は copy-button がレイアウト上で非表示であるべきです');
    }
  },
};

/**
 * フォーカス時の可視化優先。
 * :focus-within 起因で copy-button が即時可視化（duration-instant）されることを確認します。
 */
export const FocusWithinInstantVisibility: Story = {
  render: () => html`
    <div style="width: 280px;">
      <ui-code-block
        id="focus-instant-block"
        filename="focus-instant.ts"
        lang="ts"
        style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
      >
        <pre><code>const longLine = '0123456789'.repeat(40) + '_force_overflow';</code></pre>
      </ui-code-block>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'focus-instant-block');
    await block.updateComplete;

    await nextFrame();

    const pre = getPre(block);
    if (pre.getAttribute('tabindex') !== '0') {
      throw new Error('オーバーフロー時は pre がフォーカス可能である必要があります');
    }

    const copyButton = getCopyButton(block);
    pre.focus();

    await nextFrame();

    const copyStyle = getComputedStyle(copyButton);
    if (copyStyle.opacity !== '1') {
      throw new Error('focus-within 時に copy-button が可視化されていません');
    }
    if (!copyStyle.transitionDuration.includes('0s')) {
      throw new Error('focus-within 時の copy-button transition は即時化されるべきです');
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
 * Shiki の行ハイライトと差分行。
 * `.line.highlighted` / `.line.diff.*` の視覚契約とコピー純度を確認します。
 */
export const ShikiHighlightedLines: Story = {
  render: () => html`
    <ui-code-block
      id="shiki-highlighted-block"
      filename="example.ts"
      lang="ts"
      style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
    >
      <pre
        class="shiki shiki-themes github-light github-dark has-highlighted has-diff"
        data-raw="const highlighted = 1;
const added = 2;"
      >
        <code>
          <span class="line highlighted"><span style="color:#D73A49;--shiki-dark:#F97583">const</span><span style="color:#005CC5;--shiki-dark:#79B8FF"> highlighted = 1;</span></span>
          <span class="line diff add"><span style="color:#D73A49;--shiki-dark:#F97583">const</span><span style="color:#005CC5;--shiki-dark:#79B8FF"> added = 2;</span></span>
        </code>
      </pre>
    </ui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'shiki-highlighted-block');
    await block.updateComplete;

    const pre = getPre(block);
    const lines = Array.from(pre.querySelectorAll<HTMLElement>('code .line'));
    if (lines.length !== 2) {
      throw new Error(`Shiki の line 要素が不足しています。actual=${String(lines.length)}`);
    }

    const highlightedLine = lines[0];
    const addedLine = lines[1];
    if (!highlightedLine || !addedLine) {
      throw new Error('Shiki line 要素の取得に失敗しました');
    }

    if (getComputedStyle(highlightedLine).display !== 'block') {
      throw new Error('Shiki の .line は block として描画される必要があります');
    }

    const highlightedBackground = getComputedStyle(highlightedLine).backgroundColor;
    if (highlightedBackground === 'rgba(0, 0, 0, 0)') {
      throw new Error('highlighted line の背景が適用されていません');
    }

    const addedBackground = getComputedStyle(addedLine).backgroundColor;
    if (addedBackground === 'rgba(0, 0, 0, 0)') {
      throw new Error('diff add line の背景が適用されていません');
    }

    const content = block.getCodeContent();
    if (content !== 'const highlighted = 1;\nconst added = 2;') {
      throw new Error(`Shiki data-raw がコピー値に反映されていません: "${content}"`);
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

    await nextFrame();

    const pre = getPre(block);
    if (pre.getAttribute('tabindex') !== '0') {
      throw new Error('オーバーフロー時は pre に tabindex="0" が必要です');
    }
    if (pre.getAttribute('role') !== 'region') {
      throw new Error('オーバーフロー時は pre に role="region" が必要です');
    }
    if (pre.getAttribute('aria-label') !== 'overflow.ts コード') {
      throw new Error(`aria-label が不正です: "${pre.getAttribute('aria-label') ?? 'null'}"`);
    }
  },
};

/**
 * 折り返し例外。
 * data-wrap="true" で pre-wrap が適用されることを確認します。
 */
export const WrappedContentException: Story = {
  render: () => html`
    <div style="width: 320px;">
      <ui-code-block
        id="wrapped-block"
        filename="wrapped.log"
        lang="text"
        data-wrap="true"
        style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
      >
        <pre><code>error: this is a very long log line that should wrap when wrap mode is enabled to avoid horizontal scrolling in prose contexts.</code></pre>
      </ui-code-block>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'wrapped-block');
    await block.updateComplete;
    await nextFrame();

    const pre = getPre(block);
    if (getComputedStyle(pre).whiteSpace !== 'pre-wrap') {
      throw new Error('data-wrap="true" では pre-wrap が適用されるべきです');
    }

    const content = block.getCodeContent();
    if (!content.startsWith('error: this is a very long log line')) {
      throw new Error('wrap モードでも getCodeContent() は生コードを保持する必要があります');
    }
  },
};

/**
 * ダークテーマ適応。
 * セマンティックトークン上書き時に背景/境界/前景が追従することを確認します。
 */
export const DarkTokenAdaptation: Story = {
  render: () => html`
    <div
      style="
        width: 460px;
        color-scheme: dark;
        --bg-default: rgb(18, 22, 28);
        --border-style-subtle: 1px solid rgb(73, 82, 96);
        --fg-default: rgb(231, 236, 244);
        --ui-code-block-breakout-width: 100%;
        --ui-code-block-breakout-margin: 0;
      "
    >
      <ui-code-block id="dark-token-block" filename="theme.ts" lang="ts">
        <pre><code>export const THEME = 'dark';</code></pre>
      </ui-code-block>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'dark-token-block');
    await block.updateComplete;

    const root = getRootFigure(block);
    const pre = getPre(block);
    const rootStyle = getComputedStyle(root);
    const preStyle = getComputedStyle(pre);

    if (rootStyle.backgroundColor !== 'rgb(18, 22, 28)') {
      throw new Error(`ダーク背景トークンが反映されていません: ${rootStyle.backgroundColor}`);
    }
    if (rootStyle.borderTopColor !== 'rgb(73, 82, 96)') {
      throw new Error(`境界トークンが反映されていません: ${rootStyle.borderTopColor}`);
    }
    if (preStyle.color !== 'rgb(231, 236, 244)') {
      throw new Error(`前景トークンが反映されていません: ${preStyle.color}`);
    }
  },
};

/**
 * メディア関連スタイル契約。
 * forced-colors / print の必須ルールを定義していることを確認します。
 */
export const MediaStyleContracts: Story = {
  render: () => html`
    <ui-code-block
      id="media-contract-block"
      filename="contract.ts"
      lang="ts"
      style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
    >
      <pre><code>const contract = true;</code></pre>
    </ui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'media-contract-block');
    await block.updateComplete;

    const shadowStyle = getShadowStylesText(block.shadowRoot);
    if (!shadowStyle.includes('@media print')) {
      throw new Error('Shadow CSS に print スタイルが定義されていません');
    }
    if (
      !shadowStyle.includes('.copy-button-shell') ||
      !shadowStyle.includes('display: none !important')
    ) {
      throw new Error('print 時の copy-button 非表示ルールが不足しています');
    }

    const documentStyle = getDocumentCodeBlockStyle().textContent;
    if (!documentStyle.includes('@media (forced-colors: active)')) {
      throw new Error('document CSS に forced-colors ルールが定義されていません');
    }
    if (
      !documentStyle.includes('ui-code-block pre .comment') ||
      !documentStyle.includes('font-style: italic')
    ) {
      throw new Error('forced-colors 時のコメント可視化（italic）ルールが不足しています');
    }
    if (
      !documentStyle.includes('ui-code-block pre') ||
      !documentStyle.includes('font-size: 9pt !important')
    ) {
      throw new Error('document CSS の print フォント調整ルールが不足しています');
    }

    if (window.matchMedia('(forced-colors: active)').matches) {
      const shell = block.shadowRoot?.querySelector<HTMLElement>('.copy-button-shell');
      if (!shell) {
        throw new Error('copy-button-shell が見つかりません');
      }
      const shellStyle = getComputedStyle(shell);
      if (shellStyle.borderTopStyle === 'none' || shellStyle.borderTopWidth === '0px') {
        throw new Error('forced-colors 環境では copy-button-shell に境界線が必要です');
      }
    }
  },
};

/**
 * タッチ環境の可視化方針。
 * coarse pointer 環境では copy-button が --opacity-link-touch で常時表示されることを確認します。
 */
export const TouchCoarsePointerVisibility: Story = {
  render: () => html`
    <ui-code-block
      id="touch-visibility-block"
      filename="touch.ts"
      lang="ts"
      style="
        --ui-code-block-breakout-width: 100%;
        --ui-code-block-breakout-margin: 0;
        --opacity-link-touch: 0.65;
      "
    >
      <pre><code>const touchVisible = true;</code></pre>
    </ui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'touch-visibility-block');
    await block.updateComplete;
    await nextFrame();

    const isCoarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (!isCoarsePointer) {
      return;
    }

    const copyButton = getCopyButton(block);
    const copyStyle = getComputedStyle(copyButton);
    if (copyStyle.opacity !== '0.65') {
      throw new Error(`coarse pointer 環境では opacity=0.65 の想定です: ${copyStyle.opacity}`);
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
      throw new Error(
        `不正 intent は neutral にフォールバックすべきです。現在: "${fallback.intent}"`,
      );
    }

    const fallbackRoot = getRootFigure(fallback);
    if (fallbackRoot.getAttribute('aria-description') !== 'コード') {
      throw new Error(
        `メタデータ欠落時の aria-description は "コード" の想定です。現在: "${fallbackRoot.getAttribute('aria-description') ?? 'null'}"`,
      );
    }
    const fallbackFilename = fallback.shadowRoot?.querySelector<HTMLElement>('.filename');
    if (!fallbackFilename) {
      throw new Error('filename 表示が見つかりません');
    }
    if (fallbackFilename.textContent.trim() !== '') {
      throw new Error('filename 未指定時は表示しない想定です');
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

/**
 * メタデータのないコードブロック。
 * filename/intent が空の場合、キャプションがオーバーレイ化されコピーボタンのみ表示されることを確認します。
 */
export const NoMetadataOverlay: Story = {
  render: () => html`
    <ui-code-block
      id="overlay-block"
      lang="ts"
      style="--ui-code-block-breakout-width: 100%; --ui-code-block-breakout-margin: 0;"
    >
      <pre><code>const minimal = 'no filename, no intent';</code></pre>
    </ui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'overlay-block');
    await block.updateComplete;

    const root = getRootFigure(block);
    if (!root.classList.contains('caption-overlay')) {
      throw new Error('メタデータのないブロックは caption-overlay クラスを持つべきです');
    }

    const captionMain = block.shadowRoot?.querySelector<HTMLElement>('.caption-main');
    if (!captionMain) {
      throw new Error('caption-main が見つかりません');
    }
    if (getComputedStyle(captionMain).display !== 'none') {
      throw new Error('overlay モードでは caption-main は非表示であるべきです');
    }

    const caption = block.shadowRoot?.querySelector<HTMLElement>('.caption');
    if (!caption) {
      throw new Error('caption が見つかりません');
    }
    if (getComputedStyle(caption).position !== 'absolute') {
      throw new Error('overlay モードでは caption は absolute 配置であるべきです');
    }

    const pre = block.querySelector('pre');
    if (!pre) {
      throw new Error('pre が見つかりません');
    }

    const copyShell = block.shadowRoot?.querySelector<HTMLElement>('.copy-button-shell');
    if (!copyShell) {
      throw new Error('copy-button-shell が見つかりません');
    }

    const copyButton = getCopyButton(block);
    if (copyButton.label !== 'TypeScript のコードをコピー') {
      throw new Error(`overlay モードの copy-button label が不正です: "${copyButton.label}"`);
    }

    const captionStyle = getComputedStyle(caption);
    const preStyle = getComputedStyle(pre);
    const paddingTop = Number.parseFloat(preStyle.paddingTop);
    const lineHeight = Number.parseFloat(preStyle.lineHeight);
    const copyHeight = copyShell.getBoundingClientRect().height;
    const expectedTop = paddingTop - (copyHeight - lineHeight) / 2;
    const actualTop = Number.parseFloat(captionStyle.top);

    if (Math.abs(actualTop - expectedTop) > 1) {
      throw new Error(
        `overlay モードの caption top が不正です: ${String(actualTop)} vs ${String(expectedTop)}`,
      );
    }
  },
};
