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
      ?disabled="${args.disabled}"
    ></ui-slider>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#default-slider');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    // テスト: value が 50
    if (slider.value !== 50)
      throw new Error(`期待される値は50でしたが、実際は ${String(slider.value)} でした`);

    // テスト: input[type="range"] が存在する
    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) throw new Error('シャドウルートに input[type="range"] が見つかりません');

    // テスト: aria-label が設定されている
    if (input.getAttribute('aria-label') !== '音量') {
      throw new Error(
        `期待される aria-label は "音量" でしたが、実際は "${input.getAttribute('aria-label') ?? 'null'}" でした`,
      );
    }

    // テスト: aria-valuemin / aria-valuemax / aria-valuenow
    if (input.getAttribute('aria-valuemin') !== '0') {
      throw new Error(
        `期待される aria-valuemin は "0" でしたが、実際は "${input.getAttribute('aria-valuemin') ?? 'null'}" でした`,
      );
    }
    if (input.getAttribute('aria-valuemax') !== '100') {
      throw new Error(
        `期待される aria-valuemax は "100" でしたが、実際は "${input.getAttribute('aria-valuemax') ?? 'null'}" でした`,
      );
    }
    if (input.getAttribute('aria-valuenow') !== '50') {
      throw new Error(
        `期待される aria-valuenow は "50" でしたが、実際は "${input.getAttribute('aria-valuenow') ?? 'null'}" でした`,
      );
    }

    // テスト: Thumb が存在する
    const thumb = slider.shadowRoot?.querySelector('.thumb');
    if (!thumb) throw new Error('Thumb 要素が見つかりません');

    // テスト: Fill が存在する
    const fill = slider.shadowRoot?.querySelector('.fill');
    if (!fill) throw new Error('Fill 要素が見つかりません');
  },
};

// ──────────────────────────────────────────────
// バリアント × 状態の組み合わせ
// ──────────────────────────────────────────────

/**
 * 通常状態 × 最小値（value = min）。
 *
 * Thumb が左端に位置し、フィルの幅は 0% です。
 */
export const AtMinValue: Story = {
  render: () => html`
    <ui-slider id="at-min" label="最小値" min="0" max="100" value="0"></ui-slider>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#at-min');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    if (slider.value !== 0)
      throw new Error(`期待される値は0でしたが、実際は ${String(slider.value)} でした`);

    const fill = slider.shadowRoot?.querySelector<HTMLElement>('.fill');
    if (!fill) throw new Error('Fill が見つかりません');
    // フィル幅が 0% であることを確認
    if (fill.style.width !== '0%') {
      throw new Error(`期待されるフィル幅は "0%" でしたが、実際は "${fill.style.width}" でした`);
    }
  },
};

/**
 * 通常状態 × 最大値（value = max）。
 *
 * Thumb が右端に位置し、フィルの幅は 100% です。
 */
export const AtMaxValue: Story = {
  render: () => html`
    <ui-slider id="at-max" label="最大値" min="0" max="100" value="100"></ui-slider>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#at-max');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    if (slider.value !== 100)
      throw new Error(`期待される値は100でしたが、実際は ${String(slider.value)} でした`);

    const fill = slider.shadowRoot?.querySelector<HTMLElement>('.fill');
    if (!fill) throw new Error('Fill が見つかりません');
    if (fill.style.width !== '100%') {
      throw new Error(`期待されるフィル幅は "100%" でしたが、実際は "${fill.style.width}" でした`);
    }
  },
};

/**
 * 通常状態 × 無効（Disabled）。
 *
 * `disabled` 状態では `opacity: --opacity-disabled` で薄く表示されます。
 * input に `disabled` 属性が付与され、`aria-disabled="true"` が設定されます。
 */
