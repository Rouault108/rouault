import { describe, expect, it } from 'vitest';

import {
  createPnpmInvocation,
  createWindowsPnpmCommandLine,
  PRODUCTION_BUILD_PNPM_ARGS,
  quoteWindowsCommandArgument,
  resolvePnpmJavaScriptCliPath,
  resolveWindowsCommandProcessor,
  RunBuildProcessConfigurationError,
  RUN_BUILD_STEPS,
} from '../../scripts/run-build-process.js';

const hasControlCharacter = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const characterCode = value.charCodeAt(index);

    if (characterCode <= 0x1f || characterCode === 0x7f) {
      return true;
    }
  }

  return false;
};

describe('run-build process helper', () => {
  describe('resolvePnpmJavaScriptCliPath', () => {
    it('pnpm JavaScript CLI の basename だけを採用し trim 済み path を返すこと', () => {
      expect(resolvePnpmJavaScriptCliPath(' /opt/corepack/pnpm/11.5.2/bin/pnpm.mjs ')).toBe(
        '/opt/corepack/pnpm/11.5.2/bin/pnpm.mjs',
      );
      expect(resolvePnpmJavaScriptCliPath('C:\\tools\\pnpm.cjs')).toBe('C:\\tools\\pnpm.cjs');
      expect(resolvePnpmJavaScriptCliPath('/opt/bin/PNPM.JS')).toBe('/opt/bin/PNPM.JS');
    });

    it('pnpm 以外の JavaScript CLI や shim は採用しないこと', () => {
      expect(resolvePnpmJavaScriptCliPath(undefined)).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('   ')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('C:\\tools\\pnpm.cmd')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('C:\\tools\\pnpm.bat')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('C:\\tools\\pnpm.ps1')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('/opt/bin/pnpm')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('/opt/bin/pnpm.txt')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('/opt/bin/npm-cli.js')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('/opt/bin/yarn.js')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('/opt/bin/corepack.cjs')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('/opt/bin/corepack.js')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('/tmp/pnpm-fixture/fake.mjs')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('/tmp/pnpm-fixture/fake.js')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('/tmp/fake-pnpm.mjs')).toBeUndefined();
      expect(resolvePnpmJavaScriptCliPath('/tmp/not-pnpm.js')).toBeUndefined();
    });

    it('raw value に C0 制御文字または DEL が含まれる場合は設定エラーにすること', () => {
      expect(() => resolvePnpmJavaScriptCliPath('/opt/bin/pnpm.mjs\0')).toThrow(
        RunBuildProcessConfigurationError,
      );
      expect(() => resolvePnpmJavaScriptCliPath('/opt/bin/pnpm.mjs\u007F')).toThrow(
        RunBuildProcessConfigurationError,
      );
    });
  });

  describe('resolveWindowsCommandProcessor', () => {
    it('ComSpec, COMSPEC, comspec の順に短絡評価すること', () => {
      expect(
        resolveWindowsCommandProcessor({
          ComSpec: ' C:\\Windows\\System32\\cmd.exe ',
          COMSPEC: 'invalid\0cmd.exe',
        }),
      ).toBe('C:\\Windows\\System32\\cmd.exe');

      expect(
        resolveWindowsCommandProcessor({
          ComSpec: ' ',
          COMSPEC: ' C:\\Windows\\System32\\cmd.exe ',
          comspec: 'invalid\0cmd.exe',
        }),
      ).toBe('C:\\Windows\\System32\\cmd.exe');

      expect(
        resolveWindowsCommandProcessor({
          ComSpec: ' ',
          COMSPEC: '',
          comspec: ' C:\\Windows\\System32\\cmd.exe ',
        }),
      ).toBe('C:\\Windows\\System32\\cmd.exe');
    });

    it('有効な ComSpec 系候補がない場合は cmd.exe を返すこと', () => {
      expect(resolveWindowsCommandProcessor({})).toBe('cmd.exe');
      expect(resolveWindowsCommandProcessor({ ComSpec: ' ', COMSPEC: '', comspec: '   ' })).toBe(
        'cmd.exe',
      );
    });

    it('採用候補が cmd.exe 互換でない場合や引用符付き path の場合は設定エラーにすること', () => {
      expect(() => resolveWindowsCommandProcessor({ ComSpec: 'powershell.exe' })).toThrow(
        RunBuildProcessConfigurationError,
      );
      expect(() =>
        resolveWindowsCommandProcessor({
          ComSpec: '"C:\\Windows\\System32\\cmd.exe"',
        }),
      ).toThrow(RunBuildProcessConfigurationError);
      expect(() => resolveWindowsCommandProcessor({ ComSpec: 'cmd.exe\0' })).toThrow(
        RunBuildProcessConfigurationError,
      );
    });

    it('評価対象になった COMSPEC / comspec の制御文字は設定エラーにすること', () => {
      expect(() =>
        resolveWindowsCommandProcessor({
          ComSpec: '',
          COMSPEC: 'cmd.exe\0',
        }),
      ).toThrow(RunBuildProcessConfigurationError);

      expect(() =>
        resolveWindowsCommandProcessor({
          ComSpec: '',
          COMSPEC: '',
          comspec: 'cmd.exe\u007F',
        }),
      ).toThrow(RunBuildProcessConfigurationError);
    });
  });

  describe('createPnpmInvocation', () => {
    it('npm_execpath が pnpm JavaScript CLI の場合は node-cli strategy にすること', () => {
      const env: NodeJS.ProcessEnv = {
        npm_execpath: ' /opt/corepack/pnpm/11.5.2/bin/pnpm.cjs ',
        npm_config_user_agent: 'pnpm test',
      };
      const originalEnv = { ...env };

      const invocation = createPnpmInvocation({
        env,
        platform: 'win32',
        nodeExecPath: ' /usr/local/bin/node ',
        pnpmArgs: ['run', 'build:client'],
      });

      expect(invocation).to.deep.equal({
        strategy: 'node-cli',
        command: '/usr/local/bin/node',
        args: ['/opt/corepack/pnpm/11.5.2/bin/pnpm.cjs', 'run', 'build:client'],
      });
      expect(invocation.windowsVerbatimArguments).toBeUndefined();
      expect(env).to.deep.equal(originalEnv);
    });

    it('Windows で npm_execpath が使えない場合は command processor fallback にすること', () => {
      const invocation = createPnpmInvocation({
        env: {
          ComSpec: 'C:\\Windows\\System32\\cmd.exe',
        },
        platform: 'win32',
        nodeExecPath: 'C:\\Program Files\\nodejs\\node.exe',
        pnpmArgs: ['exec', 'tsx', 'scripts/apply-lit-ssr.ts'],
      });

      expect(invocation.strategy).toBe('windows-command-processor');
      expect(invocation.command).toBe('C:\\Windows\\System32\\cmd.exe');
      expect(invocation.args).to.deep.equal([
        '/d',
        '/s',
        '/c',
        'pnpm exec tsx scripts/apply-lit-ssr.ts',
      ]);
      expect(invocation.windowsVerbatimArguments).toBe(true);
      expect(invocation.args.join(' ')).not.toContain('pnpm.cmd');
      expect(invocation.args.join(' ')).not.toContain('tsx.cmd');
    });

    it('Windows で npm_execpath が .cmd や pnpm 以外の JavaScript CLI でも fallback にすること', () => {
      for (const npmExecPath of [
        'C:\\tools\\pnpm.cmd',
        '/opt/bin/npm-cli.js',
        '/opt/bin/yarn.js',
        '/opt/bin/corepack.js',
      ]) {
        const invocation = createPnpmInvocation({
          env: {
            npm_execpath: npmExecPath,
            ComSpec: 'C:\\Windows\\System32\\cmd.exe',
          },
          platform: 'win32',
          nodeExecPath: 'C:\\Program Files\\nodejs\\node.exe',
          pnpmArgs: ['build'],
        });

        expect(invocation.strategy, npmExecPath).toBe('windows-command-processor');
        expect(invocation.command, npmExecPath).toBe('C:\\Windows\\System32\\cmd.exe');
        expect(invocation.windowsVerbatimArguments, npmExecPath).toBe(true);
      }
    });

    it('POSIX で npm_execpath が使えない場合は path-command fallback にすること', () => {
      const invocation = createPnpmInvocation({
        env: {},
        platform: 'linux',
        nodeExecPath: '/usr/local/bin/node',
        pnpmArgs: ['run', 'build:images'],
      });

      expect(invocation).to.deep.equal({
        strategy: 'path-command',
        command: 'pnpm',
        args: ['run', 'build:images'],
      });
      expect(invocation.windowsVerbatimArguments).toBeUndefined();
    });

    it('pnpmArgs と nodeExecPath の破損を設定エラーにすること', () => {
      expect(() =>
        createPnpmInvocation({
          env: {},
          platform: 'linux',
          nodeExecPath: '',
          pnpmArgs: ['build'],
        }),
      ).toThrow(RunBuildProcessConfigurationError);

      expect(() =>
        createPnpmInvocation({
          env: {},
          platform: 'linux',
          nodeExecPath: '/usr/local/bin/node\0',
          pnpmArgs: ['build'],
        }),
      ).toThrow(RunBuildProcessConfigurationError);

      expect(() =>
        createPnpmInvocation({
          env: {},
          platform: 'linux',
          nodeExecPath: '/usr/local/bin/node\u007F',
          pnpmArgs: ['build'],
        }),
      ).toThrow(RunBuildProcessConfigurationError);

      for (const pnpmArgs of [
        [],
        [''],
        ['   '],
        [' build'],
        ['build '],
        ['bu\0ild'],
        ['bu\u007Fild'],
      ]) {
        expect(() =>
          createPnpmInvocation({
            env: {},
            platform: 'linux',
            nodeExecPath: '/usr/local/bin/node',
            pnpmArgs,
          }),
        ).toThrow(RunBuildProcessConfigurationError);
      }
    });

    it('env object と pnpmArgs を破壊的に変更しないこと', () => {
      const env: NodeJS.ProcessEnv = {
        npm_execpath: '/opt/bin/npm-cli.js',
        ComSpec: 'C:\\Windows\\System32\\cmd.exe',
      };
      const pnpmArgs = ['run', 'build:client'] as const;
      const originalEnv = { ...env };
      const originalPnpmArgs = [...pnpmArgs];

      createPnpmInvocation({
        env,
        platform: 'win32',
        nodeExecPath: 'node.exe',
        pnpmArgs,
      });

      expect(env).to.deep.equal(originalEnv);
      expect(pnpmArgs).to.deep.equal(originalPnpmArgs);
    });
  });

  describe('quoteWindowsCommandArgument and createWindowsPnpmCommandLine', () => {
    it('固定内部引数向けに安全な token を quote せず、内部空白を持つ token だけ quote すること', () => {
      expect(quoteWindowsCommandArgument('build:client')).toBe('build:client');
      expect(quoteWindowsCommandArgument('--config=eleventy.config.ts')).toBe(
        '--config=eleventy.config.ts',
      );
      expect(quoteWindowsCommandArgument('foo bar')).toBe('"foo bar"');
    });

    it('cmd.exe fallback で扱わない引数を設定エラーにすること', () => {
      for (const value of [
        '',
        '   ',
        ' foo',
        'foo ',
        'foo"',
        'foo%',
        'foo!',
        'foo^',
        'foo&',
        'foo|',
        'foo<',
        'foo>',
        'foo(',
        'foo)',
        'foo\0',
        'foo\u007F',
        'foo bar\\',
      ]) {
        expect(() => quoteWindowsCommandArgument(value)).toThrow(RunBuildProcessConfigurationError);
      }
    });

    it('固定 command pnpm で command line を生成し、全体を quote 始まりにしないこと', () => {
      const commandLine = createWindowsPnpmCommandLine(['exec', 'tsx', 'foo bar']);

      expect(commandLine).toBe('pnpm exec tsx "foo bar"');
      expect(commandLine.startsWith('"')).toBe(false);
      expect(commandLine).not.toContain('pnpm.cmd');
      expect(commandLine).not.toContain('tsx.cmd');
    });

    it('createWindowsPnpmCommandLine は空 pnpmArgs を許容しないこと', () => {
      expect(() => createWindowsPnpmCommandLine([])).toThrow(RunBuildProcessConfigurationError);
    });
  });

  describe('RUN_BUILD_STEPS and PRODUCTION_BUILD_PNPM_ARGS', () => {
    it('RUN_BUILD_STEPS は label と pnpmArgs だけを持つ frozen runtime object であること', () => {
      expect(Object.isFrozen(RUN_BUILD_STEPS)).toBe(true);
      expect(RUN_BUILD_STEPS.length).toBeGreaterThan(0);

      for (const step of RUN_BUILD_STEPS) {
        expect(Object.getOwnPropertyNames(step).sort()).to.deep.equal(['label', 'pnpmArgs']);
        expect(Object.getOwnPropertySymbols(step)).to.deep.equal([]);
        expect(Object.isFrozen(step)).toBe(true);
        expect(Object.isFrozen(step.pnpmArgs)).toBe(true);

        expect(step.label.trim().length).toBeGreaterThan(0);
        expect(step.label).toBe(step.label.trim());
        expect(hasControlCharacter(step.label)).toBe(false);

        expect(step.pnpmArgs.length).toBeGreaterThan(0);
        for (const argument of step.pnpmArgs) {
          expect(argument.trim().length).toBeGreaterThan(0);
          expect(argument).toBe(argument.trim());
          expect(hasControlCharacter(argument)).toBe(false);
        }
      }
    });

    it('tsx 実行 step はすべて pnpm exec tsx 経由であること', () => {
      const tsxSteps = RUN_BUILD_STEPS.filter((step) =>
        step.pnpmArgs.some((argument) => argument === 'tsx'),
      );

      expect(tsxSteps.map((step) => step.label)).to.deep.equal([
        'eleventy',
        'apply-lit-ssr',
        'emit-navigation-artifacts',
        'emit-search-artifacts',
        'build-pagefind',
      ]);

      for (const step of tsxSteps) {
        expect(step.pnpmArgs[0]).toBe('exec');
        expect(step.pnpmArgs[1]).toBe('tsx');
      }
    });

    it('pnpm run 系 step と production build args が期待どおりであること', () => {
      expect(RUN_BUILD_STEPS.find((step) => step.label === 'build:client')?.pnpmArgs).to.deep.equal(
        ['run', 'build:client'],
      );
      expect(RUN_BUILD_STEPS.find((step) => step.label === 'build:images')?.pnpmArgs).to.deep.equal(
        ['run', 'build:images'],
      );
      expect(PRODUCTION_BUILD_PNPM_ARGS).to.deep.equal(['build']);
      expect(Object.isFrozen(PRODUCTION_BUILD_PNPM_ARGS)).toBe(true);
    });

    it('Windows fallback command line を全 step で生成できること', () => {
      for (const step of RUN_BUILD_STEPS) {
        const commandLine = createWindowsPnpmCommandLine(step.pnpmArgs);

        expect(commandLine.startsWith('pnpm ')).toBe(true);
        expect(commandLine.startsWith('"')).toBe(false);
        expect(commandLine).not.toContain('pnpm.cmd');
        expect(commandLine).not.toContain('tsx.cmd');
      }

      expect(createWindowsPnpmCommandLine(PRODUCTION_BUILD_PNPM_ARGS)).toBe('pnpm build');
    });
  });
});
