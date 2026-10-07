export const orderSearchPageTags = (options: {
  readonly allTagCounts: Readonly<Record<string, number>>;
  readonly tagCounts: Readonly<Record<string, number>>;
  readonly selectedTags: readonly string[];
}): string[] =>
  [
    ...new Set([
      ...Object.keys(options.allTagCounts),
      ...Object.keys(options.tagCounts),
      ...options.selectedTags,
    ]),
  ].sort((left, right) => {
    const countDifference = (options.allTagCounts[right] ?? 0) - (options.allTagCounts[left] ?? 0);
    if (countDifference !== 0) return countDifference;
    const labelDifference = left.localeCompare(right, 'ja');
    if (labelDifference !== 0) return labelDifference;
    // 照合同値でも別 identity のタグは union の挿入順に依存させない。
    return left < right ? -1 : left > right ? 1 : 0;
  });
