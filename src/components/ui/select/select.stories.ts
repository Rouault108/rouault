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

const FRUIT_OPTIONS: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
];

const OPTIONS_WITH_DISABLED: SelectOption[] = [
  { value: 'active1', label: '有効な選択肢 1' },
  { value: 'disabled1', label: '無効な選択肢（disabled）', disabled: true },
  { value: 'active2', label: '有効な選択肢 2' },
  { value: 'disabled2', label: '無効な選択肢（disabled）', disabled: true },
  { value: 'active3', label: '有効な選択肢 3' },
];

const LONG_LABEL_OPTIONS: SelectOption[] = [
  { value: 'short', label: '短い' },
  {
    value: 'long',
    label: 'とても長いラベルのテキストが入る選択肢のサンプルです（レイアウト確認用）',
  },
  { value: 'medium', label: '中程度の長さのラベル' },
];

const SINGLE_OPTION: SelectOption[] = [{ value: 'only', label: '唯一の選択肢' }];

const MANY_OPTIONS: SelectOption[] = Array.from({ length: 20 }, (_, index) => ({
  value: `item-${(index + 1).toString()}`,
  label: `選択肢 ${(index + 1).toString()}`,
}));

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
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#default-select');
    if (!select) throw new Error('ui-select が見つかりません');
    await select.updateComplete;

    // テスト: トリガーに role="combobox" が設定されていること
    const trigger = select.shadowRoot?.querySelector('[role="combobox"]');
    if (!trigger) throw new Error('role="combobox" のトリガーが見つかりません');

    // テスト: aria-haspopup="listbox" が設定されていること
    if (trigger.getAttribute('aria-haspopup') !== 'listbox') {
      throw new Error('aria-haspopup="listbox" が設定されていません');
    }

    // テスト: aria-expanded="false" が設定されていること（初期状態）
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('aria-expanded="false" が設定されていません');
    }

    // テスト: aria-label が label プロパティと一致すること
    if (trigger.getAttribute('aria-label') !== '都道府県') {
      throw new Error('aria-label が label プロパティと一致していません');
    }

    // テスト: label と trigger が関連付けられていること
    const labelEl = select.shadowRoot?.querySelector<HTMLLabelElement>('label');
    const triggerId = trigger.getAttribute('id');
    if (!labelEl || !triggerId || labelEl.getAttribute('for') !== triggerId) {
      throw new Error('Label should be associated with trigger input');
    }

    const chevronIcon = select.shadowRoot?.querySelector<HTMLElement>('iconify-icon.icon-chevron');
    if (!chevronIcon) {
      throw new Error('トリガーのアイコンは iconify-icon で描画されるべきです');
    }
    if (chevronIcon.getAttribute('icon') !== 'lucide:chevron-down') {
      throw new Error(
        `icon="lucide:chevron-down" を期待しましたが、実際には "${chevronIcon.getAttribute('icon') ?? 'null'}" でした`,
      );
    }

    const triggerRect = trigger.getBoundingClientRect();
    const iconRect = chevronIcon.getBoundingClientRect();
    if (triggerRect.right > window.innerWidth) {
      throw new Error('トリガーがビューポート右端にはみ出しています');
    }
    if (triggerRect.right - iconRect.right > 16) {
      throw new Error('矢印アイコンがトリガー右端から離れすぎています');
    }
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;
    const iconCenterY = iconRect.top + iconRect.height / 2;
    if (Math.abs(triggerCenterY - iconCenterY) > 1) {
      throw new Error('矢印アイコンがトリガーの垂直中央に配置されていません');
    }
  },
};

/**
 * アウトラインバリアント。
 * 白背景でも境界が消えないことを確認します。
 */
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
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#outline-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector<HTMLInputElement>('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    const computedStyle = window.getComputedStyle(trigger);
    if (computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)') {
      throw new Error('outline バリアントの背景が透明になっています');
    }
    if (computedStyle.borderTopColor === 'rgba(0, 0, 0, 0)') {
      throw new Error('outline バリアントの境界線が透明になっています');
    }
  },
};

// ============================================================
// 2. WithValue（選択済み）
// ============================================================

/**
 * 選択済み状態のセレクトボックス。
 * modelValue が設定されている場合、対応するラベルが表示されます。
 */
