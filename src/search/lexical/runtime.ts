import {
  createCanonicalAnalyzer,
  type LexicalAnalyzer,
} from '../../../shared/search/lexical-analyzer.js';
import {
  decodeArtifact,
  parseDocumentEnvelope,
  parsePassageEnvelope,
  parsePassageStore,
  type DocumentEnvelope,
  type LexicalManifest,
} from '../../../shared/search/lexical-artifacts.js';
import {
  LexicalFailure,
  LEXICAL_TIMEOUTS,
  type LexicalContext,
  type LexicalResult,
} from '../../../shared/search/lexical-protocol.js';
import type { SearchRequest } from '../../../shared/search/search-types.js';
import {
  fetchArtifact,
  loadLexicalManifest,
  resolveLexicalArtifact,
  type ArtifactFetch,
} from './artifact-loader.js';
import { sha256 } from '../../../shared/search/lexical-artifacts.js';
import { LexicalRanker, type LexicalRanking } from './ranking.js';
import { OccurrenceCache, selectLexicalSnippet } from './snippet.js';

export type ProviderFactory = (verifiedBytes: Uint8Array) => Promise<LexicalAnalyzer>;
const browserProvider: ProviderFactory = async (bytes) => {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/wasm' }));
  try {
    return await createCanonicalAnalyzer(url);
  } finally {
    URL.revokeObjectURL(url);
  }
};
export class LexicalRuntime {
  private manifest: LexicalManifest | undefined;
  private context: LexicalContext | undefined;
  private document: DocumentEnvelope | undefined;
  private analyzer: LexicalAnalyzer | undefined;
  private ranker: LexicalRanker | undefined;
  private store: Map<string, string> | null = null;
  private passageLoaded = false;
  private readonly cache = new OccurrenceCache();
  private identity = '';
  private disposed = false;
  lastRanking: LexicalRanking | undefined;
  constructor(
    private readonly fetcher: ArtifactFetch = fetch,
    private readonly createProvider: ProviderFactory = browserProvider,
  ) {}

