import { mkdir, writeFile } from 'node:fs/promises';
import { CSP_TEST_CASES } from './csp-test-cases.js';
import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
  TestError,
} from '@playwright/test/reporter';

// 標準JSON/list reporterはエラーの生値・source snippet・consoleを保存するため共用しない。
export default class CspPrivateReporter implements Reporter {
  private tests: { caseId: string; ok: boolean; tests: unknown[] }[] = [];
  private errors = 0;
  private outputFile: string;
  constructor(options: { outputFile?: string } = {}) {
    this.outputFile =
      options.outputFile === '.generated/csp/privacy-results.json'
        ? options.outputFile
        : '.generated/csp/browser-results.json';
  }
  onError(error: TestError): void {
    this.errors++;
    const reason = /webServer|web server/u.test(error.message ?? '')
      ? 'web-server'
      : /fixture/iu.test(error.message ?? '')
        ? 'fixture-config'
        : /timeout/iu.test(error.message ?? '')
          ? 'timeout'
          : 'runner-error';
    process.stdout.write(`[csp-tests] ${reason}\n`);
  }
  onTestEnd(test: TestCase, result: TestResult): void {
    const name = test.parent.project()?.name;
    const project =
      name && ['chromium-csp', 'firefox-csp', 'webkit-csp'].includes(name) ? name : 'unknown';
    if (result.status !== 'passed')
      process.stdout.write(
        `[csp-tests] ${project} ${CSP_TEST_CASES[test.title] ?? 'unknown'}: ${result.status}\n`,
      );
    this.tests.push({
      caseId: CSP_TEST_CASES[test.title] ?? 'unknown',
      ok: result.status === 'passed' && test.expectedStatus === 'passed',
      tests: [
        {
          projectName: project,
          expectedStatus: test.expectedStatus,
          status:
            result.status === 'passed' && test.expectedStatus === 'passed'
              ? 'expected'
              : 'unexpected',
          results: [
            {
              status: result.status,
              retry: result.retry,
              errors: result.errors.map(() => ({ message: 'csp-test-failed' })),
            },
          ],
        },
      ],
    });
  }
  onStdOut(): void {
    /* 生stdoutは保存しない。 */
  }
  onStdErr(): void {
    /* 生stderrは保存しない。 */
  }
  async onEnd(result: FullResult): Promise<void> {
    const passed = this.tests.filter((test) => test.ok).length;
    const skipped = this.tests.filter(
      (test) =>
        (test.tests[0] as { results: { status: string }[] }).results[0]?.status === 'skipped',
    ).length;
    const report = {
      schema: 1,
      kind: 'private-csp-test-results',
      sha: /^(?:[a-f0-9]{40}|local)$/u.test(process.env['GITHUB_SHA'] ?? 'local')
        ? (process.env['GITHUB_SHA'] ?? 'local')
        : 'unrecorded',
      run: /^(?:[0-9]{1,20}|local)$/u.test(process.env['GITHUB_RUN_ID'] ?? 'local')
        ? (process.env['GITHUB_RUN_ID'] ?? 'local')
        : 'unrecorded',
      suites: [{ specs: this.tests }],
      errors: Array.from({ length: this.errors }, () => ({ message: 'csp-runner-failed' })),
      stats: {
        expected: passed,
        skipped,
        unexpected: this.tests.length - passed - skipped,
        flaky: 0,
      },
    };
    await mkdir('.generated/csp', { recursive: true });
    await writeFile(this.outputFile, JSON.stringify(report));
    process.stdout.write(
      `[csp-tests] ${result.status}: ${String(passed)} passed, ${String(this.tests.length - passed)} not passed\n`,
    );
  }
}
