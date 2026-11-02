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
import {
  classifyWasmConsole,
  readNativeConsoleErrors,
  type WasmConsoleScope,
  type WasmConsoleRecord,
} from './support/csp-wasm-console.js';
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
  scope: Omit<WasmConsoleScope, 'measurement' | 'errors' | 'sourceVerified'>,
) => {
  const state = { external: false, unknown: false, notifications: 0, workerRequests: 0 };
  let expectedPage: import('@playwright/test').Page | null = null;
  let expectedWorker: import('@playwright/test').Worker | null = null;
  const records: {
    message: import('@playwright/test').ConsoleMessage;
    record: Omit<WasmConsoleRecord, 'owner'>;
  }[] = [];
  const pending: Promise<void>[] = [];
  await context.route(
    (url) => /^https?:$/u.test(url.protocol) && url.origin !== origin,
    (route) => {
      state.external = true;
      return route.abort();
    },
  );
  if (!diagnosticOff)
    context.on('console', (message) => {
      if (records.length >= 100 || message.text().length > 16384) {
        state.unknown = true;
        return;
      }
      const record = {
        text: message.text(),
        type: message.type(),
        args: message.args().length,
        url: message.location().url,
        line: message.location().lineNumber,
        catalogPrefix: false,
      };
      records.push({ message, record });
      const first = message.args()[0];
      if (record.args === 2 && first)
        pending.push(
          first
            .evaluate((value) => value === 'Search page completed with degraded diagnostics.')
            .then(
              (matches) => {
                record.catalogPrefix = matches;
              },
              () => {
                state.unknown = true;
              },
            ),
        );
    });
  await context.addInitScript(() => {
    const state: { last: unknown } = { last: null };
    Object.defineProperty(globalThis, '__cspWasmSnapshot', { value: state });
    const channel = new BroadcastChannel('rouault-csp-wasm-measure-v1');
    channel.onmessage = (event) => {
      state.last = event.data;
    };
    const witness: { last: unknown } = { last: null };
    Object.defineProperty(globalThis, '__cspWasmConsoleWitness', { value: witness });
    const diagnostic = new BroadcastChannel('rouault-csp-wasm-console-v2');
    diagnostic.onmessage = (event) => {
      witness.last = event.data;
    };
  });
  return Object.assign(state, {
    bindPage(page: import('@playwright/test').Page) {
      expectedPage = page;
      page.on('worker', (worker) => {
        if (expectedWorker || worker.url() !== scope.codeUrl) state.unknown = true;
        else expectedWorker = worker;
      });
    },
    async finish(
      page: import('@playwright/test').Page,
      measurement: WasmConsoleScope['measurement'] | null,
      sourceVerified: boolean,
    ) {
      if (diagnosticOff) return;
      await page.waitForTimeout(100);
      await Promise.all(pending);
      if (!measurement || !sourceVerified) {
        state.unknown = true;
        return;
      }
      const errors = readNativeConsoleErrors(
        await page.evaluate(() => {
          const direct: unknown = Reflect.get(globalThis, '__cspWasmConsoleErrors');
          const box: unknown = Reflect.get(globalThis, '__cspWasmConsoleWitness');
          return direct ?? (box && typeof box === 'object' && 'last' in box ? box.last : null);
        }),
      );
      for (const { message, record } of records) {
        const owner =
          message.page() !== expectedPage
            ? 'unknown'
            : message.worker() === null
              ? 'document'
              : message.worker() === expectedWorker
                ? 'worker'
                : 'unknown';
        const category = classifyWasmConsole(
          { ...record, owner },
          { ...scope, measurement, errors, sourceVerified },
        );
        if (category === 'unknown') state.unknown = true;
        if (category === 'wasm-notification') state.notifications++;
      }
    },
  });
};
const snapshot = async (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const direct: unknown = Reflect.get(globalThis, '__cspWasmMeasure');
    const box: unknown = Reflect.get(globalThis, '__cspWasmSnapshot');
    const indirect = box && typeof box === 'object' && 'last' in box ? box.last : null;
    return direct ?? indirect ?? null;
  });
const measured = async (
  page: import('@playwright/test').Page,
  missing: boolean,
  waitForTimer = true,
) => {
  if (missing) return null;
  await expect
    .poll(
      async () => {
        try {
          const m = readWasmMeasurement(await snapshot(page));
          return (
            m.calls.length > 0 &&
            (!waitForTimer || m.js.timer !== 'pending') &&
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
  const state = await prepare(context, 'http://127.0.0.1:4173', diagnosticOff, {
    caseId: CSP_WASM_CASES.includes(caseId as WasmCase)
      ? (caseId as WasmCase)
      : 'worker-stream-allow',
    engine: (browser.browserType().name() + '-csp') as WasmConsoleScope['engine'],
    policy: expected.policy,
    parentPolicy: parent.policy,
    codeUrl: 'http://127.0.0.1:4173' + worker.pattern,
    code: expected.body,
    glueUrls: manifest.assets
      .filter((a) => /^client-assets\/suzume-[\w-]+\.js$/u.test(a.file))
      .map((a) => 'http://127.0.0.1:4173/' + a.file),
    appUrl:
      'http://127.0.0.1:4173/' +
      manifest.assets.find((a) => /^client-assets\/client-[\w-]+\.js$/u.test(a.file))?.file,
  });
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
    state.bindPage(page);
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
    // WASM拒否で製品がWorkerを終了する経路は、終了後のtimer callbackを待たない。
    // A-J1の必須timer結果は生存する許可対照とDocumentで独立に検証する。
    const measurement = await measured(
      page,
      caseId === 'worker-shared-fault',
      !caseId.endsWith('deny'),
    );
    await state.finish(page, measurement, httpVerified && parentVerified && fixtureVerified);
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
  consoleFault?: 'wasm-spoof' | 'image-csp' | 'short-csp',
): Promise<WasmEvidenceRow> => {
  const parent = manifest.rules.find((r) => r.context === 'document');
  if (!parent) throw new Error('wasm-policy-missing');
  const fixture = await startDocumentWasmFixture({
    parentPolicy: parent.policy,
    allowWasm: !caseId.endsWith('deny'),
    allowJs: caseId === 'document-js-control',
    selection: caseId.includes('bytes') ? 'bytes' : 'streaming',
    ...(consoleFault ? { consoleFault } : {}),
  });
  const context = await browser.newContext({ locale: 'en-US' });
  const sourceResponse = await context.request.get(fixture.origin + '/page.js');
  const state = await prepare(context, fixture.origin, false, {
    caseId,
    engine: (browser.browserType().name() + '-csp') as WasmConsoleScope['engine'],
    policy: fixture.policy,
    parentPolicy: null,
    codeUrl: fixture.origin + '/page.js',
    code: await sourceResponse.text(),
    glueUrls: [fixture.origin + '/suzume.js'],
    appUrl: null,
  });
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
    state.bindPage(page);
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
    await state.finish(page, finalMeasurement, httpVerified && fixtureVerified);
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
  const baseline = await documentProbe(browser, manifest, 'document-stream-deny');
  expect(baseline.diagnostic.unknownConsole).toBe(false);
  for (const fault of ['wasm-spoof', 'image-csp', 'short-csp'] as const) {
    const spoof = await documentProbe(browser, manifest, 'document-stream-deny', fault);
    expect(spoof.diagnostic.unknownConsole).toBe(true);
    expect(spoof.diagnostic.notifications).toBe(baseline.diagnostic.notifications);
    expect(wasmEvidenceHealthy(spoof)).toBe(false);
  }
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
