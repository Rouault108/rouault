import type { TagPageEntry } from './data/tagPages.js';
import type { SiteUrlContext } from '../shared/site/site-url-context.js';
import {
  buildStaticExploreResponse,
  buildStaticSearchState,
} from '../build/search/build-static-explore-response.js';
import { renderSearchPageHtml } from './layouts/search-page-html.js';

interface TagPagesPaginationData extends TagPageTemplateData {
  tagPages?: TagPageEntry[];
}

interface TagPageTemplateData {
  tagPage?: TagPageEntry;
  siteUrlContext?: SiteUrlContext | null;
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
    if (!data.siteUrlContext) {
      throw new Error('TagPagesTemplate requires siteUrlContext.');
    }

    return renderSearchPageHtml({
      initialState: buildInitialSearchState(tagPage),
      initialResponse: buildInitialSearchResponse(tagPage),
      siteUrlContext: data.siteUrlContext,
    });
  }
}

export default TagPagesTemplate;
