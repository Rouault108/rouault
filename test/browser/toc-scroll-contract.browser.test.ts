import { expect } from '@open-wc/testing';

import { getRootScrollingElement } from '../../src/router/root-scroll.js';
import {
  canSkipTocScrollForTarget,
  hasProgrammaticTargetSettled,
  readComputedPx,
  resolveTocActivationOffset,
  resolveTocScrollMetrics,
} from '../../src/toc/toc-scroll-contract.js';

describe('toc-scroll-contract', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.style.scrollPaddingTop = '';
  });

  it('computed scroll-padding-top と heading scroll-margin-top から activation offset を作ること', () => {
    document.body.innerHTML = `<article><h2 id="target">Target</h2></article>`;
    const target = document.getElementById('target');
    if (!(target instanceof HTMLElement)) {
      throw new Error('scroll contract fixture の構築に失敗しました。');
    }

    document.documentElement.style.scrollPaddingTop = '48px';
    target.style.scrollMarginTop = '32px';

    expect(resolveTocActivationOffset(target)).to.equal(80);
  });

  it('非数値と負値の computed px は 0 に丸めること', () => {
    expect(readComputedPx('auto')).to.equal(0);
    expect(readComputedPx('')).to.equal(0);
    expect(readComputedPx('NaN')).to.equal(0);
    expect(readComputedPx('Infinity')).to.equal(0);
    expect(readComputedPx('-16px')).to.equal(0);
    expect(readComputedPx('12.5px')).to.equal(12.5);
  });

  it('idealTargetY と targetY を activation offset で算出し root scroll 範囲へ clamp すること', () => {
    document.body.innerHTML = `<article><h2 id="target">Target</h2></article>`;
    const target = document.getElementById('target');
    if (!(target instanceof HTMLElement)) {
      throw new Error('scroll contract fixture の構築に失敗しました。');
    }

    document.documentElement.style.scrollPaddingTop = '40px';
    target.style.scrollMarginTop = '12px';

    const root = getRootScrollingElement();
    const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
    const originalScrollTop = Object.getOwnPropertyDescriptor(root, 'scrollTop');
    const originalScrollHeight = Object.getOwnPropertyDescriptor(root, 'scrollHeight');
    const originalClientHeight = Object.getOwnPropertyDescriptor(root, 'clientHeight');

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 100 });
    Object.defineProperty(root, 'scrollTop', { configurable: true, value: 100 });
    Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 400 });
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          x: 0,
          y: 700,
          top: 700,
          left: 0,
          right: 800,
          bottom: 732,
          width: 800,
          height: 32,
          toJSON: () => undefined,
        }) satisfies DOMRect,
    });

    try {
      const metrics = resolveTocScrollMetrics(target);

      expect(metrics.activationOffset).to.equal(52);
      expect(metrics.idealTargetY).to.equal(748);
      expect(metrics.targetY).to.equal(600);
      expect(metrics.isTargetStartClamped).to.equal(false);
      expect(metrics.isTargetEndClamped).to.equal(true);
    } finally {
      if (originalScrollY) {
        Object.defineProperty(window, 'scrollY', originalScrollY);
      } else {
        Reflect.deleteProperty(window, 'scrollY');
      }
      if (originalScrollTop) {
        Object.defineProperty(root, 'scrollTop', originalScrollTop);
      } else {
        Reflect.deleteProperty(root, 'scrollTop');
      }
      if (originalScrollHeight) {
        Object.defineProperty(root, 'scrollHeight', originalScrollHeight);
      } else {
        Reflect.deleteProperty(root, 'scrollHeight');
      }
      if (originalClientHeight) {
        Object.defineProperty(root, 'clientHeight', originalClientHeight);
      } else {
        Reflect.deleteProperty(root, 'clientHeight');
      }
    }
  });

  it('通常整列と end clamp の skip / settle 判定を分けること', () => {
    document.body.innerHTML = `<article><h2 id="target">Target</h2></article>`;
    const target = document.getElementById('target');
    if (!(target instanceof HTMLElement)) {
      throw new Error('scroll contract fixture の構築に失敗しました。');
    }

    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          x: 0,
          y: 112,
          top: 112,
          left: 0,
          right: 800,
          bottom: 144,
          width: 800,
          height: 32,
          toJSON: () => undefined,
        }) satisfies DOMRect,
    });

    const alignedMetrics = {
      idealTargetY: 200,
      targetY: 200,
      activationOffset: 112,
      scrollPaddingTop: 80,
      scrollMarginTop: 32,
      currentScrollY: 200,
      maxScrollY: 800,
      isTargetStartClamped: false,
      isTargetEndClamped: false,
    };

    expect(canSkipTocScrollForTarget(target, alignedMetrics)).to.equal(true);
    expect(hasProgrammaticTargetSettled(target, alignedMetrics)).to.equal(true);

    const endClampedMetrics = {
      ...alignedMetrics,
      idealTargetY: 900,
      targetY: 800,
      maxScrollY: 800,
      isTargetEndClamped: true,
    };

    expect(canSkipTocScrollForTarget(target, endClampedMetrics)).to.equal(false);
    expect(hasProgrammaticTargetSettled(target, endClampedMetrics)).to.equal(false);
  });
});
