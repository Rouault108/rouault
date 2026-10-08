import type { SearchState } from '../../shared/search/search-types.js';

export const SEARCH_PAGE_TAG_MODE_OPTIONS = [
  ['or', 'いずれかに一致'],
  ['and', 'すべてに一致'],
] as const satisfies readonly (readonly [SearchState['tagMode'], string])[];

const TAG_MODE_COUNT_DESCRIPTIONS = {
  or: '件数は、選択中タグを外した候補全体で各タグに一致する件数です。追加後の増加件数ではありません。',
  and: '件数は、現在の条件にそのタグを追加した後の結果件数です。',
} as const satisfies Record<SearchState['tagMode'], string>;

export type SearchPageTagOptionState = 'available' | 'selected' | 'disabled' | 'pending' | 'error';
export type SearchPageTagCountStatus = 'ready' | 'pending' | 'error';

export interface SearchPageTagOptionPresentation {
  readonly count: number | null;
  readonly countStatus: SearchPageTagCountStatus;
  readonly state: SearchPageTagOptionState;
  readonly disabled: boolean;
  readonly statusText: string;
}

export const getSearchPageTagModeLabel = (tagMode: SearchState['tagMode']): string =>
  SEARCH_PAGE_TAG_MODE_OPTIONS.find(([value]) => value === tagMode)?.[1] ??
  SEARCH_PAGE_TAG_MODE_OPTIONS[0][1];

export const getSearchPageTagModeCountDescription = (tagMode: SearchState['tagMode']): string =>
  TAG_MODE_COUNT_DESCRIPTIONS[tagMode];

const readCount = (counts: Readonly<Record<string, number>>, tag: string): number => {
  const count = counts[tag];
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : 0;
};

export const getSearchPageTagOptionPresentation = (options: {
  readonly tag: string;
  readonly tagMode: SearchState['tagMode'];
  readonly selectedTags: readonly string[];
  readonly tagCounts: Readonly<Record<string, number>>;
  readonly allTagCounts: Readonly<Record<string, number>>;
  readonly countStatus?: SearchPageTagCountStatus;
}): SearchPageTagOptionPresentation => {
  const selected = options.selectedTags.includes(options.tag);
  const countStatus = options.countStatus ?? 'ready';
  if (countStatus !== 'ready') {
    const pending = countStatus === 'pending';
    return {
      count: null,
      countStatus,
      state: selected ? 'selected' : countStatus,
      disabled: false,
      statusText: selected
        ? pending
          ? '選択中・件数を計算中'
          : '選択中・件数を取得できません'
        : pending
          ? '件数を計算中'
          : '件数を取得できません',
    };
  }

  // OR候補は現在の選択タグをすべて外したquery一致集合Q、AND候補は現在の
  // 絞り込み集合Fに候補を追加した共通部分を表す。検索coreの結果集合は変更しない。
  const count = readCount(
    options.tagMode === 'or' ? options.allTagCounts : options.tagCounts,
    options.tag,
  );
  const state: SearchPageTagOptionState = selected
    ? 'selected'
    : count === 0
      ? 'disabled'
      : 'available';

  return {
    count,
    countStatus: 'ready',
    state,
    disabled: state === 'disabled',
    statusText:
      state === 'selected'
        ? `${String(count)}件・選択中`
        : state === 'disabled'
          ? `${String(count)}件・選択不可`
          : `${String(count)}件`,
  };
};
