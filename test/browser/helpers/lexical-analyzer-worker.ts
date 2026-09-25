import {
  createCanonicalAnalyzer,
  PROVIDER_WASM_SHA256,
} from '../../../shared/search/lexical-analyzer.js';
import fixtures from '../../fixtures/search/canonical-v3.json' with { type: 'json' };
import serialized from '../../fixtures/search/serialized-v2.json' with { type: 'json' };
import MiniSearch from 'minisearch';
import {
  parseLexicalManifest,
  parseDocumentEnvelope,
  parsePassageEnvelope,
  parsePassageStore,
  lexicalIndexOptions,
  verifyArtifact,
} from '../../../shared/search/lexical-artifacts.js';

self.onmessage = async (event: MessageEvent<string>) => {
  let blob: string | undefined;
  try {
    const bytes = await (await fetch(event.data)).arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    if (digest !== PROVIDER_WASM_SHA256) throw new Error('WASM bytes differ');
    blob = URL.createObjectURL(new Blob([bytes], { type: 'application/wasm' }));
    const analyzer = await createCanonicalAnalyzer(blob);
    try {
      for (const fixture of fixtures.fixtures) {
        const result = analyzer.analyze(fixture.input);
        for (const key of [
          'normalized',
          'providerTokens',
          'wordOccurrenceTokens',
          'queryWordTokens',
          'gramOccurrenceTokens',
          'queryGramTokens',
        ] as const) {
          if (JSON.stringify(result[key]) !== JSON.stringify(fixture[key]))
            throw new Error(`${fixture.id}: ${key}`);
        }
        for (const token of [...result.wordOccurrences, ...result.gramOccurrences]) {
          if (
            !fixture.input
              .slice(token.startUtf16, token.endUtf16)
              .normalize('NFKC')
              .replace(/[A-Z]/gu, (c) => c.toLowerCase())
              .includes(token.surface)
          )
            throw new Error(`${fixture.id}: offset`);
        }
      }
      const manifest = parseLexicalManifest(serialized.manifest);
      for (const [value, descriptor] of [
        [serialized.document, manifest.documentIndex],
        [serialized.passage, manifest.passageIndex],
        [serialized.store, manifest.passageStore],
      ] as const) {
        await verifyArtifact(new TextEncoder().encode(JSON.stringify(value)), descriptor);
      }
      const document = await parseDocumentEnvelope(serialized.document);
      const passage = await parsePassageEnvelope(serialized.passage, document.documents);
      parsePassageStore(serialized.store, passage.passages);
      const index = MiniSearch.loadJSON(document.serializedIndex, lexicalIndexOptions('document'));
      const passageIndex = MiniSearch.loadJSON(
        passage.serializedIndex,
        lexicalIndexOptions('passage'),
      );
      if (
        index.search('株式会社', { fields: ['titleWord'] }).length !== 1 ||
        passageIndex.search('boxing', { fields: ['passageWord'] }).length !== 1
      )
        throw new Error('Node index load');
      self.postMessage({ count: fixtures.fixtures.length, digest, nodeIndexLoad: true });
    } finally {
      analyzer.dispose();
    }
  } catch (error: unknown) {
    self.postMessage({ error: String(error) });
  } finally {
    if (blob) URL.revokeObjectURL(blob);
  }
};
