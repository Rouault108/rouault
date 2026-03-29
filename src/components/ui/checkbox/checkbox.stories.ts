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
 * - **`invalid` と `errorMessage` は別入力**。`invalid=true` 単独でも意味上のエラー状態になります
 * - **フォーム送信**: `name` が空でない、`disabled` でない、`checked === true` の場合のみ値を送信
 * - **可視エラー表示**: `invalid=true` かつ `errorMessage` 非空の場合のみ表示します
 * - **必須バリデーション**: `required` は内部妥当性制約であり、可視エラー表示とは分離されます
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
- **\`invalid\` と \`errorMessage\` は別入力**です。visible error は \`errorMessage\` 非空時のみ表示されます。
- **フォーム送信**: \`name\` が空でない、\`disabled\` でない、\`checked === true\` の場合のみ値を送信します。
- **アクセシブル名**: \`label\` がない場合は外部 \`aria-labelledby\` または \`aria-label\` を与えてください。
- **必須バリデーション**: \`required\` は内部妥当性制約であり、可視エラー表示は外部制御です。
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
      control: false,
      description: '中間状態（property 専用。Storybook controls からは操作しません）',
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
      description: '外部制御の意味上のエラー状態',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    errorMessage: {
      control: 'text',
      description: '可視エラー文言。非空時のみ内部エラー表示に利用されます',
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
  parameters: { rouaultContractKind: 'interaction-contract' },
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
      ?checked=${args.checked}
      ?disabled=${args.disabled}
      ?required=${args.required}
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#default-checkbox');
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    // テスト: デフォルトは未選択
    if (checkbox.checked)
      throw new Error('デフォルトで checked が false であることを期待しています');

    // テスト: デフォルトは indeterminate でない
    if (checkbox.indeterminate)
      throw new Error('デフォルトで indeterminate が false であることを期待しています');

    // テスト: コントロールに role="checkbox" が設定されている
    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('Shadow root 内にコントロール要素が見つかりませんでした');
    if (control.getAttribute('role') !== 'checkbox') {
      throw new Error(
        `role="checkbox" を期待していましたが、実際には "${control.getAttribute('role') ?? 'null'}" でした`,
      );
    }

    // テスト: aria-checked="false" が設定されている
    if (control.getAttribute('aria-checked') !== 'false') {
      throw new Error(
        `aria-checked="false" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`,
      );
    }

    // テスト: tabindex="0" が設定されている（フォーカス可能）
    if (control.getAttribute('tabindex') !== '0') {
      throw new Error(
        `tabindex="0" を期待していましたが、実際には "${control.getAttribute('tabindex') ?? 'null'}" でした`,
      );
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
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-checkbox id="unchecked-normal" label="未選択（通常）" name="unchecked-normal"></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#unchecked-normal');
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    if (checkbox.checked)
      throw new Error('未選択状態（unchecked）を期待していましたが選択状態でした');
    if (control.getAttribute('aria-checked') !== 'false') {
      throw new Error(
        `aria-checked="false" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`,
      );
    }
  },
};

/**
 * 通常状態 × 選択済み。
 *
 * 選択時は `--primary` 色でコントロールが塗りつぶされ、チェックアイコンが表示されます。
 */
export const CheckedNormal: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // テスト: checked プロパティが true
    if (!checkbox.checked)
      throw new Error('checked が true であることを期待していましたが false でした');

    // テスト: aria-checked="true"
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error(
        `aria-checked="true" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`,
      );
    }

    // テスト: チェックアイコンが表示されている
    const checkIcon = checkbox.shadowRoot?.querySelector('.icon-check');
    if (!checkIcon) throw new Error('チェックアイコンが見つかりません');
    const checkStyle = getComputedStyle(checkIcon);
    if (checkStyle.display === 'none')
      throw new Error('選択時はチェックアイコンが表示されている必要があります');

    // テスト: Minus アイコンは非表示
    const minusIcon = checkbox.shadowRoot?.querySelector('.icon-minus');
    if (!minusIcon) throw new Error('マイナスアイコンが見つかりません');
    const minusStyle = getComputedStyle(minusIcon);
    if (minusStyle.display !== 'none')
      throw new Error('選択時はマイナスアイコンが非表示である必要があります');
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
  parameters: { rouaultContractKind: 'interaction-contract' },
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
    if (!parent) throw new Error('親チェックボックスが見つかりません');

    // プログラム的に indeterminate を設定
    parent.indeterminate = true;
    await parent.updateComplete;

    const control = parent.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // テスト: aria-checked="mixed"
    if (control.getAttribute('aria-checked') !== 'mixed') {
      throw new Error(
        `aria-checked="mixed" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`,
      );
    }

    // テスト: Minus アイコンが表示されている
    const minusIcon = parent.shadowRoot?.querySelector('.icon-minus');
    if (!minusIcon) throw new Error('マイナスアイコンが見つかりません');
    const minusStyle = getComputedStyle(minusIcon);
    if (minusStyle.display === 'none')
      throw new Error('中間状態のときはマイナスアイコンが表示されている必要があります');

    // テスト: Check アイコンは非表示
    const checkIcon = parent.shadowRoot?.querySelector('.icon-check');
    if (!checkIcon) throw new Error('チェックアイコンが見つかりません');
    const checkStyle = getComputedStyle(checkIcon);
    if (checkStyle.display !== 'none')
      throw new Error('中間状態のときはチェックアイコンが非表示である必要があります');
  },
};

/**
 * 通常状態 × 無効（Unchecked + Disabled）。
 *
 * 未選択かつ無効状態。`opacity: --opacity-disabled` で薄く表示されます。
 * フォーカス不可、フォーム送信除外。
 */
export const UncheckedDisabled: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // テスト: disabled プロパティが true
    if (!checkbox.disabled)
      throw new Error('disabled が true であることを期待していましたが false でした');

    // テスト: aria-disabled="true"
    if (control.getAttribute('aria-disabled') !== 'true') {
      throw new Error(
        `aria-disabled="true" を期待していましたが、実際には "${control.getAttribute('aria-disabled') ?? 'null'}" でした`,
      );
    }

    // テスト: tabindex="-1"（フォーカス不可）
    if (control.getAttribute('tabindex') !== '-1') {
      throw new Error(
        `tabindex="-1" を期待していましたが、実際には "${control.getAttribute('tabindex') ?? 'null'}" でした`,
      );
    }
  },
};

/**
 * 通常状態 × 選択済み + 無効（Checked + Disabled）。
 *
 * 選択済みかつ無効状態。チェックアイコンは表示されますが操作不可です。
 * フォーム送信も除外されます（disabled のため）。
 */
export const CheckedDisabled: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    // テスト: checked かつ disabled
    if (!checkbox.checked)
      throw new Error('checked が true であることを期待していましたが false でした');
    if (!checkbox.disabled)
      throw new Error('disabled が true であることを期待していましたが false でした');

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // テスト: aria-checked="true" かつ aria-disabled="true"
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error(
        `aria-checked="true" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`,
      );
    }
    if (control.getAttribute('aria-disabled') !== 'true') {
      throw new Error(
        `aria-disabled="true" を期待していましたが、実際には "${control.getAttribute('aria-disabled') ?? 'null'}" でした`,
      );
    }
  },
};

/**
 * 中間状態 × 無効（Indeterminate + Disabled）。
 *
 * 中間状態かつ無効。Minus アイコンは表示されますが操作不可です。
 */
export const IndeterminateDisabled: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');

    // プログラム的に indeterminate を設定
    checkbox.indeterminate = true;
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // テスト: aria-checked="mixed" かつ aria-disabled="true"
    if (control.getAttribute('aria-checked') !== 'mixed') {
      throw new Error(
        `aria-checked="mixed" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`,
      );
    }
    if (control.getAttribute('aria-disabled') !== 'true') {
      throw new Error(
        `aria-disabled="true" を期待していましたが、実際には "${control.getAttribute('aria-disabled') ?? 'null'}" でした`,
      );
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
  parameters: { rouaultContractKind: 'boundary-contract' },
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // テスト: aria-invalid="true"
    if (control.getAttribute('aria-invalid') !== 'true') {
      throw new Error(
        `aria-invalid="true" を期待していましたが、実際には "${control.getAttribute('aria-invalid') ?? 'null'}" でした`,
      );
    }

    // テスト: エラーメッセージが表示されている
    const errorMsg = checkbox.shadowRoot?.querySelector('.error-message');
    if (!errorMsg) throw new Error('エラーメッセージ要素が見つかりませんでした');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const errorText: string = errorMsg.textContent ?? '';
    if (!errorText.includes('利用規約への同意が必要です')) {
      throw new Error('エラーメッセージのテキストが正しくありません');
    }

    // テスト: aria-describedby が設定されている
    if (!control.getAttribute('aria-describedby')) {
      throw new Error('invalid 時は aria-describedby が設定されている必要があります');
    }
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
  parameters: { rouaultContractKind: 'boundary-contract' },
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    // テスト: checked かつ invalid
    if (!checkbox.checked)
      throw new Error('checked が true であることを期待していますが false でした');
    if (!checkbox.invalid)
      throw new Error('invalid が true であることを期待していますが false でした');

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // テスト: aria-checked="true" かつ aria-invalid="true"
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error(
        `aria-checked="true" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`,
      );
    }
    if (control.getAttribute('aria-invalid') !== 'true') {
      throw new Error(
        `aria-invalid="true" を期待していましたが、実際には "${control.getAttribute('aria-invalid') ?? 'null'}" でした`,
      );
    }
  },
};

/**
 * エラー状態 × 文言なし。
 *
 * `invalid=true` 単独でも意味上のエラー状態と妥当性が成立しますが、
 * visible error は表示しません。
 */
export const InvalidWithoutMessage: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <ui-checkbox
      id="invalid-without-message"
      label="外部エラーのみ"
      name="invalid-without-message"
      invalid
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#invalid-without-message');
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    if (!checkbox.invalid)
      throw new Error('invalid が true であることを期待していましたが false でした');
    if (checkbox.checkValidity()) {
      throw new Error('invalid=true 単独でも内部妥当性は invalid である必要があります');
    }

    if (control.getAttribute('aria-invalid') !== 'true') {
      throw new Error(
        `aria-invalid="true" を期待していましたが、実際には "${control.getAttribute('aria-invalid') ?? 'null'}" でした`,
      );
    }

    const errorMsg = checkbox.shadowRoot?.querySelector('.error-message');
    if (errorMsg) {
      throw new Error('errorMessage が空のとき、可視エラーメッセージは表示されてはいけません');
    }

    if (control.hasAttribute('aria-describedby')) {
      throw new Error(
        'errorMessage が空のとき、内部 error ID は aria-describedby に連結されません',
      );
    }
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
  parameters: { rouaultContractKind: 'interaction-contract' },
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
        <ui-checkbox
          id="all-no-label"
          name="s9"
          aria-label="ラベルなし状態のサンプル"
        ></ui-checkbox>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    // indeterminate を設定
    const indet = canvasElement.querySelector<Checkbox>('#all-indeterminate');
    if (!indet) throw new Error('中間状態（indeterminate）のチェックボックスが見つかりません');
    indet.indeterminate = true;
    await indet.updateComplete;

    const indetDisabled = canvasElement.querySelector<Checkbox>('#all-indet-disabled');
    if (!indetDisabled)
      throw new Error(
        '中間状態かつ無効（indeterminate+disabled）のチェックボックスが見つかりません',
      );
    indetDisabled.indeterminate = true;
    await indetDisabled.updateComplete;

    const noLabel = canvasElement.querySelector<Checkbox>('#all-no-label');
    if (!noLabel) throw new Error('ラベルなしのチェックボックスが見つかりません');
    await noLabel.updateComplete;

    const noLabelControl = noLabel.shadowRoot?.querySelector('.control');
    if (!noLabelControl) throw new Error('ラベルなしのコントロールが見つかりません');
    if (noLabelControl.getAttribute('aria-label') !== 'ラベルなし状態のサンプル') {
      throw new Error('label がない一覧項目には外部 aria-label が転送される必要があります');
    }

    // テスト: 全チェックボックスが存在する
    const checkboxes = canvasElement.querySelectorAll('ui-checkbox');
    if (checkboxes.length !== 9) {
      throw new Error(
        `9個のチェックボックスを期待していましたが、実際には ${String(checkboxes.length)}個でした`,
      );
    }
  },
};

// ──────────────────────────────────────────────
// インタラクション
// ──────────────────────────────────────────────

/**
 * クリックによるトグル。
 *
 * クリックで checked 状態がトグルし、`input`、ついで `change` が発火します。
 */
export const ClickToggle: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    // テスト: 初期状態は未選択
    if (checkbox.checked)
      throw new Error('初期状態が未選択であることを期待していましたが選択状態でした');

    const eventOrder: string[] = [];
    const inputPromise = new Promise<boolean>((resolve) => {
      checkbox.addEventListener(
        'input',
        (e) => {
          eventOrder.push('input');
          resolve((e.target as Checkbox).checked);
        },
        { once: true },
      );
    });
    const changePromise = new Promise<boolean>((resolve) => {
      checkbox.addEventListener(
        'change',
        (e) => {
          eventOrder.push('change');
          resolve((e.target as Checkbox).checked);
        },
        { once: true },
      );
    });

    // コントロールをクリック
    const control = checkbox.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) throw new Error('コントロールが見つかりません');
    control.click();

    const newChecked = await Promise.race([
      changePromise,
      new Promise<null>((resolve) =>
        setTimeout(() => {
          resolve(null);
        }, 500),
      ),
    ]);

    if (newChecked === null) throw new Error('change イベントが発火しませんでした');
    if (!newChecked)
      throw new Error('クリック後に checked が true になることを期待していましたが false でした');
    const inputChecked = await Promise.race([
      inputPromise,
      new Promise<null>((resolve) =>
        setTimeout(() => {
          resolve(null);
        }, 500),
      ),
    ]);
    if (inputChecked === null) throw new Error('input イベントが発火しませんでした');
    if (!inputChecked)
      throw new Error(
        'クリック後に input イベントの checked が true になることを期待していましたが false でした',
      );
    if (eventOrder.join(' -> ') !== 'input -> change') {
      throw new Error(
        `イベント順序は "input -> change" である必要がありますが、実際には "${eventOrder.join(' -> ')}" でした`,
      );
    }

    // テスト: 2回目のクリックで未選択に戻る
    const changePromise2 = new Promise<boolean>((resolve) => {
      checkbox.addEventListener(
        'change',
        (e) => {
          resolve((e.target as Checkbox).checked);
        },
        { once: true },
      );
    });

    control.click();
    const newChecked2 = await Promise.race([
      changePromise2,
      new Promise<null>((resolve) =>
        setTimeout(() => {
          resolve(null);
        }, 500),
      ),
    ]);

    if (newChecked2 === null) throw new Error('2回目の change イベントが発火しませんでした');
    if (newChecked2)
      throw new Error(
        '2回目のクリック後に checked が false になることを期待していましたが true でした',
      );
  },
};

/**
 * ラベルクリックによるトグル。
 *
 * ラベル領域のクリックでも状態が切り替わることを確認します。
 */
export const LabelClickToggle: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-checkbox
      id="label-click-checkbox"
      label="ラベルクリックでトグル"
      name="label-click"
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#label-click-checkbox');
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    const label = checkbox.shadowRoot?.querySelector<HTMLElement>('.label');
    if (!label) throw new Error('ラベルが見つかりません');

    label.click();
    await checkbox.updateComplete;

    if (!checkbox.checked)
      throw new Error(
        'ラベルクリック後に checked が true になることを期待していましたが false でした',
      );
  },
};

/**
 * キーボード操作（Space キー）。
 *
 * Space キーで checked 状態がトグルします。
 * `Tab` でフォーカスを当て、`Space` で操作できます。
 */
export const KeyboardToggle: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px;"
      >
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // フォーカスを当てる
    control.focus();

    // Space キーイベントを発火
    const changePromise = new Promise<boolean>((resolve) => {
      checkbox.addEventListener(
        'change',
        (e) => {
          resolve((e.target as Checkbox).checked);
        },
        { once: true },
      );
    });

    control.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }),
    );

    const newChecked = await Promise.race([
      changePromise,
      new Promise<null>((resolve) =>
        setTimeout(() => {
          resolve(null);
        }, 500),
      ),
    ]);

    if (newChecked === null)
      throw new Error('Space キー操作で change イベントが発火しませんでした');
    if (!newChecked)
      throw new Error(
        'Space キー操作後に checked が true になることを期待していましたが false でした',
      );
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
    rouaultContractKind: 'interaction-contract',
    docs: {
      description: {
        story:
          '⚠️ **境界条件**: Indeterminate 状態でクリック/Space すると `checked: false`（Unchecked）に遷移します。Checked にはなりません。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>: Indeterminate 状態でクリックすると Unchecked
        になります（Checked にはなりません）。
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');

    // Indeterminate に設定
    checkbox.indeterminate = true;
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // テスト: 初期状態が indeterminate
    if (control.getAttribute('aria-checked') !== 'mixed') {
      throw new Error(
        'クリック前に aria-checked="mixed" であることを期待していましたが false でした',
      );
    }

    // クリック
    const changePromise = new Promise<Checkbox>((resolve) => {
      checkbox.addEventListener(
        'change',
        (e) => {
          resolve(e.target as Checkbox);
        },
        { once: true },
      );
    });

    control.click();
    const result = await Promise.race([
      changePromise,
      new Promise<null>((resolve) =>
        setTimeout(() => {
          resolve(null);
        }, 500),
      ),
    ]);

    if (!result) throw new Error('change イベントが発火しませんでした');

    // テスト: checked=false, indeterminate=false に遷移
    if (result.checked)
      throw new Error(
        '中間状態でのクリック後に checked が false になることを期待していましたが true でした',
      );
    if (result.indeterminate)
      throw new Error(
        'クリック後に indeterminate が false になることを期待していましたが true でした',
      );

    await checkbox.updateComplete;
    if (control.getAttribute('aria-checked') !== 'false') {
      throw new Error(
        `遷移後に aria-checked="false" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`,
      );
    }
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
    rouaultContractKind: 'interaction-contract',
    docs: {
      description: {
        story:
          '⚠️ **境界条件**: `checked=true` を設定すると `indeterminate` は自動的に `false` になります。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
        <strong>⚠️ 境界条件</strong>: checked=true を設定すると indeterminate は自動的に false
        になります。
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');

    // indeterminate を設定
    checkbox.indeterminate = true;
    await checkbox.updateComplete;

    const indetBefore: boolean = checkbox.indeterminate;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!indetBefore)
      throw new Error(
        '初期状態で indeterminate が true であることを期待していましたが false でした',
      );

    // checked を true に設定 → indeterminate が自動解除されるはず
    checkbox.checked = true;
    await checkbox.updateComplete;

    // テスト: indeterminate が false になっている
    const indetAfter: boolean = checkbox.indeterminate;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (indetAfter) {
      throw new Error(
        'checked=true 設定後に indeterminate が false になることを期待していましたが true でした',
      );
    }

    // テスト: aria-checked="true"
    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error(
        `aria-checked="true" を期待していましたが、実際には "${control.getAttribute('aria-checked') ?? 'null'}" でした`,
      );
    }
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
    rouaultContractKind: 'interaction-contract',
    docs: {
      description: {
        story:
          '⚠️ **境界条件**: `disabled` 状態ではクリックしても状態が変化せず、イベントも発火しません。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;"
      >
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
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    let changeEventFired: boolean = false;
    checkbox.addEventListener('change', () => {
      changeEventFired = true;
    });

    const control = checkbox.shadowRoot?.querySelector<HTMLElement>('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // クリック
    control.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // テスト: 状態が変化していない
    if (checkbox.checked)
      throw new Error('無効状態のチェックボックスはクリックしても状態が変化してはいけません');

    // テスト: change イベントが発火していない
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changeEventFired)
      throw new Error('無効状態のチェックボックスは change イベントを発火してはいけません');

    checkbox.focus();
    if (checkbox.shadowRoot?.activeElement === control) {
      throw new Error('disabled 状態での公開 focus() は no-op である必要があります');
    }
  },
};

/**
 * ⚠️ 境界条件: ラベルなし（label 属性未設定）。
 *
 * `label` 属性が未設定の場合、コントロールのみが表示されます。
 * この場合、外部から `aria-labelledby` または `aria-label` を提供してください。
 */
export const NoLabel: Story = {
  parameters: {
    rouaultContractKind: 'interaction-contract',
    docs: {
      description: {
        story:
          '⚠️ **境界条件**: `label` 属性が未設定の場合。コントロールのみが表示されます。外部から `aria-labelledby` または `aria-label` を提供してください。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span id="no-label-description" style="font-size: 14px; color: oklch(20% 0.01 250);"
        >外部ラベル（aria-labelledby 優先）</span
      >
      <ui-checkbox
        id="no-label-checkbox"
        name="no-label"
        aria-label="aria-label は aria-labelledby より後順位です"
        aria-labelledby="no-label-description"
      ></ui-checkbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#no-label-checkbox');
    if (!checkbox) throw new Error('ui-checkbox が見つかりません');
    await checkbox.updateComplete;

    // テスト: ラベル要素が存在しない
    const label = checkbox.shadowRoot?.querySelector('.label');
    if (label) throw new Error('label プロパティが空のとき、ラベル要素は存在してはいけません');

    // テスト: コントロールは存在する
    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('ラベルがなくてもコントロールは存在する必要があります');
    if (control.getAttribute('aria-labelledby') !== 'no-label-description') {
      throw new Error('label がない場合、aria-labelledby が優先される必要があります');
    }
    if (control.hasAttribute('aria-label')) {
      throw new Error('aria-labelledby がある場合、aria-label はコントロールへ併記しません');
    }
  },
};

/**
 * ダークテーマでの表示確認。
 *
 * トークンを切り替えた高コントラスト背景で、状態が視認できることを確認します。
 */
export const DarkThemeStates: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
    if (!unchecked || !checked) throw new Error('ダークテーマのチェックボックスが見つかりません');
    await Promise.all([unchecked.updateComplete, checked.updateComplete]);

    const checkedControl = checked.shadowRoot?.querySelector('.control');
    if (!checkedControl) throw new Error('選択済みのコントロールが見つかりません');
    if (checkedControl.getAttribute('aria-checked') !== 'true') {
      throw new Error(
        '選択済みのコントロールが aria-checked="true" であることを期待していましたが false でした',
      );
    }
  },
};

/**
 * Forced Colors想定スタイルの確認。
 *
 * 実ブラウザのforced-colorsとは別に、システムカラー値で見た目崩れがないことを確認します。
 */
export const ForcedColorsSimulation: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
      <ui-checkbox
        id="forced-colors-checked"
        label="強制カラー想定"
        name="fc-1"
        checked
      ></ui-checkbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#forced-colors-checked');
    if (!checkbox) throw new Error('強制カラー用のチェックボックスが見つかりません');
    await checkbox.updateComplete;

    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');
    if (control.getAttribute('aria-checked') !== 'true') {
      throw new Error(
        '強制カラーのシミュレーションにおいて選択状態であることを期待していましたが未選択状態でした',
      );
    }
  },
};

/**
 * Reduced Motion 契約の確認。
 *
 * OS 設定そのものは Story 内で切り替えず、コンポーネント CSS に
 * reduced motion 用の規則が定義されていることを確認します。
 */
export const ReducedMotionContract: Story = {
  parameters: {
    rouaultContractKind: 'boundary-contract',
    docs: {
      description: {
        story:
          'Reduced Motion 環境では `.control` の transition duration を極小化する CSS 契約が含まれていることを確認します。',
      },
    },
  },
  render: () => html`
    <ui-checkbox
      id="reduced-motion-checkbox"
      label="Reduced Motion 契約確認"
      name="reduced-motion-checkbox"
    ></ui-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#reduced-motion-checkbox');
    if (!checkbox) throw new Error('Reduced Motion 用のチェックボックスが見つかりません');
    await checkbox.updateComplete;

    const stylesheet = checkbox.shadowRoot?.adoptedStyleSheets[0];
    if (!stylesheet) {
      throw new Error('Reduced Motion 契約を確認するための stylesheet が見つかりません');
    }

    const reducedMotionRule = [...stylesheet.cssRules].find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText === '(prefers-reduced-motion: reduce)',
    );

    if (!reducedMotionRule) {
      throw new Error('Reduced Motion 用の media query が定義されている必要があります');
    }

    const hasReducedDurationRule = [...reducedMotionRule.cssRules].some((rule) =>
      rule.cssText.includes('transition-duration: 0.01ms'),
    );

    if (!hasReducedDurationRule) {
      throw new Error('Reduced Motion 契約では transition-duration を極小化する必要があります');
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
 * 1. チェックボックスにチェックを入れて「送信」をクリック → FormData に値が含まれます
 * 2. チェックなしで「送信」をクリック → FormData に値は含まれません
 */
export const FormIntegration: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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

      <button
        type="submit"
        style="padding: 0 12px; height: 32px; background: oklch(60% 0.15 250); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
      >
        送信
      </button>

      <div>
        <div style="font-size: 12px; color: oklch(48% 0.01 250); margin-bottom: 0.25rem;">
          FormData:
        </div>
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
      throw new Error('フォーム要素が見つかりませんでした');
    }

    await Promise.all([agree.updateComplete, newsletter.updateComplete, disabledCb.updateComplete]);

    // テスト: フォームデータの確認
    const data = new FormData(form);

    // agree は未チェックなので送信されない
    if (data.has('agree'))
      throw new Error('未選択のチェックボックスは FormData に含まれてはいけません');

    // newsletter はチェック済みなので送信される
    if (!data.has('newsletter'))
      throw new Error('選択済みのチェックボックスは FormData に含まれている必要があります');
    const newsletterVal = data.get('newsletter');
    if (newsletterVal !== 'subscribe') {
      const valStr = typeof newsletterVal === 'string' ? newsletterVal : '(文字列以外)';
      throw new Error(`newsletter=subscribe を期待していましたが、実際には ${valStr} でした`);
    }

    // disabled は checked でも送信されない
    if (data.has('locked'))
      throw new Error('無効状態のチェックボックスは FormData に含まれてはいけません');
  },
};

