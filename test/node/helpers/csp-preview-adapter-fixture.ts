import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { previewDigest, scanPreviewFiles } from '../../../build/security/csp-preview-artifact.js';
import {
  PreviewCasConflict,
  type PreviewCasStore,
} from '../../../scripts/deploy/csp-preview-journal.js';
import { previewCrc32 } from '../../../scripts/deploy/csp-preview-zip.js';
import {
  snapshotBeforeUpload,
  type PreviewAttempt,
} from '../../../scripts/deploy/csp-preview-transaction.js';
import { approval, evidence, execution, attemptSetup } from './csp-preview-delivery-fixture.js';
import { type PreviewFetch } from '../../../scripts/deploy/csp-preview-transport.js';

export const makeAttempt = (): PreviewAttempt => ({
  schema: 3,
  approvalId: approval.id,
  recoveryFrom: null,
  verificationFailure: null,
  mode: approval.mode,
  sourceSha: approval.sourceSha,
  payloadDigest: approval.artifactDigest,
  packetDigest: approval.packetDigest,
  accountId: 'c'.repeat(32),
  runId: execution.runId,
  runAttempt: execution.runAttempt,
  workflowSha: execution.workflowSha,
  attemptId: `201.1.${attemptSetup.nonce()}`,
  before: snapshotBeforeUpload({
    complete: true,
    observedAt: '2026-11-02T00:00:01.000Z',
    deployments: [],
  }),
  uploadStartedAt: null,
  status: 'reserved',
  deploymentId: null,
  confirmation: null,
  contentStatus: 'not-checked',
  operationStatus: 'not-started',
});
export const memoryJournal = () => {
  let value: { bytes: Buffer; etag: string } | null = null,
    writes = 0;
  const store: PreviewCasStore = {
    load: async () => (value ? { bytes: Buffer.from(value.bytes), etag: value.etag } : null),
    put: async (bytes, expected) => {
      if (expected !== (value?.etag ?? null)) throw new PreviewCasConflict();
      value = { bytes: Buffer.from(bytes), etag: `"${(++writes).toString(16).padStart(32, '0')}"` };
      return { etag: value.etag };
    },
  };
  return {
    store,
    get value() {
      return value;
    },
    get writes() {
      return writes;
    },
  };
};
export const jsonResponse = (value: unknown, headers: HeadersInit = {}): Response =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  });
// 小packetのtransport試験用writer。実packetはPython標準zipfileでも独立に生成して照合する。
export const storedZip = (files: { name: string; bytes: Buffer; mode?: number }[]): Buffer => {
  const local: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  for (const item of files) {
    const name = Buffer.from(item.name),
      crc = previewCrc32(item.bytes),
      header = Buffer.alloc(30),
      entry = Buffer.alloc(46);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(item.bytes.length, 18);
    header.writeUInt32LE(item.bytes.length, 22);
    header.writeUInt16LE(name.length, 26);
    entry.writeUInt32LE(0x02014b50);
    entry.writeUInt16LE(0x314, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x800, 8);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(item.bytes.length, 20);
    entry.writeUInt32LE(item.bytes.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(((item.mode ?? 0o100600) * 65536) >>> 0, 38);
    entry.writeUInt32LE(offset, 42);
    local.push(header, name, item.bytes);
    central.push(entry, name);
    offset += header.length + name.length + item.bytes.length;
  }
  const index = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(index.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, index, end]);
};
export const zipPacket = async (root: string): Promise<Buffer> =>
  storedZip(
    await Promise.all(
      (await scanPreviewFiles(root)).map(async ({ file }) => ({
        name: file,
        bytes: await readFile(path.join(root, file)),
      })),
    ),
  );
