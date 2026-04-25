import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const runtimeNotePageFiles = [
  'src/layouts/BaseLayout.11ty.ts',
  'build/projections/note-page-projection.ts',
  'build/data/notes.ts',
] as const;

const findForbiddenPolicyCalls = (sourceText: string): number[] => {
  const sourceFile = ts.createSourceFile(
    'policy-usage.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const positions: number[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'resolveNotePublicationPolicy'
    ) {
      positions.push(node.getStart(sourceFile));
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return positions;
};

describe('note publication policy usage', () => {
  it('runtime note page paths do not call kind-only publication policy directly', () => {
    const violations = runtimeNotePageFiles.flatMap((filePath) => {
      const sourceText = readFileSync(resolve(process.cwd(), filePath), 'utf8');
      return findForbiddenPolicyCalls(sourceText).map((position) => ({ filePath, position }));
    });

    expect(violations).toEqual([]);
  });
});
