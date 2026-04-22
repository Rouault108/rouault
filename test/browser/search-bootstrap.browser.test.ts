import { expect } from '@open-wc/testing';

import { initSearch } from '../../src/search/bootstrap.js';
import { searchCore } from '../../src/search/search-core.js';
import type { InteractionModality } from '../../src/components/ui/search-dialog/internals/interaction-modality.js';

interface TestSearchDialogElement extends HTMLElement {
  opened: boolean;
  query: string;
  captureOpenModality(modality?: InteractionModality): void;
  requestOpen(trigger?: HTMLElement): void;
  searcher?: (context: {
    query: string;
    signal: AbortSignal;
  }) => Promise<{ items: readonly unknown[] }>;
}

describe('search-bootstrap', () => {
  it('dialog searcher と open request を searchCore に接続し、起動モダリティ snapshot を引き渡すこと', async () => {
    const originalSearch = searchCore.search.bind(searchCore);
    const requests: unknown[] = [];
    const openedWith: Array<HTMLElement | undefined> = [];
    const capturedModalities: Array<InteractionModality | undefined> = [];

    searchCore.search = (request) => {
      requests.push(request);
      return Promise.resolve({
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
      });
    };

    const dialog = document.createElement('div') as unknown as TestSearchDialogElement;
    dialog.id = 'global-search-dialog';
    dialog.opened = false;
    dialog.query = '';
    dialog.captureOpenModality = (modality?: InteractionModality) => {
      capturedModalities.push(modality);
    };
    dialog.requestOpen = (trigger?: HTMLElement) => {
      openedWith.push(trigger);
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

      expect(capturedModalities).to.deep.equal([undefined]);
      expect(openedWith).to.deep.equal([trigger]);

      trigger.focus();
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );

      expect(capturedModalities).to.deep.equal([undefined, 'keyboard']);
      expect(openedWith).to.deep.equal([trigger, trigger]);

      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );

      expect(capturedModalities).to.deep.equal([undefined, 'keyboard', 'keyboard']);
      expect(openedWith).to.deep.equal([trigger, trigger, trigger]);
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
