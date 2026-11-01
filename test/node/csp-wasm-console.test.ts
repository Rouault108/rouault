import { describe, expect, it } from 'vitest';
import {
  classifyWasmConsole,
  firefoxConsoleText,
  chromiumEvalConsoleText,
  consoleApiLine,
  scriptDirective,
  readNativeConsoleErrors,
  type WasmConsoleScope,
  type WasmConsoleRecord,
} from '../e2e/support/csp-wasm-console.js';
import { wasmInstrumentation } from '../e2e/support/csp-wasm-instrumentation.js';
import { stageInputFixture } from './helpers/csp-stage-fixture.js';
const fixture = (engine: WasmConsoleScope['engine'] = 'firefox-csp') => {
  const data = stageInputFixture();
  const measurement = data.wasm.rows.find((r) => r.caseId === 'document-stream-deny')?.measurement;
  if (!measurement) throw new Error('fixture');
  const scope: WasmConsoleScope = {
    sourceVerified: true,
    engine,
    caseId: 'document-stream-deny',
    policy: "default-src 'none'; script-src 'self'; img-src 'none'",
    parentPolicy: null,
    codeUrl: 'http://127.0.0.1:4173/page.js',
    code: `import createModule from './suzume.js';\n${wasmInstrumentation('streaming')}`,
    glueUrls: ['http://127.0.0.1:4173/suzume.js'],
    appUrl: null,
    measurement,
    errors: [
      { api: 'streaming', detail: 'CompileError: WebAssembly CSP rejection' },
      { api: 'bytes', detail: 'CompileError: WebAssembly CSP rejection' },
    ],
  };
  const record: WasmConsoleRecord = {
    text: firefoxConsoleText(
      scriptDirective(scope.policy),
      'wasm',
      scope.codeUrl,
      consoleApiLine(scope, 'streaming'),
    ),
    type: 'error',
    args: 1,
    url: scope.codeUrl,
    line: consoleApiLine(scope, 'streaming'),
    owner: 'document',
    catalogPrefix: false,
  };
  return { scope, record };
};
describe('case-bound real WASM console classification', () => {
  it('recognizes the full native format only at the verified API callsite', () => {
    const { scope, record } = fixture();
    expect(classifyWasmConsole(record, scope)).toBe('wasm-notification');
    const chrome = fixture('chromium-csp');
    chrome.record.args = 0;
    chrome.record.line = consoleApiLine(chrome.scope, 'timer');
    chrome.record.text = chromiumEvalConsoleText(scriptDirective(chrome.scope.policy));
    expect(classifyWasmConsole(chrome.record, chrome.scope)).toBe('js-rejection');
  });
  it.each([
    'unsafe-eval',
    'Content Security Policy unsafe-eval',
    'Refused unsafe-eval',
    'Refused to load image http://127.0.0.1/image.png because it violates Content Security Policy img-src',
    'Refused to compile WebAssembly because unsafe-eval',
    'CSP changed unknown',
    '拒否 script-src',
  ])('rejects non-target or abbreviated %s', (text) => {
    const { scope, record } = fixture();
    record.text = text;
    expect(classifyWasmConsole(record, scope)).toBe('unknown');
  });
  it.each([
    'owner',
    'source-bytes',
    'missing-url',
    'foreign-url',
    'author-line',
    'directive',
    'policy',
    'api',
    'mode',
    'engine',
    'trailing-text',
    'argument-shape',
    'type',
  ])('rejects mismatched identity or author imitation: %s', (mutation) => {
    const { scope, record } = fixture();
    if (mutation === 'owner') record.owner = 'unknown';
    if (mutation === 'missing-url') record.url = '';
    if (mutation === 'foreign-url') record.url = 'http://127.0.0.1:4173/author.js';
    if (mutation === 'author-line') record.line++;
    if (mutation === 'directive') record.text = record.text.replaceAll('script-src', 'img-src');
    if (mutation === 'policy') scope.policy = "script-src 'none'";
    if (mutation === 'api') scope.measurement.calls = [];
    if (mutation === 'mode') scope.caseId = 'document-stream-allow';
    if (mutation === 'engine') scope.engine = 'chromium-csp';
    if (mutation === 'trailing-text') record.text += ' unsafe-eval';
    if (mutation === 'argument-shape') record.args = 0;
    if (mutation === 'type') record.type = 'log';
    expect(classifyWasmConsole(record, scope)).toBe('unknown');
  });
  it('does not accept an authored imitation of Chromium native CSP output', () => {
    const { scope, record } = fixture('chromium-csp');
    record.text = chromiumEvalConsoleText(scriptDirective(scope.policy));
    record.line = consoleApiLine(scope, 'timer');
    record.args = 1;
    expect(classifyWasmConsole(record, scope)).toBe('unknown');
  });
  it('correlates glue with the actual native API error, source and case', () => {
    const { scope, record } = fixture();
    record.url = scope.glueUrls[0] ?? '';
    record.line = 0;
    record.text = 'wasm streaming compile failed: CompileError: WebAssembly CSP rejection';
    expect(classifyWasmConsole(record, scope)).toBe('glue');
    scope.errors = [];
    expect(classifyWasmConsole(record, scope)).toBe('unknown');
    const other = fixture();
    other.record.url = other.scope.glueUrls[0] ?? '';
    other.record.line = 0;
    other.record.text =
      'wasm streaming compile failed: CompileError: WebAssembly CSP rejection img-src';
    expect(classifyWasmConsole(other.record, other.scope)).toBe('unknown');
  });
  it('keeps unknown-owner warnings unknown and never counts endpoint warnings as notifications', () => {
    const { scope, record } = fixture();
    scope.parentPolicy = 'fixed';
    record.owner = 'document';
    record.url = '';
    record.line = 0;
    record.type = 'warning';
    record.args = 0;
    record.text =
      "The Content Security Policy 'fixed' was delivered in report-only mode, but does not specify a 'report-to'; the policy will have no effect. Please either add a 'report-to' directive, or deliver the policy via the 'Content-Security-Policy' header.";
    expect(classifyWasmConsole(record, scope)).toBe('warning');
    record.owner = 'unknown';
    expect(classifyWasmConsole(record, scope)).toBe('unknown');
  });
  it('rejects malformed ephemeral witnesses instead of saving raw values', () => {
    expect(() =>
      readNativeConsoleErrors([{ api: 'streaming', detail: 'x', url: 'secret' }]),
    ).toThrow();
    expect(() => readNativeConsoleErrors([{ api: 'other', detail: 'x' }])).toThrow();
    expect(() => readNativeConsoleErrors(null)).toThrow();
    expect(() =>
      readNativeConsoleErrors(Array.from({ length: 9 }, () => ({ api: 'bytes', detail: 'x' }))),
    ).toThrow();
    expect(() => readNativeConsoleErrors([{ api: 'bytes', detail: 'x'.repeat(4097) }])).toThrow();
  });
});
