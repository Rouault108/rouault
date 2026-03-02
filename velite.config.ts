import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { defineCollection, defineConfig, s } from 'velite';

import { rehypeDisallowStaticMark } from './lib/rehype/disallow-static-mark.js';
import { rehypeInlineCodeTranslateNo } from './lib/rehype/inline-code-translate-no.js';
import { rehypeOrderedListContracts } from './lib/rehype/ordered-list-contracts.js';

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
      remarkMath,
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeInlineCodeTranslateNo,
      rehypeOrderedListContracts,
      rehypeDisallowStaticMark,
    ],
  },
});
