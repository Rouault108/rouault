import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import postcss, { type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();

const readSource = (path: string): Promise<string> => readFile(join(rootDir, path), 'utf8');

const extractCssTemplateLiterals = (source: string): string[] => {
  const cssBlocks: string[] = [];
  const cssTemplatePattern = /css`([\s\S]*?)`/gu;

  for (const match of source.matchAll(cssTemplatePattern)) {
    cssBlocks.push(match[1] ?? '');
  }

  return cssBlocks;
};

const listSourceFiles = async (
  directory: string,
  extensions: readonly string[],
): Promise<string[]> => {
  const entries = await readdir(join(rootDir, directory), { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const path = `${directory}/${entry.name}`;

      if (entry.isDirectory()) {
        return listSourceFiles(path, extensions);
      }

      if (entry.isFile() && extensions.some((extension) => path.endsWith(extension))) {
        return [path];
      }

      return [];
    }),
  );

  return files.flat();
};

const selectorTargetsNoteSidebarUiHeader = (selector: string): boolean => {
  const ast = selectorParser().astSync(selector);
  let matches = false;

  ast.each((selectorNode) => {
    const attributes = new Set<string>();
    let targetsUiHeader = false;

    selectorNode.walkAttributes((attributeNode) => {
      attributes.add(attributeNode.attribute);
    });

    selectorNode.walkTags((tagNode) => {
      if (tagNode.value === 'ui-header') {
        targetsUiHeader = true;
      }
    });

    if (attributes.has('note-layout') && attributes.has('sidebar-enabled') && targetsUiHeader) {
      matches = true;
    }
  });

  return matches;
};

const ruleHasHeaderWidthBridgeDeclaration = (rule: Rule): boolean => {
  let hasDeclaration = false;

  rule.walkDecls((declaration: Declaration) => {
    if (
      declaration.prop === '--ui-header-max-inline-size' ||
      declaration.prop === '--ui-header-max-inline-size-with-sidebar'
    ) {
      hasDeclaration = true;
    }
  });

  return hasDeclaration;
};

describe('header width source contract', () => {
  it('ui-header and layout-header do not keep legacy component width fallbacks', async () => {
    const headerSource = await readSource('src/components/ui/header/header.ts');
    const layoutHeaderSource = await readSource('src/components/layout/layout-header.ts');

    const widthFallbackPattern =
      /--ui-header-max-inline-size(?:-with-sidebar)?\s*:[^;]*(?:1280px|--bp-xl)/u;
    const directMaxInlinePattern = /max-inline-size\s*:[^;]*(?:1280px|--bp-xl)/u;
    const expectedChain =
      /--ui-header-max-inline-size\s*:\s*var\(\s*--app-header-inner-max-width\s*,\s*var\(\s*--layout-chrome-max-width\s*,\s*1384px\s*\)\s*\)/u;

    expect(headerSource).not.toMatch(widthFallbackPattern);
    expect(layoutHeaderSource).not.toMatch(widthFallbackPattern);
    expect(headerSource).not.toMatch(directMaxInlinePattern);
    expect(layoutHeaderSource).not.toMatch(directMaxInlinePattern);
    expect(headerSource).toMatch(expectedChain);
    expect(layoutHeaderSource).toMatch(expectedChain);
  });

  it('tokens.css defines legacy header width default without root app-header alias', async () => {
    const tokensSource = await readSource('src/assets/css/tokens.css');

    expect(tokensSource).toMatch(/--layout-chrome-max-width\s*:\s*1384px\s*;/u);
    expect(tokensSource).not.toMatch(
      /--app-header-inner-max-width\s*:\s*var\(\s*--layout-chrome-max-width\s*\)\s*;/u,
    );
  });

  it('layout-header note-layout plus sidebar-enabled selector does not override width bridge tokens', async () => {
    const layoutHeaderSource = await readSource('src/components/layout/layout-header.ts');
    const cssSource = extractCssTemplateLiterals(layoutHeaderSource).join('\n');
    const root = postcss.parse(cssSource, { from: 'src/components/layout/layout-header.ts' });

    root.walkRules((rule) => {
      if (!selectorTargetsNoteSidebarUiHeader(rule.selector)) {
        return;
      }

      expect(
        ruleHasHeaderWidthBridgeDeclaration(rule),
        `selector "${rule.selector}" must not override ui-header width bridge tokens`,
      ).to.equal(false);
    });
  });

  it('header width tokens are not overridden by page-specific src styles', async () => {
    const allowed = new Set([
      'src/assets/css/tokens.css',
      'src/components/ui/header/header.ts',
      'src/components/layout/layout-header.ts',
      'src/components/ui/header/header.stories.ts',
    ]);
    const tokenDeclaration =
      /--(?:app-header-inner-max-width|layout-chrome-max-width|ui-header-max-inline-size|ui-header-max-inline-size-with-sidebar)\s*:/u;

    for (const file of await listSourceFiles('src', ['.ts', '.css'])) {
      if (allowed.has(file)) {
        continue;
      }

      const source = await readSource(file);
      expect(source, file).not.toMatch(tokenDeclaration);
    }
  });

  it('header design-system docs follow app header width token contract', async () => {
    const docsSource = await readSource('docs/design-system/components/header.md');

    expect(docsSource).toContain('--app-header-inner-max-width');
    expect(docsSource).toMatch(
      /--layout-chrome-max-width[\s\S]{0,160}legacy|legacy[\s\S]{0,160}--layout-chrome-max-width/u,
    );
    expect(docsSource).toMatch(/--ui-header-max-inline-size[\s\S]{0,200}(adapter|bridge|内部)/u);
    expect(docsSource).toMatch(/border-box\s+width|border-box\s+幅/u);
    expect(docsSource).not.toMatch(/最大幅[\s\S]{0,80}`--bp-xl`/u);
    expect(docsSource).not.toMatch(
      /header\s*center\s*zone[\s\S]{0,120}note\s*fixed\s*frame[\s\S]{0,120}TOC\s*reserve[\s\S]{0,120}同じ\s*layout\s*token/u,
    );
    expect(docsSource).not.toMatch(/note\s*frame[\s\S]{0,120}header\s*frame[\s\S]{0,120}外形契約/u);
    expect(docsSource).not.toMatch(
      /旧\s*default\s*visual\s*value[\s\S]{0,80}1280px[\s\S]{0,80}保持/u,
    );
  });

  it('header story docs describe the app header width contract', async () => {
    const storySource = await readSource('src/components/ui/header/header.stories.ts');

    expect(storySource).toContain('--app-header-inner-max-width');
    expect(storySource).toMatch(
      /--layout-chrome-max-width[\s\S]{0,160}legacy|legacy[\s\S]{0,160}--layout-chrome-max-width/u,
    );
    expect(storySource).toMatch(/--ui-header-max-inline-size[\s\S]{0,200}(bridge|adapter|内部)/u);
    expect(storySource).toContain('--ui-header-max-inline-size-with-sidebar');
    expect(storySource).toMatch(/border-box\s+width|border-box\s+幅/u);
    expect(storySource).toMatch(/1280px[\s\S]{0,120}(保証しない|維持しない)/u);
    expect(storySource).toMatch(/sidebar-expanded[\s\S]{0,160}(同じ|same)[\s\S]{0,160}(幅|width)/u);
  });
});
