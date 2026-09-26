import type { SourceSpan } from '../../../shared/search/lexical-analyzer.js';

// D1レビュー済みStage 2 snapshotのoffset mappingを比較用正本として保存する。
// 実行時import禁止。最適化で正規化・原文被覆範囲を変えていないことだけを検証する。
export function mapNfkcReference(input: string): { text: string; spans: SourceSpan[] } {
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
