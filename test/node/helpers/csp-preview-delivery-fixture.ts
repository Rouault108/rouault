import { NAVIGATION_ENVELOPE_SCHEMA_VERSION } from '../../../shared/navigation/navigation-envelope.js';
import { createInternalDocumentRouteManifest } from '../../../shared/navigation/internal-document-route-manifest.js';
import { createInternalDocumentRouteSet } from '../../../shared/navigation/internal-document-route-set.js';
import { copyFile, mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  copyPreviewBaseline,
  PREVIEW_TARGET,
  previewBuildStamp,
  previewReceipt,
  scanPreviewFiles,
} from '../../../build/security/csp-preview-artifact.js';
import { collectCspStageOne, renderCspHeaders } from '../../../build/security/csp-report-only.js';
import { assemblePreviewHeaders } from '../../../build/security/csp-preview-headers.js';
import { buildThemeDocumentBootstrapScript } from '../../../src/theme/theme-document-bootstrap.js';
import { buildThemeChromeBootstrapScript } from '../../../src/theme/theme-chrome-bootstrap.js';
import { escapeInlineExecutableScriptText } from '../../../src/layouts/html-output.js';
import {
  PREVIEW_REPOSITORY,
  PREVIEW_WORKFLOW,
  type PreviewApproval,
  type PreviewDeliveryPolicy,
} from '../../../scripts/deploy/csp-preview-authority.js';
import {
  stagePreviewPacket,
  type PreviewPacketIdentity,
} from '../../../scripts/deploy/csp-preview-packet.js';
export const sha = '12345678'.repeat(5),
  trustedSha = 'a'.repeat(40),
  digest = 'b'.repeat(64);
