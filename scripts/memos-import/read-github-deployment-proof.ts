import { fileURLToPath } from 'node:url';
import { assertSafeContentPath } from '../../build/content/content-record.js';
import { assertProductionReleaseStateArtifact } from '../deploy/release-state-schema.js';
import { hashBytes } from './source-snapshot.js';
import { assertCommitSha } from './git-repository.js';
import type { PrivateCommand } from './private-command.js';
import type { VerifiedDeploymentProof } from './verify-memo-deployment.js';

const repository = 'Rouault108/rouault';
const prefix = `repos/${repository}/actions/`;
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('[proof] incomplete API evidence');
  return value as RecordValue;
};
const integer = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new Error('[proof] API identity invalid');
  return value;
};
export interface ArtifactReadLimits {
  maxArchiveBytes: number;
  maxExpandedBytes: number;
  maxEntryBytes: number;
  maxFiles: number;
  maxApiPages: number;
}
/** Only supply this boundary with responses from an existing authorized Actions connection. */
export interface AuthenticatedActionsTransport {
  readJson(endpoint: string): Promise<unknown>;
  readArchive(artifactId: number): Promise<Uint8Array>;
}
export const createGhActionsTransport = (
  command: PrivateCommand,
): AuthenticatedActionsTransport => {
  const read = (endpoint: string) => {
    if (!endpoint.startsWith(prefix) && endpoint !== `repos/${repository}`)
      throw new Error('[proof] API scope mismatch');
    return command('gh', [
      'api',
      '--hostname',
      'github.com',
      '--method',
      'GET',
      '-H',
      'Accept: application/vnd.github+json',
      '-H',
      'X-GitHub-Api-Version: 2026-03-10',
      endpoint,
    ]);
  };
  return {
    readJson: async (endpoint) => JSON.parse((await read(endpoint)).toString('utf8')) as unknown,
    readArchive: (id) => read(`${prefix}artifacts/${integer(id).toString()}/zip`),
  };
};
export const readBoundedArtifactZip = async (
  command: PrivateCommand,
  bytes: Uint8Array,
  limits: ArtifactReadLimits,
): Promise<ReadonlyMap<string, Uint8Array>> => {
  if (bytes.length > limits.maxArchiveBytes) throw new Error('[proof] archive budget exceeded');
  const decoded: unknown = JSON.parse(
    (
      await command(
        'python3',
        [fileURLToPath(new URL('./read-artifact-zip.py', import.meta.url)), JSON.stringify(limits)],
        bytes,
      )
    ).toString('utf8'),
  );
  if (!Array.isArray(decoded)) throw new Error('[proof] invalid archive output');
  const files = new Map<string, Uint8Array>();
  let total = 0;
  for (const pair of decoded) {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      typeof pair[0] !== 'string' ||
      typeof pair[1] !== 'string'
    )
      throw new Error('[proof] invalid archive entry');
    assertSafeContentPath(pair[0]);
    const body = Buffer.from(pair[1], 'base64');
    total += body.length;
    if (files.has(pair[0]) || body.length > limits.maxEntryBytes || total > limits.maxExpandedBytes)
      throw new Error('[proof] invalid archive budget');
    files.set(pair[0], body);
  }
  if (files.size > limits.maxFiles) throw new Error('[proof] archive file count exceeded');
  return files;
};

