import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './checkbox';
import type { Checkbox } from './checkbox';

/**
 * ## チェックボックス (Checkbox)
 *
 * 選択状態（ON/OFF）を一目で識別可能にします。
 * Form-Associated Custom Element として、標準フォームとシームレスに統合します。
 *
 * ### デザイン哲学
 *
 * - **Clarity**: 選択状態を一目で識別可能にし、ラベルとの関連性を明確にします
 * - **Tactility**: `--duration-fast` (70ms) による即応性の高いアニメーション
 * - **Minimality**: 未選択時は「構造」として静かに存在し、選択時のみ「色」を持ちます
 *
 * ### 状態遷移
 *
 * ```
 * Unchecked → Checked → Unchecked（Space / クリックでトグル）
 * Indeterminate → Unchecked（Space / クリック、プログラム的設定のみ）
 * ```
 *
 * ### 使用上の注意
 *
 * - **`indeterminate` はプログラム的にのみ設定可能**（属性での設定は仕様外）
 * - **`checked` が true になると `indeterminate` は自動解除**
 * - **フォーム送信**: `name` が空でない、`disabled` でない、`checked === true` の場合のみ値を送信
 * - **必須バリデーション**: `required` 属性でチェックが必須であることを示します
 */
const meta: Meta<Checkbox> = {
  title: 'Components/Checkbox',
  component: 'ui-checkbox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
チェックボックスコンポーネントは、選択状態（ON/OFF）を一目で識別可能にします。
Form-Associated Custom Element として、標準フォームとシームレスに統合します。

## 使用方法

\`\`\`html
<!-- 基本的な使用 -->
<ui-checkbox label="利用規約に同意する" name="agree" value="yes"></ui-checkbox>

<!-- 必須 -->
<ui-checkbox label="必須項目" name="required-check" required></ui-checkbox>

<!-- 無効 -->
<ui-checkbox label="変更不可" name="locked" checked disabled></ui-checkbox>

<!-- 中間状態（プログラム的に設定） -->
<ui-checkbox id="parent" label="すべて選択"></ui-checkbox>
<script>
  document.querySelector('#parent').indeterminate = true;
</script>
\`\`\`

## 注意事項

- **\`indeterminate\` はプログラム的にのみ設定可能**。属性での設定は仕様外です。
- **\`checked\` が true になると \`indeterminate\` は自動解除**されます。
- **フォーム送信**: \`name\` が空でない、\`disabled\` でない、\`checked === true\` の場合のみ値を送信します。
- **必須バリデーション**: \`required\` 属性でチェックが必須であることを示します。
        `,
      },
    },
  },
  argTypes: {
    checked: {
      control: 'boolean',
      description: '選択状態',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    indeterminate: {
      control: 'boolean',
      description: '中間状態（プログラム的にのみ設定可能）',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    label: {
      control: 'text',
      description: 'ラベルテキスト',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    name: {
      control: 'text',
      description: 'フォーム送信時の識別子',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    value: {
      control: 'text',
      description: 'フォーム送信時の値',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'on' },
      },
    },
    disabled: {
      control: 'boolean',
      description: '無効化',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    required: {
      control: 'boolean',
      description: '必須入力',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    invalid: {
      control: 'boolean',
      description: 'バリデーションエラー状態',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    errorMessage: {
      control: 'text',
      description: 'エラーメッセージ',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<Checkbox>;

// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * デフォルトのチェックボックス（未選択）。
 *
 * 未選択時は「構造」として静かに存在します。
 * 背景色 `--bg-fill-muted` でコントロール領域を明示します。
 */
export const Default: Story = {
  args: {
    label: '利用規約に同意する',
    name: 'agree',
    value: 'yes',
  },
  render: (args) => html`
    <ui-checkbox
      id="default-checkbox"
      label="${args.label}"
      name="${args.name}"
      value="${args.value}"
      ?checked="${args.checked}"
      ?disabled="${args.disabled}"
      ?required="${args.required}"
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#default-checkbox');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    // テスト: デフォルトは未選択
    if (checkbox.checked) throw new Error('Expected checked to be false by default');

    // テスト: デフォルトは indeterminate でない
    if (checkbox.indeterminate) throw new Error('Expected indeterminate to be false by default');

    // テスト: コントロールに role="checkbox" が設定されている
    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control element not found in shadow root');
    if (control.getAttribute('role') !== 'checkbox') {
      throw new Error(`Expected role="checkbox", got "${control.getAttribute('role') ?? 'null'}"`);
    }

    // テスト: aria-checked="false" が設定されている
    if (control.getAttribute('aria-checked') !== 'false') {
      throw new Error(`Expected aria-checked="false", got "${control.getAttribute('aria-checked') ?? 'null'}"`);
    }

    // テスト: tabindex="0" が設定されている（フォーカス可能）
    if (control.getAttribute('tabindex') !== '0') {
      throw new Error(`Expected tabindex="0", got "${control.getAttribute('tabindex') ?? 'null'}"`);
    }

    console.log('✅ All tests passed for Default story');
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
    <ui-checkbox
      id="unchecked-normal"
      label="未選択（通常）"
      name="unchecked-normal"
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#unchecked-normal');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control not found');

    if (checkbox.checked) throw new Error('Expected unchecked');
    if (control.getAttribute('aria-checked') !== 'false') {
      throw new Error('Expected aria-checked="false"');
    }

    console.log('✅ All tests passed for UncheckedNormal story');
  },
};

/**
 * 通常状態 × 選択済み。
 *
 * 選択時は `--primary` 色でコントロールが塗りつぶされ、チェックアイコンが表示されます。
 */
export const CheckedNormal: Story = {
  render: () => html`
    <ui-checkbox
      id="checked-normal"
      label="選択済み（通常）"
      name="checked-normal"
      checked
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#checked-normal');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control not found');

    // テスト: checked プロパティが true
    if (!checkbox.checked) throw new Error('Expected checked to be true');

    // テスト: aria-checked="true"
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error(`Expected aria-checked="true", got "${control.getAttribute('aria-checked') ?? 'null'}"`);
    }

    // テスト: チェックアイコンが表示されている
    const checkIcon = checkbox.shadowRoot?.querySelector('.icon-check');
    if (!checkIcon) throw new Error('Check icon not found');
    const checkStyle = getComputedStyle(checkIcon);
    if (checkStyle.display === 'none') throw new Error('Check icon should be visible when checked');

    // テスト: Minus アイコンは非表示
    const minusIcon = checkbox.shadowRoot?.querySelector('.icon-minus');
    if (!minusIcon) throw new Error('Minus icon not found');
    const minusStyle = getComputedStyle(minusIcon);
    if (minusStyle.display !== 'none') throw new Error('Minus icon should be hidden when checked');

    console.log('✅ All tests passed for CheckedNormal story');
  },
};

/**
 * 通常状態 × 中間状態（Indeterminate）。
 *
 * 親項目の「一部選択」を示します。
 * Minus アイコンが表示され、`aria-checked="mixed"` が設定されます。
 * **プログラム的にのみ設定可能**（属性での設定は仕様外）。
 */
export const IndeterminateNormal: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <ui-checkbox
        id="indeterminate-normal"
        label="すべて選択（一部選択中）"
        name="select-all"
      ></ui-checkbox>
      <div style="padding-left: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
        <ui-checkbox label="項目 A" name="item-a" checked></ui-checkbox>
        <ui-checkbox label="項目 B" name="item-b"></ui-checkbox>
        <ui-checkbox label="項目 C" name="item-c"></ui-checkbox>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const parent = canvasElement.querySelector<Checkbox>('#indeterminate-normal');
    if (!parent) throw new Error('Parent checkbox not found');

    // プログラム的に indeterminate を設定
    parent.indeterminate = true;
    await parent.updateComplete;

    const control = parent.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control not found');

    // テスト: aria-checked="mixed"
    if (control.getAttribute('aria-checked') !== 'mixed') {
      throw new Error(`Expected aria-checked="mixed", got "${control.getAttribute('aria-checked') ?? 'null'}"`);
    }

    // テスト: Minus アイコンが表示されている
    const minusIcon = parent.shadowRoot?.querySelector('.icon-minus');
    if (!minusIcon) throw new Error('Minus icon not found');
    const minusStyle = getComputedStyle(minusIcon);
    if (minusStyle.display === 'none') throw new Error('Minus icon should be visible when indeterminate');

    // テスト: Check アイコンは非表示
    const checkIcon = parent.shadowRoot?.querySelector('.icon-check');
    if (!checkIcon) throw new Error('Check icon not found');
    const checkStyle = getComputedStyle(checkIcon);
    if (checkStyle.display !== 'none') throw new Error('Check icon should be hidden when indeterminate');

    console.log('✅ All tests passed for IndeterminateNormal story');
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
    <ui-checkbox
      id="unchecked-disabled"
      label="未選択（無効）"
      name="unchecked-disabled"
      disabled
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#unchecked-disabled');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control not found');

    // テスト: disabled プロパティが true
    if (!checkbox.disabled) throw new Error('Expected disabled to be true');

    // テスト: aria-disabled="true"
    if (control.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`Expected aria-disabled="true", got "${control.getAttribute('aria-disabled') ?? 'null'}"`);
    }

    // テスト: tabindex="-1"（フォーカス不可）
    if (control.getAttribute('tabindex') !== '-1') {
      throw new Error(`Expected tabindex="-1", got "${control.getAttribute('tabindex') ?? 'null'}"`);
    }

    console.log('✅ All tests passed for UncheckedDisabled story');
  },
};

/**
 * 通常状態 × 選択済み + 無効（Checked + Disabled）。
 *
 * 選択済みかつ無効状態。チェックアイコンは表示されますが操作不可です。
 * フォーム送信も除外されます（disabled のため）。
 */
export const CheckedDisabled: Story = {
  render: () => html`
    <ui-checkbox
      id="checked-disabled"
      label="選択済み（無効）"
      name="checked-disabled"
      checked
      disabled
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#checked-disabled');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    // テスト: checked かつ disabled
    if (!checkbox.checked) throw new Error('Expected checked to be true');
    if (!checkbox.disabled) throw new Error('Expected disabled to be true');

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control not found');

    // テスト: aria-checked="true" かつ aria-disabled="true"
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error('Expected aria-checked="true"');
    }
    if (control.getAttribute('aria-disabled') !== 'true') {
      throw new Error('Expected aria-disabled="true"');
    }

    console.log('✅ All tests passed for CheckedDisabled story');
  },
};

/**
 * 中間状態 × 無効（Indeterminate + Disabled）。
 *
 * 中間状態かつ無効。Minus アイコンは表示されますが操作不可です。
 */
export const IndeterminateDisabled: Story = {
  render: () => html`
    <ui-checkbox
      id="indeterminate-disabled"
      label="一部選択（無効）"
      name="indeterminate-disabled"
      disabled
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#indeterminate-disabled');
    if (!checkbox) throw new Error('ui-checkbox not found');

    // プログラム的に indeterminate を設定
    checkbox.indeterminate = true;
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control not found');

    // テスト: aria-checked="mixed" かつ aria-disabled="true"
    if (control.getAttribute('aria-checked') !== 'mixed') {
      throw new Error('Expected aria-checked="mixed"');
    }
    if (control.getAttribute('aria-disabled') !== 'true') {
      throw new Error('Expected aria-disabled="true"');
    }

    console.log('✅ All tests passed for IndeterminateDisabled story');
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
    <ui-checkbox
      id="unchecked-invalid"
      label="利用規約に同意する（必須）"
      name="agree-invalid"
      invalid
      error-message="利用規約への同意が必要です"
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#unchecked-invalid');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control not found');

    // テスト: aria-invalid="true"
    if (control.getAttribute('aria-invalid') !== 'true') {
      throw new Error(`Expected aria-invalid="true", got "${control.getAttribute('aria-invalid') ?? 'null'}"`);
    }

    // テスト: エラーメッセージが表示されている
    const errorMsg = checkbox.shadowRoot?.querySelector('.error-message');
    if (!errorMsg) throw new Error('Error message element not found');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const errorText: string = errorMsg.textContent ?? '';
    if (!errorText.includes('利用規約への同意が必要です')) {
      throw new Error('Error message text is incorrect');
    }

    // テスト: aria-describedby が設定されている
    if (!control.getAttribute('aria-describedby')) {
      throw new Error('Expected aria-describedby to be set when invalid');
    }

    console.log('✅ All tests passed for UncheckedInvalid story');
  },
};

/**
 * エラー状態 × 選択済み（Invalid + Checked）。
 *
 * 選択済みでもエラー状態を外部から強制できます。
 * ただし通常は checked=true でエラーは解消されるため、
 * カスタムバリデーションロジックでの使用を想定します。
 */
export const CheckedInvalid: Story = {
  render: () => html`
    <ui-checkbox
      id="checked-invalid"
      label="選択済み（エラー強制）"
      name="checked-invalid"
      checked
      invalid
      error-message="この選択は現在無効です"
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#checked-invalid');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    // テスト: checked かつ invalid
    if (!checkbox.checked) throw new Error('Expected checked to be true');
    if (!checkbox.invalid) throw new Error('Expected invalid to be true');

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control not found');

    // テスト: aria-checked="true" かつ aria-invalid="true"
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error('Expected aria-checked="true"');
    }
    if (control.getAttribute('aria-invalid') !== 'true') {
      throw new Error('Expected aria-invalid="true"');
    }

    console.log('✅ All tests passed for CheckedInvalid story');
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
        <ui-checkbox id="all-unchecked" label="未選択" name="s1"></ui-checkbox>
      </div>

      <div class="state-group">
        <div class="state-label">Checked</div>
        <ui-checkbox id="all-checked" label="選択済み" name="s2" checked></ui-checkbox>
      </div>

      <div class="state-group">
        <div class="state-label">Indeterminate</div>
        <ui-checkbox id="all-indeterminate" label="中間状態" name="s3"></ui-checkbox>
      </div>

      <div class="state-group">
        <div class="state-label">Unchecked + Disabled</div>
        <ui-checkbox label="未選択・無効" name="s4" disabled></ui-checkbox>
      </div>

      <div class="state-group">
        <div class="state-label">Checked + Disabled</div>
        <ui-checkbox label="選択・無効" name="s5" checked disabled></ui-checkbox>
      </div>

      <div class="state-group">
        <div class="state-label">Indeterminate + Disabled</div>
        <ui-checkbox id="all-indet-disabled" label="中間・無効" name="s6" disabled></ui-checkbox>
      </div>

      <div class="state-group">
        <div class="state-label">Invalid</div>
        <ui-checkbox
          label="エラー"
          name="s7"
          invalid
          error-message="エラーメッセージ"
        ></ui-checkbox>
      </div>

      <div class="state-group">
        <div class="state-label">Required</div>
        <ui-checkbox label="必須" name="s8" required></ui-checkbox>
      </div>

      <div class="state-group">
        <div class="state-label">No Label</div>
        <ui-checkbox id="all-no-label" name="s9"></ui-checkbox>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    // indeterminate を設定
    const indet = canvasElement.querySelector<Checkbox>('#all-indeterminate');
    if (!indet) throw new Error('Indeterminate checkbox not found');
    indet.indeterminate = true;
    await indet.updateComplete;

    const indetDisabled = canvasElement.querySelector<Checkbox>('#all-indet-disabled');
    if (!indetDisabled) throw new Error('Indeterminate+disabled checkbox not found');
    indetDisabled.indeterminate = true;
    await indetDisabled.updateComplete;

    // テスト: 全チェックボックスが存在する
    const checkboxes = canvasElement.querySelectorAll('ui-checkbox');
    if (checkboxes.length !== 9) {
      throw new Error(`Expected 9 checkboxes, got ${String(checkboxes.length)}`);
    }

    console.log('✅ All tests passed for AllStates story');
  },
};

// ──────────────────────────────────────────────
// インタラクション
// ──────────────────────────────────────────────

/**
 * クリックによるトグル。
 *
 * クリックで checked 状態がトグルし、`change` / `input` イベントが発火します。
 */
export const ClickToggle: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <ui-checkbox
        id="toggle-checkbox"
        label="クリックでトグル"
        name="toggle"
        @change="${(e: Event) => {
      const cb = e.target as Checkbox;
      const log = document.getElementById('toggle-log');
      if (log) {
        log.textContent = `change イベント: checked=${String(cb.checked)}`;
      }
    }}"
      ></ui-checkbox>

      <div
        id="toggle-log"
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
        チェックボックスをクリックするとここに表示されます
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#toggle-checkbox');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    // テスト: 初期状態は未選択
    if (checkbox.checked) throw new Error('Expected initial state to be unchecked');

    // change/input イベントを Promise で受け取る
    const changePromise = new Promise<boolean>(resolve => {
      checkbox.addEventListener('change', (e) => {
        resolve((e.target as Checkbox).checked);
      }, { once: true });
    });
    const inputPromise = new Promise<boolean>(resolve => {
      checkbox.addEventListener('input', (e) => {
        resolve((e.target as Checkbox).checked);
      }, { once: true });
    });

    // コントロールをクリック
    const control = checkbox.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) throw new Error('Control not found');
    control.click();

    const newChecked = await Promise.race([
      changePromise,
      new Promise<null>(resolve => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (newChecked === null) throw new Error('change event was not fired');
    if (!newChecked) throw new Error('Expected checked to be true after click');
    const inputChecked = await Promise.race([
      inputPromise,
      new Promise<null>(resolve => setTimeout(() => { resolve(null); }, 500)),
    ]);
    if (inputChecked === null) throw new Error('input event was not fired');
    if (!inputChecked) throw new Error('Expected input checked=true after click');

    // テスト: 2回目のクリックで未選択に戻る
    const changePromise2 = new Promise<boolean>(resolve => {
      checkbox.addEventListener('change', (e) => {
        resolve((e.target as Checkbox).checked);
      }, { once: true });
    });

    control.click();
    const newChecked2 = await Promise.race([
      changePromise2,
      new Promise<null>(resolve => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (newChecked2 === null) throw new Error('Second change event was not fired');
    if (newChecked2) throw new Error('Expected checked to be false after second click');

    console.log('✅ All tests passed for ClickToggle story');
  },
};

/**
 * ラベルクリックによるトグル。
 *
 * ラベル領域のクリックでも状態が切り替わることを確認します。
 */
export const LabelClickToggle: Story = {
  render: () => html`
    <ui-checkbox
      id="label-click-checkbox"
      label="ラベルクリックでトグル"
      name="label-click"
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#label-click-checkbox');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    const label = checkbox.shadowRoot?.querySelector<HTMLElement>('.label');
    if (!label) throw new Error('Label not found');

    label.click();
    await checkbox.updateComplete;

    if (!checkbox.checked) throw new Error('Expected checked=true after label click');

    console.log('✅ All tests passed for LabelClickToggle story');
  },
};

