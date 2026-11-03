import katex from 'katex';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';

const classesOf = (node: Element): readonly unknown[] => {
  const value = node.properties['className'];
  return Array.isArray(value) ? value : [];
};
const isMath = (node: Element): boolean =>
  classesOf(node).some((name) =>
    ['language-math', 'math-inline', 'math-display'].includes(String(name)),
  );
const textOf = (node: Element): string =>
  node.children
    .map((child) =>
      child.type === 'text' ? child.value : child.type === 'element' ? textOf(child) : '',
    )
    .join('');

// 構文解析はremark-math、数式の描画は直接依存のKaTeXに委ねる。
// HTML変換だけを所有し、rendererとViteが読むCSSの版を揃える。
export const rehypeStaticMath: Plugin<[], Root> =
  () =>
  (tree, file): void => {
    const visit = (parent: Root | Element): void => {
      for (let index = 0; index < parent.children.length; index++) {
        const node = parent.children[index];
        if (node?.type !== 'element') continue;
        const code = node.tagName === 'pre' ? node.children[0] : undefined;
        const fenced =
          code?.type === 'element' &&
          code.tagName === 'code' &&
          classesOf(code).includes('language-math');
        const source = fenced ? code : node;
        if (!isMath(source)) {
          visit(node);
          continue;
        }
        // 信頼済みHTML命令を許可せず、数式間のmacro stateを共有しない。
        const options = {
          displayMode: fenced || classesOf(source).includes('math-display'),
          output: 'htmlAndMathml',
          trust: false,
          strict: 'warn',
        } as const;
        let html: string;
        try {
          html = katex.renderToString(textOf(source), { ...options, throwOnError: true });
        } catch (error) {
          // TeXの入力不備だけをwarningとescaped error表示へ縮退させる。
          // 予期しないrenderer障害はbuildを失敗させて検知する。
          if (!(error instanceof katex.ParseError)) throw error;
          file.message('Could not render math with KaTeX', {
            cause: error,
            source: 'rouault-static-math',
            ruleId: 'parseerror',
            ...(source.position ? { place: source.position } : {}),
          });
          html = katex.renderToString(textOf(source), { ...options, throwOnError: false });
        }
        const result = fromHtmlIsomorphic(html, { fragment: true }).children.filter(
          (child) => child.type !== 'doctype',
        );
        parent.children.splice(index, 1, ...result);
        index += result.length - 1;
      }
    };
    visit(tree);
  };