/** Reads the existing CI artifacts; never dispatches, changes settings or provisions credentials. */
export const createGitHubDeploymentProofReader = (options: {
  actions: AuthenticatedActionsTransport;
  command: PrivateCommand;
  limits: ArtifactReadLimits;
}): ((commitSha: string) => Promise<VerifiedDeploymentProof | null>) => {
  if (
    !['maxArchiveBytes', 'maxExpandedBytes', 'maxEntryBytes', 'maxFiles', 'maxApiPages'].every(
      (key) =>
        Number.isSafeInteger(options.limits[key as keyof ArtifactReadLimits]) &&
        options.limits[key as keyof ArtifactReadLimits] > 0,
    )
  )
    throw new Error('[proof] measured resource limits required');
  const api = async (endpoint: string): Promise<RecordValue> =>
    record(await options.actions.readJson(endpoint));
  const list = async (endpoint: string, key: string): Promise<RecordValue[]> => {
    const values: RecordValue[] = [];
    let expected: number | undefined;
    for (let page = 1; page <= options.limits.maxApiPages; page += 1) {
      const response = await api(
        `${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page.toString()}`,
      );
      const count = response['total_count'];
      const items = response[key];
      if (
        typeof count !== 'number' ||
        !Number.isSafeInteger(count) ||
        count < 0 ||
        !Array.isArray(items) ||
        (expected !== undefined && expected !== count) ||
        count > 100 * options.limits.maxApiPages
      )
        throw new Error('[proof] incomplete paginated evidence');
      expected = count;
      values.push(...items.map(record));
      if (values.length === count) return values;
      if (values.length > count || items.length !== 100)
        throw new Error('[proof] incomplete API page');
    }
    throw new Error('[proof] API pagination budget exceeded');
  };
  const assertRun = (run: RecordValue, sha: string, repoId: number): void => {
    if (
      run['head_sha'] !== sha ||
      run['head_branch'] !== 'main' ||
      run['event'] !== 'push' ||
      run['path'] !== '.github/workflows/ci-cd.yml' ||
      run['status'] !== 'completed' ||
      run['conclusion'] !== 'success' ||
      record(run['repository'])['id'] !== repoId ||
      record(run['head_repository'])['id'] !== repoId
    )
      throw new Error('[proof] completed production run unavailable');
    integer(run['id']);
    integer(run['run_attempt']);
  };
  return async (commitSha) => {
    assertCommitSha(commitSha);
    const identity = await api(`repos/${repository}`);
    const repoId = integer(identity['id']);
    if (
      identity['full_name'] !== repository ||
      identity['private'] !== false ||
      identity['default_branch'] !== 'main'
    )
      throw new Error('[proof] repository identity mismatch');
    const runs = await list(
      `${prefix}workflows/ci-cd.yml/runs?head_sha=${commitSha}&event=push&branch=main`,
      'workflow_runs',
    );
    if (!runs.length) return null;
    runs.sort((a, b) => integer(b['id']) - integer(a['id']));
    const selected = runs[0];
    if (!selected) return null;
    const runId = integer(selected['id']);
    const run = await api(`${prefix}runs/${runId.toString()}`);
    assertRun(run, commitSha, repoId);
    const attempt = integer(run['run_attempt']);
    const jobs = await list(`${prefix}runs/${runId.toString()}/jobs?filter=latest`, 'jobs');
    for (const name of [
      'ci-required',
      'build-production',
      'deploy-production',
      'verify-production-deployment',
    ]) {
      const matching = jobs.filter((job) => job['name'] === name);
      if (
        matching.length !== 1 ||
        matching[0]?.['status'] !== 'completed' ||
        matching[0]['conclusion'] !== 'success' ||
        matching[0]['head_sha'] !== commitSha ||
        matching[0]['run_id'] !== runId
      )
        throw new Error('[proof] required production job unavailable');
    }
    const artifacts = await list(`${prefix}runs/${runId.toString()}/artifacts`, 'artifacts');
    const archive = async (
      name: string,
      jobName: string,
    ): Promise<ReadonlyMap<string, Uint8Array>> => {
      const matches = artifacts.filter((artifact) => artifact['name'] === name);
      if (matches.length !== 1 || !matches[0])
        throw new Error('[proof] artifact missing or ambiguous');
      const artifact = matches[0];
      const origin = record(artifact['workflow_run']);
      const size = integer(artifact['size_in_bytes']);
      const job = jobs.find((item) => item['name'] === jobName);
      const created =
        typeof artifact['created_at'] === 'string' ? Date.parse(artifact['created_at']) : NaN;
      const start = typeof job?.['started_at'] === 'string' ? Date.parse(job['started_at']) : NaN;
      const end = typeof job?.['completed_at'] === 'string' ? Date.parse(job['completed_at']) : NaN;
      if (
        artifact['expired'] !== false ||
        origin['id'] !== runId ||
        origin['head_sha'] !== commitSha ||
        origin['head_branch'] !== 'main' ||
        origin['repository_id'] !== repoId ||
        origin['head_repository_id'] !== repoId ||
        size > options.limits.maxArchiveBytes ||
        ![created, start, end].every(Number.isFinite) ||
        created < start ||
        created > end ||
        typeof artifact['digest'] !== 'string' ||
        !/^sha256:[a-f0-9]{64}$/u.test(artifact['digest'])
      )
        throw new Error('[proof] artifact provenance unavailable');
      const bytes = await options.actions.readArchive(integer(artifact['id']));
      if (bytes.length !== size || `sha256:${hashBytes(bytes)}` !== artifact['digest'])
        throw new Error('[proof] artifact digest mismatch');
      return readBoundedArtifactZip(options.command, bytes, options.limits);
    };
    const dist = await archive('rouault-dist', 'build-production');
    const releaseFiles = await archive(
      `rouault-release-state-${runId.toString()}-${attempt.toString()}`,
      'deploy-production',
    );
    const verificationFiles = await archive(
      'rouault-release-verification-state',
      'verify-production-deployment',
    );
    const state = (files: ReadonlyMap<string, Uint8Array>, name: string) => {
      const body = files.get(name);
      if (files.size !== 1 || !body) throw new Error('[proof] release artifact layout mismatch');
      return assertProductionReleaseStateArtifact(
        JSON.parse(Buffer.from(body).toString('utf8')) as unknown,
      );
    };
    const release = state(releaseFiles, 'release-attempt-final.json');
    const verified = state(verificationFiles, 'release-verification-final.json');
    if (
      release.commitSha !== commitSha ||
      release.cloudflarePages.commitSha !== commitSha ||
      release.runtimeVerification.status !== 'not-run' ||
      verified.runtimeVerification.status !== 'verified-by-production-runtime-artifacts' ||
      !verified.runtimeVerification.checkedAt ||
      JSON.stringify({ ...release, runtimeVerification: null }) !==
        JSON.stringify({ ...verified, runtimeVerification: null })
    )
      throw new Error('[proof] release and verification evidence differ');
    const expectedFiles = new Map<string, Uint8Array>();
    for (const [name, bytes] of dist) {
      if (name.startsWith('dist/')) expectedFiles.set(name.slice('dist/'.length), bytes);
      else if (!name.startsWith('.generated/media/'))
        throw new Error('[proof] unexpected dist artifact layout');
    }
    if (!expectedFiles.size) throw new Error('[proof] dist artifact empty');
    const finalRun = await api(`${prefix}runs/${runId.toString()}`);
    assertRun(finalRun, commitSha, repoId);
    if (finalRun['run_attempt'] !== attempt)
      throw new Error('[proof] run changed while reading evidence');
    return {
      repository,
      commitSha,
      event: 'push',
      branch: 'main',
      deploymentId: release.cloudflarePages.deploymentId,
      jobs: { deploy: 'success', verification: 'success' },
      expectedFiles,
      media: verified.verifiedObjects.map((item) => ({
        url: item.publicUrl,
        hash: item.bodySha256,
        contentType: item.contentType,
      })),
    };
  };
};
