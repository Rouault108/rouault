import { waitForStyleRecalc } from './wait-for-lit.js';

const TOKENS_STYLE_ID = 'test-global-tokens-css';
const MAIN_STYLE_ID = 'test-global-main-css';

type ScannerState = 'base' | 'single-quote' | 'double-quote' | 'line-comment' | 'block-comment';

interface ImportRange {
  readonly start: number;
  readonly end: number;
  readonly depth: number;
}

const isIdentifierChar = (char: string | undefined): boolean => char !== undefined && /[a-zA-Z0-9_-]/u.test(char);

const skipWhitespace = (cssText: string, cursor: number): number => {
  let next = cursor;
  while (next < cssText.length && /\s/u.test(cssText[next] ?? '')) next += 1;
  return next;
};

const readImportStatementEnd = (cssText: string, cursor: number): number => {
  let state: ScannerState = 'base';
  let escaped = false;
  for (let index = cursor; index < cssText.length; index += 1) {
    const char = cssText[index];
    const next = cssText[index + 1];
    if (state === 'line-comment') {
      if (char === '\n') state = 'base';
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        state = 'base';
        index += 1;
      }
      continue;
    }
    if (state === 'single-quote' || state === 'double-quote') {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if ((state === 'single-quote' && char === "'") || (state === 'double-quote' && char === '"')) {
        state = 'base';
      }
      continue;
    }
    if (char === '/' && next === '/') {
      state = 'line-comment';
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state = 'block-comment';
      index += 1;
      continue;
    }
    if (char === "'") {
      state = 'single-quote';
      continue;
    }
    if (char === '"') {
      state = 'double-quote';
      continue;
    }
    if (char === ';') return index + 1;
  }
  throw new Error('@import at-rule が ; で閉じられていません');
};

const collectImportRanges = (cssText: string): ImportRange[] => {
  const ranges: ImportRange[] = [];
  let state: ScannerState = 'base';
  let escaped = false;
  let depth = 0;

  for (let index = 0; index < cssText.length; index += 1) {
    const char = cssText[index];
    const next = cssText[index + 1];

    if (state === 'line-comment') {
      if (char === '\n') state = 'base';
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        state = 'base';
        index += 1;
      }
      continue;
    }
    if (state === 'single-quote' || state === 'double-quote') {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if ((state === 'single-quote' && char === "'") || (state === 'double-quote' && char === '"')) {
        state = 'base';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      state = 'line-comment';
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state = 'block-comment';
      index += 1;
      continue;
    }
    if (char === "'") {
      state = 'single-quote';
      continue;
    }
    if (char === '"') {
      state = 'double-quote';
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === '@' && cssText.slice(index, index + 7).toLowerCase() === '@import') {
      const before = cssText[index - 1];
      const after = cssText[index + 7];
      if (isIdentifierChar(before) || isIdentifierChar(after)) continue;
      const start = index;
      const end = readImportStatementEnd(cssText, skipWhitespace(cssText, index + 7));
      ranges.push({ start, end, depth });
      index = end - 1;
    }
  }

  return ranges;
};

export const hasTopLevelImport = (cssText: string): boolean =>
  collectImportRanges(cssText).some((range) => range.depth === 0);

export const stripTopLevelImports = (cssText: string): string => {
  const ranges = collectImportRanges(cssText);
  const nestedImport = ranges.find((range) => range.depth > 0);
  if (nestedImport !== undefined) {
    throw new Error('top-level 以外の @import は browser contract test で扱いません');
  }

  let cursor = 0;
  let output = '';
  for (const range of ranges) {
    output += cssText.slice(cursor, range.start);
    cursor = range.end;
  }
  output += cssText.slice(cursor);
  return output;
};

const ensureStyleTag = async (id: string, href: string, transform?: (cssText: string) => string) => {
  if (document.getElementById(id)) {
    await waitForStyleRecalc();
    return;
  }

  const response = await fetch(href);
  if (!response.ok) {
    throw new Error(`${href} の読み込みに失敗しました: ${response.status} ${response.statusText}`);
  }

  const cssText = await response.text();
  const style = document.createElement('style');
  style.id = id;
  style.textContent = transform ? transform(cssText) : cssText;
  document.head.append(style);

  await waitForStyleRecalc();
};

export const ensureMainCssLoaded = async (): Promise<void> => {
  await ensureStyleTag(
    TOKENS_STYLE_ID,
    new URL('../../../src/assets/css/tokens.css', import.meta.url).href,
  );
  await ensureStyleTag(
    MAIN_STYLE_ID,
    new URL('../../../src/assets/css/main.css', import.meta.url).href,
    stripTopLevelImports,
  );
};
