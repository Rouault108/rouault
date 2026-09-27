import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { RUN_BUILD_STEPS } from '../../scripts/run-build-process.js';
import { resolveNotePublicationPolicy } from '../../shared/note/note-publication-policy.js';

it('旧検索dependencyとbuild/loader/hookを再導入せず、独立した公開surfaceを保持する', () => {
  for (const path of ['package.json', 'pnpm-lock.yaml', '_headers']) {
    expect(readFileSync(path, 'utf8')).not.toMatch(/pagefind/iu);
  }
  for (const path of [
    'scripts/build-pagefind.ts',
    'build/search/build-pagefind-document-data.ts',
    'build/search/indexing/pagefind-aux-text.ts',
    'src/search/sources/pagefind-source.ts',
  ])
    expect(existsSync(path)).toBe(false);
  expect(RUN_BUILD_STEPS.map((step) => step.label).join(' ')).not.toMatch(/pagefind/iu);
  for (const path of [
    'src/layouts/NoteLayout.11ty.ts',
    'src/layouts/BaseLayout.11ty.ts',
    'src/notes.11ty.ts',
    'shared/search/search-loaders.ts',
    'shared/search/search-artifact-url.ts',
    'build/dev/dev-search-artifact-middleware.ts',
  ])
    expect(readFileSync(path, 'utf8')).not.toMatch(/pagefind/iu);
  expect(resolveNotePublicationPolicy('reader')).toEqual({
    search: true,
    home: true,
    tags: true,
    corpora: true,
  });
  for (const kind of ['testing', 'demo']) {
    expect(resolveNotePublicationPolicy(kind)).toEqual({
      search: false,
      home: false,
      tags: false,
      corpora: false,
    });
  }
});
