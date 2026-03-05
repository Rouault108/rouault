import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { defineCollection, defineConfig, s } from 'velite';

import { rehypeDisallowDangerousProps } from './lib/rehype/disallow-dangerous-props.js';
import { rehypeDisallowStaticMark } from './lib/rehype/disallow-static-mark.js';
import { rehypeInlineCodeTranslateNo } from './lib/rehype/inline-code-translate-no.js';
import { rehypeOrderedListContracts } from './lib/rehype/ordered-list-contracts.js';
import { rehypeRouaultComponents } from './lib/rehype/rouault-components.js';
import { remarkDisallowRawHtml } from './lib/remark/disallow-raw-html.js';
import { remarkRouaultDirectives } from './lib/remark/rouault-directives.js';

const notes = defineCollection({
  name: 'Note',
  pattern: '**/*.md',
  schema: s
    .object({
      title: s.string().optional(),
      description: s.string().optional(),
      slug: s.path(),
      date: s.isodate().optional(),
      updated: s.isodate().optional(),
      genre: s.array(s.string()).optional(),
      cover: s.string().optional(),
      license: s.string().optional(),
      licenseNote: s.string().optional(),
      draft: s.boolean().default(false),
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
      remarkDisallowRawHtml,
      remarkRouaultDirectives,
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeRouaultComponents,
      rehypeInlineCodeTranslateNo,
      rehypeOrderedListContracts,
      rehypeDisallowDangerousProps,
      rehypeDisallowStaticMark,
    ],
  },
});
