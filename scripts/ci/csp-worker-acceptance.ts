import { readWorkerProbe, type WorkerProbe } from './csp-worker-diagnostics.js';

export const CSP_CONTAINER_DIGEST =
  'sha256:b022639ae9197f864040f92eef7b57c6d4b47db2190f77c909d8a5d902dd4b7e';
export const CSP_OBSERVER_VERSION = 'worker-ro-1.2-v1';
export const CSP_BROWSER_VERSIONS = {
  'chromium-csp': '153.0.8010.12',
  'firefox-csp': '155.0',
  'webkit-csp': '26.6',
} as const;
export const CSP_OBSERVATION_CASES = [
  'baseline',
  'ro-allowed',
  'ro-no-operation',
  'ro-connect',
  'ro-wasm',
  'ro-both',
  'enforce-connect',
  'enforce-wasm',
  'enforce-both',
  'ro-both-delayed',
  'spoof',
  'foreign-spoof',
  'invalid-wasm',
  'aborted-fetch',
] as const;
export type ObservationCase = (typeof CSP_OBSERVATION_CASES)[number];
export type ObservationCategory =
  | 'canary'
  | 'missing-endpoint'
  | 'connect-report'
  | 'connect-enforce'
  | 'unknown';
export interface ObservationConsole {
  category: ObservationCategory;
  owner: 'worker' | 'document' | 'other-worker' | 'unknown';
}
export interface ObservationRow extends Omit<WorkerProbe, 'blob' | 'wasm'> {
  blob: WorkerProbe['blob'] | 'not-run';
  wasm: WorkerProbe['wasm'] | 'not-run';
  scenario: ObservationCase;
  console: ObservationConsole[];
  ready: boolean;
  listenerReady: boolean;
  consoleAttached: boolean;
  httpVerified: boolean;
  fixtureVerified: boolean;
  lifetimeValid: boolean;
  operationStarted: boolean;
  eventWindowMs: number;
}
export interface ObservationReport {
  schema: 1;
  kind: 'worker-ro-observation';
  engine: keyof typeof CSP_BROWSER_VERSIONS;
  browserVersion: string;
  playwrightVersion: '1.63.0';
  observerVersion: typeof CSP_OBSERVER_VERSION;
  locale: 'en-US';
  nodeVersion: string;
  pnpmVersion: string;
  containerDigest: string;
  sha: string;
  run: string;
  rows: ObservationRow[];
}
export interface CoverageResult {
  capability: 'worker-connect-ro' | 'worker-wasm-ro';
  status: 'success' | 'unmet' | 'failure' | 'not-run';
  reason:
    | 'observed'
    | 'webkit-wasm-ro-unobserved'
    | 'invalid-evidence'
    | 'environment-changed'
    | 'control-failed'
    | 'observer-failed'
    | 'notification-missing'
    | 'missing-evidence';
  path: 'worker-event' | 'isolated-native-console';
}

