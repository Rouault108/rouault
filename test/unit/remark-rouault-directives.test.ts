import { expect } from '@open-wc/testing';
import { remarkRouaultDirectives } from '../../lib/remark/rouault-directives.js';

interface MdastNode {
  type: string;
  value?: string;
  lang?: string;
  meta?: string;
  url?: string;
  title?: string | null;
  alt?: string | null;
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

  it('standalone fenced code の meta を正規化すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'ts',
          meta: '{1} filename="sample.ts" label="例" intent="invalid" show-line-numbers="true"',
          value: 'const sample = 1;',
        },
      ],
    };

    remarkRouaultDirectives()(tree, { path: 'content/notes/sample.md' });

    const code = tree.children?.[0];
    expect(code?.data?.hProperties?.['filename']).to.equal('sample.ts');
    expect(code?.data?.hProperties?.['label']).to.equal('例');
    expect(code?.data?.hProperties?.['intent']).to.equal('invalid');
    expect(code?.data?.hProperties?.['show-line-numbers']).to.equal(true);
    expect(code?.data?.hProperties?.['data-shiki-meta']).to.equal(
      '{1} filename="sample.ts" label="例" intent="invalid" show-line-numbers="true"',
    );
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
          children: [
            {
              type: 'text',
              value:
                '::code-preview{label="ボタン例" controls="theme surface viewport" preview-align="stretch" preview-theme="dark" preview-surface="muted" preview-viewport="mobile"}',
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
    expect(preview?.data?.hProperties?.['label']).to.equal('ボタン例');
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
          children: [{ type: 'text', value: '::code-preview{label="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: '::preview-sandbox{title="ボタンの sandbox" allow-js="true" height="160"}',
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
    expect(sandbox?.data?.hProperties?.['title']).to.equal('ボタンの sandbox');
    expect(sandbox?.data?.hProperties?.['allow-js']).to.equal(true);
    expect(sandbox?.data?.hProperties?.['height']).to.equal('160');
    expect(sandbox?.children).to.have.length(3);
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

  it('空行なしで畳まれた code-preview の slot ディレクティブも変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{label="ボタン例"}' }],
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
          children: [{ type: 'text', value: '::tabs{selected-index="0"}' }],
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

  it('空行なしで畳まれた translation ディレクティブも変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                '::translation{lang="fr" target-lang="ja"}\nJe pense, donc je suis.',
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
    expect(translation?.data?.hName).to.equal('ui-translation');
    expect(translation?.data?.hProperties?.['original']).to.equal('Je pense, donc je suis.');
    expect(translation?.data?.hProperties?.['translated']).to.equal('我思う、ゆえに我あり。');
  });

  it('画像直後の属性ブロックから image オプションを img 属性へ変換すること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'image',
              url: '/assets/images/sample.jpg',
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
    expect(image?.data?.hProperties?.['zoomable']).to.equal(false);
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
    const highlight = children.find((child) => child.data?.hName === 'ui-highlight');
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
              url: '/assets/images/sample.jpg',
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

  it('画像属性の loading に不正な値が来た場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'image',
              url: '/assets/images/sample.jpg',
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
              url: '/assets/images/sample.jpg',
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
          children: [{ type: 'text', value: '::preview-sandbox{title="invalid"}' }],
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

    expect(run).to.throw(
      '[markdown] preview-sandbox は code-preview の直下でのみ使用できます',
    );
  });

  it('preview-sandbox に preview-html が無い場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{label="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview-sandbox{title="invalid"}' }],
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
          children: [{ type: 'text', value: '::code-preview{label="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview-sandbox{title="invalid"}' }],
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
          children: [{ type: 'text', value: '::code-preview{label="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview-sandbox{title="invalid"}' }],
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

  it('preview-sandbox を使う code-preview で手書き preview を併用した場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{label="Sandbox例"}' }],
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
          children: [{ type: 'text', value: '::preview-sandbox{title="invalid"}' }],
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
      '[markdown] preview-sandbox を使う code-preview では手書きの preview スロットを併用できません',
    );
  });

  it('preview-sandbox を使う code-preview で手書き code area を併用した場合はエラーにすること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::code-preview{label="Sandbox例"}' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', value: '::preview-sandbox{title="invalid"}' }],
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
});
