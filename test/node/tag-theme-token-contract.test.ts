import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const normalizeCss = (value: string): string => value.replace(/\s+/g, '').toLowerCase();

const expectIncludes = (cssText: string, snippets: readonly string[]): void => {
  const normalized = normalizeCss(cssText);

  for (const snippet of snippets) {
    expect(normalized).toContain(normalizeCss(snippet));
  }
};

describe('tag theme token contract', () => {
  const tokensCssPath = resolve(process.cwd(), 'src/assets/css/tokens.css');
  const cssText = readFileSync(tokensCssPath, 'utf-8');

  it('root に tag recipe token を定義していること', () => {
    expectIncludes(cssText, [
      '--tag-surface-l:',
      '--tag-content-l:',
      '--tag-neutral-bg-chroma:',
      '--tag-neutral-fg-chroma:',
      '--tag-neutral-delta-bg-l:',
      '--tag-neutral-delta-fg-l:',
      '--tag-accent-bg-chroma:',
      '--tag-accent-fg-chroma:',
      '--tag-accent-delta-bg-l:',
      '--tag-accent-delta-fg-l:',
      '--tag-gold-bg-chroma:',
      '--tag-gold-fg-chroma:',
      '--tag-gold-delta-bg-l:',
      '--tag-gold-delta-fg-l:',
      '--tag-solid-surface-l:',
      '--tag-solid-neutral-surface-l:',
      '--tag-solid-fg:',
    ]);
  });

  it('prefers-color-scheme: dark に対応する tag recipe token override を持つこと', () => {
    expectIncludes(cssText, [
      '@media (prefers-color-scheme: dark)',
      '--tag-surface-l: 17%',
      '--tag-content-l: 90%',
      '--tag-neutral-bg-chroma: 0',
      '--tag-accent-bg-chroma: 0.04',
      '--tag-accent-fg-chroma: 0.12',
      '--tag-gold-bg-chroma: 0.04',
      '--tag-gold-fg-chroma: 0.12',
      '--tag-solid-surface-l: 40%',
      '--tag-solid-neutral-surface-l: 30%',
    ]);
  });

  it('data-theme=light に対応する tag recipe token override を持つこと', () => {
    expectIncludes(cssText, [
      ":root[data-theme='light']",
      '--tag-surface-l: 96%',
      '--tag-content-l: 45%',
      '--tag-neutral-bg-chroma: var(--chroma-neutral)',
      '--tag-accent-bg-chroma: var(--chroma-subtle)',
      '--tag-accent-fg-chroma: var(--chroma-ui)',
      '--tag-gold-bg-chroma: var(--chroma-subtle)',
      '--tag-gold-fg-chroma: var(--chroma-ui)',
      '--tag-solid-surface-l: 55%',
      '--tag-solid-neutral-surface-l: 55%',
    ]);
  });

  it('data-theme=dark に対応する tag recipe token override を持つこと', () => {
    expectIncludes(cssText, [
      ":root[data-theme='dark']",
      '--tag-surface-l: 17%',
      '--tag-content-l: 90%',
      '--tag-neutral-bg-chroma: 0',
      '--tag-accent-bg-chroma: 0.04',
      '--tag-accent-fg-chroma: 0.12',
      '--tag-gold-bg-chroma: 0.04',
      '--tag-gold-fg-chroma: 0.12',
      '--tag-solid-surface-l: 40%',
      '--tag-solid-neutral-surface-l: 30%',
    ]);
  });
});
