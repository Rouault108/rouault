import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import { FINAL_SOURCE_MARKER_ATTRIBUTES } from '../build/content/final-source-marker-contract.js';
import { APP_SHELL_ROOT_ATTRIBUTE } from '../shared/app-shell/app-shell-root-contract.js';

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
const EXPECTED_APP_SHELL_ROOT_CLASS_TOKEN = 'app-shell-root';
const LEGACY_APP_SHELL_ROOT_ID = 'app';
const LEGACY_APP_SHELL_ROOT_CLASS_TOKEN = 'app-root';
const LEGACY_APP_SHELL_ROOT_FRAGMENT = '#app';

const ARIA_ID_REFERENCE_ATTRIBUTES = [
  'aria-controls',
  'aria-describedby',
  'aria-labelledby',
  'aria-owns',
  'aria-details',
  'aria-errormessage',
  'aria-flowto',
  'aria-activedescendant',
] as const;

const HTML_ID_REFERENCE_ATTRIBUTES = [
  'for',
  'form',
  'list',
  'headers',
  'itemref',
  'popovertarget',
  'commandfor',
] as const;

const splitAsciiWhitespaceTokens = (value: string): readonly string[] =>
  value.split(/[\t\n\f\r ]+/u).filter(Boolean);

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
  readonly document: Parse5Node;
}): void => {
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

  visit(options.document);
};

const assertAppShellRootContract = (options: {
  readonly repoRoot: string;
  readonly htmlFile: string;
  readonly document: Parse5Node;
}): void => {
  const repoPath = toRepoPath(options.repoRoot, options.htmlFile);
  const elements: Parse5Element[] = [];
  const structuralRoots: Parse5Element[] = [];

  const visit = (node: Parse5Node): void => {
    if (isElementNode(node)) {
      elements.push(node);
      if (node.attrs.some((attribute) => attribute.name === APP_SHELL_ROOT_ATTRIBUTE)) {
        structuralRoots.push(node);
      }
    }

    for (const child of getChildNodes(node)) {
      visit(child);
    }
  };

  visit(options.document);

  if (structuralRoots.length !== 1) {
    throw new Error(
      `[production-html-contracts] ${repoPath} contains ${structuralRoots.length.toString()} app shell roots identified by ${APP_SHELL_ROOT_ATTRIBUTE}; expected exactly 1.`,
    );
  }

  const appShellRoot = structuralRoots[0];
  const appShellRootClass = appShellRoot.attrs.find((attribute) => attribute.name === 'class');
  if (
    appShellRootClass === undefined ||
    !splitAsciiWhitespaceTokens(appShellRootClass.value).includes(
      EXPECTED_APP_SHELL_ROOT_CLASS_TOKEN,
    )
  ) {
    throw new Error(
      `[production-html-contracts] ${repoPath} app shell root is missing ${EXPECTED_APP_SHELL_ROOT_CLASS_TOKEN} class token.`,
    );
  }

  if (appShellRoot.attrs.some((attribute) => attribute.name === 'id')) {
    throw new Error(
      `[production-html-contracts] ${repoPath} app shell root must not have an id attribute.`,
    );
  }

  for (const element of elements) {
    const id = element.attrs.find((attribute) => attribute.name === 'id');
    if (id?.value === LEGACY_APP_SHELL_ROOT_ID) {
      throw new Error(
        `[production-html-contracts] ${repoPath} contains legacy id="${LEGACY_APP_SHELL_ROOT_ID}" on <${element.tagName}>.`,
      );
    }

    const classAttribute = element.attrs.find((attribute) => attribute.name === 'class');
    if (
      classAttribute !== undefined &&
      splitAsciiWhitespaceTokens(classAttribute.value).includes(LEGACY_APP_SHELL_ROOT_CLASS_TOKEN)
    ) {
      throw new Error(
        `[production-html-contracts] ${repoPath} contains legacy ${LEGACY_APP_SHELL_ROOT_CLASS_TOKEN} class token on <${element.tagName}>.`,
      );
    }

    const href = element.attrs.find((attribute) => attribute.name === 'href');
    if (href?.value === LEGACY_APP_SHELL_ROOT_FRAGMENT) {
      throw new Error(
        `[production-html-contracts] ${repoPath} contains legacy href="${LEGACY_APP_SHELL_ROOT_FRAGMENT}" on <${element.tagName}>.`,
      );
    }

    for (const attributeName of ARIA_ID_REFERENCE_ATTRIBUTES) {
      const attribute = element.attrs.find((candidate) => candidate.name === attributeName);
      if (
        attribute !== undefined &&
        splitAsciiWhitespaceTokens(attribute.value).includes(LEGACY_APP_SHELL_ROOT_ID)
      ) {
        throw new Error(
          `[production-html-contracts] ${repoPath} contains legacy app ID-reference token in ${attributeName} on <${element.tagName}>.`,
        );
      }
    }

    for (const attributeName of HTML_ID_REFERENCE_ATTRIBUTES) {
      const attribute = element.attrs.find((candidate) => candidate.name === attributeName);
      if (
        attribute !== undefined &&
        splitAsciiWhitespaceTokens(attribute.value).includes(LEGACY_APP_SHELL_ROOT_ID)
      ) {
        throw new Error(
          `[production-html-contracts] ${repoPath} contains legacy app ID-reference token in ${attributeName} on <${element.tagName}>.`,
        );
      }
    }
  }
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
    const html = await readFile(htmlFile, 'utf8');
    const document = parse5.parse(html);

    assertNoFinalSourceMarkerAttributes({
      repoRoot,
      htmlFile,
      document,
    });
    assertAppShellRootContract({
      repoRoot,
      htmlFile,
      document,
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