export const WithValue: Story = {
  render: () => html`
    <ui-select
      id="with-value-select"
      label="都道府県"
      name="prefecture"
      model-value="osaka"
      placeholder="選択してください"
      .options="${PREFECTURE_OPTIONS}"
    ></ui-select>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#with-value-select');
    if (!select) throw new Error('Select component not found');
    await select.updateComplete;

    // テスト: 選択済みの値が表示されること
    const trigger = select.shadowRoot?.querySelector('[role="combobox"]');
    if (!trigger) throw new Error('Trigger not found');

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const displayText = ((trigger as HTMLInputElement).value ?? '').trim();
    if (displayText !== '大阪府') {
      throw new Error(`Expected "大阪府", got "${displayText}"`);
    }

    // テスト: プレースホルダークラスが付いていないこと
    if (trigger.classList.contains('trigger--placeholder')) {
      throw new Error('値が設定されている場合、trigger--placeholder クラスは存在しないべきです');
    }
  },
};

// ============================================================
// 3. WithHelpText（ヘルプテキスト付き）
// ============================================================

/**
 * ヘルプテキスト付きのセレクトボックス。
 * エラー状態でない場合、ヘルプテキストが表示されます。
 */
export const WithHelpText: Story = {
  render: () => html`
    <ui-select
      id="help-text-select"
      label="フルーツ"
      name="fruit"
      placeholder="選択してください"
      help-text="お好みのフルーツを選んでください"
      .options="${FRUIT_OPTIONS}"
    ></ui-select>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#help-text-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    // テスト: ヘルプテキストが表示されていること
    const helpText = select.shadowRoot?.querySelector('.help-text');
    if (!helpText) throw new Error('ヘルプテキストが表示されているべきです');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if ((helpText.textContent ?? '') !== 'お好みのフルーツを選んでください') {
      throw new Error('ヘルプテキストの内容が一致しません');
    }
  },
};

// ============================================================
// 4. ErrorState（エラー状態）
// ============================================================

/**
 * エラー状態のセレクトボックス。
 * error=true のとき、エラーメッセージが表示され、ヘルプテキストは非表示になります。
 */
export const ErrorState: Story = {
  render: () => html`
    <ui-select
      id="error-select"
      label="都道府県"
      name="prefecture"
      placeholder="選択してください"
      ?error="${true}"
      error-message="都道府県を選択してください"
      help-text="このヘルプテキストはエラー時に非表示になります"
      .options="${PREFECTURE_OPTIONS}"
    ></ui-select>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#error-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // テスト: aria-invalid="true" が設定されていること
    if (trigger.getAttribute('aria-invalid') !== 'true') {
      throw new Error('エラー状態では aria-invalid は "true" であるべきです');
    }

    // テスト: trigger--error クラスが付いていること
    if (!trigger.classList.contains('trigger--error')) {
      throw new Error('trigger--error クラスが存在するべきです');
    }

    // テスト: エラーメッセージが表示されていること
    const errorMsg = select.shadowRoot?.querySelector('.error-message--visible');
    if (!errorMsg) throw new Error('エラーメッセージが表示されているべきです');

    // テスト: ヘルプテキストが非表示であること（DOMに存在しない）
    const helpText = select.shadowRoot?.querySelector('.help-text');
    if (helpText) throw new Error('エラーが存在する場合、ヘルプテキストは非表示であるべきです');

    // テスト: aria-describedby がエラーメッセージIDを指していること
    const describedBy = trigger.getAttribute('aria-describedby');
    if (!describedBy || describedBy === '') {
      throw new Error('aria-describedby はエラーメッセージのIDに設定されているべきです');
    }
  },
};

// ============================================================
// 5. Disabled（無効状態）
// ============================================================

/**
 * 無効状態のセレクトボックス。
 * disabled=true のとき、クリックもキーボード操作も受け付けません。
 */
export const Disabled: Story = {
  render: () => html`
    <ui-select
      id="disabled-select"
      label="都道府県"
      name="prefecture"
      model-value="tokyo"
      ?disabled="${true}"
      .options="${PREFECTURE_OPTIONS}"
    ></ui-select>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#disabled-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // テスト: tabindex="-1" が設定されていること
    if (trigger.getAttribute('tabindex') !== '-1') {
      throw new Error('無効化されている場合、tabindex は "-1" であるべきです');
    }

    // テスト: クリックしてもリストボックスが開かないこと
    (trigger as HTMLElement).click();
    await select.updateComplete;
    if (select.opened) {
      throw new Error('無効化されている場合、リストボックスは開かないべきです');
    }
  },
};

