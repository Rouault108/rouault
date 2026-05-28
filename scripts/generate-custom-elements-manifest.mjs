import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const componentsRoot = path.join(projectRoot, 'src', 'components');
const manifestPath = path.join(projectRoot, 'custom-elements.json');

const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const STATIC_FIRST_MANIFEST_EXCLUDED_PATHS = new Set([
  'src/components/ui/article-header/article-header.ts',
  'src/components/ui/badge/badge.ts',
  'src/components/ui/banner/banner.ts',
  'src/components/ui/blockquote/blockquote.ts',
  'src/components/ui/breadcrumbs/breadcrumbs.ts',
  'src/components/ui/callout/callout.ts',
  'src/components/ui/card/card.ts',
  'src/components/ui/code-group/code-group.ts',
  'src/components/ui/codeblock/codeblock.ts',
  'src/components/ui/details/details.ts',
  'src/components/ui/divider/divider.ts',
  'src/components/ui/empty-state/empty-state.ts',
  'src/components/ui/footnote/footnote.ts',
  'src/components/ui/highlight/highlight.ts',
  'src/components/ui/icon/icon.ts',
  'src/components/ui/image/image.ts',
  'src/components/ui/info-box/info-box.ts',
  'src/components/ui/kbd/kbd.ts',
  'src/components/layout/layout-toc-controller.ts',
  'src/components/ui/math/math.ts',
  'src/components/ui/ol/ol.ts',
  'src/components/ui/pagination/pagination.ts',
  'src/components/ui/progress/progress.ts',
  'src/components/ui/score/score.ts',
  'src/components/ui/search-field/search-field.ts',
  'src/components/ui/search-trigger/search-trigger.ts',
  'src/components/ui/select/select.ts',
  'src/components/ui/skeleton/skeleton.ts',
  'src/components/ui/slider/slider.ts',
  'src/components/ui/syntax-card/syntax-card.ts',
  'src/components/ui/syntax-card/syntax-section.ts',
  'src/components/ui/syntax-field/syntax-field.ts',
  'src/components/ui/table/table.ts',
  'src/components/ui/ul/ul.ts',
]);

const toProjectPath = (filePath) => path.relative(projectRoot, filePath).split(path.sep).join('/');

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

    const projectPath = toProjectPath(filePath);
    if (STATIC_FIRST_MANIFEST_EXCLUDED_PATHS.has(projectPath)) {
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
    .filter((module) => {
      if (typeof module?.path !== 'string' || !module.path.startsWith('src/components/')) {
        return false;
      }
      return !STATIC_FIRST_MANIFEST_EXCLUDED_PATHS.has(module.path);
    })
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
