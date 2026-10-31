import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  collectCspStageOne,
  CSP_REPORT_ONLY_HEADER,
} from '../../build/security/csp-report-only.js';
import {
  assertMinimalCspDiagnostics,
  blockedOriginOrScheme,
  type CspDiagnostic,
} from '../../build/security/csp-diagnostics.js';

const observations = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }) => {
  expect(observations.get(page) ?? []).not.toContain('unexpected-origin-request');
});

const observe = async (page: Page, browser: string): Promise<string[]> => {
  const messages: string[] = [];
  observations.set(page, messages);
  await page.context().route(
    (url) => /^https?:$/u.test(url.protocol) && url.origin !== 'http://127.0.0.1:4173',
    (route) => {
      messages.push('unexpected-origin-request');
      return route.abort();
    },
  );
  // 生consoleはassertionにだけ使い、永続化しない。
  page.context().on('console', (message) => messages.push(message.text()));
  await page.addInitScript((browser) => {
    const records: unknown[] = [];
    Object.defineProperty(window, '__cspRecords', { value: records });
    document.addEventListener('securitypolicyviolation', (event) => {
      const value = event.blockedURI;
      let blocked: string;
      if (value === 'blob' || value.startsWith('blob:')) blocked = 'blob:';
      else if (value === 'data' || value.startsWith('data:')) blocked = 'data:';
      else if (['inline', 'eval', 'wasm-eval', ''].includes(value)) blocked = value;
      else {
        try {
          const url = new URL(value);
          blocked = url.origin !== 'null' ? url.origin : url.protocol;
        } catch {
          blocked = 'other';
        }
      }
      const segment = location.pathname.split('/')[1] ?? '';
      const routeClass =
        (
          {
            '': 'home',
            '404.html': '404',
            '404': '404',
            notes: 'note',
            memos: 'memo',
            corpora: 'corpus',
            tags: 'tag',
            about: 'about',
            search: 'search',
          } as Record<string, string>
        )[segment] ?? 'other';
      records.push({
        buildId:
          document.querySelector('meta[name="rouault-build-id"]')?.getAttribute('content') ??
          'fixture',
        browser,
        routeClass,
        directive: event.effectiveDirective,
        blocked,
        disposition: event.disposition,
        status: event.statusCode,
      });
    });
  }, browser);
  return messages;
};
const records = (page: Page) =>
  page.evaluate(() => {
    const value: unknown = Reflect.get(window, '__cspRecords');
    return Array.isArray(value) ? (value as Omit<CspDiagnostic, 'owner' | 'classification'>[]) : [];
  });
const attach = async (
  page: Page,
  info: TestInfo,
  name: string,
  owner: string,
  classification: CspDiagnostic['classification'],
  extra: readonly { directive: string; blocked: string; disposition: string }[] = [],
) => {
  const buildId =
    (await page.locator('meta[name="rouault-build-id"]').getAttribute('content')) ?? 'fixture';
  const rows: CspDiagnostic[] = (await records(page)).map((row) => ({
    ...row,
    owner,
    classification,
  }));
  rows.push(
    ...extra.map((row) => ({
      ...row,
      blocked: blockedOriginOrScheme(row.blocked),
      buildId,
      browser: info.project.name,
      routeClass: owner === 'lexical-worker' ? 'search' : 'preview',
      status: 0,
      owner,
      classification,
    })),
  );
  assertMinimalCspDiagnostics(rows);
  await info.attach(name, { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });
};
const ready = async (page: Page) =>
  page.evaluate(async () => {
    await customElements.whenDefined('router-document-host');
    await document.querySelector('router-document-host')?.whenReady();
  });

for (const preference of ['system', 'light', 'dark', 'storage-denied'] as const) {
  test(`theme bootstrap works independently: ${preference}`, async ({ page, request }, info) => {
    await observe(page, info.project.name);
    const html = await readFile('dist/index.html', 'utf8');
    const key = /const storageKey = "([^"]+)"/u.exec(html)?.[1];
    if (!key) throw new Error('Theme key');
    await page.addInitScript(
      ({ key, preference }) => {
        if (preference === 'storage-denied')
          Object.defineProperty(window, 'localStorage', {
            get: () => {
              throw new Error('fixture');
            },
          });
        else localStorage.setItem(key, preference);
      },
      { key, preference },
    );
    await page.route('**/client-assets/client-*.js', (route) => route.abort());
    const response = await page.goto('/');
    expect(response?.headers()['content-security-policy-report-only']).toContain(
      "script-src 'self' 'sha256-",
    );
    expect(response?.headers()['content-security-policy']).toBeUndefined();
    const expected = preference === 'storage-denied' ? 'system' : preference;
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', expected);
    await expect(page.locator('html')).toHaveAttribute(
      'data-resolved-theme',
      expected === 'light' ? 'light' : 'dark',
    );
    await expect(page.locator('[data-theme-preference]').first()).toHaveAttribute(
      'data-theme-preference',
      expected,
    );
    const ui = {
      light: ['ライト', 'sun'],
      dark: ['ダーク', 'moon'],
      system: ['OSテーマ', 'monitor'],
    }[expected];
    if (!ui) throw new Error('Theme fixture');
    await expect(page.locator('[data-theme-current-label]').first()).toHaveText(ui[0] ?? '');
    await expect(
      page.locator('[data-theme-preference] .theme-trigger-icon svg').first(),
    ).toHaveAttribute('data-icon', ui[1] ?? '');
    expect(await records(page)).toEqual([]);
    expect((await request.head('/')).headers()['content-security-policy-report-only']).toBe(
      response?.headers()['content-security-policy-report-only'],
    );
    await attach(page, info, 'theme-observation', 'theme-bootstrap', 'fixture');
  });
}

