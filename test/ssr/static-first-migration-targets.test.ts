import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { STATIC_FIRST_DELETION_TARGETS } from '../../build/content/static-first-deletion-targets.js';
import {
  STATIC_FIRST_MIGRATION_TARGETS,
  type StaticFirstFunctionalCompatibility,
  type StaticFirstMigrationStatus,
} from '../../build/content/static-first-migration-targets.js';

const repoRoot = process.cwd();
const migrationTargetsPath = join(repoRoot, 'build/content/static-first-migration-targets.ts');

const EXPECTED_MIGRATION_TARGETS = [
  {
    tag: 'ui-pagination',
    formerImplementationPaths: ['src/components/ui/pagination/pagination.ts'],
    status: 'absorbed-locally',
    functionalCompatibility: 'reduced',
  },
  {
    tag: 'ui-skeleton',
    formerImplementationPaths: ['src/components/ui/skeleton/skeleton.ts'],
    status: 'contract-reduced',
    functionalCompatibility: 'partial',
  },
  {
    tag: 'ui-select',
    formerImplementationPaths: ['src/components/ui/select/select.ts'],
    status: 'native-equivalent',
    functionalCompatibility: 'reduced',
  },
  {
    tag: 'ui-icon',
    formerImplementationPaths: ['src/components/ui/icon/icon.ts'],
    status: 'static-helper',
    functionalCompatibility: 'partial',
  },
  {
    tag: 'ui-empty-state',
    formerImplementationPaths: ['src/components/ui/empty-state/empty-state.ts'],
    status: 'static-helper',
    functionalCompatibility: 'partial',
  },
  {
    tag: 'ui-kbd',
    formerImplementationPaths: ['src/components/ui/kbd/kbd.ts'],
    status: 'native-equivalent',
    functionalCompatibility: 'reduced',
  },
] as const satisfies readonly {
  readonly tag: string;
  readonly formerImplementationPaths: readonly string[];
  readonly status: StaticFirstMigrationStatus;
  readonly functionalCompatibility: StaticFirstFunctionalCompatibility;
}[];

describe('static-first migration targets', () => {
  it('records only the reduced legacy migration targets from the policy', () => {
    expect(
      STATIC_FIRST_MIGRATION_TARGETS.map(
        ({ tag, formerImplementationPaths, status, functionalCompatibility }) => ({
          tag,
          formerImplementationPaths,
          status,
          functionalCompatibility,
        }),
      ),
    ).toEqual(EXPECTED_MIGRATION_TARGETS);
    expect(STATIC_FIRST_MIGRATION_TARGETS.map((target) => target.tag)).not.toContain(
      'ui-checkbox',
    );
  });

  it('requires notes and marks every note as derived from old materials', () => {
    for (const target of STATIC_FIRST_MIGRATION_TARGETS) {
      expect(target.notes.trim(), target.tag).toBeTruthy();
      expect(target.notes, target.tag).toContain('旧資料由来');
    }
  });

  it('keeps migration targets separate from deletion targets', () => {
    const deletionTags = new Set(STATIC_FIRST_DELETION_TARGETS.map((target) => target.tag));

    for (const target of STATIC_FIRST_MIGRATION_TARGETS) {
      expect(deletionTags.has(target.tag), target.tag).toBe(false);
    }
  });

  it('does not depend on static-first tag inventories or filesystem existence checks', () => {
    const source = readFileSync(migrationTargetsPath, 'utf8');

    expect(source).not.toMatch(/from\s+['"]\.\/static-first-(?:deletion-targets|tags)\.js['"]/u);
    expect(source).not.toMatch(/\b(?:existsSync|statSync|accessSync)\b/u);
  });
});
