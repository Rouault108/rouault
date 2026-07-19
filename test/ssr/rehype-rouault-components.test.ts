import path from 'node:path';
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

const getClassList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const getTextContent = (node: HastNode | undefined): string => {
  if (!node) {
    return '';
  }
  if (typeof node.value === 'string') {
    return node.value;
  }
  return (node.children ?? []).map((child) => getTextContent(child)).join('');
};

const countOccurrences = (source: string, pattern: string): number =>
  source.split(pattern).length - 1;

const createPreviewSandboxTree = (properties: Record<string, unknown> = {}): HastNode => ({
  type: 'root',
  children: [
    {
      type: 'element',
      tagName: 'ui-preview-sandbox',
      properties,
      children: [],
    },
  ],
});

const normalizePreviewSandbox = (properties: Record<string, unknown> = {}): HastNode => {
  const tree = createPreviewSandboxTree(properties);
  rehypeRouaultComponents()(tree);
  const sandbox = tree.children?.[0];
  if (!sandbox) {
    throw new Error('ui-preview-sandbox fixture was not found');
  }
  return sandbox;
};

const emptyPreviewPayloadTemplatePattern =
  /<template\b[^>]*data-preview-kind="(?:html|css|js)"[^>]*>\s*<\/template>/;

const previewSandboxTemplatePayloadHtml = `
  <ui-preview-sandbox iframe-title="Preview sandbox" allow-js>
    <template data-preview-kind="html">&lt;button class="demo-button"&gt;押す&lt;/button&gt;</template>
    <template data-preview-kind="css">.demo-button { padding: 0.5rem; }</template>
    <template data-preview-kind="js">console.log("sandbox");</template>
  </ui-preview-sandbox>
`;

const withScoreSvgFixture = (test: (fixturePath: string, notePath: string) => void): void => {
  test('test/fixtures/score/basic.svg', path.join(process.cwd(), 'content/notes/sample.md'));
};

