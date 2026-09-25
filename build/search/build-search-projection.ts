import { filterNotesBySurface } from '../data/notes.js';
import { derivePathLabel } from '../../shared/search/document-url.js';
import type { SearchDocument, SearchPassage } from '../../shared/search/search-projection.js';
import { buildSearchCatalog, type SearchCatalogSourceNote } from './build-search-catalog.js';
import { projectSearchHtml } from './project-search-html.js';

/** publicationとmetadataは既存ownerを使い、final HTMLとの不完全なjoinだけを拒否する。 */
export function buildSearchProjection(
  notes: readonly SearchCatalogSourceNote[],
  htmlByCanonical: ReadonlyMap<string, string>,
): { documents: SearchDocument[]; passages: SearchPassage[] } {
  const documents: SearchDocument[] = [];
  const passages: SearchPassage[] = [];
  const seen = new Set<string>();
  for (const note of filterNotesBySurface(notes, 'search')) {
    const metadata = buildSearchCatalog([note])[0];
    if (!metadata) throw new Error(`Search metadata join failed: ${note.slug ?? '(missing slug)'}`);
    const { canonicalPathname } = metadata;
    if (seen.has(canonicalPathname))
      throw new Error(`Duplicate search canonical: ${canonicalPathname}`);
    seen.add(canonicalPathname);
    const html = htmlByCanonical.get(canonicalPathname);
    if (html === undefined) throw new Error(`Missing search HTML: ${canonicalPathname}`);
    const projection = projectSearchHtml(html, canonicalPathname);
    documents.push({
      canonicalPathname,
      title: metadata.title,
      description: metadata.description ?? '',
      body: projection.body,
      pathLabel: derivePathLabel(canonicalPathname),
      keywords: metadata.keywords ?? [],
      tags: metadata.tags ?? [],
      date: metadata.date ?? '',
    });
    passages.push(...projection.passages);
  }
  return { documents, passages };
}
