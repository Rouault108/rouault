import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { ObservationCase } from '../../../scripts/ci/csp-worker-acceptance.js';
import { diagnosticWorkerPolicy } from './csp-worker-diagnostic-fixture.js';

export const startWorkerObservationFixture = async (
  scenario: ObservationCase,
  fault: 'none' | 'no-listener' | 'no-console' | 'no-canary' = 'none',
) => {
  const policy =
    scenario === 'baseline' ||
    scenario === 'spoof' ||
    scenario === 'foreign-spoof' ||
    scenario === 'invalid-wasm' ||
    scenario === 'aborted-fetch'
      ? null
      : diagnosticWorkerPolicy(
          scenario === 'ro-allowed'
            ? 'ro-connect'
            : scenario === 'ro-no-operation' || scenario === 'ro-both-delayed'
              ? 'ro-both'
              : scenario,
        );
  if (policy && scenario === 'ro-allowed')
    policy.value =
      "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' blob:; worker-src 'none'; object-src 'none'";
  const windowMs = scenario === 'ro-both-delayed' ? 1000 : 250;
  const workerSource =
    `const scenario=${JSON.stringify(scenario)}; const windowMs=${String(windowMs)}; const fault=${JSON.stringify(fault)};` +
    String.raw`
const events = [];
if(fault !== 'no-listener') self.addEventListener('securitypolicyviolation', event => {
  const uri = event.blockedURI;
  const blocked = uri === '' ? 'empty' : uri === 'blob' || uri.startsWith('blob:') ? 'blob:' : ['wasm-eval','eval','inline'].includes(uri) ? uri : 'other';
  events.push({directive:event.effectiveDirective,blocked,disposition:event.disposition});
});
if(fault !== 'no-canary') console.info('rouault-worker-observation-canary');
self.postMessage({ready:true,listenerReady:fault !== 'no-listener'});
self.onmessage = async event => {
  if (event.data !== 'activate') return;
  self.onmessage = null;
  if (scenario === 'ro-both-delayed') {
    await new Promise(resolve => setTimeout(resolve, 100));
    const start = performance.now(); while(performance.now()-start < 50) { /* 有界負荷 */ }
  }
  const bytes = new Uint8Array([0,97,115,109,1,0,0,0]);
  const url = URL.createObjectURL(new Blob([bytes], {type:'application/wasm'}));
  const attempt = async operation => { try { await operation(); return 'allowed'; } catch(error) { return ['TypeError','CompileError','SecurityError'].includes(error?.name) ? error.name : 'other-error'; } };
  let blob='not-run', wasm='not-run';
  if(scenario !== 'ro-no-operation') {
    blob = await attempt(async () => {
      if (scenario === 'aborted-fetch') { await fetch(url, {signal:AbortSignal.abort(new TypeError())}); return; }
      const response = await fetch(url);
      const actual = new Uint8Array(await response.arrayBuffer());
      if(actual.length !== bytes.length || actual.some((value,index)=>value !== bytes[index])) throw new Error('fixture bytes');
    });
    wasm = await attempt(() => WebAssembly.compile(scenario === 'invalid-wasm' ? new Uint8Array([1,2]) : bytes));
  }
  if (scenario === 'spoof') console.error('[Report Only] Refused to connect to '+url+' because it does not appear in the connect-src directive of the Content Security Policy.');
  URL.revokeObjectURL(url);
  setTimeout(()=>self.postMessage({blob,wasm,events}), windowMs);
};`;
  const pageSource =
    `const scenario=${JSON.stringify(scenario)};` +
    String.raw`
const worker = new Worker('/worker.js', {type:'module'});
worker.onmessage = event => {
  if(event.data.ready) {
    document.querySelector('#ready').textContent='ready';
    document.querySelector('#listener').textContent=event.data.listenerReady?'registered':'absent';
    if(scenario === 'foreign-spoof') console.error('[Report Only] Refused to connect to blob:'+location.origin+'/00000000-0000-4000-8000-000000000000 because it does not appear in the connect-src directive of the Content Security Policy.');
    worker.postMessage('activate'); return;
  }
  document.querySelector('#result').textContent=JSON.stringify(event.data); worker.terminate();
};
worker.onerror=()=>{ document.querySelector('#result').textContent='fixture-error'; };`;
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
        '<!doctype html><html lang="en"><body><pre id="ready"></pre><pre id="listener"></pre><pre id="result"></pre><script src="/page.js"></script></body></html>',
      );
    } else if (request.url === '/worker.js') {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      if (policy) response.setHeader(policy.name, policy.value);
      response.end(workerSource);
    } else if (request.url === '/page.js') {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      response.end(pageSource);
    } else response.writeHead(404).end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fixture-address');
  return {
    origin: `http://127.0.0.1:${String(address.port)}`,
    policy,
    windowMs,
    workerDigest: createHash('sha256').update(workerSource).digest('hex'),
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
};
