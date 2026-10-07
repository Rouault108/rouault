import type { MemoRecord } from '../data/memos.js';
export const buildMemoIndexProjection = (memos: readonly MemoRecord[]) =>
  [...memos]
    .sort(
      (left, right) =>
        left.title.localeCompare(right.title, 'ja') ||
        left.canonicalPathname.localeCompare(right.canonicalPathname, 'en'),
    )
    .map((memo) => ({ title: memo.title, href: memo.canonicalPathname }));
