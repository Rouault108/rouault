import { expect } from '@open-wc/testing';

import { createHistoryStateWithUrl, updateHashInCurrentUrl } from '../../src/lib/url-hash.js';

describe('url-hash', () => {
  it('router state を保ったまま __routerUrl と __routerPath を更新すること', () => {
    const nextState = createHistoryStateWithUrl(
      { customData: 'value', __routerUrl: '/old', __routerPath: '/old' },
      '/notes/example?view=full#intro',
      'https://example.com',
    );

    expect(nextState).to.deep.equal({
      customData: 'value',
      __routerUrl: '/notes/example?view=full#intro',
      __routerPath: '/notes/example',
    });
  });

  it('現在URLに hash を追加する際も router state を同期すること', () => {
    const originalPushState = history.pushState.bind(history);
    const originalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    history.replaceState({}, '', '/notes/example?view=full');

    let capturedUrl = '';
    let capturedState: unknown = null;

    history.pushState = ((data: unknown, unused: string, url?: string | URL | null) => {
      capturedState = data;
      capturedUrl = typeof url === 'string' ? url : String(url ?? '');
    }) as typeof history.pushState;

    try {
      const nextUrl = updateHashInCurrentUrl('intro', 'push');

      expect(nextUrl).to.equal('/notes/example?view=full#intro');
      expect(capturedUrl).to.equal('/notes/example?view=full#intro');
      expect(capturedState).to.deep.equal({
        __routerUrl: '/notes/example?view=full#intro',
        __routerPath: '/notes/example',
      });
    } finally {
      history.pushState = originalPushState;
      history.replaceState({}, '', originalUrl);
    }
  });
});
