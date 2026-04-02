import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/codeblock/codeblock.js';
import type { CodeBlock } from '../../src/components/ui/codeblock/codeblock.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

type CopyButtonElement = HTMLElement & {
  disabled: boolean;
  label: string;
  value: string;
};

const getCopyButton = (block: CodeBlock): CopyButtonElement | null =>
  block.shadowRoot?.querySelector<CopyButtonElement>('ui-copy-button') ?? null;

const getRootFigure = (block: CodeBlock): HTMLElement | null =>
  block.shadowRoot?.querySelector<HTMLElement>('figure.root') ?? null;

const getPre = (block: CodeBlock): HTMLPreElement | null => block.querySelector('pre');

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

describe('ui-code-block browser contract', () => {
  it('light DOM 正本から aria / copy value / copy label を公開すること', async () => {
    const block = await fixture<CodeBlock>(html`
      <ui-code-block
        filename="index.ts"
        lang="ts"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre><code>const greeting = 'hello';
console.log(greeting);</code></pre>
      </ui-code-block>
    `);

    await waitForLitUpdate(block);

    expect(block.getAttribute('data-lang')).to.equal('ts');

    const root = expectPresent(getRootFigure(block), 'root');
    expect(root.getAttribute('aria-description')).to.equal('TypeScript のコード');

    const copyButton = expectPresent(getCopyButton(block), 'copyButton');

    const content = block.getCodeContent();
    expect(content).to.equal("const greeting = 'hello';\nconsole.log(greeting);");
    expect(copyButton.value).to.equal(content);
    expect(copyButton.label).to.equal('index.ts のコードをコピー');
  });

  it('highlight-lines と overflow 状態に応じて scrollable region を公開し、wrap で解除すること', async () => {
    const block = await fixture<CodeBlock>(html`
      <ui-code-block
        filename="sample.ts"
        lang="ts"
        highlight-lines="2"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre><code>const first = 1;
const second = 2;
const third = 3;</code></pre>
      </ui-code-block>
    `);

    await waitForLitUpdate(block);

    const pre = expectPresent(getPre(block), 'pre');

    const lines = Array.from(pre.querySelectorAll<HTMLElement>('.line'));
    expect(lines.length).to.be.greaterThan(0);
    expect(lines[1]?.hasAttribute('data-ui-highlight-line')).to.equal(true);

    Object.defineProperty(pre, 'scrollWidth', {
      configurable: true,
      get: () => 320,
    });
    Object.defineProperty(pre, 'clientWidth', {
      configurable: true,
      get: () => 120,
    });

    block.wrap = true;
    await waitForLitUpdate(block);

    block.wrap = false;
    await waitForLitUpdate(block);

    expect(pre.getAttribute('tabindex')).to.equal('0');
    expect(pre.getAttribute('role')).to.equal('region');
    expect(pre.getAttribute('aria-label')).to.equal('sample.ts コード');

    block.wrap = true;
    await waitForLitUpdate(block);

    expect(pre.hasAttribute('tabindex')).to.equal(false);
    expect(pre.hasAttribute('role')).to.equal(false);
    expect(pre.hasAttribute('aria-label')).to.equal(false);
  });

  it('copy-mode="hidden" では copy button を描画せず、copyable="false" では disabled にすること', async () => {
    const hiddenBlock = await fixture<CodeBlock>(html`
      <ui-code-block
        filename="hidden.ts"
        lang="ts"
        copy-mode="hidden"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre><code>export const hiddenCopy = true;</code></pre>
      </ui-code-block>
    `);

    await waitForLitUpdate(hiddenBlock);
    expect(getCopyButton(hiddenBlock)).to.equal(null);

    const disabledBlock = await fixture<CodeBlock>(html`
      <ui-code-block
        filename="disabled.ts"
        lang="ts"
        copyable="false"
        style="--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;"
      >
        <pre><code>export const disabled = true;</code></pre>
      </ui-code-block>
    `);

    await waitForLitUpdate(disabledBlock);

    const copyButton = expectPresent(getCopyButton(disabledBlock), 'copyButton');
    expect(copyButton.disabled).to.equal(true);
    expect(copyButton.value).to.equal('export const disabled = true;');
    expect(copyButton.label).to.equal('disabled.ts のコードをコピー');
  });
});