/**
 * キーボード操作（Space キー）。
 *
 * Space キーで checked 状態がトグルします。
 * `Tab` でフォーカスを当て、`Space` で操作できます。
 */
export const KeyboardToggle: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px;">
        <strong>操作方法</strong>: Tab キーでフォーカスを当て、Space キーでトグルしてください。
      </div>
      <ui-checkbox
        id="keyboard-checkbox"
        label="Space キーでトグル"
        name="keyboard-toggle"
      ></ui-checkbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#keyboard-checkbox');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) throw new Error('Control not found');

    // フォーカスを当てる
    control.focus();

    // Space キーイベントを発火
    const changePromise = new Promise<boolean>(resolve => {
      checkbox.addEventListener('change', (e) => {
        resolve((e.target as Checkbox).checked);
      }, { once: true });
    });

    control.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }));

    const newChecked = await Promise.race([
      changePromise,
      new Promise<null>(resolve => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (newChecked === null) throw new Error('Space key did not fire change event');
    if (!newChecked) throw new Error('Expected checked to be true after Space key');

    console.log('✅ All tests passed for KeyboardToggle story');
  },
};

// ──────────────────────────────────────────────
// 境界条件
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: Indeterminate → Unchecked 遷移。
 *
 * 仕様: ユーザー操作（Space / クリック）による Indeterminate からの遷移先は
 * `checked: false`（Unchecked）です。Checked にはなりません。
 * これは WAI-ARIA の推奨パターンに準拠します。
 */
export const IndeterminateToUnchecked: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: Indeterminate 状態でクリック/Space すると `checked: false`（Unchecked）に遷移します。Checked にはなりません。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: Indeterminate 状態でクリックすると Unchecked になります（Checked にはなりません）。
      </div>
      <ui-checkbox
        id="indet-to-unchecked"
        label="クリックして Unchecked へ遷移"
        name="indet-transition"
      ></ui-checkbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#indet-to-unchecked');
    if (!checkbox) throw new Error('ui-checkbox not found');

    // Indeterminate に設定
    checkbox.indeterminate = true;
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) throw new Error('Control not found');

    // テスト: 初期状態が indeterminate
    if (control.getAttribute('aria-checked') !== 'mixed') {
      throw new Error('Expected aria-checked="mixed" before click');
    }

    // クリック
    const changePromise = new Promise<Checkbox>(resolve => {
      checkbox.addEventListener('change', (e) => {
        resolve(e.target as Checkbox);
      }, { once: true });
    });

    control.click();
    const result = await Promise.race([
      changePromise,
      new Promise<null>(resolve => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (!result) throw new Error('change event was not fired');

    // テスト: checked=false, indeterminate=false に遷移
    if (result.checked) throw new Error('Expected checked=false after indeterminate click');
    if (result.indeterminate) throw new Error('Expected indeterminate=false after click');

    await checkbox.updateComplete;
    if (control.getAttribute('aria-checked') !== 'false') {
      throw new Error(`Expected aria-checked="false" after transition, got "${control.getAttribute('aria-checked') ?? 'null'}"`);
    }

    console.log('✅ All tests passed for IndeterminateToUnchecked story');
  },
};

/**
 * ⚠️ 境界条件: Checked → Indeterminate の自動解除。
 *
 * `checked` が true に設定されると `indeterminate` は自動的に false になります。
 * これにより、checked=true かつ indeterminate=true という矛盾状態を防ぎます。
 */
export const CheckedClearsIndeterminate: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `checked=true` を設定すると `indeterminate` は自動的に `false` になります。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: checked=true を設定すると indeterminate は自動的に false になります。
      </div>
      <ui-checkbox
        id="checked-clears-indet"
        label="checked 設定で indeterminate 解除"
        name="checked-clears"
      ></ui-checkbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#checked-clears-indet');
    if (!checkbox) throw new Error('ui-checkbox not found');

    // indeterminate を設定
    checkbox.indeterminate = true;
    await checkbox.updateComplete;

    const indetBefore: boolean = checkbox.indeterminate;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!indetBefore) throw new Error('Expected indeterminate to be true');

    // checked を true に設定 → indeterminate が自動解除されるはず
    checkbox.checked = true;
    await checkbox.updateComplete;

    // テスト: indeterminate が false になっている
    const indetAfter: boolean = checkbox.indeterminate;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (indetAfter) {
      throw new Error('Expected indeterminate to be false after setting checked=true');
    }

    // テスト: aria-checked="true"
    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control not found');
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error(`Expected aria-checked="true", got "${control.getAttribute('aria-checked') ?? 'null'}"`);
    }

    console.log('✅ All tests passed for CheckedClearsIndeterminate story');
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
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: disabled 状態ではクリックしても状態が変化しません。
      </div>
      <ui-checkbox
        id="disabled-click-blocked"
        label="クリックしても変化しない（無効）"
        name="disabled-blocked"
        disabled
      ></ui-checkbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#disabled-click-blocked');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    let changeEventFired: boolean = false;
    checkbox.addEventListener('change', () => { changeEventFired = true; });

    const control = checkbox.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) throw new Error('Control not found');

    // クリック
    control.click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // テスト: 状態が変化していない
    if (checkbox.checked) throw new Error('Disabled checkbox should not change state on click');

    // テスト: change イベントが発火していない
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changeEventFired) throw new Error('Disabled checkbox should not fire change event');

    console.log('✅ All tests passed for DisabledClickBlocked story');
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
      <ui-checkbox id="no-label-checkbox" name="no-label" aria-label="ラベルなしチェックボックス"></ui-checkbox>
      <span style="font-size: 14px; color: oklch(20% 0.01 250);">外部ラベル（aria-label で紐付け）</span>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#no-label-checkbox');
    if (!checkbox) throw new Error('ui-checkbox not found');
    await checkbox.updateComplete;

    // テスト: ラベル要素が存在しない
    const label = checkbox.shadowRoot?.querySelector('.label');
    if (label) throw new Error('Label element should not exist when label prop is empty');

    // テスト: コントロールは存在する
    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control should exist even without label');
    if (control.getAttribute('aria-label') !== 'ラベルなしチェックボックス') {
      throw new Error('Expected aria-label to be forwarded to control');
    }

    console.log('✅ All tests passed for NoLabel story');
  },
};