// ============================================================
// 6. Readonly（読み取り専用）
// ============================================================

/**
 * 読み取り専用のセレクトボックス。
 * readonly=true のとき、フォーカスは可能ですがリストボックスは開きません。
 */
export const Readonly: Story = {
  render: () => html`
    <ui-select
      id="readonly-select"
      label="ステータス"
      name="status"
      model-value="active1"
      ?readonly="${true}"
      .options="${OPTIONS_WITH_DISABLED}"
    ></ui-select>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#readonly-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // テスト: tabindex が "-1" でないこと（フォーカス可能）
    if (trigger.getAttribute('tabindex') === '-1') {
      throw new Error(
        '読み取り専用の場合、tabindex は "-1" ではないべきです（フォーカス可能であるべき）',
      );
    }

    // テスト: クリックしてもリストボックスが開かないこと
    (trigger as HTMLElement).click();
    await select.updateComplete;
    if (select.opened) {
      throw new Error('読み取り専用の場合、リストボックスは開かないべきです');
    }
  },
};

// ============================================================
// 7. HiddenLabel（ラベル非表示）
// ============================================================

/**
 * ラベルを視覚的に非表示にしたセレクトボックス。
 * スクリーンリーダーには常にラベルが提供されます。
 */
export const HiddenLabel: Story = {
  render: () => html`
    <ui-select
      id="hidden-label-select"
      label="フルーツ"
      ?hide-label="${true}"
      name="fruit"
      placeholder="フルーツを選択"
      .options="${FRUIT_OPTIONS}"
    ></ui-select>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#hidden-label-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    // テスト: label--hidden クラスが付いていること
    const label = select.shadowRoot?.querySelector('.label--hidden');
    if (!label) throw new Error('ラベルに label--hidden クラスが付いているべきです');

    // テスト: aria-label は設定されていること
    const trigger = select.shadowRoot?.querySelector('[role="combobox"]');
    if (!trigger?.getAttribute('aria-label')) {
      throw new Error('ラベルが非表示の場合でも aria-label は設定されているべきです');
    }
  },
};

// ============================================================
// 8. WithDisabledOptions（無効な選択肢を含む）
// ============================================================

/**
 * 無効な選択肢を含むセレクトボックス。
 * disabled な選択肢はキーボード移動でスキップされます。
 */
export const WithDisabledOptions: Story = {
  render: () => html`
    <ui-select
      id="disabled-options-select"
      label="選択肢"
      name="choice"
      placeholder="選択してください"
      .options="${OPTIONS_WITH_DISABLED}"
    ></ui-select>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#disabled-options-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // ArrowDown: open + index 0（active1）
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await select.updateComplete;

    // ArrowDown: disabled1 をスキップして index 2（active2）へ
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await select.updateComplete;

    const activeId = trigger.getAttribute('aria-activedescendant');
    if (!activeId) throw new Error('aria-activedescendant が設定されているべきです');

    const activeEl = document.getElementById(activeId);
    if (!activeEl) throw new Error('アクティブなオプション要素が見つかりません');

    if (activeEl.getAttribute('data-index') !== '2') {
      throw new Error(
        `アクティブなインデックスは "2" を期待しましたが、実際には "${activeEl.getAttribute('data-index') ?? ''}" でした`,
      );
    }

    if (activeEl.getAttribute('aria-disabled') === 'true') {
      throw new Error('アクティブなオプションは無効化されていないべきです');
    }
  },
};

// ============================================================
// 9. LongLabels（長いラベル）
// ============================================================

/**
 * 長いラベルを含む選択肢のセレクトボックス。
 * トリガーはテキストオーバーフローを省略記号で処理します。
 */
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
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#long-labels-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    // 長いラベルを選択
    select.modelValue = 'long';
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // テスト: テキストが表示されていること（省略されていても）
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const text = ((trigger as HTMLInputElement).value ?? '').trim();
    if (text.length === 0) {
      throw new Error('トリガーは選択されたラベルテキストを表示するべきです');
    }
  },
};

// ============================================================
// 10. AllStatesShowcase（全状態一覧）
// ============================================================

/**
 * 全状態の一覧。
 * デフォルト・選択済み・エラー・無効・読み取り専用を並べて比較できます。
 */
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
          ?error="${true}"
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
          ?disabled="${true}"
          .options="${PREFECTURE_OPTIONS}"
        ></ui-select>
      </div>
      <div>
        <div class="state-label">Readonly</div>
        <ui-select
          label="都道府県"
          name="s6"
          model-value="kyoto"
          ?readonly="${true}"
          .options="${PREFECTURE_OPTIONS}"
        ></ui-select>
      </div>
    </div>
  `,
};

