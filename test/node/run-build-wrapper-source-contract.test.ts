import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const wrapperPaths = ['scripts/run-build.ts', 'scripts/run-production-build.ts'] as const;

const createSourceFile = (filePath: string): ts.SourceFile =>
  ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);

const visitNodes = (node: ts.Node, callback: (node: ts.Node) => void): void => {
  callback(node);
  ts.forEachChild(node, (child) => {
    visitNodes(child, callback);
  });
};

const getStringLiteralValue = (node: ts.Node): string | undefined => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return undefined;
};

const getPropertyNameText = (name: ts.PropertyName): string | undefined => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return undefined;
};

const isIdentifierNamed = (node: ts.Node, name: string): node is ts.Identifier =>
  ts.isIdentifier(node) && node.text === name;

const isProcessEnvObjectAccess = (node: ts.Node): boolean =>
  ts.isPropertyAccessExpression(node) &&
  isIdentifierNamed(node.expression, 'process') &&
  node.name.text === 'env';

const isProcessEnvBuildLabelAccess = (node: ts.Node): boolean => {
  if (ts.isElementAccessExpression(node)) {
    return (
      isProcessEnvObjectAccess(node.expression) &&
      getStringLiteralValue(node.argumentExpression) === 'ROUAULT_BUILD_LABEL'
    );
  }

  return (
    ts.isPropertyAccessExpression(node) &&
    isProcessEnvObjectAccess(node.expression) &&
    node.name.text === 'ROUAULT_BUILD_LABEL'
  );
};

const isInvocationCommandAccess = (node: ts.Node): boolean =>
  ts.isPropertyAccessExpression(node) &&
  isIdentifierNamed(node.expression, 'invocation') &&
  node.name.text === 'command';

const isInvocationWindowsVerbatimAccess = (node: ts.Node): boolean =>
  ts.isPropertyAccessExpression(node) &&
  isIdentifierNamed(node.expression, 'invocation') &&
  node.name.text === 'windowsVerbatimArguments';

const isTrueKeyword = (node: ts.Node): boolean => node.kind === ts.SyntaxKind.TrueKeyword;

const unwrapParenthesizedExpression = (node: ts.Expression): ts.Expression => {
  let current = node;

  while (ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }

  return current;
};

const isInvocationWindowsVerbatimTrueCheck = (node: ts.Expression): boolean => {
  const expression = unwrapParenthesizedExpression(node);

  if (
    !ts.isBinaryExpression(expression) ||
    expression.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken
  ) {
    return false;
  }

  const left = unwrapParenthesizedExpression(expression.left);
  const right = unwrapParenthesizedExpression(expression.right);

  return (
    (isInvocationWindowsVerbatimAccess(left) && isTrueKeyword(right)) ||
    (isTrueKeyword(left) && isInvocationWindowsVerbatimAccess(right))
  );
};

const isWindowsVerbatimTrueObject = (node: ts.Node): boolean => {
  if (!ts.isObjectLiteralExpression(node) || node.properties.length !== 1) {
    return false;
  }

  const property = node.properties[0];
  if (property === undefined || !ts.isPropertyAssignment(property)) {
    return false;
  }

  return (
    getPropertyNameText(property.name) === 'windowsVerbatimArguments' &&
    isTrueKeyword(property.initializer)
  );
};

const isEmptyObjectLiteral = (node: ts.Node): boolean =>
  ts.isObjectLiteralExpression(node) && node.properties.length === 0;

const isAllowedWindowsVerbatimSpread = (node: ts.SpreadAssignment): boolean => {
  const expression = unwrapParenthesizedExpression(node.expression);

  if (!ts.isConditionalExpression(expression)) {
    return false;
  }

  return (
    isInvocationWindowsVerbatimTrueCheck(expression.condition) &&
    isWindowsVerbatimTrueObject(unwrapParenthesizedExpression(expression.whenTrue)) &&
    isEmptyObjectLiteral(unwrapParenthesizedExpression(expression.whenFalse))
  );
};

const objectLiteralHasShellTrue = (node: ts.ObjectLiteralExpression): boolean =>
  node.properties.some((property) => {
    if (!ts.isPropertyAssignment(property)) {
      return false;
    }

    return getPropertyNameText(property.name) === 'shell' && isTrueKeyword(property.initializer);
  });

