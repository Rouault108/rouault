import {
  mapNfkc,
  type LexicalAnalyzer,
  type TokenOccurrence,
} from '../../../shared/search/lexical-analyzer.js';
import { compareUtf16, type LexicalRanking, type RankedDocument } from './ranking.js';
import type { PassageMetadata } from '../../../shared/search/lexical-artifacts.js';

import type { LexicalSnippet } from '../../../shared/search/lexical-protocol.js';
import { beginLexicalPhase, endLexicalPhase } from '../../../shared/search/lexical-performance.js';
interface Range {
  start: number;
  end: number;
}
export function lexicalSnippet(
  text: string,
  tokens: readonly string[],
): { snippet: LexicalSnippet | null; bodyMatch: boolean } {
  if (!text) return { snippet: null, bodyMatch: false };
  const mapped = mapNfkc(text),
    normalized = mapped.text.replace(/[A-Z]/gu, (c) => c.toLowerCase());
  const ranges: Range[] = [];
  for (const token of new Set(tokens.filter(Boolean))) {
    let from = 0;
    while (from <= normalized.length - token.length) {
      const at = normalized.indexOf(token, from);
      if (at < 0) break;
      let start = text.length,
        end = 0;
      for (const span of mapped.spans.slice(at, at + token.length)) {
        start = Math.min(start, span.start);
        end = Math.max(end, span.end);
      }
      if (start < end) ranges.push({ start, end });
      from = at + Math.max(1, token.length);
    }
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const points = Array.from(text),
    boundaries = [0];
  let position = 0;
  for (const point of points) {
    position += point.length;
    boundaries.push(position);
  }
  const first = ranges[0] ? boundaries.indexOf(ranges[0].start) : 0;
  const startCp = Math.max(0, Math.min(Math.max(0, first) - 120, points.length - 240)),
    endCp = Math.min(points.length, startCp + 240);
  const startUtf16 = boundaries[startCp],
    endUtf16 = boundaries[endCp];
  if (startUtf16 === undefined || endUtf16 === undefined) throw new Error('Snippet window offsets');
  const merged: Range[] = [];
  for (const range of ranges) {
    const start = Math.max(startUtf16, range.start),
      end = Math.min(endUtf16, range.end);
    if (start >= end) continue;
    const previous = merged.at(-1);
    if (previous && start <= previous.end) previous.end = Math.max(previous.end, end);
    else merged.push({ start, end });
  }
  const segments: LexicalSnippet['segments'] = [];
  let cursor = startUtf16;
  for (const range of merged) {
    if (cursor < range.start)
      segments.push({ text: text.slice(cursor, range.start), matched: false });
    segments.push({ text: text.slice(range.start, range.end), matched: true });
    cursor = range.end;
  }
  if (cursor < endUtf16) segments.push({ text: text.slice(cursor, endUtf16), matched: false });
  return {
    snippet: {
      text: text.slice(startUtf16, endUtf16),
      segments,
      startUtf16,
      endUtf16,
      codePoints: endCp - startCp,
      offsetPass:
        segments.map((segment) => segment.text).join('') === text.slice(startUtf16, endUtf16),
    },
    bodyMatch: ranges.length > 0,
  };
}

/** 上限はencoded occurrence payloadのみ。原文・WASM・indexを含むWorker RAM上限ではない。 */
export class OccurrenceCache {
  private readonly entries = new Map<string, { scope: string; text: string; bytes: Uint8Array }>();
  private bytes = 0;
  private evictions = 0;
  constructor(
    private readonly maxBytes = 8 * 1024 * 1024,
    private readonly maxEntries = 128,
  ) {}
  clear(): void {
    this.entries.clear();
    this.bytes = 0;
  }
  get stats() {
    return { entries: this.entries.size, encodedBytes: this.bytes, evictions: this.evictions };
  }
  get(
    scope: string,
    id: string,
    text: string,
    compute: () => readonly TokenOccurrence[],
  ): readonly TokenOccurrence[] {
    const cacheStart = beginLexicalPhase(),
      beforeEvictions = this.evictions;
    const entry = this.entries.get(id);
    if (entry) {
      this.entries.delete(id);
      this.bytes -= entry.bytes.byteLength;
      if (entry.scope === scope && entry.text === text) {
        this.entries.set(id, entry);
        this.bytes += entry.bytes.byteLength;
        const value: unknown = JSON.parse(new TextDecoder().decode(entry.bytes));
        if (!Array.isArray(value)) throw new Error('Occurrence cache payload');
        const decoded = value.map((item: unknown) => {
          if (
            !item ||
            typeof item !== 'object' ||
            !('surface' in item) ||
            typeof item.surface !== 'string' ||
            !('startUtf16' in item) ||
            typeof item.startUtf16 !== 'number' ||
            !('endUtf16' in item) ||
            typeof item.endUtf16 !== 'number'
          )
            throw new Error('Occurrence cache entry');
          return { surface: item.surface, startUtf16: item.startUtf16, endUtf16: item.endUtf16 };
        });
        endLexicalPhase('cache-hit', cacheStart);
        return decoded;
      }
    }
    const computeStart = beginLexicalPhase();
    const value = compute();
    endLexicalPhase('occurrence-generation', computeStart, { utf16: text.length });
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    if (bytes.byteLength > this.maxBytes || this.maxEntries < 1) {
      endLexicalPhase('cache-bypass', cacheStart);
      return value;
    }
    while (
      this.entries.size &&
      (this.bytes + bytes.byteLength > this.maxBytes || this.entries.size >= this.maxEntries)
    ) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.bytes -= this.entries.get(oldest)?.bytes.byteLength ?? 0;
      this.entries.delete(oldest);
      this.evictions++;
    }
    this.entries.set(id, { scope, text, bytes });
    this.bytes += bytes.byteLength;
    endLexicalPhase('cache-miss', cacheStart, { evictions: this.evictions - beforeEvictions });
    return value;
  }
}

