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
    replacementContract:
      'ui-list renders local nav.ui-pagination[data-pagination] markup for previous, current status, and next controls.',
    retainedDesignContract:
      'Pagination remains a quiet local list navigation affordance with clear current-page status.',
    removedDesignContract: [
      'standalone ui-pagination custom element',
      'numbered page item API',
      'ellipsis pagination API',
      'regular/compact/page variants',
    ],
  },
  {
    tag: 'ui-skeleton',
    formerImplementationPaths: ['src/components/ui/skeleton/skeleton.ts'],
    status: 'contract-reduced',
    functionalCompatibility: 'partial',
    replacementContract:
      'Skeleton rendering is limited to existing visual CSS utility usage and ui-file-tree internal loading markup.',
    retainedDesignContract:
      'Skeleton surfaces remain visual-only loading placeholders without becoming a reusable public component API.',
    removedDesignContract: [
      'standalone ui-skeleton custom element',
      'variant property',
      'width property',
      'height property',
      'animated property',
    ],
  },
  {
    tag: 'ui-select',
    formerImplementationPaths: ['src/components/ui/select/select.ts'],
    status: 'native-equivalent',
    functionalCompatibility: 'reduced',
    replacementContract:
      'Form selection surfaces use native select markup with explicit label association, name, and selected option state.',
    retainedDesignContract:
      'Select controls keep native form semantics and page-local styling without recreating the former custom listbox.',
    removedDesignContract: [
      'standalone ui-select custom element',
      'custom listbox role surface',
      'custom option role surface',
      'readonly select output',
      'former custom select API',
    ],
  },
  {
    tag: 'ui-icon',
    formerImplementationPaths: ['src/components/ui/icon/icon.ts'],
    status: 'static-helper',
    functionalCompatibility: 'partial',
    replacementContract:
      'Icons are emitted through renderStaticIconHtml() as static SVG, decorative by default with explicit semantic labeling support.',
    retainedDesignContract:
      'Icon output remains static, escaped, and independent from runtime custom element registration.',
    removedDesignContract: [
      'standalone ui-icon custom element',
      'iconify-icon runtime element output',
      'implicit semantic icon labeling',
    ],
  },
  {
    tag: 'ui-empty-state',
    formerImplementationPaths: ['src/components/ui/empty-state/empty-state.ts'],
    status: 'static-helper',
    functionalCompatibility: 'partial',
    replacementContract:
      'Corpus pages render empty-hint[data-empty-state] through static empty-state HTML for the supported page-local variants.',
    retainedDesignContract:
      'Empty states stay calm, page-local reading aids with escaped heading and description content.',
    removedDesignContract: [
      'standalone ui-empty-state custom element',
      'search empty state helper generalization',
      'trusted static HTML fields',
      'role="status" output from the helper',
    ],
  },
  {
    tag: 'ui-kbd',
    formerImplementationPaths: ['src/components/ui/kbd/kbd.ts'],
    status: 'native-equivalent',
    functionalCompatibility: 'reduced',
    replacementContract:
      'Keyboard hints use native kbd markup where needed, without a shared helper or custom element wrapper.',
    retainedDesignContract:
      'Keyboard notation keeps native inline semantics and page-local presentation.',
    removedDesignContract: [
      'standalone ui-kbd custom element',
      'tokens property',
      'component-level composite shortcut rendering',
      'key reading normalization',
      'sr-only reading support',
      'slot fallback API',
    ],
  },
] as const satisfies readonly {
  readonly tag: string;
  readonly formerImplementationPaths: readonly string[];
  readonly status: StaticFirstMigrationStatus;
  readonly functionalCompatibility: StaticFirstFunctionalCompatibility;
  readonly replacementContract: string;
  readonly retainedDesignContract: string;
  readonly removedDesignContract: readonly string[];
}[];

describe('static-first migration targets', () => {
  it('records only the reduced legacy migration targets from the policy', () => {
    expect(
      STATIC_FIRST_MIGRATION_TARGETS.map(
        ({
          tag,
          formerImplementationPaths,
          status,
          functionalCompatibility,
          replacementContract,
          retainedDesignContract,
          removedDesignContract,
        }) => ({
          tag,
          formerImplementationPaths,
          status,
          functionalCompatibility,
          replacementContract,
          retainedDesignContract,
          removedDesignContract,
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