export const githubFixture = (
  archive: Buffer = Buffer.from('mock-zip'),
  mutate: (key: string, value: unknown) => unknown = (_key, value) => value,
) => {
  const data = evidence(),
    workflow = Buffer.from('name: trusted CI\n'),
    calls: { url: string; init: RequestInit }[] = [];
  data.ciWorkflowDigest = previewDigest(workflow);
  data.artifact.digest = 'sha256:' + previewDigest(archive);
  const producer = {
      ...data.producer,
      run_started_at: '2026-11-02T00:00:00.000Z',
      updated_at: '2026-11-02T00:01:00.000Z',
    },
    artifact = {
      ...data.artifact,
      created_at: '2026-11-02T00:00:30.000Z',
      updated_at: '2026-11-02T00:00:30.000Z',
      size_in_bytes: archive.length,
    };
  const jobs = (names: string[], skipped = false) =>
    names.map((name, index) => ({
      id: index + 1,
      name,
      status: 'completed',
      conclusion: skipped ? 'skipped' : 'success',
    }));
  const api = 'https://api.github.com/repos/Rouault108/rouault';
  const table: Record<string, unknown> = {
    '/git/ref/heads/main': { ref: 'refs/heads/main', object: { sha: execution.workflowSha } },
    '/actions/runs/101': producer,
    '/actions/runs/101/attempts/1': producer,
    '/actions/runs/101/attempts/1/jobs?per_page=100&page=1': {
      total_count: 2,
      jobs: [
        ...jobs(['prepare']),
        { id: 2, name: 'trusted-delivery-preflight', status: 'completed', conclusion: 'skipped' },
      ],
    },
    '/actions/runs/101/artifacts?per_page=100&page=1': { total_count: 1, artifacts: [artifact] },
    '/actions/artifacts/102': artifact,
    '/actions/runs/103': data.ci,
    '/actions/runs/103/attempts/1/jobs?per_page=100&page=1': {
      total_count: 7,
      jobs: jobs([
        'prebuild-gate',
        'build-production',
        'ci-required',
        'csp-required',
        'test-csp (chromium)',
        'test-csp (firefox)',
        'test-csp (webkit)',
      ]),
    },
    [`/contents/.github/workflows/ci-cd.yml?ref=${approval.sourceSha}`]: {
      type: 'file',
      path: '.github/workflows/ci-cd.yml',
      encoding: 'base64',
      size: workflow.length,
      sha: createHash('sha1').update(`blob ${workflow.length}\0`).update(workflow).digest('hex'),
      content: workflow.toString('base64'),
    },
  };
  const transport: PreviewFetch = async (url, init) => {
    calls.push({ url, init });
    if (url === api + '/actions/artifacts/102/zip')
      return new Response(null, {
        status: 302,
        headers: {
          location: 'https://productionresultssa3.blob.core.windows.net/mock/packet.zip?sig=mock',
        },
      });
    if (url.startsWith('https://productionresultssa3.blob.core.windows.net/mock/'))
      return new Response(Uint8Array.from(archive), {
        headers: { 'content-type': 'application/zip' },
      });
    const key = url.slice(api.length);
    if (!url.startsWith(api) || !(key in table)) throw new Error('unexpected mock request');
    return jsonResponse(mutate(key, structuredClone(table[key])));
  };
  return {
    transport,
    calls,
    approval: {
      ...approval,
      ciWorkflowDigest: data.ciWorkflowDigest,
      artifactZipDigest: data.artifact.digest,
    },
    data,
  };
};

// 署名のないloopback専用JWT。実serviceへは送らない。
export const assetJwt =
  'eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDAsIm1heF9maWxlX2NvdW50X2FsbG93ZWQiOjIwMDAwfQ.mock';
export const fakeAssetOutput = async (
  request: import('../../../scripts/deploy/csp-preview-wrangler.js').PreviewProcessRequest,
  invalid = false,
): Promise<void> => {
  const { writeFile } = await import('node:fs/promises');
  const files = await scanPreviewFiles(path.join(request.cwd, 'payload'));
  const manifest = Object.fromEntries(
    files
      .filter(({ file }) => !['_headers', '_redirects'].includes(file))
      .map(({ file, sha256 }) => ['/' + file, sha256.slice(0, 32)]),
  );
  if (invalid) manifest['/unapproved'] = '0'.repeat(32);
  await writeFile(path.join(request.cwd, 'state/manifest.json'), JSON.stringify(manifest));
};
