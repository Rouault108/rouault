import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { codeToHast } from 'shiki';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { resolveShikiLanguage } from '../../build/rehype/shiki-language.js';
import { ROUAULT_SHIKI_THEMES } from '../../build/rehype/shiki-themes.js';
import { ROUAULT_SYNTAX_PALETTES } from '../../build/rehype/shiki-theme-definition.js';

interface MdastNode {
  readonly type: string;
  readonly lang?: string | null;
  readonly value?: string;
  readonly children?: readonly MdastNode[];
}

interface HastNode {
  readonly type: string;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly children?: readonly HastNode[];
}

interface FenceSample {
  readonly language: string | undefined;
  readonly source: string;
}

const INVENTORY_ROOTS = [
  path.resolve(process.cwd(), 'content'),
  path.resolve(process.cwd(), 'examples/snippets'),
] as const;

const collectMarkdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === '_generated' || entry.name === 'generated' || entry.name === 'old') {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }
  return files.sort();
};

const walkCodeFences = (node: MdastNode, visit: (node: MdastNode) => void): void => {
  if (node.type === 'code') {
    visit(node);
  }
  for (const child of node.children ?? []) {
    walkCodeFences(child, visit);
  }
};

const inventoryFenceSamples = async (): Promise<readonly FenceSample[]> => {
  const sampleByLanguage = new Map<string, FenceSample>();
  for (const root of INVENTORY_ROOTS) {
    for (const filePath of await collectMarkdownFiles(root)) {
      const markdown = await readFile(filePath, 'utf8');
      const tree = unified().use(remarkParse).parse(markdown) as unknown as MdastNode;
      walkCodeFences(tree, (node) => {
        const language = typeof node.lang === 'string' ? node.lang : undefined;
        const key = language?.trim().toLowerCase() || '<omitted>';
        const source = typeof node.value === 'string' ? node.value : '';
        const existing = sampleByLanguage.get(key);
        if (!existing || (existing.source.trim() === '' && source.trim() !== '')) {
          sampleByLanguage.set(key, {
            language,
            source: source.slice(0, 4096),
          });
        }
      });
    }
  }
  return [...sampleByLanguage.values()].sort((left, right) =>
    (left.language ?? '').localeCompare(right.language ?? ''),
  );
};

const parseStyle = (style: string): ReadonlyMap<string, string> => {
  const declarations = new Map<string, string>();
  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator < 0) continue;
    const property = declaration.slice(0, separator).trim();
    const value = declaration
      .slice(separator + 1)
      .trim()
      .toLowerCase();
    if (property && value) declarations.set(property, value);
  }
  return declarations;
};

const collectForegrounds = (node: HastNode): readonly string[] => {
  const style = node.properties?.['style'];
  const declarations = typeof style === 'string' ? parseStyle(style) : new Map<string, string>();
  const own = [declarations.get('color'), declarations.get('--shiki-dark')].filter(
    (value): value is string => typeof value === 'string',
  );
  return [...own, ...(node.children ?? []).flatMap((child) => collectForegrounds(child))];
};

describe('Shiki language inventory', () => {
  it('production language ownerはexact ID、alias、text、omitted、unknownを区別する', () => {
    expect(resolveShikiLanguage('typescript')).toMatchObject({
      resolvedLanguage: 'typescript',
      fallbackReason: null,
    });
    expect(resolveShikiLanguage('ts')).toMatchObject({
      resolvedLanguage: 'typescript',
      fallbackReason: null,
    });
    expect(resolveShikiLanguage(' TS ')).toMatchObject({
      normalizedLanguage: 'ts',
      resolvedLanguage: 'typescript',
      fallbackReason: null,
    });
    expect(resolveShikiLanguage('text')).toMatchObject({
      resolvedLanguage: 'text',
      fallbackReason: 'explicit-text',
    });
    expect(resolveShikiLanguage('TEXT')).toMatchObject({
      normalizedLanguage: 'text',
      resolvedLanguage: 'text',
      fallbackReason: 'explicit-text',
    });
    expect(resolveShikiLanguage(undefined)).toMatchObject({
      resolvedLanguage: 'text',
      fallbackReason: 'language-omitted',
    });
    expect(resolveShikiLanguage('')).toMatchObject({
      normalizedLanguage: undefined,
      resolvedLanguage: 'text',
      fallbackReason: 'language-omitted',
    });
    expect(resolveShikiLanguage('   ')).toMatchObject({
      normalizedLanguage: undefined,
      resolvedLanguage: 'text',
      fallbackReason: 'language-omitted',
    });
    expect(resolveShikiLanguage('rouault-unknown-language')).toMatchObject({
      resolvedLanguage: 'text',
      fallbackReason: 'unknown-language',
    });
  });

  it('production Markdown AST inventoryのgrammarとforegroundはclosed palette内にある', async () => {
    const failures: string[] = [];
    const palette = new Set<string>(
      Object.values(ROUAULT_SYNTAX_PALETTES).flatMap((theme) => Object.values(theme)),
    );
    const samples = await inventoryFenceSamples();

    for (const sample of samples) {
      const resolution = resolveShikiLanguage(sample.language);
      const languageLabel = resolution.normalizedLanguage ?? '<omitted>';
      if (resolution.fallbackReason === 'unknown-language') {
        failures.push(`${languageLabel}: unknown explicit language fell back to text`);
        continue;
      }

      try {
        const tree = (await codeToHast(sample.source, {
          lang: resolution.resolvedLanguage,
          themes: ROUAULT_SHIKI_THEMES,
          tabindex: false,
        })) as unknown as HastNode;
        const foregrounds = new Set(collectForegrounds(tree));
        const unexpected = [...foregrounds].filter((foreground) => !palette.has(foreground));
        if (unexpected.length > 0) {
          failures.push(
            `${languageLabel} -> ${resolution.resolvedLanguage}: foreground outside closed palette (${unexpected.join(', ')})`,
          );
        }
      } catch (error) {
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        failures.push(
          `${languageLabel} -> ${resolution.resolvedLanguage}: grammar loading failed (${errorName})`,
        );
      }
    }

    expect(samples.length).toBeGreaterThan(0);
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