export const DisabledNormal: Story = {
  render: () => html`
    <ui-slider
      id="disabled-normal"
      label="変更不可"
      min="0"
      max="100"
      value="40"
      disabled
    ></ui-slider>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#disabled-normal');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    // テスト: disabled プロパティが true
    if (!slider.disabled)
      throw new Error('disabled が true であることを期待しましたが、 false でした');

    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) throw new Error('input が見つかりません');

    // テスト: input に disabled 属性が付与されている
    if (!input.disabled)
      throw new Error('input が無効化されていることを期待しましたが、有効でした');

    // テスト: aria-disabled="true"
    if (input.getAttribute('aria-disabled') !== 'true') {
      throw new Error(
        `期待される aria-disabled は "true" でしたが、実際は "${input.getAttribute('aria-disabled') ?? 'null'}" でした`,
      );
    }
  },
};

/**
 * 無効状態 × 最小値（Disabled + Min）。
 *
 * 無効かつ最小値の組み合わせ。フィルが 0% でも無効スタイルが適用されます。
 */
export const DisabledAtMin: Story = {
  render: () => html`
    <ui-slider
      id="disabled-at-min"
      label="変更不可（最小）"
      min="0"
      max="100"
      value="0"
      disabled
    ></ui-slider>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#disabled-at-min');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    if (!slider.disabled)
      throw new Error('disabled が true であることを期待しましたが、 false でした');
    if (slider.value !== 0)
      throw new Error(`期待される値は0でしたが、実際は ${String(slider.value)} でした`);
  },
};

/**
 * 無効状態 × 最大値（Disabled + Max）。
 *
 * 無効かつ最大値の組み合わせ。フィルが 100% でも無効スタイルが適用されます。
 */
