import { describe, expect, it } from 'vitest';
import {
  FragmentQuietWindow,
  FragmentCorrectionTrajectory,
  planFragmentCorrection,
  sameFragmentGeometry,
  type FragmentGeometry,
  type FragmentObservation,
} from '../../src/components/app/navigation/initial-fragment-motion.js';

const geometry: FragmentGeometry = {
  documentY: 1200,
  offset: 80,
  viewportWidth: 1280,
  viewportHeight: 720,
  rangeX: 0,
  rangeY: 4000,
  targetX: 0,
  targetY: 1120,
};
const sample = (at: number, changes: Partial<FragmentObservation> = {}): FragmentObservation => ({
  at,
  x: 0,
  y: 1120,
  geometry,
  ready: true,
  visible: true,
  ...changes,
});

describe('初回fragmentの静止候補（native完了の証明ではない）', () => {
  it('hintなしは200msを要求する', () => {
    const window = new FragmentQuietWindow();
    for (let at = 0; at < 200; at += 25) expect(window.observe(sample(at))).toBe(false);
    expect(window.observe(sample(200))).toBe(true);
  });
  it('関連hintは100ms候補にし、最終検証は200msを維持する', () => {
    for (const final of [false, true]) {
      const window = new FragmentQuietWindow(final);
      window.observe(sample(0));
      window.hint(1);
      for (let at = 25; at < 100; at += 25) expect(window.observe(sample(at))).toBe(false);
      expect(window.observe(sample(100))).toBe(!final);
      for (let at = 125; at < 200; at += 25) window.observe(sample(at));
      expect(window.observe(sample(200))).toBe(true);
    }
  });
  it('観測前・移動前のstale hintは使わない', () => {
    const window = new FragmentQuietWindow();
    window.hint(0);
    window.observe(sample(10));
    window.hint(11);
    window.observe(sample(30, { y: 1110 }));
    for (let at = 55; at <= 130; at += 25)
      expect(window.observe(sample(at, { y: 1110 }))).toBe(false);
  });
  it('幾何が安定してもviewportが移動中なら取り直す', () => {
    const window = new FragmentQuietWindow();
    for (let at = 0; at <= 400; at += 25)
      expect(window.observe(sample(at, { y: 100 + at / 10 }))).toBe(false);
  });
  it('隣接frameの小さい幾何変化を累積して見逃さない', () => {
    const window = new FragmentQuietWindow();
    for (let index = 0; index < 20; index++)
      expect(
        window.observe(
          sample(index * 25, {
            geometry: { ...geometry, documentY: geometry.documentY + index * 0.4 },
          }),
        ),
      ).toBe(false);
  });
  for (const changed of [
    { ready: false },
    { visible: false },
    { geometry: { ...geometry, rangeY: 0 } },
    { geometry: { ...geometry, offset: 90 } },
    { geometry: { ...geometry, viewportHeight: 800 } },
  ])
    it(`readiness・可視性・幾何の変更で固定窓を破棄する: ${JSON.stringify(changed)}`, () => {
      const window = new FragmentQuietWindow();
      for (let at = 0; at <= 175; at += 25) window.observe(sample(at));
      expect(window.observe(sample(200, changed))).toBe(false);
      expect(window.observe(sample(225))).toBe(false);
    });
  it('50msは許可し51msのgapとhidden時間を除く', () => {
    const window = new FragmentQuietWindow();
    for (let at = 0; at <= 200; at += 50) window.observe(sample(at));
    expect(window.observe(sample(250))).toBe(true);
    expect(window.observe(sample(301))).toBe(false);
    expect(window.observe(sample(326))).toBe(false);
    window.observe(sample(350, { visible: false }));
    expect(window.observe(sample(3000))).toBe(false);
  });
  it('同時刻の再照会・逆行する時計をRAF観測として採らない', () => {
    const window = new FragmentQuietWindow();
    window.observe(sample(0));
    window.hint(0);
    for (let index = 0; index < 8; index++) expect(window.observe(sample(0))).toBe(false);
    expect(window.observe(sample(-1))).toBe(false);
  });
  it('非有限の幾何を証明にしない', () => {
    expect(sameFragmentGeometry(geometry, { ...geometry, documentY: NaN })).toBe(false);
  });
});

