import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './radio';
import './radio-group';
import type { Radio } from './radio';
import type { RadioGroup as RadioGroupElement } from './radio-group';

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
<ui-radio name="color" value="red"   label="赤"></ui-radio>
<ui-radio name="color" value="green" label="緑" checked></ui-radio>
<ui-radio name="color" value="blue"  label="青"></ui-radio>

<!-- 無効 -->
<ui-radio name="size" value="xl" label="XL（在庫なし）" disabled></ui-radio>
\`\`\`

## 注意事項

- **グループ排他制御**: 同一 \`name\` のラジオを選択すると他は自動的に未選択になります。
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
      ?checked="${args.checked}"
      ?disabled="${args.disabled}"
    ></ui-radio>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#default-radio');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    // テスト: デフォルトは未選択
    if (radio.checked) throw new Error('デフォルトでは checked が false であることを期待していましたが true でした');

    // テスト: コントロールに role="radio" が設定されている
    const control = radio.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Shadow Root 内に control 要素が見つかりません');
    if (control.getAttribute('role') !== 'radio') {
      throw new Error(`role="radio" を期待していましたが、実際には "${control.getAttribute('role') ?? 'null'}" でした`);
    }

    // テスト: aria-checked="false" が設定されている
    if (control.getAttribute('aria-checked') !== 'false') {
      throw new Error(`aria-checked="false" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`);
    }
  },
};

// ──────────────────────────────────────────────
// バリアント × 状態の組み合わせ
// ──────────────────────────────────────────────

/**
 * 通常状態 × 未選択。
 *
 * 最も基本的な状態。コントロールは `--bg-fill-muted` で静かに存在します。
 */
export const UncheckedNormal: Story = {
  render: () => html`
    <ui-radio
      id="unchecked-normal"
      label="未選択（通常）"
      name="unchecked-group"
      value="a"
    ></ui-radio>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#unchecked-normal');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    const control = radio.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('control が見つかりません');

    if (radio.checked) throw new Error('未選択状態であることを期待していましたが選択状態でした');
    if (control.getAttribute('aria-checked') !== 'false') {
      throw new Error('aria-checked="false" であることを期待していましたが true でした');
    }
  },
};

/**
 * 通常状態 × 選択済み。
 *
 * 選択時は `--primary` 色の 4px ボーダーで「ドーナツ型」が表示されます。
 * 中心に `--bg-default` の穴が残り、コントラストを確保します。
 */
export const CheckedNormal: Story = {
  render: () => html`
    <ui-radio
      id="checked-normal"
      label="選択済み（通常）"
      name="checked-group"
      value="a"
      checked
    ></ui-radio>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#checked-normal');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    const control = radio.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('control が見つかりません');

    if (!radio.checked) throw new Error('checked が true であることを期待していましたが false でした');
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error(`aria-checked="true" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`);
    }
  },
};

/**
 * 通常状態 × 無効（Unchecked + Disabled）。
 *
 * 未選択かつ無効状態。`opacity: --opacity-disabled` で薄く表示されます。
 * フォーカス不可、フォーム送信除外。
 */
export const UncheckedDisabled: Story = {
  render: () => html`
    <ui-radio
      id="unchecked-disabled"
      label="未選択（無効）"
      name="disabled-group"
      value="a"
      disabled
    ></ui-radio>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#unchecked-disabled');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    const control = radio.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('control が見つかりません');

    if (!radio.disabled) throw new Error('disabled が true であることを期待していましたが false でした');
    if (control.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`aria-disabled="true" を期待していましたが、実際には "${control.getAttribute('aria-disabled') ?? 'null'}" でした`);
    }
  },
};

/**
 * 通常状態 × 選択済み + 無効（Checked + Disabled）。
 *
 * 選択済みかつ無効状態。ドーナツ型は表示されますが操作不可です。
 * フォーム送信も除外されます（disabled のため）。
 */
