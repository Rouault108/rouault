import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import {
  getArticleHeaderStatusPresentation,
  normalizeArticleHeaderBreadcrumbs,
  normalizeArticleHeaderLicense,
  normalizeArticleHeaderTag,
  toArticleHeaderTagHref,
  toSafeArticleHeaderSourceHref,
} from '../article-header/article-header-contract.js';
import { renderStaticIconHtml } from '../../shared/icons/render-static-icon-html.js';
import {
  createStaticRenderIdContext,
  type StaticRenderIdContext,
} from '../../shared/static-render-id-context.js';
import { escapeHtmlAttribute, escapeHtmlText, serializeHtmlAttributes } from './html-output.js';
import type {
  ArticleHeaderSourceLinkAnnotation,
  ArticleHeaderSourceLinkMode,
} from './article-header-source-link.js';

type ArticleHeaderProjection = NotePageProjection['articleHeader'];

const renderBreadcrumbs = (breadcrumbs: ArticleHeaderProjection['breadcrumbs']): string => {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return '';
  }

  const normalizedBreadcrumbs = normalizeArticleHeaderBreadcrumbs(breadcrumbs);
  if (normalizedBreadcrumbs.length === 0) {
    return '';
  }

  const lastIndex = normalizedBreadcrumbs.length - 1;
  const items = normalizedBreadcrumbs
    .map((item, index) => {
      const label = escapeHtmlText(item.label);
      const isLast = index === lastIndex;
      const content = isLast
        ? `<span class="article-header__breadcrumb-node article-header__breadcrumb-current" aria-current="page">${label}</span>`
        : item.href
          ? `<a class="article-header__breadcrumb-node article-header__breadcrumb-link" href="${escapeHtmlAttribute(item.href)}" data-link-kind="internal-document" data-link-surface="navigation">${label}</a>`
          : `<span class="article-header__breadcrumb-node article-header__breadcrumb-static">${label}</span>`;
      const separator = !isLast
        ? `<span class="article-header__breadcrumb-separator" aria-hidden="true">${renderStaticIconHtml(
            'chevron-right',
            'article-header__breadcrumb-separator-icon',
          )}</span>`
        : '';

      return `<li class="article-header__breadcrumb-item">${content}${separator}</li>`;
    })
    .join('');

  return `
    <nav class="article-header__breadcrumbs" aria-label="現在の階層">
      <ol class="article-header__breadcrumb-list">${items}</ol>
    </nav>
  `.trim();
};

const renderStatus = (status: ArticleHeaderProjection['status']): string => {
  const presentation = getArticleHeaderStatusPresentation(status);
  if (presentation === null) {
    return '';
  }

  return `
    <div
      class="article-header__status article-header__status--${escapeHtmlAttribute(presentation.tone)}"
      aria-label="ステータス: ${escapeHtmlAttribute(presentation.label)}"
    >
      ${renderStaticIconHtml(presentation.icon, 'article-header__metadata-icon')}
      <span class="article-header__status-label">${escapeHtmlText(presentation.label)}</span>
    </div>
  `.trim();
};

const renderPrimaryMetadata = (articleHeader: ArticleHeaderProjection): string => {
  const displayDate = articleHeader.updated?.trim() ?? articleHeader.published?.trim() ?? '';
  if (displayDate.length === 0) {
    return '';
  }

  const dateLabel = articleHeader.updated?.trim() ? '最終更新日' : '公開日';
  const created = articleHeader.created?.trim() ?? '';
  const ariaLabel =
    created.length > 0
      ? `${dateLabel}: ${displayDate}、作成日: ${created}`
      : `${dateLabel}: ${displayDate}`;
  return `
    <ul class="article-header__metadata article-header__metadata--primary" aria-label="記事メタデータ">
      <li class="article-header__metadata-item article-header__metadata-item--date">
        ${renderStaticIconHtml('history', 'article-header__metadata-icon')}
        <time datetime="${escapeHtmlAttribute(displayDate)}" aria-label="${escapeHtmlAttribute(ariaLabel)}">
          ${escapeHtmlText(displayDate)}
        </time>
      </li>
    </ul>
  `.trim();
};

