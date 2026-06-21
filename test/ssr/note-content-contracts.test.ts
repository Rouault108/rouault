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

const standaloneCodeBlockHtml = (
  overrides: {
    targetId?: string;
    describedBy?: string;
    statusId?: string;
    sourceTag?: string;
  } = {},
): string => {
  const sourceTag =
    overrides.sourceTag ??
    '<template id="code-source" data-code-copy-source>const value = 1;</template>';
  const targetId = overrides.targetId ?? 'code-source';
  const describedBy = overrides.describedBy ?? 'code-source-copy-status';
  const statusId = overrides.statusId ?? 'code-source-copy-status';

  return `
    <figure data-code-block-root="true" data-code-block-id="code-block-1">
      <div class="code-surface-caption">
        <div class="code-surface-copy-button-shell">
          <span class="static-copy-control" data-copy-control="true">
            <button
              type="button"
              data-copy-button="true"
              data-copy-target-id="${targetId}"
              aria-describedby="${describedBy}"
            >copy</button>
            <span id="${statusId}" data-copy-status="true" role="status" aria-live="polite"></span>
          </span>
        </div>
      </div>
      ${sourceTag}
      <pre data-code-block="true"><code>const value = 1;</code></pre>
    </figure>
  `;
};

const codeGroupHtml = (
  overrides: {
    panelAttrs?: string;
    tabAttrs?: string;
    groupCopyTargetId?: string;
    groupCopyStatusId?: string;
    groupCopyButtonAttrs?: string;
    panelLabelHtml?: string;
    beforeGroupHtml?: string;
    afterGroupHtml?: string;
  } = {},
): string => `
  ${overrides.beforeGroupHtml ?? ''}
  <section data-code-group="true" data-code-group-id="group-1" data-code-group-label="比較">
    <div class="code-group-header" data-code-group-controls="true">
      <div class="code-group-tablist">
        <button
          type="button"
          data-code-group-tab="true"
          data-code-group-key="valid"
          data-code-group-panel-id="panel-valid"
          ${overrides.tabAttrs ?? ''}
        >正しい例</button>
      </div>
      <div class="code-group-header-tools">
        <span class="static-copy-control" data-copy-control="true">
          <button
            type="button"
            data-copy-button="true"
            data-code-group-copy="true"
            data-copy-target-id="${overrides.groupCopyTargetId ?? 'panel-source'}"
            aria-describedby="${overrides.groupCopyStatusId ?? 'panel-source-copy-status'}"
            ${overrides.groupCopyButtonAttrs ?? ''}
          >copy</button>
          <span id="panel-source-copy-status" data-copy-status="true" role="status" aria-live="polite"></span>
        </span>
      </div>
    </div>
    <section
      id="panel-valid"
      data-code-group-panel="valid"
      data-code-group-panel-label="正しい例"
      data-code-copy-source-id="panel-source"
      ${overrides.panelAttrs ?? ''}
    >
      <template id="panel-source" data-code-copy-source>const valid = true;</template>
      ${overrides.panelLabelHtml ?? '<p class="code-group-stack-label">正しい例</p>'}
      <figure data-code-block-root="true" data-code-block-id="code-block-1" data-code-group-owned="true">
        <template id="owned-source" data-code-copy-source>const valid = true;</template>
        <pre data-code-block="true"><code>const valid = true;</code></pre>
      </figure>
    </section>
  </section>
  ${overrides.afterGroupHtml ?? ''}
`;

