import path from 'node:path';
import katex from 'katex';
import { unified } from 'unified';
import type { Root } from 'hast';
import { rehypeStaticMath } from '../../build/rehype/static-math.js';
import { describe, expect, it, vi } from 'vitest';
import { compileContentInput } from '../../build/content/content-compiler.js';
import { createContentBuildContext } from '../../build/content/content-build-context.js';
import type { ContentInput } from '../../build/content/content-input.js';
import { projectSearchHtml } from '../../build/search/project-search-html.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';

const compileMath = async (body: string, collectionId: 'notes' | 'memos' = 'notes') => {
  const input: ContentInput = {
    identity: { collectionId, sourceRelativePath: 'math-contract.md' },
    sourceRoot: `content/${collectionId}`,
    sourceFilePath: path.resolve(`content/${collectionId}/math-contract.md`),
    sourceLabel: `content/${collectionId}/math-contract.md`,
    body,
    bodyStartLine: 1,
    metadata: { title: 'Math contract' },
  };
  const result = await compileContentInput(
    input,
    createContentBuildContext([input], { siteOrigin: 'https://rouault.invalid', basePath: '' })(
      input,
    ),
  );
  return result.note?.content ?? result.memo?.content ?? '';
};

describe('static math output contract', () => {
  it('notesとmemosのinline・display・math fenceを最新rendererのHTMLとMathMLへ変換する', async () => {
    const body = 'Inline $x^2$.\n\n$$\n\\frac{1}{2}\n$$\n\n```math\n\\sum_{i=1}^{n} i\n```';
    for (const collection of ['notes', 'memos'] as const) {
      const html = await compileMath(body, collection);
      expect(html.match(/class="katex"/gu)).toHaveLength(3);
      expect(html.match(/class="katex-display"/gu)).toHaveLength(2);
      expect(html.match(/encoding="application\/x-tex"/gu)).toHaveLength(3);
      expect(html.match(/aria-hidden="true"/gu)).toHaveLength(3);
      expect(html).toContain('class="katex-base"');
      expect(html).toContain('class="katex-sizing');
      expect(html).not.toMatch(/<pre|<code|katex-error/u);
    }
  });

  it('final HTMLから検索用TeXを一度だけ抽出する', async () => {
    const html = await compileMath('Formula $x^2$ and $\\frac{1}{2}$.');
    const canonical = createSearchCanonicalPathname({ pathname: '/notes/math-contract/' });
    if (!canonical.ok) throw new Error('Invalid canonical path');
    const search = projectSearchHtml(
      `<main data-note-static-surface>${html}</main>`,
      canonical.canonicalPathname,
    );
    expect(search.body).toBe('Formula x^2 and \\frac{1}{2}.');
  });

  it('無効数式のsourceをescaped errorとして保持し、trust命令からHTMLを生成しない', async () => {
    const html = await compileMath(
      '$\\frac{<img src=x onerror=alert(1)>$\n\n$\\href{javascript:alert(1)}{x}$\n\n$\\htmlClass{injected}{x}$\n\n$\\includegraphics{https://evil.example/x.png}$\n\n$\\htmlStyle{position:fixed}{x}$',
    );
    expect(html).toContain('katex-error');
    expect(html).not.toMatch(/<img|<a\b|class="injected"/u);
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('style="position:fixed');
  });

  it('通常のcode fenceは数式変換しない', async () => {
    const html = await compileMath('```text\n$x^2$\n```');
    expect(html).not.toContain('class="katex"');
    expect(html).toContain('$x^2$');
    expect(html).toContain('data-code-block');
  });

  it('TeX入力不備はVFile warningへ残し、予期しないrenderer例外は握り潰さない', async () => {
    const tree = (): Root => ({
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'code',
          properties: { className: ['math-inline'] },
          children: [{ type: 'text', value: '\\frac{' }],
        },
      ],
    });
    const messages: unknown[] = [];
    await unified().use(rehypeStaticMath).run(tree(), { messages });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ source: 'rouault-static-math', ruleId: 'parseerror' });
    const render = vi.spyOn(katex, 'renderToString').mockImplementation(() => {
      throw new Error('renderer failure');
    });
    try {
      await expect(unified().use(rehypeStaticMath).run(tree())).rejects.toThrow('renderer failure');
    } finally {
      render.mockRestore();
    }
  });

  it('不足字形の新しいstrict警告を無視せず、MathMLと原式を保持する', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const html = await compileMath('$\\text{😀}$');
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('symbolNotInFont'));
      expect(html).toContain('<math');
      expect(html).toContain('encoding="application/x-tex"');
      expect(html).toContain('😀');
    } finally {
      warning.mockRestore();
    }
  });
});
