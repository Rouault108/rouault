import { readFileSync } from 'node:fs';

export const extractSingleStaticCssTemplate = (filePath: string): string => {
  const sourceText = readFileSync(filePath, 'utf8');
  const declarationMatch = sourceText.match(/static\s+override\s+styles\s*=\s*css`/u);
  if (!declarationMatch || declarationMatch.index === undefined) {
    throw new Error(`static override styles = css\`...\` が見つかりません: ${filePath}`);
  }

  const templateStart = declarationMatch.index + declarationMatch[0].length;
  let cursor = templateStart;
  let escaped = false;

  while (cursor < sourceText.length) {
    const char = sourceText[cursor];
    if (escaped) {
      escaped = false;
      cursor += 1;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      cursor += 1;
      continue;
    }
    if (char === '$' && sourceText[cursor + 1] === '{') {
      throw new Error(`CSS template interpolation は contract 対象外です: ${filePath}`);
    }
    if (char === '`') {
      const cssText = sourceText.slice(templateStart, cursor);
      const rest = sourceText.slice(cursor + 1);
      if (!/^\s*;/u.test(rest)) {
        throw new Error(`static styles の css template 終端を一意に解釈できません: ${filePath}`);
      }
      if (/\bcss`/u.test(rest)) {
        throw new Error(`複数の css template は contract 対象外です: ${filePath}`);
      }
      if (/static\s+override\s+styles\s*=\s*\[/u.test(sourceText)) {
        throw new Error(`styles 配列は contract 対象外です: ${filePath}`);
      }
      return cssText;
    }
    cursor += 1;
  }

  throw new Error(`static styles の css template が閉じられていません: ${filePath}`);
};
