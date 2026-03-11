import { describe, expect, it } from 'vitest';

import { buildSearchGenres } from '../../src/data/searchGenres.js';
import type { SourceNote } from '../../src/data/notes.js';

describe('buildSearchGenres', () => {
  it('重複と空文字を除去し、日本語ロケールでソートする', () => {
    const notes: SourceNote[] = [
      { genre: ['music', ' jazz ', ''] },
      { genre: ['music', 'classical'] },
    ];

    expect(buildSearchGenres(notes, false)).toEqual(['classical', 'jazz', 'music']);
  });

  it('production では draft を除外する', () => {
    const notes: SourceNote[] = [
      { draft: true, genre: ['private'] },
      { draft: false, genre: ['public'] },
    ];

    expect(buildSearchGenres(notes, true)).toEqual(['public']);
  });
});
