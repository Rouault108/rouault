import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  createGitHubDeploymentProofReader,
  createGhActionsTransport,
  readBoundedArtifactZip,
  type AuthenticatedActionsTransport,
} from '../../scripts/memos-import/read-github-deployment-proof.js';
import { createPrivateCommand } from '../../scripts/memos-import/private-command.js';
import { hashBytes } from '../../scripts/memos-import/source-snapshot.js';
const sha = 'a'.repeat(40);
const prefix = 'repos/Rouault108/rouault/actions/';
const limits = {
  maxArchiveBytes: 100_000,
  maxExpandedBytes: 100_000,
  maxEntryBytes: 80_000,
  maxFiles: 100,
  maxApiPages: 2,
};
const command = createPrivateCommand({
  environment: process.env,
  timeoutMs: 10_000,
  maxOutputBytes: 300_000,
});
const zip = (files: readonly (readonly [string, string, number?])[]): Buffer =>
  execFileSync(
    'python3',
    [
      '-Wignore',
      '-c',
      'import sys,io,json,zipfile\nb=io.BytesIO()\nwith zipfile.ZipFile(b,"w") as z:\n for p in json.load(sys.stdin):\n  i=zipfile.ZipInfo(p[0]); i.external_attr=(p[2] if len(p)==3 else 0o100600)<<16; i.compress_type=zipfile.ZIP_DEFLATED; z.writestr(i,p[1])\nsys.stdout.buffer.write(b.getvalue())',
    ],
    { input: JSON.stringify(files) },
  );
