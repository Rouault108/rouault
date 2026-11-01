import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { Page, TestInfo } from '@playwright/test';
import { readVerifiedCspStageOne } from '../../../build/security/csp-report-only.js';
import {
  notificationRegistry,
  cspFingerprint,
  CSP_INLINE_TEXT,
  type CspEngine,
} from '../../../scripts/ci/csp-notification-registry.js';
import { wasmFixtureFingerprint } from '../../../scripts/ci/csp-fixture-bindings.js';

export const classifyDocumentConsole = (
  text: string,
  policy: string,
): 'warning' | 'violation' | 'unknown' => {
  if (
    text ===
    `The Content Security Policy '${policy}' was delivered in report-only mode, but does not specify a 'report-to'; the policy will have no effect. Please either add a 'report-to' directive, or deliver the policy via the 'Content-Security-Policy' header.`
  )
    return 'warning';
  return /^(?:\[Report Only\] )?(?:Refused|Executing|Loading|Setting|Framing|The source list|(?:\[JavaScript (?:Error|Warning): ["'])?Content-Security-Policy:)/iu.test(
    text,
  ) &&
    /(?:Content Security Policy|Content-Security-Policy)/iu.test(text) &&
    /(?:script-src|base-uri|frame-src)/u.test(text)
    ? 'violation'
    : 'unknown';
};

export const writeDocumentRegistryEvidence = async (
  page: Page,
  info: TestInfo,
  caseId: 'inline-probe' | 'legacy-preview',
  observed: boolean,
  messages: readonly string[],
  baseObserved = false,
) => {
  const manifest = await readVerifiedCspStageOne('dist', '.generated/csp/manifest.json');
  const parent = manifest.rules.find((rule) => rule.context === 'document'),
    worker = manifest.rules.find((rule) => rule.context === 'worker');
  if (!parent || !worker) throw new Error('registry-policy');
  const response = await page.context().request.head(page.url());
  const actualPolicy = response.headers()['content-security-policy-report-only'];
  const definitions = notificationRegistry(
    info.project.name as CspEngine,
    parent.policy,
    worker.policy,
    await wasmFixtureFingerprint(),
  );
  const definition = definitions.find(
    (row) => row.id === (caseId === 'inline-probe' ? 'document-inline' : 'legacy-inline'),
  );
  if (!definition) throw new Error('registry-case');
  const fixtureDigest =
    caseId === 'inline-probe'
      ? cspFingerprint(CSP_INLINE_TEXT)
      : cspFingerprint(await readFile('src/client/post-hydrate/preview-sandbox-enhancer.ts'));
  const bytesDigest =
    caseId === 'inline-probe'
      ? cspFingerprint(CSP_INLINE_TEXT)
      : cspFingerprint(await readFile('examples/snippets/sandbox/button.js'));
  const unknownConsole = messages.some(
    (text) => classifyDocumentConsole(text, parent.policy) === 'unknown',
  );
  const row = {
    id: definition.id,
    key: {
      ...definition.key,
      fixtureDigest,
      bytesDigest,
      policyFingerprint: cspFingerprint(actualPolicy ?? 'missing'),
    },
    observed,
    healthy: actualPolicy === parent.policy && !unknownConsole,
    unknownConsole,
    baseObserved,
  };
  const sha = process.env['GITHUB_SHA'] ?? 'local',
    run = process.env['GITHUB_RUN_ID'] ?? 'local';
  const file = `.generated/csp/document-ro-${info.project.name}.json`;
  let rows: unknown[] = [];
  if (caseId === 'legacy-preview') {
    const existing: unknown = JSON.parse(await readFile(file, 'utf8'));
    if (
      existing &&
      typeof existing === 'object' &&
      'sha' in existing &&
      existing.sha === sha &&
      'run' in existing &&
      existing.run === run &&
      'rows' in existing &&
      Array.isArray(existing.rows)
    )
      rows = existing.rows;
    else throw new Error('registry-document-identity');
  }
  rows.push(row);
  await mkdir('.generated/csp', { recursive: true });
  await writeFile(
    file,
    JSON.stringify({
      schema: 1,
      kind: 'document-ro-registry-evidence',
      engine: info.project.name,
      sha,
      run,
      buildId: manifest.buildId,
      rows,
    }),
  );
};
