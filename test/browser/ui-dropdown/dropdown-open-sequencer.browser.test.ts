import { expect } from '@open-wc/testing';
import { DropdownOpenSequencer } from '../../../src/components/ui/dropdown/internal/dropdown-open-sequencer.js';
import type { AnchoredOverlayCommitSnapshot } from '../../../src/components/ui/overlay/internal/anchored-overlay-controller.js';
import { waitMs } from '../helpers/wait-for-lit.js';

const waitUntil = async (
  predicate: () => boolean,
  timeoutMs = 2000,
  intervalMs = 5,
  message = 'condition not met',
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await waitMs(intervalMs);
  }

  throw new Error(message);
};

const createSnapshot = (
  overrides: Partial<AnchoredOverlayCommitSnapshot> = {},
): AnchoredOverlayCommitSnapshot => {
  const reference = document.createElement('button');
  const floating = document.createElement('div');
  const x = overrides.x ?? 12;
  const y = overrides.y ?? 48;
  const floatingWidth = overrides.floatingWidth ?? 120;
  const floatingHeight = overrides.floatingHeight ?? 48;

  return {
    x,
    y,
    placement: overrides.placement ?? 'bottom-start',
    reference,
    floating,
    referenceRect: overrides.referenceRect ?? new DOMRectReadOnly(12, 12, 40, 32),
    floatingWidth,
    floatingHeight,
    measuredRect: overrides.measuredRect ?? new DOMRectReadOnly(x, y, floatingWidth, floatingHeight),
    viewportCorrected: overrides.viewportCorrected ?? false,
    ...overrides,
  };
};

