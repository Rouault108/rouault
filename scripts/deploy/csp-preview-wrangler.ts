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
import { PREVIEW_UUID, previewWranglerArgs } from './csp-preview-transaction.js';

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
  accountId: string,
  token: string,
  transportEnv: Partial<
    Pick<NodeJS.ProcessEnv, 'NODE_EXTRA_CA_CERTS' | 'HTTPS_PROXY' | 'HTTP_PROXY' | 'NO_PROXY'>
  > = {},
): NodeJS.ProcessEnv => {
  if (!/^[a-f0-9]{32}$/u.test(accountId) || !token || token.length > 4096 || /[\r\n]/u.test(token))
    throw new Error('[preview-delivery] invalid uploader binding');
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
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CLOUDFLARE_API_TOKEN: token,
    WRANGLER_OUTPUT_FILE_PATH: path.join(root, 'state/wrangler.jsonl'),
  };
};

const parseReceipt = (
  raw: string,
  args: readonly string[],
  sourceSha: string,
): { deploymentId: string } => {
  if (Buffer.byteLength(raw) > 1024 * 1024)
    throw new Error('[preview-delivery] structured output limit');
  const lines = raw.trim().split(/\r?\n/u);
  if (lines.length !== 3 || lines.some((line) => Buffer.byteLength(line) > 16384))
    throw new Error('[preview-delivery] unsupported structured output');
  let events: Record<string, unknown>[];
  try {
    events = lines.map((line) => deliveryRecord(JSON.parse(line) as unknown));
  } catch {
    throw new Error('[preview-delivery] invalid structured output');
  }
  const session = events.filter((event) => event['type'] === 'wrangler-session'),
    deploy = events.filter((event) => event['type'] === 'pages-deploy'),
    detailed = events.filter((event) => event['type'] === 'pages-deploy-detailed');
  const s = session[0],
    d = deploy[0],
    detail = detailed[0];
  if (
    session.length !== 1 ||
    deploy.length !== 1 ||
    detailed.length !== 1 ||
    !s ||
    !d ||
    !detail ||
    events.some((event) => event['version'] !== 1) ||
    s['wrangler_version'] !== PREVIEW_WRANGLER_VERSION ||
    JSON.stringify(s['command_line_args']) !== JSON.stringify(args) ||
    d['pages_project'] !== 'rouault' ||
    detail['pages_project'] !== 'rouault' ||
    d['deployment_id'] !== detail['deployment_id'] ||
    typeof d['deployment_id'] !== 'string' ||
    !PREVIEW_UUID.test(d['deployment_id']) ||
    d['url'] !== detail['url'] ||
    typeof d['url'] !== 'string' ||
    !/^https:\/\/[a-f0-9]{8,32}\.rouault\.pages\.dev\/?$/u.test(d['url']) ||
    detail['environment'] !== 'preview' ||
    detail['production_branch'] !== 'main' ||
    !['https://csp-verify.rouault.pages.dev', 'https://csp-verify.rouault.pages.dev/'].includes(
      String(detail['alias']),
    ) ||
    deliveryRecord(deliveryRecord(detail['deployment_trigger'])['metadata'])['commit_hash'] !==
      sourceSha
  )
    throw new Error('[preview-delivery] structured uploader identity mismatch');
  return { deploymentId: d['deployment_id'] };
};

export const runTrustedPreviewWrangler = async (
  request: {
    trustedRoot: string;
    packetRoot: string;
    approval: PreviewApproval;
    attemptId: string;
    accountId: string;
    token: string;
    transportEnv?: Partial<
      Pick<NodeJS.ProcessEnv, 'NODE_EXTRA_CA_CERTS' | 'HTTPS_PROXY' | 'HTTP_PROXY' | 'NO_PROXY'>
    >;
    signal?: AbortSignal;
  },
  execute: PreviewProcess = nativePreviewProcess,
): Promise<{ deploymentId: string }> => {
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
    path.join(request.trustedRoot, 'node_modules/wrangler/bin/wrangler.js'),
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
    const args = previewWranglerArgs(approval, request.attemptId),
      env = previewWranglerEnvironment(
        root,
        request.accountId,
        request.token,
        request.transportEnv,
      );
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
    const raw = await readFile(path.join(root, 'state/wrangler.jsonl'), 'utf8');
    return parseReceipt(raw, args, approval.sourceSha);
  } finally {
    // stdout/stderrやstructured rawをartifactへ残さず、所有する一時directoryだけを片付ける。
    await rm(root, { recursive: true, force: true });
  }
};