const fixture = () => {
  const run = {
    id: 7,
    run_attempt: 1,
    head_sha: sha,
    head_branch: 'main',
    event: 'push',
    path: '.github/workflows/ci-cd.yml',
    status: 'completed',
    conclusion: 'success',
    repository: { id: 12 },
    head_repository: { id: 12 },
  };
  const jobs = [
    'ci-required',
    'build-production',
    'deploy-production',
    'verify-production-deployment',
  ].map((name) => ({
    name,
    run_id: 7,
    head_sha: sha,
    status: 'completed',
    conclusion: 'success',
    started_at: '2026-01-01T00:00:00Z',
    completed_at: '2026-01-01T00:01:00Z',
  }));
  const release = {
    schemaVersion: 1,
    artifactKind: 'production-release-state',
    commitSha: sha,
    createdAt: '2026-01-01T00:00:30Z',
    uploadedObjects: [],
    verifiedObjects: [],
    cloudflarePages: {
      deploymentId: 'synthetic-deployment',
      deploymentUrl: 'https://synthetic.pages.dev/',
      projectName: 'rouault',
      branch: 'main',
      commitSha: sha,
      wranglerOutputKind: 'jsonl-structured-output',
      wranglerVersion: '4.100.0',
    },
    runtimeVerification: { status: 'not-run', checkedAt: null },
  };
  const verified = {
    ...release,
    runtimeVerification: {
      status: 'verified-by-production-runtime-artifacts',
      checkedAt: '2026-01-01T00:00:40Z',
    },
  };
  const archives = new Map([
    [
      1,
      zip([
        ['dist/memos/index.html', '<main>Synthetic memo index</main>'],
        ['.generated/media/manifest.json', '{}'],
      ]),
    ],
    [2, zip([['release-attempt-final.json', JSON.stringify(release)]])],
    [3, zip([['release-verification-final.json', JSON.stringify(verified)]])],
  ]);
  const artifacts = [
    'rouault-dist',
    'rouault-release-state-7-1',
    'rouault-release-verification-state',
  ].map((name, index) => {
    const body = archives.get(index + 1) ?? Buffer.alloc(0);
    return {
      id: index + 1,
      name,
      size_in_bytes: body.length,
      digest: `sha256:${hashBytes(body)}`,
      expired: false,
      created_at: '2026-01-01T00:00:30Z',
      workflow_run: {
        id: 7,
        repository_id: 12,
        head_repository_id: 12,
        head_sha: sha,
        head_branch: 'main',
      },
    };
  });
  let incomplete = false;
  let finalAttempt = 1;
  let reads = 0;
  const calls: string[] = [];
  const actions: AuthenticatedActionsTransport = {
    async readJson(endpoint) {
      calls.push(endpoint);
      if (endpoint === 'repos/Rouault108/rouault')
        return { id: 12, full_name: 'Rouault108/rouault', private: false, default_branch: 'main' };
      if (endpoint.startsWith(`${prefix}workflows/ci-cd.yml/runs?`))
        return { total_count: incomplete ? 2 : 1, workflow_runs: [run] };
      if (endpoint === `${prefix}runs/7`) {
        reads += 1;
        return { ...run, run_attempt: reads > 1 ? finalAttempt : run.run_attempt };
      }
      if (endpoint.startsWith(`${prefix}runs/7/jobs?`)) return { total_count: jobs.length, jobs };
      if (endpoint.startsWith(`${prefix}runs/7/artifacts?`))
        return { total_count: artifacts.length, artifacts };
      throw new Error('Unexpected synthetic endpoint');
    },
    async readArchive(id) {
      calls.push(`archive:${id.toString()}`);
      const body = archives.get(id);
      if (!body) throw new Error('Synthetic artifact missing');
      return body;
    },
  };
  return {
    run,
    jobs,
    artifacts,
    archives,
    actions,
    calls,
    setIncomplete: () => {
      incomplete = true;
    },
    setFinalAttempt: (value: number) => {
      finalAttempt = value;
    },
    release,
    verified,
  };
};
describe('authenticated production release proof reader', () => {
  it('binds successful jobs, immutable ZIP digests and existing release schemas to the exact main SHA', async () => {
    const f = fixture();
    const proof = await createGitHubDeploymentProofReader({ actions: f.actions, command, limits })(
      sha,
    );
    expect(proof?.deploymentId).toBe('synthetic-deployment');
    expect(proof?.commitSha).toBe(sha);
    expect(proof?.expectedFiles.size).toBe(1);
    expect(Buffer.from(proof?.expectedFiles.get('memos/index.html') ?? []).toString()).toContain(
      'Synthetic',
    );
    expect(f.calls.filter((item) => item.startsWith('archive:'))).toHaveLength(3);
  });
  it.each(['digest', 'expired', 'origin', 'sha', 'skipped', 'pagination', 'attempt', 'release'])(
    'stops on %s evidence and never accepts an older success',
    async (failure) => {
      const f = fixture();
      const artifact = f.artifacts[0];
      const verification = f.artifacts[2];
      const deploy = f.jobs[2];
      if (!artifact || !verification || !deploy) throw new Error('Synthetic fixture incomplete');
      if (failure === 'digest') artifact.digest = `sha256:${'b'.repeat(64)}`;
      if (failure === 'expired') artifact.expired = true;
      if (failure === 'origin') artifact.workflow_run.repository_id = 13;
      if (failure === 'sha') f.run.head_sha = 'b'.repeat(40);
      if (failure === 'skipped') deploy.conclusion = 'skipped';
      if (failure === 'pagination') f.setIncomplete();
      if (failure === 'attempt') f.setFinalAttempt(2);
      if (failure === 'release') {
        f.verified.cloudflarePages = { ...f.verified.cloudflarePages, commitSha: 'b'.repeat(40) };
        const body = zip([['release-verification-final.json', JSON.stringify(f.verified)]]);
        f.archives.set(3, body);
        verification.digest = `sha256:${hashBytes(body)}`;
        verification.size_in_bytes = body.length;
      }
      await expect(
        createGitHubDeploymentProofReader({ actions: f.actions, command, limits })(sha),
      ).rejects.toThrow('[proof]');
    },
  );
  it('uses only authenticated read calls and refuses another repo', async () => {
    const calls: string[][] = [];
    const transport = createGhActionsTransport(async (name, args) => {
      expect(name).toBe('gh');
      calls.push([...args]);
      return Buffer.from('{}');
    });
    await transport.readJson('repos/Rouault108/rouault');
    await transport.readArchive(5);
    expect(calls.every((args) => args.includes('GET') && args.includes('github.com'))).toBe(true);
    await expect(transport.readJson('repos/Other/repo')).rejects.toThrow('scope');
    expect(calls).toHaveLength(2);
  });
  it('rejects traversal, duplicate/case collision, CRC corruption and archive expansion beyond budget without extraction', async () => {
    for (const files of [
      [['../private.md', 'x']],
      [
        ['A', 'x'],
        ['a', 'y'],
      ],
      [
        ['same', 'x'],
        ['same', 'y'],
      ],
    ] as const)
      await expect(readBoundedArtifactZip(command, zip(files), limits)).rejects.toThrow();
    await expect(
      readBoundedArtifactZip(command, zip([['large', 'x'.repeat(2000)]]), {
        ...limits,
        maxEntryBytes: 1000,
      }),
    ).rejects.toThrow();
    await expect(
      readBoundedArtifactZip(command, zip([['symlink', 'outside', 0o120777]]), limits),
    ).rejects.toThrow();
    const body = zip([['body', 'Synthetic checksum']]);
    const crc = body.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])) + 16;
    body[crc] = (body[crc] ?? 0) ^ 1;
    await expect(readBoundedArtifactZip(command, body, limits)).rejects.toThrow();
  });
});
