import { expect } from '@open-wc/testing';
import { formatArticleDate } from '../../src/components/ui/article-header/format-article-date.js';

describe('formatArticleDate', () => {
  it('UTC付きのISO日時から日付部分のみを返すこと', () => {
    expect(formatArticleDate('2026-02-10T00:00:00.000Z')).to.equal('2026-02-10');
  });

  it('日付文字列はそのまま返すこと', () => {
    expect(formatArticleDate('2026-02-10')).to.equal('2026-02-10');
  });
});
