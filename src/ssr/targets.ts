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
  'ui-callout',
  'ui-checkbox',
  'ui-code-group',
  'ui-code-preview',
  'ui-table',
  'ui-code-block',
  'ui-blockquote',
  'ui-details',
  'ui-divider',
  'ui-footnote',
  'ui-image',
  'ui-info-box',
  'ui-score',
  'ui-search-highlight',
  'ui-tabs',
  'ui-translation',
] as const;

export const SSR_LIGHT_TARGET_TAGS = ['app-router', 'about-page', 'layout-footer'] as const;

export const SSR_TARGET_TAGS = [...SSR_SHADOW_TARGET_TAGS, ...SSR_LIGHT_TARGET_TAGS] as const;

export type SsrShadowTargetTag = (typeof SSR_SHADOW_TARGET_TAGS)[number];
export type SsrLightTargetTag = (typeof SSR_LIGHT_TARGET_TAGS)[number];
export type SsrTargetTag = (typeof SSR_TARGET_TAGS)[number];

export const SSR_NOTE_TARGET_TAGS = [
  'layout-sidebar',
  'layout-toc',
  'ui-article-header',
  'ui-callout',
  'ui-checkbox',
  'ui-code-group',
  'ui-code-preview',
  'ui-table',
  'ui-code-block',
  'ui-blockquote',
  'ui-details',
  'ui-divider',
  'ui-footnote',
  'ui-image',
  'ui-info-box',
  'ui-score',
  'ui-search-highlight',
  'ui-tabs',
  'ui-translation',
] as const satisfies readonly SsrTargetTag[];

export const SSR_SEARCH_TARGET_TAGS = [
  'about-page',
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
