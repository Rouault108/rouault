import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import type { SearchDocument, SearchPassage } from '../../shared/search/search-projection.js';
import {
  LEXICAL_COMPATIBILITY,
  parseLexicalManifest,
  parseDocumentEnvelope,
  parsePassageEnvelope,
  parsePassageStore,
  sha256,
  type ArtifactDescriptor,
  type DocumentMetadata,
  type PassageMetadata,
} from '../../shared/search/lexical-artifacts.js';

export function projectionMetadata(
  documents: readonly SearchDocument[],
  passages: readonly SearchPassage[],
) {
  const documentMetadata: DocumentMetadata[] = documents.map((document) => ({
    id: document.canonicalPathname,
    canonicalPathname: document.canonicalPathname,
    title: document.title,
    description: document.description,
    pathLabel: document.pathLabel,
    date: document.date,
    keywords: [...document.keywords],
    tags: [...document.tags],
  }));
  const passageMetadata: PassageMetadata[] = passages.map((passage) => ({
    id: passage.passageId,
    documentId: passage.canonicalPathname,
    canonicalPathname: passage.canonicalPathname,
    order: passage.order,
    headingPath: [...passage.headingPath],
    anchorId: passage.anchorId,
    currentHeading: passage.headingPath.at(-1) ?? '',
    ancestorHeading: passage.headingPath.slice(0, -1).join(' '),
  }));
  return { documents: documentMetadata, passages: passageMetadata };
}

/** index生成は次段のowner。ここではserialized bytesとprojectionの整合を検証して封入する。 */
export async function writeLexicalArtifacts(options: {
  outputDir: string;
  buildId: string;
  documents: readonly SearchDocument[];
  passages: readonly SearchPassage[];
  documentIndex: string;
  passageIndex: string;
}) {
  const encode = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));
  const metadata = projectionMetadata(options.documents, options.passages);
  const documentEnvelope = await parseDocumentEnvelope({
    schemaVersion: 2,
    kind: 'document',
    serializedIndex: options.documentIndex,
    indexSha256: await sha256(new TextEncoder().encode(options.documentIndex)),
    documents: metadata.documents,
  });
  const passageEnvelope = await parsePassageEnvelope(
    {
      schemaVersion: 2,
      kind: 'passage',
      serializedIndex: options.passageIndex,
      indexSha256: await sha256(new TextEncoder().encode(options.passageIndex)),
      passages: metadata.passages,
    },
    metadata.documents,
  );
  const store = parsePassageStore(
    {
      schemaVersion: 2,
      kind: 'store',
      passages: options.passages.map((passage) => ({ id: passage.passageId, text: passage.text })),
    },
    metadata.passages,
  );
  const providerConfig = await readFile(
    new URL('../../shared/search/suzume-provider-config.json', import.meta.url),
  );
  const providerArtifact = await readFile(new URL(import.meta.resolve('@libraz/suzume/wasm')));
  if (
    (await sha256(providerConfig)) !== LEXICAL_COMPATIBILITY.providerConfigSha256 ||
    (await sha256(providerArtifact)) !== LEXICAL_COMPATIBILITY.providerArtifactSha256
  )
    throw new Error('Provider distribution identity');
  const payloads = [
    ['document', 'json', encode(documentEnvelope)],
    ['passage', 'json', encode(passageEnvelope)],
    ['store', 'json', encode(store)],
    ['suzume', 'wasm', providerArtifact],
    ['provider-config', 'json', providerConfig],
    [
      'suzume-LICENSE',
      'txt',
      await readFile(new URL('./licenses/suzume-LICENSE.txt', import.meta.url)),
    ],
    [
      'minisearch-LICENSE',
      'txt',
      await readFile(new URL('../../LICENSE.txt', import.meta.resolve('minisearch'))),
    ],
  ] as const;
  const descriptors: ArtifactDescriptor[] = [];
  const assets: { path: string; bytes: Uint8Array }[] = [];
  for (const [name, extension, bytes] of payloads) {
    const digest = await sha256(bytes),
      path = `/search/${name}.${digest}.${extension}`;
    descriptors.push({ path, sha256: digest, bytes: bytes.byteLength });
    assets.push({ path, bytes });
  }
  const [documentIndex, passageIndex, passageStore, wasm, config] = descriptors;
  const manifest = parseLexicalManifest({
    ...LEXICAL_COMPATIBILITY,
    buildId: options.buildId,
    documentIndexSha256: documentIndex?.sha256,
    passageIndexSha256: passageIndex?.sha256,
    passageStoreSha256: passageStore?.sha256,
    documentIndex,
    passageIndex,
    passageStore,
    providerArtifact: wasm,
    providerConfig: config,
  });
  // 検証を完了してから出力し、manifestを最後に置換して世代の部分公開を避ける。
  const root = join(options.outputDir, 'search');
  await mkdir(root, { recursive: true });
  for (const asset of assets)
    await writeFile(join(options.outputDir, asset.path.slice(1)), asset.bytes);
  const manifestPath = join(root, 'manifest.json'),
    temporaryPath = `${manifestPath}.tmp`;
  await writeFile(temporaryPath, encode(manifest));
  await rename(temporaryPath, manifestPath);
  return { manifest, descriptors, manifestPath };
}