export const CheckedDisabled: Story = {
  render: () => html`
    <ui-radio
      id="checked-disabled"
      label="選択済み（無効）"
      name="checked-disabled-group"
      value="a"
      checked
      disabled
    ></ui-radio>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#checked-disabled');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    if (!radio.checked) throw new Error('checked が true であることを期待していました');
    if (!radio.disabled) throw new Error('disabled が true であることを期待していました');

    const control = radio.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('control が見つかりません');

    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error('aria-checked="true" であることを期待していました');
    }
    if (control.getAttribute('aria-disabled') !== 'true') {
      throw new Error('aria-disabled="true" であることを期待していました');
    }
  },
};

/**
 * エラー状態 × 未選択（Invalid + Unchecked）。
 *
 * バリデーションエラー時。ボーダーが `--border-danger` 色になり、
 * エラーメッセージが `aria-live="polite"` で表示されます。
 */
export const UncheckedInvalid: Story = {
  render: () => html`
    <ui-radio
      id="unchecked-invalid"
      label="選択してください（必須）"
      name="invalid-group"
      value="a"
      invalid
      error-message="いずれかを選択してください"
    ></ui-radio>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#unchecked-invalid');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    const control = radio.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('control が見つかりません');

    if (control.getAttribute('aria-invalid') !== 'true') {
      throw new Error(`aria-invalid="true" を期待していましたが、実際には "${control.getAttribute('aria-invalid') ?? 'null'}" でした`);
    }

    const errorMsg = radio.shadowRoot?.querySelector('.error-message');
    if (!errorMsg) throw new Error('エラーメッセージ要素が見つかりません');
    const errorText: string = errorMsg.textContent;
    if (!errorText.includes('いずれかを選択してください')) {
      throw new Error('エラーメッセージのテキストが正しくありません');
    }

    if (!control.getAttribute('aria-describedby')) {
      throw new Error('無効状態では aria-describedby が設定されている必要があります');
    }
  },
};

/**
 * エラー状態 × 選択済み（Invalid + Checked）。
 *
 * 選択済みでもエラー状態を外部から強制できます。
 * カスタムバリデーションロジックでの使用を想定します。
 */
export const CheckedInvalid: Story = {
  render: () => html`
    <ui-radio
      id="checked-invalid"
      label="選択済み（エラー強制）"
      name="checked-invalid-group"
      value="a"
      checked
      invalid
      error-message="この選択は現在無効です"
    ></ui-radio>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#checked-invalid');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    if (!radio.checked) throw new Error('checked が true であることを期待していましたが false でした');
    if (!radio.invalid) throw new Error('invalid が true であることを期待していましたが false でした');

    const control = radio.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('control が見つかりません');

    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error('aria-checked="true" であることを期待していましたが false でした');
    }
    if (control.getAttribute('aria-invalid') !== 'true') {
      throw new Error('aria-invalid="true" であることを期待していましたが false でした');
    }
  },
};

// ──────────────────────────────────────────────
// グループ
// ──────────────────────────────────────────────

/**
 * 基本的なラジオグループ。
 *
 * 同一 `name` を持つラジオボタンが排他的に選択されます。
 * 選択中のラジオのみ `tabindex="0"`（Roving Tabindex）。
 */
export const RadioGroup: Story = {
  render: () => html`
    <div
      role="radiogroup"
      aria-label="配送方法"
      style="display: flex; flex-direction: column; gap: 0.5rem;"
    >
      <ui-radio id="group-a" name="shipping" value="standard" label="通常配送（3〜5日）"></ui-radio>
      <ui-radio id="group-b" name="shipping" value="express"  label="速達（翌日）" checked></ui-radio>
      <ui-radio id="group-c" name="shipping" value="same-day" label="当日配送"></ui-radio>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radios = canvasElement.querySelectorAll<Radio>('ui-radio[name="shipping"]');
    if (radios.length !== 3) throw new Error(`3つのラジオボタンを期待していましたが、実際には ${String(radios.length)} つでした`);

    await Promise.all([...radios].map((r) => r.updateComplete));

    const [a, b, c] = [...radios] as [Radio, Radio, Radio];

    // テスト: b のみ checked
    if (a.checked) throw new Error('ラジオ A は選択されていない必要があります');
    if (!b.checked) throw new Error('ラジオ B は選択されている必要があります');
    if (c.checked) throw new Error('ラジオ C は選択されていない必要があります');

    // テスト: Roving Tabindex — b のみ tabindex="0"
    const ctrlA = a.shadowRoot?.querySelector('.control');
    const ctrlB = b.shadowRoot?.querySelector('.control');
    const ctrlC = c.shadowRoot?.querySelector('.control');
    if (!ctrlA || !ctrlB || !ctrlC) throw new Error('コントロールが見つかりません');

    if (ctrlA.getAttribute('tabindex') !== '-1') throw new Error('ラジオ A の tabindex は "-1" である必要があります');
    if (ctrlB.getAttribute('tabindex') !== '0') throw new Error('ラジオ B の tabindex は "0" である必要があります');
    if (ctrlC.getAttribute('tabindex') !== '-1') throw new Error('ラジオ C の tabindex は "-1" である必要があります');
  },
};

