import { expect } from '@open-wc/testing';

import { initSearch } from '../../src/lib/search/bootstrap.js';
import { searchCore } from '../../src/lib/search/search-core.js';

interface TestSearchDialogElement extends HTMLElement {
  opened: boolean;
  query: string;
  requestOpen(trigger?: HTMLElement): void;
  searcher?: (context: {
    query: string;
    signal: AbortSignal;
  }) => Promise<{ items: readonly unknown[] }>;
}

describe('search-bootstrap', () => {
  it('dialog searcher と open request を searchCore に接続すること', async () => {
    const originalSearch = searchCore.search.bind(searchCore);
    const requests: unknown[] = [];
    let openedWith: HTMLElement | undefined;

    searchCore.search = async (request) => {
      requests.push(request);
      return {
        mode: 'navigate',
        items: [
          {
            canonicalUrl: '/notes/router/',
            url: '/notes/router/',
            pathLabel: 'notes / router',
            title: 'Router 設計メモ',
            description: 'desc',
            date: {
              epochMs: Date.parse('2026-03-01'),
              original: '2026-03-01',
            },
            tags: ['architecture'],
            snippet: null,
            reasons: [{ kind: 'title-prefix', tokens: ['router'] }],
          },
        ],
        total: 1,
        rankingProfileId: 'rouault-search-v1',
        diagnostics: {
          degraded: false,
          activeSources: ['catalog'],
          failures: [],
          issues: [],
        },
      };
    };

    const dialog = document.createElement('div') as TestSearchDialogElement;
    dialog.id = 'global-search-dialog';
    dialog.opened = false;
    dialog.query = '';
    dialog.requestOpen = (trigger?: HTMLElement) => {
      openedWith = trigger;
    };
    document.body.append(dialog);

    const trigger = document.createElement('button');
    document.body.append(trigger);

    try {
      initSearch();
      trigger.dispatchEvent(
        new CustomEvent('open-search-dialog', {
          bubbles: true,
          composed: true,
        }),
      );

      expect(openedWith).to.equal(trigger);
      const result = await dialog.searcher?.({
        query: 'router',
        signal: new AbortController().signal,
      });

      expect(requests).to.deep.equal([
        {
          mode: 'navigate',
          q: 'router',
          tags: [],
          tagMode: 'or',
          sort: 'relevance',
        },
      ]);
      expect(result?.items[0]).to.deep.equal({
        id: '/notes/router/',
        title: 'Router 設計メモ',
        url: '/notes/router/',
        canonicalUrl: '/notes/router/',
        path: 'notes / router',
        keywords: ['router'],
      });
    } finally {
      searchCore.search = originalSearch;
      dialog.remove();
      trigger.remove();
    }
  });
});
