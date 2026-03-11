import { expect, fixture, html } from '@open-wc/testing';

import { navigateToUrl } from '../../src/lib/search/navigation.js';

describe('search-navigation', () => {
  it('app-router が存在する場合は SPA navigate を優先すること', async () => {
    const host = await fixture<HTMLElement>(html`<app-router></app-router>`);
    let navigatedUrl = '';

    (host as HTMLElement & { navigate: (url: string) => Promise<void> }).navigate = (url: string) => {
      navigatedUrl = url;
      return Promise.resolve();
    };

    await navigateToUrl('/search?q=router');

    expect(navigatedUrl).to.equal('/search?q=router');
    host.remove();
  });

  it('app-router が存在しない場合は location.assign にフォールバックすること', async () => {
    let assignedUrl = '';

    await navigateToUrl('/tags/music/', {
      assign: (url) => {
        assignedUrl = url;
      },
    });

    expect(assignedUrl).to.equal('/tags/music/');
  });
});