const createRawFootnoteRef = (refId: string, index: string, instanceSuffix = ''): HastNode => ({
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

  it('通常 ui-preview-sandbox は sandboxed/visible を持ち activation-policy は出力しないこと', () => {
    const sandbox = normalizePreviewSandbox();

    expect(sandbox.properties?.['data-hydration-capability']).to.equal('sandboxed');
    expect(sandbox.properties?.['data-hydration-trigger']).to.equal('visible');
    expect(sandbox.properties?.['activation-policy']).to.equal(undefined);
  });

  it('明示 activation-policy="visible" は維持し sandboxed/visible を持つこと', () => {
    const sandbox = normalizePreviewSandbox({ 'activation-policy': 'visible' });

    expect(sandbox.properties?.['activation-policy']).to.equal('visible');
    expect(sandbox.properties?.['data-hydration-capability']).to.equal('sandboxed');
    expect(sandbox.properties?.['data-hydration-trigger']).to.equal('visible');
  });

  it('activation-policy="eager" は sandboxed/initial を持つこと', () => {
    const sandbox = normalizePreviewSandbox({ 'activation-policy': 'eager' });

    expect(sandbox.properties?.['activation-policy']).to.equal('eager');
    expect(sandbox.properties?.['data-hydration-capability']).to.equal('sandboxed');
    expect(sandbox.properties?.['data-hydration-trigger']).to.equal('initial');
  });

  it('activation-policy="manual" は sandboxed/interaction を持つこと', () => {
    const sandbox = normalizePreviewSandbox({ 'activation-policy': 'manual' });

    expect(sandbox.properties?.['activation-policy']).to.equal('manual');
    expect(sandbox.properties?.['data-hydration-capability']).to.equal('sandboxed');
    expect(sandbox.properties?.['data-hydration-trigger']).to.equal('interaction');
  });

  it('manual-only capability ありなら activation-policy="manual" を明示し sandboxed/interaction を持つこと', () => {
    const sandbox = normalizePreviewSandbox({ 'allow-forms': true });

    expect(sandbox.properties?.['allow-forms']).to.equal(true);
    expect(sandbox.properties?.['activation-policy']).to.equal('manual');
    expect(sandbox.properties?.['data-hydration-capability']).to.equal('sandboxed');
    expect(sandbox.properties?.['data-hydration-trigger']).to.equal('interaction');
  });

  it('manual-only capability と activation-policy="visible"/"eager" の併用はエラーにすること', () => {
    for (const activationPolicy of ['visible', 'eager']) {
      const run = (): void => {
        normalizePreviewSandbox({
          'allow-forms': true,
          'activation-policy': activationPolicy,
        });
      };

      expect(run).to.throw(
        'ui-preview-sandbox の allow-forms/allow-downloads/allow-pointer-lock/allow-popups は activation-policy="manual" でのみ使用できます',
      );
    }
  });

  it('raw HAST の activation-policy は exact lowercase の visible/eager/manual だけを許可すること', () => {
    for (const activationPolicy of ['visible', 'eager', 'manual']) {
      const sandbox = normalizePreviewSandbox({ 'activation-policy': activationPolicy });
      expect(sandbox.properties?.['activation-policy']).to.equal(activationPolicy);
    }

    for (const activationPolicy of [
      ' manual ',
      'Manual',
      'VISIBLE',
      'auto',
      '',
      1,
      true,
      {},
      [],
      () => undefined,
      Symbol('activation-policy'),
      BigInt(1),
    ]) {
      const run = (): void => {
        normalizePreviewSandbox({ 'activation-policy': activationPolicy });
      };

      expect(run).to.throw(
        'ui-preview-sandbox の activation-policy は exact lowercase の visible/eager/manual のみ指定できます',
      );
    }
  });

  it('raw HAST の content-layout は kebab/camel を canonical kebab-case へ正規化し、未指定時は追加しないこと', () => {
    for (const contentLayout of ['stage', 'flow']) {
      const sandbox = normalizePreviewSandbox({ 'content-layout': contentLayout });
      expect(sandbox.properties?.['content-layout']).to.equal(contentLayout);
    }

    const camelSandbox = normalizePreviewSandbox({ contentLayout: 'flow' });
    expect(camelSandbox.properties?.['content-layout']).to.equal('flow');
    expect(camelSandbox.properties?.['contentLayout']).to.equal(undefined);

    const matchingSandbox = normalizePreviewSandbox({
      'content-layout': 'stage',
      contentLayout: 'stage',
    });
    expect(matchingSandbox.properties?.['content-layout']).to.equal('stage');
    expect(matchingSandbox.properties?.['contentLayout']).to.equal(undefined);

    const unspecifiedSandbox = normalizePreviewSandbox();
    expect(unspecifiedSandbox.properties?.['content-layout']).to.equal(undefined);
  });

  it('raw HAST の content-layout の kebab/camel 競合はエラーにすること', () => {
    const run = (): void => {
      normalizePreviewSandbox({ 'content-layout': 'stage', contentLayout: 'flow' });
    };

    expect(run).to.throw('ui-preview-sandbox の content-layout 指定が競合しています');
  });

  it('raw HAST の content-layout は uppercase、前後空白、空文字列、非文字列、列挙外値をエラーにすること', () => {
    for (const contentLayout of ['Stage', ' stage ', '', 1, 'center']) {
      const run = (): void => {
        normalizePreviewSandbox({ 'content-layout': contentLayout });
      };

      expect(run).to.throw(
        'ui-preview-sandbox の content-layout は exact lowercase の stage/flow のみ指定できます',
      );
    }
  });

  it('raw HAST の boolean presence 属性を厳格に解釈して kebab-case へ正規化すること', () => {
    for (const value of ['', 'allow-js', 'true', true]) {
      const sandbox = normalizePreviewSandbox({ allowJs: value });
      expect(sandbox.properties?.['allow-js']).to.equal(true);
      expect(sandbox.properties?.['allowJs']).to.equal(undefined);
    }

    for (const value of [undefined, null, false]) {
      const sandbox = normalizePreviewSandbox({ 'allow-js': value });
      expect(sandbox.properties?.['allow-js']).to.equal(undefined);
      expect(sandbox.properties?.['allowJs']).to.equal(undefined);
    }
  });

  it('raw HAST の boolean presence 属性の曖昧値と異常型はエラーにすること', () => {
    for (const value of [
      'false',
      '0',
      'off',
      'no',
      '1',
      'on',
      'allowJs',
      'maybe',
      0,
      1,
      {},
      [],
      () => undefined,
      Symbol('allow-js'),
      BigInt(1),
    ]) {
      const run = (): void => {
        normalizePreviewSandbox({ allowJs: value });
      };

      expect(run).to.throw('ui-preview-sandbox の allowJs は boolean presence 属性として指定してください');
    }
  });

  it('allow-js 単独と activation-policy の各組み合わせを許可すること', () => {
    const defaultSandbox = normalizePreviewSandbox({ 'allow-js': true });
    expect(defaultSandbox.properties?.['data-hydration-trigger']).to.equal('visible');
    expect(defaultSandbox.properties?.['activation-policy']).to.equal(undefined);

    const visibleSandbox = normalizePreviewSandbox({
      'allow-js': true,
      'activation-policy': 'visible',
    });
    expect(visibleSandbox.properties?.['activation-policy']).to.equal('visible');
    expect(visibleSandbox.properties?.['data-hydration-trigger']).to.equal('visible');

    const eagerSandbox = normalizePreviewSandbox({
      'allow-js': true,
      'activation-policy': 'eager',
    });
    expect(eagerSandbox.properties?.['data-hydration-trigger']).to.equal('initial');

    const manualSandbox = normalizePreviewSandbox({
      'allow-js': true,
      'activation-policy': 'manual',
    });
    expect(manualSandbox.properties?.['data-hydration-trigger']).to.equal('interaction');
  });

  it('allow-js と manual-only capability が併存すると manual-only capability の規則を優先すること', () => {
    const sandbox = normalizePreviewSandbox({ 'allow-js': true, 'allow-forms': true });
    expect(sandbox.properties?.['activation-policy']).to.equal('manual');
    expect(sandbox.properties?.['data-hydration-trigger']).to.equal('interaction');

    const manualSandbox = normalizePreviewSandbox({
      'allow-js': true,
      'allow-forms': true,
      'activation-policy': 'manual',
    });
    expect(manualSandbox.properties?.['data-hydration-trigger']).to.equal('interaction');

    for (const activationPolicy of ['visible', 'eager']) {
      const run = (): void => {
        normalizePreviewSandbox({
          'allow-js': true,
          'allow-forms': true,
          'activation-policy': activationPolicy,
        });
      };
      expect(run).to.throw(
        'ui-preview-sandbox の allow-forms/allow-downloads/allow-pointer-lock/allow-popups は activation-policy="manual" でのみ使用できます',
      );
    }
  });

  it('preview sandbox の旧 hydration 属性と camelCase 入力は build-owned な kebab-case 出力へ正規化すること', () => {
    const sandbox = normalizePreviewSandbox({
      activationPolicy: 'eager',
      allowJs: 'allow-js',
      dataHydrationCapability: 'interactive',
      dataHydrationTrigger: 'interaction',
    });

    expect(sandbox.properties?.['activation-policy']).to.equal('eager');
    expect(sandbox.properties?.['activationPolicy']).to.equal(undefined);
    expect(sandbox.properties?.['allow-js']).to.equal(true);
    expect(sandbox.properties?.['allowJs']).to.equal(undefined);
    expect(sandbox.properties?.['data-hydration-capability']).to.equal('sandboxed');
    expect(sandbox.properties?.['dataHydrationCapability']).to.equal(undefined);
    expect(sandbox.properties?.['data-hydration-trigger']).to.equal('initial');
    expect(sandbox.properties?.['dataHydrationTrigger']).to.equal(undefined);
  });

  it('通常 preview に旧 data-hydration-trigger="interaction" があっても visible へ正規化すること', () => {
    const sandbox = normalizePreviewSandbox({
      'data-hydration-trigger': 'interaction',
      'data-hydration-capability': 'interactive',
    });

    expect(sandbox.properties?.['data-hydration-capability']).to.equal('sandboxed');
    expect(sandbox.properties?.['data-hydration-trigger']).to.equal('visible');
  });

  it('activation-policy と boolean 属性の kebab/camel 競合はエラーにすること', () => {
    const activationRun = (): void => {
      normalizePreviewSandbox({ 'activation-policy': 'manual', activationPolicy: 'visible' });
    };
    expect(activationRun).to.throw('ui-preview-sandbox の activation-policy 指定が競合しています');

    const booleanRun = (): void => {
      normalizePreviewSandbox({ 'allow-js': true, allowJs: false });
    };
    expect(booleanRun).to.throw('ui-preview-sandbox の allow-js/allowJs 指定が競合しています');
  });

  it('build output として manual+visible/manual+initial を出力しないこと', () => {
    for (const properties of [
      { 'activation-policy': 'manual' },
      { 'allow-forms': true },
      { 'activation-policy': 'visible' },
      { 'activation-policy': 'eager' },
      {},
    ]) {
      const sandbox = normalizePreviewSandbox(properties);
      if (sandbox.properties?.['activation-policy'] === 'manual') {
        expect(sandbox.properties?.['data-hydration-trigger']).to.equal('interaction');
      }
    }
  });

  it('汎用 hydration directive は preview sandbox 以外では既存属性を温存すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-translation',
          properties: {
            'data-hydration-capability': 'interactive',
            'data-hydration-trigger': 'interaction',
          },
          children: [],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const translation = tree.children?.[0];
    expect(translation?.properties?.['data-hydration-capability']).to.equal('interactive');
    expect(translation?.properties?.['data-hydration-trigger']).to.equal('interaction');
  });

  it('details source を native details と static chevron icon へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'details',
          properties: {
            'data-details-source': 'true',
            summary: '補足',
            open: true,
          },
          children: [
            {
              type: 'element',
              tagName: 'p',
              children: [{ type: 'text', value: '本文' }],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const details = tree.children?.[0];
    const summary = details?.children?.[0];
    const body = details?.children?.[1];
    const chevron = summary?.children?.[0];
    const summaryContent = summary?.children?.[1];

    expect(details?.tagName).to.equal('details');
    expect(getClassList(details?.properties?.['className'])).to.deep.equal(['details-block']);
    expect(details?.properties?.['data-details']).to.equal('true');
    expect(details?.properties?.['data-details-source']).to.equal(undefined);
    expect(details?.properties?.['summary']).to.equal(undefined);
    expect(details?.properties?.['open']).to.equal(true);
    expect(details?.properties?.['data-variant']).to.equal(undefined);
    expect(summary?.tagName).to.equal('summary');
    expect(getClassList(summary?.properties?.['className'])).to.deep.equal([
      'details-block__summary',
    ]);
    expect(getClassList(chevron?.properties?.['className'])).to.deep.equal([
      'details-block__chevron',
      'static-icon',
    ]);
    expect(chevron?.properties?.['aria-hidden']).to.equal('true');
    expect(chevron?.children?.[0]?.tagName).to.equal('svg');
    expect(getClassList(summaryContent?.properties?.['className'])).to.deep.equal([
      'details-block__summary-content',
    ]);
    expect(getTextContent(summaryContent)).to.equal('補足');
    expect(body?.tagName).to.equal('div');
    expect(getClassList(body?.properties?.['className'])).to.deep.equal(['details-block__body']);
    expect(findElement(tree, (node) => node.tagName === 'ui-details')).to.equal(undefined);
  });

  it('translation fallback Light DOM を保持し hydration 注釈を付与すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-translation',
          properties: {
            lang: 'fr',
            'target-lang': 'ja',
            original: 'Je pense, donc je suis.',
            translated: '我思う、ゆえに我あり。',
            surface: 'drawer',
          },
          children: [
            {
              type: 'element',
              tagName: 'details',
              properties: {
                className: ['translation-overlay-fallback'],
                'data-translation-fallback': true,
              },
              children: [
                {
                  type: 'element',
                  tagName: 'summary',
                  properties: {
                    'data-translation-fallback-trigger': true,
                    lang: 'fr',
                  },
                  children: [{ type: 'text', value: 'Je pense, donc je suis.' }],
                },
                {
                  type: 'element',
                  tagName: 'p',
                  properties: {
                    'data-translation-fallback-content': true,
                    lang: 'ja',
                  },
                  children: [{ type: 'text', value: '我思う、ゆえに我あり。' }],
                },
              ],
            },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const translation = tree.children?.[0];
    const fallback = findElement(
      translation,
      (node) => node.properties?.['data-translation-fallback'] === true,
    );

    expect(translation?.tagName).to.equal('ui-translation');
    expect(translation?.properties?.['data-hydration-capability']).to.equal('interactive');
    expect(translation?.properties?.['data-hydration-trigger']).to.equal('visible');
    expect(fallback?.tagName).to.equal('details');
    expect(getTextContent(fallback)).to.contain('Je pense, donc je suis.');
    expect(getTextContent(fallback)).to.contain('我思う、ゆえに我あり。');
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

  it('camelCase hProperties の table source を child traversal 前に static table root へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            dataTableSource: 'true',
            dataTableColumnWidths: 'fit wide',
          },
          children: [
            {
              type: 'element',
              tagName: 'table',
              children: [
                {
                  type: 'element',
                  tagName: 'thead',
                  children: [
                    {
                      type: 'element',
                      tagName: 'tr',
                      children: [
                        {
                          type: 'element',
                          tagName: 'th',
                          children: [{ type: 'text', value: '名前' }],
                        },
                        {
                          type: 'element',
                          tagName: 'th',
                          children: [{ type: 'text', value: '値' }],
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

    const first = tree.children?.[0];
    const table = first?.children?.[0];
    const colgroup = table?.children?.[0];

    expect(first?.tagName).to.equal('div');
    expect(first?.properties?.['data-table-root']).to.equal('true');
    expect(first?.properties?.['dataTableSource']).to.equal(undefined);
    expect(first?.properties?.['dataTableColumnWidths']).to.equal(undefined);
    expect(table?.tagName).to.equal('table');
    expect(colgroup?.tagName).to.equal('colgroup');
    expect(
      colgroup?.children?.map((child) => child.properties?.['data-table-col-width']),
    ).to.deep.equal(['fit', 'wide']);
    expect(
      findElements(first, (node) => node.properties?.['data-table-root'] === 'true'),
    ).to.have.length(1);
  });

  it('native blockquote と divider を静的本文要素へ正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'blockquote',
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

  it('旧 static-first ui-* 入力は互換変換せず build error にすること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-blockquote',
          children: [{ type: 'element', tagName: 'p', children: [{ type: 'text', value: 'q' }] }],
        },
      ],
    };

    expect(() => rehypeRouaultComponents()(tree)).to.throw(
      '[markdown] ui-blockquote は static-first 化済みのため入力できません',
    );
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

  it('保存前 surface HTML 正規化は preview sandbox template payload を保持すること', () => {
    const normalized = normalizeRouaultStaticSurfaceHtml(previewSandboxTemplatePayloadHtml) ?? '';

    expect(normalized).toContain('data-preview-kind="html"');
    expect(normalized).toContain('data-preview-kind="css"');
    expect(normalized).toContain('data-preview-kind="js"');
    expect(normalized).toContain('demo-button');
    expect(normalized).toContain('.demo-button { padding: 0.5rem; }');
    expect(normalized).toContain('console.log("sandbox");');
    expect(normalized).not.toMatch(emptyPreviewPayloadTemplatePattern);
  });

  it('保存前 surface HTML 正規化は preview sandbox template payload について冪等であること', () => {
    const once = normalizeRouaultStaticSurfaceHtml(previewSandboxTemplatePayloadHtml) ?? '';
    const twice = normalizeRouaultStaticSurfaceHtml(once) ?? '';

    expect(twice).toBe(once);
    expect(twice).toContain('demo-button');
    expect(twice).not.toMatch(emptyPreviewPayloadTemplatePattern);
  });

  it('保存前 surface HTML 正規化は通常の template 内容を保持すること', () => {
    const html = `
      <div>
        <template data-generic-template="true">
          <span class="template-content">保持される内容</span>
        </template>
      </div>
    `;

    const normalized = normalizeRouaultStaticSurfaceHtml(html) ?? '';

    expect(normalized).toContain('data-generic-template="true"');
    expect(normalized).toContain('template-content');
    expect(normalized).toContain('保持される内容');
    expect(normalized).not.toMatch(
      /<template\b[^>]*data-generic-template="true"[^>]*>\s*<\/template>/,
    );
  });

  it('保存前 surface HTML の data-table-source を static table root に正規化すること', () => {
    const html = `
      <div data-table-source="true" data-table-column-widths="fit wide numeric">
        <table>
          <thead>
            <tr><th>項目</th><th>説明</th><th>点数</th></tr>
          </thead>
          <tbody>
            <tr><td>A</td><td>B</td><td>1</td></tr>
          </tbody>
        </table>
      </div>
    `;

    const normalized = normalizeRouaultStaticSurfaceHtml(html) ?? '';

    expect(normalized).toContain('data-table-root="true"');
    expect(normalized).toContain('role="region"');
    expect(normalized).toContain('tabindex="0"');
    expect(normalized).toContain('aria-label="Data table"');
    expect(normalized).not.toContain('data-table-source');
    expect(normalized).not.toContain('data-table-column-widths');
    expect(normalized).toContain('<colgroup>');
    expect(normalized).toContain('data-table-col-width="fit"');
    expect(normalized).toContain('data-table-col-width="wide"');
    expect(normalized).toContain('data-table-col-width="numeric"');
  });

  it('保存前 surface HTML の table source column-widths 数不一致は既存 error にすること', () => {
    const html = `
      <div data-table-source="true" data-table-column-widths="fit wide numeric">
        <table>
          <thead>
            <tr><th>項目</th><th>説明</th></tr>
          </thead>
        </table>
      </div>
    `;

    expect(() => normalizeRouaultStaticSurfaceHtml(html)).toThrow(
      '[markdown] table の column-widths 数は table 列数と一致する必要があります',
    );
  });

  it('保存前 surface HTML の table source に意味のある非 table 子があれば既存 error にすること', () => {
    const html = `
      <div data-table-source="true">
        <p>本文</p>
        <table><tbody><tr><td>A</td></tr></tbody></table>
      </div>
    `;

    expect(() => normalizeRouaultStaticSurfaceHtml(html)).toThrow(
      '[markdown] table source は GFM table 1 個だけを含む必要があります',
    );
  });

  it('保存前 surface HTML の plain table 正規化契約を維持すること', () => {
    const html = `
      <table density="compact">
        <caption>売上データ</caption>
        <tbody><tr><td>A</td></tr></tbody>
      </table>
    `;

    const normalized = normalizeRouaultStaticSurfaceHtml(html) ?? '';

    expect(normalized).toContain('data-table-root="true"');
    expect(normalized).toContain('data-density="compact"');
    expect(normalized).toContain('aria-label="売上データ"');
    expect(normalized).toContain('<table density="compact">');
    expect(normalized).toContain('<caption>売上データ</caption>');
  });

  it('保存前 surface HTML の table source 正規化が冪等であること', () => {
    const html = `
      <div data-table-source="true" data-table-column-widths="fit wide numeric">
        <table>
          <thead>
            <tr><th>項目</th><th>説明</th><th>点数</th></tr>
          </thead>
          <tbody>
            <tr><td>A</td><td>B</td><td>1</td></tr>
          </tbody>
        </table>
      </div>
    `;

    const once = normalizeRouaultStaticSurfaceHtml(html) ?? '';
    const twice = normalizeRouaultStaticSurfaceHtml(once) ?? '';

    expect(twice).toBe(once);
    expect(countOccurrences(twice, 'data-table-root="true"')).toBe(1);
    expect(countOccurrences(twice, '<colgroup>')).toBe(1);
    expect(countOccurrences(twice, 'data-table-col-width=')).toBe(3);
  });

  it('保存前 surface HTML 正規化が冪等であること', () => {
    const html = `
      <aside data-callout="true" data-callout-kind="note" data-callout-heading="補助情報">
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
        <div data-image-preview-frame="true" class="image-preview-frame">
          <img src="/static/example.png" alt="example image">
          <button hidden type="button" data-image-zoom-trigger="true" class="image-preview-trigger" aria-label="画像を拡大して表示: example image" aria-haspopup="dialog">
            <span class="image-zoom-trigger__icon static-icon" aria-hidden="true"><svg></svg></span>
          </button>
        </div>
      </figure>
    `;

    const normalized = normalizeRouaultStaticSurfaceHtml(html) ?? '';

    expect(normalized).toContain('data-image="true"');
    expect(normalized).toContain('/static/example.png');
    expect(normalized).not.toContain('content/_assets');
    expect(normalized).not.toContain('examples/media');
  });

  it('zoomable image は preview frame 内の img と hidden overlay trigger へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'img',
          properties: {
            src: 'content/_assets/example.png',
            alt: '譜面画像',
            title: '図版キャプション',
          },
          children: [],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const figure = findElement(tree, (node) => node.tagName === 'figure');
    const directChildren = figure?.children?.filter((child) => child.type === 'element') ?? [];
    const previewFrame = directChildren.find(
      (node) => node.properties?.['data-image-preview-frame'] === 'true',
    );
    const frameChildren = previewFrame?.children?.filter((child) => child.type === 'element') ?? [];
    const trigger = findElement(
      previewFrame,
      (node) => node.properties?.['data-image-zoom-trigger'] === 'true',
    );
    const triggerIcon = findElement(trigger, (node) =>
      getClassList(node.properties?.['className']).includes('image-zoom-trigger__icon'),
    );
    const img = findElement(previewFrame, (node) => node.tagName === 'img');
    const picture = findElement(figure, (node) => node.tagName === 'picture');
    const caption = findElement(figure, (node) => node.tagName === 'figcaption');

    expect(figure?.properties?.['data-image']).to.equal('true');
    expect(figure?.properties?.['data-image-zoomable']).to.equal('true');
    expect(figure?.properties?.['data-hydration-key']).to.equal('image-lightbox-enhancer');
    expect(directChildren.filter((node) => node.tagName === 'img')).to.have.length(0);
    expect(previewFrame?.tagName).to.equal('div');
    expect(frameChildren[0]?.tagName).to.equal('img');
    expect(frameChildren[1]).to.equal(trigger);
    expect(trigger?.tagName).to.equal('button');
    expect(trigger?.properties?.['hidden']).to.equal(true);
    expect(trigger?.properties?.['type']).to.equal('button');
    expect(trigger?.properties?.['aria-label']).to.equal('画像を拡大して表示: 譜面画像');
    expect(trigger?.properties?.['aria-haspopup']).to.equal('dialog');
    expect(triggerIcon?.tagName).to.equal('span');
    expect(triggerIcon?.properties?.['aria-hidden']).to.equal('true');
    expect(findElement(triggerIcon, (node) => node.tagName === 'svg')).not.to.equal(undefined);
    expect(
      findElement(trigger, (node) =>
        getClassList(node.properties?.['className']).includes('sr-only'),
      ),
    ).to.equal(undefined);
    expect(img?.properties?.['src']).to.not.equal('');
    expect(img?.properties?.['alt']).to.equal('譜面画像');
    expect(picture).to.equal(undefined);
    expect(getTextContent(caption)).to.equal('図版キャプション');
  });

  it('zoomable=false image は figure 直下 img の静的構造を維持すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'img',
          properties: {
            src: 'content/_assets/example.png',
            alt: '通常画像',
            zoomable: 'false',
          },
          children: [],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const figure = findElement(tree, (node) => node.tagName === 'figure');
    const directChildren = figure?.children?.filter((child) => child.type === 'element') ?? [];

    expect(figure?.properties?.['data-image']).to.equal('true');
    expect(figure?.properties?.['data-image-zoomable']).to.equal('false');
    expect(figure?.properties?.['data-hydration-key']).to.equal(undefined);
    expect(directChildren.filter((node) => node.tagName === 'img')).to.have.length(1);
    expect(
      directChildren.filter((node) => node.properties?.['data-image-preview-frame'] === 'true'),
    ).to.have.length(0);
    expect(
      findElement(figure, (node) => node.properties?.['data-image-zoom-trigger'] === 'true'),
    ).to.equal(undefined);
  });

  it('image の src 欠落は build error にすること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'img',
          properties: { alt: 'missing source' },
          children: [],
        },
      ],
    };

    expect(() => rehypeRouaultComponents()(tree)).to.throw('[markdown] image の src は必須です');
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

  it('task list の input[type=checkbox] を static checkbox へ変換すること', () => {
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
    expect(listItem?.properties?.['data-task-list-item']).to.equal('true');
    expect(listItem?.properties?.['data-task-state']).to.equal('checked');
    expect(checkbox?.tagName).to.equal('input');
    expect(checkbox?.properties?.['className']).to.deep.equal([
      'static-checkbox',
      'task-list-item__checkbox',
    ]);
    expect(checkbox?.properties?.['disabled']).to.equal(true);
  });

  it('link-card を nested anchor が発生しない静的 HTML contract へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-link-card-source': 'true',
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
    const description = body?.children?.[2];
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
    expect(description?.tagName).to.equal('p');
    expect(description?.properties?.['className']).to.deep.equal(['link-card__description']);
    expect(description?.properties?.['data-text-truncated']).to.equal('false');
    expect(getTextContent(description)).to.equal('本文の補足');
    expect(findElement(card, (node) => /^h[1-6]$/u.test(node.tagName ?? ''))).to.equal(undefined);
    expect(media?.tagName).to.equal('img');
    expect(media?.properties?.['className']).to.deep.equal(['link-card__media']);
  });

  it('link-card description を旧 ui-card と同じ 140 文字契約で切り詰めること', () => {
    const cases = [
      {
        description: 'a'.repeat(140),
        expected: 'a'.repeat(140),
        truncated: 'false',
      },
      {
        description: 'a'.repeat(141),
        expected: `${'a'.repeat(139)}…`,
        truncated: 'true',
      },
      {
        description: `${'a'.repeat(138)}   end`,
        expected: `${'a'.repeat(138)}…`,
        truncated: 'true',
      },
      {
        description: 'あ'.repeat(141),
        expected: `${'あ'.repeat(139)}…`,
        truncated: 'true',
      },
    ];

    for (const [index, testCase] of cases.entries()) {
      const tree: HastNode = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: {
              'data-link-card-source': 'true',
              href: `https://example.com/post-${String(index)}`,
              'card-title': 'Example Post',
              description: testCase.description,
            },
            children: [],
          },
        ],
      };

      rehypeRouaultComponents()(tree);

      const description = findElement(tree, (node) =>
        getClassList(node.properties?.['className']).includes('link-card__description'),
      );

      expect(description?.properties?.['data-text-truncated']).to.equal(testCase.truncated);
      expect(getTextContent(description)).to.equal(testCase.expected);
      expect(JSON.stringify(tree)).not.toContain('data-line-overflowed');
    }
  });

  it('画像なし link-card に renderer 側で no-image class を付与すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-link-card-source': 'true',
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
    expect(
      findElement(tree, (node) =>
        getClassList(node.properties?.['className']).includes('link-card__description'),
      ),
    ).to.equal(undefined);
  });

  it('invalid link-card は anchor を出力せず非リンク表示面へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-link-card-source': 'true',
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
    const description = findElement(card, (node) =>
      Array.isArray(node.properties?.['className'])
        ? node.properties['className'].includes('link-card__description')
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
    expect(description?.properties?.['data-text-truncated']).to.equal('false');
    expect(getTextContent(description)).to.equal('リンク先 URL が指定されていません。');
    expect(JSON.stringify(tree)).not.toContain('data-line-overflowed');
  });

  it('ui-syntax-card を静的 syntax-card root に正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'section',
          properties: {
            'data-syntax-card-source': 'true',
            kind: 'Method',
            name: 'useEffect',
          },
          children: [],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const syntaxCard = findElement(
      tree,
      (node) => node.properties?.['data-syntax-card'] === 'true',
    );

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
          tagName: 'section',
          properties: {
            'data-syntax-card-source': 'true',
            kind: 'Method',
            name: 'useEffect',
          },
          children: [
            {
              type: 'element',
              tagName: 'section',
              properties: {
                'data-syntax-section-source': 'true',
                label: '概要',
              },
              children: [
                {
                  type: 'element',
                  tagName: 'div',
                  properties: {
                    'data-syntax-field-source': 'true',
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
    const section = findElement(
      tree,
      (node) => node.properties?.['data-syntax-section'] === 'true',
    );
    const field = findElement(tree, (node) => node.properties?.['data-syntax-field'] === 'true');
    const cardName = findElement(card, (node) =>
      getClassList(node.properties?.['className']).includes('syntax-card__name'),
    );
    const sectionHeading = findElement(section, (node) =>
      getClassList(node.properties?.['className']).includes('syntax-section__heading'),
    );

    expect(card?.tagName).to.equal('section');
    expect(card?.properties?.['aria-labelledby']).to.equal(cardName?.properties?.['id']);
    expect(cardName?.tagName).to.equal('p');
    expect(typeof cardName?.properties?.['id']).to.equal('string');
    expect(section?.tagName).to.equal('section');
    expect(section?.properties?.['aria-labelledby']).to.equal(sectionHeading?.properties?.['id']);
    expect(sectionHeading?.tagName).to.equal('p');
    expect(field?.tagName).to.equal('dl');
    expect(
      findElement(field, (node) => node.tagName === 'dt')?.properties?.['className'],
    ).to.deep.equal(['syntax-field__term']);
    expect(
      findElement(field, (node) => node.tagName === 'dd')?.properties?.['className'],
    ).to.deep.equal(['syntax-field__description']);

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

  it('syntax-card の heading-level と条件付き surface を静的 HTML 契約へ正規化すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'section',
          properties: {
            'data-syntax-card-source': 'true',
            kind: 'Function',
            name: 'createThing',
            'heading-level': '2',
          },
          children: [
            {
              type: 'element',
              tagName: 'pre',
              properties: { slot: 'signature' },
              children: [{ type: 'text', value: 'createThing()' }],
            },
            {
              type: 'element',
              tagName: 'p',
              children: [{ type: 'text', value: '説明' }],
            },
          ],
        },
        {
          type: 'element',
          tagName: 'section',
          properties: {
            'data-syntax-card-source': 'true',
            kind: 'Function',
            'heading-level': '9',
          },
          children: [],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const cards = findElements(tree, (node) => node.properties?.['data-syntax-card'] === 'true');
    const firstName = findElement(cards[0], (node) =>
      getClassList(node.properties?.['className']).includes('syntax-card__name'),
    );
    const fallbackName = findElement(cards[1], (node) =>
      getClassList(node.properties?.['className']).includes('syntax-card__name'),
    );

    expect(firstName?.tagName).to.equal('p');
    expect(cards[0]?.properties?.['aria-labelledby']).to.equal(firstName?.properties?.['id']);
    expect(typeof firstName?.properties?.['id']).to.equal('string');
    expect(getTextContent(firstName)).to.equal('createThing');
    expect(fallbackName?.tagName).to.equal('p');
    expect(cards[1]?.properties?.['aria-labelledby']).to.equal(fallbackName?.properties?.['id']);
    expect(typeof fallbackName?.properties?.['id']).to.equal('string');
    expect(getTextContent(fallbackName)).to.equal('Syntax');
    expect(findElement(cards[0], (node) => /^h[2-6]$/u.test(node.tagName ?? ''))).to.equal(
      undefined,
    );
    expect(findElement(cards[1], (node) => /^h[2-6]$/u.test(node.tagName ?? ''))).to.equal(
      undefined,
    );
    expect(JSON.stringify(cards)).not.to.contain('heading-level');
    expect(JSON.stringify(cards)).not.to.contain('data-heading-level');
    expect(
      findElement(cards[0], (node) =>
        getClassList(node.properties?.['className']).includes('syntax-card__signature'),
      ),
    ).not.to.equal(undefined);
    expect(
      findElement(cards[0], (node) =>
        getClassList(node.properties?.['className']).includes('syntax-card__content'),
      ),
    ).not.to.equal(undefined);
    expect(
      findElement(cards[1], (node) =>
        getClassList(node.properties?.['className']).includes('syntax-card__signature'),
      ),
    ).to.equal(undefined);
    expect(
      findElement(cards[1], (node) =>
        getClassList(node.properties?.['className']).includes('syntax-card__content'),
      ),
    ).to.equal(undefined);
    const copyAction = findElement(tree, (node) =>
      getClassList(node.properties?.['className']).includes('syntax-card__copy-action'),
    );
    const copySource = findElement(
      tree,
      (node) =>
        node.tagName === 'template' && node.properties?.['data-code-copy-source'] === 'true',
    );
    expect(copyAction?.tagName).to.equal('button');
    expect(copyAction?.properties?.['data-copy-button']).to.equal('true');
    expect(copyAction?.properties?.['disabled']).to.equal(true);
    expect(copyAction?.properties?.['data-copy-disabled-reason']).to.equal('no-js');
    expect(copyAction?.properties?.['data-copy-target-id']).to.equal(
      copySource?.properties?.['id'],
    );
    expect(copyAction?.properties?.['data-copy-value']).to.equal(undefined);
    expect(copySource?.children?.[0]?.value).to.equal('createThing()');
  });

  it('syntax-section と syntax-field の詳細契約を静的 HTML に固定すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'section',
          properties: { 'data-syntax-section-source': 'true', label: 'Props' },
          children: [],
        },
        {
          type: 'element',
          tagName: 'section',
          properties: { 'data-syntax-section-source': 'true', label: 'Returns' },
          children: [],
        },
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-syntax-field-source': 'true',
            name: 'effect',
            type: '() => void',
            default: 'noop',
          },
          children: [{ type: 'text', value: '副作用' }],
        },
        {
          type: 'element',
          tagName: 'div',
          properties: {
            'data-syntax-field-source': 'true',
            name: 'requiredValue',
            required: 'true',
          },
          children: [{ type: 'text', value: '必須値' }],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const sections = findElements(
      tree,
      (node) => node.properties?.['data-syntax-section'] === 'true',
    );
    const headingIds = sections.map((section) => {
      const heading = findElement(section, (node) =>
        getClassList(node.properties?.['className']).includes('syntax-section__heading'),
      );
      expect(heading?.tagName).to.equal('p');
      expect(section.properties?.['aria-labelledby']).to.equal(heading?.properties?.['id']);
      return heading?.properties?.['id'];
    });
    const fields = findElements(tree, (node) => node.properties?.['data-syntax-field'] === 'true');
    const defaultValue = findElement(fields[0], (node) =>
      getClassList(node.properties?.['className']).includes('syntax-field__default'),
    );
    const required = findElement(fields[1], (node) =>
      getClassList(node.properties?.['className']).includes('syntax-field__required'),
    );

    expect(new Set(headingIds).size).to.equal(2);
    expect(fields[0]?.tagName).to.equal('dl');
    expect(findElement(fields[0], (node) => node.tagName === 'div')).to.equal(undefined);
    expect(getTextContent(defaultValue)).to.equal('default: noop');
    expect(getClassList(defaultValue?.properties?.['className'])).to.include(
      'syntax-field__default--with-type',
    );
    expect(required?.properties?.['aria-label']).to.equal('必須');
    expect(
      findElement(fields[0], (node) =>
        getClassList(node.properties?.['className']).includes('syntax-field__required'),
      ),
    ).to.equal(undefined);
  });

  it('score は label なし primary=false でも scroll surface に既定 aria-label を持つこと', () => {
    withScoreSvgFixture((fixturePath, notePath) => {
      const tree: HastNode = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'figure',
            properties: {
              'data-score': 'true',
              'data-score-aspect-ratio': '4.5 / 1.25',
              'data-score-src': fixturePath,
            },
            children: [],
          },
        ],
      };

      rehypeRouaultComponents()(tree, { path: notePath });

      const score = findElement(tree, (node) => node.properties?.['data-score'] === 'true');
      const scroll = findElement(
        score,
        (node) => node.properties?.['data-score-scroll'] === 'true',
      );
      const stage = findElement(score, (node) => node.properties?.['data-score-stage'] === 'true');
      const svg = findElement(stage, (node) => node.tagName === 'svg');

      expect(score?.properties?.['data-score-src']).to.equal(undefined);
      expect(score?.properties?.['data-hydration-key']).to.equal('score-scroll-enhancer');
      expect(scroll?.properties?.['aria-label']).to.equal('譜面');
      expect(scroll?.properties?.['role']).to.equal(undefined);
      expect(stage?.properties?.['style']).to.equal('--_score-aspect-ratio: 4.5 / 1.25;');
      expect(svg?.tagName).to.equal('svg');
      expect(
        findElement(score, (node) =>
          getClassList(node.properties?.['className']).includes('score__skeleton'),
        ),
      ).to.equal(undefined);
      expect(
        findElement(score, (node) =>
          getClassList(node.properties?.['className']).includes('score__source'),
        ),
      ).to.equal(undefined);
      expect(
        findElement(score, (node) =>
          getClassList(node.properties?.['className']).includes('score__label'),
        ),
      ).to.equal(undefined);
      expect(
        findElement(score, (node) =>
          getClassList(node.properties?.['className']).includes('score__description'),
        ),
      ).to.equal(undefined);
    });
  });

  it('primary score は region と説明参照を label aria-label とは分離して持つこと', () => {
    withScoreSvgFixture((fixturePath, notePath) => {
      const tree: HastNode = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'figure',
            properties: {
              'data-score': 'true',
              'data-score-src': fixturePath,
              'data-score-label': '譜例A',
              'data-score-description': '譜例の説明',
              'data-score-primary': 'true',
            },
            children: [
              {
                type: 'element',
                tagName: 'figcaption',
                properties: {
                  'data-score-caption-source': 'true',
                },
                children: [
                  { type: 'text', value: '譜例' },
                  {
                    type: 'element',
                    tagName: 'em',
                    children: [{ type: 'text', value: 'キャプション' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      rehypeRouaultComponents()(tree, { path: notePath });

      const score = findElement(tree, (node) => node.properties?.['data-score'] === 'true');
      const scroll = findElement(
        score,
        (node) => node.properties?.['data-score-scroll'] === 'true',
      );
      const descriptionId = scroll?.properties?.['aria-describedby'];
      const description = findElement(score, (node) => node.properties?.['id'] === descriptionId);
      const caption = findElement(score, (node) => node.tagName === 'figcaption');

      expect(scroll?.properties?.['aria-label']).to.equal('譜例A');
      expect(scroll?.properties?.['role']).to.equal('region');
      expect(getClassList(description?.properties?.['className'])).to.deep.equal([
        'score__sr-only',
      ]);
      expect(getTextContent(description)).to.equal('譜例の説明');
      expect(getClassList(caption?.properties?.['className'])).to.deep.equal(['score__caption']);
      expect(getTextContent(caption)).to.equal('譜例キャプション');
      expect(caption?.properties?.['data-score-caption-source']).to.equal(undefined);
    });
  });

  it('score の unsafe src は build error にすること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'figure',
          properties: {
            'data-score': 'true',
            'data-score-src': 'javascript:alert(1)',
          },
          children: [],
        },
      ],
    };

    expect(() => rehypeRouaultComponents()(tree)).to.throw(
      '[markdown] score の src はローカル SVG だけ指定できます',
    );
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
