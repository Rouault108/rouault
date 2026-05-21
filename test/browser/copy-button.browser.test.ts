import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '../../src/components/ui/copy-button/copy-button.js';
import type { CopyButton } from '../../src/components/ui/copy-button/copy-button.js';
import { nextAnimationFrame, waitForLitUpdate, waitMs } from './helpers/wait-for-lit.js';

const getInnerButton = (host: CopyButton): HTMLElement => {
  const button = host.shadowRoot?.querySelector<HTMLElement>('ui-button');
  if (!button) {
    throw new Error('shadowRoot 内の ui-button が見つかりません');
  }
  return button;
};

const getIcon = (host: CopyButton): HTMLElement => {
  const icon = host.shadowRoot?.querySelector<HTMLElement>('[data-icon]');
  if (!icon) {
    throw new Error('data-icon を持つ静的 icon が見つかりません');
  }
  return icon;
};

const getLiveRegion = (host: CopyButton): HTMLElement => {
  const liveRegion = host.shadowRoot?.querySelector<HTMLElement>('.sr-only');
  if (!liveRegion) {
    throw new Error('live region が見つかりません');
  }
  return liveRegion;
};

const withMockedClipboardWrite = async (
  mock: (value: string) => Promise<void>,
  callback: () => Promise<void>,
): Promise<void> => {
  const original = navigator.clipboard.writeText.bind(navigator.clipboard);
  navigator.clipboard.writeText = mock;
  try {
    await callback();
  } finally {
    navigator.clipboard.writeText = original;
  }
};

