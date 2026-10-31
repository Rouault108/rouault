import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createCspReportOnlyMiddleware } from '../../build/preview/csp-report-only.js';
import { createCspNotFoundMiddleware } from '../../build/preview/csp-not-found.js';

describe('CSP global/Worker reset and custom 404 HTTP contract', () => {
  it('keeps one parent policy for unknown paths and one Worker policy after detach', async () => {
    const parent = "script-src 'self' 'sha256-fixture='";
    const worker = "script-src 'self' 'wasm-unsafe-eval'";
    const headers = createCspReportOnlyMiddleware({
      rules: [
        { pattern: '/nested/*', policy: parent, context: 'document' },
        {
          pattern: '/nested/client-assets/worker.js',
          policy: worker,
          context: 'worker',
          reset: true,
        },
      ],
    });
    const fallback = createCspNotFoundMiddleware(
      '/nested',
      Buffer.from('<html>controlled-404</html>'),
    );
    const server = createServer((req, res) =>
      headers(req, res, () => {
        if (req.url === '/nested/client-assets/worker.js') {
          res.setHeader('Content-Type', 'text/javascript');
          res.end('export {};');
        } else
          fallback(req, res, () => {
            res.statusCode = 404;
            res.end();
          });
      }),
    );
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('HTTP address');
      const origin = `http://127.0.0.1:${String(address.port)}`;
      for (const route of [
        '/nested/missing',
        '/nested/missing/file.js',
        '/nested/__preview/unregistered/missing',
      ]) {
        const response = await fetch(origin + route);
        expect(response.status).toBe(404);
        expect(response.headers.get('content-security-policy-report-only')).toBe(parent);
        expect(response.headers.get('content-type')).toContain('text/html');
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(await response.text()).toBe('<html>controlled-404</html>');
      }
      const head = await fetch(origin + '/nested/missing', { method: 'HEAD' });
      expect(head.status).toBe(404);
      expect(await head.text()).toBe('');
      const response = await fetch(origin + '/nested/client-assets/worker.js');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-security-policy-report-only')).toBe(worker);
      expect(
        (await fetch(origin + '/outside')).headers.get('content-security-policy-report-only'),
      ).toBeNull();
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
  it('respects original scope and lets rewritten known HTML reach Vite', async () => {
    for (const fixture of [
      {
        base: '',
        original: '/notes/%E6%97%A5%E6%9C%AC%E8%AA%9E/',
        rewritten: '/notes/%E6%97%A5%E6%9C%AC%E8%AA%9E/index.html',
        status: 200,
        body: 'known-html',
      },
      {
        base: '/nested',
        original: '/nested/unknown/',
        rewritten: '/unknown/',
        status: 404,
        body: 'controlled-404',
      },
    ]) {
      const middleware = createCspNotFoundMiddleware(fixture.base, Buffer.from('controlled-404'), [
        'notes/日本語/index.html',
      ]);
      const server = createServer((req, res) => {
        Object.defineProperty(req, 'originalUrl', { value: req.url });
        req.url = fixture.rewritten;
        middleware(req, res, () => res.end('known-html'));
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      try {
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('HTTP address');
        const response = await fetch(`http://127.0.0.1:${String(address.port)}${fixture.original}`);
        expect(response.status).toBe(fixture.status);
        expect(await response.text()).toBe(fixture.body);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    }
  });
});
