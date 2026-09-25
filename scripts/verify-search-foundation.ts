import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import MiniSearch from 'minisearch';
import { loadNotesData, filterNotesBySurface } from '../build/data/notes.js';
import { buildSearchCatalog } from '../build/search/build-search-catalog.js';
import { emitLexicalFoundation } from '../build/search/emit-lexical-foundation.js';
import {
  decodeArtifact,
  parseDocumentEnvelope,
  parsePassageEnvelope,
  parsePassageStore,
  sha256,
  verifyArtifact,
  lexicalIndexOptions,
  type ArtifactDescriptor,
} from '../shared/search/lexical-artifacts.js';

// 通常build後のHTMLを読み取り、新artifactは検証専用directoryに閉じ込める。
const htmlRoot = resolve('dist');
const outputDir = resolve('.generated/search-foundation');
const notes = loadNotesData();
const catalog = buildSearchCatalog(notes);
if (catalog.length === 0 || catalog.length !== filterNotesBySurface(notes, 'search').length)
  throw new Error('Publication set mismatch');
const htmlByCanonical = new Map<string, string>();
const sources: { canonicalPathname: string; sha256: string }[] = [];
for (const document of catalog) {
  const path = resolve(
    htmlRoot,
    decodeURIComponent(document.canonicalPathname.slice(1)),
    'index.html',
  );
  if (!path.startsWith(htmlRoot + sep)) throw new Error('HTML path outside output root');
  const bytes = await readFile(path);
  sources.push({ canonicalPathname: document.canonicalPathname, sha256: await sha256(bytes) });
  htmlByCanonical.set(document.canonicalPathname, bytes.toString('utf8'));
}
const buildId = await sha256(new TextEncoder().encode(JSON.stringify(sources)));
const start = performance.now();
const result = await emitLexicalFoundation({ notes, htmlByCanonical, outputDir, buildId });
const firstBytes = await readFile(result.manifestPath);
await emitLexicalFoundation({ notes, htmlByCanonical, outputDir, buildId });
if (!firstBytes.equals(await readFile(result.manifestPath)))
  throw new Error('Non-deterministic artifacts');
const load = async (descriptor: ArtifactDescriptor): Promise<unknown> => {
  const bytes = await readFile(join(outputDir, descriptor.path.slice(1)));
  await verifyArtifact(bytes, descriptor);
  return decodeArtifact(bytes);
};
const documents = await parseDocumentEnvelope(await load(result.manifest.documentIndex));
const passages = await parsePassageEnvelope(
  await load(result.manifest.passageIndex),
  documents.documents,
);
parsePassageStore(await load(result.manifest.passageStore), passages.passages);
const documentIndex = MiniSearch.loadJSON(
  documents.serializedIndex,
  lexicalIndexOptions('document'),
);
const passageIndex = MiniSearch.loadJSON(passages.serializedIndex, lexicalIndexOptions('passage'));
if (
  documentIndex.documentCount !== catalog.length ||
  passageIndex.documentCount !== passages.passages.length
)
  throw new Error('Loaded index count mismatch');
const report = {
  status: 'pass',
  scope: 'Stage 1 final HTML foundation; no ranking/cutover decision',
  documents: documents.documents.length,
  passages: passages.passages.length,
  deterministic: true,
  publicationSetEqual: true,
  referenceAndHashValidation: true,
  nodeLoad: true,
  elapsedMs: performance.now() - start,
  assets: result.descriptors,
  sources,
};
await writeFile(join(outputDir, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify({ ...report, sources: sources.length, assets: result.descriptors.length }),
);
