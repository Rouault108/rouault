import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/math/math.js';
import type { UiMath } from '../../src/components/ui/math/math.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

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
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;

  return () => {
    delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  };
};

const flush = async (host: UiMath): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const waitForMathSettled = async (host: UiMath): Promise<void> => {
  await new Promise<void>((resolve) => {
    host.addEventListener('math-settled', () => resolve(), { once: true });
  });
};

describe('ui-math browser contract', () => {
  it('accessibleLabel がある runtime inline は label speech mode を採り、MathML を aria-hidden にすること', async () => {
    const restoreResizeObserver = installResizeObserverStub();

    try {
      const host = await fixture<UiMath>(html`
        <ui-math latex="c = \\pm \\sqrt{a^2 + b^2}" accessible-label="平方根の式"></ui-math>
      `);

      await flush(host);

      const inline = expectPresent(
        host.shadowRoot?.querySelector<HTMLElement>('.math-inline'),
        'math inline',
      );
      const runtimeMathMl = expectPresent(
        host.shadowRoot?.querySelector<HTMLElement>('.runtime-katex math'),
        'runtime MathML',
      );

      expect(inline.getAttribute('role')).to.equal('math');
      expect(inline.getAttribute('aria-label')).to.equal('平方根の式');
      expect(runtimeMathMl.getAttribute('aria-hidden')).to.equal('true');
    } finally {
      restoreResizeObserver();
    }
  });

  it('external error は error-kind / error-code / source details を公開 DOM に反映すること', async () => {
    const restoreResizeObserver = installResizeObserverStub();

    try {
      const host = await fixture<UiMath>(html`
        <ui-math
          block
          latex="\\frac{1}{2}"
          error-message="外部パイプラインで失敗しました"
          error-kind="runtime-failed"
          error-code="E_RUNTIME"
          show-error-source
        ></ui-math>
      `);

      await flush(host);

      const errorBlock = expectPresent(
        host.shadowRoot?.querySelector<HTMLElement>('.math-error'),
        'math error block',
      );
      const title = expectPresent(
        errorBlock.querySelector<HTMLElement>('.math-error-title'),
        'math error title',
      );
      const code = expectPresent(
        errorBlock.querySelector<HTMLElement>('.math-error-code'),
        'math error code',
      );
      const details = expectPresent(
        errorBlock.querySelector<HTMLElement>('details.math-error-details'),
        'math error details',
      );

      expect(title.textContent?.trim()).to.equal('実行時失敗');
      expect(code.textContent?.trim()).to.equal('code: E_RUNTIME');
      expect(details.textContent?.includes('数式ソースを表示')).to.equal(true);
      expect(details.textContent?.includes('\\frac{1}{2}')).to.equal(true);
    } finally {
      restoreResizeObserver();
    }
  });

  it('block primary は scrollable 時に region と data-scroll を更新し、math-settled を送出すること', async () => {
    const restoreResizeObserver = installResizeObserverStub();

    try {
      const host = await fixture<UiMath>(html`
        <ui-math id="block-math" block primary latex="x + y + z + w + v + u + t + s + r + q + p"></ui-math>
      `);

      await flush(host);

      const display = expectPresent(
        host.shadowRoot?.querySelector<HTMLDivElement>('.math-display'),
        'math display',
      );

      Object.defineProperty(display, 'clientWidth', {
        configurable: true,
        get: () => 120,
      });
      Object.defineProperty(display, 'scrollWidth', {
        configurable: true,
        get: () => 320,
      });
      Object.defineProperty(display, 'scrollLeft', {
        configurable: true,
        writable: true,
        value: 0,
      });

      const settledPromise = waitForMathSettled(host);
      host.latex = 'a + b + c + d + e + f + g + h + i + j + k';
      await settledPromise;
      await flush(host);

      display.dispatchEvent(new Event('scroll'));
      await nextAnimationFrame();

      expect(display.getAttribute('role')).to.equal('region');
      expect(display.getAttribute('aria-label')).to.equal('数式（横スクロール可能）');
      expect(display.getAttribute('tabindex')).to.equal('0');
      expect(display.dataset['scroll']).to.equal('start');
    } finally {
      restoreResizeObserver();
    }
  });
});
