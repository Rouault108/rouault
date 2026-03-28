import { expect } from '@esm-bundle/chai';
import { classifyLinkHref } from '../../lib/shared/link-kind.js';

describe('classifyLinkHref', () => {
  it('相対URLを internal-document として分類すること', () => {
    expect(classifyLinkHref('/notes/example')).to.equal('internal-document');
    expect(classifyLinkHref('../other-note')).to.equal('internal-document');
  });

  it('hash link を internal-fragment として分類すること', () => {
    expect(classifyLinkHref('#section-1')).to.equal('internal-fragment');
  });

  it('同一 origin の絶対URLを internal-document として分類すること', () => {
    expect(
      classifyLinkHref('https://rouault.example/notes/example', {
        siteOrigin: 'https://rouault.example',
        currentUrl: 'https://rouault.example/notes/current',
      }),
    ).to.equal('internal-document');
  });

  it('外部 http(s) URL を external-web として分類すること', () => {
    expect(
      classifyLinkHref('https://example.com/article', {
        siteOrigin: 'https://rouault.example',
        currentUrl: 'https://rouault.example/notes/current',
      }),
    ).to.equal('external-web');
  });

  it('mailto/tel を external-action として分類すること', () => {
    expect(classifyLinkHref('mailto:hello@example.com')).to.equal('external-action');
    expect(classifyLinkHref('tel:+81300000000')).to.equal('external-action');
  });

  it('危険な scheme を unsafe として分類すること', () => {
    expect(classifyLinkHref('javascript:alert(1)')).to.equal('unsafe');
    expect(classifyLinkHref('data:text/html,<b>x</b>')).to.equal('unsafe');
  });
});