export const approval: PreviewApproval = {
  id: 'review-1',
  mode: 'report-only',
  sourceSha: sha,
  producerRunId: '101',
  producerAttempt: 1,
  producerWorkflowSha: trustedSha,
  artifactId: '102',
  artifactZipDigest: `sha256:${digest}`,
  packetDigest: digest,
  receiptDigest: digest,
  artifactDigest: digest,
  baselineDigest: digest,
  ciRunId: '103',
  ciRunAttempt: 1,
  ciWorkflowDigest: digest,
  approvalRef: 'Sentinel_review_1',
  recoveryFrom: null,
};
export const withPacket = (identity: PreviewPacketIdentity): PreviewApproval => ({
  ...approval,
  sourceSha: identity.sourceSha,
  packetDigest: identity.packetDigest,
  receiptDigest: identity.receiptDigest,
  artifactDigest: identity.artifactDigest,
  baselineDigest: identity.baselineDigest,
});
export const policy = (): PreviewDeliveryPolicy => ({
  schema: 1,
  repository: PREVIEW_REPOSITORY,
  target: PREVIEW_TARGET,
  deliveryEnabled: true,
  accountId: 'c'.repeat(32),
  existingCredentialBinding: 'reviewed-existing-binding',
  credentialScopeConfirmed: true,
  actionsReadApproved: true,
  destinationReviewed: true,
  stage0Reviewed: true,
  rollbackRetentionConfirmed: true,
  journal: {
    provider: 'r2-conditional-object',
    bucket: 'rouault-csp-preview-journal',
    key: 'csp-preview/rouault/csp-verify/journal-v1.json',
    generation: '11111111-2222-3333-4444-555555555555',
    bindingId: 'reviewed-dedicated-journal',
    writeApproved: true,
  },
  approvals: [approval],
});
export const execution = {
  repository: PREVIEW_REPOSITORY,
  event: 'workflow_dispatch',
  ref: 'refs/heads/main',
  workflowRef: `${PREVIEW_REPOSITORY}/${PREVIEW_WORKFLOW}@refs/heads/main`,
  workflowSha: trustedSha,
  checkoutSha: trustedSha,
  runId: '201',
  runAttempt: 1,
};
export const evidence = () => ({
  producer: {
    id: 101,
    run_attempt: 1,
    path: PREVIEW_WORKFLOW,
    head_sha: trustedSha,
    head_branch: 'main',
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    repository: { full_name: PREVIEW_REPOSITORY },
  },
  artifact: {
    id: 102,
    name: 'rouault-csp-preview-packet',
    expired: false,
    digest: `sha256:${digest}`,
    workflow_run: { id: 101, head_sha: trustedSha },
  },
  ci: {
    id: 103,
    run_attempt: 1,
    path: '.github/workflows/ci-cd.yml',
    head_sha: sha,
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    repository: { full_name: PREVIEW_REPOSITORY },
  },
  ciWorkflowDigest: digest,
});
export const deployment = () => ({
  id: '01234567-89ab-cdef-0123-456789abcdef',
  url: 'https://1234abcd.rouault.pages.dev',
  project_name: 'rouault',
  environment: 'preview',
  created_on: '2026-11-02T00:00:02.000Z',
  aliases: [PREVIEW_TARGET.origin],
  deployment_trigger: {
    metadata: {
      branch: 'csp-verify',
      commit_hash: sha,
      commit_dirty: false,
      commit_message: 'rouault-preview:201.1.aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    },
  },
  latest_stage: { name: 'deploy', status: 'success' },
});

// packet構造の小fixture。source-owned allowlistと実WASMの合格は、既存試験・実buildで別に確認する。
export const observation = (deployments: readonly unknown[] = [deployment()]) => ({
  complete: true,
  observedAt: '2026-11-02T00:00:03.000Z',
  deployments,
});
export const attemptSetup = {
  snapshot: async () => ({
    complete: true,
    observedAt: '2026-11-02T00:00:01.000Z',
    deployments: [],
  }),
  nonce: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  now: () => '2026-11-02T00:00:01.500Z',
};
export const fixture = async (
  run: (root: string, packet: string) => Promise<void>,
  publication = false,
) => {
  const root = await mkdtemp(path.join(tmpdir(), 'csp-delivery-'));
  const dist = path.join(root, 'dist'),
    packet = path.join(root, '.generated/csp-preview');
  try {
    for (const directory of [
      dist + '/client-assets',
      root + '/.generated/csp',
      root + '/.generated/client/.vite',
      packet,
      root + '/src/assets/css',
      dist + '/assets/css',
    ])
      await mkdir(directory, { recursive: true });
    const scripts = [buildThemeDocumentBootstrapScript(), buildThemeChromeBootstrapScript()].map(
      escapeInlineExecutableScriptText,
    );
    await writeFile(
      path.join(dist, 'index.html'),
      `<html><head><meta name="rouault-site-origin" content="${PREVIEW_TARGET.origin}"><meta name="rouault-build-id" content="12345678"><script>${scripts[0]}</script><script type="module" src="/client-assets/app.js"></script></head><body><script>${scripts[1]}</script></body></html>`,
    );
    await writeFile(
      path.join(dist, 'client-assets/app.js'),
      'new Worker(new URL("./worker.js",import.meta.url),{type:"module"});',
    );
    await writeFile(path.join(dist, 'client-assets/worker.js'), 'export {};');
    for (const destination of [
      root + '/src/assets/css/about-shell.css',
      dist + '/assets/css/about-shell.css',
    ])
      await copyFile('src/assets/css/about-shell.css', destination);
    await copyFile('_redirects', path.join(dist, '_redirects'));
    const cache = '/client-assets/*\n  Cache-Control: public, max-age=31536000, immutable\n';
    await writeFile(path.join(dist, '_headers'), cache);
    const viteManifestFile = path.join(root, '.generated/client/.vite/manifest.json');
    await writeFile(
      viteManifestFile,
      JSON.stringify({ 'src/client.ts': { file: 'client-assets/app.js', isEntry: true } }),
    );
    if (publication) {
      await mkdir(path.join(dist, '__router'), { recursive: true });
      await writeFile(path.join(dist, '404.html'), await readFile(path.join(dist, 'index.html')));
      await writeFile(
        path.join(dist, '__router/index.router.json'),
        JSON.stringify({
          schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
          buildId: '12345678',
          generatedAt: '2026-11-02T00:00:00.000Z',
          document: {
            html: '<p>fixture</p>',
            title: 'fixture',
            description: null,
            renderedKind: 'page',
          },
          shell: {
            headerHtml: '<header class="layout-header" data-layout-header="true"></header>',
            sidebarProjection: null,
          },
          hydrationPlan: null,
        }),
      );
      await writeFile(
        path.join(dist, 'assets/internal-document-routes.json'),
        JSON.stringify(
          createInternalDocumentRouteManifest({
            buildId: '12345678',
            buildLabel: 'fixture',
            generatedAt: '2026-11-02T00:00:00.000Z',
            siteUrlContext: { siteOrigin: PREVIEW_TARGET.origin, basePath: '' },
            routeSet: createInternalDocumentRouteSet(['/']),
          }),
        ),
      );
    }
    const manifest = await collectCspStageOne(dist, PREVIEW_TARGET.mediaOrigin, {
      viteManifestFile,
    });
    const fragment = renderCspHeaders(manifest),
      files = await scanPreviewFiles(dist);
    await writeFile(path.join(root, '.generated/csp/manifest.json'), JSON.stringify(manifest));
    await writeFile(path.join(root, '.generated/csp/report-only.headers'), fragment);
    await writeFile(
      path.join(root, '.generated/csp-preview-build.json'),
      previewBuildStamp(sha, files),
    );
    await copyPreviewBaseline(dist, packet + '/baseline', files);
    await copyPreviewBaseline(dist, packet + '/report-only', files);
    await writeFile(
      path.join(packet, 'report-only/_headers'),
      assemblePreviewHeaders(cache, fragment, manifest),
    );
    const receipt = previewReceipt(
      sha,
      manifest,
      files,
      await scanPreviewFiles(packet + '/report-only'),
      fragment,
    );
    await writeFile(path.join(packet, 'preparation.json'), JSON.stringify(receipt, null, 2) + '\n');
    await stagePreviewPacket(root, sha);
    await run(root, packet);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};
