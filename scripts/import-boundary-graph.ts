import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';
import ts from 'typescript';

export interface ImportEdge {
  readonly from: string;
  readonly to: string;
  readonly specifier: string;
}

const isSourceFile = (path: string): boolean => /\.(?:ts|tsx|js|mjs)$/u.test(path);

export const walkSourceFiles = (roots: readonly string[]): string[] => roots.flatMap((root) => {
  const visit = (directory: string): string[] => readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return visit(path);
    return isSourceFile(path) ? [path] : [];
  });
  return visit(root);
});

const normalizeProjectPath = (path: string): string => normalize(path).replace(/\\/gu, '/');

const resolveSpecifier = (from: string, specifier: string): string => {
  if (!specifier.startsWith('.')) return specifier;
  return normalizeProjectPath(relative(process.cwd(), resolve(dirname(from), specifier)));
};

const collectSpecifiersFromSource = (sourceText: string, fileName: string): string[] => {
  const source = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const specifiers: string[] = [];

  const pushSpecifier = (expression: ts.Expression): void => {
    if (ts.isStringLiteralLike(expression)) {
      specifiers.push(expression.text);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier !== undefined && ts.isStringLiteralLike(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      const reference = node.moduleReference;
      if (ts.isExternalModuleReference(reference) && reference.expression !== undefined) {
        pushSpecifier(reference.expression);
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1
    ) {
      const [argument] = node.arguments;
      if (argument !== undefined) {
        pushSpecifier(argument);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return specifiers;
};

export const collectImportEdges = (roots: readonly string[]): ImportEdge[] => {
  const edges: ImportEdge[] = [];
  for (const file of walkSourceFiles(roots)) {
    const content = readFileSync(file, 'utf8');
    for (const specifier of collectSpecifiersFromSource(content, file)) {
      edges.push({
        from: normalizeProjectPath(file),
        to: resolveSpecifier(file, specifier),
        specifier,
      });
    }
  }
  return edges;
};

export const edgeMatches = (edge: ImportEdge, fromPrefix: string, toPrefix: string): boolean =>
  edge.from.startsWith(fromPrefix) && edge.to.startsWith(toPrefix);