  async initialize(
    context: LexicalContext,
    manifestSha: string,
    identity: string,
    signal: AbortSignal,
  ) {
    const start = performance.now();
    const verified = await loadLexicalManifest(context, signal, this.fetcher);
    if (verified.identity !== identity || verified.manifestSha !== manifestSha)
      throw new LexicalFailure('lexical-load-failed', 'validate', 'Manifest identity changed');
    this.context = context;
    this.manifest = verified.manifest;
    this.identity = identity;
    await this.load('providerConfig', signal);
    const wasm = await this.load('providerArtifact', signal);
    let provider: LexicalAnalyzer;
    try {
      provider = await this.createProvider(wasm);
    } catch {
      throw new LexicalFailure(
        'lexical-analyzer-unavailable',
        'normalize',
        'Provider initialization',
      );
    }
    if (this.disposed || signal.aborted) {
      provider.dispose();
      signal.throwIfAborted();
      throw new Error('Runtime disposed');
    }
    this.analyzer = {
      analyze: (input) => {
        try {
          return provider.analyze(input);
        } catch {
          throw new LexicalFailure(
            'lexical-analyzer-unavailable',
            'normalize',
            'Canonical analysis',
          );
        }
      },
      memoryBytes: () => provider.memoryBytes(),
      dispose: () => {
        provider.dispose();
      },
    };
    try {
      this.document = await parseDocumentEnvelope(
        decodeArtifact(await this.load('documentIndex', signal)),
      );
      this.ranker = new LexicalRanker(this.document);
    } catch (error: unknown) {
      signal.throwIfAborted();
      if (error instanceof LexicalFailure) throw error;
      throw new LexicalFailure('lexical-load-failed', 'validate', 'Document index');
    }
    this.cache.clear();
    return {
      identity,
      initMs: performance.now() - start,
      wasmMemory: this.analyzer.memoryBytes(),
      assets: [],
    };
  }
  private load(
    kind: 'providerConfig' | 'providerArtifact' | 'documentIndex' | 'passageIndex' | 'passageStore',
    signal: AbortSignal,
    limit: number = LEXICAL_TIMEOUTS.artifactFetch,
  ): Promise<Uint8Array> {
    if (!this.manifest || !this.context)
      throw new LexicalFailure('lexical-load-failed', 'validate', 'Uninitialized artifact owner');
    const descriptor = this.manifest[kind];
    return fetchArtifact(
      resolveLexicalArtifact(this.context, descriptor.path),
      signal,
      limit,
      descriptor,
      this.fetcher,
    );
  }
  async search(request: SearchRequest, signal: AbortSignal): Promise<LexicalResult> {
    signal.throwIfAborted();
    const start = performance.now(),
      deadline = start + LEXICAL_TIMEOUTS.workerSearch;
    if (this.disposed || !this.document || !this.ranker || !this.analyzer)
      throw new LexicalFailure('lexical-worker-failed', 'validate', 'Runtime not ready');
    if (request.q.trim() && request.mode === 'explore' && !this.passageLoaded) {
      try {
        const envelope = await parsePassageEnvelope(
          decodeArtifact(
            await this.load(
              'passageIndex',
              signal,
              Math.min(LEXICAL_TIMEOUTS.artifactFetch, deadline - performance.now()),
            ),
          ),
          this.document.documents,
        );
        signal.throwIfAborted();
        this.ranker.loadPassages(envelope);
        this.passageLoaded = true;
      } catch (error: unknown) {
        signal.throwIfAborted();
        if (error instanceof LexicalFailure) throw error;
        throw new LexicalFailure('lexical-load-failed', 'validate', 'Passage index');
      }
    }
    try {
      const analysis = this.analyzer.analyze(request.q);
      const ranking = this.ranker.rank(request.q, request.mode, analysis);
      this.lastRanking = ranking;
      let storeFailure = false;
      if (
        request.mode === 'explore' &&
        ranking.ranked.some((hit) => hit.rankingBestPassageId) &&
        !this.store
      ) {
        try {
          const store = parsePassageStore(
            decodeArtifact(
              await this.load(
                'passageStore',
                signal,
                Math.min(LEXICAL_TIMEOUTS.passageStore, deadline - performance.now()),
              ),
            ),
            [...this.ranker.passages.values()],
          );
          signal.throwIfAborted();
          this.store = new Map(store.passages.map((passage) => [passage.id, passage.text]));
        } catch {
          signal.throwIfAborted();
          storeFailure = true;
        }
      }
      const analyzer = this.analyzer;
      const passages = this.ranker.passages;
      const candidates = ranking.ranked.map((hit) => {
        const selected = selectLexicalSnippet({
          hit,
          ranking,
          mode: request.mode,
          queryWords: analysis.queryWordTokens,
          queryGrams: analysis.queryGramTokens,
          passages,
          store: this.store,
          analyzer,
          cache: this.cache,
          identity: this.identity,
        });
        const degraded = storeFailure && selected.degraded;
        return {
          id: hit.document.id,
          canonicalPathname: hit.document.canonicalPathname,
          title: hit.document.title,
          date: hit.document.date || null,
          tags: hit.document.tags,
          description: hit.document.description,
          snippet: selected.snippet,
          source: selected.source,
          bodyMatch: selected.bodyMatch,
          degraded,
          issues: degraded ? ['lexical-snippet-unavailable' as const] : [],
          evidence: {
            fusionScore: hit.fusionScore,
            rankingBestPassageId: hit.rankingBestPassageId,
            snippetPassageId: selected.snippetPassageId,
            exactTitle: hit.exactTitle,
            titlePrefix: hit.titlePrefix,
          },
        };
      });
      signal.throwIfAborted();
      return {
        candidates,
        queryTokens: [...analysis.queryWordTokens, ...analysis.queryGramTokens],
        traceSha256: await sha256(new TextEncoder().encode(JSON.stringify(ranking.traces))),
        metrics: {
          queryMs: performance.now() - start,
          wasmMemory: this.analyzer.memoryBytes(),
          cache: this.cache.stats,
          storeResident: this.store !== null,
        },
      };
    } catch (error: unknown) {
      signal.throwIfAborted();
      if (error instanceof LexicalFailure) throw error;
      throw new LexicalFailure('lexical-search-failed', 'rank', 'Retrieval or snippet computation');
    }
  }
  dispose(): void {
    this.disposed = true;
    this.analyzer?.dispose();
    this.analyzer = undefined;
    this.ranker = undefined;
    this.store = null;
    this.document = undefined;
    this.cache.clear();
    this.lastRanking = undefined;
  }
}
