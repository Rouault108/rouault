import katex from 'katex';
import type { VFile } from 'vfile';
import type { ContentInput } from './content-input.js';
import { getMathDiagnosticOrigin } from './math-diagnostic-origin.js';

const PARSE_REASONS = {
  incomplete: '数式の途中で入力が終了しています。括弧や引数の閉じ忘れを確認してください。',
  command: '未定義または未対応のTeX命令です。命令の綴りを確認してください。',
  argument: '命令の引数や区切りが不正です。括弧と引数を確認してください。',
  environment: '数式環境が不正または未対応です。環境の指定と対応を確認してください。',
  expansion: 'マクロの展開回数が上限を超えました。再帰的な定義を確認してください。',
  syntax: '数式を解釈できません。括弧・命令・引数を確認してください。',
} as const;

export interface ContentDiagnostic {
  readonly severity: 'warning';
  readonly source: 'rouault-static-math';
  readonly ruleId: 'parseerror';
  readonly sourceLabel: string;
  readonly reason: keyof typeof PARSE_REASONS;
  readonly origin: 'document' | 'include' | 'unknown';
  readonly position?: { readonly line: number; readonly column: number };
  readonly includeRef?: string;
}

export interface ContentDiagnosticOptions {
  readonly reportDiagnostic?: (diagnostic: ContentDiagnostic) => void;
}

const safeSourceLabel = (value: string): string => {
  const normalized = value.replace(/\\/gu, '/');
  // 公開原稿の相対identityだけを表示し、private pathや端末制御を持ち込ませない。
  if (
    normalized.length > 240 ||
    /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(normalized) ||
    !/^(?:content|test\/fixtures\/content)\/(?:notes|memos)\/.+\.md$/u.test(normalized) ||
    normalized.split('/').some((part) => part === '..' || part === '.' || part === '') ||
    /[?:#]/u.test(normalized)
  )
    return '[source unavailable]';
  return normalized;
};

const safeIncludeRef = (value: string | undefined): string | undefined =>
  value && /^[a-z0-9][a-z0-9/_-]{0,127}$/iu.test(value) ? value : undefined;

const validPosition = (value: { line: number; column: number } | undefined): boolean =>
  value !== undefined &&
  Number.isSafeInteger(value.line) &&
  value.line > 0 &&
  Number.isSafeInteger(value.column) &&
  value.column > 0;

const classifyParseError = (cause: unknown): ContentDiagnostic['reason'] => {
  // rawMessageには原式や秘密が混ざり得るため、既知の分類に対応する定型文だけを返す。
  const reason = cause instanceof katex.ParseError ? cause.rawMessage : '';
  if (/^Unexpected end of input/iu.test(reason)) return 'incomplete';
  if (/^(?:Undefined control sequence|Unknown function)/iu.test(reason)) return 'command';
  if (/^(?:No such environment|Unknown environment)/iu.test(reason)) return 'environment';
  if (/^(?:Too many expansions|Expansion limit)/iu.test(reason)) return 'expansion';
  if (/^(?:Expected|Missing argument|Invalid delimiter|Invalid size)/iu.test(reason))
    return 'argument';
  return 'syntax';
};

export const collectContentDiagnostics = (
  file: VFile,
  input: Pick<ContentInput, 'sourceLabel' | 'bodyStartLine'>,
): ContentDiagnostic[] => {
  const result: ContentDiagnostic[] = [];
  const seen = new Set<object>();
  for (const message of file.messages) {
    if (
      message.fatal === true ||
      message.source !== 'rouault-static-math' ||
      message.ruleId !== 'parseerror' ||
      seen.has(message)
    )
      continue;
    // 同じmessageの二重登録だけを抑止し、位置不明の別発生箇所を消さない。
    seen.add(message);
    const origin = getMathDiagnosticOrigin(file, message);
    const point = origin?.kind === 'document' ? origin.position : undefined;
    const position =
      point && validPosition(point)
        ? { line: point.line + input.bodyStartLine - 1, column: point.column }
        : undefined;
    const includeRef = origin?.kind === 'include' ? safeIncludeRef(origin.ref) : undefined;
    result.push({
      severity: 'warning',
      source: 'rouault-static-math',
      ruleId: 'parseerror',
      sourceLabel: safeSourceLabel(input.sourceLabel),
      reason: classifyParseError(message.cause),
      origin: origin?.kind ?? 'unknown',
      ...(position && validPosition(position) ? { position } : {}),
      ...(includeRef ? { includeRef } : {}),
    });
  }
  return result;
};

export const formatContentDiagnostic = (diagnostic: ContentDiagnostic): string => {
  const position =
    diagnostic.origin === 'document' && validPosition(diagnostic.position)
      ? `:${String(diagnostic.position?.line)}:${String(diagnostic.position?.column)}`
      : '';
  const ref = safeIncludeRef(diagnostic.includeRef);
  const include =
    diagnostic.origin === 'include'
      ? ` [include${ref ? ` ${ref}` : ''}; location unavailable]`
      : position
        ? ''
        : ' [location unavailable]';
  const reason = Object.hasOwn(PARSE_REASONS, diagnostic.reason)
    ? PARSE_REASONS[diagnostic.reason]
    : PARSE_REASONS.syntax;
  return `[content] warning ${safeSourceLabel(diagnostic.sourceLabel)}${position}${include} [rouault-static-math:parseerror] ${reason}`;
};

export const reportContentDiagnostic = (diagnostic: ContentDiagnostic): void => {
  process.stderr.write(`${formatContentDiagnostic(diagnostic)}\n`);
};
