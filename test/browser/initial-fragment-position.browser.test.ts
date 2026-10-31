import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  runInitialFragmentPosition,
  type InitialFragmentArrival,
  type InitialFragmentOutcome,
} from '../../src/components/app/controllers/initial-fragment-position.js';
import {
  invalidateContentReadiness,
  setContentReadiness,
} from '../../src/client/hydration/content-readiness.js';
import { fixture, requireFixtureValue } from './harness/browser-fixture.js';

class TestMotionQuery extends EventTarget implements MediaQueryList {
  matches = false;
  readonly media = '(prefers-reduced-motion: reduce)';
  onchange: MediaQueryList['onchange'] = null;
  addListener(): void {
    // runnerは標準のchange購読を使い、旧APIを呼ばない。
  }
  removeListener(): void {
    // runnerは標準のchange購読を使い、旧APIを呼ばない。
  }
}

let epoch = 10000;
let clock = 0;
let frameId = 0;
let visibility: DocumentVisibilityState = 'visible';
const frames = new Map<number, FrameRequestCallback>();
const controllers: AbortController[] = [];

beforeEach(async () => {
  await document.fonts.ready;
  clock = 0;
  frameId = 0;
  visibility = 'visible';
  frames.clear();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
});

afterEach(() => {
  for (const controller of controllers.splice(0)) controller.abort();
  invalidateContentReadiness();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

interface HarnessOptions {
  readonly actual?: number;
  readonly target?: number;
  readonly pending?: boolean;
  readonly hiddenTarget?: boolean;
  readonly onCandidate?: Parameters<typeof runInitialFragmentPosition>[0]['onCandidate'];
  readonly onFinish?: (outcome: InitialFragmentOutcome) => void;
}

const createHarness = async (options: HarnessOptions = {}) => {
  const currentEpoch = ++epoch;
  const root = await fixture(
    `<main style="height:12000px"><h2 id="fragment-goal-${currentEpoch}" style="scroll-margin-top:0;margin:0">Goal</h2></main>`,
  );
  const target = requireFixtureValue(root.querySelector('h2'));
  const controller = new AbortController();
  controllers.push(controller);
  let actual = options.actual ?? 0;
  let targetY = options.target ?? 1000;
  let range = 10000;
  let owned = true;
  let ownershipThrows = false;
  const query = new TestMotionQuery();
  const outcomes: {
    readonly outcome: InitialFragmentOutcome;
    readonly arrival?: InitialFragmentArrival;
  }[] = [];
  const writes: ScrollToOptions[] = [];
  const errors: unknown[] = [];
  const candidate = vi.fn(options.onCandidate ?? (() => 'accepted'));
  if (options.hiddenTarget) target.style.visibility = 'hidden';
  vi.spyOn(target, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(0, targetY - actual, 100, 24),
  );
  vi.spyOn(window, 'scrollX', 'get').mockReturnValue(0);
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => actual);
  const scrolling = document.scrollingElement ?? document.documentElement;
  vi.spyOn(scrolling, 'scrollHeight', 'get').mockImplementation(() => range + 720);
  vi.spyOn(scrolling, 'clientHeight', 'get').mockReturnValue(720);
  vi.spyOn(scrolling, 'scrollWidth', 'get').mockReturnValue(1280);
  vi.spyOn(scrolling, 'clientWidth', 'get').mockReturnValue(1280);
  vi.spyOn(window, 'matchMedia').mockReturnValue(query);
  const scroll = vi
    .spyOn(window, 'scrollTo')
    .mockImplementation((value?: ScrollToOptions | number) => {
      if (typeof value === 'number') throw new Error('Expected an explicit scroll options object');
      writes.push({ ...value });
    });
  const readiness = (status: 'pending' | 'settled' | 'unavailable') => {
    setContentReadiness({
      contentEpoch: currentEpoch,
      root,
      shellCommitId: 1,
      status,
      started: true,
    });
  };
  readiness(options.pending ? 'pending' : 'settled');
  const url = new URL(document.URL);
  url.hash = target.id;
  const done = runInitialFragmentPosition({
    binding: {
      root,
      contentEpoch: currentEpoch,
      shellCommitId: 1,
      intentId: 1,
      entryId: 'entry',
      url: url.href,
    },
    startedAt: clock,
    signal: controller.signal,
    current: () => {
      if (ownershipThrows) throw new Error('ownership failure');
      return owned;
    },
    onCandidate: candidate,
    onFinish: (outcome, arrival) => {
      outcomes.push({ outcome, ...(arrival ? { arrival } : {}) });
      options.onFinish?.(outcome);
    },
    onError: (error) => errors.push(error),
  });
  return {
    target,
    controller,
    query,
    writes,
    outcomes,
    errors,
    candidate,
    done,
    readiness,
    scroll,
    actual: (value: number) => {
      actual = value;
    },
    goal: (value: number) => {
      targetY = value;
    },
    range: (value: number) => {
      range = value;
    },
    owner: (value: boolean) => {
      owned = value;
    },
    throwOwnership: () => {
      ownershipThrows = true;
    },
    frames: (count: number) => {
      for (let index = 0; index < count; index += 1) {
        clock += 16;
        const pendingFrames = [...frames.values()];
        frames.clear();
        for (const callback of pendingFrames) callback(clock);
      }
    },
    hidden: (value: boolean) => {
      visibility = value ? 'hidden' : 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    },
    reduced: (value: boolean) => {
      query.matches = value;
      query.dispatchEvent(new Event('change'));
    },
    expire: () => {
      clock = 5001;
      vi.advanceTimersByTime(5000);
    },
  };
};

describe('managed初回fragmentの移動と受理境界', () => {
  it('すでに到達していれば移動せず3sample後に候補と最終記録を一度確定する', async () => {
    const harness = await createHarness({ actual: 1000 });
    harness.frames(2);
    expect(harness.outcomes).toHaveLength(0);
    harness.frames(1);
    await harness.done;
    expect(harness.writes).toHaveLength(0);
    expect(harness.candidate).toHaveBeenCalledTimes(1);
    expect(harness.outcomes).toHaveLength(1);
    expect(harness.outcomes[0]).toMatchObject({
      outcome: 'arrived',
      arrival: { requestGeneration: 0, target: { y: 1000 }, actual: { y: 1000 } },
    });
    const isCurrent = harness.candidate.mock.calls[0]?.[0];
    expect(isCurrent?.()).toBe(false);
    expect(Object.isFrozen(harness.outcomes[0]?.arrival)).toBe(true);
  });

  it('通常motionではsmoothを一度発行し要求後の実到達3sampleまでsettledにしない', async () => {
    const harness = await createHarness();
    harness.frames(3);
    expect(harness.writes).toEqual([{ left: 0, top: 1000, behavior: 'smooth' }]);
    expect(harness.outcomes).toHaveLength(0);
    harness.actual(1000);
    harness.frames(2);
    expect(harness.outcomes).toHaveLength(0);
    harness.frames(1);
    await harness.done;
    expect(harness.outcomes[0]).toMatchObject({
      outcome: 'arrived',
      arrival: { requestGeneration: 1 },
    });
  });

  it('A→B→Aを旧点待ちせず更新し同じ未到達目標へ繰り返し発行しない', async () => {
    const harness = await createHarness();
    harness.frames(3);
    harness.goal(2000);
    harness.frames(3);
    harness.goal(1000);
    harness.frames(3);
    harness.frames(6);
    expect(harness.writes.map((write) => write.top)).toEqual([1000, 2000, 1000]);
    expect(harness.outcomes).toHaveLength(0);
    harness.expire();
    await harness.done;
    expect(harness.outcomes).toEqual([{ outcome: 'unavailable' }]);
    expect(harness.writes.every((write) => write.behavior === 'smooth')).toBe(true);
  });

  it('旧A要求で新Bを通過してもB発行後の3sampleを取り直す', async () => {
    const harness = await createHarness();
    harness.frames(3);
    harness.goal(500);
    harness.actual(500);
    harness.frames(3);
    expect(harness.writes.map((write) => write.top)).toEqual([1000, 500]);
    expect(harness.outcomes).toHaveLength(0);
    harness.frames(2);
    expect(harness.outcomes).toHaveLength(0);
    harness.frames(1);
    await harness.done;
    expect(harness.outcomes[0]).toMatchObject({
      outcome: 'arrived',
      arrival: { requestGeneration: 2, target: { y: 500 } },
    });
  });

  it('range縮小と再拡大は発行時座標へclampし直さず最新の目標へ更新する', async () => {
    const harness = await createHarness();
    harness.frames(3);
    harness.goal(1700);
    harness.range(400);
    harness.frames(3);
    harness.range(4000);
    harness.frames(3);
    expect(harness.writes.map((write) => write.top)).toEqual([1000, 400, 1700]);
    harness.actual(1700);
    harness.frames(3);
    await harness.done;
    expect(harness.outcomes[0]?.outcome).toBe('arrived');
  });

  it('TOC通知がrangeを変えず目標だけ動かしてもfresh geometryで受理し直す', async () => {
    let calls = 0;
    const harness = await createHarness({
      actual: 1000,
      onCandidate: () => {
        if (++calls === 1) harness.goal(1200);
        return 'accepted';
      },
    });
    harness.frames(3);
    expect(harness.outcomes).toHaveLength(0);
    harness.frames(3);
    expect(harness.writes).toEqual([{ left: 0, top: 1200, behavior: 'smooth' }]);
    harness.actual(1200);
    harness.frames(3);
    await harness.done;
    expect(harness.outcomes[0]).toMatchObject({
      outcome: 'arrived',
      arrival: { target: { y: 1200 } },
    });
    expect(calls).toBe(2);
  });

  it('readiness待ちとhidden中は発行/受理せず復帰後のfresh区間を要求する', async () => {
    const harness = await createHarness({ pending: true });
    harness.frames(4);
    expect(harness.writes).toHaveLength(0);
    harness.readiness('settled');
    harness.frames(3);
    expect(harness.writes).toHaveLength(1);
    harness.hidden(true);
    harness.actual(1000);
    harness.frames(5);
    expect(harness.outcomes).toHaveLength(0);
    harness.hidden(false);
    harness.frames(2);
    expect(harness.outcomes).toHaveLength(0);
    harness.frames(1);
    await harness.done;
    expect(harness.outcomes[0]?.outcome).toBe('arrived');
  });

  it('dynamic reduced motionだけにinstantを許しnormal復帰で同じsmoothを再発行しない', async () => {
    const harness = await createHarness();
    harness.frames(3);
    harness.reduced(true);
    harness.frames(3);
    expect(harness.writes.map((write) => write.behavior)).toEqual(['smooth', 'instant']);
    harness.actual(1000);
    harness.reduced(false);
    harness.frames(3);
    await harness.done;
    expect(harness.writes).toHaveLength(2);
    expect(harness.outcomes[0]?.outcome).toBe('arrived');
  });

  it('candidate通知中の新owner採用はcancelledで終端し旧移動を追加しない', async () => {
    const harness = await createHarness({
      actual: 1000,
      onCandidate: () => {
        harness.owner(false);
      },
    });
    harness.frames(3);
    await harness.done;
    expect(harness.outcomes).toEqual([{ outcome: 'cancelled' }]);
    expect(harness.writes).toHaveLength(0);
    harness.frames(3);
    expect(harness.outcomes).toHaveLength(1);
  });

  it('arrived確定後の通知例外や取消で過去の到達を変更しない', async () => {
    const harness = await createHarness({
      actual: 1000,
      onFinish: () => {
        throw new Error('arrival observer failure');
      },
    });
    harness.frames(3);
    await harness.done;
    harness.controller.abort();
    harness.expire();
    expect(harness.outcomes).toHaveLength(1);
    expect(harness.outcomes[0]?.outcome).toBe('arrived');
    expect(harness.errors).toHaveLength(1);
  });

  it('candidate通知から期限後に戻っても成功へ進まない', async () => {
    const harness = await createHarness({
      actual: 1000,
      onCandidate: () => {
        clock = 5001;
      },
    });
    harness.frames(3);
    await harness.done;
    expect(harness.outcomes).toEqual([{ outcome: 'unavailable' }]);
  });

  it('移動APIの例外はunavailableで一度終端し期限時に再発行しない', async () => {
    const harness = await createHarness();
    harness.scroll.mockImplementation(() => {
      throw new Error('scroll failure');
    });
    harness.frames(3);
    await harness.done;
    harness.expire();
    expect(harness.outcomes).toEqual([{ outcome: 'unavailable' }]);
    expect(harness.errors).toHaveLength(1);
  });

  it('所有照合の例外でもRAF外へ漏らさず単一unavailableで終端する', async () => {
    const harness = await createHarness();
    harness.throwOwnership();
    expect(() => harness.frames(1)).not.toThrow();
    expect(harness.outcomes).toEqual([{ outcome: 'unavailable' }]);
    await harness.done;
  });

  it('smooth発行後の取消は現在XYへの停止APIを出さず旧後続処理を失効させる', async () => {
    const harness = await createHarness();
    harness.frames(3);
    harness.actual(300);
    harness.controller.abort();
    await harness.done;
    harness.frames(3);
    harness.expire();
    expect(harness.outcomes).toEqual([{ outcome: 'cancelled' }]);
    expect(harness.writes).toEqual([{ left: 0, top: 1000, behavior: 'smooth' }]);
  });

  it.each(['pending', 'hidden'] as const)(
    '%s中の共通期限でも一度だけunavailableになる',
    async (condition) => {
      const harness = await createHarness({ pending: condition === 'pending' });
      if (condition === 'hidden') harness.hidden(true);
      harness.frames(3);
      harness.expire();
      await harness.done;
      harness.hidden(false);
      harness.readiness('settled');
      harness.frames(3);
      expect(harness.outcomes).toEqual([{ outcome: 'unavailable' }]);
      expect(harness.writes).toHaveLength(0);
    },
  );

  it('TOC候補通知の例外は位置の成功と分離してdegradedとして記録する', async () => {
    const harness = await createHarness({
      actual: 1000,
      onCandidate: () => {
        throw new Error('TOC failure');
      },
    });
    harness.frames(3);
    await harness.done;
    expect(harness.outcomes).toHaveLength(1);
    expect(harness.outcomes[0]).toMatchObject({
      outcome: 'arrived',
      arrival: { tocResult: 'degraded' },
    });
    expect(harness.errors).toHaveLength(1);
  });

  it('hiddenとして取得した対象の消失は先頭fallbackにしない', async () => {
    const harness = await createHarness({ hiddenTarget: true });
    harness.frames(3);
    expect(harness.writes).toHaveLength(0);
    harness.target.remove();
    harness.frames(1);
    await harness.done;
    expect(harness.outcomes).toEqual([{ outcome: 'unavailable' }]);
    expect(harness.writes).toHaveLength(0);
  });
});