test('unknown inline reports and continues in Report-Only', async ({ page }, info) => {
  await observe(page, info.project.name);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'document.documentElement.dataset.cspProbe="executed";';
    document.body.append(script);
  });
  await expect(page.locator('html')).toHaveAttribute('data-csp-probe', 'executed');
  await expect
    .poll(async () =>
      (await records(page)).some(
        (row) =>
          row.directive === 'script-src-elem' &&
          row.blocked === 'inline' &&
          row.disposition === 'report',
      ),
    )
    .toBe(true);
  await attach(page, info, 'inline-probe', 'unknown-inline-probe', 'fixture');
});

test('Worker response missing both permissions reports both violations while lexical search continues', async ({
  page,
  context,
}, info) => {
  const messages = await observe(page, info.project.name);
  const paths: string[] = [];
  page.on('request', (request) => paths.push(new URL(request.url()).pathname));
  let intercepted = false;
  await context.route(
    (url) =>
      url.origin === 'http://127.0.0.1:4173' &&
      /^\/client-assets\/worker-[\w-]+\.js$/u.test(url.pathname),
    async (route) => {
      intercepted = true;
      const response = await route.fetch();
      const headers = response.headers();
      headers['content-security-policy-report-only'] =
        "default-src 'none'; script-src 'self'; connect-src 'self'";
      const observer = `self.addEventListener('securitypolicyviolation', e => { let blocked=e.blockedURI; if(blocked==='blob'||blocked.startsWith('blob:')) blocked='blob:'; else if(blocked!=='wasm-eval'&&blocked!=='inline'&&blocked!=='eval') { try { const u=new URL(blocked); blocked=u.origin!=='null'?u.origin:u.protocol; } catch { blocked='other'; } } console.info('worker-csp-event', JSON.stringify({directive:e.effectiveDirective,blocked,disposition:e.disposition})); });`;
      await route.fulfill({ response, headers, body: observer + (await response.text()) });
    },
  );
  await page.goto('/search/?' + new URLSearchParams({ q: 'TypeScript' }));
  await expect(page.locator('a.result-link').first()).toBeVisible({ timeout: 15_000 });
  expect(intercepted).toBe(true);
  expect(paths.some((path) => path.endsWith('/search-catalog.json'))).toBe(false);
  for (const [directive, blocked] of [
    ['connect-src', 'blob:'],
    ['script-src', 'wasm-eval'],
  ])
    await expect
      .poll(() =>
        messages.some(
          (message) =>
            message.includes(`"directive":"${directive}"`) &&
            message.includes(`"blocked":"${blocked}"`) &&
            message.includes('"disposition":"report"'),
        ),
      )
      .toBe(true);
  const observations = messages
    .filter((message) => message.startsWith('worker-csp-event '))
    .map((message) => {
      const value: unknown = JSON.parse(message.slice('worker-csp-event '.length));
      if (
        !value ||
        typeof value !== 'object' ||
        !('directive' in value) ||
        typeof value.directive !== 'string' ||
        !('blocked' in value) ||
        typeof value.blocked !== 'string'
      )
        throw new Error('Worker diagnostic');
      return { directive: value.directive, blocked: value.blocked, disposition: 'report' };
    });
  await attach(page, info, 'worker-negative-control', 'lexical-worker', 'fixture', observations);
});

