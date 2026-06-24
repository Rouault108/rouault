import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import { FINAL_SOURCE_MARKER_ATTRIBUTES } from '../build/content/final-source-marker-contract.js';

type Parse5Element = DefaultTreeAdapterMap['element'];
type Parse5Node = DefaultTreeAdapterMap['node'];

export interface AssertProductionHtmlContractsOptions {
  readonly repoRoot?: string;
}

export interface ProductionHtmlContractResult {
  readonly htmlFiles: readonly string[];
  readonly checkedMarkerAttributes: readonly string[];
}

const DIST_DIR = 'dist';

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const getChildNodes = (node: Parse5Node): readonly Parse5Node[] =>
  'childNodes' in node && Array.isArray(node.childNodes) ? node.childNodes : [];

const toRepoPath = (repoRoot: string, absolutePath: string): string =>
  path.relative(repoRoot, absolutePath).split(path.sep).join('/');

const collectHtmlFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(absolutePath)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(absolutePath);
    }
  }

  return files;
};

const assertNoFinalSourceMarkerAttributes = (options: {
  readonly repoRoot: string;
  readonly htmlFile: string;
  readonly html: string;
}): void => {
  const document = parse5.parse(options.html);
  const markerAttributes = new Set<string>(FINAL_SOURCE_MARKER_ATTRIBUTES);
  const repoPath = toRepoPath(options.repoRoot, options.htmlFile);

  const visit = (node: Parse5Node): void => {
    if (isElementNode(node)) {
      const matched = node.attrs.find((attribute) => markerAttributes.has(attribute.name));
      if (matched !== undefined) {
        throw new Error(
          `[production-html-contracts] ${repoPath} contains final source marker attribute ${matched.name} on <${node.tagName}>.`,
        );
      }
    }

    for (const child of getChildNodes(node)) {
      visit(child);
    }
  };

  visit(document);
};

export const assertProductionHtmlContracts = async (
  options: AssertProductionHtmlContractsOptions = {},
): Promise<ProductionHtmlContractResult> => {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const distRoot = path.join(repoRoot, DIST_DIR);

  if (!existsSync(distRoot) || !(await stat(distRoot)).isDirectory()) {
    throw new Error('[production-html-contracts] dist/ does not exist.');
  }

  const htmlFiles = await collectHtmlFiles(distRoot);
  if (htmlFiles.length === 0) {
    throw new Error('[production-html-contracts] found no generated HTML files in dist/.');
  }

  for (const htmlFile of htmlFiles) {
    assertNoFinalSourceMarkerAttributes({
      repoRoot,
      htmlFile,
      html: await readFile(htmlFile, 'utf8'),
    });
  }

  return {
    htmlFiles: htmlFiles.map((file) => toRepoPath(repoRoot, file)),
    checkedMarkerAttributes: FINAL_SOURCE_MARKER_ATTRIBUTES,
  };
};

const isCliEntrypoint = (): boolean => {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
};

if (isCliEntrypoint()) {
  try {
    const result = await assertProductionHtmlContracts();
    console.log(
      `assert-production-html-contracts: ok (${result.htmlFiles.length.toString()} HTML files)`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
