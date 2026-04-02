import { expect } from 'vitest';

const normalizeCss = (value: string): string => value.replace(/\s+/g, '').toLowerCase();

export const collectCssText = (styles: unknown): string => {
  if (typeof styles === 'string') {
    return styles;
  }

  if (Array.isArray(styles)) {
    return styles.map((item) => collectCssText(item)).join('\n');
  }

  if (styles && typeof styles === 'object') {
    if ('cssText' in styles) {
      const cssText = (styles as { cssText?: unknown }).cssText;
      if (typeof cssText === 'string') {
        return cssText;
      }
    }

    if ('styleSheet' in styles) {
      const styleSheet = (
        styles as {
          styleSheet?: {
            cssRules?: Iterable<{ cssText?: string }>;
          };
        }
      ).styleSheet;

      const cssRules = styleSheet?.cssRules;
      if (cssRules) {
        return Array.from(cssRules)
          .map((rule) => (typeof rule.cssText === 'string' ? rule.cssText : ''))
          .join('\n');
      }
    }
  }

  return '';
};

export const extractStyleTagCss = (markup: string): string => {
  const matches = [...markup.matchAll(/<style>([\s\S]*?)<\/style>/giu)];
  return matches.map((match) => match[1] ?? '').join('\n');
};

export const expectCssIncludes = (cssText: string, snippets: readonly string[]): void => {
  const normalizedCssText = normalizeCss(cssText);

  for (const snippet of snippets) {
    expect(normalizedCssText).toContain(normalizeCss(snippet));
  }
};

export const expectCssExcludes = (cssText: string, snippets: readonly string[]): void => {
  const normalizedCssText = normalizeCss(cssText);

  for (const snippet of snippets) {
    expect(normalizedCssText).not.toContain(normalizeCss(snippet));
  }
};