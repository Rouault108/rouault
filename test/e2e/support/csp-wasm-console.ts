import type { WasmCase, WasmMeasurement } from '../../../scripts/ci/csp-wasm-evidence.js';
import {
  evidenceObject,
  evidenceKeys,
  evidenceEnum,
  evidenceSequence,
} from '../../../scripts/ci/csp-evidence-values.js';

export type ConsoleApi = 'streaming' | 'bytes' | 'eval' | 'function' | 'timer';
export interface NativeConsoleError {
  api: ConsoleApi;
  detail: string;
}
export interface WasmConsoleRecord {
  text: string;
  type: string;
  args: number;
  url: string;
  line: number;
  owner: 'document' | 'worker' | 'unknown';
  catalogPrefix: boolean;
}
export interface WasmConsoleScope {
  sourceVerified: boolean;
  engine: 'chromium-csp' | 'firefox-csp' | 'webkit-csp';
  caseId: WasmCase;
  policy: string;
  parentPolicy: string | null;
  codeUrl: string;
  code: string;
  glueUrls: readonly string[];
  appUrl: string | null;
  measurement: WasmMeasurement;
  errors: readonly NativeConsoleError[];
}
export type WasmConsoleCategory =
  | 'js-rejection'
  | 'wasm-notification'
  | 'glue'
  | 'warning'
  | 'catalog'
  | 'unknown';
const APIs: readonly ConsoleApi[] = ['streaming', 'bytes', 'eval', 'function', 'timer'];
export const readNativeConsoleErrors = (value: unknown): NativeConsoleError[] =>
  evidenceSequence(value, 8).map((value) => {
    const r = evidenceObject(value);
    evidenceKeys(r, ['api', 'detail']);
    if (typeof r['detail'] !== 'string' || r['detail'].length > 4096)
      throw new Error('invalid-console-witness');
    return { api: evidenceEnum(r['api'], APIs), detail: r['detail'] };
  });
export const scriptDirective = (policy: string): string => {
  const values = policy
    .split(';')
    .map((x) => x.trim())
    .filter((x) => x.startsWith('script-src '));
  if (values.length !== 1 || !values[0]) throw new Error('console-policy');
  return values[0];
};
export const firefoxConsoleText = (
  directive: string,
  kind: 'js' | 'wasm',
  url: string,
  line: number,
): string => {
  const operation = kind === 'js' ? 'a JavaScript eval' : 'WebAssembly';
  const missing = kind === 'js' ? "'unsafe-eval'" : "'wasm-unsafe-eval' or 'unsafe-eval'";
  return `[JavaScript Error: "Content-Security-Policy: The page’s settings blocked ${operation} (script-src) from being executed because it violates the following directive: “${directive}” (Missing ${missing})" {file: "${url}" line: ${String(line)}}]`;
};
export const chromiumEvalConsoleText = (directive: string): string =>
  `Evaluating a string as JavaScript violates the following Content Security Policy directive because 'unsafe-eval' is not an allowed source of script: "${directive}".\n The action has been blocked.`;
// 固定WebKitのallowEval(LogToConsole::Yes)は文字列timerにこの完全形式を使う。
// 4d05d732 / ContentSecurityPolicy.cpp:allowEval, consoleMessageForViolation。
export const webkitTimerConsoleText = (): string =>
  "Refused to execute a script because 'unsafe-eval' and 'trusted-types-eval' does not appear in the script-src directive of the Content Security Policy.";
const needles: Record<ConsoleApi, string> = {
  streaming: 'cspNativeStreaming.call',
  bytes: 'cspNativeBytes.call',
  eval: 'try{cspMeasure.js.eval',
  function: 'try{cspMeasure.js.function',
  timer: 'try{setTimeout(',
};
// 固定FirefoxのCSP転送はsource行番号をそのまま返す。Chromium/WebKitは0-based。
export const consoleApiLine = (
  scope: Pick<WasmConsoleScope, 'code' | 'engine'>,
  api: ConsoleApi,
): number => {
  const rows = scope.code
    .split('\n')
    .flatMap((text, line) => (text.includes(needles[api]) ? [line] : []));
  return rows.length === 1 ? (rows[0] ?? -1) + (scope.engine === 'firefox-csp' ? 1 : 0) : -1;
};
const called = (
  scope: WasmConsoleScope,
  api: 'streaming' | 'bytes',
  error: 'CompileError' | 'TypeError',
) =>
  scope.measurement.calls.some(
    (c) => c.api === api && c.outcome === 'rejected' && c.error === error,
  );