/**
 * ダークテーマでの表示確認。
 *
 * トークンを切り替えた高コントラスト背景で、状態が視認できることを確認します。
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
      <div style="display:flex; flex-direction:column; gap:0.5rem;">
        <ui-checkbox id="dark-unchecked" label="未選択" name="dark-1"></ui-checkbox>
        <ui-checkbox id="dark-checked" label="選択済み" name="dark-2" checked></ui-checkbox>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const unchecked = canvasElement.querySelector<Checkbox>('#dark-unchecked');
    const checked = canvasElement.querySelector<Checkbox>('#dark-checked');
    if (!unchecked || !checked) throw new Error('Dark theme checkboxes not found');
    await Promise.all([unchecked.updateComplete, checked.updateComplete]);

    const checkedControl = checked.shadowRoot?.querySelector('.control');
    if (!checkedControl) throw new Error('Checked control not found');
    if (checkedControl.getAttribute('aria-checked') !== 'true') {
      throw new Error('Expected checked control to expose aria-checked="true"');
    }

    console.log('✅ All tests passed for DarkThemeStates story');
  },
};

/**
 * Forced Colors想定スタイルの確認。
 *
 * 実ブラウザのforced-colorsとは別に、システムカラー値で見た目崩れがないことを確認します。
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
        --on-primary: HighlightText;
        --focus-ring-color: CanvasText;
      "
    >
      <ui-checkbox id="forced-colors-checked" label="強制カラー想定" name="fc-1" checked></ui-checkbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#forced-colors-checked');
    if (!checkbox) throw new Error('Forced colors checkbox not found');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Control not found');
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error('Expected checked state in forced-colors simulation');
    }

    console.log('✅ All tests passed for ForcedColorsSimulation story');
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
 * 1. チェックボックスにチェックを入れて「送信」をクリック → FormData に値が含まれます
 * 2. チェックなしで「送信」をクリック → FormData に値は含まれません
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
      id="checkbox-form"
      class="form-demo"
      @submit="${(e: Event) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const data = new FormData(form);
      const result = document.getElementById('form-result');
      if (result) {
        const entries = [...data.entries()]
          .map(([k, v]) => `${k}=${typeof v === 'string' ? v : v.name}`)
          .join(', ');
        result.textContent = entries.length > 0 ? entries : '（送信値なし）';
      }
    }}"
    >
      <h3 style="margin: 0; font-size: 16px;">フォーム送信テスト</h3>

      <ui-checkbox
        id="form-agree"
        label="利用規約に同意する"
        name="agree"
        value="yes"
      ></ui-checkbox>

      <ui-checkbox
        id="form-newsletter"
        label="ニュースレターを受け取る"
        name="newsletter"
        value="subscribe"
        checked
      ></ui-checkbox>

      <ui-checkbox
        id="form-disabled"
        label="変更不可（無効）"
        name="locked"
        value="locked-value"
        checked
        disabled
      ></ui-checkbox>

      <button type="submit" style="padding: 0 12px; height: 32px; background: oklch(60% 0.15 250); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
        送信
      </button>

      <div>
        <div style="font-size: 12px; color: oklch(48% 0.01 250); margin-bottom: 0.25rem;">FormData:</div>
        <div id="form-result" class="form-result">送信ボタンをクリックしてください</div>
      </div>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const agree = canvasElement.querySelector<Checkbox>('#form-agree');
    const newsletter = canvasElement.querySelector<Checkbox>('#form-newsletter');
    const disabledCb = canvasElement.querySelector<Checkbox>('#form-disabled');
    const form = canvasElement.querySelector<HTMLFormElement>('#checkbox-form');

    if (!agree || !newsletter || !disabledCb || !form) {
      throw new Error('Form elements not found');
    }

    await Promise.all([agree.updateComplete, newsletter.updateComplete, disabledCb.updateComplete]);

    // テスト: フォームデータの確認
    const data = new FormData(form);

    // agree は未チェックなので送信されない
    if (data.has('agree')) throw new Error('Unchecked checkbox should not be in FormData');

    // newsletter はチェック済みなので送信される
    if (!data.has('newsletter')) throw new Error('Checked checkbox should be in FormData');
    const newsletterVal = data.get('newsletter');
    if (newsletterVal !== 'subscribe') {
      const valStr = typeof newsletterVal === 'string' ? newsletterVal : '(non-string)';
      throw new Error(`Expected newsletter=subscribe, got ${valStr}`);
    }

    // disabled は checked でも送信されない
    if (data.has('locked')) throw new Error('Disabled checkbox should not be in FormData');

    console.log('✅ All tests passed for FormIntegration story');
  },
};

/**
 * 必須バリデーションの例。
 *
 * `required` 属性でチェックが必須であることを示します。
 * 未チェックのまま送信すると `checkValidity()` が false を返します。
 */
