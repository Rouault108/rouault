import { describe, expect, it } from 'vitest';
import {
  InitialFragmentGeometryWindow,
  sameInitialFragmentPoint,
} from '../../src/navigation/initial-fragment-motion.js';
import { decodeInitialFragmentIdentifier } from '../../src/navigation/initial-fragment-target.js';

const geometry = (y: number, identity: object | string = 'heading', motionRevision = 0) => ({
  identity,
  values: [0, y, 24, 80, 10000],
  motionRevision,
});

describe('初回fragmentの有限geometry観測', () => {
  it('採用済みの旧目標との差で収集中windowを毎frame作り直さない', () => {
    const window = new InitialFragmentGeometryWindow();
    for (let index = 0; index < 3; index += 1) window.observe(geometry(1000));
    expect([1100, 1100, 1100, 1100, 1100].map((y) => window.observe(geometry(y)))).toEqual([
      { stable: false, revision: 1 },
      { stable: false, revision: 1 },
      { stable: true, revision: 2 },
      { stable: true, revision: 2 },
      { stable: true, revision: 2 },
    ]);
  });

  it('固定基準の両側への振れは区間幅で拒否し現在値から取り直す', () => {
    const window = new InitialFragmentGeometryWindow();
    window.observe(geometry(1000));
    window.observe(geometry(1001.5));
    expect(window.observe(geometry(998.5))).toEqual({ stable: false, revision: 0 });
    expect(window.observe(geometry(998.5)).stable).toBe(false);
    expect(window.observe(geometry(998.5))).toEqual({ stable: true, revision: 1 });
  });

  it('微小driftの短い区間は許容し発行済み目標との累積差は失わない', () => {
    const window = new InitialFragmentGeometryWindow();
    window.observe(geometry(1000));
    window.observe(geometry(1000.9));
    expect(window.observe(geometry(1001.8))).toEqual({ stable: true, revision: 1 });
    const issued = { x: 0, y: 1001.8 };
    expect(window.observe(geometry(1002.7)).stable).toBe(false);
    expect(window.observe(geometry(1003.6)).stable).toBe(false);
    expect(window.observe(geometry(1004.5))).toEqual({ stable: true, revision: 2 });
    expect(sameInitialFragmentPoint(issued, { x: 0, y: 1004.5 })).toBe(false);
  });

  it('同じ座標の新nodeでもfresh区間を必要としmotion変更は別世代で扱う', () => {
    const window = new InitialFragmentGeometryWindow();
    const first = {};
    const replacement = {};
    for (let index = 0; index < 3; index += 1) window.observe(geometry(1000, first));
    expect(window.matches(geometry(1000, replacement))).toBe(false);
    expect(window.observe(geometry(1000, replacement)).stable).toBe(false);
    window.observe(geometry(1000, replacement));
    expect(window.observe(geometry(1000, replacement))).toEqual({ stable: true, revision: 2 });
    expect(window.observe(geometry(1000, replacement, 1)).stable).toBe(false);
    window.observe(geometry(1000, replacement, 1));
    expect(window.observe(geometry(1000, replacement, 1))).toEqual({ stable: true, revision: 2 });
  });

  it('callback後の照合は新frameを加えずgeometryの変化を検出する', () => {
    const window = new InitialFragmentGeometryWindow();
    window.observe(geometry(1000));
    window.observe(geometry(1000));
    expect(window.matches(geometry(1000))).toBe(false);
    expect(window.observe(geometry(1000))).toEqual({ stable: true, revision: 1 });
    expect(window.matches(geometry(1003))).toBe(false);
    expect(window.matches(geometry(1000, 'heading', 1))).toBe(false);
    expect(window.matches(geometry(1000))).toBe(true);
    expect(window.observe(geometry(1000))).toEqual({ stable: true, revision: 1 });
  });

  it('callerの配列再利用を過去sampleに反映せず無効値やreset後は3sampleを取り直す', () => {
    const window = new InitialFragmentGeometryWindow();
    const mutable = geometry(1000);
    window.observe(mutable);
    mutable.values[1] = 5000;
    window.observe(geometry(1000));
    expect(window.observe(geometry(1000))).toEqual({ stable: true, revision: 1 });
    expect(window.observe(geometry(Number.NaN))).toEqual({ stable: false, revision: 1 });
    window.observe(geometry(1000));
    expect(window.observe(geometry(1000)).stable).toBe(false);
    expect(window.observe(geometry(1000)).stable).toBe(true);
    window.resetWindow();
    expect(window.matches(geometry(1000))).toBe(false);
    expect(window.observe(geometry(1000))).toEqual({ stable: false, revision: 1 });
  });

  it('要求目標の許容差は軸ごとに判定し非有限値を近接とみなさない', () => {
    expect(sameInitialFragmentPoint({ x: 0, y: 1000 }, { x: 2, y: 1002 })).toBe(true);
    expect(sameInitialFragmentPoint({ x: 0, y: 1000 }, { x: 0, y: 1002.01 })).toBe(false);
    expect(sameInitialFragmentPoint({ x: 0, y: 1000 }, { x: 0, y: Number.NaN })).toBe(false);
  });
});

describe('初回fragment識別子のbyte復号', () => {
  it.each([
    ['%61%ZZ', 'a%ZZ'],
    ['%C3%28', '\uFFFD('],
    ['%EF%BB%BFtop', '\uFEFFtop'],
    ['%2525', '%25'],
    ['a+b', 'a+b'],
    ['%E6%97%A5%E6%9C%AC%E8%AA%9E', '日本語'],
    ['日本語', '日本語'],
    ['%', '%'],
  ])('有効percentだけを一度復号する: %s', (raw, decoded) => {
    expect(decodeInitialFragmentIdentifier(raw)).toBe(decoded);
  });
});