// ============================================================
// 11. FormIntegration（フォーム統合）
// ============================================================

/**
 * フォーム統合の例。
 * ElementInternals により FormData に値が反映されます。
 */
export const FormIntegration: Story = {
  render: () => html`
    <style>
      .form-demo {
        max-width: 400px;
        padding: 1.5rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }
      .form-demo h3 {
        margin: 0 0 1rem 0;
      }
      .form-fields {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .form-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }
      #form-result {
        margin-top: 1rem;
        padding: 0.75rem;
        background: var(--bg-info-subtle, #e0f2fe);
        border-radius: var(--radius-sm, 4px);
        font-size: var(--text-sm, 13px);
        display: none;
      }
    </style>
    <form
      id="select-form"
      class="form-demo"
      @submit="${(e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = new FormData(form);
        const result = document.getElementById('form-result');
        if (result) {
          result.style.display = 'block';
          const rawVal = data.get('prefecture');
          const prefVal = rawVal instanceof File ? rawVal.name : (rawVal ?? '(未選択)');
          result.textContent = `送信データ: prefecture=${prefVal}`;
        }
      }}"
    >
      <h3>フォーム送信テスト</h3>
      <div class="form-fields">
        <ui-select
          id="form-select"
          label="都道府県"
          name="prefecture"
          placeholder="選択してください"
          .options="${PREFECTURE_OPTIONS}"
        ></ui-select>
      </div>
      <div class="form-actions">
        <button type="submit" style="padding: 0 12px; height: 32px; cursor: pointer;">送信</button>
      </div>
      <div id="form-result"></div>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#form-select');
    const form = canvasElement.querySelector<HTMLFormElement>('#select-form');
    if (!select || !form) throw new Error('ui-select またはフォームが見つかりません');
    await select.updateComplete;

    // テスト: 初期状態では FormData の値が空文字列
    const emptyData = new FormData(form);
    const emptyVal = emptyData.get('prefecture');
    if (emptyVal !== '') {
      const displayVal = emptyVal instanceof File ? '[File]' : (emptyVal ?? 'null');
      throw new Error(`初期値は空文字列を期待しましたが、実際には "${displayVal}" でした`);
    }

    // テスト: 値を設定すると FormData に反映される
    select.modelValue = 'fukuoka';
    await select.updateComplete;

    const filledData = new FormData(form);
    const filledVal = filledData.get('prefecture');
    if (filledVal !== 'fukuoka') {
      const displayVal = filledVal instanceof File ? '[File]' : (filledVal ?? 'null');
      throw new Error(`FormData に "fukuoka" を期待しましたが、実際には "${displayVal}" でした`);
    }
  },
};

// ============================================================
// 12. KeyboardNavigation（キーボード操作）
// ============================================================

/**
 * キーボード操作のデモ。
 * ArrowDown/Up で項目移動、Enter で選択、Escape で閉じます。
 */
export const KeyboardNavigation: Story = {
  render: () => html`
    <div style="max-width: 400px;">
      <p style="font-size: 13px; color: var(--fg-muted, #888); margin-bottom: 1rem;">
        Tab でフォーカスを当て、↓↑ で移動、Enter で選択、Escape で閉じます。
      </p>
      <ui-select
        id="keyboard-select"
        label="フルーツ"
        name="fruit"
        placeholder="キーボードで選択"
        .options="${FRUIT_OPTIONS}"
      ></ui-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#keyboard-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // ArrowDown: リストボックスを開く
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await select.updateComplete;
    if (!select.opened) {
      throw new Error('ArrowDown でリストボックスが開くべきです');
    }
    if (!trigger.getAttribute('aria-activedescendant')) {
      throw new Error('リストボックスが開いた後、aria-activedescendant が設定されているべきです');
    }

    // End: 末尾へ移動
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await select.updateComplete;
    const endId = trigger.getAttribute('aria-activedescendant');
    if (!endId) throw new Error('End キー押下後、aria-activedescendant が設定されているべきです');
    const endEl = document.getElementById(endId);
    if (endEl?.getAttribute('data-index') !== '4') {
      throw new Error('End キーはフォーカスを最後のオプションに移動するべきです');
    }

    // Home: 先頭へ移動
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await select.updateComplete;
    const homeId = trigger.getAttribute('aria-activedescendant');
    if (!homeId) throw new Error('Home キー押下後、aria-activedescendant が設定されているべきです');
    const homeEl = document.getElementById(homeId);
    if (homeEl?.getAttribute('data-index') !== '0') {
      throw new Error('Home キーはフォーカスを最初のオプションに移動するべきです');
    }

    // Space: 現在アクティブ項目を選択して閉じる
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await select.updateComplete;
    if (select.modelValue !== 'apple') {
      throw new Error(
        `選択された値は "apple" を期待しましたが、実際には "${String(select.modelValue)}" でした`,
      );
    }

    // 制御フロー解析のリセット: modelValue チェック後に opened を別変数で評価
    const afterSpace = canvasElement.querySelector<Select>('#keyboard-select');
    if (afterSpace?.opened) {
      throw new Error('Space キーで選択後、リストボックスは閉じるべきです');
    }

    // Enter: 再オープン
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await select.updateComplete;
    const afterEnter = canvasElement.querySelector<Select>('#keyboard-select');
    if (!afterEnter?.opened) {
      throw new Error('Enter キーでリストボックスが開くべきです');
    }

    // Tab: Focus trap せず閉じる
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    await select.updateComplete;
    const afterTab = canvasElement.querySelector<Select>('#keyboard-select');
    if (afterTab?.opened) {
      throw new Error('Tab キーでリストボックスは閉じるべきです');
    }

    // Escape: close
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await select.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await select.updateComplete;
    const afterEscape = canvasElement.querySelector<Select>('#keyboard-select');
    if (afterEscape?.opened) {
      throw new Error('Escape キーでリストボックスは閉じるべきです');
    }
  },
};

