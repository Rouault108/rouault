import { describe, expect, it } from 'vitest';

import { resolveProductionSiteUrlContext } from '../../build/site/site-url-context.js';

describe('production site URL context', () => {
  it('ROUAULT_SITE_ORIGIN 未設定では production URL context 解決が失敗すること', () => {
    expect(() => resolveProductionSiteUrlContext({ siteOrigin: undefined })).toThrow(
      /siteOrigin must be a string/u,
    );
  });

  it('ROUAULT_SITE_ORIGIN 空文字では失敗すること', () => {
    expect(() => resolveProductionSiteUrlContext({ siteOrigin: '' })).toThrow(
      /non-empty absolute origin/u,
    );
  });

  it('path / query / hash / credentials を含む site origin を拒否すること', () => {
    for (const siteOrigin of [
      'https://rouault.page/docs',
      'https://rouault.page?preview=1',
      'https://rouault.page#preview',
      'https://user:pass@rouault.page',
    ]) {
      expect(() => resolveProductionSiteUrlContext({ siteOrigin })).toThrow();
    }
  });

  it('https origin と空 basePath を正規化すること', () => {
    expect(resolveProductionSiteUrlContext({ siteOrigin: 'https://rouault.page' })).to.deep.equal({
      siteOrigin: 'https://rouault.page',
      basePath: '',
    });
  });

  it('ROUAULT_BASE_PATH=/foo/ は /foo へ正規化されること', () => {
    expect(
      resolveProductionSiteUrlContext({
        siteOrigin: 'https://rouault.page',
        basePath: '/foo/',
      }),
    ).to.deep.equal({
      siteOrigin: 'https://rouault.page',
      basePath: '/foo',
    });
  });
});