const errorIsExpected = (scope: WasmConsoleScope, error: NativeConsoleError): boolean => {
  if (error.api !== 'streaming' && error.api !== 'bytes') return false;
  return scope.caseId.endsWith('deny')
    ? error.detail.startsWith('CompileError: ') && called(scope, error.api, 'CompileError')
    : scope.caseId.includes('bytes') &&
        error.api === 'streaming' &&
        error.detail.startsWith('TypeError: ') &&
        called(scope, 'streaming', 'TypeError');
};

// textだけでは真正性を判定しない。既知fixtureのHTTP bytes・owner・API位置との照合に限る。
export const classifyWasmConsole = (
  record: WasmConsoleRecord,
  scope: WasmConsoleScope,
): WasmConsoleCategory => {
  const worker = scope.caseId.startsWith('worker-');
  const codeOwner = worker ? 'worker' : 'document';
  if (!scope.sourceVerified || record.owner === 'unknown') return 'unknown';
  if (
    scope.parentPolicy &&
    record.owner === 'document' &&
    record.type === (scope.engine === 'webkit-csp' ? 'error' : 'warning') &&
    record.args === 0 &&
    record.text ===
      `The Content Security Policy '${scope.parentPolicy}' was delivered in report-only mode, but does not specify a 'report-to'; the policy will have no effect. Please either add a 'report-to' directive, or deliver the policy via the 'Content-Security-Policy' header.`
  )
    return 'warning';
  if (!record.url || !Number.isInteger(record.line) || record.line < 0) return 'unknown';
  if (
    worker &&
    scope.caseId.endsWith('deny') &&
    record.owner === 'document' &&
    record.url === scope.appUrl &&
    record.line === 1 &&
    record.type === 'warning' &&
    record.args === 2 &&
    record.catalogPrefix
  )
    return 'catalog';
  if (record.owner !== codeOwner || record.type !== 'error') return 'unknown';
  if (scope.glueUrls.includes(record.url) && record.line === 0 && record.args === 1) {
    for (const error of scope.errors) {
      if (!errorIsExpected(scope, error)) continue;
      const messages =
        error.api === 'streaming'
          ? [
              `wasm streaming compile failed: ${error.detail}`,
              'falling back to ArrayBuffer instantiation',
            ]
          : [`failed to asynchronously prepare wasm: ${error.detail}`, `Aborted(${error.detail})`];
      if (messages.includes(record.text)) return 'glue';
    }
    return 'unknown';
  }
  if (record.url !== scope.codeUrl) return 'unknown';
  const directive = scriptDirective(scope.policy);
  const jsAllowed = scope.caseId.endsWith('js-control');
  if (
    !jsAllowed &&
    (['eval', 'function', 'timer'] as const).some(
      (api) => record.line === consoleApiLine(scope, api),
    )
  ) {
    if (
      scope.engine === 'chromium-csp' &&
      record.args === 0 &&
      record.text === chromiumEvalConsoleText(directive)
    )
      return 'js-rejection';
    if (
      scope.engine === 'firefox-csp' &&
      record.args === 1 &&
      record.text === firefoxConsoleText(directive, 'js', record.url, record.line)
    )
      return 'js-rejection';
    if (
      scope.engine === 'webkit-csp' &&
      record.args === 0 &&
      record.line === consoleApiLine(scope, 'timer') &&
      scope.measurement.js.timer === 'rejected' &&
      !directive.split(/\s+/u).some((x) => ["'unsafe-eval'", "'trusted-types-eval'"].includes(x)) &&
      record.text === webkitTimerConsoleText()
    )
      return 'js-rejection';
  }
  if (
    scope.caseId.endsWith('deny') &&
    (['streaming', 'bytes'] as const).some(
      (api) => record.line === consoleApiLine(scope, api) && called(scope, api, 'CompileError'),
    )
  ) {
    if (
      scope.engine === 'firefox-csp' &&
      record.args === 1 &&
      record.text === firefoxConsoleText(directive, 'wasm', record.url, record.line)
    )
      return 'wasm-notification';
  }
  return 'unknown';
};
