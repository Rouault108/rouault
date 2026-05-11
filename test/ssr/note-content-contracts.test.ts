import { describe, expect, it } from 'vitest';

import {
  injectNoteContentProfiles,
  validateNoteContentContracts,
} from '../../build/content/note-content-contracts.js';

const canonicalFootnoteHtml = (
  overrides: { ref?: string; item?: string; olAttrs?: string; liAttrs?: string } = {},
): string => `
  <p>
    <a
      id="fn-a-ref-1"
      href="#fn-a"
      role="doc-noteref"
      aria-label="脚注 1 を開く"
      data-footnote-ref="true"
      data-footnote-id="fn-a"
      data-footnote-index="1"
      data-footnote-ref-instance="1"
      data-footnote-role="primary"
      data-hydration-key="footnote-popover-enhancer"
      data-hydration-capability="progressive"
      data-hydration-trigger="post-commit"
      ${overrides.ref ?? ''}
    ><sup>1</sup></a>
  </p>
  <section role="doc-endnotes">
    <h2 id="footnote-label">脚注</h2>
    <ol ${overrides.olAttrs ?? ''}>
      <li id="fn-a" ${overrides.liAttrs ?? ''}>${
        overrides.item ??
        '<p>body <a href="#fn-a-ref-1" data-footnote-backref="true" role="doc-backlink" aria-label="脚注参照 1 に戻る">↩︎</a></p>'
      }</li>
    </ol>
  </section>
`;

