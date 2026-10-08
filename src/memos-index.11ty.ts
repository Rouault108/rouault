import type { MemoRecord } from '../build/data/memos.js';
import { buildMemoIndexProjection } from '../build/projections/memo-index-projection.js';
import { MEMO_RIGHTS_NOTICE } from '../build/projections/memo-page-projection.js';
import { renderEmptyStateHtml } from './layouts/empty-state-html.js';
import { escapeHtmlText, escapeHtmlAttribute } from './layouts/html-output.js';

const renderMemoItems = (
  items: ReturnType<typeof buildMemoIndexProjection>,
  prefix: string,
): string => {
  if (items.length === 0) {
    return renderEmptyStateHtml({ heading: '公開中のメモはありません' });
  }

  return `<ol class="results-list memo-index__list">${items
    .map(
      (item) => `
        <li class="memo-index__item">
          <article class="result-card" data-result-card>
            <a
              class="result-link"
              href="${escapeHtmlAttribute(prefix + item.href)}"
              data-link-kind="internal-document"
              data-link-surface="card"
            >
              <h2 class="result-title">${escapeHtmlText(item.title)}</h2>
            </a>
          </article>
        </li>
      `,
    )
    .join('')}</ol>`;
};

export default class MemoIndex {
  data() {
    return {
      layout: 'base',
      title: 'メモ',
      permalink: '/memos/index.html',
      footerCopyrightText: MEMO_RIGHTS_NOTICE,
    };
  }
  render(data: { memos?: MemoRecord[]; siteUrlContext?: { basePath: string } }) {
    const items = buildMemoIndexProjection(data.memos ?? []);
    const prefix = data.siteUrlContext?.basePath ?? '';
    return `
      <section class="memo-index page-shell" aria-labelledby="memo-index-title">
        <div class="hero">
          <p class="eyebrow">Memos</p>
          <h1 id="memo-index-title" class="heading">メモ</h1>
          <div class="meta-row"><span>${items.length.toLocaleString('ja-JP')}件のメモ</span></div>
        </div>
        <div class="results-section">${renderMemoItems(items, prefix)}</div>
      </section>
    `.trim();
  }
}
