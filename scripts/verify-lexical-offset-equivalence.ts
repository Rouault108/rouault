import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deepStrictEqual } from 'node:assert';
import { mapNfkc } from '../shared/search/lexical-analyzer.js';
import { mapNfkcReference } from '../test/fixtures/search/map-nfkc-reference.js';
import {
  parseLexicalManifest,
  parseDocumentEnvelope,
  parsePassageEnvelope,
  parsePassageStore,
  decodeArtifact,
} from '../shared/search/lexical-artifacts.js';
import canonical from '../test/fixtures/search/canonical-v3.json' with { type: 'json' };

const root = resolve('.generated/search-foundation');
const load = async (path: string) =>
  decodeArtifact(new Uint8Array(await readFile(resolve(root, path.replace(/^\//u, '')))));
const manifest = parseLexicalManifest(await load('/search/manifest.json'));
const documents = await parseDocumentEnvelope(await load(manifest.documentIndex.path));
const passages = await parsePassageEnvelope(
  await load(manifest.passageIndex.path),
  documents.documents,
);
const store = parsePassageStore(await load(manifest.passageStore.path), passages.passages);
const inputs = [
  ...canonical.fixtures.map((fixture) => fixture.input),
  ...store.passages.map((passage) => passage.text),
  ...documents.documents.flatMap((document) => [
    document.title,
    document.description,
    document.pathLabel,
    ...document.keywords,
    ...document.tags,
  ]),
];
for (const [index, input] of inputs.entries())
  deepStrictEqual(mapNfkc(input), mapNfkcReference(input), `Input ${String(index)}`);
const result = {
  status: 'pass',
  inputs: inputs.length,
  canonical: canonical.fixtures.length,
  passages: store.passages.length,
  documents: documents.documents.length,
  compared: 'normalized text and every original UTF-16 source span',
  reference: 'D1-reviewed Stage 2 mapNfkc, retained as test-only oracle',
};
await writeFile(resolve(root, 'nfkc-equivalence.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
