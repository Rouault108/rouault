import { describe, expect, it } from 'vitest';
import { LocationAdapter } from '../../src/router/location-adapter.js';
import type { UrlPolicy } from '../../src/router/url-policy.js';

describe('LocationAdapter', () => {
  it('pathname 正規化を UrlPolicy に委譲すること', () => {
    let receivedPathname: string | null = null;
    const policy: UrlPolicy = {
      normalizePathname(pathname) {
        receivedPathname = pathname;
        return '/normalized';
      },
      sanitizeSearchParams() {
        // no-op
      },
      resolveContentPath(pathname) {
        return pathname;
      },
    };

    const adapter = new LocationAdapter(policy);

    expect(adapter.normalizePathname('/notes/example/')).to.equal('/normalized');
    expect(receivedPathname).to.equal('/notes/example/');
  });
});
