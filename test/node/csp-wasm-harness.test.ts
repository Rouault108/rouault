import { describe, expect, it } from 'vitest';
import { wasmInstrumentation } from '../e2e/support/csp-wasm-instrumentation.js';
import { workerWasmVariant } from '../e2e/support/csp-wasm-worker-http.js';
import {
  CSP_FIXED_WORKER_CASES,
  cspFingerprint,
} from '../../scripts/ci/csp-notification-registry.js';
import { startWorkerObservationFixture } from '../e2e/support/csp-worker-observation-fixture.js';
import { readWasmRow } from '../../scripts/ci/csp-wasm-evidence.js';
import { stageInputFixture } from './helpers/csp-stage-fixture.js';
import { assembleCspAcceptance, evaluateCspStage } from '../../scripts/ci/csp-stage-acceptance.js';

import { classifyDocumentConsole } from '../e2e/support/csp-registry-evidence.js';

const required = <T>(value: T | undefined | null): T => {
  if (value === null || value === undefined) throw new Error('fixture');
  return value;
};
describe('CSP harness identity and minimized evidence', () => {
  it('keeps all fourteen reviewed small-module fixture and policy identities', async () => {
    for (const expected of CSP_FIXED_WORKER_CASES) {
      const actual = await startWorkerObservationFixture(
        expected.caseId as Parameters<typeof startWorkerObservationFixture>[0],
      );
      try {
        expect(
          cspFingerprint(
            new Uint8Array(await (await fetch(actual.origin + '/worker.js')).arrayBuffer()),
          ),
        ).toBe(expected.fixtureDigest);
        expect(cspFingerprint(actual.policy?.value ?? 'no-policy')).toBe(
          expected.policyFingerprint,
        );
      } finally {
        await actual.close();
      }
    }
  });
  it('changes only the WASM permission between the actual Worker allow and deny pair', () => {
    const policy =
      "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' blob:; worker-src 'none'; object-src 'none'";
    for (const selection of ['stream', 'bytes']) {
      const allow = workerWasmVariant(
        `worker-${selection}-allow` as 'worker-stream-allow',
        'const app=1;',
        policy,
      );
      const deny = workerWasmVariant(
        `worker-${selection}-deny` as 'worker-stream-deny',
        'const app=1;',
        policy,
      );
      expect(allow.body).toBe(deny.body);
      expect(allow.policy.replace(" 'wasm-unsafe-eval'", '')).toBe(deny.policy);
      expect(deny.policy).not.toContain('unsafe-eval');
    }
    expect(wasmInstrumentation('bytes')).toContain("'non-streaming-mime'");
  });
  it('recognizes only known document CSP families and keeps changed wording unknown', () => {
    for (const text of [
      'Setting base URI violates the following Content Security Policy directive: base-uri',
      'Executing inline script violates Content Security Policy directive script-src',
      'Content-Security-Policy: The page settings would block script-src-elem',
      '[JavaScript Error: "Content-Security-Policy: (Report-Only policy) block script-src-elem"]',
      '[Report Only] Refused inline script because of the Content Security Policy script-src',
    ])
      expect(classifyDocumentConsole(text, 'fixed')).toBe('violation');
    for (const text of [
      'Refused something script-src',
      'CSP new wording script-src',
      'unrelated console',
    ])
      expect(classifyDocumentConsole(text, 'fixed')).toBe('unknown');
  });
  it.each(['secret', 'url', 'console', 'query', 'scriptSample'])(
    'rejects unapproved retained %s',
    (key) => {
      const f = stageInputFixture();
      Reflect.set(required(f.wasm.rows[0]), key, 'sensitive-sentinel');
      expect(() => readWasmRow(f.wasm.rows[0])).toThrow();
      expect(() => assembleCspAcceptance(f)).toThrow();
    },
  );
  it('keeps only explicit environment metadata and binds the full verified manifest', () => {
    const f = stageInputFixture();
    const { evidence } = assembleCspAcceptance(f);
    expect(Object.keys(evidence.environment).sort()).toEqual(
      [
        'engine',
        'browserVersion',
        'playwrightVersion',
        'observerVersion',
        'locale',
        'nodeVersion',
        'pnpmVersion',
        'containerDigest',
      ].sort(),
    );
    expect(evidence.artifacts.find((r) => r.id === 'manifest')?.digest).toBe(f.manifestDigest);
    Reflect.set(f, 'staticVerified', false);
    const failed = assembleCspAcceptance(f).evidence;
    expect(failed.trials.find((r) => r.id === 'A-static')?.status).toBe('fail');
    expect(
      evaluateCspStage(failed, { stage: 1, phase: 'internal', publicationApproved: false }).status,
    ).toBe('stop');
  });
});
