import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateCandidateArtifacts } from '../../scripts/memos-import/validate-candidate.js';
import type { ImportPlan } from '../../scripts/memos-import/model.js';
describe('candidate final HTML and navigation agreement', () => {
  it('requires the actual final heading IDs, route and navigation build to agree', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'memos-artifacts-'));
    const entry: ImportPlan['entries'][string] = {
      sourcePath: '02_notes/A.md',
      publicPath: 'content/memos/A.md',
      status: 'published' as const,
      approvedRequestRef: 'private:test',
      approvedSourceSha: 'a'.repeat(40),
      approvedContentHash: 'b'.repeat(64),
      dependencyHashes: {},
      publicOutputHashes: {},
      headingMap: { heading: 'Heading' },
    };
    const plan: ImportPlan = {
      writes: new Map(),
      deletes: [],
      manifest: { schemaVersion: 1, files: {} },
      entries: { '02_notes/A.md': entry },
      inputHash: 'c'.repeat(64),
      candidateHash: 'd'.repeat(64),
      confirmations: [],
    };
    try {
      for (const folder of ['assets', 'memos/A', '__router/memos/A'])
        await mkdir(path.join(directory, folder), { recursive: true });
      await writeFile(
        path.join(directory, 'assets/internal-document-routes.json'),
        JSON.stringify({ buildId: 'synthetic', routes: ['/memos/', '/memos/A'] }),
      );
      await writeFile(
        path.join(directory, '__router/memos/A/index.router.json'),
        JSON.stringify({ buildId: 'synthetic' }),
      );
      await writeFile(
        path.join(directory, 'memos/A/index.html'),
        '<article data-hydration-scope="note-content"><header><h1>Title</h1></header><h2 id="heading">Heading</h2></article>',
      );
      await validateCandidateArtifacts(plan, directory);
      await writeFile(
        path.join(directory, 'memos/A/index.html'),
        '<article data-hydration-scope="note-content"><h2 id="different">Heading</h2></article>',
      );
      await expect(validateCandidateArtifacts(plan, directory)).rejects.toThrow('anchor map');
      await writeFile(
        path.join(directory, 'memos/A/index.html'),
        '<article data-hydration-scope="note-content"><h2 id="heading">Heading</h2></article>',
      );
      await writeFile(
        path.join(directory, '__router/memos/A/index.router.json'),
        JSON.stringify({ buildId: 'different' }),
      );
      await expect(validateCandidateArtifacts(plan, directory)).rejects.toThrow('identity');
      entry.status = 'withdrawn';
      await expect(validateCandidateArtifacts(plan, directory)).rejects.toThrow('withdrawn');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
