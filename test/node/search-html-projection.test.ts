import { describe, expect, it } from 'vitest';
import { projectSearchHtml, splitSearchPassage } from '../../build/search/project-search-html.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';

const canonical = createSearchCanonicalPathname({ pathname: '/notes/example/' });
if (!canonical.ok) throw new Error('Invalid test canonical');
const project = (html: string) => projectSearchHtml(html, canonical.canonicalPathname);
const surface = (html: string) => project(`<main data-note-static-surface>${html}</main>`);

describe('final HTML search projection', () => {
  it('外側blockquote内の見出しもmetadataへ分離し本文に重複させない', () => {
    const result = surface(
      '<blockquote><h2 id="quote">見出し</h2><p>引用本文</p></blockquote><p>続き</p>',
    );
    expect(result.passages.map((passage) => passage.text.trim())).toEqual(['引用本文', '続き']);
    expect(result.passages.map((passage) => passage.headingPath)).toEqual([['見出し'], ['見出し']]);
  });
  it('custom element内のsemantic blockも見出しとpassageへ投影する', () => {
    const result = surface('<note-tabs><h2 id="tab">Tab</h2><p>本文</p><p>次段落</p></note-tabs>');
    expect(result.passages.map((passage) => [passage.headingPath, passage.text])).toEqual([
      [['Tab'], '本文'],
      [['Tab'], '次段落'],
    ]);
  });
  it('本文rootを一意に要求し、空本文を保持する', () => {
    expect(() => project('<p>outside</p>')).toThrow('one body root');
    expect(() =>
      project('<div data-note-static-surface></div><div data-note-static-surface></div>'),
    ).toThrow('one body root');
    expect(surface('')).toEqual({ body: '', passages: [] });
  });

  it('inlineの連結、entity、画像alt、code空白を保持し操作用subtreeを除外する', () => {
    const result = project(`<header>outside</header><main data-note-static-surface>
      <p>文<strong>字</strong>&amp;<img alt="画像"><img alt=""><br>次</p>
      <pre><code> a  b\n c</code><button>copy</button></pre>
      <script>bad</script><style>bad</style><template>bad</template>
      <span hidden>bad</span><span aria-hidden="true">bad</span>
      <span data-pagefind-ignore>bad</span><span data-search-exclude>bad</span>
      <svg aria-hidden="true"><text>bad</text></svg><input value="bad"><select><option>bad</option></select>
      <textarea>bad</textarea></main><footer>outside</footer>`);
    expect(result.passages.map((p) => p.text)).toEqual(['文字&画像\n次', ' a  b\n c']);
    expect(result.body).not.toMatch(/bad|copy|outside/u);
  });

  it('明示除外されていない意味的SVG textを本文とpassageに保持する', () => {
    const result = surface('<p>図:<svg><text>温度<tspan>20℃</tspan></text></svg></p>');
    expect(result.body).toBe('図:温度20℃');
    expect(result.passages.map((passage) => passage.text)).toEqual(['図:温度20℃']);
    const standalone = surface('<svg><text>工程図</text></svg>');
    expect(standalone.body).toBe('工程図');
    expect(standalone.passages.map((passage) => passage.text)).toEqual(['工程図']);
  });

  it.each([
    '<button><svg><text>操作</text></svg></button>',
    '<svg aria-hidden="true"><text>操作</text></svg>',
    '<svg hidden><text>操作</text></svg>',
    '<svg data-pagefind-ignore><text>操作</text></svg>',
    '<svg data-search-exclude><text>操作</text></svg>',
    '<span data-search-exclude><svg><text>操作</text></svg></span>',
  ])('既存の除外条件でSVG操作アイコンを除外する: %s', (icon) => {
    const result = surface(`<p>本文${icon}</p>`);
    expect(result.body).toBe('本文');
    expect(result.passages.map((passage) => passage.text)).toEqual(['本文']);
  });

  it('list・blockquote・tableを二重化せず閉じたdetailsも収集する', () => {
    const result = surface(
      '<ul><li>A<ul><li>B</li></ul></li><li>C</li></ul><blockquote><p>D</p><p>E</p></blockquote><table><tr><td>F</td><td>G</td></tr></table><details><summary>H</summary><p>I</p></details>',
    );
    expect(result.passages).toHaveLength(5);
    expect(result.passages.map((p) => p.text.trim().split(/\s+/u))).toEqual([
      ['A', 'B', 'C'],
      ['D', 'E'],
      ['F', 'G'],
      ['H'],
      ['I'],
    ]);
  });

  it('heading ancestryと実在anchorを保持し、見出しだけのpassageを作らない', () => {
    const result = surface(
      '<h1 id="a">A</h1><h3>B</h3><p>one</p><h2 id="c">C</h2><p>two</p><h1>D</h1>three',
    );
    expect(result.passages.map((p) => [p.headingPath, p.anchorId, p.text])).toEqual([
      [['A', 'B'], 'a', 'one'],
      [['A', 'C'], 'c', 'two'],
      [['D'], null, 'three'],
    ]);
    expect(new Set(result.passages.map((p) => p.passageId)).size).toBe(3);
    expect(surface('<p>one</p>')).toEqual(surface('<p>one</p>'));
  });

  it('KaTeXのTeXを一度採用し、annotationがない場合もMathMLを重複させない', () => {
    const result = surface(
      '<p><span class="katex"><span class="katex-mathml"><math><semantics><mi>x</mi><annotation encoding="application/x-tex">x^2</annotation></semantics></math></span><span aria-hidden="true">duplicate</span></span></p><p><span class="katex"><math><mi>y</mi></math><span>duplicate</span></span></p>',
    );
    expect(result.passages.map((p) => p.text)).toEqual(['x^2', 'y']);
  });

  it('800cp以内の改行→空白→hard splitで原文とsurrogate pairを保持する', () => {
    for (const value of [
      '𠮷'.repeat(1601),
      `${'a'.repeat(600)}\n${'b'.repeat(250)}`,
      `${'a'.repeat(700)} ${'b'.repeat(250)}`,
    ]) {
      const chunks = splitSearchPassage(value);
      expect(chunks.join('')).toBe(value);
      expect(chunks.every((chunk) => Array.from(chunk).length <= 800)).toBe(true);
      expect(chunks.every((chunk) => !/[\uD800-\uDFFF]/u.test(chunk))).toBe(true);
    }
    expect(splitSearchPassage(`${'a'.repeat(600)}\n${'b'.repeat(250)}`)[0]?.length).toBe(601);
  });

  it('Pagefind属性から中立除外属性への置換でprojectionが変わらない', () => {
    expect(surface('<p data-pagefind-body>本文<span data-pagefind-ignore>操作</span></p>')).toEqual(
      surface('<p>本文<span data-search-exclude>操作</span></p>'),
    );
  });
});
