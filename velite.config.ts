import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { defineCollection, defineConfig, s } from 'velite';

import { rehypeAnnotateLinkKinds } from './lib/rehype/annotate-link-kinds.js';
import { rehypeDisallowDangerousProps } from './lib/rehype/disallow-dangerous-props.js';
import { rehypeDisallowStaticMark } from './lib/rehype/disallow-static-mark.js';
import { rehypeHeadingIds } from './lib/rehype/rehype-heading-ids.js';
import { rehypeInlineCodeTranslateNo } from './lib/rehype/inline-code-translate-no.js';
import { rehypeOrderedListContracts } from './lib/rehype/ordered-list-contracts.js';
import { rehypePreviewSandbox } from './lib/rehype/preview-sandbox.js';
import { rehypeRouaultComponents } from './lib/rehype/rouault-components.js';
import { rehypeShikiCodeBlocks } from './lib/rehype/shiki-code-blocks.js';
import { rehypeStaticCodeGroups } from './lib/rehype/static-code-groups.js';
import { validateNoteContentContracts } from './lib/content/note-content-contracts.js';
import { validateNoteMetadataContracts } from './lib/content/note-metadata-contracts.js';
import { remarkExpandExampleIncludes } from './lib/remark/expand-example-includes.js';
import { remarkDisallowRawHtml } from './lib/remark/disallow-raw-html.js';
import { remarkLinkCards } from './lib/remark/remark-link-cards.js';
import { remarkRouaultDirectives } from './lib/remark/rouault-directives.js';
import { ARTICLE_STATUSES } from './src/types/article-status.js';
import {
  NOTE_HYDRATION_BUDGET_PROFILE_NAMES,
  normalizeNoteHydrationBudgetProfileName,
} from './src/types/note-hydration-budget-profile.js';
import { NOTE_CONTENT_KINDS, normalizeNoteContentKind } from './src/types/note-kind.js';
import { TESTING_AREAS, normalizeTestingArea } from './src/types/testing-area.js';

const notes = defineCollection({
  name: 'Note',
  pattern: '**/*.md',
  schema: s
    .object({
      title: s.string(),
      description: s.string().optional(),
      slug: s.path(),
      sidebarIcon: s.string().optional(),
      date: s.isodate().optional(),
      updated: s.isodate().optional(),
      genre: s.array(s.string()).optional(),
      cover: s.string().optional(),
      source: s.string().optional(),
      license: s.string().optional(),
      licenseNote: s.string().optional(),
      status: s.enum(ARTICLE_STATUSES).optional(),
      kind: s.enum(NOTE_CONTENT_KINDS).optional(),
      testingArea: s.enum(TESTING_AREAS).optional(),
      hydrationBudgetProfile: s.enum(NOTE_HYDRATION_BUDGET_PROFILE_NAMES).optional(),
      content: s.markdown(),
      excerpt: s.excerpt().optional(),
      toc: s.toc().optional(),
    })
    .transform((data) => {
      const kind = normalizeNoteContentKind(data.kind);
      const testingArea = normalizeTestingArea(data.testingArea);
      const hydrationBudgetProfile = normalizeNoteHydrationBudgetProfileName(
        data.hydrationBudgetProfile,
      );

      validateNoteMetadataContracts(kind, testingArea, data.slug);
      validateNoteContentContracts(kind, data.content, data.slug, testingArea);

      return {
        ...data,
        kind,
        ...(testingArea !== undefined ? { testingArea } : {}),
        ...(hydrationBudgetProfile !== undefined ? { hydrationBudgetProfile } : {}),
        status: data.status ?? '',
      };
    }),
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
    copyLinkedFiles: false,
    remarkPlugins: [
      remarkMath,
      [remarkGfm, { singleTilde: false }],
      remarkExpandExampleIncludes,
      remarkDisallowRawHtml,
      remarkRouaultDirectives,
      remarkLinkCards,
    ],
    rehypePlugins: [
      rehypeKatex,
      rehypeHeadingIds,
      rehypePreviewSandbox,
      rehypeShikiCodeBlocks,
      rehypeStaticCodeGroups,
      rehypeRouaultComponents,
      rehypeAnnotateLinkKinds(),
      rehypeInlineCodeTranslateNo,
      rehypeOrderedListContracts,
      rehypeDisallowDangerousProps,
      rehypeDisallowStaticMark,
    ],
  },
});