// ============================================================
// 13. LongScrollableOptions（長い選択肢リスト）
// ============================================================

/**
 * 長い選択肢リストの回帰テスト。
 * 内部スクロールや Arrow キー移動でポップアップが閉じないことを確認します。
 */
export const LongScrollableOptions: Story = {
  render: () => html`
    <div style="max-width: 400px;">
      <ui-select
        id="long-scrollable-select"
        label="多数の選択肢"
        name="many-options"
        placeholder="選択してください"
        .options="${MANY_OPTIONS}"
      ></ui-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#long-scrollable-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await select.updateComplete;
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    for (let i = 0; i < 12; i += 1) {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await select.updateComplete;
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    if (!select.opened) {
      throw new Error('長いリストを ArrowDown で移動しても、リストボックスは閉じないべきです');
    }

    const activeId = trigger.getAttribute('aria-activedescendant');
    if (!activeId) {
      throw new Error('長いリストでも aria-activedescendant が維持されるべきです');
    }

    const activeEl = document.getElementById(activeId);
    if (!activeEl) {
      throw new Error('アクティブなオプション要素が見つかりません');
    }

    if (activeEl.getAttribute('data-index') !== '12') {
      throw new Error(
        `13番目の選択肢に到達することを期待しましたが、実際には "${activeEl.getAttribute('data-index') ?? 'null'}" でした`,
      );
    }

    const listbox = document.querySelector<HTMLElement>('[data-ui-select-listbox]');
    if (!listbox) {
      throw new Error('リストボックス要素が見つかりません');
    }

    listbox.scrollTop = listbox.scrollHeight;
    listbox.dispatchEvent(new Event('scroll', { bubbles: true }));
    await select.updateComplete;
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const afterScroll = canvasElement.querySelector<Select>('#long-scrollable-select');
    if (!afterScroll?.opened) {
      throw new Error('リストボックス自身をスクロールしても、ポップアップは閉じないべきです');
    }
  },
};

// ============================================================
// 14. ChangeEvent（changeイベント）
// ============================================================

/**
 * change イベントの発火確認。
 * 選択値が変わったときのみ change イベントが発火します。
 */
export const ChangeEvent: Story = {
  render: () => html`
    <div style="max-width: 400px;">
      <ui-select
        id="change-event-select"
        label="フルーツ"
        name="fruit"
        placeholder="選択してください"
        .options="${FRUIT_OPTIONS}"
      ></ui-select>
      <div id="change-log" style="margin-top: 1rem; font-size: 13px; color: var(--fg-muted, #888);">
        変更ログ: なし
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#change-event-select');
    const log = canvasElement.querySelector<HTMLElement>('#change-log');
    if (!select || !log) throw new Error('ui-select またはログ要素が見つかりません');
    await select.updateComplete;

    let changeCount = 0;
    let lastValue: unknown = '';

    select.addEventListener('change', (e: Event) => {
      const detail = (e as CustomEvent<{ value: string | number }>).detail;
      changeCount += 1;
      lastValue = detail.value;
      log.textContent = `変更ログ: ${changeCount.toString()} 回 / 最後の値: ${String(lastValue)}`;
    });

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // UI操作: ArrowDown -> Enter で apple を選択
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await select.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await select.updateComplete;

    // 同値再選択: イベント増加しないこと
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await select.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await select.updateComplete;

    if (changeCount !== 1) {
      throw new Error(
        `change イベントは1回発火するべきですが、実際には ${changeCount.toString()} 回でした`,
      );
    }
    if (lastValue !== 'apple') {
      throw new Error(
        `最後の値は "apple" を期待しましたが、実際には "${String(lastValue)}" でした`,
      );
    }
  },
};

