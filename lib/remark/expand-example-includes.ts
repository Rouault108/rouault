import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  TESTING_EXAMPLES,
  renderTestingExampleMarkdown,
  type TestingExampleRef,
} from '../../examples/manifests/testing-examples.js';
import { getParagraphSingleText } from './directives/shared/block-markers.js';
import { parseAttributes } from './directives/shared/attributes.js';
import { toError } from './directives/shared/errors.js';
import type { MdastNode, VFileLike } from './directives/types.js';

const INCLUDE_PATTERN = /^::example-include(?:\{(.*)\})?$/u;
let markdownParserPromise:
  | Promise<{
      parse(markdown: string): MdastNode[];
    }>
  | null = null;

const ensureSafeExamplePath = (filePath: string): string => {
  const normalized = filePath.trim().replace(/\\/g, '/');
  if (path.isAbsolute(normalized) || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`[markdown] example path "${normalized}" は許可されていません`);
  }
  return normalized;
};

const readExampleText = (filePath: string): string => {
  const safePath = ensureSafeExamplePath(filePath);
  const absolutePath = path.resolve(process.cwd(), safePath);
  return readFileSync(absolutePath, 'utf8');
};

const parseExampleRef = (node: MdastNode, file?: VFileLike): TestingExampleRef | null => {
  const source = getParagraphSingleText(node);
  if (source === null) {
    return null;
  }

  const matched = INCLUDE_PATTERN.exec(source.trim());
  if (!matched) {
    return null;
  }

  const attrs = parseAttributes(matched[1] ?? '', node, file);
  const ref = typeof attrs['ref'] === 'string' ? attrs['ref'].trim() : '';
  if (ref.length === 0) {
    throw toError(file, node, 'example-include には ref が必須です');
  }

  if (!(ref in TESTING_EXAMPLES)) {
    throw toError(file, node, `example-include の ref "${ref}" は未登録です`);
  }

  return ref as TestingExampleRef;
};

const resolvePnpmPackageEntry = (packageName: string): string => {
  const pnpmRoot = path.resolve(process.cwd(), 'node_modules', '.pnpm');
  const matchedDirectory = readdirSync(pnpmRoot)
    .sort((left, right) => left.localeCompare(right, 'en'))
    .find((entry) => entry.startsWith(`${packageName}@`));

  if (!matchedDirectory) {
    throw new Error(`[markdown] example-include 用の依存 ${packageName} が見つかりません`);
  }

  return path.resolve(pnpmRoot, matchedDirectory, 'node_modules', packageName, 'index.js');
};

const loadMarkdownParser = async (): Promise<{
  parse(markdown: string): MdastNode[];
}> => {
  if (markdownParserPromise) {
    return markdownParserPromise;
  }

  markdownParserPromise = (async () => {
    const unifiedModule = await import(pathToFileURL(resolvePnpmPackageEntry('unified')).href);
    const remarkParseModule = await import(
      pathToFileURL(resolvePnpmPackageEntry('remark-parse')).href
    );
    const remarkGfmModule = await import(
      pathToFileURL(resolvePnpmPackageEntry('remark-gfm')).href
    );

    const unified = unifiedModule.unified as () => {
      use(plugin: unknown, options?: unknown): { use(plugin: unknown, options?: unknown): { parse(markdown: string): unknown } };
    };
    const remarkParse = remarkParseModule.default as unknown;
    const remarkGfm = remarkGfmModule.default as (
      options?: { singleTilde?: boolean },
    ) => unknown;

    return {
      parse(markdown: string): MdastNode[] {
        const parsed = unified()
          .use(remarkParse)
          .use(remarkGfm, { singleTilde: false })
          .parse(markdown) as MdastNode;
        return Array.isArray(parsed.children) ? parsed.children : [];
      },
    };
  })();

  return markdownParserPromise;
};

const expandNodes = async (
  nodes: readonly MdastNode[],
  file: VFileLike | undefined,
  stack: readonly TestingExampleRef[],
): Promise<MdastNode[]> => {
  const expanded: MdastNode[] = [];
  const parser = await loadMarkdownParser();

  for (const node of nodes) {
    const includeRef = parseExampleRef(node, file);
    if (includeRef) {
      if (stack.includes(includeRef)) {
        throw toError(file, node, `example-include の循環参照 "${includeRef}" は許可されていません`);
      }

      const markdown = renderTestingExampleMarkdown(TESTING_EXAMPLES[includeRef], readExampleText);
      expanded.push(...(await expandNodes(parser.parse(markdown), file, [...stack, includeRef])));
      continue;
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      expanded.push({
        ...node,
        children: await expandNodes(node.children, file, stack),
      });
      continue;
    }

    expanded.push(node);
  }

  return expanded;
};

export function remarkExpandExampleIncludes() {
  return async (tree: unknown, file?: VFileLike) => {
    if (!tree || typeof tree !== 'object') {
      return;
    }

    const root = tree as MdastNode;
    if (!Array.isArray(root.children)) {
      return;
    }

    root.children = await expandNodes(root.children, file, []);
  };
}
