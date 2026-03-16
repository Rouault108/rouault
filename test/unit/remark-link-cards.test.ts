import { expect } from '@open-wc/testing';
import { remarkLinkCards } from '../../lib/remark/remark-link-cards.js';

interface MdastNode {
  type: string;
  url?: string;
  value?: string;
  children?: MdastNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
}

interface TestVFile {
  path: string;
  messages: { reason: string }[];
  message: (reason: string) => void;
}

const createFile = (): TestVFile => {
  const messages: { reason: string }[] = [];
  return {
    path: 'content/notes/sample.md',
    messages,
    message: (reason: string) => {
      messages.push({ reason });
    },
  };
};

describe('remarkLinkCards', () => {
  it('著者指定 > OGP > Twitter Card > oEmbed の優先順位で link-card を解決すること', async () => {
    const calls: string[] = [];
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'rouaultDirectiveLinkCard',
          data: {
            hName: 'ui-card',
            hProperties: {
              url: 'https://example.com/post',
              title: '著者指定タイトル',
            },
          },
          children: [],
        },
      ],
    };

    const plugin = remarkLinkCards({
      fetch: (async (input: string | URL | Request) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        calls.push(url);

        if (url === 'https://example.com/post') {
          return new Response(
            `
              <html>
                <head>
                  <meta property="og:description" content="OGP の説明" />
                  <meta name="twitter:title" content="Twitter タイトル" />
                  <meta name="twitter:image" content="/twitter-image.png" />
                  <link rel="alternate" type="application/json+oembed" href="https://example.com/oembed" />
                </head>
              </html>
            `,
            { status: 200 },
          );
        }

        if (url === 'https://example.com/oembed') {
          return new Response(
            JSON.stringify({
              title: 'oEmbed タイトル',
              thumbnail_url: 'https://cdn.example.com/oembed.png',
              provider_name: 'Example Provider',
              author_name: 'Example Author',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        throw new Error(`unexpected fetch: ${url}`);
      }) as typeof fetch,
    });

    await plugin(tree, createFile());

    const card = tree.children?.[0];
    expect(card?.data?.hName).to.equal('ui-card');
    expect(card?.data?.hProperties?.['card-kind']).to.equal('link');
    expect(card?.data?.hProperties?.['href']).to.equal('https://example.com/post');
    expect(card?.data?.hProperties?.['card-title']).to.equal('著者指定タイトル');
    expect(card?.data?.hProperties?.['description']).to.equal('OGP の説明');
    expect(card?.data?.hProperties?.['image-src']).to.equal('https://example.com/twitter-image.png');
    expect(card?.data?.hProperties?.['site-name']).to.equal('Example Provider');
    expect(card?.data?.hProperties?.['clickable']).to.equal(true);
    expect(calls).to.deep.equal(['https://example.com/post', 'https://example.com/oembed']);
  });

  it('単独段落の外部リンクだけを自動でリンクカード化すること', async () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              url: 'https://example.com/auto',
              children: [{ type: 'text', value: 'https://example.com/auto' }],
            },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '本文中の ' },
            {
              type: 'link',
              url: 'https://example.com/inline',
              children: [{ type: 'text', value: 'リンク' }],
            },
            { type: 'text', value: ' は通常のままです。' },
          ],
        },
      ],
    };

    const plugin = remarkLinkCards({
      fetch: (async () =>
        new Response(
          `
            <html>
              <head>
                <meta property="og:title" content="自動カード" />
                <meta property="og:site_name" content="Example" />
              </head>
            </html>
          `,
          { status: 200 },
        )) as typeof fetch,
    });

    await plugin(tree, createFile());

    const autoCard = tree.children?.[0];
    const inlineParagraph = tree.children?.[1];
    expect(autoCard?.data?.hName).to.equal('ui-card');
    expect(autoCard?.data?.hProperties?.['card-title']).to.equal('自動カード');
    expect(inlineParagraph?.type).to.equal('paragraph');
  });

  it('メタデータ取得失敗時は警告しつつ画像なしカードへフォールバックすること', async () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'rouaultDirectiveLinkCard',
          data: {
            hName: 'ui-card',
            hProperties: {
              url: 'https://failure.example.com/article',
            },
          },
          children: [],
        },
      ],
    };

    const file = createFile();
    const plugin = remarkLinkCards({
      fetch: (async () => {
        throw new Error('network down');
      }) as typeof fetch,
    });

    await plugin(tree, file);

    const card = tree.children?.[0];
    expect(card?.data?.hProperties?.['card-title']).to.equal('failure.example.com');
    expect(card?.data?.hProperties?.['image-src']).to.equal(undefined);
    expect(file.messages).to.have.length(1);
    expect(file.messages[0]?.reason).to.contain('link-card のメタデータ取得に失敗しました');
  });

  it('同一 URL の取得は 1 回だけに重複排除すること', async () => {
    const calls: string[] = [];
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'rouaultDirectiveLinkCard',
          data: {
            hName: 'ui-card',
            hProperties: {
              url: 'https://example.com/dedupe',
            },
          },
          children: [],
        },
        {
          type: 'rouaultDirectiveLinkCard',
          data: {
            hName: 'ui-card',
            hProperties: {
              url: 'https://example.com/dedupe',
            },
          },
          children: [],
        },
      ],
    };

    const plugin = remarkLinkCards({
      fetch: (async () => {
        calls.push('https://example.com/dedupe');
        return new Response(
          `
            <html>
              <head>
                <meta property="og:title" content="Dedupe" />
              </head>
            </html>
          `,
          { status: 200 },
        );
      }) as typeof fetch,
    });

    await plugin(tree, createFile());

    expect(calls).to.have.length(1);
    expect(tree.children?.[0]?.data?.hProperties?.['card-title']).to.equal('Dedupe');
    expect(tree.children?.[1]?.data?.hProperties?.['card-title']).to.equal('Dedupe');
  });
});
