import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const componentsRoot = path.join(projectRoot, 'src', 'components');
const manifestPath = path.join(projectRoot, 'custom-elements.json');

const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const walk = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    files.push(fullPath);
  }

  return files;
};

const collectDecoratorTagMap = () => {
  const result = new Map();

  for (const filePath of walk(componentsRoot)) {
    if (!filePath.endsWith('.ts')) {
      continue;
    }
    if (filePath.endsWith('.stories.ts') || filePath.endsWith('.test.ts')) {
      continue;
    }

    const source = readFileSync(filePath, 'utf8');

    for (const match of source.matchAll(
      /@customElement\(\s*['"`]([^'"`]+)['"`]\s*\)[\s\S]*?export\s+class\s+([A-Za-z0-9_]+)/g,
    )) {
      const [, tagName, className] = match;
      result.set(className, tagName);
    }
  }

  return result;
};

const patchManifest = () => {
  const tagMap = collectDecoratorTagMap();
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  manifest.modules = (manifest.modules ?? [])
    .filter(
      (module) =>
        typeof module?.path === 'string' && module.path.startsWith('src/components/'),
    )
    .map((module) => {
      const declarations = Array.isArray(module.declarations)
        ? module.declarations.map((declaration) => {
            if (
              declaration?.customElement === true &&
              typeof declaration?.name === 'string' &&
              !declaration.tagName
            ) {
              const tagName = tagMap.get(declaration.name);
              if (tagName) {
                return {
                  ...declaration,
                  tagName,
                };
              }
            }

            return declaration;
          })
        : module.declarations;

      return {
        ...module,
        declarations,
      };
    });

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
};

execFileSync(pnpmBin, ['exec', 'cem', 'analyze', '--config', 'cem.config.mjs'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

patchManifest();