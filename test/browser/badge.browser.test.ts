import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/badge/badge.js';
import type { Badge } from '../../src/components/ui/badge/badge.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const getBadge = (root: ParentNode, selector: string): Badge =>
  expectPresent(root.querySelector<Badge>(selector), selector);

const getSpan = (badge: Badge): HTMLSpanElement =>
  expectPresent(badge.shadowRoot?.querySelector<HTMLSpanElement>('span'), `${badge.id} span`);

const getStatus = (badge: Badge): HTMLElement | null =>
  badge.shadowRoot?.querySelector<HTMLElement>('[role="status"]') ?? null;

const getImg = (badge: Badge): HTMLElement | null =>
  badge.shadowRoot?.querySelector<HTMLElement>('[role="img"]') ?? null;

const hasSlot = (badge: Badge): boolean => (badge.shadowRoot?.querySelector('slot') ?? null) !== null;

const text = (value: string | null | undefined): string => value?.replace(/\s+/g, ' ').trim() ?? '';

describe('ui-badge browser contract', () => {
  it('既定状態では slot 表示の solid / primary / announce=off として成立すること', async () => {
    const badge = await fixture<Badge>(html`
      <ui-badge id="default-badge">New</ui-badge>
    `);

    await badge.updateComplete;

    expect(badge.variant).to.equal('solid');
    expect(badge.color).to.equal('primary');
    expect(badge.announce).to.equal('off');

    expect(badge.getAttribute('data-render-state')).to.equal('slot');
    expect(badge.getAttribute('data-variant')).to.equal('solid');
    expect(badge.getAttribute('data-color')).to.equal('primary');

    expect(text(getSpan(badge).textContent)).to.equal('New');
    expect(hasSlot(badge)).to.equal(true);
    expect(getStatus(badge)).to.equal(null);
    expect(getImg(badge)).to.equal(null);
  });

  it('count 状態では max 正規化・countAriaLabel・announce=auto を反映すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-badge id="count-default" count="128"></ui-badge>
        <ui-badge
          id="count-override"
          count="128"
          count-aria-label="未読 128 件"
          announce="auto"
        ></ui-badge>
        <ui-badge id="count-custom-max" .count=${10} .max=${9}></ui-badge>
      </div>
    `);

    const countDefault = getBadge(wrapper, '#count-default');
    const countOverride = getBadge(wrapper, '#count-override');
    const countCustomMax = getBadge(wrapper, '#count-custom-max');

    await Promise.all([
      countDefault.updateComplete,
      countOverride.updateComplete,
      countCustomMax.updateComplete,
    ]);

    expect(text(getSpan(countDefault).textContent)).to.equal('99+');
    expect(getSpan(countDefault).getAttribute('aria-label')).to.equal('128 件');
    expect(getStatus(countDefault)).to.equal(null);
    expect(hasSlot(countDefault)).to.equal(false);

    const status = expectPresent(getStatus(countOverride), 'count override status');
    expect(text(status.textContent)).to.equal('99+');
    expect(status.getAttribute('aria-label')).to.equal('未読 128 件');
    expect(hasSlot(countOverride)).to.equal(false);

    expect(text(getSpan(countCustomMax).textContent)).to.equal('9+');
  });

  it('dot > count > slot の優先順位と dot 不成立時のフォールバックを守ること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-badge id="dot-valid" variant="dot" count="5" aria-label="未読があります">New</ui-badge>
        <ui-badge id="dot-count-fallback" variant="dot" count="5">New</ui-badge>
        <ui-badge id="dot-slot-fallback" variant="dot">New</ui-badge>
        <ui-badge id="subtle-count" variant="subtle" count="5">New</ui-badge>
      </div>
    `);

    const dotValid = getBadge(wrapper, '#dot-valid');
    const dotCountFallback = getBadge(wrapper, '#dot-count-fallback');
    const dotSlotFallback = getBadge(wrapper, '#dot-slot-fallback');
    const subtleCount = getBadge(wrapper, '#subtle-count');

    await Promise.all([
      dotValid.updateComplete,
      dotCountFallback.updateComplete,
      dotSlotFallback.updateComplete,
      subtleCount.updateComplete,
    ]);

    const img = expectPresent(getImg(dotValid), 'dot valid img');
    expect(img.getAttribute('aria-label')).to.equal('未読があります');
    expect(dotValid.getAttribute('data-render-state')).to.equal('dot');
    expect(dotValid.getAttribute('data-variant')).to.equal('dot');
    expect(hasSlot(dotValid)).to.equal(false);
    expect(getStatus(dotValid)).to.equal(null);

    expect(dotCountFallback.getAttribute('data-render-state')).to.equal('count');
    expect(dotCountFallback.getAttribute('data-variant')).to.equal('solid');
    expect(text(getSpan(dotCountFallback).textContent)).to.equal('5');
    expect(hasSlot(dotCountFallback)).to.equal(false);

    expect(dotSlotFallback.getAttribute('data-render-state')).to.equal('slot');
    expect(dotSlotFallback.getAttribute('data-variant')).to.equal('solid');
    expect(text(getSpan(dotSlotFallback).textContent)).to.equal('New');
    expect(hasSlot(dotSlotFallback)).to.equal(true);

    expect(subtleCount.getAttribute('data-variant')).to.equal('subtle');
    expect(text(getSpan(subtleCount).textContent)).to.equal('5');
    expect(hasSlot(subtleCount)).to.equal(false);
  });

  it('count と max を契約どおりに正規化すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-badge id="norm-nan" .count=${Number.NaN}>Fallback</ui-badge>
        <ui-badge id="norm-inf" .count=${Number.POSITIVE_INFINITY}>Fallback</ui-badge>
        <ui-badge id="norm-negative" .count=${-5}></ui-badge>
        <ui-badge id="norm-float" .count=${3.9}></ui-badge>
        <ui-badge id="norm-empty"></ui-badge>

        <ui-badge id="max-zero" .count=${5} .max=${0}></ui-badge>
        <ui-badge id="max-float" .count=${11} .max=${10.9}></ui-badge>
        <ui-badge id="max-nan" .count=${100} .max=${Number.NaN}></ui-badge>
      </div>
    `);

    const normNan = getBadge(wrapper, '#norm-nan');
    const normInf = getBadge(wrapper, '#norm-inf');
    const normNegative = getBadge(wrapper, '#norm-negative');
    const normFloat = getBadge(wrapper, '#norm-float');
    const normEmpty = getBadge(wrapper, '#norm-empty');

    const maxZero = getBadge(wrapper, '#max-zero');
    const maxFloat = getBadge(wrapper, '#max-float');
    const maxNan = getBadge(wrapper, '#max-nan');

    await Promise.all([
      normNan.updateComplete,
      normInf.updateComplete,
      normNegative.updateComplete,
      normFloat.updateComplete,
      normEmpty.updateComplete,
      maxZero.updateComplete,
      maxFloat.updateComplete,
      maxNan.updateComplete,
    ]);

    expect(normNan.getAttribute('data-render-state')).to.equal('slot');
    expect(normInf.getAttribute('data-render-state')).to.equal('slot');
    expect(hasSlot(normNan)).to.equal(true);
    expect(hasSlot(normInf)).to.equal(true);

    expect(text(getSpan(normNegative).textContent)).to.equal('0');
    expect(text(getSpan(normFloat).textContent)).to.equal('3');

    expect(normEmpty.getAttribute('data-render-state')).to.equal('empty');
    expect(getComputedStyle(normEmpty).display).to.equal('none');

    expect(text(getSpan(maxZero).textContent)).to.equal('1+');
    expect(text(getSpan(maxFloat).textContent)).to.equal('10+');
    expect(text(getSpan(maxNan).textContent)).to.equal('99+');
  });

  it('非インタラクティブであり host に role や tabindex を持たないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-badge id="non-interactive-solid" count="5"></ui-badge>
        <ui-badge id="non-interactive-subtle" variant="subtle">Beta</ui-badge>
        <ui-badge id="non-interactive-dot" variant="dot" aria-label="更新があります"></ui-badge>
      </div>
    `);

    const badges = [
      getBadge(wrapper, '#non-interactive-solid'),
      getBadge(wrapper, '#non-interactive-subtle'),
      getBadge(wrapper, '#non-interactive-dot'),
    ];

    await Promise.all(badges.map((badge) => badge.updateComplete));

    for (const badge of badges) {
      expect(badge.hasAttribute('tabindex')).to.equal(false);
      expect(badge.hasAttribute('disabled')).to.equal(false);
      expect(badge.hasAttribute('aria-disabled')).to.equal(false);
      expect(badge.hasAttribute('role')).to.equal(false);
    }
  });
});