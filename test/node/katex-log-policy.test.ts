import { describe, expect, it, vi } from 'vitest';
import {
  createQuietKatexMacros,
  reportSafeKatexStrictWarning,
} from '../../build/rehype/katex-log-policy.js';

describe('KaTeX log policy', () => {
  it('既知コードと未知コードを固定文へ分類し、入力を警告へ出さない', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      for (const code of [
        'unknownSymbol',
        'unicodeTextInMathMode',
        'mathVsTextUnits',
        'commentAtEnd',
        'htmlExtension',
        'newLineInDisplayMode',
        'mathVsSout',
        'mathVsTextAccents',
        'textEnv',
        'symbolNotInFont',
      ]) {
        expect(reportSafeKatexStrictWarning(code)).toBe('ignore');
        expect(warn).toHaveBeenLastCalledWith(
          `[rouault-static-math:strict:${code}] LaTeX-incompatible input.`,
        );
      }
      for (const code of ['PRIVATE_秘密\u001b[31m\n', 'constructor', '__proto__', 'toString', '']) {
        expect(reportSafeKatexStrictWarning(code)).toBe('ignore');
        expect(warn).toHaveBeenLastCalledWith(
          '[rouault-static-math:strict:unknown] LaTeX-incompatible input.',
        );
      }
    } finally {
      warn.mockRestore();
    }
  });

  it.each(['\\message', '\\errmessage', '\\show'])(
    '%sはreceiverを保ち、元と同じ引数だけを消費する',
    (name) => {
      const macro = createQuietKatexMacros()[name];
      if (typeof macro !== 'function') throw new Error('Missing quiet macro');
      const consumeArgs = vi.fn(function (this: object, count: number) {
        expect(this).toBe(context);
        expect(count).toBe(1);
        return [];
      });
      const popToken = vi.fn(function (this: object) {
        expect(this).toBe(context);
        return {};
      });
      const context = { consumeArgs, popToken };
      expect(macro(context)).toBe('');
      expect(consumeArgs).toHaveBeenCalledTimes(name === '\\show' ? 0 : 1);
      expect(popToken).toHaveBeenCalledTimes(name === '\\show' ? 1 : 0);
    },
  );

  it.each(['\\message', '\\errmessage', '\\show'])(
    '%sの内部API不一致を原稿のない固定エラーにする',
    (name) => {
      const macro = createQuietKatexMacros()[name];
      if (typeof macro !== 'function') throw new Error('Missing quiet macro');
      for (const context of [{}, { consumeArgs: 'PRIVATE_秘密', popToken: '\u001b[31m' }]) {
        expect(() => macro(context)).toThrow(new Error('Incompatible KaTeX macro context.'));
      }
    },
  );

  it('引数消費中の例外を握り潰さず、macro定義を呼出しごとに独立させる', () => {
    const macros = createQuietKatexMacros();
    const macro = macros['\\message'];
    if (typeof macro !== 'function') throw new Error('Missing quiet macro');
    const failure = new Error('Synthetic argument failure');
    expect(() =>
      macro({
        consumeArgs() {
          throw failure;
        },
      }),
    ).toThrow(failure);
    macros['\\message'] = 'changed';
    expect(typeof createQuietKatexMacros()['\\message']).toBe('function');
  });
});
