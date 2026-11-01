import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  coverageExitCode,
  evaluateWorkerObservation,
  readObservationReport,
  type CoverageResult,
} from './csp-worker-acceptance.js';

export const evaluateBoundCspCoverage = (
  value: unknown,
  engine: string,
  sha: string,
  run: string,
): CoverageResult[] => {
  try {
    const report = readObservationReport(value);
    if (report.engine !== engine || report.sha !== sha || report.run !== run)
      return evaluateWorkerObservation({});
    return evaluateWorkerObservation(report);
  } catch {
    return evaluateWorkerObservation(value === undefined ? undefined : {});
  }
};
const entry = process.argv[1];
if (entry && fileURLToPath(import.meta.url) === path.resolve(entry)) {
  try {
    const engine = process.argv[2] ?? '';
    if (!['chromium-csp', 'firefox-csp', 'webkit-csp'].includes(engine)) {
      process.stderr.write('[csp-coverage] invalid-engine\n');
      process.exitCode = 1;
    } else {
      let value: unknown;
      try {
        value = JSON.parse(
          await readFile(`.generated/csp/worker-observation-${engine}.json`, 'utf8'),
        );
      } catch {
        value = undefined;
      }
      try {
        const observation = readObservationReport(value);
        for (const row of observation.rows) {
          const consoleCounts: Record<string, number> = {};
          for (const entry of row.console) {
            const key = entry.category + ':' + entry.owner;
            consoleCounts[key] = (consoleCounts[key] ?? 0) + 1;
          }
          const notice = {
            engine: observation.engine,
            browserVersion: observation.browserVersion,
            locale: observation.locale,
            observerVersion: observation.observerVersion,
            scenario: row.scenario,
            blob: row.blob,
            wasm: row.wasm,
            ready: row.ready,
            httpVerified: row.httpVerified,
            fixtureVerified: row.fixtureVerified,
            lifetimeValid: row.lifetimeValid,
            eventWindowMs: row.eventWindowMs,
            events: row.events,
            consoleCounts,
          };
          console.log(`::notice title=CSP observation ${engine}::${JSON.stringify(notice)}`);
        }
      } catch {
        /* 欠損・不正証拠は下のcoverageで非ゼロにする。 */
      }
      const results = evaluateBoundCspCoverage(
        value,
        engine,
        process.env['GITHUB_SHA'] ?? 'local',
        process.env['GITHUB_RUN_ID'] ?? 'local',
      );
      const report = { schema: 1, kind: 'csp-required-coverage', engine, results };
      await mkdir('.generated/csp', { recursive: true });
      await writeFile(`.generated/csp/coverage-${engine}.json`, JSON.stringify(report));
      for (const row of results)
        console.log(
          `[csp-coverage] ${engine} ${row.capability}: ${row.status} (${row.reason}; ${row.path})`,
        );
      process.exitCode = coverageExitCode(results);
    }
  } catch {
    process.stderr.write('[csp-coverage] evidence-write-failed\n');
    process.exitCode = 1;
  }
}
