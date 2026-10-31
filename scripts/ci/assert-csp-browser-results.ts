import { readFile } from 'node:fs/promises';
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
export const assertCspBrowserResults = (value: unknown, project: string): number => {
  if (!['chromium-csp', 'firefox-csp', 'webkit-csp'].includes(project))
    throw new Error('[csp-results] unknown project');
  const report = record(value);
  const tests: Record<string, unknown>[] = [];
  const visit = (suites: unknown): void => {
    for (const value of sequence(suites)) {
      const suite = record(value);
      for (const value of sequence(suite['specs'])) {
        const spec = record(value);
        if (spec['ok'] !== true) throw new Error('[csp-results] unsuccessful spec');
        tests.push(...sequence(spec['tests']).map(record));
      }
      if (suite['suites'] !== undefined) visit(suite['suites']);
    }
  };
  visit(report['suites']);
  const stats = record(report['stats']);
  if (
    tests.length === 0 ||
    stats['expected'] !== tests.length ||
    stats['skipped'] !== 0 ||
    stats['unexpected'] !== 0 ||
    stats['flaky'] !== 0 ||
    sequence(report['errors']).length !== 0
  )
    throw new Error('[csp-results] incomplete or unsuccessful run');
  for (const test of tests) {
    const results = sequence(test['results']).map(record);
    const result = results[0];
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
  const project = process.argv[2] ?? '';
  const report: unknown = JSON.parse(await readFile('.generated/csp/browser-results.json', 'utf8'));
  const passed = assertCspBrowserResults(report, project);
  console.log(`[csp-results] ${project}: ${String(passed)} passed, 0 skipped, 0 failed, 0 retries`);
}
