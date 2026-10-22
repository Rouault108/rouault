import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createStaticCacheControlResolver } from '../../build/preview/static-cache-control.js';

const source = readFileSync(new URL('../../_headers', import.meta.url), 'utf8');
const immutable = 'public, max-age=31536000, immutable';
const revalidate = 'public, max-age=0, must-revalidate';

describe('production preview static cache policy', () => {
  it('hashed client assets use the production immutable policy, including query URLs', () => {
    const resolve = createStaticCacheControlResolver(source);
    expect(resolve('/client-assets/client-build.js')).toBe(immutable);
    expect(resolve('/client-assets/client-build.css?version=1')).toBe(immutable);
    expect(resolve('/client-assets/nested/chunk-build.js')).toBe(immutable);
  });

  it('documents, fonts and mutable search metadata retain revalidation', () => {
    const resolve = createStaticCacheControlResolver(source);
    for (const url of [
      '/notes/example/index.html',
      '/assets/fonts/reading.woff2',
      '/search/manifest.json?buildId=example',
      '/search-catalog.json',
    ])
      expect(resolve(url), url).toBe(revalidate);
    expect(resolve('/search/document.build.json')).toBe(immutable);
    expect(resolve('/search/documentXbuild.json')).toBeNull();
    expect(resolve('/__router/example.json')).toBeNull();
  });

  it('uses the generated hosting prefix without caching an unprefixed route', () => {
    const resolve = createStaticCacheControlResolver(source.replace(/^\//gmu, '/nested/'));
    expect(resolve('/nested/client-assets/client-build.js')).toBe(immutable);
    expect(resolve('/nested/search/manifest.json')).toBe(revalidate);
    expect(resolve('/client-assets/client-build.js')).toBeNull();
  });

  it('does not expose other headers or interpret literal pattern characters as regex', () => {
    const resolve = createStaticCacheControlResolver(
      '/file+[1].js\r\n  X-Example: ignored\r\n  cache-control: no-store\r\n',
    );
    expect(resolve('/file+[1].js')).toBe('no-store');
    expect(resolve('/file11Xjs')).toBeNull();
    expect(resolve('http://[')).toBeNull();
  });
});
