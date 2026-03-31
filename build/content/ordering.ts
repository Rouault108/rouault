/**
 * _config.json に基づくコンテンツ並び順ユーティリティ。
 *
 * 各ディレクトリの _config.json は独立（継承なし）。
 * order 配列に含まれるアイテムが先頭に配置され、
 * 残りは ja locale のアルファベット順でソートされる。
 */

export interface ContentConfig {
  order?: string[];
}

/**
 * _config.json の order 配列に基づいてアイテムを並び替える。
 * order 内のアイテムが先頭、残りはアルファベット順（ja locale）。
 *
 * @param items - ファイル名またはディレクトリ名の配列
 * @param config - ディレクトリの _config.json 内容（存在しない場合は undefined）
 * @returns ソート済みの新しい配列（元配列は変更しない）
 */
export function applyOrdering(items: string[], config?: ContentConfig): string[] {
  const order = config?.order ?? [];
  const orderMap = new Map(order.map((name, i) => [name, i]));

  return [...items].sort((a, b) => {
    const aIndex = orderMap.get(a);
    const bIndex = orderMap.get(b);

    // 両方 order 内: 指定順
    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
    // 片方だけ order 内: order 側が先
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;
    // どちらも order 外: ja locale のアルファベット順
    return a.localeCompare(b, 'ja', { sensitivity: 'base' });
  });
}
