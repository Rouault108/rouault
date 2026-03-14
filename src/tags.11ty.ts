import { loadTagPagesData, type TagPageEntry } from './data/tagPages.js';

interface TagPagesPaginationData extends TagPageTemplateData {
  paginationTagPages?: TagPageEntry[];
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

export class TagPagesTemplate {
  data() {
    return {
      layout: 'base',
      paginationTagPages: loadTagPagesData(),
      pagination: {
        data: 'paginationTagPages',
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

    return `<tag-page tag-page-json="${escapeHtml(JSON.stringify(tagPage))}"></tag-page>`;
  }
}

export default TagPagesTemplate;
