import { describe, expect, it } from 'vitest';
import { buildSearchProjection } from '../../build/search/build-search-projection.js';

const note = { title: 'Example', slug: 'example', permalink: '/notes/example/', genre: ['tag'] };
const html = new Map([
  ['/notes/example/', '<main data-note-static-surface><p>final HTML</p></main>'],
]);

describe('search projection publication and metadata join', () => {
  it('final HTMLを本文正本とし、同一入力から同一projectionを生成する', () => {
    const input = [
      {
        ...note,
        content: 'Markdown must not be indexed',
        date: '2026-01-01',
        updated: '2026-09-24',
      },
    ];
    const result = buildSearchProjection(input, html);
    expect(result).toEqual(buildSearchProjection(input, html));
    expect(result.documents[0]).toMatchObject({
      title: 'Example',
      body: 'final HTML',
      tags: ['tag'],
      date: '2026-09-24',
    });
    expect(result.passages[0]?.text).toBe('final HTML');
  });

  it('非公開surfaceはHTML取得を要求せず除外する', () => {
    expect(
      buildSearchProjection(
        [
          { ...note, kind: 'testing' },
          { ...note, kind: 'demo' },
          { ...note, excludeFromPublicationSurfaces: true },
        ],
        new Map(),
      ),
    ).toEqual({ documents: [], passages: [] });
  });

  it('metadata欠落・canonical重複・HTML欠落を黙って落とさない', () => {
    expect(() => buildSearchProjection([{ ...note, title: '' }], html)).toThrow('metadata join');
    expect(() => buildSearchProjection([note, note], html)).toThrow('Duplicate search canonical');
    expect(() => buildSearchProjection([note], new Map())).toThrow('Missing search HTML');
  });

  it('空本文でもdocument metadataを保持する', () => {
    const result = buildSearchProjection(
      [note],
      new Map([['/notes/example/', '<main data-note-static-surface></main>']]),
    );
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.body).toBe('');
    expect(result.passages).toEqual([]);
  });
});
