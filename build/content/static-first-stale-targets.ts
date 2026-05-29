export type StaticFirstStaleTargetKind =
  | 'old-page-custom-element'
  | 'old-shell-custom-element'
  | 'old-search-dialog-runtime'
  | 'old-footer-runtime'
  | 'old-icon-source'
  | 'old-css-in-ts'
  | 'old-event-adapter'
  | 'stale-generated-artifact'
  | 'stale-test-fixture'
  | 'stale-storybook-artifact'
  | 'stale-docs-reference'
  | 'stale-package-or-script-reference';

export type StaticFirstStalePathKind =
  | 'production-source'
  | 'test'
  | 'storybook'
  | 'generated-artifact'
  | 'docs'
  | 'package-export'
  | 'script'
  | 'ci-config'
  | 'config';

export type StaticFirstStaleDeleteMode =
  | 'delete-source'
  | 'delete-if-present'
  | 'delete-if-unreferenced'
  | 'replace-reference'
  | 'reclassify-retained-internal'
  | 'reclassify-negative-fixture';

export type StaticFirstAllowedResidualReferenceKind =
  | 'negative-test'
  | 'historical-prose'
  | 'retained-design-system-internal-test'
  | 'stale-fixture'
  | 'archived-snapshot';

export type StaticFirstAllowedResidualReferenceMatchMode =
  | 'exact-token'
  | 'regex'
  | 'ast-selector'
  | 'path-only';

export interface StaticFirstAllowedResidualReference {
  readonly path: string;
  readonly kind: StaticFirstAllowedResidualReferenceKind;
  readonly reason: string;
  readonly tokens: readonly string[];
  readonly matchMode: StaticFirstAllowedResidualReferenceMatchMode;
}

export interface StaticFirstStaleTarget {
  readonly targetKind: StaticFirstStaleTargetKind;
  readonly pathKind: StaticFirstStalePathKind;
  readonly paths: readonly string[];
  readonly tags?: readonly string[];
  readonly replacementContract: string;
  readonly deleteMode: StaticFirstStaleDeleteMode;
  readonly allowedResidualReferences?: readonly StaticFirstAllowedResidualReference[];
}

export const STATIC_FIRST_STALE_TARGETS = [
  {
    targetKind: 'old-page-custom-element',
    pathKind: 'production-source',
    paths: [
      'src/components/search/search-page.ts',
      'src/components/tag/tag-page.ts',
      'src/components/corpus/corpus-page.ts',
      'src/components/corpus/corpora-overview-page.ts',
    ],
    tags: ['search-page', 'tag-page', 'corpus-page', 'corpora-overview-page'],
    replacementContract: 'Eleventy page templates and static page CSS modules',
    deleteMode: 'delete-source',
  },
  {
    targetKind: 'old-search-dialog-runtime',
    pathKind: 'production-source',
    paths: [
      'src/components/ui/search-dialog/search-dialog.ts',
      'src/components/ui/search-dialog/search-dialog.types.ts',
      'src/components/ui/search-dialog/search-dialog.constants.ts',
      'src/components/ui/search-dialog/internals',
    ],
    tags: ['ui-search-dialog'],
    replacementContract: 'search dialog static markup plus post-hydrate enhancer',
    deleteMode: 'delete-source',
  },
  {
    targetKind: 'old-shell-custom-element',
    pathKind: 'production-source',
    paths: ['src/components/layout/layout-footer.ts'],
    tags: ['layout-footer'],
    replacementContract: 'static footer layout boundary using data-layout-footer',
    deleteMode: 'delete-source',
    allowedResidualReferences: [
      {
        path: 'docs/old',
        kind: 'historical-prose',
        reason: 'Archived prose may mention the removed layout-footer custom element.',
        tokens: ['<layout-footer', '</layout-footer>', 'src/components/layout/layout-footer.ts'],
        matchMode: 'exact-token',
      },
    ],
  },
  {
    targetKind: 'old-footer-runtime',
    pathKind: 'production-source',
    paths: ['src/components/ui/footer/footer.ts'],
    replacementContract: 'static footer HTML from src/layouts/footer-html.ts',
    deleteMode: 'delete-source',
  },
  {
    targetKind: 'old-css-in-ts',
    pathKind: 'production-source',
    paths: ['src/components/page/page-shell-styles.ts'],
    replacementContract: 'page shell CSS module imports',
    deleteMode: 'delete-source',
  },
  {
    targetKind: 'old-icon-source',
    pathKind: 'production-source',
    paths: [
      'src/layouts/article-header-icon-html.ts',
      'shared/icons/icons-catalog.ts',
      'src/generated/generate-icon-subset.ts',
    ],
    replacementContract: 'static icon subset generated through scripts/generate-icon-subset.ts',
    deleteMode: 'delete-source',
  },
  {
    targetKind: 'old-event-adapter',
    pathKind: 'production-source',
    paths: [
      'src/client/post-hydrate/article-header-tags.ts',
      'src/components/ui/article-header/article-header-tags-adapter.ts',
    ],
    replacementContract: 'static article header tag links',
    deleteMode: 'delete-source',
  },
  {
    targetKind: 'stale-test-fixture',
    pathKind: 'test',
    paths: ['test/node/article-header-icon-html.test.ts'],
    replacementContract: 'article-header static icon contract tests',
    deleteMode: 'delete-source',
  },
] as const satisfies readonly StaticFirstStaleTarget[];
