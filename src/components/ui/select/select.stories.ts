import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './select';
import type { Select, SelectOption } from './select';

// ============================================================
// サンプルデータ
// ============================================================

const PREFECTURE_OPTIONS: SelectOption[] = [
  { value: 'tokyo', label: '東京都' },
  { value: 'osaka', label: '大阪府' },
  { value: 'kyoto', label: '京都府' },
  { value: 'kanagawa', label: '神奈川県' },
  { value: 'aichi', label: '愛知県' },
  { value: 'fukuoka', label: '福岡県' },
  { value: 'hokkaido', label: '北海道' },
  { value: 'okinawa', label: '沖縄県' },
];

const LONG_LABEL_OPTIONS: SelectOption[] = [
  { value: 'short', label: '短い' },
  {
    value: 'long',
    label: 'とても長いラベルのテキストが入る選択肢のサンプルです（レイアウト確認用）',
  },
  { value: 'medium', label: '中程度の長さのラベル' },
];

// ============================================================
// Meta
// ============================================================

/**
 * ## セレクトボックス (Select)
 *
 * ユーザーが既定の選択肢から「値を選ぶ」ためのコンポーネントです。
 *
 * ### デザイン哲学
 * - **Consistency**: トリガーの見た目は `<ui-input>` と完全に一致
 * - **Native Polish**: OS のドロップダウン挙動を模倣しつつ、洗練されたスタイルを提供
 * - **Combobox Pattern**: WAI-ARIA Combobox パターン準拠
 *
 * ### キーボード操作
 * - `Enter` / `Space`: リストボックスの開閉・選択
 * - `ArrowDown` / `ArrowUp`: 項目移動（循環）
 * - `Home` / `End`: 先頭・末尾へ移動
 * - `Escape`: リストボックスを閉じる
 * - `Tab`: リストボックスを閉じて次の要素へ
 * - 文字入力: Type-ahead（1秒バッファ）
 */
const meta: Meta<Select> = {
  title: 'Components/Select',
  component: 'ui-select',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
セレクトボックスコンポーネントは、ユーザーが既定の選択肢から値を選ぶためのコンポーネントです。

## 使用方法

\`\`\`html
<ui-select
  label="都道府県"
  name="prefecture"
  placeholder="選択してください"
></ui-select>
\`\`\`

## 注意事項

- **ラベルは必須**: アクセシビリティのため、\`label\` 属性は必ず設定してください。
- **options プロパティ**: JavaScript でオプション配列を設定してください。
- **modelValue**: 選択値は \`string | number\` に限定されます。
        `,
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: '入力ラベル（必須）',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    hideLabel: {
      control: 'boolean',
      description: 'ラベルを視覚的に非表示',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    name: {
      control: 'text',
      description: 'フォーム送信時のフィールド名',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    modelValue: {
      control: 'text',
      description: '選択された値',
      table: { type: { summary: 'string | number' }, defaultValue: { summary: '' } },
    },
    placeholder: {
      control: 'text',
      description: '未選択時に表示するテキスト',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    opened: {
      control: 'boolean',
      description: 'リストボックスの開閉状態',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
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
    variant: {
      control: 'radio',
      options: ['filled', 'outline'],
      description: '外観バリアント',
      table: { type: { summary: "'filled' | 'outline'" }, defaultValue: { summary: 'filled' } },
    },
  },
};

export default meta;
type Story = StoryObj<Select>;

// ============================================================
// 1. Default（デフォルト）
// ============================================================

/**
 * デフォルトのセレクトボックス。
 * 未選択状態でプレースホルダーを表示します。
 */
export const Default: Story = {
  render: () => html`
    <ui-select
      id="default-select"
      label="都道府県"
      name="prefecture"
      placeholder="選択してください"
      .options="${PREFECTURE_OPTIONS}"
    ></ui-select>
  `,
};

export const OutlineVariant: Story = {
  render: () => html`
    <ui-select
      id="outline-select"
      label="都道府県"
      name="prefecture"
      variant="outline"
      placeholder="選択してください"
      .options="${PREFECTURE_OPTIONS}"
    ></ui-select>
  `,
};

export const LongLabels: Story = {
  render: () => html`
    <div style="max-width: 200px;">
      <ui-select
        id="long-labels-select"
        label="選択肢"
        name="choice"
        placeholder="選択してください"
        .options="${LONG_LABEL_OPTIONS}"
      ></ui-select>
    </div>
  `,
};

export const AllStatesShowcase: Story = {
  render: () => html`
    <style>
      .states-grid {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        max-width: 400px;
      }
      .state-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--fg-muted, #888);
        margin-bottom: 4px;
      }
    </style>
    <div class="states-grid">
      <div>
        <div class="state-label">Default（未選択）</div>
        <ui-select
          label="都道府県"
          name="s1"
          placeholder="選択してください"
          .options="${PREFECTURE_OPTIONS}"
        ></ui-select>
      </div>
      <div>
        <div class="state-label">Selected（選択済み）</div>
        <ui-select
          label="都道府県"
          name="s2"
          model-value="tokyo"
          .options="${PREFECTURE_OPTIONS}"
        ></ui-select>
      </div>
      <div>
        <div class="state-label">With Help Text</div>
        <ui-select
          label="都道府県"
          name="s3"
          placeholder="選択してください"
          help-text="お住まいの都道府県を選択してください"
          .options="${PREFECTURE_OPTIONS}"
        ></ui-select>
      </div>
      <div>
        <div class="state-label">Error</div>
        <ui-select
          label="都道府県"
          name="s4"
          placeholder="選択してください"
          ?error=${true}
          error-message="都道府県を選択してください"
          .options="${PREFECTURE_OPTIONS}"
        ></ui-select>
      </div>
      <div>
        <div class="state-label">Disabled</div>
        <ui-select
          label="都道府県"
          name="s5"
          model-value="osaka"
          ?disabled=${true}
          .options="${PREFECTURE_OPTIONS}"
        ></ui-select>
      </div>
      <div>
        <div class="state-label">Readonly</div>
        <ui-select
          label="都道府県"
          name="s6"
          model-value="kyoto"
          ?readonly=${true}
          .options="${PREFECTURE_OPTIONS}"
        ></ui-select>
      </div>
    </div>
  `,
};

export const DarkMode: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'ui-select の dark surface / token 参照の合否は SSR 側 CSS 構造検査を正本とします。この story は手動確認専用です。',
      },
    },
  },
  render: () => html`
    <div style="padding: 16px; background: oklch(18% 0.01 250); color: oklch(96% 0.01 250);">
      <ui-select
        id="dark-mode-select"
        label="都道府県"
        name="dark-prefecture"
        placeholder="選択してください"
        .options="${PREFECTURE_OPTIONS}"
      ></ui-select>
    </div>
  `,
};

export const ForcedColorsReference: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'ui-select の forced-colors CSS 構造契約は SSR 側テストを正本とします。この story は手動確認専用です。',
      },
    },
  },
  render: () => html`
    <ui-select
      id="forced-colors-select"
      label="都道府県"
      name="forced-colors-prefecture"
      placeholder="選択してください"
      .options="${PREFECTURE_OPTIONS}"
    ></ui-select>
  `,
};

export const ReducedMotionReference: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'ui-select の reduced-motion CSS 構造契約は SSR 側テストを正本とします。この story は手動確認専用です。',
      },
    },
  },
  render: () => html`
    <ui-select
      id="reduced-motion-select"
      label="都道府県"
      name="reduced-motion-prefecture"
      placeholder="選択してください"
      .options="${PREFECTURE_OPTIONS}"
    ></ui-select>
  `,
};
