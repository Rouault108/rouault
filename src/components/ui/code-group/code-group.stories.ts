import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './code-group';
import type { CodeGroup } from './code-group';
import '../codeblock/codeblock';

const meta: Meta<CodeGroup> = {
  title: 'Components/Code Group',
  component: 'ui-code-group',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
コード比較 UI の **表示見本** です。

- Storybook には composition surface と representative display を残します。
- tab keyboard / selection transition / change event / copy synchronization は \`test/browser/**\` を正本にします。
- fallback surface は docs 上でも見られるように残しますが、合否判定は Storybook で行いません。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<CodeGroup>;

export const UncontrolledComparison: Story = {
  render: () => html`
    <ui-code-group aria-label="framework comparison">
      <ui-code-block group-key="ts" tab-label="TypeScript" filename="app.ts" lang="ts">
        <pre><code>export const framework = 'typescript';</code></pre>
      </ui-code-block>

      <ui-code-block group-key="js" tab-label="JavaScript" filename="app.js" lang="js">
        <pre><code>export const framework = 'javascript';</code></pre>
      </ui-code-block>

      <ui-code-block group-key="py" tab-label="Python" filename="app.py" lang="py">
        <pre><code>framework = 'python'</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
};

export const ControlledSelection: Story = {
  render: () => html`
    <ui-code-group aria-label="controlled selection" selected-value="lit">
      <ui-code-block group-key="react" tab-label="React" filename="app.tsx" lang="tsx">
        <pre><code>export const framework = 'react';</code></pre>
      </ui-code-block>

      <ui-code-block group-key="lit" tab-label="Lit" filename="app.ts" lang="ts">
        <pre><code>export const framework = 'lit';</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
};

export const ManualActivation: Story = {
  render: () => html`
    <ui-code-group aria-label="manual activation comparison" activation="manual">
      <ui-code-block group-key="node" tab-label="Node" filename="server.ts" lang="ts">
        <pre><code>export const runtime = 'node';</code></pre>
      </ui-code-block>

      <ui-code-block group-key="deno" tab-label="Deno" filename="server.ts" lang="ts">
        <pre><code>export const runtime = 'deno';</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
};

export const FallbackSurface: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-code-group aria-label="single item fallback">
        <ui-code-block group-key="only" tab-label="Only" filename="only.ts" lang="ts">
          <pre><code>export const only = true;</code></pre>
        </ui-code-block>
      </ui-code-group>

      <ui-code-group aria-label="mixed children fallback">
        <ui-code-block group-key="alpha" tab-label="Alpha" filename="alpha.ts" lang="ts">
          <pre><code>export const alpha = 1;</code></pre>
        </ui-code-block>
        <p>余計な要素がある場合は比較 UI に昇格しません。</p>
        <ui-code-block group-key="beta" tab-label="Beta" filename="beta.ts" lang="ts">
          <pre><code>export const beta = 2;</code></pre>
        </ui-code-block>
      </ui-code-group>
    </div>
  `,
};

export const CopyDisabledSurface: Story = {
  render: () => html`
    <ui-code-group aria-label="copy disabled surface">
      <ui-code-block group-key="alpha" tab-label="Alpha" filename="alpha.ts" lang="ts">
        <pre><code>export const alpha = 1;</code></pre>
      </ui-code-block>

      <ui-code-block
        group-key="beta"
        tab-label="Beta"
        filename="beta.ts"
        lang="ts"
        copyable="false"
      >
        <pre><code>export const beta = 2;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
};

export const ManualKeyboardReview: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-code-group aria-label="manual keyboard review" activation="manual">
      <ui-code-block group-key="left" tab-label="Left" filename="left.ts" lang="ts">
        <pre><code>export const side = 'left';</code></pre>
      </ui-code-block>

      <ui-code-block group-key="center" tab-label="Center" filename="center.ts" lang="ts">
        <pre><code>export const side = 'center';</code></pre>
      </ui-code-block>

      <ui-code-block group-key="right" tab-label="Right" filename="right.ts" lang="ts">
        <pre><code>export const side = 'right';</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
};
