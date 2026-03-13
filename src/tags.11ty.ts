import {
  DEFAULT_SEARCH_SORT_MODE,
  buildSearchHref,
} from './lib/search/search-url.js';
import type { TagPageEntry, TagPageNoteSummary } from './data/tagPages.js';

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
          <article class="tag-page__item-card">
            <h2 class="tag-page__item-title">
              <a class="link-text" href="${escapeHtml(note.permalink)}">${escapeHtml(note.title)}</a>
            </h2>
            ${renderDate(note.date)}
            ${renderDescription(note.description)}
          </article>
        </li>
      `.trim();
    })
    .join('\n');

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
        title: (data: TagPageTemplateData) => `タグ: ${data.tagPage?.tag ?? ''}`,
        permalink: (data: TagPageTemplateData) => {
          if (typeof data.tagPage?.tag !== 'string' || data.tagPage.tag.length === 0) {
            return false;
          }

          return `/tags/${encodeURIComponent(data.tagPage.tag)}/index.html`;
        },
      },
    };
  }

  render(data: TagPageTemplateData) {
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
          <p class="tag-page__eyebrow">Tag Archive</p>
          <h1 id="tag-page-title" class="tag-page__title">#${escapeHtml(tagPage.tag)}</h1>
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
