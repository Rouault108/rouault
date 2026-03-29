import {
  buildStaticExploreResponse,
  buildStaticSearchState,
} from './lib/search/build/build-static-explore-response.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
      <search-page initial-search-state-json="${escapeHtml(
        JSON.stringify(initialState),
      )}" initial-search-response-json="${escapeHtml(
        JSON.stringify(initialResponse),
      )}"></search-page>
    `.trim();
  }
}

export default SearchPageTemplate;
