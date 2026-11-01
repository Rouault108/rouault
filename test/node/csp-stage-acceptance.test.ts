import { describe, it, expect } from 'vitest';
import { stageInputFixture } from './helpers/csp-stage-fixture.js';
import {
  assembleCspAcceptance,
  evaluateCspStage,
  allStageDecisions,
  type AcceptanceEvidence,
} from '../../scripts/ci/csp-stage-acceptance.js';
import { coverageExitCode } from '../../scripts/ci/csp-worker-acceptance.js';
import {
  registryDigest,
  CSP_KNOWN_EXCEPTION,
  notificationKeyId,
} from '../../scripts/ci/csp-notification-registry.js';
import { evaluateWasmProtection, wasmEvidenceHealthy } from '../../scripts/ci/csp-wasm-evidence.js';

const stage1 = (e: AcceptanceEvidence) =>
  evaluateCspStage(e, { stage: 1, phase: 'internal', publicationApproved: false });
const stage2 = (e: AcceptanceEvidence) =>
  evaluateCspStage(e, { stage: 2, phase: 'internal', publicationApproved: false });
const completeSyntheticA = (e: AcceptanceEvidence) => {
  for (const row of e.trials) {
    row.status = 'pass';
    row.reason = 'verified';
  }
  return e;
};
const required = <T>(value: T | undefined | null): T => {
  if (value === null || value === undefined) throw new Error('fixture');
  return value;
};
describe('CSP 1.4 independent acceptance axes and finite stage registry', () => {
  it('retains raw WebKit unmet/exit 1 and only lets the complete matching stage1 proceed', () => {
    const { evidence, rawCoverage } = assembleCspAcceptance(stageInputFixture());
    expect(coverageExitCode(rawCoverage)).toBe(1);
    expect(rawCoverage[1]?.status).toBe('unmet');
    expect(stage1(evidence)).toMatchObject({
      status: 'proceed',
      exceptions: [CSP_KNOWN_EXCEPTION],
      publicationAllowed: false,
      siteAcceptanceComplete: false,
    });
    expect(stage2(evidence).status).toBe('stop');
    expect(evidence.trials.filter((r) => r.id === 'A-preview').map((r) => r.status)).toEqual([
      'not-run',
    ]);
  });
  it('does not promote enforce diagnostic absence to a required B or apply the RO exception to it', () => {
    const { evidence } = assembleCspAcceptance(stageInputFixture());
    const enforced = evidence.registry.filter((r) => r.group === 'D-WASM-ENFORCE');
    expect(enforced.length).toBe(10);
    expect(enforced.every((r) => r.role === 'diagnostic-only' && r.exceptionId === null)).toBe(
      true,
    );
    expect(stage2(completeSyntheticA(evidence)).status).toBe('proceed');
    expect(
      evidence.notifications
        .filter((r) => r.id.startsWith('real-'))
        .every((r) => r.status === 'not-observed'),
    ).toBe(true);
  });
  it.each(['A-W1', 'A-W2', 'A-W3', 'A-W4', 'A-D1', 'A-J1', 'A-H1-enforce', 'A-F1', 'A-preview'])(
    'blocks enforce for required %s fail or not-run',
    (id) => {
      for (const status of ['fail', 'not-run'] as const) {
        const { evidence } = assembleCspAcceptance(stageInputFixture());
        completeSyntheticA(evidence);
        const row = evidence.trials.find((r) => r.id === id);
        if (!row) throw new Error('fixture');
        row.status = status;
        expect(stage2(evidence).status).toBe('stop');
      }
    },
  );
  it('fails streaming itself when bytes fallback succeeds; never reassigns that trial as bytes pass', () => {
    const f = stageInputFixture();
    const row = f.wasm.rows[0];
    if (!row?.measurement) throw new Error('fixture');
    required(row.measurement.calls[0]).outcome = 'rejected';
    required(row.measurement.calls[0]).error = 'TypeError';
    row.measurement.calls.push({
      api: 'bytes',
      outcome: 'fulfilled',
      error: 'none',
      digest: f.providerDigest,
      digestOrigin: 'measured',
      importsValid: true,
    });
    const results = evaluateWasmProtection(f.wasm.rows);
    expect(results.find((r) => r.id === 'A-W1')?.status).toBe('fail');
    expect(results.find((r) => r.id === 'A-W2')?.status).toBe('pass');
    const { evidence } = assembleCspAcceptance(f);
    completeSyntheticA(evidence);
    required(evidence.trials.find((r) => r.id === 'A-W1')).status = 'fail';
    expect(stage2(evidence).status).toBe('stop');
  });
  it.each(['selection', 'plannedReason', 'digest', 'imports', 'unknown-retry', 'successful-retry'])(
    'rejects missing/changed API branch evidence: %s',
    (change) => {
      const f = stageInputFixture();
      const row = f.wasm.rows.find(
        (r) =>
          r.caseId === (change.includes('retry') ? 'worker-stream-deny' : 'worker-bytes-allow'),
      );
      if (!row?.measurement) throw new Error('fixture');
      if (change === 'selection') row.measurement.selection = 'streaming';
      if (change === 'plannedReason') row.measurement.plannedReason = 'none';
      if (change === 'digest') required(row.measurement.calls[1]).digest = '1'.repeat(64);
      if (change === 'imports') required(row.measurement.calls[1]).importsValid = false;
      if (change === 'unknown-retry') required(row.measurement.calls[1]).outcome = 'pending';
      if (change === 'successful-retry') {
        required(row.measurement.calls[1]).outcome = 'fulfilled';
        required(row.measurement.calls[1]).error = 'none';
      }
      expect(evaluateWasmProtection(f.wasm.rows).some((r) => r.status === 'fail')).toBe(true);
    },
  );
  it('rejects missing or changed imports supplier instead of inferring it from API success', () => {
    for (const value of [undefined, 'unknown']) {
      const f = stageInputFixture();
      const row = required(f.wasm.rows[1]);
      if (!row.measurement) throw new Error('fixture');
      Reflect.set(row.measurement, 'importsSource', value);
      expect(() => assembleCspAcceptance(f)).toThrow();
    }
  });
  it.each([
    'context',
    'directive',
    'policyMode',
    'disposition',
    'api',
    'caseId',
    'fixtureDigest',
    'bytesDigest',
    'engine',
    'browserVersion',
    'observer',
    'path',
    'policyFingerprint',
  ])('rejects full notification key mutation: %s', (field) => {
    const { evidence } = assembleCspAcceptance(stageInputFixture());
    const row = evidence.notifications.find((r) => r.id === 'worker-wasm-ro-wasm');
    if (!row) throw new Error('fixture');
    Reflect.set(row.key, field, 'changed');
    expect(stage1(evidence).status).toBe('stop');
  });
  it.each([
    'browser',
    'container',
    'observer',
    'policy',
    'provider',
    'artifact',
    'other-unmet',
    'unknown-console',
    'role',
    'extra-required',
  ])('does not widen the fixed exception for %s', (change) => {
    const f = stageInputFixture();
    if (change === 'browser') f.workerObservation.browserVersion = '26.7';
    if (change === 'container') f.workerObservation.containerDigest = 'sha256:' + 'f'.repeat(64);
    if (change === 'unknown-console')
      required(f.workerObservation.rows[0]).console.push({ category: 'unknown', owner: 'unknown' });
    if (change === 'observer') Reflect.set(f.workerObservation, 'observerVersion', 'changed');
    if (change === 'observer') {
      expect(() => assembleCspAcceptance(f)).toThrow();
      return;
    }
    if (change === 'browser' || change === 'container') {
      Reflect.set(
        f.wasm,
        change === 'browser' ? 'browserVersion' : 'containerDigest',
        change === 'browser'
          ? f.workerObservation.browserVersion
          : f.workerObservation.containerDigest,
      );
      Reflect.set(
        f.wasmFaults,
        change === 'browser' ? 'browserVersion' : 'containerDigest',
        change === 'browser'
          ? f.workerObservation.browserVersion
          : f.workerObservation.containerDigest,
      );
    }
    const { evidence } = assembleCspAcceptance(f);
    if (change === 'policy') evidence.productPolicyFingerprint = 'e'.repeat(64);
    if (change === 'provider') evidence.providerDigest = 'e'.repeat(64);
    if (change === 'artifact') evidence.artifacts.pop();
    if (change === 'other-unmet') required(evidence.notifications[0]).status = 'unmet';
    if (change === 'role') {
      required(evidence.registry[0]).role = 'diagnostic-only';
      evidence.registryFingerprint = registryDigest(evidence.registry);
    }
    if (change === 'extra-required') {
      required(evidence.registry.find((r) => r.group === 'D-WASM-ENFORCE')).role =
        'required-capability';
      evidence.registryFingerprint = registryDigest(evidence.registry);
    }
    expect(stage1(evidence).status).toBe('stop');
  });
  it.each([
    'workerObservation',
    'workerBindings',
    'documentObservation',
    'wasm',
    'wasmFaults',
    'browserResults',
  ])('rejects missing or wrong identity %s', (field) => {
    for (const mutation of ['missing', 'sha', 'run']) {
      const f = stageInputFixture();
      const r = Reflect.get(f, field) as Record<string, unknown>;
      if (mutation === 'missing') Reflect.set(f, field, undefined);
      else r[mutation] = 'wrong';
      expect(() => assembleCspAcceptance(f)).toThrow();
    }
  });
  it('preserves observer failure rather than converting it to the known unmet', () => {
    const f = stageInputFixture();
    required(f.workerObservation.rows[0]).listenerReady = false;
    const { evidence, rawCoverage } = assembleCspAcceptance(f);
    expect(rawCoverage.every((r) => r.status === 'failure' && r.reason === 'observer-failed')).toBe(
      true,
    );
    expect(
      evidence.notifications
        .filter((r) => r.id.startsWith('worker-'))
        .every((r) => r.status === 'not-run'),
    ).toBe(true);
    expect(stage1(evidence).status).toBe('stop');
  });
  it('lets an independent diagnostic disconnection remain unavailable without weakening A or B', () => {
    const f = stageInputFixture();
    for (const row of f.wasm.rows) {
      row.diagnostic.status = 'unavailable';
      row.diagnostic.reason = 'independent-disconnect';
    }
    const { evidence } = assembleCspAcceptance(f);
    expect(f.wasm.rows.every(wasmEvidenceHealthy)).toBe(true);
    expect(stage2(completeSyntheticA(evidence)).status).toBe('proceed');
    expect(
      evidence.notifications
        .filter((r) => r.id.startsWith('real-'))
        .every((r) => r.status === 'unavailable'),
    ).toBe(true);
    required(f.wasm.rows[0]).diagnostic.independent = false;
    expect(stage1(assembleCspAcceptance(f).evidence).status).toBe('stop');
    Reflect.set(f, 'wasmFaults', undefined);
    expect(() => assembleCspAcceptance(f)).toThrow();
  });
  it('refuses role declarations in execution data and unregistered notification rows', () => {
    const f = stageInputFixture();
    Reflect.set(required(f.documentObservation.rows[0]), 'role', 'diagnostic-only');
    expect(() => assembleCspAcceptance(f)).toThrow();
    const { evidence } = assembleCspAcceptance(stageInputFixture());
    evidence.notifications.push({
      ...required(evidence.notifications[0]),
      id: 'unregistered-enforce',
    });
    expect(stage1(evidence).status).toBe('stop');
  });
  it('retains required B for operations and does not extend the stages 1-4 exception to stage 5', () => {
    const { evidence } = assembleCspAcceptance(stageInputFixture());
    completeSyntheticA(evidence);
    const decision = evaluateCspStage(evidence, {
      stage: 5,
      phase: 'internal',
      publicationApproved: false,
    });
    expect(decision.status).toBe('stop');
    expect(decision.exceptions).toEqual([]);
    expect(decision.requiredNotifications).toContain('worker-wasm-ro-wasm');
  });
  it('keeps pre-deploy, public approval, and post-deploy acceptance separate', () => {
    const { evidence } = assembleCspAcceptance(stageInputFixture());
    completeSyntheticA(evidence);
    const pre = evaluateCspStage(evidence, {
      stage: 3,
      phase: 'pre-deploy',
      publicationApproved: false,
    });
    expect(pre).toMatchObject({
      status: 'proceed',
      publicationAllowed: false,
      siteAcceptanceComplete: false,
    });
    expect(
      evaluateCspStage(evidence, { stage: 3, phase: 'post-deploy', publicationApproved: false })
        .status,
    ).toBe('stop');
    required(evidence.trials.find((r) => r.id === 'A-post-deploy-response')).status = 'not-run';
    expect(
      evaluateCspStage(evidence, { stage: 3, phase: 'post-deploy', publicationApproved: true })
        .siteAcceptanceComplete,
    ).toBe(false);
    expect(
      evaluateCspStage(evidence, { stage: 1, phase: 'post-deploy', publicationApproved: true })
        .status,
    ).toBe('stop');
    expect(
      allStageDecisions(evidence).every((r) => !r.publicationAllowed && !r.siteAcceptanceComplete),
    ).toBe(true);
  });
  it('has finite unique expanded keys, with no wildcard or placeholder policy', () => {
    const { evidence } = assembleCspAcceptance(stageInputFixture());
    const ids = evidence.registry.map((r) => notificationKeyId(r.key));
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      evidence.registry.every(
        (r) => r.key.policyFingerprint !== '0'.repeat(64) && !JSON.stringify(r.key).includes('*'),
      ),
    ).toBe(true);
  });
});
