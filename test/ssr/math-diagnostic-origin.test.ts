import { describe, expect, it, vi, beforeEach } from 'vitest';
import { unified } from 'unified';
import type { Plugin } from 'unified';
import { VFile } from 'vfile';
import type { Root } from 'hast';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import { toHtml } from 'hast-util-to-html';
import { remarkExpandExampleIncludes } from '../../build/remark/expand-example-includes.js';
import { remarkRouaultDirectives } from '../../build/remark/rouault-directives.js';
import { remarkMathDiagnosticOrigins } from '../../build/remark/math-diagnostic-origins.js';
import { rehypeStaticMath } from '../../build/rehype/static-math.js';
import { getMathDiagnosticOrigin } from '../../build/content/math-diagnostic-origin.js';
import { renderTestingExampleMarkdown } from '../../examples/manifests/testing-examples.js';

vi.mock('../../examples/manifests/testing-examples.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../examples/manifests/testing-examples.js')>();
  return { ...actual, renderTestingExampleMarkdown: vi.fn(actual.renderTestingExampleMarkdown) };
});

const inertTemplate: Plugin<[], Root> = () => (tree) => {
  tree.children = [
    {
      type: 'element',
      tagName: 'template',
      properties: {},
      children: [],
      content: { type: 'root', children: tree.children },
    },
  ];
};

const render = async (
  markdown: string,
  { annotate = true, inert = false }: { annotate?: boolean; inert?: boolean } = {},
) => {
  const file = new VFile({ path: 'content/notes/math-origin.md', value: markdown });
  const processor = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkExpandExampleIncludes)
    .use(remarkRouaultDirectives);
  if (annotate) processor.use(remarkMathDiagnosticOrigins);
  const htmlProcessor = processor.use(remarkRehype).use(rehypeRaw);
  if (inert) htmlProcessor.use(inertTemplate);
  const renderer = htmlProcessor.use(rehypeStaticMath);
  const tree = await renderer.run(renderer.parse(file), file);
  return {
    file,
    html: toHtml(tree),
    origins: file.messages.map((message) => getMathDiagnosticOrigin(file, message)),
  };
};

beforeEach(() => {
  vi.mocked(renderTestingExampleMarkdown).mockReset();
});

describe('math diagnostic provenance', () => {
  it.each([
    ['inline', 'Intro\n前😀 $\\frac{$', 2, 5],
    ['display', 'Intro\n\n$$\n\\frac{\n$$', 3, 1],
    ['math fence', 'Intro\n\n```math\n\\frac{\n```', 3, 1],
  ] as const)(
    '%sはTeX内error offsetではなくMarkdown数式の開始位置を保持する',
    async (_kind, markdown, line, column) => {
      const { file, html, origins } = await render(markdown);
      expect(file.messages).toHaveLength(1);
      expect(origins).toEqual([{ kind: 'document', position: { line, column } }]);
      expect(file.messages[0]).toMatchObject({
        line,
        column,
        source: 'rouault-static-math',
        ruleId: 'parseerror',
      });
      expect(html).toContain('katex-error');
      expect(html).not.toContain('data-rouault-math-diagnostic-origin');
    },
  );

  it('includeのmath fenceはrefだけを保持し、snippet位置を原稿行へ流用しない', async () => {
    vi.mocked(renderTestingExampleMarkdown).mockReturnValue('```math\n\\frac{\n```\n\n$\\frac{$');
    const { file, html, origins } = await render('Intro\n\n::example-include{ref="code/core"}');
    expect(file.messages).toHaveLength(1);
    expect(origins).toEqual([{ kind: 'include', ref: 'code/core' }]);
    expect(file.messages[0]?.line).toBeUndefined();
    expect(file.messages[0]?.column).toBeUndefined();
    expect(html).toContain('katex-error');
    // include parserへmath grammarを追加していないため、inline表記は本文のまま残る。
    expect(html).toContain('$\\frac{$');
    expect(html).not.toContain('data-rouault-math-diagnostic-origin');
    expect(html).not.toContain('code/core');
  });

  it('正常な数式でも短命なprovenance属性を最終HTMLへ残さない', async () => {
    const result = await render('$x^2$\n\n```math\n\\frac{1}{2}\n```');
    expect(result.file.messages).toEqual([]);
    expect(result.html.match(/class="katex"/gu)).toHaveLength(2);
    expect(result.html).not.toContain('data-rouault-math-diagnostic-origin');
    expect(result.html).not.toContain('rouaultExpansionSource');
  });

  it.each([
    ['正常', '$x^2$\n\n$$\n\\frac{1}{2}\n$$\n\n```math\nx^2\n```', 0],
    ['不正', '$\\frac{$\n\n$$\n\\frac{\n$$\n\n```math\n\\frac{\n```', 3],
  ] as const)('%s数式の診断注釈は最終HTMLのbytesを変えない', async (_kind, markdown, warnings) => {
    const annotated = await render(markdown);
    const unannotated = await render(markdown, { annotate: false });
    expect(annotated.file.messages).toHaveLength(warnings);
    expect(unannotated.file.messages).toHaveLength(warnings);
    expect(annotated.html).toBe(unannotated.html);
  });

  it('template内は描画対象を増やさず診断注釈だけを除去する', async () => {
    const markdown = '```math\n\\frac{\n```';
    const annotated = await render(markdown, { inert: true });
    const unannotated = await render(markdown, { annotate: false, inert: true });
    expect(annotated.file.messages).toEqual([]);
    expect(annotated.html).toBe(unannotated.html);
    expect(annotated.html).toContain('language-math');
    expect(annotated.html).not.toContain('katex-error');
    expect(annotated.html).not.toContain('data-rouault-math-diagnostic-origin');
  });

  it('同一式の別出力箇所と別renderをglobalに重複抑止しない', async () => {
    for (let iteration = 0; iteration < 2; iteration++) {
      const result = await render('$\\frac{$\n\n$\\frac{$');
      expect(result.file.messages).toHaveLength(2);
      expect(result.origins).toEqual([
        { kind: 'document', position: { line: 1, column: 1 } },
        { kind: 'document', position: { line: 3, column: 1 } },
      ]);
    }
  });

  it('注釈なしのstandalone呼出しはpre位置を持ててもdomainの出自を推測しない', async () => {
    const file = new VFile({ path: 'content/notes/unmapped.md' });
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          position: { start: { line: 17, column: 1 }, end: { line: 19, column: 3 } },
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: { className: ['language-math', 'math-display'] },
              children: [{ type: 'text', value: '\\frac{' }],
            },
          ],
        },
      ],
    };
    await unified().use(rehypeStaticMath).run(tree, file);
    const message = file.messages[0];
    if (!message) throw new Error('Missing expected math warning');
    expect(message).toMatchObject({ line: 17, column: 1 });
    expect(getMathDiagnosticOrigin(file, message)).toBeUndefined();
  });
});
