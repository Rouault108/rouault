import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './slider';
import type { Slider } from './slider';

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
  <span slot="prefix">🌑</span>
  <span slot="suffix">🌕</span>
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        // テスト: value が 50
        if (slider.value !== 50) throw new Error(`Expected value=50, got ${String(slider.value)}`);

        // テスト: input[type="range"] が存在する
        const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
        if (!input) throw new Error('input[type="range"] not found in shadow root');

        // テスト: aria-label が設定されている
        if (input.getAttribute('aria-label') !== '音量') {
            throw new Error(`Expected aria-label="音量", got "${input.getAttribute('aria-label') ?? 'null'}"`);
        }

        // テスト: aria-valuemin / aria-valuemax / aria-valuenow
        if (input.getAttribute('aria-valuemin') !== '0') {
            throw new Error(`Expected aria-valuemin="0", got "${input.getAttribute('aria-valuemin') ?? 'null'}"`);
        }
        if (input.getAttribute('aria-valuemax') !== '100') {
            throw new Error(`Expected aria-valuemax="100", got "${input.getAttribute('aria-valuemax') ?? 'null'}"`);
        }
        if (input.getAttribute('aria-valuenow') !== '50') {
            throw new Error(`Expected aria-valuenow="50", got "${input.getAttribute('aria-valuenow') ?? 'null'}"`);
        }

        // テスト: Thumb が存在する
        const thumb = slider.shadowRoot?.querySelector('.thumb');
        if (!thumb) throw new Error('Thumb element not found');

        // テスト: Fill が存在する
        const fill = slider.shadowRoot?.querySelector('.fill');
        if (!fill) throw new Error('Fill element not found');

        console.log('✅ All tests passed for Default story');
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
    <ui-slider
      id="at-min"
      label="最小値"
      min="0"
      max="100"
      value="0"
    ></ui-slider>
  `,
    play: async ({ canvasElement }) => {
        const slider = canvasElement.querySelector<Slider>('#at-min');
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        if (slider.value !== 0) throw new Error(`Expected value=0, got ${String(slider.value)}`);

        const fill = slider.shadowRoot?.querySelector<HTMLElement>('.fill');
        if (!fill) throw new Error('Fill not found');
        // フィル幅が 0% であることを確認
        if (fill.style.width !== '0%') {
            throw new Error(`Expected fill width="0%", got "${fill.style.width}"`);
        }

        console.log('✅ All tests passed for AtMinValue story');
    },
};

/**
 * 通常状態 × 最大値（value = max）。
 *
 * Thumb が右端に位置し、フィルの幅は 100% です。
 */
export const AtMaxValue: Story = {
    render: () => html`
    <ui-slider
      id="at-max"
      label="最大値"
      min="0"
      max="100"
      value="100"
    ></ui-slider>
  `,
    play: async ({ canvasElement }) => {
        const slider = canvasElement.querySelector<Slider>('#at-max');
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        if (slider.value !== 100) throw new Error(`Expected value=100, got ${String(slider.value)}`);

        const fill = slider.shadowRoot?.querySelector<HTMLElement>('.fill');
        if (!fill) throw new Error('Fill not found');
        if (fill.style.width !== '100%') {
            throw new Error(`Expected fill width="100%", got "${fill.style.width}"`);
        }

        console.log('✅ All tests passed for AtMaxValue story');
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        // テスト: disabled プロパティが true
        if (!slider.disabled) throw new Error('Expected disabled to be true');

        const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
        if (!input) throw new Error('input not found');

        // テスト: input に disabled 属性が付与されている
        if (!input.disabled) throw new Error('Expected input to be disabled');

        // テスト: aria-disabled="true"
        if (input.getAttribute('aria-disabled') !== 'true') {
            throw new Error(`Expected aria-disabled="true", got "${input.getAttribute('aria-disabled') ?? 'null'}"`);
        }

        console.log('✅ All tests passed for DisabledNormal story');
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        if (!slider.disabled) throw new Error('Expected disabled to be true');
        if (slider.value !== 0) throw new Error(`Expected value=0, got ${String(slider.value)}`);

        console.log('✅ All tests passed for DisabledAtMin story');
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        if (!slider.disabled) throw new Error('Expected disabled to be true');
        if (slider.value !== 100) throw new Error(`Expected value=100, got ${String(slider.value)}`);

        console.log('✅ All tests passed for DisabledAtMax story');
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
            const suffix = document.getElementById('volume-value');
            if (suffix) suffix.textContent = String(slider.value);
        }}"
    >
      <span slot="prefix" style="font-size: 1.2em;">🔇</span>
      <span id="volume-value" slot="suffix" style="font-size: 14px; min-width: 3ch; text-align: right; font-variant-numeric: tabular-nums;">60</span>
    </ui-slider>
  `,
    play: async ({ canvasElement }) => {
        const slider = canvasElement.querySelector<Slider>('#with-slots');
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        // テスト: prefix スロットが存在する
        const prefix = canvasElement.querySelector('[slot="prefix"]');
        if (!prefix) throw new Error('prefix slot element not found');

        // テスト: suffix スロットが存在する
        const suffix = canvasElement.querySelector('[slot="suffix"]');
        if (!suffix) throw new Error('suffix slot element not found');

        console.log('✅ All tests passed for WithSlots story');
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
      <ui-slider
        id="brightness"
        label="明るさ"
        min="0"
        max="100"
        value="70"
      >
        <span slot="prefix" style="font-size: 1.1em; opacity: 0.5;">☀️</span>
        <span slot="suffix" style="font-size: 1.1em;">☀️</span>
      </ui-slider>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const slider = canvasElement.querySelector<Slider>('#brightness');
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        if (slider.value !== 70) throw new Error(`Expected value=70, got ${String(slider.value)}`);

        console.log('✅ All tests passed for BrightnessControl story');
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
        <ui-slider id="all-step10" label="ステップ10" min="0" max="100" step="10" value="30"></ui-slider>
      </div>

      <div class="state-group">
        <div class="state-label">Decimal Step=0.1 (value=1.5)</div>
        <ui-slider id="all-decimal" label="小数ステップ" min="0" max="2" step="0.1" value="1.5"></ui-slider>
      </div>

      <div class="state-group">
        <div class="state-label">With Slots</div>
        <ui-slider id="all-slots" label="スロット付き" value="65">
          <span slot="prefix">🔇</span>
          <span slot="suffix">🔊</span>
        </ui-slider>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const sliders = canvasElement.querySelectorAll('ui-slider');
        if (sliders.length !== 7) {
            throw new Error(`Expected 7 sliders, got ${String(sliders.length)}`);
        }

        await Promise.all([...sliders].map((s) => s.updateComplete));

        // テスト: 各スライダーの値を確認
        const defaultSlider = canvasElement.querySelector<Slider>('#all-default');
        if (defaultSlider?.value !== 50) throw new Error('Default slider value should be 50');

        const minSlider = canvasElement.querySelector<Slider>('#all-min');
        if (minSlider?.value !== 0) throw new Error('Min slider value should be 0');

        const maxSlider = canvasElement.querySelector<Slider>('#all-max');
        if (maxSlider?.value !== 100) throw new Error('Max slider value should be 100');

        const disabledSlider = canvasElement.querySelector<Slider>('#all-disabled');
        if (!disabledSlider?.disabled) throw new Error('Disabled slider should be disabled');

        const decimalSlider = canvasElement.querySelector<Slider>('#all-decimal');
        if (decimalSlider?.value !== 1.5) throw new Error(`Decimal slider value should be 1.5, got ${String(decimalSlider?.value)}`);

        console.log('✅ All tests passed for AllStates story');
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
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <ui-slider
        id="event-slider"
        label="イベントテスト"
        min="0"
        max="100"
        value="50"
        @input="${(e: Event) => {
            const slider = e.target as Slider;
            const log = document.getElementById('event-log');
            if (log) log.textContent = `input: value=${String(slider.value)}`;
        }}"
        @change="${(e: Event) => {
            const slider = e.target as Slider;
            const log = document.getElementById('event-log');
            if (log) log.textContent = `change: value=${String(slider.value)}（確定）`;
        }}"
      ></ui-slider>

      <div
        id="event-log"
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
        if (!input) throw new Error('input not found');

        // テスト: input イベントが発火する
        const inputEventPromise = new Promise<void>((resolve) => {
            slider.addEventListener('input', () => { resolve(); }, { once: true });
        });

        // input の値を変更して input イベントを発火
        input.value = '75';
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

        await inputEventPromise;

        // テスト: change イベントが発火する
        const changeEventPromise = new Promise<void>((resolve) => {
            slider.addEventListener('change', () => { resolve(); }, { once: true });
        });

        input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

        await changeEventPromise;

        console.log('✅ All tests passed for EventFiring story');
    },
};

