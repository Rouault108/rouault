import {
  buildStaticExploreResponse,
  buildStaticSearchState,
} from '../build/search/build-static-explore-response.js';
import type { SiteUrlContext } from '../shared/site/site-url-context.js';
import { renderSearchPageHtml } from './layouts/search-page-html.js';

interface SearchPageTemplateData {
  siteUrlContext: SiteUrlContext | null;
}

export class SearchPageTemplate {
  data() {
    return {
      layout: 'base',
      title: '検索',
      permalink: '/search/index.html',
    };
  }

  render(data: SearchPageTemplateData) {
    if (!data.siteUrlContext) {
      throw new Error('SearchPageTemplate requires siteUrlContext.');
    }
    const initialState = buildStaticSearchState();
    const initialResponse = buildStaticExploreResponse({
      state: initialState,
      notes: [],
      activeSources: [],
    });

    return renderSearchPageHtml({
      initialState,
      initialResponse,
      siteUrlContext: data.siteUrlContext,
    });
  }
}

export default SearchPageTemplate;
