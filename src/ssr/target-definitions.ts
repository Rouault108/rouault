export type SsrComponentProfile = 'shell' | 'note' | 'page';
export type SsrComponentMode = 'shadow' | 'light' | 'none';

export interface SsrComponentDefinition {
  readonly tag: string;
  readonly ssr: SsrComponentMode;
  readonly profiles: readonly SsrComponentProfile[];
}

export const SSR_COMPONENT_DEFINITIONS = [
  { tag: 'ui-icon', ssr: 'none', profiles: ['shell', 'note', 'page'] },
  { tag: 'ui-skip-link', ssr: 'shadow', profiles: ['shell'] },
  { tag: 'layout-header', ssr: 'shadow', profiles: ['shell'] },
  { tag: 'app-router', ssr: 'light', profiles: ['shell'] },
  { tag: 'layout-footer', ssr: 'light', profiles: ['shell'] },
  { tag: 'ui-search-dialog', ssr: 'shadow', profiles: ['shell'] },
  { tag: 'ui-card', ssr: 'shadow', profiles: ['shell', 'page'] },
  { tag: 'about-page', ssr: 'light', profiles: ['page'] },
  { tag: 'search-page', ssr: 'shadow', profiles: ['page'] },
  { tag: 'tag-page', ssr: 'shadow', profiles: ['page'] },
  { tag: 'corpus-page', ssr: 'shadow', profiles: ['page'] },
  { tag: 'corpora-overview-page', ssr: 'shadow', profiles: ['page'] },
  { tag: 'not-found-page', ssr: 'shadow', profiles: ['page'] },
  { tag: 'ui-article-header', ssr: 'shadow', profiles: ['note'] },
  { tag: 'layout-sidebar', ssr: 'shadow', profiles: ['note'] },
  { tag: 'layout-toc', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-callout', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-checkbox', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-code-group', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-code-preview', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-preview-sandbox', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-table', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-code-block', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-blockquote', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-details', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-divider', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-footnote', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-highlight', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-image', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-info-box', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-score', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-tabs', ssr: 'shadow', profiles: ['note'] },
  { tag: 'ui-translation', ssr: 'shadow', profiles: ['note'] },
] as const satisfies readonly SsrComponentDefinition[];

export type SsrComponentTag = (typeof SSR_COMPONENT_DEFINITIONS)[number]['tag'];
