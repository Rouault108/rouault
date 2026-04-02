import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { SHARED_SANDBOX_BUTTON_EXAMPLE } from '../../../../examples/manifests/testing-examples.js';
import buttonCss from '../../../../examples/snippets/sandbox/button.css?raw';
import buttonHtml from '../../../../examples/snippets/sandbox/button.html?raw';
import buttonJs from '../../../../examples/snippets/sandbox/button.js?raw';
import './preview-sandbox';
import '../code-preview/code-preview';
import '../codeblock/codeblock';
import type { PreviewSandbox } from './preview-sandbox';

const meta: Meta<PreviewSandbox> = {
  title: 'Components/Preview Sandbox',
  component: 'ui-preview-sandbox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
HTML/CSS/JS を \`srcdoc\` の sandboxed iframe へ閉じ込めて描画する preview 用コンポーネントです。

- payload は直下子の \`template[data-preview-kind]\` からだけ受け取ります
- iframe の baseline capability は常に \`allow-scripts\` です
- \`allow-js\` は author JS の注入可否だけを制御します
- \`iframe-title\` / \`base-url\` / \`activation-policy\` / \`height-mode\` / \`max-height\` を公開入力として扱います
- opt-in capability は \`allow-forms\` / \`allow-downloads\` / \`allow-pointer-lock\` / \`allow-popups\` だけを公開します
- activation / iframe / srcdoc / capability / height / integration の契約は \`test/browser/preview-sandbox.browser.test.ts\` に移送済みです
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<PreviewSandbox>;

export const HtmlOnly: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-preview-sandbox
        iframe-title="${SHARED_SANDBOX_BUTTON_EXAMPLE.iframeTitle}"
        height="160"
        base-url="https://example.com/examples/"
      >
        <template data-preview-kind="html">${buttonHtml}</template>
      </ui-preview-sandbox>
    </div>
  `,
};

export const AuthorJsOptIn: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px; display: grid; gap: 1.5rem;">
      <ui-preview-sandbox iframe-title="js disabled" height="160">
        <template data-preview-kind="html">${buttonHtml}</template>
        <template data-preview-kind="css">${buttonCss}</template>
        <template data-preview-kind="js">${buttonJs}</template>
      </ui-preview-sandbox>

      <ui-preview-sandbox iframe-title="js enabled" height="160" allow-js>
        <template data-preview-kind="html">${buttonHtml}</template>
        <template data-preview-kind="css">${buttonCss}</template>
        <template data-preview-kind="js">${buttonJs}</template>
      </ui-preview-sandbox>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'author JS の注入可否は browser test 側で検査し、この story は opt-in の見本として残しています。',
      },
    },
  },
};

export const SandboxCapabilityTokens: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px; display: grid; gap: 1.5rem;">
      <ui-preview-sandbox iframe-title="default sandbox" height="120">
        <template data-preview-kind="html"><button>default</button></template>
      </ui-preview-sandbox>

      <ui-preview-sandbox
        iframe-title="forms and downloads sandbox"
        height="120"
        allow-forms
        allow-downloads
      >
        <template data-preview-kind="html"><button>forms-downloads</button></template>
      </ui-preview-sandbox>

      <ui-preview-sandbox
        iframe-title="pointer lock and popups sandbox"
        height="120"
        allow-pointer-lock
        allow-popups
      >
        <template data-preview-kind="html"><button>pointer-popups</button></template>
      </ui-preview-sandbox>

      <ui-preview-sandbox iframe-title="js only sandbox" height="120" allow-js>
        <template data-preview-kind="html"><button>js-only</button></template>
        <template data-preview-kind="js">window.__previewSandboxJsOnly = true;</template>
      </ui-preview-sandbox>
    </div>
  `,
};

export const HeightBehavior: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px; display: grid; gap: 1.5rem;">
      <ui-preview-sandbox iframe-title="fixed height sandbox" height="120" height-mode="fixed" allow-js>
        <template data-preview-kind="html"><div class="box">fixed</div></template>
        <template data-preview-kind="css"
          >body { padding: 8px; } .box { height: 48px; background: rgb(238 242 255); }</template
        >
        <template data-preview-kind="js"
          >setTimeout(() => { const box = document.querySelector('.box'); if (box instanceof HTMLElement) { box.style.height = '260px'; } }, 80);</template
        >
      </ui-preview-sandbox>

      <ui-preview-sandbox iframe-title="auto height sandbox" height="120" height-mode="auto" allow-js>
        <template data-preview-kind="html"><div class="box">auto</div></template>
        <template data-preview-kind="css"
          >body { padding: 8px; } .box { height: 48px; background: rgb(236 253 245); }</template
        >
        <template data-preview-kind="js"
          >setTimeout(() => { const box = document.querySelector('.box'); if (box instanceof HTMLElement) { box.style.height = '260px'; } }, 80);</template
        >
      </ui-preview-sandbox>

      <ui-preview-sandbox
        iframe-title="bounded height sandbox"
        height="120"
        height-mode="bounded-auto"
        max-height="180"
        allow-js
      >
        <template data-preview-kind="html"><div class="box">bounded</div></template>
        <template data-preview-kind="css"
          >body { padding: 8px; } .box { height: 48px; background: rgb(254 249 195); }</template
        >
        <template data-preview-kind="js"
          >setTimeout(() => { const box = document.querySelector('.box'); if (box instanceof HTMLElement) { box.style.height = '260px'; } }, 80);</template
        >
      </ui-preview-sandbox>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'height-mode ごとの observable behavior は browser test 側で検査し、この story は比較表示用に残しています。',
      },
    },
  },
};

export const CodePreviewIntegration: Story = {
  render: () => html`
    <div style="padding: 2rem; max-width: 720px;">
      <ui-code-preview
        controls="viewport theme"
        preview-viewport="full"
        style="--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;"
      >
        <ui-preview-sandbox slot="preview" iframe-title="integrated sandbox" height="160">
          <template data-preview-kind="html"><button class="demo">押す</button></template>
          <template data-preview-kind="css">button { color: rgb(12 12 12); }</template>
        </ui-preview-sandbox>
        <ui-code-block filename="button.html" lang="html">
          <pre><code>&lt;button class="demo"&gt;押す&lt;/button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    </div>
  `,
};
