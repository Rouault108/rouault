import { readFile } from 'node:fs/promises';
import { CSP_REQUIRED_CASE_IDS } from './csp-test-cases.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('[csp-results] expected a report object');
  return value as Record<string, unknown>;
};
const sequence = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) throw new Error('[csp-results] expected a report sequence');
  return value;
};

// Playwrightのjob成功だけでskipや期待された失敗まで通過扱いにしない。
export const assertCspBrowserResults = (
  value: unknown,
  project: string,
  identity = { sha: 'local', run: 'local' },
): number => {
  if (!['chromium-csp', 'firefox-csp', 'webkit-csp'].includes(project))
    throw new Error('[csp-results] unknown project');
  const report = record(value);
  const exact = (value: Record<string, unknown>, fields: readonly string[]) => {
    if (Object.keys(value).sort().join(',') !== [...fields].sort().join(','))
      throw new Error('[csp-results] unexpected fields');
  };
  exact(report, ['schema', 'kind', 'sha', 'run', 'suites', 'errors', 'stats']);
  if (
    report['schema'] !== 1 ||
    report['kind'] !== 'private-csp-test-results' ||
    report['sha'] !== identity.sha ||
    report['run'] !== identity.run
  )
    throw new Error('[csp-results] identity mismatch');
  const tests: Record<string, unknown>[] = [];
  const cases: string[] = [];
  const visit = (suites: unknown): void => {
    for (const value of sequence(suites)) {
      const suite = record(value);
      exact(suite, suite['suites'] === undefined ? ['specs'] : ['specs', 'suites']);
      for (const value of sequence(suite['specs'])) {
        const spec = record(value);
        exact(spec, ['caseId', 'ok', 'tests']);
        cases.push(String(spec['caseId']));
        if (spec['ok'] !== true) throw new Error('[csp-results] unsuccessful spec');
        tests.push(...sequence(spec['tests']).map(record));
      }
      if (suite['suites'] !== undefined) visit(suite['suites']);
    }
  };
  visit(report['suites']);
  const stats = record(report['stats']);
  exact(stats, ['expected', 'skipped', 'unexpected', 'flaky']);
  if (
    cases.length !== CSP_REQUIRED_CASE_IDS.length ||
    new Set(cases).size !== CSP_REQUIRED_CASE_IDS.length ||
    !CSP_REQUIRED_CASE_IDS.every((id) => cases.includes(id)) ||
    tests.length === 0 ||
    stats['expected'] !== tests.length ||
    stats['skipped'] !== 0 ||
    stats['unexpected'] !== 0 ||
    stats['flaky'] !== 0 ||
    sequence(report['errors']).length !== 0
  )
    throw new Error('[csp-results] incomplete or unsuccessful run');
  for (const test of tests) {
    exact(test, ['projectName', 'expectedStatus', 'status', 'results']);
    const results = sequence(test['results']).map(record);
    const result = results[0];
    for (const row of results) exact(row, ['status', 'retry', 'errors']);
    if (
      test['projectName'] !== project ||
      test['expectedStatus'] !== 'passed' ||
      test['status'] !== 'expected' ||
      results.length !== 1 ||
      result?.['status'] !== 'passed' ||
      result['retry'] !== 0 ||
      sequence(result['errors']).length !== 0
    )
      throw new Error('[csp-results] test did not pass once in the selected engine');
  }
  return tests.length;
};

const entryPoint = process.argv[1];
if (entryPoint && fileURLToPath(import.meta.url) === path.resolve(entryPoint)) {
  try {
    const project = process.argv[2] ?? '';
    const report: unknown = JSON.parse(
      await readFile('.generated/csp/browser-results.json', 'utf8'),
    );
    const passed = assertCspBrowserResults(report, project, {
      sha: process.env['GITHUB_SHA'] ?? 'local',
      run: process.env['GITHUB_RUN_ID'] ?? 'local',
    });
    console.log(
      `[csp-results] ${project}: ${String(passed)} passed, 0 skipped, 0 failed, 0 retries`,
    );
  } catch {
    process.stderr.write('[csp-results] incomplete-or-unsuccessful-evidence\n');
    process.exitCode = 1;
  }
}
