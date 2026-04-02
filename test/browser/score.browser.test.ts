import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/score/score.js';
import type { UiScore } from '../../src/components/ui/score/score.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const MALICIOUS_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" onload="alert(1)">
  <script>alert('xss')</script>
  <rect x="40" y="40" width="720" height="120" fill="black" stroke="#000000" onclick="alert(1)"></rect>
  <a href="javascript:alert(1)">
    <text x="60" y="110">malicious</text>
  </a>
</svg>
`.trim();

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const installResizeObserverStub = (): (() => void) => {
  const original = globalThis.ResizeObserver;

  if (original) {
    return () => {
      globalThis.ResizeObserver = original;
    };
  }

  class ResizeObserverStub {
    observe(_target: Element): void {
      void _target;
      return;
    }

    unobserve(_target: Element): void {
      void _target;
      return;
    }

    disconnect(): void {
      return;
    }
  }

  globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;

  return () => {
    delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  };
};

const flush = async (host: UiScore): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const waitFor = async (
  predicate: () => boolean,
  errorMessage: string,
  maxFrames = 120,
): Promise<void> => {
  for (let frame = 0; frame < maxFrames; frame += 1) {
    if (predicate()) return;
    await nextAnimationFrame();
  }

  throw new Error(errorMessage);
};

describe('ui-score browser contract', () => {
  it('inline SVG slot は aria-hidden 化され、scroll container に label / description を与えること', async () => {
    const restoreResizeObserver = installResizeObserverStub();

    try {
      const host = await fixture<UiScore>(html`
        <ui-score label="譜例1" description="モチーフ例" caption="キャプション">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 220">
            <rect width="920" height="220" fill="white"></rect>
          </svg>
        </ui-score>
      `);

      await flush(host);

      const scroll = expectPresent(
        host.shadowRoot?.querySelector<HTMLElement>('.score-scroll'),
        'score scroll',
      );
      const slottedSvg = expectPresent(host.querySelector<SVGSVGElement>('svg'), 'slotted svg');

      expect(scroll.getAttribute('aria-label')).to.equal('譜例1');
      expect(scroll.getAttribute('aria-describedby')).to.not.equal(null);
      expect(slottedSvg.getAttribute('aria-hidden')).to.equal('true');
      expect(host.shadowRoot?.querySelector('.score-svg-host')).to.equal(null);
    } finally {
      restoreResizeObserver();
    }
  });

  it('runtime eager fetch は SVG をサニタイズし、currentColor へ正規化すること', async () => {
    const restoreResizeObserver = installResizeObserverStub();
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = (async (): Promise<Response> => {
        return new Response(MALICIOUS_SVG, {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' },
        });
      }) as typeof globalThis.fetch;

      const host = await fixture<UiScore>(html`
        <ui-score src="/scores/malicious.svg" loading="eager" label="譜例2"></ui-score>
      `);

      await flush(host);
      await waitFor(
        () => host.shadowRoot?.querySelector('.score-svg-host svg') !== null,
        'runtime SVG が描画されませんでした',
      );

      const runtimeSvg = expectPresent(
        host.shadowRoot?.querySelector<SVGSVGElement>('.score-svg-host svg'),
        'runtime svg',
      );

      expect(runtimeSvg.hasAttribute('onload')).to.equal(false);
      expect(host.shadowRoot?.querySelector('.score-svg-host script')).to.equal(null);
      expect(
        runtimeSvg.querySelector('[href^="javascript:"], [xlink\\:href^="javascript:"]'),
      ).to.equal(null);

      const rect = expectPresent(runtimeSvg.querySelector<SVGRectElement>('rect'), 'rect');
      expect(rect.getAttribute('fill')).to.equal('currentColor');
      expect(rect.getAttribute('stroke')).to.equal('currentColor');
    } finally {
      globalThis.fetch = originalFetch;
      restoreResizeObserver();
    }
  });

  it('overflow 時に fade hint class を更新すること', async () => {
    const restoreResizeObserver = installResizeObserverStub();

    try {
      const host = await fixture<UiScore>(html`
        <ui-score label="譜例3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 260">
            <rect width="1800" height="260" fill="white"></rect>
          </svg>
        </ui-score>
      `);

      await flush(host);

      const scroll = expectPresent(
        host.shadowRoot?.querySelector<HTMLDivElement>('.score-scroll'),
        'score scroll',
      );

      let scrollLeftValue = 0;
      Object.defineProperty(scroll, 'clientWidth', {
        configurable: true,
        get: () => 320,
      });
      Object.defineProperty(scroll, 'scrollWidth', {
        configurable: true,
        get: () => 1200,
      });
      Object.defineProperty(scroll, 'scrollLeft', {
        configurable: true,
        get: () => scrollLeftValue,
        set: (value: number) => {
          scrollLeftValue = value;
        },
      });

      scroll.dispatchEvent(new Event('scroll'));
      await nextAnimationFrame();

      expect(scroll.classList.contains('has-overflow')).to.equal(true);
      expect(scroll.classList.contains('has-left-fade')).to.equal(false);
      expect(scroll.classList.contains('has-right-fade')).to.equal(true);

      scroll.scrollLeft = 900;
      scroll.dispatchEvent(new Event('scroll'));
      await nextAnimationFrame();

      expect(scroll.classList.contains('has-left-fade')).to.equal(true);
    } finally {
      restoreResizeObserver();
    }
  });
});
