import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { STATIC_FIRST_DELETION_TARGETS } from '../build/content/static-first-deletion-targets.js';
import { STATIC_FIRST_RETAINED_COMPONENTS } from '../build/content/static-first-retained-components.js';
import { STATIC_FIRST_UNKNOWN_UI_ALLOWLIST } from '../build/content/static-first-unknown-ui-allowlist.js';

interface CustomElementsManifest {
  readonly schemaVersion?: string;
  readonly readme?: string;
  readonly modules?: readonly CustomElementsManifestModule[];
}

interface CustomElementsManifestModule {
  readonly path?: string;
  readonly declarations?: readonly CustomElementsManifestDeclaration[];
  readonly exports?: readonly unknown[];
  readonly [key: string]: unknown;
}

interface CustomElementsManifestDeclaration {
  readonly name?: string;
  readonly tagName?: string;
  readonly customElement?: boolean;
  readonly [key: string]: unknown;
}

interface PackageJsonWithBin {
  readonly name?: string;
  readonly bin?: string | Readonly<Record<string, string>>;
}

const nodeRequire = createRequire(import.meta.url);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const componentsRoot = path.join(projectRoot, 'src', 'components');
const manifestPath = path.join(projectRoot, 'custom-elements.json');

const retainedManifestComponents = STATIC_FIRST_RETAINED_COMPONENTS.filter(
  (component) => component.manifest === 'include',
);
const retainedManifestTags = new Set(retainedManifestComponents.map((component) => component.tag));
const retainedManifestModulePaths = new Set(
  retainedManifestComponents.flatMap((component) => component.manifestModulePaths ?? []),
);
const deletionTags = new Set(STATIC_FIRST_DELETION_TARGETS.map((target) => target.tag));
const unknownTags = new Set(
  (STATIC_FIRST_UNKNOWN_UI_ALLOWLIST as readonly { readonly tag: string }[]).map(
    (entry) => entry.tag,
  ),
);

const resolvePackageRoot = (packageName: string): string => {
  const packageEntryPath = nodeRequire.resolve(packageName);
  let currentDir = path.dirname(packageEntryPath);

  while (true) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
        readonly name?: string;
      };

      if (packageJson.name === packageName) {
        return currentDir;
      }
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      throw new Error(`Unable to resolve package root: ${packageName}`);
    }

    currentDir = parentDir;
  }
};

const resolvePackageBin = (packageName: string, binName: string): string => {
  const packageRoot = resolvePackageRoot(packageName);
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJsonWithBin;

  const binPath =
    typeof packageJson.bin === 'object' && packageJson.bin !== null
      ? packageJson.bin[binName]
      : undefined;

  if (!binPath) {
    throw new Error(`Unable to resolve bin "${binName}" from package: ${packageName}`);
  }

  const resolvedBinPath = path.resolve(packageRoot, binPath);

  if (!existsSync(resolvedBinPath)) {
    throw new Error(`Resolved bin does not exist: ${resolvedBinPath}`);
  }

  return resolvedBinPath;
};

const toProjectPath = (filePath: string): string =>
  path.relative(projectRoot, filePath).split(path.sep).join('/');

const walk = (dir: string): readonly string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
};

const assertManifestInventory = (): void => {
  const seenTags = new Set<string>();

  for (const component of STATIC_FIRST_RETAINED_COMPONENTS) {
    if (seenTags.has(component.tag)) {
      throw new Error(`Duplicate retained component tag: ${component.tag}`);
    }
    seenTags.add(component.tag);

    if (component.manifest === 'include') {
      if (!component.manifestModulePaths?.length) {
        throw new Error(`Retained manifest include is missing module paths: ${component.tag}`);
      }
      if (component.manifestExcludeReason !== undefined) {
        throw new Error(`Retained manifest include has exclude reason: ${component.tag}`);
      }
      continue;
    }

    if (!component.manifestExcludeReason?.trim()) {
      throw new Error(`Retained manifest exclude is missing reason: ${component.tag}`);
    }
  }

  for (const tag of retainedManifestTags) {
    if (deletionTags.has(tag)) {
      throw new Error(`Deletion target cannot be emitted in manifest: ${tag}`);
    }
    if (unknownTags.has(tag)) {
      throw new Error(`Unknown UI allowlist cannot drive manifest inclusion: ${tag}`);
    }
  }
};

