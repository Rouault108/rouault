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
});
