import { assertCspBrowserResults } from './assert-csp-browser-results.js';
import { evaluateBoundCspCoverage } from './assert-csp-coverage.js';
import { readObservationReport, CSP_CONTAINER_DIGEST } from './csp-worker-acceptance.js';
import {
  CSP_KNOWN_EXCEPTION,
  CSP_APPROVED_PRODUCT_POLICY,
  CSP_APPROVED_WASM,
  CSP_FIXED_WORKER_CASES,
  cspFingerprint,
  notificationRegistry,
  notificationKeyId,
  registryDigest,
  type NotificationDefinition,
  type NotificationKey,
  type CspEngine,
  type CspStage,
  type CspPhase,
} from './csp-notification-registry.js';
import { CSP_TEST_CASES } from './csp-test-cases.js';
import { evaluateWasmProtection, readWasmRow, type ProtectionResult } from './csp-wasm-evidence.js';
import {
  evidenceObject as object,
  evidenceKeys as keys,
  evidenceSequence as sequence,
  evidenceFlag as flag,
} from './csp-evidence-values.js';

export interface CandidateIdentity {
  sha: string;
  run: string;
  buildId: string;
  engine: CspEngine;
}
export interface NotificationResult {
  id: string;
  key: NotificationKey;
  status: 'success' | 'unmet' | 'observed' | 'not-observed' | 'unavailable' | 'not-run';
  reason:
    | 'observed'
    | 'notification-missing'
    | 'webkit-wasm-ro-unobserved'
    | 'diagnostic-only'
    | 'independent-disconnect'
    | 'stage-scope'
    | 'evidence-invalid';
}
const RO_TRIALS = Object.values(CSP_TEST_CASES)
  .filter((id) => !['real-wasm', 'wasm-faults'].includes(id))
  .map((id) => 'RO-' + id);
const WASM_TRIALS = ['A-W1', 'A-W2', 'A-W3', 'A-W4', 'A-D1', 'A-J1', 'A-H1-enforce', 'A-F1'];
const EXTERNAL_TRIALS = [
  'A-stage0',
  'A-preview',
  'A-product-enforce',
  'A-enforce-cache',
  'A-verification-delivery',
  'A-rollback',
  'A-pre-deploy-receipt',
  'A-post-deploy-response',
  'A-operations',
];
export const CSP_TRIAL_IDS = [
  ...RO_TRIALS,
  'A-static',
  'A-W0',
  'A-H1-ro',
  ...WASM_TRIALS,
  ...EXTERNAL_TRIALS,
];
export const CSP_ACCEPTANCE_ARTIFACTS = [
  'browser-results',
  'worker-observation',
  'worker-bindings',
  'document-ro',
  'real-wasm',
  'wasm-faults',
  'manifest',
] as const;
export interface AcceptanceEvidence {
  identity: CandidateIdentity;
  registry: NotificationDefinition[];
  registryFingerprint: string;
  documentPolicy: string;
  workerPolicy: string;
  wasmFixtureDigest: string;
  productPolicyFingerprint: string;
  providerDigest: string;
  environment: {
    engine: CspEngine;
    browserVersion: string;
    playwrightVersion: string;
    observerVersion: string;
    locale: string;
    nodeVersion: string;
    pnpmVersion: string;
    containerDigest: string;
  };
  artifacts: { id: string; digest: string }[];
  integrity: boolean;
  trials: ProtectionResult[];
  notifications: NotificationResult[];
}
export interface StageRequest {
  stage: CspStage;
  phase: CspPhase;
  publicationApproved: boolean;
}
export interface StageDecision extends StageRequest {
  status: 'proceed' | 'stop';
  reasons: string[];
  exceptions: string[];
  requiredTrials: string[];
  requiredNotifications: string[];
  publicationAllowed: boolean;
  siteAcceptanceComplete: boolean;
}
export const requiredTrials = (stage: CspStage, phase: CspPhase): string[] => {
  const common = [...RO_TRIALS, 'A-static', 'A-W0', 'A-H1-ro'];
  if (stage === 0) return ['A-stage0'];
  if (stage === 1) return common;
  if (stage === 2)
    return [...common, ...WASM_TRIALS, 'A-preview', 'A-product-enforce', 'A-enforce-cache'];
  if (stage === 3 || stage === 4) {
    const delivery = [...common, 'A-stage0', 'A-verification-delivery', 'A-rollback'];
    if (stage === 4)
      delivery.push(...WASM_TRIALS, 'A-preview', 'A-product-enforce', 'A-enforce-cache');
    if (phase === 'post-deploy') delivery.push('A-pre-deploy-receipt', 'A-post-deploy-response');
    return delivery;
  }
  return [...common, ...WASM_TRIALS, ...EXTERNAL_TRIALS];
};
const exactRows = (rows: readonly { id: string }[], expected: readonly string[]): boolean =>
  rows.length === expected.length &&
  new Set(rows.map((r) => r.id)).size === rows.length &&
  expected.every((id) => rows.some((r) => r.id === id));

