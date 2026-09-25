import { Suzume } from '@libraz/suzume';

export {
  ANALYZER_POLICY_ID,
  PROVIDER_WASM_SHA256,
  SUZUME_OPTIONS,
} from './lexical-provider-config.js';
import { SUZUME_OPTIONS } from './lexical-provider-config.js';

export interface SourceSpan {
  start: number;
  end: number;
}
export interface TokenOccurrence {
  surface: string;
  startUtf16: number;
  endUtf16: number;
}
export interface LexicalAnalysis {
  normalized: string;
  normalizedSpans: readonly SourceSpan[];
  wordOccurrenceTokens: string[];
  queryWordTokens: string[];
  gramOccurrenceTokens: string[];
  queryGramTokens: string[];
  wordOccurrences: TokenOccurrence[];
  gramOccurrences: TokenOccurrence[];
  providerTokens: TokenOccurrence[];
}
export interface LexicalAnalyzer {
  analyze(input: string): LexicalAnalysis;
  dispose(): void;
}
const japanese = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const lower = (value: string): string => value.replace(/[A-Z]/gu, (c) => c.toLowerCase());

/** 空白を越える合成はないため、空白境界で区切って接頭辞NFKCの負荷を抑える。 */
export function mapNfkc(input: string): { text: string; spans: SourceSpan[] } {
  let text = '';
  const spans: SourceSpan[] = [];
  for (const match of input.matchAll(/\s+|\S+/gu)) {
    if (/^\p{ASCII}+$/u.test(match[0])) {
      text += match[0];
      for (let i = 0; i < match[0].length; i++) {
        spans.push({ start: match.index + i, end: match.index + i + 1 });
      }
      continue;
    }
    let prefix = '',
      normalized = '',
      end = match.index;
    const local: SourceSpan[] = [];
    for (const cp of match[0]) {
      const begin = end;
      end += cp.length;
      prefix += cp;
      const next = prefix.normalize('NFKC');
      let common = 0;
      while (
        common < normalized.length &&
        common < next.length &&
        normalized[common] === next[common]
      )
        common++;
      if (common > 0 && /[\uD800-\uDBFF]/u.test(normalized[common - 1] ?? '')) common--;
      let start = begin;
      for (let i = common; i < local.length; i++) start = Math.min(start, local[i]?.start ?? begin);
      local.length = common;
      for (let i = common; i < next.length; i++) local.push({ start, end });
      normalized = next;
    }
    text += normalized;
    for (const span of local) spans.push(span);
  }
  if (text !== input.normalize('NFKC') || text.length !== spans.length)
    throw new Error('NFKC offset invariant');
  return { text, spans };
}

function occurrence(
  input: string,
  surface: string,
  covered: readonly SourceSpan[],
): TokenOccurrence {
  if (covered.length === 0) throw new Error('Missing source offsets');
  let start = input.length,
    end = 0;
  for (const span of covered) {
    start = Math.min(start, span.start);
    end = Math.max(end, span.end);
  }
  if (
    !lower(input.slice(start, end).normalize('NFKC')).includes(surface) ||
    /[\uDC00-\uDFFF]/u.test(input[start] ?? '') ||
    /[\uDC00-\uDFFF]/u.test(input[end] ?? '')
  ) {
    throw new Error('Canonical token offset integrity');
  }
  return { surface, startUtf16: start, endUtf16: end };
}

