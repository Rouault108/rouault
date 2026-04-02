import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './slider';
import { Slider } from './slider';
import '../icon/icon.js';

/**
 * ## スライダー (Slider) `<ui-slider>`
 *
 * 音量やサイズなど、連続的な値や「強度」の調整に使用します。
 *
 * ### デザイン哲学
 *
 * - **Tactility**: Thumb はユーザーの入力に対し、1:1 で即座に追従（Snappiness）します
 * - **Input-on-Top Overlay パターン**: ネイティブ `<input type="range">` を透明にして最前面に配置し、
 *   全てのユーザー操作を直接受け取らせます
 *
 * ### Value Normalization
 *
 * - `min > max` の場合は値を入れ替えて正規化
 * - `step <= 0` または非数値は `1` にフォールバック
 * - `value` は `min...max` にクランプ後、最も近い有効ステップへ丸め
 * - 小数ステップ（例: `0.1`）での浮動小数点誤差を精度に合わせて丸め
 *
 * ### キーボード操作
 *
 * - **Right / Up**: 値を `step` の単位で増加
 * - **Left / Down**: 値を `step` の単位で減少
 * - **Home**: 最小値 (`min`) へジャンプ
 * - **End**: 最大値 (`max`) へジャンプ
 * - **Page Up / Page Down**: `largeStep = step * 10` を使用して増減
 *
 * ### 使用上の注意
 *
 * - **`label` は必須**: スクリーンリーダー用のラベルを必ず指定してください
 * - **`prefix` / `suffix` スロット**: 左右にアイコンや現在値を配置できます
 */
const meta: Meta<Slider> = {
  title: 'Components/Slider',
  component: 'ui-slider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
スライダーコンポーネントは、音量やサイズなど連続的な値の調整に使用します。
Input-on-Top Overlay パターンにより、操作の「空振り」を物理的に防ぎます。

## 使用方法

\`\`\`html
<!-- 基本的な使用 -->
<ui-slider label="音量" value="50"></ui-slider>

<!-- prefix/suffix スロット -->
<ui-slider label="明るさ" min="0" max="100" value="70">
  <ui-icon slot="prefix" name="moon" aria-hidden="true"></ui-icon>
  <ui-icon slot="suffix" name="sun" aria-hidden="true"></ui-icon>
</ui-slider>

<!-- 小数ステップ -->
<ui-slider label="倍率" min="0" max="2" step="0.1" value="1.0"></ui-slider>

<!-- 無効 -->
<ui-slider label="変更不可" value="30" disabled></ui-slider>
\`\`\`

## 注意事項

- **\`label\` は必須**: スクリーンリーダー用のラベルを必ず指定してください。
- **Value Normalization**: \`min > max\` の場合は自動的に入れ替えられます。
- **小数ステップ**: \`step="0.1"\` などの小数ステップでも浮動小数点誤差を回避します。
                `,
      },
    },
  },
  argTypes: {
    min: {
      control: 'number',
      description: '最小値',
      table: { type: { summary: 'number' }, defaultValue: { summary: '0' } },
    },
    max: {
      control: 'number',
      description: '最大値',
      table: { type: { summary: 'number' }, defaultValue: { summary: '100' } },
    },
    step: {
      control: 'number',
      description: '増減の刻み幅',
      table: { type: { summary: 'number' }, defaultValue: { summary: '1' } },
    },
    value: {
      control: 'number',
      description: '現在の値（未指定時は min）',
      table: { type: { summary: 'number' }, defaultValue: { summary: 'min' } },
    },
    label: {
      control: 'text',
      description: 'スクリーンリーダー用のラベル（必須）',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<Slider>;

// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * デフォルトのスライダー（中間値）。
 *
 * `value="50"` で中間位置に Thumb が表示されます。
 * フィルが左半分を `--primary` 色で塗りつぶします。
 */
export const Default: Story = {
  args: {
    label: '音量',
    min: 0,
    max: 100,
    step: 1,
    value: 50,
  },
  render: (args) => html`
    <ui-slider
      id="default-slider"
      label="${args.label}"
      min="${args.min}"
      max="${args.max}"
      step="${args.step}"
      value="${args.value}"
      ?disabled=${args.disabled}
    ></ui-slider>
  `,
};

export const WithSlots: Story = {
  render: () => html`
    <ui-slider
      id="with-slots"
      label="音量"
      min="0"
      max="100"
      value="60"
      @input="${(e: Event) => {
        const slider = e.target as Slider;
        const suffix = slider.querySelector<HTMLElement>('[slot="suffix"][data-role="value"]');
        if (suffix) suffix.textContent = String(slider.value);
      }}"
    >
      <ui-icon slot="prefix" name="volume-x" aria-hidden="true" style="font-size: 1.2em;"></ui-icon>
      <span
        data-role="value"
        slot="suffix"
        style="font-size: 14px; min-width: 3ch; text-align: right; font-variant-numeric: tabular-nums;"
        >60</span
      >
    </ui-slider>
  `,
};

export const BrightnessControl: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px;">
      <div style="font-size: 13px; color: oklch(48% 0.01 250);">明るさ調整</div>
      <ui-slider id="brightness" label="明るさ" min="0" max="100" value="70">
        <ui-icon
          slot="prefix"
          name="moon-star"
          aria-hidden="true"
          style="font-size: 1.1em; opacity: 0.7;"
        ></ui-icon>
        <ui-icon slot="suffix" name="sun" aria-hidden="true" style="font-size: 1.1em;"></ui-icon>
      </ui-slider>
    </div>
  `,
};

export const AllStates: Story = {
  render: () => html`
    <style>
      .states-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        max-width: 480px;
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
      }
    </style>

    <div class="states-list">
      <div class="state-group">
        <div class="state-label">Default (value=50)</div>
        <ui-slider id="all-default" label="デフォルト" value="50"></ui-slider>
      </div>

      <div class="state-group">
        <div class="state-label">Min (value=0)</div>
        <ui-slider id="all-min" label="最小値" value="0"></ui-slider>
      </div>

      <div class="state-group">
        <div class="state-label">Max (value=100)</div>
        <ui-slider id="all-max" label="最大値" value="100"></ui-slider>
      </div>

      <div class="state-group">
        <div class="state-label">Disabled (value=40)</div>
        <ui-slider id="all-disabled" label="無効" value="40" disabled></ui-slider>
      </div>

      <div class="state-group">
        <div class="state-label">Step=10 (value=30)</div>
        <ui-slider
          id="all-step10"
          label="ステップ10"
          min="0"
          max="100"
          step="10"
          value="30"
        ></ui-slider>
      </div>

      <div class="state-group">
        <div class="state-label">Decimal Step=0.1 (value=1.5)</div>
        <ui-slider
          id="all-decimal"
          label="小数ステップ"
          min="0"
          max="2"
          step="0.1"
          value="1.5"
        ></ui-slider>
      </div>

      <div class="state-group">
        <div class="state-label">With Slots</div>
        <ui-slider id="all-slots" label="スロット付き" value="65">
          <ui-icon slot="prefix" name="volume-x" aria-hidden="true"></ui-icon>
          <ui-icon slot="suffix" name="volume-2" aria-hidden="true"></ui-icon>
        </ui-slider>
      </div>
    </div>
  `,
};
