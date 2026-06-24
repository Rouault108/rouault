import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { remarkDisallowRawHtml } from '../../build/remark/disallow-raw-html.js';
import { remarkRouaultDirectives } from '../../build/remark/rouault-directives.js';
import type { MdastNode } from '../../build/remark/directives/types.js';

export interface MarkdownDirectiveMdastRoot {
  type?: string;
  children?: MdastNode[];
}

export interface MarkdownDirectiveParseOptions {
  path?: string;
}

export const parseRouaultDirectiveMdastFromMarkdown = (
  source: string,
  options: MarkdownDirectiveParseOptions = {},
): MarkdownDirectiveMdastRoot => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkDisallowRawHtml)
    .use(remarkRouaultDirectives);

  const tree = processor.parse(source);
  return processor.runSync(tree, {
    path: options.path ?? 'content/notes/sample.md',
  }) as MarkdownDirectiveMdastRoot;
};
