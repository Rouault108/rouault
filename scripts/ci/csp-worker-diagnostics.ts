export const WORKER_DIAGNOSTIC_CASES = [
  'baseline',
  'ro-connect',
  'ro-wasm',
  'ro-both',
  'enforce-connect',
  'enforce-wasm',
  'enforce-both',
] as const;
export type WorkerDiagnosticCase = (typeof WORKER_DIAGNOSTIC_CASES)[number];
export type ConsoleCategory =
  | 'canary'
  | 'missing-endpoint'
  | 'connect-violation'
  | 'wasm-violation'
  | 'other-csp'
  | 'unclassified';
export type OperationResult =
  | 'allowed'
  | 'TypeError'
  | 'CompileError'
  | 'SecurityError'
  | 'other-error';
export interface WorkerProbe {
  events: { directive: string; blocked: string; disposition: string }[];
  blob: OperationResult;
  wasm: OperationResult;
}
export interface WorkerDiagnosticRow extends WorkerProbe {
  scenario: WorkerDiagnosticCase;
  console: { category: ConsoleCategory; owner: 'worker' | 'document' | 'unknown' }[];
}
export interface WorkerDiagnosticReport {
  schema: 1;
  engine: string;
  browserVersion: string;
  buildId: string;
  eventWindowMs: 250;
  rows: WorkerDiagnosticRow[];
}

// これはnative consoleの分類であり、イベントやWASM実行結果の代替にはしない。
export const classifyWorkerConsole = (text: string): ConsoleCategory => {
  if (text === 'rouault-worker-diagnostic-canary') return 'canary';
  if (
    /^The Content Security Policy '.+' was delivered in report-only mode, but does not specify a 'report-(?:to|uri)';/u.test(
      text,
    )
  )
    return 'missing-endpoint';
  if (!/content.security.policy|\bcsp\b|\[Report Only\]/iu.test(text)) return 'unclassified';
  if (/connect-src/iu.test(text) && /blob:/iu.test(text)) return 'connect-violation';
  if (/script-src/iu.test(text) && /WebAssembly|wasm-unsafe-eval|wasm-eval/iu.test(text))
    return 'wasm-violation';
  return 'other-csp';
};
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid diagnostic object');
  return value as Record<string, unknown>;
};
const array = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) throw new Error('Invalid diagnostic sequence');
  return value;
};
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): void => {
  if (Object.keys(value).sort().join(',') !== [...keys].sort().join(','))
    throw new Error('Unexpected diagnostic fields');
};
const operation = (value: unknown): OperationResult => {
  if (
    value !== 'allowed' &&
    value !== 'TypeError' &&
    value !== 'CompileError' &&
    value !== 'SecurityError' &&
    value !== 'other-error'
  )
    throw new Error('Invalid operation result');
  return value;
};
export const readWorkerProbe = (value: unknown): WorkerProbe => {
  const probe = object(value);
  exactKeys(probe, ['blob', 'wasm', 'events']);
  return {
    blob: operation(probe['blob']),
    wasm: operation(probe['wasm']),
    events: array(probe['events']).map((value) => {
      const event = object(value);
      exactKeys(event, ['directive', 'blocked', 'disposition']);
      if (
        typeof event['directive'] !== 'string' ||
        !/^[a-z-]{1,40}$/u.test(event['directive']) ||
        !['blob:', 'wasm-eval', 'eval', 'inline', 'empty', 'other'].includes(
          String(event['blocked']),
        ) ||
        (event['disposition'] !== 'report' && event['disposition'] !== 'enforce')
      )
        throw new Error('Invalid diagnostic event');
      return {
        directive: event['directive'],
        blocked: String(event['blocked']),
        disposition: event['disposition'],
      };
    }),
  };
};
export const validateWorkerDiagnosticReport = (value: unknown): WorkerDiagnosticReport => {
  const report = object(value);
  exactKeys(report, ['schema', 'engine', 'browserVersion', 'buildId', 'eventWindowMs', 'rows']);
  if (
    report['schema'] !== 1 ||
    !['chromium-csp', 'firefox-csp', 'webkit-csp'].includes(String(report['engine'])) ||
    typeof report['browserVersion'] !== 'string' ||
    !/^[0-9.a-zA-Z ()-]{1,80}$/u.test(report['browserVersion']) ||
    typeof report['buildId'] !== 'string' ||
    !/^(?:[a-f0-9]{7,40}|local)$/u.test(report['buildId']) ||
    report['eventWindowMs'] !== 250
  )
    throw new Error('Invalid diagnostic metadata');
  const rows = array(report['rows']).map((value) => {
    const row = object(value);
    exactKeys(row, ['scenario', 'console', 'blob', 'wasm', 'events']);
    if (!WORKER_DIAGNOSTIC_CASES.includes(row['scenario'] as WorkerDiagnosticCase))
      throw new Error('Invalid diagnostic scenario');
    const probe = readWorkerProbe({ blob: row['blob'], wasm: row['wasm'], events: row['events'] });
    const consoleRows = array(row['console']).map(
      (value): WorkerDiagnosticRow['console'][number] => {
        const entry = object(value);
        exactKeys(entry, ['category', 'owner']);
        if (
          ![
            'canary',
            'missing-endpoint',
            'connect-violation',
            'wasm-violation',
            'other-csp',
            'unclassified',
          ].includes(String(entry['category'])) ||
          (entry['owner'] !== 'worker' &&
            entry['owner'] !== 'document' &&
            entry['owner'] !== 'unknown')
        )
          throw new Error('Invalid console diagnostic');
        return { category: entry['category'] as ConsoleCategory, owner: entry['owner'] };
      },
    );
    return { ...probe, scenario: row['scenario'] as WorkerDiagnosticCase, console: consoleRows };
  });
  if (
    rows.length !== WORKER_DIAGNOSTIC_CASES.length ||
    new Set(rows.map((row) => row.scenario)).size !== WORKER_DIAGNOSTIC_CASES.length
  )
    throw new Error('Incomplete diagnostic scenarios');
  return {
    schema: 1,
    engine: String(report['engine']),
    browserVersion: report['browserVersion'],
    buildId: report['buildId'],
    eventWindowMs: 250,
    rows,
  };
};

// CI annotationは今回生成する診断の最小項目だけを出し、生consoleやURLを転送しない。
export const workerDiagnosticNotices = (value: unknown): string[] => {
  const report = validateWorkerDiagnosticReport(value);
  const escape = (text: string) =>
    text.replace(/%/gu, '%25').replace(/\r/gu, '%0D').replace(/\n/gu, '%0A');
  return report.rows.map(
    (row) =>
      `::notice title=CSP Worker diagnostic ${report.engine}::${escape(JSON.stringify({ engine: report.engine, browserVersion: report.browserVersion, buildId: report.buildId, eventWindowMs: report.eventWindowMs, ...row }))}`,
  );
};
