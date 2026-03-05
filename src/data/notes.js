/**
 * Eleventy グローバルデータファイル。
 *
 * Velite が生成した .velite/notes.json を読み込み、
 * _config.json に基づく並び順メタデータを付与して返す。
 * Eleventy の data cascade で "notes" として利用可能になる。
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractTocFromHtml } from '../../lib/content/extract-toc-from-html.js';

/**
 * _config.json を読み込む。存在しなければ undefined を返す。
 * @param {string} dirPath - ディレクトリの絶対パス
 * @returns {{ order?: string[] } | undefined}
 */
function readConfig(dirPath) {
  const configPath = join(dirPath, '_config.json');
  if (!existsSync(configPath)) return undefined;
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

/**
 * ノートの slug からディレクトリパスを取得し、
 * 各階層の _config.json を使って sortIndex を算出する。
 *
 * @param {Array<{ slug: string }>} notes - Velite が生成したノート配列
 * @param {string} contentRoot - content ディレクトリの絶対パス
 * @returns {Array<{ slug: string, sortIndex: number }>}
 */
function enrichWithSortIndex(notes, contentRoot) {
  return notes.map((note) => {
    const parts = note.slug.split('/');
    // ファイル名（拡張子なし）+ .md でファイル名を復元
    const fileName = parts[parts.length - 1] + '.md';
    const dirParts = parts.slice(0, -1);

    let sortIndex = 0;

    // 各階層の _config.json を参照して sortIndex を構築
    for (let depth = 0; depth <= dirParts.length; depth++) {
      const currentDirParts = dirParts.slice(0, depth);
      const currentDir = join(contentRoot, ...currentDirParts);
      const config = readConfig(currentDir);

      // 次の階層要素またはファイル名を取得
      const targetName =
        depth < dirParts.length ? dirParts[depth] : fileName;

      const order = config?.order ?? [];
      const orderIndex = order.indexOf(targetName);

      // sortIndex を階層ごとに 1000 の重みで合算
      // order 内: 指定位置（0-based）、order 外: 500 + アルファベット順位
      if (orderIndex >= 0) {
        sortIndex = sortIndex * 1000 + orderIndex;
      } else {
        // order に含まれない場合は 500 から始めてアルファベット順
        sortIndex = sortIndex * 1000 + 500;
      }
    }

    return { ...note, sortIndex };
  });
}

export default function () {
  const velitePath = join(process.cwd(), '.velite', 'notes.json');
  if (!existsSync(velitePath)) return [];

  const notes = JSON.parse(readFileSync(velitePath, 'utf-8'));
  const contentRoot = join(process.cwd(), 'content');

  // 並び順メタデータを付与
  const enriched = enrichWithSortIndex(notes, contentRoot).map((note) => ({
    ...note,
    tocHeadings: extractTocFromHtml(note.content ?? ''),
  }));

  // sortIndex でソート
  enriched.sort((a, b) => a.sortIndex - b.sortIndex);

  // 本番ビルド時は draft を除外
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? enriched.filter((n) => !n.draft) : enriched;
}
