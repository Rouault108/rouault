import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/tooltip/tooltip.js';
import type { UiTooltip } from '../../src/components/ui/tooltip/tooltip.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const getTooltipId = (host: UiTooltip): string => host.dataset['tooltipId'] ?? '';

const getTooltipElement = (host: UiTooltip): HTMLElement | null => {
  const id = getTooltipId(host);
  return id === '' ? null : document.getElementById(id);
};

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

describe('ui-tooltip browser contract', () => {
  it('focus で開き、aria-describedby を付与し、Escape で閉じること', async () => {
    const tooltip = await fixture<UiTooltip>(html`
      <ui-tooltip text="保存の補足説明です。">
        <button id="trigger" type="button">保存</button>
      </ui-tooltip>
    `);

    await waitForLitUpdate(tooltip);

    const trigger = expectPresent(tooltip.querySelector<HTMLButtonElement>('#trigger'), 'trigger');

    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
    await waitForLitUpdate(tooltip);
    await nextAnimationFrame();
    await nextAnimationFrame();

    const tooltipElement = expectPresent(getTooltipElement(tooltip), 'tooltipElement');
    expect(tooltipElement.getAttribute('role')).to.equal('tooltip');
    expect(tooltipElement.dataset['open']).to.equal('true');
    expect(trigger.getAttribute('aria-describedby')).to.contain(tooltipElement.id);

    dispatchKey(trigger, 'Escape');
    await waitForLitUpdate(tooltip);
    await nextAnimationFrame();

    expect(getTooltipElement(tooltip)).to.equal(null);
    expect(trigger.hasAttribute('aria-describedby')).to.equal(false);
  });

  it('hover で document.body に tooltip を出し、disabled 化で閉じること', async () => {
    const tooltip = await fixture<UiTooltip>(html`
      <ui-tooltip text="削除は元に戻せません。" variant="inverse" placement="right">
        <button id="trigger" type="button">削除</button>
      </ui-tooltip>
    `);

    await waitForLitUpdate(tooltip);

    const trigger = expectPresent(tooltip.querySelector<HTMLButtonElement>('#trigger'), 'trigger');

    trigger.dispatchEvent(new MouseEvent('mouseenter', { composed: true }));
    await waitForLitUpdate(tooltip);
    await nextAnimationFrame();
    await nextAnimationFrame();

    const tooltipElement = expectPresent(getTooltipElement(tooltip), 'tooltipElement');
    expect(tooltipElement.dataset['variant']).to.equal('inverse');
    expect(tooltipElement.dataset['open']).to.equal('true');

    tooltip.disabled = true;
    await waitForLitUpdate(tooltip);
    await nextAnimationFrame();

    expect(getTooltipElement(tooltip)).to.equal(null);

    trigger.dispatchEvent(new MouseEvent('mouseenter', { composed: true }));
    await waitForLitUpdate(tooltip);
    await nextAnimationFrame();

    expect(getTooltipElement(tooltip)).to.equal(null);
  });

  it('空文字 text では tooltip を出さないこと', async () => {
    const tooltip = await fixture<UiTooltip>(html`
      <ui-tooltip text="   ">
        <button id="trigger" type="button">空テキスト</button>
      </ui-tooltip>
    `);

    await waitForLitUpdate(tooltip);

    const trigger = expectPresent(tooltip.querySelector<HTMLButtonElement>('#trigger'), 'trigger');

    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
    await waitForLitUpdate(tooltip);
    await nextAnimationFrame();

    expect(getTooltipElement(tooltip)).to.equal(null);
  });
});
