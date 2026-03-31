import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

import type { SearchCatalogSourceNote } from './build-search-catalog.js';
import { serializeSearchCatalog } from './build-search-catalog.js';

interface EmitSearchArtifactsDependencies {
  mkdir?: typeof mkdir;
  writeFile?: typeof writeFile;
}

export interface EmitSearchArtifactsInput {
  notes: readonly SearchCatalogSourceNote[];
  outputDir: string;
}

export function renderSearchCatalogArtifact(notes: readonly SearchCatalogSourceNote[]): string {
  return serializeSearchCatalog(notes);
}

export async function emitSearchArtifacts(
  input: EmitSearchArtifactsInput,
  dependencies: EmitSearchArtifactsDependencies = {},
): Promise<{ searchCatalogPath: string; searchCatalogJson: string }> {
  const mkdirImpl = dependencies.mkdir ?? mkdir;
  const writeFileImpl = dependencies.writeFile ?? writeFile;
  const searchCatalogPath = path.resolve(input.outputDir, 'search-catalog.json');
  const searchCatalogJson = renderSearchCatalogArtifact(input.notes);

  await mkdirImpl(input.outputDir, { recursive: true });
  await writeFileImpl(searchCatalogPath, searchCatalogJson, 'utf8');

  return {
    searchCatalogPath,
    searchCatalogJson,
  };
}
