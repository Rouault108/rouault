import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import MiniSearch from 'minisearch';
import { emitLexicalFoundation } from '../../build/search/emit-lexical-foundation.js';
import {
  decodeArtifact,
  parseLexicalManifest,
  parseDocumentEnvelope,
  parsePassageEnvelope,
  parsePassageStore,
  verifyArtifact,
  lexicalIndexOptions,
  sha256,
  LEXICAL_COMPATIBILITY,
  type ArtifactDescriptor,
} from '../../shared/search/lexical-artifacts.js';
import { SUZUME_OPTIONS } from '../../shared/search/lexical-provider-config.js';
import serialized from '../fixtures/search/serialized-v2.json' with { type: 'json' };

const note = {
  title: '株式会社',
  slug: 'example',
  permalink: '/notes/example/',
  description: '説明',
  genre: ['tag'],
};
const html = new Map([
  [
    '/notes/example/',
    '<main data-note-static-surface><h2 id="h">値型</h2><p>コピー boxing コピー</p><p>株式会社</p></main>',
  ],
]);

describe('lexical artifact foundation', () => {
  it('final HTML → Analyzer → Node index → hashed artifacts → loadが決定的で参照が完結する', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'rouault-lexical-'));
    const options = {
      notes: [note, { ...note, kind: 'testing' as const }],
      htmlByCanonical: html,
      outputDir,
      buildId: 'fixture-build',
    };
    const first = await emitLexicalFoundation(options);
    const manifestBytes = await readFile(first.manifestPath);
    const second = await emitLexicalFoundation(options);
    expect(await readFile(second.manifestPath)).toEqual(manifestBytes);
    const manifest = parseLexicalManifest(decodeArtifact(manifestBytes));
    const load = async (descriptor: ArtifactDescriptor): Promise<unknown> => {
      const bytes = await readFile(join(outputDir, descriptor.path.slice(1)));
      await verifyArtifact(bytes, descriptor);
      return decodeArtifact(bytes);
    };
    const document = await parseDocumentEnvelope(await load(manifest.documentIndex));
    const passage = await parsePassageEnvelope(
      await load(manifest.passageIndex),
      document.documents,
    );
    const store = parsePassageStore(await load(manifest.passageStore), passage.passages);
    expect({ manifest, document, passage, store }).toEqual({
      manifest: serialized.manifest,
      document: serialized.document,
      passage: serialized.passage,
      store: serialized.store,
    });
    expect(document.documents).toHaveLength(1);
    expect(passage.passages).toHaveLength(2);
    expect(store.passages.map((p) => p.text)).toEqual(['コピー boxing コピー', '株式会社']);
    expect(document.documents[0]).not.toHaveProperty('body');
    expect(passage.passages[0]).not.toHaveProperty('text');
    const index = MiniSearch.loadJSON(document.serializedIndex, lexicalIndexOptions('document'));
    expect(index.search('株式会社', { fields: ['titleWord'] }).map((hit) => hit.id)).toEqual([
      '/notes/example/',
    ]);
    const passageIndex = MiniSearch.loadJSON(
      passage.serializedIndex,
      lexicalIndexOptions('passage'),
    );
    expect(passageIndex.search('boxing', { fields: ['passageWord'] })).toHaveLength(1);
    expect(passageIndex.search('box', { fields: ['passageGram'] })).toHaveLength(0);
    expect(await readdir(join(outputDir, 'search'))).toContainEqual(
      expect.stringMatching(/^suzume-LICENSE\.[a-f0-9]{64}\.txt$/u),
    );
    const config = await load(manifest.providerConfig);
    expect(config).toMatchObject({ options: SUZUME_OPTIONS });

    for (const change of [
      { schemaVersion: 1 },
      { engineVersion: '7.1.0' },
      { analyzerPolicyId: 'rouault-lexical-v2' },
      { providerArtifactSha256: '0'.repeat(64) },
    ]) {
      expect(() => parseLexicalManifest({ ...manifest, ...change })).toThrow('compatibility');
    }
    expect(() =>
      parseLexicalManifest({
        ...manifest,
        documentIndex: { ...manifest.documentIndex, path: '/search/../bad' },
      }),
    ).toThrow('artifact path');
    await expect(verifyArtifact(new Uint8Array([1]), manifest.documentIndex)).rejects.toThrow(
      'bytes/hash',
    );
    await expect(
      parseDocumentEnvelope({ ...document, serializedIndex: document.serializedIndex + ' ' }),
    ).rejects.toThrow('inner index hash');
    await expect(
      parseDocumentEnvelope({
        ...document,
        documents: [...document.documents, ...document.documents],
      }),
    ).rejects.toThrow('duplicate');
    await expect(parsePassageEnvelope(passage, [])).rejects.toThrow('passage reference');
    expect(() => parsePassageStore({ ...store, passages: [] }, passage.passages)).toThrow(
      'store references',
    );
  });

  it('承認済みindexOptions digestとtokenizer契約が一致する', async () => {
    const options = {
      engine: 'minisearch',
      engineVersion: '7.2.0',
      idField: 'id',
      storeFields: [],
      tokenize: 'empty=>[]; otherwise split U+001F',
      processTerm: 'identity',
      documentFields: lexicalIndexOptions('document').fields,
      passageFields: lexicalIndexOptions('passage').fields,
    };
    expect(await sha256(new TextEncoder().encode(JSON.stringify(options)))).toBe(
      LEXICAL_COMPATIBILITY.indexOptionsSha256,
    );
    expect(lexicalIndexOptions('document').tokenize('x\u001fx')).toEqual(['x', 'x']);
    expect(lexicalIndexOptions('document').tokenize('')).toEqual([]);
  });

  it('不正projectionはmanifestを書き出す前に失敗する', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'rouault-lexical-invalid-'));
    await expect(
      emitLexicalFoundation({
        notes: [note, note],
        htmlByCanonical: html,
        outputDir,
        buildId: 'invalid',
      }),
    ).rejects.toThrow('Duplicate');
    expect(await readdir(outputDir)).toEqual([]);
  });
});