test('production lexical Worker has the separate HTTP policy, correct MIME, WASM and no Catalog fallback', async ({
  page,
  request,
}, info) => {
  const messages = await observe(page, info.project.name);
  const paths: string[] = [];
  page.on('request', (request) => paths.push(new URL(request.url()).pathname));
  const manifest = await collectCspStageOne('dist');
  const worker = manifest.rules.find((rule) => rule.context === 'worker');
  if (!worker) throw new Error('Worker');
  const response = await request.get(worker.pattern);
  expect(response.status()).toBe(200);
  expect(response.headers()[CSP_REPORT_ONLY_HEADER.toLowerCase()]).toBe(worker.policy);
  expect(response.headers()['content-type']).toMatch(/javascript/u);
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['content-security-policy']).toBeUndefined();
  await page.goto('/search/?' + new URLSearchParams({ q: 'TypeScript' }));
  await expect(page.locator('[data-search-page-root]')).toHaveAttribute(
    'data-search-page-capability',
    'ready',
  );
  await expect(page.locator('a.result-link').first()).toBeVisible({ timeout: 15_000 });
  const wasm = paths.find((path) => /\/search\/suzume\..*\.wasm$/u.test(path));
  if (!wasm) throw new Error('WASM request');
  expect((await request.get(wasm)).headers()['content-type']).toContain('application/wasm');
  expect((await request.head(wasm)).headers()['x-content-type-options']).toBe('nosniff');
  expect(paths.some((path) => path.endsWith('/search-catalog.json'))).toBe(false);
  expect(await records(page)).toEqual([]);
  expect(
    messages.filter((message) =>
      /content.security.policy|violat.*(?:script-src|connect-src)/iu.test(message),
    ),
  ).toEqual([]);
  await attach(page, info, 'worker-observation', 'lexical-worker', 'fixture');
});

test('style exception is intentional; legacy srcdoc script/base/frame violations remain classified', async ({
  page,
}, info) => {
  const messages = await observe(page, info.project.name);
  await page.goto('/404.html');
  expect(await records(page)).toEqual([]);
  await page.goto('/notes/testing/sandbox/');
  const frame = page.locator('[data-preview-sandbox-root] iframe').first();
  await frame.scrollIntoViewIfNeeded();
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
  await expect
    .poll(() =>
      messages.some((message) => /script-src/iu.test(message) && /inline/iu.test(message)),
    )
    .toBe(true);
  const events = await records(page);
  expect(
    events.every((row) => ['frame-src', 'base-uri', 'script-src-elem'].includes(row.directive)),
  ).toBe(true);
  const consoleDirectives = ['script-src-elem', 'base-uri'].filter((directive) =>
    messages.some((message) =>
      message.includes(directive === 'script-src-elem' ? 'script-src' : directive),
    ),
  );
  await attach(
    page,
    info,
    'legacy-preview',
    'legacy-srcdoc',
    'known-legacy-preview',
    consoleDirectives.map((directive) => ({
      directive,
      blocked: directive === 'base-uri' ? 'http://127.0.0.1:4173' : 'inline',
      disposition: 'report',
    })),
  );
});

test('all entry classes share one policy and preserve no-JS content; soft navigation keeps the initial document', async ({
  page,
  browser,
  request,
}, info) => {
  const entries = [
    '/',
    '/about/',
    '/notes/e2e/layout-rich/',
    '/memos/',
    '/corpora/',
    '/search/',
    '/404.html',
  ];
  const manifest = await collectCspStageOne('dist');
  const tag = manifest.documents.find((document) => document.routeClass === 'tag');
  if (!tag) throw new Error('Tag entry fixture');
  entries.push('/' + tag.file.replace(/index\.html$/u, ''));
  const media = manifest.mediaAliases[0];
  if (!media) throw new Error('Media object fixture');
  const mediaUrl = manifest.basePath + '/' + media.file;
  const mediaResponse = await request.get(mediaUrl);
  expect(mediaResponse.status()).toBe(200);
  expect(mediaResponse.headers()['content-type']).toBe(media.contentType);
  expect(mediaResponse.headers()['x-content-type-options']).toBe('nosniff');
  expect(
    (await request.get(mediaUrl, { headers: { 'If-None-Match': `"${media.sha256}"` } })).status(),
  ).toBe(304);
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  const policy = (await request.get('/')).headers()['content-security-policy-report-only'];
  try {
    for (const entry of entries) {
      const response = await request.get(entry);
      expect(response.headers()['content-security-policy-report-only']).toBe(policy);
      expect(response.headers()['content-type']).toMatch(/text\/html/u);
      await staticPage.goto('http://127.0.0.1:4173' + entry);
      await expect(staticPage.locator('main')).toBeVisible();
    }
  } finally {
    await noJs.close();
  }
  await observe(page, info.project.name);
  await page.goto('/');
  await ready(page);
  const origin = await page.evaluate(() => performance.timeOrigin);
  await page.evaluate(async () => {
    await document.querySelector('router-document-host')?.navigate('/about/');
  });
  await expect(page).toHaveURL(/\/about\/?$/u);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  expect(await records(page)).toEqual([]);
  await attach(page, info, 'entry-and-navigation', 'router', 'fixture');
});
