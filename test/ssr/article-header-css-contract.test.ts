import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss, { type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

import { Tag } from '../../src/components/ui/tag/tag.js';
import { collectCssText } from './css-contract-test-helpers.js';
import {
  hasDeclarationForSelector,
  hasDeclarationPropertyForSelector,
  hasDeclarationValueIncluding,
  hasDeclarationTokenForSelector,
  lacksDeclarationPropertyForSelector,
} from './support/css-contract.js';

const articleHeaderCssPath = resolve('src/assets/css/article-header.css');
const tagRecipeCssPath = resolve('src/assets/css/recipes/article-header-static-tag-link.css');
const mainCssPath = resolve('src/assets/css/main.css');
const articleHeaderSourcePath = resolve('src/components/ui/article-header/article-header.ts');

const readCss = (path: string): string => readFileSync(path, 'utf8');

const stripLeadingComments = (css: string): string =>
  css.replace(/^(?:\s*\/\*[\s\S]*?\*\/)*/u, '').trimStart();

const articleHeaderCss = readCss(articleHeaderCssPath);
const tagRecipeCss = readCss(tagRecipeCssPath);
const mainCss = readCss(mainCssPath);
const articleHeaderSource = readCss(articleHeaderSourcePath);
const tagComponentCss = collectCssText(Tag.styles);

const parseCss = (cssText: string) => postcss.parse(cssText);

const isDeclaration = (node: Rule['nodes'][number]): node is Declaration => node.type === 'decl';

const selectorContainsClass = (selectorText: string, className: string): boolean => {
  let found = false;
  selectorParser((selectors) => {
    selectors.walkClasses((node) => {
      if (node.value === className) {
        found = true;
      }
    });
  }).processSync(selectorText);
  return found;
};

const selectorContainsPositivePseudo = (selectorText: string, pseudoName: string): boolean => {
  let found = false;
  selectorParser((selectors) => {
    selectors.walkPseudos((node) => {
      if (node.value !== pseudoName) {
        return;
      }

      let parent = node.parent;
      while (parent) {
        if (parent.type === 'pseudo' && parent.value === ':not') {
          return;
        }
        parent = parent.parent;
      }

      found = true;
    });
  }).processSync(selectorText);
  return found;
};

const selectorContainsAnyPseudo = (
  selectorText: string,
  pseudoNames: readonly string[],
): boolean => {
  let found = false;
  const pseudoNameSet = new Set(pseudoNames);
  selectorParser((selectors) => {
    selectors.walkPseudos((node) => {
      if (pseudoNameSet.has(node.value)) {
        found = true;
      }
    });
  }).processSync(selectorText);
  return found;
};

const splitSelectors = (selectorText: string): string[] => {
  const ast = selectorParser().astSync(selectorText);
  const selectors: string[] = [];
  ast.each((selector) => {
    selectors.push(selector.toString().trim());
  });
  return selectors;
};

const articleHeaderTagHoverDeclarations = (): Declaration[] => {
  const declarations: Declaration[] = [];
  parseCss(tagRecipeCss).walkRules((rule) => {
    const matches = splitSelectors(rule.selector).some(
      (selector) =>
        selectorContainsClass(selector, 'article-header__tag-link') &&
        selectorContainsPositivePseudo(selector, ':hover'),
    );
    if (!matches) {
      return;
    }

    declarations.push(...rule.nodes.filter(isDeclaration));
  });
  return declarations;
};

const articleHeaderTagLinkDeclarations = (): Declaration[] => {
  const declarations: Declaration[] = [];
  parseCss(tagRecipeCss).walkRules((rule) => {
    const matches = splitSelectors(rule.selector).some((selector) =>
      selectorContainsClass(selector, 'article-header__tag-link'),
    );
    if (!matches) {
      return;
    }

    declarations.push(...rule.nodes.filter(isDeclaration));
  });
  return declarations;
};

const extractRenderTagsRowSource = (): string => {
  const start = articleHeaderSource.indexOf('private _renderTagsRow()');
  const end = articleHeaderSource.indexOf('private _renderReadingTimeItem()', start);
  if (start < 0 || end < 0) {
    throw new Error('_renderTagsRow() の source block が見つかりません');
  }
  return articleHeaderSource.slice(start, end);
};

describe('static article-header css contract', () => {
  it('article-header.css の先頭有効 rule が static tag recipe import であること', () => {
    expect(
      stripLeadingComments(articleHeaderCss).startsWith(
        "@import './recipes/article-header-static-tag-link.css';",
      ),
    ).toBe(true);
    expect(articleHeaderCss).toContain("@import './recipes/article-header-static-tag-link.css';");
    expect(mainCss).not.toContain('article-header-static-tag-link.css');
  });

  it('breadcrumb separator は slash pseudo-element ではなく DOM icon 用 rule であること', () => {
    expect(articleHeaderCss).not.toMatch(
      /\.article-header__breadcrumb-item:not\(:last-child\)::after\s*\{[\s\S]*?content:\s*['"]\/['"]/u,
    );
    expect(articleHeaderCss).toContain('.article-header__breadcrumb-separator-icon');
  });

  it('metadata separator と link focus-visible を個別 contract として持つこと', () => {
    expect(articleHeaderCss).toMatch(/content:\s*'・';[\s\S]*?content:\s*'・'\s*\/\s*''/u);
    expect(articleHeaderCss).toMatch(/\.article-header__breadcrumb-link:focus-visible\s*\{/u);
    expect(articleHeaderCss).toMatch(/\.article-header__source-link:focus-visible\s*\{/u);
    expect(tagRecipeCss).toMatch(/\.article-header__tag-link:focus-visible\s*\{/u);
    expect(articleHeaderCss).toMatch(
      /\.article-header__source-link\s*\{[\s\S]*?text-decoration:\s*underline/u,
    );
    expect(articleHeaderCss).not.toMatch(
      /\.article-header__breadcrumb-link,\s*\.article-header__tag-link,\s*\.article-header__source-link/u,
    );
  });

  it('breadcrumb wrapper と mobile rule が overflow 防止 contract を持つこと', () => {
    expect(articleHeaderCss).toMatch(
      /\.article-header__breadcrumbs\s*\{[\s\S]*?inline-size:\s*100%/u,
    );
    expect(articleHeaderCss).toMatch(
      /\.article-header__breadcrumbs\s*\{[\s\S]*?min-inline-size:\s*0/u,
    );
    expect(articleHeaderCss).toMatch(
      /\.article-header__breadcrumbs\s*\{[\s\S]*?max-inline-size:\s*100%/u,
    );
    expect(articleHeaderCss).toContain('@media (max-width: 639px)');
    expect(articleHeaderCss).toMatch(
      /\.article-header__breadcrumb-link,\s*\.article-header__breadcrumb-static\s*\{[\s\S]*?max-inline-size:\s*min\(12ch,\s*100%\)/u,
    );
  });

  it('static tag recipe が global reset に依存しないこと', () => {
    expect(tagRecipeCss).toContain('.article-header__tag-label');
    expect(tagRecipeCss).toMatch(/box-sizing:\s*border-box/u);
    expect(tagRecipeCss).toMatch(/display:\s*flex/u);
    expect(tagRecipeCss).toMatch(/inline-size:\s*100%/u);
    expect(tagRecipeCss).toMatch(/list-style:\s*none/u);
    expect(tagRecipeCss).toMatch(/margin:\s*0/u);
    expect(tagRecipeCss).toMatch(/padding:\s*0/u);
    expect(tagRecipeCss).toMatch(/overflow:\s*visible/u);
    expect(tagRecipeCss).toMatch(/min-inline-size:\s*0/u);
    expect(articleHeaderCss).not.toMatch(
      /\.article-header__tag-link\s*\{[\s\S]*?border:\s*1px solid/u,
    );
  });

  it('static tag recipe は ui-tag default / xs / neutral 相当の公開 token を使うこと', () => {
    expect(
      hasDeclarationValueIncluding(
        tagRecipeCss,
        '.article-header__tag-link',
        '--ui-tag-static-bg-l',
        'var(--tag-surface-l, 96%)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tagRecipeCss,
        '.article-header__tag-link',
        '--ui-tag-static-fg-l',
        'var(--tag-content-l, 45%)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tagRecipeCss,
        '.article-header__tag-link',
        '--ui-tag-static-bg-chroma',
        'var(--tag-neutral-bg-chroma, 0)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tagRecipeCss,
        '.article-header__tag-link',
        '--ui-tag-static-fg-chroma',
        'var(--tag-neutral-fg-chroma, 0)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link',
        '--ui-tag-static-delta-bg-l',
        'var(--tag-neutral-delta-bg-l, 2%)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link',
        '--ui-tag-static-delta-fg-l',
        'var(--tag-neutral-delta-fg-l, 0%)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link',
        'min-block-size',
        'var(--control-height-xs, 20px)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link',
        'border-radius',
        'var(--radius-sm, 4px)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link',
        'font-weight',
        'var(--font-medium, 500)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link',
        'font-size',
        'var(--text-xs, 12px)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link',
        'line-height',
        'var(--line-height-snug, 1.35)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link',
        'gap',
        'var(--space-1, 4px)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link',
        'padding',
        '0 var(--space-2, 8px)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link::after',
        'inline-size',
        'max(100%, var(--control-min-touch, 24px))',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link::after',
        'block-size',
        'max(100%, var(--control-min-touch, 24px))',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tagRecipeCss,
        '.article-header__tag-link',
        'border',
        'var(--border-width, 1px) solid var(--ui-tag-static-border-color)',
      ),
    ).toBe(true);
  });

  it('static tag recipe は outline pill と旧 token に退行しないこと', () => {
    const declarations = articleHeaderTagLinkDeclarations();

    for (const property of ['border', 'border-radius', 'color', 'background', 'background-color']) {
      expect(
        hasDeclarationValueIncluding(tagRecipeCss, '.article-header__tag-link', property, '999px'),
      ).toBe(false);
      expect(
        hasDeclarationValueIncluding(
          tagRecipeCss,
          '.article-header__tag-link',
          property,
          'radius-full',
        ),
      ).toBe(false);
    }

    const forbiddenFragments = [
      '--tag-border-color',
      '--tag-radius',
      '--tag-fg',
      '--tag-bg',
      '--tag-bg-l',
      '--tag-fg-l',
      '--tag-bg-chroma',
      '--tag-fg-chroma',
      '--tag-delta-bg-l',
      '--tag-delta-fg-l',
      '--tag-hue',
    ];

    for (const declaration of declarations) {
      for (const fragment of forbiddenFragments) {
        expect(declaration.prop.includes(fragment), declaration.toString()).toBe(false);
        expect(declaration.value.includes(fragment), declaration.toString()).toBe(false);
      }
    }

    expect(
      hasDeclarationValueIncluding(
        tagRecipeCss,
        '.article-header__tag-link',
        'background-color',
        'transparent',
      ),
    ).toBe(false);
    expect(
      hasDeclarationPropertyForSelector(tagRecipeCss, '.article-header__tag-link', 'background'),
    ).toBe(false);
  });

  it('static tag hover は背景色・文字色とそれらの alias を変更しないこと', () => {
    const declarations = articleHeaderTagHoverDeclarations();
    expect(declarations.length).toBeGreaterThan(0);

    const forbiddenProperties = new Set([
      'color',
      'background',
      'background-color',
      '--ui-tag-static-bg-l',
      '--ui-tag-static-fg-l',
      '--ui-tag-static-bg-chroma',
      '--ui-tag-static-fg-chroma',
      '--ui-tag-static-delta-bg-l',
      '--ui-tag-static-delta-fg-l',
      '--ui-tag-static-hue',
    ]);
    const allowedProperties = new Set(['--ui-tag-static-border-color', 'text-decoration']);

    for (const declaration of declarations) {
      expect(forbiddenProperties.has(declaration.prop), declaration.toString()).toBe(false);
      expect(allowedProperties.has(declaration.prop), declaration.toString()).toBe(true);
    }

    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link:hover',
        '--ui-tag-static-border-color',
        'var(--border-default, oklch(70% 0 0 / 0.6))',
      ),
    ).toBe(true);
  });

  it('static tag recipe は tag link selector で複雑な分岐 pseudo を使わないこと', () => {
    parseCss(tagRecipeCss).walkRules((rule) => {
      for (const selector of splitSelectors(rule.selector)) {
        if (!selectorContainsClass(selector, 'article-header__tag-link')) {
          continue;
        }

        expect(selectorContainsAnyPseudo(selector, [':is', ':where', ':has']), selector).toBe(
          false,
        );
      }
    });
  });

  it('ui-tag の公開 CSS と static tag recipe が主要 visual token contract を共有すること', () => {
    expect(tagComponentCss).toContain('var(--tag-surface-l, 96%)');
    expect(tagComponentCss).toContain('var(--tag-content-l, 45%)');
    expect(tagComponentCss).toContain('var(--control-height-xs, 20px)');
    expect(tagComponentCss).toContain('var(--radius-sm, 4px)');
    expect(tagComponentCss).toContain('var(--font-medium, 500)');
    expect(tagComponentCss).toContain('var(--control-min-touch, 24px)');

    expect(tagRecipeCss).toContain('var(--tag-surface-l, 96%)');
    expect(tagRecipeCss).toContain('var(--tag-content-l, 45%)');
    expect(tagRecipeCss).toContain('var(--control-height-xs, 20px)');
    expect(tagRecipeCss).toContain('var(--radius-sm, 4px)');
    expect(tagRecipeCss).toContain('var(--font-medium, 500)');
    expect(tagRecipeCss).toContain('var(--control-min-touch, 24px)');
  });

  it('ui-article-header の tag template は ui-tag 状態を明示し aria-label を持たないこと', () => {
    const source = extractRenderTagsRowSource();
    const blocks = [
      ...source.matchAll(
        /<li class="tag-item">[\s\S]*?<ui-tag([\s\S]*?)>[\s\S]*?<\/ui-tag>[\s\S]*?<\/li>/gu,
      ),
    ].map((match) => match[1] ?? '');

    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block).toContain('variant="default"');
      expect(block).toContain('size="xs"');
      expect(block).toContain('color="neutral"');
      expect(block).toContain('@click=');
      expect(block).not.toMatch(/\baria-label\b|\.ariaLabel\b|\bariaLabel\b/u);
    }
  });

  it('breadcrumb and tag links explicitly opt out from underline in screen scope', () => {
    expect(
      hasDeclarationForSelector(
        articleHeaderCss,
        '.article-header__breadcrumb-link[href]',
        'text-decoration',
        'none',
        { scope: 'screen' },
      ),
    ).toBe(true);

    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link[href]',
        'text-decoration',
        'none',
        { scope: 'screen' },
      ),
    ).toBe(true);

    expect(
      lacksDeclarationPropertyForSelector(tagRecipeCss, '.article-header__tag-link:hover', 'color'),
    ).toBe(true);
  });

  it('keeps breadcrumb and tag links without underline on hover and focus-visible in screen scope', () => {
    expect(
      hasDeclarationForSelector(
        articleHeaderCss,
        '.article-header__breadcrumb-link:hover',
        'text-decoration',
        'none',
        { scope: 'screen' },
      ),
    ).toBe(true);

    expect(
      hasDeclarationForSelector(
        articleHeaderCss,
        '.article-header__breadcrumb-link:focus-visible',
        'text-decoration',
        'none',
        { scope: 'screen' },
      ),
    ).toBe(true);

    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link:hover',
        'text-decoration',
        'none',
        { scope: 'screen' },
      ),
    ).toBe(true);

    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link:focus-visible',
        'text-decoration',
        'none',
        { scope: 'screen' },
      ),
    ).toBe(true);
  });

  it('keeps source link as a reference link with underline in screen scope', () => {
    expect(
      hasDeclarationTokenForSelector(
        articleHeaderCss,
        '.article-header__source-link',
        'text-decoration',
        'underline',
        { scope: 'screen' },
      ),
    ).toBe(true);

    expect(
      hasDeclarationTokenForSelector(
        articleHeaderCss,
        '.article-header__source-link[href]',
        'text-decoration',
        'underline',
        { scope: 'screen' },
      ),
    ).toBe(true);
  });

  it('keeps forced-colors breadcrumb without underline and source with underline at href specificity', () => {
    expect(
      hasDeclarationForSelector(
        articleHeaderCss,
        '.article-header__breadcrumb-link[href]',
        'text-decoration',
        'none',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);

    expect(
      hasDeclarationTokenForSelector(
        articleHeaderCss,
        '.article-header__source-link[href]',
        'text-decoration',
        'underline',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);

    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link[href]',
        'text-decoration',
        'none',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);

    expect(
      hasDeclarationForSelector(tagRecipeCss, '.article-header__tag-link', 'color', 'LinkText', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link',
        'border-color',
        'CanvasText',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tagRecipeCss, '.article-header__tag-link', 'background', 'Canvas', {
        scope: 'forced-colors',
      }) ||
        hasDeclarationForSelector(
          tagRecipeCss,
          '.article-header__tag-link',
          'background-color',
          'Canvas',
          { scope: 'forced-colors' },
        ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tagRecipeCss,
        '.article-header__tag-link:focus-visible',
        'outline-color',
        'Highlight',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(tagRecipeCss).not.toContain('forced-color-adjust: none');
  });
});
