import { describe, expect, it } from 'vitest';
import {
  createRouterHistoryState,
  updateExistingRouterHistoryUrl,
} from '../../shared/navigation/history-state.js';

describe('navigation history state', () => {
  it('routerの復元URLを更新し未知のfieldと読書位置を保持すること', () => {
    const state = { __routerUrl: '/search/', foreign: { reading: 42 } };
    const next = updateExistingRouterHistoryUrl(state, '/search/?q=latest');
    expect(next).toEqual({ __routerUrl: '/search/?q=latest', foreign: { reading: 42 } });
    expect(state.__routerUrl).toBe('/search/');
    expect(createRouterHistoryState(state, '/notes/a/')).toEqual({
      __routerUrl: '/notes/a/',
      foreign: { reading: 42 },
    });
  });

  it('router stateのないentryはscalar・array・未知objectを含め変更しないこと', () => {
    for (const state of [null, undefined, 'foreign', 42, ['reading', 42], { reading: 42 }]) {
      expect(updateExistingRouterHistoryUrl(state, '/search/?q=latest')).toBe(state);
    }
    expect(createRouterHistoryState(undefined, '/search/')).toEqual({ __routerUrl: '/search/' });
  });
});