// role/required集合はregistryだけが所有する。結果の自己申告や汎用waiverは受け付けない。
export const evaluateCspStage = (
  evidence: AcceptanceEvidence,
  request: StageRequest,
): StageDecision => {
  const reasons: string[] = [];
  const exceptions: string[] = [];
  const required = requiredTrials(request.stage, request.phase);
  const requiredB = evidence.registry.filter(
    (r) =>
      r.role === 'required-capability' &&
      r.stages.includes(request.stage) &&
      r.phases.includes(request.phase),
  );
  const compiled = notificationRegistry(
    evidence.identity.engine,
    evidence.documentPolicy,
    evidence.workerPolicy,
    evidence.wasmFixtureDigest,
  );
  if (
    request.stage === 3 || request.stage === 4
      ? !['pre-deploy', 'post-deploy'].includes(request.phase)
      : request.phase !== 'internal'
  )
    reasons.push('invalid-phase');
  if (
    !evidence.integrity ||
    evidence.registryFingerprint !== registryDigest(evidence.registry) ||
    registryDigest(evidence.registry) !== registryDigest(compiled) ||
    !exactRows(evidence.trials, CSP_TRIAL_IDS) ||
    !exactRows(
      evidence.notifications,
      evidence.registry.map((r) => r.id),
    ) ||
    !exactRows(evidence.artifacts, [...CSP_ACCEPTANCE_ARTIFACTS]) ||
    evidence.artifacts.some(
      (r) => !/^[a-f0-9]{64}$/u.test(r.digest) || Object.keys(r).sort().join(',') !== 'digest,id',
    )
  )
    reasons.push('evidence-integrity');
  for (const result of evidence.notifications) {
    const definition = evidence.registry.find((row) => row.id === result.id);
    if (
      !definition ||
      notificationKeyId(result.key) !== notificationKeyId(definition.key) ||
      Object.keys(result).sort().join(',') !== 'id,key,reason,status'
    )
      reasons.push('registry-key-mismatch');
    if (
      definition?.role === 'required-capability'
        ? !['success', 'unmet', 'not-run'].includes(result.status)
        : !['observed', 'not-observed', 'unavailable', 'not-run'].includes(result.status)
    )
      reasons.push('notification-role');
  }
  for (const result of evidence.trials)
    if (Object.keys(result).sort().join(',') !== 'id,reason,status') reasons.push('trial-schema');
  for (const id of required)
    if (evidence.trials.find((r) => r.id === id)?.status !== 'pass')
      reasons.push('required-trial:' + id);
  for (const definition of requiredB) {
    const result = evidence.notifications.find((r) => r.id === definition.id);
    if (result?.status === 'success') continue;
    const env = evidence.environment;
    const allowed =
      result?.status === 'unmet' &&
      result.reason === 'webkit-wasm-ro-unobserved' &&
      definition.exceptionId === CSP_KNOWN_EXCEPTION &&
      definition.group === 'B-WORKER-WASM-RO' &&
      definition.key.context === 'isolated-worker' &&
      definition.key.directive === 'script-src' &&
      definition.key.policyMode === 'report-only' &&
      definition.key.disposition === 'report' &&
      definition.key.api === 'WebAssembly.compile' &&
      env.engine === 'webkit-csp' &&
      env.browserVersion === '26.6' &&
      env.playwrightVersion === '1.63.0' &&
      env.locale === 'en-US' &&
      env.observerVersion === 'worker-ro-1.2-v1' &&
      env.nodeVersion === '24.14.1' &&
      env.pnpmVersion === '11.28.9' &&
      env.containerDigest === CSP_CONTAINER_DIGEST &&
      evidence.productPolicyFingerprint === CSP_APPROVED_PRODUCT_POLICY &&
      evidence.providerDigest === CSP_APPROVED_WASM &&
      request.stage >= 1 &&
      request.stage <= 4;
    if (allowed) exceptions.push(CSP_KNOWN_EXCEPTION);
    else reasons.push('required-notification:' + definition.id);
  }
  if (request.phase === 'post-deploy' && !request.publicationApproved)
    reasons.push('publication-not-approved');
  const status = reasons.length ? 'stop' : 'proceed';
  return {
    ...request,
    status,
    reasons: [...new Set(reasons)],
    exceptions: status === 'proceed' ? [...new Set(exceptions)] : [],
    requiredTrials: required,
    requiredNotifications: requiredB.map((r) => r.id),
    publicationAllowed:
      status === 'proceed' && request.phase === 'pre-deploy' && request.publicationApproved,
    siteAcceptanceComplete:
      status === 'proceed' && request.phase === 'post-deploy' && request.publicationApproved,
  };
};

