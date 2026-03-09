import { expect } from '@open-wc/testing';
import { rehypeRouaultComponents } from '../../lib/rehype/rouault-components.js';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

describe('rehypeRouaultComponents', () => {
  it('pre>code を ui-code-block に変換し、lang を推論すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: { className: ['language-ts'] },
              children: [{ type: 'text', value: 'const n = 1;' }],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const first = tree.children?.[0];
    expect(first?.tagName).to.equal('ui-code-block');
    expect(first?.properties?.['lang']).to.equal('ts');
    expect(first?.children?.[0]?.tagName).to.equal('pre');
    expect(first?.children?.[0]?.children?.[0]?.tagName).to.equal('code');
  });

  it('code のメタ属性を ui-code-block ホストへ昇格すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {
                className: ['language-ts'],
                filename: 'sample.ts',
                label: '正解例',
                intent: 'valid',
              },
              children: [{ type: 'text', value: 'const sample = 1;' }],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const block = tree.children?.[0];
    const code = block?.children?.[0]?.children?.[0];
    expect(block?.tagName).to.equal('ui-code-block');
    expect(block?.properties?.['filename']).to.equal('sample.ts');
    expect(block?.properties?.['label']).to.equal('正解例');
    expect(block?.properties?.['intent']).to.equal('valid');
    expect(code?.properties?.['filename']).to.equal(undefined);
    expect(code?.properties?.['label']).to.equal(undefined);
    expect(code?.properties?.['intent']).to.equal(undefined);
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

  it('mark を ui-search-highlight へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'mark',
          properties: { 'data-origin': 'user', 'data-current': true },
          children: [{ type: 'text', value: 'hit' }],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const highlight = tree.children?.[0];
    expect(highlight?.tagName).to.equal('ui-search-highlight');
    expect(highlight?.properties?.['origin']).to.equal('user');
    expect(highlight?.properties?.['current']).to.equal(true);
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
            src: '/assets/images/sample.jpg',
            alt: 'sample',
            title: 'タイトル',
            loading: 'eager',
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
              properties: { src: '/assets/images/figure.jpg', alt: 'figure' },
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
    expect(first?.properties?.['width']).to.equal(800);
    expect(first?.properties?.['height']).to.equal(600);
    expect(second?.tagName).to.equal('ui-image');
    expect(second?.properties?.['src']).to.equal('/assets/images/figure.jpg');
    expect(second?.properties?.['caption']).to.equal('図の説明');
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
    const backref = listItem?.children?.[0]?.children?.[1];

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
    expect(backref?.properties?.['href']).to.equal('#fnref-1-1');
  });
});
