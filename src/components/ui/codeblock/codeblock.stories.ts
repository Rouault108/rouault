import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './codeblock';
import type { CodeBlock } from './codeblock';

type CopyButtonElement = HTMLElement & { disabled: boolean; label: string; value: string };

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

const queryCopyButton = (block: CodeBlock): CopyButtonElement | null =>
  block.shadowRoot?.querySelector<CopyButtonElement>('ui-copy-button') ?? null;

const nextFrame = async (): Promise<void> =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

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
コードブロックコンポーネントです。slotted \`pre/code\` を正本として扱い、表示・copy・横スクロール・比較用メタデータ契約を統合します。

## このストーリーで検証する観点
- \`layout="standalone"\` / \`layout="inline"\`
- \`copyMode="auto" | "always" | "hidden"\`
- \`copyable=false\`
- \`highlight-lines\` の範囲解釈
- オーバーフロー時のみ focusable になること
- \`wrap\` の主要 API
- group item 契約入力を単体表示で解釈しないこと
- print / forced-colors の CSS 契約

互換入力の \`headless\` / \`embedded\` / \`initial-code\` / \`data-wrap\` / \`data-raw\` は専用ストーリーでのみ確認します。
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
      description: '言語識別子。data-lang と読み上げ補助に使用',
    },
    intent: {
      control: 'inline-radio',
      options: ['neutral', 'valid', 'invalid'],
      table: {
        type: { summary: "'neutral' | 'valid' | 'invalid'" },
        defaultValue: { summary: "'neutral'" },
      },
      description: 'コード例の意味状態',
    },
    showLineNumbers: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: '行番号を表示',
    },
    copyMode: {
      control: 'inline-radio',
      options: ['auto', 'always', 'hidden'],
      table: {
        type: { summary: "'auto' | 'always' | 'hidden'" },
        defaultValue: { summary: "'auto'" },
      },
      description: 'copy UI の表示戦略',
    },
    copyable: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'true' } },
      description: 'copy 操作の可否',
    },
    wrap: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: '長い行を折り返す',
    },
    highlightLines: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '強調する論理行範囲',
    },
    layout: {
      control: 'inline-radio',
      options: ['standalone', 'inline'],
      table: {
        type: { summary: "'standalone' | 'inline'" },
        defaultValue: { summary: "'standalone'" },
      },
      description: '視覚文脈',
    },
  },
};

export default meta;
type Story = StoryObj<CodeBlock>;

/**
 * 基本構成。
 * standalone の外装、copy label、data-lang、light DOM 正本を確認します。
 */
export const DefaultStandalone: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-code-block
      id="default-block"
      filename="index.ts"
      lang="ts"
      style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
    >
      <pre><code>const greeting = 'hello';
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
      throw new Error('standalone では外枠が必要です');
    }

    const copyButton = getCopyButton(block);
    if (copyButton.label !== 'index.ts のコードをコピー') {
      throw new Error(`copy button label が不正です: "${copyButton.label}"`);
    }

    const content = block.getCodeContent();
    if (content !== "const greeting = 'hello';\nconsole.log(greeting);") {
      throw new Error(`getCodeContent() が light DOM 正本を返していません: "${content}"`);
    }

    if (copyButton.value !== content) {
      throw new Error('copy button value と getCodeContent() が一致しません');
    }
  },
};

/**
 * 視覚文脈の差分。
 * inline は合成前提の外装に寄せるが、copy 契約は変えないことを確認します。
 */
export const LayoutModes: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-block
        id="layout-standalone"
        layout="standalone"
        filename="standalone.ts"
        lang="ts"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre><code>export const mode = 'standalone';</code></pre>
      </ui-code-block>

      <ui-code-block
        id="layout-inline"
        layout="inline"
        filename="inline.ts"
        lang="ts"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre><code>export const mode = 'inline';</code></pre>
      </ui-code-block>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const standalone = getCodeBlock(canvasElement, 'layout-standalone');
    const inline = getCodeBlock(canvasElement, 'layout-inline');
    await Promise.all([standalone.updateComplete, inline.updateComplete]);

    const standaloneRoot = getRootFigure(standalone);
    const inlineRoot = getRootFigure(inline);
    const standaloneStyle = getComputedStyle(standaloneRoot);
    const inlineStyle = getComputedStyle(inlineRoot);

    if (standaloneStyle.borderTopWidth === '0px') {
      throw new Error('layout="standalone" の外枠が欠落しています');
    }
    if (inlineStyle.borderTopWidth !== '0px') {
      throw new Error('layout="inline" は外枠を持たない想定です');
    }

    const standaloneCopy = getCopyButton(standalone);
    const inlineCopy = getCopyButton(inline);
    if (standaloneCopy.value !== "export const mode = 'standalone';") {
      throw new Error('standalone の copy 値が不正です');
    }
    if (inlineCopy.value !== "export const mode = 'inline';") {
      throw new Error('inline の copy 値が不正です');
    }
  },
};

/**
 * copy UI の表示戦略。
 * auto/always/hidden の差分を確認します。
 */
export const CopyModeMatrix: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-block
        id="copy-auto"
        copy-mode="auto"
        filename="auto.ts"
        lang="ts"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre><code>export const autoCopy = true;</code></pre>
      </ui-code-block>

      <ui-code-block
        id="copy-always"
        copy-mode="always"
        filename="always.ts"
        lang="ts"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre><code></code></pre>
      </ui-code-block>

      <ui-code-block
        id="copy-hidden"
        copy-mode="hidden"
        filename="hidden.ts"
        lang="ts"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre><code>export const hiddenCopy = true;</code></pre>
      </ui-code-block>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const auto = getCodeBlock(canvasElement, 'copy-auto');
    const always = getCodeBlock(canvasElement, 'copy-always');
    const hidden = getCodeBlock(canvasElement, 'copy-hidden');
    await Promise.all([auto.updateComplete, always.updateComplete, hidden.updateComplete]);

    const autoCopy = getCopyButton(auto);
    if (autoCopy.disabled) {
      throw new Error('copyMode="auto" で copy 値があるのに disabled です');
    }

    const alwaysCopy = getCopyButton(always);
    if (!alwaysCopy.disabled) {
      throw new Error('copyMode="always" で copy 値がない場合は disabled の想定です');
    }

    if (queryCopyButton(hidden)) {
      throw new Error('copyMode="hidden" では copy button を描画しない想定です');
    }
  },
};

/**
 * copyable=false。
 * 値は返せても公開上は copy 不可として扱うことを確認します。
 */
export const CopyDisabled: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-code-block
      id="copy-disabled"
      filename="disabled.ts"
      lang="ts"
      copyable="false"
      style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
    >
      <pre><code>export const disabled = true;</code></pre>
    </ui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'copy-disabled');
    await block.updateComplete;

    const content = block.getCodeContent();
    if (content !== 'export const disabled = true;') {
      throw new Error('copyable=false でも getCodeContent() は値を返す必要があります');
    }

    const copyButton = getCopyButton(block);
    if (!copyButton.disabled) {
      throw new Error('copyable=false では copy button が disabled であるべきです');
    }
    if (copyButton.value !== content) {
      throw new Error('disabled 状態でも copy button value は本文に同期する必要があります');
    }
  },
};

/**
 * 明示行ハイライト。
 * 解釈不能断片を無視し、解釈できる範囲だけ反映することを確認します。
 */
export const HighlightLines: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-code-block
      id="highlight-lines-block"
      filename="highlight.ts"
      lang="ts"
      highlight-lines="1,3-4,foo,7-5"
      style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
    >
      <pre><code>const first = 1;
const second = 2;
const third = 3;
const fourth = 4;</code></pre>
    </ui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'highlight-lines-block');
    await block.updateComplete;

    const lines = Array.from(block.querySelectorAll<HTMLElement>('code .line'));
    if (lines.length !== 4) {
      throw new Error(`Expected 4 line wrappers, got ${String(lines.length)}`);
    }

    const highlightedIndexes = lines
      .map((line, index) => (line.classList.contains('ui-explicit-highlight') ? index + 1 : 0))
      .filter((value) => value !== 0);

    if (highlightedIndexes.join(',') !== '1,3,4') {
      throw new Error(`highlight-lines の解釈結果が不正です: "${highlightedIndexes.join(',')}"`);
    }
  },
};

/**
 * 長行オーバーフロー境界。
 * 横スクロールが必要な場合のみ focusable region になることを確認します。
 */
export const OverflowScrollableArea: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <div style="width: 280px;">
      <ui-code-block
        id="overflow-block"
        filename="overflow.ts"
        lang="ts"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
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
 * 折り返しの主要 API。
 * wrap=true では pre-wrap を適用し、余計な tab stop を作らないことを確認します。
 */
export const WrapMode: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="width: 320px;">
      <ui-code-block
        id="wrapped-block"
        filename="wrapped.log"
        lang="text"
        wrap
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
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
      throw new Error('wrap=true では pre-wrap が適用されるべきです');
    }
    if (pre.hasAttribute('tabindex') || pre.hasAttribute('role')) {
      throw new Error('wrap=true では不要な scroll region を作らない想定です');
    }

    const content = block.getCodeContent();
    if (!content.startsWith('error: this is a very long log line')) {
      throw new Error('wrap=true でも getCodeContent() は生コードを保持する必要があります');
    }
  },
};

/**
 * group item 契約の境界。
 * group 用メタデータを持っても単体表示ではラベル解釈に使わないことを確認します。
 */
export const GroupItemMetadataContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-code-block
      id="group-item-block"
      filename="single.ts"
      lang="ts"
      group-key="primary"
      tab-label="Primary Tab"
      copy-label="Primary Copy Context"
      style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
    >
      <pre><code>export const single = true;</code></pre>
    </ui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const block = getCodeBlock(canvasElement, 'group-item-block');
    await block.updateComplete;

    const shadowText = block.shadowRoot?.textContent ?? '';
    if (shadowText.includes('Primary Tab') || shadowText.includes('Primary Copy Context')) {
      throw new Error('group item 契約のラベルを単体表示へ流用してはいけません');
    }

    const copyButton = getCopyButton(block);
    if (copyButton.label !== 'single.ts のコードをコピー') {
      throw new Error(
        `単体 copy label が filename 優先で解決されていません: "${copyButton.label}"`,
      );
    }
  },
};

/**
 * 互換入力の受理。
 * embedded / initial-code / data-wrap / data-raw を受理しつつ、slotted 本文を正本にすることを確認します。
 */
export const CompatibilityFallbacks: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-block
        id="embedded-compat"
        embedded
        filename="embedded.ts"
        lang="ts"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre><code>export const embeddedCompat = true;</code></pre>
      </ui-code-block>

      <ui-code-block
        id="initial-code-compat"
        copy-mode="always"
        filename="legacy.ts"
        lang="ts"
        initial-code="const legacy = true;"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      ></ui-code-block>

      <ui-code-block
        id="data-raw-compat"
        filename="data-raw.ts"
        lang="ts"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre data-raw="const stale = false;"><code>const visible = true;</code></pre>
      </ui-code-block>

      <ui-code-block
        id="data-wrap-compat"
        filename="data-wrap.log"
        lang="text"
        data-wrap="true"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0; width: 320px;"
      >
        <pre><code>legacy data-wrap should still wrap long lines without opting into the new wrap API.</code></pre>
      </ui-code-block>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const embedded = getCodeBlock(canvasElement, 'embedded-compat');
    const initialCode = getCodeBlock(canvasElement, 'initial-code-compat');
    const dataRaw = getCodeBlock(canvasElement, 'data-raw-compat');
    const dataWrap = getCodeBlock(canvasElement, 'data-wrap-compat');
    await Promise.all([
      embedded.updateComplete,
      initialCode.updateComplete,
      dataRaw.updateComplete,
      dataWrap.updateComplete,
    ]);
    await nextFrame();

    const embeddedRoot = getRootFigure(embedded);
    if (getComputedStyle(embeddedRoot).borderTopWidth !== '0px') {
      throw new Error('embedded 互換入力は layout="inline" 相当の外装に寄るべきです');
    }

    const compatCopy = getCopyButton(initialCode);
    if (compatCopy.value !== 'const legacy = true;') {
      throw new Error('initial-code 互換入力が copy 値へ反映されていません');
    }

    if (dataRaw.getCodeContent() !== 'const visible = true;') {
      throw new Error('data-raw は slotted 本文より優先されてはいけません');
    }

    const wrapPre = getPre(dataWrap);
    if (getComputedStyle(wrapPre).whiteSpace !== 'pre-wrap') {
      throw new Error('data-wrap="true" 互換入力が維持されていません');
    }
  },
};

/**
 * メディア関連 CSS 契約。
 * forced-colors / print で必要なルールが定義されていることを確認します。
 */
export const MediaStyleContracts: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-code-block
      id="media-contract-block"
      filename="contract.ts"
      lang="ts"
      style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
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
      throw new Error('forced-colors 時のコメント可視化ルールが不足しています');
    }
    if (
      !documentStyle.includes('ui-code-block pre') ||
      !documentStyle.includes('font-size: 9pt !important')
    ) {
      throw new Error('document CSS の print フォント調整ルールが不足しています');
    }
  },
};
