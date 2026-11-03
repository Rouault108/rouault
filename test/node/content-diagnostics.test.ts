import path from 'node:path';
import katex from 'katex';
import { VFile } from 'vfile';
import { unified, type Processor } from 'unified';
import { describe, expect, it, vi } from 'vitest';
import {
  collectContentDiagnostics,
  formatContentDiagnostic,
  type ContentDiagnostic,
} from '../../build/content/content-diagnostics.js';
import { compileContentInput } from '../../build/content/content-compiler.js';
import { compileContentInputs } from '../../build/content/generate-content.js';
import { createContentBuildContext } from '../../build/content/content-build-context.js';
import type { ContentInput } from '../../build/content/content-input.js';

const input = (name: string, body: string): ContentInput => ({
  identity: { collectionId: 'notes', sourceRelativePath: name },
  sourceRoot: 'content/notes',
  sourceFilePath: path.resolve('content/notes', name),
  sourceLabel: `content/notes/${name}`,
  body,
  bodyStartLine: 8,
  metadata: { title: name },
});
const diagnostic: ContentDiagnostic = {
  severity: 'warning',
  source: 'rouault-static-math',
  ruleId: 'parseerror',
  sourceLabel: 'content/notes/example.md',
  reason: 'syntax',
  origin: 'document',
  position: { line: 8, column: 3 },
};

describe('content diagnostic delivery', () => {
  it('parseとrunが同じVFileを使い、警告を記事とは別の診断として返す', async () => {
    const prototype = Object.getPrototypeOf(unified()) as Processor;
    const parse = vi.spyOn(prototype, 'parse');
    const run = vi.spyOn(prototype, 'run');
    const source = input('single-vfile.md', 'Broken $\\frac{$.');
    try {
      const result = await compileContentInput(
        source,
        createContentBuildContext([source], {
          siteOrigin: 'https://rouault.invalid',
          basePath: '',
        })(source),
      );
      const parsedFile = parse.mock.calls.find(
        ([file]) => file instanceof VFile && file.path === source.sourceFilePath,
      )?.[0];
      const runFile = run.mock.calls.find(
        ([, file]) => file instanceof VFile && file.path === source.sourceFilePath,
      )?.[1];
      expect(parsedFile).toBeInstanceOf(VFile);
      expect(runFile).toBe(parsedFile);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]).toMatchObject({
        sourceLabel: source.sourceLabel,
        ruleId: 'parseerror',
        position: { line: 8, column: 8 },
      });
      expect(result.note).not.toHaveProperty('diagnostics');
      expect(result.note?.content).toContain('katex-error');
    } finally {
      parse.mockRestore();
      run.mockRestore();
    }
  });

  it('後続の文書・リンク検査失敗でも、完了した文書の警告は通知済みになる', async () => {
    for (const body of ['<div>unsafe</div>', '[wrong](/notes/not-generated).']) {
      const reports: ContentDiagnostic[] = [];
      await expect(
        compileContentInputs([input('first.md', '$\\frac{$'), input('second.md', body)], {
          reportDiagnostic: (value) => reports.push(value),
        }),
      ).rejects.toThrow();
      expect(reports).toHaveLength(1);
      expect(reports[0]?.sourceLabel).toBe('content/notes/first.md');
    }
  });

  it('同一文書の数式後のtransform失敗でも警告を一度だけ通知する', async () => {
    const reports: ContentDiagnostic[] = [];
    await expect(
      compileContentInputs(
        [input('same-document.md', '$\\frac{$\n\n[wrong](/notes/not-generated).')],
        {
          reportDiagnostic: (value) => reports.push(value),
        },
      ),
    ).rejects.toThrow();
    expect(reports).toHaveLength(1);
  });

  it('失敗時の診断通知が失敗しても元のrenderer例外を保持する', async () => {
    const original = new Error('renderer failure');
    const actual = katex.renderToString;
    const render = vi.spyOn(katex, 'renderToString').mockImplementation((source, options) => {
      if (source === 'x') throw original;
      return actual(source, options);
    });
    const reports: ContentDiagnostic[] = [];
    try {
      await expect(
        compileContentInputs([input('renderer-failure.md', '$\\frac{$\n\n$x$')], {
          reportDiagnostic: (value) => {
            reports.push(value);
            throw new Error('reporter failure');
          },
        }),
      ).rejects.toBe(original);
      expect(reports).toHaveLength(1);
    } finally {
      render.mockRestore();
    }
  });

  it('位置不明の別警告を残し、同じmessageの二重登録だけを除く', () => {
    const file = new VFile({ path: '/private/vault/secret.md' });
    const options = {
      source: 'rouault-static-math',
      ruleId: 'parseerror',
      cause: new katex.ParseError('Undefined control sequence: \\PRIVATE_TOKEN'),
    };
    const first = file.message('SECRET_FULL_EXPRESSION', options);
    file.messages.push(first);
    file.message('SECRET_FULL_EXPRESSION', options);
    const result = collectContentDiagnostics(file, {
      sourceLabel: 'content/notes/public.md',
      bodyStartLine: 8,
    });
    expect(result).toHaveLength(2);
    expect(
      result.every((value) => value.position === undefined && value.origin === 'unknown'),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(
      /PRIVATE_TOKEN|SECRET_FULL_EXPRESSION|private\/vault/u,
    );
    expect(formatContentDiagnostic(result[0] ?? diagnostic)).toContain('未定義');
    expect(
      collectContentDiagnostics(file, { sourceLabel: 'content/notes/public.md', bodyStartLine: 8 }),
    ).toHaveLength(2);
  });

  it('原式に含まれる語で原因分類を変えず、既知のerror prefixだけを使う', () => {
    const file = new VFile();
    try {
      katex.renderToString('\\rule{environment}{2em}', { throwOnError: true });
    } catch (cause) {
      if (!(cause instanceof Error)) throw cause;
      file.message('Could not render math with KaTeX', {
        cause,
        source: 'rouault-static-math',
        ruleId: 'parseerror',
      });
    }
    const result = collectContentDiagnostics(file, {
      sourceLabel: 'content/notes/example.md',
      bodyStartLine: 1,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.reason).toBe('argument');
    expect(formatContentDiagnostic(result[0] ?? diagnostic)).not.toContain('environment');
  });

  it.each([
    '/private/SECRET.md',
    'C:\\private\\SECRET.md',
    'content/notes/../../SECRET.md',
    'content/notes/\u001b[31mSECRET.md',
    'content/notes/\nSECRET.md',
    'content/notes/\u202eSECRET.md',
  ])('安全でないsource labelを端末へ出さない: %j', (sourceLabel) => {
    const formatted = formatContentDiagnostic({ ...diagnostic, sourceLabel });
    expect(formatted).toContain('[source unavailable]');
    expect(formatted).not.toMatch(/SECRET|[\p{Cc}\p{Cf}]/u);
  });

  it('安全な相対原稿名を保ち、includeへ原稿位置を誤って表示しない', () => {
    expect(
      formatContentDiagnostic({ ...diagnostic, sourceLabel: 'content/notes/安全な 数式.md' }),
    ).toContain('content/notes/安全な 数式.md:8:3');
    const formatted = formatContentDiagnostic({
      ...diagnostic,
      origin: 'include',
      includeRef: 'media/core',
    });
    expect(formatted).toContain('include media/core; location unavailable');
    expect(formatted).not.toContain(':8:3');
    expect(
      formatContentDiagnostic({
        ...diagnostic,
        origin: 'include',
        includeRef: '/private/SECRET\n',
      }),
    ).not.toMatch(/SECRET|private|\n/u);
  });
});
