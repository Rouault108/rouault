import { describe, expect, it } from 'vitest';
import { resolveHeadingScrollOffset } from '../../src/navigation/heading-scroll-offset.js';

describe('見出しの共通scroll offset', () => {
  it.each([
    ['48px', '32px', 48, 32, 80],
    ['48.5px', '12.25px', 48.5, 12.25, 60.75],
    ['0px', '0px', 0, 0, 0],
    ['auto', '32px', 0, 32, 32],
    ['48px', 'normal', 48, 0, 48],
    ['-16px', '-32px', 0, 0, 0],
    ['Infinity', 'NaN', 0, 0, 0],
    ['', '', 0, 0, 0],
  ] as const)(
    '%sと%sは有限非負のpaddingとmarginを一度だけ加算する',
    (padding, margin, top, gap, sum) => {
      expect(resolveHeadingScrollOffset(padding, margin)).toEqual({
        scrollPaddingTop: top,
        scrollMarginTop: gap,
        offset: sum,
      });
    },
  );
});
