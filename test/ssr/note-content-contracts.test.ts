import { describe, expect, it } from 'vitest';

import {
  injectNoteContentProfiles,
  validateNoteContentContracts,
} from '../../build/content/note-content-contracts.js';

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
    }).toThrow('[note-content:testing/test] reader note の code-preview では controls を使用できません');
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
    }).toThrow('[note-content:testing/interactive] testing/sandbox 以外では preview-sandbox を使用できません');
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
          data-footnote-ref="true"
          data-footnote-id="fn-1"
          data-footnote-ref-instance="1"
          data-hydration-key="footnote-popover-enhancer"
        ><sup>1</sup></a>
      </p>
      <section role="doc-endnotes">
        <ol>
          <li id="fn-1">body <a href="#fn-1-ref-1" data-footnote-backref role="doc-backlink">↩︎</a></li>
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
          ' data-footnote-ref="true"',
          ' data-footnote-id="fn-1"',
          ' data-footnote-ref-instance="1"',
          ' data-hydration-key="footnote-popover-enhancer"',
          '><sup>1</sup></a>',
          '</p>',
        ].join(''),
        'testing/test',
      );
    }).toThrow(
      '[note-content:testing/test] [data-footnote-ref] を含む note には section[role="doc-endnotes"] が必要です',
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