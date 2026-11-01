import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { CspStageOneManifest } from '../../../build/security/csp-report-only.js';
import { digest } from './csp-wasm-fixture.js';
import { wasmInstrumentation } from './csp-wasm-instrumentation.js';
import { wasmCasePolicy } from '../../../scripts/ci/csp-wasm-evidence.js';

export const WORKER_WASM_CASES = [
  'worker-stream-allow',
  'worker-bytes-allow',
  'worker-stream-deny',
  'worker-bytes-deny',
  'worker-js-control',
  'worker-diagnostic-off',
  'worker-shared-fault',
] as const;
export type WorkerWasmCase = (typeof WORKER_WASM_CASES)[number];
export const workerWasmVariant = (caseId: WorkerWasmCase, original: string, policy: string) => {
  const selection = caseId.includes('bytes') ? 'bytes' : 'streaming';
  // JS許可対照だけを隔離応答で変更する。製品の許可集合へ戻さない。
  const checkedPolicy = wasmCasePolicy(caseId, '', policy);
  return {
    selection,
    policy: checkedPolicy,
    body: `${wasmInstrumentation(selection, caseId === 'worker-shared-fault')}\n${original}`,
  };
};

// 専用CSP previewだけのHTTP fixture。通常preview/配信artifactには接続しない。
export const createWasmWorkerHttpMiddleware = async (
  dist: string,
  manifest: CspStageOneManifest,
) => {
  const worker = manifest.rules.find((rule) => rule.context === 'worker');
  if (!worker) throw new Error('wasm-worker-missing');
  const file = worker.pattern.slice(manifest.basePath.length).replace(/^\//u, '');
  const original = await readFile(path.resolve(dist, file), 'utf8');
  if (manifest.assets.find((asset) => asset.file === file)?.sha256 !== digest(original))
    throw new Error('wasm-worker-identity');
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    const caseId = request.headers['x-rouault-csp-wasm-case'];
    const pathname = new URL(request.url ?? '/', 'http://preview.local').pathname;
    if (caseId === undefined || pathname !== worker.pattern) {
      next();
      return;
    }
    if (
      typeof caseId !== 'string' ||
      !WORKER_WASM_CASES.includes(caseId as WorkerWasmCase) ||
      !['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(request.socket.remoteAddress ?? '')
    ) {
      response.writeHead(400).end();
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end();
      return;
    }
    const fixture = workerWasmVariant(caseId as WorkerWasmCase, original, worker.policy);
    response.removeHeader('Content-Security-Policy-Report-Only');
    response.setHeader('Content-Security-Policy', fixture.policy);
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Rouault-Csp-Fixture-Digest', digest(fixture.body));
    response.statusCode = 200;
    response.end(request.method === 'HEAD' ? undefined : fixture.body);
  };
};
