import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { startWorkerDiagnosticFixture } from './support/csp-worker-diagnostic-fixture.js';
import {
  WORKER_DIAGNOSTIC_CASES,
  classifyWorkerConsole,
  readWorkerProbe,
  validateWorkerDiagnosticReport,
  type WorkerDiagnosticRow,
} from '../../scripts/ci/csp-worker-diagnostics.js';

// 元の受入試験は変更せず、ブラウザー差の診断だけを独立して記録する。
test('diagnostic only: separate Worker console, events, Blob fetch and WASM outcomes', async ({
  browser,
}, info) => {
  const rows: WorkerDiagnosticRow[] = [];
  for (const scenario of WORKER_DIAGNOSTIC_CASES) {
    const fixture = await startWorkerDiagnosticFixture(scenario);
    const context = await browser.newContext();
    const consoleRows: WorkerDiagnosticRow['console'] = [];
    let externalRequest = false;
    try {
      await context.route(
        (url) => /^https?:$/u.test(url.protocol) && url.origin !== fixture.origin,
        (route) => {
          externalRequest = true;
          return route.abort();
        },
      );
      context.on('console', (message) => {
        const category = classifyWorkerConsole(message.text());
        const location = message.location().url;
        consoleRows.push({
          category,
          owner:
            location === `${fixture.origin}/worker.js`
              ? 'worker'
              : location === `${fixture.origin}/page.js`
                ? 'document'
                : 'unknown',
        });
      });
      const page = await context.newPage();
      await page.goto(fixture.origin);
      await expect(page.locator('#result')).not.toBeEmpty();
      const probe = readWorkerProbe(
        JSON.parse(await page.locator('#result').innerText()) as unknown,
      );
      expect(externalRequest).toBe(false);
      if (scenario === 'baseline') {
        expect(probe.blob).toBe('allowed');
        expect(probe.wasm).toBe('allowed');
      }
      rows.push({ scenario, ...probe, console: consoleRows });
    } finally {
      await context.close();
      await fixture.close();
    }
  }
  const report = validateWorkerDiagnosticReport({
    schema: 1,
    engine: info.project.name,
    browserVersion: browser.version(),
    buildId: process.env['GITHUB_SHA']?.slice(0, 7) ?? 'local',
    eventWindowMs: 250,
    rows,
  });
  const body = JSON.stringify(report, null, 2);
  await mkdir('.generated/csp', { recursive: true });
  await writeFile(`.generated/csp/worker-diagnostics-${info.project.name}.json`, body);
  await info.attach('worker-independent-diagnostics', { body, contentType: 'application/json' });
});