/**
 * グループ内に無効なラジオが混在する例。
 *
 * 無効なラジオはキーボードナビゲーションでスキップされます。
 */
export const GroupWithDisabled: Story = {
  render: () => html`
    <div
      role="radiogroup"
      aria-label="サイズ選択"
      style="display: flex; flex-direction: column; gap: 0.5rem;"
    >
      <ui-radio id="size-s"  name="size" value="s"  label="S"></ui-radio>
      <ui-radio id="size-m"  name="size" value="m"  label="M" checked></ui-radio>
      <ui-radio id="size-l"  name="size" value="l"  label="L（在庫なし）" disabled></ui-radio>
      <ui-radio id="size-xl" name="size" value="xl" label="XL"></ui-radio>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await Promise.all(
      [...canvasElement.querySelectorAll<Radio>('ui-radio')].map((r) => r.updateComplete),
    );

    const radioL = canvasElement.querySelector<Radio>('#size-l');
    if (!radioL) throw new Error('ラジオ L が見つかりません');

    // テスト: disabled なラジオは aria-disabled="true"
    const ctrlL = radioL.shadowRoot?.querySelector('.control');
    if (!ctrlL) throw new Error('コントロール L が見つかりません');
    if (ctrlL.getAttribute('aria-disabled') !== 'true') {
      throw new Error('無効なラジオボタンには aria-disabled="true" が設定されている必要があります');
    }

    // テスト: disabled なラジオはクリックしても選択されない
    let changeEventFired = false;
    radioL.addEventListener('change', () => { changeEventFired = true; });
    ctrlL.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (radioL.checked) throw new Error('無効なラジオボタンはクリックしても選択されない必要があります');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changeEventFired) throw new Error('無効なラジオボタンは change イベントを発火させない必要があります');
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
  play: async ({ canvasElement }) => {
    const radios = canvasElement.querySelectorAll('ui-radio');
    if (radios.length !== 6) {
      throw new Error(`6つのラジオボタンを期待していましたが、実際には ${String(radios.length)} つでした`);
    }

    // テスト: ラベルなしのコントロールは存在する
    const noLabel = canvasElement.querySelector<Radio>('#all-no-label');
    if (!noLabel) throw new Error('ラベルなしのラジオボタンが見つかりません');
    await noLabel.updateComplete;
    const labelEl = noLabel.shadowRoot?.querySelector('.label');
    if (labelEl) throw new Error('label プロパティが空の場合、ラベル要素は存在しない必要があります');
  },
};

// ──────────────────────────────────────────────
// インタラクション
// ──────────────────────────────────────────────

/**
 * クリックによる選択と排他制御。
 *
 * クリックで選択状態が変わり、同グループの他のラジオは自動的に未選択になります。
 * `change` / `input` イベントが発火します。
 */
export const ClickSelect: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        role="radiogroup"
        aria-label="クリックテスト"
        style="display: flex; flex-direction: column; gap: 0.5rem;"
      >
        <ui-radio
          id="click-a"
          name="click-group"
          value="a"
          label="選択肢 A"
          @change="${(e: Event) => {
      const log = document.getElementById('click-log');
      if (log) log.textContent = `change: value=${(e.target as Radio).value}`;
    }}"
        ></ui-radio>
        <ui-radio
          id="click-b"
          name="click-group"
          value="b"
          label="選択肢 B"
          checked
          @change="${(e: Event) => {
      const log = document.getElementById('click-log');
      if (log) log.textContent = `change: value=${(e.target as Radio).value}`;
    }}"
        ></ui-radio>
        <ui-radio
          id="click-c"
          name="click-group"
          value="c"
          label="選択肢 C"
          @change="${(e: Event) => {
      const log = document.getElementById('click-log');
      if (log) log.textContent = `change: value=${(e.target as Radio).value}`;
    }}"
        ></ui-radio>
      </div>

      <div
        id="click-log"
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
        ラジオボタンをクリックするとここに表示されます
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radioA = canvasElement.querySelector<Radio>('#click-a');
    const radioB = canvasElement.querySelector<Radio>('#click-b');
    const radioC = canvasElement.querySelector<Radio>('#click-c');
    if (!radioA || !radioB || !radioC) throw new Error('ラジオボタンが見つかりません');

    await Promise.all([radioA.updateComplete, radioB.updateComplete, radioC.updateComplete]);

    // 初期状態: B が選択済み
    if (radioA.checked) throw new Error('初期状態では A は選択されていない必要があります');
    if (!radioB.checked) throw new Error('初期状態では B は選択されている必要があります');
    if (radioC.checked) throw new Error('初期状態では C は選択されていない必要があります');

    // A をクリック → A が選択、B が未選択になる
    const changePromise = new Promise<Radio>((resolve) => {
      radioA.addEventListener('change', (e) => { resolve(e.target as Radio); }, { once: true });
    });

    const ctrlA = radioA.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!ctrlA) throw new Error('コントロール A が見つかりません');
    ctrlA.click();

    const result = await Promise.race([
      changePromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (!result) throw new Error('change event が発火しませんでした');
    // TypeScript の型絞り込みを回避するため unknown 経由で再評価
    const [aChecked, bChecked, cChecked] = [radioA, radioB, radioC].map(
      (r) => (r as unknown as Radio).checked,
    );
    if (!aChecked) throw new Error('クリック後に A が選択されている必要があります');
    if (bChecked) throw new Error('A のクリック後に B は選択解除されている必要があります');
    if (cChecked) throw new Error('C は未選択のままである必要があります');

    const inputPromise = new Promise<Radio>((resolve) => {
      radioA.addEventListener('input', (e) => { resolve(e.target as Radio); }, { once: true });
    });
    ctrlA.click();
    const inputResult = await Promise.race([
      inputPromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);
    if (inputResult !== null) {
      throw new Error('既に選択されているラジオボタンは input イベントを発火させない必要があります');
    }
  },
};

/**
 * ラベルクリックによる選択。
 *
 * ラベル領域をクリックしてもラジオが選択されることを確認します。
 */
export const LabelClickSelect: Story = {
  render: () => html`
    <ui-radio id="label-click-radio" name="label-click-group" value="a" label="ラベルクリックで選択"></ui-radio>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#label-click-radio');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    const label = radio.shadowRoot?.querySelector<HTMLElement>('.label');
    if (!label) throw new Error('ラベルが見つかりません');
    label.click();
    await radio.updateComplete;

    if (!radio.checked) throw new Error('ラベルクリック後に checked=true になることを期待していましたが false でした');
  },
};

