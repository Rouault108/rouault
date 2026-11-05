import katex from 'katex';
import type { Root } from 'hast';
import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { toHtml } from 'hast-util-to-html';
import { unified } from 'unified';
import { VFile } from 'vfile';
import { describe, expect, it, vi } from 'vitest';
import { rehypeStaticMath } from '../../build/rehype/static-math.js';

const render = async (expressions: readonly string[], displayMode = false) => {
  const tree: Root = {
    type: 'root',
    children: expressions.map((value) => ({
      type: 'element',
      tagName: 'code',
      properties: { className: [displayMode ? 'math-display' : 'math-inline'] },
      children: [{ type: 'text', value }],
    })),
  };
  const file = new VFile();
  await unified().use(rehypeStaticMath).run(tree, file);
  return { html: toHtml(tree), messages: file.messages };
};

const nativeHtml = (expression: string, displayMode = false): string =>
  toHtml(
    fromHtmlIsomorphic(
      katex.renderToString(expression, {
        displayMode,
        output: 'htmlAndMathml',
        trust: false,
        strict: 'warn',
        throwOnError: false,
      }),
      { fragment: true },
    ),
  );

const captureOutput = () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  const spies = [log, error, warn, stdout, stderr];
  return {
    warn,
    clear: () => {
      for (const spy of spies) spy.mockClear();
    },
    restore: () => {
      for (const spy of spies) spy.mockRestore();
    },
    expectQuiet: () => {
      expect(log).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr).not.toHaveBeenCalled();
      for (const args of warn.mock.calls) {
        expect(args).toHaveLength(1);
        expect(args[0]).toMatch(
          /^\[rouault-static-math:strict:[A-Za-z]+\] LaTeX-incompatible input\.$/u,
        );
      }
    },
  };
};