// ============================================================
// 15. ErrorStateTransition（エラー状態の遷移）
// ============================================================

/**
 * エラー状態の遷移テスト。
 * エラー解消時に Help Text が再表示されることを確認します。
 */
export const ErrorStateTransition: Story = {
  render: () => html`
    <div style="max-width: 400px;">
      <ui-select
        id="error-transition-select"
        label="都道府県"
        name="prefecture"
        placeholder="選択してください"
        help-text="お住まいの都道府県を選択してください"
        .options="${PREFECTURE_OPTIONS}"
      ></ui-select>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button
          @click="${(e: Event) => {
            const btn = e.currentTarget as HTMLElement;
            const container = btn.closest('div')?.parentElement;
            const sel = container?.querySelector<Select>('#error-transition-select');
            if (sel) {
              sel.error = true;
              sel.errorMessage = '都道府県を選択してください';
            }
          }}"
          style="padding: 0 12px; height: 32px; cursor: pointer;"
        >
          エラーを表示
        </button>
        <button
          @click="${(e: Event) => {
            const btn = e.currentTarget as HTMLElement;
            const container = btn.closest('div')?.parentElement;
            const sel = container?.querySelector<Select>('#error-transition-select');
            if (sel) {
              sel.error = false;
              sel.errorMessage = '';
            }
          }}"
          style="padding: 0 12px; height: 32px; cursor: pointer;"
        >
          エラーを解消
        </button>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#error-transition-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    // 初期状態: Help Text が表示されていること
    let helpText = select.shadowRoot?.querySelector('.help-text');
    if (!helpText) throw new Error('初期状態ではヘルプテキストが表示されているべきです');

    // エラー状態に遷移
    select.error = true;
    select.errorMessage = 'テストエラー';
    await select.updateComplete;

    const errorMsg = select.shadowRoot?.querySelector('.error-message--visible');
    if (!errorMsg) throw new Error('error=true の場合、エラーメッセージが表示されているべきです');

    helpText = select.shadowRoot?.querySelector('.help-text');
    if (helpText) throw new Error('エラーが存在する場合、ヘルプテキストは非表示であるべきです');

    // エラー解消
    select.error = false;
    select.errorMessage = '';
    await select.updateComplete;

    helpText = select.shadowRoot?.querySelector('.help-text');
    if (!helpText) throw new Error('エラー解消後、ヘルプテキストが再び表示されるべきです');
  },
};

// ============================================================
// 16. EmptyOptions（選択肢なし）境界条件
// ============================================================

/**
 * ❗ 境界条件: 選択肢が空の場合。
 * options=[] のとき、クリックしてもリストボックスが開きますが項目は表示されません。
 */
export const EmptyOptions: Story = {
  render: () => html`
    <ui-select
      id="empty-options-select"
      label="選択肢なし"
      name="empty"
      placeholder="選択肢がありません"
      .options="${[]}"
    ></ui-select>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#empty-options-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    // テスト: options が空配列であること
    if (select.options.length !== 0) {
      throw new Error('オプションは空であるべきです');
    }

    // テスト: キーボード操作でクラッシュしないこと
    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await select.updateComplete;
    // エラーが発生しなければOK

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await select.updateComplete;
  },
};

