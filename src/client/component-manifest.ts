import { hydrateArticleHeaderTags } from './post-hydrate/article-header-tags.js';

export type ComponentProfile = 'shell' | 'note' | 'page';
export type ComponentSsrMode = 'shadow' | 'light' | 'none';

export interface ComponentDefinition {
  readonly tag: string;
  readonly loader: () => Promise<unknown>;
  readonly ssr: ComponentSsrMode;
  readonly profiles: readonly ComponentProfile[];
  readonly postHydrate?: (root: ParentNode) => void;
}

export const COMPONENT_DEFINITIONS = [
  {
    tag: 'ui-icon',
    loader: () => import('../components/ui/icon/icon.js'),
    ssr: 'none',
    profiles: ['shell', 'note', 'page'],
  },
  {
    tag: 'ui-skip-link',
    loader: () => import('../components/ui/skip-link/skip-link.js'),
    ssr: 'shadow',
    profiles: ['shell'],
  },
  {
    tag: 'layout-header',
    loader: () => import('../components/layout/layout-header.js'),
    ssr: 'shadow',
    profiles: ['shell'],
  },
  {
    tag: 'app-router',
    loader: () => import('../components/app/app-router.js'),
    ssr: 'light',
    profiles: ['shell'],
  },
  {
    tag: 'layout-footer',
    loader: () => import('../components/layout/layout-footer.js'),
    ssr: 'light',
    profiles: ['shell'],
  },
  {
    tag: 'ui-search-dialog',
    loader: () => import('../components/ui/search-dialog/search-dialog.js'),
    ssr: 'shadow',
    profiles: ['shell'],
  },
  {
    tag: 'ui-card',
    loader: () => import('../components/ui/card/card.js'),
    ssr: 'shadow',
    profiles: ['shell', 'page'],
  },
  {
    tag: 'about-page',
    loader: () => import('../components/about/about-page.js'),
    ssr: 'light',
    profiles: ['page'],
  },
  {
    tag: 'search-page',
    loader: () => import('../components/search/search-page.js'),
    ssr: 'shadow',
    profiles: ['page'],
  },
  {
    tag: 'tag-page',
    loader: () => import('../components/tag/tag-page.js'),
    ssr: 'shadow',
    profiles: ['page'],
  },
  {
    tag: 'corpus-page',
    loader: () => import('../components/corpus/corpus-page.js'),
    ssr: 'shadow',
    profiles: ['page'],
  },
  {
    tag: 'not-found-page',
    loader: () => import('../components/not-found/not-found-page.js'),
    ssr: 'shadow',
    profiles: ['page'],
  },
  {
    tag: 'ui-article-header',
    loader: () => import('../components/ui/article-header/article-header.js'),
    ssr: 'shadow',
    profiles: ['note'],
    postHydrate: hydrateArticleHeaderTags,
  },
  {
    tag: 'layout-sidebar',
    loader: () => import('../components/layout/layout-sidebar.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'layout-toc',
    loader: () => import('../components/layout/layout-toc.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-callout',
    loader: () => import('../components/ui/callout/callout.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-checkbox',
    loader: () => import('../components/ui/checkbox/checkbox.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-code-group',
    loader: () => import('../components/ui/code-group/code-group.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-code-preview',
    loader: () => import('../components/ui/code-preview/code-preview.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-preview-sandbox',
    loader: () => import('../components/ui/preview-sandbox/preview-sandbox.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-table',
    loader: () => import('../components/ui/table/table.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-code-block',
    loader: () => import('../components/ui/codeblock/codeblock.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-blockquote',
    loader: () => import('../components/ui/blockquote/blockquote.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-details',
    loader: () => import('../components/ui/details/details.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-divider',
    loader: () => import('../components/ui/divider/divider.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-footnote',
    loader: () => import('../components/ui/footnote/footnote.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-highlight',
    loader: () => import('../components/ui/highlight/highlight.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-image',
    loader: () => import('../components/ui/image/image.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-info-box',
    loader: () => import('../components/ui/info-box/info-box.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-score',
    loader: () => import('../components/ui/score/score.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-tabs',
    loader: () => import('../components/ui/tabs/tabs.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
  {
    tag: 'ui-translation',
    loader: () => import('../components/ui/translation/translation.js'),
    ssr: 'shadow',
    profiles: ['note'],
  },
] as const satisfies readonly ComponentDefinition[];

export type ComponentTag = (typeof COMPONENT_DEFINITIONS)[number]['tag'];

export type RegisteredComponentDefinition = ComponentDefinition & {
  readonly tag: ComponentTag;
};

/**
 * 下流利用では literal union そのものではなく、
 * 「tag は ComponentTag を維持しつつ、その他は ComponentDefinition として扱える形」
 * に寄せる。
 */
const COMPONENT_DEFINITIONS_WIDE: readonly RegisteredComponentDefinition[] = COMPONENT_DEFINITIONS;

export const COMPONENT_TAGS = COMPONENT_DEFINITIONS_WIDE.map(
  (definition) => definition.tag,
) as readonly ComponentTag[];

export const COMPONENT_SELECTOR = COMPONENT_TAGS.join(',');

export const COMPONENT_DEFINITION_BY_TAG: Readonly<
  Record<ComponentTag, RegisteredComponentDefinition>
> = Object.fromEntries(
  COMPONENT_DEFINITIONS_WIDE.map((definition) => [definition.tag, definition] as const),
) as Readonly<Record<ComponentTag, RegisteredComponentDefinition>>;

export const isComponentTag = (value: string): value is ComponentTag =>
  value in COMPONENT_DEFINITION_BY_TAG;

export const getComponentDefinitionsForProfile = (
  profile: ComponentProfile,
): readonly RegisteredComponentDefinition[] =>
  COMPONENT_DEFINITIONS_WIDE.filter((definition) => definition.profiles.includes(profile));
