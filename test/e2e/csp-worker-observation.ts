import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { test, expect } from './support/csp-test.js';
import {
  CSP_OBSERVATION_CASES,
  CSP_OBSERVER_VERSION,
  classifyObservationConsole,
  readObservationReport,
  readObservationProbe,
  type ObservationRow,
  type ObservationReport,
} from '../../scripts/ci/csp-worker-acceptance.js';

import { startWorkerObservationFixture } from './support/csp-worker-observation-fixture.js';
import { readVerifiedCspStageOne } from '../../build/security/csp-report-only.js';
import { cspFingerprint } from '../../scripts/ci/csp-notification-registry.js';

test('Worker RO observation with controls; capability evaluation is separate', async ({
  browser,
}, info) => {
  const rows: ObservationRow[] = [];
  const bindings: unknown[] = [];
  for (const scenario of CSP_OBSERVATION_CASES) {
    const fixture = await startWorkerObservationFixture(scenario);
    const context = await browser.newContext({ locale: 'en-US' });
    const consoleRows: ObservationRow['console'] = [];
    let external = false;
    let workerRequests = 0;
    try {
      await context.route(
        (url) => /^https?:$/u.test(url.protocol) && url.origin !== fixture.origin,
        (route) => {
          external = true;
          return route.abort();
        },
      );
      context.on('console', (message) => {
        const url = message.location().url;
        consoleRows.push({
          category: classifyObservationConsole(
            message.text(),
            fixture.policy?.value ?? null,
            fixture.origin,
          ),
          owner:
            url === `${fixture.origin}/worker.js`
              ? 'worker'
              : url === `${fixture.origin}/page.js`
                ? 'document'
                : url === `${fixture.origin}/other-worker.js`
                  ? 'other-worker'
                  : 'unknown',
        });
      });
      context.on('request', (request) => {
        if (request.url() === `${fixture.origin}/worker.js`) workerRequests++;
      });
      const response = await context.request.get(`${fixture.origin}/worker.js`);
      const headers = response.headers();
      const httpVerified =
        response.status() === 200 &&
        /javascript/u.test(headers['content-type'] ?? '') &&
        headers['x-content-type-options'] === 'nosniff' &&
        (headers['content-security-policy'] ?? null) ===
          (fixture.policy?.name === 'Content-Security-Policy' ? fixture.policy.value : null) &&
        (headers['content-security-policy-report-only'] ?? null) ===
          (fixture.policy?.name === 'Content-Security-Policy-Report-Only'
            ? fixture.policy.value
            : null);
      const fixtureVerified =
        createHash('sha256')
          .update(await response.body())
          .digest('hex') === fixture.workerDigest;
      const page = await context.newPage();
      await page.goto(fixture.origin);
      await expect(page.locator('#result')).not.toBeEmpty();
      const locale = await page.evaluate(() => navigator.language);
      expect(locale === 'en-US').toBe(true);
      const probe = readObservationProbe(
        JSON.parse(await page.locator('#result').innerText()) as unknown,
      );
      rows.push({
        scenario,
        ...probe,
        console: consoleRows,
        ready: (await page.locator('#ready').innerText()) === 'ready',
        listenerReady: (await page.locator('#listener').innerText()) === 'registered',
        consoleAttached: true,
        httpVerified,
        fixtureVerified,
        lifetimeValid: !external && workerRequests === 1,
        operationStarted: scenario !== 'ro-no-operation',
        eventWindowMs: fixture.windowMs,
      });
      bindings.push({
        caseId: scenario,
        fixtureDigest: fixture.workerDigest,
        policyFingerprint: cspFingerprint(fixture.policy?.value ?? 'no-policy'),
        mode:
          fixture.policy?.name === 'Content-Security-Policy-Report-Only'
            ? 'report-only'
            : fixture.policy
              ? 'enforce'
              : 'none',
        windowMs: fixture.windowMs,
      });
    } finally {
      await context.close();
      await fixture.close();
    }
  }
  const report = readObservationReport({
    schema: 1,
    kind: 'worker-ro-observation',
    engine: info.project.name,
    browserVersion: browser.version(),
    playwrightVersion: '1.63.0',
    observerVersion: CSP_OBSERVER_VERSION,
    locale: 'en-US',
    nodeVersion: process.versions.node,
    pnpmVersion:
      /(?:^| )pnpm\/([0-9.]+)(?: |$)/u.exec(process.env['npm_config_user_agent'] ?? '')?.[1] ??
      'unrecorded',
    containerDigest: process.env['CSP_CONTAINER_DIGEST'] ?? 'unrecorded',
    sha: process.env['GITHUB_SHA'] ?? 'local',
    run: process.env['GITHUB_RUN_ID'] ?? 'local',
    rows,
  } satisfies Omit<ObservationReport, 'engine'> & { engine: string });
  await mkdir('.generated/csp', { recursive: true });
  await writeFile(
    `.generated/csp/worker-observation-${info.project.name}.json`,
    JSON.stringify(report),
  );
  const manifest = await readVerifiedCspStageOne('dist', '.generated/csp/manifest.json');
  await writeFile(
    `.generated/csp/worker-bindings-${info.project.name}.json`,
    JSON.stringify({
      schema: 1,
      kind: 'worker-fixture-bindings',
      engine: info.project.name,
      sha: report.sha,
      run: report.run,
      buildId: manifest.buildId,
      rows: bindings,
    }),
  );
});
