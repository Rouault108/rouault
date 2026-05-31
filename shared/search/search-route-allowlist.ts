export interface SearchRouteSetLike {
  readonly has: (pathname: string) => boolean;
}

export type SearchRouteAllowlistPredicate = (pathname: string) => boolean;

/**
 * Search canonical pathname と internal route manifest pathname の境界専用 predicate。
 *
 * Search canonical は document URL を末尾 slash ありへ正規化する一方、
 * route manifest は router 比較用に note URL の末尾 slash を落とす場合がある。
 *
 * ここでは route policy 自体は変更せず、検索 allowlist 判定だけでその差を吸収する。
 */
export const createSearchRouteAllowlistPredicate = (
  routeSet: SearchRouteSetLike,
): SearchRouteAllowlistPredicate => {
  return (pathname: string): boolean => {
    if (routeSet.has(pathname)) {
      return true;
    }

    if (pathname !== '/' && pathname.endsWith('/') && routeSet.has(pathname.slice(0, -1))) {
      return true;
    }

    return false;
  };
};
