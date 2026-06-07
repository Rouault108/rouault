import { describe, expect, it } from 'vitest';
import { buildPaginationItems } from '../../shared/pagination/pagination-items.js';

describe('buildPaginationItems', () => {
  it('returns status-only previous / status / next items', () => {
    expect(buildPaginationItems({ currentPage: 3, totalPages: 10 })).toEqual([
      { kind: 'previous', page: 2, disabled: false },
      { kind: 'status', currentPage: 3, totalPages: 10 },
      { kind: 'next', page: 4, disabled: false },
    ]);
  });

  it('normalizes invalid totalPages to 1 without throwing', () => {
    for (const totalPages of [
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(buildPaginationItems({ currentPage: 2, totalPages })).toEqual([
        { kind: 'previous', page: 1, disabled: true },
        { kind: 'status', currentPage: 1, totalPages: 1 },
        { kind: 'next', page: 1, disabled: true },
      ]);
    }
  });

  it('truncates decimals and clamps currentPage within totalPages', () => {
    expect(buildPaginationItems({ currentPage: 2.9, totalPages: 5.8 })).toEqual([
      { kind: 'previous', page: 1, disabled: false },
      { kind: 'status', currentPage: 2, totalPages: 5 },
      { kind: 'next', page: 3, disabled: false },
    ]);

    expect(buildPaginationItems({ currentPage: 999, totalPages: 5 })).toEqual([
      { kind: 'previous', page: 4, disabled: false },
      { kind: 'status', currentPage: 5, totalPages: 5 },
      { kind: 'next', page: 5, disabled: true },
    ]);

    expect(buildPaginationItems({ currentPage: -999, totalPages: 5 })).toEqual([
      { kind: 'previous', page: 1, disabled: true },
      { kind: 'status', currentPage: 1, totalPages: 5 },
      { kind: 'next', page: 2, disabled: false },
    ]);

    expect(buildPaginationItems({ currentPage: Number.POSITIVE_INFINITY, totalPages: 5 })).toEqual([
      { kind: 'previous', page: 4, disabled: false },
      { kind: 'status', currentPage: 5, totalPages: 5 },
      { kind: 'next', page: 5, disabled: true },
    ]);
  });
});
