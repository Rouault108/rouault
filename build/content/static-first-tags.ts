export const STATIC_FIRST_NOTE_FORBIDDEN_INPUT_TAGS = [
  'ui-blockquote',
  'ui-callout',
  'ui-card',
  'ui-checkbox',
  'ui-code-block',
  'ui-code-group',
  'ui-copy-button',
  'ui-details',
  'ui-divider',
  'ui-footnote',
  'ui-highlight',
  'ui-image',
  'ui-math',
  'ui-info-box',
  'ui-score',
  'ui-syntax-card',
  'ui-syntax-field',
  'ui-syntax-section',
  'ui-table',
  'ui-ol',
  'ui-ul',
] as const;

export const STATIC_FIRST_NOTE_DENYLIST_TAGS = [
  ...STATIC_FIRST_NOTE_FORBIDDEN_INPUT_TAGS,
] as const;

export const STATIC_FIRST_PAGE_DENYLIST_TAGS = [
  'ui-article-header',
  'ui-breadcrumbs',
  'ui-card',
  'ui-checkbox',
  'ui-details',
  'ui-empty-state',
  'ui-icon',
  'ui-search-field',
  'ui-search-trigger',
  'ui-select',
  'ui-spinner',
  'ui-tag',
] as const;

export const STATIC_FIRST_PAGE_COMPONENT_DENYLIST_TAGS = [
  'search-page',
  'tag-page',
  'corpus-page',
  'corpora-overview-page',
] as const;

export const STATIC_FIRST_SHELL_DENYLIST_TAGS = ['ui-search-dialog', 'layout-footer'] as const;

export const STATEFUL_ALLOWED_NOTE_TAGS = [
  'ui-tabs',
  'ui-code-preview',
  'ui-preview-sandbox',
  'ui-translation',
  'ui-video',
] as const;

export type StaticFirstTagClassification =
  | 'STATIC_FIRST_NOTE_FORBIDDEN_INPUT_TAGS'
  | 'STATIC_FIRST_NOTE_DENYLIST_TAGS'
  | 'STATIC_FIRST_PAGE_DENYLIST_TAGS'
  | 'STATIC_FIRST_PAGE_COMPONENT_DENYLIST_TAGS'
  | 'STATIC_FIRST_SHELL_DENYLIST_TAGS'
  | 'STATEFUL_ALLOWED_NOTE_TAGS'
  | 'UNKNOWN_UI_TAGS'
  | 'NON_UI_TAG';

const noteForbiddenInputTags = new Set<string>(STATIC_FIRST_NOTE_FORBIDDEN_INPUT_TAGS);
const noteDenylistTags = new Set<string>(STATIC_FIRST_NOTE_DENYLIST_TAGS);
const pageDenylistTags = new Set<string>(STATIC_FIRST_PAGE_DENYLIST_TAGS);
const pageComponentDenylistTags = new Set<string>(STATIC_FIRST_PAGE_COMPONENT_DENYLIST_TAGS);
const shellDenylistTags = new Set<string>(STATIC_FIRST_SHELL_DENYLIST_TAGS);
const statefulAllowedNoteTags = new Set<string>(STATEFUL_ALLOWED_NOTE_TAGS);

export const classifyStaticFirstTag = (tag: string): StaticFirstTagClassification => {
  const normalized = tag.trim().toLowerCase();
  if (noteForbiddenInputTags.has(normalized)) {
    return 'STATIC_FIRST_NOTE_FORBIDDEN_INPUT_TAGS';
  }
  if (noteDenylistTags.has(normalized)) {
    return 'STATIC_FIRST_NOTE_DENYLIST_TAGS';
  }
  if (pageDenylistTags.has(normalized)) {
    return 'STATIC_FIRST_PAGE_DENYLIST_TAGS';
  }
  if (pageComponentDenylistTags.has(normalized)) {
    return 'STATIC_FIRST_PAGE_COMPONENT_DENYLIST_TAGS';
  }
  if (shellDenylistTags.has(normalized)) {
    return 'STATIC_FIRST_SHELL_DENYLIST_TAGS';
  }
  if (statefulAllowedNoteTags.has(normalized)) {
    return 'STATEFUL_ALLOWED_NOTE_TAGS';
  }
  if (normalized.startsWith('ui-')) {
    return 'UNKNOWN_UI_TAGS';
  }
  return 'NON_UI_TAG';
};
