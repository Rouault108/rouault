import type { MemoRecord } from '../build/data/memos.js';
import {
  buildMemoPageProjection,
  MEMO_RIGHTS_NOTICE,
} from '../build/projections/memo-page-projection.js';
interface MemoPageData {
  memo?: MemoRecord;
  memos?: MemoRecord[];
}
export default class MemoPages {
  data() {
    return {
      layout: 'note',
      pagination: { data: 'memos', size: 1, alias: 'memo' },
      footerCopyrightText: MEMO_RIGHTS_NOTICE,
      eleventyComputed: {
        title: (data: MemoPageData) => data.memo?.title,
        permalink: (data: MemoPageData) =>
          data.memo ? `${decodeURI(data.memo.permalink)}/index.html` : false,
        notePage: (data: MemoPageData) =>
          data.memo ? buildMemoPageProjection(data.memo, data.memos ?? []) : undefined,
      },
    };
  }
  render() {
    return '';
  }
}
