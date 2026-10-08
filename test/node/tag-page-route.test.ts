import { describe, expect, it } from 'vitest';

import {
  buildTagPageCanonicalPathname,
  buildTagPageDocumentRoute,
  buildTagPageOutputPath,
} from '../../shared/search/tag-page-route.js';

describe('tag page document route', () => {
  it('公開canonicalとfilesystem outputを別々に投影すること', () => {
    expect(buildTagPageDocumentRoute(' C# ')).toEqual({
      tag: 'C#',
      canonicalPathname: '/tags/C%23/',
      outputPath: 'tags/C#/index.html',
    });
    expect(buildTagPageCanonicalPathname('問い? & 100%')).toBe(
      '/tags/%E5%95%8F%E3%81%84%3F%20%26%20100%25/',
    );
    expect(buildTagPageOutputPath('問い? & 100%')).toBe('tags/問い? & 100%/index.html');
    expect(buildTagPageDocumentRoute('%2e%2e')).toEqual({
      tag: '%2e%2e',
      canonicalPathname: '/tags/%252e%252e/',
      outputPath: 'tags/%2e%2e/index.html',
    });
  });

  it('空値、separator、dot segment、制御文字をfilesystem segmentとして拒否すること', () => {
    for (const tag of ['', ' ', '.', '..', 'a/b', 'a\\b', 'a\u0000b', 'a\u007fb']) {
      expect(() => buildTagPageDocumentRoute(tag)).toThrow(/safe single filesystem segment|empty/u);
    }
  });
});
