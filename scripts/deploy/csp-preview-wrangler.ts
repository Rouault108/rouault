import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  copyPreviewBaseline,
  previewDigest,
  scanPreviewFiles,
} from '../../build/security/csp-preview-artifact.js';
import {
  deliveryRecord,
  parsePreviewApproval,
  type PreviewApproval,
} from './csp-preview-authority.js';

export const PREVIEW_WRANGLER_VERSION = '4.100.0';
export interface PreviewProcessRequest {
  command: string;
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  signal?: AbortSignal;
}
export interface PreviewProcessResult {
  exitCode: number | null;
  signal: string | null;
  started: boolean;
  interrupted: boolean;
}
export type PreviewProcess = (request: PreviewProcessRequest) => Promise<PreviewProcessResult>;
export const nativePreviewProcess: PreviewProcess = (request) =>
  new Promise((resolve) => {
    if (request.signal?.aborted) {
      resolve({ exitCode: null, signal: null, started: false, interrupted: true });
      return;
    }
    let started = false,
      interrupted = false,
      outputBytes = 0,
      finished = false;
    const child = spawn(request.command, [...request.args], {
      cwd: request.cwd,
      env: request.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let hardStop: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      interrupted = true;
      child.kill('SIGTERM');
      hardStop ??= setTimeout(() => child.kill('SIGKILL'), 1000);
    };
    const timeout = setTimeout(stop, request.timeoutMs);
    request.signal?.addEventListener('abort', stop, { once: true });
    if (request.signal?.aborted) stop();
    const discard = (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > 1024 * 1024) stop();
    };
    child.stdout.on('data', discard);
    child.stderr.on('data', discard);
    child.on('spawn', () => {
      started = true;
    });
    child.on('error', () => {
      interrupted = true;
    });
    child.on('close', (exitCode, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (hardStop) clearTimeout(hardStop);
      request.signal?.removeEventListener('abort', stop);
      resolve({ exitCode, signal, started, interrupted });
    });
  });

export const previewWranglerEnvironment = (
  root: string,
  jwt: string,
  transportEnv: Partial<
    Pick<NodeJS.ProcessEnv, 'NODE_EXTRA_CA_CERTS' | 'HTTPS_PROXY' | 'HTTP_PROXY' | 'NO_PROXY'>
  > = {},
): NodeJS.ProcessEnv => {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(jwt) || jwt.length > 16384)
    throw new Error('[preview-delivery] limited asset JWT unavailable');
  const allowed: NodeJS.ProcessEnv = {};
  for (const key of ['NODE_EXTRA_CA_CERTS', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY'] as const) {
    const value = transportEnv[key];
    if (value !== undefined) {
      if (value.length > 8192 || /[\r\n]/u.test(value))
        throw new Error('[preview-delivery] invalid trusted transport configuration');
      allowed[key] = value;
    }
  }
  return {
    ...allowed,
    PATH: path.dirname(process.execPath),
    HOME: path.join(root, 'home'),
    USERPROFILE: path.join(root, 'home'),
    XDG_CONFIG_HOME: path.join(root, 'home'),
    XDG_CACHE_HOME: path.join(root, 'cache'),
    TMPDIR: path.join(root, 'tmp'),
    TEMP: path.join(root, 'tmp'),
    TMP: path.join(root, 'tmp'),
    CI: 'true',
    NO_COLOR: '1',
    WRANGLER_SEND_METRICS: 'false',
    WRANGLER_LOG_LEVEL: 'error',
    CF_PAGES_UPLOAD_JWT: jwt,
    // 固定版cfetchのlogin検査にも同じasset JWTだけを渡す。Pages tokenは子へ渡さない。
    CLOUDFLARE_API_TOKEN: jwt,
    WRANGLER_OUTPUT_FILE_PATH: path.join(root, 'state/wrangler.jsonl'),
  };
};

