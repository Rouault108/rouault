import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/checkbox/checkbox.js';
import type { Checkbox } from '../../src/components/ui/checkbox/checkbox.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (checkbox: Checkbox): Promise<void> => {
  await waitForLitUpdate(checkbox);
  await nextAnimationFrame();
  await waitForLitUpdate(checkbox);
};

const getControl = (checkbox: Checkbox): HTMLElement =>
  expectPresent(checkbox.shadowRoot?.querySelector<HTMLElement>('.control'), 'control');

const getLabel = (checkbox: Checkbox): HTMLLabelElement | null =>
  checkbox.shadowRoot?.querySelector<HTMLLabelElement>('.label') ?? null;

const getErrorMessage = (checkbox: Checkbox): HTMLElement | null =>
  checkbox.shadowRoot?.querySelector<HTMLElement>('.error-message') ?? null;

describe('ui-checkbox browser contract', () => {
  it('既定状態で role / aria / tabindex / label 関連付けを満たすこと', async () => {
    const checkbox = await fixture<Checkbox>(html`
      <ui-checkbox label="利用規約に同意する" name="agree" value="yes"></ui-checkbox>
    `);

    await flush(checkbox);

    const control = getControl(checkbox);
    const label = expectPresent(getLabel(checkbox), 'label');

    expect(checkbox.checked).to.equal(false);
    expect(checkbox.indeterminate).to.equal(false);

    expect(control.getAttribute('role')).to.equal('checkbox');
    expect(control.getAttribute('aria-checked')).to.equal('false');
    expect(control.getAttribute('tabindex')).to.equal('0');
    expect(control.getAttribute('data-state')).to.equal('unchecked');
    expect(control.getAttribute('aria-labelledby')).to.equal(label.id);
    expect(control.getAttribute('aria-label')).to.equal(null);
  });

  it('click と Space で checked を反転し、input / change を送出すること', async () => {
    const checkbox = await fixture<Checkbox>(html`
      <ui-checkbox label="通知を受け取る"></ui-checkbox>
    `);

    await flush(checkbox);

    const control = getControl(checkbox);

    let inputCount = 0;
    let changeCount = 0;

    checkbox.addEventListener('input', () => {
      inputCount += 1;
    });

    checkbox.addEventListener('change', () => {
      changeCount += 1;
    });

    control.click();
    await flush(checkbox);

    expect(checkbox.checked).to.equal(true);
    expect(checkbox.indeterminate).to.equal(false);
    expect(control.getAttribute('aria-checked')).to.equal('true');
    expect(control.getAttribute('data-state')).to.equal('checked');

    dispatchKey(control, ' ');
    await flush(checkbox);

    expect(checkbox.checked).to.equal(false);
    expect(control.getAttribute('aria-checked')).to.equal('false');
    expect(control.getAttribute('data-state')).to.equal('unchecked');

    expect(inputCount).to.equal(2);
    expect(changeCount).to.equal(2);
  });

  it('indeterminate は click/Space で unchecked へ遷移し mixed を解除すること', async () => {
    const checkbox = await fixture<Checkbox>(html`
      <ui-checkbox label="すべて選択"></ui-checkbox>
    `);

    checkbox.indeterminate = true;
    await flush(checkbox);

    const control = getControl(checkbox);

    expect(checkbox.indeterminate).to.equal(true);
    expect(checkbox.checked).to.equal(false);
    expect(control.getAttribute('aria-checked')).to.equal('mixed');
    expect(control.getAttribute('data-state')).to.equal('mixed');

    control.click();
    await flush(checkbox);

    expect(checkbox.indeterminate).to.equal(false);
    expect(checkbox.checked).to.equal(false);
    expect(control.getAttribute('aria-checked')).to.equal('false');
    expect(control.getAttribute('data-state')).to.equal('unchecked');
  });

  it('checked=true にすると indeterminate を自動解除すること', async () => {
    const checkbox = await fixture<Checkbox>(html`
      <ui-checkbox label="一括選択"></ui-checkbox>
    `);

    checkbox.indeterminate = true;
    await flush(checkbox);

    checkbox.checked = true;
    await flush(checkbox);

    const control = getControl(checkbox);

    expect(checkbox.checked).to.equal(true);
    expect(checkbox.indeterminate).to.equal(false);
    expect(control.getAttribute('aria-checked')).to.equal('true');
    expect(control.getAttribute('data-state')).to.equal('checked');
  });

  it('label click で focus を control へ移しつつ toggle すること', async () => {
    const checkbox = await fixture<Checkbox>(html`
      <ui-checkbox label="ラベルクリック"></ui-checkbox>
    `);

    await flush(checkbox);

    const control = getControl(checkbox);
    const label = expectPresent(getLabel(checkbox), 'label');

    label.click();
    await flush(checkbox);

    expect(checkbox.checked).to.equal(true);
    expect(checkbox.shadowRoot?.activeElement).to.equal(control);
  });

  it('disabled では click / Space / label click で状態が変化しないこと', async () => {
    const checkbox = await fixture<Checkbox>(html`
      <ui-checkbox label="変更不可" checked disabled></ui-checkbox>
    `);

    await flush(checkbox);

    const control = getControl(checkbox);
    const label = expectPresent(getLabel(checkbox), 'label');

    let inputCount = 0;
    let changeCount = 0;

    checkbox.addEventListener('input', () => {
      inputCount += 1;
    });

    checkbox.addEventListener('change', () => {
      changeCount += 1;
    });

    control.click();
    dispatchKey(control, ' ');
    label.click();
    await flush(checkbox);

    expect(checkbox.checked).to.equal(true);
    expect(control.getAttribute('aria-disabled')).to.equal('true');
    expect(control.getAttribute('tabindex')).to.equal('-1');
    expect(inputCount).to.equal(0);
    expect(changeCount).to.equal(0);
  });

  it('required / invalid / errorMessage / aria-describedby を同期すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <p id="external-help">外部説明</p>
        <ui-checkbox
          label="必須チェック"
          required
          invalid
          error-message="この項目は必須です"
          aria-describedby="external-help"
        ></ui-checkbox>
      </div>
    `);

    const checkbox = expectPresent(wrapper.querySelector<Checkbox>('ui-checkbox'), 'checkbox');
    await flush(checkbox);

    const control = getControl(checkbox);
    const errorMessage = expectPresent(getErrorMessage(checkbox), 'error message');

    expect(control.getAttribute('aria-required')).to.equal('true');
    expect(control.getAttribute('aria-invalid')).to.equal('true');

    const describedBy = control.getAttribute('aria-describedby') ?? '';
    expect(describedBy.includes('external-help')).to.equal(true);
    expect(describedBy.includes(errorMessage.id)).to.equal(true);

    expect(errorMessage.getAttribute('role')).to.equal('status');
    expect(errorMessage.getAttribute('aria-live')).to.equal('polite');
    expect(errorMessage.textContent?.trim()).to.equal('この項目は必須です');
  });

  it('label がない場合は aria-label / aria-labelledby を control へ委譲すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <span id="external-label">外部ラベル</span>
        <ui-checkbox id="with-aria-label" aria-label="単独ラベル"></ui-checkbox>
        <ui-checkbox id="with-labelledby" aria-labelledby="external-label"></ui-checkbox>
      </div>
    `);

    const withAriaLabel = expectPresent(
      wrapper.querySelector<Checkbox>('#with-aria-label'),
      'with aria-label',
    );
    const withLabelledBy = expectPresent(
      wrapper.querySelector<Checkbox>('#with-labelledby'),
      'with aria-labelledby',
    );

    await flush(withAriaLabel);
    await flush(withLabelledBy);

    const controlWithAriaLabel = getControl(withAriaLabel);
    const controlWithLabelledBy = getControl(withLabelledBy);

    expect(controlWithAriaLabel.getAttribute('aria-label')).to.equal('単独ラベル');
    expect(controlWithAriaLabel.hasAttribute('aria-labelledby')).to.equal(false);

    expect(controlWithLabelledBy.getAttribute('aria-labelledby')).to.equal('external-label');
    expect(controlWithLabelledBy.hasAttribute('aria-label')).to.equal(false);
  });

  it('focus()/blur() が内部 control へ委譲されること', async () => {
    const checkbox = await fixture<Checkbox>(html`
      <ui-checkbox label="フォーカス確認"></ui-checkbox>
    `);

    await flush(checkbox);

    const control = getControl(checkbox);

    checkbox.focus();
    await nextAnimationFrame();

    expect(checkbox.shadowRoot?.activeElement).to.equal(control);

    checkbox.blur();
    await nextAnimationFrame();

    expect(checkbox.shadowRoot?.activeElement).to.equal(null);
  });

  it('formResetCallback / formStateRestoreCallback が checked を復元し indeterminate は復元しないこと', async () => {
    const checkbox = await fixture<Checkbox>(html`
      <ui-checkbox label="フォーム復元" checked></ui-checkbox>
    `);

    await flush(checkbox);

    checkbox.checked = false;
    checkbox.indeterminate = true;
    checkbox.formResetCallback();
    await flush(checkbox);

    expect(checkbox.checked).to.equal(true);
    expect(checkbox.indeterminate).to.equal(false);

    checkbox.formStateRestoreCallback('unchecked');
    await flush(checkbox);

    expect(checkbox.checked).to.equal(false);
    expect(checkbox.indeterminate).to.equal(false);

    checkbox.formStateRestoreCallback('checked');
    await flush(checkbox);

    expect(checkbox.checked).to.equal(true);
    expect(checkbox.indeterminate).to.equal(false);

    checkbox.formStateRestoreCallback(null);
    await flush(checkbox);

    expect(checkbox.checked).to.equal(false);
    expect(checkbox.indeterminate).to.equal(false);
  });
});