export function analyzeCanonical(
  input: string,
  provider: Pick<Suzume, 'analyzeWithNormalizedText'>,
): LexicalAnalysis {
  const mapped = mapNfkc(input);
  let prepared = '';
  const preparedSpans: SourceSpan[] = [];
  for (let i = 0; i < mapped.text.length; i++) {
    const span = mapped.spans[i];
    if (!span) throw new Error('Missing normalized offset');
    if (i > 0 && /[a-z]/u.test(mapped.text[i - 1] ?? '') && /[A-Z]/u.test(mapped.text[i] ?? '')) {
      prepared += ' ';
      preparedSpans.push(span);
    }
    prepared += lower(mapped.text[i] ?? '');
    preparedSpans.push(span);
  }
  const wordOccurrences: TokenOccurrence[] = [],
    providerTokens: TokenOccurrence[] = [];
  for (const match of prepared.matchAll(/[\p{L}\p{N}\p{M}]+/gu)) {
    const run = match[0],
      base = match.index;
    if (!japanese.test(run)) {
      wordOccurrences.push(occurrence(input, run, preparedSpans.slice(base, base + run.length)));
      continue;
    }
    const result = provider.analyzeWithNormalizedText(run);
    if (result.normalizedText !== run) throw new Error('Provider additional normalization');
    let previousEnd = 0;
    for (const token of result.morphemes) {
      if (
        !Number.isInteger(token.startUtf16) ||
        !Number.isInteger(token.endUtf16) ||
        token.startUtf16 < previousEnd ||
        token.endUtf16 <= token.startUtf16 ||
        token.endUtf16 > run.length ||
        run.slice(token.startUtf16, token.endUtf16) !== token.surface
      )
        throw new Error('Provider offset integrity');
      const item = occurrence(
        input,
        token.surface,
        preparedSpans.slice(base + token.startUtf16, base + token.endUtf16),
      );
      wordOccurrences.push(item);
      providerTokens.push(item);
      previousEnd = token.endUtf16;
    }
  }
  let normalized = '';
  const normalizedSpans: SourceSpan[] = [];
  for (const match of lower(mapped.text).matchAll(/\s+|\S+/gu)) {
    const covered = mapped.spans.slice(match.index, match.index + match[0].length);
    if (/\s/u.test(match[0])) {
      if (normalized.length && match.index + match[0].length < mapped.text.length) {
        const first = covered[0],
          last = covered.at(-1);
        if (!first || !last) throw new Error('Whitespace offset integrity');
        normalized += ' ';
        normalizedSpans.push({ start: first.start, end: last.end });
      }
    } else {
      normalized += match[0];
      for (const span of covered) normalizedSpans.push(span);
    }
  }
  const gramOccurrences: TokenOccurrence[] = [];
  for (const match of normalized.matchAll(
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}][\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{M}ー]*/gu,
  )) {
    const points = Array.from(match[0]);
    let offset = match.index;
    for (let i = 0; i + 1 < points.length; i++) {
      const first = points[i] ?? '',
        second = points[i + 1] ?? '',
        surface = first + second;
      gramOccurrences.push(
        occurrence(input, surface, normalizedSpans.slice(offset, offset + surface.length)),
      );
      offset += first.length;
    }
  }
  const wordOccurrenceTokens = wordOccurrences.map((item) => item.surface);
  const gramOccurrenceTokens = gramOccurrences.map((item) => item.surface);
  return {
    normalized,
    normalizedSpans,
    wordOccurrenceTokens,
    queryWordTokens: [...new Set(wordOccurrenceTokens)],
    gramOccurrenceTokens,
    queryGramTokens: [...new Set(gramOccurrenceTokens)],
    wordOccurrences,
    gramOccurrences,
    providerTokens,
  };
}

/** 呼出元がhash検証済みの同一WASMを渡す。provider設定の上書きは公開しない。 */
export async function createCanonicalAnalyzer(verifiedWasmPath: string): Promise<LexicalAnalyzer> {
  const provider = await Suzume.create({ ...SUZUME_OPTIONS, wasmPath: verifiedWasmPath });
  if (provider.version !== '0.9.11' || provider.mode !== 'normal' || !provider.hasCoreDictionary) {
    provider.destroy();
    throw new Error('Canonical provider identity');
  }
  let disposed = false;
  return {
    analyze(input) {
      if (disposed) throw new Error('Analyzer disposed');
      return analyzeCanonical(input, provider);
    },
    dispose() {
      if (!disposed) {
        disposed = true;
        provider.destroy();
      }
    },
  };
}

export function retrievalFlags(
  tokens: readonly string[],
  gram = false,
): { token: string; prefix: boolean; fuzzy: 1 | false }[] {
  return tokens.map((token, i) => ({
    token,
    prefix:
      !gram && i === tokens.length - 1 && (japanese.test(token) || /^[a-z0-9]{2,}$/u.test(token)),
    fuzzy: !gram && /^[a-z0-9]{4,}$/u.test(token) ? 1 : false,
  }));
}
