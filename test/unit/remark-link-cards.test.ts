import { expect } from '@open-wc/testing';
import path from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
  position?: {
    start?: {
      line?: number;
      column?: number;
    };
  };
}

const FIXTURE_DIR = path.resolve(process.cwd(), 'content/_generated');
const FIXTURE_FILE = path.resolve(FIXTURE_DIR, 'link-card-metadata.json');

const createFile = () => ({
  path: 'content/notes/sample.md',
  messages: [] as { reason: string }[],
  message(reason: string) {
    this.messages.push({ reason });
  },
});

const writeCache = (entries: Record<string, unknown>) => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(
    FIXTURE_FILE,
    `${JSON.stringify({ version: 1, generatedAt: '2026-03-25T00:00:00.000Z', entries }, null, 2)}\n`,
    'utf8',
  );
};

describe('remarkLinkCards', () => {
  afterEach(() => {
    rmSync(FIXTURE_FILE, { force: true });
  });

  it('明示 link-card で cache title を使って解決すること', () => {
    writeCache({
      'https://example.com/post': {
        title: 'Cache Title',
        description: 'Cache Description',
        image: 'https://cdn.example.com/card.png',
        siteName: 'Example',
      },
    });

    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'rouaultDirectiveLinkCard',
          data: {
            hName: 'ui-card',
            hProperties: {
              url: 'https://example.com/post',
            },
          },
          children: [],
        },
      ],
    };

    remarkLinkCards()(tree, createFile());

    const card = tree.children?.[0];
    expect(card?.type).to.equal('rouaultResolvedLinkCard');
    expect(card?.data?.hProperties?.['card-title']).to.equal('Cache Title');
    expect(card?.data?.hProperties?.['description']).to.equal('Cache Description');
    expect(card?.data?.hProperties?.['image-src']).to.equal('https://cdn.example.com/card.png');
    expect(card?.data?.hProperties?.['site-name']).to.equal('Example');
  });

  it('単独 URL 段落を auto link-card に変換すること', () => {
    writeCache({
      'https://example.com/auto': {
        title: 'Auto Title',
        siteName: 'Example',
      },
    });

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
      ],
    };

    remarkLinkCards()(tree, createFile());

    const card = tree.children?.[0];
    expect(card?.type).to.equal('rouaultAutoLinkCard');
    expect(card?.data?.hProperties?.['card-title']).to.equal('Auto Title');
    expect(card?.data?.hProperties?.['site-name']).to.equal('Example');
  });

  it('cache 不在時は hostname を title/site-name に使うこと', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              url: 'https://example.com/fallback',
              children: [{ type: 'text', value: 'https://example.com/fallback' }],
            },
          ],
        },
      ],
    };

    remarkLinkCards()(tree, createFile());

    const card = tree.children?.[0];
    expect(card?.data?.hProperties?.['card-title']).to.equal('example.com');
    expect(card?.data?.hProperties?.['site-name']).to.equal('example.com');
  });

  it('明示 title は cache title より優先されること', () => {
    writeCache({
      'https://example.com/post': {
        title: 'Cache Title',
        siteName: 'Example',
      },
    });

    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'rouaultDirectiveLinkCard',
          data: {
            hName: 'ui-card',
            hProperties: {
              url: 'https://example.com/post',
              title: 'Author Title',
            },
          },
          children: [],
        },
      ],
    };

    remarkLinkCards()(tree, createFile());

    const card = tree.children?.[0];
    expect(card?.data?.hProperties?.['card-title']).to.equal('Author Title');
  });
});