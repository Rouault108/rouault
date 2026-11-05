import type { KatexOptions } from 'katex';

const strictWarningCodes = new Set([
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
]);

// KaTeXのメッセージとtokenには原稿が含まれ得るため、既知の分類だけを表示する。
export const reportSafeKatexStrictWarning = (errorCode: string): 'ignore' => {
  const code = strictWarningCodes.has(errorCode) ? errorCode : 'unknown';
  console.warn(`[rouault-static-math:strict:${code}] LaTeX-incompatible input.`);
  // warnと同じ非fatalな描画を保ち、KaTeX自身による入力の再出力を止める。
  return 'ignore';
};

interface ArgumentContext {
  consumeArgs: (count: number) => unknown;
}

interface TokenContext {
  popToken: () => unknown;
}

const hasArgumentContext = (context: object): context is ArgumentContext =>
  'consumeArgs' in context && typeof context.consumeArgs === 'function';

const hasTokenContext = (context: object): context is TokenContext =>
  'popToken' in context && typeof context.popToken === 'function';

const suppressMessage = (context: object): string => {
  if (!hasArgumentContext(context)) throw new Error('Incompatible KaTeX macro context.');
  // 公開型はobjectのみ。receiverを保って元と同じ未展開引数を消費する。
  context.consumeArgs(1);
  return '';
};

const suppressShow = (context: object): string => {
  if (!hasTokenContext(context)) throw new Error('Incompatible KaTeX macro context.');
  context.popToken();
  return '';
};

// gdef等はこのobjectを変更するため、ParseError後の再描画でも必ず作り直す。
export const createQuietKatexMacros = (): NonNullable<KatexOptions['macros']> => ({
  '\\message': suppressMessage,
  '\\errmessage': suppressMessage,
  '\\show': suppressShow,
});
