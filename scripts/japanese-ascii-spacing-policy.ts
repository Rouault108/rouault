export const DEFAULT_INCLUDE_PATTERNS = [
  'README.md',
  'docs/**/*.md',
  'content/**/*.md',
  'content/*/_config.json',
  'content/**/*/_config.json',
  'src/**/*.ts',
  'test/**/*.ts',
] as const;

export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  '.git/**',
  '.cache/**',
  'coverage/**',
  'test-results/**',
  'playwright-report/**',
  'docs/old/**',
  'docs/temporary/**',
  'docs/workflows/problem-solving/r4-validation/samples/**',
  'docs/workflows/problem-solving/r4-validation/schemas/**',
  'docs/workflows/problem-solving/r4-validation/tools/**',
  'content/_assets/**',
] as const;

export const JAPANESE_PUNCTUATION = [
  '。',
  '、',
  '，',
  '．',
  '・',
  '「',
  '」',
  '『',
  '』',
  '（',
  '）',
  '！',
  '？',
  '：',
  '；',
] as const;

export type JapaneseAsciiSpacingReason =
  | 'japanese-to-ascii'
  | 'ascii-to-japanese'
  | 'inline-code-to-japanese'
  | 'japanese-to-inline-code'
  | 'number-unit-to-japanese';

export type JapaneseAsciiSpacingCandidate = {
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly matchedText: string;
  readonly snippet: string;
  readonly reason: JapaneseAsciiSpacingReason;
};

export type JapaneseAsciiSpacingReport = {
  readonly filePath: string;
  readonly candidates: readonly JapaneseAsciiSpacingCandidate[];
};

export type JapaneseAsciiSpacingScanOptions = {
  readonly filePath: string;
};

type Range = {
  readonly start: number;
  readonly end: number;
};

type FenceState = {
  readonly marker: '`' | '~';
  readonly length: number;
};

const ASCII_ALNUM_PATTERN = /^[A-Za-z0-9]$/u;
const HAN_PATTERN = /^\p{Script=Han}$/u;
const HIRAGANA_PATTERN = /^\p{Script=Hiragana}$/u;
const KATAKANA_PATTERN = /^\p{Script=Katakana}$/u;
const TABLE_ALIGNMENT_ROW_PATTERN =
  /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u;
