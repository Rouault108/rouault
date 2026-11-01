import { createHash } from 'node:crypto';
import identities from './csp-worker-fixture-identities.json' with { type: 'json' };
import {
  CSP_BROWSER_VERSIONS,
  CSP_OBSERVER_VERSION,
  type ObservationReport,
} from './csp-worker-acceptance.js';
import { CSP_WASM_CASES, CSP_WASM_OBSERVER, wasmCasePolicy } from './csp-wasm-evidence.js';

export const CSP_REGISTRY_VERSION = 'csp-notifications-1.4-v1';
export const CSP_KNOWN_EXCEPTION = 'WK26.6-worker-wasm-ro';
export const CSP_APPROVED_PRODUCT_POLICY =
  '65a7bdb267621d9645a696b74b599a792c47c5b4f7533d6b6a9efb70f75b40bd';
export const CSP_APPROVED_WASM = 'f0ee2d14fcbbb0559c3246263aa907987012a1ff45939484ee6b79bae1821baf';
export const CSP_INLINE_TEXT = 'document.documentElement.dataset.cspProbe="executed";';
export const CSP_LEGACY_RENDERER_DIGEST =
  'ee0e7e06f338a4444fb49872d6816b7da7a90aa4c4a780cb57f9ab88b60a6729';
export const CSP_LEGACY_BUTTON_DIGEST =
  '0ee96aee14619a949fb0ec23a0f47b62493291798b70d9da78fe6c00d87de03d';
export const cspFingerprint = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');
export type CspEngine = ObservationReport['engine'];
export type CspStage = 0 | 1 | 2 | 3 | 4 | 5;
export type CspPhase = 'internal' | 'pre-deploy' | 'post-deploy';
export interface NotificationKey {
  context: 'document' | 'srcdoc' | 'isolated-worker' | 'search-worker';
  directive: 'script-src' | 'script-src-elem' | 'base-uri' | 'connect-src';
  policyFingerprint: string;
  policyMode: 'report-only' | 'enforce';
  disposition: 'report' | 'enforce';
  api: string;
  caseId: string;
  fixtureDigest: string;
  bytesDigest: string;
  engine: CspEngine;
  browserVersion: string;
  observer: string;
  path: 'document-event' | 'isolated-native-console' | 'worker-event' | 'fixture-console';
}
export interface NotificationDefinition {
  id: string;
  group:
    | 'B-DOC-RO'
    | 'B-WORKER-CONNECT-RO'
    | 'B-WORKER-WASM-RO'
    | 'D-FIXTURE-ENFORCE'
    | 'D-WASM-ENFORCE'
    | 'D-LEGACY';
  role: 'required-capability' | 'diagnostic-only';
  key: NotificationKey;
  stages: readonly CspStage[];
  phases: readonly CspPhase[];
  controls: readonly string[];
  artifacts: readonly string[];
  exceptionId: typeof CSP_KNOWN_EXCEPTION | null;
}
export const notificationKeyId = (key: NotificationKey): string =>
  cspFingerprint(JSON.stringify(Object.entries(key).sort(([a], [b]) => a.localeCompare(b))));
