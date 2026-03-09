import { expect } from '@open-wc/testing';
import { remarkRouaultDirectives } from '../../lib/remark/rouault-directives.js';

interface MdastNode {
  type: string;
  value?: string;
  lang?: string;
  meta?: string;
  children?: MdastNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
}

describe('remarkRouaultDirectives', () => {
  it('callout ディレクティブを ui-callout ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::callout{kind="warning" title="注意"}' }],
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
    expect(callout?.data?.hName).to.equal('ui-callout');
    expect(callout?.data?.hProperties?.['variant']).to.equal('warning');
    expect(callout?.data?.hProperties?.['title']).to.equal('注意');
    expect(callout?.children?.[0]?.type).to.equal('paragraph');
  });

  it('空行なしで1段落に畳まれた callout も変換できること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::callout{kind="tip" title="補足"}\n本文です。\n::' }],
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    expect(tree.children).to.have.length(1);
    const callout = tree.children?.[0];
    expect(callout?.data?.hName).to.equal('ui-callout');
    expect(callout?.data?.hProperties?.['variant']).to.equal('tip');
    expect(callout?.data?.hProperties?.['title']).to.equal('補足');
    expect(callout?.children?.[0]?.type).to.equal('paragraph');
  });

  it('code-group ディレクティブを ui-code-group ノードへ変換すること', () => {
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
          meta: 'filename="one.ts" label="正しい例"',
          value: 'const one = 1;',
        },
        {
          type: 'code',
          lang: 'ts',
          meta: 'filename="two.ts" label="誤り例"',
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
    expect(group?.data?.hName).to.equal('ui-code-group');
    expect(group?.data?.hProperties?.['aria-label']).to.equal('比較');
    expect(group?.children).to.have.length(2);

    const firstCode = group?.children?.[0];
    const secondCode = group?.children?.[1];
    expect(firstCode?.data?.hProperties?.['filename']).to.equal('one.ts');
    expect(firstCode?.data?.hProperties?.['label']).to.equal('正しい例');
    expect(secondCode?.data?.hProperties?.['filename']).to.equal('two.ts');
    expect(secondCode?.data?.hProperties?.['label']).to.equal('誤り例');
  });

  it('details ディレクティブを ui-details ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::details{aria-label="補足を開閉" summary="補足情報" variant="bordered" open="true" region="true"}',
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
    expect(details?.data?.hName).to.equal('ui-details');
    expect(details?.data?.hProperties?.['aria-label']).to.equal('補足を開閉');
    expect(details?.data?.hProperties?.['summary']).to.equal('補足情報');
    expect(details?.data?.hProperties?.['variant']).to.equal('bordered');
    expect(details?.data?.hProperties?.['open']).to.equal(true);
    expect(details?.data?.hProperties?.['region']).to.equal(true);
  });

  it('info-box ディレクティブを ui-info-box ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::info-box{heading="作品情報" icon="music" heading-level="3" landmark="true" variant="filled"}',
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
    expect(infoBox?.data?.hName).to.equal('ui-info-box');
    expect(infoBox?.data?.hProperties?.['heading']).to.equal('作品情報');
    expect(infoBox?.data?.hProperties?.['icon']).to.equal('music');
    expect(infoBox?.data?.hProperties?.['heading-level']).to.equal('3');
    expect(infoBox?.data?.hProperties?.['landmark']).to.equal(true);
    expect(infoBox?.data?.hProperties?.['variant']).to.equal('filled');
  });

  it('score ディレクティブを ui-score ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::score{src="/scores/a.svg" label="譜例" caption="譜例1" description="詳細説明" aspect-ratio="4/1" loading="eager" primary="true"}',
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

    const score = tree.children?.[0];
    expect(score?.data?.hName).to.equal('ui-score');
    expect(score?.data?.hProperties?.['src']).to.equal('/scores/a.svg');
    expect(score?.data?.hProperties?.['label']).to.equal('譜例');
    expect(score?.data?.hProperties?.['caption']).to.equal('譜例1');
    expect(score?.data?.hProperties?.['description']).to.equal('詳細説明');
    expect(score?.data?.hProperties?.['aspect-ratio']).to.equal('4/1');
    expect(score?.data?.hProperties?.['loading']).to.equal('eager');
    expect(score?.data?.hProperties?.['primary']).to.equal(true);
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
                '::tabs{selected-index="1" selected-value="details" orientation="vertical" automatic-activation="true"}',
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
    expect(tabs?.data?.hProperties?.['selected-index']).to.equal('1');
    expect(tabs?.data?.hProperties?.['selected-value']).to.equal('details');
    expect(tabs?.data?.hProperties?.['orientation']).to.equal('vertical');
    expect(tabs?.data?.hProperties?.['automatic-activation']).to.equal(true);
    expect(tabs?.children).to.have.length(4);

    const firstTab = tabs?.children?.[0];
    const firstPanel = tabs?.children?.[1];
    expect(firstTab?.data?.hName).to.equal('div');
    expect(firstTab?.data?.hProperties?.['slot']).to.equal('tab');
    expect(firstTab?.data?.hProperties?.['value']).to.equal('overview');
    expect(firstPanel?.data?.hName).to.equal('div');
    expect(firstPanel?.data?.hProperties?.['slot']).to.equal('panel');
  });

  it('code-preview と preview/toolbar スロットディレクティブを変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{label="ボタン例" preview-align="stretch"}' }],
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
    expect(preview?.data?.hProperties?.['label']).to.equal('ボタン例');
    expect(preview?.data?.hProperties?.['preview-align']).to.equal('stretch');
    expect(preview?.children?.[0]?.data?.hProperties?.['slot']).to.equal('preview');
    expect(preview?.children?.[1]?.data?.hProperties?.['slot']).to.equal('toolbar');
    expect(preview?.children?.[2]?.type).to.equal('code');
  });

  it('translation ディレクティブを ui-translation ノードへ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::translation{lang="fr" target-lang="ja" render-mode="drawer" open="true" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}',
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
    expect(translation?.data?.hProperties?.['render-mode']).to.equal('drawer');
    expect(translation?.data?.hProperties?.['open']).to.equal(true);
    expect(translation?.data?.hProperties?.['original']).to.equal('Je pense, donc je suis.');
    expect(translation?.data?.hProperties?.['translated']).to.equal('我思う、ゆえに我あり。');
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
    const highlight = children.find((child) => child.data?.hName === 'ui-search-highlight');
    const emoji = children.find((child) => child.type === 'rouaultInlineEmoji');
    const lastText = children[children.length - 1];

    expect(sub?.children?.[0]?.value).to.equal('2');
    expect(sup?.children?.[0]?.value).to.equal('2');
    expect(highlight?.children?.[0]?.value).to.equal('重要');
    expect(highlight?.data?.hProperties?.['origin']).to.equal('user');
    expect(emoji?.children?.[0]?.value).to.equal('😀');
    expect(emoji?.data?.hProperties?.['aria-label']).to.equal('笑顔');
    expect(lastText?.value).to.contain('✨');
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
});
