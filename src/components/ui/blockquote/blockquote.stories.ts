import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './blockquote';
import { Blockquote } from './blockquote';
import type { BlockquoteVariant } from './blockquote';

const VARIANTS = ['default', 'nested'] as const satisfies BlockquoteVariant[];

const meta: Meta<Blockquote> = {
  title: 'Components/Blockquote',
  component: 'ui-blockquote',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
	引用本文を意味要素として表現するコンポーネントです。

	- 出典なし: \`blockquote\` 単体
	- 出典あり: \`figure > blockquote + figcaption > cite\`
	- 状態: \`variant="default" | "nested"\`
	- \`source\`: 簡易テキスト出典
	- \`slot="source"\`: 優先可視出典
	- \`cite\`: 機械可読 URL
	- \`quote-lang\`: 引用本文言語
	        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: VARIANTS,
      table: { type: { summary: "'default' | 'nested'" }, defaultValue: { summary: "'default'" } },
      description: '見た目のバリアント',
    },
    source: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '簡易テキスト出典。trim 後に空なら未指定として扱う',
    },
    cite: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '機械可読な引用元 URL。trim 後に非空の場合のみ blockquote[cite] に反映する',
    },
    quoteLang: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '引用本文言語。未指定時のみ host の lang を参照する',
    },
  },
};

export default meta;
type Story = StoryObj<Blockquote>;

/**
 * 基本ケース:
 * - 出典なしでは `blockquote` 単体を使う
 * - キーボード非インタラクティブ契約（tabindex/role を持たない）
 */

export const Default: Story = {
  render: () => html`
    <ui-blockquote id="default-quote">
      <p>読書体験は、UIを消すことではなく、本文の信号を最大化することで成立する。</p>
    </ui-blockquote>
  `,
};

/**
 * バリアント×状態マトリクス:
 * - variant: default / nested
 * - source: あり / なし
 */

export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
      }
      .label {
        font-size: 11px;
        color: var(--fg-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>
    <div class="matrix">
      <div class="label">default x source:none</div>
      <ui-blockquote id="matrix-default-no-source" variant="default">
        <p>既定バリアント、出典なし。</p>
      </ui-blockquote>

      <div class="label">default x source:yes</div>
      <ui-blockquote id="matrix-default-source" variant="default" source="出典: 設計ノート">
        <p>既定バリアント、出典あり。</p>
      </ui-blockquote>

      <div class="label">nested x source:none</div>
      <ui-blockquote id="matrix-nested-no-source" variant="nested">
        <p>ネストバリアント、出典なし。</p>
      </ui-blockquote>

      <div class="label">nested x source:yes</div>
      <ui-blockquote id="matrix-nested-source" variant="nested" source="出典: RFC">
        <p>ネストバリアント、出典あり。</p>
      </ui-blockquote>
    </div>
  `,
};

/**
 * semantic token 上の表示確認用 story です。
 * CSS 構造契約の合否は SSR 側テストを正本とします。
 */

export const DarkModeTokenContract: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <div style="padding: 1rem; background: var(--bg-default); color: var(--fg-default);">
        <ui-blockquote id="dark-token-light" source="Source: Light Token">
          <p>Light surface on semantic tokens.</p>
        </ui-blockquote>
      </div>
      <div
        style="padding: 1rem; color-scheme: dark; background: oklch(18% 0.01 250); color: oklch(95% 0.01 250);"
      >
        <ui-blockquote id="dark-token-dark" source="Source: Dark Token">
          <p>Dark surface on semantic tokens.</p>
        </ui-blockquote>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'blockquote の semantic token 参照契約は test/ssr/css-structure-contracts.test.ts で検査します。この story は手動確認専用です。',
      },
    },
  },
};

/**
 * Forced Colors契約:
 * - 強制カラーモードで構造線を維持する
 * - 色指定がトークン参照を維持する
 */

export const ForcedColorsContract: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-blockquote id="forced-colors-contract" source="出典: トークン契約">
      <p>forced-colors でも左構造線が失われないこと。</p>
    </ui-blockquote>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'blockquote の forced-colors CSS 構造契約は test/ssr/css-structure-contracts.test.ts で検査します。この story は手動確認専用です。',
      },
    },
  },
};

/**
 * Print契約:
 * - blockquote / figure の分断抑止が定義されている
 * - 構造線の印刷色固定が定義されている
 */

export const PrintStyleContract: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-blockquote id="print-contract" source="出典: 印刷設計">
      <p>print 時の構造保持を確認する。</p>
    </ui-blockquote>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'blockquote の print CSS 構造契約は test/ssr/css-structure-contracts.test.ts で検査します。この story は手動確認専用です。',
      },
    },
  },
};
