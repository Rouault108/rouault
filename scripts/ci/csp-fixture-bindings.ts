import { readFile } from 'node:fs/promises';
import { cspFingerprint } from './csp-notification-registry.js';

export const wasmFixtureFingerprint = async (): Promise<string> =>
  cspFingerprint(
    Buffer.concat(
      await Promise.all(
        [
          'test/e2e/support/csp-wasm-instrumentation.ts',
          'test/e2e/support/csp-wasm-fixture.ts',
          'test/e2e/support/csp-wasm-worker-http.ts',
        ].map((file) => readFile(file)),
      ),
    ),
  );
