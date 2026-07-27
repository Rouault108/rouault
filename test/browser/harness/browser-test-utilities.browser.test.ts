import { html } from 'lit/static-html.js';
import { describe, expect, it, vi } from 'vitest';
import { fixture } from './browser-fixture.js';
import { waitForCondition } from './browser-test-utilities.js';

const trackUtilityTimers = async (action: () => Promise<void>): Promise<number> => {
  const originalSetTimeout = window.setTimeout.bind(window);
  const originalClearTimeout = window.clearTimeout.bind(window);
  const activeTimers = new Set<number>();

  window.setTimeout = ((
    handler: TimerHandler,
    timeout?: number,
    ...arguments_: readonly unknown[]
  ): number => {
    if (typeof handler !== 'function') {
      throw new TypeError('timer handler must be a function in this contract test');
    }

    let timer = 0;
    timer = originalSetTimeout(
      (...callbackArguments: readonly unknown[]) => {
        activeTimers.delete(timer);
        handler(...callbackArguments);
      },
      timeout,
      ...arguments_,
    );
    activeTimers.add(timer);
    return timer;
  }) as typeof window.setTimeout;

  window.clearTimeout = ((timer?: number): void => {
    if (timer !== undefined) {
      activeTimers.delete(timer);
    }
    originalClearTimeout(timer);
  }) as typeof window.clearTimeout;

  try {
    await action();
    await Promise.resolve();
    return activeTimers.size;
  } finally {
    for (const timer of activeTimers) {
      originalClearTimeout(timer);
    }
    window.setTimeout = originalSetTimeout;
    window.clearTimeout = originalClearTimeout;
  }
};

describe('browser fixture lifecycle', () => {
  it('creates a repository-owned fixture', async () => {
    const element = await fixture<HTMLElement>(
      html`<div id="fixture-cleanup-contract">ready</div>`,
    );

    expect(element.textContent).toBe('ready');
  });

  it('cleans the previous repository-owned fixture after each test', () => {
    expect(document.querySelector('#fixture-cleanup-contract')).toBeNull();
  });
});

