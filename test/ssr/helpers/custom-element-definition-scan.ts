import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import ts from 'typescript';

export type CustomElementDefinitionKind = 'decorator' | 'custom-elements-define';

export interface CustomElementDefinitionFinding {
  readonly filePath: string;
  readonly relativePath: string;
  readonly line: number;
  readonly column: number;
  readonly kind: CustomElementDefinitionKind;
  readonly tag: string | null;
}

export interface CustomElementDefinitionScanResult {
  readonly literalDecoratorDefinitions: readonly CustomElementDefinitionFinding[];
  readonly literalCustomElementsDefineDefinitions: readonly CustomElementDefinitionFinding[];
  readonly nonLiteralDecoratorDefinitions: readonly CustomElementDefinitionFinding[];
  readonly nonLiteralCustomElementsDefineDefinitions: readonly CustomElementDefinitionFinding[];
}

interface MutableCustomElementDefinitionScanResult {
  readonly literalDecoratorDefinitions: CustomElementDefinitionFinding[];
  readonly literalCustomElementsDefineDefinitions: CustomElementDefinitionFinding[];
  readonly nonLiteralDecoratorDefinitions: CustomElementDefinitionFinding[];
  readonly nonLiteralCustomElementsDefineDefinitions: CustomElementDefinitionFinding[];
}

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const EXCLUDED_DIRECTORY_NAMES = new Set([
  '.git',
  '.generated',
  '.velite',
  'dist',
  'docs',
  'old',
  'test',
  'stories',
  'fixtures',
  'node_modules',
  'playwright-report',
  'test-results',
]);

const createEmptyResult = (): MutableCustomElementDefinitionScanResult => ({
  literalDecoratorDefinitions: [],
  literalCustomElementsDefineDefinitions: [],
  nonLiteralDecoratorDefinitions: [],
  nonLiteralCustomElementsDefineDefinitions: [],
});

const normalizePath = (value: string): string => value.split(sep).join('/');

const getExtension = (filePath: string): string => {
  const lastSegment = filePath.split(/[\\/]/u).at(-1) ?? filePath;
  const dotIndex = lastSegment.lastIndexOf('.');
  return dotIndex === -1 ? '' : lastSegment.slice(dotIndex);
};

const isExcludedPath = (filePath: string): boolean =>
  normalizePath(filePath)
    .split('/')
    .some((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment));

export const collectCustomElementDefinitionSourceFiles = (
  rootDirectory: string,
  sourceRoots: readonly string[],
): readonly string[] => {
  const files: string[] = [];

  const visit = (directoryPath: string): void => {
    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
      const entryPath = join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
          visit(entryPath);
        }
        continue;
      }

      if (!entry.isFile() || isExcludedPath(entryPath)) {
        continue;
      }

      if (SCANNED_EXTENSIONS.has(getExtension(entryPath))) {
        files.push(entryPath);
      }
    }
  };

  for (const sourceRoot of sourceRoots) {
    const rootPath = join(rootDirectory, sourceRoot);
    if (statSync(rootPath).isDirectory()) {
      visit(rootPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right, 'en'));
};

const getStringLiteralValue = (node: ts.Node | undefined): string | null => {
  if (node === undefined) {
    return null;
  }

  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
};

const createFinding = (
  sourceFile: ts.SourceFile,
  filePath: string,
  rootDirectory: string,
  node: ts.Node,
  kind: CustomElementDefinitionKind,
  tag: string | null,
): CustomElementDefinitionFinding => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

  return {
    filePath,
    relativePath: normalizePath(relative(rootDirectory, filePath)),
    line: position.line + 1,
    column: position.character + 1,
    kind,
    tag,
  };
};

const isCustomElementDecoratorExpression = (
  expression: ts.Expression,
): expression is ts.CallExpression => {
  if (!ts.isCallExpression(expression)) {
    return false;
  }

  const callee = expression.expression;
  return ts.isIdentifier(callee) && callee.text === 'customElement';
};

const isCustomElementsDefineExpression = (
  expression: ts.Expression,
): expression is ts.CallExpression => {
  if (!ts.isCallExpression(expression)) {
    return false;
  }

  const callee = expression.expression;
  return (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'customElements' &&
    callee.name.text === 'define'
  );
};

const pushFinding = (
  result: MutableCustomElementDefinitionScanResult,
  finding: CustomElementDefinitionFinding,
): void => {
  if (finding.kind === 'decorator') {
    if (finding.tag === null) {
      result.nonLiteralDecoratorDefinitions.push(finding);
      return;
    }
    result.literalDecoratorDefinitions.push(finding);
    return;
  }

  if (finding.tag === null) {
    result.nonLiteralCustomElementsDefineDefinitions.push(finding);
    return;
  }
  result.literalCustomElementsDefineDefinitions.push(finding);
};

export const scanCustomElementDefinitions = (
  rootDirectory: string,
  filePaths: readonly string[],
): CustomElementDefinitionScanResult => {
  const result = createEmptyResult();

  for (const filePath of filePaths) {
    const sourceText = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

    const visit = (node: ts.Node): void => {
      const decorators = ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
      for (const decorator of decorators) {
        if (isCustomElementDecoratorExpression(decorator.expression)) {
          pushFinding(
            result,
            createFinding(
              sourceFile,
              filePath,
              rootDirectory,
              decorator,
              'decorator',
              getStringLiteralValue(decorator.expression.arguments[0]),
            ),
          );
        }
      }

      if (ts.isCallExpression(node) && isCustomElementsDefineExpression(node)) {
        pushFinding(
          result,
          createFinding(
            sourceFile,
            filePath,
            rootDirectory,
            node,
            'custom-elements-define',
            getStringLiteralValue(node.arguments[0]),
          ),
        );
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return result;
};
