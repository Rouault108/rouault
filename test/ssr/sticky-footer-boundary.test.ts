import { describe, expect, it } from 'vitest';

import { computeStickyMaxBlockSize } from '../../src/lib/layout/sticky-footer-boundary.js';

describe('computeStickyMaxBlockSize', () => {
  it('footer が見えていない間は viewport 基準の高さを返すこと', () => {
    expect(
      computeStickyMaxBlockSize({
        footerTop: null,
        stickyTop: 72,
        viewportHeight: 900,
      }),
    ).toBe(828);
  });

  it('footer が viewport 内へ入ったら footer 手前で高さを打ち切ること', () => {
    expect(
      computeStickyMaxBlockSize({
        footerTop: 640,
        stickyTop: 72,
        viewportHeight: 900,
      }),
    ).toBe(568);
  });

  it('footer が sticky 開始位置より上なら 0 を返すこと', () => {
    expect(
      computeStickyMaxBlockSize({
        footerTop: 48,
        stickyTop: 72,
        viewportHeight: 900,
      }),
    ).toBe(0);
  });
});
