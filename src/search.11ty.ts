export class SearchPageTemplate {
  data() {
    return {
      layout: 'base',
      title: '検索',
      permalink: '/search/index.html',
    };
  }

  render() {
    return `
      <noscript>
        <p class="noscript-notice">検索・フィルタ機能にはJavaScriptが必要です。</p>
      </noscript>
      <search-page></search-page>
    `.trim();
  }
}

export default SearchPageTemplate;
