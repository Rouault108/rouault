import { expect } from '@open-wc/testing';

import { enhanceSearchDialog } from '../../src/client/post-hydrate/search-dialog-enhancer.js';
import { initSearch, resetSearchBootstrapForTest } from '../../src/search/bootstrap.js';
import { createSearchCore } from '../../src/search/search-core.js';
import { createSearchDialogEvent } from '../../src/search/search-dialog-events.js';
import {
  searchReturnToReadingEventName,
  type SearchReturnToReadingEventDetail,
} from '../../src/search/search-navigation-events.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import { createSearchArtifactUrlResolver } from '../../shared/search/search-artifact-url.js';
import { createInternalDocumentRouteSet } from '../../shared/navigation/internal-document-route-set.js';
import { buildSearchRenderHref, type SearchCanonicalPathname } from '../../shared/search/document-url.js';


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

const appendStaticSearchDialog = (): HTMLElement => {
  const dialog = document.createElement('div');
  dialog.id = 'global-search-dialog';
  dialog.dataset['searchDialogRoot'] = '';
  dialog.innerHTML = `
    <form data-search-dialog-form>
      <input data-search-dialog-input>
      <button type="button" data-search-dialog-clear hidden></button>
    </form>
    <p data-search-dialog-status></p>
    <div data-search-dialog-loading hidden></div>
    <div data-search-dialog-empty hidden></div>
    <div data-search-dialog-error hidden><p data-search-dialog-error-message></p></div>
    <div data-search-dialog-unavailable hidden><p data-search-dialog-unavailable-message></p></div>
    <ol data-search-dialog-results></ol>
  `;
  document.body.append(dialog);
  return dialog;
};

const waitForSearchDebounce = (): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, 180);
  });

describe('search-bootstrap', () => {
  afterEach(() => {
    resetSearchBootstrapForTest();
    document.querySelector('#global-search-dialog')?.remove();
  });

  it('static dialog DOM の open request と input search を createTestSearchCore() に接続すること', async () => {
    const controller = createTestSearchCore();
    const originalSearch = controller.search.bind(controller);
    const requests: unknown[] = [];
    const options: unknown[] = [];

    controller.search = (request, executionOptions) => {
      requests.push(request);
      options.push(executionOptions);
      return Promise.resolve({
        mode: 'navigate',
        items: [
          {
            canonicalPathname: '/notes/router/' as SearchCanonicalPathname,
            renderHref: buildSearchRenderHref({
              canonicalPathname: '/notes/router/' as SearchCanonicalPathname,
              basePath: DEFAULT_SITE_URL_CONTEXT.basePath,
            }),
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

    const dialog = appendStaticSearchDialog();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLOListElement>('[data-search-dialog-results]');
    if (!input || !results) {
      throw new Error('static search dialog fixture is invalid');
    }

    const trigger = document.createElement('button');
    document.body.append(trigger);

    try {
      initSearch(createTestInitSearchOptions(controller));
      enhanceSearchDialog(document);
      trigger.dispatchEvent(
        new CustomEvent('open-search-dialog', {
          bubbles: true,
          composed: true,
        }),
      );

      expect(dialog.hasAttribute('open')).to.equal(true);
      expect(trigger.getAttribute('aria-expanded')).to.equal('true');

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

      expect(dialog.hasAttribute('open')).to.equal(true);

      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );

      input.value = 'router';
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      await waitForSearchDebounce();

      expect(requests).to.deep.equal([
        {
          mode: 'navigate',
          q: 'router',
          tags: [],
          tagMode: 'or',
          sort: 'relevance',
        },
      ]);
      expect(options[0]).to.have.property('signal');
      expect(results.textContent).to.contain('Router 設計メモ');
      expect(results.querySelector('[data-render-href]')?.getAttribute('data-render-href')).to.equal(
        '/notes/router/',
      );
    } finally {
      controller.search = originalSearch;
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
    const dialog = appendStaticSearchDialog();
    const events: SearchReturnToReadingEventDetail[] = [];

    dialog.addEventListener(searchReturnToReadingEventName, (event) => {
      const customEvent = event as CustomEvent<SearchReturnToReadingEventDetail>;
      customEvent.preventDefault();
      events.push(customEvent.detail);
    });

    initSearch(createTestInitSearchOptions());

    document.dispatchEvent(
      createSearchDialogEvent('search-dialog:selected', {
        id: '/notes/router/',
        renderHref: '/notes/router/',
        canonicalPathname: '/notes/router/',
        title: 'Router',
        query: 'router',
        index: 0,
        item: {
          id: '/notes/router/',
          title: 'Router',
          renderHref: '/notes/router/',
          canonicalPathname: '/notes/router/',
        },
        selectionMethod: 'pointer',
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