export interface PreviewUploadedAssets {
  manifest: Record<string, string>;
  headers: string;
  redirects: string;
}
export const previewAssetArgs = (): readonly string[] => [
  'pages',
  'project',
  'upload',
  'payload',
  '--output-manifest-path=state/manifest.json',
  '--skip-caching',
];
const parseAssetManifest = (
  raw: string,
  files: readonly { file: string }[],
): Record<string, string> => {
  if (Buffer.byteLength(raw) > 1024 * 1024)
    throw new Error('[preview-delivery] asset manifest limit');
  const manifest = deliveryRecord(JSON.parse(raw) as unknown),
    expected = files
      .filter(({ file }) => !['_headers', '_redirects'].includes(file))
      .map(({ file }) => '/' + file)
      .sort();
  if (
    JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(expected) ||
    Object.values(manifest).some(
      (value) => typeof value !== 'string' || !/^[a-f0-9]{32}$/u.test(value),
    )
  )
    throw new Error('[preview-delivery] asset manifest identity mismatch');
  return Object.fromEntries(Object.entries(manifest).map(([file, hash]) => [file, String(hash)]));
};

export const uploadTrustedPreviewAssets = async (
  request: {
    trustedRoot: string;
    packetRoot: string;
    approval: PreviewApproval;
    jwt: string;
    transportEnv?: Partial<
      Pick<NodeJS.ProcessEnv, 'NODE_EXTRA_CA_CERTS' | 'HTTPS_PROXY' | 'HTTP_PROXY' | 'NO_PROXY'>
    >;
    signal?: AbortSignal;
  },
  execute: PreviewProcess = nativePreviewProcess,
): Promise<PreviewUploadedAssets> => {
  const approval = parsePreviewApproval(request.approval),
    source = path.join(request.packetRoot, approval.mode),
    files = await scanPreviewFiles(source),
    expected = approval.mode === 'baseline' ? approval.baselineDigest : approval.artifactDigest;
  if (previewDigest(JSON.stringify(files)) !== expected)
    throw new Error('[preview-delivery] uploader source changed');
  const trustedPackage = deliveryRecord(
      JSON.parse(await readFile(path.join(request.trustedRoot, 'package.json'), 'utf8')) as unknown,
    ),
    dependencies = deliveryRecord(trustedPackage['devDependencies']);
  const installed = deliveryRecord(
    JSON.parse(
      await readFile(path.join(request.trustedRoot, 'node_modules/wrangler/package.json'), 'utf8'),
    ) as unknown,
  );
  if (
    dependencies['wrangler'] !== PREVIEW_WRANGLER_VERSION ||
    installed['version'] !== PREVIEW_WRANGLER_VERSION
  )
    throw new Error('[preview-delivery] unreviewed Wrangler version');
  const entry = await realpath(
    path.join(request.trustedRoot, 'node_modules/wrangler/wrangler-dist/cli.js'),
  );
  const root = await mkdtemp(path.join(tmpdir(), 'rouault-csp-upload-'));
  try {
    for (const dir of ['home', 'cache', 'tmp', 'state'])
      await mkdir(path.join(root, dir), { mode: 0o700 });
    await copyPreviewBaseline(source, path.join(root, 'payload'), files);
    if (
      previewDigest(JSON.stringify(await scanPreviewFiles(path.join(root, 'payload')))) !== expected
    )
      throw new Error('[preview-delivery] copied upload payload differs');
    // trustedな最小configで親directoryやcandidate configの探索を止める。
    await writeFile(
      path.join(root, 'wrangler.json'),
      JSON.stringify({ name: 'rouault', pages_build_output_dir: './payload' }),
      { flag: 'wx', mode: 0o600 },
    );
    const args = previewAssetArgs(),
      env = previewWranglerEnvironment(root, request.jwt, request.transportEnv);
    const result = await execute({
      command: process.execPath,
      args: [entry, ...args],
      cwd: root,
      env,
      timeoutMs: 180000,
      ...(request.signal ? { signal: request.signal } : {}),
    });
    if (!result.started || result.interrupted || result.exitCode !== 0 || result.signal !== null)
      throw new Error('[preview-delivery] uploader outcome requires reconciliation');
    if (
      previewDigest(JSON.stringify(await scanPreviewFiles(path.join(root, 'payload')))) !== expected
    )
      throw new Error('[preview-delivery] uploader changed payload');
    const raw = await readFile(path.join(root, 'state/manifest.json'), 'utf8');
    return {
      manifest: parseAssetManifest(raw, files),
      headers: await readFile(path.join(root, 'payload/_headers'), 'utf8'),
      redirects: await readFile(path.join(root, 'payload/_redirects'), 'utf8'),
    };
  } finally {
    // stdout/stderrやstructured rawをartifactへ残さず、所有する一時directoryだけを片付ける。
    await rm(root, { recursive: true, force: true });
  }
};