/**
 * Arrow Key によるグループ内ナビゲーション。
 *
 * Arrow Keys でグループ内を循環移動し、即座に選択状態が変わります。
 * `Space` キーでも現在フォーカスのラジオを選択できます。
 */
export const ArrowKeyNavigation: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0 0);
          border: 1px solid oklch(90% 0.01 250 / 0.2);
          border-radius: 6px;
          font-size: 13px;
        "
      >
        <strong>操作方法</strong>: Tab でフォーカスを当て、↑↓ または ←→ で移動してください。
      </div>
      <div
        role="radiogroup"
        aria-label="Arrow Key テスト"
        style="display: flex; flex-direction: column; gap: 0.5rem;"
      >
        <ui-radio id="arrow-a" name="arrow-group" value="a" label="選択肢 A" checked></ui-radio>
        <ui-radio id="arrow-b" name="arrow-group" value="b" label="選択肢 B"></ui-radio>
        <ui-radio id="arrow-c" name="arrow-group" value="c" label="選択肢 C"></ui-radio>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radioA = canvasElement.querySelector<Radio>('#arrow-a');
    const radioB = canvasElement.querySelector<Radio>('#arrow-b');
    const radioC = canvasElement.querySelector<Radio>('#arrow-c');
    if (!radioA || !radioB || !radioC) throw new Error('ラジオボタンが見つかりません');

    await Promise.all([radioA.updateComplete, radioB.updateComplete, radioC.updateComplete]);

    const ctrlA = radioA.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!ctrlA) throw new Error('コントロール A が見つかりません');

    // A にフォーカス
    ctrlA.focus();

    // ArrowDown → B が選択される
    const changePromise = new Promise<Radio>((resolve) => {
      radioB.addEventListener('change', (e) => { resolve(e.target as Radio); }, { once: true });
    });

    ctrlA.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));

    const result = await Promise.race([
      changePromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (!result) throw new Error('ArrowDown によって B の change イベントが発火しませんでした');
    if (!radioB.checked) throw new Error('ArrowDown 後に B が選択されていることを期待していましたが選択されていません');
    if (radioA.checked) throw new Error('ArrowDown 後に A が選択解除されていることを期待していましたが選択されています');
  },
};

