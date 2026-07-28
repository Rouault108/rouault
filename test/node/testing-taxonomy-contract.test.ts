import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  resolveBrowserTestBrowsers,
  webkitBrowserTestShards,
} from '../../scripts/testing/browser-test-matrix.js';

const repositoryRoot = process.cwd();
const browserTestRoot = path.join(repositoryRoot, 'test', 'browser');
const aggregateSpecifier = ['@open-wc', 'testing'].join('/');
const helperSpecifierPrefix = [aggregateSpecifier, 'helpers'].join('-');
const wtrSpecifierPrefix = ['@web', 'test-runner'].join('/');
const wtrPlaywrightSpecifier = [wtrSpecifierPrefix, 'playwright'].join('-');
const webDevServerEsbuildSpecifier = ['@web', 'dev-server-esbuild'].join('/');
const chaiSpecifier = ['@esm-bundle', 'chai'].join('/');
const mochaGlobalType = ['mo', 'cha'].join('');
const mochaTypesSpecifier = ['@types', mochaGlobalType].join('/');
const oldUtilitySpecifier = ['./helpers/wait-for', 'lit.js'].join('-');
const oldUtilityFilename = ['wait-for', 'lit.js'].join('-');
const directQuery = ['?', 'direct'].join('');
const oldRunnerScript = ['scripts/run-web-test', 'runner.mjs'].join('-');
const oldRunnerConfig = ['web-test', 'runner.config.mjs'].join('-');
const oldUtilityPath = ['test/browser/helpers/wait-for', 'lit.ts'].join('-');
const oldEnvironmentPrefix = ['ROUAULT', 'WTR'].join('_');
const oldEnvironmentVariables = [
  [oldEnvironmentPrefix, 'BROWSERS'].join('_'),
  [oldEnvironmentPrefix, 'WEBKIT'].join('_'),
] as const;

const normalizePath = (value: string): string => value.replaceAll('\\', '/');

const listFiles = (root: string): string[] => {
  const files: string[] = [];

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(absolutePath));
    } else {
      files.push(absolutePath);
    }
  }

  return files;
};

