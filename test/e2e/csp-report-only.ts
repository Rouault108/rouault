import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  collectCspStageOne,
  CSP_REPORT_ONLY_HEADER,
} from '../../build/security/csp-report-only.js';

const observe = async (page: Page): Promise<string[]> => {
  const messages: string[] = [];
  page.context().on('console', (message) => messages.push(message.text()));
  await page.addInitScript(() => {
    const records: unknown[] = [];
    Object.defineProperty(window, '__cspRecords', { value: records });
    document.addEventListener('securitypolicyviolation', (event) => {
      records.push({
        directive: event.effectiveDirective,
        blocked: event.blockedURI,
        disposition: event.disposition,
        document: event.documentURI,
        line: event.lineNumber,
      });
    });
  });
  return messages;
};
const records = (page: Page) =>
  page.evaluate(() => {
    const data: unknown = Reflect.get(window, '__cspRecords');
    return Array.isArray(data)
      ? (data as { directive: string; blocked: string; disposition: string }[])
      : [];
  });

test('HTTP Report-Only allows theme, reports an unknown script, and does not enforce', async ({
  page,
  request,
}, info) => {
  const consoleMessages = await observe(page);
  const html = await readFile('dist/index.html', 'utf8');
  const storageKey = /const storageKey = "([^"]+)"/u.exec(html)?.[1];
  if (!storageKey) throw new Error('Missing theme storage key');
  await page.addInitScript((key) => localStorage.setItem(key, 'dark'), storageKey);
  // 外部runtimeに補正させず、2本のbootstrap自体の適用結果を確かめる。
  await page.route('**/client-assets/client-*.js', (route) => route.abort());
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy-report-only']).toContain(
    "script-src 'self' 'sha256-",
  );
  expect(response?.headers()['content-security-policy']).toBeUndefined();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('[data-theme-preference]').first()).toHaveAttribute(
    'data-theme-preference',
    'dark',
  );
  await expect(page.locator('[data-theme-chrome-bootstrap]')).toHaveCount(1);
  expect(await records(page)).toEqual([]);
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'document.documentElement.dataset.cspProbe = "executed";';
    document.body.append(script);
  });
  await expect(page.locator('html')).toHaveAttribute('data-csp-probe', 'executed');
  await expect
    .poll(async () =>
      (await records(page)).some(
        (row) => row.directive === 'script-src-elem' && row.disposition === 'report',
      ),
    )
    .toBe(true);
  const head = await request.head('/');
  expect(head.headers()['content-security-policy-report-only']).toBe(
    response?.headers()['content-security-policy-report-only'],
  );
  await info.attach('report-only-events', {
    body: JSON.stringify({ events: await records(page), consoleMessages }, null, 2),
    contentType: 'application/json',
  });
});

test('a narrower Worker response reports WASM/blob violations without stopping RO execution', async ({
  page,
  context,
}, info) => {
  const consoleMessages = await observe(page);
  const paths: string[] = [];
  page.on('request', (request) => paths.push(new URL(request.url()).pathname));
  let intercepted = false;
  await context.route('**/client-assets/worker-*.js', async (route) => {
    intercepted = true;
    const response = await route.fetch();
    const headers = response.headers();
    headers['content-security-policy-report-only'] =
      "default-src 'none'; script-src 'self'; connect-src 'self'";
    // Worker内のCSP eventは親documentへ届かないため、対照fixtureだけでconsoleへ投影する。
    const observer = `self.addEventListener('securitypolicyviolation', event => console.info('worker-csp-event', JSON.stringify({directive:event.effectiveDirective,blocked:event.blockedURI,disposition:event.disposition})));`;
    await route.fulfill({ response, headers, body: observer + (await response.text()) });
  });
  await page.goto('/search/?q=TypeScript');
  await expect(page.locator('a.result-link').first()).toBeVisible({ timeout: 15_000 });
  expect(intercepted).toBe(true);
  expect(paths.some((path) => path.endsWith('/search-catalog.json'))).toBe(false);
  try {
    for (const [directive, blocked] of [
      ['connect-src', 'blob'],
      ['script-src', 'wasm-eval'],
    ]) {
      await expect
        .poll(() =>
          consoleMessages.some(
            (message) =>
              message.includes(`"directive":"${directive}"`) &&
              message.includes(`"blocked":"${blocked}"`) &&
              message.includes('"disposition":"report"'),
          ),
        )
        .toBe(true);
    }
  } finally {
    await info.attach('worker-negative-control', {
      body: JSON.stringify(consoleMessages, null, 2),
      contentType: 'application/json',
    });
  }
});

test('real lexical Worker uses its own WASM/blob policy and returns search results', async ({
  page,
  request,
}, info) => {
  const consoleMessages = await observe(page);
  const paths: string[] = [];
  page.on('request', (request) => paths.push(new URL(request.url()).pathname));
  const manifest = await collectCspStageOne('dist');
  const worker = manifest.rules.find((rule) => rule.context === 'worker');
  if (!worker) throw new Error('Missing Worker policy');
  const workerResponse = await request.get(worker.pattern);
  expect(workerResponse.status()).toBe(200);
  expect(workerResponse.headers()[CSP_REPORT_ONLY_HEADER.toLowerCase()]).toBe(worker.policy);
  expect(workerResponse.headers()['content-security-policy']).toBeUndefined();
  await page.goto('/search/?q=TypeScript');
  await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
    'data-search-page-capability',
    'ready',
  );
  await expect(page.locator('a.result-link').first()).toBeVisible({ timeout: 15_000 });
  expect(paths.some((path) => /\/search\/suzume\..*\.wasm$/u.test(path))).toBe(true);
  expect(paths.some((path) => path.endsWith('/search-catalog.json'))).toBe(false);
  expect(await records(page)).toEqual([]);
  expect(
    consoleMessages.filter((message) =>
      /(?:wasm-unsafe-eval|blob:).*violat|violat.*(?:wasm-unsafe-eval|blob:)/iu.test(message),
    ),
  ).toEqual([]);
  await info.attach('worker-policy-observation', {
    body: JSON.stringify(
      { policy: worker.policy, paths, consoleMessages, events: await records(page) },
      null,
      2,
    ),
    contentType: 'application/json',
  });
});

test('known 404 style and srcdoc violations stay visible while preview still runs', async ({
  page,
}, info) => {
  const consoleMessages = await observe(page);
  await page.goto('/404.html');
  await expect
    .poll(async () =>
      (await records(page)).some(
        (row) => row.directive === 'style-src-elem' && row.disposition === 'report',
      ),
    )
    .toBe(true);
  const notFoundEvents = await records(page);
  await page.goto('/notes/testing/sandbox/');
  const frame = page.locator('[data-preview-sandbox-root] iframe').first();
  await frame.scrollIntoViewIfNeeded();
  await expect(frame).toBeVisible();
  await expect(frame.contentFrame().locator('.demo-button')).toBeVisible();
  await frame.contentFrame().locator('.demo-button').click();
  await expect
    .poll(() =>
      frame
        .contentFrame()
        .locator('.demo-button')
        .evaluate((button) => (button as HTMLElement).style.backgroundColor),
    )
    .not.toBe('');
  // opaque srcdocのイベントは親へbubbleしないため、browser consoleも観測する。
  await expect
    .poll(() =>
      consoleMessages.some((message) => /script-src/iu.test(message) && /inline/iu.test(message)),
    )
    .toBe(true);
  await info.attach('known-violations', {
    body: JSON.stringify(
      { notFoundEvents, consoleMessages, parentEvents: await records(page) },
      null,
      2,
    ),
    contentType: 'application/json',
  });
});
