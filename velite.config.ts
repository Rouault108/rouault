import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { defineCollection, defineConfig, s } from 'velite';

import { rehypeAnnotateLinkKinds } from './build/rehype/annotate-link-kinds.js';
import { rehypeDisallowDangerousProps } from './build/rehype/disallow-dangerous-props.js';
import { rehypeHeadingIds } from './build/rehype/rehype-heading-ids.js';
import { rehypeInlineCodeTranslateNo } from './build/rehype/inline-code-translate-no.js';
import { rehypeOrderedListContracts } from './build/rehype/ordered-list-contracts.js';
import { rehypePreviewSandbox } from './build/rehype/preview-sandbox.js';
import {
  normalizeRouaultStaticSurfaceHtml,
  rehypeRouaultComponents,
} from './build/rehype/rouault-components.js';
import { rehypeShikiCodeBlocks } from './build/rehype/shiki-code-blocks.js';
import { rehypeStaticCodeGroups } from './build/rehype/static-code-groups.js';
import { validateNoteContentContracts } from './build/content/note-content-contracts.js';
import { validateNoteMetadataContracts } from './build/content/note-metadata-contracts.js';
import { remarkExpandExampleIncludes } from './build/remark/expand-example-includes.js';
import { remarkDisallowRawHtml } from './build/remark/disallow-raw-html.js';
import { remarkLinkCards } from './build/remark/remark-link-cards.js';
import { remarkRouaultDirectives } from './build/remark/rouault-directives.js';
import { ARTICLE_STATUSES } from './src/types/article-status.js';
import {
  NOTE_HYDRATION_BUDGET_PROFILE_NAMES,
  normalizeNoteHydrationBudgetProfileName,
} from './src/types/note-hydration-budget-profile.js';
import { NOTE_CONTENT_KINDS, normalizeNoteContentKind } from './shared/note/note-kind.js';
import { TESTING_AREAS, normalizeTestingArea } from './shared/note/testing-area.js';
import { resolveNoteSourceLocation } from './shared/note/note-source-root.js';

const notes = defineCollection({
  name: 'Note',
  pattern: ['content/**/*.md', 'test/fixtures/content/**/*.md'],
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
      e2eFixtureId: s.string().optional(),
      content: s.markdown(),
      excerpt: s.excerpt().optional(),
      toc: s.toc().optional(),
    })
    .transform((data) => {
      const sourcePath = typeof data.slug === 'string' ? data.slug : '';
      const { sourceRoot, slug } = resolveNoteSourceLocation(sourcePath);
      const kind = normalizeNoteContentKind(data.kind);
      const testingArea = normalizeTestingArea(data.testingArea);
      const hydrationBudgetProfile = normalizeNoteHydrationBudgetProfileName(
        data.hydrationBudgetProfile,
      );
      const normalizedContent = normalizeRouaultStaticSurfaceHtml(data.content);
      const e2eFixtureId =
        typeof data.e2eFixtureId === 'string' && data.e2eFixtureId.trim().length > 0
          ? data.e2eFixtureId.trim()
          : undefined;

      validateNoteMetadataContracts(kind, testingArea, sourcePath);
      validateNoteContentContracts(kind, normalizedContent, sourcePath, testingArea);

      return {
        ...data,
        slug,
        sourceRoot,
        content: normalizedContent,
        kind,
        ...(testingArea !== undefined ? { testingArea } : {}),
        ...(hydrationBudgetProfile !== undefined ? { hydrationBudgetProfile } : {}),
        ...(e2eFixtureId !== undefined ? { e2eFixtureId } : {}),
        status: data.status ?? '',
      };
    }),
});

export default defineConfig({
  root: '.',
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
    ],
  },
});