export const DisabledAtMax: Story = {
  render: () => html`
    <ui-slider
      id="disabled-at-max"
      label="変更不可（最大）"
      min="0"
      max="100"
      value="100"
      disabled
    ></ui-slider>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#disabled-at-max');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    if (!slider.disabled)
      throw new Error('disabled が true であることを期待しましたが、 false でした');
    if (slider.value !== 100)
      throw new Error(`期待される値は100でしたが、実際は ${String(slider.value)} でした`);
  },
};

// ──────────────────────────────────────────────
// スロット使用例
// ──────────────────────────────────────────────

/**
 * prefix / suffix スロット使用例。
 *
 * 左端にアイコン、右端に現在値を表示します。
 * suffix 内のテキストには `font-variant-numeric: tabular-nums` が適用され、
 * 数字の幅が等幅になりレイアウト振動（Jitter）を防ぎます。
 */
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
      <ui-icon
        slot="prefix"
        name="volume-x"
        aria-hidden="true"
        style="font-size: 1.2em;"
      ></ui-icon>
      <span
        data-role="value"
        slot="suffix"
        style="font-size: 14px; min-width: 3ch; text-align: right; font-variant-numeric: tabular-nums;"
        >60</span
      >
    </ui-slider>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#with-slots');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    // テスト: prefix スロットが存在する
    const prefix = canvasElement.querySelector('[slot="prefix"]');
    if (!prefix) throw new Error('prefix スロット要素が見つかりません');

    // テスト: suffix スロットが存在する
    const suffix = canvasElement.querySelector('[slot="suffix"]');
    if (!suffix) throw new Error('suffix スロット要素が見つかりません');
  },
};

/**
 * 明るさ調整の実用例。
 *
 * prefix に暗いアイコン、suffix に明るいアイコンを配置します。
 */
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
        <ui-icon
          slot="suffix"
          name="sun"
          aria-hidden="true"
          style="font-size: 1.1em;"
        ></ui-icon>
      </ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#brightness');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    if (slider.value !== 70)
      throw new Error(`期待される値は70でしたが、実際は ${String(slider.value)} でした`);
  },
};

// ──────────────────────────────────────────────
// 全状態一覧（ビジュアル確認用）
// ──────────────────────────────────────────────

/**
 * 全状態の一覧。
 *
 * すべての状態を一覧で確認できます。
 * デザインレビューやビジュアルリグレッションテストに使用します。
 */
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
  play: async ({ canvasElement }) => {
    const sliders = canvasElement.querySelectorAll('ui-slider');
    if (sliders.length !== 7) {
      throw new Error(`期待されるスライダー数は7でしたが、実際は ${String(sliders.length)} でした`);
    }

    await Promise.all([...sliders].map((s) => s.updateComplete));

    // テスト: 各スライダーの値を確認
    const defaultSlider = canvasElement.querySelector<Slider>('#all-default');
    if (defaultSlider?.value !== 50) throw new Error('デフォルトスライダーの値は50であるべきです');

    const minSlider = canvasElement.querySelector<Slider>('#all-min');
    if (minSlider?.value !== 0) throw new Error('最小値スライダーの値は0であるべきです');

    const maxSlider = canvasElement.querySelector<Slider>('#all-max');
    if (maxSlider?.value !== 100) throw new Error('最大値スライダーの値は100であるべきです');

    const disabledSlider = canvasElement.querySelector<Slider>('#all-disabled');
    if (!disabledSlider?.disabled) throw new Error('無効化されたスライダーは無効であるべきです');

    const decimalSlider = canvasElement.querySelector<Slider>('#all-decimal');
    if (decimalSlider?.value !== 1.5)
      throw new Error(
        `小数スライダーの値は1.5であるべきでしたが、実際は ${String(decimalSlider?.value)} でした`,
      );
  },
};

// ──────────────────────────────────────────────
// インタラクション
// ──────────────────────────────────────────────

/**
 * input / change イベントの発火確認。
 *
 * - `input` イベント: 値が変化するたびに発火（連続発火）
 * - `change` イベント: 値の変更が確定した時点で発火
 */
export const EventFiring: Story = {
  render: () => html`
    <div
      data-story-root="event-firing"
      style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;"
    >
      <ui-slider
        id="event-slider"
        label="イベントテスト"
        min="0"
        max="100"
        value="50"
        @input="${(e: Event) => {
          const slider = e.target as Slider;
          const log = slider.parentElement?.querySelector<HTMLElement>('[data-role="event-log"]');
          if (log) log.textContent = `input: value=${String(slider.value)}`;
        }}"
        @change="${(e: Event) => {
          const slider = e.target as Slider;
          const log = slider.parentElement?.querySelector<HTMLElement>('[data-role="event-log"]');
          if (log) log.textContent = `change: value=${String(slider.value)}（確定）`;
        }}"
      ></ui-slider>

      <div
        data-role="event-log"
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0 0);
          border: 1px solid oklch(90% 0.01 250 / 0.2);
          border-radius: 6px;
          font-size: 13px;
          color: oklch(48% 0.01 250);
          min-height: 2.5rem;
        "
      >
        スライダーを操作するとここに表示されます
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#event-slider');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) throw new Error('input が見つかりません');

    // テスト: input イベントが発火する
    const inputEventPromise = new Promise<void>((resolve) => {
      slider.addEventListener(
        'input',
        () => {
          resolve();
        },
        { once: true },
      );
    });

    // input の値を変更して input イベントを発火
    input.value = '75';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    await inputEventPromise;

    // テスト: change イベントが発火する
    const changeEventPromise = new Promise<void>((resolve) => {
      slider.addEventListener(
        'change',
        () => {
          resolve();
        },
        { once: true },
      );
    });

    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    await changeEventPromise;
  },
};

/**
 * キーボード操作（矢印キー + Home/End + PageUp/PageDown）。
 *
 * - **Right / Up**: 値を `step` の単位で増加
 * - **Left / Down**: 値を `step` の単位で減少
 * - **Home**: 最小値へジャンプ
 * - **End**: 最大値へジャンプ
 * - **Page Up / Page Down**: `step * 10` で増減
 */
