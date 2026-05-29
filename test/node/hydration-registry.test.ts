import { describe, expect, it } from 'vitest';
import {
  HYDRATION_REGISTRY,
  HYDRATION_REGISTRY_BY_TAG,
} from '../../src/client/hydration/registry.js';

const expectedProfilesByTag = new Map<string, readonly string[]>([
  ['ui-skip-link', ['shell']],
  ['layout-header', ['shell']],
  ['app-router', ['shell']],
  ['search-dialog-enhancer', ['shell']],
  ['search-page-enhancer', ['page']],
  ['layout-sidebar', ['layout']],
  ['layout-toc-controller', ['layout']],
  ['note-static-surface-enhancer', ['note']],
  ['code-block-enhancer', ['note']],
  ['code-group-enhancer', ['note']],
  ['score-scroll-enhancer', ['note']],
  ['footnote-popover-enhancer', ['note']],
  ['image-lightbox-enhancer', ['note']],
  ['ui-code-preview', ['note']],
  ['ui-preview-sandbox', ['note']],
  ['ui-tabs', ['note']],
  ['ui-translation', ['note']],
  ['ui-video', ['note']],
]);

describe('hydration registry', () => {
  it('Phase9 の初期移行表どおり profile metadata を持つこと', () => {
    for (const entry of HYDRATION_REGISTRY) {
      expect(entry.profiles.length, entry.tag).toBeGreaterThan(0);
      expect(entry.profiles, entry.tag).not.toContain('global');
    }

    for (const [tag, profiles] of expectedProfilesByTag) {
      expect(HYDRATION_REGISTRY_BY_TAG.get(tag)?.profiles, tag).toEqual(profiles);
    }
  });

  it('note 本文の static code surfaces は enhancer で扱い、ui-code-block / ui-code-group は登録しないこと', () => {
    expect(HYDRATION_REGISTRY_BY_TAG.has('code-block-enhancer')).toBe(true);
    expect(HYDRATION_REGISTRY_BY_TAG.has('code-group-enhancer')).toBe(true);

    const removedTags: readonly string[] = ['ui-code-block', 'ui-code-group'];
    for (const tagName of removedTags) {
      expect(HYDRATION_REGISTRY_BY_TAG.has(tagName)).toBe(false);
    }
  });

  it('static-first 化した note 本文 legacy ui-* は registry へ残さないこと', () => {
    expect(HYDRATION_REGISTRY_BY_TAG.has('image-lightbox-enhancer')).toBe(true);
    expect(HYDRATION_REGISTRY_BY_TAG.has('footnote-popover-enhancer')).toBe(true);
    expect(HYDRATION_REGISTRY_BY_TAG.has('layout-toc-controller')).toBe(true);
    expect(HYDRATION_REGISTRY_BY_TAG.has('layout-toc')).toBe(false);
    expect(HYDRATION_REGISTRY_BY_TAG.has('ui-article-header')).toBe(false);

    const removedTags: readonly string[] = [
      'ui-callout',
      'ui-table',
      'ui-blockquote',
      'ui-info-box',
      'ui-image',
      'ui-footnote',
      'ui-divider',
      'ui-details',
      'ui-syntax-card',
      'ui-syntax-section',
      'ui-syntax-field',
    ];

    for (const tagName of removedTags) {
      expect(HYDRATION_REGISTRY_BY_TAG.has(tagName)).toBe(false);
    }
  });

  it('layout-toc controller / owner は activation adapter を registry に集約すること', () => {
    expect(HYDRATION_REGISTRY_BY_TAG.get('layout-toc-controller')?.activate).toBeTypeOf('function');
    expect(HYDRATION_REGISTRY_BY_TAG.get('layout-toc')).toBeUndefined();
  });

  it('static 404 fallback は hydration registry へ登録しないこと', () => {
    expect(HYDRATION_REGISTRY_BY_TAG.has('not-found-page')).toBe(false);
  });
});
