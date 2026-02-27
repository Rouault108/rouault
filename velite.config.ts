import rehypeKatex from 'rehype-katex';
import remarkEmoji from 'remark-emoji';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkSupersub from 'remark-supersub';
import { defineCollection, defineConfig, s } from 'velite';

type HastProperties = Record<string, unknown>;

type HastNode = {
  type?: string;
  tagName?: string;
  properties?: HastProperties;
  children?: HastNode[];
};

/**
 * インラインコードに translate="no" を付与する。
 * pre > code（コードブロック）は対象外。
 */
function rehypeInlineCodeTranslateNo() {
  return (tree: unknown) => {
    const visit = (node: unknown, parentTagName?: string): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as HastNode;

      if (current.type === 'element' && current.tagName === 'code' && parentTagName !== 'pre') {
        current.properties ??= {};
        if (current.properties.translate !== 'no') {
          current.properties.translate = 'no';
        }
      }

      if (!Array.isArray(current.children)) {
        return;
      }

      for (const child of current.children) {
        visit(child, current.tagName);
      }
    };

    visit(tree);
  };
}

const notes = defineCollection({
  name: 'Note',
  pattern: 'notes/**/*.md',
  schema: s
    .object({
      title: s.string().optional(),
      slug: s.path(),
      date: s.isodate().optional(),
      updated: s.isodate().optional(),
      content: s.markdown(),
      excerpt: s.excerpt().optional(),
      toc: s.toc().optional(),
    })
    .transform((data) => ({ ...data, permalink: `/notes/${data.slug}` })),
});

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'dist/static',
    base: '/static/',
    name: '[name]-[hash:6].[ext]',
    clean: true,
  },
  collections: { notes },
  markdown: {
    remarkPlugins: [
      [remarkGfm, { singleTilde: false }],
      remarkMath,
      remarkEmoji as any,
      remarkSupersub,
    ],
    rehypePlugins: [rehypeKatex, rehypeInlineCodeTranslateNo],
  },
});