describe('validateNoteContentContracts', () => {
  it('reader note の preview-sandbox を build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: '<ui-code-preview><ui-preview-sandbox slot="preview"></ui-preview-sandbox></ui-code-preview>',
        sourceLabel: 'testing/test',
      });
    }).toThrow('[note-content:testing/test] reader note では preview-sandbox を使用できません');
  });

  it('reader note の code-preview controls と toolbar を build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: '<ui-code-preview controls="viewport"><button slot="toolbar">Open</button></ui-code-preview>',
        sourceLabel: 'testing/test',
      });
    }).toThrow(
      '[note-content:testing/test] reader note の code-preview では controls を使用できません',
    );
  });

  it('testing note の sandbox と controls は許可すること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'testing',
        html: '<ui-code-preview controls="viewport"><ui-preview-sandbox slot="preview"></ui-preview-sandbox></ui-code-preview>',
        sourceLabel: 'testing/test',
        testingArea: 'sandbox',
      });
    }).not.toThrow();
  });

  it('testing/sandbox 以外の preview-sandbox を build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'testing',
        html: '<ui-code-preview><ui-preview-sandbox slot="preview" allow-js="true"></ui-preview-sandbox></ui-code-preview>',
        sourceLabel: 'testing/interactive',
        testingArea: 'interactive',
      });
    }).toThrow(
      '[note-content:testing/interactive] testing/sandbox 以外では preview-sandbox を使用できません',
    );
  });

  it('static-first 化した legacy ui-* が note 最終 HTML に残っていれば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: '<ui-callout kind="tip"><p>legacy</p></ui-callout>',
        sourceLabel: 'testing/test',
      });
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
          <span class="image-zoom-trigger__icon static-icon" aria-hidden="true"><svg></svg></span>
          <span class="sr-only">画像を拡大して表示</span>
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
      <template id="copy-source" data-code-copy-source>const value = 1;</template>
    `;

    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: html,
        sourceLabel: 'testing/test',
      });
    }).not.toThrow();
  });

  it('template 以外の data-code-copy-source を note final HTML で拒否すること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: '<pre data-code-copy-source="const value = 1;">const value = 1;</pre>',
        sourceLabel: 'testing/test',
      });
    }).toThrow('template 以外の [data-code-copy-source] は note 最終 HTML に残してはいけません');
  });

  it('standalone code block の final HTML schema と copy 参照整合を受け入れること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: standaloneCodeBlockHtml(),
        sourceLabel: 'testing/code-block',
      });
    }).not.toThrow();
  });

  it('copy button の data-copy-target-id が copy source を指さなければ build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: standaloneCodeBlockHtml({ targetId: 'missing-source' }),
        sourceLabel: 'testing/code-block',
      });
    }).toThrow(
      '[note-content:testing/code-block] copy button の data-copy-target-id="missing-source" は template[data-code-copy-source] を指す必要があります',
    );
  });

  it('copy button の aria-describedby が copy status を指さなければ build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: standaloneCodeBlockHtml({ describedBy: 'missing-status' }),
        sourceLabel: 'testing/code-block',
      });
    }).toThrow(
      '[note-content:testing/code-block] copy button[data-copy-target-id="code-source"] の aria-describedby="missing-status" は [data-copy-status] を指す必要があります',
    );
  });

  it('code group の SSR stack final HTML schema を受け入れること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: codeGroupHtml(),
        sourceLabel: 'testing/code-group',
      });
    }).not.toThrow();
  });

  it('code group panel が SSR 時点で hidden なら build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: codeGroupHtml({ panelAttrs: 'hidden' }),
        sourceLabel: 'testing/code-group',
      });
    }).toThrow(
      '[note-content:testing/code-group] [data-code-group-id="group-1"] の #panel-valid は SSR 時点で hidden / aria-hidden / inert にしてはいけません',
    );
  });

  it('code group panel が SSR 時点で aria-hidden または inert なら build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: codeGroupHtml({ panelAttrs: 'aria-hidden="true"' }),
        sourceLabel: 'testing/code-group',
      });
    }).toThrow('SSR 時点で hidden / aria-hidden / inert にしてはいけません');

    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: codeGroupHtml({ panelAttrs: 'inert' }),
        sourceLabel: 'testing/code-group',
      });
    }).toThrow('SSR 時点で hidden / aria-hidden / inert にしてはいけません');
  });

  it('code group panel の visible label / heading が無ければ build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: codeGroupHtml({ panelLabelHtml: '' }),
        sourceLabel: 'testing/code-group',
      });
    }).toThrow(
      '[note-content:testing/code-group] [data-code-group-id="group-1"] の #panel-valid には識別可能な label / heading が必要です',
    );
  });

  it('code group の group copy button が group 外の copy source を指せば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: codeGroupHtml({
          groupCopyTargetId: 'external-source',
          beforeGroupHtml:
            '<template id="external-source" data-code-copy-source>const external = true;</template>',
        }),
        sourceLabel: 'testing/code-group',
      });
    }).toThrow(
      '[note-content:testing/code-group] [data-code-group-id="group-1"] の group copy button は同じ code group 内の panel copy source を指す必要があります',
    );
  });

  it('code group の group copy status が group 内になければ build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: codeGroupHtml({
          groupCopyStatusId: 'external-status',
          afterGroupHtml: '<span id="external-status" data-copy-status="true"></span>',
        }),
        sourceLabel: 'testing/code-group',
      });
    }).toThrow(
      '[note-content:testing/code-group] [data-code-group-id="group-1"] の group copy status は同じ code group 内に存在する必要があります',
    );
  });

  it('code group に SSR tab semantics が混入すれば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: codeGroupHtml({ tabAttrs: 'role="tab" aria-selected="true"' }),
        sourceLabel: 'testing/code-group',
      });
    }).toThrow(
      '[note-content:testing/code-group] [data-code-group-id="group-1"] の SSR code group は tab ARIA semantics を持ってはいけません',
    );
  });

  it('中間 source marker を note final HTML で拒否すること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: '<section data-syntax-card-source="true"></section>',
        sourceLabel: 'testing/test',
      });
    }).toThrow('data-syntax-card-source は note 最終 HTML に残してはいけません');
  });

  it('table root contract が崩れていれば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: '<div data-table-root="true"><table></table></div>',
        sourceLabel: 'testing/test',
      });
    }).toThrow('[note-content:testing/test] [data-table-root] には role="region" が必要です');
  });

  it('zoomable image に enhancer key が無ければ build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: [
          '<figure data-image="true" data-image-zoomable="true">',
          '<button type="button" data-image-zoom-trigger="true">拡大</button>',
          '<img src="/static/example.png" alt="example image">',
          '</figure>',
        ].join(''),
        sourceLabel: 'testing/test',
      });
    }).toThrow(
      '[note-content:testing/test] zoomable な figure[data-image] には data-hydration-key="image-lightbox-enhancer" が必要です',
    );
  });

  it('footnote ref に doc-endnotes が無ければ build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: [
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
        sourceLabel: 'testing/test',
      });
    }).toThrow(
      '[note-content:testing/test] [data-footnote-ref] を含む note には section[role="doc-endnotes"] が必要です',
    );
  });

  it('canonical footnote ref の href は canonical fragment と exact に一致する必要があること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: canonicalFootnoteHtml().replace('href="#fn-a"', 'href="#user-content-fn-a"'),
        sourceLabel: 'testing/test',
      });
    }).toThrow(
      'canonical footnote ref の href は #${data-footnote-id} と exact に一致する必要があります',
    );
  });

  it('footnote structural 属性が non-anchor / non-canonical link に残れば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: `${canonicalFootnoteHtml()}<span data-footnote-ref="true"></span>`,
        sourceLabel: 'testing/test',
      });
    }).toThrow('footnote structural 属性は canonical footnote ref/backref にだけ許可します');
  });

  it('canonical footnote backref に通常リンク注釈が混入すれば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: canonicalFootnoteHtml({
          item: '<p>body <a href="#fn-a-ref-1" data-footnote-backref="true" role="doc-backlink" data-link-surface="prose" aria-label="脚注参照 1 に戻る">↩︎</a></p>',
        }),
        sourceLabel: 'testing/test',
      });
    }).toThrow('脚注構造リンクに通常リンク注釈を付与してはいけません');
  });

  it('canonical footnote item 内の malformed backref-like href を build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: canonicalFootnoteHtml({
          item: '<p>body <a href="#fn-a-ref-NaN">bad</a> <a href="#fn-a-ref-1" data-footnote-backref="true" role="doc-backlink" aria-label="脚注参照 1 に戻る">↩︎</a></p>',
        }),
        sourceLabel: 'testing/test',
      });
    }).toThrow('canonical footnote item 内の malformed backref-like href は許可されません');
  });

  it('canonical footnote ol / li に ordered-list 補助属性が残れば build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: canonicalFootnoteHtml({
          olAttrs: 'role="list" style="--ui-ol-counter-reset: 0"',
        }),
        sourceLabel: 'testing/test',
      });
    }).toThrow('canonical footnote ol に ordered-list 補助属性を残してはいけません');
  });

  it('footnote backref が direct paragraph 末尾以外にある場合は build error にすること', () => {
    expect(() => {
      validateNoteContentContracts({
        kind: 'reader',
        html: canonicalFootnoteHtml({
          item: '<blockquote><p>body <a href="#fn-a-ref-1" data-footnote-backref="true" role="doc-backlink" aria-label="脚注参照 1 に戻る">↩︎</a></p></blockquote>',
        }),
        sourceLabel: 'testing/test',
      });
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
