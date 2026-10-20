import type { ContentDocumentContext } from '../build/content/content-build-context.js';
import type { MemoRecord } from '../build/data/memos.js';
import { buildMemoPageProjection } from '../build/projections/memo-page-projection.js';
interface MemoPageData {
  contentBuildContexts?: ReadonlyMap<string, ContentDocumentContext>;
  memo?: MemoRecord;
  memos?: MemoRecord[];
}
export default class MemoPages {
  data() {
    return {
      layout: 'note',
      pagination: { data: 'memos', size: 1, alias: 'memo' },
      eleventyComputed: {
        title: (data: MemoPageData) => data.memo?.title,
        permalink: (data: MemoPageData) => data.memo?.outputPath ?? false,
        notePage: (data: MemoPageData) => {
          if (!data.memo) return undefined;
          const linkContext = data.contentBuildContexts?.get(
            `${data.memo.sourceRoot}/${data.memo.identity.sourceRelativePath}`,
          );
          if (data.contentBuildContexts && !linkContext)
            throw new Error('[content] missing current memo context');
          return buildMemoPageProjection(data.memo, data.memos ?? [], linkContext);
        },
      },
    };
  }
  render() {
    return '';
  }
}
