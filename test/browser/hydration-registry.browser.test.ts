import { expect } from '@open-wc/testing';

import { HYDRATION_REGISTRY_BY_TAG } from '../../src/client/hydration/registry.js';

describe('hydration registry syntax family contract', () => {
  it('ui-syntax family は同一 loader で読み込まれること', () => {
    const card = HYDRATION_REGISTRY_BY_TAG.get('ui-syntax-card');
    const section = HYDRATION_REGISTRY_BY_TAG.get('ui-syntax-section');
    const field = HYDRATION_REGISTRY_BY_TAG.get('ui-syntax-field');

    expect(card).to.not.equal(undefined);
    expect(section).to.not.equal(undefined);
    expect(field).to.not.equal(undefined);

    expect(card?.loader).to.equal(section?.loader);
    expect(card?.loader).to.equal(field?.loader);
  });
});
