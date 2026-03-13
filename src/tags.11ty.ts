import {
  DEFAULT_SEARCH_SORT_MODE,
  buildSearchHref,
} from './lib/search/search-url.js';
import { loadTagPagesData, type TagPageEntry, type TagPageNoteSummary } from './data/tagPages.js';

interface TagPageTemplateData {
  tagPage?: TagPageEntry;
}

interface TagPagesPaginationData extends TagPageTemplateData {
  paginationTagPages?: TagPageEntry[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const renderDate = (date: string): string =>
  date.length > 0
    ? `<p class="tag-page__item-meta">更新日: <time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time></p>`
    : '';

const renderDescription = (description: string): string =>
  description.length > 0
    ? `<p class="tag-page__item-description">${escapeHtml(description)}</p>`
    : '';

const renderNotes = (notes: readonly TagPageNoteSummary[]): string =>
  notes
    .map((note) => {
      return `
        <li class="tag-page__item">
          <ui-card class="tag-page__item-card" clickable variant="outlined">
            <a class="tag-page__item-link" href="${escapeHtml(note.permalink)}">
              <h2 class="tag-page__item-title">${escapeHtml(note.title)}</h2>
              ${renderDate(note.date)}
              ${renderDescription(note.description)}
            </a>
          </ui-card>
        </li>
      `.trim();
    })
    .join('\n');

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

    const searchHref = buildSearchHref({
      query: '',
      tags: [tagPage.tag],
      sort: DEFAULT_SEARCH_SORT_MODE,
    });

    return `
      <section class="tag-page" aria-labelledby="tag-page-title">
        <header class="tag-page__hero">
          <p class="tag-page__eyebrow">Tag / Archive</p>
          <h1 id="tag-page-title" class="tag-page__title">#${escapeHtml(tagPage.tag)}</h1>
          <p class="tag-page__description">このタグに属する公開ノートを新しい順で一覧します。</p>
          <div class="tag-page__meta">
            <p class="tag-page__count">${escapeHtml(tagPage.noteCount.toString())}件のノート</p>
            <a class="link-control link-subtle" href="${escapeHtml(searchHref)}">このタグで検索へ</a>
          </div>
        </header>

        <ol class="tag-page__list">
          ${renderNotes(tagPage.notes)}
        </ol>
      </section>
    `.trim();
  }
}

export default TagPagesTemplate;
