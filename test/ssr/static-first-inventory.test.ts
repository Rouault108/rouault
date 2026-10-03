import { describe, expect, it } from 'vitest';
import { STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS } from '../../build/content/static-first-removed-or-reduced-tags.js';
import { STATIC_FIRST_RETAINED_COMPONENTS } from '../../build/content/static-first-retained-components.js';
import { HYDRATION_REGISTRY } from '../../src/client/hydration/registry.js';

describe('native static-first retained inventory', () => {
  it('非Lit shell/controllerだけをcustom elementとして維持する', () => {
    expect(STATIC_FIRST_RETAINED_COMPONENTS.map(({ tag }) => tag).sort()).toEqual([
      'layout-toc-controller',
      'router-document-host',
    ]);
    expect(
      HYDRATION_REGISTRY.filter(({ kind }) => kind === 'custom-element')
        .map(({ tag }) => tag)
        .sort(),
    ).toEqual(['layout-toc-controller', 'router-document-host']);
  });
  it('削除済みtagをretained inventoryへ戻さない', () => {
    for (const tag of STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS) {
      expect(STATIC_FIRST_RETAINED_COMPONENTS.some((entry) => entry.tag === tag)).toBe(false);
    }
  });
  it('retained custom elementのhydration profileをregistryと一致させる', () => {
    for (const component of STATIC_FIRST_RETAINED_COMPONENTS) {
      const entry = HYDRATION_REGISTRY.find(({ tag }) => tag === component.tag);
      expect(Boolean(entry)).toBe(component.hydrationRegistryRequired);
      expect(entry?.profiles).toEqual(component.hydrationProfiles);
    }
  });
});
