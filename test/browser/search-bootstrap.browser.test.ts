import { expect } from '@open-wc/testing';

import { initSearch, resetSearchBootstrapForTest } from '../../src/search/bootstrap.js';
import { createSearchCore } from '../../src/search/search-core.js';
import { searchReturnToReadingEventName, type SearchReturnToReadingEventDetail } from '../../src/search/search-dialog-events.js';
import type { InteractionModality } from '../../src/components/ui/search-dialog/internals/interaction-modality.js';
import type { UiSearchDialogSearcher } from '../../src/components/ui/search-dialog/search-dialog.types.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import { createSearchArtifactUrlResolver } from '../../shared/search/search-artifact-url.js';
import { createInternalDocumentRouteSet } from '../../shared/navigation/internal-document-route-set.js';
import type { SearchCanonicalPathname } from '../../shared/search/document-url.js';


const createTestSearchCore = () => createSearchCore({
  runtimeEnvironment: 'test',
  siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
  artifactUrlResolver: createSearchArtifactUrlResolver({ siteUrlContext: DEFAULT_SITE_URL_CONTEXT }),
  isInternalDocumentPathname: (pathname: string) => pathname.startsWith('/'),
  testOnlyLoadPagefind: async () => ({
    filters: async () => ({}),
    search: async () => ({ results: [], unfilteredResultCount: 0 }),
  }),
  testOnlySearchCatalogFetcher: async () => ({
    ok: true,
    status: 200,
    type: 'basic',
    redirected: false,
    headers: { get: (_name: string) => 'application/json; charset=utf-8' },
    json: async () => [],
    text: async () => '[]',
  }),
});


const createTestRouteManifestState = () => ({
  status: 'loaded' as const,
  manifest: {
    version: 1 as const,
    buildId: 'test-build-id',
    buildLabel: 'test-build-label',
    generatedAt: '2026-01-01T00:00:00.000Z',
    siteOrigin: DEFAULT_SITE_URL_CONTEXT.siteOrigin,
    basePath: DEFAULT_SITE_URL_CONTEXT.basePath,
    routes: ['/', '/notes/router/'],
  },
  routeSet: createInternalDocumentRouteSet(['/', '/notes/router/']),
});

const createTestInitSearchOptions = (controller = createTestSearchCore()) => ({
  runtimeEnvironment: 'test' as const,
  siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
  routeManifestState: createTestRouteManifestState(),
  controller,
});

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

  it('dialog searcher と open request を createTestSearchCore() に接続し、起動モダリティ snapshot を引き渡すこと', async () => {
    const originalSearch = createTestSearchCore().search.bind(createTestSearchCore());
    const requests: unknown[] = [];
    const options: unknown[] = [];
    const openedWith: (HTMLElement | undefined)[] = [];
    const capturedModalities: (InteractionModality | undefined)[] = [];

    createTestSearchCore().search = (request, executionOptions) => {
      requests.push(request);
      options.push(executionOptions);
      return Promise.resolve({
        mode: 'navigate',
        items: [
          {
            canonicalPathname: '/notes/router/' as SearchCanonicalPathname,
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
      initSearch(createTestInitSearchOptions());
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
        canonicalPathname: '/notes/router/',
        path: 'notes / router',
        keywords: ['router'],
      });
    } finally {
      createTestSearchCore().search = originalSearch;
      dialog.remove();
      trigger.remove();
    }
  });

  it('dialog 未配置時の initSearch も bootstrap 初期化を一度だけ消費すること', () => {
    const result = initSearch(createTestInitSearchOptions());

    expect(result.status).to.equal('ready');
    expect(() => initSearch(createTestInitSearchOptions())).to.throw;
  });

  it('selection を return-to-reading event boundary へ変換すること', () => {
    const dialog = document.createElement('div') as unknown as TestSearchDialogElement;
    const events: SearchReturnToReadingEventDetail[] = [];
    dialog.id = 'global-search-dialog';
    dialog.opened = true;
    dialog.query = 'router';
    dialog.captureOpenModality = () => undefined;
    dialog.requestOpen = () => undefined;
    document.body.append(dialog);

    dialog.addEventListener(searchReturnToReadingEventName, (event) => {
      const customEvent = event as CustomEvent<SearchReturnToReadingEventDetail>;
      customEvent.preventDefault();
      events.push(customEvent.detail);
    });

    initSearch(createTestInitSearchOptions());

    dialog.dispatchEvent(
      new CustomEvent('ui-search-dialog-selected', {
        bubbles: true,
        composed: true,
        detail: {
          id: '/notes/router/',
          url: '/notes/router/',
          title: 'Router',
          query: 'router',
          index: 0,
          item: {
            id: '/notes/router/',
            title: 'Router',
            url: '/notes/router/',
            canonicalPathname: '/notes/router/',
          },
          selectionMethod: 'pointer',
        },
      }),
    );

    expect(events).to.deep.equal([
      {
        schemaVersion: 1,
        eventName: searchReturnToReadingEventName,
        renderHref: '/notes/router/',
        canonicalPathname: '/notes/router/',
        title: 'Router',
        query: 'router',
        selectionMethod: 'pointer',
      },
    ]);
  });
});
