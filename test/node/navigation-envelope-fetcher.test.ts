import { describe, expect, it } from 'vitest';
import { resolveNavigationEnvelopeArtifactUrl } from '../../src/router/navigation-envelope-fetcher.js';
import { toInternalDocumentNormalizedUrl } from '../../src/router/internal-document-normalized-url.js';
import { createSiteUrlContext } from '../../shared/site/site-url-context.js';

describe('navigation envelope fetcher', () => {
  it('internal document URL から artifact URL を導出すること', () => {
    expect(
      resolveNavigationEnvelopeArtifactUrl({
        normalizedUrl: toInternalDocumentNormalizedUrl('/about/'),
        siteUrlContext: createSiteUrlContext({ siteOrigin: 'https://example.com' }),
      }),
    ).toBe('/__router/about/index.router.json');
  });

  it('予約文字を含むdocument URLとは別のartifact URLを導出すること', () => {
    expect(
      resolveNavigationEnvelopeArtifactUrl({
        normalizedUrl: toInternalDocumentNormalizedUrl('/tags/C%23/'),
        siteUrlContext: createSiteUrlContext({ siteOrigin: 'https://example.com' }),
      }),
    ).toBe('/__router/tags/C%2523/index.router.json');
  });
});