const renderTags = (genres: readonly string[]): string => {
  const items = genres
    .map((genre) => {
      const normalizedGenre = normalizeArticleHeaderTag(genre);
      if (normalizedGenre === null) {
        return '';
      }

      const href = toArticleHeaderTagHref(normalizedGenre);
      return `
        <li class="article-header__tag-item">
          <a
            class="article-header__tag-link"
            href="${escapeHtmlAttribute(href)}"
            data-link-kind="internal-document"
            data-link-surface="control"
            rel="tag"
            aria-label="タグ: ${escapeHtmlAttribute(normalizedGenre)}"
          >
            <span class="article-header__tag-label">${escapeHtmlText(normalizedGenre)}</span>
          </a>
        </li>
      `.trim();
    })
    .filter((item) => item.length > 0)
    .join('');

  if (items.length === 0) {
    return '';
  }

  return `
    <nav class="article-header__tags" aria-label="タグ">
      <ul class="article-header__tag-list">${items}</ul>
    </nav>
  `.trim();
};

const renderSourceLink = (annotation: ArticleHeaderSourceLinkAnnotation): string => {
  const sourceLinkAttributes = serializeHtmlAttributes([
    { name: 'class', value: 'article-header__source-link' },
    { name: 'href', value: annotation.href },
    { name: 'target', value: '_blank' },
    { name: 'rel', value: 'noopener noreferrer' },
    { name: 'data-link-kind', value: annotation.kind },
    { name: 'data-link-surface', value: annotation.surface },
    { name: 'data-external', value: annotation.isExternalWeb ? 'true' : undefined },
    { name: 'aria-label', value: annotation.ariaLabel },
  ]);

  return `
      <li class="article-header__metadata-item article-header__metadata-item--source">
        ${renderStaticIconHtml('link', 'article-header__metadata-icon')}
        <a${sourceLinkAttributes}>
          出典
        </a>
      </li>
    `.trim();
};

const createRawFallbackSourceLinkAnnotation = (
  articleHeader: ArticleHeaderProjection,
): ArticleHeaderSourceLinkAnnotation | null => {
  const sourceHref = toSafeArticleHeaderSourceHref(articleHeader.source);
  if (!sourceHref) {
    return null;
  }
  return {
    href: sourceHref,
    kind: 'external-web',
    surface: 'metadata',
    isExternalWeb: true,
    ariaLabel: '出典（外部サイト、新しいタブで開く）',
  };
};

const resolveSourceLinkAnnotation = (
  articleHeader: ArticleHeaderProjection,
  sourceLinkMode: ArticleHeaderSourceLinkMode,
): ArticleHeaderSourceLinkAnnotation | null => {
  if (sourceLinkMode.kind === 'classified') {
    return sourceLinkMode.annotation;
  }
  return createRawFallbackSourceLinkAnnotation(articleHeader);
};

const renderSecondaryMetadata = (
  articleHeader: ArticleHeaderProjection,
  sourceLinkMode: ArticleHeaderSourceLinkMode,
): string => {
  const items: string[] = [];
  const sourceLinkAnnotation = resolveSourceLinkAnnotation(articleHeader, sourceLinkMode);

  if (sourceLinkAnnotation !== null) {
    items.push(renderSourceLink(sourceLinkAnnotation));
  }

  const license = normalizeArticleHeaderLicense(articleHeader.license);
  if (license !== null) {
    items.push(
      `
      <li class="article-header__metadata-item article-header__metadata-item--license">
        ${renderStaticIconHtml('scale', 'article-header__metadata-icon')}
        <span>${escapeHtmlText(license)}</span>
      </li>
    `.trim(),
    );
  }

  if (items.length === 0) {
    return '';
  }

  return `
    <ul class="article-header__metadata article-header__metadata--secondary" aria-label="出典・ライセンス情報">
      ${items.join('')}
    </ul>
  `.trim();
};

export const renderArticleHeaderHtml = (
  articleHeader: ArticleHeaderProjection,
  options: {
    readonly idContext?: StaticRenderIdContext;
    readonly sourceLinkMode?: ArticleHeaderSourceLinkMode;
  } = {},
): string => {
  const idContext = options.idContext ?? createStaticRenderIdContext('layout:article-header');
  const sourceLinkMode = options.sourceLinkMode ?? { kind: 'raw-fallback' };
  idContext.reserveId('article-header', 'article-header');
  return `
    <header class="article-header" data-article-header>
      ${renderBreadcrumbs(articleHeader.breadcrumbs)}
      ${renderStatus(articleHeader.status)}
      <h1 class="article-header__heading">${escapeHtmlText(articleHeader.heading)}</h1>
      ${renderPrimaryMetadata(articleHeader)}
      ${renderTags(articleHeader.genres)}
      ${renderSecondaryMetadata(articleHeader, sourceLinkMode)}
    </header>
  `.trim();
};
