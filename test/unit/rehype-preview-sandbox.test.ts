import { expect } from '@open-wc/testing';

import { rehypePreviewSandbox } from '../../lib/rehype/preview-sandbox.js';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const createCodeBlock = (
  language: string,
  source: string,
  properties: Record<string, unknown> = {},
): HastNode => ({
  type: 'element',
  tagName: 'pre',
  properties: {},
  children: [
    {
      type: 'element',
      tagName: 'code',
      properties: {
        className: [`language-${language}`],
        ...properties,
      },
      children: [{ type: 'text', value: source }],
    },
  ],
});

describe('rehypePreviewSandbox', () => {
  it('preview-sandbox を template と自動 code area へ展開すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-code-preview',
          properties: { label: 'Sandbox例' },
          children: [
            {
              type: 'element',
              tagName: 'ui-preview-sandbox',
              properties: {
                slot: 'preview',
                title: 'ボタンの sandbox',
                'allow-js': true,
                'allow-forms': true,
                'allow-downloads': true,
                'allow-pointer-lock': true,
                'allow-popups': true,
                height: '160',
              },
              children: [
                createCodeBlock('preview-html', '<button class="demo">押す</button>', {
                  filename: 'button.html',
                }),
                createCodeBlock('preview-css', '.demo { padding: 1rem; }', {
                  filename: 'button.css',
                }),
                createCodeBlock('preview-js', 'console.log("sandbox");', {
                  filename: 'button.js',
                }),
              ],
            },
          ],
        },
      ],
    };

    rehypePreviewSandbox()(tree);

    const preview = tree.children?.[0];
    expect(preview?.tagName).to.equal('ui-code-preview');
    expect(preview?.children).to.have.length(2);

    const sandbox = preview?.children?.[0];
    expect(sandbox?.tagName).to.equal('ui-preview-sandbox');
    expect(sandbox?.children).to.have.length(3);
    expect(sandbox?.children?.[0]?.tagName).to.equal('template');
    expect(sandbox?.children?.[0]?.properties?.['data-preview-kind']).to.equal('html');
    expect(sandbox?.children?.[0]?.children?.[0]?.value).to.equal('<button class="demo">押す</button>');
    expect(sandbox?.properties?.['allow-js']).to.equal(true);
    expect(sandbox?.properties?.['allow-forms']).to.equal(true);
    expect(sandbox?.properties?.['allow-downloads']).to.equal(true);
    expect(sandbox?.properties?.['allow-pointer-lock']).to.equal(true);
    expect(sandbox?.properties?.['allow-popups']).to.equal(true);
    expect(sandbox?.properties?.['height']).to.equal('160');

    const codeGroup = preview?.children?.[1];
    expect(codeGroup?.tagName).to.equal('ui-code-group');
    expect(codeGroup?.properties?.['aria-label']).to.equal('Sandbox例 のコード例');
    expect(codeGroup?.children).to.have.length(3);

    const firstGeneratedCode = codeGroup?.children?.[0]?.children?.[0];
    expect(codeGroup?.children?.[0]?.tagName).to.equal('pre');
    expect(firstGeneratedCode?.properties?.['className']).to.deep.equal(['language-html']);
    expect(firstGeneratedCode?.properties?.['filename']).to.equal('button.html');
  });

  it('snippet が 1 個だけの場合は単一 code block を生成すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-code-preview',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'ui-preview-sandbox',
              properties: { slot: 'preview', title: 'HTML only' },
              children: [createCodeBlock('preview-html', '<button>例</button>')],
            },
          ],
        },
      ],
    };

    rehypePreviewSandbox()(tree);

    const preview = tree.children?.[0];
    const generated = preview?.children?.[1];
    expect(generated?.tagName).to.equal('pre');
    expect(generated?.children?.[0]?.tagName).to.equal('code');
    expect(generated?.children?.[0]?.properties?.['filename']).to.equal('preview.html');
  });

  it('既存 meta を自動生成 code に引き継ぐこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-code-preview',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'ui-preview-sandbox',
              properties: { slot: 'preview', title: 'CSS only' },
              children: [
                createCodeBlock('preview-html', '<button>例</button>'),
                createCodeBlock('preview-css', '.demo {}', {
                  label: '装飾',
                  intent: 'valid',
                  'show-line-numbers': true,
                }),
              ],
            },
          ],
        },
      ],
    };

    rehypePreviewSandbox()(tree);

    const preview = tree.children?.[0];
    const codeGroup = preview?.children?.[1];
    const cssCode = codeGroup?.children?.[1]?.children?.[0];

    expect(cssCode?.properties?.['label']).to.equal('装飾');
    expect(cssCode?.properties?.['intent']).to.equal('valid');
    expect(cssCode?.properties?.['show-line-numbers']).to.equal(true);
    expect(cssCode?.properties?.['filename']).to.equal('preview.css');
  });
});
