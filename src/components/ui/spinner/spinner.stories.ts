import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './spinner';
import type { SpinnerSize, UiSpinner } from './spinner';

const SPINNER_SIZES = ['default', 'lg'] as const satisfies SpinnerSize[];

const meta: Meta<UiSpinner> = {
  title: 'Components/Spinner',
  component: 'ui-spinner',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
SVGベースのローディングスピナーです。
- host が role="status" と aria-label を担い、内部 SVG は aria-hidden で隠蔽
- size は default(1em) / lg(--icon-xl) を提供
- prefers-reduced-motion では連続アニメーションを停止

この story ファイルは **docs / smoke / 手動確認** に限定します。旧 \`rouaultContractKind\` は使わず、契約検査は Storybook ではなく browser / SSR 側へ移送します。
        `,
      },
    },
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: SPINNER_SIZES,
      description: 'スピナーサイズ',
      table: { type: { summary: "'default' | 'lg'" }, defaultValue: { summary: "'default'" } },
    },
    label: {
      name: 'aria-label',
      control: 'text',
      description: 'スクリーンリーダー向けラベル',
      table: { type: { summary: 'string' }, defaultValue: { summary: '"読み込み中"' } },
    },
  },
};

export default meta;
type Story = StoryObj<UiSpinner>;

export const Default: Story = {
  tags: ['smoke'],
};

export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        --icon-xl: 40px;
        display: grid;
        gap: 1rem;
      }

      .cell {
        display: grid;
        gap: 0.5rem;
      }

      .label {
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--fg-muted, #666);
      }

      .inline-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        min-height: 44px;
        padding-inline: 0.75rem;
      }

      .overlay {
        display: grid;
        place-items: center;
        min-height: 96px;
        border: var(--border-width, 1px) solid var(--border-default, #d7d7d7);
        border-radius: var(--radius-md, 6px);
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <div class="label">default x inline-saving</div>
        <button id="matrix-button" class="inline-button" disabled>
          <ui-spinner id="matrix-inline-default" size="default" aria-label="保存中"></ui-spinner>
          <span>保存中...</span>
        </button>
      </div>

      <div class="cell">
        <div class="label">lg x overlay-page-loading</div>
        <div id="matrix-overlay" class="overlay">
          <ui-spinner id="matrix-overlay-lg" size="lg" aria-label="ページを読み込み中"></ui-spinner>
        </div>
      </div>
    </div>
  `,
};

export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem; font-size: 18px;">
      <ui-spinner id="boundary-invalid-size" size="unknown"></ui-spinner>
      <ui-spinner id="boundary-empty-label" aria-label="   "></ui-spinner>
      <ui-spinner id="boundary-role-override" role="progressbar" aria-label="同期中"></ui-spinner>
    </div>
  `,
};

export const RuntimeA11yGuard: Story = {
  render: () => html`<ui-spinner id="runtime-guard" aria-label="同期中"></ui-spinner>`,
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <div
      style="
        --icon-xl: 36px;
        background: oklch(20% 0.02 250);
        color: oklch(95% 0.01 250);
        padding: 1rem;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
      "
    >
      <ui-spinner id="dark-default" size="default" aria-label="読み込み中"></ui-spinner>
      <ui-spinner id="dark-lg" size="lg" aria-label="ページを読み込み中"></ui-spinner>
    </div>
  `,
};