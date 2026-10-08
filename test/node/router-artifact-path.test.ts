import { describe, expect, it } from 'vitest';

import {
  resolveRouterArtifactPathname,
  resolveRouterArtifactStoragePathname,
} from '../../shared/navigation/router-artifact-path.js';

describe('router artifact path', () => {
  it('公開document URLとartifactのHTTP/保存pathnameを分離すること', () => {
    expect(resolveRouterArtifactStoragePathname('/tags/C%23/')).toBe('/tags/C%23/');
    expect(resolveRouterArtifactPathname('/tags/C%23/')).toBe(
      '/__router/tags/C%2523/index.router.json',
    );
    expect(resolveRouterArtifactStoragePathname('/tags/%E6%97%A5%E6%9C%AC/')).toBe(
      '/tags/日本/',
    );
    expect(resolveRouterArtifactPathname('/tags/%E6%97%A5%E6%9C%AC/')).toBe(
      '/__router/tags/%E6%97%A5%E6%9C%AC/index.router.json',
    );
  });

  it('encoded traversal literalは保持し、実際のtraversalとseparatorを拒否すること', () => {
    expect(resolveRouterArtifactStoragePathname('/tags/%252e%252e/')).toBe(
      '/tags/%2e%2e/',
    );
    expect(resolveRouterArtifactPathname('/tags/%252e%252e/')).toBe(
      '/__router/tags/%252e%252e/index.router.json',
    );

    for (const pathname of ['/tags/%2e%2e/', '/tags/a%5Cb/', '/tags/a%00b/']) {
      expect(() => resolveRouterArtifactPathname(pathname)).toThrow(
        /unsafe filesystem segments/u,
      );
    }
  });
});
