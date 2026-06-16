import { expect, fixture, html } from '@open-wc/testing';

import {
  compositeOver,
  contrastRatio,
  expectColorClose,
  parseColor,
  resolveComputedColor,
  resolvePaintedElementBackground,
  resolvePseudoColor,
  type Rgba,
} from './color-contrast.js';
import { waitForStyleRecalc } from './wait-for-lit.js';

const rgba = (r: number, g: number, b: number, a = 1): Rgba => ({ r, g, b, a });

describe('color contrast helper', () => {
  it('parses common rgb and CSS Color 4 syntaxes', () => {
    expect(parseColor('rgb(1, 2, 3)')).to.deep.equal(rgba(1, 2, 3, 1));
    expect(parseColor('rgba(1, 2, 3, 0.5)')).to.deep.equal(rgba(1, 2, 3, 0.5));
    expect(parseColor('rgb(10 20 30 / 40%)')).to.deep.equal(rgba(10, 20, 30, 0.4));
    expect(parseColor('color(srgb 0.1 0.2 0.3 / 0.4)')).to.deep.equal(rgba(26, 51, 77, 0.4));
    expect(parseColor('oklab(0.55 -0.068404 -0.187939 / 0.76)').a).to.be.closeTo(0.76, 0.01);
    expect(parseColor('transparent')).to.deep.equal(rgba(0, 0, 0, 0));
  });

  it('resolves currentColor and nested var fallbacks', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="color: rgb(10, 20, 30); --a: var(--b, rgb(1, 2, 3));"></div>
    `);
    expect(resolveComputedColor('currentColor', wrapper, 'color')).to.deep.equal(rgba(10, 20, 30));
    expect(resolveComputedColor('var(--a)', wrapper, 'color')).to.deep.equal(rgba(1, 2, 3));
  });

  it('resolves OKLCH, relative OKLCH, and OKLab color-mix values', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div
        style="--primary: oklch(55% 0.2 250); --fg-default: oklch(20% 0 0); --fg-muted: oklch(45% 0 0);"
      ></div>
    `);
    expect(resolveComputedColor('oklch(55% 0.2 250)', wrapper, 'color').a).to.equal(1);
    expect(
      resolveComputedColor('oklch(from var(--primary) l c h / 0.5)', wrapper, 'color').a,
    ).to.equal(0.5);
    expect(
      resolveComputedColor('color-mix(in oklab, var(--primary) 76%, transparent)', wrapper, 'color')
        .a,
    ).to.be.closeTo(0.76, 0.01);
    expect(
      resolveComputedColor(
        'color-mix(in oklab, var(--fg-default) 62%, var(--fg-muted) 38%)',
        wrapper,
        'color',
      ).a,
    ).to.equal(1);
  });

  it('uses pseudo-element computed color as currentColor base', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <style>
          .target {
            color: rgb(1, 2, 3);
          }
          .target::before {
            content: '';
            color: rgb(4, 5, 6);
            background: currentColor;
          }
        </style>
        <div class="target"></div>
      </div>
    `);
    const target = wrapper.querySelector('.target');
    if (!(target instanceof HTMLElement)) throw new Error('target が見つかりません');
    expect(resolvePseudoColor(target, '::before', 'background-color')).to.deep.equal(rgba(4, 5, 6));
  });

  it('resolves painted background across shadow host and fallback root', async () => {
    const wrapper = await fixture<HTMLDivElement>(
      html`<div style="background: rgb(240, 240, 240);"></div>`,
    );
    const host = document.createElement('div');
    host.style.backgroundColor = 'rgba(10, 20, 30, 0.5)';
    wrapper.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const target = document.createElement('span');
    target.style.backgroundColor = 'rgba(20, 30, 40, 0.5)';
    shadow.append(target);
    await waitForStyleRecalc();

    const painted = resolvePaintedElementBackground(target, wrapper);
    expect(painted.a).to.equal(1);
    expect(contrastRatio(rgba(0, 0, 0), painted)).to.be.greaterThan(1);
  });

  it('composites alpha foreground over opaque background', () => {
    const result = compositeOver(rgba(255, 0, 0, 0.5), rgba(0, 0, 255, 1));
    expectColorClose(result, rgba(128, 0, 128, 1), 1);
  });
});
