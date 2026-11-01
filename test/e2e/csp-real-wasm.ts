import { readFile, mkdir, writeFile } from 'node:fs/promises';
import type { Browser, BrowserContext, TestInfo } from '@playwright/test';
import { test, expect } from './support/csp-test.js';
import {
  readVerifiedCspStageOne,
  type CspStageOneManifest,
} from '../../build/security/csp-report-only.js';
import {
  CSP_WASM_CASES,
  readWasmMeasurement,
  readWasmRow,
  wasmEvidenceHealthy,
  type WasmCase,
  type WasmEvidenceRow,
} from '../../scripts/ci/csp-wasm-evidence.js';
import { workerWasmVariant, type WorkerWasmCase } from './support/csp-wasm-worker-http.js';
import {
  startDocumentWasmFixture,
  digest,
  suzumeFixtureBytes,
} from './support/csp-wasm-fixture.js';
import { classifyWasmConsole } from './support/csp-wasm-instrumentation.js';
import { wasmFixtureFingerprint } from '../../scripts/ci/csp-fixture-bindings.js';

const binding = (info: TestInfo, browser: Browser, manifest: CspStageOneManifest) => ({
  sha: process.env['GITHUB_SHA'] ?? 'local',
  run: process.env['GITHUB_RUN_ID'] ?? 'local',
  buildId: manifest.buildId,
  engine: info.project.name,
  browserVersion: browser.version(),
  playwrightVersion: '1.63.0',
  locale: 'en-US',
  nodeVersion: process.versions.node,
  pnpmVersion:
    /(?:^| )pnpm\/([0-9.]+)(?: |$)/u.exec(process.env['npm_config_user_agent'] ?? '')?.[1] ??
    'unrecorded',
  containerDigest: process.env['CSP_CONTAINER_DIGEST'] ?? 'unrecorded',
});
const prepare = async (
  context: BrowserContext,
  origin: string,
  diagnosticOff: boolean,
  roPolicy: string | null = null,
  expectedCatalog = false,
) => {
  const state = { external: false, unknown: false, notifications: 0, workerRequests: 0 };
  await context.route(
    (url) => /^https?:$/u.test(url.protocol) && url.origin !== origin,
    (route) => {
      state.external = true;
      return route.abort();
    },
  );
  if (!diagnosticOff)
    context.on('console', (message) => {
      // 許可除去対照でアプリ自身が出す既知のCatalog診断。CSP通知へは数えない。
      if (
        expectedCatalog &&
        message.type() === 'warning' &&
        message.text().startsWith('Search page completed with degraded diagnostics.') &&
        message.location().url.startsWith(origin + '/client-assets/')
      )
        return;
      const category = classifyWasmConsole(message.text(), roPolicy);
      if (category === 'unknown') state.unknown = true;
      if (category === 'wasm-notification') state.notifications++;
    });
  await context.addInitScript(() => {
    const state: { last: unknown } = { last: null };
    Object.defineProperty(globalThis, '__cspWasmSnapshot', { value: state });
    const channel = new BroadcastChannel('rouault-csp-wasm-measure-v1');
    channel.onmessage = (event) => {
      state.last = event.data;
    };
  });
  return state;
};
const snapshot = async (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const direct: unknown = Reflect.get(globalThis, '__cspWasmMeasure');
    const box: unknown = Reflect.get(globalThis, '__cspWasmSnapshot');
    const indirect = box && typeof box === 'object' && 'last' in box ? box.last : null;
    return direct ?? indirect ?? null;
  });
const measured = async (page: import('@playwright/test').Page, missing: boolean) => {
  if (missing) return null;
  await expect
    .poll(
      async () => {
        try {
          const m = readWasmMeasurement(await snapshot(page));
          return (
            m.calls.length > 0 &&
            m.calls.every((c) => c.outcome !== 'pending' && c.digest !== 'pending')
          );
        } catch {
          return false;
        }
      },
      { timeout: 8000 },
    )
    .toBe(true);
  return readWasmMeasurement(await snapshot(page));
};

