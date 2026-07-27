import { describe, expect, it } from 'vitest';

import { HYDRATION_REGISTRY_BY_TAG } from '../../src/client/hydration/registry.js';

describe('hydration registry static syntax contract', () => {
  it('静的 HTML 化した syntax family を registry に登録しないこと', () => {
    expect(HYDRATION_REGISTRY_BY_TAG.has('ui-syntax-card')).to.equal(false);
    expect(HYDRATION_REGISTRY_BY_TAG.has('ui-syntax-section')).to.equal(false);
    expect(HYDRATION_REGISTRY_BY_TAG.has('ui-syntax-field')).to.equal(false);
  });
});
