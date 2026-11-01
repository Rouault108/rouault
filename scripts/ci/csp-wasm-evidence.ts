import { PROVIDER_WASM_SHA256 } from '../../shared/search/lexical-provider-config.js';
import {
  evidenceObject as object,
  evidenceKeys as keys,
  evidenceFlag as flag,
  evidenceEnum as enumeration,
  evidenceSequence as sequence,
} from './csp-evidence-values.js';

export const CSP_WASM_OBSERVER = 'suzume-api-1.4-v1';
export const CSP_IMPORTS_CONTRACT = 'suzume-0.9.11-emscripten-a-abcde-v1';
export const CSP_WASM_CASES = [
  'worker-stream-allow',
  'worker-bytes-allow',
  'worker-stream-deny',
  'worker-bytes-deny',
  'document-stream-allow',
  'document-stream-deny',
  'document-bytes-allow',
  'document-bytes-deny',
  'worker-js-control',
  'document-js-control',
] as const;
export type WasmCase = (typeof CSP_WASM_CASES)[number];
export const wasmCasePolicy = (
  caseId: string,
  documentPolicy: string,
  workerPolicy: string,
): string => {
  const worker = caseId.startsWith('worker-');
  const allowWasm = !caseId.endsWith('deny');
  const allowJs = caseId.endsWith('js-control');
  const initial = worker ? workerPolicy : documentPolicy;
  return initial.replace(/script-src ([^;]+)/u, (_all: string, sources: string) => {
    const normalized = sources.replace(" 'wasm-unsafe-eval'", '');
    return `script-src ${normalized}${allowWasm ? " 'wasm-unsafe-eval'" : ''}${allowJs ? " 'unsafe-eval'" : ''}`;
  });
};
export type ApiOutcome = 'pending' | 'fulfilled' | 'rejected';
export interface WasmCall {
  api: 'streaming' | 'bytes';
  outcome: ApiOutcome;
  error: 'none' | 'CompileError' | 'TypeError' | 'other';
  digest: string;
  digestOrigin: 'measured' | 'pre-fetch-control' | 'pending';
  importsValid: boolean;
}
export interface WasmMeasurement {
  schema: 1;
  observer: typeof CSP_WASM_OBSERVER;
  ready: boolean;
  selection: 'streaming' | 'bytes';
  plannedReason: 'none' | 'non-streaming-mime';
  importsContract: typeof CSP_IMPORTS_CONTRACT;
  calls: WasmCall[];
  js: {
    eval: 'allowed' | 'rejected';
    function: 'allowed' | 'rejected';
    timer: 'allowed' | 'rejected' | 'pending';
  };
}
export interface WasmEvidenceRow {
  caseId: WasmCase;
  policy: string;
  parentPolicy: string;
  workerEntryDigest: string;
  httpVerified: boolean;
  fixtureVerified: boolean;
  lifetimeValid: boolean;
  source: 'lexical' | 'catalog' | 'document' | 'none';
  initialized: boolean;
  measurement: WasmMeasurement | null;
  diagnostic: {
    status: 'available' | 'unavailable' | 'not-run';
    reason: 'observed' | 'no-notification' | 'independent-disconnect' | 'shared-fault';
    independent: boolean;
    unknownConsole: boolean;
    notifications: number;
  };
}
export interface ProtectionResult {
  id: string;
  status: 'pass' | 'fail' | 'not-run';
  reason: 'verified' | 'api-regression' | 'invalid-evidence' | 'not-implemented' | 'stage-scope';
}
const digestOrPending = (value: unknown): string => {
  if (typeof value !== 'string' || !/^(?:[a-f0-9]{64}|pending|invalid)$/u.test(value))
    throw new Error('invalid-evidence');
  return value;
};
export const readWasmMeasurement = (value: unknown): WasmMeasurement => {
  const m = object(value);
  keys(m, [
    'schema',
    'observer',
    'ready',
    'selection',
    'plannedReason',
    'importsContract',
    'calls',
    'js',
  ]);
  if (
    m['schema'] !== 1 ||
    m['observer'] !== CSP_WASM_OBSERVER ||
    m['importsContract'] !== CSP_IMPORTS_CONTRACT
  )
    throw new Error('invalid-evidence');
  const js = object(m['js']);
  keys(js, ['eval', 'function', 'timer']);
  return {
    schema: 1,
    observer: CSP_WASM_OBSERVER,
    importsContract: CSP_IMPORTS_CONTRACT,
    ready: flag(m['ready']),
    selection: enumeration(m['selection'], ['streaming', 'bytes']),
    plannedReason: enumeration(m['plannedReason'], ['none', 'non-streaming-mime']),
    calls: sequence(m['calls'], 8).map((value) => {
      const c = object(value);
      keys(c, ['api', 'outcome', 'error', 'digest', 'digestOrigin', 'importsValid']);
      return {
        api: enumeration(c['api'], ['streaming', 'bytes']),
        outcome: enumeration(c['outcome'], ['pending', 'fulfilled', 'rejected']),
        error: enumeration(c['error'], ['none', 'CompileError', 'TypeError', 'other']),
        digest: digestOrPending(c['digest']),
        importsValid: flag(c['importsValid']),
        digestOrigin: enumeration(c['digestOrigin'], ['measured', 'pre-fetch-control', 'pending']),
      };
    }),
    js: {
      eval: enumeration(js['eval'], ['allowed', 'rejected']),
      function: enumeration(js['function'], ['allowed', 'rejected']),
      timer: enumeration(js['timer'], ['allowed', 'rejected', 'pending']),
    },
  };
};
export const readWasmRow = (value: unknown): WasmEvidenceRow => {
  const r = object(value);
  keys(r, [
    'caseId',
    'policy',
    'parentPolicy',
    'workerEntryDigest',
    'httpVerified',
    'fixtureVerified',
    'lifetimeValid',
    'source',
    'initialized',
    'measurement',
    'diagnostic',
  ]);
  const d = object(r['diagnostic']);
  keys(d, ['status', 'reason', 'independent', 'unknownConsole', 'notifications']);
  for (const field of ['policy', 'parentPolicy', 'workerEntryDigest'] as const)
    if (typeof r[field] !== 'string' || !/^[a-f0-9]{64}$/u.test(r[field]))
      throw new Error('invalid-evidence');
  if (
    !Number.isInteger(d['notifications']) ||
    Number(d['notifications']) < 0 ||
    Number(d['notifications']) > 100
  )
    throw new Error('invalid-evidence');
  return {
    caseId: enumeration(r['caseId'], CSP_WASM_CASES),
    policy: String(r['policy']),
    parentPolicy: String(r['parentPolicy']),
    workerEntryDigest: String(r['workerEntryDigest']),
    httpVerified: flag(r['httpVerified']),
    fixtureVerified: flag(r['fixtureVerified']),
    lifetimeValid: flag(r['lifetimeValid']),
    initialized: flag(r['initialized']),
    source: enumeration(r['source'], ['lexical', 'catalog', 'document', 'none']),
    measurement: r['measurement'] === null ? null : readWasmMeasurement(r['measurement']),
    diagnostic: {
      status: enumeration(d['status'], ['available', 'unavailable', 'not-run']),
      reason: enumeration(d['reason'], [
        'observed',
        'no-notification',
        'independent-disconnect',
        'shared-fault',
      ]),
      independent: flag(d['independent']),
      unknownConsole: flag(d['unknownConsole']),
      notifications: Number(d['notifications']),
    },
  };
};
// Aの計測と診断observerは別の経路。独立性が不明な故障は拒否する。
export const wasmEvidenceHealthy = (row: WasmEvidenceRow): boolean =>
  row.httpVerified &&
  row.fixtureVerified &&
  row.lifetimeValid &&
  !!row.measurement?.ready &&
  !row.diagnostic.unknownConsole &&
  row.diagnostic.independent &&
  row.diagnostic.status !== 'not-run' &&
  (row.diagnostic.status === 'available' || row.diagnostic.reason === 'independent-disconnect') &&
  row.measurement.calls.length > 0 &&
  row.measurement.calls.every(
    (call) =>
      call.digest === PROVIDER_WASM_SHA256 &&
      call.importsValid &&
      call.outcome !== 'pending' &&
      (call.digestOrigin === 'measured' ||
        (call.digestOrigin === 'pre-fetch-control' &&
          call.outcome === 'rejected' &&
          call.error === 'CompileError')),
  );

