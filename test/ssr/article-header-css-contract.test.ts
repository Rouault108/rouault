import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const articleHeaderCssPath = resolve('src/assets/css/article-header.css');
const tagRecipeCssPath = resolve('src/assets/css/recipes/article-header-static-tag-link.css');
const mainCssPath = resolve('src/assets/css/main.css');

const readCss = (path: string): string => readFileSync(path, 'utf8');

const stripLeadingComments = (css: string): string =>
  css.replace(/^(?:\s*\/\*[\s\S]*?\*\/)*/u, '').trimStart();

const articleHeaderCss = readCss(articleHeaderCssPath);
const tagRecipeCss = readCss(tagRecipeCssPath);
const mainCss = readCss(mainCssPath);

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
});
