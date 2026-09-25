import { expect, it } from 'vitest';
import { PROVIDER_WASM_SHA256 } from '../../shared/search/lexical-analyzer.js';

it('同一公式WASMを使うfresh Worker 2起動で1867入力のparityとoffsetが成立する', async () => {
  const wasm = new URL('../../node_modules/@libraz/suzume/dist/suzume.wasm', import.meta.url).href;
  for (let boot = 0; boot < 2; boot++) {
    const worker = new Worker(new URL('./helpers/lexical-analyzer-worker.ts', import.meta.url), {
      type: 'module',
    });
    try {
      const result = await new Promise<unknown>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<unknown>) => resolve(event.data);
        worker.onerror = (event) => reject(new Error(event.message));
        worker.postMessage(wasm);
      });
      expect(result).toEqual({ count: 1867, digest: PROVIDER_WASM_SHA256, nodeIndexLoad: true });
    } finally {
      worker.terminate();
    }
  }
}, 60000);
