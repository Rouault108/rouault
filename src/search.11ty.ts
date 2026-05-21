import {
  buildStaticExploreResponse,
  buildStaticSearchState,
} from '../build/search/build-static-explore-response.js';
import { renderSearchPageHtml } from './layouts/search-page-html.js';

export class SearchPageTemplate {
  data() {
    return {
      layout: 'base',
      title: '検索',
      permalink: '/search/index.html',
    };
  }

  render() {
    const initialState = buildStaticSearchState();
    const initialResponse = buildStaticExploreResponse({
      state: initialState,
      notes: [],
      activeSources: [],
    });

    return renderSearchPageHtml({ initialState, initialResponse });
  }
}

export default SearchPageTemplate;