describe('waitForCondition browser contract', () => {
  it('resolves synchronous and asynchronous truthy predicates', async () => {
    await expect(waitForCondition(() => true, 'sync timeout')).resolves.toBeUndefined();
    await expect(
      waitForCondition(async () => true, 'async timeout'),
    ).resolves.toBeUndefined();
  });

  it('uses the default timeout and interval', async () => {
    let attempts = 0;
    const startedAt = performance.now();

    await waitForCondition(
      () => {
        attempts += 1;
        return attempts === 2;
      },
      'default polling timeout',
    );

    expect(attempts).toBe(2);
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(40);
  });

  it('honors custom timeout and interval and includes the message on timeout', async () => {
    let attempts = 0;

    await expect(
      waitForCondition(
        () => {
          attempts += 1;
          return false;
        },
        'custom deadline reached',
        { timeout: 30, interval: 5 },
      ),
    ).rejects.toThrow('custom deadline reached');

    expect(attempts).toBeGreaterThan(1);
  });

  it('times out a pending predicate at the settlement deadline', async () => {
    const pending = new Promise<boolean>((resolve) => {
      void resolve;
    });

    await expect(
      waitForCondition(() => pending, 'settlement deadline reached', {
        timeout: 20,
        interval: 5,
      }),
    ).rejects.toThrow('settlement deadline reached');
  });

  it('does not accept a predicate result that settles after the deadline', async () => {
    await expect(
      waitForCondition(
        () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 40)),
        'late predicate',
        { timeout: 10, interval: 1 },
      ),
    ).rejects.toThrow('late predicate');
  });

  it('does not start another predicate attempt after the deadline', async () => {
    vi.useFakeTimers();
    try {
      const deadline = performance.now() + 20;
      const attemptStartedAt: number[] = [];
      const completion = expect(
        waitForCondition(
          () => {
            attemptStartedAt.push(performance.now());
            return false;
          },
          'post-deadline attempt',
          { timeout: 20, interval: 20 },
        ),
      ).rejects.toThrow('post-deadline attempt');

      await vi.advanceTimersByTimeAsync(20);
      await completion;

      expect(attemptStartedAt).toHaveLength(1);
      expect(
        attemptStartedAt.every((startedAt) => startedAt < deadline),
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('propagates predicate throws and rejections before the deadline', async () => {
    const thrown = new Error('synchronous predicate failure');
    const rejected = new Error('asynchronous predicate failure');

    await expect(
      waitForCondition(() => {
        throw thrown;
      }, 'timeout'),
    ).rejects.toBe(thrown);
    await expect(
      waitForCondition(() => Promise.reject(rejected), 'timeout'),
    ).rejects.toBe(rejected);
  });

  it.each([
    ['timeout', Number.NaN],
    ['timeout', Number.POSITIVE_INFINITY],
    ['timeout', -1],
    ['interval', Number.NaN],
    ['interval', Number.POSITIVE_INFINITY],
    ['interval', -1],
  ] as const)('rejects invalid %s before invoking the predicate', async (name, value) => {
    let attempts = 0;
    const options = name === 'timeout' ? { timeout: value } : { interval: value };

    await expect(
      waitForCondition(
        () => {
          attempts += 1;
          return true;
        },
        'validation timeout',
        options,
      ),
    ).rejects.toThrow(name);
    expect(attempts).toBe(0);
  });

  it('treats timeout zero as one immediate-settlement attempt', async () => {
    let synchronousCalls = 0;
    await waitForCondition(
      () => {
        synchronousCalls += 1;
        return true;
      },
      'zero timeout',
      { timeout: 0, interval: 0 },
    );
    expect(synchronousCalls).toBe(1);

    await expect(
      waitForCondition(
        () => Promise.resolve(true),
        'zero timeout same-microtask fulfillment',
        { timeout: 0, interval: 0 },
      ),
    ).resolves.toBeUndefined();

    let falsyCalls = 0;
    await expect(
      waitForCondition(
        () => {
          falsyCalls += 1;
          return false;
        },
        'zero timeout falsy',
        { timeout: 0, interval: 0 },
      ),
    ).rejects.toThrow('zero timeout falsy');
    expect(falsyCalls).toBe(1);
  });

  it('times out task-delayed settlement when timeout is zero', async () => {
    await expect(
      waitForCondition(
        () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 0)),
        'zero timeout delayed settlement',
        { timeout: 0, interval: 0 },
      ),
    ).rejects.toThrow('zero timeout delayed settlement');
  });

  it('uses a macrotask between attempts when interval is zero', async () => {
    let attempts = 0;
    let microtaskObserved = false;

    await waitForCondition(
      () => {
        attempts += 1;
        if (attempts === 1) {
          queueMicrotask(() => {
            microtaskObserved = true;
          });
          return false;
        }
        return microtaskObserved;
      },
      'zero interval polling',
      { timeout: 100, interval: 0 },
    );

    expect(attempts).toBe(2);
  });

  it('does not leak polling timers after success, timeout, or rejection', async () => {
    const remainingTimers = await trackUtilityTimers(async () => {
      let attempts = 0;
      await waitForCondition(
        () => {
          attempts += 1;
          return attempts === 2;
        },
        'success timeout',
        { timeout: 100, interval: 1 },
      );

      await expect(
        waitForCondition(() => false, 'expected timeout', {
          timeout: 10,
          interval: 2,
        }),
      ).rejects.toThrow('expected timeout');

      await expect(
        waitForCondition(() => Promise.reject(new Error('expected rejection')), 'timeout'),
      ).rejects.toThrow('expected rejection');
    });

    expect(remainingTimers).toBe(0);
  });

  it('handles a late rejection without an unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (event: PromiseRejectionEvent): void => {
      unhandled.push(event.reason);
      event.preventDefault();
    };
    window.addEventListener('unhandledrejection', onUnhandled);

    try {
      await expect(
        waitForCondition(
          () =>
            new Promise<boolean>((_resolve, reject) => {
              setTimeout(() => reject(new Error('late rejection')), 20);
            }),
          'late rejection timeout',
          { timeout: 5, interval: 1 },
        ),
      ).rejects.toThrow('late rejection timeout');

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 30);
      });
      expect(unhandled).toEqual([]);
    } finally {
      window.removeEventListener('unhandledrejection', onUnhandled);
    }
  });
});