const workerProbe = async (
  browser: Browser,
  manifest: CspStageOneManifest,
  caseId: WorkerWasmCase,
): Promise<WasmEvidenceRow> => {
  const worker = manifest.rules.find((r) => r.context === 'worker'),
    parent = manifest.rules.find((r) => r.context === 'document');
  if (!worker || !parent) throw new Error('wasm-policy-missing');
  const original = await readFile(
    'dist/' + worker.pattern.slice(manifest.basePath.length).replace(/^\//u, ''),
    'utf8',
  );
  const expected = workerWasmVariant(caseId, original, worker.policy);
  const context = await browser.newContext({
    locale: 'en-US',
    extraHTTPHeaders: { 'X-Rouault-Csp-Wasm-Case': caseId },
  });
  const diagnosticOff = caseId === 'worker-diagnostic-off' || caseId === 'worker-shared-fault';
  const state = await prepare(
    context,
    'http://127.0.0.1:4173',
    diagnosticOff,
    parent.policy,
    caseId.endsWith('deny'),
  );
  let catalog = false;
  context.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === worker.pattern) state.workerRequests++;
    if (url.pathname.endsWith('/search-catalog.json')) catalog = true;
  });
  try {
    const response = await context.request.get(worker.pattern);
    const headers = response.headers();
    const fixtureVerified = digest(await response.body()) === digest(expected.body);
    const httpVerified =
      response.status() === 200 &&
      headers['content-security-policy'] === expected.policy &&
      headers['content-security-policy-report-only'] === undefined &&
      headers['content-type']?.includes('javascript') === true &&
      headers['x-content-type-options'] === 'nosniff';
    const page = await context.newPage();
    const navigation = await page.goto('/search/?' + new URLSearchParams({ q: 'TypeScript' }));
    const parentVerified =
      navigation?.headers()['content-security-policy-report-only'] === parent.policy &&
      navigation.headers()['content-security-policy'] === undefined;
    let visible = true;
    try {
      await page.locator('a.result-link').first().waitFor({ state: 'visible', timeout: 12000 });
    } catch {
      visible = false;
    }
    const measurement = await measured(page, caseId === 'worker-shared-fault');
    return readWasmRow({
      caseId: CSP_WASM_CASES.includes(caseId as WasmCase) ? caseId : 'worker-stream-allow',
      policy: digest(expected.policy),
      parentPolicy: digest(parent.policy),
      workerEntryDigest: digest(original),
      httpVerified: httpVerified && parentVerified,
      fixtureVerified,
      lifetimeValid: !state.external && state.workerRequests === 1,
      source: catalog ? 'catalog' : visible ? 'lexical' : 'none',
      initialized: !!measurement?.calls.some((c) => c.outcome === 'fulfilled'),
      measurement,
      diagnostic: {
        status: diagnosticOff ? 'unavailable' : 'available',
        reason:
          caseId === 'worker-shared-fault'
            ? 'shared-fault'
            : diagnosticOff
              ? 'independent-disconnect'
              : state.notifications
                ? 'observed'
                : 'no-notification',
        independent: caseId !== 'worker-shared-fault',
        unknownConsole: state.unknown,
        notifications: state.notifications,
      },
    });
  } finally {
    await context.close();
  }
};

