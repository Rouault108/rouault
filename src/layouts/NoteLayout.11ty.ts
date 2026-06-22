/**
 * ノート用レイアウト。
 *
 * BaseLayout を layout chain で継承し、
 * 本文、記事ヘッダー、TOC、TOC JSON、Pagefind metadata だけを出力する。
 * app shell 上の sidebar host は BaseLayout が所有する。
 */
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import type { NoteNavigationEntry } from '../../build/navigation/index.js';
import type { CorpusPageEntry } from '../data/corpusPages.js';
import type { SiteUrlContextData } from '../data/siteUrlContext.js';
import { buildGeneratedPageLinkClassificationContext } from '../../build/content/generated-page-link-context.js';
import { createStaticRenderIdContext } from '../../shared/static-render-id-context.js';
import { toSafeArticleHeaderSourceHref } from '../article-header/article-header-contract.js';
import { escapeHtmlText, serializeHtmlAttributes } from './html-output.js';
import { renderArticleHeaderHtml } from './article-header-html.js';
import {
  createArticleHeaderSourceLinkAnnotation,
  type ArticleHeaderSourceLinkMode,
} from './article-header-source-link.js';
import { renderMobileStaticTocNavHtml, renderTocHtml } from './toc-html.js';

interface NoteLayoutData {
  notePage?: NotePageProjection;
  siteUrlContext?: SiteUrlContextData | null;
  page?: { readonly url?: unknown };
  note?: { readonly permalink?: unknown };
  notes?: readonly NoteNavigationEntry[];
  corpusPages?: readonly CorpusPageEntry[];
  tagPages?: readonly { readonly tag?: unknown }[];
}

type ArticleHeaderSourceClassificationData = NoteLayoutData & {
  readonly siteUrlContext: SiteUrlContextData;
  readonly notes: readonly NoteNavigationEntry[];
  readonly corpusPages: readonly CorpusPageEntry[];
  readonly tagPages: readonly { readonly tag?: unknown }[];
};

const getArticleHeaderSourceClassificationData = (
  data: NoteLayoutData,
): ArticleHeaderSourceClassificationData => {
  if (data.siteUrlContext === undefined || data.siteUrlContext === null) {
    throw new Error('NoteLayout requires siteUrlContext to classify article header source links.');
  }
  if (data.page?.url === undefined && data.note?.permalink === undefined) {
    throw new Error(
      'NoteLayout requires page.url or note.permalink to classify article header source links.',
    );
  }
  if (data.notes === undefined || data.corpusPages === undefined || data.tagPages === undefined) {
    throw new Error(
      'NoteLayout requires generated page link context data to classify article header source links.',
    );
  }
  return {
    ...data,
    siteUrlContext: data.siteUrlContext,
    notes: data.notes,
    corpusPages: data.corpusPages,
    tagPages: data.tagPages,
  };
};

const createSourceLinkMode = (
  data: NoteLayoutData,
  notePage: NotePageProjection,
): ArticleHeaderSourceLinkMode => {
  const sourceHref = toSafeArticleHeaderSourceHref(notePage.articleHeader.source);
  if (sourceHref === null) {
    return { kind: 'classified', annotation: null };
  }

  const classificationData = getArticleHeaderSourceClassificationData(data);
  const context = buildGeneratedPageLinkClassificationContext(
    classificationData,
    classificationData.siteUrlContext,
  );
  return {
    kind: 'classified',
    annotation: createArticleHeaderSourceLinkAnnotation({
      href: sourceHref,
      siteUrlContext: classificationData.siteUrlContext,
      currentUrl: context.currentUrl,
      routeClassificationMode: context.routeClassificationMode,
    }),
  };
};

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
    const idContext = createStaticRenderIdContext(`note-layout:${notePage.toc.contentRootId}`);
    const sourceLinkMode = createSourceLinkMode(data, notePage);

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
          ${renderArticleHeaderHtml(notePage.articleHeader, { idContext, sourceLinkMode })}
          <div${serializeHtmlAttributes([
            { name: 'id', value: notePage.toc.contentRootId },
            { name: 'class', value: 'prose' },
            { name: 'data-note-static-surface', value: 'true' },
            { name: 'data-hydration-key', value: 'note-static-surface-enhancer' },
            { name: 'data-hydration-capability', value: 'progressive' },
            { name: 'data-hydration-trigger', value: 'post-commit' },
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