describe('dropdown-open-sequencer browser contract', () => {
  it('immutable snapshot が ready 条件を満たすと ready を通知すること', async () => {
    const sequencer = new DropdownOpenSequencer({ watchdogMs: 40 });
    let snapshot: AnchoredOverlayCommitSnapshot | null = null;
    let readyCount = 0;
    let failCount = 0;

    sequencer.begin({
      recomputePosition: async () => {
        snapshot = createSnapshot();
        return true;
      },
      isStillOpen: () => true,
      getLastCommitSnapshot: () => snapshot,
      onReady: () => {
        readyCount += 1;
      },
      onFail: () => {
        failCount += 1;
      },
    });

    await waitUntil(() => readyCount === 1, 1000, 5, 'ready が通知されません');

    expect(failCount).to.equal(0);
  });

  it('cancel 後は ready / fail を通知しないこと', async () => {
    const sequencer = new DropdownOpenSequencer({ watchdogMs: 20 });
    let readyCount = 0;
    let failCount = 0;

    sequencer.begin({
      recomputePosition: async () => {
        await waitMs(0);
        return false;
      },
      isStillOpen: () => true,
      getLastCommitSnapshot: () => null,
      onReady: () => {
        readyCount += 1;
      },
      onFail: () => {
        failCount += 1;
      },
    });

    sequencer.cancel();
    await waitMs(40);

    expect(readyCount).to.equal(0);
    expect(failCount).to.equal(0);
  });

  it('commit snapshot が無いままでは fail すること', async () => {
    const sequencer = new DropdownOpenSequencer({ watchdogMs: 20 });
    let failCount = 0;

    sequencer.begin({
      recomputePosition: async () => true,
      isStillOpen: () => true,
      getLastCommitSnapshot: () => null,
      onReady: () => {
        throw new Error('ready should not be called');
      },
      onFail: () => {
        failCount += 1;
      },
    });

    await waitUntil(() => failCount === 1, 1000, 5, 'fail が通知されません');
  });

  it('watchdog 期限まで再配置が成功しない場合は fail すること', async () => {
    const sequencer = new DropdownOpenSequencer({ watchdogMs: 20 });
    let failCount = 0;

    sequencer.begin({
      recomputePosition: async () => false,
      isStillOpen: () => true,
      getLastCommitSnapshot: () => null,
      onReady: () => {
        throw new Error('ready should not be called');
      },
      onFail: () => {
        failCount += 1;
      },
    });

    await waitUntil(() => failCount === 1, 1000, 5, 'watchdog fail が通知されません');
  });

  it('RAF が進まない環境でも fallback timer で watchdog fail に収束すること', async () => {
    const sequencer = new DropdownOpenSequencer({
      watchdogMs: 20,
      fallbackDelayMs: 5,
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => undefined,
    });
    let failCount = 0;

    sequencer.begin({
      recomputePosition: async () => false,
      isStillOpen: () => true,
      getLastCommitSnapshot: () => null,
      onReady: () => {
        throw new Error('ready should not be called');
      },
      onFail: () => {
        failCount += 1;
      },
    });

    await waitUntil(() => failCount === 1, 1000, 5, 'dead RAF 環境で fail に収束しません');
  });

  it('slow RAF 環境でも fallback timer 側が前進を担って ready に到達できること', async () => {
    const sequencer = new DropdownOpenSequencer({
      watchdogMs: 40,
      fallbackDelayMs: 5,
      requestAnimationFrame: (callback) => {
        window.setTimeout(() => {
          callback(0);
        }, 50);
        return 1;
      },
      cancelAnimationFrame: () => undefined,
    });
    let snapshot: AnchoredOverlayCommitSnapshot | null = null;
    let recomputeCount = 0;
    let readyCount = 0;
    let failCount = 0;

    sequencer.begin({
      recomputePosition: async () => {
        recomputeCount += 1;
        if (recomputeCount >= 2) {
          snapshot = createSnapshot();
          return true;
        }

        snapshot = null;
        return false;
      },
      isStillOpen: () => true,
      getLastCommitSnapshot: () => snapshot,
      onReady: () => {
        readyCount += 1;
      },
      onFail: () => {
        failCount += 1;
      },
    });

    await waitUntil(() => readyCount === 1, 1000, 5, 'slow RAF 環境で ready に到達しません');

    expect(recomputeCount).to.be.greaterThan(1);
    expect(failCount).to.equal(0);
  });

  it('resolved placement の side を基準に近傍判定すること', async () => {
    const sequencer = new DropdownOpenSequencer({ watchdogMs: 40 });
    let snapshot: AnchoredOverlayCommitSnapshot | null = null;
    let readyCount = 0;

    sequencer.begin({
      recomputePosition: async () => {
        snapshot = createSnapshot({
          x: 20,
          y: 40,
          placement: 'top-end',
          referenceRect: new DOMRectReadOnly(20, 80, 60, 32),
          floatingWidth: 120,
          floatingHeight: 40,
        });
        return true;
      },
      isStillOpen: () => true,
      getLastCommitSnapshot: () => snapshot,
      onReady: () => {
        readyCount += 1;
      },
      onFail: () => {
        throw new Error('fail should not be called');
      },
    });

    await waitUntil(() => readyCount === 1, 1000, 5, 'top placement が ready になりません');
  });

  it('latest snapshot が更新されるまで ready にしないこと', async () => {
    const sequencer = new DropdownOpenSequencer({ watchdogMs: 60 });
    let snapshot: AnchoredOverlayCommitSnapshot | null = null;
    let recomputeCount = 0;
    let readyCount = 0;

    sequencer.begin({
      recomputePosition: async () => {
        recomputeCount += 1;
        snapshot =
          recomputeCount === 1
            ? createSnapshot({ y: 260 })
            : createSnapshot({ y: 44 });
        return true;
      },
      isStillOpen: () => true,
      getLastCommitSnapshot: () => snapshot,
      onReady: () => {
        readyCount += 1;
      },
      onFail: () => {
        throw new Error('fail should not be called');
      },
    });

    await waitUntil(() => readyCount === 1, 1000, 5, 'latest snapshot で ready になりません');

    expect(recomputeCount).to.be.greaterThan(1);
  });

  it('measuredRect が不正な snapshot では ready にしないこと', async () => {
    const sequencer = new DropdownOpenSequencer({
      watchdogMs: 20,
      fallbackDelayMs: 5,
    });
    let failCount = 0;

    sequencer.begin({
      recomputePosition: async () => true,
      isStillOpen: () => true,
      getLastCommitSnapshot: () =>
        createSnapshot({
          measuredRect: new DOMRectReadOnly(12, 48, 0, 48),
          floatingWidth: 0,
        }),
      onReady: () => {
        throw new Error('ready should not be called');
      },
      onFail: () => {
        failCount += 1;
      },
    });

    await waitUntil(() => failCount === 1, 1000, 5, '不正 snapshot で fail に収束しません');
  });

  it('viewportCorrected が true でも最終 measuredRect が妥当なら ready にできること', async () => {
    const sequencer = new DropdownOpenSequencer({
      watchdogMs: 40,
      fallbackDelayMs: 5,
    });
    let readyCount = 0;

    sequencer.begin({
      recomputePosition: async () => true,
      isStillOpen: () => true,
      getLastCommitSnapshot: () =>
        createSnapshot({
          viewportCorrected: true,
          measuredRect: new DOMRectReadOnly(12, 44, 120, 48),
        }),
      onReady: () => {
        readyCount += 1;
      },
      onFail: () => {
        throw new Error('fail should not be called');
      },
    });

    await waitUntil(() => readyCount === 1, 1000, 5, 'viewport 補正 snapshot が ready になりません');
  });

  it('fallback timer と RAF が競合しても完了通知が二重発火しないこと', async () => {
    const sequencer = new DropdownOpenSequencer({
      watchdogMs: 40,
      fallbackDelayMs: 5,
      requestAnimationFrame: (callback) => {
        window.setTimeout(() => {
          callback(0);
        }, 5);
        return 1;
      },
      cancelAnimationFrame: () => undefined,
    });
    let readyCount = 0;
    let failCount = 0;

    sequencer.begin({
      recomputePosition: async () => true,
      isStillOpen: () => true,
      getLastCommitSnapshot: () => createSnapshot(),
      onReady: () => {
        readyCount += 1;
      },
      onFail: () => {
        failCount += 1;
      },
    });

    await waitUntil(() => readyCount === 1, 1000, 5, 'ready が通知されません');
    await waitMs(30);

    expect(readyCount).to.equal(1);
    expect(failCount).to.equal(0);
  });

  it('cancel 時に pending RAF / timer を解放すること', async () => {
    let rafId = 0;
    let timeoutId = 0;
    const cancelledRafIds: number[] = [];
    const clearedTimeoutIds: number[] = [];

    const sequencer = new DropdownOpenSequencer({
      watchdogMs: 40,
      fallbackDelayMs: 5,
      requestAnimationFrame: () => {
        rafId += 1;
        return rafId;
      },
      cancelAnimationFrame: (id) => {
        cancelledRafIds.push(id);
      },
      setTimeout: () => {
        timeoutId += 1;
        return timeoutId;
      },
      clearTimeout: (id) => {
        clearedTimeoutIds.push(Number(id));
      },
    });

    sequencer.begin({
      recomputePosition: async () => false,
      isStillOpen: () => true,
      getLastCommitSnapshot: () => null,
      onReady: () => {
        throw new Error('ready should not be called');
      },
      onFail: () => {
        throw new Error('fail should not be called');
      },
    });

    await waitMs(0);
    sequencer.cancel();

    expect(cancelledRafIds).to.deep.equal([1]);
    expect(clearedTimeoutIds).to.deep.equal([1]);
  });
});
