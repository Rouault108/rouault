import { describe, expect, it } from 'vitest';
import { validatePreviewSandboxBaseUrl } from '../../build/rehype/preview-sandbox-link-contract.js';

const siteUrlContext = { siteOrigin: 'https://example.com', basePath: '' } as const;

describe('preview sandbox link contract', () => {
  it('basePath 配下の preview resource base-url を許可すること', () => {
    expect(validatePreviewSandboxBaseUrl('/assets/preview/demo/', siteUrlContext)).to.equal(
      'https://example.com/assets/preview/demo/',
    );
  });

  it('preview resource 以外の base-url を拒否すること', () => {
    expect(() => validatePreviewSandboxBaseUrl('/static/a.js', siteUrlContext)).toThrow();
  });

  it('credentials を含む preview sandbox base-url を拒否すること', () => {
    expect(() =>
      validatePreviewSandboxBaseUrl(
        'https://user@example.com/assets/preview/demo/',
        siteUrlContext,
      ),
    ).toThrow();
  });

  it('encoded dangerous segment を含む preview sandbox base-url を拒否すること', () => {
    expect(() =>
      validatePreviewSandboxBaseUrl('/assets/preview/%2e%2e/x/', siteUrlContext),
    ).toThrow();
  });

  it('basePath の segment boundary を満たさない base-url を拒否すること', () => {
    expect(() =>
      validatePreviewSandboxBaseUrl('/rouault2/assets/preview/demo/', {
        siteOrigin: 'https://example.com',
        basePath: '/rouault',
      }),
    ).toThrow();
  });
});
