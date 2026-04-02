import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/slider/slider.js';
import type { Slider } from '../../src/components/ui/slider/slider.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (slider: Slider): Promise<void> => {
  await waitForLitUpdate(slider);
  await nextAnimationFrame();
  await waitForLitUpdate(slider);
};

const getInput = (slider: Slider): HTMLInputElement =>
  expectPresent(slider.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]'), 'input');

const getFill = (slider: Slider): HTMLElement =>
  expectPresent(slider.shadowRoot?.querySelector<HTMLElement>('.fill'), 'fill');

describe('ui-slider browser contract', () => {
  it('input/change を発火し、PageUp/PageDown を含む keyboard interaction を公開すること', async () => {
    const slider = await fixture<Slider>(html`
      <ui-slider label="イベントテスト" min="0" max="100" step="5" value="50"></ui-slider>
    `);

    await flush(slider);

    const input = getInput(slider);

    let inputCount = 0;
    let changeCount = 0;
    slider.addEventListener('input', () => {
      inputCount += 1;
    });
    slider.addEventListener('change', () => {
      changeCount += 1;
    });

    input.value = '75';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await flush(slider);

    expect(slider.value).to.equal(75);

    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await flush(slider);

    expect(changeCount).to.equal(1);
    expect(inputCount).to.equal(1);

    input.focus();
    dispatchKey(input, 'PageDown');
    await flush(slider);
    expect(slider.value).to.equal(25);

    dispatchKey(input, 'PageUp');
    await flush(slider);
    expect(slider.value).to.equal(75);

    slider.focus();
    await nextAnimationFrame();
    expect(slider.shadowRoot?.activeElement).to.equal(input);
  });

  it('min/max/step/value の正規化と clamp/snap/precision を行うこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-slider id="swap" label="swap" min="100" max="0" value="50"></ui-slider>
        <ui-slider id="step" label="step" min="0" max="100" .step=${0} value="50"></ui-slider>
        <ui-slider id="high" label="high" min="0" max="100" value="150"></ui-slider>
        <ui-slider id="low" label="low" min="0" max="100" value="-10"></ui-slider>
        <ui-slider id="decimal" label="decimal" min="0" max="2" step="0.1" value="1.5"></ui-slider>
        <ui-slider id="unspecified" label="unspecified" min="20" max="80"></ui-slider>
        <ui-slider id="snap" label="snap" min="0" max="100" step="10" .value=${35}></ui-slider>
      </div>
    `);

    const swap = expectPresent(wrapper.querySelector<Slider>('#swap'), 'swap');
    const stepFallback = expectPresent(wrapper.querySelector<Slider>('#step'), 'stepFallback');
    const high = expectPresent(wrapper.querySelector<Slider>('#high'), 'high');
    const low = expectPresent(wrapper.querySelector<Slider>('#low'), 'low');
    const decimal = expectPresent(wrapper.querySelector<Slider>('#decimal'), 'decimal');
    const unspecified = expectPresent(wrapper.querySelector<Slider>('#unspecified'), 'unspecified');
    const snap = expectPresent(wrapper.querySelector<Slider>('#snap'), 'snap');

    await Promise.all([
      flush(swap),
      flush(stepFallback),
      flush(high),
      flush(low),
      flush(decimal),
      flush(unspecified),
      flush(snap),
    ]);

    const swapInput = getInput(swap);
    expect(Number(swapInput.min)).to.equal(0);
    expect(Number(swapInput.max)).to.equal(100);

    expect(Number(getInput(stepFallback).step)).to.equal(1);
    expect(high.value).to.equal(100);
    expect(low.value).to.equal(0);
    expect(decimal.value).to.equal(1.5);

    const decimalInput = getInput(decimal);
    decimalInput.value = '0.3';
    decimalInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await flush(decimal);
    expect(String(decimal.value)).to.equal('0.3');

    expect(unspecified.value).to.equal(20);
    expect(getFill(unspecified).style.width).to.equal('0%');
    expect(snap.value).to.equal(40);
  });

  it('disabled では click / keydown でも値もイベントも変化しないこと', async () => {
    const slider = await fixture<Slider>(html`
      <ui-slider label="disabled" min="0" max="100" value="50" disabled></ui-slider>
    `);

    await flush(slider);

    const input = getInput(slider);

    let inputCount = 0;
    let changeCount = 0;
    slider.addEventListener('input', () => {
      inputCount += 1;
    });
    slider.addEventListener('change', () => {
      changeCount += 1;
    });

    input.click();
    dispatchKey(input, 'PageUp');
    await flush(slider);

    expect(slider.value).to.equal(50);
    expect(inputCount).to.equal(0);
    expect(changeCount).to.equal(0);
  });

  it('min===max と negative range をクラッシュなく処理し、fill を整合させること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-slider id="zero-range" label="zero" min="50" max="50" value="50"></ui-slider>
        <ui-slider id="negative" label="negative" min="-50" max="50" value="0"></ui-slider>
      </div>
    `);

    const zeroRange = expectPresent(wrapper.querySelector<Slider>('#zero-range'), 'zeroRange');
    const negative = expectPresent(wrapper.querySelector<Slider>('#negative'), 'negative');

    await flush(zeroRange);
    await flush(negative);

    expect(zeroRange.value).to.equal(50);
    expect(getInput(zeroRange)).to.be.instanceOf(HTMLInputElement);

    expect(negative.value).to.equal(0);
    expect(getFill(negative).style.width).to.equal('50%');
  });

  it('label 未指定時は fallback aria-label=Slider を使うこと', async () => {
    const slider = await fixture<Slider>(html`
      <ui-slider min="0" max="100" value="20"></ui-slider>
    `);

    await flush(slider);

    const input = getInput(slider);
    expect(input.getAttribute('aria-label')).to.equal('Slider');
  });
});
