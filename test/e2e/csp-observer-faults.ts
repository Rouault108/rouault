import { test, expect } from './support/csp-test.js';
import { startWorkerObservationFixture } from './support/csp-worker-observation-fixture.js';
import {
  classifyObservationConsole,
  observationReady,
  readObservationProbe,
  type ObservationRow,
} from '../../scripts/ci/csp-worker-acceptance.js';

test('observer faults are detected independently of notification gaps', async ({ browser }) => {
  for (const fault of ['no-listener', 'no-console', 'no-canary'] as const) {
    const fixture = await startWorkerObservationFixture('ro-connect', fault);
    const context = await browser.newContext({ locale: 'en-US' });
    const consoleRows: ObservationRow['console'] = [];
    try {
      if (fault !== 'no-console')
        context.on('console', (message) =>
          consoleRows.push({
            category: classifyObservationConsole(
              message.text(),
              fixture.policy?.value ?? null,
              fixture.origin,
            ),
            owner: message.location().url === `${fixture.origin}/worker.js` ? 'worker' : 'unknown',
          }),
        );
      await context.route(
        (url) => /^https?:$/u.test(url.protocol) && url.origin !== fixture.origin,
        (route) => route.abort(),
      );
      const page = await context.newPage();
      await page.goto(fixture.origin);
      await expect(page.locator('#result')).not.toBeEmpty();
      const probe = readObservationProbe(
        JSON.parse(await page.locator('#result').innerText()) as unknown,
      );
      const row: ObservationRow = {
        scenario: 'ro-connect',
        ...probe,
        console: consoleRows,
        ready: (await page.locator('#ready').innerText()) === 'ready',
        listenerReady: (await page.locator('#listener').innerText()) === 'registered',
        consoleAttached: fault !== 'no-console',
        httpVerified: true,
        fixtureVerified: true,
        lifetimeValid: true,
        operationStarted: true,
        eventWindowMs: 250,
      };
      expect(probe.blob === 'allowed' && probe.wasm === 'allowed').toBe(true);
      expect(observationReady(row)).toBe(false);
      if (fault === 'no-listener')
        expect(probe.events.length === 0 && !row.listenerReady).toBe(true);
      if (fault === 'no-console') expect(consoleRows.length === 0).toBe(true);
      if (fault === 'no-canary')
        expect(consoleRows.some((entry) => entry.category === 'canary')).toBe(false);
    } finally {
      await context.close();
      await fixture.close();
    }
  }
});
