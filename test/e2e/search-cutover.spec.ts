import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import golden from '../fixtures/search/adopted-golden.json' with { type: 'json' };
import { protocolObject } from '../../shared/search/lexical-protocol.js';
const basePath = process.env['ROUAULT_BASE_PATH'] ?? '';

let rows: unknown[];
test.beforeAll(({ browserName }, info) => {
  // webServer build後の同じindexをNodeでloadする。事前生成された検証reportには依存しない。
  const output = info.outputPath(`${browserName}-node-target.json`);
  mkdirSync(dirname(output), { recursive: true });
  execFileSync(process.execPath, [
    '--import',
    'tsx',
    'scripts/verify-search-target.ts',
    'dist',
    output,
  ]);
  const report = protocolObject(JSON.parse(readFileSync(output, 'utf8')));
  expect(report['goldenPass']).toBe(30);
  expect(report['criticalPass']).toBe(10);
  if (!Array.isArray(report['results'])) throw new Error('Invalid Node report');
  rows = report['results'];
});
const expectedPaths = (id: string): string[] => {
  const row = rows.map(protocolObject).find((row) => row['id'] === id);
  const items = protocolObject(row?.['response'])['items'];
  if (!Array.isArray(items)) throw new Error('Missing target query');
  return items.map((item) => {
    const path = protocolObject(item)['canonicalPathname'];
    if (typeof path !== 'string') throw new Error('Invalid target item');
    return path;
  });
};
const ready = async (page: Page, path = '/search/') => {
  await page.goto(basePath + path);
  await expect(page.locator('[data-search-page-root]')).toHaveAttribute('data-enhanced', 'true');
};
const paths = (page: Page) =>
  page
    .locator('a.result-link')
    .evaluateAll(
      (links, prefix) =>
        links.map((link) =>
          new URL((link as HTMLAnchorElement).href).pathname.slice(prefix.length),
        ),
      basePath,
    );

// query ごとに独立した期限と browser context を持たせ、前の query の所要時間を累積させない。
for (const query of golden.queries) {
  test(`production entry preserves ${query.id} without normal Pagefind or Catalog queries`, async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(new URL(request.url()).pathname));
    const expected = expectedPaths(query.id);
    if (query.mode === 'navigate') {
      await ready(page);
      const actual = await page.evaluate(
        (q) =>
          new Promise<string[]>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Dialog result missing')), 15000);
            const listener = (event: Event) => {
              if (!(event instanceof CustomEvent)) return;
              const value: unknown = event.detail;
              if (
                !value ||
                typeof value !== 'object' ||
                !('query' in value) ||
                value.query !== q ||
                !('items' in value) ||
                !Array.isArray(value.items)
              )
                return;
              clearTimeout(timer);
              document.removeEventListener('search-dialog:results-change', listener);
              resolve(
                value.items.map((item: unknown) => {
                  if (
                    !item ||
                    typeof item !== 'object' ||
                    !('canonicalPathname' in item) ||
                    typeof item.canonicalPathname !== 'string'
                  )
                    throw new Error('Dialog item');
                  return item.canonicalPathname;
                }),
              );
            };
            document.addEventListener('search-dialog:results-change', listener);
            document.dispatchEvent(
              new CustomEvent('search-dialog:query-change', { detail: { query: q } }),
            );
          }),
        query.q,
      );
      expect(actual, query.id).toEqual(expected);
    } else {
      const params = new URLSearchParams({ q: query.q, tagMode: query.tagMode, sort: query.sort });
      for (const tag of query.tags) params.append('tag', tag);
      await ready(page, `/search/?${params}`);
      await expect.poll(() => paths(page), { message: query.id, timeout: 15000 }).toEqual(expected);
    }
    expect(
      requests.filter(
        (path) => path.includes('/pagefind/') || path.endsWith('/search-catalog.json'),
      ),
    ).toEqual([]);
    expect(requests.some((path) => path.endsWith('/search/manifest.json'))).toBe(true);
    expect(requests.some((path) => /\/search\/suzume\..*\.wasm$/u.test(path))).toBe(true);
  });
}

test('production failure invokes Catalog', async ({ page }) => {
  await page.route('**/search/manifest.json', (route) => route.fulfill({ status: 404, body: '' }));
  const catalog = page.waitForRequest('**/search-catalog.json');
  // Catalogは本文語を検索しない。実Catalog titleにある語でfallbackを観測する。
  await ready(page, `/search/?q=${encodeURIComponent('言語バージョン・ビルド文脈・互換性')}`);
  await catalog;
  await expect(page.locator('a.result-link').first()).toBeVisible({ timeout: 15000 });
});

test('store-only failure preserves lexical document order', async ({ page }) => {
  await page.route('**/search/store.*', (route) => route.fulfill({ status: 404, body: '' }));
  const store = page.waitForRequest('**/search/store.*');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  const query = golden.queries.find((query) => query.id === 'Q-017');
  if (!query) throw new Error('Fixture');
  await ready(page, `/search/?q=${encodeURIComponent(query.q)}`);
  await store;
  // 正常検索と同じ待機予算で、cold Worker の結果と store-only 縮退を検証する。
  await expect.poll(() => paths(page), { timeout: 15000 }).toEqual(expectedPaths(query.id));
  expect(
    requests.filter((path) => path.endsWith('/search-catalog.json') || path.includes('/pagefind/')),
  ).toEqual([]);
});

test('real dialog input, close and focus remain responsive after cutover', async ({ page }) => {
  await ready(page);
  await page.keyboard.press('Control+k');
  const input = page.locator('[data-search-dialog-root] input[role="combobox"]');
  await expect(input).toBeVisible();
  await input.fill('C#');
  await input.fill('LangVersion');
  await page.keyboard.press('Escape');
  await expect(input).not.toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
});

test('static search and tag pages retain no-JS response and final profile', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}${basePath}/search/`);
    await expect(page.locator('[data-search-query-input]')).toBeVisible();
    await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
      'initial-search-response-json',
      /rouault-search-v3/u,
    );
    await page.goto(`${baseURL}${basePath}/tags/Programming/`);
    await expect(page.locator('a.result-link').first()).toBeVisible();
  } finally {
    await context.close();
  }
});
