import { describe, expect, it } from 'vitest';
import {
  HYDRATION_REGISTRY,
  HYDRATION_REGISTRY_BY_TAG,
} from '../../src/client/hydration/registry.js';

const expectedProfilesByTag = new Map<string, readonly string[]>([
  ['ui-skip-link', ['shell']],
  ['layout-header-enhancer', ['shell']],
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
  it('profile metadata を持つこと', () => {
    for (const entry of HYDRATION_REGISTRY) {
      expect(entry.profiles.length, entry.tag).toBeGreaterThan(0);
      expect(entry.profiles, entry.tag).not.toContain('global');
    }

    for (const [tag, profiles] of expectedProfilesByTag) {
      expect(HYDRATION_REGISTRY_BY_TAG.get(tag)?.profiles, tag).toEqual(profiles);
    }
  });

  it('静的 header 移行後は layout-header custom element を registry に登録しないこと', () => {
    expect(HYDRATION_REGISTRY_BY_TAG.has('layout-header')).toBe(false);
    expect(HYDRATION_REGISTRY_BY_TAG.get('layout-header-enhancer')?.kind).toBe('enhancer');
  });

  it('note 本文の static code surfaces は enhancer で扱い、ui-code-block / ui-code-group は登録しないこと', () => {
    expect(HYDRATION_REGISTRY_BY_TAG.has('code-block-enhancer')).toBe(true);
    expect(HYDRATION_REGISTRY_BY_TAG.has('code-group-enhancer')).toBe(true);

    for (const tagName of ['ui-code-block', 'ui-code-group']) {
      expect(HYDRATION_REGISTRY_BY_TAG.has(tagName)).toBe(false);
    }
  });

  it('layout-toc controller / owner は activation adapter を registry に集約すること', () => {
    expect(HYDRATION_REGISTRY_BY_TAG.get('layout-toc-controller')?.activate).toBeTypeOf('function');
    expect(HYDRATION_REGISTRY_BY_TAG.get('layout-toc')).toBeUndefined();
  });
});