export const KeyboardNavigation: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px;"
      >
        <strong>操作方法</strong>: Tab でフォーカスを当て、矢印キー / Home / End / PageUp / PageDown
        で操作してください。
      </div>
      <ui-slider
        id="keyboard-slider"
        label="キーボード操作"
        min="0"
        max="100"
        step="5"
        value="50"
      ></ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#keyboard-slider');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) throw new Error('input が見つかりません');

    // フォーカスを当てる
    input.focus();

    // テスト: ArrowRight 相当で値が step 単位増加
    const initialValue = slider.value ?? 50;
    input.value = String(initialValue + 5);
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await slider.updateComplete;

    if (slider.value !== 55) {
      throw new Error(
        `ArrowRight シミュレーション後、期待される値は55でしたが、実際は ${String(slider.value)} でした`,
      );
    }

    // テスト: Home キー相当（min へ）
    input.value = String(slider.min);
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await slider.updateComplete;

    if ((slider.value as number) !== 0) {
      throw new Error(
        `Home シミュレーション後、期待される値は0でしたが、実際は ${String(slider.value)} でした`,
      );
    }

    // テスト: End キー相当（max へ）
    input.value = String(slider.max);
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await slider.updateComplete;

    if ((slider.value as number) !== 100) {
      throw new Error(
        `End シミュレーション後、期待される値は100でしたが、実際は ${String(slider.value)} でした`,
      );
    }

    // テスト: PageDown で step * 10（=50）減少
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
    await slider.updateComplete;
    if ((slider.value as number) !== 50) {
      throw new Error(
        `PageDown 後、期待される値は50でしたが、実際は ${String(slider.value)} でした`,
      );
    }

    // テスト: PageUp で step * 10（=50）増加して max へクランプ
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));
    await slider.updateComplete;
    if ((slider.value as number) !== 100) {
      throw new Error(
        `PageUp 後、期待される値は100でしたが、実際は ${String(slider.value)} でした`,
      );
    }

    // テスト: Focus Proxy のセレクタ戦略（input:focus-visible ~ .track .thumb）を維持
    const cssText = (Slider as unknown as { styles?: { cssText?: string } }).styles?.cssText ?? '';
    if (!cssText.includes('input:focus-visible ~ .track .thumb')) {
      throw new Error(
        'フォーカスプロキシのセレクタには "input:focus-visible ~ .track .thumb" が含まれているべきです',
      );
    }
  },
};

// ──────────────────────────────────────────────
// 境界条件（事故が多い）
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: min > max の自動入れ替え。
 *
 * `min="100" max="0"` のように min > max の場合、
 * Value Normalization により自動的に入れ替えられます。
 * これにより意図しない逆転スライダーを防ぎます。
 */
export const MinGreaterThanMax: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `min > max` の場合、自動的に入れ替えて正規化します。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>: <code>min="100" max="0"</code> → 自動的に
        <code>min=0, max=100</code> に正規化されます。
      </div>
      <ui-slider
        id="min-gt-max"
        label="min &gt; max テスト"
        min="100"
        max="0"
        value="50"
      ></ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#min-gt-max');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) throw new Error('input が見つかりません');

    // テスト: min と max が入れ替えられている
    const inputMin = parseFloat(input.min);
    const inputMax = parseFloat(input.max);

    if (inputMin >= inputMax) {
      throw new Error(
        `正規化された min < max が期待されましたが、min=${String(inputMin)}, max=${String(inputMax)} でした`,
      );
    }

    // テスト: value が正規化された範囲内にある
    const value = slider.value ?? 0;
    if (value < inputMin || value > inputMax) {
      throw new Error(
        `期待される値は [${String(inputMin)}, ${String(inputMax)}] の範囲内でしたが、実際は ${String(value)} でした`,
      );
    }
  },
};

/**
 * ⚠️ 境界条件: step <= 0 のフォールバック。
 *
 * `step="0"` や `step="-1"` は無効な値です。
 * Value Normalization により `step=1` にフォールバックします。
 */
export const InvalidStepFallback: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `step <= 0` は `step=1` にフォールバックします。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>: <code>step="0"</code> →
        <code>step=1</code> にフォールバックします。
      </div>
      <ui-slider
        id="invalid-step"
        label="無効ステップテスト"
        min="0"
        max="100"
        .step="${0}"
        value="50"
      ></ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#invalid-step');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) throw new Error('input が見つかりません');

    // テスト: step が 1 にフォールバックされている
    const inputStep = parseFloat(input.step);
    if (inputStep !== 1) {
      throw new Error(
        `期待される step は1（フォールバック）でしたが、実際は step=${String(inputStep)} でした`,
      );
    }
  },
};

/**
 * ⚠️ 境界条件: value が範囲外（クランプ）。
 *
 * `value="150"` のように `max` を超える値を指定した場合、
 * Value Normalization により `max` にクランプされます。
 */
