interface TagPageData {
  tag?: string;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class TagPagesTemplate {
  data() {
    return {
      layout: 'base',
      pagination: {
        data: 'searchGenres',
        size: 1,
        alias: 'tag',
      },
      eleventyComputed: {
        title: (data: TagPageData) => `タグ: ${data.tag ?? ''}`,
        permalink: (data: TagPageData) => {
          if (typeof data.tag !== 'string' || data.tag.length === 0) {
            return false;
          }

          return `/tags/${encodeURIComponent(data.tag)}/index.html`;
        },
      },
    };
  }

  render(data: TagPageData) {
    const tag = typeof data.tag === 'string' ? data.tag : '';

    return `
      <noscript>
        <p class="noscript-notice">検索・フィルタ機能にはJavaScriptが必要です。</p>
      </noscript>
      <search-page initial-tag="${escapeAttr(tag)}"></search-page>
    `.trim();
  }
}

export default TagPagesTemplate;
