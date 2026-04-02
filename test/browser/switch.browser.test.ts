import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/switch/switch.js';
import type { Switch } from '../../src/components/ui/switch/switch.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (sw: Switch): Promise<void> => {
  await waitForLitUpdate(sw);
  await nextAnimationFrame();
  await waitForLitUpdate(sw);
};

const getTrack = (sw: Switch): HTMLElement =>
  expectPresent(sw.shadowRoot?.querySelector<HTMLElement>('.track'), 'track');

const getLabel = (sw: Switch): HTMLLabelElement | null =>
  sw.shadowRoot?.querySelector<HTMLLabelElement>('.label') ?? null;

describe('ui-switch browser contract', () => {
  it('既定状態で role=switch / aria-checked=false / tabindex=0 / label 関連付けを持つこと', async () => {
    const sw = await fixture<Switch>(html` <ui-switch label="ダークモード"></ui-switch> `);

    await flush(sw);

    const track = getTrack(sw);
    const label = expectPresent(getLabel(sw), 'label');

    expect(sw.checked).to.equal(false);
    expect(track.getAttribute('role')).to.equal('switch');
    expect(track.getAttribute('aria-checked')).to.equal('false');
    expect(track.getAttribute('tabindex')).to.equal('0');
    expect(track.getAttribute('aria-labelledby')).to.equal(label.id);
    expect(label.textContent?.trim()).to.equal('ダークモード');
  });

  it('track click と label click で checked が反転し change/input を送出すること', async () => {
    const sw = await fixture<Switch>(html` <ui-switch label="通知を受け取る"></ui-switch> `);

    await flush(sw);

    const track = getTrack(sw);
    const label = expectPresent(getLabel(sw), 'label');

    let changeCount = 0;
    let inputCount = 0;

    sw.addEventListener('change', () => {
      changeCount += 1;
    });
    sw.addEventListener('input', () => {
      inputCount += 1;
    });

    track.click();
    await flush(sw);

    expect(sw.checked).to.equal(true);
    expect(track.getAttribute('aria-checked')).to.equal('true');

    label.click();
    await flush(sw);

    expect(sw.checked).to.equal(false);
    expect(track.getAttribute('aria-checked')).to.equal('false');
    expect(changeCount).to.equal(2);
    expect(inputCount).to.equal(2);
  });

  it('Space / Enter でトグルし Enter は form submit を発生させないこと', async () => {
    const wrapper = await fixture<HTMLFormElement>(html`
      <form>
        <ui-switch id="form-switch" label="フォーム内"></ui-switch>
        <button type="submit" style="display: none;">submit</button>
      </form>
    `);

    const sw = expectPresent(wrapper.querySelector<Switch>('#form-switch'), 'switch');
    await flush(sw);

    const track = getTrack(sw);

    let submitCount = 0;
    let changeCount = 0;

    wrapper.addEventListener('submit', (event) => {
      event.preventDefault();
      submitCount += 1;
    });

    sw.addEventListener('change', () => {
      changeCount += 1;
    });

    dispatchKey(track, ' ');
    await flush(sw);

    expect(sw.checked).to.equal(true);

    dispatchKey(track, 'Enter');
    await flush(sw);

    expect(sw.checked).to.equal(false);
    expect(changeCount).to.equal(2);
    expect(submitCount).to.equal(0);
  });

  it('disabled では aria-disabled/tabindex=-1 となり click / key / label で変化しないこと', async () => {
    const sw = await fixture<Switch>(html`
      <ui-switch label="変更不可" checked disabled></ui-switch>
    `);

    await flush(sw);

    const track = getTrack(sw);
    const label = expectPresent(getLabel(sw), 'label');

    let changeCount = 0;
    let inputCount = 0;

    sw.addEventListener('change', () => {
      changeCount += 1;
    });
    sw.addEventListener('input', () => {
      inputCount += 1;
    });

    expect(sw.disabled).to.equal(true);
    expect(track.getAttribute('aria-disabled')).to.equal('true');
    expect(track.getAttribute('tabindex')).to.equal('-1');

    track.click();
    dispatchKey(track, ' ');
    label.click();
    await flush(sw);

    expect(sw.checked).to.equal(true);
    expect(changeCount).to.equal(0);
    expect(inputCount).to.equal(0);

    const wrapper = expectPresent(sw.shadowRoot?.querySelector<HTMLElement>('.wrapper'), 'wrapper');
    const wrapperStyle = getComputedStyle(wrapper);
    expect(wrapperStyle.pointerEvents).to.equal('none');
  });

  it('label が空の場合は host aria-label を track へ委譲し label 要素を描画しないこと', async () => {
    const sw = await fixture<Switch>(html`
      <ui-switch aria-label="ラベルなしスイッチ"></ui-switch>
    `);

    await flush(sw);

    const track = getTrack(sw);

    expect(getLabel(sw)).to.equal(null);
    expect(track.getAttribute('aria-label')).to.equal('ラベルなしスイッチ');
    expect(track.hasAttribute('aria-labelledby')).to.equal(false);
  });

  it('focus()/blur() が内部 track へ委譲されること', async () => {
    const sw = await fixture<Switch>(html` <ui-switch label="フォーカス確認"></ui-switch> `);

    await flush(sw);

    const track = getTrack(sw);

    sw.focus();
    await nextAnimationFrame();

    expect(sw.shadowRoot?.activeElement).to.equal(track);

    sw.blur();
    await nextAnimationFrame();

    expect(sw.shadowRoot?.activeElement).to.equal(null);
  });
});