const objectLiteralHasForbiddenSpread = (node: ts.ObjectLiteralExpression): boolean =>
  node.properties.some(
    (property) => ts.isSpreadAssignment(property) && !isAllowedWindowsVerbatimSpread(property),
  );

const isSpawnSyncCall = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) && isIdentifierNamed(node.expression, 'spawnSync');

const isCreatePnpmInvocationCall = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) && isIdentifierNamed(node.expression, 'createPnpmInvocation');

const isAllowedProcessPlatformReference = (node: ts.Node): boolean => {
  if (!ts.isPropertyAccessExpression(node)) {
    return false;
  }

  if (!isIdentifierNamed(node.expression, 'process') || node.name.text !== 'platform') {
    return false;
  }

  const propertyAssignment = node.parent;
  if (!ts.isPropertyAssignment(propertyAssignment)) {
    return false;
  }

  if (
    propertyAssignment.initializer !== node ||
    getPropertyNameText(propertyAssignment.name) !== 'platform'
  ) {
    return false;
  }

  const objectLiteral = propertyAssignment.parent;
  if (!ts.isObjectLiteralExpression(objectLiteral)) {
    return false;
  }

  const callExpression = objectLiteral.parent;
  return isCreatePnpmInvocationCall(callExpression);
};

const collectStringLiterals = (sourceFile: ts.SourceFile): string[] => {
  const values: string[] = [];

  visitNodes(sourceFile, (node) => {
    const value = getStringLiteralValue(node);
    if (value !== undefined) {
      values.push(value);
    }
  });

  return values;
};

