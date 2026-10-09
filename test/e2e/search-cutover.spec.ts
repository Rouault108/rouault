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
  await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
    'data-search-page-capability',
    'ready',
  );
};
const paths = (page: Page) =>
  page
    .locator('[data-search-page-results-section] a.result-link')
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
  await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
    'data-search-page-capability',
    'ready',
  );
});

test('initial Search / Tag adoption keeps search artifacts lazy without readiness probes', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  for (const path of ['/search/', '/tags/Programming/']) {
    await ready(page, path);
    await expect(page.locator('[data-search-page-form]')).toBeVisible();
    expect(
      requests.filter(
        (path) =>
          path.endsWith('/search/manifest.json') ||
          path.endsWith('/search-catalog.json') ||
          /\/search\/suzume\..*\.wasm$/u.test(path),
      ),
    ).toEqual([]);
  }
});

test('all sources failed is a request error and subsequent input can use Catalog', async ({
  page,
}) => {
  await page.route('**/search/manifest.json', (route) => route.fulfill({ status: 404, body: '' }));
  let catalogRequests = 0;
  await page.route('**/search-catalog.json', (route) => {
    catalogRequests += 1;
    return catalogRequests === 1 ? route.fulfill({ status: 404, body: '' }) : route.continue();
  });
  await ready(page, '/search/?q=first');
  await expect(page.locator('[data-search-page-error]')).toBeVisible();
  await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
    'data-search-page-capability',
    'ready',
  );
  await expect(page.locator('[data-search-query-input]')).toBeEnabled();
  await expect(page.locator('[data-search-page-results-section]')).toBeEmpty();
  await expect(page.locator('[data-search-page-result-count]')).toHaveText('取得失敗');
  await page.locator('[data-search-query-input]').fill('言語バージョン・ビルド文脈・互換性');
  await expect(
    page.locator('[data-search-page-results-section] a.result-link').first(),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-search-page-error]')).toBeHidden();
  await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
    'data-search-page-capability',
    'ready',
  );
  expect(catalogRequests).toBe(2);
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

test.describe('No-JS static exploration', () => {
  test.use({ javaScriptEnabled: false });

  const expectStaticControls = async (page: Page) => {
    await expect(page.locator('[data-search-page-form]')).toBeHidden();
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    for (const selector of [
      '[data-search-query-input]',
      '[data-search-filter-input]',
      '[data-search-choice-menu] summary',
      '[data-search-selected-tag-remove]',
    ]) {
      for (const control of await page.locator(selector).all()) await expect(control).toBeHidden();
    }
  };

  test('Search → tag → note uses ordinary anchors with no search controls exposed', async ({
    page,
  }) => {
    await page.goto(basePath + '/search/');
    await expectStaticControls(page);
    const baseline = page.locator('[data-search-page-baseline]');
    await expect(baseline).toContainText('タグやコーパスからノートを辿れます');
    await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
      'initial-search-response-json',
      /rouault-search-v3/u,
    );
    await baseline.getByRole('link', { name: 'Programming', exact: true }).click();
    await expectStaticControls(page);
    const noteLink = page.locator('[data-search-page-baseline] a.result-link').first();
    await expect(noteLink).toBeVisible();
    // Chromiumの文書間view transitionがpointerを遮る間は、通常anchorのhit test成立を待つ。
    await expect
      .poll(() =>
        noteLink.evaluate((link) => {
          const rect = link.getBoundingClientRect();
          return link.contains(
            document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
          );
        }),
      )
      .toBe(true);
    await noteLink.click();
    await expect(page.locator('[data-note-static-surface]')).toBeVisible();
  });

  test('Search → corpora uses the owner index anchor', async ({ page }) => {
    await page.goto(basePath + '/search/');
    await expectStaticControls(page);
    await page.getByRole('link', { name: 'コーパスから探す', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(basePath + '/corpora/$', 'u'));
  });

  test('Tag SSR retains its static note links and hidden enabled choice values', async ({
    page,
  }) => {
    await page.goto(basePath + '/tags/Programming/');
    await expectStaticControls(page);
    await expect(page.locator('[data-search-page-baseline] a.result-link').first()).toBeVisible();
    for (const name of ['tagMode', 'sort']) {
      await expect(page.locator('input[type="hidden"][name="' + name + '"]')).not.toBeDisabled();
    }
    await page.locator('[data-search-page-baseline] a.result-link').first().focus();
    await page.keyboard.press('Tab');
    expect(
      await page
        .locator('[data-search-page-form]')
        .evaluate((form) => form.contains(document.activeElement)),
    ).toBe(false);
  });
});

test('search condition history wins over pending input and survives note round trip', async ({
  page,
}) => {
  await ready(page, '/tags/Programming/');
  const results = page.locator('[data-search-page-results-section]');
  const count = page.locator('[data-search-page-result-count]');
  const query = page.locator('[data-search-query-input]');
  const menu = page.locator('[data-search-choice-menu="tag-mode"]');
  await expect(results.locator('a.result-link').first()).toBeVisible();
  await menu.locator('[data-static-choice-trigger]').click();
  await menu.locator('[data-value="and"]').click();
  await expect(results).toHaveAttribute('data-results-status', 'ready');
  await expect(menu.locator('[data-static-choice-trigger]')).toBeFocused();

  const sentinel = await page.evaluate(() => {
    const saved: unknown = history.state;
    history.replaceState(
      {
        ...(saved && typeof saved === 'object' ? saved : {}),
        searchTestForeign: 42,
        __routerUrl: `${location.pathname}${location.search}`,
      },
      '',
      location.href,
    );
    const input = document.querySelector<HTMLInputElement>('[data-search-query-input]');
    if (!input) throw new Error('Missing query');
    input.value = 'TypeScript';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const root = document.querySelector('[data-search-page-results-section]');
    const snapshot = {
      status: root?.getAttribute('data-results-status'),
      retained: (root?.querySelectorAll('a.result-link').length ?? 0) > 0,
      count: document.querySelector('[data-search-page-result-count]')?.textContent,
      foreign: (history.state as { searchTestForeign?: number }).searchTestForeign,
    };
    history.back();
    return snapshot;
  });
  expect(sentinel).toEqual({ status: 'pending', retained: true, count: '更新中', foreign: 42 });
  await expect(query).toHaveValue('');
  await expect(menu.locator('[data-value="or"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(results).toHaveAttribute('data-results-status', 'ready');
  await page.goForward();
  await expect(query).toHaveValue('TypeScript');
  await expect(menu.locator('[data-value="and"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(results).toHaveAttribute('data-results-status', 'ready');
  await expect(results.locator('a.result-link').first()).toBeVisible();
  const searchUrl = page.url();
  const resultCount = await count.textContent();
  const hrefs = await paths(page);
  const historyLength = await page.evaluate(() => history.length);
  await menu.locator('[data-static-choice-trigger]').click();
  await menu.locator('[data-value="and"]').click();
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  expect(await paths(page)).toEqual(hrefs);
  await results.locator('a.result-link').first().click();
  await expect(page).not.toHaveURL(searchUrl);
  await page.goBack();
  await expect(page).toHaveURL(searchUrl);
  await expect(query).toHaveValue('TypeScript');
  await expect(results).toHaveAttribute('data-results-status', 'ready');
  await expect(count).toHaveText(resultCount ?? '');
  expect(await paths(page)).toEqual(hrefs);
  expect(
    await page.evaluate(() => (history.state as { searchTestForeign?: number }).searchTestForeign),
  ).toBe(42);
});
