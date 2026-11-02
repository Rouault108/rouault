import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { CspStageOneManifest } from './csp-inventory.js';
import { hasAsciiControlCharacter } from '../../shared/string/ascii-control.js';

export const PREVIEW_TARGET = Object.freeze({
  project: 'rouault',
  branch: 'csp-verify',
  origin: 'https://csp-verify.rouault.pages.dev',
  mediaOrigin: 'https://media.rouault.page',
  basePath: '',
  hostnameStatus: 'proposed-unverified',
  accountStatus: 'unknown',
});
export const PREVIEW_PENDING_GATES = [
  'account-and-token-scope-confirmation',
  'project-branch-alias-access-confirmation',
  'stage-0-inventory-and-compatibility',
  'rollback-artifact-retention',
  'delivery-entry-review-and-activation',
  'explicit-preview-publication-approval',
  'post-upload-alias-build-http-verification',
  'production-zone-analytics-and-EU-exclusion',
] as const;
export interface PreviewFile {
  file: string;
  bytes: number;
  sha256: string;
}
export const previewDigest = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');

export const previewBuildStamp = (sourceSha: string, files: readonly PreviewFile[]): string => {
  if (!/^[a-f0-9]{40}$/u.test(sourceSha)) throw new Error('[preview] invalid full source SHA');
  return (
    JSON.stringify({
      sourceSha,
      target: PREVIEW_TARGET,
      baselineDigest: previewDigest(JSON.stringify(files)),
    }) + '\n'
  );
};
export const verifyPreviewBuildStamp = (
  sourceSha: string,
  files: readonly PreviewFile[],
  raw: string,
): void => {
  if (raw !== previewBuildStamp(sourceSha, files))
    throw new Error('[preview] full source SHA/build receipt differs');
};

export const validatePreviewIdentity = (
  target: unknown,
  sourceSha: string,
  manifest: CspStageOneManifest,
): void => {
  if (JSON.stringify(target) !== JSON.stringify(PREVIEW_TARGET))
    throw new Error('[preview] target is not fixed');
  if (
    !/^[a-f0-9]{40}$/u.test(sourceSha) ||
    manifest.buildId.length < 7 ||
    !sourceSha.startsWith(manifest.buildId)
  )
    throw new Error('[preview] source SHA/build identity mismatch');
  if (
    manifest.siteOrigin !== PREVIEW_TARGET.origin ||
    manifest.basePath !== '' ||
    manifest.mediaOrigin !== PREVIEW_TARGET.mediaOrigin
  )
    throw new Error('[preview] preview site/media origin mismatch');
  if (manifest.mediaAliases.length)
    throw new Error('[preview] local-only media alias is not deployable');
};

export const assertCredentialFreePreview = (env: NodeJS.ProcessEnv): void => {
  if (
    Object.keys(env).some(
      (name) =>
        /^(?:CLOUDFLARE_|CLOUDFLARE_API_|CF_API_|CF_ACCOUNT_|CF_PAGES_|R2_|AWS_|GOOGLE_APPLICATION_CREDENTIALS$|AZURE_CLIENT_SECRET$)/u.test(
          name,
        ) && env[name],
    )
  )
    throw new Error('[preview] deployment credentials/configuration must not enter preparation');
};

export const assertPreviewPaths = async (repo: string): Promise<void> => {
  for (const name of [
    'dist',
    '.generated',
    '.generated/client',
    '.generated/client/.vite',
    '.generated/client/.vite/manifest.json',
    '.generated/csp',
    '.generated/csp/manifest.json',
    '.generated/csp/report-only.headers',
    '.generated/csp-preview-build.json',
    '.generated/csp-preview',
    '.generated/csp-preview/preparation.json',
  ]) {
    const candidate = path.join(repo, name);
    try {
      if ((await lstat(candidate)).isSymbolicLink() || (await realpath(candidate)) !== candidate)
        throw new Error('[preview] path indirection is forbidden');
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
};

export const scanPreviewFiles = async (root: string): Promise<PreviewFile[]> => {
  if ((await lstat(root)).isSymbolicLink()) throw new Error('[preview] symlink root');
  const files: PreviewFile[] = [];
  const visit = async (prefix: string): Promise<void> => {
    for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
      const file = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (
        entry.isSymbolicLink() ||
        file.includes('\\') ||
        hasAsciiControlCharacter(file) ||
        file.split('/').some((part) => !part || part.startsWith('.') || part === '..')
      )
        throw new Error('[preview] unsafe file or symlink');
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) {
        const bytes = await readFile(path.join(root, file));
        files.push({ file, bytes: bytes.length, sha256: previewDigest(bytes) });
      } else throw new Error('[preview] unsupported file kind');
    }
  };
  await visit('');
  return files.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
};

export const assertPreviewFileSet = (
  files: readonly PreviewFile[],
  allowed: ReadonlySet<string>,
): void => {
  if (
    files.length !== allowed.size ||
    new Set(files.map(({ file }) => file)).size !== files.length ||
    files.some(({ file }) => !allowed.has(file))
  )
    throw new Error('[preview] unknown, missing or extra payload file');
};

export const previewReceipt = (
  sourceSha: string,
  manifest: CspStageOneManifest,
  baseline: readonly PreviewFile[],
  assembled: readonly PreviewFile[],
  fragment: string,
) => ({
  schema: 1,
  kind: 'csp-preview-preparation',
  target: PREVIEW_TARGET,
  sourceSha,
  buildId: manifest.buildId,
  policyDigest: manifest.policyDigest,
  cspManifestDigest: previewDigest(JSON.stringify(manifest)),
  fragmentDigest: previewDigest(fragment),
  baselineDigest: previewDigest(JSON.stringify(baseline)),
  artifactDigest: previewDigest(JSON.stringify(assembled)),
  baseline,
  includedFiles: assembled,
  validation: {
    exactFiles: true,
    nonHeaderBytesUnchanged: true,
    headerArtifactVerified: true,
    staticRoutingIdentityVerified: true,
  },
  rollback: {
    method: 're-upload-same-origin-csp-free-baseline',
    baselineDigest: previewDigest(JSON.stringify(baseline)),
  },
  publicationAllowed: false,
  stageAcceptance: 'not-evaluated',
  pendingGates: PREVIEW_PENDING_GATES,
});

export const verifyPreviewCopy = async (
  baseline: string,
  output: string,
  expected: readonly PreviewFile[],
  headers: string,
): Promise<PreviewFile[]> => {
  const source = await scanPreviewFiles(baseline);
  if (JSON.stringify(source) !== JSON.stringify(expected))
    throw new Error('[preview] baseline changed');
  const actual = await scanPreviewFiles(output);
  assertPreviewFileSet(actual, new Set(source.map(({ file }) => file)));
  const headerBytes = Buffer.from(headers);
  const transformed = source.map((file) =>
    file.file === '_headers'
      ? { file: '_headers', bytes: headerBytes.length, sha256: previewDigest(headerBytes) }
      : file,
  );
  if (JSON.stringify(actual) !== JSON.stringify(transformed))
    throw new Error('[preview] assembled bytes differ');
  return actual;
};

export const copyPreviewBaseline = async (
  baseline: string,
  output: string,
  expected: readonly PreviewFile[],
): Promise<void> => {
  // 既存成果物を上書きせず、失敗した途中copyを検証済みと表示しない。
  const source = await realpath(baseline);
  const parent = await realpath(path.dirname(output));
  if (parent === source || parent.startsWith(source + path.sep))
    throw new Error('[preview] output overlaps baseline');
  await mkdir(output);
  for (const { file } of expected) {
    const target = path.join(output, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(baseline, file), target);
  }
};