// 完全一致した固定版の文言も、単独では受入証拠にしない。
export const classifyObservationConsole = (
  text: string,
  policy: string | null,
  origin: string,
): ObservationCategory => {
  if (text === 'rouault-worker-observation-canary') return 'canary';
  if (
    policy &&
    text ===
      `The Content Security Policy '${policy}' was delivered in report-only mode, but does not specify a 'report-to'; the policy will have no effect. Please either add a 'report-to' directive, or deliver the policy via the 'Content-Security-Policy' header.`
  )
    return 'missing-endpoint';
  const match =
    /^(\[Report Only\] )?Refused to connect to (blob:http:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+) because it does not appear in the connect-src directive of the Content Security Policy\.$/u.exec(
      text,
    );
  if (match?.[2]?.startsWith(`blob:${origin}/`))
    return match[1] ? 'connect-report' : 'connect-enforce';
  return 'unknown';
};
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid-evidence');
  return value as Record<string, unknown>;
};
const keys = (value: Record<string, unknown>, fields: readonly string[]) => {
  if (Object.keys(value).sort().join(',') !== [...fields].sort().join(','))
    throw new Error('invalid-evidence');
};
export const readObservationProbe = (
  value: unknown,
): Pick<ObservationRow, 'blob' | 'wasm' | 'events'> => {
  const raw = object(value);
  keys(raw, ['blob', 'wasm', 'events']);
  const probe = readWorkerProbe({
    blob: raw['blob'] === 'not-run' ? 'allowed' : raw['blob'],
    wasm: raw['wasm'] === 'not-run' ? 'allowed' : raw['wasm'],
    events: raw['events'],
  });
  return {
    ...probe,
    blob: raw['blob'] === 'not-run' ? 'not-run' : probe.blob,
    wasm: raw['wasm'] === 'not-run' ? 'not-run' : probe.wasm,
  };
};
export const readObservationReport = (value: unknown): ObservationReport => {
  const report = object(value);
  keys(report, [
    'schema',
    'kind',
    'engine',
    'browserVersion',
    'playwrightVersion',
    'observerVersion',
    'locale',
    'nodeVersion',
    'pnpmVersion',
    'containerDigest',
    'sha',
    'run',
    'rows',
  ]);
  if (
    report['schema'] !== 1 ||
    report['kind'] !== 'worker-ro-observation' ||
    !Object.hasOwn(CSP_BROWSER_VERSIONS, String(report['engine'])) ||
    typeof report['browserVersion'] !== 'string' ||
    !/^[0-9.]{1,40}$/u.test(report['browserVersion']) ||
    report['playwrightVersion'] !== '1.63.0' ||
    report['observerVersion'] !== CSP_OBSERVER_VERSION ||
    report['locale'] !== 'en-US' ||
    typeof report['nodeVersion'] !== 'string' ||
    !/^[0-9.]{1,40}$/u.test(report['nodeVersion']) ||
    typeof report['pnpmVersion'] !== 'string' ||
    !/^(?:[0-9.]{1,40}|unrecorded)$/u.test(report['pnpmVersion']) ||
    typeof report['containerDigest'] !== 'string' ||
    !/^(?:sha256:[a-f0-9]{64}|unrecorded)$/u.test(report['containerDigest']) ||
    typeof report['sha'] !== 'string' ||
    !/^(?:[a-f0-9]{40}|local)$/u.test(report['sha']) ||
    typeof report['run'] !== 'string' ||
    !/^(?:[0-9]{1,20}|local)$/u.test(report['run']) ||
    !Array.isArray(report['rows'])
  )
    throw new Error('invalid-evidence');
  const rows = report['rows'].map((value): ObservationRow => {
    const row = object(value);
    keys(row, [
      'scenario',
      'blob',
      'wasm',
      'events',
      'console',
      'ready',
      'listenerReady',
      'consoleAttached',
      'httpVerified',
      'fixtureVerified',
      'lifetimeValid',
      'operationStarted',
      'eventWindowMs',
    ]);
    if (
      !CSP_OBSERVATION_CASES.includes(row['scenario'] as ObservationCase) ||
      !Array.isArray(row['console']) ||
      row['console'].length > 50 ||
      ![250, 1000].includes(Number(row['eventWindowMs']))
    )
      throw new Error('invalid-evidence');
    const flags = [
      'ready',
      'listenerReady',
      'consoleAttached',
      'httpVerified',
      'fixtureVerified',
      'lifetimeValid',
      'operationStarted',
    ] as const;
    for (const flag of flags)
      if (typeof row[flag] !== 'boolean') throw new Error('invalid-evidence');
    const consoleRows = row['console'].map((value): ObservationConsole => {
      const entry = object(value);
      keys(entry, ['category', 'owner']);
      if (
        !['canary', 'missing-endpoint', 'connect-report', 'connect-enforce', 'unknown'].includes(
          String(entry['category']),
        ) ||
        !['worker', 'document', 'other-worker', 'unknown'].includes(String(entry['owner']))
      )
        throw new Error('invalid-evidence');
      return {
        category: entry['category'] as ObservationCategory,
        owner: entry['owner'] as ObservationConsole['owner'],
      };
    });
    const probe = readObservationProbe({
      blob: row['blob'],
      wasm: row['wasm'],
      events: row['events'],
    });
    if (probe.events.length > 50) throw new Error('invalid-evidence');
    return {
      ...probe,
      scenario: row['scenario'] as ObservationCase,
      console: consoleRows,
      ready: row['ready'] as boolean,
      listenerReady: row['listenerReady'] as boolean,
      consoleAttached: row['consoleAttached'] as boolean,
      httpVerified: row['httpVerified'] as boolean,
      fixtureVerified: row['fixtureVerified'] as boolean,
      lifetimeValid: row['lifetimeValid'] as boolean,
      operationStarted: row['operationStarted'] as boolean,
      eventWindowMs: Number(row['eventWindowMs']),
    };
  });
  if (
    rows.length !== CSP_OBSERVATION_CASES.length ||
    new Set(rows.map((row) => row.scenario)).size !== rows.length
  )
    throw new Error('invalid-evidence');
  return {
    schema: 1,
    kind: 'worker-ro-observation',
    engine: report['engine'] as ObservationReport['engine'],
    browserVersion: report['browserVersion'],
    playwrightVersion: '1.63.0',
    observerVersion: CSP_OBSERVER_VERSION,
    locale: 'en-US',
    nodeVersion: report['nodeVersion'],
    pnpmVersion: report['pnpmVersion'],
    containerDigest: report['containerDigest'],
    sha: report['sha'],
    run: report['run'],
    rows,
  };
};

