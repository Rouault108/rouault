import { describe, expect, it } from 'vitest';

import {
  getSearchPageTagModeCountDescription,
  getSearchPageTagOptionPresentation,
  SEARCH_PAGE_TAG_MODE_OPTIONS,
} from '../../src/search/search-page-tag-option.js';

const counts = {
  allTagCounts: { architecture: 9, music: 4, selectedZero: 0 },
  tagCounts: { architecture: 2, music: 0, selectedZero: 0 },
} as const;

describe('search page tag option presentation', () => {
  it('OR は query 一致集合Qの件数を使い、増分やFの件数として扱わないこと', () => {
    expect(
      getSearchPageTagOptionPresentation({
        ...counts,
        tag: 'music',
        tagMode: 'or',
        selectedTags: ['architecture', 'architecture'],
      }),
    ).toEqual({
      count: 4,
      countStatus: 'ready',
      state: 'available',
      disabled: false,
      statusText: '4件',
    });
  });

  it('AND は現在のFへ候補を追加した件数を使い、未選択0件だけを無効にすること', () => {
    expect(
      getSearchPageTagOptionPresentation({
        ...counts,
        tag: 'architecture',
        tagMode: 'and',
        selectedTags: ['music'],
      }),
    ).toEqual({
      count: 2,
      countStatus: 'ready',
      state: 'available',
      disabled: false,
      statusText: '2件',
    });
    expect(
      getSearchPageTagOptionPresentation({
        ...counts,
        tag: 'music',
        tagMode: 'and',
        selectedTags: ['architecture'],
      }),
    ).toEqual({
      count: 0,
      countStatus: 'ready',
      state: 'disabled',
      disabled: true,
      statusText: '0件・選択不可',
    });
  });

  it('選択済み0件は重複選択値があっても解除可能なselected状態を保つこと', () => {
    expect(
      getSearchPageTagOptionPresentation({
        ...counts,
        tag: 'selectedZero',
        tagMode: 'and',
        selectedTags: ['selectedZero', 'selectedZero'],
      }),
    ).toEqual({
      count: 0,
      countStatus: 'ready',
      state: 'selected',
      disabled: false,
      statusText: '0件・選択中',
    });
  });

  it('応答待ちは旧count mapを再解釈せず、候補操作と選択解除を継続できること', () => {
    expect(
      getSearchPageTagOptionPresentation({
        ...counts,
        tag: 'music',
        tagMode: 'and',
        selectedTags: ['selectedZero'],
        countStatus: 'pending',
      }),
    ).toEqual({
      count: null,
      countStatus: 'pending',
      state: 'pending',
      disabled: false,
      statusText: '件数を計算中',
    });
    expect(
      getSearchPageTagOptionPresentation({
        ...counts,
        tag: 'selectedZero',
        tagMode: 'and',
        selectedTags: ['selectedZero'],
        countStatus: 'pending',
      }),
    ).toEqual({
      count: null,
      countStatus: 'pending',
      state: 'selected',
      disabled: false,
      statusText: '選択中・件数を計算中',
    });
  });

  it('取得失敗は計算中と区別し、候補操作と選択解除を継続できること', () => {
    expect(
      getSearchPageTagOptionPresentation({
        ...counts,
        tag: 'music',
        tagMode: 'and',
        selectedTags: ['selectedZero'],
        countStatus: 'error',
      }),
    ).toEqual({
      count: null,
      countStatus: 'error',
      state: 'error',
      disabled: false,
      statusText: '件数を取得できません',
    });
    expect(
      getSearchPageTagOptionPresentation({
        ...counts,
        tag: 'selectedZero',
        tagMode: 'and',
        selectedTags: ['selectedZero'],
        countStatus: 'error',
      }),
    ).toEqual({
      count: null,
      countStatus: 'error',
      state: 'selected',
      disabled: false,
      statusText: '選択中・件数を取得できません',
    });
  });

  it('組み合わせラベルとモード別説明を固定すること', () => {
    expect(SEARCH_PAGE_TAG_MODE_OPTIONS).toEqual([
      ['or', 'いずれかに一致'],
      ['and', 'すべてに一致'],
    ]);
    expect(getSearchPageTagModeCountDescription('or')).toContain('増加件数ではありません');
    expect(getSearchPageTagModeCountDescription('and')).toContain('追加した後の結果件数');
  });
});
