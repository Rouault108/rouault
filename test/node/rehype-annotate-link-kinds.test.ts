import { describe, expect, it } from 'vitest';
import { rehypeAnnotateLinkKinds } from '../../build/rehype/annotate-link-kinds.js';
import { createManifestLoadedRouteClassificationMode } from '../../shared/link/link-annotation.js';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const annotate = () =>
  rehypeAnnotateLinkKinds({
    siteUrlContext: { siteOrigin: 'https://rouault.invalid', basePath: '' },
    currentUrl: 'https://rouault.invalid/notes/current/',
    routeClassificationMode: createManifestLoadedRouteClassificationMode({
      isInternalDocumentPathname: (pathname) =>
        pathname === '/notes/example' || pathname === '/notes/current',
    }),
  });

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

    annotate()(tree);

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
    expect(externalActionLink?.properties?.['data-external']).to.equal(undefined);
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

    annotate()(tree);

    const anchor = tree.children?.[0];
    expect(anchor?.properties?.['data-link-kind']).to.equal('internal-fragment');
    expect(anchor?.properties?.['data-link-surface']).to.equal('structural');
    expect(anchor?.properties?.['data-external']).to.equal(undefined);
  });

  it('canonical footnote ref/backref には通常リンク注釈を付与しないこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: {
            id: 'fn-a-ref-1',
            href: '#fn-a',
            role: 'doc-noteref',
            'data-footnote-ref': 'true',
            'data-link-kind': 'internal-fragment',
            datalinksuface: 'prose',
          },
          children: [],
        },
        {
          type: 'element',
          tagName: 'section',
          properties: { role: 'doc-endnotes' },
          children: [
            {
              type: 'element',
              tagName: 'h2',
              properties: { id: 'footnote-label' },
              children: [],
            },
            {
              type: 'element',
              tagName: 'ol',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'li',
                  properties: { id: 'fn-a' },
                  children: [
                    {
                      type: 'element',
                      tagName: 'p',
                      properties: {},
                      children: [
                        {
                          type: 'element',
                          tagName: 'a',
                          properties: {
                            href: '#fn-a-ref-1',
                            role: 'doc-backlink',
                            'data-footnote-backref': 'true',
                            'data-link-surface': 'prose',
                          },
                          children: [],
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

    annotate()(tree);

    const ref = tree.children?.[0];
    const backref = tree.children?.[1]?.children?.[1]?.children?.[0]?.children?.[0]?.children?.[0];
    expect(ref?.properties?.['data-link-kind']).to.equal(undefined);
    expect(ref?.properties?.['datalinksuface']).to.equal(undefined);
    expect(backref?.properties?.['data-link-surface']).to.equal(undefined);
  });

  it('通常 ol 内の backref 風 fragment link は構造リンク扱いしないこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ol',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'li',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'a',
                  properties: { href: '#fn-a-ref-1' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    };

    annotate()(tree);

    const anchor = tree.children?.[0]?.children?.[0]?.children?.[0];
    expect(anchor?.properties?.['data-link-kind']).to.equal('internal-fragment');
    expect(anchor?.properties?.['data-link-surface']).to.equal('prose');
  });

  it('link-card 配下の card surface link を prose に降格しないこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'article',
          properties: { 'data-link-card': 'true' },
          children: [
            {
              type: 'element',
              tagName: 'a',
              properties: {
                href: 'https://example.com',
                className: ['link-card__link'],
                'data-link-surface': 'prose',
                'data-link-kind': 'internal-document',
              },
              children: [],
            },
          ],
        },
      ],
    };

    annotate()(tree);

    const anchor = tree.children?.[0]?.children?.[0];
    expect(anchor?.properties?.['data-link-kind']).to.equal('external-web');
    expect(anchor?.properties?.['data-link-surface']).to.equal('card');
    expect(anchor?.properties?.['data-external']).to.equal('true');
  });
});
