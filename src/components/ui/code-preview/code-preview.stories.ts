import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './code-preview';
import type { CodePreview } from './code-preview';
import '../codeblock/codeblock';
import '../code-group/code-group';
import '../button/button';

const meta: Meta<CodePreview> = {
  title: 'Components/Code Preview',
  component: 'ui-code-preview',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
コードプレビューは、プレビュー表示とコード表示を一体で提示するコンポーネントです。

この story ファイルは **docs / manual-only** に限定します。  
header 表示条件、built-in controls、state-change event、invalid fallback、copy 値維持などの
browser contract は \`test/browser/code-preview.browser.test.ts\` を正本として検査します。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<CodePreview>;

const renderFrame = (content: unknown) => html`
  <div style="padding: 2rem; max-width: 960px;">${content}</div>
`;

const commonStyle =
  '--ui-code-preview-breakout-width: 100%; --ui-code-preview-breakout-margin: 0; margin-block: 0;';

export const BasicWithCodeBlock: Story = {
  render: () =>
    renderFrame(html`
      <ui-code-preview style="${commonStyle}">
        <div slot="preview">
          <ui-button>クリックしてください</ui-button>
        </div>
        <ui-code-block layout="inline" filename="example.ts" lang="ts">
          <pre><code>import './button';
// &lt;ui-button&gt;クリックしてください&lt;/ui-button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    `),
};

export const BasicWithCodeGroup: Story = {
  render: () =>
    renderFrame(html`
      <ui-code-preview style="${commonStyle}">
        <div slot="preview" style="display: flex; gap: 1rem;">
          <ui-button>Primary</ui-button>
          <ui-button>Secondary</ui-button>
        </div>
        <ui-code-group aria-label="ボタンのコード例">
          <ui-code-block group-key="primary" tab-label="Primary" filename="primary.ts" lang="ts">
            <pre><code>// &lt;ui-button&gt;Primary&lt;/ui-button&gt;</code></pre>
          </ui-code-block>
          <ui-code-block
            group-key="secondary"
            tab-label="Secondary"
            filename="secondary.ts"
            lang="ts"
          >
            <pre><code>// &lt;ui-button variant="secondary"&gt;Secondary&lt;/ui-button&gt;</code></pre>
          </ui-code-block>
        </ui-code-group>
      </ui-code-preview>
    `),
};

export const HeaderWithHeadingOnly: Story = {
  render: () =>
    renderFrame(html`
      <ui-code-preview heading="ボタンの使用例" style="${commonStyle}">
        <div slot="preview">
          <ui-button>クリック</ui-button>
        </div>
        <ui-code-block layout="inline" filename="button.ts" lang="ts">
          <pre><code>// &lt;ui-button&gt;クリック&lt;/ui-button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    `),
};

export const HeaderWithToolbarOnly: Story = {
  render: () =>
    renderFrame(html`
      <ui-code-preview style="${commonStyle}">
        <button slot="toolbar" type="button" aria-label="外部アクション">設定</button>
        <div slot="preview">
          <ui-button>クリック</ui-button>
        </div>
        <ui-code-block layout="inline" filename="button.ts" lang="ts">
          <pre><code>// toolbar only</code></pre>
        </ui-code-block>
      </ui-code-preview>
    `),
};

export const HeaderWithBuiltInControlsOnly: Story = {
  render: () =>
    renderFrame(html`
      <ui-code-preview controls="theme surface viewport" style="${commonStyle}">
        <div slot="preview">
          <ui-button>クリック</ui-button>
        </div>
        <ui-code-block layout="inline" filename="button.ts" lang="ts">
          <pre><code>// built-in controls</code></pre>
        </ui-code-block>
      </ui-code-preview>
    `),
};

export const BuiltInShowcaseControlsManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
built-in controls によるテーマ・surface・viewport 切替の手動確認用 story です。  
state-change event と state 反映の合否は \`test/browser/code-preview.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
  render: () =>
    renderFrame(html`
      <ui-code-preview
        controls="theme surface viewport"
        preview-theme="page"
        preview-surface="surface"
        preview-viewport="full"
        heading="Showcase Controls"
        style="${commonStyle}"
      >
        <div slot="preview" style="padding: 1rem; border-radius: 8px;">
          <ui-button>Preview Button</ui-button>
        </div>
        <ui-code-block layout="inline" filename="button.ts" lang="ts">
          <pre><code>// &lt;ui-button&gt;Preview Button&lt;/ui-button&gt;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    `),
};

export const PreviewPaddingVariantsManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
\`preview-padding\` の見え方比較用 story です。  
padding の正規化と fallback の合否は browser test 側で判定します。
        `,
      },
    },
  },
  render: () =>
    renderFrame(html`
      <div style="display: flex; flex-direction: column; gap: 2rem;">
        <ui-code-preview heading="padding: normal" preview-padding="normal" style="${commonStyle}">
          <div slot="preview"><ui-button>normal</ui-button></div>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const normal = true;</code></pre>
          </ui-code-block>
        </ui-code-preview>

        <ui-code-preview
          heading="padding: compact"
          preview-padding="compact"
          style="${commonStyle}"
        >
          <div slot="preview"><ui-button>compact</ui-button></div>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const compact = true;</code></pre>
          </ui-code-block>
        </ui-code-preview>

        <ui-code-preview heading="padding: none" preview-padding="none" style="${commonStyle}">
          <div slot="preview" style="width: 100%; padding: 1rem; background: oklch(90% 0.03 250);">
            none
          </div>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const none = true;</code></pre>
          </ui-code-block>
        </ui-code-preview>
      </div>
    `),
};

export const PreviewAlignVariantsManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
\`preview-align\` の見え方比較用 story です。  
align の正規化と fallback の合否は browser test 側で判定します。
        `,
      },
    },
  },
  render: () =>
    renderFrame(html`
      <div style="display: flex; flex-direction: column; gap: 2rem;">
        <ui-code-preview heading="align: center" preview-align="center" style="${commonStyle}">
          <ui-button slot="preview">中央揃え</ui-button>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const center = true;</code></pre>
          </ui-code-block>
        </ui-code-preview>

        <ui-code-preview heading="align: start" preview-align="start" style="${commonStyle}">
          <ui-button slot="preview">左上揃え</ui-button>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const start = true;</code></pre>
          </ui-code-block>
        </ui-code-preview>

        <ui-code-preview heading="align: stretch" preview-align="stretch" style="${commonStyle}">
          <div slot="preview" style="width: 100%; background: oklch(90% 0.03 250); padding: 1rem;">
            stretch
          </div>
          <ui-code-block layout="inline" lang="ts">
            <pre><code>const stretch = true;</code></pre>
          </ui-code-block>
        </ui-code-preview>
      </div>
    `),
};

export const InvalidValueFallback: Story = {
  parameters: {
    docs: {
      description: {
        story: `
不正な \`preview-padding\` / \`preview-align\` を与えた例です。  
最終的な fallback の合否は browser test 側で判定します。
        `,
      },
    },
  },
  render: () =>
    renderFrame(html`
      <ui-code-preview
        heading="Invalid fallback"
        preview-padding="invalid-value"
        preview-align="invalid-value"
        style="${commonStyle}"
      >
        <div slot="preview"><ui-button>fallback</ui-button></div>
        <ui-code-block layout="inline" lang="ts">
          <pre><code>const invalid = true;</code></pre>
        </ui-code-block>
      </ui-code-preview>
    `),
};