describe('run-build wrapper source contract', () => {
  it('wrappers は createPnpmInvocation を経由し、raw command spawn を再導入しないこと', () => {
    for (const filePath of wrapperPaths) {
      const sourceFile = createSourceFile(filePath);
      const violations: string[] = [];
      let spawnSyncCallCount = 0;
      let createPnpmInvocationCallCount = 0;

      visitNodes(sourceFile, (node) => {
        if (isCreatePnpmInvocationCall(node)) {
          createPnpmInvocationCallCount += 1;
        }

        if (!isSpawnSyncCall(node)) {
          return;
        }

        spawnSyncCallCount += 1;

        const [commandArgument, , optionsArgument] = node.arguments;
        if (commandArgument === undefined || !isInvocationCommandAccess(commandArgument)) {
          violations.push(`${filePath}: spawnSync command must be invocation.command`);
        }

        if (optionsArgument === undefined || !ts.isObjectLiteralExpression(optionsArgument)) {
          violations.push(`${filePath}: spawnSync options must be an inline object literal`);
          return;
        }

        if (objectLiteralHasShellTrue(optionsArgument)) {
          violations.push(`${filePath}: spawnSync options must not contain shell: true`);
        }

        if (objectLiteralHasForbiddenSpread(optionsArgument)) {
          violations.push(`${filePath}: spawnSync options contains forbidden spread`);
        }
      });

      expect(spawnSyncCallCount, filePath).toBeGreaterThan(0);
      expect(createPnpmInvocationCallCount, filePath).toBeGreaterThan(0);
      expect(violations).to.deep.equal([]);
    }
  });

  it('wrappers の string literal に pnpm.cmd / tsx.cmd を再導入しないこと', () => {
    for (const filePath of wrapperPaths) {
      const stringLiterals = collectStringLiterals(createSourceFile(filePath));

      expect(stringLiterals, filePath).not.toContain('pnpm.cmd');
      expect(stringLiterals, filePath).not.toContain('tsx.cmd');
    }
  });

  it('wrappers では process.platform を createPnpmInvocation の入力以外に使わないこと', () => {
    for (const filePath of wrapperPaths) {
      const sourceFile = createSourceFile(filePath);
      const violations: string[] = [];

      visitNodes(sourceFile, (node) => {
        if (
          ts.isPropertyAccessExpression(node) &&
          isIdentifierNamed(node.expression, 'process') &&
          node.name.text === 'platform' &&
          !isAllowedProcessPlatformReference(node)
        ) {
          violations.push(
            `${filePath}: process.platform is used outside createPnpmInvocation input`,
          );
        }
      });

      expect(violations).to.deep.equal([]);
    }
  });

  it('run-build.ts は RUN_BUILD_STEPS を import して createPnpmInvocation に渡すこと', () => {
    const source = readFileSync('scripts/run-build.ts', 'utf8');

    expect(source).toContain('RUN_BUILD_STEPS');
    expect(source).toContain('createPnpmInvocation');
    expect(source).toContain('invocation.windowsVerbatimArguments === true');
    expect(source).not.toContain('commandName(');
  });

  it('run-production-build.ts は PRODUCTION_BUILD_PNPM_ARGS を使い、process.env の build label 直接代入をしないこと', () => {
    const filePath = 'scripts/run-production-build.ts';
    const source = readFileSync(filePath, 'utf8');
    const sourceFile = createSourceFile(filePath);
    const violations: string[] = [];
    let resolveProductionBuildMetadataCallCount = 0;

    expect(source).toContain('PRODUCTION_BUILD_PNPM_ARGS');
    expect(source).toContain('createPnpmInvocation');
    expect(source).toContain('invocation.windowsVerbatimArguments === true');

    visitNodes(sourceFile, (node) => {
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.FirstAssignment &&
        isProcessEnvBuildLabelAccess(node.left)
      ) {
        violations.push(`${filePath}: process.env ROUAULT_BUILD_LABEL direct assignment`);
      }

      if (
        ts.isCallExpression(node) &&
        isIdentifierNamed(node.expression, 'resolveProductionBuildMetadata')
      ) {
        resolveProductionBuildMetadataCallCount += 1;

        const [argument] = node.arguments;
        if (argument === undefined || !ts.isObjectLiteralExpression(argument)) {
          violations.push(
            `${filePath}: resolveProductionBuildMetadata must receive an options object`,
          );
          return;
        }

        const hasBuildLabel = argument.properties.some(
          (property) =>
            ts.isPropertyAssignment(property) &&
            getPropertyNameText(property.name) === 'buildLabel',
        );

        if (!hasBuildLabel) {
          violations.push(
            `${filePath}: resolveProductionBuildMetadata options must contain buildLabel`,
          );
        }
      }

      if (isCreatePnpmInvocationCall(node)) {
        const [argument] = node.arguments;
        if (argument === undefined || !ts.isObjectLiteralExpression(argument)) {
          violations.push(
            `${filePath}: createPnpmInvocation must receive an inline object literal`,
          );
          return;
        }

        const pnpmArgsProperty = argument.properties.find(
          (property): property is ts.PropertyAssignment =>
            ts.isPropertyAssignment(property) && getPropertyNameText(property.name) === 'pnpmArgs',
        );

        if (
          pnpmArgsProperty === undefined ||
          !isIdentifierNamed(pnpmArgsProperty.initializer, 'PRODUCTION_BUILD_PNPM_ARGS')
        ) {
          violations.push(`${filePath}: createPnpmInvocation must use PRODUCTION_BUILD_PNPM_ARGS`);
        }
      }
    });

    expect(resolveProductionBuildMetadataCallCount).toBeGreaterThan(0);
    expect(violations).to.deep.equal([]);
  });

  it('run-build-process.ts は実プロセス起動や console error / process exit を持たないこと', () => {
    const filePath = 'scripts/run-build-process.ts';
    const sourceFile = createSourceFile(filePath);
    const violations: string[] = [];

    visitNodes(sourceFile, (node) => {
      if (ts.isCallExpression(node) && isIdentifierNamed(node.expression, 'spawnSync')) {
        violations.push(`${filePath}: spawnSync call`);
      }

      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        isIdentifierNamed(node.expression.expression, 'process') &&
        node.expression.name.text === 'exit'
      ) {
        violations.push(`${filePath}: process.exit call`);
      }

      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        isIdentifierNamed(node.expression.expression, 'console') &&
        node.expression.name.text === 'error'
      ) {
        violations.push(`${filePath}: console.error call`);
      }
    });

    const stringLiterals = collectStringLiterals(sourceFile);

    expect(stringLiterals).not.toContain('pnpm.cmd');
    expect(stringLiterals).not.toContain('tsx.cmd');
    expect(violations).to.deep.equal([]);
  });
});
