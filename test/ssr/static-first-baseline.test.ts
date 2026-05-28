import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

interface BaselineArtifact {
  readonly repository?: string;
  readonly resolvedRepositoryFullName?: string;
  readonly repositoryUrl?: string;
  readonly branch?: string;
  readonly commit?: string;
  readonly defaultBranchHeadSha?: string;
  readonly treeSha?: string | null;
  readonly generatedAt?: string;
  readonly source?: string;
  readonly accessMethod?: string;
  readonly zipFilename?: string;
  readonly zipChecksum?: string;
  readonly referencedAt?: string;
  readonly githubUnavailableReason?: string;
  readonly failedAccessMethod?: string;
  readonly zipFallbackCompared?: {
    readonly zipFilename?: string;
    readonly zipChecksum?: string;
  };
}

interface BaselineDiffArtifact {
  readonly githubRepository?: string;
  readonly githubResolvedRepositoryFullName?: string;
  readonly githubRepositoryUrl?: string;
  readonly githubAccessMethod?: string;
  readonly githubMainCommit?: string;
  readonly githubTreeSha?: string | null;
  readonly zipFilename?: string;
  readonly zipChecksum?: string;
  readonly comparedAt?: string;
  readonly differences?: readonly {
    readonly path?: string;
    readonly githubMainState?: string;
    readonly zipFallbackState?: string;
    readonly adoptedSource?: string;
    readonly reason?: string;
  }[];
}

const repoRoot = process.cwd();
const shaPattern = /^[a-f0-9]{40}$/u;

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

describe('static-first implementation baseline', () => {
  it('records the machine-readable GitHub main baseline', () => {
    const path = join(repoRoot, 'build/content/static-first-implementation-baseline.json');
    expect(existsSync(path)).toBe(true);

    const baseline = readJson<BaselineArtifact>(path);
    expect(baseline.source).toBe('github-main');
    expect(baseline.repository).toBe('Rouault108/rouault');
    expect(baseline.resolvedRepositoryFullName).toBe('Rouault108/rouault');
    expect(baseline.repositoryUrl).toBe('https://github.com/Rouault108/rouault');
    expect(baseline.branch).toBe('main');
    expect(baseline.accessMethod).toMatch(/^(github-api|github-web|connector)$/u);
    expect(baseline.commit).toMatch(shaPattern);
    expect(baseline.defaultBranchHeadSha).toBe(baseline.commit);
    expect(baseline.treeSha === null || shaPattern.test(baseline.treeSha ?? '')).toBe(true);
    expect(Date.parse(baseline.generatedAt ?? '')).not.toBeNaN();
  });

  it('records zip fallback differences when a zip comparison is present', () => {
    const baseline = readJson<BaselineArtifact>(
      join(repoRoot, 'build/content/static-first-implementation-baseline.json'),
    );

    if (!baseline.zipFallbackCompared) {
      return;
    }

    const path = join(repoRoot, 'build/content/static-first-baseline-diff.json');
    expect(existsSync(path)).toBe(true);

    const diff = readJson<BaselineDiffArtifact>(path);
    expect(diff.githubRepository).toBe('Rouault108/rouault');
    expect(diff.githubResolvedRepositoryFullName).toBe('Rouault108/rouault');
    expect(diff.githubRepositoryUrl).toBe('https://github.com/Rouault108/rouault');
    expect(diff.githubAccessMethod).toBe(baseline.accessMethod);
    expect(diff.githubMainCommit).toBe(baseline.commit);
    expect(diff.githubTreeSha).toBe(baseline.treeSha);
    expect(diff.zipFilename).toBe(baseline.zipFallbackCompared.zipFilename);
    expect(diff.zipChecksum).toBe(baseline.zipFallbackCompared.zipChecksum);
    expect(Date.parse(diff.comparedAt ?? '')).not.toBeNaN();
    expect(Array.isArray(diff.differences)).toBe(true);

    for (const difference of diff.differences ?? []) {
      expect(difference.path).toEqual(expect.any(String));
      expect(difference.githubMainState).toMatch(/^(present|absent|different)$/u);
      expect(difference.zipFallbackState).toMatch(/^(present|absent|different)$/u);
      expect(difference.adoptedSource).toBe('github-main');
      expect(difference.reason).toEqual(expect.any(String));
    }
  });
});
