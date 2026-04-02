import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './codeblock';
import type { CodeBlock } from './codeblock';

const SURFACE_STYLE =
  '--ui-code-surface-breakout-width: 100%; --ui-code-surface-breakout-margin: 0;';

const meta: Meta<CodeBlock> = {
  title: 'Components/Code Block',
  component: 'ui-code-block',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
コードブロックの **表示見本** です。

- Storybook では representative display / docs / manual review を保持します。
- copy / focus / overflow / keyboard / aria / public DOM contract は \`test/browser/**\` を正本にします。
- print / forced-colors などの CSS 構造契約は Storybook runtime では判定しません。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<CodeBlock>;

export const DefaultStandalone: Story = {
  render: () => html`
    <ui-code-block filename="index.ts" lang="ts" style=${SURFACE_STYLE}>
      <pre><code>const greeting = 'hello';
console.log(greeting);</code></pre>
    </ui-code-block>
  `,
};

export const LayoutModes: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-block layout="standalone" filename="standalone.ts" lang="ts" style=${SURFACE_STYLE}>
        <pre><code>export const mode = 'standalone';</code></pre>
      </ui-code-block>

      <ui-code-block layout="inline" filename="inline.ts" lang="ts" style=${SURFACE_STYLE}>
        <pre><code>export const mode = 'inline';</code></pre>
      </ui-code-block>
    </div>
  `,
};

export const CopyModes: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-block filename="auto.ts" lang="ts" copy-mode="auto" style=${SURFACE_STYLE}>
        <pre><code>export const autoCopy = true;</code></pre>
      </ui-code-block>

      <ui-code-block filename="always.ts" lang="ts" copy-mode="always" style=${SURFACE_STYLE}>
        <pre><code>export const alwaysCopy = true;</code></pre>
      </ui-code-block>

      <ui-code-block filename="hidden.ts" lang="ts" copy-mode="hidden" style=${SURFACE_STYLE}>
        <pre><code>export const hiddenCopy = true;</code></pre>
      </ui-code-block>

      <ui-code-block
        filename="disabled.ts"
        lang="ts"
        copyable="false"
        copy-mode="always"
        style=${SURFACE_STYLE}
      >
        <pre><code>export const disabledCopy = true;</code></pre>
      </ui-code-block>
    </div>
  `,
};

export const HighlightAndWrap: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-block
        filename="highlight.ts"
        lang="ts"
        show-line-numbers
        highlight-lines="2-3"
        style=${SURFACE_STYLE}
      >
        <pre><code>const first = 1;
const second = 2;
const third = 3;</code></pre>
      </ui-code-block>

      <ui-code-block filename="wrap.ts" lang="ts" wrap style=${SURFACE_STYLE}>
        <pre><code>const veryLongLine = 'This is a deliberately long line for visual wrap review in Storybook docs';</code></pre>
      </ui-code-block>
    </div>
  `,
};

export const CompatibilityInputs: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-block
        headless
        embedded
        filename="embedded.ts"
        lang="ts"
        initial-code="export const embeddedCompat = true;"
        style=${SURFACE_STYLE}
      ></ui-code-block>

      <ui-code-block filename="legacy-wrap.ts" lang="ts" style=${SURFACE_STYLE}>
        <pre data-wrap="true"><code>export const legacyWrap = true;</code></pre>
      </ui-code-block>
    </div>
  `,
};

export const ManualOverflowReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-code-block filename="overflow.ts" lang="ts" style=${SURFACE_STYLE}>
      <pre><code>const veryLongLine = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';</code></pre>
    </ui-code-block>
  `,
};
