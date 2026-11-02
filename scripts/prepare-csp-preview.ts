import { execFileSync } from 'node:child_process';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readVerifiedCspStageOne } from '../build/security/csp-report-only.js';
import { assemblePreviewHeaders } from '../build/security/csp-preview-headers.js';
import {
  assertCredentialFreePreview,
  assertPreviewPaths,
  createPreviewBuildEnvironment,
  copyPreviewBaseline,
  PREVIEW_TARGET,
  previewReceipt,
  scanPreviewFiles,
  validatePreviewIdentity,
  verifyPreviewCopy,
  previewBuildStamp,
  verifyPreviewBuildStamp,
} from '../build/security/csp-preview-artifact.js';
import { validatePreviewSourceFiles } from '../build/security/csp-preview-source.js';
import { buildProductionInternalDocumentRouteSet } from '../build/navigation/internal-document-routes.js';
import { assertProductionSiteUrlContext } from './assert-production-site-url-context.js';
import { assertProductionSearchArtifacts } from './assert-production-search-artifacts.js';
import { assertProductionLexicalArtifacts } from './assert-production-lexical-artifacts.js';
import { createPnpmInvocation } from './run-build-process.js';
// 公開/installを起動しない。buildモードも固定入口だけで、任意command/pathを受け取らない。
const run = async (): Promise<void> => {
  assertCredentialFreePreview(process.env);
  const action = process.argv.slice(2);
  if (action.length !== 1 || !['build', 'assemble', 'dry-run'].includes(action[0] ?? ''))
    throw new Error('[preview] use build, assemble or dry-run without other arguments');
  const repo = process.cwd();
  const git = (...args: string[]): string =>
    execFileSync('git', ['--no-optional-locks', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  if (git('status', '--porcelain')) throw new Error('[preview] source checkout must be clean');
  const sourceSha = git('rev-parse', 'HEAD');
  if ((await realpath(repo)) !== repo || path.resolve(git('rev-parse', '--show-toplevel')) !== repo)
    throw new Error('[preview] run at the checkout root without path indirection');
  await assertPreviewPaths(repo);
  if (
    process.env['ROUAULT_SITE_ORIGIN'] !== PREVIEW_TARGET.origin ||
    process.env['ROUAULT_MEDIA_BASE_URL'] !== PREVIEW_TARGET.mediaOrigin ||
    (process.env['ROUAULT_BASE_PATH'] ?? '') !== ''
  )
    throw new Error('[preview] explicit preview build context required');
  const baseline = path.join(repo, 'dist');
  const stampFile = path.join(repo, '.generated/csp-preview-build.json');
  if (action[0] === 'build') {
    // build childには配信credentialや任意のbuild modeを継承させない。
    const env = createPreviewBuildEnvironment(process.env, sourceSha);
    const invocation = createPnpmInvocation({
      env,
      platform: process.platform,
      nodeExecPath: process.execPath,
      pnpmArgs: ['build:production'],
    });
    execFileSync(invocation.command, [...invocation.args], {
      env,
      stdio: 'inherit',
      ...(invocation.windowsVerbatimArguments ? { windowsVerbatimArguments: true } : {}),
    });
    if (git('rev-parse', 'HEAD') !== sourceSha || git('status', '--porcelain'))
      throw new Error('[preview] source changed during build');
    const files = await scanPreviewFiles(baseline);
    await writeFile(stampFile, previewBuildStamp(sourceSha, files));
    console.log(
      '[preview] credential-free preview build identity recorded; hostname remains unverified',
    );
    return;
  }
  const directory = path.join(repo, '.generated/csp-preview');
  const output = path.join(directory, 'report-only');
  const rollback = path.join(directory, 'baseline');
  if (action[0] === 'assemble') await mkdir(directory, { recursive: true });
  if ((await realpath(directory)) !== directory || (await realpath(baseline)) !== baseline)
    throw new Error('[preview] path indirection is forbidden');
  const manifest = await readVerifiedCspStageOne(baseline, '.generated/csp/manifest.json');
  validatePreviewIdentity(PREVIEW_TARGET, sourceSha, manifest);
  await assertProductionSiteUrlContext();
  await assertProductionSearchArtifacts();
  await assertProductionLexicalArtifacts();
  const files = await scanPreviewFiles(baseline);
  verifyPreviewBuildStamp(sourceSha, files, await readFile(stampFile, 'utf8'));
  await validatePreviewSourceFiles(
    repo,
    manifest,
    files,
    buildProductionInternalDocumentRouteSet().routeSet.routes,
  );
  const fragment = await readFile('.generated/csp/report-only.headers', 'utf8');
  const headers = assemblePreviewHeaders(
    await readFile(path.join(baseline, '_headers'), 'utf8'),
    fragment,
    manifest,
  );
  if (action[0] === 'assemble') {
    await copyPreviewBaseline(baseline, rollback, files);
    await copyPreviewBaseline(baseline, output, files);
    await writeFile(path.join(output, '_headers'), headers);
  }
  const assembled = await verifyPreviewCopy(baseline, output, files, headers);
  await verifyPreviewCopy(
    baseline,
    rollback,
    files,
    await readFile(path.join(baseline, '_headers'), 'utf8'),
  );
  const receipt = previewReceipt(sourceSha, manifest, files, assembled, fragment);
  const receiptFile = path.join(directory, 'preparation.json');
  const serialized = JSON.stringify(receipt, null, 2) + '\n';
  if (action[0] === 'assemble') await writeFile(receiptFile, serialized, { flag: 'wx' });
  else if ((await readFile(receiptFile, 'utf8')) !== serialized)
    throw new Error('[preview] preparation receipt differs');
  console.log(JSON.stringify(receipt));
};

try {
  await run();
} catch (error) {
  // 任意入力・source・URL・環境・stackを診断へ転記しない。
  const reason =
    error instanceof Error && error.message.startsWith('[preview]')
      ? error.message
      : '[preview] artifact validation failed';
  console.error(reason + '; no publication attempted');
  process.exitCode = 1;
}
