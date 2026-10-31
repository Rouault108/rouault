import { describe, expect, it } from 'vitest';
import {
  WORKER_DIAGNOSTIC_CASES,
  classifyWorkerConsole,
  readWorkerProbe,
  validateWorkerDiagnosticReport,
  workerDiagnosticNotices,
} from '../../scripts/ci/csp-worker-diagnostics.js';
import {
  diagnosticWorkerPolicy,
  startWorkerDiagnosticFixture,
} from '../e2e/support/csp-worker-diagnostic-fixture.js';

const report = () => ({
  schema: 1,
  engine: 'webkit-csp',
  browserVersion: '26.6',
  buildId: '79105d3',
  eventWindowMs: 250,
  rows: WORKER_DIAGNOSTIC_CASES.map((scenario) => ({
    scenario,
    blob: 'allowed',
    wasm: 'allowed',
    events: [],
    console: [{ category: 'canary', owner: 'worker' }],
  })),
});
describe('independent Worker diagnostics', () => {
  it('separates endpoint warnings from actual native CSP violation text', () => {
    expect(
      classifyWorkerConsole(
        "The Content Security Policy 'script-src self' was delivered in report-only mode, but does not specify a 'report-to'; the policy will have no effect.",
      ),
    ).toBe('missing-endpoint');
    expect(
      classifyWorkerConsole(
        '[Report Only] Refused to connect to blob:http://127.0.0.1/fixture because it does not appear in connect-src.',
      ),
    ).toBe('connect-violation');
    expect(
      classifyWorkerConsole(
        'Compiling WebAssembly violates Content Security Policy script-src because wasm-unsafe-eval is missing.',
      ),
    ).toBe('wasm-violation');
    expect(classifyWorkerConsole('rouault-worker-diagnostic-canary')).toBe('canary');
    expect(classifyWorkerConsole('unrelated log')).toBe('unclassified');
  });
  it('records capability observations without turning missing events or rejected operations into acceptance', () => {
    const value = report();
    const first = value.rows[0];
    if (!first) throw new Error('Missing diagnostic fixture');
    first.wasm = 'CompileError';
    expect(validateWorkerDiagnosticReport(value).rows).toHaveLength(7);
    const notices = workerDiagnosticNotices(value);
    expect(notices).toHaveLength(7);
    expect(notices[0]).toContain('::notice title=CSP Worker diagnostic webkit-csp::');
    expect(notices[0]).toContain('"wasm":"CompileError"');
  });
  it('rejects private/unbounded fields, malformed operations and incomplete scenarios', () => {
    expect(() => validateWorkerDiagnosticReport({ ...report(), rawConsole: 'secret' })).toThrow();
    expect(() =>
      validateWorkerDiagnosticReport({ ...report(), rows: report().rows.slice(1) }),
    ).toThrow();
    expect(() =>
      readWorkerProbe({
        blob: 'allowed',
        wasm: 'allowed',
        events: [
          { directive: 'connect-src', blocked: 'https://invalid/?secret', disposition: 'report' },
        ],
      }),
    ).toThrow();
    expect(() => readWorkerProbe({ blob: 'unexpected', wasm: 'allowed', events: [] })).toThrow();
  });
  it('serves actual loopback HTTP Worker policies with no report destination or product route', async () => {
    for (const scenario of WORKER_DIAGNOSTIC_CASES) {
      const fixture = await startWorkerDiagnosticFixture(scenario);
      try {
        const response = await fetch(`${fixture.origin}/worker.js`);
        expect(response.status).toBe(200);
        const policy = diagnosticWorkerPolicy(scenario);
        if (policy) {
          expect(response.headers.get(policy.name)).toBe(policy.value);
          expect(policy.value).not.toMatch(/report-uri|report-to/u);
          expect(policy.value).not.toContain("'unsafe-eval'");
        } else expect(response.headers.get('Content-Security-Policy')).toBeNull();
        expect(await response.text()).toContain('WebAssembly.compile(bytes)');
        expect((await fetch(`${fixture.origin}/report`, { method: 'POST' })).status).toBe(405);
        expect((await fetch(`${fixture.origin}/unregistered`)).status).toBe(404);
      } finally {
        await fixture.close();
      }
    }
  });
});
