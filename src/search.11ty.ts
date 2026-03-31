import {
  buildStaticExploreResponse,
  buildStaticSearchState,
} from '../build/search/build-static-explore-response.js';
import { serializeHtmlAttributes } from './layouts/html-output.js';

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

    return `
      <noscript>
        <p class="noscript-notice">検索・フィルタ機能にはJavaScriptが必要です。</p>
      </noscript>
      <search-page${serializeHtmlAttributes([
        { name: 'initial-search-state-json', value: initialState, kind: 'json' },
        { name: 'initial-search-response-json', value: initialResponse, kind: 'json' },
      ])}></search-page>
    `.trim();
  }
}

export default SearchPageTemplate;