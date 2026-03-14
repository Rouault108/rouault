export const SSR_SHADOW_TARGET_TAGS = [
  'ui-skip-link',
  'layout-header',
  'ui-search-dialog',
  'search-page',
  'tag-page',
  'ui-card',
  'ui-article-header',
  'layout-sidebar',
  'layout-toc',
  'ui-table',
  'ui-code-block',
  'ui-blockquote',
] as const;

export const SSR_LIGHT_TARGET_TAGS = ['app-router', 'layout-footer'] as const;

export const SSR_TARGET_TAGS = [...SSR_SHADOW_TARGET_TAGS, ...SSR_LIGHT_TARGET_TAGS] as const;

export type SsrShadowTargetTag = (typeof SSR_SHADOW_TARGET_TAGS)[number];
export type SsrLightTargetTag = (typeof SSR_LIGHT_TARGET_TAGS)[number];
export type SsrTargetTag = (typeof SSR_TARGET_TAGS)[number];

export const SSR_NOTE_TARGET_TAGS = [
  'layout-sidebar',
  'layout-toc',
  'ui-article-header',
  'ui-table',
  'ui-code-block',
  'ui-blockquote',
] as const satisfies readonly SsrTargetTag[];

export const SSR_SEARCH_TARGET_TAGS = [
  'search-page',
  'tag-page',
] as const satisfies readonly SsrTargetTag[];

export const SSR_ALWAYS_LOAD_TAGS = [
  'ui-skip-link',
  'layout-header',
  'app-router',
  'layout-footer',
  'ui-search-dialog',
  'ui-card',
] as const satisfies readonly SsrTargetTag[];