describe('static math logging safety', () => {
  it('rendererの未知strictコードと入力message・tokenを読み出さず固定警告へ分類する', async () => {
    const output = captureOutput();
    const privateInput = 'SYNTHETIC_UNKNOWN_秘密\u001b[31m\n';
    const readInput = vi.fn(() => {
      throw new Error('SYNTHETIC_INPUT_GETTER');
    });
    const hostileInput = new Proxy({}, { get: readInput });
    const renderer = vi
      .spyOn(katex, 'renderToString')
      .mockImplementation((_expression, options) => {
        const strict = options?.strict;
        if (typeof strict !== 'function') throw new Error('Missing strict callback');
        for (const message of [privateInput, hostileInput]) {
          expect(Reflect.apply(strict, undefined, [privateInput, message, hostileInput])).toBe(
            'ignore',
          );
        }
        return '<span>safe-render</span>';
      });
    try {
      const result = await render(['x']);
      expect(result.html).toBe('<span>safe-render</span>');
      expect(result.messages).toEqual([]);
      expect(readInput).not.toHaveBeenCalled();
      expect(output.warn).toHaveBeenCalledWith(
        '[rouault-static-math:strict:unknown] LaTeX-incompatible input.',
      );
      output.expectQuiet();
    } finally {
      renderer.mockRestore();
      output.restore();
    }
  });

  it('ParseError後の再描画中に発生した予期しないrenderer例外も伝播する', async () => {
    const failure = new Error('Synthetic fallback renderer failure');
    const renderer = vi
      .spyOn(katex, 'renderToString')
      .mockImplementationOnce((_expression, options) => {
        expect(options?.throwOnError).toBe(true);
        throw new katex.ParseError('Synthetic parse failure');
      })
      .mockImplementationOnce((_expression, options) => {
        expect(options?.throwOnError).toBe(false);
        throw failure;
      });
    try {
      await expect(render(['x'])).rejects.toBe(failure);
      expect(renderer).toHaveBeenCalledTimes(2);
    } finally {
      renderer.mockRestore();
    }
  });

  it.each([
    ['unicodeTextInMathMode', 'é'],
    ['unknownSymbol', '😀'],
    ['symbolNotInFont', String.raw`\text{😀}`],
    ['mathVsTextUnits', String.raw`\kern1mu`],
    ['commentAtEnd', 'x%'],
    ['htmlExtension', String.raw`\htmlClass{synthetic}{x}`],
    ['newLineInDisplayMode', String.raw`x\\y`],
    ['mathVsSout', String.raw`\sout{x}`],
    ['mathVsTextAccents', String.raw`\'a`],
    ['textEnv', String.raw`\begin{array}{c}x&y\end{array}`],
  ])('%sの警告は固定文だけを出し、warn時のHTML・MathML・原式を保つ', async (code, expression) => {
    const output = captureOutput();
    try {
      const expected = nativeHtml(expression, true);
      output.clear();
      const result = await render([expression], true);
      expect(result.html).toBe(expected);
      expect(result.html).toContain('<math');
      expect(result.html).toContain('encoding="application/x-tex"');
      expect(result.messages).toEqual([]);
      expect(output.warn).toHaveBeenCalledWith(
        `[rouault-static-math:strict:${code}] LaTeX-incompatible input.`,
      );
      output.expectQuiet();
    } finally {
      output.restore();
    }
  });

  const payload = 'SYNTHETIC_Ω😀\u202e\r\nSECOND_LINE';
  it.each([
    ['message', `\\message{${payload}}x`],
    ['errmessage', `\\errmessage{${payload}}x`],
    ['show', String.raw`\def\SYNTHETIC{secret}\show\SYNTHETIC x`],
    ['message alias', `\\let\\alias\\message\\alias{${payload}}x`],
    ['errmessage alias', `\\let\\alias\\errmessage\\alias{${payload}}x`],
    ['show alias', String.raw`\let\alias\show\alias\SYNTHETIC x`],
    ['expanded message', `\\def\\emit#1{\\message{#1}}\\emit{${payload}}x`],
    ['expanded errmessage', `\\def\\emit#1{\\errmessage{#1}}\\emit{${payload}}x`],
    ['expanded show', String.raw`\def\emit{\show}\emit\SYNTHETIC x`],
    ['redefined message', String.raw`\def\message#1{#1}\message{x}`],
    ['redefined errmessage', String.raw`\def\errmessage#1{#1}\errmessage{x}`],
    ['redefined show', String.raw`\def\show#1{#1}\show{x}`],
    ['alias before redefinition', `\\let\\alias\\message\\def\\message#1{#1}\\alias{${payload}}x`],
    ['single-token message argument', String.raw`\message x+y`],
    ['single-token errmessage argument', String.raw`\errmessage x+y`],
    ['show group token', String.raw`\show{x}`],
    ['missing message argument', String.raw`\message`],
    ['missing errmessage argument', String.raw`\errmessage`],
    ['show at EOF', String.raw`\show`],
    ['message before ParseError', `\\message{${payload}}\\frac{`],
    ['errmessage before ParseError', `\\errmessage{${payload}}\\frac{`],
    ['show before ParseError', String.raw`\show\SYNTHETIC\frac{`],
    ['control character in message', '\\message{SYNTHETIC_\u001b[31m}x'],
  ])('%sは入力消費と描画結果を変えずにconsoleと標準出力を抑える', async (_name, expression) => {
    const output = captureOutput();
    try {
      const expected = nativeHtml(expression);
      output.clear();
      const result = await render([expression]);
      expect(result.html).toBe(expected);
      const invalid = expected.includes('class="katex-error"');
      expect(result.messages).toHaveLength(invalid ? 1 : 0);
      if (invalid) {
        expect(result.messages[0]).toMatchObject({
          source: 'rouault-static-math',
          ruleId: 'parseerror',
          fatal: false,
        });
      }
      output.expectQuiet();
    } finally {
      output.restore();
    }
  });

  it('非ASCII・方向制御文字のstrict警告を入力文字なしで報告する', async () => {
    const expression = 'Ω😀\u202e';
    const output = captureOutput();
    try {
      const expected = nativeHtml(expression);
      output.clear();
      const result = await render([expression]);
      expect(result.html).toBe(expected);
      expect(output.warn).toHaveBeenCalled();
      output.expectQuiet();
    } finally {
      output.restore();
    }
  });

  it('ParseError後はgdefで変更したmacro stateを使わず原式から再描画する', async () => {
    const expression = String.raw`\providecommand{\rouaultstate}{\frac}\let\rouaultalias\rouaultstate\gdef\rouaultstate{x}\rouaultalias`;
    const output = captureOutput();
    try {
      const expected = nativeHtml(expression);
      output.clear();
      const result = await render([expression]);
      expect(result.html).toBe(expected);
      expect(result.html).toContain('class="katex-error"');
      expect(result.messages).toHaveLength(1);
      output.expectQuiet();
    } finally {
      output.restore();
    }
  });

  it('複数式と次の変換でも再定義・gdefを共有せず、quiet macroを作り直す', async () => {
    const expressions = [
      String.raw`\gdef\rouaultstate{x}\gdef\message#1{#1}z`,
      String.raw`\message{SYNTHETIC}x`,
      String.raw`\rouaultstate`,
    ];
    const output = captureOutput();
    try {
      const expected = expressions.map((expression) => nativeHtml(expression)).join('');
      output.clear();
      for (let iteration = 0; iteration < 2; iteration++) {
        const result = await render(expressions);
        expect(result.html).toBe(expected);
        expect(result.messages).toHaveLength(1);
      }
      output.expectQuiet();
    } finally {
      output.restore();
    }
  });
});