export const ValueOutOfRange: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `value` が `max` を超える場合、`max` にクランプされます。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>: <code>value="150"</code>（max=100 超過）→
        <code>value=100</code> にクランプされます。
      </div>
      <ui-slider
        id="value-out-of-range"
        label="範囲外値テスト"
        min="0"
        max="100"
        .value="${150}"
      ></ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#value-out-of-range');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    // テスト: value が max にクランプされている
    if (slider.value !== 100) {
      throw new Error(
        `期待される値は100（クランプ）でしたが、実際は ${String(slider.value)} でした`,
      );
    }

    const fill = slider.shadowRoot?.querySelector<HTMLElement>('.fill');
    if (!fill) throw new Error('Fill が見つかりません');
    if (fill.style.width !== '100%') {
      throw new Error(`期待されるフィル幅は "100%" でしたが、実際は "${fill.style.width}" でした`);
    }
  },
};

/**
 * ⚠️ 境界条件: value が min 未満（クランプ）。
 *
 * `value="-10"` のように `min` を下回る値を指定した場合、
 * Value Normalization により `min` にクランプされます。
 */
export const ValueBelowMin: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `value` が `min` を下回る場合、`min` にクランプされます。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>: <code>value="-10"</code>（min=0 未満）→
        <code>value=0</code> にクランプされます。
      </div>
      <ui-slider
        id="value-below-min"
        label="min未満値テスト"
        min="0"
        max="100"
        .value="${-10}"
      ></ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#value-below-min');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    if (slider.value !== 0) {
      throw new Error(`期待される値は0（クランプ）でしたが、実際は ${String(slider.value)} でした`);
    }
  },
};

/**
 * ⚠️ 境界条件: 小数ステップの浮動小数点誤差対策。
 *
 * `step="0.1"` の場合、`0.1 + 0.2 = 0.30000000000000004` のような
 * 浮動小数点誤差が発生しやすいです。
 * Value Normalization により精度に合わせて丸めます。
 */
export const DecimalStepPrecision: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `step="0.1"` での浮動小数点誤差を精度丸めで回避します。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>:
        <code>step="0.1"</code> での浮動小数点誤差対策。値は小数第1位に丸められます。
      </div>
      <ui-slider
        id="decimal-precision"
        label="小数精度テスト"
        min="0"
        max="2"
        step="0.1"
        value="1.5"
      >
        <span
          slot="suffix"
          id="decimal-display"
          style="font-size: 13px; min-width: 3ch; font-variant-numeric: tabular-nums;"
          >1.5</span
        >
      </ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#decimal-precision');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    // テスト: 初期値が正確に 1.5
    if (slider.value !== 1.5) {
      throw new Error(`期待される値は1.5でしたが、実際は ${String(slider.value)} でした`);
    }

    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) throw new Error('input が見つかりません');

    // テスト: 0.3 の値が浮動小数点誤差なく設定される
    input.value = '0.3';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await slider.updateComplete;

    // 0.3 は浮動小数点で正確に表現できないが、精度丸めにより 0.3 になるはず
    const valueStr = String(slider.value);
    if (valueStr !== '0.3') {
      throw new Error(`期待される値は "0.3"（精度丸め）でしたが、実際は "${valueStr}" でした`);
    }
  },
};

/**
 * ⚠️ 境界条件: value 未指定時は min を採用。
 *
 * `value` を指定しない場合、正規化後の `min` が初期値として採用されます。
 */
export const ValueUnspecified: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `value` 未指定時は `min` が初期値として採用されます。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>: <code>value</code> 未指定 →
        <code>min=20</code> が初期値として採用されます。
      </div>
      <ui-slider id="value-unspecified" label="value未指定テスト" min="20" max="80"></ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#value-unspecified');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    // テスト: value が min (20) になっている
    if (slider.value !== 20) {
      throw new Error(`期待される値は20（min）でしたが、実際は ${String(slider.value)} でした`);
    }

    const fill = slider.shadowRoot?.querySelector<HTMLElement>('.fill');
    if (!fill) throw new Error('Fill が見つかりません');
    if (fill.style.width !== '0%') {
      throw new Error(
        `期待されるフィル幅は "0%"（min の位置）でしたが、実際は "${fill.style.width}" でした`,
      );
    }
  },
};

