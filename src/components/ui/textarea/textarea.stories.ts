import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './textarea';
import type { Textarea } from './textarea';

/**
 * ## テキストエリア (Textarea) `<ui-textarea>`
 *
 * 複数行のテキスト入力コンポーネント。
 * ユーザーの思考に合わせて領域が自動的に拡張（Auto Grow）し、
 * スクロール操作による中断を物理的に排除します（Flow State）。
 *
 * ### バリアント
 * - **default**: UI 用（14px, 密度優先）
 * - **prose**: コンテンツ執筆用（16px, 可読性優先）
 *
 * ### 状態
 * Default / Hover / Focus / Error / Disabled / Readonly
 *
 * ### Auto Grow
 * - `auto-grow="true"` (デフォルト): 入力行数に応じて即時拡張（0ms）
 * - `max-rows`: 最大行数を超えた場合のみ内部スクロール
 * - `auto-grow="false"`: 手動リサイズ（`resize="vertical"` を許容）
 */
const meta: Meta<Textarea> = {
  title: 'Components/Textarea',
  component: 'ui-textarea',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
テキストエリアコンポーネントは、複数行のテキスト入力を提供します。
Auto Grow により入力に対して即応（0ms）し、Flow State を実現します。

## 使用方法

\`\`\`html
<!-- 基本的な使用 -->
<ui-textarea label="メモ" name="memo"></ui-textarea>

<!-- Prose バリアント（執筆用） -->
<ui-textarea label="本文" variant="prose" rows="6"></ui-textarea>

<!-- 最大行数制限 -->
<ui-textarea label="説明" max-rows="5"></ui-textarea>

<!-- Auto Grow 無効（手動リサイズ） -->
<ui-textarea label="メモ" auto-grow="false"></ui-textarea>
\`\`\`

## 注意事項

- **ラベルは必須**: アクセシビリティのため \`label\` 属性は必ず設定してください。
- **Auto Grow**: デフォルトで有効。高さ変化は 0ms（即時）です。
- **max-rows**: 超過時のみ内部スクロールが発生します。
- **type プロパティは非対応**: \`<ui-input>\` の \`type\` は Textarea では使用しません。
                `,
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: '入力項目のラベル（必須）',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    hideLabel: {
      control: 'boolean',
      description: 'ラベルを視覚的に非表示',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    variant: {
      control: 'select',
      options: ['default', 'prose'],
      description: 'タイポグラフィモード',
      table: { type: { summary: "'default' | 'prose'" }, defaultValue: { summary: "'default'" } },
    },
    rows: {
      control: 'number',
      description: '初期表示行数',
      table: { type: { summary: 'number' }, defaultValue: { summary: '3' } },
    },
    maxRows: {
      control: 'number',
      description: '自動伸長時の最大行数（未指定で無制限）',
      table: { type: { summary: 'number' } },
    },
    autoGrow: {
      control: 'boolean',
      description: '自動高さ拡張',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'true' } },
    },
    resize: {
      control: 'select',
      options: ['none', 'vertical'],
      description: 'CSS resize プロパティ（auto-grow=false 時のみ vertical を許容）',
      table: { type: { summary: "'none' | 'vertical'" }, defaultValue: { summary: "'none'" } },
    },
    placeholder: {
      control: 'text',
      description: 'ヒントテキスト',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    value: {
      control: 'text',
      description: '入力値',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    helpText: {
      control: 'text',
      description: '補助テキスト',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    errorMessage: {
      control: 'text',
      description: 'エラーメッセージ',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    error: {
      control: 'boolean',
      description: 'エラー状態の強制',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: '操作無効化',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    readonly: {
      control: 'boolean',
      description: '読み取り専用モード',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    required: {
      control: 'boolean',
      description: '必須入力フラグ',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<Textarea>;

// ──────────────────────────────────────────────
// Default
// ──────────────────────────────────────────────

/**
 * デフォルトのテキストエリア。
 *
 * `variant="default"` (UI 用, 14px) で `rows=3` の初期表示。
 * 入力に応じて高さが即時拡張します（Auto Grow）。
 */
export const Default: Story = {
  args: {
    label: 'メモ',
    name: 'memo',
    placeholder: 'メモを入力してください...',
    rows: 3,
    autoGrow: true,
    variant: 'default',
  },
  render: (args) => html`
    <ui-textarea
      id="default-textarea"
      label="${args.label}"
      name="${args.name}"
      placeholder="${args.placeholder}"
      rows="${args.rows}"
      ?auto-grow=${args.autoGrow}
      variant="${args.variant}"
    ></ui-textarea>
  `,
};

export const VariantDefault: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <div
        style="font-size: 11px; font-weight: 500; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;"
      >
        variant="default" (UI, 14px)
      </div>
      <ui-textarea
        id="variant-default"
        label="メモ"
        variant="default"
        placeholder="UI 用テキストエリア（14px）"
        rows="3"
      ></ui-textarea>
    </div>
  `,
};

export const VariantProse: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <div
        style="font-size: 11px; font-weight: 500; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;"
      >
        variant="prose" (Content, 16px)
      </div>
      <ui-textarea
        id="variant-prose"
        label="本文"
        variant="prose"
        placeholder="コンテンツを執筆してください..."
        rows="6"
      ></ui-textarea>
    </div>
  `,
};

export const AllVariantsAndStates: Story = {
  render: () => html`
    <style>
      .showcase {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        max-width: 900px;
      }
      .showcase-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .showcase-label {
        font-size: 11px;
        font-weight: 500;
        color: oklch(48% 0.01 250);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
      }
    </style>

    <div class="showcase">
      <div class="showcase-group">
        <div class="showcase-label">Default / Default</div>
        <ui-textarea
          id="all-default-default"
          label="メモ"
          variant="default"
          rows="2"
          placeholder="Default..."
        ></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Prose / Default</div>
        <ui-textarea
          id="all-prose-default"
          label="本文"
          variant="prose"
          rows="2"
          placeholder="Prose..."
        ></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Default / Error</div>
        <ui-textarea
          id="all-default-error"
          label="メモ"
          variant="default"
          error
          error-message="エラーが発生しました"
          rows="2"
        ></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Prose / Error</div>
        <ui-textarea
          id="all-prose-error"
          label="本文"
          variant="prose"
          error
          error-message="本文は必須です"
          rows="2"
        ></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Default / Disabled</div>
        <ui-textarea
          id="all-default-disabled"
          label="メモ"
          variant="default"
          disabled
          value="無効状態"
          rows="2"
        ></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Prose / Disabled</div>
        <ui-textarea
          id="all-prose-disabled"
          label="本文"
          variant="prose"
          disabled
          value="無効状態"
          rows="2"
        ></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Default / Readonly</div>
        <ui-textarea
          id="all-default-readonly"
          label="メモ"
          variant="default"
          readonly
          value="読み取り専用"
          rows="2"
        ></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Prose / Readonly</div>
        <ui-textarea
          id="all-prose-readonly"
          label="本文"
          variant="prose"
          readonly
          value="読み取り専用"
          rows="2"
        ></ui-textarea>
      </div>
    </div>
  `,
};