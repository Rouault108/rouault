import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { PROVIDER_WASM_SHA256 } from '../../../shared/search/lexical-provider-config.js';
import { firefoxConsoleText, scriptDirective, consoleApiLine } from './csp-wasm-console.js';
import { wasmInstrumentation } from './csp-wasm-instrumentation.js';

export const wasmPolicy = (parent: string, allowWasm: boolean, allowJs = false): string =>
  parent.replace(
    /script-src ([^;]+)/u,
    (_all: string, sources: string) =>
      `script-src ${sources}${allowWasm ? " 'wasm-unsafe-eval'" : ''}${allowJs ? " 'unsafe-eval'" : ''}`,
  );
export const digest = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');

export const suzumeFixtureBytes = async () => {
  const root = dirname(createRequire(import.meta.url).resolve('@libraz/suzume/package.json'));
  const wasm = await readFile(join(root, 'dist/suzume.wasm'));
  const glue = await readFile(join(root, 'dist/suzume.js'));
  if (
    digest(wasm) !== PROVIDER_WASM_SHA256 ||
    digest(glue) !== '8b07ad2c426ea641f04ed8914b60178f9942bf70bc041381b1656173e6941e34'
  )
    throw new Error('wasm-fixture-identity');
  return { wasm, glue };
};
export const startDocumentWasmFixture = async (options: {
  parentPolicy: string;
  allowWasm: boolean;
  allowJs: boolean;
  selection: 'streaming' | 'bytes';
  measurementFault?: boolean;
  consoleFault?: 'wasm-spoof' | 'image-csp' | 'short-csp';
}) => {
  const { wasm, glue } = await suzumeFixtureBytes();
  const policy = wasmPolicy(options.parentPolicy, options.allowWasm, options.allowJs);
  const consoleFault = options.consoleFault;
  const baseSource =
    `import createModule from './suzume.js';\n${wasmInstrumentation(options.selection, options.measurementFault)}\n` +
    String.raw`
globalThis.__cspDocumentResult={initialized:false,done:false};
try{const module=await createModule({locateFile:path=>path.endsWith('.wasm')?'/suzume.wasm':path});globalThis.__cspDocumentResult.initialized=module.UTF8ToString(module._suzume_version())==='0.9.11';}catch{}
globalThis.__cspDocumentResult.done=true;
`;
  const faultText =
    consoleFault === 'wasm-spoof'
      ? firefoxConsoleText(
          scriptDirective(policy),
          'wasm',
          'http://fixture.invalid/page.js',
          consoleApiLine({ code: baseSource, engine: 'firefox-csp' }, 'streaming'),
        )
      : consoleFault === 'image-csp'
        ? "Refused to load image 'http://fixture.invalid/image.png' because it violates the Content Security Policy directive: img-src 'none'"
        : 'unsafe-eval';
  const pageSource =
    baseSource +
    (consoleFault
      ? `\nconsole.error(${JSON.stringify(faultText)}.replaceAll('http://fixture.invalid',location.origin));`
      : '');
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET') {
      response.writeHead(405).end();
      return;
    }
    if (request.url === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Content-Security-Policy', policy);
      response.end(
        '<!doctype html><html lang="en"><body><script type="module" src="/page.js"></script></body></html>',
      );
    } else if (request.url === '/page.js' || request.url === '/suzume.js') {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      response.end(request.url === '/page.js' ? pageSource : glue);
    } else if (request.url === '/suzume.wasm') {
      response.setHeader('Content-Type', 'application/wasm');
      response.end(wasm);
    } else response.writeHead(404).end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('wasm-fixture-address');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    policy,
    glueDigest: digest(glue),
    pageDigest: digest(pageSource),
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
};
