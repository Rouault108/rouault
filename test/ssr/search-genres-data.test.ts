import { describe, expect, it } from 'vitest';

import { buildSearchGenres } from '../../src/data/searchGenres.js';
import type { SourceNote } from '../../src/data/notes.js';

describe('buildSearchGenres', () => {
  it('重複と空文字を除去し、日本語ロケールでソートする', () => {
    const notes: SourceNote[] = [
      { genre: ['music', ' jazz ', ''] },
      { genre: ['music', 'classical'] },
    ];

    expect(buildSearchGenres(notes)).toEqual(['classical', 'jazz', 'music']);
  });

  it('status=draft だけを除外する', () => {
    const notes: SourceNote[] = [
      { status: 'draft', genre: ['private'] },
      { status: 'archived', genre: ['archived'] },
      { status: '', genre: ['public'] },
    ];

    expect(buildSearchGenres(notes)).toEqual(['archived', 'public']);
  });
});
