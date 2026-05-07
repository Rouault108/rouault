import { describe, expect, it } from 'vitest';
import { HYDRATION_REGISTRY_BY_TAG } from '../../src/client/hydration/registry.js';

describe('hydration registry', () => {
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
    expect(HYDRATION_REGISTRY_BY_TAG.has('layout-toc')).toBe(true);
    expect(HYDRATION_REGISTRY_BY_TAG.has('ui-article-header')).toBe(false);

    const removedTags: readonly string[] = [
      'ui-callout',
      'ui-table',
      'ui-blockquote',
      'ui-info-box',
      'ui-image',
      'ui-footnote',
      'ui-divider',
    ];

    for (const tagName of removedTags) {
      expect(HYDRATION_REGISTRY_BY_TAG.has(tagName)).toBe(false);
    }
  });

  it('layout-toc controller / owner は activation adapter を registry に集約すること', () => {
    expect(HYDRATION_REGISTRY_BY_TAG.get('layout-toc-controller')?.activate).toBeTypeOf(
      'function',
    );
    expect(HYDRATION_REGISTRY_BY_TAG.get('layout-toc')?.activate).toBeTypeOf('function');
  });
});