export const evaluateWasmProtection = (values: unknown): ProtectionResult[] => {
  const ids = ['A-W1', 'A-W2', 'A-W3', 'A-W4', 'A-D1', 'A-J1', 'A-H1-enforce', 'A-F1'];
  const invalid = (): ProtectionResult[] =>
    ids.map((id) => ({ id, status: 'fail', reason: 'invalid-evidence' }));
  let rows: WasmEvidenceRow[];
  try {
    rows = sequence(values, 10).map(readWasmRow);
    if (
      rows.length !== CSP_WASM_CASES.length ||
      new Set(rows.map((r) => r.caseId)).size !== rows.length
    )
      return invalid();
  } catch {
    return invalid();
  }
  const get = (id: WasmCase): WasmEvidenceRow => {
    const row = rows.find((r) => r.caseId === id);
    if (!row) throw new Error('wasm-case');
    return row;
  };
  const api = (row: WasmEvidenceRow, name: 'streaming' | 'bytes') =>
    row.measurement?.calls.filter((c) => c.api === name) ?? [];
  const allowed = (row: WasmEvidenceRow, selection: 'streaming' | 'bytes') => {
    if (!row.measurement) return false;
    const streams = api(row, 'streaming'),
      bytes = api(row, 'bytes');
    return (
      wasmEvidenceHealthy(row) &&
      row.initialized &&
      row.measurement.selection === selection &&
      (selection === 'streaming'
        ? row.measurement.plannedReason === 'none' &&
          streams.length === 1 &&
          streams[0]?.outcome === 'fulfilled' &&
          bytes.length === 0
        : row.measurement.plannedReason === 'non-streaming-mime' &&
          streams.length === 1 &&
          streams[0]?.outcome === 'rejected' &&
          streams[0].error === 'TypeError' &&
          bytes.length === 1 &&
          bytes[0]?.outcome === 'fulfilled')
    );
  };
  const denied = (row: WasmEvidenceRow, selection: 'streaming' | 'bytes') => {
    if (!row.measurement) return false;
    const streams = api(row, 'streaming'),
      bytes = api(row, 'bytes');
    return (
      wasmEvidenceHealthy(row) &&
      !row.initialized &&
      row.measurement.selection === selection &&
      streams.length === 1 &&
      streams[0]?.outcome === 'rejected' &&
      streams[0].error === 'CompileError' &&
      (selection === 'streaming' ? bytes.length <= 1 : bytes.length === 1) &&
      bytes.every((c) => c.outcome === 'rejected' && c.error === 'CompileError')
    );
  };
  const matched = (allow: WasmCase, deny: WasmCase) => {
    const a = get(allow),
      d = get(deny);
    return (
      a.workerEntryDigest === d.workerEntryDigest &&
      a.parentPolicy === d.parentPolicy &&
      a.policy !== d.policy
    );
  };
  const stream = get('worker-stream-allow'),
    bytes = get('worker-bytes-allow');
  const docStream = get('document-stream-allow'),
    docBytes = get('document-bytes-allow');
  const js = (row: WasmEvidenceRow, state: 'allowed' | 'rejected') =>
    row.measurement && Object.values(row.measurement.js).every((v) => v === state);
  const checks = [
    allowed(stream, 'streaming') && stream.source === 'lexical',
    allowed(bytes, 'bytes') && bytes.source === 'lexical',
    allowed(stream, 'streaming') &&
      denied(get('worker-stream-deny'), 'streaming') &&
      matched('worker-stream-allow', 'worker-stream-deny'),
    allowed(bytes, 'bytes') &&
      denied(get('worker-bytes-deny'), 'bytes') &&
      matched('worker-bytes-allow', 'worker-bytes-deny'),
    allowed(docStream, 'streaming') &&
      allowed(docBytes, 'bytes') &&
      denied(get('document-stream-deny'), 'streaming') &&
      denied(get('document-bytes-deny'), 'bytes') &&
      matched('document-stream-allow', 'document-stream-deny') &&
      matched('document-bytes-allow', 'document-bytes-deny'),
    js(stream, 'rejected') &&
      js(get('document-stream-deny'), 'rejected') &&
      js(get('worker-js-control'), 'allowed') &&
      js(get('document-js-control'), 'allowed') &&
      allowed(get('worker-js-control'), 'streaming') &&
      allowed(get('document-js-control'), 'streaming'),
    rows.every(wasmEvidenceHealthy),
    stream.source === 'lexical' &&
      bytes.source === 'lexical' &&
      ['catalog', 'none'].includes(get('worker-stream-deny').source) &&
      ['catalog', 'none'].includes(get('worker-bytes-deny').source),
  ];
  return ids.map((id, i) => ({
    id,
    status: checks[i] ? 'pass' : 'fail',
    reason: checks[i] ? 'verified' : 'api-regression',
  }));
};
