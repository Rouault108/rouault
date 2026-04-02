import { describe, expect, it } from 'vitest';
import { formatArticleDate } from '../../src/components/ui/article-header/format-article-date.js';

describe('formatArticleDate', () => {
  it('YYYY-MM-DD 形式の日付文字列はそのまま返すこと', () => {
    expect(formatArticleDate('2026-02-10')).to.equal('2026-02-10');
  });

  it('前後空白付きでも YYYY-MM-DD 形式なら正規化して返すこと', () => {
    expect(formatArticleDate(' 2026-02-10 ')).to.equal('2026-02-10');
  });

  it('UTC付きのISO日時は無効値として空文字を返すこと', () => {
    expect(formatArticleDate('2026-02-10T00:00:00.000Z')).to.equal('');
  });

  it('空白のみ文字列は無効値として空文字を返すこと', () => {
    expect(formatArticleDate('   ')).to.equal('');
  });

  it('不正な日付文字列は無効値として空文字を返すこと', () => {
    expect(formatArticleDate('2026/02/10')).to.equal('');
  });
});
