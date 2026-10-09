const isHistoryStateRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const createRouterHistoryState = (
  state: Record<string, unknown> | undefined,
  url: string,
): Record<string, unknown> => ({
  ...(isHistoryStateRecord(state) ? state : {}),
  __routerUrl: url,
});

// 検索等の同一文書内URL更新でも、routerが保存した復元先だけは現在URLにそろえる。
// router stateがないentryには追加せず、未知のstateはそのまま保持する。
export const updateExistingRouterHistoryUrl = (state: unknown, url: string): unknown =>
  isHistoryStateRecord(state) && Object.hasOwn(state, '__routerUrl')
    ? createRouterHistoryState(state, url)
    : state;