/**
 * ⚠️ 境界条件: step に合わないvalue のスナップ。
 *
 * `step="10"` で `value="35"` を指定した場合、
 * 最も近い有効ステップ（40）にスナップされます。
 */
export const ValueSnapToStep: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '⚠️ **境界条件**: `step="10"` で `value="35"` → 最も近い有効ステップ `40` にスナップされます。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>: <code>step="10", value="35"</code> → 最も近い有効ステップ
        <code>40</code> にスナップされます。
      </div>
      <ui-slider
        id="value-snap"
        label="ステップスナップテスト"
        min="0"
        max="100"
        step="10"
        .value="${35}"
      ></ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#value-snap');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    // テスト: value が 40 にスナップされている（35 は 30 と 40 の中間より 40 に近い）
    if (slider.value !== 40) {
      throw new Error(
        `期待される値は40（スナップ）でしたが、実際は ${String(slider.value)} でした`,
      );
    }
  },
};

/**
 * ⚠️ 境界条件: Disabled 時のクリック無効化。
 *
 * `disabled` 状態ではクリックしても状態が変化せず、
 * `input` / `change` イベントも発火しません。
 */
export const DisabledClickBlocked: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '⚠️ **境界条件**: `disabled` 状態ではクリックしても状態が変化せず、イベントも発火しません。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>: disabled 状態では操作しても状態が変化しません。
      </div>
      <ui-slider
        id="disabled-blocked"
        label="無効（操作ブロック）"
        min="0"
        max="100"
        value="50"
        disabled
      ></ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#disabled-blocked');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    let inputFired = false;
    let changeFired = false;
    slider.addEventListener('input', () => {
      inputFired = true;
    });
    slider.addEventListener('change', () => {
      changeFired = true;
    });

    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) throw new Error('input が見つかりません');

    // disabled input の実操作相当: click / keydown を行っても値やイベントは変化しない
    input.click();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 100));

    // テスト: disabled 時はイベントが発火しない
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (inputFired)
      throw new Error('無効化されたスライダーは input イベントを発火すべきではありません');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changeFired)
      throw new Error('無効化されたスライダーは change イベントを発火すべきではありません');

    // テスト: value が変化していない
    if (slider.value !== 50) {
      throw new Error(
        `無効化されたスライダーの値は50のままであるべきでしたが、実際は ${String(slider.value)} でした`,
      );
    }
  },
};

/**
 * ⚠️ 境界条件: min === max（範囲ゼロ）。
 *
 * `min === max` の場合、スライダーは操作不能になります。
 * フィルは 0% または 100% のどちらかになります（実装依存）。
 */
export const MinEqualsMax: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `min === max` の場合、スライダーは操作不能になります。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>:
        <code>min="50" max="50"</code>（範囲ゼロ）。スライダーは操作不能です。
      </div>
      <ui-slider
        id="min-equals-max"
        label="範囲ゼロテスト"
        min="50"
        max="50"
        value="50"
      ></ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#min-equals-max');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    // テスト: value が min (= max = 50) になっている
    if (slider.value !== 50) {
      throw new Error(`期待される値は50でしたが、実際は ${String(slider.value)} でした`);
    }

    // テスト: input が存在する（クラッシュしない）
    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) throw new Error('input が見つかりません');
  },
};

/**
 * ⚠️ 境界条件: 負の範囲（min < 0）。
 *
 * `min="-50" max="50"` のように負の範囲を持つスライダー。
 * `value="0"` は中間値（50%）になります。
 */
export const NegativeRange: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '⚠️ **境界条件**: 負の範囲 `min="-50" max="50"` での動作確認。`value="0"` は中間値（50%）になります。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>: <code>min="-50" max="50" value="0"</code> → フィルが 50%
        になります。
      </div>
      <ui-slider id="negative-range" label="負の範囲テスト" min="-50" max="50" value="0">
        <span slot="prefix" style="font-size: 13px; font-variant-numeric: tabular-nums;">-50</span>
        <span slot="suffix" style="font-size: 13px; font-variant-numeric: tabular-nums;">+50</span>
      </ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#negative-range');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    if (slider.value !== 0) {
      throw new Error(`期待される値は0でしたが、実際は ${String(slider.value)} でした`);
    }

    const fill = slider.shadowRoot?.querySelector<HTMLElement>('.fill');
    if (!fill) throw new Error('Fill が見つかりません');
    // value=0 は min=-50, max=50 の中間なので 50%
    if (fill.style.width !== '50%') {
      throw new Error(`期待されるフィル幅は "50%" でしたが、実際は "${fill.style.width}" でした`);
    }
  },
};