const FRONTMATTER_DELIMITER_PATTERN = /^\s*---\s*$/u;
const FRONTMATTER_KEY_PATTERN = /^\s*[A-Za-z0-9_-]+(?=\s*:)/u;
const INLINE_CODE_PATTERN = /`+[^`\n]*?`+/gu;
const URL_RANGE_PATTERN = /https?:\/\/[^\s<>)\]]+/giu;
const URL_TEST_PATTERN = /https?:\/\/[^\s<>)\]]+/iu;
const MARKDOWN_LINK_PATTERN = /\[[^\]\n]*\]\(([^)\n]*)\)/gu;
const FILE_PATH_END_PATTERN =
  /(?:[A-Za-z]:)?(?:\.{1,2}[\\/]|[A-Za-z0-9_.-]+[\\/])(?:[A-Za-z0-9_.-]+[\\/])*[A-Za-z0-9_.-]+$/u;
const COMMAND_END_PATTERN =
  /(?:^|\s)(?:pnpm|npm|node|git|tsx|npx)\s+(?:run\s+)?[A-Za-z0-9:_./-]+(?:\s+[A-Za-z0-9:_./=-]+)*$/u;
const NUMBER_UNIT_END_PATTERN = /\d+(?:\.\d+)?\s+[A-Za-z%]+$/u;

export const normalizeFilePath = (filePath: string): string => {
  return filePath.replace(/\\/gu, '/').replace(/^\.\//u, '').replace(/\/+/gu, '/');
};

export const dedupeNormalizedFilePaths = (filePaths: readonly string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const filePath of filePaths) {
    const normalizedPath = normalizeFilePath(filePath);

    if (seen.has(normalizedPath)) {
      continue;
    }

    seen.add(normalizedPath);
    deduped.push(normalizedPath);
  }

  return deduped;
};

export const isJapaneseCharacter = (character: string): boolean => {
  return (
    HAN_PATTERN.test(character) ||
    HIRAGANA_PATTERN.test(character) ||
    KATAKANA_PATTERN.test(character) ||
    (JAPANESE_PUNCTUATION as readonly string[]).includes(character)
  );
};

export const isAsciiAlnum = (character: string): boolean => {
  return ASCII_ALNUM_PATTERN.test(character);
};

export const matchesPathPattern = (filePath: string, pattern: string): boolean => {
  const fileSegments = normalizeFilePath(filePath).split('/');
  const patternSegments = normalizeFilePath(pattern).split('/');

  return matchSegments(fileSegments, patternSegments);
};

export const shouldIncludeFilePath = (
  filePath: string,
  includePatterns: readonly string[] = DEFAULT_INCLUDE_PATTERNS,
  excludePatterns: readonly string[] = DEFAULT_EXCLUDE_PATTERNS,
): boolean => {
  const normalizedPath = normalizeFilePath(filePath);
  const included = includePatterns.some((pattern) => matchesPathPattern(normalizedPath, pattern));

  if (!included) {
    return false;
  }

  return !excludePatterns.some((pattern) => matchesPathPattern(normalizedPath, pattern));
};

export const detectJapaneseAsciiSpacingCandidates = (
  text: string,
  options: JapaneseAsciiSpacingScanOptions,
): JapaneseAsciiSpacingCandidate[] => {
  const candidates: JapaneseAsciiSpacingCandidate[] = [];
  const lines = text.split(/\r?\n/u);
  let fenceState: FenceState | undefined;
  let inFrontmatter = lines[0] !== undefined && FRONTMATTER_DELIMITER_PATTERN.test(lines[0]);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? '';
    const lineNumber = lineIndex + 1;
    const fenceLine = parseFenceLine(line);

    if (fenceLine !== undefined) {
      if (fenceState === undefined) {
        fenceState = fenceLine;
        continue;
      }

      if (isClosingFence(fenceLine, fenceState)) {
        fenceState = undefined;
      }

      continue;
    }

    if (fenceState !== undefined || TABLE_ALIGNMENT_ROW_PATTERN.test(line)) {
      continue;
    }

    const maskedRanges = collectMaskedRanges(line);

    if (inFrontmatter) {
      if (lineIndex > 0 && FRONTMATTER_DELIMITER_PATTERN.test(line)) {
        inFrontmatter = false;
        continue;
      }

      const keyMatch = FRONTMATTER_KEY_PATTERN.exec(line);

      if (keyMatch !== null) {
        maskedRanges.push({ start: 0, end: keyMatch[0].length });
      }
    }

    const inlineCodeRanges = collectInlineCodeRanges(line);

    candidates.push(
      ...detectInlineCodeBoundaryCandidates(line, lineNumber, options.filePath, inlineCodeRanges),
    );

    candidates.push(
      ...detectSpaceBoundaryCandidates(line, lineNumber, options.filePath, maskedRanges),
    );
  }

  return candidates;
};

const matchSegments = (fileSegments: readonly string[], patternSegments: readonly string[]): boolean => {
  const matchFrom = (fileIndex: number, patternIndex: number): boolean => {
    if (patternIndex === patternSegments.length) {
      return fileIndex === fileSegments.length;
    }

    const patternSegment = patternSegments[patternIndex];

    if (patternSegment === '**') {
      if (patternIndex === patternSegments.length - 1) {
        return true;
      }

      for (let nextFileIndex = fileIndex; nextFileIndex <= fileSegments.length; nextFileIndex += 1) {
        if (matchFrom(nextFileIndex, patternIndex + 1)) {
          return true;
        }
      }

      return false;
    }

    const fileSegment = fileSegments[fileIndex];

    if (fileSegment === undefined) {
      return false;
    }

    return matchSegment(fileSegment, patternSegment ?? '') && matchFrom(fileIndex + 1, patternIndex + 1);
  };

  return matchFrom(0, 0);
};

const matchSegment = (fileSegment: string, patternSegment: string): boolean => {
  const expression = new RegExp(
    `^${escapeRegExp(patternSegment).replace(/\\\*/gu, '[^/]*')}$`,
    'u',
  );

  return expression.test(fileSegment);
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
};

const parseFenceLine = (line: string): FenceState | undefined => {
  const match = /^\s*(`{3,}|~{3,})/u.exec(line);

  if (match?.[1] === undefined) {
    return undefined;
  }

  const marker = match[1][0];

  if (marker !== '`' && marker !== '~') {
    return undefined;
  }

  return { marker, length: match[1].length };
};

const isClosingFence = (candidate: FenceState, opener: FenceState): boolean => {
  return candidate.marker === opener.marker && candidate.length >= opener.length;
};

const collectMaskedRanges = (line: string): Range[] => {
  const ranges = [
    ...collectInlineCodeRanges(line),
    ...collectPatternRanges(line, URL_RANGE_PATTERN),
    ...collectMarkdownLinkUrlRanges(line),
  ];

  return mergeRanges(ranges);
};

const collectInlineCodeRanges = (line: string): Range[] => {
  return collectPatternRanges(line, INLINE_CODE_PATTERN);
};

