import { expect, fixture, html } from '@open-wc/testing';
import { validateRuntimeDomLinkContracts } from '../../src/router/dom-link-contract.js';

const routeManifestState = {
  status: 'loaded' as const,
  manifest: {
    version: 1 as const,
    buildId: 'build-test',
    buildLabel: 'test',
    generatedAt: '2026-06-01T00:00:00.000Z',
    siteOrigin: window.location.origin,
    basePath: '',
    routes: ['/'],
  },
  routeSet: {
    routes: ['/'],
    has: (pathname: string) => pathname === '/',
  },
};

describe('runtime DOM link contract', () => {
  it('footer nav の external-web は data-external なしでも許可すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <footer class="ui-footer" data-footer>
        <nav class="ui-footer__nav">
          <a
            href="https://example.com/manual"
            rel="noreferrer"
            data-link-kind="external-web"
            data-link-surface="navigation"
          >
            抑制
          </a>
        </nav>
      </footer>
    `);

    expect(() =>
      validateRuntimeDomLinkContracts({
        root,
        sourceLabel: 'runtime-footer',
        siteUrlContext: { siteOrigin: window.location.origin, basePath: '' },
        currentUrl: '/',
        routeManifestState,
      }),
    ).not.to.throw();
  });

  it('footer 外の external-web は data-external なしなら拒否すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <div>
        <a
          href="https://example.com/manual"
          rel="noreferrer"
          data-link-kind="external-web"
          data-link-surface="navigation"
        >
          抑制
        </a>
      </div>
    `);

    expect(() =>
      validateRuntimeDomLinkContracts({
        root,
        sourceLabel: 'runtime-prose',
        siteUrlContext: { siteOrigin: window.location.origin, basePath: '' },
        currentUrl: '/',
        routeManifestState,
      }),
    ).to.throw('external-web requires data-external="true"');
  });

  it('data-external が external-action に付く場合は拒否すること', async () => {
    const root = await fixture<HTMLElement>(html`
      <div>
        <a
          href="mailto:hello@example.com"
          data-link-kind="external-action"
          data-link-surface="navigation"
          data-external="true"
        >
          連絡
        </a>
      </div>
    `);

    expect(() =>
      validateRuntimeDomLinkContracts({
        root,
        sourceLabel: 'runtime-footer',
        siteUrlContext: { siteOrigin: window.location.origin, basePath: '' },
        currentUrl: '/',
        routeManifestState,
      }),
    ).to.throw('data-external mismatch');
  });
});
