import MiniSearch from 'minisearch';
import type { SearchCatalogSourceNote } from './build-search-catalog.js';
import { buildSearchProjection } from './build-search-projection.js';
import { createBuildAnalyzer } from './create-build-analyzer.js';
import { analyzeSearchProjection } from './analyze-search-projection.js';
import { lexicalIndexOptions } from '../../shared/search/lexical-artifacts.js';
import { writeLexicalArtifacts } from './write-lexical-artifacts.js';

/** final HTML完成後に呼ぶ基盤入口。productionの検索入口への接続はcutoverが所有する。 */
export async function emitLexicalFoundation(options: {
  notes: readonly SearchCatalogSourceNote[];
  htmlByCanonical: ReadonlyMap<string, string>;
  outputDir: string;
  buildId: string;
}) {
  const projection = buildSearchProjection(options.notes, options.htmlByCanonical);
  const analyzer = await createBuildAnalyzer();
  try {
    const fields = analyzeSearchProjection(analyzer, projection.documents, projection.passages);
    const document = new MiniSearch(lexicalIndexOptions('document'));
    const passage = new MiniSearch(lexicalIndexOptions('passage'));
    document.addAll(fields.documents);
    passage.addAll(fields.passages);
    return await writeLexicalArtifacts({
      outputDir: options.outputDir,
      buildId: options.buildId,
      ...projection,
      documentIndex: JSON.stringify(document),
      passageIndex: JSON.stringify(passage),
    });
  } finally {
    analyzer.dispose();
  }
}