/**
 * 必須バリデーションの例。
 *
 * `required` 属性でチェックが必須であることを示します。
 * 未チェックのまま送信すると `checkValidity()` が false を返します。
 */
export const RequiredValidation: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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

        <button
          type="submit"
          style="padding: 0 12px; height: 32px; background: oklch(60% 0.15 250); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; width: fit-content;"
        >
          送信
        </button>
      </form>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const checkbox = canvasElement.querySelector<Checkbox>('#required-cb');
    if (!checkbox) throw new Error('必須チェックボックスが見つかりません');
    await checkbox.updateComplete;
    const control = checkbox.shadowRoot?.querySelector('.control');
    if (!control) throw new Error('コントロールが見つかりません');

    // テスト: required プロパティが true
    if (!checkbox.required)
      throw new Error('required プロパティが true であることを期待していましたが false でした');

    // テスト: 未チェックの状態で checkValidity() が false
    if (checkbox.checkValidity()) {
      throw new Error('未選択の必須チェックボックスは invalid である必要があります');
    }
    if (control.getAttribute('aria-invalid') !== 'true') {
      throw new Error('required 違反時は aria-invalid="true" が設定される必要があります');
    }

    const errorMessage = checkbox.shadowRoot?.querySelector('.error-message');
    if (errorMessage) {
      throw new Error('required 違反だけでは可視エラーを自動表示してはいけません');
    }

    // テスト: チェックすると checkValidity() が true
    checkbox.checked = true;
    await checkbox.updateComplete;

    if (!checkbox.checkValidity()) {
      throw new Error('選択済みの必須チェックボックスは valid である必要があります');
    }
    if (control.hasAttribute('aria-invalid')) {
      throw new Error('required 違反が解消された後は aria-invalid が解除される必要があります');
    }

    // 元に戻す
    checkbox.checked = false;
    await checkbox.updateComplete;
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
  parameters: { rouaultContractKind: 'interaction-contract' },
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
          children.forEach((child) => {
            child.checked = parent.checked;
          });
        }}"
      ></ui-checkbox>

      <div class="children">
        <ui-checkbox
          class="child-checkbox"
          label="項目 A"
          name="item-a"
          value="a"
          @change="${updateParent}"
        ></ui-checkbox>
        <ui-checkbox
          class="child-checkbox"
          label="項目 B"
          name="item-b"
          value="b"
          @change="${updateParent}"
        ></ui-checkbox>
        <ui-checkbox
          class="child-checkbox"
          label="項目 C"
          name="item-c"
          value="c"
          @change="${updateParent}"
        ></ui-checkbox>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const parent = canvasElement.querySelector<Checkbox>('#select-all');
    const children = canvasElement.querySelectorAll<Checkbox>('.child-checkbox');

    if (!parent) throw new Error('親チェックボックスが見つかりません');
    if (children.length !== 3)
      throw new Error(
        `3個の子項目を期待していましたが、実際には ${String(children.length)}個でした`,
      );

    await parent.updateComplete;

    // テスト: 初期状態は全て未選択
    if (parent.checked) throw new Error('初期状態で親チェックボックスは未選択である必要があります');
    children.forEach((child) => {
      if (child.checked) throw new Error('初期状態で子項目は未選択である必要があります');
    });
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

  const checkedCount = [...children].filter((c) => c.checked).length;
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
