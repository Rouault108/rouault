import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { userEvent } from 'storybook/test';
import './search-field.js';
import type { SearchField } from './search-field.js';

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const flush = async (host: SearchField): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;
};

const getHost = (canvasElement: Element, id: string): SearchField => {
  const host = canvasElement.querySelector<SearchField>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }

  return host;
};

const getInput = (host: SearchField): HTMLInputElement => {
  const input = host.shadowRoot?.querySelector<HTMLInputElement>('input');
  if (!input) {
    throw new Error('内部 input が見つかりません');
  }

  return input;
};

const getLabel = (host: SearchField): HTMLLabelElement => {
  const label = host.shadowRoot?.querySelector<HTMLLabelElement>('label');
  if (!label) {
    throw new Error('label が見つかりません');
  }

  return label;
};

const getClearButton = (host: SearchField): HTMLButtonElement => {
  const button = host.shadowRoot?.querySelector<HTMLButtonElement>('.clear-button');
  if (!button) {
    throw new Error('clear button が見つかりません');
  }

  return button;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const meta: Meta<SearchField> = {
  title: 'Components/SearchField',
  component: 'ui-search-field',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
検索専用の入力フィールドです。検索アイコン、クリアボタン、Combobox 用 ARIA の受け皿をひとまとめに提供します。

\`\`\`html
<ui-search-field
  label="検索"
  hide-label
  placeholder="メモを検索"
  enterkeyhint="search"
></ui-search-field>
\`\`\`
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<SearchField>;

export const Default: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="max-width: 32rem;">
      <ui-search-field
        id="search-field-default"
        label="検索"
        hide-label
        placeholder="メモを検索"
      ></ui-search-field>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('ui-search-field');
    const host = getHost(canvasElement, 'search-field-default');
    await flush(host);

    const input = getInput(host);
    const label = getLabel(host);
    const clearButton = getClearButton(host);
    const icon = host.shadowRoot?.querySelector('.icon');
    const inputStyle = getComputedStyle(input);
    assert(!!icon, '検索アイコンが表示されていません');
    assert(input.type === 'search', '内部 input が type="search" ではありません');
    assert(clearButton.hidden, '初期状態では clear button が非表示である必要があります');
    assert(label.textContent.trim() === '検索', 'label の文言が正しくありません');
    assert(label.htmlFor === input.id, 'label と内部 input の関連付けが切れています');
    assert(
      input.getAttribute('aria-label') === null,
      'アクセシブル名源を aria-label にしてはいけません',
    );
    assert(
      inputStyle.paddingTop === '0px',
      '入力テキストの縦位置合わせのため padding-block-start は 0px である必要があります',
    );
    assert(
      inputStyle.paddingBottom === '0px',
      '入力テキストの縦位置合わせのため padding-block-end は 0px である必要があります',
    );
    assert(
      inputStyle.height === '44px',
      '入力欄の高さはコントロール全体と一致している必要があります',
    );
    assert(
      inputStyle.lineHeight === '44px',
      '入力欄の line-height はコントロール高と一致している必要があります',
    );
    assert(
      inputStyle.fontFamily.includes('Rouault Sans'),
      '入力欄はグローバルなメトリクス補正済みフォントを継承している必要があります',
    );
  },
};

export const ClearableState: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="max-width: 32rem;">
      <ui-search-field
        id="search-field-clear"
        label="検索"
        hide-label
        placeholder="メモを検索"
        value="router"
      ></ui-search-field>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('ui-search-field');
    const host = getHost(canvasElement, 'search-field-clear');
    await flush(host);

    const input = getInput(host);
    const clearButton = getClearButton(host);
    let inputEventCount = 0;
    host.addEventListener('input', () => {
      inputEventCount += 1;
    });

    assert(host.clearButtonVisible, '値ありの状態で clearButtonVisible=true になっていません');
    assert(!clearButton.hidden, '値ありの状態で clear button が表示されていません');

    clearButton.focus();
    await userEvent.click(clearButton);
    await flush(host);

    assert(host.value === '', 'clear 後に host.value が空文字になっていません');
    assert(input.value === '', 'clear 後に内部 input.value が空文字になっていません');
    assert(inputEventCount === 1, 'clear 操作で input イベントが 1 回だけ再送出されていません');
    assert(host.shadowRoot?.activeElement === input, 'clear 後に入力へフォーカスが戻っていません');
  },
};

export const ComboboxAriaAndImperativeApi: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="max-width: 32rem;">
      <ui-search-field
        id="search-field-combobox"
        label="検索"
        hide-label
        value="router"
        .inputRole=${'combobox'}
        .inputAriaExpanded=${'true'}
        .inputAriaAutocomplete=${'list'}
        .inputAriaControls=${'search-listbox'}
        .inputAriaActivedescendant=${'search-option-0'}
        .inputAriaBusy=${'false'}
      ></ui-search-field>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('ui-search-field');
    const host = getHost(canvasElement, 'search-field-combobox');
    await flush(host);

    const input = getInput(host);
    const clearButton = getClearButton(host);

    host.focus();
    host.setSelectionRange(0, 3);
    await waitFrame();

    assert(
      input.getAttribute('role') === 'combobox',
      'role="combobox" が内部 input に反映されていません',
    );
    assert(
      input.getAttribute('aria-controls') === 'search-listbox',
      'aria-controls が反映されていません',
    );
    assert(input.getAttribute('aria-expanded') === 'true', 'aria-expanded が反映されていません');
    assert(
      input.getAttribute('aria-activedescendant') === 'search-option-0',
      'aria-activedescendant が反映されていません',
    );
    assert(
      input.selectionStart === 0 && input.selectionEnd === 3,
      'setSelectionRange() が機能していません',
    );

    host.focusClearButton();
    await waitFrame();
    assert(
      host.shadowRoot?.activeElement === clearButton,
      'focusClearButton() で clear button に移動できていません',
    );
  },
};

export const DescriptionAssociation: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: grid; gap: 0.5rem; max-width: 32rem;">
      <ui-search-field
        id="search-field-description"
        label="検索"
        hide-label
        placeholder="メモを検索"
        .inputAriaDescribedby=${'search-field-help search-field-shortcut'}
      ></ui-search-field>
      <p id="search-field-help">タグ・本文・タイトルを横断検索します。</p>
      <p id="search-field-shortcut">ショートカット: /</p>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('ui-search-field');
    const host = getHost(canvasElement, 'search-field-description');
    await flush(host);

    const input = getInput(host);
    assert(
      input.getAttribute('aria-describedby') === 'search-field-help search-field-shortcut',
      'inputAriaDescribedby が内部 input に反映されていません',
    );
  },
};

export const NativeInputHints: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="max-width: 32rem;">
      <ui-search-field
        id="search-field-native-hints"
        label="検索"
        hide-label
        placeholder="メモを検索"
        enterkeyhint="search"
        inputmode="search"
        spellcheck="false"
        autocapitalize="off"
      ></ui-search-field>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('ui-search-field');
    const host = getHost(canvasElement, 'search-field-native-hints');
    await flush(host);

    const input = getInput(host);
    assert(
      input.getAttribute('enterkeyhint') === 'search',
      'enterKeyHint が内部 input に反映されていません',
    );
    assert(
      input.getAttribute('inputmode') === 'search',
      'inputMode が内部 input に反映されていません',
    );
    assert(
      input.getAttribute('spellcheck') === 'false',
      'spellcheck=false は属性値 false として反映される必要があります',
    );
    assert(
      ['off', 'none'].includes(input.getAttribute('autocapitalize') ?? '') ||
        ['off', 'none'].includes(input.autocapitalize),
      'autocapitalize が内部 input に反映されていません',
    );
  },
};

export const DisabledAndReadonlyBoundary: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 32rem;">
      <ui-search-field
        id="search-field-readonly"
        label="検索"
        hide-label
        value="router"
        readonly
      ></ui-search-field>
      <ui-search-field
        id="search-field-disabled"
        label="検索"
        hide-label
        value="router"
        disabled
      ></ui-search-field>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('ui-search-field');
    const readonlyHost = getHost(canvasElement, 'search-field-readonly');
    const disabledHost = getHost(canvasElement, 'search-field-disabled');
    await flush(readonlyHost);
    await flush(disabledHost);

    const readonlyInput = getInput(readonlyHost);
    const disabledInput = getInput(disabledHost);
    const readonlyClearButton = getClearButton(readonlyHost);
    const disabledClearButton = getClearButton(disabledHost);
    assert(
      !readonlyHost.clearButtonVisible,
      'readonly 状態では clearButtonVisible=false である必要があります',
    );
    assert(readonlyClearButton.hidden, 'readonly 状態では clear button を表示してはいけません');
    assert(
      !disabledHost.clearButtonVisible,
      'disabled 状態では clearButtonVisible=false である必要があります',
    );
    assert(disabledClearButton.hidden, 'disabled 状態では clear button を表示してはいけません');

    readonlyHost.clear();
    disabledHost.clear();
    await flush(readonlyHost);
    await flush(disabledHost);

    assert(
      readonlyHost.value === 'router',
      'readonly 状態で clear() は no-op である必要があります',
    );
    assert(readonlyInput.value === 'router', 'readonly 状態で内部 input 値を変更してはいけません');
    assert(
      disabledHost.value === 'router',
      'disabled 状態で clear() は no-op である必要があります',
    );
    assert(disabledInput.value === 'router', 'disabled 状態で内部 input 値を変更してはいけません');
  },
};

export const SurfaceBorderCustomization: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="max-width: 32rem;">
      <ui-search-field
        id="search-field-border"
        label="検索"
        hide-label
        placeholder="メモを検索"
        style="
          --ui-search-field-bg: var(--bg-surface-2);
          --ui-search-field-border-width: 1px;
          --ui-search-field-border-color: var(--border-default);
        "
      ></ui-search-field>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('ui-search-field');
    const host = getHost(canvasElement, 'search-field-border');
    await flush(host);

    const field = host.shadowRoot?.querySelector<HTMLDivElement>('.field');
    if (!field) {
      throw new Error('.field が見つかりません');
    }

    const fieldStyle = getComputedStyle(field);
    assert(
      fieldStyle.borderTopWidth === '1px',
      'カスタム border width が .field に反映されていません',
    );
    assert(
      fieldStyle.borderTopStyle === 'solid',
      'カスタム border style が .field に反映されていません',
    );
    assert(
      fieldStyle.borderTopColor !== 'rgba(0, 0, 0, 0)',
      'カスタム border color が .field に反映されていません',
    );
  },
};
