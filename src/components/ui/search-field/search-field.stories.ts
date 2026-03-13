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
  value="router"
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
  render: () => html`
    <div style="max-width: 32rem;">
      <ui-search-field id="search-field-default" label="検索" hide-label placeholder="メモを検索"></ui-search-field>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('ui-search-field');
    const host = getHost(canvasElement, 'search-field-default');
    await flush(host);

    const input = getInput(host);
    const clearButton = getClearButton(host);
    const icon = host.shadowRoot?.querySelector('.icon');
    assert(!!icon, '検索アイコンが表示されていません');
    assert(input.type === 'search', '内部 input が type="search" ではありません');
    assert(clearButton.hidden, '初期状態では clear button が非表示である必要があります');
    assert(input.getAttribute('aria-label') === '検索', 'aria-label が設定されていません');
  },
};

export const ClearableState: Story = {
  render: () => html`
    <div style="max-width: 32rem;">
      <ui-search-field id="search-field-clear" label="検索" hide-label placeholder="メモを検索" value="router"></ui-search-field>
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

    assert(input.getAttribute('role') === 'combobox', 'role="combobox" が内部 input に反映されていません');
    assert(input.getAttribute('aria-controls') === 'search-listbox', 'aria-controls が反映されていません');
    assert(input.getAttribute('aria-expanded') === 'true', 'aria-expanded が反映されていません');
    assert(input.getAttribute('aria-activedescendant') === 'search-option-0', 'aria-activedescendant が反映されていません');
    assert(input.selectionStart === 0 && input.selectionEnd === 3, 'setSelectionRange() が機能していません');

    host.focusClearButton();
    await waitFrame();
    assert(host.shadowRoot?.activeElement === clearButton, 'focusClearButton() で clear button に移動できていません');
  },
};

export const DisabledAndReadonlyBoundary: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 32rem;">
      <ui-search-field id="search-field-readonly" label="検索" hide-label value="router" readonly></ui-search-field>
      <ui-search-field id="search-field-disabled" label="検索" hide-label value="router" disabled></ui-search-field>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('ui-search-field');
    const readonlyHost = getHost(canvasElement, 'search-field-readonly');
    const disabledHost = getHost(canvasElement, 'search-field-disabled');
    await flush(readonlyHost);
    await flush(disabledHost);

    const readonlyClearButton = getClearButton(readonlyHost);
    const disabledClearButton = getClearButton(disabledHost);
    assert(!readonlyHost.clearButtonVisible, 'readonly 状態では clearButtonVisible=false である必要があります');
    assert(readonlyClearButton.hidden, 'readonly 状態では clear button を表示してはいけません');
    assert(!disabledHost.clearButtonVisible, 'disabled 状態では clearButtonVisible=false である必要があります');
    assert(disabledClearButton.hidden, 'disabled 状態では clear button を表示してはいけません');
  },
};