const documentProbe = async (
  browser: Browser,
  manifest: CspStageOneManifest,
  caseId: WasmCase,
): Promise<WasmEvidenceRow> => {
  const parent = manifest.rules.find((r) => r.context === 'document');
  if (!parent) throw new Error('wasm-policy-missing');
  const fixture = await startDocumentWasmFixture({
    parentPolicy: parent.policy,
    allowWasm: !caseId.endsWith('deny'),
    allowJs: caseId === 'document-js-control',
    selection: caseId.includes('bytes') ? 'bytes' : 'streaming',
  });
  const context = await browser.newContext({ locale: 'en-US' });
  const state = await prepare(context, fixture.origin, false);
  try {
    const response = await context.request.get(fixture.origin);
    const source = await context.request.get(fixture.origin + '/page.js');
    const wasm = await context.request.get(fixture.origin + '/suzume.wasm');
    const expected = await suzumeFixtureBytes();
    const httpVerified =
      response.headers()['content-security-policy'] === fixture.policy &&
      response.headers()['content-security-policy-report-only'] === undefined &&
      wasm.headers()['content-type'] === 'application/wasm' &&
      wasm.headers()['x-content-type-options'] === 'nosniff';
    const fixtureVerified =
      digest(await source.body()) === fixture.pageDigest &&
      digest(await wasm.body()) === digest(expected.wasm);
    const page = await context.newPage();
    await page.goto(fixture.origin);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const r: unknown = Reflect.get(globalThis, '__cspDocumentResult');
          return !!r && typeof r === 'object' && 'done' in r && r.done === true;
        }),
      )
      .toBe(true);
    const measurement = await measured(page, false);
    await expect
      .poll(() => snapshot(page).then((value) => readWasmMeasurement(value).js.timer !== 'pending'))
      .toBe(true);
    const finalMeasurement = readWasmMeasurement(await snapshot(page));
    const initialized = await page.evaluate(() => {
      const r: unknown = Reflect.get(globalThis, '__cspDocumentResult');
      return !!r && typeof r === 'object' && 'initialized' in r && r.initialized === true;
    });
    void measurement;
    return readWasmRow({
      caseId,
      policy: digest(fixture.policy),
      parentPolicy: digest(parent.policy),
      workerEntryDigest: fixture.glueDigest,
      httpVerified,
      fixtureVerified,
      lifetimeValid: !state.external,
      source: 'document',
      initialized,
      measurement: finalMeasurement,
      diagnostic: {
        status: 'available',
        reason: state.notifications ? 'observed' : 'no-notification',
        independent: true,
        unknownConsole: state.unknown,
        notifications: state.notifications,
      },
    });
  } finally {
    await context.close();
    await fixture.close();
  }
};

test('real Suzume API evidence keeps streaming, bytes and notifications independent', async ({
  browser,
}, info) => {
  test.setTimeout(180000);
  const manifest = await readVerifiedCspStageOne('dist', '.generated/csp/manifest.json');
  const rows: WasmEvidenceRow[] = [];
  for (const caseId of CSP_WASM_CASES)
    rows.push(
      caseId.startsWith('worker-')
        ? await workerProbe(browser, manifest, caseId as WorkerWasmCase)
        : await documentProbe(browser, manifest, caseId),
    );
  await mkdir('.generated/csp', { recursive: true });
  await writeFile(
    `.generated/csp/wasm-${info.project.name}.json`,
    JSON.stringify({
      schema: 1,
      kind: 'real-suzume-evidence',
      ...binding(info, browser, manifest),
      fixtureDigest: await wasmFixtureFingerprint(),
      rows,
    }),
  );
});

test('diagnostic-only and shared measurement faults have different effects', async ({
  browser,
}, info) => {
  test.setTimeout(60000);
  const manifest = await readVerifiedCspStageOne('dist', '.generated/csp/manifest.json');
  const independent = await workerProbe(browser, manifest, 'worker-diagnostic-off');
  const shared = await workerProbe(browser, manifest, 'worker-shared-fault');
  expect(wasmEvidenceHealthy(independent)).toBe(true);
  expect(wasmEvidenceHealthy(shared)).toBe(false);
  await writeFile(
    `.generated/csp/wasm-faults-${info.project.name}.json`,
    JSON.stringify({
      schema: 1,
      kind: 'wasm-fault-controls',
      ...binding(info, browser, manifest),
      fixtureDigest: await wasmFixtureFingerprint(),
      diagnosticOnlyDetected: true,
      sharedFaultRejected: true,
    }),
  );
});
