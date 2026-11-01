import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readVerifiedCspStageOne, renderCspHeaders } from '../../build/security/csp-report-only.js';
import { PROVIDER_WASM_SHA256 } from '../../shared/search/lexical-provider-config.js';
import { coverageExitCode, CSP_BROWSER_VERSIONS } from './csp-worker-acceptance.js';
import {
  CSP_REGISTRY_VERSION,
  cspFingerprint,
  type CspEngine,
} from './csp-notification-registry.js';
import { wasmFixtureFingerprint } from './csp-fixture-bindings.js';
import { assembleCspAcceptance, allStageDecisions } from './csp-stage-acceptance.js';

export const collectCandidateAcceptance = async (engine: CspEngine) => {
  const manifest = await readVerifiedCspStageOne('dist', '.generated/csp/manifest.json');
  if (
    (await readFile('.generated/csp/report-only.headers', 'utf8')) !== renderCspHeaders(manifest) ||
    /content-security-policy/iu.test(await readFile('dist/_headers', 'utf8'))
  )
    throw new Error('publication-isolation');
  const document = manifest.rules.find((r) => r.context === 'document'),
    worker = manifest.rules.find((r) => r.context === 'worker');
  if (!document || !worker) throw new Error('policy-class');
  const workerFile = worker.pattern.slice(manifest.basePath.length).replace(/^\//u, '');
  const workerAsset = manifest.assets.find((r) => r.file === workerFile);
  if (!workerAsset) throw new Error('worker-artifact');
  const json = async (name: string): Promise<unknown> =>
    JSON.parse(await readFile(`.generated/csp/${name}.json`, 'utf8')) as unknown;
  const [browserResults, workerObservation, workerBindings, documentObservation, wasm, wasmFaults] =
    await Promise.all([
      json('browser-results'),
      json('worker-observation-' + engine),
      json('worker-bindings-' + engine),
      json('document-ro-' + engine),
      json('wasm-' + engine),
      json('wasm-faults-' + engine),
    ]);
  return assembleCspAcceptance({
    identity: {
      sha: process.env['GITHUB_SHA'] ?? 'local',
      run: process.env['GITHUB_RUN_ID'] ?? 'local',
      buildId: manifest.buildId,
      engine,
    },
    documentPolicy: document.policy,
    workerPolicy: worker.policy,
    productPolicyFingerprint: manifest.policyDigest,
    providerDigest: PROVIDER_WASM_SHA256,
    wasmFixtureDigest: await wasmFixtureFingerprint(),
    workerEntryDigest: workerAsset.sha256,
    manifestDigest: cspFingerprint(JSON.stringify(manifest)),
    browserResults,
    workerObservation,
    workerBindings,
    documentObservation,
    wasm,
    wasmFaults,
    staticVerified: true,
  });
};
export const runStageAcceptance = async (engine: CspEngine): Promise<number> => {
  const { evidence, rawCoverage } = await collectCandidateAcceptance(engine);
  const stages = allStageDecisions(evidence);
  const stage1 = stages.find((r) => r.stage === 1 && r.phase === 'internal');
  if (!stage1) throw new Error('stage-definition');
  const common = { schema: 1, ...evidence.identity };
  await mkdir('.generated/csp', { recursive: true });
  await writeFile(
    `.generated/csp/coverage-${engine}.json`,
    JSON.stringify({ schema: 1, kind: 'csp-required-coverage', engine, results: rawCoverage }),
  );
  await writeFile(
    `.generated/csp/notification-registry-${engine}.json`,
    JSON.stringify({
      ...common,
      kind: 'csp-notification-registry',
      version: CSP_REGISTRY_VERSION,
      fingerprint: evidence.registryFingerprint,
      definitions: evidence.registry,
    }),
  );
  await writeFile(
    `.generated/csp/acceptance-${engine}.json`,
    JSON.stringify({
      ...common,
      kind: 'csp-acceptance-1.4',
      registryVersion: CSP_REGISTRY_VERSION,
      rawCoverage,
      rawCoverageExitCode: coverageExitCode(rawCoverage),
      ...evidence,
      stages,
    }),
  );
  const summary = {
    engine,
    rawCoverage,
    rawCoverageExitCode: coverageExitCode(rawCoverage),
    A: evidence.trials.filter((r) => r.id.startsWith('A-')),
    integrity: evidence.integrity,
    stages: stages.map((r) => ({
      stage: r.stage,
      phase: r.phase,
      status: r.status,
      exceptions: r.exceptions,
      publicationAllowed: r.publicationAllowed,
      siteAcceptanceComplete: r.siteAcceptanceComplete,
    })),
  };
  console.log(`::notice title=CSP acceptance ${engine}::${JSON.stringify(summary)}`);
  console.log(
    `[csp-stage] ${engine} stage1: ${stage1.status}; raw notification coverage exit ${String(coverageExitCode(rawCoverage))}`,
  );
  return stage1.status === 'proceed' ? 0 : 1;
};
const entry = process.argv[1];
if (entry && fileURLToPath(import.meta.url) === path.resolve(entry)) {
  const engine = process.argv[2];
  if (!engine || !Object.hasOwn(CSP_BROWSER_VERSIONS, engine)) {
    process.stderr.write('[csp-stage] invalid-engine\n');
    process.exitCode = 1;
  } else
    try {
      process.exitCode = await runStageAcceptance(engine as CspEngine);
    } catch {
      process.stderr.write('[csp-stage] missing-or-invalid-evidence\n');
      process.exitCode = 1;
    }
}
