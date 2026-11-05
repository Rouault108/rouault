import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const temporaryDirectories: string[] = [];
const privateFormula = '\\frac{PRIVATE_FORMULA_SENTINEL';
const noteSource = (body: string) => `---\ntitle: CLI Math\n---\n\n${body}\n`;

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const fixture = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rouault-diagnostic-cli-'));
  temporaryDirectories.push(directory);
  await mkdir(path.join(directory, 'content/notes'), { recursive: true });
  await mkdir(path.join(directory, 'content/memos'), { recursive: true });
  // CLIとinclude parserの実依存を使い、package managerの自動installは起動しない。
  await symlink(
    path.join(projectRoot, 'node_modules'),
    path.join(directory, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await writeFile(
    path.join(directory, 'content/memos/valid.md'),
    '---\ntitle: Valid memo\nlicense: CC BY 4.0\n---\n\nValid $x^2$.\n',
  );
  return directory;
};

const runCli = (directory: string, script: string) =>
  new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    execFile(
      process.execPath,
      [
        '--import',
        pathToFileURL(path.join(projectRoot, 'node_modules/tsx/dist/loader.mjs')).href,
        path.join(projectRoot, 'scripts', script),
      ],
      {
        cwd: directory,
        encoding: 'utf8',
        timeout: 20_000,
        env: {
          ...process.env,
          ROUAULT_SITE_ORIGIN: 'https://rouault.invalid',
          ROUAULT_BASE_PATH: '',
        },
      },
      (error, stdout, stderr) => {
        resolve({
          code: typeof error?.code === 'number' ? error.code : error ? 1 : 0,
          stdout,
          stderr,
        });
      },
    );
  });

const warningsOf = (stderr: string) =>
  stderr.split('\n').filter((line) => line.startsWith('[content] warning '));

