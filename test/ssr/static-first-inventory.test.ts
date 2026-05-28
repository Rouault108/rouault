import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { HYDRATION_REGISTRY } from '../../src/client/hydration/registry.js';
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
import { SSR_COMPONENT_DEFINITIONS } from '../../build/ssr/target-definitions.js';
import { renderSsrTarget } from '../../build/ssr/target-adapters.js';
import type { StaticFirstUnknownUiAllowlistEntry } from '../../build/content/static-first-unknown-ui-allowlist.js';
import { STATIC_FIRST_UNKNOWN_UI_ALLOWLIST } from '../../build/content/static-first-unknown-ui-allowlist.js';

const repoRoot = process.cwd();

const gitFiles = (): readonly string[] =>
  execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

const sourceFiles = (): readonly string[] =>
  gitFiles().filter((path) => /^(src|build|shared|test)\/.+\.ts$/u.test(path));

const readRepoFile = (path: string): string => readFileSync(join(repoRoot, path), 'utf8');

const toPosixPath = (path: string): string => path.split('\\').join('/');

const normalizeRepositoryRelativePath = (path: string): string => toPosixPath(normalize(path));

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

const extractManifestCustomElementTags = (): readonly string[] => {
  const manifestPath = join(repoRoot, 'custom-elements.json');
  if (!existsSync(manifestPath)) {
    return [];
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    readonly modules?: readonly {
      readonly declarations?: readonly { readonly tagName?: string }[];
    }[];
  };
  const tags = new Set<string>();

  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.tagName) {
        tags.add(declaration.tagName);
      }
    }
  }

  return [...tags].sort();
};

const retainedTags = new Set(STATIC_FIRST_RETAINED_COMPONENTS.map((component) => component.tag));
const deletionTags = new Set(STATIC_FIRST_DELETION_TARGETS.map((target) => target.tag));
const staleTargets: readonly StaticFirstStaleTarget[] = STATIC_FIRST_STALE_TARGETS;
const unknownAllowlist: readonly StaticFirstUnknownUiAllowlistEntry[] =
  STATIC_FIRST_UNKNOWN_UI_ALLOWLIST;
const staleTags = new Set(staleTargets.flatMap((target) => target.tags ?? []));
const unknownTags = new Set(unknownAllowlist.map((entry) => entry.tag));
const retainedByTag: ReadonlyMap<string, (typeof STATIC_FIRST_RETAINED_COMPONENTS)[number]> = new Map(
  STATIC_FIRST_RETAINED_COMPONENTS.map((component) => [component.tag, component] as const),
);
const ssrDefinitionsByTag: ReadonlyMap<string, (typeof SSR_COMPONENT_DEFINITIONS)[number]> = new Map(
  SSR_COMPONENT_DEFINITIONS.map((definition) => [definition.tag, definition] as const),
);
const hydrationRegistryByTag: ReadonlyMap<string, (typeof HYDRATION_REGISTRY)[number]> = new Map(
  HYDRATION_REGISTRY.map((entry) => [entry.tag, entry] as const),
);
const SSR_SMOKE_ATTRIBUTES: ReadonlyMap<
  string,
  readonly { readonly name: string; readonly value: string }[]
> = new Map([
  [
    'layout-header',
    [
      { name: 'site-origin', value: 'https://example.test' },
      { name: 'base-path', value: '/' },
    ],
  ],
  [
    'layout-toc',
    [
      { name: 'headings-json', value: '[]' },
      {
        name: 'capabilities-json',
        value: '{"activeTracking":false,"dynamicScopes":false,"mobilePanel":false}',
      },
      { name: 'content-root-id', value: 'note-content' },
    ],
  ],
]);

const extractTargetAdapterImportPaths = (): readonly string[] => {
  const adapterPath = 'build/ssr/target-adapters.ts';
  const adapterSource = readRepoFile(adapterPath);
  const sideEffectImport = /import\s+['"]([^'"]+)['"];?/gu;
  const adapterDir = dirname(adapterPath);
  const imports: string[] = [];

  for (const match of adapterSource.matchAll(sideEffectImport)) {
    const specifier = match[1];
    if (!specifier?.startsWith('.')) {
      continue;
    }

    const resolvedPath = normalizeRepositoryRelativePath(join(adapterDir, specifier));
    const sourcePath = resolvedPath.endsWith('.js')
      ? `${resolvedPath.slice(0, -'.js'.length)}.ts`
      : resolvedPath;

    if (sourcePath.startsWith('src/components/')) {
      imports.push(sourcePath);
    }
  }

  return imports.sort();
};

