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

const findElements = (
  node: HastNode | undefined,
  predicate: (node: HastNode) => boolean,
): HastNode[] => {
  if (!node) {
    return [];
  }

  const matched = predicate(node) ? [node] : [];
  const children = node.children ?? [];
  return [...matched, ...children.flatMap((child) => findElements(child, predicate))];
};

const findElement = (
  node: HastNode | undefined,
  predicate: (node: HastNode) => boolean,
): HastNode | undefined => findElements(node, predicate)[0];

const createRawFootnoteRef = (
  refId: string,
  index: string,
  instanceSuffix = '',
): HastNode => ({
  type: 'element',
  tagName: 'sup',
  children: [
    {
      type: 'element',
      tagName: 'a',
      properties: {
        href: `#user-content-${refId}`,
        id: `user-content-${refId.replace('fn-', 'fnref-')}${instanceSuffix}`,
        dataFootnoteRef: true,
        ariaDescribedBy: 'footnote-label',
      },
      children: [{ type: 'text', value: index }],
    },
  ],
});

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
              tagName: 'h3',
              properties: { id: 'legacy-footnotes', className: ['sr-only', 'legacy-heading'] },
              children: [{ type: 'text', value: 'Footnotes' }],
            },
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

  it('脚注定義内の脚注参照も正規化済み footnote reference として保持すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          children: [
            { type: 'text', value: '本文から脚注1を参照する' },
            createRawFootnoteRef('fn-1', '1'),
          ],
        },
        {
          type: 'element',
          tagName: 'p',
          children: [
            { type: 'text', value: '本文から脚注2を参照する' },
            createRawFootnoteRef('fn-2', '2'),
          ],
        },
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
              tagName: 'h2',
              properties: { id: 'footnote-label' },
              children: [{ type: 'text', value: 'Footnotes' }],
            },
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
                      children: [{ type: 'text', value: '脚注1の本文' }],
                    },
                  ],
                },
                {
                  type: 'element',
                  tagName: 'li',
                  properties: { id: 'user-content-fn-2' },
                  children: [
                    {
                      type: 'element',
                      tagName: 'p',
                      children: [
                        { type: 'text', value: '脚注2から脚注1を参照する' },
                        createRawFootnoteRef('fn-1', '1', '-7'),
                        { type: 'text', value: ' ' },
                        {
                          type: 'element',
                          tagName: 'a',
                          properties: {
                            href: '#user-content-fnref-2',
                            dataFootnoteBackref: true,
                            ariaLabel: 'Back to content',
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

    const fn2Item = findElement(
      tree,
      (node) => node.tagName === 'li' && node.properties?.['id'] === 'fn-2',
    );

    const nestedRef = findElement(
      fn2Item,
      (node) =>
        node.tagName === 'a' &&
        node.properties?.['data-footnote-ref'] === 'true' &&
        node.properties?.['data-footnote-id'] === 'fn-1',
    );

    expect(nestedRef?.tagName).to.equal('a');
    expect(nestedRef?.properties?.['role']).to.equal('doc-noteref');
    expect(nestedRef?.properties?.['data-footnote-ref']).to.equal('true');
    expect(nestedRef?.properties?.['data-footnote-id']).to.equal('fn-1');
    expect(nestedRef?.properties?.['data-footnote-index']).to.equal('1');
    expect(nestedRef?.properties?.['data-footnote-ref-instance']).to.equal('2');
    expect(nestedRef?.properties?.['data-footnote-role']).to.equal('secondary');
    expect(nestedRef?.properties?.['data-hydration-key']).to.equal('footnote-popover-enhancer');
    expect(nestedRef?.properties?.['data-hydration-capability']).to.equal('progressive');
    expect(nestedRef?.properties?.['data-hydration-trigger']).to.equal('post-commit');

    const fn2Backrefs = findElements(
      fn2Item,
      (node) => node.tagName === 'a' && node.properties?.['role'] === 'doc-backlink',
    );

    expect(fn2Backrefs).to.have.length(1);

    const legacyBackrefs = findElements(
      fn2Item,
      (node) =>
        node.tagName === 'a' &&
        (node.properties?.['dataFootnoteBackref'] !== undefined ||
          node.properties?.['href'] === '#user-content-fnref-2' ||
          node.properties?.['ariaLabel'] === 'Back to content'),
    );

    expect(legacyBackrefs).to.have.length(0);

    const fn3FootnoteRefs = findElements(
      fn2Item,
      (node) => node.tagName === 'a' && node.properties?.['data-footnote-ref'] === 'true',
    );

    expect(fn3FootnoteRefs.length).to.be.greaterThan(0);

    const fn1Item = findElement(
      tree,
      (node) => node.tagName === 'li' && node.properties?.['id'] === 'fn-1',
    );

    const fn1Backrefs = findElements(
      fn1Item,
      (node) => node.tagName === 'a' && node.properties?.['role'] === 'doc-backlink',
    );

    expect(fn1Backrefs).to.have.length(2);

    const fn1BackrefHrefs = fn1Backrefs.map((node) => node.properties?.['href']);
    expect(fn1BackrefHrefs).to.include('#fn-1-ref-1');
    expect(fn1BackrefHrefs).to.include('#fn-1-ref-2');
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

  it('link-card を nested anchor が発生しない静的 HTML contract へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-card',
          properties: {
            'card-kind': 'link',
            href: 'https://example.com/post',
            'card-title': 'Example Post',
            description: '本文の補足',
            'site-name': 'example.com',
            'image-src': '/assets/card.png',
          },
          children: [],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const card = tree.children?.[0];
    const link = card?.children?.[0];
    const body = link?.children?.[0];
    const eyebrow = body?.children?.[0];
    const title = body?.children?.[1];
    const media = link?.children?.[1];

    expect(card?.tagName).to.equal('article');
    expect(card?.properties?.['data-link-card']).to.equal('true');
    expect(link?.tagName).to.equal('a');
    expect(link?.properties?.['className']).to.deep.equal(['link-card__link']);
    expect(link?.properties?.['data-link-surface']).to.equal('card');
    expect(link?.properties?.['data-link-kind']).to.equal('external-web');
    expect(link?.properties?.['data-external']).to.equal('true');
    expect(eyebrow?.tagName).to.equal('p');
    expect(eyebrow?.properties?.['className']).to.deep.equal(['link-card__eyebrow']);
    expect(title?.tagName).to.equal('p');
    expect(title?.properties?.['className']).to.deep.equal(['link-card__title']);
    expect(findElement(card, (node) => /^h[1-6]$/u.test(node.tagName ?? ''))).to.equal(
      undefined,
    );
    expect(media?.tagName).to.equal('img');
    expect(media?.properties?.['className']).to.deep.equal(['link-card__media']);
  });

  it('画像なし link-card に renderer 側で no-image class を付与すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-card',
          properties: {
            'card-kind': 'link',
            href: '/notes/example',
            'card-title': 'Example',
          },
          children: [],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const link = tree.children?.[0]?.children?.[0];
    expect(link?.properties?.['className']).to.deep.equal([
      'link-card__link',
      'link-card__link--no-image',
    ]);
  });

  it('invalid link-card は anchor を出力せず非リンク表示面へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-card',
          properties: {
            'card-kind': 'link',
            'card-title': 'Broken card',
          },
          children: [],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const card = tree.children?.[0];
    const invalid = card?.children?.[0];
    const title = findElement(card, (node) =>
      Array.isArray(node.properties?.['className'])
        ? node.properties['className'].includes('link-card__title')
        : false,
    );

    expect(card?.properties?.['className']).to.deep.equal(['link-card', 'link-card--invalid']);
    expect(card?.properties?.['data-link-card-invalid']).to.equal('true');
    expect(invalid?.tagName).to.equal('div');
    expect(invalid?.properties?.['className']).to.deep.equal(['link-card__invalid']);
    expect(invalid?.properties?.['role']).to.equal('note');
    expect(invalid?.properties?.['data-link-surface']).to.equal(undefined);
    expect(findElement(card, (node) => node.tagName === 'a')).to.equal(undefined);
    expect(title?.tagName).to.equal('p');
  });

  it('ui-syntax-card を静的 syntax-card root に正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-syntax-card',
          properties: {
            kind: 'Method',
            name: 'useEffect',
          },
          children: [],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const syntaxCard = findElement(tree, (node) => node.properties?.['data-syntax-card'] === 'true');

    expect(syntaxCard?.tagName).to.equal('section');
    expect(syntaxCard?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(syntaxCard?.properties?.['data-hydration-trigger']).to.equal(undefined);
    expect(findElement(tree, (node) => node.tagName === 'ui-syntax-card')).to.equal(undefined);
  });

  it('syntax-card family を全て静的 HTML に正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-syntax-card',
          properties: {
            kind: 'Method',
            name: 'useEffect',
          },
          children: [
            {
              type: 'element',
              tagName: 'ui-syntax-section',
              properties: {
                label: '概要',
              },
              children: [
                {
                  type: 'element',
                  tagName: 'ui-syntax-field',
                  properties: {
                    name: 'effect',
                  },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const card = findElement(tree, (node) => node.properties?.['data-syntax-card'] === 'true');
    const section = findElement(tree, (node) => node.properties?.['data-syntax-section'] === 'true');
    const field = findElement(tree, (node) => node.properties?.['data-syntax-field'] === 'true');

    expect(card?.tagName).to.equal('section');
    expect(section?.tagName).to.equal('section');
    expect(field?.tagName).to.equal('dl');
    expect(findElement(field, (node) => node.tagName === 'dt')?.properties?.['className']).to.deep.equal([
      'syntax-field__term',
    ]);
    expect(findElement(field, (node) => node.tagName === 'dd')?.properties?.['className']).to.deep.equal([
      'syntax-field__description',
    ]);

    expect(card?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(card?.properties?.['data-hydration-trigger']).to.equal(undefined);

    expect(section?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(section?.properties?.['data-hydration-trigger']).to.equal(undefined);

    expect(field?.properties?.['data-hydration-capability']).to.equal(undefined);
    expect(field?.properties?.['data-hydration-trigger']).to.equal(undefined);
    expect(findElement(tree, (node) => node.tagName === 'ui-syntax-card')).to.equal(undefined);
    expect(findElement(tree, (node) => node.tagName === 'ui-syntax-section')).to.equal(undefined);
    expect(findElement(tree, (node) => node.tagName === 'ui-syntax-field')).to.equal(undefined);
  });


  it('role-only の脚注参照を fallback candidate として救済しないこと', () => {
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
                    href: '#fn-a',
                    role: 'doc-noteref',
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
          properties: { role: 'doc-endnotes' },
          children: [
            {
              type: 'element',
              tagName: 'ol',
              children: [
                {
                  type: 'element',
                  tagName: 'li',
                  properties: { id: 'fn-a' },
                  children: [
                    {
                      type: 'element',
                      tagName: 'p',
                      children: [{ type: 'text', value: '脚注A' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => rehypeRouaultComponents()(tree)).to.throw(
      'role-only footnote ref marker is not allowed',
    );
  });

  it('footnote ref の final 再採番時に既存 id との衝突を拒否すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          properties: { id: 'fn-a-ref-1' },
          children: [{ type: 'text', value: '既存 id' }],
        },
        {
          type: 'element',
          tagName: 'p',
          children: [createRawFootnoteRef('fn-a', '1')],
        },
        {
          type: 'element',
          tagName: 'section',
          properties: { role: 'doc-endnotes' },
          children: [
            {
              type: 'element',
              tagName: 'ol',
              children: [
                {
                  type: 'element',
                  tagName: 'li',
                  properties: { id: 'fn-a' },
                  children: [
                    {
                      type: 'element',
                      tagName: 'p',
                      children: [{ type: 'text', value: '脚注A' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => rehypeRouaultComponents()(tree)).to.throw(
      'footnote ref id "fn-a-ref-1" already exists',
    );
  });

  it('camelCase の既存 structural 属性が canonical 値と矛盾する場合は拒否すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          children: [
            {
              type: 'element',
              tagName: 'a',
              properties: {
                href: '#fn-a',
                dataFootnoteRef: 'true',
                dataFootnoteIndex: '99',
              },
              children: [{ type: 'text', value: '1' }],
            },
          ],
        },
        {
          type: 'element',
          tagName: 'section',
          properties: { role: 'doc-endnotes' },
          children: [
            {
              type: 'element',
              tagName: 'ol',
              children: [
                {
                  type: 'element',
                  tagName: 'li',
                  properties: { id: 'fn-a' },
                  children: [
                    {
                      type: 'element',
                      tagName: 'p',
                      children: [{ type: 'text', value: '脚注A' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => rehypeRouaultComponents()(tree)).to.throw(
      'footnote reference dataFootnoteIndex conflicts with canonical value',
    );
  });

});
