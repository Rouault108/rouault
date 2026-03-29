import { describe, expect, it } from 'vitest';
import { rehypeRouaultComponents } from '../../lib/rehype/rouault-components.js';

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

  it('table を ui-table にラップし、caption から aria-label を補完すること', () => {
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
    expect(first?.tagName).to.equal('ui-table');
    expect(first?.properties?.['aria-label']).to.equal('売上データ');
    expect(first?.children?.[0]?.tagName).to.equal('table');
  });

  it('blockquote と hr を ui コンポーネントへ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'blockquote',
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

    expect(quote?.tagName).to.equal('ui-blockquote');
    expect(divider?.tagName).to.equal('ui-divider');
    expect(divider?.children?.[0]?.tagName).to.equal('hr');
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
    expect(checkbox?.properties?.['checked']).to.equal(true);
    expect(checkbox?.properties?.['disabled']).to.equal(true);
    expect(checkbox?.properties?.['label']).to.equal('タスクA');
  });

  it('mark を ui-highlight へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'mark',
          properties: { 'data-current-match': true },
          children: [{ type: 'text', value: 'hit' }],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const highlight = tree.children?.[0];
    expect(highlight?.tagName).to.equal('ui-highlight');
    expect(highlight?.properties?.['current-match']).to.equal(true);
    expect(highlight?.children?.[0]?.value).to.equal('hit');
  });

  it('img と figure/figcaption を ui-image に正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'img',
          properties: {
            src: 'content/_assets/testing/test-hero.jpg',
            alt: 'sample',
            title: 'タイトル',
            loading: 'eager',
            zoomable: 'false',
            width: '800',
            height: 600,
          },
          children: [],
        },
        {
          type: 'element',
          tagName: 'figure',
          children: [
            {
              type: 'element',
              tagName: 'img',
              properties: { src: 'content/_assets/testing/test-card.jpg', alt: 'figure' },
              children: [],
            },
            {
              type: 'element',
              tagName: 'figcaption',
              children: [{ type: 'text', value: '図の説明' }],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const first = tree.children?.[0];
    const second = tree.children?.[1];
    expect(first?.tagName).to.equal('ui-image');
    expect(first?.properties?.['caption']).to.equal('タイトル');
    expect(first?.properties?.['zoomable']).to.equal('false');
    expect(first?.properties?.['src']).to.equal('/content-assets/testing/test-hero.jpg');
    expect(first?.properties?.['lightbox-src']).to.equal('/content-assets/testing/test-hero.jpg');
    expect(first?.properties?.['sources']).to.equal(undefined);
    expect(first?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(first?.properties?.['data-hydration-trigger']).to.equal(undefined);
    expect(second?.tagName).to.equal('ui-image');
    expect(second?.properties?.['src']).to.equal('/content-assets/testing/test-card.jpg');
    expect(second?.properties?.['caption']).to.equal('図の説明');
    expect(second?.properties?.['data-hydration-capability']).to.equal('progressive');
    expect(second?.properties?.['data-hydration-trigger']).to.equal('visible');
  });

  it('2枚目以降の eager 本文画像はエラーにすること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'img',
          properties: {
            src: 'content/_assets/testing/test-hero.jpg',
            alt: 'one',
            loading: 'eager',
          },
          children: [],
        },
        {
          type: 'element',
          tagName: 'img',
          properties: {
            src: 'content/_assets/testing/test-card.jpg',
            alt: 'two',
            loading: 'eager',
          },
          children: [],
        },
      ],
    };

    const run = () => rehypeRouaultComponents()(tree, { path: 'content/testing/test.md' });

    expect(run).to.throw('[markdown] content/testing/test.md: 本文画像で loading="eager" を許可できるのは LCP 候補 1 枚だけです');
  });

  it('GFM脚注を ui-footnote へ変換し、backref を正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          children: [
            {
              type: 'element',
              tagName: 'sup',
              children: [
                {
                  type: 'element',
                  tagName: 'a',
                  properties: {
                    href: '#user-content-fn-1',
                    dataFootnoteRef: true,
                  },
                  children: [{ type: 'text', value: '1' }],
                },
              ],
            },
          ],
        },
        {
          type: 'element',
          tagName: 'p',
          children: [
            {
              type: 'element',
              tagName: 'sup',
              children: [
                {
                  type: 'element',
                  tagName: 'a',
                  properties: {
                    href: '#user-content-fn-1',
                    dataFootnoteRef: true,
                  },
                  children: [{ type: 'text', value: '1' }],
                },
              ],
            },
          ],
        },
        {
          type: 'element',
          tagName: 'section',
          properties: { className: ['footnotes'], dataFootnotes: true },
          children: [
            {
              type: 'element',
              tagName: 'ol',
              children: [
                {
                  type: 'element',
                  tagName: 'li',
                  properties: { id: 'user-content-fn-1' },
                  children: [
                    {
                      type: 'element',
                      tagName: 'p',
                      children: [
                        { type: 'text', value: '脚注本文 ' },
                        {
                          type: 'element',
                          tagName: 'a',
                          properties: {
                            href: '#user-content-fnref-1',
                            dataFootnoteBackref: true,
                            className: ['data-footnote-backref'],
                          },
                          children: [{ type: 'text', value: '↩' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const firstRef = tree.children?.[0]?.children?.[0];
    const secondRef = tree.children?.[1]?.children?.[0];
    const section = tree.children?.[2];
    const listItem = section?.children?.[0]?.children?.[0];
    const backref = listItem?.children?.[2];

    expect(firstRef?.tagName).to.equal('ui-footnote');
    expect(firstRef?.properties?.['ref-id']).to.equal('fn-1');
    expect(firstRef?.properties?.['index']).to.equal('1');
    expect(firstRef?.properties?.['ref-instance']).to.equal('1');
    expect(firstRef?.children?.[0]?.tagName).to.equal('p');
    expect(firstRef?.children?.[0]?.children?.[0]?.value).to.equal('脚注本文 ');

    expect(secondRef?.tagName).to.equal('ui-footnote');
    expect(secondRef?.properties?.['shared']).to.equal(true);
    expect(secondRef?.properties?.['ref-instance']).to.equal('2');
    expect(secondRef?.children).to.deep.equal([]);

    expect(section?.properties?.['role']).to.equal('doc-endnotes');
    expect(listItem?.properties?.['id']).to.equal('fn-1');
    expect(backref?.properties?.['href']).to.equal('#fn-1-ref-1');
  });
});