const collectPatternRanges = (line: string, pattern: RegExp): Range[] => {
  const ranges: Range[] = [];

  pattern.lastIndex = 0;

  for (const match of line.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }

    ranges.push({ start: match.index, end: match.index + match[0].length });
  }

  return ranges;
};

const collectMarkdownLinkUrlRanges = (line: string): Range[] => {
  const ranges: Range[] = [];

  MARKDOWN_LINK_PATTERN.lastIndex = 0;

  for (const match of line.matchAll(MARKDOWN_LINK_PATTERN)) {
    if (match.index === undefined || match[1] === undefined) {
      continue;
    }

    const urlStart = match.index + match[0].indexOf('(') + 1;
    ranges.push({ start: urlStart, end: urlStart + match[1].length });
  }

  return ranges;
};

const mergeRanges = (ranges: readonly Range[]): Range[] => {
  const sortedRanges = [...ranges].sort((left, right) => left.start - right.start);
  const mergedRanges: Range[] = [];

  for (const range of sortedRanges) {
    const currentRange = mergedRanges.at(-1);

    if (currentRange === undefined || range.start > currentRange.end) {
      mergedRanges.push(range);
      continue;
    }

    mergedRanges[mergedRanges.length - 1] = {
      start: currentRange.start,
      end: Math.max(currentRange.end, range.end),
    };
  }

  return mergedRanges;
};

const detectInlineCodeBoundaryCandidates = (
  line: string,
  lineNumber: number,
  filePath: string,
  inlineCodeRanges: readonly Range[],
): JapaneseAsciiSpacingCandidate[] => {
  const candidates: JapaneseAsciiSpacingCandidate[] = [];

  for (const range of inlineCodeRanges) {
    const afterSpaceIndex = range.end;
    const beforeSpaceIndex = range.start - 1;

    if (line[afterSpaceIndex] === ' ' && isJapaneseCharacter(line[afterSpaceIndex + 1] ?? '')) {
      candidates.push(
        createCandidate(line, lineNumber, filePath, afterSpaceIndex, 'inline-code-to-japanese'),
      );
    }

    if (line[beforeSpaceIndex] === ' ' && isJapaneseCharacter(line[beforeSpaceIndex - 1] ?? '')) {
      candidates.push(
        createCandidate(line, lineNumber, filePath, beforeSpaceIndex, 'japanese-to-inline-code'),
      );
    }
  }

  return candidates;
};

const detectSpaceBoundaryCandidates = (
  line: string,
  lineNumber: number,
  filePath: string,
  maskedRanges: readonly Range[],
): JapaneseAsciiSpacingCandidate[] => {
  const candidates: JapaneseAsciiSpacingCandidate[] = [];

  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== ' ' || isMasked(index, maskedRanges) || isTableDelimiterPadding(line, index)) {
      continue;
    }

    const left = line[index - 1] ?? '';
    const right = line[index + 1] ?? '';

    if (isProtectedLeftPhrase(line.slice(0, index))) {
      continue;
    }

    if (isJapaneseCharacter(left) && isAsciiAlnum(right)) {
      candidates.push(createCandidate(line, lineNumber, filePath, index, 'japanese-to-ascii'));
      continue;
    }

    if (isAsciiAlnum(left) && isJapaneseCharacter(right)) {
      const reason = NUMBER_UNIT_END_PATTERN.test(line.slice(0, index))
        ? 'number-unit-to-japanese'
        : 'ascii-to-japanese';
      candidates.push(createCandidate(line, lineNumber, filePath, index, reason));
    }
  }

  return candidates;
};

const isMasked = (index: number, ranges: readonly Range[]): boolean => {
  return ranges.some((range) => index >= range.start && index < range.end);
};

const isTableDelimiterPadding = (line: string, index: number): boolean => {
  return line[index - 1] === '|' || line[index + 1] === '|';
};

const isProtectedLeftPhrase = (value: string): boolean => {
  const trimmedValue = value.trimEnd();

  return (
    FILE_PATH_END_PATTERN.test(trimmedValue) ||
    URL_TEST_PATTERN.test(trimmedValue) ||
    COMMAND_END_PATTERN.test(trimmedValue)
  );
};

const createCandidate = (
  line: string,
  lineNumber: number,
  filePath: string,
  spaceIndex: number,
  reason: JapaneseAsciiSpacingReason,
): JapaneseAsciiSpacingCandidate => {
  const start = Math.max(0, spaceIndex - 24);
  const end = Math.min(line.length, spaceIndex + 25);

  return {
    filePath,
    line: lineNumber,
    column: spaceIndex + 1,
    matchedText: line.slice(Math.max(0, spaceIndex - 1), Math.min(line.length, spaceIndex + 2)),
    snippet: line.slice(start, end),
    reason,
  };
};
