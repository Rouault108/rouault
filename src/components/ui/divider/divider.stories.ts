import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './divider';
import { type Divider, type DividerVariant } from './divider';

const VARIANTS = ['section', 'layout'] as const satisfies DividerVariant[];

const meta: Meta<Divider> = {
  title: 'Components/Divider',
  component: 'ui-divider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
区切り線コンポーネントです。

- ネイティブ \`hr\` を最終DOMとして出力
- \`variant\` は \`section\` / \`layout\` の意味分類で、既定値は \`section\`
- 追加ロールを付与せず、ネイティブセマンティクスを維持
- 適用スコープは \`.prose hr\` / \`ui-divider > hr\` / \`hr[data-divider-variant="layout"]\` に限定
- トークン: \`--border-style-subtle\` / \`--border-default\` / \`--border-ghost\` / \`--space-12\`

この story ファイルは **docs / smoke / 手動確認** に限定します。selector / forced-colors / print / token 参照は Storybook ではなく SSR 側の CSS 構造検査へ寄せます。
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: VARIANTS,
      table: { type: { summary: "'section' | 'layout'" }, defaultValue: { summary: "'section'" } },
      description: '区切り線の用途バリアント',
    },
  },
};

export default meta;
type Story = StoryObj<Divider>;

/**
 * 基本契約:
 * - `ui-divider` は `hr` を出力する
 * - 追加ロールを付与しない
 */
export const Default: Story = {
  tags: ['smoke'],
  render: () => html`<ui-divider id="default-divider"></ui-divider>`,
};

/**
 * バリアント × 状態:
 * - variant: section / layout
 * - state: host に aria-label / tabindex あり・なし（内側 hr へは転送しない）
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.75rem;
      }
      .cell {
        padding: 0.75rem;
        border: 1px dashed var(--border-default, #d7d7d7);
      }
      .label {
        margin-block-end: 0.5rem;
        font-size: 11px;
        color: var(--fg-muted, #666);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>
    <div class="matrix">
      <div class="cell">
        <div class="label">section x unlabeled</div>
        <ui-divider id="matrix-section-unlabeled" variant="section"></ui-divider>
      </div>

      <div class="cell">
        <div class="label">section x host-labeled</div>
        <ui-divider
          id="matrix-section-labeled"
          variant="section"
          aria-label="章区切り"
        ></ui-divider>
      </div>

      <div class="cell">
        <div class="label">layout x unlabeled</div>
        <ui-divider id="matrix-layout-unlabeled" variant="layout"></ui-divider>
      </div>

      <div class="cell">
        <div class="label">layout x host-labeled</div>
        <ui-divider
          id="matrix-layout-labeled"
          variant="layout"
          aria-label="レイアウト境界"
        ></ui-divider>
      </div>

      <div class="cell">
        <div class="label">section x host-tabindex</div>
        <ui-divider id="matrix-section-tabindex" variant="section" tabindex="0"></ui-divider>
      </div>

      <div class="cell">
        <div class="label">layout x host-tabindex</div>
        <ui-divider id="matrix-layout-tabindex" variant="layout" tabindex="0"></ui-divider>
      </div>
    </div>
  `,
};

/**
 * 事故が多い境界条件:
 * - 不正 variant のフォールバック
 * - host aria-label 非転送
 * - host tabindex 非転送
 * - スタイルスコープ漏れ防止
 */
export const EdgeCases: Story = {
  render: () => html`
    <style>
      #boundary-scope {
        --space-12: 64px;
      }
    </style>
    <div id="boundary-scope">
      <ui-divider id="boundary-invalid-variant" variant="unknown"></ui-divider>
      <ui-divider id="boundary-host-label" aria-label="章区切り"></ui-divider>
      <ui-divider id="boundary-host-role" role="separator"></ui-divider>
      <ui-divider id="boundary-host-tabindex" tabindex="0"></ui-divider>

      <div class="prose">
        <hr id="boundary-prose-hr" />
      </div>
      <hr id="boundary-layout-hr" data-divider-variant="layout" />
      <hr id="boundary-plain-hr" />
    </div>
  `,
};

/**
 * インスタンス非依存契約:
 * - `<ui-divider>` が存在しなくても `.prose hr` / `hr[data-divider-variant="layout"]` にスタイルが適用される
 */
export const ScopeWithoutComponentInstance: Story = {
  render: () => html`
    <style>
      #scope-only-contract {
        --space-12: 52px;
      }
    </style>
    <div id="scope-only-contract">
      <div class="prose">
        <hr id="scope-only-prose-hr" />
      </div>
      <hr id="scope-only-layout-hr" data-divider-variant="layout" />
      <hr id="scope-only-plain-hr" />
    </div>
  `,
};

export const MediaAndTokenManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 0.5rem;">
      <ui-divider id="contract-divider-a"></ui-divider>
      <ui-divider id="contract-divider-b" variant="layout"></ui-divider>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'divider の selector / forced-colors / print / token 参照の CSS 構造契約は test/ssr/divider-css-structure.test.ts を正本とします。この story は手動確認専用です。',
      },
    },
  },
};

export const DarkModeManual: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <div
        id="dark-contract-light"
        style="padding: 0.75rem; background: var(--bg-default); color: var(--fg-default);"
      >
        <ui-divider id="dark-contract-divider-light"></ui-divider>
      </div>
      <div
        id="dark-contract-dark"
        style="padding: 0.75rem; color-scheme: dark; background: oklch(18% 0.01 250); color: oklch(95% 0.01 250);"
      >
        <ui-divider id="dark-contract-divider-dark"></ui-divider>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'divider の dark-mode token 参照契約は test/ssr/divider-css-structure.test.ts を正本とします。この story は手動確認専用です。',
      },
    },
  },
};

export const SelectorSpecificityReference: Story = {
  render: () => html`
    <style>
      #specificity-scope .override-target {
        border-top-style: dashed;
        border-top-width: 3px;
        margin-top: 19px;
      }
    </style>
    <div id="specificity-scope">
      <div class="prose">
        <hr id="specificity-prose-hr" class="override-target" />
      </div>
      <hr id="specificity-layout-hr" class="override-target" data-divider-variant="layout" />
    </div>
  `,
};