export const RequiredValidation: Story = {
  render: () => html`
    <style>
      .required-demo {
        max-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .required-info {
        padding: 0.75rem 1rem;
        background: oklch(95% 0.02 250 / 0.5);
        border-radius: 6px;
        font-size: 13px;
      }
    </style>

    <div class="required-demo">
      <div class="required-info">
        <strong>💡 検証方法</strong>: チェックなしで「送信」を押すとエラーが表示されます。
      </div>

      <form
        id="required-form"
        novalidate
        @submit="${(e: Event) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const cb = form.querySelector<Checkbox>('#required-cb');
      if (!cb) return;

      if (!cb.checkValidity()) {
        cb.invalid = true;
        cb.errorMessage = '利用規約への同意が必要です';
      } else {
        cb.invalid = false;
        cb.errorMessage = '';
        alert('送信成功！');
      }
    }}"
        style="display: flex; flex-direction: column; gap: 1rem;"
      >
        <ui-checkbox
          id="required-cb"
          label="利用規約に同意する（必須）"
          name="required-agree"
          value="agreed"
          required
          @change="${(e: Event) => {
      const cb = e.target as Checkbox;
      if (cb.checked) {
        cb.invalid = false;
        cb.errorMessage = '';
      }
    }}"
        ></ui-checkbox>

        <button type="submit" style="padding: 0 12px; height: 32px; background: oklch(60% 0.15 250); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; width: fit-content;">
          送信
        </button>
      </form>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#required-cb');
    if (!checkbox) throw new Error('Required checkbox not found');
    await checkbox.updateComplete;

    // テスト: required プロパティが true
    if (!checkbox.required) throw new Error('Expected required to be true');

    // テスト: 未チェックの状態で checkValidity() が false
    if (checkbox.checkValidity()) {
      throw new Error('Empty required checkbox should be invalid');
    }

    // テスト: チェックすると checkValidity() が true
    checkbox.checked = true;
    await checkbox.updateComplete;

    if (!checkbox.checkValidity()) {
      throw new Error('Checked required checkbox should be valid');
    }

    // 元に戻す
    checkbox.checked = false;
    await checkbox.updateComplete;

    console.log('✅ All tests passed for RequiredValidation story');
  },
};

// ──────────────────────────────────────────────
// 実用例
// ──────────────────────────────────────────────

/**
 * 親子チェックボックス（Select All パターン）。
 *
 * 親チェックボックスで全子項目を一括選択/解除できます。
 * 一部選択時は `indeterminate` 状態になります。
 */
export const SelectAllPattern: Story = {
  render: () => html`
    <style>
      .select-all-demo {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 300px;
      }

      .children {
        padding-left: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border-left: 2px solid oklch(90% 0.01 250 / 0.3);
        margin-left: 8px;
      }
    </style>

    <div class="select-all-demo">
      <ui-checkbox
        id="select-all"
        label="すべて選択"
        name="select-all"
        @change="${(e: Event) => {
      const parent = e.target as Checkbox;
      const root = parent.closest('.select-all-demo');
      if (!root) return;
      const children = root.querySelectorAll<Checkbox>('.child-checkbox');
      children.forEach(child => {
        child.checked = parent.checked;
      });
    }}"
      ></ui-checkbox>

      <div class="children">
        <ui-checkbox class="child-checkbox" label="項目 A" name="item-a" value="a" @change="${updateParent}"></ui-checkbox>
        <ui-checkbox class="child-checkbox" label="項目 B" name="item-b" value="b" @change="${updateParent}"></ui-checkbox>
        <ui-checkbox class="child-checkbox" label="項目 C" name="item-c" value="c" @change="${updateParent}"></ui-checkbox>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const parent = canvasElement.querySelector<Checkbox>('#select-all');
    const children = canvasElement.querySelectorAll<Checkbox>('.child-checkbox');

    if (!parent) throw new Error('Parent checkbox not found');
    if (children.length !== 3) throw new Error(`Expected 3 children, got ${String(children.length)}`);

    await parent.updateComplete;

    // テスト: 初期状態は全て未選択
    if (parent.checked) throw new Error('Parent should be unchecked initially');
    children.forEach(child => {
      if (child.checked) throw new Error('Children should be unchecked initially');
    });

    console.log('✅ All tests passed for SelectAllPattern story');
  },
};

// ── ヘルパー関数（Select All パターン用） ──
function updateParent(e: Event): void {
  const target = e.currentTarget as Checkbox | null;
  const root = target?.closest('.select-all-demo');
  if (!root) return;
  const parent = root.querySelector<Checkbox>('#select-all');
  const children = root.querySelectorAll<Checkbox>('.child-checkbox');
  if (!parent) return;

  const checkedCount = [...children].filter(c => c.checked).length;
  if (checkedCount === 0) {
    parent.indeterminate = false;
    parent.checked = false;
  } else if (checkedCount === children.length) {
    parent.indeterminate = false;
    parent.checked = true;
  } else {
    parent.checked = false;
    parent.indeterminate = true;
  }
}
