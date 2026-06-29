import { describe, expect, it } from 'vitest';
import { remarkRouaultDirectives } from '../../build/remark/rouault-directives.js';
import { parseRouaultDirectiveMdastFromMarkdown } from '../helpers/markdown-directive-test-utils.js';

interface MdastNode {
  type: string;
  value?: string;
  lang?: string;
  meta?: string;
  url?: string;
  title?: string | null;
  alt?: string | null;
  identifier?: string;
  referenceType?: string;
  children?: MdastNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
  position?: {
    start?: {
      line?: number;
      column?: number;
      offset?: number;
    };
    end?: {
      line?: number;
      column?: number;
      offset?: number;
    };
  };
}

describe('remarkRouaultDirectives', () => {
  it('callout ディレクティブを aside[data-callout] ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::callout{kind="warning" heading="注意"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '本文です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    expect(tree.children).to.have.length(1);
    const callout = tree.children?.[0];
    expect(callout?.data?.hName).to.equal('aside');
    expect(callout?.data?.hProperties?.['data-callout-kind']).to.equal('warning');
    expect(callout?.data?.hProperties?.['data-callout-heading']).to.equal('注意');
    expect(callout?.children?.[0]?.type).to.equal('paragraph');
  });

  it('空行なしで1段落に畳まれた callout でも label と heading-level を転送できること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::callout{kind="tip" label="補足" heading-level="2"}\n本文です。\n::',
            },
          ],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    expect(tree.children).to.have.length(1);
    const callout = tree.children?.[0];
    expect(callout?.data?.hName).to.equal('aside');
    expect(callout?.data?.hProperties?.['data-callout-kind']).to.equal('tip');
    expect(callout?.data?.hProperties?.['data-callout-label']).to.equal('補足');
    expect(callout?.data?.hProperties?.['data-callout-heading-level']).to.equal('2');
    expect(callout?.children?.[0]?.type).to.equal('paragraph');
  });

  it('旧 callout 属性 variant は未対応エラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::callout{variant="warning"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '本文です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] callout 属性 "variant" は未対応です');
  });

  it('旧 callout 属性 title は未対応エラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::callout{title="注意"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '本文です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] callout 属性 "title" は未対応です');
  });

  it('旧 callout 属性 aria-label は未対応エラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::callout{aria-label="補足"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '本文です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] callout 属性 "aria-label" は未対応です');
  });

  it('code-group ディレクティブを static source ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-group{aria-label="比較"}' }],
        },
        {
          type: 'code',
          lang: 'ts',
          meta: 'filename="one.ts" group-key="one" tab-label="正しい例" copy-label="正しい例コード"',
          value: 'const one = 1;',
        },
        {
          type: 'code',
          lang: 'ts',
          meta: 'filename="two.ts" group-key="two" tab-label="誤り例"',
          value: 'const two = 2;',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    expect(tree.children).to.have.length(1);
    const group = tree.children?.[0];
    expect(group?.data?.hName).to.equal('section');
    expect(group?.data?.hProperties?.['data-code-group-source']).to.equal('true');
    expect(group?.data?.hProperties?.['aria-label']).to.equal('比較');
    expect(group?.children).to.have.length(2);

    const firstCode = group?.children?.[0];
    const secondCode = group?.children?.[1];
    expect(firstCode?.data?.hProperties?.['filename']).to.equal('one.ts');
    expect(firstCode?.data?.hProperties?.['group-key']).to.equal('one');
    expect(firstCode?.data?.hProperties?.['tab-label']).to.equal('正しい例');
    expect(firstCode?.data?.hProperties?.['copy-label']).to.equal('正しい例コード');
    expect(secondCode?.data?.hProperties?.['filename']).to.equal('two.ts');
    expect(secondCode?.data?.hProperties?.['group-key']).to.equal('two');
    expect(secondCode?.data?.hProperties?.['tab-label']).to.equal('誤り例');
  });

  it('standalone fenced code の meta を正規化すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'ts',
          meta: '{1} filename="sample.ts" group-key="sample" tab-label="例" copy-label="例コード" copyable="false" intent="invalid" show-line-numbers="true" copy-mode="always" wrap="true" highlight-lines="1,3-4" layout="inline"',
          value: 'const sample = 1;',
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const code = tree.children?.[0];
    expect(code?.data?.hProperties?.['filename']).to.equal('sample.ts');
    expect(code?.data?.hProperties?.['group-key']).to.equal('sample');
    expect(code?.data?.hProperties?.['tab-label']).to.equal('例');
    expect(code?.data?.hProperties?.['copy-label']).to.equal('例コード');
    expect(code?.data?.hProperties?.['copyable']).to.equal('false');
    expect(code?.data?.hProperties?.['intent']).to.equal('invalid');
    expect(code?.data?.hProperties?.['show-line-numbers']).to.equal(true);
    expect(code?.data?.hProperties?.['copy-mode']).to.equal('always');
    expect(code?.data?.hProperties?.['wrap']).to.equal(true);
    expect(code?.data?.hProperties?.['highlight-lines']).to.equal('1,3-4');
    expect(code?.data?.hProperties?.['layout']).to.equal('inline');
    expect(code?.data?.hProperties?.['data-shiki-meta']).to.equal(
      '{1} filename="sample.ts" group-key="sample" tab-label="例" copy-label="例コード" copyable="false" intent="invalid" show-line-numbers="true" copy-mode="always" wrap="true" highlight-lines="1,3-4" layout="inline"',
    );
  });

  it('details ディレクティブを native details source ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::details{summary="補足情報" open="true"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細本文です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const details = tree.children?.[0];
    expect(details?.data?.hName).to.equal('details');
    expect(details?.data?.hProperties?.['data-details-source']).to.equal('true');
    expect(details?.data?.hProperties?.['summary']).to.equal('補足情報');
    expect(details?.data?.hProperties?.['open']).to.equal(true);
  });

  it('details ディレクティブの aria-label 利用は build error にすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::details{aria-label="補足を開閉" open="true"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細本文です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    expect(() => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    }).to.throw('details 属性 "aria-label" は未対応です');
  });

  it('details ディレクティブで summary がない場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::details{open="true"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細本文です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] details では summary が必須です');
  });

  it('details ディレクティブで summary と aria-label の同時指定はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '::details{summary="補足情報" aria-label="補足を開閉"}' },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細本文です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] details 属性 "aria-label" は未対応です');
  });

  it('details ディレクティブの icon-only 利用で空の aria-label はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::details{aria-label="   "}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細本文です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] details 属性 "aria-label" は未対応です');
  });

  it('details ディレクティブの旧 variant / region / slot 属性は build error にすること', () => {
    for (const source of [
      '::details{summary="補足情報" variant="bordered"}',
      '::details{summary="補足情報" region="true"}',
      '::details{summary="補足情報" slot="summary"}',
    ]) {
      const tree: MdastNode = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', value: source }],
          },
          {
            type: 'paragraph',
            children: [{ type: 'text', value: '詳細本文です。' }],
          },
          {
            type: 'paragraph',
            children: [{ type: 'text', value: '::' }],
          },
        ],
      };

      expect(() => {
        remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
      }).to.throw('[markdown] details 属性');
    }
  });

  it('info-box ディレクティブを section[data-info-box] ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::info-box{heading="作品情報" icon="music" heading-level="3" landmark="true" variant="filled" density="compact"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '本文です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const infoBox = tree.children?.[0];
    expect(infoBox?.data?.hName).to.equal('section');
    expect(infoBox?.data?.hProperties?.['data-info-box-heading']).to.equal('作品情報');
    expect(infoBox?.data?.hProperties?.['data-info-box-icon']).to.equal('music');
    expect(infoBox?.data?.hProperties?.['data-info-box-heading-level']).to.equal('3');
    expect(infoBox?.data?.hProperties?.['data-info-box-landmark']).to.equal('true');
    expect(infoBox?.data?.hProperties?.['data-variant']).to.equal('filled');
    expect(infoBox?.data?.hProperties?.['data-density']).to.equal('compact');
  });

  it('link-card ディレクティブを終端なしの static source ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::link-card{url="https://example.com/post" title="著者指定タイトル" description="補足文" image="https://cdn.example.com/card.png"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '後続段落' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const card = tree.children?.[0];
    const paragraph = tree.children?.[1];
    expect(card?.data?.hName).to.equal('div');
    expect(card?.data?.hProperties?.['data-link-card-source']).to.equal('true');
    expect(card?.data?.hProperties?.['url']).to.equal('https://example.com/post');
    expect(card?.data?.hProperties?.['title']).to.equal('著者指定タイトル');
    expect(card?.data?.hProperties?.['description']).to.equal('補足文');
    expect(card?.data?.hProperties?.['image']).to.equal('https://cdn.example.com/card.png');
    expect(paragraph?.type).to.equal('paragraph');
  });

  it('自動リンク化された URL を含む link-card ディレクティブも変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '::link-card{url="' },
            {
              type: 'link',
              url: 'https://example.com/post',
              children: [{ type: 'text', value: 'https://example.com/post' }],
            },
            { type: 'text', value: '" title="著者指定タイトル" description="補足文" image="' },
            {
              type: 'link',
              url: 'https://cdn.example.com/card.png',
              children: [{ type: 'text', value: 'https://cdn.example.com/card.png' }],
            },
            { type: 'text', value: '"}' },
          ],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const card = tree.children?.[0];
    expect(card?.data?.hName).to.equal('div');
    expect(card?.data?.hProperties?.['data-link-card-source']).to.equal('true');
    expect(card?.data?.hProperties?.['url']).to.equal('https://example.com/post');
    expect(card?.data?.hProperties?.['title']).to.equal('著者指定タイトル');
    expect(card?.data?.hProperties?.['description']).to.equal('補足文');
    expect(card?.data?.hProperties?.['image']).to.equal('https://cdn.example.com/card.png');
  });

  it('score ディレクティブを static score ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::score{src="media/score/a.svg" label="譜例" description="詳細説明" aspect-ratio="4/1" primary="true"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '譜例' },
            { type: 'emphasis', children: [{ type: 'text', value: 'キャプション' }] },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const score = tree.children?.[0];
    expect(score?.data?.hName).to.equal('figure');
    expect(score?.data?.hProperties?.['data-score']).to.equal('true');
    expect(score?.data?.hProperties?.['data-score-src']).to.equal('media/score/a.svg');
    expect(score?.data?.hProperties?.['data-score-label']).to.equal('譜例');
    expect(score?.data?.hProperties?.['data-score-caption']).to.equal(undefined);
    expect(score?.data?.hProperties?.['data-score-description']).to.equal('詳細説明');
    expect(score?.data?.hProperties?.['data-score-aspect-ratio']).to.equal('4/1');
    expect(score?.data?.hProperties?.['data-score-loading']).to.equal(undefined);
    expect(score?.data?.hProperties?.['data-score-primary']).to.equal('true');
    const caption = score?.children?.[0];
    expect(caption?.data?.hName).to.equal('figcaption');
    expect(caption?.data?.hProperties?.['data-score-caption-source']).to.equal('true');
    expect(caption?.children?.[0]?.value).to.equal('譜例');
    expect(caption?.children?.[1]?.type).to.equal('emphasis');
  });

  it('score ディレクティブの src 欠落は build error にすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::score{label="譜例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    expect(run).to.throw('[markdown] score の src は必須です');
  });

  it('score ディレクティブの旧 loading 属性は build error にすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::score{src="/media/score/a.svg" loading="lazy"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    expect(() => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    }).to.throw('[markdown] score 属性 "loading" は未対応です');
  });

  it('tabs と tab/panel スロットディレクティブを変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::tabs{selected-value="details" default-selected-value="overview" orientation="vertical" automatic-activation="true" url-sync="true"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="details"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const tabs = tree.children?.[0];
    expect(tabs?.data?.hName).to.equal('ui-tabs');
    expect(tabs?.data?.hProperties?.['selected-value']).to.equal('details');
    expect(tabs?.data?.hProperties?.['default-selected-value']).to.equal('overview');
    expect(tabs?.data?.hProperties?.['orientation']).to.equal('vertical');
    expect(tabs?.data?.hProperties?.['automatic-activation']).to.equal(true);
    expect(tabs?.data?.hProperties?.['url-sync']).to.equal(true);
    expect(tabs?.children).to.have.length(4);

    const firstTab = tabs?.children?.[0];
    const firstPanel = tabs?.children?.[1];
    expect(firstTab?.data?.hName).to.equal('div');
    expect(firstTab?.data?.hProperties?.['slot']).to.equal('tab');
    expect(firstTab?.data?.hProperties?.['value']).to.equal('overview');
    expect(firstPanel?.data?.hName).to.equal('div');
    expect(firstPanel?.data?.hProperties?.['slot']).to.equal('panel');
  });

  it('tabs で tab と panel の個数が一致しない場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tabs{default-selected-value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="details"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] tabs 直下の tab と panel の個数は一致している必要があります');
  });

  it('tabs で tab の value が重複した場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tabs{default-selected-value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] tab の value "overview" が重複しています');
  });

  it('tabs の selected-value が存在しない tab.value を指す場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::tabs{selected-value="missing" default-selected-value="overview"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="details"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw(
      '[markdown] tabs の selected-value "missing" に対応する tab.value が存在しません',
    );
  });

  it('tabs の default-selected-value が存在しない tab.value を指す場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tabs{default-selected-value="missing"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="details"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw(
      '[markdown] tabs の default-selected-value "missing" に対応する tab.value が存在しません',
    );
  });

  it('tabs の url-sync="false" は出力しないこと', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::tabs{url-sync="false"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const tabs = tree.children?.[0];
    expect(tabs?.data?.hName).to.equal('ui-tabs');
    expect(tabs?.data?.hProperties?.['url-sync']).to.equal(undefined);
  });

  it('tabs の url-sync が同一文書内に 2 系統ある場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tabs{url-sync="true"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '概要パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tabs{url-sync="true"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tab{value="details"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::panel' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '詳細パネル' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw(
      '[markdown] tabs の url-sync は 1 文書につき 1 系統までしか使用できません',
    );
  });

  it('code-preview と preview/toolbar スロットディレクティブを変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::code-preview{heading="ボタン例" controls="theme surface viewport" preview-align="stretch" preview-theme="dark" preview-surface="muted" preview-viewport="mobile"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'プレビュー領域' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::toolbar' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'ツールバー領域' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'code',
          lang: 'ts',
          value: 'const button = true;',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const preview = tree.children?.[0];
    expect(preview?.data?.hName).to.equal('ui-code-preview');
    expect(preview?.data?.hProperties?.['heading']).to.equal('ボタン例');
    expect(preview?.data?.hProperties?.['controls']).to.equal('theme surface viewport');
    expect(preview?.data?.hProperties?.['preview-align']).to.equal('stretch');
    expect(preview?.data?.hProperties?.['preview-theme']).to.equal('dark');
    expect(preview?.data?.hProperties?.['preview-surface']).to.equal('muted');
    expect(preview?.data?.hProperties?.['preview-viewport']).to.equal('mobile');
    expect(preview?.children?.[0]?.data?.hProperties?.['slot']).to.equal('preview');
    expect(preview?.children?.[1]?.data?.hProperties?.['slot']).to.equal('toolbar');
    expect(preview?.children?.[2]?.type).to.equal('code');
  });

  it('code-preview 配下の preview-sandbox を変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{heading="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::preview-sandbox{iframe-title="ボタンの sandbox" allow-js="true" activation-policy="visible" height-mode="bounded-auto" height="160" max-height="320" base-url="https://rouault.invalid/assets/preview/demo/"}',
            },
          ],
        },
        {
          type: 'code',
          lang: 'preview-html',
          meta: 'filename="button.html"',
          value: '<button class="demo">押す</button>',
        },
        {
          type: 'code',
          lang: 'preview-css',
          meta: 'filename="button.css"',
          value: '.demo { padding: 1rem; }',
        },
        {
          type: 'code',
          lang: 'preview-js',
          meta: 'filename="button.js"',
          value: 'document.querySelector(".demo")?.addEventListener("click", () => {});',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const preview = tree.children?.[0];
    expect(preview?.data?.hName).to.equal('ui-code-preview');
    expect(preview?.children).to.have.length(1);

    const sandbox = preview?.children?.[0];
    expect(sandbox?.data?.hName).to.equal('ui-preview-sandbox');
    expect(sandbox?.data?.hProperties?.['slot']).to.equal('preview');
    expect(sandbox?.data?.hProperties?.['iframe-title']).to.equal('ボタンの sandbox');
    expect(sandbox?.data?.hProperties?.['allow-js']).to.equal(true);
    expect(sandbox?.data?.hProperties?.['activation-policy']).to.equal('visible');
    expect(sandbox?.data?.hProperties?.['height-mode']).to.equal('bounded-auto');
    expect(sandbox?.data?.hProperties?.['height']).to.equal('160');
    expect(sandbox?.data?.hProperties?.['max-height']).to.equal('320');
    expect(sandbox?.data?.hProperties?.['base-url']).to.equal(
      'https://rouault.invalid/assets/preview/demo/',
    );
    expect(sandbox?.children).to.have.length(3);
  });

  it('preview-sandbox の追加 capability 属性を hProperties に反映すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{heading="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::preview-sandbox{iframe-title="capability sandbox" allow-js="true" allow-forms="true" allow-downloads="true" allow-pointer-lock="true" allow-popups="true" height="160"}',
            },
          ],
        },
        {
          type: 'code',
          lang: 'preview-html',
          meta: 'filename="button.html"',
          value: '<button class="demo">押す</button>',
        },
        {
          type: 'code',
          lang: 'preview-css',
          meta: 'filename="button.css"',
          value: '.demo { padding: 1rem; }',
        },
        {
          type: 'code',
          lang: 'preview-js',
          meta: 'filename="button.js"',
          value: 'document.querySelector(".demo")?.addEventListener("click", () => {});',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const preview = tree.children?.[0];
    expect(preview?.data?.hName).to.equal('ui-code-preview');
    expect(preview?.children).to.have.length(1);

    const sandbox = preview?.children?.[0];
    expect(sandbox?.data?.hName).to.equal('ui-preview-sandbox');
    expect(sandbox?.data?.hProperties?.['slot']).to.equal('preview');
    expect(sandbox?.data?.hProperties?.['iframe-title']).to.equal('capability sandbox');
    expect(sandbox?.data?.hProperties?.['allow-js']).to.equal(true);
    expect(sandbox?.data?.hProperties?.['allow-forms']).to.equal(true);
    expect(sandbox?.data?.hProperties?.['allow-downloads']).to.equal(true);
    expect(sandbox?.data?.hProperties?.['allow-pointer-lock']).to.equal(true);
    expect(sandbox?.data?.hProperties?.['allow-popups']).to.equal(true);
    expect(sandbox?.data?.hProperties?.['height']).to.equal('160');
    expect(sandbox?.children).to.have.length(3);
  });

  it('translation ディレクティブを静的本文ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::translation{lang="fr" target-lang="ja" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const translation = tree.children?.[0];
    expect(translation?.data?.hName).to.equal('div');
    expect(translation?.data?.hProperties?.['data-translation-kind']).to.equal('static');
    expect(translation?.children).to.have.length(2);
    expect(translation?.children?.[0]?.data?.hProperties?.['className']).to.deep.equal([
      'translation-original',
    ]);
    expect(translation?.children?.[0]?.data?.hProperties?.['lang']).to.equal('fr');
    expect(translation?.children?.[0]?.children?.[0]?.value).to.equal('Je pense, donc je suis.');
    expect(translation?.children?.[1]?.data?.hProperties?.['className']).to.deep.equal([
      'translation-translated',
    ]);
    expect(translation?.children?.[1]?.data?.hProperties?.['lang']).to.equal('ja');
    expect(translation?.children?.[1]?.children?.[0]?.value).to.equal('我思う、ゆえに我あり。');
  });

  it('translation ディレクティブ本文の inline markup は plain text へ flatten されること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::translation{lang="fr" target-lang="ja"}' }],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Je pense, ' },
            { type: 'emphasis', children: [{ type: 'text', value: 'donc' }] },
            { type: 'text', value: ' je suis.' },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '我思う、' },
            {
              type: 'link',
              url: 'https://example.com/cogito',
              children: [{ type: 'text', value: 'ゆえに' }],
            },
            { type: 'text', value: '我あり。' },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const translation = tree.children?.[0];
    expect(translation?.data?.hName).to.equal('div');
    expect(translation?.children?.[0]?.children?.[0]?.value).to.equal('Je pense, donc je suis.');
    expect(translation?.children?.[1]?.children?.[0]?.value).to.equal('我思う、ゆえに我あり。');
  });

  it('translation-overlay ディレクティブを ui-translation ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::translation-overlay{lang="fr" target-lang="ja" surface="drawer" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const translation = tree.children?.[0];
    expect(translation?.data?.hName).to.equal('ui-translation');
    expect(translation?.data?.hProperties?.['lang']).to.equal('fr');
    expect(translation?.data?.hProperties?.['target-lang']).to.equal('ja');
    expect(translation?.data?.hProperties?.['surface']).to.equal('drawer');
    expect(translation?.data?.hProperties?.['original']).to.equal('Je pense, donc je suis.');
    expect(translation?.data?.hProperties?.['translated']).to.equal('我思う、ゆえに我あり。');
    expect(translation?.data?.hProperties?.['data-hydration-capability']).to.equal('interactive');
    expect(translation?.data?.hProperties?.['data-hydration-trigger']).to.equal('visible');

    const fallback = translation?.children?.[0];
    const summary = fallback?.children?.[0];
    const content = fallback?.children?.[1];

    expect(fallback?.data?.hName).to.equal('details');
    expect(fallback?.data?.hProperties?.['data-translation-fallback']).to.equal(true);
    expect(fallback?.data?.hProperties?.['data-surface']).to.equal(undefined);
    expect(JSON.stringify(fallback?.data?.hProperties ?? {})).not.to.contain('data-part');

    expect(summary?.data?.hName).to.equal('summary');
    expect(summary?.data?.hProperties?.['data-translation-fallback-trigger']).to.equal(true);
    expect(summary?.data?.hProperties?.['lang']).to.equal('fr');
    expect(summary?.children?.[0]?.value).to.equal('Je pense, donc je suis.');
    expect(JSON.stringify(summary?.data?.hProperties ?? {})).not.to.contain('data-part');

    expect(content?.data?.hName).to.equal('p');
    expect(content?.data?.hProperties?.['data-translation-fallback-content']).to.equal(true);
    expect(content?.data?.hProperties?.['lang']).to.equal('ja');
    expect(content?.children?.[0]?.value).to.equal('我思う、ゆえに我あり。');
    expect(JSON.stringify(content?.data?.hProperties ?? {})).not.to.contain('data-part');
  });

  it('translation-overlay ディレクティブ本文の inline markup も plain text へ flatten されること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::translation-overlay{lang="fr" target-lang="ja" surface="popover"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Je pense, ' },
            { type: 'strong', children: [{ type: 'text', value: 'donc' }] },
            { type: 'text', value: ' je suis.' },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: '我思う、' },
            {
              type: 'link',
              url: 'https://example.com/cogito',
              children: [{ type: 'text', value: 'ゆえに' }],
            },
            { type: 'text', value: '我あり。' },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const translation = tree.children?.[0];
    expect(translation?.data?.hName).to.equal('ui-translation');
    expect(translation?.data?.hProperties?.['original']).to.equal('Je pense, donc je suis.');
    expect(translation?.data?.hProperties?.['translated']).to.equal('我思う、ゆえに我あり。');
    expect(translation?.children?.[0]?.children?.[0]?.children?.[0]?.value).to.equal(
      'Je pense, donc je suis.',
    );
    expect(translation?.children?.[0]?.children?.[1]?.children?.[0]?.value).to.equal(
      '我思う、ゆえに我あり。',
    );
  });

  it('旧 translation の render-mode は未対応エラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::translation{lang="fr" target-lang="ja" render-mode="drawer" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    expect(() => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    }).to.throw('[markdown] translation 属性 "render-mode" は未対応です');
  });

  it('translation の open 属性は未対応エラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::translation{lang="fr" target-lang="ja" open="true" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    expect(() => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    }).to.throw('[markdown] translation 属性 "open" は未対応です');
  });

  it('translation-overlay の render-mode 属性は未対応エラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::translation-overlay{lang="fr" target-lang="ja" render-mode="drawer" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    expect(() => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    }).to.throw('[markdown] translation-overlay 属性 "render-mode" は未対応です');
  });

  it('translation-overlay の open 属性は未対応エラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::translation-overlay{lang="fr" target-lang="ja" open="true" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    expect(() => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    }).to.throw('[markdown] translation-overlay 属性 "open" は未対応です');
  });

  it('translation の本文が 3 段落以上ある場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::translation{lang="fr" target-lang="ja"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Je pense, donc je suis.' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '我思う、ゆえに我あり。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '第三段落です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    expect(() => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    }).to.throw('[markdown] translation の本文は非空テキスト段落を 2 つまでしか持てません');
  });

  it('translation-overlay の本文が 3 段落以上ある場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::translation-overlay{lang="fr" target-lang="ja" surface="drawer"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Je pense, donc je suis.' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '我思う、ゆえに我あり。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '第三段落です。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    expect(() => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    }).to.throw('[markdown] translation-overlay の本文は非空テキスト段落を 2 つまでしか持てません');
  });

  it('空行なしで畳まれた code-preview の slot ディレクティブも変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{heading="ボタン例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview\nここにプレビュー内容を書く' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'code',
          lang: 'html',
          value: '<button>例</button>',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    expect(tree.children).to.have.length(1);
    const preview = tree.children?.[0];
    expect(preview?.data?.hName).to.equal('ui-code-preview');
    expect(preview?.children).to.have.length(2);
    expect(preview?.children?.[0]?.data?.hProperties?.['slot']).to.equal('preview');
    expect(preview?.children?.[0]?.children?.[0]?.children?.[0]?.value).to.equal(
      'ここにプレビュー内容を書く',
    );
    expect(preview?.children?.[1]?.type).to.equal('code');
  });

  it('空行なしで畳まれた tabs の slot ディレクティブも変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::tabs{default-selected-value="overview"}' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::tab{value="overview"}\n概要\n::\n::panel\n概要の内容\n::\n::tab{value="details"}\n詳細\n::\n::panel\n詳細の内容\n::',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    expect(tree.children).to.have.length(1);
    const tabs = tree.children?.[0];
    expect(tabs?.data?.hName).to.equal('ui-tabs');
    expect(tabs?.children).to.have.length(4);
    expect(tabs?.children?.[0]?.data?.hProperties?.['slot']).to.equal('tab');
    expect(tabs?.children?.[1]?.data?.hProperties?.['slot']).to.equal('panel');
    expect(tabs?.children?.[2]?.data?.hProperties?.['slot']).to.equal('tab');
    expect(tabs?.children?.[3]?.data?.hProperties?.['slot']).to.equal('panel');
  });

  it('空行なしで畳まれた translation ディレクティブも静的本文へ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::translation{lang="fr" target-lang="ja"}\nJe pense, donc je suis.',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '我思う、ゆえに我あり。\n::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    expect(tree.children).to.have.length(1);
    const translation = tree.children?.[0];
    expect(translation?.data?.hName).to.equal('div');
    expect(translation?.children?.[0]?.children?.[0]?.value).to.equal('Je pense, donc je suis.');
    expect(translation?.children?.[1]?.children?.[0]?.value).to.equal('我思う、ゆえに我あり。');
  });

  it('画像直後の属性ブロックから image オプションを HTML 属性として保持すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'image',
              url: 'content/_assets/testing/test-hero.jpg',
              alt: 'sample',
              title: 'キャプション',
            },
            {
              type: 'text',
              value: '{loading="eager" width="1200" height="800" zoomable="false"}',
            },
          ],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const paragraph = tree.children?.[0];
    const image = paragraph?.children?.[0];

    expect(paragraph?.children).to.have.length(1);
    expect(image?.type).to.equal('image');
    expect(image?.data?.hProperties?.['loading']).to.equal('eager');
    expect(image?.data?.hProperties?.['width']).to.equal(1200);
    expect(image?.data?.hProperties?.['height']).to.equal(800);

    // boolean false ではなく、後段へ落ちない文字列属性として保持されていることを確認する
    expect(image?.data?.hProperties?.['zoomable']).to.equal('false');
  });

  it('emoji/subscript/superscript/highlight のインライン記法を変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: 'H~2~O x^2^ ==重要== :emoji[😀]{aria-label="笑顔"} :sparkles:',
            },
          ],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const paragraph = tree.children?.[0];
    expect(paragraph?.children).to.be.an('array');

    const children = paragraph?.children ?? [];
    const sub = children.find((child) => child.data?.hName === 'sub');
    const sup = children.find((child) => child.data?.hName === 'sup');
    const highlight = children.find((child) => child.data?.hName === 'mark');
    const emoji = children.find((child) => child.type === 'rouaultInlineEmoji');
    const lastText = children[children.length - 1];

    expect(sub?.children?.[0]?.value).to.equal('2');
    expect(sup?.children?.[0]?.value).to.equal('2');
    expect(highlight?.children?.[0]?.value).to.equal('重要');
    expect(highlight?.data?.hProperties).to.equal(undefined);
    expect(emoji?.children?.[0]?.value).to.equal('😀');
    expect(emoji?.data?.hProperties?.['aria-label']).to.equal('笑顔');
    expect(lastText?.value).to.contain('✨');
  });

  it('single tilde の delete ノードは subscript として復元すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'H' },
            {
              type: 'delete',
              children: [{ type: 'text', value: '2' }],
              position: {
                start: { offset: 1 },
                end: { offset: 4 },
              },
            },
            { type: 'text', value: 'O' },
          ],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md', value: 'H~2~O' });

    const paragraph = tree.children?.[0];
    const children = paragraph?.children ?? [];
    const sub = children[1];

    expect(sub?.type).to.equal('rouaultInlineSubscript');
    expect(sub?.data?.hName).to.equal('sub');
    expect(sub?.children?.[0]?.value).to.equal('2');
  });

  it('double tilde の delete ノードは strikethrough のまま維持すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'H' },
            {
              type: 'delete',
              children: [{ type: 'text', value: '2' }],
              position: {
                start: { offset: 1 },
                end: { offset: 6 },
              },
            },
            { type: 'text', value: 'O' },
          ],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md', value: 'H~~2~~O' });

    const paragraph = tree.children?.[0];
    const children = paragraph?.children ?? [];
    const deleted = children[1];

    expect(deleted?.type).to.equal('delete');
    expect(deleted?.data?.hName).to.equal(undefined);
    expect(deleted?.children?.[0]?.value).to.equal('2');
  });

  it('未知のディレクティブはエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::unknown' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] 未対応のディレクティブ "unknown"');
  });

  it('終端がないディレクティブはエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::callout{kind="note"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '閉じ忘れ' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] ディレクティブ "callout" の終端 "::" が見つかりません');
  });

  it('画像属性の zoomable に不正な値が来た場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'image',
              url: 'content/_assets/testing/test-hero.jpg',
              alt: 'sample',
            },
            {
              type: 'text',
              value: '{zoomable="maybe"}',
            },
          ],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] image の zoomable は true/false で指定してください');
  });

  it('link-card の url が無い場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::link-card{title="missing"}' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] link-card の url は必須です');
  });

  it('link-card の未対応属性はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::link-card{url="https://example.com" caption="unsupported"}',
            },
          ],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] link-card 属性 "caption" は未対応です');
  });

  it('画像属性の loading に不正な値が来た場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'image',
              url: 'content/_assets/testing/test-hero.jpg',
              alt: 'sample',
            },
            {
              type: 'text',
              value: '{loading="auto"}',
            },
          ],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] image の loading は lazy/eager のみ指定可能です');
  });

  it('画像属性で caption を指定した場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'image',
              url: 'content/_assets/testing/test-hero.jpg',
              alt: 'sample',
              title: '標準キャプション',
            },
            {
              type: 'text',
              value: '{caption="独自キャプション"}',
            },
          ],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] image 属性 "caption" は未対応です');
  });

  it('code-preview の controls に未知の値が来た場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::code-preview{controls="theme invalid"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '本文' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'code',
          lang: 'ts',
          value: 'const ok = true;',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw(
      '[markdown] code-preview の controls は theme/surface/viewport のみ指定可能です',
    );
  });

  it('code-preview の旧 label 属性は未対応エラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{label="旧入力"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '本文' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'code',
          lang: 'ts',
          value: 'const ok = true;',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] code-preview 属性 "label" は未対応です');
  });

  it('code-preview の controls に重複値が来た場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::code-preview{controls="theme theme"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '本文' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'code',
          lang: 'ts',
          value: 'const ok = true;',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] code-preview の controls で "theme" が重複しています');
  });

  it('code-preview の preview-theme に不正な値が来た場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::code-preview{preview-theme="sepia"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '本文' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'code',
          lang: 'ts',
          value: 'const ok = true;',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw(
      '[markdown] code-preview の preview-theme は page/light/dark のみ指定可能です',
    );
  });

  it('preview-sandbox が code-preview 直下以外にある場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview-sandbox{iframe-title="invalid"}' }],
        },
        {
          type: 'code',
          lang: 'preview-html',
          value: '<button>例</button>',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] preview-sandbox は code-preview の直下でのみ使用できます');
  });

  it('preview-sandbox に preview-html が無い場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{heading="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview-sandbox{iframe-title="invalid"}' }],
        },
        {
          type: 'code',
          lang: 'preview-css',
          value: '.demo { padding: 1rem; }',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] preview-sandbox には preview-html が必須です');
  });

  it('preview-sandbox の preview-html が重複した場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{heading="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview-sandbox{iframe-title="invalid"}' }],
        },
        {
          type: 'code',
          lang: 'preview-html',
          value: '<button>例1</button>',
        },
        {
          type: 'code',
          lang: 'preview-html',
          value: '<button>例2</button>',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] preview-sandbox の preview-html は 1 つだけ指定できます');
  });

  it('allow-js なしで preview-js を使った場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{heading="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview-sandbox{iframe-title="invalid"}' }],
        },
        {
          type: 'code',
          lang: 'preview-html',
          value: '<button>例</button>',
        },
        {
          type: 'code',
          lang: 'preview-js',
          value: 'console.log("x");',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw(
      '[markdown] preview-js を使う場合、preview-sandbox の allow-js="true" が必要です',
    );
  });

  it('preview-sandbox の boolean 属性に不正値が来た場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{heading="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::preview-sandbox{iframe-title="invalid" allow-popups="maybe"}',
            },
          ],
        },
        {
          type: 'code',
          lang: 'preview-html',
          value: '<button>例</button>',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw(
      '[markdown] preview-sandbox の allow-popups は true/false で指定してください',
    );
  });

  it('preview-sandbox を使う code-preview で手書き preview を併用した場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{heading="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '手書き preview' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview-sandbox{iframe-title="invalid"}' }],
        },
        {
          type: 'code',
          lang: 'preview-html',
          value: '<button>例</button>',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] preview と preview-sandbox は同一親の直下で併用できません');
  });

  it('preview-sandbox を使う code-preview で手書き code area を併用した場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{heading="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview-sandbox{iframe-title="invalid"}' }],
        },
        {
          type: 'code',
          lang: 'preview-html',
          value: '<button>例</button>',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'code',
          lang: 'html',
          value: '<button>別の code area</button>',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw(
      '[markdown] preview-sandbox を使う code-preview では手書きの code area を併用できません',
    );
  });

  it('syntax-card family を static source 構造へ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::syntax-card{name="useEffect" kind="Method" heading-level="3"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-signature' }],
        },
        {
          type: 'code',
          lang: 'ts',
          value: 'function useEffect(effect: () => void, deps?: readonly unknown[]): void',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-section{label="パラメータ"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '副作用フックです。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-fields' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::syntax-field{name="effect" type="() => void" required="true"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '副作用本体。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::syntax-field{name="deps" type="readonly unknown[]" required="false" default="[]"}',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '依存配列。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    expect(tree.children).to.have.length(1);
    const syntaxCard = tree.children?.[0];
    expect(syntaxCard?.data?.hName).to.equal('section');
    expect(syntaxCard?.data?.hProperties?.['data-syntax-card-source']).to.equal('true');
    expect(syntaxCard?.data?.hProperties?.['kind']).to.equal('Method');
    expect(syntaxCard?.data?.hProperties?.['name']).to.equal('useEffect');
    expect(syntaxCard?.data?.hProperties?.['data-lang']).to.equal('ts');
    expect(syntaxCard?.data?.hProperties?.['heading-level']).to.equal('3');

    const signature = syntaxCard?.children?.[0];
    expect(signature?.data?.hName).to.equal('pre');
    expect(signature?.data?.hProperties?.['slot']).to.equal('signature');
    expect(signature?.data?.hProperties?.['data-syntax-signature']).to.equal('true');
    expect(signature?.children?.[0]?.value).to.equal(
      'function useEffect(effect: () => void, deps?: readonly unknown[]): void',
    );

    const section = syntaxCard?.children?.[1];
    expect(section?.data?.hName).to.equal('section');
    expect(section?.data?.hProperties?.['data-syntax-section-source']).to.equal('true');
    expect(section?.data?.hProperties?.['label']).to.equal('パラメータ');

    const fields = section?.children?.[1];
    expect(fields?.data?.hName).to.equal('dl');
    const firstField = fields?.children?.[0];
    const secondField = fields?.children?.[1];
    expect(firstField?.data?.hName).to.equal('div');
    expect(firstField?.data?.hProperties?.['data-syntax-field-source']).to.equal('true');
    expect(firstField?.data?.hProperties?.['name']).to.equal('effect');
    expect(firstField?.data?.hProperties?.['required']).to.equal(true);
    expect(secondField?.data?.hName).to.equal('div');
    expect(secondField?.data?.hProperties?.['data-syntax-field-source']).to.equal('true');
    expect(secondField?.data?.hProperties?.['name']).to.equal('deps');
    expect(secondField?.data?.hProperties?.['default']).to.equal('[]');
    expect(secondField?.data?.hProperties?.['required']).to.equal(undefined);
  });

  it('syntax-card の lang が未指定なら syntax-signature の code lang から data-lang を解決すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-card{name="memo"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-signature' }],
        },
        {
          type: 'code',
          lang: 'Bash',
          value: 'echo "hello"',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const syntaxCard = tree.children?.[0];
    expect(syntaxCard?.data?.hProperties?.['data-lang']).to.equal('bash');
  });

  it('syntax-card に syntax-signature がない場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-card{name="useEffect"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-section{label="説明"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '本文。' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] syntax-card には syntax-signature が必須です');
  });

  it('syntax-signature に code block がない場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-card{name="useEffect"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-signature' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'function useEffect() {}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] syntax-signature には fenced code block 1 個が必須です');
  });

  it('syntax-card.lang と syntax-signature の code lang が不一致な場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-card{name="useEffect" lang="ts"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-signature' }],
        },
        {
          type: 'code',
          lang: 'js',
          value: 'function useEffect() {}',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw(
      '[markdown] syntax-card の lang と syntax-signature の code lang が一致していません',
    );
  });

  it('syntax-fields の直下に syntax-field 以外がある場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-card{name="useEffect"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-signature' }],
        },
        {
          type: 'code',
          lang: 'ts',
          value: 'function useEffect() {}',
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-section{label="パラメータ"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::syntax-fields' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '説明文' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::' }],
        },
      ],
    };

    const run = () => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] syntax-fields の直下には syntax-field のみ配置できます');
  });

  it('table ディレクティブを rouaultDirectiveTable source marker へ変換すること', () => {
    const table: MdastNode = {
      type: 'table',
      children: [
        {
          type: 'tableRow',
          children: [{ type: 'tableCell', children: [{ type: 'text', value: '値' }] }],
        },
      ],
    };
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::table{column-widths="fit wide numeric"}' }],
        },
        table,
        { type: 'paragraph', children: [{ type: 'text', value: '::' }] },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const wrapper = tree.children?.[0];
    expect(wrapper?.type).to.equal('rouaultDirectiveTable');
    expect(wrapper?.data?.hName).to.equal('div');
    expect(wrapper?.data?.hProperties?.['data-table-source']).to.equal('true');
    expect(wrapper?.data?.hProperties?.['data-table-column-widths']).to.equal('fit wide numeric');
    expect(wrapper?.children?.[0]?.type).to.equal('table');
  });

  it('table column-widths の未知トークンと comma 区切りは build error にすること', () => {
    for (const source of [
      '::table{column-widths="fit huge"}',
      '::table{column-widths="fit,wide"}',
      '::table{column-widths=""}',
    ]) {
      const tree: MdastNode = {
        type: 'root',
        children: [
          { type: 'paragraph', children: [{ type: 'text', value: source }] },
          { type: 'table', children: [] },
          { type: 'paragraph', children: [{ type: 'text', value: '::' }] },
        ],
      };

      expect(() => {
        remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
      }).to.throw('[markdown] table の column-widths');
    }
  });

  it('table column-widths は順序保持で重複を許可すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::table{column-widths="fit fit wide"}' }],
        },
        { type: 'table', children: [] },
        { type: 'paragraph', children: [{ type: 'text', value: '::' }] },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    expect(tree.children?.[0]?.data?.hProperties?.['data-table-column-widths']).to.equal(
      'fit fit wide',
    );
  });

  it('table ディレクティブが GFM table 1 個だけを包まない場合は validate-structure 経由でエラーにすること', () => {
    const cases: MdastNode[][] = [
      [{ type: 'paragraph', children: [{ type: 'text', value: '本文' }] }],
      [
        { type: 'table', children: [] },
        { type: 'table', children: [] },
      ],
      [
        { type: 'table', children: [] },
        { type: 'paragraph', children: [{ type: 'text', value: '本文' }] },
      ],
    ];

    for (const children of cases) {
      const tree: MdastNode = {
        type: 'root',
        children: [
          { type: 'paragraph', children: [{ type: 'text', value: '::table' }] },
          ...children,
          { type: 'paragraph', children: [{ type: 'text', value: '::' }] },
        ],
      };

      expect(() => {
        remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
      }).to.throw('[markdown] table ディレクティブは GFM table 1 個だけを包んでください');
    }
  });

  it('blank line なしの ::table + GFM table + closing :: が成功すること', () => {
    const tree = parseRouaultDirectiveMdastFromMarkdown(
      [
        '::table{column-widths="fit wide"}',
        '| 名前 | 値 |',
        '| :--- | ---: |',
        '| A | 1 |',
        '::',
      ].join('\n'),
    );

    const wrapper = tree.children?.[0];
    const table = wrapper?.children?.[0] as (MdastNode & { align?: unknown[] }) | undefined;
    expect(wrapper?.type).to.equal('rouaultDirectiveTable');
    expect(table?.type).to.equal('table');
    expect(table?.align).to.deep.equal(['left', 'right']);
  });

  it('recovered closing :: が table data として残らないこと', () => {
    const tree = parseRouaultDirectiveMdastFromMarkdown(
      ['::table', '| 名前 | 値 |', '| --- | --- |', '| A | 1 |', '::'].join('\n'),
    );

    const table = tree.children?.[0]?.children?.[0];
    const cellValues =
      table?.children
        ?.flatMap((row) => row.children ?? [])
        .flatMap((cell) => cell.children ?? [])
        .map((child) => child.value)
        .filter((value): value is string => typeof value === 'string') ?? [];

    expect(cellValues).to.not.include('::');
    expect(cellValues).to.deep.equal(['名前', '値', 'A', '1']);
  });

  it('GFM が補完した空セルを伴う closing marker candidate row を認識すること', () => {
    const tree = parseRouaultDirectiveMdastFromMarkdown(
      ['::table', '| 名前 | 値 |', '| --- | --- |', '| A | 1 |', '| :: |   |'].join('\n'),
    );

    const table = tree.children?.[0]?.children?.[0];
    const rowCount = table?.children?.length;
    const lastRowFirstCellText = table?.children?.[1]?.children?.[0]?.children?.[0]?.value;

    expect(rowCount).to.equal(2);
    expect(lastRowFirstCellText).to.equal('A');
  });

  it('| :: | data | は closing marker として扱わず table-specific missing terminator error を投げること', () => {
    const invalidRows = [
      '| :: | data |',
      '| **::** |   |',
      '| `::` |   |',
      '| [::](x) |   |',
      '| ::: |   |',
    ];

    for (const row of invalidRows) {
      const run = () => {
        parseRouaultDirectiveMdastFromMarkdown(
          ['::table', '| 名前 | 値 |', '| --- | --- |', row].join('\n'),
        );
      };

      expect(run).to.throw('table ディレクティブの終端 "::" が見つかりません');
    }
  });

  it('closing marker candidate row の後に meaningful table row が続く場合は table-specific post-terminator-row error を投げること', () => {
    const run = () => {
      parseRouaultDirectiveMdastFromMarkdown(
        ['::table', '| 名前 | 値 |', '| --- | --- |', '| A | 1 |', '::', '| 後続 | row |'].join(
          '\n',
        ),
      );
    };

    expect(run).to.throw('table ディレクティブの終端 "::" の後に table row が続いています');
  });

  it('::table が GFM table を包まない場合は table-specific error を投げること', () => {
    const run = () => {
      parseRouaultDirectiveMdastFromMarkdown(['::table', '本文です。', '::'].join('\n'));
    };

    expect(run).to.throw('table ディレクティブは GFM table 1 個だけを包んでください');
  });

  it('plain GFM table outside ::table is unaffected であること', () => {
    const tree = parseRouaultDirectiveMdastFromMarkdown(
      ['| 名前 | 値 |', '| --- | --- |', '| A | 1 |', '| :: |   |'].join('\n'),
    );

    const table = tree.children?.[0];
    const lastRowFirstCellText = table?.children?.[2]?.children?.[0]?.children?.[0]?.value;

    expect(table?.type).to.equal('table');
    expect(lastRowFirstCellText).to.equal('::');
  });

  it('wrapper 内の meaningful non-table child は parser で捨てず既存 validator の table-specific structure error にすること', () => {
    const run = () => {
      parseRouaultDirectiveMdastFromMarkdown(
        ['::table', '| 名前 | 値 |', '| --- | --- |', '| A | 1 |', '', '本文です。', '::'].join(
          '\n',
        ),
      );
    };

    expect(run).to.throw('table ディレクティブは GFM table 1 個だけを包んでください');
  });

  it('plain GFM table cell 内の exact {{break}} を br marker へ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'table',
          children: [
            {
              type: 'tableRow',
              children: [
                { type: 'tableCell', children: [{ type: 'text', value: '1行目{{break}}2行目' }] },
              ],
            },
          ],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const cell = tree.children?.[0]?.children?.[0]?.children?.[0];
    expect(cell?.children?.[1]?.type).to.equal('rouaultInlineTableCellBreak');
    expect(cell?.children?.[1]?.data?.hName).to.equal('br');
    expect(cell?.children?.[1]?.data?.hProperties?.['data-table-cell-break']).to.equal('true');
  });

  it('{{break}} 以外の {{...}} 類似テキストは通常テキストとして保持すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'table',
          children: [
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  children: [{ type: 'text', value: '{{foo}} {{ break }} {{BREAK}} {{br}}' }],
                },
              ],
            },
          ],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const cell = tree.children?.[0]?.children?.[0]?.children?.[0];
    expect(cell?.children?.[0]?.value).to.equal('{{foo}} {{ break }} {{BREAK}} {{br}}');
  });

  it('table cell 外および link / linkReference 配下の exact {{break}} は build error にすること', () => {
    const cases: MdastNode[] = [
      { type: 'paragraph', children: [{ type: 'text', value: '前{{break}}後' }] },
      {
        type: 'table',
        children: [
          {
            type: 'tableRow',
            children: [
              {
                type: 'tableCell',
                children: [
                  { type: 'text', value: '前' },
                  {
                    type: 'link',
                    url: 'https://example.com',
                    children: [{ type: 'text', value: '{{break}}' }],
                  },
                  { type: 'text', value: '後' },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'table',
        children: [
          {
            type: 'tableRow',
            children: [
              {
                type: 'tableCell',
                children: [
                  { type: 'text', value: '前' },
                  {
                    type: 'linkReference',
                    identifier: 'ref',
                    referenceType: 'full',
                    children: [{ type: 'text', value: '{{break}}' }],
                  },
                  { type: 'text', value: '後' },
                ],
              },
            ],
          },
        ],
      },
    ];

    for (const child of cases) {
      const tree: MdastNode = { type: 'root', children: [child] };
      expect(() => {
        remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
      }).to.throw('[markdown] {{break}}');
    }
  });

  it('emphasis / strong 配下の {{break}} は変換し、code span 内は変換しないこと', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'table',
          children: [
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  children: [
                    { type: 'text', value: '前' },
                    { type: 'emphasis', children: [{ type: 'text', value: '{{break}}' }] },
                    { type: 'strong', children: [{ type: 'text', value: '後' }] },
                  ],
                },
                {
                  type: 'tableCell',
                  children: [
                    { type: 'inlineCode', value: '{{break}}' },
                    { type: 'text', value: '{{break}}説明' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const firstCell = tree.children?.[0]?.children?.[0]?.children?.[0];
    const secondCell = tree.children?.[0]?.children?.[0]?.children?.[1];
    expect(firstCell?.children?.[1]?.children?.[0]?.type).to.equal('rouaultInlineTableCellBreak');
    expect(secondCell?.children?.[0]?.type).to.equal('inlineCode');
    expect(secondCell?.children?.[0]?.value).to.equal('{{break}}');
    expect(secondCell?.children?.[1]?.type).to.equal('rouaultInlineTableCellBreak');
  });

  it('{{break}} の同一 text node 内 whitespace 隣接と連続を build error にすること', () => {
    for (const value of [
      '1行目 {{break}}2行目',
      '1行目{{break}} 2行目',
      '1行目 {{break}} 2行目',
      '1行目　{{break}}2行目',
      '1行目{{break}}　2行目',
      '1行目{{break}}{{break}}2行目',
    ]) {
      const tree: MdastNode = {
        type: 'root',
        children: [
          {
            type: 'table',
            children: [
              {
                type: 'tableRow',
                children: [{ type: 'tableCell', children: [{ type: 'text', value }] }],
              },
            ],
          },
        ],
      };

      expect(() => {
        remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
      }).to.throw('[markdown] {{break}}');
    }
  });

  it('emphasis / strong 配下でも {{break}} の whitespace 隣接と連続は build error にすること', () => {
    const cases: MdastNode[][] = [
      [{ type: 'emphasis', children: [{ type: 'text', value: '1行目 {{break}}2行目' }] }],
      [{ type: 'emphasis', children: [{ type: 'text', value: '1行目{{break}} 2行目' }] }],
      [{ type: 'emphasis', children: [{ type: 'text', value: '1行目{{break}}{{break}}2行目' }] }],
      [{ type: 'strong', children: [{ type: 'text', value: '1行目 {{break}}2行目' }] }],
      [{ type: 'strong', children: [{ type: 'text', value: '1行目{{break}} 2行目' }] }],
      [{ type: 'strong', children: [{ type: 'text', value: '1行目{{break}}{{break}}2行目' }] }],
    ];

    for (const cellChildren of cases) {
      const tree: MdastNode = {
        type: 'root',
        children: [
          {
            type: 'table',
            children: [
              {
                type: 'tableRow',
                children: [{ type: 'tableCell', children: cellChildren }],
              },
            ],
          },
        ],
      };

      expect(() => {
        remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
      }).to.throw('[markdown] {{break}}');
    }
  });

  it('{{break}} 前後の meaningful inline content を node 境界越しに検査すること', () => {
    const allowedCases: MdastNode[][] = [
      [
        { type: 'text', value: '1行目{{break}}' },
        { type: 'strong', children: [{ type: 'text', value: '2行目' }] },
      ],
      [
        { type: 'strong', children: [{ type: 'text', value: '1行目' }] },
        { type: 'text', value: '{{break}}2行目' },
      ],
      [
        { type: 'inlineCode', value: 'code' },
        { type: 'text', value: '{{break}}説明' },
      ],
      [
        { type: 'link', url: 'https://example.com', children: [{ type: 'text', value: 'リンク' }] },
        { type: 'text', value: '{{break}}説明' },
      ],
    ];

    for (const cellChildren of allowedCases) {
      const tree: MdastNode = {
        type: 'root',
        children: [
          {
            type: 'table',
            children: [
              {
                type: 'tableRow',
                children: [{ type: 'tableCell', children: cellChildren }],
              },
            ],
          },
        ],
      };

      expect(() => {
        remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
      }).not.to.throw();
    }
  });

  it('{{break}} が table cell の実質先頭・実質末尾にある場合は build error にすること', () => {
    const cases: MdastNode[][] = [
      [{ type: 'text', value: '{{break}}先頭' }],
      [{ type: 'text', value: '末尾{{break}}' }],
      [
        { type: 'image', url: 'image.png', alt: '代替テキスト' },
        { type: 'text', value: '{{break}}説明' },
      ],
      [
        { type: 'text', value: '説明{{break}}' },
        { type: 'image', url: 'image.png', alt: '代替テキスト' },
      ],
    ];

    for (const cellChildren of cases) {
      const tree: MdastNode = {
        type: 'root',
        children: [
          {
            type: 'table',
            children: [
              {
                type: 'tableRow',
                children: [{ type: 'tableCell', children: cellChildren }],
              },
            ],
          },
        ],
      };

      expect(() => {
        remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
      }).to.throw('[markdown] {{break}} は table cell の実質先頭または実質末尾');
    }
  });

  it('table cell 内の Markdown hard break は build error にすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'table',
          children: [
            {
              type: 'tableRow',
              children: [
                {
                  type: 'tableCell',
                  children: [
                    { type: 'text', value: '前' },
                    { type: 'break' },
                    { type: 'text', value: '後' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(() => {
      remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });
    }).to.throw('[markdown] Markdown hard break は table cell 内では使用できません');
  });
});
