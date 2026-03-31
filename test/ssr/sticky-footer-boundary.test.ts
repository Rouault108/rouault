import { describe, expect, it } from 'vitest';

import {
  computeStickyFooterOffset,
  computeStickyMaxBlockSize,
} from '../../src/layout/sticky-footer-boundary.js';

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
});

describe('computeStickyFooterOffset', () => {
  it('footer が見えていない間は 0 を返すこと', () => {
    expect(
      computeStickyFooterOffset({
        footerTop: null,
        viewportHeight: 900,
      }),
    ).toBe(0);
  });

  it('footer が viewport 内へ入ったら侵入量を返すこと', () => {
    expect(
      computeStickyFooterOffset({
        footerTop: 640,
        viewportHeight: 900,
      }),
    ).toBe(260);
  });

  it('footer が viewport 上端を越えても負値を返さないこと', () => {
    expect(
      computeStickyFooterOffset({
        footerTop: 48,
        viewportHeight: 900,
      }),
    ).toBe(852);
  });
});
