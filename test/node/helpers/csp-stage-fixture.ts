import { CSP_TEST_CASES } from '../../../scripts/ci/csp-test-cases.js';
import { observationFixture } from './csp-observation-fixture.js';
import {
  CSP_FIXED_WORKER_CASES,
  CSP_APPROVED_PRODUCT_POLICY,
  CSP_APPROVED_WASM,
  notificationRegistry,
  cspFingerprint,
  type CspEngine,
} from '../../../scripts/ci/csp-notification-registry.js';
import {
  CSP_WASM_CASES,
  CSP_WASM_OBSERVER,
  CSP_IMPORTS_CONTRACT,
  CSP_IMPORTS_SOURCE,
  wasmCasePolicy,
  type WasmEvidenceRow,
  type WasmCall,
} from '../../../scripts/ci/csp-wasm-evidence.js';
import type { AcceptanceInput } from '../../../scripts/ci/csp-stage-acceptance.js';

// 集約の自己試験専用。合成したpassを実browserの実測に加算しない。
export const stageInputFixture = (engine: CspEngine = 'webkit-csp') => {
  const observed = observationFixture(engine);
  observed.sha = 'a'.repeat(40);
  observed.run = '17';
  const identity = { sha: observed.sha, run: observed.run, engine, buildId: 'candidate' };
  const documentPolicy =
    "default-src 'none'; script-src 'self' 'sha256-known'; connect-src 'self'; worker-src 'self'";
  const workerPolicy =
    "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' blob:; worker-src 'none'; object-src 'none'";
  const fixtureDigest = 'c'.repeat(64),
    workerEntryDigest = 'b'.repeat(64);
  const environment = {
    browserVersion: observed.browserVersion,
    playwrightVersion: observed.playwrightVersion,
    locale: observed.locale,
    nodeVersion: observed.nodeVersion,
    pnpmVersion: observed.pnpmVersion,
    containerDigest: observed.containerDigest,
  };
  const registry = notificationRegistry(engine, documentPolicy, workerPolicy, fixtureDigest);
  const call = (
    api: WasmCall['api'],
    outcome: WasmCall['outcome'],
    error: WasmCall['error'],
  ): WasmCall => ({
    api,
    outcome,
    error,
    digest: CSP_APPROVED_WASM,
    digestOrigin: 'measured',
    importsValid: true,
  });
  const rows: WasmEvidenceRow[] = CSP_WASM_CASES.map((caseId) => {
    const denied = caseId.endsWith('deny'),
      bytes = caseId.includes('bytes'),
      control = caseId.endsWith('js-control');
    return {
      caseId,
      policy: cspFingerprint(wasmCasePolicy(caseId, documentPolicy, workerPolicy)),
      parentPolicy: cspFingerprint(documentPolicy),
      workerEntryDigest: caseId.startsWith('worker')
        ? workerEntryDigest
        : '8b07ad2c426ea641f04ed8914b60178f9942bf70bc041381b1656173e6941e34',
      httpVerified: true,
      fixtureVerified: true,
      lifetimeValid: true,
      source: caseId.startsWith('document') ? 'document' : denied ? 'catalog' : 'lexical',
      initialized: !denied,
      measurement: {
        schema: 1,
        observer: CSP_WASM_OBSERVER,
        ready: true,
        selection: bytes ? 'bytes' : 'streaming',
        plannedReason: bytes ? 'non-streaming-mime' : 'none',
        importsContract: CSP_IMPORTS_CONTRACT,
        importsSource: CSP_IMPORTS_SOURCE,
        calls: denied
          ? [
              call('streaming', 'rejected', 'CompileError'),
              call('bytes', 'rejected', 'CompileError'),
            ]
          : bytes
            ? [call('streaming', 'rejected', 'TypeError'), call('bytes', 'fulfilled', 'none')]
            : [call('streaming', 'fulfilled', 'none')],
        js: {
          eval: control ? 'allowed' : 'rejected',
          function: control ? 'allowed' : 'rejected',
          timer: control ? 'allowed' : 'rejected',
        },
      },
      diagnostic: {
        status: 'available',
        reason: 'no-notification',
        independent: true,
        unknownConsole: false,
        notifications: 0,
      },
    };
  });
  const browserResults = {
    schema: 1,
    kind: 'private-csp-test-results',
    sha: identity.sha,
    run: identity.run,
    suites: [
      {
        specs: Object.values(CSP_TEST_CASES).map((caseId) => ({
          caseId,
          ok: true,
          tests: [
            {
              projectName: engine,
              expectedStatus: 'passed',
              status: 'expected',
              results: [{ status: 'passed', retry: 0, errors: [] }],
            },
          ],
        })),
      },
    ],
    errors: [],
    stats: { expected: Object.keys(CSP_TEST_CASES).length, skipped: 0, unexpected: 0, flaky: 0 },
  };
  return {
    identity,
    documentPolicy,
    workerPolicy,
    productPolicyFingerprint: CSP_APPROVED_PRODUCT_POLICY,
    providerDigest: CSP_APPROVED_WASM,
    wasmFixtureDigest: fixtureDigest,
    workerEntryDigest,
    manifestDigest: 'd'.repeat(64),
    staticVerified: true,
    browserResults,
    workerObservation: observed,
    workerBindings: {
      schema: 1,
      kind: 'worker-fixture-bindings',
      ...identity,
      rows: structuredClone(CSP_FIXED_WORKER_CASES),
    },
    documentObservation: {
      schema: 1,
      kind: 'document-ro-registry-evidence',
      ...identity,
      rows: registry
        .filter((r) => r.group === 'B-DOC-RO')
        .map((r) => ({
          id: r.id,
          key: r.key,
          observed: true,
          healthy: true,
          unknownConsole: false,
          baseObserved: true,
        })),
    },
    wasm: {
      schema: 1,
      kind: 'real-suzume-evidence',
      ...identity,
      ...environment,
      fixtureDigest,
      rows,
    },
    wasmFaults: {
      schema: 1,
      kind: 'wasm-fault-controls',
      ...identity,
      ...environment,
      fixtureDigest,
      diagnosticOnlyDetected: true,
      sharedFaultRejected: true,
    },
  } satisfies AcceptanceInput;
};