export const observationReady = (row: ObservationRow): boolean =>
  row.ready &&
  row.listenerReady &&
  row.consoleAttached &&
  row.httpVerified &&
  row.fixtureVerified &&
  row.lifetimeValid &&
  row.console.some((entry) => entry.category === 'canary' && entry.owner === 'worker');

export const evaluateWorkerObservation = (value: unknown): CoverageResult[] => {
  let report: ObservationReport | undefined;
  const result = (
    reason: CoverageResult['reason'],
    status: CoverageResult['status'] = 'failure',
  ): CoverageResult[] =>
    ['worker-connect-ro', 'worker-wasm-ro'].map((capability) => ({
      capability: capability as CoverageResult['capability'],
      status,
      reason,
      path:
        capability === 'worker-connect-ro' && report?.engine === 'webkit-csp'
          ? 'isolated-native-console'
          : 'worker-event',
    }));
  if (value === undefined || value === null) return result('missing-evidence', 'not-run');
  try {
    report = readObservationReport(value);
  } catch {
    return result('invalid-evidence');
  }
  if (
    CSP_BROWSER_VERSIONS[report.engine] !== report.browserVersion ||
    report.nodeVersion !== '24.14.1' ||
    report.pnpmVersion !== '11.28.9' ||
    report.containerDigest !== CSP_CONTAINER_DIGEST
  )
    return result('environment-changed');
  const rows = report.rows;
  if (rows.some((row) => !observationReady(row))) return result('observer-failed');
  const get = (scenario: ObservationCase): ObservationRow => {
    const row = rows.find((row) => row.scenario === scenario);
    if (!row) throw new Error('invalid-evidence');
    return row;
  };
  const event = (row: ObservationRow, directive: string, blocked: string, disposition: string) =>
    row.events.some(
      (entry) =>
        entry.directive === directive &&
        entry.blocked === blocked &&
        entry.disposition === disposition,
    );
  const violation = (row: ObservationRow) =>
    row.console.some(
      (entry) => entry.category === 'connect-report' || entry.category === 'connect-enforce',
    ) || row.events.length > 0;
  for (const row of rows) {
    const spoof = row.scenario === 'spoof' || row.scenario === 'foreign-spoof';
    if (
      row.console.some(
        (entry) =>
          entry.category === 'unknown' ||
          (!spoof &&
            (entry.category === 'connect-report' || entry.category === 'connect-enforce') &&
            entry.owner !== 'unknown'),
      )
    )
      return result('control-failed');
    const connectExpected = [
      'ro-connect',
      'ro-both',
      'ro-both-delayed',
      'enforce-connect',
      'enforce-both',
    ].includes(row.scenario);
    const wasmExpected = [
      'ro-wasm',
      'ro-both',
      'ro-both-delayed',
      'enforce-wasm',
      'enforce-both',
    ].includes(row.scenario);
    const disposition = row.scenario.startsWith('enforce-') ? 'enforce' : 'report';
    if (
      row.events.some(
        (entry) =>
          entry.disposition !== disposition ||
          !(
            (connectExpected && entry.directive === 'connect-src' && entry.blocked === 'blob:') ||
            (wasmExpected && entry.directive === 'script-src' && entry.blocked === 'wasm-eval')
          ),
      )
    )
      return result('control-failed');
    if (
      !spoof &&
      row.console.some(
        (entry) =>
          (entry.category === 'connect-report' && (!connectExpected || disposition !== 'report')) ||
          (entry.category === 'connect-enforce' &&
            (!connectExpected || disposition !== 'enforce')) ||
          (entry.category === 'missing-endpoint' && !row.scenario.startsWith('ro-')) ||
          (entry.category === 'canary' && entry.owner !== 'worker'),
      )
    )
      return result('control-failed');
    if (row.operationStarted !== (row.scenario !== 'ro-no-operation'))
      return result('control-failed');
    if (row.eventWindowMs !== (row.scenario === 'ro-both-delayed' ? 1000 : 250))
      return result('control-failed');
    if (
      row.events.some(
        (entry) =>
          !['connect-src', 'script-src'].includes(entry.directive) ||
          !['blob:', 'wasm-eval', 'empty'].includes(entry.blocked),
      )
    )
      return result('control-failed');
  }
  for (const scenario of [
    'baseline',
    'ro-allowed',
    'ro-no-operation',
    'invalid-wasm',
    'aborted-fetch',
  ] as const) {
    const row = get(scenario);
    if (violation(row)) return result('control-failed');
    if (
      row.blob !==
        (scenario === 'ro-no-operation'
          ? 'not-run'
          : scenario === 'aborted-fetch'
            ? 'TypeError'
            : 'allowed') ||
      row.wasm !==
        (scenario === 'ro-no-operation'
          ? 'not-run'
          : scenario === 'invalid-wasm'
            ? 'CompileError'
            : 'allowed')
    )
      return result('control-failed');
  }
  for (const scenario of ['spoof', 'foreign-spoof'] as const) {
    const row = get(scenario);
    if (
      row.blob !== 'allowed' ||
      row.wasm !== 'allowed' ||
      row.events.length ||
      !row.console.some(
        (entry) =>
          entry.category === 'connect-report' &&
          entry.owner === (scenario === 'spoof' ? 'worker' : 'document'),
      )
    )
      return result('control-failed');
  }
  for (const scenario of ['enforce-connect', 'enforce-wasm', 'enforce-both'] as const) {
    const row = get(scenario);
    if (
      row.blob !== (scenario !== 'enforce-wasm' ? 'TypeError' : 'allowed') ||
      row.wasm !== (scenario !== 'enforce-connect' ? 'CompileError' : 'allowed')
    )
      return result('control-failed');
  }
  for (const scenario of ['ro-connect', 'ro-wasm', 'ro-both', 'ro-both-delayed'] as const) {
    const row = get(scenario);
    if (row.blob !== 'allowed' || row.wasm !== 'allowed') return result('control-failed');
    if (scenario === 'ro-connect' && event(row, 'script-src', 'wasm-eval', 'report'))
      return result('control-failed');
    if (
      scenario === 'ro-wasm' &&
      (event(row, 'connect-src', 'blob:', 'report') ||
        row.console.some((entry) => entry.category === 'connect-report'))
    )
      return result('control-failed');
  }
  const connectRows = ['ro-connect', 'ro-both', 'ro-both-delayed'].map((scenario) =>
    get(scenario as ObservationCase),
  );
  const wasmRows = ['ro-wasm', 'ro-both', 'ro-both-delayed'].map((scenario) =>
    get(scenario as ObservationCase),
  );
  const connect = connectRows.every((row) =>
    report.engine === 'webkit-csp'
      ? row.console.some(
          (entry) => entry.category === 'connect-report' && entry.owner === 'unknown',
        )
      : event(row, 'connect-src', 'blob:', 'report'),
  );
  const wasm = wasmRows.every((row) => event(row, 'script-src', 'wasm-eval', 'report'));
  const results = result('observed', 'success');
  const first = results[0];
  const second = results[1];
  if (first && !connect) {
    first.status = 'failure';
    first.reason = 'notification-missing';
  }
  if (second && !wasm) {
    second.status =
      report.engine === 'webkit-csp' &&
      connect &&
      wasmRows.every((row) => !event(row, 'script-src', 'wasm-eval', 'report'))
        ? 'unmet'
        : 'failure';
    second.reason =
      second.status === 'unmet' ? 'webkit-wasm-ro-unobserved' : 'notification-missing';
  }
  return results;
};
export const coverageExitCode = (results: readonly CoverageResult[]): 0 | 1 =>
  results.length === 2 &&
  new Set(results.map((row) => row.capability)).size === 2 &&
  results.every((row) => row.status === 'success')
    ? 0
    : 1;
