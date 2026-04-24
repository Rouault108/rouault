import type { NotePageProjection } from '../../build/projections/note-page-projection.js';
import type { NoteStatus } from '../types/article-status.js';
import { escapeHtmlAttribute, escapeHtmlText } from './html-output.js';

type ArticleHeaderProjection = NotePageProjection['articleHeader'];

const STATUS_LABELS: Partial<Record<NoteStatus, string>> = {
  draft: '下書き',
  archived: 'アーカイブ',
  wip: '作業中',
  deprecated: '非推奨',
};

const toTagHref = (tag: string): string => `/tags/${encodeURIComponent(tag)}/`;

const toSafeSourceHref = (value: string | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  if (normalized.length === 0) {
    return null;
  }

  try {
    const url = new URL(normalized);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
};

const renderBreadcrumbs = (breadcrumbs: ArticleHeaderProjection['breadcrumbs']): string => {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return '';
  }

  const lastIndex = breadcrumbs.length - 1;
  const items = breadcrumbs
    .map((item, index) => {
      const label = escapeHtmlText(item.label);
      const href = typeof item.href === 'string' ? item.href.trim() : '';
      const content =
        index === lastIndex || href.length === 0
          ? `<span class="article-header__breadcrumb-current" aria-current="page">${label}</span>`
          : `<a class="article-header__breadcrumb-link" href="${escapeHtmlAttribute(href)}">${label}</a>`;

      return `<li class="article-header__breadcrumb-item">${content}</li>`;
    })
    .join('');

  return `
    <nav class="article-header__breadcrumbs" aria-label="現在の階層">
      <ol class="article-header__breadcrumb-list">${items}</ol>
    </nav>
  `.trim();
};

const renderStatus = (status: NoteStatus | undefined): string => {
  if (!status || !(status in STATUS_LABELS)) {
    return '';
  }

  const label = STATUS_LABELS[status];
  if (!label) {
    return '';
  }
  return `
    <div
      class="article-header__status article-header__status--${escapeHtmlAttribute(status)}"
      aria-label="ステータス: ${escapeHtmlAttribute(label)}"
    >
      <span class="article-header__status-label">${escapeHtmlText(label)}</span>
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
    created.length > 0 ? `${dateLabel}: ${displayDate}、作成日: ${created}` : `${dateLabel}: ${displayDate}`;
  return `
    <ul class="article-header__metadata article-header__metadata--primary" aria-label="記事メタデータ">
      <li class="article-header__metadata-item article-header__metadata-item--date">
        <time datetime="${escapeHtmlAttribute(displayDate)}" aria-label="${escapeHtmlAttribute(ariaLabel)}">
          ${escapeHtmlText(displayDate)}
        </time>
      </li>
    </ul>
  `.trim();
};

const renderTags = (genres: readonly string[]): string => {
  if (genres.length === 0) {
    return '';
  }

  const items = genres
    .map((genre) => {
      const href = toTagHref(genre);
      return `
        <li class="article-header__tag-item">
          <a class="article-header__tag-link" href="${escapeHtmlAttribute(href)}" rel="tag">${escapeHtmlText(genre)}</a>
        </li>
      `.trim();
    })
    .join('');

  return `
    <nav class="article-header__tags" aria-label="タグ">
      <ul class="article-header__tag-list">${items}</ul>
    </nav>
  `.trim();
};

const renderSecondaryMetadata = (articleHeader: ArticleHeaderProjection): string => {
  const items: string[] = [];
  const sourceHref = toSafeSourceHref(articleHeader.source);

  if (sourceHref) {
    items.push(`
      <li class="article-header__metadata-item article-header__metadata-item--source">
        <a
          class="article-header__source-link"
          href="${escapeHtmlAttribute(sourceHref)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="出典（外部リンク）"
        >
          出典
        </a>
      </li>
    `.trim());
  }

  const license = articleHeader.license?.trim() ?? '';
  if (license.length > 0) {
    items.push(`
      <li class="article-header__metadata-item article-header__metadata-item--license">
        <span>${escapeHtmlText(license)}</span>
      </li>
    `.trim());
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
