import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import type { Browser, Response } from '@playwright/test';
import { createStaticCacheControlMiddleware } from '../../../build/preview/static-cache-control.js';

// routingはHTTP cacheを無効にするため、同じ静的成果物を別の実HTTP originで配信する。
// 対照scriptはmodeだけを所有し、scroll/focusや座標保存を行わない。
export const measureNativeCachedReload = async (
  browser: Browser,
  target: string,
  viewport: { width: number; height: number },
  state: unknown,
): Promise<unknown[]> => {
  const directory = path.resolve('dist');
  const cache = createStaticCacheControlMiddleware(
    await readFile(path.join(directory, '_headers'), 'utf8'),
  );
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.woff2': 'font/woff2',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.json': 'application/json',
  };
  let script = '';
  const server = createServer((request, response) => {
    cache(request, response, () => {
      void (async () => {
        try {
          const pathname = decodeURIComponent(
            new URL(request.url ?? '/', 'http://native.local').pathname,
          );
          let filename = path.resolve(directory, `.${pathname}`);
          if (!filename.startsWith(`${directory}${path.sep}`))
            throw new Error('outside static root');
          if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
          const body = filename.endsWith('.js') ? Buffer.from(script) : await readFile(filename);
          const etag = `"${createHash('sha256').update(body).digest('hex')}"`;
          const status = request.headers['if-none-match'] === etag ? 304 : 200;
          response.writeHead(status, {
            'Content-Type': types[path.extname(filename)] ?? 'application/octet-stream',
            ETag: etag,
          });
          response.end(status === 304 || request.method === 'HEAD' ? undefined : body);
        } catch {
          response.writeHead(404);
          response.end();
        }
      })();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('native control address');
  const results: unknown[] = [];
  try {
    for (const frames of [1, 4, 0]) {
      script = `history.scrollRestoration='auto';addEventListener('pagehide',()=>history.scrollRestoration='auto');${frames === 0 ? '' : `addEventListener('load',()=>{let frames=${frames};const adopt=()=>{if(--frames>0)requestAnimationFrame(adopt);else history.scrollRestoration=history.state?.__rouaultHistoryEntry?'manual':'auto';};requestAnimationFrame(adopt);},{once:true});`}`;
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(5000);
        const settle = async (): Promise<void> => {
          let previous = '';
          let stable = 0;
          for (let sample = 0; sample < 60; sample++) {
            await page.evaluate(() => document.fonts.ready.then(() => undefined));
            const value = await page.evaluate(() =>
              [
                scrollX,
                scrollY,
                document.scrollingElement?.scrollHeight,
                document.fonts.status,
              ].join(':'),
            );
            stable = value === previous ? stable + 1 : 0;
            if (stable >= 5) return;
            previous = value;
            await page.waitForTimeout(50);
          }
          throw new Error('native control did not settle');
        };
        const initialResponses: Response[] = [];
        page.on('response', (response) => {
          if (response.url().includes('/client-assets/') && response.url().endsWith('.js'))
            initialResponses.push(response);
        });
        await page.goto(`http://127.0.0.1:${address.port}${target}`);
        await settle();
        const entry = await page.locator('script[type="module"][src]').getAttribute('src');
        const initial = initialResponses.find(
          (response) => new URL(response.url()).pathname === entry,
        );
        const initialId = await initial?.headerValue('x-rouault-preview-response-id');
        await page.evaluate(
          ({ state, frames }) => {
            history.replaceState(state, '');
            history.scrollRestoration = frames === 0 ? 'auto' : 'manual';
            const scrolling = document.scrollingElement;
            if (!scrolling) throw new Error('native scrolling element');
            scrollTo({
              top: Math.round((scrolling.scrollHeight - scrolling.clientHeight) * 0.55),
              behavior: 'instant',
            });
          },
          { state, frames },
        );
        await settle();
        const measure = () =>
          page.evaluate(() => ({
            x: scrollX,
            y: scrollY,
            range: document.scrollingElement
              ? document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight
              : 0,
            font: getComputedStyle(document.querySelector('main') ?? document.body).font,
            fonts: document.fonts.status,
            mode: history.scrollRestoration,
            appDefined: customElements.get('router-document-host') !== undefined,
            hash: location.hash,
            viewport: [innerWidth, innerHeight],
          }));
        const before = await measure();
        const reloadResponses: Response[] = [];
        page.on('response', (response) => {
          if (new URL(response.url()).pathname === entry) reloadResponses.push(response);
        });
        await page.reload();
        await settle();
        const after = await measure();
        const responses = await Promise.all(
          reloadResponses.map(async (response) => ({
            status: response.status(),
            cacheControl: await response.headerValue('cache-control'),
            reused:
              !!initialId &&
              initialId === (await response.headerValue('x-rouault-preview-response-id')),
          })),
        );
        results.push({ frames, before, after, responses });
      } finally {
        await context.close();
      }
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  return results;
};