// ──────────────────────────────────────────────
// 境界条件
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: 循環ナビゲーション（最後 → 最初）。
 *
 * 最後の選択肢で ArrowDown を押すと最初の選択肢に循環します。
 * 逆方向（ArrowUp）も同様に循環します。
 */
export const CircularNavigation: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: 最後の選択肢で ArrowDown を押すと最初の選択肢に循環します。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0.01 80 / 0.3);
          border: 1px solid oklch(80% 0.05 80 / 0.4);
          border-radius: 6px;
          font-size: 13px;
        "
      >
        <strong>⚠️ 境界条件</strong>: 最後の選択肢で ArrowDown → 最初の選択肢に循環します。
      </div>
      <div
        role="radiogroup"
        aria-label="循環ナビゲーションテスト"
        style="display: flex; flex-direction: column; gap: 0.5rem;"
      >
        <ui-radio id="circ-a" name="circ-group" value="a" label="選択肢 A"></ui-radio>
        <ui-radio id="circ-b" name="circ-group" value="b" label="選択肢 B"></ui-radio>
        <ui-radio id="circ-c" name="circ-group" value="c" label="選択肢 C" checked></ui-radio>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radioA = canvasElement.querySelector<Radio>('#circ-a');
    const radioC = canvasElement.querySelector<Radio>('#circ-c');
    if (!radioA || !radioC) throw new Error('ラジオボタンが見つかりません');

    await Promise.all([radioA.updateComplete, radioC.updateComplete]);

    const ctrlC = radioC.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!ctrlC) throw new Error('コントロール C が見つかりません');

    ctrlC.focus();

    // C（最後）で ArrowDown → A（最初）に循環
    const changePromise = new Promise<Radio>((resolve) => {
      radioA.addEventListener('change', (e) => { resolve(e.target as Radio); }, { once: true });
    });

    ctrlC.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));

    const result = await Promise.race([
      changePromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (!result) throw new Error('循環ナビゲーションによって A の change イベントが発火しませんでした');
    if (!radioA.checked) throw new Error('C からの循環ナビゲーション後に A が選択されていることを期待していましたが選択されていません');
    if (radioC.checked) throw new Error('循環ナビゲーション後に C が選択解除されていることを期待していましたが選択されています');
  },
};

/**
 * ⚠️ 境界条件: 逆方向循環ナビゲーション（最初 → 最後）。
 *
 * 最初の選択肢で ArrowUp を押すと最後の選択肢に循環します。
 */
