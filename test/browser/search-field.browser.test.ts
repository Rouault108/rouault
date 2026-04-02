import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/search-field/search-field.js';
import type { SearchField } from '../../src/components/ui/search-field/search-field.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: SearchField): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const getInput = (host: SearchField): HTMLInputElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLInputElement>('input'), 'input');

const getLabel = (host: SearchField): HTMLLabelElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLLabelElement>('label'), 'label');

const getClearButton = (host: SearchField): HTMLButtonElement =>
  expectPresent(
    host.shadowRoot?.querySelector<HTMLButtonElement>('button.clear-button'),
    'clear button',
  );

describe('ui-search-field browser contract', () => {
  it('既定状態で search input / label 関連付け / clear button hidden を満たすこと', async () => {
    const host = await fixture<SearchField>(html`
      <ui-search-field label="検索" hide-label placeholder="メモを検索"></ui-search-field>
    `);

    await flush(host);

    const input = getInput(host);
    const label = getLabel(host);
    const clearButton = getClearButton(host);
    const icon = host.shadowRoot?.querySelector('ui-icon[name="search"]');

    expect(icon).to.not.equal(null);
    expect(input.type).to.equal('search');
    expect(label.textContent?.trim()).to.equal('検索');
    expect(label.htmlFor).to.equal(input.id);
    expect(clearButton.hidden).to.equal(true);
    expect(host.clearButtonVisible).to.equal(false);
    expect(input.getAttribute('aria-label')).to.equal(null);
  });

  it('clear button が value を消去し、input event を再送出し、入力へ focus を戻すこと', async () => {
    const host = await fixture<SearchField>(html`
      <ui-search-field label="検索" hide-label value="router"></ui-search-field>
    `);

    await flush(host);

    const input = getInput(host);
    const clearButton = getClearButton(host);
    let inputEventCount = 0;

    host.addEventListener('input', () => {
      inputEventCount += 1;
    });

    expect(host.clearButtonVisible).to.equal(true);
    expect(clearButton.hidden).to.equal(false);

    clearButton.click();
    await flush(host);

    expect(host.value).to.equal('');
    expect(input.value).to.equal('');
    expect(inputEventCount).to.equal(1);
    expect(host.shadowRoot?.activeElement).to.equal(input);
    expect(clearButton.hidden).to.equal(true);
  });

  it('combobox aria・describedby・native hints・imperative API を内部 input へ反映すること', async () => {
    const host = await fixture<SearchField>(html`
      <ui-search-field
        label="検索"
        hide-label
        value="router"
        .inputRole=${'combobox'}
        .inputAriaExpanded=${'true'}
        .inputAriaAutocomplete=${'list'}
        .inputAriaControls=${'search-listbox'}
        .inputAriaActivedescendant=${'search-option-0'}
        .inputAriaBusy=${'false'}
        .inputAriaDescribedby=${'search-help search-shortcut'}
        enterkeyhint="search"
        inputmode="search"
        spellcheck="false"
        autocapitalize="off"
      ></ui-search-field>
    `);

    await flush(host);

    const input = getInput(host);
    const clearButton = getClearButton(host);

    host.focus();
    host.setSelectionRange(0, 3);
    await nextAnimationFrame();

    expect(input.getAttribute('role')).to.equal('combobox');
    expect(input.getAttribute('aria-expanded')).to.equal('true');
    expect(input.getAttribute('aria-autocomplete')).to.equal('list');
    expect(input.getAttribute('aria-controls')).to.equal('search-listbox');
    expect(input.getAttribute('aria-activedescendant')).to.equal('search-option-0');
    expect(input.getAttribute('aria-busy')).to.equal('false');
    expect(input.getAttribute('aria-describedby')).to.equal('search-help search-shortcut');
    expect(input.getAttribute('enterkeyhint')).to.equal('search');
    expect(input.getAttribute('inputmode')).to.equal('search');
    expect(input.getAttribute('spellcheck')).to.equal('false');
    expect(input.getAttribute('autocapitalize')).to.equal('off');
    expect(input.selectionStart).to.equal(0);
    expect(input.selectionEnd).to.equal(3);

    host.focusClearButton();
    await nextAnimationFrame();

    expect(host.shadowRoot?.activeElement).to.equal(clearButton);
  });

  it('readonly / disabled では clear affordance を抑止し、clear() が no-op であること', async () => {
    const readonlyHost = await fixture<SearchField>(html`
      <ui-search-field label="検索" hide-label value="router" readonly></ui-search-field>
    `);

    const disabledHost = await fixture<SearchField>(html`
      <ui-search-field label="検索" hide-label value="router" disabled></ui-search-field>
    `);

    await flush(readonlyHost);
    await flush(disabledHost);

    const readonlyInput = getInput(readonlyHost);
    const disabledInput = getInput(disabledHost);
    const readonlyClearButton = getClearButton(readonlyHost);
    const disabledClearButton = getClearButton(disabledHost);

    expect(readonlyInput.readOnly).to.equal(true);
    expect(disabledInput.disabled).to.equal(true);
    expect(readonlyHost.clearButtonVisible).to.equal(false);
    expect(disabledHost.clearButtonVisible).to.equal(false);
    expect(readonlyClearButton.hidden).to.equal(true);
    expect(disabledClearButton.hidden).to.equal(true);

    readonlyHost.clear();
    disabledHost.clear();
    await flush(readonlyHost);
    await flush(disabledHost);

    expect(readonlyHost.value).to.equal('router');
    expect(disabledHost.value).to.equal('router');
    expect(readonlyInput.value).to.equal('router');
    expect(disabledInput.value).to.equal('router');
  });
});