export interface SelectedSnippet {
  snippet: LexicalSnippet | null;
  snippetPassageId: string | null;
  source: 'passage' | 'description' | 'none';
  bodyMatch: boolean;
  degraded: boolean;
}
export function selectLexicalSnippet(options: {
  hit: RankedDocument;
  ranking: LexicalRanking;
  mode: 'navigate' | 'explore';
  queryWords: readonly string[];
  queryGrams: readonly string[];
  passages: ReadonlyMap<string, PassageMetadata>;
  store: ReadonlyMap<string, string> | null;
  analyzer: LexicalAnalyzer;
  cache: OccurrenceCache;
  identity: string;
}): SelectedSnippet {
  const selectorStart = beginLexicalPhase();
  let visited = 0,
    matching = 0;
  const { hit, ranking, store } = options,
    tokens = [...options.queryWords, ...options.queryGrams];
  let chosen = hit.rankingBestPassageId;
  const words = [...new Set(options.queryWords)];
  if (options.mode === 'explore' && store && words.length >= 2) {
    const qualified: { id: string; cost: number; fusion: number; order: number }[] = [];
    for (const [id, fusion] of ranking.passageScores) {
      visited++;
      const passage = options.passages.get(id);
      if (passage?.documentId !== hit.document.id) continue;
      matching++;
      const text = store.get(id);
      if (text === undefined) throw new Error('Missing passage text');
      const windowStart = beginLexicalPhase();
      const display = lexicalSnippet(text, tokens).snippet;
      endLexicalPhase('candidate-window', windowStart);
      if (!display) continue;
      const surfaceStart = beginLexicalPhase();
      const units: { start: number; end: number; text: string }[] = [];
      for (const unit of text.matchAll(/[^。！？!?\r\n]+[。！？!?]?/gu)) {
        const start = unit.index,
          end = start + unit[0].length;
        if (start < display.startUtf16 || end > display.endUtf16) continue;
        // canonical occurrenceは原文被覆範囲のNFKC/ASCII小文字化にsurfaceを含む。
        // この必要条件が偽のunitはexact共起し得ない。真でも採用せず従来の解析で判定する。
        const normalized = unit[0]
          .normalize('NFKC')
          .replace(/[A-Z]/gu, (character) => character.toLowerCase());
        if (words.every((word) => normalized.includes(word)))
          units.push({ start, end, text: unit[0] });
      }
      endLexicalPhase('unit-surface-check', surfaceStart, {
        eligibleUnits: units.length,
        analysisUnnecessary: units.length === 0 ? 1 : 0,
      });
      if (units.length === 0) continue;
      const occurrences = options.cache.get(
        options.identity,
        id,
        text,
        () => options.analyzer.analyze(text).wordOccurrences,
      );
      const unitStart = beginLexicalPhase();
      let cost = Infinity;
      for (const unit of units) {
        const { start, end } = unit;
        if (
          words.every((word) =>
            occurrences.some(
              (occurrence) =>
                occurrence.surface === word &&
                occurrence.startUtf16 >= start &&
                occurrence.endUtf16 <= end,
            ),
          )
        )
          cost = Math.min(cost, Array.from(unit.text).length);
      }
      endLexicalPhase('unit-cooccurrence', unitStart);
      if (Number.isFinite(cost)) qualified.push({ id, cost, fusion, order: passage.order });
    }
    qualified.sort(
      (a, b) =>
        a.cost - b.cost || b.fusion - a.fusion || a.order - b.order || compareUtf16(a.id, b.id),
    );
    chosen = qualified[0]?.id ?? chosen;
  }
  if (options.mode === 'explore' && chosen && store) {
    const text = store.get(chosen);
    if (text === undefined) throw new Error('Missing selected passage');
    const finalStart = beginLexicalPhase();
    const selected = lexicalSnippet(text, tokens);
    endLexicalPhase('final-snippet', finalStart);
    if (selected.bodyMatch) {
      endLexicalPhase('selector-total', selectorStart, { visited, matching });
      return { ...selected, snippetPassageId: chosen, source: 'passage', degraded: false };
    }
  }
  const finalStart = beginLexicalPhase();
  const fallback = lexicalSnippet(hit.document.description, tokens).snippet;
  endLexicalPhase('final-snippet', finalStart);
  endLexicalPhase('selector-total', selectorStart, { visited, matching });
  return {
    snippet: fallback,
    snippetPassageId: null,
    source: hit.document.description ? 'description' : 'none',
    bodyMatch: false,
    degraded: options.mode === 'explore' && Boolean(hit.rankingBestPassageId) && store === null,
  };
}
