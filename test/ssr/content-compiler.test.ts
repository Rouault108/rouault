import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadNotesData, type SourceNote } from '../../build/data/notes.js';
import { loadMemosData } from '../../build/data/memos.js';

describe('generated content compatibility surface', () => {
  it('同期loaderが既存JSON形式からnotesとfixtureの目次を投影できる', () => {
    const sources: SourceNote[] = JSON.parse(readFileSync('.velite/notes.json', 'utf8'));
    expect(sources.length).toBeGreaterThan(0);
    expect(new Set(sources.map((note) => note.sourceRoot))).toEqual(
      new Set(['content/notes', 'test/fixtures/content/notes']),
    );
    for (const note of sources) {
      expect(typeof note.title).toBe('string');
      expect(note.slug).not.toMatch(/\.md$/u);
      expect(note).not.toHaveProperty('toc');
      expect(note).not.toHaveProperty('links');
      expect(note).not.toHaveProperty('publicationRegistry');
      if (note.date) expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}T/u);
    }
    const notes = loadNotesData();
    expect(notes.some((note) => note.tocHeadings.length > 0)).toBe(true);
    const staticFixture = notes.find((note) => note.e2eFixtureId === 'note.toc-static-present');
    expect(staticFixture?.tocCapabilities).toEqual({
      activeTracking: false,
      dynamicScopes: false,
      mobilePanel: false,
    });
  });
  it('memosは同期loaderを維持し、検索等の掲載を許可しない', () => {
    for (const memo of loadMemosData()) {
      expect(memo.license).toBe('CC BY 4.0');
      expect(memo.surfaces).toEqual({ home: false, tags: false, corpora: false, search: false });
      expect(memo).not.toHaveProperty('genre');
    }
  });
});