const readSourceFile = (absolutePath: string): ts.SourceFile =>
  ts.createSourceFile(
    absolutePath,
    fs.readFileSync(absolutePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

const collectModuleSpecifiers = (sourceFile: ts.SourceFile): string[] => {
  const specifiers: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1
    ) {
      const [argument] = node.arguments;
      if (argument !== undefined && ts.isStringLiteralLike(argument)) {
        specifiers.push(argument.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return specifiers;
};

const collectBareFetchCalls = (sourceFile: ts.SourceFile): number => {
  let count = 0;

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'fetch'
    ) {
      count += 1;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return count;
};

const collectMochaApiCalls = (sourceFile: ts.SourceFile): string[] => {
  const calls: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'before' || node.expression.text === 'after') {
        calls.push(node.expression.text);
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
      node.expression.name.text === 'timeout'
    ) {
      calls.push('this.timeout');
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return calls;
};

const browserTypeScriptFiles = listFiles(browserTestRoot).filter((file) => file.endsWith('.ts'));
const browserTestFiles = browserTypeScriptFiles.filter((file) => file.endsWith('.test.ts'));
const repositorySourceFiles = [
  ...listFiles(path.join(repositoryRoot, 'build')),
  ...listFiles(path.join(repositoryRoot, 'scripts')),
  ...listFiles(path.join(repositoryRoot, 'shared')),
  ...listFiles(path.join(repositoryRoot, 'src')),
  ...listFiles(path.join(repositoryRoot, 'test')),
  ...listFiles(path.join(repositoryRoot, 'tools')),
  path.join(repositoryRoot, 'eslint.config.mjs'),
  path.join(repositoryRoot, 'vitest.config.ts'),
].filter((file) => /\.(?:[cm]?[jt]s|tsx)$/u.test(file));

const activeTextFiles = [
  ...repositorySourceFiles,
  ...listFiles(path.join(repositoryRoot, '.github')),
  ...listFiles(path.join(repositoryRoot, 'docs', 'adr')),
  ...listFiles(path.join(repositoryRoot, 'docs', 'architecture')),
  ...listFiles(path.join(repositoryRoot, 'docs', 'contracts')),
  ...listFiles(path.join(repositoryRoot, 'docs', 'design-system')),
  ...listFiles(path.join(repositoryRoot, 'docs', 'guides')),
  ...listFiles(path.join(repositoryRoot, 'docs', 'references')),
  path.join(repositoryRoot, 'AGENTS.md'),
  path.join(repositoryRoot, 'README.md'),
  path.join(repositoryRoot, 'docs', 'README.md'),
  path.join(repositoryRoot, 'package.json'),
].filter((file) => fs.statSync(file).isFile());

describe('final testing taxonomy contract', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'),
  ) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const vitestConfig = fs.readFileSync(path.join(repositoryRoot, 'vitest.config.ts'), 'utf8');

  const getScript = (name: string): string => {
    const script = packageJson.scripts?.[name];
    expect(script, `${name} script should exist`).toEqual(expect.any(String));
    return script ?? '';
  };
  const normalizeScript = (script: string): string => script.replace(/\s+/gu, ' ').trim();

  it('makes Vitest Browser Mode the active public browser runner', () => {
    const browserScript = getScript('test:browser');

    expect(browserScript).toContain('vitest run');
    expect(browserScript).toContain('--project="browser-*"');
    expect(browserScript).not.toContain(oldRunnerScript);
  });

  it('keeps vitest.config.ts as the single browser project map', () => {
    const browserProjectConfigs = fs
      .readdirSync(repositoryRoot)
      .filter((entry) => /(?:vitest|web-test-runner).*config\.[cm]?[jt]s$/u.test(entry))
      .sort();

    expect(browserProjectConfigs).toEqual(['vitest.config.ts']);
    expect(getScript('test:browser')).not.toContain('--config');
  });

  it('keeps the shared browser project contract with the required instances and policies', () => {
    expect(vitestConfig).toContain("createBrowserTestProject('browser'");
    expect(vitestConfig).toContain("['test/browser/**/*.test.ts']");
    expect(vitestConfig).toContain("setupFiles: ['test/browser/setup.ts']");
    expect(vitestConfig).toContain('isolate: true');
    expect(vitestConfig).toContain('provider: createBrowserProvider()');
    expect(vitestConfig).toContain('headless: true');
    expect(vitestConfig).toContain('ui: false');
    expect(vitestConfig).toContain("host: '127.0.0.1'");
    expect(vitestConfig).toContain('strictPort: false');
    expect(vitestConfig).toContain('connectTimeout: 90_000');
    expect(vitestConfig).toContain('timeout: 90_000');
    expect(vitestConfig).toContain('name: `browser-${browser}`');
    expect(vitestConfig).toContain("browser === 'firefox' ? { fileParallelism: false } : {}");
    expect(vitestConfig).toContain('resolveBrowserTestBrowsers(');

    const configSpecifiers = collectModuleSpecifiers(
      readSourceFile(path.join(repositoryRoot, 'vitest.config.ts')),
    );
    expect(configSpecifiers).toContain('./scripts/testing/browser-test-matrix.js');
  });

  it('expands public WebKit selection into complete sequential internal shards', () => {
    expect(resolveBrowserTestBrowsers('webkit', false)).toEqual(['webkit']);
    expect(
      webkitBrowserTestShards.map(({ name, fileParallelism, groupOrder }) => ({
        name,
        fileParallelism,
        groupOrder,
      })),
    ).toEqual([
      {
        name: 'browser-webkit-general',
        fileParallelism: false,
        groupOrder: 1,
      },
      {
        name: 'browser-webkit-url-state',
        fileParallelism: false,
        groupOrder: 2,
      },
      {
        name: 'browser-webkit-navigation-state',
        fileParallelism: false,
        groupOrder: 3,
      },
    ]);

    const generalShard = webkitBrowserTestShards[0];
    const specializedShards = webkitBrowserTestShards.slice(1);
    const specializedFiles = specializedShards.flatMap((shard) => [...shard.include]);
    const generalExcludedFiles = new Set<string>(generalShard.exclude);
    const generalFiles = browserTestFiles
      .map((file) => normalizePath(path.relative(repositoryRoot, file)))
      .filter((file) => !generalExcludedFiles.has(file));
    const allShardFiles = [
      ...generalFiles,
      ...specializedShards.flatMap((shard) => [...shard.include]),
    ];
    const allBrowserTestFiles = browserTestFiles
      .map((file) => normalizePath(path.relative(repositoryRoot, file)))
      .sort();

    expect(generalShard.include).toEqual(['test/browser/**/*.test.ts']);
    expect([...generalShard.exclude].sort()).toEqual([...specializedFiles].sort());
    expect(new Set(specializedFiles).size).toBe(specializedFiles.length);
    expect(new Set(allShardFiles).size).toBe(allShardFiles.length);
    expect([...allShardFiles].sort()).toEqual(allBrowserTestFiles);
    expect(new Set(webkitBrowserTestShards.map((shard) => shard.name)).size).toBe(
      webkitBrowserTestShards.length,
    );
    expect(new Set(webkitBrowserTestShards.map((shard) => shard.projectName)).size).toBe(
      webkitBrowserTestShards.length,
    );

    const configSourceFile = readSourceFile(path.join(repositoryRoot, 'vitest.config.ts'));
    let mapsShardGroupOrderToSequence = false;
    const visit = (node: ts.Node): void => {
      if (
        ts.isPropertyAssignment(node) &&
        node.name.getText(configSourceFile) === 'sequence' &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        mapsShardGroupOrderToSequence = node.initializer.properties.some(
          (property) =>
            ts.isShorthandPropertyAssignment(property) && property.name.text === 'groupOrder',
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(configSourceFile);

    expect(mapsShardGroupOrderToSequence).toBe(true);
    expect(vitestConfig).toContain("browserTestBrowsers.includes('webkit')");
    expect(vitestConfig).toContain('fileParallelism: shard.fileParallelism');
  });

  it('requires explicit Vitest imports from every browser test', () => {
    const missing = browserTestFiles
      .filter((file) => !collectModuleSpecifiers(readSourceFile(file)).includes('vitest'))
      .map((file) => normalizePath(path.relative(repositoryRoot, file)));

    expect(missing).toEqual([]);
  });

  it('uses lit/static-html.js as the browser test template owner', () => {
    const ordinaryLitConsumers = browserTestFiles
      .filter((file) => collectModuleSpecifiers(readSourceFile(file)).includes('lit'))
      .map((file) => normalizePath(path.relative(repositoryRoot, file)));

    expect(ordinaryLitConsumers).toEqual([]);
  });

  it('removes active Open WC aggregate and legacy global API use from browser tests', () => {
    const aggregateConsumers: string[] = [];
    const mochaConsumers: string[] = [];

    for (const file of repositorySourceFiles) {
      const sourceFile = readSourceFile(file);
      if (
        collectModuleSpecifiers(sourceFile).some(
          (specifier) =>
            specifier === aggregateSpecifier || specifier.startsWith(`${aggregateSpecifier}/`),
        )
      ) {
        aggregateConsumers.push(normalizePath(path.relative(repositoryRoot, file)));
      }
      if (file.startsWith(browserTestRoot) && collectMochaApiCalls(sourceFile).length > 0) {
        mochaConsumers.push(normalizePath(path.relative(repositoryRoot, file)));
      }
    }

    expect(aggregateConsumers).toEqual([]);
    expect(mochaConsumers).toEqual([]);
  });

  it('removes the legacy runner files, direct dependencies, imports, commands, and environment', () => {
    const obsoletePaths = [oldRunnerConfig, oldRunnerScript, oldUtilityPath];
    const forbiddenDirectDependencies = [
      aggregateSpecifier,
      wtrSpecifierPrefix,
      wtrPlaywrightSpecifier,
      webDevServerEsbuildSpecifier,
      chaiSpecifier,
      mochaTypesSpecifier,
    ];
    const legacyModuleConsumers = repositorySourceFiles
      .filter((file) =>
        collectModuleSpecifiers(readSourceFile(file)).some(
          (specifier) =>
            specifier === aggregateSpecifier ||
            specifier.startsWith(`${aggregateSpecifier}/`) ||
            specifier === wtrSpecifierPrefix ||
            specifier.startsWith(`${wtrSpecifierPrefix}/`) ||
            specifier.startsWith(`${wtrSpecifierPrefix}-`),
        ),
      )
      .map((file) => normalizePath(path.relative(repositoryRoot, file)));
    const activeLegacyReferences = activeTextFiles
      .flatMap((file) => {
        const source = fs.readFileSync(file, 'utf8');
        return [...obsoletePaths, ...oldEnvironmentVariables]
          .filter((sentinel) => source.includes(sentinel))
          .map((sentinel) => `${normalizePath(path.relative(repositoryRoot, file))}: ${sentinel}`);
      })
      .sort();

    for (const obsoletePath of obsoletePaths) {
      expect(fs.existsSync(path.join(repositoryRoot, obsoletePath)), obsoletePath).toBe(false);
    }
    for (const dependency of forbiddenDirectDependencies) {
      expect(packageJson.devDependencies?.[dependency], dependency).toBeUndefined();
    }
    expect(legacyModuleConsumers).toEqual([]);
    expect(activeLegacyReferences).toEqual([]);
    expect(
      Object.values(packageJson.scripts ?? {}).some((script) => script.includes(oldRunnerScript)),
    ).toBe(false);
  });

  it('does not expose legacy global types from TypeScript config', () => {
    const configFiles = fs
      .readdirSync(repositoryRoot)
      .filter((entry) => /^tsconfig.*\.json$/u.test(entry));
    const mochaTypeConsumers = configFiles.filter((configFile) => {
      const config = JSON.parse(fs.readFileSync(path.join(repositoryRoot, configFile), 'utf8')) as {
        compilerOptions?: { types?: string[] };
      };
      return config.compilerOptions?.types?.includes(mochaGlobalType) === true;
    });

    expect(mochaTypeConsumers).toEqual([]);
  });

  it('limits direct Open WC pure helper imports to the fixture and setup owners', () => {
    const allowed = new Set(['test/browser/harness/browser-fixture.ts', 'test/browser/setup.ts']);
    const consumers = repositorySourceFiles
      .filter((file) =>
        collectModuleSpecifiers(readSourceFile(file)).some(
          (specifier) =>
            specifier === helperSpecifierPrefix ||
            specifier.startsWith(`${helperSpecifierPrefix}/`),
        ),
      )
      .map((file) => normalizePath(path.relative(repositoryRoot, file)))
      .sort();

    expect(consumers).toEqual([...allowed].sort());
  });

  it('makes the repository utility the only active readiness owner', () => {
    const consumers = repositorySourceFiles
      .filter((file) =>
        collectModuleSpecifiers(readSourceFile(file)).some(
          (specifier) =>
            specifier === oldUtilitySpecifier || specifier.endsWith(`/${oldUtilityFilename}`),
        ),
      )
      .map((file) => normalizePath(path.relative(repositoryRoot, file)));

    expect(consumers).toEqual([]);
  });

  it('uses the CSS response owner for every known stylesheet text path', () => {
    const knownPaths = [
      'test/browser/helpers/load-main-css.ts',
      'test/browser/tag.browser.test.ts',
      'test/browser/layout-toc-static-nav.browser.test.ts',
    ];

    for (const relativePath of knownPaths) {
      const absolutePath = path.join(repositoryRoot, relativePath);
      const sourceFile = readSourceFile(absolutePath);
      const sourceText = fs.readFileSync(absolutePath, 'utf8');

      expect(collectBareFetchCalls(sourceFile), relativePath).toBe(0);
      expect(sourceText, relativePath).not.toContain(directQuery);
      expect(
        collectModuleSpecifiers(sourceFile).some((specifier) =>
          specifier.endsWith('/fetch-css-text.js'),
        ),
        relativePath,
      ).toBe(true);
    }
  });

  it('keeps Storybook and E2E commands in their existing layers', () => {
    const testScript = normalizeScript(getScript('test'));
    const extendedScript = normalizeScript(getScript('test:extended'));
    const nodeScript = normalizeScript(getScript('test:node'));
    const browserScript = normalizeScript(getScript('test:browser'));
    const storybookMetaScript = normalizeScript(getScript('test:storybook:meta'));
    const storybookSmokeScript = normalizeScript(getScript('test:storybook:smoke'));

    expect(testScript).toContain('test:node');
    expect(testScript).toContain('test:ssr');
    expect(testScript).toContain('test:browser');
    expect(testScript).toContain('test:storybook:meta');
    expect(testScript).not.toContain('test:storybook:smoke');
    expect(testScript).not.toContain('test:e2e');

    expect(extendedScript).toContain('test:storybook:smoke');
    expect(extendedScript).toContain('test:e2e:production');
    expect(extendedScript).toContain('test:e2e:dev');
    expect(extendedScript).not.toContain('test:node');
    expect(extendedScript).not.toContain('test:ssr');
    expect(extendedScript).not.toContain('test:browser');
    expect(extendedScript).not.toContain('test:storybook:meta');

    expect(nodeScript).toContain('vitest');
    expect(nodeScript).toContain('--project node');
    expect(nodeScript).not.toContain('playwright');
    expect(browserScript).not.toContain('vitest --project node');
    expect(packageJson.scripts?.['test:unit']).toBeUndefined();

    expect(getScript('test:e2e')).toContain('playwright test');
    expect(getScript('test:e2e:production')).toContain('playwright test');
    expect(getScript('test:e2e:dev')).toContain('playwright test');
    expect(storybookMetaScript).toContain('vitest');
    expect(storybookMetaScript).toContain('--project storybook-meta');
    expect(storybookSmokeScript).toContain('vitest');
    expect(storybookSmokeScript).toContain('--project storybook-smoke');
    expect(vitestConfig).toContain("name: 'node'");
    expect(vitestConfig).toContain("name: 'storybook-smoke'");
    expect(vitestConfig).toContain("name: 'storybook-meta'");
    expect(vitestConfig).toContain("include: ['smoke']");
    expect(vitestConfig).toContain("exclude: ['manual-only']");
    expect(vitestConfig).not.toContain("name: 'storybook-runtime'");
  });
});
