import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { parse, parseFragment, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { resolveRouterArtifactPathname } from '../../shared/navigation/router-artifact-path.js';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
const roots = process.argv.slice(2).map((root) => path.resolve(root));
const baseline = roots[0];
const modified = roots[1];
if (!baseline || !modified)
  throw new Error(
    'Usage: tsx scripts/testing/verify-table-reload.ts BASELINE_DIST MODIFIED_DIST [RESULT_JSON]',
  );
const output = roots[2] ?? '/tmp/rouault-table-reload-results.json';
// build時のsite originと揃え、manifest検証を無効化せずに実際のartifactを動かす。
const origin = process.env['ROUAULT_TABLE_RELOAD_ORIGIN'] ?? 'http://127.0.0.1:4189';
const serverUrl = new URL(origin);
if (serverUrl.protocol !== 'http:' || serverUrl.hostname !== '127.0.0.1' || !serverUrl.port)
  throw new Error('Table reload verification requires an explicit HTTP loopback port');
const pathname = `/notes/library/collection/${encodeURIComponent('計算機科学・ソフトウェア開発関連書籍')}`;
const url = `${origin}${pathname}#c-net-visual-basic`;
const elements = (node: Node): Element[] => [
  ...('tagName' in node ? [node] : []),
  ...('childNodes' in node ? node.childNodes.flatMap(elements) : []),
];
const wrappers = (node: Node): Element[] =>
  elements(node).filter(
    (element) =>
      element.tagName === 'div' &&
      element.attrs.some((attr) => attr.name === 'data-table-root' && attr.value === 'true'),
  );
const id = (element: Element): string | null =>
  element.attrs.find((attr) => attr.name === 'id')?.value ?? null;
const file = async (root: string, pathname: string): Promise<string> => {
  const relative = decodeURIComponent(pathname).replace(/^\/+|\/+$/gu, '');
  for (const candidate of [relative, `${relative}.html`, `${relative}/index.html`]) {
    const absolute = path.resolve(root, candidate);
    if (!absolute.startsWith(root + path.sep)) continue;
    try {
      if ((await stat(absolute)).isFile()) return absolute;
    } catch {
      /* 次の静的候補へ進む。 */
    }
  }
  throw new Error(`No static artifact for ${pathname}`);
};
const inspect = async (root: string) => {
  const document = parse(await readFile(await file(root, pathname), 'utf8'));
  const main = elements(document).find(
    (element) => element.tagName === 'main' && id(element) === 'main-content',
  );
  if (!main) throw new Error('main-content');
  const envelope: unknown = JSON.parse(
    await readFile(await file(root, resolveRouterArtifactPathname(pathname)), 'utf8'),
  );
  if (
    typeof envelope !== 'object' ||
    envelope === null ||
    !('document' in envelope) ||
    typeof envelope.document !== 'object' ||
    envelope.document === null ||
    !('html' in envelope.document) ||
    typeof envelope.document.html !== 'string'
  )
    throw new Error('router body');
  const initialIds = wrappers(main).map(id);
  const routerIds = wrappers(parseFragment(envelope.document.html)).map(id);
  if (JSON.stringify(initialIds) !== JSON.stringify(routerIds))
    throw new Error('initial HTML/router wrapper IDs differ');
  for (const wrapper of wrappers(main))
    wrapper.attrs = wrapper.attrs.filter((attr) => attr.name !== 'id');
  return { initialIds, body: serialize(main), parity: true };
};
const baselineSource = await inspect(baseline);
const modifiedSource = await inspect(modified);
if (baselineSource.body !== modifiedSource.body)
  throw new Error('Comparison requires identical main body except wrapper IDs');
let activeRoot = baseline;
const requests: { pathname: string; status: number; conditional: boolean }[] = [];
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};
const respond = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const pathname = new URL(request.url ?? '/', origin).pathname;
  try {
    const filename = await file(activeRoot, pathname);
    const body = await readFile(filename);
    const etag = `"${createHash('sha256').update(body).digest('hex')}"`;
    const cached = request.headers['if-none-match'] === etag;
    requests.push({
      pathname,
      status: cached ? 304 : 200,
      conditional: request.headers['if-none-match'] !== undefined,
    });
    response.writeHead(cached ? 304 : 200, {
      'Content-Type': mime[path.extname(filename)] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
      ETag: etag,
    });
    response.end(cached ? undefined : body);
  } catch {
    response.writeHead(404);
    response.end();
  }
};
const server = createServer((request, response) => {
  void respond(request, response);
});
await new Promise<void>((resolve) => server.listen(Number(serverUrl.port), '127.0.0.1', resolve));
const browser = await chromium.launch();
const results: unknown[] = [];
let baselineFailures = 0;
let modifiedFailures = 0;
try {
  for (const viewport of [
    { width: 1365, height: 768 },
    { width: 1280, height: 720 },
  ]) {
    for (const mode of ['hash', 'middle', 'end'] as const) {
      for (const version of ['baseline', 'modified', 'old-to-new'] as const) {
        for (let repeat = 0; repeat < 3; repeat++) {
          activeRoot = version === 'modified' ? modified : baseline;
          const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
          const page = await context.newPage();
          const session = await context.newCDPSession(page);
          let cacheHits = 0;
          await session.send('Network.enable');
          session.on('Network.requestServedFromCache', () => cacheHits++);
          const settle = async () => {
            await page.waitForFunction(
              () =>
                document.querySelector<HTMLElement>('main#main-content')?.dataset[
                  'readingPositionStatus'
                ] === 'settled',
            );
            await page.evaluate(() => document.fonts.ready.then(() => undefined));
            let previous = '';
            let stable = 0;
            for (let sample = 0; sample < 40; sample++) {
              const point = await page.evaluate(() =>
                [
                  scrollX,
                  scrollY,
                  document.scrollingElement?.scrollHeight,
                  document.fonts.status,
                ].join(':'),
              );
              stable = point === previous ? stable + 1 : 0;
              if (stable >= 5) return;
              previous = point;
              await page.waitForTimeout(50);
            }
            throw new Error('viewport did not settle');
          };
          const measure = () =>
            page.evaluate(() => ({
              x: scrollX,
              y: scrollY,
              range: document.scrollingElement
                ? document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight
                : 0,
              viewport: [innerWidth, innerHeight],
              zoom: visualViewport?.scale,
              font: getComputedStyle(document.querySelector('main') ?? document.body).font,
              fonts: document.fonts.status,
              hash: location.hash,
            }));
          try {
            await page.goto(url);
            await settle();
            if (mode !== 'hash')
              await page.evaluate((mode) => {
                const scrolling = document.scrollingElement;
                if (!scrolling) throw new Error('scrolling element');
                scrollTo({
                  top: Math.round(
                    (scrolling.scrollHeight - scrolling.clientHeight) *
                      (mode === 'middle' ? 0.55 : 0.9),
                  ),
                  behavior: 'instant',
                });
              }, mode);
            await settle();
            const before = await measure();
            activeRoot = version === 'baseline' ? baseline : modified;
            const requestStart = requests.length;
            cacheHits = 0;
            await page.reload();
            await settle();
            const after = await measure();
            if (cacheHits === 0) throw new Error('Warm-cache condition was not observed');
            if (
              before.fonts !== 'loaded' ||
              after.fonts !== 'loaded' ||
              before.font !== after.font ||
              before.zoom !== after.zoom ||
              JSON.stringify(before.viewport) !== JSON.stringify(after.viewport) ||
              Math.abs(before.range - after.range) > 2
            )
              throw new Error(
                `Comparison geometry/font conditions differ: ${JSON.stringify({ version, mode, viewport, repeat, before, after })}`,
              );
            const passed = Math.abs(after.x - before.x) <= 2 && Math.abs(after.y - before.y) <= 2;
            if (!passed && version === 'baseline') baselineFailures++;
            if (!passed && version === 'modified') modifiedFailures++;
            results.push({
              version,
              mode,
              viewport,
              repeat,
              before,
              after,
              passed,
              cacheHits,
              requests: requests.slice(requestStart),
            });
          } finally {
            await context.close();
          }
        }
      }
    }
  }
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    }),
  );
}
const report = {
  kind: 'actual-HTTP-warm-cache-production-artifacts-no-interception',
  toleranceCSSPx: 2,
  baselineFailures,
  modifiedFailures,
  regression:
    baselineFailures === 0
      ? 'fixture-unproven'
      : modifiedFailures === 0
        ? 'reproduced-and-fixed'
        : 'not-fixed',
  source: {
    identicalBodyExceptWrapperIds: true,
    baselineIds: baselineSource.initialIds,
    modifiedIds: modifiedSource.initialIds,
    initialRouterParity: true,
  },
  results,
};
await writeFile(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    output,
    regression: report.regression,
    baselineFailures,
    modifiedFailures,
    cases: results.length,
  }),
);
if (baselineFailures === 0 || modifiedFailures > 0) process.exitCode = 1;
