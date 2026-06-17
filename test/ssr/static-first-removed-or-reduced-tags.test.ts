import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { STATIC_FIRST_DELETION_TARGETS } from '../../build/content/static-first-deletion-targets.js';
import { STATIC_FIRST_MIGRATION_TARGETS } from '../../build/content/static-first-migration-targets.js';
import {
  isStaticFirstRemovedOrReducedLegacyTag,
  STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS,
} from '../../build/content/static-first-removed-or-reduced-tags.js';

const repoRoot = process.cwd();
const removedOrReducedTagsPath = join(
  repoRoot,
  'build/content/static-first-removed-or-reduced-tags.ts',
);

describe('static-first removed or reduced legacy tags', () => {
  it('derives tags from deletion and migration targets', () => {
    const removedOrReducedTags = new Set(STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS);

    for (const target of STATIC_FIRST_DELETION_TARGETS) {
      expect(removedOrReducedTags.has(target.tag), target.tag).toBe(true);
    }
    for (const target of STATIC_FIRST_MIGRATION_TARGETS) {
      expect(removedOrReducedTags.has(target.tag), target.tag).toBe(true);
    }
  });

  it('includes ui-checkbox through the deletion target inventory', () => {
    expect(STATIC_FIRST_DELETION_TARGETS.map((target) => target.tag)).toContain('ui-checkbox');
    expect(STATIC_FIRST_MIGRATION_TARGETS.map((target) => target.tag)).not.toContain('ui-checkbox');
    expect(STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS).toContain('ui-checkbox');
  });

  it('normalizes predicate input by trimming and lower-casing', () => {
    expect(isStaticFirstRemovedOrReducedLegacyTag(' UI-PAGINATION ')).toBe(true);
    expect(isStaticFirstRemovedOrReducedLegacyTag(' Ui-Checkbox ')).toBe(true);
    expect(isStaticFirstRemovedOrReducedLegacyTag('ui-tabs')).toBe(false);
  });

  it('keeps the lookup set private to the module', () => {
    const source = readFileSync(removedOrReducedTagsPath, 'utf8');

    expect(source).not.toMatch(
      /export\s+(?:const|let|var)\s+STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAG_SET/u,
    );
  });
});
