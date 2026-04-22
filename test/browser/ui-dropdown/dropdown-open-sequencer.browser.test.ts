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

  return {
    x: 12,
    y: 48,
    placement: 'bottom-start',
    reference,
    floating,
    referenceRect: new DOMRectReadOnly(12, 12, 40, 32),
    floatingWidth: 120,
    floatingHeight: 48,
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
});
