import MiniSearch from 'minisearch';
import { beginLexicalPhase, endLexicalPhase } from '../../../shared/search/lexical-performance.js';
import profile from '../../../shared/search/lexical-ranking-profile.json' with { type: 'json' };
import {
  lexicalIndexOptions,
  type DocumentEnvelope,
  type DocumentMetadata,
  type PassageEnvelope,
  type PassageMetadata,
} from '../../../shared/search/lexical-artifacts.js';
import { retrievalFlags, type LexicalAnalysis } from '../../../shared/search/lexical-analyzer.js';
import type { SearchMode } from '../../../shared/search/search-types.js';

export const compareUtf16 = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
export const normalizeLexicalTitle = (value: string): string =>
  value
    .normalize('NFKC')
    .replace(/[A-Z]/gu, (c) => c.toLowerCase())
    .replace(/\s+/gu, ' ')
    .trim();
export interface ChannelTrace {
  field: string;
  weight: number;
  scope: 'document' | 'passage';
  hits: { id: string; rank: number; nativeScore: number; contribution: number }[];
}
export interface RankedDocument {
  document: DocumentMetadata;
  fusionScore: number;
  exactTitle: boolean;
  titlePrefix: boolean;
  rankingBestPassageId: string | null;
}
export interface LexicalRanking {
  ranked: RankedDocument[];
  passageScores: Map<string, number>;
  traces: ChannelTrace[];
}

export class LexicalRanker {
  private readonly index: MiniSearch;
  private passageIndex: MiniSearch | undefined;
  private readonly documents: Map<string, DocumentMetadata>;
  readonly passages = new Map<string, PassageMetadata>();

  constructor(document: DocumentEnvelope) {
    this.index = MiniSearch.loadJSON(document.serializedIndex, lexicalIndexOptions('document'));
    this.documents = new Map(document.documents.map((doc) => [doc.id, doc]));
  }

  loadPassages(envelope: PassageEnvelope): void {
    this.passageIndex = MiniSearch.loadJSON(
      envelope.serializedIndex,
      lexicalIndexOptions('passage'),
    );
    this.passages.clear();
    for (const passage of envelope.passages) this.passages.set(passage.id, passage);
  }

  rank(
    query: string,
    mode: SearchMode,
    analysis: Pick<LexicalAnalysis, 'queryWordTokens' | 'queryGramTokens'>,
  ): LexicalRanking {
    const rankStart = beginLexicalPhase();
    if (!query.trim())
      return {
        ranked: [...this.documents.values()]
          .sort((a, b) => compareUtf16(a.canonicalPathname, b.canonicalPathname))
          .map((document) => ({
            document,
            fusionScore: 0,
            exactTitle: false,
            titlePrefix: false,
            rankingBestPassageId: null,
          })),
        passageScores: new Map(),
        traces: [],
      };
    const documentScores = new Map<string, number>(),
      passageScores = new Map<string, number>();
    const traces: ChannelTrace[] = [];
    const addChannels = (channels: (string | number)[][], passage: boolean): void => {
      const index = passage ? this.passageIndex : this.index;
      if (!index) throw new Error('Passage index is required for explore');
      const scores = passage ? passageScores : documentScores;
      for (const [field, weight] of channels) {
        if (typeof field !== 'string' || typeof weight !== 'number')
          throw new Error('Invalid adopted channel');
        const gram = field.endsWith('Gram');
        const tokens = gram ? analysis.queryGramTokens : analysis.queryWordTokens;
        const channelStart = beginLexicalPhase();
        const hits = tokens.length
          ? index
              .search(tokens.join('\u001f'), {
                fields: [field],
                combineWith: 'OR',
                bm25: profile.engine.native.bm25,
                weights: profile.engine.native.weights,
                prefix: gram
                  ? false
                  : (term, i, terms) =>
                      i === terms.length - 1 && (retrievalFlags([term])[0]?.prefix ?? false),
                fuzzy: gram ? false : (term) => retrievalFlags([term])[0]?.fuzzy ?? false,
              })
              .map((hit) => {
                if (typeof hit.id !== 'string' || !Number.isFinite(hit.score))
                  throw new Error('Invalid index result');
                const metadata = passage ? this.passages.get(hit.id) : this.documents.get(hit.id);
                if (!metadata) throw new Error('Unknown index result identity');
                return {
                  id: hit.id,
                  nativeScore: hit.score,
                  canonical: metadata.canonicalPathname,
                  order: 'order' in metadata ? metadata.order : 0,
                };
              })
              .sort(
                (a, b) =>
                  b.nativeScore - a.nativeScore ||
                  compareUtf16(a.canonical, b.canonical) ||
                  a.order - b.order,
              )
          : [];
        endLexicalPhase(`channel:${passage ? 'passage' : 'document'}:${field}`, channelStart, {
          hits: hits.length,
        });
        const trace: ChannelTrace = {
          field,
          weight,
          scope: passage ? 'passage' : 'document',
          hits: [],
        };
        for (const [i, hit] of hits.entries()) {
          const contribution = weight / (profile.fusion.rrfK + i + 1);
          scores.set(hit.id, (scores.get(hit.id) ?? 0) + contribution);
          trace.hits.push({ id: hit.id, rank: i + 1, nativeScore: hit.nativeScore, contribution });
        }
        traces.push(trace);
      }
    };
    const best = new Map<string, { id: string; score: number; order: number }>();
    if (mode === 'navigate') addChannels(profile.fusion.navigateChannels, false);
    else {
      addChannels(profile.fusion.explorePassageChannels, true);
      for (const [id, score] of passageScores) {
        const passage = this.passages.get(id);
        if (!passage) throw new Error('Unknown passage');
        const previous = best.get(passage.documentId);
        if (
          !previous ||
          score > previous.score ||
          (score === previous.score && passage.order < previous.order)
        )
          best.set(passage.documentId, { id, score, order: passage.order });
      }
      addChannels(profile.fusion.exploreMetadataChannels, false);
      for (const [id, passage] of best)
        documentScores.set(id, (documentScores.get(id) ?? 0) + passage.score);
    }
    const normalized = normalizeLexicalTitle(query);
    const ranked = [...documentScores].map(([id, fusionScore]): RankedDocument => {
      const document = this.documents.get(id);
      if (!document) throw new Error('Unknown document');
      const title = normalizeLexicalTitle(document.title);
      return {
        document,
        fusionScore,
        exactTitle: title === normalized,
        titlePrefix: title.startsWith(normalized),
        rankingBestPassageId: best.get(id)?.id ?? null,
      };
    });
    const tier = (item: RankedDocument): number =>
      item.exactTitle
        ? 0
        : mode === 'navigate' && item.titlePrefix
          ? 1
          : mode === 'navigate'
            ? 2
            : 1;
    ranked.sort(
      (a, b) =>
        tier(a) - tier(b) ||
        b.fusionScore - a.fusionScore ||
        (mode === 'explore'
          ? (Date.parse(b.document.date) || -Infinity) - (Date.parse(a.document.date) || -Infinity)
          : 0) ||
        compareUtf16(a.document.canonicalPathname, b.document.canonicalPathname),
    );
    endLexicalPhase('ranking-total', rankStart, {
      documents: ranked.length,
      passages: passageScores.size,
    });
    return { ranked, passageScores, traces };
  }
}
