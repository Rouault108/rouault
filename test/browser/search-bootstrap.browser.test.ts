import { expect } from '@open-wc/testing';

import { initSearch, resetSearchBootstrapForTest } from '../../src/search/bootstrap.js';
import { searchCore } from '../../src/search/search-core.js';
import type { InteractionModality } from '../../src/components/ui/search-dialog/internals/interaction-modality.js';
import type { UiSearchDialogSearcher } from '../../src/components/ui/search-dialog/search-dialog.types.js';

interface TestSearchDialogElement extends HTMLElement {
  opened: boolean;
  query: string;
  captureOpenModality(modality?: InteractionModality): void;
  requestOpen(trigger?: HTMLElement): void;
  searcher?: UiSearchDialogSearcher | null | undefined;
}

describe('search-bootstrap', () => {
  afterEach(() => {
    resetSearchBootstrapForTest();
    document.querySelector('#global-search-dialog')?.remove();
  });

  it('dialog searcher と open request を searchCore に接続し、起動モダリティ snapshot を引き渡すこと', async () => {
    const originalSearch = searchCore.search.bind(searchCore);
    const requests: unknown[] = [];
    const options: unknown[] = [];
    const openedWith: (HTMLElement | undefined)[] = [];
    const capturedModalities: (InteractionModality | undefined)[] = [];

    searchCore.search = (request, executionOptions) => {
      requests.push(request);
      options.push(executionOptions);
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
      const controller = new AbortController();
      const result = await dialog.searcher?.({
        query: 'router',
        signal: controller.signal,
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
      expect(options).to.deep.equal([{ signal: controller.signal }]);
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

  it('dialog 未配置時の initSearch は initialized を消費しないこと', async () => {
    const originalSearch = searchCore.search.bind(searchCore);
    let searchCount = 0;

    searchCore.search = () => {
      searchCount += 1;
      return Promise.resolve({
        mode: 'navigate',
        items: [],
        total: 0,
        rankingProfileId: 'rouault-search-v1',
        diagnostics: {
          degraded: false,
          activeSources: [],
          failures: [],
          issues: [],
        },
      });
    };

    try {
      initSearch();

      const dialog = document.createElement('div') as unknown as TestSearchDialogElement;
      dialog.id = 'global-search-dialog';
      dialog.opened = false;
      dialog.query = '';
      dialog.captureOpenModality = () => undefined;
      dialog.requestOpen = () => undefined;
      document.body.append(dialog);

      initSearch();

      await dialog.searcher?.({
        query: 'router',
        signal: new AbortController().signal,
      });

      expect(searchCount).to.equal(1);
    } finally {
      searchCore.search = originalSearch;
    }
  });

  it('reset は searcher property がなかった fixture を元の形へ戻し listener も解除すること', () => {
    let openCount = 0;
    const dialog = document.createElement('div') as unknown as TestSearchDialogElement;
    dialog.id = 'global-search-dialog';
    dialog.opened = false;
    dialog.query = '';
    dialog.captureOpenModality = () => undefined;
    dialog.requestOpen = () => {
      openCount += 1;
    };
    document.body.append(dialog);

    expect('searcher' in dialog).to.equal(false);

    initSearch();

    expect('searcher' in dialog).to.equal(true);
    expect(Object.prototype.hasOwnProperty.call(dialog, 'searcher')).to.equal(true);

    resetSearchBootstrapForTest();

    expect('searcher' in dialog).to.equal(false);

    dialog.dispatchEvent(
      new CustomEvent('open-search-dialog', {
        bubbles: true,
        composed: true,
      }),
    );

    expect(openCount).to.equal(0);
  });

  it('reset は prototype 側の searcher property を own property にせず null へ復元すること', () => {
    class PrototypeSearchDialogElement extends HTMLElement {
      opened = false;
      query = '';
      private _searcher: UiSearchDialogSearcher | null = null;

      get searcher(): UiSearchDialogSearcher | null {
        return this._searcher;
      }

      set searcher(value: UiSearchDialogSearcher | null | undefined) {
        this._searcher = value ?? null;
      }

      captureOpenModality(): void {
        return undefined;
      }

      requestOpen(): void {
        return undefined;
      }
    }

    const tagName = 'test-search-dialog-prototype';
    if (!customElements.get(tagName)) {
      customElements.define(tagName, PrototypeSearchDialogElement);
    }

    const dialog = document.createElement(tagName) as PrototypeSearchDialogElement;
    dialog.id = 'global-search-dialog';
    document.body.append(dialog);

    expect('searcher' in dialog).to.equal(true);
    expect(Object.prototype.hasOwnProperty.call(dialog, 'searcher')).to.equal(false);
    expect(dialog.searcher).to.equal(null);

    initSearch();

    expect(typeof dialog.searcher).to.equal('function');

    resetSearchBootstrapForTest();

    expect('searcher' in dialog).to.equal(true);
    expect(Object.prototype.hasOwnProperty.call(dialog, 'searcher')).to.equal(false);
    expect(dialog.searcher).to.equal(null);
  });
});
