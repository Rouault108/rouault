import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { PRODUCTION_BUILD_PNPM_ARGS, RUN_BUILD_STEPS } from '../../scripts/run-build-process.js';
import { assertProductionE2EMatrixContract } from '../../scripts/ci/assert-workflow-source-contract.js';

const projectRoot = process.cwd();
const workflowPath = path.resolve(projectRoot, '.github/workflows/ci-cd.yml');
const playwrightConfigPath = path.resolve(projectRoot, 'playwright.config.ts');
const packageJsonPath = path.resolve(projectRoot, 'package.json');
const buildEntrypointPath = path.resolve(projectRoot, 'scripts/run-build.ts');
const clientBuildEntrypointPath = path.resolve(projectRoot, 'scripts/run-client-build.ts');
const productionBuildEntrypointPath = path.resolve(projectRoot, 'scripts/run-production-build.ts');
const productionCssArtifactAssertionPath = path.resolve(
  projectRoot,
  'scripts/assert-production-css-artifacts.ts',
);

interface YamlApi {
  readonly load: (source: string) => unknown;
  readonly dump: (
    value: unknown,
    options?: { readonly indent?: number; readonly sortKeys?: boolean },
  ) => string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// CommonJSの境界をunknownで受け、parserの型をworkflowの型として扱わない。
const isYamlApi = (value: unknown): value is YamlApi =>
  isRecord(value) && typeof value['load'] === 'function' && typeof value['dump'] === 'function';
const yamlModule: unknown = createRequire(import.meta.url)('js-yaml');
if (!isYamlApi(yamlModule)) throw new Error('js-yamlのload/dumpが必要です');
const yaml = yamlModule;

const requireRecord = (value: unknown, location: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new Error(`${location}はmappingである必要があります`);
  return value;
};

const readWorkflowJobs = (source: string): Record<string, unknown> => {
  const workflow = requireRecord(yaml.load(source), 'workflow');
  return requireRecord(workflow['jobs'], 'jobs');
};

const readJob = (jobs: Record<string, unknown>, jobId: string): Record<string, unknown> =>
  requireRecord(jobs[jobId], `jobs.${jobId}`);

const readSteps = (job: Record<string, unknown>): readonly Record<string, unknown>[] => {
  const steps: unknown = job['steps'];
  if (!Array.isArray(steps)) throw new Error('job.stepsはsequenceである必要があります');
  return steps.map((step: unknown) => requireRecord(step, 'job.steps[]'));
};

const runLines = (step: Record<string, unknown>): readonly string[] => {
  const run = step['run'];
  if (run === undefined) return [];
  if (typeof run !== 'string') throw new Error('step.runは文字列である必要があります');
  return run
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
};

const buildLabelCommand = 'echo "ROUAULT_BUILD_LABEL=${GITHUB_SHA::7}" >> "$GITHUB_ENV"';
const mediaBaseUrl = '${{ vars.ROUAULT_MEDIA_BASE_URL }}';
const buildJobCommands = [
  ['test-e2e-production', 'pnpm run test:e2e:production ${{ matrix.projects }}'],
  ['test-e2e-dev', 'pnpm run test:e2e:dev'],
  ['build-production', 'pnpm build:production'],
] as const;

const assertBuildJobs = (source: string): void => {
  const jobs = readWorkflowJobs(source);
  for (const [jobId, command] of buildJobCommands) {
    const job = readJob(jobs, jobId);
    const env = requireRecord(job['env'], `${jobId}.env`);
    expect(env['ROUAULT_MEDIA_BASE_URL'], `${jobId}: media URL`).toBe(mediaBaseUrl);
    const steps = readSteps(job);
    const commands = steps.map(runLines);
    const labelSteps = commands.flatMap((lines, index) =>
      lines.filter((line) => line === buildLabelCommand).map(() => index),
    );
    const executionSteps = commands.flatMap((lines, index) =>
      lines.filter((line) => line === command).map(() => index),
    );
    expect(labelSteps, `${jobId}: build label`).toHaveLength(1);
    expect(executionSteps, `${jobId}: command`).toHaveLength(1);
    // GITHUB_ENVの値は書き込んだstep自身には反映されない。
    expect(labelSteps[0], `${jobId}: build label must precede execution`).toBeLessThan(
      executionSteps[0] ?? -1,
    );
  }
};

const normalizeCondition = (value: unknown): string => {
  if (typeof value !== 'string') throw new Error('job.ifは文字列である必要があります');
  return value.replace(/\s+/gu, ' ').trim();
};

const fullRunCondition =
  "${{ !cancelled() && needs.detect-changes.result == 'success' && needs.prebuild-gate.result == 'success' && needs.detect-changes.outputs.app == 'true' && ((github.event_name == 'push' && github.ref == 'refs/heads/main') || github.event_name == 'workflow_dispatch' || (github.event_name == 'pull_request' && github.base_ref == 'main')) }}";

const assertEventGates = (source: string): void => {
  const jobs = readWorkflowJobs(source);
  for (const jobId of ['test-e2e-production', 'test-e2e-dev']) {
    expect(normalizeCondition(readJob(jobs, jobId)['if']), jobId).toBe(fullRunCondition);
  }
  const deployCondition = normalizeCondition(readJob(jobs, 'deploy-production')['if']);
  expect(deployCondition).toContain("github.event_name == 'push'");
  expect(deployCondition).toContain("github.ref == 'refs/heads/main'");
  expect(deployCondition).toContain("needs.detect-changes.outputs.build == 'true'");
  expect(deployCondition).not.toContain("github.event_name == 'workflow_dispatch'");
};

describe('production build entrypoint contract', () => {
  it('CI matrixはproject optionを直接転送し、local入口は全projectを維持すること', () => {
    const source = readFileSync(workflowPath, 'utf8');
    assertProductionE2EMatrixContract(source);
    const packageJson = requireRecord(JSON.parse(readFileSync(packageJsonPath, 'utf8')), 'package');
    const scripts = requireRecord(packageJson['scripts'], 'package.scripts');
    expect(scripts['test:e2e:production']).toBe(
      'pnpm run codegen:icons && pnpm run codegen:content && pnpm exec playwright test',
    );
    const job = readJob(readWorkflowJobs(source), 'test-e2e-production');
    const matrix = requireRecord(requireRecord(job['strategy'], 'strategy')['matrix'], 'matrix');
    const entries: unknown = matrix['include'];
    if (!Array.isArray(entries)) throw new Error('matrix.includeはsequenceである必要があります');
    const test = readSteps(job).find((step) => step['id'] === 'playwright-production');
    expect(test?.['run']).toBe('pnpm run test:e2e:production ${{ matrix.projects }}');
    const commands = entries.map((entry: unknown) => {
      const fields = requireRecord(entry, 'matrix.include[]');
      return `pnpm run test:e2e:production ${String(fields['projects'])}`.split(/\s+/u);
    });
    expect(commands).toEqual([
      ['pnpm', 'run', 'test:e2e:production', '--project=chromium-integration'],
      ['pnpm', 'run', 'test:e2e:production', '--project=firefox-final-check'],
      [
        'pnpm',
        'run',
        'test:e2e:production',
        '--project=webkit-final-check',
        '--project=webkit-mobile-final-check',
      ],
    ]);
  });

  it('余分なstandalone --とWebKit project optionのまとめquoteを拒否すること', () => {
    const source = readFileSync(workflowPath, 'utf8');
    for (const mutated of [
      source.replace(
        'test:e2e:production ${{ matrix.projects }}',
        'test:e2e:production -- ${{ matrix.projects }}',
      ),
      source.replace(
        'test:e2e:production ${{ matrix.projects }}',
        'test:e2e:production "${{ matrix.projects }}"',
      ),
    ]) {
      expect(mutated).not.toBe(source);
      expect(() => assertProductionE2EMatrixContract(mutated)).toThrow(/exact project arguments/u);
    }
  });

  it('Playwright preview 起動前に共有 production build entrypoint を使うこと', () => {
    const playwrightConfig = readFileSync(playwrightConfigPath, 'utf8');
    const normalizedPlaywrightConfig = playwrightConfig.replace(/\s+/g, ' ');

    expect(normalizedPlaywrightConfig).toContain(
      "command: 'pnpm run build:production && pnpm exec vite preview --config vite.preview.config.ts --host 127.0.0.1 --port 4173 --strictPort'",
    );
  });

  it('Playwright production e2e は未指定時の local build label を明示注入すること', () => {
    const playwrightConfig = readFileSync(playwrightConfigPath, 'utf8');

    expect(playwrightConfig).toContain('const resolveE2EBuildLabel = (): string => {');
    expect(playwrightConfig).toContain("process.env['ROUAULT_BUILD_LABEL']?.trim()");
    expect(playwrightConfig).toContain("process.env['GITHUB_SHA']?.trim()");
    expect(playwrightConfig).toContain("return 'e2e local';");
    expect(playwrightConfig).toContain('ROUAULT_BUILD_LABEL: resolveE2EBuildLabel(),');
  });

  it('build-production と dev/prod e2e jobs が同じ media base URL と build label 経路を使うこと', () => {
    assertBuildJobs(readFileSync(workflowPath, 'utf8'));
  });

  it('workflow_dispatch は full run 対象に含め、deploy は push main のみに限定すること', () => {
    assertEventGates(readFileSync(workflowPath, 'utf8'));
  });

  it('production build entrypoint は生成後に CSS artifact assertion を実行すること', () => {
    const productionBuildEntrypoint = readFileSync(productionBuildEntrypointPath, 'utf8');

    expect(productionBuildEntrypoint).toContain(
      "import { assertProductionCssArtifacts } from './assert-production-css-artifacts.js';",
    );
    expect(productionBuildEntrypoint).toContain('await assertProductionCssArtifacts();');
  });

  it('production build entrypoint は build metadata を subprocess env に注入すること', () => {
    const productionBuildEntrypoint = readFileSync(productionBuildEntrypointPath, 'utf8');

    expect(productionBuildEntrypoint).toContain(
      "import { resolveProductionBuildMetadata } from '../build/metadata/build-metadata.js';",
    );
    expect(productionBuildEntrypoint).toContain(
      'const buildMetadata = resolveProductionBuildMetadata({',
    );
    expect(productionBuildEntrypoint).toContain('buildLabel: entrypointBuildLabel,');
    expect(productionBuildEntrypoint).toContain('ROUAULT_BUILD_ID: buildMetadata.buildId,');
    expect(productionBuildEntrypoint).toContain('ROUAULT_BUILD_LABEL: buildMetadata.buildLabel,');
    expect(productionBuildEntrypoint).toContain('ROUAULT_GENERATED_AT: buildMetadata.generatedAt,');
    expect(productionBuildEntrypoint).toContain('pnpmArgs: PRODUCTION_BUILD_PNPM_ARGS,');
    expect(PRODUCTION_BUILD_PNPM_ARGS).to.deep.equal(['build']);
    expect(productionBuildEntrypoint).toMatch(
      /spawnSync\(invocation\.command, \[\.\.\.invocation\.args\], \{\s*env,/su,
    );
  });

  it('通常 build entrypoint は build metadata を一度だけ解決して subprocess env に注入すること', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      readonly scripts?: Record<string, string>;
    };
    const buildEntrypoint = readFileSync(buildEntrypointPath, 'utf8');

    expect(packageJson.scripts?.['build']).toBe('pnpm exec tsx scripts/run-build.ts');
    expect(buildEntrypoint).toContain(
      "import { resolveDevelopmentBuildMetadata } from '../build/metadata/build-metadata.js';",
    );
    expect(buildEntrypoint).toContain('const buildMetadata = (() => {');
    expect(buildEntrypoint).toContain('ROUAULT_BUILD_ID: buildMetadata.buildId,');
    expect(buildEntrypoint).toContain('ROUAULT_BUILD_LABEL: buildMetadata.buildLabel,');
    expect(buildEntrypoint).toContain('ROUAULT_GENERATED_AT: buildMetadata.generatedAt,');
    expect(buildEntrypoint).toContain('const siteUrlContext = (() => {');
    expect(buildEntrypoint).toContain('resolveDevelopmentSiteUrlContext({');
    expect(buildEntrypoint).toContain('resolveProductionSiteUrlContext({');
    expect(buildEntrypoint).toContain('ROUAULT_SITE_ORIGIN: siteUrlContext.siteOrigin,');
    expect(buildEntrypoint).toContain('ROUAULT_BASE_PATH: siteUrlContext.basePath,');
    expect(
      RUN_BUILD_STEPS.find((step) => step.label === 'emit-navigation-artifacts')?.pnpmArgs,
    ).to.deep.equal(['exec', 'tsx', 'scripts/emit-navigation-artifacts.ts']);
    expect(buildEntrypoint).toContain('for (const step of RUN_BUILD_STEPS) {');
    expect(buildEntrypoint).toContain('pnpmArgs: step.pnpmArgs,');
    expect(buildEntrypoint).toMatch(
      /spawnSync\(invocation\.command, \[\.\.\.invocation\.args\], \{\s*env,/su,
    );
  });

  it('通常 build:client script は client build entrypoint 経由で metadata を注入すること', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      readonly scripts?: Record<string, string>;
    };
    const clientBuildEntrypoint = readFileSync(clientBuildEntrypointPath, 'utf8');

    expect(packageJson.scripts?.['build:client']).toBe('pnpm exec tsx scripts/run-client-build.ts');
    expect(clientBuildEntrypoint).toContain(
      "import { resolveDevelopmentBuildMetadata } from '../build/metadata/build-metadata.js';",
    );
    expect(clientBuildEntrypoint).toContain('return resolveDevelopmentBuildMetadata();');
    expect(clientBuildEntrypoint).toContain('createPnpmInvocation');
    expect(clientBuildEntrypoint).toContain('RunBuildProcessConfigurationError');
    expect(clientBuildEntrypoint).toContain('ROUAULT_BUILD_ID: buildMetadata.buildId,');
    expect(clientBuildEntrypoint).toContain('ROUAULT_BUILD_LABEL: buildMetadata.buildLabel,');
    expect(clientBuildEntrypoint).toContain('ROUAULT_GENERATED_AT: buildMetadata.generatedAt,');
    expect(clientBuildEntrypoint).toContain("pnpmArgs: ['run', 'codegen:icons']");
    expect(clientBuildEntrypoint).toContain("pnpmArgs: ['run', 'prepare:static-font-assets']");
    expect(clientBuildEntrypoint).toContain(
      "pnpmArgs: ['exec', 'vite', 'build', '--config', 'vite.client.config.ts']",
    );
    expect(clientBuildEntrypoint).toContain('formatSpawnErrorDiagnostics(result.error)');
    expect(clientBuildEntrypoint).toContain('result.status !== 0');
    expect(clientBuildEntrypoint).toMatch(
      /spawnSync\(invocation\.command, \[\.\.\.invocation\.args\], \{\s*env,/su,
    );
  });

  it('production CSS artifact assertion は reachable CSS 全体と styling hook を検査すること', () => {
    const assertionSource = readFileSync(productionCssArtifactAssertionPath, 'utf8');

    expect(assertionSource).not.toContain('TOC_MOBILE_PANEL_SELECTOR');
    expect(assertionSource).toContain('TOC_MOBILE_PANEL_STYLING_SELECTOR');
    expect(assertionSource).toContain('TOC_MOBILE_PANEL_CSS_ARTIFACT_PATH');
    expect(assertionSource).toContain("const reachableCss = [...cssByAsset.values()].join('\\n');");
    expect(assertionSource).toContain('--toc-item-inactive-upper-max-lines');
    expect(assertionSource).toContain('expectRuleHasDeclarations');
    expect(assertionSource).toContain('var(--toc-item-inactive-max-lines, 2)');
    expect(assertionSource).toContain('var(--toc-item-active-max-lines, 3)');
  });
});

interface FixtureJob {
  env?: Record<string, string>;
  steps: Record<string, unknown>[];
  if?: string;
}

const createWorkflowFixture = (): { jobs: Record<string, FixtureJob> } => ({
  jobs: Object.fromEntries([
    ...buildJobCommands.map(([jobId, command]) => [
      jobId,
      {
        env: { ROUAULT_MEDIA_BASE_URL: mediaBaseUrl },
        steps: [{ run: buildLabelCommand }, { run: command }],
        if: fullRunCondition,
      },
    ]),
    [
      'deploy-production',
      {
        steps: [],
        if: "${{ github.event_name == 'push' && github.ref == 'refs/heads/main' && needs.detect-changes.outputs.build == 'true' }}",
      },
    ],
  ]),
});

const fixtureJob = (
  fixture: ReturnType<typeof createWorkflowFixture>,
  jobId: string,
): FixtureJob => {
  const job = fixture.jobs[jobId];
  if (job === undefined) throw new Error(`fixtureに${jobId}がありません`);
  return job;
};

describe('workflow structure regression coverage', () => {
  it.each([2, 4])('indent=%i、job/key順序、name/id、引用符の変更を許容すること', (indent) => {
    const fixture = createWorkflowFixture();
    fixture.jobs = Object.fromEntries(Object.entries(fixture.jobs).reverse());
    for (const [jobId, job] of Object.entries(fixture.jobs)) {
      job.steps = job.steps.map((step, index) => ({
        id: `${jobId}-${String(index)}`,
        name: 'runは先頭キーでなくてもよい',
        ...step,
      }));
    }
    const source = yaml.dump(fixture, { indent, sortKeys: true });
    assertBuildJobs(source);
    assertEventGates(source);
  });

  it.each(['|', '>'])('runのblock scalar %s とコメントを許容すること', (style) => {
    const source = buildJobCommands
      .map(
        ([jobId, command]) => `
  ${jobId}:
    env:
      ROUAULT_MEDIA_BASE_URL: "${mediaBaseUrl}"
    steps:
      - run: |-
          ${buildLabelCommand}
      - name: execute
        run: ${style} # 表記だけを変えている
          ${command}
        id: execute
`,
      )
      .join('');
    assertBuildJobs(`jobs:${source}`);
  });

  it.each(buildJobCommands)('%sの欠落、env/run/labelの破損を検出すること', (jobId, command) => {
    const mutations: readonly ((job: FixtureJob) => void)[] = [
      (job) => {
        delete job.env;
      },
      (job) => {
        job.env = { ROUAULT_MEDIA_BASE_URL: 'https://wrong.example' };
      },
      (job) => {
        job.steps = [{ run: buildLabelCommand }];
      },
      (job) => {
        job.steps = [{ run: buildLabelCommand }, { run: 'pnpm wrong' }];
      },
      (job) => {
        job.steps = [{ run: command }];
      },
      (job) => {
        job.steps = [{ run: command }, { run: buildLabelCommand }];
      },
      (job) => {
        job.steps = [{ run: `${buildLabelCommand}\n${command}` }];
      },
      (job) => {
        job.steps.push({ run: command });
      },
      (job) => {
        job.steps.unshift({ run: buildLabelCommand });
      },
      (job) => {
        job.steps = [{ run: buildLabelCommand }, { name: command, run: `# ${command}` }];
      },
      (job) => {
        job.steps = [{ run: buildLabelCommand }, { run: 123 }];
      },
    ];
    for (const mutate of mutations) {
      const fixture = createWorkflowFixture();
      mutate(fixtureJob(fixture, jobId));
      expect(() => assertBuildJobs(yaml.dump(fixture))).toThrow();
    }
    const fixture = createWorkflowFixture();
    fixture.jobs = Object.fromEntries(Object.entries(fixture.jobs).filter(([id]) => id !== jobId));
    expect(() => assertBuildJobs(yaml.dump(fixture))).toThrow();
  });

  it.each(buildJobCommands)('%sのcommandを別jobへ移しても通さないこと', (jobId, command) => {
    const fixture = createWorkflowFixture();
    fixtureJob(fixture, jobId).steps = [{ run: buildLabelCommand }];
    fixtureJob(fixture, 'deploy-production').steps.push({ run: command });
    expect(() => assertBuildJobs(yaml.dump(fixture))).toThrow();
  });

  it('別jobのifでE2E/deploy条件を補えないこと', () => {
    const fixture = createWorkflowFixture();
    fixtureJob(fixture, 'test-e2e-dev').if = '${{ false }}';
    expect(() => assertEventGates(yaml.dump(fixture))).toThrow();
    const deployFixture = createWorkflowFixture();
    fixtureJob(deployFixture, 'deploy-production').if =
      "${{ github.event_name == 'workflow_dispatch' }}";
    expect(() => assertEventGates(yaml.dump(deployFixture))).toThrow();
  });

  it.each([
    'jobs: [',
    'jobs: {}\njobs: {}',
    'jobs: []',
    'jobs: { test-e2e-production: { steps: {} } }',
  ])('不正なYAMLまたは構造を拒否すること: %s', (source) => {
    expect(() => assertBuildJobs(source)).toThrow();
  });
});
