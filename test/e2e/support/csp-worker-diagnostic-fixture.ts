import { createServer } from 'node:http';
import type { WorkerDiagnosticCase } from '../../../scripts/ci/csp-worker-diagnostics.js';
import { WORKER_DIAGNOSTIC_CASES } from '../../../scripts/ci/csp-worker-diagnostics.js';

export const diagnosticWorkerPolicy = (
  scenario: WorkerDiagnosticCase,
): { name: string; value: string } | null => {
  if (scenario === 'baseline') return null;
  const denyBlob = scenario.endsWith('connect') || scenario.endsWith('both');
  const denyWasm = scenario.endsWith('wasm') || scenario.endsWith('both');
  return {
    name: scenario.startsWith('ro-')
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy',
    value: `default-src 'none'; script-src 'self'${denyWasm ? '' : " 'wasm-unsafe-eval'"}; connect-src 'self'${denyBlob ? '' : ' blob:'}; worker-src 'none'; object-src 'none'`,
  };
};
const workerSource = String.raw`
const events = [];
self.addEventListener('securitypolicyviolation', event => {
  const uri = event.blockedURI;
  const blocked = uri === '' ? 'empty' : uri === 'blob' || uri.startsWith('blob:') ? 'blob:' : ['wasm-eval','eval','inline'].includes(uri) ? uri : 'other';
  events.push({directive:event.effectiveDirective, blocked, disposition:event.disposition});
});
console.info('rouault-worker-diagnostic-canary');
const result = async operation => {
  try { await operation(); return 'allowed'; }
  catch (error) { return ['TypeError','CompileError','SecurityError'].includes(error?.name) ? error.name : 'other-error'; }
};
(async () => {
  const bytes = new Uint8Array([0,97,115,109,1,0,0,0]);
  const url = URL.createObjectURL(new Blob([bytes], {type:'application/wasm'}));
  const blob = await result(async () => {
    const response = await fetch(url);
    const actual = new Uint8Array(await response.arrayBuffer());
    if (actual.length !== bytes.length || actual.some((value,index)=>value !== bytes[index])) throw new Error('fixture bytes');
  });
  URL.revokeObjectURL(url);
  const wasm = await result(() => WebAssembly.compile(bytes));
  setTimeout(() => self.postMessage({blob,wasm,events}), 250);
})();`;
const pageSource = String.raw`
const worker = new Worker('/worker.js', {type:'module'});
worker.onmessage = event => { document.querySelector('#result').textContent = JSON.stringify(event.data); worker.terminate(); };
worker.onerror = () => { document.querySelector('#result').textContent = JSON.stringify({fixtureError:true}); };`;

export const startWorkerDiagnosticFixture = async (scenario: WorkerDiagnosticCase) => {
  if (!WORKER_DIAGNOSTIC_CASES.includes(scenario)) throw new Error('Unknown diagnostic fixture');
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET') {
      response.writeHead(405).end();
      return;
    }
    if (request.url === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(
        '<!doctype html><html><head><meta charset="utf-8"></head><body><pre id="result"></pre><script src="/page.js"></script></body></html>',
      );
    } else if (request.url === '/page.js' || request.url === '/worker.js') {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      if (request.url === '/worker.js') {
        const policy = diagnosticWorkerPolicy(scenario);
        if (policy) response.setHeader(policy.name, policy.value);
        response.end(workerSource);
      } else response.end(pageSource);
    } else response.writeHead(404).end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing diagnostic address');
  return {
    origin: `http://127.0.0.1:${String(address.port)}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
};
