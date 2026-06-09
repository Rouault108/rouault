export class RunBuildProcessConfigurationError extends Error {
  override readonly name = 'RunBuildProcessConfigurationError';
}

export interface RunBuildStep {
  readonly label: string;
  readonly pnpmArgs: readonly string[];
}

export type RunBuildInvocationStrategy = 'node-cli' | 'windows-command-processor' | 'path-command';

export interface RunBuildInvocation {
  readonly strategy: RunBuildInvocationStrategy;
  readonly command: string;
  readonly args: readonly string[];
  readonly windowsVerbatimArguments?: true;
}

export interface CreatePnpmInvocationInput {
  readonly env: NodeJS.ProcessEnv;
  readonly platform: NodeJS.Platform;
  readonly nodeExecPath: string;
  readonly pnpmArgs: readonly string[];
}

const hasControlCharacter = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const characterCode = value.charCodeAt(index);

    if (characterCode <= 0x1F || characterCode === 0x7F) {
      return true;
    }
  }

  return false;
};
const WINDOWS_COMMAND_FORBIDDEN_ARGUMENT_PATTERN = /["%!^&|<>()]/u;
const WINDOWS_COMMAND_SAFE_ARGUMENT_PATTERN = /^[A-Za-z0-9_./:=@+-]+$/u;

const formatDiagnosticValue = (value: unknown): string => {
  try {
    return JSON.stringify([value]).slice(1, -1);
  } catch {
    try {
      return String(value);
    } catch {
      return '<unformattable>';
    }
  }
};

const getPathBasename = (value: string): string => {
  const parts = value.split(/[\\/]/u);
  return parts.at(-1) ?? value;
};

const isPnpmJavaScriptCliPath = (value: string): boolean =>
  /^pnpm\.(?:mjs|cjs|js)$/iu.test(getPathBasename(value));

const isWindowsCmdExeCommandProcessor = (value: string): boolean =>
  /^cmd\.exe$/iu.test(getPathBasename(value));

const validatePnpmArgs = (pnpmArgs: readonly string[], context: string): void => {
  if (pnpmArgs.length === 0) {
    throw new RunBuildProcessConfigurationError(`${context} pnpmArgs must not be empty`);
  }

  for (const argument of pnpmArgs) {
    if (argument.trim().length === 0) {
      throw new RunBuildProcessConfigurationError(
        `${context} pnpmArgs must not contain empty arguments`,
      );
    }

    if (argument !== argument.trim()) {
      throw new RunBuildProcessConfigurationError(
        `${context} pnpmArgs must not contain leading or trailing whitespace`,
      );
    }

    if (hasControlCharacter(argument)) {
      throw new RunBuildProcessConfigurationError(
        `${context} pnpmArgs must not contain control characters: ${formatDiagnosticValue(argument)}`,
      );
    }
  }
};

const validateRunBuildStepShape = (step: RunBuildStep): void => {
  const stringKeys = Object.getOwnPropertyNames(step).sort();
  const symbolKeys = Object.getOwnPropertySymbols(step);

  if (
    stringKeys.length !== 2 ||
    stringKeys[0] !== 'label' ||
    stringKeys[1] !== 'pnpmArgs' ||
    symbolKeys.length !== 0
  ) {
    throw new RunBuildProcessConfigurationError(
      `run-build step must only contain label and pnpmArgs: ${formatDiagnosticValue({
        stringKeys,
        symbolKeyCount: symbolKeys.length,
      })}`,
    );
  }
};

const validateRunBuildStep = (step: RunBuildStep): void => {
  validateRunBuildStepShape(step);

  if (step.label.trim().length === 0) {
    throw new RunBuildProcessConfigurationError('run-build step label must not be empty');
  }

  if (step.label !== step.label.trim()) {
    throw new RunBuildProcessConfigurationError(
      `run-build step label must not contain leading or trailing whitespace: ${formatDiagnosticValue(
        step.label,
      )}`,
    );
  }

  if (hasControlCharacter(step.label)) {
    throw new RunBuildProcessConfigurationError(
      `run-build step label must not contain control characters: ${formatDiagnosticValue(
        step.label,
      )}`,
    );
  }

  validatePnpmArgs(step.pnpmArgs, `run-build step ${formatDiagnosticValue(step.label)}`);
};

const defineRunBuildSteps = <const T extends readonly RunBuildStep[]>(steps: T): T => {
  for (const step of steps) {
    validateRunBuildStep(step);
    Object.freeze(step.pnpmArgs);
    Object.freeze(step);
  }

  return Object.freeze(steps) as T;
};

const defineProductionBuildPnpmArgs = <const T extends readonly string[]>(pnpmArgs: T): T => {
  validatePnpmArgs(pnpmArgs, 'production build');

  return Object.freeze(pnpmArgs) as T;
};

export const RUN_BUILD_STEPS = defineRunBuildSteps([
  {
    label: 'build:client',
    pnpmArgs: ['run', 'build:client'],
  },
  {
    label: 'build:images',
    pnpmArgs: ['run', 'build:images'],
  },
  {
    label: 'eleventy',
    pnpmArgs: [
      'exec',
      'tsx',
      './node_modules/@11ty/eleventy/cmd.cjs',
      '--config=eleventy.config.ts',
    ],
  },
  {
    label: 'apply-lit-ssr',
    pnpmArgs: ['exec', 'tsx', 'scripts/apply-lit-ssr.ts'],
  },
  {
    label: 'emit-navigation-artifacts',
    pnpmArgs: ['exec', 'tsx', 'scripts/emit-navigation-artifacts.ts'],
  },
  {
    label: 'emit-search-artifacts',
    pnpmArgs: ['exec', 'tsx', 'scripts/emit-search-artifacts.ts'],
  },
  {
    label: 'build-pagefind',
    pnpmArgs: ['exec', 'tsx', 'scripts/build-pagefind.ts'],
  },
] as const satisfies readonly RunBuildStep[]);

export const PRODUCTION_BUILD_PNPM_ARGS = defineProductionBuildPnpmArgs([
  'build',
] as const satisfies readonly string[]);

export const resolvePnpmJavaScriptCliPath = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (hasControlCharacter(value)) {
    throw new RunBuildProcessConfigurationError(
      `npm_execpath must not contain control characters: ${formatDiagnosticValue(value)}`,
    );
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (!/\.(?:mjs|cjs|js)$/iu.test(trimmed)) {
    return undefined;
  }

  return isPnpmJavaScriptCliPath(trimmed) ? trimmed : undefined;
};

const resolveWindowsCommandProcessorCandidate = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (hasControlCharacter(value)) {
    throw new RunBuildProcessConfigurationError(
      `Windows command processor path contains an unsupported control character: ${formatDiagnosticValue(
        value,
      )}`,
    );
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (!isWindowsCmdExeCommandProcessor(trimmed)) {
    throw new RunBuildProcessConfigurationError(
      `Windows command processor must be cmd.exe-compatible: ${formatDiagnosticValue(value)}`,
    );
  }

  return trimmed;
};

export const resolveWindowsCommandProcessor = (env: NodeJS.ProcessEnv): string =>
  resolveWindowsCommandProcessorCandidate(env['ComSpec']) ??
  resolveWindowsCommandProcessorCandidate(env['COMSPEC']) ??
  resolveWindowsCommandProcessorCandidate(env['comspec']) ??
  'cmd.exe';

/**
 * Run-build 系の固定内部引数専用の限定 helper。
 * 任意入力、ユーザー入力、一般的な cmd.exe escaping には使わないこと。
 */
export const quoteWindowsCommandArgument = (value: string): string => {
  if (value.trim().length === 0) {
    throw new RunBuildProcessConfigurationError(
      `Windows fallback argument must not be empty: ${formatDiagnosticValue(value)}`,
    );
  }

  if (value !== value.trim()) {
    throw new RunBuildProcessConfigurationError(
      `Windows fallback argument must not contain leading or trailing whitespace: ${formatDiagnosticValue(
        value,
      )}`,
    );
  }

  if (hasControlCharacter(value)) {
    throw new RunBuildProcessConfigurationError(
      `Windows fallback argument contains an unsupported control character: ${formatDiagnosticValue(
        value,
      )}`,
    );
  }

  if (WINDOWS_COMMAND_FORBIDDEN_ARGUMENT_PATTERN.test(value)) {
    throw new RunBuildProcessConfigurationError(
      `Windows fallback argument contains an unsupported cmd.exe metacharacter: ${formatDiagnosticValue(
        value,
      )}`,
    );
  }

  if (WINDOWS_COMMAND_SAFE_ARGUMENT_PATTERN.test(value)) {
    return value;
  }

  if (value.endsWith('\\')) {
    throw new RunBuildProcessConfigurationError(
      `Windows fallback argument that requires quoting must not end with a backslash: ${formatDiagnosticValue(
        value,
      )}`,
    );
  }

  return `"${value}"`;
};

/**
 * Run-build 系の固定内部 pnpm 引数専用の限定 helper。
 * 任意 command や一般的な cmd.exe command line 生成には使わないこと。
 */
export const createWindowsPnpmCommandLine = (pnpmArgs: readonly string[]): string => {
  validatePnpmArgs(pnpmArgs, 'Windows fallback pnpm command line');

  return ['pnpm', ...pnpmArgs].map(quoteWindowsCommandArgument).join(' ');
};

export const createPnpmInvocation = ({
  env,
  platform,
  nodeExecPath,
  pnpmArgs,
}: CreatePnpmInvocationInput): RunBuildInvocation => {
  if (hasControlCharacter(nodeExecPath)) {
    throw new RunBuildProcessConfigurationError(
      `nodeExecPath must not contain control characters: ${formatDiagnosticValue(nodeExecPath)}`,
    );
  }

  const normalizedNodeExecPath = nodeExecPath.trim();

  if (normalizedNodeExecPath.length === 0) {
    throw new RunBuildProcessConfigurationError('nodeExecPath must not be empty');
  }

  validatePnpmArgs(pnpmArgs, 'pnpm invocation');

  const npmExecPath = resolvePnpmJavaScriptCliPath(env['npm_execpath']);

  if (npmExecPath !== undefined) {
    return {
      strategy: 'node-cli',
      command: normalizedNodeExecPath,
      args: [npmExecPath, ...pnpmArgs],
    };
  }

  if (platform === 'win32') {
    return {
      strategy: 'windows-command-processor',
      command: resolveWindowsCommandProcessor(env),
      args: ['/d', '/s', '/c', createWindowsPnpmCommandLine(pnpmArgs)],
      windowsVerbatimArguments: true,
    };
  }

  return {
    strategy: 'path-command',
    command: 'pnpm',
    args: [...pnpmArgs],
  };
};
