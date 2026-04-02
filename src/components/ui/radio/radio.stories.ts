import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './radio';
import './radio-group';
import type { Radio } from './radio';

/**
 * ## ラジオボタン (Radio)
 *
 * 同一グループ（`name` 属性）内で排他的な選択を提供します。
 * Form-Associated Custom Element として、標準フォームとシームレスに統合します。
 *
 * ### デザイン哲学
 *
 * - **Clarity**: 選択状態を一目で識別可能にし、ラベルとの関連性を明確にします
 * - **Tactility**: `--duration-fast` (70ms) による即応性の高いアニメーション
 * - **Ring Style**: 1px → 4px のボーダー幅遷移 + 背景色変化で「ドーナツ型」アニメーションを生成
 *
 * ### キーボード操作
 *
 * - **Arrow Keys** (↑↓←→): グループ内を循環移動・即時選択
 * - **Roving Tabindex**: 選択中のラジオのみ `tabindex="0"`、他は `tabindex="-1"`
 * - **Tab / Shift+Tab**: グループ外へのフォーカス移動
 *
 * ### 使用上の注意
 *
 * - **フォーム送信**: `name` が空でない、`disabled` でない、`checked === true` の場合のみ値を送信
 * - **グループ排他制御**: 同一 `name` のラジオを選択すると他は自動的に未選択になります
 * - **`ui-radio-group`**: `name` や選択値は持たず、`required` 検証と `radiogroup` の意味付けを担います
 */
const meta: Meta<Radio> = {
  title: 'Components/Radio',
  component: 'ui-radio',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
ラジオボタンコンポーネントは、同一グループ内で排他的な選択を提供します。
Form-Associated Custom Element として、標準フォームとシームレスに統合します。

## 使用方法

\`\`\`html
<!-- 基本的なグループ -->
<ui-radio-group label="色">
  <ui-radio name="color" value="red" label="赤"></ui-radio>
  <ui-radio name="color" value="green" label="緑" checked></ui-radio>
  <ui-radio name="color" value="blue" label="青"></ui-radio>
</ui-radio-group>

<!-- 無効 -->
<ui-radio name="size" value="xl" label="XL（在庫なし）" disabled></ui-radio>
\`\`\`

## 注意事項

- **グループ排他制御**: 同一 \`name\` のラジオを選択すると他は自動的に未選択になります。
- **グループ境界**: 排他制御の真実源は常に各 \`ui-radio.name\` であり、\`ui-radio-group\` は上書きしません。
- **フォーム送信**: \`name\` が空でない、\`disabled\` でない、\`checked === true\` の場合のみ値を送信します。
- **Roving Tabindex**: 選択中のラジオのみ \`tabindex="0"\`、他は \`tabindex="-1"\` です。
        `,
      },
    },
  },
  argTypes: {
    checked: {
      control: 'boolean',
      description: '選択状態',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    label: {
      control: 'text',
      description: 'ラベルテキスト',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    name: {
      control: 'text',
      description: 'フォーム送信時の識別子（グループ化にも使用）',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    value: {
      control: 'text',
      description: 'フォーム送信時の値',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'on' } },
    },
    disabled: {
      control: 'boolean',
      description: '無効化',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    invalid: {
      control: 'boolean',
      description: 'バリデーションエラー状態',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    errorMessage: {
      control: 'text',
      description: 'エラーメッセージ',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
  },
};

export default meta;
type Story = StoryObj<Radio>;


// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * デフォルトのラジオボタン（未選択）。
 *
 * 未選択時は「構造」として静かに存在します。
 * 背景色 `--bg-fill-muted` でコントロール領域を明示します。
 */
export const Default: Story = {
  args: {
    label: '選択肢 A',
    name: 'default-group',
    value: 'a',
  },
  render: (args) => html`
    <ui-radio
      id="default-radio"
      label="${args.label}"
      name="${args.name}"
      value="${args.value}"
      ?checked=${args.checked}
      ?disabled=${args.disabled}
    ></ui-radio>
  `,
};

export const AllStates: Story = {
  render: () => html`
    <style>
      .states-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        max-width: 600px;
      }
      .state-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .state-label {
        font-size: 11px;
        font-weight: 500;
        color: oklch(48% 0.01 250);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
      }
    </style>

    <div class="states-grid">
      <div class="state-group">
        <div class="state-label">Unchecked</div>
        <ui-radio id="all-unchecked" label="未選択" name="all-s1" value="a"></ui-radio>
      </div>

      <div class="state-group">
        <div class="state-label">Checked</div>
        <ui-radio id="all-checked" label="選択済み" name="all-s2" value="a" checked></ui-radio>
      </div>

      <div class="state-group">
        <div class="state-label">Unchecked + Disabled</div>
        <ui-radio label="未選択・無効" name="all-s3" value="a" disabled></ui-radio>
      </div>

      <div class="state-group">
        <div class="state-label">Checked + Disabled</div>
        <ui-radio label="選択・無効" name="all-s4" value="a" checked disabled></ui-radio>
      </div>

      <div class="state-group">
        <div class="state-label">Invalid</div>
        <ui-radio
          label="エラー"
          name="all-s5"
          value="a"
          invalid
          error-message="エラーメッセージ"
        ></ui-radio>
      </div>

      <div class="state-group">
        <div class="state-label">No Label</div>
        <ui-radio id="all-no-label" name="all-s6" value="a"></ui-radio>
      </div>
    </div>
  `,
};

export const DarkThemeStates: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'ui-radio の dark theme / token surface の合否は browser test と SSR 側 CSS 構造検査を正本とします。この story は手動確認専用です。',
      },
    },
  },
  render: () => html`
    <div
      style="
        padding: 1rem;
        background: oklch(20% 0.01 250);
        color: oklch(96% 0 0);
        border-radius: 8px;
        --bg-fill-muted: oklch(30% 0.01 250);
        --bg-default: oklch(18% 0.01 250);
        --fg-default: oklch(96% 0 0);
        --border-muted: oklch(62% 0.01 250 / 0.7);
      "
    >
      <div
        role="radiogroup"
        aria-label="ダークテーマ確認"
        style="display:flex; flex-direction:column; gap:0.5rem;"
      >
        <ui-radio id="dark-radio-a" name="dark-radio" value="a" label="未選択"></ui-radio>
        <ui-radio id="dark-radio-b" name="dark-radio" value="b" label="選択済み" checked></ui-radio>
      </div>
    </div>
  `,
};