describe('validateNoteContentContracts', () => {
  it('reader note の preview-sandbox を build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        '<ui-code-preview><ui-preview-sandbox slot="preview"></ui-preview-sandbox></ui-code-preview>',
        'testing/test',
      );
    }).toThrow('[note-content:testing/test] reader note では preview-sandbox を使用できません');
  });

  it('reader note の code-preview controls と toolbar を build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        '<ui-code-preview controls="viewport"><button slot="toolbar">Open</button></ui-code-preview>',
        'testing/test',
      );
    }).toThrow(
      '[note-content:testing/test] reader note の code-preview では controls を使用できません',
    );
  });

  it('testing note の sandbox と controls は許可すること', () => {
    expect(() => {
      validateNoteContentContracts(
        'testing',
        '<ui-code-preview controls="viewport"><ui-preview-sandbox slot="preview"></ui-preview-sandbox></ui-code-preview>',
        'testing/test',
        'sandbox',
      );
    }).not.toThrow();
  });

  it('testing/sandbox 以外の preview-sandbox を build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'testing',
        '<ui-code-preview><ui-preview-sandbox slot="preview" allow-js="true"></ui-preview-sandbox></ui-code-preview>',
        'testing/interactive',
        'interactive',
      );
    }).toThrow(
      '[note-content:testing/interactive] testing/sandbox 以外では preview-sandbox を使用できません',
    );
  });

  it('static-first 化した legacy ui-* が note 最終 HTML に残っていれば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        '<ui-callout kind="tip"><p>legacy</p></ui-callout>',
        'testing/test',
      );
    }).toThrow('[note-content:testing/test] ui-callout は note 最終 HTML に残してはいけません');
  });

  it('representative な static note HTML を受け入れること', () => {
    const html = `
      <hr data-divider-variant="section">
      <p><mark data-current-match="true">match</mark></p>
      <aside data-callout="true" data-callout-kind="tip" aria-label="Tip">
        <div data-callout-content="true">
          <p data-callout-heading="true">Callout</p>
          <div data-callout-body="true"><p>body</p></div>
        </div>
      </aside>
      <section data-info-box="true" data-variant="filled" data-density="comfortable">
        <div data-info-box-header="true"><p data-info-box-heading="true">Info</p></div>
        <div data-info-box-body="true"><p>body</p></div>
      </section>
      <figure>
        <blockquote cite="https://example.com/quote"><p>quoted</p></blockquote>
        <figcaption><cite>source</cite></figcaption>
      </figure>
      <div data-table-root="true" role="region" tabindex="0" aria-label="静的テーブル">
        <table>
          <caption>静的テーブル</caption>
          <tbody><tr><td>value</td></tr></tbody>
        </table>
      </div>
      <figure
        data-image="true"
        data-image-zoomable="true"
        data-hydration-key="image-lightbox-enhancer"
        data-hydration-capability="progressive"
        data-hydration-trigger="visible"
        data-image-lightbox-src="/static/example.png"
      >
        <button type="button" data-image-zoom-trigger="true" aria-label="画像を拡大して表示">
          拡大
        </button>
        <img src="/static/example.png" alt="example image">
        <figcaption>caption</figcaption>
      </figure>
      <p>
        <a
          id="fn-1-ref-1"
          href="#fn-1"
          role="doc-noteref"
          aria-label="脚注 1 を開く"
          data-footnote-ref="true"
          data-footnote-id="fn-1"
          data-footnote-index="1"
          data-footnote-ref-instance="1"
          data-footnote-role="primary"
          data-hydration-key="footnote-popover-enhancer"
          data-hydration-capability="progressive"
          data-hydration-trigger="post-commit"
        ><sup>1</sup></a>
      </p>
      <section role="doc-endnotes">
        <h2 id="footnote-label">脚注</h2>
        <ol>
          <li id="fn-1"><p>body <a href="#fn-1-ref-1" data-footnote-backref="true" role="doc-backlink" aria-label="脚注参照 1 に戻る">↩︎</a></p></li>
        </ol>
      </section>
    `;

    expect(() => {
      validateNoteContentContracts('reader', html, 'testing/test');
    }).not.toThrow();
  });

  it('table root contract が崩れていれば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        '<div data-table-root="true"><table></table></div>',
        'testing/test',
      );
    }).toThrow('[note-content:testing/test] [data-table-root] には role="region" が必要です');
  });

  it('zoomable image に enhancer key が無ければ build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        [
          '<figure data-image="true" data-image-zoomable="true">',
          '<button type="button" data-image-zoom-trigger="true">拡大</button>',
          '<img src="/static/example.png" alt="example image">',
          '</figure>',
        ].join(''),
        'testing/test',
      );
    }).toThrow(
      '[note-content:testing/test] zoomable な figure[data-image] には data-hydration-key="image-lightbox-enhancer" が必要です',
    );
  });

  it('footnote ref に doc-endnotes が無ければ build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        [
          '<p>',
          '<a',
          ' id="fn-1-ref-1"',
          ' href="#fn-1"',
          ' role="doc-noteref"',
          ' aria-label="脚注 1 を開く"',
          ' data-footnote-ref="true"',
          ' data-footnote-id="fn-1"',
          ' data-footnote-index="1"',
          ' data-footnote-ref-instance="1"',
          ' data-footnote-role="primary"',
          ' data-hydration-key="footnote-popover-enhancer"',
          ' data-hydration-capability="progressive"',
          ' data-hydration-trigger="post-commit"',
          '><sup>1</sup></a>',
          '</p>',
        ].join(''),
        'testing/test',
      );
    }).toThrow(
      '[note-content:testing/test] [data-footnote-ref] を含む note には section[role="doc-endnotes"] が必要です',
    );
  });

  it('canonical footnote ref の href は canonical fragment と exact に一致する必要があること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        canonicalFootnoteHtml().replace('href="#fn-a"', 'href="#user-content-fn-a"'),
        'testing/test',
      );
    }).toThrow(
      'canonical footnote ref の href は #${data-footnote-id} と exact に一致する必要があります',
    );
  });

  it('footnote structural 属性が non-anchor / non-canonical link に残れば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        `${canonicalFootnoteHtml()}<span data-footnote-ref="true"></span>`,
        'testing/test',
      );
    }).toThrow('footnote structural 属性は canonical footnote ref/backref にだけ許可します');
  });

  it('canonical footnote backref に通常リンク注釈が混入すれば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        canonicalFootnoteHtml({
          item: '<p>body <a href="#fn-a-ref-1" data-footnote-backref="true" role="doc-backlink" data-link-surface="prose" aria-label="脚注参照 1 に戻る">↩︎</a></p>',
        }),
        'testing/test',
      );
    }).toThrow('脚注構造リンクに通常リンク注釈を付与してはいけません');
  });

  it('canonical footnote item 内の malformed backref-like href を build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        canonicalFootnoteHtml({
          item: '<p>body <a href="#fn-a-ref-NaN">bad</a> <a href="#fn-a-ref-1" data-footnote-backref="true" role="doc-backlink" aria-label="脚注参照 1 に戻る">↩︎</a></p>',
        }),
        'testing/test',
      );
    }).toThrow('canonical footnote item 内の malformed backref-like href は許可されません');
  });

  it('canonical footnote ol / li に ordered-list 補助属性が残れば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        canonicalFootnoteHtml({
          olAttrs: 'role="list" style="--ui-ol-counter-reset: 0"',
        }),
        'testing/test',
      );
    }).toThrow('canonical footnote ol に ordered-list 補助属性を残してはいけません');
  });

  it('footnote backref が direct paragraph 末尾以外にある場合は build error にすること', () => {
    expect(() => {
      validateNoteContentContracts(
        'reader',
        canonicalFootnoteHtml({
          item: '<blockquote><p>body <a href="#fn-a-ref-1" data-footnote-backref="true" role="doc-backlink" aria-label="脚注参照 1 に戻る">↩︎</a></p></blockquote>',
        }),
        'testing/test',
      );
    }).toThrow(
      'footnote backref は direct child paragraph 末尾または li 直下末尾に置く必要があります',
    );
  });
});

describe('injectNoteContentProfiles', () => {
  it('reader note の code-preview に reader profile を注入すること', () => {
    expect(
      injectNoteContentProfiles('<ui-code-preview heading="例"></ui-code-preview>', 'reader'),
    ).toContain('preview-profile="reader"');
  });

  it('testing note の code-preview に demo profile を注入すること', () => {
    expect(
      injectNoteContentProfiles('<ui-code-preview heading="例"></ui-code-preview>', 'testing'),
    ).toContain('preview-profile="demo"');
  });
});
