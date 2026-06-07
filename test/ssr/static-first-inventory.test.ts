import { describe, expect, it } from 'vitest';

import { STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS } from '../../build/content/static-first-removed-or-reduced-tags.js';
import { STATIC_FIRST_RETAINED_COMPONENTS } from '../../build/content/static-first-retained-components.js';
import {
  SSR_COMPONENT_DEFINITIONS,
  type SsrComponentDefinition,
} from '../../build/ssr/target-definitions.js';
import { HYDRATION_REGISTRY } from '../../src/client/hydration/registry.js';

const retainedByTag = new Map<string, (typeof STATIC_FIRST_RETAINED_COMPONENTS)[number]>(
  STATIC_FIRST_RETAINED_COMPONENTS.map((component) => [component.tag, component] as const),
);
const ssrDefinitionByTag = new Map<string, SsrComponentDefinition>(
  SSR_COMPONENT_DEFINITIONS.map((definition) => [definition.tag, definition] as const),
);
const hydrationByTag = new Map<string, (typeof HYDRATION_REGISTRY)[number]>(
  HYDRATION_REGISTRY.map((entry) => [entry.tag, entry] as const),
);

const legacyHeaderTags = ['layout-header', 'ui-header'] as const;
const deletedHeaderImplementationPaths = [
  'src/components/ui/header/header.ts',
  'src/components/ui/header/header.stories.ts',
  'src/components/layout/layout-header.ts',
  ['src/components/app/shell/', 'layout-header-shell-', 'adapter.ts'].join(''),
] as const;

const profilesEqual = (
  actual: readonly string[],
  expected: readonly string[],
): boolean =>
  actual.length === expected.length && actual.every((profile, index) => profile === expected[index]);

describe('static-first retained inventory', () => {
  it('does not retain removed-or-reduced legacy tags', () => {
    const retainedTags = new Set<string>(
      STATIC_FIRST_RETAINED_COMPONENTS.map((component) => component.tag),
    );
    const retainedLegacyTags = STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS.filter((tag) =>
      retainedTags.has(tag),
    );

    expect(retainedLegacyTags).toEqual([]);
  });

  it('does not retain legacy Lit header custom elements or implementation paths', () => {
    for (const tag of legacyHeaderTags) {
      expect(retainedByTag.has(tag), tag).toBe(false);
      expect(ssrDefinitionByTag.has(tag), tag).toBe(false);
      expect(hydrationByTag.has(tag), tag).toBe(false);
    }

    for (const component of STATIC_FIRST_RETAINED_COMPONENTS) {
      for (const path of deletedHeaderImplementationPaths) {
        expect(component.implementationPaths, `${component.tag}:${path}`).not.toContain(path);
        expect(component.manifestModulePaths ?? [], `${component.tag}:${path}`).not.toContain(path);
        expect(component.targetAdapterImportPaths ?? [], `${component.tag}:${path}`).not.toContain(
          path,
        );
      }
    }
  });

  it('keeps retained component SSR and hydration profiles aligned with target definitions', () => {
    for (const component of STATIC_FIRST_RETAINED_COMPONENTS) {
      const definition = ssrDefinitionByTag.get(component.tag);
      const hydrationEntry = hydrationByTag.get(component.tag);

      expect(Boolean(definition), `${component.tag}:ssrDefinitionRequired`).toBe(
        component.ssrDefinitionRequired,
      );
      if (definition) {
        expect(profilesEqual(definition.profiles, component.ssrProfiles), component.tag).toBe(true);
      }

      expect(Boolean(hydrationEntry), `${component.tag}:hydrationRegistryRequired`).toBe(
        component.hydrationRegistryRequired,
      );
      if (hydrationEntry) {
        expect(profilesEqual(hydrationEntry.profiles, component.hydrationProfiles), component.tag).toBe(
          true,
        );
      }
    }
  });
});
