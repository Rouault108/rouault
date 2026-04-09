/**
 * ノート用レイアウト。
 *
 * BaseLayout を layout chain で継承し、
 * サイドバー + 本文 + TOC の3カラム構成を提供する。
 */

import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import { ARTICLE_HEADER_TAGS_DATA_ATTRIBUTE } from '../components/ui/article-header/article-header-tags-adapter.js';
import { escapeHtmlText, renderJsonScriptElement, serializeHtmlAttributes } from './html-output.js';

interface NoteLayoutData {
  notePage?: NotePageProjection;
}

const NOTE_LAYOUT_SIDEBAR_ID = 'note-primary';

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

const buildSidebarAttributes = (sidebar: NonNullable<NotePageProjection['sidebar']>): string =>
  serializeHtmlAttributes([
    { name: 'source-id', value: sidebar.sourceId },
    { name: 'selected-id', value: sidebar.selectedId },
    { name: 'items-json', value: sidebar.items, kind: 'json' },
    { name: 'heading', value: sidebar.heading },
    { name: 'fixed-breakpoint', value: sidebar.fixedBreakpoint },
    { name: 'presentation', value: 'auto' },
    { name: 'sidebar-id', value: NOTE_LAYOUT_SIDEBAR_ID },
    { name: 'data-hydration-capability', value: 'interactive' },
    { name: 'data-hydration-trigger', value: 'initial' },
  ]);

const renderSidebar = (sidebar: NonNullable<NotePageProjection['sidebar']>): string => {
  const sidebarAttributes = buildSidebarAttributes(sidebar);

  return `
    <aside
      class="layout-sidebar-col"
      aria-label="ナビゲーション"
      data-hydration-scope="note-sidebar"
      data-sidebar-surface="primary"
    >
      <layout-sidebar${sidebarAttributes}></layout-sidebar>
    </aside>
  `.trim();
};

const renderArticleHeader = (articleHeader: NotePageProjection['articleHeader']): string => {
  const articleHeaderAttributes = serializeHtmlAttributes([
    { name: 'heading', value: articleHeader.heading },
    {
      name: 'breadcrumbs-json',
      value:
        articleHeader.breadcrumbs && articleHeader.breadcrumbs.length > 0
          ? articleHeader.breadcrumbs
          : undefined,
      kind: 'json',
    },
    { name: 'published', value: articleHeader.published },
    { name: 'updated', value: articleHeader.updated },
    { name: 'status', value: articleHeader.status },
    { name: 'source', value: articleHeader.source },
    { name: 'license', value: articleHeader.license },
    {
      name: ARTICLE_HEADER_TAGS_DATA_ATTRIBUTE,
      value: articleHeader.genres.length > 0 ? articleHeader.genres : undefined,
      kind: 'json',
    },
    {
      name: 'data-hydration-capability',
      value: articleHeader.shouldHydrateTags ? 'progressive' : undefined,
    },
    {
      name: 'data-hydration-trigger',
      value: articleHeader.shouldHydrateTags ? 'post-commit' : undefined,
    },
  ]);

  return `<ui-article-header${articleHeaderAttributes}></ui-article-header>`;
};

const renderToc = (toc: NotePageProjection['toc']): string => {
  const tocAttributes = serializeHtmlAttributes([
    { name: 'source-id', value: toc.sourceId },
    { name: 'headings-json', value: toc.headings, kind: 'json' },
    { name: 'capabilities-json', value: toc.capabilities, kind: 'json' },
    { name: 'content-root-id', value: toc.contentRootId },
    { name: 'home-href', value: toc.homeHref },
    {
      name: 'data-hydration-capability',
      value: toc.shouldHydrate ? 'interactive' : undefined,
    },
    {
      name: 'data-hydration-trigger',
      value: toc.shouldHydrate ? 'initial' : undefined,
    },
  ]);

  return `
    <aside
      class="layout-toc-col"
      aria-label="目次"
      data-hydration-scope="note-toc"
    >
      <layout-toc${tocAttributes}></layout-toc>
    </aside>
  `.trim();
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
      {
        name: 'data-pagefind-ignore',
        value: !notePage.pagefind,
        kind: 'boolean',
      },
    ]);

    return `
      <section${shellAttributes}>
        ${notePage.showSidebar && notePage.sidebar ? renderSidebar(notePage.sidebar) : ''}

        <article${article}>
          ${notePage.pagefind ? renderPagefindMetadata(notePage.pagefind) : ''}
          ${renderArticleHeader(notePage.articleHeader)}
          <div${serializeHtmlAttributes([
            { name: 'id', value: notePage.toc.contentRootId },
            { name: 'class', value: 'prose' },
          ])}>
            ${notePage.contentHtml}
          </div>
        </article>

        ${renderToc(notePage.toc)}
      </section>
      ${renderJsonScriptElement(notePage.toc.sourceId, notePage.toc.headings)}
      ${
        notePage.showSidebar && notePage.sidebar
          ? renderJsonScriptElement(notePage.sidebar.sourceId, notePage.sidebar.items)
          : ''
      }
    `.trim();
  }
}

export default NoteLayout;