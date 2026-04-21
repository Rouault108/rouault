import { describe, expect, it } from 'vitest';
import {
  normalizeRouaultStaticSurfaceHtml,
  rehypeRouaultComponents,
} from '../../build/rehype/rouault-components.js';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

describe('rehypeRouaultComponents', () => {
  it('静的 code block はそのまま維持すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {
            'data-code-block': true,
            'data-code-language': 'ts',
          },
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {
                className: ['language-ts'],
                'data-lang': 'ts',
              },
              children: [{ type: 'text', value: 'const n = 1;' }],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const first = tree.children?.[0];
    expect(first?.tagName).to.equal('pre');
    expect(first?.properties?.['data-code-block']).to.equal(true);
    expect(first?.properties?.['data-code-language']).to.equal('ts');
    expect(first?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(first?.properties?.['data-hydration-trigger']).to.equal(undefined);
    expect(first?.children?.[0]?.tagName).to.equal('code');
  });

  it('table を static table root に変換し、caption から aria-label を補完すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'table',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'caption',
              children: [{ type: 'text', value: '売上データ' }],
            },
            {
              type: 'element',
              tagName: 'tbody',
              children: [],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const first = tree.children?.[0];
    expect(first?.tagName).to.equal('div');
    expect(first?.properties?.['data-table-root']).to.equal('true');
    expect(first?.properties?.['role']).to.equal('region');
    expect(first?.properties?.['tabindex']).to.equal('0');
    expect(first?.properties?.['aria-label']).to.equal('売上データ');
    expect(first?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(first?.properties?.['data-hydration-trigger']).to.equal(undefined);
    expect(first?.children?.[0]?.tagName).to.equal('table');
  });

  it('legacy blockquote と divider を静的本文要素へ正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-blockquote',
          properties: { source: '出典', cite: 'https://example.com' },
          children: [{ type: 'element', tagName: 'p', children: [{ type: 'text', value: 'q' }] }],
        },
        {
          type: 'element',
          tagName: 'hr',
          children: [],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const quote = tree.children?.[0];
    const divider = tree.children?.[1];

    expect(quote?.tagName).to.equal('figure');
    expect(quote?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(quote?.properties?.['data-hydration-trigger']).to.equal(undefined);
    expect(quote?.children?.[0]?.tagName).to.equal('blockquote');
    expect(quote?.children?.[1]?.tagName).to.equal('figcaption');

    expect(divider?.tagName).to.equal('hr');
    expect(divider?.properties?.['data-divider-variant']).to.equal('section');
    expect(divider?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(divider?.properties?.['data-hydration-trigger']).to.equal(undefined);
    expect(divider?.children?.length ?? 0).to.equal(0);
  });

  it('static callout / info-box root を最終 DOM に正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'aside',
          properties: {
            'data-callout': 'true',
            'data-callout-kind': 'warning',
            'data-callout-heading': '注意',
          },
          children: [
            { type: 'element', tagName: 'p', children: [{ type: 'text', value: '本文' }] },
          ],
        },
        {
          type: 'element',
          tagName: 'section',
          properties: {
            'data-info-box': 'true',
            'data-info-box-heading': '作品情報',
            'data-info-box-heading-level': '3',
            'data-info-box-landmark': 'true',
            'data-variant': 'filled',
            'data-density': 'compact',
          },
          children: [
            { type: 'element', tagName: 'p', children: [{ type: 'text', value: '内容' }] },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const callout = tree.children?.[0];
    const infoBox = tree.children?.[1];

    expect(callout?.tagName).to.equal('aside');
    expect(callout?.properties?.['data-callout']).to.equal('true');
    expect(callout?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(callout?.properties?.['data-hydration-trigger']).to.equal(undefined);
    expect(callout?.children?.some((child) => child.tagName === 'div')).to.equal(true);

    expect(infoBox?.tagName).to.equal('section');
    expect(infoBox?.properties?.['data-info-box']).to.equal('true');
    expect(infoBox?.properties?.['role']).to.equal('region');
    expect(infoBox?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(infoBox?.properties?.['data-hydration-trigger']).to.equal(undefined);
    expect(infoBox?.children?.every((child) => child.tagName === 'div')).to.equal(true);
  });

  it('footnotes section heading を脚注へ正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'section',
          properties: {
            className: ['footnotes'],
            'data-footnotes': 'true',
          },
          children: [
            {
              type: 'element',
              tagName: 'ol',
              children: [
                {
                  type: 'element',
                  tagName: 'li',
                  properties: { id: 'fn-1' },
                  children: [
                    {
                      type: 'element',
                      tagName: 'p',
                      children: [{ type: 'text', value: '脚注本文' }],
                    },
                  ],
                },
              ],
            },
            {
              type: 'element',
              tagName: 'h3',
              properties: { id: 'legacy-footnotes', className: ['sr-only', 'legacy-heading'] },
              children: [{ type: 'text', value: 'Footnotes' }],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const section = tree.children?.[0];
    const heading = section?.children?.[0];

    expect(section?.tagName).to.equal('section');
    expect(section?.properties?.['role']).to.equal('doc-endnotes');
    expect(heading?.tagName).to.equal('h2');
    expect(heading?.properties?.['id']).to.equal('footnote-label');
    expect(heading?.properties?.['className']).to.deep.equal(['legacy-heading']);
    expect(heading?.children?.[0]?.value).to.equal('脚注');
    expect(section?.children?.[1]?.tagName).to.equal('ol');
  });

  it('footnotes section heading が無ければ直下先頭へ h2#footnote-label を挿入すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'section',
          properties: {
            className: ['footnotes'],
            'data-footnotes': 'true',
          },
          children: [
            {
              type: 'element',
              tagName: 'ol',
              children: [],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const section = tree.children?.[0];
    const heading = section?.children?.[0];

    expect(section?.properties?.['role']).to.equal('doc-endnotes');
    expect(heading?.tagName).to.equal('h2');
    expect(heading?.properties?.['id']).to.equal('footnote-label');
    expect(heading?.properties?.['className']).to.equal(undefined);
    expect(heading?.children?.[0]?.value).to.equal('脚注');
  });

  it('HTML 断片を保存前 surface HTML に正規化できること', () => {
    const html = `
      <aside data-callout="true" data-callout-kind="warning" data-callout-heading="注意">
        <p>本文</p>
      </aside>
      <section
        data-info-box="true"
        data-info-box-heading="作品情報"
        data-info-box-heading-level="3"
        data-info-box-landmark="true"
        data-variant="filled"
        data-density="compact"
      >
        <p>内容</p>
      </section>
    `;

    const normalized = normalizeRouaultStaticSurfaceHtml(html) ?? '';

    expect(normalized).toContain('data-callout-content="true"');
    expect(normalized).toContain('data-callout-body="true"');
    expect(normalized).toContain('data-info-box-body="true"');
    expect(normalized).toContain('data-info-box-header="true"');
  });

  it('保存前 surface HTML 正規化が冪等であること', () => {
    const html = `
      <aside data-callout="true" data-callout-kind="tip" data-callout-heading="補助情報">
        <p>本文</p>
      </aside>
      <section
        data-info-box="true"
        data-info-box-heading="作品情報"
        data-info-box-heading-level="3"
        data-info-box-landmark="true"
        data-variant="filled"
        data-density="compact"
      >
        <p>内容</p>
      </section>
    `;

    const once = normalizeRouaultStaticSurfaceHtml(html) ?? '';
    const twice = normalizeRouaultStaticSurfaceHtml(once) ?? '';

    expect(twice).toBe(once);
  });

  it('保存前 surface HTML 正規化は既存の static image を再解決しないこと', () => {
    const html = `
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
        <picture>
          <img src="/static/example.png" alt="example image">
        </picture>
      </figure>
    `;

    const normalized = normalizeRouaultStaticSurfaceHtml(html) ?? '';

    expect(normalized).toContain('data-image="true"');
    expect(normalized).toContain('/static/example.png');
    expect(normalized).not.toContain('content/_assets');
    expect(normalized).not.toContain('examples/media');
  });

  it('mark を static highlight root に正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'mark',
          properties: {
            'current-match': '',
          },
          children: [{ type: 'text', value: '検索語' }],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const first = tree.children?.[0];
    expect(first?.tagName).to.equal('mark');
    expect(first?.properties?.['data-current-match']).to.equal('true');
    expect(first?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(first?.properties?.['data-hydration-trigger']).to.equal(undefined);
  });

  it('code を含まない pre は変換しないこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [{ type: 'text', value: 'plain pre' }],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const first = tree.children?.[0];
    expect(first?.tagName).to.equal('pre');
  });

  it('task list の input[type=checkbox] を ui-checkbox へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ul',
          children: [
            {
              type: 'element',
              tagName: 'li',
              properties: { className: ['task-list-item'] },
              children: [
                {
                  type: 'element',
                  tagName: 'input',
                  properties: { type: 'checkbox', checked: true, disabled: true },
                  children: [],
                },
                { type: 'text', value: ' タスクA ' },
              ],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const listItem = tree.children?.[0]?.children?.[0];
    const checkbox = listItem?.children?.[0];
    expect(checkbox?.tagName).to.equal('ui-checkbox');
  });
});
