import { describe, expect, it } from 'vitest';
import { CSP_REQUIRED_CASE_IDS } from '../../scripts/ci/csp-test-cases.js';
import { assertCspBrowserResults } from '../../scripts/ci/assert-csp-browser-results.js';

const fixture = () => ({
  schema: 1,
  kind: 'private-csp-test-results',
  sha: 'local',
  run: 'local',
  suites: [
    {
      specs: CSP_REQUIRED_CASE_IDS.map((caseId) => ({
        caseId,
        ok: true,
        tests: [
          {
            projectName: 'webkit-csp',
            expectedStatus: 'passed',
            status: 'expected',
            results: [{ status: 'passed', retry: 0, errors: [] as unknown[] }],
          },
        ],
      })),
    },
  ],
  errors: [] as unknown[],
  stats: { expected: CSP_REQUIRED_CASE_IDS.length, skipped: 0, unexpected: 0, flaky: 0 },
});
const firstTest = (report: ReturnType<typeof fixture>) => {
  const test = report.suites[0]?.specs[0]?.tests[0];
  if (!test) throw new Error('missing test fixture');
  return test;
};
const firstResult = (report: ReturnType<typeof fixture>) => {
  const result = firstTest(report).results[0];
  if (!result) throw new Error('missing result fixture');
  return result;
};

describe('CSP engine result gate', () => {
  it('requires every selected test to pass once in the expected engine', () => {
    expect(assertCspBrowserResults(fixture(), 'webkit-csp')).toBe(CSP_REQUIRED_CASE_IDS.length);
  });
  it('rejects private fields and stale SHA/run', () => {
    expect(() =>
      assertCspBrowserResults({ ...fixture(), rawConsole: 'private' }, 'webkit-csp'),
    ).toThrow();
    expect(() =>
      assertCspBrowserResults({ ...fixture(), sha: 'a'.repeat(40) }, 'webkit-csp'),
    ).toThrow();
    expect(() => assertCspBrowserResults({ ...fixture(), run: '123' }, 'webkit-csp')).toThrow();
  });
  it.each(['skipped', 'unexpected', 'flaky'] as const)('rejects %s results', (kind) => {
    const report = fixture();
    report.stats[kind] = 1;
    expect(() => assertCspBrowserResults(report, 'webkit-csp')).toThrow();
  });
  it('rejects an empty suite and inconsistent counts', () => {
    const report = fixture();
    report.stats.expected = 0;
    expect(() => assertCspBrowserResults(report, 'webkit-csp')).toThrow();
    report.suites = [];
    expect(() => assertCspBrowserResults(report, 'webkit-csp')).toThrow();
  });
  it.each(['skipped', 'failed', 'timedOut', 'interrupted'])(
    'rejects actual status %s',
    (status) => {
      const report = fixture();
      firstResult(report).status = status;
      expect(() => assertCspBrowserResults(report, 'webkit-csp')).toThrow();
    },
  );
  it('rejects expected failure, retries, wrong engines and global errors', () => {
    const report = fixture();
    const test = firstTest(report);
    test.expectedStatus = 'failed';
    expect(() => assertCspBrowserResults(report, 'webkit-csp')).toThrow();
    test.expectedStatus = 'passed';
    firstResult(report).retry = 1;
    expect(() => assertCspBrowserResults(report, 'webkit-csp')).toThrow();
    firstResult(report).retry = 0;
    expect(() => assertCspBrowserResults(report, 'firefox-csp')).toThrow();
    report.errors.push({ message: 'worker failure' });
    expect(() => assertCspBrowserResults(report, 'webkit-csp')).toThrow();
  });
});
