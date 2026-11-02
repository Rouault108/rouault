import { describe, expect, it } from 'vitest';
import { CSP_REQUIRED_CASE_IDS } from '../../scripts/ci/csp-test-cases.js';
import { assertCspBrowserResults } from '../../scripts/ci/assert-csp-browser-results.js';

const fixture = (project = 'webkit-csp') => ({
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
            projectName: project,
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
  it.each(['chromium-csp', 'firefox-csp', 'webkit-csp'])(
    'requires every selected test to pass once in %s',
    (project) => {
      expect(assertCspBrowserResults(fixture(project), project)).toBe(CSP_REQUIRED_CASE_IDS.length);
    },
  );
  it('accepts the complete case set across nested suites', () => {
    const report = fixture();
    const specs = report.suites[0]?.specs;
    if (!specs) throw new Error('missing spec fixture');
    expect(
      assertCspBrowserResults(
        {
          ...report,
          suites: [{ specs: specs.slice(0, 1), suites: [{ specs: specs.slice(1) }] }],
        },
        'webkit-csp',
      ),
    ).toBe(CSP_REQUIRED_CASE_IDS.length);
  });
  it.each([
    { count: 0, adjustStats: false },
    { count: 0, adjustStats: true },
    { count: 2, adjustStats: false },
    { count: 2, adjustStats: true },
  ])(
    'rejects per-case test count $count even with adjusted stats=$adjustStats',
    ({ count, adjustStats }) => {
      const report = fixture();
      const spec = report.suites[0]?.specs[0];
      if (!spec) throw new Error('missing spec fixture');
      const test = firstTest(report);
      spec.tests = Array.from({ length: count }, () => structuredClone(test));
      if (adjustStats) report.stats.expected += count - 1;
      expect(() => assertCspBrowserResults(report, 'webkit-csp')).toThrow();
    },
  );
  it('rejects a missing tests collection', () => {
    const report = fixture();
    const spec = report.suites[0]?.specs[0];
    if (!spec) throw new Error('missing spec fixture');
    Reflect.deleteProperty(spec, 'tests');
    expect(() => assertCspBrowserResults(report, 'webkit-csp')).toThrow();
  });
  it.each(['same-suite', 'nested-suite'])(
    'rejects one empty case compensated by duplicate results in another case: %s',
    (layout) => {
      const report = fixture();
      const specs = report.suites[0]?.specs;
      const [missing, duplicated] = specs ?? [];
      if (!specs || !missing || !duplicated) throw new Error('missing spec fixture');
      const result = structuredClone(firstTest(report));
      missing.tests = [];
      duplicated.tests.push(result);
      const value =
        layout === 'nested-suite'
          ? { ...report, suites: [{ specs: [missing], suites: [{ specs: specs.slice(1) }] }] }
          : report;
      expect(() => assertCspBrowserResults(value, 'webkit-csp')).toThrow();
    },
  );
  it.each(['missing', 'duplicate', 'compensated'])('rejects %s required case IDs', (mutation) => {
    const report = fixture();
    const specs = report.suites[0]?.specs;
    const first = specs?.[0];
    if (!specs || !first) throw new Error('missing spec fixture');
    if (mutation === 'missing') {
      specs.shift();
      report.stats.expected--;
    } else if (mutation === 'duplicate') {
      specs.push(structuredClone(first));
      report.stats.expected++;
    } else {
      specs.splice(1, 1, structuredClone(first));
    }
    expect(() => assertCspBrowserResults(report, 'webkit-csp')).toThrow();
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