const collectDecoratorTagMap = (): ReadonlyMap<string, string> => {
  const result = new Map<string, string>();
  const customElementDecorator =
    /@customElement\(\s*['"`]([^'"`]+)['"`]\s*\)[\s\S]*?export\s+class\s+([A-Za-z0-9_]+)/gu;

  for (const filePath of walk(componentsRoot)) {
    if (!filePath.endsWith('.ts')) {
      continue;
    }
    if (filePath.endsWith('.stories.ts') || filePath.endsWith('.test.ts')) {
      continue;
    }

    const projectPath = toProjectPath(filePath);
    if (!retainedManifestModulePaths.has(projectPath)) {
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(customElementDecorator)) {
      const tagName = match[1];
      const className = match[2];
      if (!tagName || !className) {
        continue;
      }
      result.set(className, tagName);
    }
  }

  return result;
};

const getDeclarationTagName = (
  declaration: CustomElementsManifestDeclaration,
  tagMap: ReadonlyMap<string, string>,
): string | undefined => {
  if (declaration.tagName) {
    return declaration.tagName;
  }
  if (declaration.name) {
    return tagMap.get(declaration.name);
  }
  return undefined;
};

const patchManifest = (): void => {
  const tagMap = collectDecoratorTagMap();
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as CustomElementsManifest;
  const emittedTags = new Set<string>();
  const modules = (manifest.modules ?? [])
    .filter(
      (module) => typeof module.path === 'string' && retainedManifestModulePaths.has(module.path),
    )
    .map((module): CustomElementsManifestModule => {
      const declarations = (module.declarations ?? [])
        .map((declaration): CustomElementsManifestDeclaration | undefined => {
          if (declaration.customElement !== true) {
            return declaration;
          }

          const tagName = getDeclarationTagName(declaration, tagMap);
          if (!tagName || !retainedManifestTags.has(tagName)) {
            return undefined;
          }

          emittedTags.add(tagName);
          return { ...declaration, tagName };
        })
        .filter(
          (declaration): declaration is CustomElementsManifestDeclaration =>
            declaration !== undefined,
        );

      return { ...module, declarations };
    });

  for (const expectedTag of retainedManifestTags) {
    if (!emittedTags.has(expectedTag)) {
      throw new Error(`Retained manifest include was not emitted: ${expectedTag}`);
    }
  }

  for (const emittedTag of emittedTags) {
    if (deletionTags.has(emittedTag)) {
      throw new Error(`Deletion target emitted in manifest: ${emittedTag}`);
    }
    if (unknownTags.has(emittedTag)) {
      throw new Error(`Unknown UI allowlist emitted in manifest: ${emittedTag}`);
    }
  }

  writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, modules }, null, 2)}\n`, 'utf8');
};

const runCustomElementsManifestAnalyzer = (): void => {
  const cemBinPath = resolvePackageBin('@custom-elements-manifest/analyzer', 'cem');

  const result = spawnSync(
    process.execPath,
    [cemBinPath, 'analyze', '--config', 'cem.config.mjs'],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const reason =
      result.signal !== null
        ? `signal ${result.signal}`
        : `exit code ${result.status ?? '<unknown>'}`;

    throw new Error(`Custom Elements Manifest analyzer failed with ${reason}.`);
  }
};

const main = (): void => {
  assertManifestInventory();
  runCustomElementsManifestAnalyzer();
  patchManifest();
};

main();