describe('ui-copy-button browser contract', () => {
  it('成功時に success state / icon / aria-label / live region / copy event を更新すること', async () => {
    const host = await fixture<CopyButton>(html`
      <ui-copy-button value="テスト用テキスト" label="コードをコピー" size="sm"></ui-copy-button>
    `);

    await waitForLitUpdate(host);

    const innerButton = getInnerButton(host);
    let copiedValue = '';
    let copyEventCount = 0;

    host.addEventListener('copy', (event: Event) => {
      const customEvent = event as CustomEvent<{ value: string }>;
      copyEventCount += 1;
      copiedValue = customEvent.detail.value;
    });

    await withMockedClipboardWrite(
      async () => Promise.resolve(),
      async () => {
        innerButton.click();
        await waitMs(80);
        await waitForLitUpdate(host);
        await nextAnimationFrame();
      },
    );

    expect(host.getAttribute('state')).to.equal('success');
    expect(getIcon(host).getAttribute('data-icon')).to.equal('check');
    expect(innerButton.getAttribute('aria-label')).to.contain('コピーしました');

    const liveRegion = getLiveRegion(host);
    expect(liveRegion.getAttribute('role')).to.equal('status');
    expect(liveRegion.getAttribute('aria-live')).to.equal('polite');
    expect(liveRegion.textContent).to.contain('コピーしました');

    expect(copyEventCount).to.equal(1);
    expect(copiedValue).to.equal('テスト用テキスト');
  });

  it('失敗時に error state / icon / aria-label / live region / copy-error event を更新すること', async () => {
    const host = await fixture<CopyButton>(html`
      <ui-copy-button value="失敗テスト" label="コピー" size="sm"></ui-copy-button>
    `);

    await waitForLitUpdate(host);

    const innerButton = getInnerButton(host);
    let failedValue = '';
    let copyErrorEventCount = 0;

    host.addEventListener('copy-error', (event: Event) => {
      const customEvent = event as CustomEvent<{ error: unknown; value: string }>;
      copyErrorEventCount += 1;
      failedValue = customEvent.detail.value;
    });

    await withMockedClipboardWrite(
      async () => Promise.reject(new Error('Clipboard write failed')),
      async () => {
        innerButton.click();
        await waitMs(80);
        await waitForLitUpdate(host);
        await nextAnimationFrame();
      },
    );

    expect(host.getAttribute('state')).to.equal('error');
    expect(getIcon(host).getAttribute('data-icon')).to.equal('alert-triangle');
    expect(innerButton.getAttribute('aria-label')).to.contain('コピー失敗');

    const liveRegion = getLiveRegion(host);
    expect(liveRegion.getAttribute('role')).to.equal('alert');
    expect(liveRegion.getAttribute('aria-live')).to.equal('assertive');
    expect(liveRegion.textContent).to.contain('コピー失敗');

    expect(copyErrorEventCount).to.equal(1);
    expect(failedValue).to.equal('失敗テスト');
  });

  it('同一成功状態への連打でも再通知され、copy event を都度発火すること', async () => {
    const host = await fixture<CopyButton>(html`
      <ui-copy-button value="連打テスト" label="コピー" size="sm"></ui-copy-button>
    `);

    await waitForLitUpdate(host);

    const innerButton = getInnerButton(host);
    let copyEventCount = 0;

    host.addEventListener('copy', () => {
      copyEventCount += 1;
    });

    await withMockedClipboardWrite(
      async () => Promise.resolve(),
      async () => {
        innerButton.click();
        await waitUntil(() => copyEventCount === 1, '初回 copy event が発火すること');
        await waitForLitUpdate(host);
        const firstLabel = innerButton.getAttribute('aria-label');

        innerButton.click();
        await waitUntil(() => copyEventCount === 2, '2 回目 copy event が発火すること');
        await waitForLitUpdate(host);
        const secondLabel = innerButton.getAttribute('aria-label');

        expect(host.getAttribute('state')).to.equal('success');
        expect(firstLabel).to.contain('コピーしました');
        expect(secondLabel).to.contain('コピーしました');
      },
    );

    expect(copyEventCount).to.equal(2);
  });

  it('遅延が threshold を超えた場合のみ loading indicator と コピー中 aria-label を表示すること', async () => {
    const host = await fixture<CopyButton>(html`
      <ui-copy-button
        value="loading-threshold"
        label="コピー"
        size="sm"
        style="--timeout-async-threshold: 10;"
      ></ui-copy-button>
    `);

    await waitForLitUpdate(host);

    const innerButton = getInnerButton(host);

    await withMockedClipboardWrite(
      async () => {
        await waitMs(80);
        return Promise.resolve();
      },
      async () => {
        innerButton.click();
        await waitMs(25);
        await waitForLitUpdate(host);

        expect(getIcon(host).getAttribute('data-icon')).to.equal('loader-circle');
        expect(innerButton.getAttribute('aria-label')).to.contain('コピー中');

        await waitMs(100);
        await waitForLitUpdate(host);
      },
    );

    expect(host.getAttribute('state')).to.equal('success');
  });

  it('Success は 2000ms 後、Error は 3000ms 後に idle へ戻ること', async () => {
    const successHost = await fixture<CopyButton>(html`
      <ui-copy-button value="success" label="成功テスト" size="sm"></ui-copy-button>
    `);
    const errorHost = await fixture<CopyButton>(html`
      <ui-copy-button value="error" label="失敗テスト" size="sm"></ui-copy-button>
    `);

    await Promise.all([waitForLitUpdate(successHost), waitForLitUpdate(errorHost)]);

    const successButton = getInnerButton(successHost);
    const errorButton = getInnerButton(errorHost);
    const originalSetTimeout = window.setTimeout.bind(window);
    const originalClearTimeout = window.clearTimeout.bind(window);
    const pendingResetTimers = new Map<number, VoidFunction>();
    let nextTimerId = 1;

    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (timeout === 2000 || timeout === 3000) {
        const id = nextTimerId++;
        pendingResetTimers.set(id, () => {
          pendingResetTimers.delete(id);
          if (typeof handler === 'function') {
            handler(...args);
          }
        });
        return id as unknown as number;
      }

      return originalSetTimeout(handler, timeout as number, ...args);
    }) as typeof window.setTimeout;

    window.clearTimeout = ((timeoutId: number) => {
      pendingResetTimers.delete(timeoutId);
      return originalClearTimeout(timeoutId);
    }) as typeof window.clearTimeout;

    const flushResetTimers = (): void => {
      const timers = Array.from(pendingResetTimers.values());
      pendingResetTimers.clear();
      for (const timer of timers) {
        timer();
      }
    };

    try {
      await withMockedClipboardWrite(
        async (value: string) => {
          if (value === 'error') {
            throw new Error('forced error');
          }
          return Promise.resolve();
        },
        async () => {
          successButton.click();
          await waitForLitUpdate(successHost);
          await nextAnimationFrame();

          expect(successHost.getAttribute('state')).to.equal('success');

          flushResetTimers();
          await waitForLitUpdate(successHost);
          await nextAnimationFrame();

          expect(successHost.getAttribute('state')).to.equal('idle');
          expect(successButton.getAttribute('aria-label')).to.equal('成功テスト');

          errorButton.click();
          await waitForLitUpdate(errorHost);
          await nextAnimationFrame();

          expect(errorHost.getAttribute('state')).to.equal('error');

          flushResetTimers();
          await waitForLitUpdate(errorHost);
          await nextAnimationFrame();

          expect(errorHost.getAttribute('state')).to.equal('idle');
          expect(errorButton.getAttribute('aria-label')).to.equal('失敗テスト');
        },
      );
    } finally {
      window.setTimeout = originalSetTimeout;
      window.clearTimeout = originalClearTimeout;
    }
  });

  it('disabled 時は clipboard 書き込みも event も発火しないこと', async () => {
    const host = await fixture<CopyButton>(html`
      <ui-copy-button value="disabled" label="無効" size="sm" ?disabled=${true}></ui-copy-button>
    `);

    await waitForLitUpdate(host);

    const innerButton = getInnerButton(host);
    let copyEventCount = 0;
    let copyErrorEventCount = 0;
    let writeCount = 0;

    host.addEventListener('copy', () => {
      copyEventCount += 1;
    });
    host.addEventListener('copy-error', () => {
      copyErrorEventCount += 1;
    });

    await withMockedClipboardWrite(
      async () => {
        writeCount += 1;
        return Promise.resolve();
      },
      async () => {
        innerButton.click();
        await waitMs(50);
        await waitForLitUpdate(host);
      },
    );

    expect(writeCount).to.equal(0);
    expect(copyEventCount).to.equal(0);
    expect(copyErrorEventCount).to.equal(0);
    expect(host.getAttribute('state')).to.equal('idle');
  });

  it('size を inner ui-button へ伝播すること', async () => {
    const small = await fixture<CopyButton>(html`
      <ui-copy-button value="small" label="sm サイズ" size="sm"></ui-copy-button>
    `);
    const medium = await fixture<CopyButton>(html`
      <ui-copy-button value="medium" label="md サイズ" size="md"></ui-copy-button>
    `);

    await Promise.all([waitForLitUpdate(small), waitForLitUpdate(medium)]);

    expect(getInnerButton(small).getAttribute('size')).to.equal('sm');
    expect(getInnerButton(medium).getAttribute('size')).to.equal('md');
  });

  it('label 欠落時は安全側 fallback として aria-label に「コピー」を用いること', async () => {
    const host = await fixture<CopyButton>(html`
      <ui-copy-button value="missing-label"></ui-copy-button>
    `);

    await waitForLitUpdate(host);

    const innerButton = getInnerButton(host);
    expect(innerButton.getAttribute('aria-label')).to.equal('コピー');
    expect(host.getAttribute('state')).to.equal('idle');
  });
});