const BASE = ['schema', 'kind', 'engine', 'sha', 'run', 'buildId'];
const ENV = [
  'browserVersion',
  'playwrightVersion',
  'locale',
  'nodeVersion',
  'pnpmVersion',
  'containerDigest',
] as const;
const envelope = (
  value: unknown,
  kind: string,
  identity: CandidateIdentity,
  fields: readonly string[],
) => {
  const r = object(value);
  keys(r, [...BASE, ...fields]);
  if (
    r['schema'] !== 1 ||
    r['kind'] !== kind ||
    r['engine'] !== identity.engine ||
    r['sha'] !== identity.sha ||
    r['run'] !== identity.run ||
    r['buildId'] !== identity.buildId
  )
    throw new Error('evidence-identity');
  return r;
};
export interface AcceptanceInput {
  identity: CandidateIdentity;
  documentPolicy: string;
  workerPolicy: string;
  productPolicyFingerprint: string;
  providerDigest: string;
  wasmFixtureDigest: string;
  workerEntryDigest: string;
  manifestDigest: string;
  browserResults: unknown;
  workerObservation: unknown;
  workerBindings: unknown;
  documentObservation: unknown;
  wasm: unknown;
  wasmFaults: unknown;
  staticVerified: boolean;
}
export const assembleCspAcceptance = (
  input: AcceptanceInput,
): { evidence: AcceptanceEvidence; rawCoverage: ReturnType<typeof evaluateBoundCspCoverage> } => {
  const { identity } = input;
  assertCspBrowserResults(input.browserResults, identity.engine, {
    sha: identity.sha,
    run: identity.run,
  });
  const observed = readObservationReport(input.workerObservation);
  if (
    observed.sha !== identity.sha ||
    observed.run !== identity.run ||
    observed.engine !== identity.engine
  )
    throw new Error('worker-identity');
  const rawCoverage = evaluateBoundCspCoverage(
    input.workerObservation,
    identity.engine,
    identity.sha,
    identity.run,
  );
  let integrity =
    rawCoverage.every((r) => r.status === 'success' || r.status === 'unmet') &&
    input.staticVerified;
  const bindings = envelope(input.workerBindings, 'worker-fixture-bindings', identity, ['rows']);
  const bindingRows = sequence(bindings['rows'], 14).map(object);
  if (
    bindingRows.length !== CSP_FIXED_WORKER_CASES.length ||
    new Set(bindingRows.map((r) => r['caseId'])).size !== bindingRows.length
  )
    throw new Error('worker-bindings');
  for (const expected of CSP_FIXED_WORKER_CASES) {
    const actual = bindingRows.find((r) => r['caseId'] === expected.caseId);
    if (!actual) throw new Error('worker-binding-missing');
    keys(actual, ['caseId', 'fixtureDigest', 'policyFingerprint', 'mode', 'windowMs']);
    if (Object.entries(expected).some(([key, value]) => actual[key] !== value)) integrity = false;
  }
  const doc = envelope(input.documentObservation, 'document-ro-registry-evidence', identity, [
    'rows',
  ]);
  const docRows = sequence(doc['rows'], 2).map(object);
  if (docRows.length !== 2 || new Set(docRows.map((r) => r['id'])).size !== 2)
    throw new Error('document-cases');
  for (const row of docRows) {
    keys(row, ['id', 'key', 'observed', 'healthy', 'unknownConsole', 'baseObserved']);
    for (const field of ['observed', 'healthy', 'unknownConsole', 'baseObserved']) flag(row[field]);
    if (row['healthy'] !== true || row['unknownConsole'] !== false) integrity = false;
  }
  const wasm = envelope(input.wasm, 'real-suzume-evidence', identity, [
    ...ENV,
    'fixtureDigest',
    'rows',
  ]);
  if (wasm['fixtureDigest'] !== input.wasmFixtureDigest) throw new Error('wasm-fixture');
  for (const field of ENV) if (wasm[field] !== observed[field]) throw new Error('wasm-environment');
  const wasmRows = sequence(wasm['rows'], 10).map(readWasmRow);
  for (const row of wasmRows)
    if (
      row.parentPolicy !== cspFingerprint(input.documentPolicy) ||
      row.workerEntryDigest !==
        (row.caseId.startsWith('worker-')
          ? input.workerEntryDigest
          : '8b07ad2c426ea641f04ed8914b60178f9942bf70bc041381b1656173e6941e34')
    )
      throw new Error('wasm-source-identity');
  if (
    wasmRows.some(
      (r) =>
        r.diagnostic.unknownConsole ||
        !r.diagnostic.independent ||
        !r.httpVerified ||
        !r.fixtureVerified ||
        !r.lifetimeValid ||
        !r.measurement?.ready,
    )
  )
    integrity = false;
  const faults = envelope(input.wasmFaults, 'wasm-fault-controls', identity, [
    ...ENV,
    'fixtureDigest',
    'diagnosticOnlyDetected',
    'sharedFaultRejected',
  ]);
  for (const field of ENV)
    if (faults[field] !== observed[field]) throw new Error('fault-environment');
  if (faults['fixtureDigest'] !== input.wasmFixtureDigest) throw new Error('fault-fixture');
  flag(faults['diagnosticOnlyDetected']);
  flag(faults['sharedFaultRejected']);
  if (faults['diagnosticOnlyDetected'] !== true || faults['sharedFaultRejected'] !== true)
    integrity = false;
  const registry = notificationRegistry(
    identity.engine,
    input.documentPolicy,
    input.workerPolicy,
    input.wasmFixtureDigest,
  );
  const notifications: NotificationResult[] = registry.map((definition) => {
    const base = { id: definition.id, key: definition.key };
    if (definition.group === 'B-DOC-RO' || definition.group === 'D-LEGACY') {
      const row = docRows.find(
        (r) =>
          r['id'] === (definition.id === 'document-inline' ? 'document-inline' : 'legacy-inline'),
      );
      if (!row) throw new Error('document-missing');
      if (
        definition.group === 'B-DOC-RO' &&
        notificationKeyId(row['key'] as NotificationKey) !== notificationKeyId(definition.key)
      )
        integrity = false;
      const present =
        definition.group === 'D-LEGACY' ? row['baseObserved'] === true : row['observed'] === true;
      return {
        ...base,
        status:
          row['healthy'] !== true
            ? 'not-run'
            : definition.role === 'required-capability'
              ? present
                ? 'success'
                : 'unmet'
              : present
                ? 'observed'
                : 'not-observed',
        reason:
          row['healthy'] !== true
            ? 'evidence-invalid'
            : present
              ? 'observed'
              : 'notification-missing',
      };
    }
    if (definition.group === 'B-WORKER-CONNECT-RO' || definition.group === 'B-WORKER-WASM-RO') {
      const raw = rawCoverage.find(
        (r) =>
          r.capability ===
          (definition.group === 'B-WORKER-CONNECT-RO' ? 'worker-connect-ro' : 'worker-wasm-ro'),
      );
      return {
        ...base,
        status:
          raw?.status === 'success' ? 'success' : raw?.status === 'unmet' ? 'unmet' : 'not-run',
        reason:
          raw?.status === 'failure' || raw?.status === 'not-run'
            ? 'evidence-invalid'
            : raw?.reason === 'webkit-wasm-ro-unobserved'
              ? 'webkit-wasm-ro-unobserved'
              : 'observed',
      };
    }
    if (definition.group === 'D-FIXTURE-ENFORCE') {
      const row = observed.rows.find((r) => r.scenario === definition.key.caseId);
      const present = !!row?.events.some(
        (e) => e.directive === definition.key.directive && e.disposition === 'enforce',
      );
      return { ...base, status: present ? 'observed' : 'not-observed', reason: 'diagnostic-only' };
    }
    const row = wasmRows.find((r) => r.caseId === definition.key.caseId);
    if (row?.policy !== definition.key.policyFingerprint) throw new Error('real-wasm-key');
    return {
      ...base,
      status:
        row.diagnostic.status === 'available'
          ? row.diagnostic.notifications
            ? 'observed'
            : 'not-observed'
          : 'unavailable',
      reason:
        row.diagnostic.status === 'unavailable' ? 'independent-disconnect' : 'diagnostic-only',
    };
  });
  const trials: ProtectionResult[] = [...RO_TRIALS, 'A-static', 'A-W0', 'A-H1-ro'].map((id) => ({
    id,
    status: id === 'A-static' && !input.staticVerified ? 'fail' : 'pass',
    reason: id === 'A-static' && !input.staticVerified ? 'invalid-evidence' : 'verified',
  }));
  trials.push(...evaluateWasmProtection(wasm['rows']));
  trials.push(
    ...EXTERNAL_TRIALS.map((id) => ({
      id,
      status: 'not-run' as const,
      reason: 'not-implemented' as const,
    })),
  );
  const artifacts = CSP_ACCEPTANCE_ARTIFACTS.map((id) => ({
    id,
    digest:
      id === 'manifest'
        ? input.manifestDigest
        : cspFingerprint(
            JSON.stringify(
              (
                {
                  'browser-results': input.browserResults,
                  'worker-observation': input.workerObservation,
                  'worker-bindings': input.workerBindings,
                  'document-ro': input.documentObservation,
                  'real-wasm': input.wasm,
                  'wasm-faults': input.wasmFaults,
                } as Record<string, unknown>
              )[id],
            ),
          ),
  }));
  return {
    rawCoverage,
    evidence: {
      identity,
      registry,
      registryFingerprint: registryDigest(registry),
      documentPolicy: input.documentPolicy,
      workerPolicy: input.workerPolicy,
      wasmFixtureDigest: input.wasmFixtureDigest,
      productPolicyFingerprint: input.productPolicyFingerprint,
      providerDigest: input.providerDigest,
      environment: {
        engine: observed.engine,
        browserVersion: observed.browserVersion,
        playwrightVersion: observed.playwrightVersion,
        observerVersion: observed.observerVersion,
        locale: observed.locale,
        nodeVersion: observed.nodeVersion,
        pnpmVersion: observed.pnpmVersion,
        containerDigest: observed.containerDigest,
      },
      artifacts,
      integrity,
      trials,
      notifications,
    },
  };
};

export const allStageDecisions = (evidence: AcceptanceEvidence): StageDecision[] =>
  [
    [0, 'internal'],
    [1, 'internal'],
    [2, 'internal'],
    [3, 'pre-deploy'],
    [3, 'post-deploy'],
    [4, 'pre-deploy'],
    [4, 'post-deploy'],
    [5, 'internal'],
  ].map(([stage, phase]) =>
    evaluateCspStage(evidence, {
      stage: stage as CspStage,
      phase: phase as CspPhase,
      publicationApproved: false,
    }),
  );