// ============================================================
// 16. SingleOption（選択肢1件）境界条件
// ============================================================

/**
 * ❗ 境界条件: 選択肢が1件の場合。
 * ArrowDown/Up の循環移動が正しく動作することを確認します。
 */
export const SingleOption: Story = {
  render: () => html`
    <ui-select
      id="single-option-select"
      label="唯一の選択肢"
      name="single"
      placeholder="選択してください"
      .options="${SINGLE_OPTION}"
    ></ui-select>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#single-option-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // テスト: ArrowDown でリストボックスが開くこと
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await select.updateComplete;
    if (!select.opened) throw new Error('リストボックスが開くべきです');

    // テスト: さらに ArrowDown を押してもクラッシュしないこと（循環）
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await select.updateComplete;

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await select.updateComplete;

    // テスト: Enter で選択できること
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await select.updateComplete;

    if (select.modelValue !== 'only') {
      throw new Error(
        `"only" が選択されることを期待しましたが、実際には "${String(select.modelValue)}" でした`,
      );
    }
  },
};

// ============================================================
// 17. AllDisabledOptions（全選択肢が無効）境界条件
// ============================================================

/**
 * ❗ 境界条件: 全ての選択肢が disabled の場合。
 * キーボード移動でクラッシュしないことを確認します。
 */
export const AllDisabledOptions: Story = {
  render: () => {
    const allDisabled: SelectOption[] = [
      { value: 'a', label: '選択肢 A', disabled: true },
      { value: 'b', label: '選択肢 B', disabled: true },
    ];
    return html`
      <ui-select
        id="all-disabled-options-select"
        label="全て無効"
        name="allDisabled"
        placeholder="選択できません"
        .options="${allDisabled}"
      ></ui-select>
    `;
  },
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#all-disabled-options-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // テスト: ArrowDown でリストボックスが開いてもクラッシュしないこと
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await select.updateComplete;

    // テスト: Enter を押しても値が変わらないこと
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await select.updateComplete;

    if (select.modelValue !== '') {
      throw new Error('全てのオプションが無効な場合、modelValue は空のままであるべきです');
    }
  },
};

// ============================================================
// 18. ErrorWithoutMessage（エラーメッセージなし）境界条件
// ============================================================

/**
 * ❗ 境界条件: error=true だがエラーメッセージが空の場合。
 * aria-invalid="true" は設定されるが、aria-describedby は空のままになります。
 */
export const ErrorWithoutMessage: Story = {
  render: () => html`
    <ui-select
      id="error-no-msg-select"
      label="都道府県"
      name="prefecture"
      placeholder="選択してください"
      ?error="${true}"
      help-text="通常時のヘルプテキスト"
      .options="${PREFECTURE_OPTIONS}"
    ></ui-select>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#error-no-msg-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // テスト: aria-invalid="true" が設定されていること
    if (trigger.getAttribute('aria-invalid') !== 'true') {
      throw new Error('エラーが強制されている場合、aria-invalid は "true" であるべきです');
    }

    // テスト: aria-describedby が空であること（メッセージなし）
    if (trigger.getAttribute('aria-describedby') !== '') {
      throw new Error('エラーメッセージがない場合、aria-describedby は空であるべきです');
    }
  },
};

// ============================================================
// 19. SameValueReselect（同じ値の再選択）境界条件
// ============================================================

/**
 * ❗ 境界条件: 同じ値を再選択した場合。
 * change イベントは発火しないことを確認します。
 */
