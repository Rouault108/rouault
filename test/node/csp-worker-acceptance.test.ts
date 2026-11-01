import { describe, expect, it } from 'vitest';
import {
  classifyObservationConsole,
  coverageExitCode,
  evaluateWorkerObservation,
  readObservationReport,
} from '../../scripts/ci/csp-worker-acceptance.js';
import { evaluateBoundCspCoverage } from '../../scripts/ci/assert-csp-coverage.js';

import { observationFixture as fixture } from './helpers/csp-observation-fixture.js';

describe('CSP 1.2 observation acceptance', () => {
  it('keeps fixed WebKit WASM RO unmet while independently accepting isolated connect evidence', () => {
    const results = evaluateWorkerObservation(fixture());
    expect(results.map((row) => [row.status, row.reason])).toEqual([
      ['success', 'observed'],
      ['unmet', 'webkit-wasm-ro-unobserved'],
    ]);
    expect(coverageExitCode(results)).toBe(1);
    for (const engine of ['chromium-csp', 'firefox-csp'] as const)
      expect(coverageExitCode(evaluateWorkerObservation(fixture(engine)))).toBe(0);
  });
  it('does not accept warning-only, spoof-only, or unrelated/reused source evidence', () => {
    for (const change of [
      'warning',
      'spoof',
      'foreign',
      'lifetime',
      'unknown',
      'translated',
    ] as const) {
      const value = fixture();
      const row = value.rows.find((row) => row.scenario === 'ro-connect');
      if (!row) throw new Error('fixture');
      if (change === 'lifetime') row.lifetimeValid = false;
      else
        row.console = [
          {
            category:
              change === 'warning'
                ? 'missing-endpoint'
                : change === 'unknown' || change === 'translated'
                  ? 'unknown'
                  : 'connect-report',
            owner:
              change === 'spoof' ? 'worker' : change === 'foreign' ? 'other-worker' : 'unknown',
          },
          { category: 'canary', owner: 'worker' },
        ];
      expect(evaluateWorkerObservation(value).some((row) => row.status === 'failure')).toBe(true);
    }
  });
  it('keeps absent listener, disconnected console, missing canary or proof as failure, not known unmet', () => {
    for (const flag of [
      'ready',
      'listenerReady',
      'consoleAttached',
      'httpVerified',
      'fixtureVerified',
      'lifetimeValid',
    ] as const) {
      const value = fixture();
      const row = value.rows[0];
      if (!row) throw new Error('fixture');
      row[flag] = false;
      expect(
        evaluateWorkerObservation(value).every(
          (row) => row.status === 'failure' && row.reason === 'observer-failed',
        ),
      ).toBe(true);
    }
    const value = fixture();
    for (const row of value.rows)
      row.console = row.console.filter((entry) => entry.category !== 'canary');
    expect(evaluateWorkerObservation(value).every((row) => row.status === 'failure')).toBe(true);
  });
  it('requires actual operation, no-operation/allowed baselines and normal-bytes controls', () => {
    for (const scenario of [
      'baseline',
      'ro-allowed',
      'ro-no-operation',
      'invalid-wasm',
      'aborted-fetch',
      'enforce-connect',
      'enforce-wasm',
      'ro-both',
    ] as const) {
      const value = fixture();
      const row = value.rows.find((row) => row.scenario === scenario);
      if (!row) throw new Error('fixture');
      if (scenario === 'ro-no-operation') row.operationStarted = true;
      else row.wasm = row.wasm === 'allowed' ? 'CompileError' : 'allowed';
      expect(coverageExitCode(evaluateWorkerObservation(value))).toBe(1);
      expect(evaluateWorkerObservation(value).some((row) => row.status === 'failure')).toBe(true);
    }
  });
  it('accepts duplicate/order changes without making a fixed log count into a requirement', () => {
    const value = fixture();
    for (const row of value.rows) {
      row.console = [...row.console, ...row.console].reverse();
      row.events = [...row.events, ...row.events].reverse();
    }
    expect(evaluateWorkerObservation(value).map((row) => row.status)).toEqual(['success', 'unmet']);
  });
  it('rejects schema/private fields, missing/empty cases, changed engine version and identity', () => {
    for (const value of [
      { ...fixture(), rawConsole: 'private' },
      { ...fixture(), rows: [] },
      { ...fixture(), rows: fixture().rows.slice(1) },
    ])
      expect(evaluateWorkerObservation(value).every((row) => row.status === 'failure')).toBe(true);
    expect(() =>
      readObservationReport({ ...fixture(), url: 'http://127.0.0.1/?private' }),
    ).toThrow();
    expect(
      evaluateWorkerObservation({ ...fixture(), browserVersion: '27.0' }).every(
        (row) => row.reason === 'environment-changed',
      ),
    ).toBe(true);
    expect(
      evaluateBoundCspCoverage(fixture(), 'webkit-csp', 'a'.repeat(40), 'local').every(
        (row) => row.status === 'failure',
      ),
    ).toBe(true);
    expect(evaluateWorkerObservation(undefined).every((row) => row.status === 'not-run')).toBe(
      true,
    );
    expect(coverageExitCode([])).toBe(1);
    expect(coverageExitCode(evaluateWorkerObservation(undefined))).toBe(1);
  });
  it('uses strict native templates, retaining unknown/translated/truncated formats', () => {
    const origin = 'http://127.0.0.1:1234';
    const text = `[Report Only] Refused to connect to blob:${origin}/00000000-0000-4000-8000-000000000000 because it does not appear in the connect-src directive of the Content Security Policy.`;
    expect(classifyObservationConsole(text, null, origin)).toBe('connect-report');
    for (const value of [
      'CSP connect-src blob: fabricated',
      text.slice(0, -1),
      text.replace('Refused', '拒否'),
      text + ' extra',
    ])
      expect(classifyObservationConsole(value, null, origin)).toBe('unknown');
    expect(classifyObservationConsole(text, null, 'http://127.0.0.1:4321')).toBe('unknown');
  });
});