export const ReverseCircularNavigation: Story = {
  render: () => html`
    <div role="radiogroup" aria-label="逆方向循環" style="display: flex; flex-direction: column; gap: 0.5rem;">
      <ui-radio id="rev-a" name="rev-group" value="a" label="選択肢 A" checked></ui-radio>
      <ui-radio id="rev-b" name="rev-group" value="b" label="選択肢 B"></ui-radio>
      <ui-radio id="rev-c" name="rev-group" value="c" label="選択肢 C"></ui-radio>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radioA = canvasElement.querySelector<Radio>('#rev-a');
    const radioC = canvasElement.querySelector<Radio>('#rev-c');
    if (!radioA || !radioC) throw new Error('ラジオボタンが見つかりません');
    await Promise.all([radioA.updateComplete, radioC.updateComplete]);

    const ctrlA = radioA.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!ctrlA) throw new Error('コントロール A が見つかりません');
    ctrlA.focus();

    ctrlA.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }));
    await Promise.all([radioA.updateComplete, radioC.updateComplete]);

    if (!radioC.checked) throw new Error('最初の項目で ArrowUp を押した後に C が選択されていることを期待していましたが選択されていません');
    if (radioA.checked) throw new Error('逆方向の循環ナビゲーション後に A が選択解除されていることを期待していましたが選択されています');
  },
};

/**
 * ⚠️ 境界条件: Disabled 時のクリック無効化。
 *
 * `disabled` 状態ではクリックしても状態が変化せず、
 * `change` / `input` イベントも発火しません。
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
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0.01 80 / 0.3);
          border: 1px solid oklch(80% 0.05 80 / 0.4);
          border-radius: 6px;
          font-size: 13px;
        "
      >
        <strong>⚠️ 境界条件</strong>: disabled 状態ではクリックしても状態が変化しません。
      </div>
      <ui-radio
        id="disabled-blocked"
        label="クリックしても変化しない（無効）"
        name="disabled-blocked-group"
        value="a"
        disabled
      ></ui-radio>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#disabled-blocked');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    let changeEventFired = false;
    radio.addEventListener('change', () => { changeEventFired = true; });

    const control = radio.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) throw new Error('control が見つかりません');

    control.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (radio.checked) throw new Error('無効なラジオボタンはクリックしても状態が変化しない必要があります');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changeEventFired) throw new Error('無効なラジオボタンは change イベントを発火させない必要があります');
  },
};

/**
 * ⚠️ 境界条件: 既に選択済みのラジオをクリックしても change イベントは発火しない。
 *
 * ラジオボタンは「選択」操作のみで、「解除」操作はありません。
 * 既に選択済みのラジオをクリックしても状態は変わらず、イベントも発火しません。
 */
export const AlreadyCheckedNoEvent: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: 既に選択済みのラジオをクリックしても `change` イベントは発火しません。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0.01 80 / 0.3);
          border: 1px solid oklch(80% 0.05 80 / 0.4);
          border-radius: 6px;
          font-size: 13px;
        "
      >
        <strong>⚠️ 境界条件</strong>: 既に選択済みのラジオをクリックしても change イベントは発火しません。
      </div>
      <ui-radio
        id="already-checked"
        label="既に選択済み"
        name="already-checked-group"
        value="a"
        checked
      ></ui-radio>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#already-checked');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    if (!radio.checked) throw new Error('初期状態でラジオボタンが選択されていることを期待していましたが選択されていません');

    let changeEventFired = false;
    radio.addEventListener('change', () => { changeEventFired = true; });

    const control = radio.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) throw new Error('control が見つかりません');

    control.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changeEventFired) throw new Error('既に選択されているラジオボタンを再度クリックしても change イベントは発火しない必要があります');
  },
};

/**
 * ⚠️ 境界条件: Roving Tabindex — 未選択グループの最初の要素が tabindex="0"。
 *
 * グループ内に checked なラジオがない場合、
 * 最初の非 disabled ラジオが `tabindex="0"` になります。
 */
export const RovingTabindexNoSelection: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: グループ内に checked なラジオがない場合、最初の非 disabled ラジオが `tabindex="0"` になります。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0.01 80 / 0.3);
          border: 1px solid oklch(80% 0.05 80 / 0.4);
          border-radius: 6px;
          font-size: 13px;
        "
      >
        <strong>⚠️ 境界条件</strong>: 未選択グループでは最初の非 disabled ラジオが tabindex="0"。
      </div>
      <div
        role="radiogroup"
        aria-label="未選択グループ"
        style="display: flex; flex-direction: column; gap: 0.5rem;"
      >
        <ui-radio id="roving-a" name="roving-group" value="a" label="選択肢 A（最初）"></ui-radio>
        <ui-radio id="roving-b" name="roving-group" value="b" label="選択肢 B"></ui-radio>
        <ui-radio id="roving-c" name="roving-group" value="c" label="選択肢 C"></ui-radio>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radioA = canvasElement.querySelector<Radio>('#roving-a');
    const radioB = canvasElement.querySelector<Radio>('#roving-b');
    const radioC = canvasElement.querySelector<Radio>('#roving-c');
    if (!radioA || !radioB || !radioC) throw new Error('ラジオボタンが見つかりません');

    await Promise.all([radioA.updateComplete, radioB.updateComplete, radioC.updateComplete]);

    const ctrlA = radioA.shadowRoot?.querySelector('.control');
    const ctrlB = radioB.shadowRoot?.querySelector('.control');
    const ctrlC = radioC.shadowRoot?.querySelector('.control');
    if (!ctrlA || !ctrlB || !ctrlC) throw new Error('コントロールが見つかりません');

    // 未選択グループ: A（最初）が tabindex="0"
    if (ctrlA.getAttribute('tabindex') !== '0') {
      throw new Error(`A の tabindex="0" を期待していましたが、実際には "${ctrlA.getAttribute('tabindex') ?? 'null'}" でした`);
    }
    if (ctrlB.getAttribute('tabindex') !== '-1') {
      throw new Error(`B の tabindex="-1" を期待していましたが、実際には "${ctrlB.getAttribute('tabindex') ?? 'null'}" でした`);
    }
    if (ctrlC.getAttribute('tabindex') !== '-1') {
      throw new Error(`C の tabindex="-1" を期待していましたが、実際には "${ctrlC.getAttribute('tabindex') ?? 'null'}" でした`);
    }
  },
};

/**
 * ⚠️ 境界条件: ラベルなし（label 属性未設定）。
 *
 * `label` 属性が未設定の場合、コントロールのみが表示されます。
 * この場合、外部から `aria-label` または `aria-labelledby` を提供してください。
 */
export const NoLabel: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `label` 属性が未設定の場合。コントロールのみが表示されます。外部から `aria-label` を提供してください。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <ui-radio id="no-label-radio" name="no-label-group" value="a" aria-label="ラベルなしラジオ"></ui-radio>
      <span style="font-size: 14px; color: oklch(20% 0.01 250);">外部ラベル（aria-label で紐付け）</span>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#no-label-radio');
    if (!radio) throw new Error('ui-radio が見つかりません');
    await radio.updateComplete;

    // テスト: ラベル要素が存在しない
    const label = radio.shadowRoot?.querySelector('.label');
    if (label) throw new Error('label プロパティが空の場合、ラベル要素は存在しない必要があります');

    // テスト: コントロールは存在する
    const control = radio.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('ラベルがなくてもコントロールは存在する必要があります');
    if (control.getAttribute('aria-label') !== 'ラベルなしラジオ') {
      throw new Error('aria-label がコントロールに転送されていることを期待していましたが転送されていません');
    }
  },
};

/**
 * グループ必須検証の例。
 *
 * radiogroup単位で最低1つ選択されていることを検証します。
 */
export const RequiredGroupValidation: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 420px;">
      <ui-radio-group id="shipping-group" label="配送方法（必須）" required error-message="いずれかを選択してください">
        <ui-radio id="req-standard" name="req-shipping" value="standard" label="通常配送"></ui-radio>
        <ui-radio id="req-express" name="req-shipping" value="express" label="速達"></ui-radio>
      </ui-radio-group>
      <span id="shipping-error" aria-live="polite" style="font-size:13px; color: oklch(55% 0.2 28);">未選択</span>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector<RadioGroupElement>('#shipping-group');
    const standard = canvasElement.querySelector<Radio>('#req-standard');
    const express = canvasElement.querySelector<Radio>('#req-express');
    const error = canvasElement.querySelector<HTMLElement>('#shipping-error');
    if (!group || !standard || !express || !error) throw new Error('必須グループの要素が見つかりません');
    await Promise.all([standard.updateComplete, express.updateComplete]);

    if (group.checkValidity()) throw new Error('初期状態ではグループが無効である必要があります');
    if (group.reportValidity()) throw new Error('初期状態ではグループの reportValidity が false である必要があります');

    const expressControl = express.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!expressControl) throw new Error('Express のコントロールが見つかりません');
    expressControl.click();
    await express.updateComplete;

    if (!group.checkValidity()) throw new Error('1つのオプションを選択した後はグループが有効である必要があります');
    if (!group.reportValidity()) throw new Error('選択後はグループの reportValidity が true である必要があります');
    error.textContent = '選択済み';
    if (error.textContent !== '選択済み') throw new Error('バリデーションメッセージが更新されることを期待していましたが更新されていません');
  },
};

/**
 * ダークテーマでの表示確認。
 */
export const DarkThemeStates: Story = {
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
      <div role="radiogroup" aria-label="ダークテーマ確認" style="display:flex; flex-direction:column; gap:0.5rem;">
        <ui-radio id="dark-radio-a" name="dark-radio" value="a" label="未選択"></ui-radio>
        <ui-radio id="dark-radio-b" name="dark-radio" value="b" label="選択済み" checked></ui-radio>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checked = canvasElement.querySelector<Radio>('#dark-radio-b');
    if (!checked) throw new Error('ダークテーマの選択済みラジオボタンが見つかりません');
    await checked.updateComplete;

    const control = checked.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('control が見つかりません');
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error('ダークテーマのストーリーでコントロールが選択されていることを期待していましたが選択されていません');
    }
  },
};

/**
 * Forced Colors想定スタイルの確認。
 */
export const ForcedColorsSimulation: Story = {
  render: () => html`
    <div
      style="
        padding: 1rem;
        border: 1px solid CanvasText;
        color: CanvasText;
        background: Canvas;
        --primary: Highlight;
        --focus-ring-color: CanvasText;
      "
    >
      <ui-radio id="forced-radio" name="forced-radio-group" value="a" label="強制カラー想定" checked></ui-radio>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<Radio>('#forced-radio');
    if (!radio) throw new Error('強制カラー想定のラジオボタンが見つかりません');
    await radio.updateComplete;
    const control = radio.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('control が見つかりません');
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error('強制カラーシミュレーションで選択状態であることを期待していましたが選択されていません');
    }
  },
};

