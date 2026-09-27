import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { buildSearchCatalog, type SearchCatalogSourceNote } from './build-search-catalog.js';
import { emitLexicalFoundation } from './emit-lexical-foundation.js';
import { sha256 } from '../../shared/search/lexical-artifacts.js';

/** 出力済み本文だけから生成する。build/devで別の抽出規則やbrowser再indexを持たない。 */
export async function emitLexicalSite(options: {
  notes: readonly SearchCatalogSourceNote[];
  outputDir: string;
}) {
  const root = resolve(options.outputDir);
  const htmlByCanonical = new Map<string, string>();
  const sources: { canonicalPathname: string; sha256: string }[] = [];
  for (const document of buildSearchCatalog(options.notes)) {
    const file = resolve(
      root,
      decodeURIComponent(document.canonicalPathname.slice(1)),
      'index.html',
    );
    if (!file.startsWith(root + sep)) throw new Error('Search HTML outside output root');
    const bytes = await readFile(file);
    sources.push({ canonicalPathname: document.canonicalPathname, sha256: await sha256(bytes) });
    htmlByCanonical.set(document.canonicalPathname, bytes.toString('utf8'));
  }
  const buildId = await sha256(new TextEncoder().encode(JSON.stringify(sources)));
  return emitLexicalFoundation({ ...options, htmlByCanonical, buildId });
}
