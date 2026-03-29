import type { TagPageEntry } from './data/tagPages.js';
import {
  buildStaticExploreResponse,
  buildStaticSearchState,
} from './lib/search/build/build-static-explore-response.js';

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

function buildInitialSearchResponse(tagPage: TagPageEntry) {
  return buildStaticExploreResponse({
    state: buildInitialSearchState(tagPage),
    notes: tagPage.notes.map((note) => ({
      title: note.title,
      permalink: note.permalink,
      description: note.description,
      date: note.date,
      tags: note.genres,
    })),
    activeSources: ['catalog'],
  });
}

function buildInitialSearchState(tagPage: TagPageEntry) {
  return buildStaticSearchState({
    q: '',
    tags: [tagPage.tag],
    tagMode: 'or',
    sort: 'relevance',
  });
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
