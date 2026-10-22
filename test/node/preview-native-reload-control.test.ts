import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  nativeReloadControlMiddleware,
  NATIVE_RELOAD_CONTROL_HEADER,
} from '../../build/preview/native-reload-control.js';
import { createStaticCacheControlMiddleware } from '../../build/preview/static-cache-control.js';

const source = readFileSync(new URL('../../_headers', import.meta.url), 'utf8');
describe('same-origin cached native reload control', () => {
  it('isolates the mode-only module by Vary and preserves real HTTP cache receipts and validators', async () => {
    const cache = createStaticCacheControlMiddleware(source);
    const server = createServer((request, response) => {
      cache(request, response, () =>
        nativeReloadControlMiddleware(request, response, () => {
          response.setHeader('ETag', '"application"');
          response.end('real application artifact');
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('preview address');
      const url = `http://127.0.0.1:${address.port}/client-assets/client-hash.js?build=1`;
      const app = await fetch(url);
      expect(await app.text()).toBe('real application artifact');
      expect(app.headers.get('vary')).toBe(NATIVE_RELOAD_CONTROL_HEADER);
      expect(app.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
      const headers = { [NATIVE_RELOAD_CONTROL_HEADER]: '1' };
      const native = await fetch(url, { headers });
      expect(native.status).toBe(200);
      const script = await native.text();
      expect(script).toContain("history.scrollRestoration='auto'");
      expect(script).toContain("?'manual':'auto'");
      expect(script).not.toMatch(/scrollTo|scrollBy|scrollIntoView|focus\(|sessionStorage/u);
      expect(native.headers.get('vary')).toBe(app.headers.get('vary'));
      expect(native.headers.get('cache-control')).toBe(app.headers.get('cache-control'));
      const etag = native.headers.get('etag');
      if (!etag) throw new Error('native ETag');
      expect(etag).not.toBe(app.headers.get('etag'));
      const conditional = await fetch(url, { headers: { ...headers, 'If-None-Match': etag } });
      expect(conditional.status).toBe(304);
      expect(await conditional.text()).toBe('');
      const head = await fetch(url, { method: 'HEAD', headers });
      expect(head.status).toBe(200);
      expect(head.headers.get('etag')).toBe(etag);
      expect(await head.text()).toBe('');
      const receipts = [app, native, conditional, head].map((response) =>
        response.headers.get('x-rouault-preview-response-id'),
      );
      for (const receipt of receipts) expect(receipt).toMatch(/^[\da-f-]{36}$/u);
      expect(new Set(receipts).size).toBe(4);
      for (const [path, method, selector] of [
        ['/client-assets/client-hash.js', 'GET', 'other'],
        ['/client-assets/style-hash.css', 'GET', '1'],
        ['/notes/example', 'GET', '1'],
        ['/client-assets/client-hash.js', 'POST', '1'],
      ] as const) {
        const response = await fetch(new URL(path ?? '/', url), {
          method,
          headers: { [NATIVE_RELOAD_CONTROL_HEADER]: selector ?? '' },
        });
        expect(await response.text()).toBe('real application artifact');
      }
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
