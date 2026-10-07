import type { MemoRecord } from '../build/data/memos.js';
import { buildMemoIndexProjection } from '../build/projections/memo-index-projection.js';
import { MEMO_RIGHTS_NOTICE } from '../build/projections/memo-page-projection.js';
import { escapeHtmlText, escapeHtmlAttribute } from './layouts/html-output.js';
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
    return `<article class="container-reading"><h1>メモ</h1>${items.length ? `<ul>${items.map((item) => `<li><a href="${escapeHtmlAttribute(prefix + item.href)}" data-link-kind="internal-document" data-link-surface="navigation">${escapeHtmlText(item.title)}</a></li>`).join('')}</ul>` : '<p>公開中のメモはありません</p>'}<p>${escapeHtmlText(MEMO_RIGHTS_NOTICE)}</p></article>`;
  }
}
