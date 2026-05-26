import { describe, expect, it } from 'vitest';

import {
  classifyStaticFirstTag,
  STATIC_FIRST_NOTE_FORBIDDEN_INPUT_TAGS,
  STATIC_FIRST_NOTE_DENYLIST_TAGS,
  STATIC_FIRST_PAGE_COMPONENT_DENYLIST_TAGS,
  STATIC_FIRST_PAGE_DENYLIST_TAGS,
  STATIC_FIRST_SHELL_DENYLIST_TAGS,
  STATEFUL_ALLOWED_NOTE_TAGS,
} from '../../build/content/static-first-tags.js';

describe('static-first tag classification', () => {
  it('keeps static-first tag sets as the shared source of truth', () => {
    expect(STATIC_FIRST_NOTE_FORBIDDEN_INPUT_TAGS).toContain('ui-code-group');
    expect(STATIC_FIRST_NOTE_DENYLIST_TAGS).toContain('ui-score');
    expect(STATIC_FIRST_PAGE_DENYLIST_TAGS).toContain('ui-search-trigger');
    expect(STATIC_FIRST_PAGE_COMPONENT_DENYLIST_TAGS).toContain('search-page');
    expect(STATIC_FIRST_SHELL_DENYLIST_TAGS).toEqual(['ui-search-dialog', 'layout-footer']);
    expect(STATEFUL_ALLOWED_NOTE_TAGS).toEqual([
      'ui-tabs',
      'ui-code-preview',
      'ui-preview-sandbox',
      'ui-translation',
      'ui-video',
    ]);
  });

  it('derives unknown ui-* from the classifier instead of a fixed array', () => {
    expect(classifyStaticFirstTag('ui-not-registered')).toBe('UNKNOWN_UI_TAGS');
    expect(classifyStaticFirstTag('ui-video')).toBe('STATEFUL_ALLOWED_NOTE_TAGS');
    expect(classifyStaticFirstTag('search-page')).toBe('STATIC_FIRST_PAGE_COMPONENT_DENYLIST_TAGS');
    expect(classifyStaticFirstTag('article')).toBe('NON_UI_TAG');
  });
});
