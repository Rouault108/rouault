import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import {
  getArticleHeaderStatusPresentation,
  normalizeArticleHeaderBreadcrumbs,
  normalizeArticleHeaderLicense,
  normalizeArticleHeaderTag,
  toArticleHeaderTagHref,
  toSafeArticleHeaderSourceHref,
} from '../article-header/article-header-contract.js';
import { renderStaticArticleHeaderIconHtml } from './article-header-icon-html.js';
import { escapeHtmlAttribute, escapeHtmlText } from './html-output.js';

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
        ? `<span class="article-header__breadcrumb-separator" aria-hidden="true">${renderStaticArticleHeaderIconHtml(
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
      ${renderStaticArticleHeaderIconHtml(presentation.icon, 'article-header__metadata-icon')}
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
        ${renderStaticArticleHeaderIconHtml('history', 'article-header__metadata-icon')}
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

const renderSecondaryMetadata = (articleHeader: ArticleHeaderProjection): string => {
  const items: string[] = [];
  const sourceHref = toSafeArticleHeaderSourceHref(articleHeader.source);

  if (sourceHref) {
    items.push(
      `
      <li class="article-header__metadata-item article-header__metadata-item--source">
        ${renderStaticArticleHeaderIconHtml('link', 'article-header__metadata-icon')}
        <a
          class="article-header__source-link"
          href="${escapeHtmlAttribute(sourceHref)}"
          target="_blank"
          rel="noopener noreferrer"
          data-link-kind="external-web"
          data-link-surface="metadata"
          data-external="true"
          aria-label="出典（外部サイト、新しいタブで開く）"
        >
          出典
        </a>
      </li>
    `.trim(),
    );
  }

  const license = normalizeArticleHeaderLicense(articleHeader.license);
  if (license !== null) {
    items.push(
      `
      <li class="article-header__metadata-item article-header__metadata-item--license">
        ${renderStaticArticleHeaderIconHtml('scale', 'article-header__metadata-icon')}
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

export const renderArticleHeaderHtml = (articleHeader: ArticleHeaderProjection): string => {
  return `
    <header class="article-header" data-article-header>
      ${renderBreadcrumbs(articleHeader.breadcrumbs)}
      ${renderStatus(articleHeader.status)}
      <h1 class="article-header__heading">${escapeHtmlText(articleHeader.heading)}</h1>
      ${renderPrimaryMetadata(articleHeader)}
      ${renderTags(articleHeader.genres)}
      ${renderSecondaryMetadata(articleHeader)}
    </header>
  `.trim();
};
