import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { STATIC_FIRST_DELETION_TARGETS } from '../../build/content/static-first-deletion-targets.js';
import { STATIC_FIRST_RETAINED_COMPONENTS } from '../../build/content/static-first-retained-components.js';
import { STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS } from '../../build/content/static-first-removed-or-reduced-tags.js';
import { STATIC_FIRST_UNKNOWN_UI_ALLOWLIST } from '../../build/content/static-first-unknown-ui-allowlist.js';
import { STATEFUL_ALLOWED_NOTE_TAGS } from '../../build/content/static-first-tags.js';

const repoRoot = process.cwd();
const oldManifestScriptPath = [
  'scripts',
  ['generate-custom-elements-', 'manifest.mjs'].join(''),
].join('/');
const oldPathDenylistToken = ['STATIC', 'FIRST', 'MANIFEST', 'EXCLUDED', 'PATHS'].join('_');

interface CustomElementsManifest {
  readonly modules?: readonly {
    readonly path?: string;
    readonly declarations?: readonly {
      readonly tagName?: string;
      readonly customElement?: boolean;
    }[];
  }[];
}

const gitFiles = (): readonly string[] =>
  execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

const readRepoFile = (path: string): string => readFileSync(join(repoRoot, path), 'utf8');

const assertGeneratedManifestExists = (): void => {
  const manifestPath = join(repoRoot, 'custom-elements.json');

  if (!existsSync(manifestPath)) {
    throw new Error(
      'Generated custom-elements.json does not exist. Run pnpm run codegen:manifest before this test.',
    );
  }
};

const readManifest = (): CustomElementsManifest => {
  assertGeneratedManifestExists();
  return JSON.parse(readRepoFile('custom-elements.json')) as CustomElementsManifest;
};

const readPackageJson = (): { readonly scripts?: Readonly<Record<string, string>> } =>
  JSON.parse(readRepoFile('package.json')) as {
    readonly scripts?: Readonly<Record<string, string>>;
  };

const extractManifestCustomElementTags = (manifest: CustomElementsManifest): readonly string[] => {
  const tags = new Set<string>();

  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.customElement === true && declaration.tagName) {
        tags.add(declaration.tagName);
      }
    }
  }

  return [...tags].sort();
};

const manifestReferencePaths = (): readonly string[] =>
  gitFiles().filter((path) => {
    if (!existsSync(join(repoRoot, path))) {
      return false;
    }
    return (
      path === 'package.json' ||
      path === 'cem.config.mjs' ||
      /^\.github\//u.test(path) ||
      /^\.storybook\//u.test(path) ||
      /^docs\//u.test(path) ||
      /^scripts\//u.test(path) ||
      /^test\/(storybook|storybook-meta|storybook-smoke)\//u.test(path) ||
      /^test\/.+\.(?:ts|js|mjs)$/u.test(path)
    );
  });

describe('static-first manifest generation contract', () => {
  it('generates custom-elements.json from retained manifest inventory', () => {
    const manifest = readManifest();
    const manifestTags = new Set(extractManifestCustomElementTags(manifest));
    const retainedByTag = new Map(
      STATIC_FIRST_RETAINED_COMPONENTS.map((component) => [component.tag, component] as const),
    );

    for (const tag of manifestTags) {
      const retainedComponent = retainedByTag.get(tag);
      expect(retainedComponent, tag).toBeDefined();
      expect(retainedComponent?.manifest, tag).toBe('include');
    }

    for (const component of STATIC_FIRST_RETAINED_COMPONENTS) {
      if (component.manifest === 'include') {
        expect(component.manifestModulePaths?.length, component.tag).toBeGreaterThan(0);
        expect(component.manifestExcludeReason, component.tag).toBeUndefined();
        expect(manifestTags.has(component.tag), component.tag).toBe(true);
      } else {
        expect(component.manifestExcludeReason?.trim(), component.tag).toBeTruthy();
        expect(manifestTags.has(component.tag), component.tag).toBe(false);
      }
    }
  });

  it('runs the TypeScript manifest generator from package scripts', () => {
    const scripts = readPackageJson().scripts;

    expect(scripts?.['codegen:manifest']).toBe(
      'pnpm run codegen:icons && pnpm exec tsx scripts/generate-custom-elements-manifest.ts',
    );
    expect(scripts?.['test:ssr']).toBe(
      'pnpm run codegen:manifest && pnpm run codegen:content && pnpm exec vitest --project ssr',
    );
    expect(existsSync(join(repoRoot, oldManifestScriptPath))).toBe(false);
  });

  it('keeps generated custom-elements manifest stable after codegen', () => {
    expect(() =>
      execFileSync('git', ['diff', '--exit-code', '--', 'custom-elements.json'], {
        cwd: repoRoot,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('does not emit removed-or-reduced legacy tags, unknown UI entries, or non-retained stateful note gaps', () => {
    const manifestTags = new Set(extractManifestCustomElementTags(readManifest()));
    const unknownTags = new Set(
      (STATIC_FIRST_UNKNOWN_UI_ALLOWLIST as readonly { readonly tag: string }[]).map(
        (entry) => entry.tag,
      ),
    );

    for (const tag of STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS) {
      expect(manifestTags.has(tag), tag).toBe(false);
    }
    for (const tag of unknownTags) {
      expect(manifestTags.has(tag), tag).toBe(false);
    }
    for (const tag of STATEFUL_ALLOWED_NOTE_TAGS) {
      expect(manifestTags.has(tag), tag).toBe(true);
    }
  });

  it('keeps old manifest path denylist out of package, CI, docs, tests, Storybook, and scripts', () => {
    for (const path of manifestReferencePaths()) {
      const source = readRepoFile(path);
      expect(source.includes(oldManifestScriptPath), path).toBe(false);
      expect(source.includes(oldPathDenylistToken), path).toBe(false);
    }
  });

  it('keeps cem and Storybook consumers from replacing retained inventory filtering', () => {
    const scopedConsumerPaths = manifestReferencePaths().filter(
      (path) =>
        path === 'cem.config.mjs' || /^\.storybook\//u.test(path) || /^test\/storybook/u.test(path),
    );
    const deletedImplementationPaths = STATIC_FIRST_DELETION_TARGETS.flatMap(
      (target) => target.implementationPaths,
    );

    for (const path of scopedConsumerPaths) {
      const source = readRepoFile(path);
      for (const deletedPath of deletedImplementationPaths) {
        expect(source.includes(deletedPath), `${path}:${deletedPath}`).toBe(false);
      }
    }
  });
});
