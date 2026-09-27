import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { loadNotesData } from '../../build/data/notes.js';
import { buildSearchCatalog } from '../../build/search/build-search-catalog.js';
import { emitLexicalSite } from '../../build/search/emit-lexical-site.js';
import { assertProductionLexicalArtifacts } from '../../scripts/assert-production-lexical-artifacts.js';

it('final HTMLから生成したproduction artifactを検証し、世代・bytes・公開集合不一致を拒否する', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rouault-lexical-build-'));
  if (
    !resolve(root).startsWith(resolve(tmpdir()) + '\\rouault-lexical-build-') &&
    !resolve(root).startsWith(resolve(tmpdir()) + '/rouault-lexical-build-')
  )
    throw new Error('Unsafe fixture cleanup');
  try {
    const notes = loadNotesData(),
      catalog = buildSearchCatalog(notes);
    for (const item of catalog) {
      const directory = resolve(root, decodeURIComponent(item.canonicalPathname.slice(1)));
      await mkdir(directory, { recursive: true });
      await writeFile(
        join(directory, 'index.html'),
        '<main data-note-static-surface><p>本文 alpha beta</p></main>',
      );
    }
    await writeFile(join(root, 'search-catalog.json'), JSON.stringify(catalog));
    const output = await emitLexicalSite({ notes, outputDir: root });
    expect((await assertProductionLexicalArtifacts(root)).documents).toBe(catalog.length);
    await writeFile(output.manifestPath, JSON.stringify({ ...output.manifest, schemaVersion: 1 }));
    await expect(assertProductionLexicalArtifacts(root)).rejects.toThrow('compatibility');
    await writeFile(output.manifestPath, JSON.stringify(output.manifest));
    const documentFile = join(root, output.manifest.documentIndex.path.slice(1));
    const original = await readFile(documentFile);
    await writeFile(documentFile, '{}');
    await expect(assertProductionLexicalArtifacts(root)).rejects.toThrow('bytes/hash');
    await writeFile(documentFile, original);
    await writeFile(join(root, 'search-catalog.json'), JSON.stringify(catalog.slice(1)));
    await expect(assertProductionLexicalArtifacts(root)).rejects.toThrow('publication set');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
