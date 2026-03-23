import type { TagPageEntry, TagPageNoteSummary } from './data/tagPages.js';
import { derivePathLabel, normalizeDocumentCanonicalUrl } from './lib/search/document-url.js';

interface TagPagesPaginationData extends TagPageTemplateData {
  tagPages?: TagPageEntry[];
}

interface TagPageTemplateData {
  tagPage?: TagPageEntry;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toEpochMs(value: string): number | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const epochMs = Date.parse(normalized);
  return Number.isFinite(epochMs) ? epochMs : null;
}

function buildTagCounts(notes: readonly TagPageNoteSummary[]): Record<string, number> {
  const counts = new Map<string, number>();

  for (const note of notes) {
    for (const genre of note.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  );
}

function buildInitialSearchResponse(tagPage: TagPageEntry) {
  return {
    mode: 'explore',
    items: tagPage.notes.flatMap((note) => {
      const canonicalUrl = normalizeDocumentCanonicalUrl(note.permalink);
      if (canonicalUrl === null) {
        return [];
      }

      return [
        {
          canonicalUrl,
          url: note.permalink,
          pathLabel: derivePathLabel(canonicalUrl),
          title: note.title,
          description: note.description,
          date: {
            epochMs: toEpochMs(note.date),
            original: note.date.trim().length > 0 ? note.date.trim() : null,
          },
          tags: note.genres,
          snippet: note.description.trim().length > 0
            ? {
                segments: [{ text: note.description.trim(), matched: false }],
              }
            : null,
          reasons: [{ kind: 'tag-filter-match', tokens: [tagPage.tag] }],
        },
      ];
    }),
    total: tagPage.notes.length,
    rankingProfileId: 'rouault-search-v1',
    tagCounts: buildTagCounts(tagPage.notes),
    allTagCounts: buildTagCounts(tagPage.notes),
    diagnostics: {
      degraded: false,
      activeSources: ['catalog'],
      failures: [],
      issues: [],
    },
  } as const;
}

function buildInitialSearchState(tagPage: TagPageEntry) {
  return {
    q: '',
    tags: [tagPage.tag],
    tagMode: 'or',
    sort: 'relevance',
  } as const;
}

export class TagPagesTemplate {
  data() {
    return {
      layout: 'base',
      pagination: {
        data: 'tagPages',
        size: 1,
        alias: 'tagPage',
      },
      eleventyComputed: {
        title: (data: TagPagesPaginationData) => `タグ: ${data.tagPage?.tag ?? ''}`,
        permalink: (data: TagPagesPaginationData) => {
          if (typeof data.tagPage?.tag !== 'string' || data.tagPage.tag.length === 0) {
            return false;
          }

          return `/tags/${encodeURIComponent(data.tagPage.tag)}/index.html`;
        },
      },
    };
  }

  render(data: TagPagesPaginationData) {
    const tagPage = data.tagPage;
    if (!tagPage) {
      return '';
    }

    return `<search-page initial-search-state-json="${escapeHtml(
      JSON.stringify(buildInitialSearchState(tagPage)),
    )}" initial-search-response-json="${escapeHtml(
      JSON.stringify(buildInitialSearchResponse(tagPage)),
    )}"></search-page>`;
  }
}

export default TagPagesTemplate;
