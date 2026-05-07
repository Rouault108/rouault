import { expect, fixture, html } from '@open-wc/testing';

import {
  dispatchSearchReturnToReading,
  handleSearchReturnToReadingEvent,
  navigateToUrl,
} from '../../src/search/navigation.js';
import { searchReturnToReadingEventName } from '../../src/search/search-dialog-events.js';

describe('search-navigation', () => {
  it('app-router が存在する場合は SPA navigate を優先すること', async () => {
    const host = await fixture<HTMLElement>(html`<app-router></app-router>`);
    let navigatedUrl = '';

    (host as HTMLElement & { navigate: (url: string) => Promise<unknown> }).navigate = (
      url: string,
    ) => {
      navigatedUrl = url;
      return Promise.resolve();
    };

    await navigateToUrl('/search/?q=router');

    expect(navigatedUrl).to.equal('/search/?q=router');
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

  it('return-to-reading event を navigation adapter が URL navigation へ変換すること', async () => {
    const target = new EventTarget();
    let assignedUrl = '';
    let observedType = '';

    target.addEventListener(searchReturnToReadingEventName, (event) => {
      observedType = event.type;
      void handleSearchReturnToReadingEvent(event, {
        assign: (url) => {
          assignedUrl = url;
        },
        resolveRouter: () => null,
      });
    });

    const dispatched = dispatchSearchReturnToReading(
      {
        eventName: searchReturnToReadingEventName,
        routeId: '/notes/search-result/',
        url: '/notes/search-result/',
        canonicalUrl: '/notes/search-result/',
        title: 'Search Result',
        query: 'search',
        selectionMethod: 'keyboard',
      },
      { target },
    );

    expect(dispatched).to.equal(true);
    expect(observedType).to.equal(searchReturnToReadingEventName);
    expect(assignedUrl).to.equal('/notes/search-result/');
  });
});