export const SameValueReselect: Story = {
  render: () => html`
    <ui-select
      id="same-value-select"
      label="フルーツ"
      name="fruit"
      model-value="apple"
      .options="${FRUIT_OPTIONS}"
    ></ui-select>
    <div
      id="same-value-log"
      style="margin-top: 8px; font-size: 13px; color: var(--fg-muted, #888);"
    >
      change イベント発火回数: 0
    </div>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#same-value-select');
    const log = canvasElement.querySelector<HTMLElement>('#same-value-log');
    if (!select || !log) throw new Error('ui-select またはログ要素が見つかりません');
    await select.updateComplete;

    let changeCount = 0;
    select.addEventListener('change', () => {
      changeCount += 1;
      log.textContent = `change イベント発火回数: ${changeCount.toString()}`;
    });

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // Enter: open（selected=apple に active）
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await select.updateComplete;

    // Enter: same value を再選択
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await select.updateComplete;

    if (changeCount !== 0) {
      throw new Error(
        `同じ値を選択した場合、change イベントは発火しないべきですが、${changeCount.toString()} 回発火しました`,
      );
    }
    if (select.modelValue !== 'apple') {
      throw new Error(
        `modelValue は "apple" のままであるべきですが、実際には "${String(select.modelValue)}" でした`,
      );
    }
  },
};

// ============================================================
// 20. TypeaheadSearch（Type-ahead）
// ============================================================

/**
 * Type-ahead（文字入力による絞り込み）のデモ。
 * フォーカス後に文字を入力すると、マッチする項目にジャンプします。
 */
export const TypeaheadSearch: Story = {
  render: () => html`
    <div style="max-width: 400px;">
      <p style="font-size: 13px; color: var(--fg-muted, #888); margin-bottom: 1rem;">
        フォーカスを当てて「a」を入力すると "Apple" にジャンプします。 「b」で "Banana"、「ch」で
        "Cherry" にジャンプします。
      </p>
      <ui-select
        id="typeahead-select"
        label="フルーツ"
        name="fruit"
        placeholder="文字を入力してジャンプ"
        .options="${FRUIT_OPTIONS}"
      ></ui-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector<Select>('#typeahead-select');
    if (!select) throw new Error('ui-select コンポーネントが見つかりません');
    await select.updateComplete;

    const trigger = select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) throw new Error('トリガーが見つかりません');

    // "c" -> "h" の連続入力で Cherry に移動
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    await select.updateComplete;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
    await select.updateComplete;
    if (!select.opened) {
      throw new Error('タイプアヘッド入力でリストボックスが開くべきです');
    }

    const chActiveId = trigger.getAttribute('aria-activedescendant');
    if (!chActiveId)
      throw new Error('タイプアヘッド後、aria-activedescendant が設定されているべきです');
    const chActiveEl = document.getElementById(chActiveId);
    if (!chActiveEl?.textContent.includes('Cherry')) {
      throw new Error(
        `"ch" 入力後に Cherry が選択されることを期待しましたが、実際には "${chActiveEl?.textContent ?? 'null'}" でした`,
      );
    }

    // 1秒後にバッファリセットされることを検証
    await new Promise((resolve) => {
      setTimeout(resolve, 1100);
    });
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
    await select.updateComplete;
    const bActiveId = trigger.getAttribute('aria-activedescendant');
    if (!bActiveId)
      throw new Error('タイプアヘッド後、aria-activedescendant が設定されているべきです');
    const bActiveEl = document.getElementById(bActiveId);
    if (!bActiveEl?.textContent.includes('Banana')) {
      throw new Error(
        `バッファリセット後の "b" 入力により Banana が選択されることを期待しましたが、実際には "${bActiveEl?.textContent ?? 'null'}" でした`,
      );
    }

    // テスト: Escape で閉じること
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await select.updateComplete;
    const afterEscape = canvasElement.querySelector<Select>('#typeahead-select');
    if (afterEscape?.opened) {
      throw new Error('Escape キーでリストボックスが閉じるべきです');
    }
  },
};

// ============================================================
// 21. DarkMode（ダークモード）
// ============================================================

/**
 * ダークモードでの見た目確認。
 * Overlay のハイライトとトリガー状態を確認します。
 */
export const DarkMode: Story = {
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

// ============================================================
// 22. ForcedColorsReference（強制カラー）
// ============================================================

/**
 * 強制カラーモード時の確認用ストーリー。
 * 実際の検証はブラウザ/OS の forced-colors を有効化して実施します。
 */
export const ForcedColorsReference: Story = {
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

// ============================================================
// 23. ReducedMotionReference（低減モーション）
// ============================================================

/**
 * prefers-reduced-motion 確認用ストーリー。
 * 実際の検証はブラウザ/OS の reduced-motion を有効化して実施します。
 */
export const ReducedMotionReference: Story = {
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