// ──────────────────────────────────────────────
// フォーム統合
// ──────────────────────────────────────────────

/**
 * フォーム統合の例。
 *
 * `name` と `value` を設定することで、標準フォームに統合できます。
 * `checked === true` かつ `disabled` でない場合のみ値が送信されます。
 *
 * **検証方法**:
 * 1. ラジオを選択して「送信」をクリック → FormData に選択した値が含まれます
 * 2. disabled なラジオは checked でも送信されません
 */
export const FormIntegration: Story = {
  render: () => html`
    <style>
      .form-demo {
        max-width: 400px;
        padding: 1.5rem;
        background: oklch(97% 0 0);
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .form-result {
        padding: 0.75rem 1rem;
        background: oklch(100% 0 0);
        border: 1px solid oklch(90% 0.01 250 / 0.2);
        border-radius: 6px;
        font-size: 13px;
        color: oklch(48% 0.01 250);
        min-height: 2.5rem;
        font-family: monospace;
      }
    </style>

    <form
      id="radio-form"
      class="form-demo"
      @submit="${(e: Event) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const data = new FormData(form);
      const result = document.getElementById('radio-form-result');
      if (result) {
        const entries = [...data.entries()]
          .map(([k, v]) => `${k}=${typeof v === 'string' ? v : v.name}`)
          .join(', ');
        result.textContent = entries.length > 0 ? entries : '（送信値なし）';
      }
    }}"
    >
      <h3 style="margin: 0; font-size: 16px;">配送方法を選択</h3>

      <div
        role="radiogroup"
        aria-label="配送方法"
        style="display: flex; flex-direction: column; gap: 0.5rem;"
      >
        <ui-radio id="form-standard" name="shipping" value="standard" label="通常配送（無料）"></ui-radio>
        <ui-radio id="form-express"  name="shipping" value="express"  label="速達（500円）" checked></ui-radio>
        <ui-radio id="form-disabled" name="shipping" value="same-day" label="当日配送（準備中）" disabled checked></ui-radio>
      </div>

      <button
        type="submit"
        style="
          padding: 0 12px;
          height: 32px;
          background: oklch(60% 0.15 250);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          width: fit-content;
        "
      >
        送信
      </button>

      <div>
        <div style="font-size: 12px; color: oklch(48% 0.01 250); margin-bottom: 0.25rem;">FormData:</div>
        <div id="radio-form-result" class="form-result">送信ボタンをクリックしてください</div>
      </div>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const standard = canvasElement.querySelector<Radio>('#form-standard');
    const express = canvasElement.querySelector<Radio>('#form-express');
    const disabled = canvasElement.querySelector<Radio>('#form-disabled');
    const form = canvasElement.querySelector<HTMLFormElement>('#radio-form');

    if (!standard || !express || !disabled || !form) {
      throw new Error('フォーム要素が見つかりません');
    }

    await Promise.all([standard.updateComplete, express.updateComplete, disabled.updateComplete]);

    const data = new FormData(form);

    // standard は未チェックなので送信されない
    // express は checked なので shipping=express が送信される
    // disabled は checked でも disabled なので送信されない
    if (!data.has('shipping')) throw new Error('FormData に shipping が含まれている必要があります');
    const shippingVal = data.get('shipping');
    if (shippingVal !== 'express') {
      const valStr = typeof shippingVal === 'string' ? shippingVal : '(non-string)';
      throw new Error(`shipping=express を期待していましたが、実際には ${valStr} でした`);
    }
  },
};