describe('一回だけの固定minimum-jerk軌道', () => {
  const origin = sample(1000, { y: 0 });
  const plan = () => {
    const value = planFragmentCorrection(origin, 10_000, false);
    if (!value) throw new Error('plan');
    return value;
  };
  it('距離・速度・加速度からdurationを決め、900msでcapしない', () => {
    const value = plan();
    expect(value.duration).toBeCloseTo(((1.875 * 1120) / 800) * 1000);
    expect(value.duration).toBeGreaterThan(900);
  });
  it('T+500ms検証+50ms余裕が残る境界だけで開始する', () => {
    const deadline = origin.at + plan().duration + 550;
    expect(planFragmentCorrection(origin, deadline, false)).not.toBeNull();
    expect(planFragmentCorrection(origin, deadline - 0.001, false)).toBeNull();
  });
  it('各小stepの始終点を固定し、規則的RAFで終点へ到達する', () => {
    const trajectory = new FragmentCorrectionTrajectory(plan());
    let x = origin.x;
    let y = origin.y;
    let done = false;
    for (let at = 1025; at <= 5000 && !done; at += 25) {
      const step = trajectory.next(sample(at, { x, y }));
      expect(step.kind).toBe('step');
      if (step.kind !== 'step') throw new Error(step.reason);
      expect(Math.abs(step.y - y)).toBeLessThanOrEqual(800 * 0.025 + 0.01);
      expect(step.y).toBeGreaterThanOrEqual(y);
      x = step.x;
      y = step.y;
      done = step.done;
      expect(trajectory.written(x, y)).toBe(true);
    }
    expect(done).toBe(true);
    expect(y).toBe(geometry.targetY);
  });
  it('51ms以上のgapはcatchupも最後のsnapも要求しない', () => {
    const trajectory = new FragmentCorrectionTrajectory(plan());
    expect(trajectory.next(sample(1051, { y: 0 }))).toEqual({
      kind: 'aborted',
      reason: 'frame-gap',
    });
  });
  it('1px未満の外乱も累積し、各stepでリセットしない', () => {
    const trajectory = new FragmentCorrectionTrajectory(plan());
    let y = 0;
    for (const at of [1025, 1050]) {
      const step = trajectory.next(sample(at, { y: y + 0.4 }));
      if (step.kind !== 'step') throw new Error(step.reason);
      y = step.y;
      trajectory.written(0, y);
    }
    expect(trajectory.next(sample(1075, { y: y + 0.4 }))).toEqual({
      kind: 'aborted',
      reason: 'external-motion',
    });
  });
  it('実測位置を曲線の原点へ取り込まない', () => {
    const trajectory = new FragmentCorrectionTrajectory(plan());
    const step = trajectory.next(sample(1025, { y: 0 }));
    if (step.kind !== 'step') throw new Error(step.reason);
    expect(trajectory.written(step.x, step.y + 1.01)).toBe(false);
  });
  it.each(['offset', 'documentY', 'rangeY', 'viewportHeight', 'targetY'] as const)(
    '%sの変更を固定目標へ比較する',
    (key) => {
      const trajectory = new FragmentCorrectionTrajectory(plan());
      expect(
        trajectory.next(
          sample(1025, { y: 0, geometry: { ...geometry, [key]: geometry[key] + 1.01 } }),
        ),
      ).toEqual({ kind: 'aborted', reason: 'geometry' });
    },
  );
  it('reduced motionでもeligibilityとbudgetを保持し、補間だけを省く', () => {
    const value = planFragmentCorrection(origin, 1550, true);
    if (!value) throw new Error('plan');
    expect(value.duration).toBe(0);
    expect(planFragmentCorrection(origin, 1549, true)).toBeNull();
    const trajectory = new FragmentCorrectionTrajectory(value);
    expect(trajectory.next(sample(1025, { y: 0 }))).toEqual({
      kind: 'step',
      x: 0,
      y: 1120,
      done: true,
    });
  });
  it('deadline到達後は既に整列していても成功stepにしない', () => {
    const value = plan();
    const trajectory = new FragmentCorrectionTrajectory(value);
    expect(trajectory.next(sample(value.deadline))).toEqual({
      kind: 'aborted',
      reason: 'deadline',
    });
  });
});
