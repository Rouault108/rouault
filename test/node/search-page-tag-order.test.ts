import { describe, expect, it } from 'vitest';
import { orderSearchPageTags } from '../../src/search/search-page-tag-order.js';

describe('orderSearchPageTags', () => {
  it('allTagCounts の降順を表示件数・選択状態から分離すること', () => {
    const allTagCounts = Object.freeze({ music: 4, architecture: 3, security: 1 });
    const tagCounts = Object.freeze({ architecture: 2, music: 0 });
    const selectedTags = Object.freeze(['security']);
    expect(orderSearchPageTags({ allTagCounts, tagCounts, selectedTags })).toEqual([
      'music',
      'architecture',
      'security',
    ]);
    expect(
      orderSearchPageTags({
        allTagCounts,
        tagCounts: { security: 20, music: 30, architecture: 1 },
        selectedTags: ['architecture', 'music'],
      }),
    ).toEqual(['music', 'architecture', 'security']);
    expect(allTagCounts).toEqual({ music: 4, architecture: 3, security: 1 });
    expect(tagCounts).toEqual({ architecture: 2, music: 0 });
    expect(selectedTags).toEqual(['security']);
  });

  it('日本語照合と code unit tie-break で挿入順に依存しないこと', () => {
    const labels = ['音楽', '建築', 'Ａ', 'A', 'é', 'e\u0301'];
    const expected = ['A', 'Ａ', 'e\u0301', 'é', '音楽', '建築'];
    for (const tags of [labels, [...labels].reverse()]) {
      expect(
        orderSearchPageTags({
          allTagCounts: Object.fromEntries(tags.map((tag) => [tag, 2])),
          tagCounts: {},
          selectedTags: tags,
        }),
      ).toEqual(expected);
    }
    for (const selectedTags of [
      ['é', 'e\u0301'],
      ['e\u0301', 'é'],
    ]) {
      expect(orderSearchPageTags({ allTagCounts: {}, tagCounts: {}, selectedTags })).toEqual([
        'e\u0301',
        'é',
      ]);
    }
  });

  it('tagCounts-only と selected-only は ordering count 0 とし共通行の相対順を保つこと', () => {
    const allTagCounts = { music: 4, architecture: 3 };
    const tagCounts = { zero: 99 };
    const base = orderSearchPageTags({ allTagCounts, tagCounts, selectedTags: [] });
    expect(base).toEqual(['music', 'architecture', 'zero']);
    const withSelected = orderSearchPageTags({ allTagCounts, tagCounts, selectedTags: ['absent'] });
    expect(withSelected).toEqual(['music', 'architecture', 'absent', 'zero']);
    expect(withSelected.filter((tag) => base.includes(tag))).toEqual(base);
    expect(orderSearchPageTags({ allTagCounts: {}, tagCounts: {}, selectedTags: [] })).toEqual([]);
  });
});
