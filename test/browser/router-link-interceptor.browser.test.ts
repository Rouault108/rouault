import { expect, fixture, html } from '@open-wc/testing';
import { RouterLinkInterceptor } from '../../src/router/browser-link-interceptor.js';
import { LocationAdapter } from '../../src/router/location-adapter.js';
import { toInternalDocumentNormalizedUrl } from '../../src/router/internal-document-normalized-url.js';
import type { NavigationResult } from '../../src/router/router-types.js';

function simulateClick(element: HTMLElement, options: MouseEventInit = {}): void {
  let target = element;
  let tempSpan: HTMLSpanElement | null = null;

  if (element.tagName === 'A') {
    tempSpan = document.createElement('span');
    element.prepend(tempSpan);
    target = tempSpan;
  }

  target.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      ...options,
    }),
  );

  tempSpan?.remove();
}

function createCompletedNavigationResult(url: string): NavigationResult {
  return {
    kind: 'completed',
    outcome: 'completed',
    normalizedUrl: toInternalDocumentNormalizedUrl(url),
    historyMode: 'push',
    stateOnly: false,
    committed: true,
    degraded: false,
    issues: [],
    source: 'fetch',
    renderedKind: 'page',
  };
}

function dispatchObservedClick(element: HTMLElement, options: MouseEventInit = {}): boolean {
  let defaultPrevented = false;

  const observer = (event: Event) => {
    defaultPrevented = event.defaultPrevented;
    event.preventDefault();
  };

  document.addEventListener('click', observer);
  simulateClick(element, options);
  document.removeEventListener('click', observer);

  return defaultPrevented;
}

describe('RouterLinkInterceptor', () => {
  let interceptor: RouterLinkInterceptor | null = null;
  interface RequestLog {
    url: string;
    historyMode: 'none' | 'push' | 'replace';
  }
  let requests: RequestLog[];

  beforeEach(() => {
    requests = [];

    interceptor = new RouterLinkInterceptor({
      location: new LocationAdapter(),
      siteUrlContext: { siteOrigin: window.location.origin, basePath: '' },
      getCurrentUrl: () => '/notes/current',
      requestNavigation: (request) => {
        requests.push(request);
        return Promise.resolve(createCompletedNavigationResult(request.url));
      },
      routeManifestState: {
        status: 'loaded',
        manifest: { version: 1, buildId: 'test', buildLabel: 'test', generatedAt: '2026-01-01T00:00:00.000Z', siteOrigin: window.location.origin, basePath: '', routes: ['/notes/current', '/notes/next'] },
        routeSet: { routes: ['/notes/current', '/notes/next'], has: (pathname: string) => pathname === '/notes/current' || pathname === '/notes/next' },
      },
      diagnosticSink: { record: () => undefined },
    });

    interceptor.attach();
  });

  afterEach(() => {
    interceptor?.detach();
    interceptor = null;
  });

  it('同一 origin の文書リンクを横取りすること', async () => {
    const link = await fixture<HTMLAnchorElement>(
      html`<a href="${window.location.origin}/notes/next">Next</a>`,
    );

    const defaultPrevented = dispatchObservedClick(link);

    expect(defaultPrevented).to.equal(true);
    expect(requests).to.deep.equal([
      {
        url: '/notes/next',
        historyMode: 'push',
      },
    ]);
  });



  it('root-relative internal-document link を absolute currentUrl に補正して横取りすること', async () => {
    const link = await fixture<HTMLAnchorElement>(html`<a href="/notes/next">Next</a>`);

    const defaultPrevented = dispatchObservedClick(link);

    expect(defaultPrevented).to.equal(true);
    expect(requests).to.deep.equal([
      {
        url: '/notes/next',
        historyMode: 'push',
      },
    ]);
  });

  it('外部リンクは横取りしないこと', async () => {
    const link = await fixture<HTMLAnchorElement>(
      html`<a href="https://example.com/external">External</a>`,
    );

    const defaultPrevented = dispatchObservedClick(link);

    expect(defaultPrevented).to.equal(false);
    expect(requests).to.deep.equal([]);
  });

  it('mailto は横取りしないこと', async () => {
    const link = await fixture<HTMLAnchorElement>(
      html`<a href="mailto:hello@example.com">Mail</a>`,
    );

    const defaultPrevented = dispatchObservedClick(link);

    expect(defaultPrevented).to.equal(false);
    expect(requests).to.deep.equal([]);
  });

  it('同一ページ内 hash jump は横取りしないこと', async () => {
    const link = await fixture<HTMLAnchorElement>(html`<a href="#section-2">Jump</a>`);

    const defaultPrevented = dispatchObservedClick(link);

    expect(defaultPrevented).to.equal(false);
    expect(requests).to.deep.equal([]);
  });

  it('rel=external は横取りしないこと', async () => {
    const link = await fixture<HTMLAnchorElement>(
      html`<a href="/notes/other" rel="external">Other</a>`,
    );

    const defaultPrevented = dispatchObservedClick(link);

    expect(defaultPrevented).to.equal(false);
    expect(requests).to.deep.equal([]);
  });
});
