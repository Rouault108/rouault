import { expect, fixture, html } from '@open-wc/testing';
import { BrowserLinkInterceptor } from '../../src/router/browser-link-interceptor.js';
import { LocationAdapter } from '../../src/router/location-adapter.js';
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
    outcome: 'completed',
    requestedUrl: url,
    normalizedUrl: url,
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

describe('BrowserLinkInterceptor', () => {
  let interceptor: BrowserLinkInterceptor | null = null;
  interface RequestLog {
    url: string;
    historyMode: 'none' | 'push' | 'replace';
  }
  let requests: RequestLog[];

  beforeEach(() => {
    requests = [];

    interceptor = new BrowserLinkInterceptor(
      new LocationAdapter(),
      () => '/notes/current',
      (request) => {
        requests.push(request);
        return Promise.resolve(createCompletedNavigationResult(request.url));
      },
    );

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
