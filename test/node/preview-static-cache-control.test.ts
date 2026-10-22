import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  createStaticCacheControlMiddleware,
  createStaticCacheControlResolver,
} from '../../build/preview/static-cache-control.js';

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

  it('gives every real GET, HEAD and 304 response a distinct cache receipt', async () => {
    const middleware = createStaticCacheControlMiddleware(source);
    const server = createServer((request, response) => {
      middleware(request, response, () => {
        response.setHeader('ETag', '"static-client"');
        response.statusCode = request.headers['if-none-match'] ? 304 : 200;
        response.end(response.statusCode === 304 ? undefined : 'export {};');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('HTTP server address');
      const url = `http://127.0.0.1:${address.port}/client-assets/client.js`;
      const receipts: string[] = [];
      for (const options of [
        {},
        {},
        { method: 'HEAD' },
        { headers: { 'If-None-Match': '"static-client"' } },
      ]) {
        const response = await fetch(url, options);
        expect(response.status).toBe(options.headers ? 304 : 200);
        expect(response.headers.get('cache-control')).toBe(immutable);
        const receipt = response.headers.get('x-rouault-preview-response-id');
        expect(receipt).toMatch(/^[\da-f-]{36}$/u);
        if (!receipt) throw new Error('Cache receipt');
        receipts.push(receipt);
        await response.arrayBuffer();
      }
      expect(new Set(receipts).size).toBe(receipts.length);
      const response = await fetch(url, { method: 'POST' });
      expect(response.headers.get('cache-control')).toBeNull();
      expect(response.headers.get('x-rouault-preview-response-id')).toBeNull();
      await response.arrayBuffer();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