describe.each(['generate-content.ts', 'validate-note-source-links.ts'])(
  '%sの診断伝達',
  (script) => {
    it('不正TeXをstderrへ一度表示し、生成と既存JSON形式を維持する', async () => {
      const directory = await fixture();
      await writeFile(
        path.join(directory, 'content/notes/math.md'),
        noteSource(`Before $${privateFormula}$.`),
      );
      const result = await runCli(directory, script);
      expect(result.code).toBe(0);
      expect(result.stdout).toBe('');
      const warnings = warningsOf(result.stderr);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('content/notes/math.md:5:8');
      expect(warnings[0]).toContain('[rouault-static-math:parseerror]');
      expect(warnings[0]).not.toContain(directory);
      expect(warnings[0]).not.toContain('PRIVATE_FORMULA_SENTINEL');
      expect(warnings[0]).not.toContain('\\frac{');
      expect(warnings[0]).not.toMatch(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u);
      const notes = JSON.parse(
        await readFile(path.join(directory, '.velite/notes.json'), 'utf8'),
      ) as Record<string, unknown>[];
      const memos = JSON.parse(
        await readFile(path.join(directory, '.velite/memos.json'), 'utf8'),
      ) as Record<string, unknown>[];
      expect(notes).toHaveLength(1);
      expect(notes[0]?.['content']).toContain('katex-error');
      expect(memos).toHaveLength(1);
      for (const document of [...notes, ...memos]) {
        expect(document).not.toHaveProperty('diagnostics');
        expect(document).not.toHaveProperty('links');
      }
    }, 30_000);

    it('正常な数式では標準出力と標準エラーを増やさない', async () => {
      const directory = await fixture();
      await writeFile(path.join(directory, 'content/notes/math.md'), noteSource('Valid $x^2$.'));
      const result = await runCli(directory, script);
      expect(result).toEqual({ code: 0, stdout: '', stderr: '' });
    }, 30_000);

    it('strict警告と出力macroは原式をstdout・stderrへ流さず、描画とTeX注釈を保つ', async () => {
      const directory = await fixture();
      const payload = 'CLI_LOG_SENTINEL秘密\u0085\u202e';
      const formulas = [
        '\\text{😀}',
        '漢',
        `\\message{${payload}}x`,
        `\\errmessage{${payload}}y`,
        '\\show\\CLISHOWSENTINEL z',
        `\\let\\emit\\message\\emit{${payload}}x`,
        `\\let\\emit\\errmessage\\emit{${payload}}y`,
        '\\let\\emit\\show\\emit\\CLISHOWSENTINEL z',
        `\\gdef\\message#1{z}\\message{${payload}}`,
        `\\message{${payload}}x`,
        `\\def\\emit#1{\\message{#1}}\\emit{${payload}}y`,
        `\\expandafter\\message\\expandafter{${payload}}x`,
        '\\show',
      ];
      await writeFile(
        path.join(directory, 'content/notes/math.md'),
        noteSource(formulas.map((formula) => `\`\`\`math\n${formula}\n\`\`\``).join('\n\n')),
      );
      const result = await runCli(directory, script);
      expect(result.code).toBe(0);
      expect(result.stdout).toBe('');
      for (const output of [result.stdout, result.stderr]) {
        expect(output).not.toContain(directory);
        expect(output).not.toMatch(/CLI_LOG_SENTINEL|CLISHOWSENTINEL|秘密|😀|漢/u);
        expect(output.replaceAll('\n', '')).not.toMatch(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u);
      }
      const strictWarnings = result.stderr.trimEnd().split('\n');
      expect(strictWarnings.length).toBeGreaterThan(0);
      for (const warning of strictWarnings) {
        expect(warning).toMatch(
          /^\[rouault-static-math:strict:(?:unknownSymbol|symbolNotInFont|unicodeTextInMathMode)\] LaTeX-incompatible input\.$/u,
        );
      }
      expect(result.stderr).toContain('strict:symbolNotInFont');
      expect(result.stderr).toContain('strict:unicodeTextInMathMode');
      expect(warningsOf(result.stderr)).toEqual([]);
      const notes = JSON.parse(
        await readFile(path.join(directory, '.velite/notes.json'), 'utf8'),
      ) as Record<string, unknown>[];
      const html = notes[0]?.['content'];
      expect(typeof html).toBe('string');
      if (typeof html !== 'string') throw new Error('Missing generated math HTML');
      expect(html.match(/class="katex"/gu)).toHaveLength(formulas.length);
      expect(html.match(/<math\s/gu)).toHaveLength(formulas.length);
      expect(html.match(/class="katex-html"/gu)).toHaveLength(formulas.length);
      expect(html.match(/encoding="application\/x-tex"/gu)).toHaveLength(formulas.length);
      for (const formula of formulas) expect(html).toContain(formula);
      expect(html).not.toContain('katex-error');
      expect(notes[0]).not.toHaveProperty('diagnostics');
    }, 30_000);

    it('macro後のParseError再描画と引数不足でもログを漏らさず、既存の診断分類を保つ', async () => {
      const directory = await fixture();
      const payload = 'CLI_FALLBACK_SENTINEL秘密\u0085\u202e';
      const formulas = [
        `\\message{${payload}}\\frac{`,
        `\\errmessage{${payload}}\\frac{`,
        '\\show\\CLIFALLBACKSENTINEL\\frac{',
        '\\message',
        '\\errmessage{',
      ];
      await writeFile(
        path.join(directory, 'content/notes/math.md'),
        noteSource(formulas.map((formula) => `\`\`\`math\n${formula}\n\`\`\``).join('\n\n')),
      );
      const result = await runCli(directory, script);
      expect(result.code).toBe(0);
      expect(result.stdout).toBe('');
      for (const output of [result.stdout, result.stderr]) {
        expect(output).not.toContain(directory);
        expect(output).not.toMatch(/CLI_FALLBACK_SENTINEL|CLIFALLBACKSENTINEL|秘密|\\frac\{/u);
        expect(output.replaceAll('\n', '')).not.toMatch(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u);
      }
      const warnings = warningsOf(result.stderr);
      expect(warnings).toHaveLength(formulas.length);
      expect(result.stderr.trimEnd().split('\n')).toEqual(warnings);
      for (const warning of warnings) {
        expect(warning).toContain('[rouault-static-math:parseerror]');
        expect(warning).toContain('数式の途中で入力が終了しています。');
      }
      const notes = JSON.parse(
        await readFile(path.join(directory, '.velite/notes.json'), 'utf8'),
      ) as Record<string, unknown>[];
      const html = notes[0]?.['content'];
      expect(typeof html).toBe('string');
      if (typeof html !== 'string') throw new Error('Missing generated math HTML');
      expect(html.match(/class="katex-error"/gu)).toHaveLength(formulas.length);
      for (const formula of formulas) expect(html).toContain(formula);
      expect(notes[0]).not.toHaveProperty('diagnostics');
    }, 30_000);

    it('BOMとCRLFを持つ原稿もfrontmatter込みの開始位置を表示する', async () => {
      const directory = await fixture();
      const source = `\uFEFF${noteSource(`Before $${privateFormula}$.`).replaceAll('\n', '\r\n')}`;
      await writeFile(path.join(directory, 'content/notes/math.md'), source);
      const result = await runCli(directory, script);
      expect(result.code).toBe(0);
      expect(result.stdout).toBe('');
      const warnings = warningsOf(result.stderr);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('content/notes/math.md:5:8');
      expect(warnings[0]).not.toContain(directory);
      expect(warnings[0]).not.toContain('PRIVATE_FORMULA_SENTINEL');
    }, 30_000);

    it('後続文書の失敗でも既出警告を残し、既存JSONを置換しない', async () => {
      const directory = await fixture();
      await writeFile(
        path.join(directory, 'content/notes/a-warning.md'),
        noteSource(`Before $${privateFormula}$.`),
      );
      await writeFile(
        path.join(directory, 'content/notes/z-failure.md'),
        noteSource('<div>invalid raw HTML</div>'),
      );
      await mkdir(path.join(directory, '.velite'));
      const previousNotes = '[{"title":"previous notes"}]';
      const previousMemos = '[{"title":"previous memos"}]';
      await writeFile(path.join(directory, '.velite/notes.json'), previousNotes);
      await writeFile(path.join(directory, '.velite/memos.json'), previousMemos);
      const result = await runCli(directory, script);
      expect(result.code).not.toBe(0);
      expect(result.stdout).toBe('');
      const warnings = warningsOf(result.stderr);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('content/notes/a-warning.md:5:8');
      expect(warnings[0]).not.toContain(directory);
      expect(warnings[0]).not.toContain('PRIVATE_FORMULA_SENTINEL');
      expect(result.stderr).toContain('生HTML');
      expect(await readFile(path.join(directory, '.velite/notes.json'), 'utf8')).toBe(
        previousNotes,
      );
      expect(await readFile(path.join(directory, '.velite/memos.json'), 'utf8')).toBe(
        previousMemos,
      );
    }, 30_000);

    it('同一文書の数式後の変換失敗でも警告を一度だけ表示する', async () => {
      const directory = await fixture();
      await writeFile(
        path.join(directory, 'content/notes/math.md'),
        noteSource(`Before $${privateFormula}$.\n\n[wrong](/notes/not-generated).`),
      );
      const result = await runCli(directory, script);
      expect(result.code).not.toBe(0);
      expect(result.stdout).toBe('');
      const warnings = warningsOf(result.stderr);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('content/notes/math.md:5:8');
      expect(warnings[0]).not.toContain(directory);
      expect(warnings[0]).not.toContain('PRIVATE_FORMULA_SENTINEL');
      expect(result.stderr).toContain('/notes/');
    }, 30_000);
  },
);

it('memos原稿自身の不正TeXも生成CLIから警告し、既存memo schemaを維持する', async () => {
  const directory = await fixture();
  await writeFile(path.join(directory, 'content/notes/valid.md'), noteSource('Valid $x^2$.'));
  await writeFile(
    path.join(directory, 'content/memos/valid.md'),
    `---\ntitle: Invalid memo\nlicense: CC BY 4.0\n---\n\nBefore $${privateFormula}$.\n`,
  );
  const result = await runCli(directory, 'generate-content.ts');
  expect(result.code).toBe(0);
  expect(result.stdout).toBe('');
  const warnings = warningsOf(result.stderr);
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toContain('content/memos/valid.md:6:8');
  expect(warnings[0]).not.toContain(directory);
  expect(warnings[0]).not.toContain('PRIVATE_FORMULA_SENTINEL');
  const memos = JSON.parse(
    await readFile(path.join(directory, '.velite/memos.json'), 'utf8'),
  ) as Record<string, unknown>[];
  expect(memos).toHaveLength(1);
  expect(memos[0]).toMatchObject({
    title: 'Invalid memo',
    sourcePath: 'content/memos/valid.md',
    license: 'CC BY 4.0',
  });
  expect(memos[0]?.['content']).toContain('katex-error');
  expect(memos[0]).not.toHaveProperty('diagnostics');
}, 30_000);
