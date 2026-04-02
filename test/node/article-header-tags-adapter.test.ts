import { describe, expect, it } from 'vitest';

import {
  parseArticleHeaderTagsAdapterValue,
} from '../../src/components/ui/article-header/article-header-tags-adapter.js';

describe('parseArticleHeaderTagsAdapterValue', () => {
  it('JSON 配列から trim 済みタグ配列を復元すること', () => {
    expect(parseArticleHeaderTagsAdapterValue('["  music  ","classical",""]')).to.deep.equal([
      'music',
      'classical',
    ]);
  });

  it('不正な JSON は空配列として扱うこと', () => {
    expect(parseArticleHeaderTagsAdapterValue('{invalid json}')).to.deep.equal([]);
  });

  it('配列以外の JSON は空配列として扱うこと', () => {
    expect(parseArticleHeaderTagsAdapterValue('"music"')).to.deep.equal([]);
  });
});
