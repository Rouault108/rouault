import { describe, expect, it } from 'vitest';

import { createInternalDocumentRouteSet } from '../../shared/navigation/internal-document-route-set.js';
import { createSearchRouteAllowlistPredicate } from '../../shared/search/search-route-allowlist.js';

describe('createSearchRouteAllowlistPredicate', () => {
  it('strict match を許可すること', () => {
    const routeSet = createInternalDocumentRouteSet(['/notes/a']);
    const predicate = createSearchRouteAllowlistPredicate(routeSet);

    expect(predicate('/notes/a')).toBe(true);
  });

  it('検索 canonical の末尾 slash ありを route manifest の末尾 slash なしに照合すること', () => {
    const routeSet = createInternalDocumentRouteSet(['/notes/a']);
    const predicate = createSearchRouteAllowlistPredicate(routeSet);

    expect(predicate('/notes/a/')).toBe(true);
  });

  it('異なる pathname は許可しないこと', () => {
    const routeSet = createInternalDocumentRouteSet(['/notes/a']);
    const predicate = createSearchRouteAllowlistPredicate(routeSet);

    expect(predicate('/notes/b/')).toBe(false);
  });

  it('route manifest 側の末尾 slash ありを検索側の末尾 slash なしへ逆方向補正しないこと', () => {
    const routeSet = createInternalDocumentRouteSet(['/notes/a/']);
    const predicate = createSearchRouteAllowlistPredicate(routeSet);

    expect(predicate('/notes/a')).toBe(false);
  });

  it('root は strict match のみ許可すること', () => {
    const routeSet = createInternalDocumentRouteSet(['/']);
    const predicate = createSearchRouteAllowlistPredicate(routeSet);

    expect(predicate('/')).toBe(true);
  });

  it('root は routeSet に root がない場合は許可しないこと', () => {
    const routeSet = createInternalDocumentRouteSet(['/notes/a']);
    const predicate = createSearchRouteAllowlistPredicate(routeSet);

    expect(predicate('/')).toBe(false);
  });
});
