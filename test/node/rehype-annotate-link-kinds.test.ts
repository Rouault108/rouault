import { describe, expect, it } from 'vitest';
import { rehypeAnnotateLinkKinds } from '../../build/rehype/annotate-link-kinds.js';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

describe('rehypeAnnotateLinkKinds', () => {
  it('本文リンクへ data-link-kind と data-link-surface を付与すること', () => {
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
              properties: { href: '/notes/example' },
              children: [],
            },
            {
              type: 'element',
              tagName: 'a',
              properties: { href: 'https://example.com' },
              children: [],
            },
            {
              type: 'element',
              tagName: 'a',
              properties: { href: 'mailto:hello@example.com' },
              children: [],
            },
          ],
        },
      ],
    };

    rehypeAnnotateLinkKinds()(tree);

    const paragraph = tree.children?.[0];
    const internalLink = paragraph?.children?.[0];
    const externalWebLink = paragraph?.children?.[1];
    const externalActionLink = paragraph?.children?.[2];

    expect(internalLink?.properties?.['data-link-kind']).to.equal('internal-document');
    expect(internalLink?.properties?.['data-link-surface']).to.equal('prose');
    expect(internalLink?.properties?.['data-external']).to.equal(undefined);

    expect(externalWebLink?.properties?.['data-link-kind']).to.equal('external-web');
    expect(externalWebLink?.properties?.['data-link-surface']).to.equal('prose');
    expect(externalWebLink?.properties?.['data-external']).to.equal('true');

    expect(externalActionLink?.properties?.['data-link-kind']).to.equal('external-action');
    expect(externalActionLink?.properties?.['data-link-surface']).to.equal('prose');
    expect(externalActionLink?.properties?.['data-external']).to.equal('true');
  });

  it('heading-anchor には注釈しないこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: {
            href: '#heading',
            className: ['heading-anchor'],
          },
          children: [],
        },
      ],
    };

    rehypeAnnotateLinkKinds()(tree);

    const anchor = tree.children?.[0];
    expect(anchor?.properties?.['data-link-kind']).to.equal(undefined);
    expect(anchor?.properties?.['data-link-surface']).to.equal(undefined);
    expect(anchor?.properties?.['data-external']).to.equal(undefined);
  });
});