export const CSP_FIXED_WORKER_CASES = identities.cases;
const required = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('registry-definition');
  return value;
};
export const notificationRegistry = (
  engine: CspEngine,
  documentPolicy: string,
  workerPolicy: string,
  wasmFixtureDigest: string,
): NotificationDefinition[] => {
  const base = { engine, browserVersion: CSP_BROWSER_VERSIONS[engine] };
  const registry: NotificationDefinition[] = [];
  const add = (
    id: string,
    group: NotificationDefinition['group'],
    key: Omit<NotificationKey, 'engine' | 'browserVersion'>,
    required: boolean,
    artifacts: string[],
    controls: string[],
    exceptionId: NotificationDefinition['exceptionId'] = null,
  ) =>
    registry.push({
      id,
      group,
      key: { ...key, ...base },
      role: required ? 'required-capability' : 'diagnostic-only',
      stages: required ? [1, 2, 3, 4, 5] : [],
      phases: required ? ['internal', 'pre-deploy', 'post-deploy'] : [],
      artifacts,
      controls,
      exceptionId,
    });
  add(
    'document-inline',
    'B-DOC-RO',
    {
      context: 'document',
      directive: 'script-src-elem',
      policyFingerprint: cspFingerprint(documentPolicy),
      policyMode: 'report-only',
      disposition: 'report',
      api: 'DOM-script-insertion',
      caseId: 'inline-probe',
      fixtureDigest: cspFingerprint(CSP_INLINE_TEXT),
      bytesDigest: cspFingerprint(CSP_INLINE_TEXT),
      observer: 'document-ro-1.4-v1',
      path: 'document-event',
    },
    true,
    ['document-ro', 'browser-results'],
    ['inline-ro', 'theme-system'],
  );
  add(
    'legacy-inline',
    'B-DOC-RO',
    {
      context: 'srcdoc',
      directive: 'script-src-elem',
      policyFingerprint: cspFingerprint(documentPolicy),
      policyMode: 'report-only',
      disposition: 'report',
      api: 'srcdoc-inline',
      caseId: 'legacy-preview',
      fixtureDigest: CSP_LEGACY_RENDERER_DIGEST,
      bytesDigest: CSP_LEGACY_BUTTON_DIGEST,
      observer: 'legacy-console-1.4-v1',
      path: 'fixture-console',
    },
    true,
    ['document-ro', 'browser-results'],
    ['legacy-preview'],
  );
  for (const directive of ['base-uri'] as const)
    add(
      'legacy-' + directive,
      'D-LEGACY',
      {
        ...required(registry[1]).key,
        directive,
        api: 'srcdoc-base',
      },
      false,
      ['document-ro'],
      ['legacy-preview'],
    );
  const entries = [
    ['connect', 'ro-connect'],
    ['connect', 'ro-both'],
    ['connect', 'ro-both-delayed'],
    ['wasm', 'ro-wasm'],
    ['wasm', 'ro-both'],
    ['wasm', 'ro-both-delayed'],
  ] as const;
  for (const [kind, caseId] of entries) {
    const fixture = required(identities.cases.find((row) => row.caseId === caseId));
    add(
      'worker-' + kind + '-' + caseId,
      kind === 'connect' ? 'B-WORKER-CONNECT-RO' : 'B-WORKER-WASM-RO',
      {
        context: 'isolated-worker',
        directive: kind === 'connect' ? 'connect-src' : 'script-src',
        policyFingerprint: fixture.policyFingerprint,
        policyMode: 'report-only',
        disposition: 'report',
        api: kind === 'connect' ? 'Blob.fetch' : 'WebAssembly.compile',
        caseId,
        fixtureDigest: fixture.fixtureDigest,
        bytesDigest: identities.bytesDigest,
        observer: CSP_OBSERVER_VERSION,
        path:
          kind === 'connect' && engine === 'webkit-csp'
            ? 'isolated-native-console'
            : 'worker-event',
      },
      true,
      ['worker-observation', 'worker-bindings', 'browser-results'],
      identities.cases.map((row) => row.caseId),
      kind === 'wasm' && engine === 'webkit-csp' ? CSP_KNOWN_EXCEPTION : null,
    );
  }
  for (const caseId of ['enforce-connect', 'enforce-wasm', 'enforce-both'])
    for (const kind of ['connect', 'wasm'] as const) {
      const fixture = required(identities.cases.find((row) => row.caseId === caseId));
      add(
        'fixture-' + kind + '-' + caseId,
        'D-FIXTURE-ENFORCE',
        {
          context: 'isolated-worker',
          directive: kind === 'connect' ? 'connect-src' : 'script-src',
          policyFingerprint: fixture.policyFingerprint,
          policyMode: 'enforce',
          disposition: 'enforce',
          api: kind === 'connect' ? 'Blob.fetch' : 'WebAssembly.compile',
          caseId,
          fixtureDigest: fixture.fixtureDigest,
          bytesDigest: identities.bytesDigest,
          observer: CSP_OBSERVER_VERSION,
          path: 'worker-event',
        },
        false,
        ['worker-observation'],
        ['baseline', 'ro-allowed'],
      );
    }
  // 実enforce通知は別registry行。RO例外IDも必須性も継承しない。
  for (const caseId of CSP_WASM_CASES)
    add(
      'real-' + caseId,
      'D-WASM-ENFORCE',
      {
        context: caseId.startsWith('worker') ? 'search-worker' : 'document',
        directive: 'script-src',
        policyFingerprint: cspFingerprint(wasmCasePolicy(caseId, documentPolicy, workerPolicy)),
        policyMode: 'enforce',
        disposition: 'enforce',
        api: caseId.includes('bytes') ? 'suzume-planned-bytes' : 'suzume-streaming-with-fallback',
        caseId,
        fixtureDigest: wasmFixtureDigest,
        bytesDigest: CSP_APPROVED_WASM,
        observer: CSP_WASM_OBSERVER,
        path: 'fixture-console',
      },
      false,
      ['real-wasm', 'wasm-faults'],
      ['normal-input-pair', 'same-imports-contract'],
    );
  return registry;
};

export const registryDigest = (registry: readonly NotificationDefinition[]): string =>
  cspFingerprint(JSON.stringify({ version: CSP_REGISTRY_VERSION, definitions: registry }));
