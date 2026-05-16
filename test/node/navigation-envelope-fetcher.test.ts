import { describe, expect, it } from 'vitest';
import { resolveNavigationEnvelopeArtifactUrl } from '../../src/router/navigation-envelope-fetcher.js';
import { toInternalDocumentNormalizedUrl } from '../../src/router/internal-document-normalized-url.js';

describe('navigation envelope fetcher', () => {
  it('internal document URL から artifact URL を導出すること', () => {
    expect(resolveNavigationEnvelopeArtifactUrl(toInternalDocumentNormalizedUrl('/about/'))).toBe('/__router/about/index.router.json');
  });
});
