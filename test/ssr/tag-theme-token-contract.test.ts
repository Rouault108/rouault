import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  hasDeclarationForSelector,
  hasDeclarationPropertyForSelector,
  type TokenRuleAncestry,
} from './support/css-contract.js';

const ROOT_TOKEN_PROPERTIES = [
  '--tag-surface-l',
  '--tag-content-l',
  '--tag-neutral-bg-chroma',
  '--tag-neutral-fg-chroma',
  '--tag-neutral-delta-bg-l',
  '--tag-neutral-delta-fg-l',
  '--tag-accent-bg-chroma',
  '--tag-accent-fg-chroma',
  '--tag-accent-delta-bg-l',
  '--tag-accent-delta-fg-l',
  '--tag-gold-bg-chroma',
  '--tag-gold-fg-chroma',
  '--tag-gold-delta-bg-l',
  '--tag-gold-delta-fg-l',
  '--tag-solid-surface-l',
  '--tag-solid-neutral-surface-l',
  '--tag-solid-fg',
] as const;

const LIGHT_TOKEN_DECLARATIONS = [
  ['--tag-surface-l', '96%'],
  ['--tag-content-l', '45%'],
  ['--tag-neutral-bg-chroma', 'var(--chroma-neutral)'],
  ['--tag-accent-bg-chroma', 'var(--chroma-subtle)'],
  ['--tag-accent-fg-chroma', 'var(--chroma-ui)'],
  ['--tag-gold-bg-chroma', 'var(--chroma-subtle)'],
  ['--tag-gold-fg-chroma', 'var(--chroma-ui)'],
  ['--tag-solid-surface-l', '55%'],
  ['--tag-solid-neutral-surface-l', '55%'],
] as const;

const DARK_TOKEN_DECLARATIONS = [
  ['--tag-surface-l', '17%'],
  ['--tag-content-l', '90%'],
  ['--tag-neutral-bg-chroma', '0'],
  ['--tag-accent-bg-chroma', '0.04'],
  ['--tag-accent-fg-chroma', '0.12'],
  ['--tag-gold-bg-chroma', '0.04'],
  ['--tag-gold-fg-chroma', '0.12'],
  ['--tag-solid-surface-l', '40%'],
  ['--tag-solid-neutral-surface-l', '30%'],
] as const;

const expectTokenProperties = (
  cssText: string,
  selector: string,
  properties: readonly string[],
  tokenRuleAncestry: TokenRuleAncestry,
): void => {
  for (const property of properties) {
    expect(
      hasDeclarationPropertyForSelector(cssText, selector, property, { tokenRuleAncestry }),
      `${selector} ${property}`,
    ).toBe(true);
  }
};

const expectTokenDeclarations = (
  cssText: string,
  selector: string,
  declarations: readonly (readonly [string, string])[],
  tokenRuleAncestry: TokenRuleAncestry,
): void => {
  for (const [property, value] of declarations) {
    expect(
      hasDeclarationForSelector(cssText, selector, property, value, { tokenRuleAncestry }),
      `${selector} ${property}: ${value}`,
    ).toBe(true);
  }
};

describe('tag theme token contract', () => {
  const tokensCssPath = resolve(process.cwd(), 'src/assets/css/tokens.css');
  const cssText = readFileSync(tokensCssPath, 'utf-8');

  it('root に tag recipe token を定義していること', () => {
    expectTokenProperties(cssText, ':root', ROOT_TOKEN_PROPERTIES, 'root');
  });

  it('prefers-color-scheme: dark に対応する tag recipe token override を持つこと', () => {
    expectTokenDeclarations(cssText, ':root', DARK_TOKEN_DECLARATIONS, 'root-os-dark-media');
  });

  it('data-theme=light に対応する tag recipe token override を持つこと', () => {
    expectTokenDeclarations(cssText, ":root[data-theme='light']", LIGHT_TOKEN_DECLARATIONS, 'root');
  });

  it('data-theme=dark に対応する tag recipe token override を持つこと', () => {
    expectTokenDeclarations(cssText, ":root[data-theme='dark']", DARK_TOKEN_DECLARATIONS, 'root');
  });
});
