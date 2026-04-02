import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  resolveRouaultStoryRole,
  type RouaultStoryRole,
} from '../../src/testing/story-taxonomy.js';

export interface StorySourceRecord {
  filePath: string;
  exportName: string;
  hasPlay: boolean;
  importSpecifiers: readonly string[];
  metaTitle: string | undefined;
  storyTags: readonly string[];
  metaTags: readonly string[];
  resolvedTags: readonly string[];
  resolvedRole: RouaultStoryRole;
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceRoot = path.join(repositoryRoot, 'src');

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}

function walkStoryFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const nextPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkStoryFiles(nextPath));
      continue;
    }

    if (entry.isFile() && nextPath.endsWith('.stories.ts')) {
      files.push(nextPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

function unwrapObjectLiteral(
  expression: ts.Expression | undefined,
): ts.ObjectLiteralExpression | undefined {
  if (!expression) {
    return undefined;
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return expression;
  }

  if (
    ts.isSatisfiesExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    return unwrapObjectLiteral(expression.expression);
  }

  return undefined;
}

function getPropertyName(propertyName: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName)) {
    return propertyName.text;
  }

  return undefined;
}

function getObjectProperty(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.PropertyAssignment | undefined {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    if (getPropertyName(property.name) === propertyName) {
      return property;
    }
  }

  return undefined;
}

function getStringArrayProperty(
  objectLiteral: ts.ObjectLiteralExpression | undefined,
  propertyName: string,
): readonly string[] {
  if (!objectLiteral) {
    return [];
  }

  const property = getObjectProperty(objectLiteral, propertyName);
  if (!property || !ts.isArrayLiteralExpression(property.initializer)) {
    return [];
  }

  const values = new Set<string>();
  for (const element of property.initializer.elements) {
    if (!ts.isStringLiteral(element)) {
      continue;
    }

    const normalized = element.text.trim();
    if (normalized.length === 0) {
      continue;
    }

    values.add(normalized);
  }

  return [...values];
}

function getMetaTitle(objectLiteral: ts.ObjectLiteralExpression | undefined): string | undefined {
  if (!objectLiteral) {
    return undefined;
  }

  const titleProperty = getObjectProperty(objectLiteral, 'title');
  if (!titleProperty || !ts.isStringLiteral(titleProperty.initializer)) {
    return undefined;
  }

  return titleProperty.initializer.text;
}

function hasPlayFunction(objectLiteral: ts.ObjectLiteralExpression): boolean {
  return objectLiteral.properties.some(
    (property) => ts.isPropertyAssignment(property) && getPropertyName(property.name) === 'play',
  );
}

function collectMetaObject(sourceFile: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  const objectLiterals = new Map<string, ts.ObjectLiteralExpression>();

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }

      const objectLiteral = unwrapObjectLiteral(declaration.initializer);
      if (objectLiteral) {
        objectLiterals.set(declaration.name.text, objectLiteral);
      }
    }
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isExportAssignment(statement)) {
      continue;
    }

    if (ts.isIdentifier(statement.expression)) {
      return objectLiterals.get(statement.expression.text);
    }

    return unwrapObjectLiteral(statement.expression);
  }

  return undefined;
}

export function collectStorySourceRecords(): StorySourceRecord[] {
  const records: StorySourceRecord[] = [];

  for (const absolutePath of walkStoryFiles(sourceRoot)) {
    const sourceText = fs.readFileSync(absolutePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      absolutePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const metaObject = collectMetaObject(sourceFile);
    const metaTitle = getMetaTitle(metaObject);
    const metaTags = getStringArrayProperty(metaObject, 'tags');
    const importSpecifiers = sourceFile.statements
      .filter(ts.isImportDeclaration)
      .map((statement) => statement.moduleSpecifier)
      .filter(ts.isStringLiteral)
      .map((statement) => statement.text);

    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) {
        continue;
      }

      const isExport = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (!isExport) {
        continue;
      }

      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          continue;
        }

        const objectLiteral = unwrapObjectLiteral(declaration.initializer);
        if (!objectLiteral) {
          continue;
        }

        const storyTags = getStringArrayProperty(objectLiteral, 'tags');
        records.push({
          filePath: normalizePath(path.relative(repositoryRoot, absolutePath)),
          exportName: declaration.name.text,
          hasPlay: hasPlayFunction(objectLiteral),
          importSpecifiers,
          metaTitle,
          storyTags,
          metaTags,
          resolvedTags: [...new Set([...metaTags, ...storyTags])],
          resolvedRole: resolveRouaultStoryRole({ tags: storyTags }, { tags: metaTags }),
        });
      }
    }
  }

  return records;
}

export function resolveImportPath(
  storyFilePath: string,
  importSpecifier: string,
): string | undefined {
  if (importSpecifier.startsWith('@/')) {
    return normalizePath(path.join('src', importSpecifier.slice(2)));
  }

  if (!importSpecifier.startsWith('.')) {
    return undefined;
  }

  const absoluteStoryPath = path.join(repositoryRoot, storyFilePath);
  const resolvedPath = path.resolve(path.dirname(absoluteStoryPath), importSpecifier);
  return normalizePath(path.relative(repositoryRoot, resolvedPath));
}
