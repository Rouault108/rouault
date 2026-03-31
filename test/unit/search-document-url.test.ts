import { expect } from '@open-wc/testing';

import {
  derivePathLabel,
  normalizeDocumentCanonicalUrl,
  validateResultUrl,
} from '../../shared/search/document-url.js';

describe('search-document-url', () => {
  it('DocumentCanonicalUrl を正規化すること', () => {
    expect(normalizeDocumentCanonicalUrl('/notes/math/logic')).to.equal('/notes/math/logic/');
    expect(normalizeDocumentCanonicalUrl('/notes/math//logic/index.html')).to.equal(
      '/notes/math/logic/',
    );
    expect(normalizeDocumentCanonicalUrl('https://example.com/notes/math/logic/?q=test#hash')).to.equal(
      '/notes/math/logic/',
    );
  });

  it('検索状態 URL は DocumentCanonicalUrl として拒否すること', () => {
    expect(normalizeDocumentCanonicalUrl('/search?q=test')).to.equal(null);
    expect(normalizeDocumentCanonicalUrl('/tags/music/')).to.equal(null);
  });

  it('pathLabel は canonical document URL から導出すること', () => {
    expect(derivePathLabel('/notes/math/logic/')).to.equal('notes / math / logic');
  });

  it('結果 URL を同一 origin の内部 URL に制限すること', () => {
    expect(validateResultUrl('/notes/math/logic/')).to.deep.equal({
      ok: true,
      url: '/notes/math/logic/',
    });
    expect(validateResultUrl('javascript:alert(1)')).to.deep.equal({
      ok: false,
      code: 'unsupported-url-scheme',
    });
  });
});