/**
 * テーマ確認: ダークトークン環境での視認性確認。
 *
 * Track / Thumb / Fill のコントラストが維持されることを確認します。
 */
export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story:
          'Dark Mode のトークンを与えた状態でトラック境界と Thumb の分離が保たれるかを確認します。',
      },
    },
  },
  render: () => html`
    <div
      style="
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 480px;
        padding: 16px;
        background: oklch(24% 0.01 250);
        color: oklch(95% 0.01 250);
        border-radius: 8px;
      "
    >
      <div style="font-size: 13px;">Dark Mode 表示確認</div>
      <ui-slider
        id="dark-mode-slider"
        label="ダークモード確認"
        value="45"
        style="
          --border-default: oklch(45% 0.02 250);
          --white: oklch(16% 0.01 250);
          --primary: oklch(75% 0.12 250);
          --elevation-md: 0 0 0 1px oklch(82% 0.03 250 / 0.35), 0 6px 20px oklch(0% 0 0 / 0.45);
        "
      >
        <ui-icon slot="prefix" name="moon-star" aria-hidden="true"></ui-icon>
        <ui-icon slot="suffix" name="sun" aria-hidden="true"></ui-icon>
      </ui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#dark-mode-slider');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    const thumb = slider.shadowRoot?.querySelector<HTMLElement>('.thumb');
    const track = slider.shadowRoot?.querySelector<HTMLElement>('.track');
    if (!input || !thumb || !track) throw new Error('必要なシャドウ要素が見つかりません');

    if (input.getAttribute('aria-label') !== 'ダークモード確認') {
      throw new Error('aria-label はダークモードでも保持されるべきです');
    }

    if (track.style.background.includes('transparent')) {
      throw new Error('トラックの背景はダークモードで透明であるべきではありません');
    }
  },
};

/**
 * 高コントラスト確認: forced-colors フォールバック定義の存在確認。
 */
export const HighContrastFallback: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Forced Colors 向けの Thumb 境界線フォールバック（CanvasText）と太線トークンの定義を確認します。',
      },
    },
  },
  render: () => html`
    <ui-slider id="high-contrast-slider" label="高コントラスト確認" value="60"></ui-slider>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#high-contrast-slider');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    const cssText = (Slider as unknown as { styles?: { cssText?: string } }).styles?.cssText ?? '';
    if (!cssText.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors メディアクエリが期待されましたが含まれていません');
    }
    if (!cssText.includes('CanvasText')) {
      throw new Error(
        'forced-colors モードで CanvasText フォールバックが期待されましたが含まれていません',
      );
    }
    if (!cssText.includes('--border-width-thick')) {
      throw new Error(
        'forced-colors 用に --border-width-thick トークンの使用が期待されましたが含まれていません',
      );
    }
  },
};

/**
 * アクセシビリティ境界: label 未指定時のフォールバック確認。
 */
export const MissingLabelFallback: Story = {
  parameters: {
    docs: {
      description: {
        story: '`label` 未指定時に内部 input のアクセシブル名が空にならないことを確認します。',
      },
    },
  },
  render: () => html`
    <ui-slider id="missing-label-slider" min="0" max="100" value="20"></ui-slider>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>('#missing-label-slider');
    if (!slider) throw new Error('ui-slider が見つかりません');
    await slider.updateComplete;

    const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) throw new Error('input が見つかりません');
    if (input.getAttribute('aria-label') !== 'Slider') {
      throw new Error(
        `フォールバックの aria-label は "Slider" が期待されましたが、実際は "${input.getAttribute('aria-label') ?? 'null'}" でした`,
      );
    }
  },
};
