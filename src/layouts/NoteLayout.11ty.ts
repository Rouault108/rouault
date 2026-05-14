/**
 * ノート用レイアウト。
 *
 * BaseLayout を layout chain で継承し、
 * 本文、記事ヘッダー、TOC、TOC JSON、Pagefind metadata だけを出力する。
 * app shell 上の sidebar host は BaseLayout が所有する。
 */
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import { escapeHtmlText, serializeHtmlAttributes } from './html-output.js';
import { renderArticleHeaderHtml } from './article-header-html.js';
import { renderMobileStaticTocNavHtml, renderTocHtml } from './toc-html.js';

interface NoteLayoutData {
  notePage?: NotePageProjection;
}

const renderPagefindGenreFilters = (genres: readonly string[]): string =>
  genres
    .map(
      (genre) =>
        `<span${serializeHtmlAttributes([{ name: 'data-pagefind-filter', value: `genre:${genre}` }])}></span>`,
    )
    .join('');

const renderPagefindMetadata = (pagefind: NonNullable<NotePageProjection['pagefind']>): string => {
  const title = pagefind.title;
  const description = pagefind.description;
  const tokenizedTitle = pagefind.tokenizedTitle;
  const tokenizedDescription = pagefind.tokenizedDescription;
  const date = pagefind.date;
  const genreFilters = renderPagefindGenreFilters(pagefind.tags);

  return `
    <div class="sr-only" aria-hidden="true" data-pagefind-ignore>
      <span data-pagefind-meta="title">${escapeHtmlText(title)}</span>
      <span data-pagefind-meta="description">${escapeHtmlText(description)}</span>
      <span data-pagefind-meta="date">${escapeHtmlText(date)}</span>
      ${genreFilters}
    </div>
    <div class="sr-only" aria-hidden="true">
      ${title.length > 0 ? `<span data-pagefind-weight="10">${escapeHtmlText(title)}</span>` : ''}
      ${tokenizedTitle.length > 0 ? `<span data-pagefind-weight="8">${escapeHtmlText(tokenizedTitle)}</span>` : ''}
      ${description.length > 0 ? `<span data-pagefind-weight="5">${escapeHtmlText(description)}</span>` : ''}
      ${tokenizedDescription.length > 0 ? `<span data-pagefind-weight="3">${escapeHtmlText(tokenizedDescription)}</span>` : ''}
    </div>
  `.trim();
};

const renderToc = (toc: NotePageProjection['toc']): string => {
  return renderTocHtml(toc);
};

export class NoteLayout {
  data() {
    return {
      layout: 'base',
    };
  }

  render(data: NoteLayoutData) {
    const notePage = data.notePage;
    if (!notePage) {
      return '';
    }

    const article = serializeHtmlAttributes([
      { name: 'class', value: 'layout-main-col container-reading' },
      {
        name: 'data-pagefind-body',
        value: Boolean(notePage.pagefind),
        kind: 'boolean',
      },
      {
        name: 'data-pagefind-ignore',
        value: !notePage.pagefind,
        kind: 'boolean',
      },
      {
        name: 'data-pagefind-sort',
        value: notePage.pagefind ? `date:${notePage.pagefind.sortDate}` : undefined,
      },
      { name: 'data-hydration-scope', value: 'note-content' },
    ]);

    const shellAttributes = serializeHtmlAttributes([
      { name: 'class', value: 'note-shell' },
      { name: 'data-hydration-scope', value: 'note-shell' },
      { name: 'data-note-kind', value: notePage.noteKind },
      { name: 'data-sidebar-presence', value: notePage.noteShellSidebarPresence },
      { name: 'data-toc-presence', value: notePage.tocPresence },
      {
        name: 'data-pagefind-ignore',
        value: !notePage.pagefind,
        kind: 'boolean',
      },
    ]);

    return `
      <section${shellAttributes}>
        ${
          notePage.tocPresence === 'present' && !notePage.toc.shouldHydrate
            ? renderMobileStaticTocNavHtml(notePage.toc)
            : ''
        }
        <article${article}>
          ${notePage.pagefind ? renderPagefindMetadata(notePage.pagefind) : ''}
          ${renderArticleHeaderHtml(notePage.articleHeader)}
          <div${serializeHtmlAttributes([
            { name: 'id', value: notePage.toc.contentRootId },
            { name: 'class', value: 'prose' },
          ])}>
            ${notePage.contentHtml}
          </div>
        </article>

        ${notePage.tocPresence === 'present' ? renderToc(notePage.toc) : ''}
      </section>
    `.trim();
  }
}

export default NoteLayout;
