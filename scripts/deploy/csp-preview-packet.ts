import { copyFile, lstat, mkdir, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertCredentialFreePreview,
  assertPreviewFileSet,
  PREVIEW_TARGET,
  previewDigest,
  previewReceipt,
  scanPreviewFiles,
  validatePreviewIdentity,
  verifyPreviewBuildStamp,
  verifyPreviewCopy,
} from '../../build/security/csp-preview-artifact.js';
import { readVerifiedCspStageOne } from '../../build/security/csp-report-only.js';
import { assemblePreviewHeaders } from '../../build/security/csp-preview-headers.js';
import { validatePreviewRedirects } from '../../build/security/csp-preview-source.js';
import {
  deliveryRecord,
  parsePreviewApproval,
  type PreviewApproval,
} from './csp-preview-authority.js';

const PROOF_FILES = [
  ['.generated/csp/manifest.json', 'manifest.json'],
  ['.generated/csp/report-only.headers', 'report-only.headers'],
  ['.generated/client/.vite/manifest.json', 'vite-manifest.json'],
  ['.generated/csp-preview-build.json', 'build.json'],
] as const;

const assertBoundedPacket = async (root: string): Promise<Set<string>> => {
  if ((await realpath(root)) !== path.resolve(root))
    throw new Error('[preview-delivery] indirect packet root');
  let count = 0,
    bytes = 0;
  const directories = new Set<string>();
  const visit = async (directory: string, depth: number): Promise<void> => {
    if (depth > 32) throw new Error('[preview-delivery] packet depth limit');
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (
        ++count > 2000 ||
        entry.isSymbolicLink() ||
        entry.name.startsWith('.') ||
        entry.name.includes('\\')
      )
        throw new Error('[preview-delivery] packet entry limit or indirection');
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        directories.add(path.relative(root, file).split(path.sep).join('/'));
        await visit(file, depth + 1);
      } else if (entry.isFile()) {
        const stat = await lstat(file);
        bytes += stat.size;
        if (stat.size > 32 * 1024 * 1024 || bytes > 128 * 1024 * 1024)
          throw new Error('[preview-delivery] packet byte limit');
      } else throw new Error('[preview-delivery] unsupported packet entry');
    }
  };
  await visit(root, 0);
  return directories;
};

export interface PreviewPacketIdentity {
  sourceSha: string;
  buildId: string;
  packetDigest: string;
  receiptDigest: string;
  artifactDigest: string;
  baselineDigest: string;
  fileCount: number;
}

export const inspectPreviewPacket = async (
  root: string,
  sourceSha: string,
): Promise<PreviewPacketIdentity> => {
  const directories = await assertBoundedPacket(root);
  const all = await scanPreviewFiles(root);
  const parents = new Set(
    all.flatMap(({ file }) => {
      const parts = file.split('/');
      return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
    }),
  );
  if ([...directories].some((directory) => !parents.has(directory)))
    throw new Error('[preview-delivery] unrepresented empty packet directory');
  // Wranglerの自動検出対象・private root・診断出力は、承認digestがあっても配信しない。
  if (
    all.some(
      ({ file }) =>
        /^(?:baseline|report-only)\/(?:functions\/|private\/|_worker\.js$|_routes\.json$|wrangler\.(?:toml|jsonc?)$|package\.json$)/iu.test(
          file,
        ) || /(?:^|\/)(?:diagnostics?|test-results|playwright-report)(?:\/|\.json$)/iu.test(file),
    )
  )
    throw new Error('[preview-delivery] forbidden deployment payload');
  const baseline = path.join(root, 'baseline'),
    output = path.join(root, 'report-only');
  const manifest = await readVerifiedCspStageOne(baseline, path.join(root, 'proof/manifest.json'), {
    viteManifestFile: path.join(root, 'proof/vite-manifest.json'),
    sourceRoot: fileURLToPath(new URL('../../src', import.meta.url)),
  });
  validatePreviewIdentity(PREVIEW_TARGET, sourceSha, manifest);
  const files = await scanPreviewFiles(baseline);
  verifyPreviewBuildStamp(
    sourceSha,
    files,
    await readFile(path.join(root, 'proof/build.json'), 'utf8'),
  );
  validatePreviewRedirects(await readFile(path.join(baseline, '_redirects'), 'utf8'));
  const fragment = await readFile(path.join(root, 'proof/report-only.headers'), 'utf8');
  const headers = assemblePreviewHeaders(
    await readFile(path.join(baseline, '_headers'), 'utf8'),
    fragment,
    manifest,
  );
  const assembled = await verifyPreviewCopy(baseline, output, files, headers);
  const receipt = previewReceipt(sourceSha, manifest, files, assembled, fragment);
  const raw = await readFile(path.join(root, 'preparation.json'), 'utf8');
  if (raw !== JSON.stringify(receipt, null, 2) + '\n')
    throw new Error('[preview-delivery] receipt differs from verified packet');
  assertPreviewFileSet(
    all,
    new Set([
      ...files.map(({ file }) => `baseline/${file}`),
      ...assembled.map(({ file }) => `report-only/${file}`),
      'preparation.json',
      ...PROOF_FILES.map(([, file]) => `proof/${file}`),
    ]),
  );
  return {
    sourceSha,
    buildId: manifest.buildId,
    packetDigest: previewDigest(JSON.stringify(all)),
    receiptDigest: previewDigest(raw),
    artifactDigest: receipt.artifactDigest,
    baselineDigest: receipt.baselineDigest,
    fileCount: files.length,
  };
};

export const verifyApprovedPreviewPacket = (
  approval: PreviewApproval,
  packet: PreviewPacketIdentity,
): void => {
  parsePreviewApproval(approval);
  for (const key of [
    'sourceSha',
    'packetDigest',
    'receiptDigest',
    'artifactDigest',
    'baselineDigest',
  ] as const)
    if (approval[key] !== packet[key])
      throw new Error('[preview-delivery] independently approved packet identity mismatch');
};

export const stagePreviewPacket = async (
  repo: string,
  sourceSha: string,
): Promise<PreviewPacketIdentity> => {
  assertCredentialFreePreview(process.env);
  const root = path.join(repo, '.generated/csp-preview');
  // 呼出し前の既存dry-runを必須とし、候補receiptはここでもauthorityに昇格させない。
  const receipt = deliveryRecord(
    JSON.parse(await readFile(path.join(root, 'preparation.json'), 'utf8')) as unknown,
  );
  if (receipt['sourceSha'] !== sourceSha || receipt['publicationAllowed'] !== false)
    throw new Error('[preview-delivery] unverified preparation identity');
  await mkdir(path.join(root, 'proof'));
  for (const [source, file] of PROOF_FILES)
    await copyFile(path.join(repo, source), path.join(root, 'proof', file));
  return inspectPreviewPacket(root, sourceSha);
};
