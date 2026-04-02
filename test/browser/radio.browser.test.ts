import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/radio/radio.js';
import '../../src/components/ui/radio/radio-group.js';
import type { Radio } from '../../src/components/ui/radio/radio.js';
import type { RadioGroup } from '../../src/components/ui/radio/radio-group.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (...elements: (Radio | RadioGroup)[]): Promise<void> => {
  await Promise.all(elements.map((element) => waitForLitUpdate(element)));
  await nextAnimationFrame();
  await Promise.all(elements.map((element) => waitForLitUpdate(element)));
};

const getControl = (radio: Radio): HTMLElement =>
  expectPresent(radio.shadowRoot?.querySelector<HTMLElement>('.control'), 'control');

const getLabel = (radio: Radio): HTMLElement | null =>
  radio.shadowRoot?.querySelector<HTMLElement>('.label') ?? null;

const getGroupRoot = (group: RadioGroup): HTMLElement =>
  expectPresent(group.shadowRoot?.querySelector<HTMLElement>('.group'), 'group root');

describe('ui-radio browser contract', () => {
  it('既定状態で role/aria/label 関連付けを公開すること', async () => {
    const radio = await fixture<Radio>(html`
      <ui-radio label="選択肢 A" name="default-group" value="a"></ui-radio>
    `);

    await flush(radio);

    const control = getControl(radio);
    const label = expectPresent(getLabel(radio), 'label');

    expect(radio.checked).to.equal(false);
    expect(control.getAttribute('role')).to.equal('radio');
    expect(control.getAttribute('aria-checked')).to.equal('false');
    expect(control.getAttribute('aria-labelledby')).to.equal(label.id);
    expect(control.getAttribute('tabindex')).to.equal('0');
  });

  it('click と label click で選択し、同一 name 内の排他制御と change/input を担保すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-radio id="radio-a" name="click-group" value="a" label="選択肢 A"></ui-radio>
        <ui-radio id="radio-b" name="click-group" value="b" label="選択肢 B" checked></ui-radio>
        <ui-radio id="radio-c" name="click-group" value="c" label="選択肢 C"></ui-radio>
      </div>
    `);

    const radioA = expectPresent(wrapper.querySelector<Radio>('#radio-a'), 'radioA');
    const radioB = expectPresent(wrapper.querySelector<Radio>('#radio-b'), 'radioB');
    const radioC = expectPresent(wrapper.querySelector<Radio>('#radio-c'), 'radioC');

    await flush(radioA, radioB, radioC);

    let inputCount = 0;
    let changeCount = 0;

    radioA.addEventListener('input', () => {
      inputCount += 1;
    });
    radioA.addEventListener('change', () => {
      changeCount += 1;
    });

    getControl(radioA).click();
    await flush(radioA, radioB, radioC);

    expect(radioA.checked).to.equal(true);
    expect(radioB.checked).to.equal(false);
    expect(radioC.checked).to.equal(false);
    expect(changeCount).to.equal(1);
    expect(inputCount).to.equal(1);

    getControl(radioA).click();
    await flush(radioA, radioB, radioC);

    expect(changeCount).to.equal(1);
    expect(inputCount).to.equal(1);

    const label = expectPresent(getLabel(radioC), 'radioC label');
    label.click();
    await flush(radioA, radioB, radioC);

    expect(radioA.checked).to.equal(false);
    expect(radioC.checked).to.equal(true);
  });

  it('Arrow key で循環移動し、disabled を飛ばして roving tabindex と focus を同期すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-radio id="radio-a" name="arrow-group" value="a" label="A" checked></ui-radio>
        <ui-radio id="radio-b" name="arrow-group" value="b" label="B" disabled></ui-radio>
        <ui-radio id="radio-c" name="arrow-group" value="c" label="C"></ui-radio>
      </div>
    `);

    const radioA = expectPresent(wrapper.querySelector<Radio>('#radio-a'), 'radioA');
    const radioB = expectPresent(wrapper.querySelector<Radio>('#radio-b'), 'radioB');
    const radioC = expectPresent(wrapper.querySelector<Radio>('#radio-c'), 'radioC');

    await flush(radioA, radioB, radioC);

    const controlA = getControl(radioA);
    const controlB = getControl(radioB);
    const controlC = getControl(radioC);

    controlA.focus();
    dispatchKey(controlA, 'ArrowDown');
    await flush(radioA, radioB, radioC);

    expect(radioA.checked).to.equal(false);
    expect(radioC.checked).to.equal(true);
    expect(controlA.getAttribute('tabindex')).to.equal('-1');
    expect(controlB.getAttribute('tabindex')).to.equal('-1');
    expect(controlC.getAttribute('tabindex')).to.equal('0');
    expect(radioC.shadowRoot?.activeElement).to.equal(controlC);

    dispatchKey(controlC, 'ArrowDown');
    await flush(radioA, radioB, radioC);

    expect(radioA.checked).to.equal(true);
    expect(radioC.checked).to.equal(false);

    dispatchKey(controlA, 'ArrowUp');
    await flush(radioA, radioB, radioC);

    expect(radioC.checked).to.equal(true);
    expect(radioA.checked).to.equal(false);
  });

  it('ui-radio-group が required 妥当性 / aria / disabled member を含むグループ境界を公開すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <form id="radio-form">
          <ui-radio-group id="group" label="都道府県" required>
            <ui-radio name="prefecture" value="tokyo" label="東京"></ui-radio>
            <ui-radio name="prefecture" value="osaka" label="大阪" disabled></ui-radio>
            <ui-radio name="prefecture" value="fukuoka" label="福岡"></ui-radio>
          </ui-radio-group>
        </form>
      </div>
    `);

    const group = expectPresent(wrapper.querySelector<RadioGroup>('#group'), 'group');
    const radios = Array.from(group.querySelectorAll<Radio>('ui-radio'));
    const [tokyo, osaka, fukuoka] = radios;
    if (!tokyo || !osaka || !fukuoka) {
      throw new Error('group radios が見つかりません');
    }

    await flush(group, tokyo, osaka, fukuoka);

    const groupRoot = getGroupRoot(group);
    expect(groupRoot.getAttribute('role')).to.equal('radiogroup');
    expect(groupRoot.getAttribute('aria-label')).to.equal('都道府県');
    expect(group.checkValidity()).to.equal(false);
    expect(group.reportValidity()).to.equal(false);
    await flush(group, tokyo, osaka, fukuoka);

    expect(group.invalid).to.equal(true);
    expect(groupRoot.getAttribute('aria-invalid')).to.equal('true');

    getControl(fukuoka).click();
    await flush(group, tokyo, osaka, fukuoka);

    expect(group.checkValidity()).to.equal(true);
    expect(group.reportValidity()).to.equal(true);
    expect(group.invalid).to.equal(false);

    const form = expectPresent(wrapper.querySelector<HTMLFormElement>('#radio-form'), 'form');
    const formData = new FormData(form);
    expect(formData.get('prefecture')).to.equal('fukuoka');

    getControl(osaka).click();
    await flush(group, tokyo, osaka, fukuoka);

    expect(osaka.checked).to.equal(false);
    expect(new FormData(form).get('prefecture')).to.equal('fukuoka');
  });

  it('複数 checked の初期衝突と後続の programmatic checked 変更を最後勝ちで正規化すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-radio id="radio-a" name="normalize-group" value="a" label="A" checked></ui-radio>
        <ui-radio id="radio-b" name="normalize-group" value="b" label="B" checked></ui-radio>
        <ui-radio id="radio-c" name="normalize-group" value="c" label="C"></ui-radio>
      </div>
    `);

    const radioA = expectPresent(wrapper.querySelector<Radio>('#radio-a'), 'radioA');
    const radioB = expectPresent(wrapper.querySelector<Radio>('#radio-b'), 'radioB');
    const radioC = expectPresent(wrapper.querySelector<Radio>('#radio-c'), 'radioC');

    await flush(radioA, radioB, radioC);

    expect(radioA.checked).to.equal(false);
    expect(radioB.checked).to.equal(true);
    expect(radioC.checked).to.equal(false);

    radioC.checked = true;
    await flush(radioA, radioB, radioC);

    expect(radioA.checked).to.equal(false);
    expect(radioB.checked).to.equal(false);
    expect(radioC.checked).to.equal(true);
  });
});