const extractCustomElementTagsFromMarkdownOrStories = (
  paths: readonly string[],
): readonly { readonly path: string; readonly tag: string }[] => {
  const tagPattern = /<((?:app|layout|ui)-[a-z0-9._-]*)\b/gu;
  const matches: { path: string; tag: string }[] = [];

  for (const path of paths) {
    const source = readRepoFile(path);
    for (const match of source.matchAll(tagPattern)) {
      const tag = match[1];
      if (tag && !tag.startsWith('toast-')) {
        matches.push({ path, tag });
      }
    }
  }

  return matches;
};

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

  it('keeps retained component metadata complete and manifest policy explicit', () => {
    const tags = STATIC_FIRST_RETAINED_COMPONENTS.map((component) => component.tag);
    expect(tags).toEqual([...new Set(tags)]);

    for (const component of STATIC_FIRST_RETAINED_COMPONENTS) {
      expect(component.implementationPaths.length, component.tag).toBeGreaterThan(0);
      expect(component.ssrDefinitionRequired).toEqual(expect.any(Boolean));
      expect(component.targetAdapterImportRequired).toEqual(expect.any(Boolean));
      expect(component.hydrationRegistryRequired).toEqual(expect.any(Boolean));
      expect(component.ssrProfiles).toEqual(expect.any(Array));
      expect(component.hydrationProfiles).toEqual(expect.any(Array));

      for (const implementationPath of component.implementationPaths) {
        expect(existsSync(join(repoRoot, implementationPath)), implementationPath).toBe(true);
      }

      if (component.manifest === 'include') {
        expect(component.manifestModulePaths?.length, component.tag).toBeGreaterThan(0);
        expect(component.manifestExcludeReason, component.tag).toBeUndefined();
      } else {
        expect(component.manifestExcludeReason?.trim(), component.tag).toBeTruthy();
      }

      if (component.targetAdapterImportRequired) {
        expect(component.targetAdapterImportPaths?.length, component.tag).toBeGreaterThan(0);
        expect(component.targetAdapterImportExceptionReason, component.tag).toBeUndefined();
      } else {
        expect(component.targetAdapterImportPaths ?? [], component.tag).toEqual([]);
        if (component.ssrDefinitionRequired) {
          expect(component.targetAdapterImportExceptionReason?.trim(), component.tag).toBeTruthy();
        }
      }
    }
  });

  it('syncs custom-elements manifest tags with retained manifest policy', () => {
    const manifestTags = new Set(extractManifestCustomElementTags());

    for (const tag of manifestTags) {
      const component = retainedByTag.get(tag);
      expect(component, tag).toBeDefined();
      expect(component?.manifest, tag).toBe('include');
    }

    for (const component of STATIC_FIRST_RETAINED_COMPONENTS) {
      expect(manifestTags.has(component.tag), component.tag).toBe(component.manifest === 'include');
    }
  });

  it('syncs SSR definitions and hydration registry custom elements with retained inventory profiles', () => {
    for (const definition of SSR_COMPONENT_DEFINITIONS) {
      const component = retainedByTag.get(definition.tag);
      expect(component, definition.tag).toBeDefined();
      expect(component?.ssrDefinitionRequired, definition.tag).toBe(true);
      expect(component?.ssrProfiles, definition.tag).toEqual(definition.profiles);
    }

    for (const entry of HYDRATION_REGISTRY) {
      expect(entry.profiles.length, entry.tag).toBeGreaterThan(0);
      expect(entry.profiles, entry.tag).not.toContain('global');

      if (entry.kind === 'custom-element') {
        const component = retainedByTag.get(entry.tag);
        expect(component, entry.tag).toBeDefined();
        expect(component?.hydrationRegistryRequired, entry.tag).toBe(true);
        expect(component?.hydrationProfiles, entry.tag).toEqual(entry.profiles);
      }
    }

    for (const component of STATIC_FIRST_RETAINED_COMPONENTS) {
      expect(ssrDefinitionsByTag.has(component.tag), component.tag).toBe(
        component.ssrDefinitionRequired,
      );
      expect(hydrationRegistryByTag.has(component.tag), component.tag).toBe(
        component.hydrationRegistryRequired,
      );
    }
  });

  it('normalizes target adapter imports against retained targetAdapterImportPaths', () => {
    const actualImports = extractTargetAdapterImportPaths();
    const expectedImports = STATIC_FIRST_RETAINED_COMPONENTS.flatMap((component) =>
      component.targetAdapterImportRequired ? [...(component.targetAdapterImportPaths ?? [])] : [],
    ).sort();
    const stalePaths = new Set(staleTargets.flatMap((target) => target.paths));

    expect(actualImports).toEqual(expectedImports);

    for (const importedPath of actualImports) {
      expect(stalePaths.has(importedPath), importedPath).toBe(false);
    }
  });

  it('evaluates target adapter imports and smoke-renders import-required SSR targets', async () => {
    await import(pathToFileURL(join(repoRoot, 'build/ssr/target-adapters.ts')).href);

    for (const component of STATIC_FIRST_RETAINED_COMPONENTS) {
      if (!component.targetAdapterImportRequired) {
        continue;
      }

      for (const targetAdapterImportPath of component.targetAdapterImportPaths ?? []) {
        expect(existsSync(join(repoRoot, targetAdapterImportPath)), targetAdapterImportPath).toBe(
          true,
        );
      }

      const definition = ssrDefinitionsByTag.get(component.tag);
      expect(definition, component.tag).toBeDefined();
      if (!definition || definition.ssr === 'none') {
        continue;
      }

      const rendered = await renderSsrTarget(
        definition.tag,
        SSR_SMOKE_ATTRIBUTES.get(component.tag) ?? [],
        '',
      );
      expect(rendered, component.tag).toContain(`<${component.tag}`);
    }
  });

  it('keeps stateful note components synchronized across retained, SSR, adapter, hydration, docs, and manifest', () => {
    const adapterImports = new Set(extractTargetAdapterImportPaths());
    const manifestTags = new Set(extractCustomElementTags());

    for (const tag of STATEFUL_ALLOWED_NOTE_TAGS) {
      const component = retainedByTag.get(tag);
      expect(component?.kind, tag).toBe('retained-note-stateful');
      expect(component?.ssrDefinitionRequired, tag).toBe(true);
      expect(component?.targetAdapterImportRequired, tag).toBe(true);
      expect(component?.hydrationRegistryRequired, tag).toBe(true);
      expect(ssrDefinitionsByTag.has(tag), tag).toBe(true);
      expect(hydrationRegistryByTag.has(tag), tag).toBe(true);
      expect(manifestTags.has(tag), tag).toBe(true);

      for (const targetAdapterImportPath of component?.targetAdapterImportPaths ?? []) {
        expect(adapterImports.has(targetAdapterImportPath), `${tag}:${targetAdapterImportPath}`).toBe(
          true,
        );
      }
    }
  });

  it('keeps active design-system docs and Storybook custom element examples classified', () => {
    const docsAndStories = gitFiles().filter(
      (path) =>
        (/^docs\/design-system\/components\/.+\.md$/u.test(path) ||
          /^src\/.+\.stories\.ts$/u.test(path) ||
          /^test\/storybook\/.+\.ts$/u.test(path) ||
          /^\.storybook\/.+\.(ts|js|mjs)$/u.test(path)) &&
        existsSync(join(repoRoot, path)),
    );
    const deletedOrStale = new Set([...deletionTags, ...staleTags]);

    for (const { path, tag } of extractCustomElementTagsFromMarkdownOrStories(docsAndStories)) {
      expect(retainedTags.has(tag), `${path}:${tag}`).toBe(true);
      expect(deletedOrStale.has(tag), `${path}:${tag}`).toBe(false);
    }
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
