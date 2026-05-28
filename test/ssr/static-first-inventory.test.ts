import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  getStaticFirstTagClassifications,
  STATEFUL_ALLOWED_NOTE_TAGS,
} from '../../build/content/static-first-tags.js';
import { STATIC_FIRST_DELETION_TARGETS } from '../../build/content/static-first-deletion-targets.js';
import { STATIC_FIRST_RETAINED_COMPONENTS } from '../../build/content/static-first-retained-components.js';
import {
  type StaticFirstStaleTarget,
  STATIC_FIRST_STALE_TARGETS,
} from '../../build/content/static-first-stale-targets.js';
import type { StaticFirstUnknownUiAllowlistEntry } from '../../build/content/static-first-unknown-ui-allowlist.js';
import { STATIC_FIRST_UNKNOWN_UI_ALLOWLIST } from '../../build/content/static-first-unknown-ui-allowlist.js';

const repoRoot = process.cwd();

const gitFiles = (): readonly string[] =>
  execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

const sourceFiles = (): readonly string[] =>
  gitFiles().filter((path) => /^(src|build|shared|test)\/.+\.ts$/u.test(path));

const readRepoFile = (path: string): string => readFileSync(join(repoRoot, path), 'utf8');

const extractCustomElementTags = (): readonly string[] => {
  const tags = new Set<string>();
  const customElementDecorator = /@customElement\(\s*['"]([a-z0-9._-]+)['"]\s*\)/gu;
  const customElementsDefine = /customElements\.define\(\s*['"]([a-z0-9._-]+)['"]/gu;

  for (const path of sourceFiles()) {
    const source = readRepoFile(path);
    for (const match of source.matchAll(customElementDecorator)) {
      tags.add(match[1] ?? '');
    }
    for (const match of source.matchAll(customElementsDefine)) {
      tags.add(match[1] ?? '');
    }
  }

  const manifestPath = join(repoRoot, 'custom-elements.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      readonly modules?: readonly {
        readonly declarations?: readonly { readonly tagName?: string }[];
      }[];
    };
    for (const module of manifest.modules ?? []) {
      for (const declaration of module.declarations ?? []) {
        if (declaration.tagName) {
          tags.add(declaration.tagName);
        }
      }
    }
  }

  tags.delete('');
  return [...tags].sort();
};

const retainedTags = new Set(STATIC_FIRST_RETAINED_COMPONENTS.map((component) => component.tag));
const deletionTags = new Set(STATIC_FIRST_DELETION_TARGETS.map((target) => target.tag));
const staleTargets: readonly StaticFirstStaleTarget[] = STATIC_FIRST_STALE_TARGETS;
const unknownAllowlist: readonly StaticFirstUnknownUiAllowlistEntry[] =
  STATIC_FIRST_UNKNOWN_UI_ALLOWLIST;
const staleTags = new Set(staleTargets.flatMap((target) => target.tags ?? []));
const unknownTags = new Set(unknownAllowlist.map((entry) => entry.tag));

describe('static-first inventory split', () => {
  it('keeps deletion target classification metadata synchronized through multi-classification API', () => {
    for (const target of STATIC_FIRST_DELETION_TARGETS) {
      expect(target.classifications).toEqual(getStaticFirstTagClassifications(target.tag));
      expect(STATEFUL_ALLOWED_NOTE_TAGS).not.toContain(target.tag);
      expect(retainedTags.has(target.tag)).toBe(false);
      expect(unknownTags.has(target.tag)).toBe(false);
    }
  });

  it('keeps retained, deletion, stale, and unknown classifications mutually explicit', () => {
    for (const tag of retainedTags) {
      expect(deletionTags.has(tag)).toBe(false);
      expect(unknownTags.has(tag)).toBe(false);
    }

    for (const tag of staleTags) {
      expect(retainedTags.has(tag)).toBe(false);
      expect(unknownTags.has(tag)).toBe(false);
    }
  });

  it('classifies every repository custom element tag without using unknown UI as a substitute', () => {
    expect(STATIC_FIRST_UNKNOWN_UI_ALLOWLIST).toEqual([]);

    const unclassified = extractCustomElementTags().filter(
      (tag) =>
        !retainedTags.has(tag) &&
        !deletionTags.has(tag) &&
        !staleTags.has(tag) &&
        !unknownTags.has(tag),
    );

    expect(unclassified).toEqual([]);
  });

  it('defines machine-readable stale targets and residual references', () => {
    for (const target of staleTargets) {
      expect(target.targetKind).toEqual(expect.any(String));
      expect(target.pathKind).toEqual(expect.any(String));
      expect(target.paths.length).toBeGreaterThan(0);
      expect(target.replacementContract).toEqual(expect.any(String));
      expect(target.deleteMode).toEqual(expect.any(String));

      for (const reference of target.allowedResidualReferences ?? []) {
        expect(reference.path).toEqual(expect.any(String));
        expect(reference.kind).toMatch(
          /^(negative-test|historical-prose|retained-design-system-internal-test|stale-fixture|archived-snapshot)$/u,
        );
        expect(reference.reason).toEqual(expect.any(String));
        expect(reference.matchMode).toMatch(/^(exact-token|regex|ast-selector|path-only)$/u);
        if (reference.matchMode === 'path-only') {
          expect(reference.tokens).toEqual([]);
          expect(reference.kind).toMatch(/^(historical-prose|stale-fixture|archived-snapshot)$/u);
        } else {
          expect(reference.tokens.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps shared profile types in a low-level module without reverse imports', () => {
    const source = readRepoFile('shared/static-first-profiles.ts');
    expect(source).not.toMatch(/from ['"].*(src|build|content|lit|parse5|rehype|remark)/u);
    expect(source).not.toContain("'global'");
  });
});
