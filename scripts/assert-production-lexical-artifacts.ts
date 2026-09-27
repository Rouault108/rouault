import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import MiniSearch from 'minisearch';
import {
  parseLexicalManifest,
  parseDocumentEnvelope,
  parsePassageEnvelope,
  parsePassageStore,
  verifyArtifact,
  decodeArtifact,
  lexicalIndexOptions,
  sha256,
  type ArtifactDescriptor,
} from '../shared/search/lexical-artifacts.js';

/** Catalogの公開集合と同じindex、全descriptor bytes、Node loadをrelease時に検証する。 */
export async function assertProductionLexicalArtifacts(outputDir = resolve('dist')) {
  const manifest = parseLexicalManifest(
    JSON.parse(await readFile(resolve(outputDir, 'search/manifest.json'), 'utf8')),
  );
  const load = async (descriptor: ArtifactDescriptor) => {
    const bytes = await readFile(resolve(outputDir, descriptor.path.slice(1)));
    await verifyArtifact(bytes, descriptor);
    return bytes;
  };
  const documents = await parseDocumentEnvelope(decodeArtifact(await load(manifest.documentIndex)));
  const passages = await parsePassageEnvelope(
    decodeArtifact(await load(manifest.passageIndex)),
    documents.documents,
  );
  parsePassageStore(decodeArtifact(await load(manifest.passageStore)), passages.passages);
  await load(manifest.providerArtifact);
  await load(manifest.providerConfig);
  for (const [name, source] of [
    ['suzume-LICENSE', new URL('../build/search/licenses/suzume-LICENSE.txt', import.meta.url)],
    ['minisearch-LICENSE', new URL('../../LICENSE.txt', import.meta.resolve('minisearch'))],
  ] as const) {
    const bytes = await readFile(source),
      hash = await sha256(bytes);
    await verifyArtifact(await readFile(resolve(outputDir, `search/${name}.${hash}.txt`)), {
      path: `/search/${name}.${hash}.txt`,
      sha256: hash,
      bytes: bytes.byteLength,
    });
  }
  const catalog: unknown = JSON.parse(
    await readFile(resolve(outputDir, 'search-catalog.json'), 'utf8'),
  );
  if (!Array.isArray(catalog)) throw new Error('Invalid production Catalog');
  const expected = catalog
    .map((item: unknown) => {
      if (
        !item ||
        typeof item !== 'object' ||
        !('canonicalPathname' in item) ||
        typeof item.canonicalPathname !== 'string'
      )
        throw new Error('Invalid Catalog path');
      return item.canonicalPathname;
    })
    .sort();
  const actual = documents.documents.map((document) => document.canonicalPathname).sort();
  if (
    new Set(expected).size !== expected.length ||
    JSON.stringify(expected) !== JSON.stringify(actual)
  )
    throw new Error('Lexical publication set mismatch');
  if (
    MiniSearch.loadJSON(documents.serializedIndex, lexicalIndexOptions('document'))
      .documentCount !== actual.length ||
    MiniSearch.loadJSON(passages.serializedIndex, lexicalIndexOptions('passage')).documentCount !==
      passages.passages.length
  )
    throw new Error('Invalid production index count');
  return {
    documents: actual.length,
    passages: passages.passages.length,
    buildId: manifest.buildId,
  };
}