/**
 * キーボード操作（矢印キー）。
 *
 * - **Right / Up**: 値を `step` の単位で増加
 * - **Left / Down**: 値を `step` の単位で減少
 * - **Home**: 最小値へジャンプ
 * - **End**: 最大値へジャンプ
 */
export const KeyboardNavigation: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px;">
        <strong>操作方法</strong>: Tab でフォーカスを当て、矢印キー / Home / End で操作してください。
      </div>
      <ui-slider
        id="keyboard-slider"
        label="キーボード操作"
        min="0"
        max="100"
        step="10"
        value="50"
      ></ui-slider>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const slider = canvasElement.querySelector<Slider>('#keyboard-slider');
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
        if (!input) throw new Error('input not found');

        // フォーカスを当てる
        input.focus();

        // テスト: ArrowRight で値が増加する（ネイティブ input の動作を確認）
        // ネイティブ input はキーボードイベントを自身で処理するため、
        // プログラム的に値を変更して input イベントを発火させてテスト
        const initialValue = slider.value ?? 50;

        // 値を直接変更して input イベントを発火（ネイティブキーボード動作のシミュレーション）
        input.value = String(initialValue + 10);
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        await slider.updateComplete;

        if (slider.value !== 60) {
            throw new Error(`Expected value=60 after ArrowRight simulation, got ${String(slider.value)}`);
        }

        // テスト: Home キー相当（min へ）
        input.value = String(slider.min);
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        await slider.updateComplete;

        if ((slider.value as number) !== 0) {
            throw new Error(`Expected value=0 after Home simulation, got ${String(slider.value)}`);
        }

        // テスト: End キー相当（max へ）
        input.value = String(slider.max);
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        await slider.updateComplete;

        if ((slider.value as number) !== 100) {
            throw new Error(`Expected value=100 after End simulation, got ${String(slider.value)}`);
        }

        console.log('✅ All tests passed for KeyboardNavigation story');
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
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>min="100" max="0"</code> → 自動的に <code>min=0, max=100</code> に正規化されます。
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
        if (!input) throw new Error('input not found');

        // テスト: min と max が入れ替えられている
        const inputMin = parseFloat(input.min);
        const inputMax = parseFloat(input.max);

        if (inputMin >= inputMax) {
            throw new Error(`Expected normalized min < max, got min=${String(inputMin)}, max=${String(inputMax)}`);
        }

        // テスト: value が正規化された範囲内にある
        const value = slider.value ?? 0;
        if (value < inputMin || value > inputMax) {
            throw new Error(`Expected value in [${String(inputMin)}, ${String(inputMax)}], got ${String(value)}`);
        }

        console.log('✅ All tests passed for MinGreaterThanMax story');
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
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>step="0"</code> → <code>step=1</code> にフォールバックします。
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
        if (!input) throw new Error('input not found');

        // テスト: step が 1 にフォールバックされている
        const inputStep = parseFloat(input.step);
        if (inputStep !== 1) {
            throw new Error(`Expected step=1 (fallback), got step=${String(inputStep)}`);
        }

        console.log('✅ All tests passed for InvalidStepFallback story');
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
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>value="150"</code>（max=100 超過）→ <code>value=100</code> にクランプされます。
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        // テスト: value が max にクランプされている
        if (slider.value !== 100) {
            throw new Error(`Expected value=100 (clamped), got ${String(slider.value)}`);
        }

        const fill = slider.shadowRoot?.querySelector<HTMLElement>('.fill');
        if (!fill) throw new Error('Fill not found');
        if (fill.style.width !== '100%') {
            throw new Error(`Expected fill width="100%", got "${fill.style.width}"`);
        }

        console.log('✅ All tests passed for ValueOutOfRange story');
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
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>value="-10"</code>（min=0 未満）→ <code>value=0</code> にクランプされます。
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        if (slider.value !== 0) {
            throw new Error(`Expected value=0 (clamped), got ${String(slider.value)}`);
        }

        console.log('✅ All tests passed for ValueBelowMin story');
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
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>step="0.1"</code> での浮動小数点誤差対策。値は小数第1位に丸められます。
      </div>
      <ui-slider
        id="decimal-precision"
        label="小数精度テスト"
        min="0"
        max="2"
        step="0.1"
        value="1.5"
      >
        <span slot="suffix" id="decimal-display" style="font-size: 13px; min-width: 3ch; font-variant-numeric: tabular-nums;">1.5</span>
      </ui-slider>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const slider = canvasElement.querySelector<Slider>('#decimal-precision');
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        // テスト: 初期値が正確に 1.5
        if (slider.value !== 1.5) {
            throw new Error(`Expected value=1.5, got ${String(slider.value)}`);
        }

        const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
        if (!input) throw new Error('input not found');

        // テスト: 0.3 の値が浮動小数点誤差なく設定される
        input.value = '0.3';
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        await slider.updateComplete;

        // 0.3 は浮動小数点で正確に表現できないが、精度丸めにより 0.3 になるはず
        const valueStr = String(slider.value);
        if (valueStr !== '0.3') {
            throw new Error(`Expected value="0.3" (precision rounded), got "${valueStr}"`);
        }

        console.log('✅ All tests passed for DecimalStepPrecision story');
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
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>value</code> 未指定 → <code>min=20</code> が初期値として採用されます。
      </div>
      <ui-slider
        id="value-unspecified"
        label="value未指定テスト"
        min="20"
        max="80"
      ></ui-slider>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const slider = canvasElement.querySelector<Slider>('#value-unspecified');
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        // テスト: value が min (20) になっている
        if (slider.value !== 20) {
            throw new Error(`Expected value=20 (min), got ${String(slider.value)}`);
        }

        const fill = slider.shadowRoot?.querySelector<HTMLElement>('.fill');
        if (!fill) throw new Error('Fill not found');
        if (fill.style.width !== '0%') {
            throw new Error(`Expected fill width="0%" (at min), got "${fill.style.width}"`);
        }

        console.log('✅ All tests passed for ValueUnspecified story');
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
                story: '⚠️ **境界条件**: `step="10"` で `value="35"` → 最も近い有効ステップ `40` にスナップされます。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>step="10", value="35"</code> → 最も近い有効ステップ <code>40</code> にスナップされます。
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        // テスト: value が 40 にスナップされている（35 は 30 と 40 の中間より 40 に近い）
        if (slider.value !== 40) {
            throw new Error(`Expected value=40 (snapped), got ${String(slider.value)}`);
        }

        console.log('✅ All tests passed for ValueSnapToStep story');
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
                story: '⚠️ **境界条件**: `disabled` 状態ではクリックしても状態が変化せず、イベントも発火しません。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        let inputFired = false;
        let changeFired = false;
        slider.addEventListener('input', () => { inputFired = true; });
        slider.addEventListener('change', () => { changeFired = true; });

        const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
        if (!input) throw new Error('input not found');

        // disabled 時は input 要素自体が disabled なのでイベントは発火しない
        // プログラム的にイベントを発火してもコンポーネントが disabled チェックで弾くことを確認
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

        await new Promise((resolve) => setTimeout(resolve, 100));

        // テスト: disabled 時はイベントが発火しない
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (inputFired) throw new Error('Disabled slider should not fire input event');
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (changeFired) throw new Error('Disabled slider should not fire change event');

        // テスト: value が変化していない
        if (slider.value !== 50) {
            throw new Error(`Disabled slider value should remain 50, got ${String(slider.value)}`);
        }

        console.log('✅ All tests passed for DisabledClickBlocked story');
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
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>min="50" max="50"</code>（範囲ゼロ）。スライダーは操作不能です。
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
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        // テスト: value が min (= max = 50) になっている
        if (slider.value !== 50) {
            throw new Error(`Expected value=50, got ${String(slider.value)}`);
        }

        // テスト: input が存在する（クラッシュしない）
        const input = slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]');
        if (!input) throw new Error('input not found');

        console.log('✅ All tests passed for MinEqualsMax story');
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
                story: '⚠️ **境界条件**: 負の範囲 `min="-50" max="50"` での動作確認。`value="0"` は中間値（50%）になります。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>min="-50" max="50" value="0"</code> → フィルが 50% になります。
      </div>
      <ui-slider
        id="negative-range"
        label="負の範囲テスト"
        min="-50"
        max="50"
        value="0"
      >
        <span slot="prefix" style="font-size: 13px; font-variant-numeric: tabular-nums;">-50</span>
        <span slot="suffix" style="font-size: 13px; font-variant-numeric: tabular-nums;">+50</span>
      </ui-slider>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const slider = canvasElement.querySelector<Slider>('#negative-range');
        if (!slider) throw new Error('ui-slider not found');
        await slider.updateComplete;

        if (slider.value !== 0) {
            throw new Error(`Expected value=0, got ${String(slider.value)}`);
        }

        const fill = slider.shadowRoot?.querySelector<HTMLElement>('.fill');
        if (!fill) throw new Error('Fill not found');
        // value=0 は min=-50, max=50 の中間なので 50%
        if (fill.style.width !== '50%') {
            throw new Error(`Expected fill width="50%", got "${fill.style.width}"`);
        }

        console.log('✅ All tests passed for NegativeRange story');
    },
};
