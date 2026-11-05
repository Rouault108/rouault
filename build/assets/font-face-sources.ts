import postcss, { type Declaration } from 'postcss';

const GEIST_MONO_FAMILY = 'geist mono variable';
const SPACE = /[\t\n\f\r ]/u;
const HEX = /[0-9a-f]/iu;
const NAME_START = /[a-z_\u0080-\uFFFF]/iu;
const NAME = /[a-z0-9_\-\u0080-\uFFFF]/iu;
// CSS Fonts 4のkeyword文法に限定し、未知のhintを有効な取得候補と誤認しない。
const FONT_FORMATS = new Set([
  'collection',
  'embedded-opentype',
  'opentype',
  'svg',
  'truetype',
  'woff',
  'woff2',
]);
const FONT_TECHNOLOGIES = new Set([
  'features-opentype',
  'features-aat',
  'features-graphite',
  'color-colrv0',
  'color-colrv1',
  'color-svg',
  'color-sbix',
  'color-cbdt',
  'variations',
  'palettes',
  'incremental',
]);

// CSS全体の再実装を避け、font-faceの静的なfamily/srcだけを厳格に読む。
class FontValueReader {
  private offset = 0;

  constructor(
    private readonly value: string,
    private readonly fail: (message: string) => never,
  ) {}

  peek(): string {
    return this.value[this.offset] ?? '';
  }

  take(expected: string): void {
    if (this.peek() !== expected) this.fail(`expected ${expected} in font descriptor`);
    this.offset += 1;
  }

  skipSpace(): boolean {
    const initial = this.offset;
    while (this.offset < this.value.length) {
      if (SPACE.test(this.peek())) {
        this.offset += 1;
      } else if (this.value.startsWith('/*', this.offset)) {
        const end = this.value.indexOf('*/', this.offset + 2);
        if (end < 0) this.fail('unterminated CSS comment');
        this.offset = end + 2;
      } else {
        break;
      }
    }
    return this.offset !== initial;
  }

  private escape(allowContinuation: boolean): string {
    this.take('\\');
    const first = this.peek();
    if (!first) return this.fail('incomplete CSS escape');
    if (first === '\n' || first === '\r' || first === '\f') {
      if (!allowContinuation) this.fail('newline escape outside CSS string');
      this.offset += first === '\r' && this.value[this.offset + 1] === '\n' ? 2 : 1;
      return '';
    }
    if (HEX.test(first)) {
      let digits = '';
      while (digits.length < 6 && HEX.test(this.peek()) && this.peek()) {
        digits += this.peek();
        this.offset += 1;
      }
      if (this.peek() && SPACE.test(this.peek())) {
        const whitespace = this.peek();
        this.offset += whitespace === '\r' && this.value[this.offset + 1] === '\n' ? 2 : 1;
      }
      const point = Number.parseInt(digits, 16);
      return point === 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)
        ? '\uFFFD'
        : String.fromCodePoint(point);
    }
    this.offset += 1;
    return first === '\0' ? '\uFFFD' : first;
  }

  identifier(): string {
    let result = '';
    if (this.peek() === '-') {
      result += '-';
      this.offset += 1;
      if (this.peek() === '-') {
        result += '-';
        this.offset += 1;
      } else if (this.peek() !== '\\' && !NAME_START.test(this.peek())) {
        return this.fail('invalid CSS identifier');
      }
    } else if (this.peek() !== '\\' && !NAME_START.test(this.peek())) {
      return this.fail('expected CSS identifier');
    }
    while (this.peek()) {
      if (this.peek() === '\\') result += this.escape(false);
      else if (NAME.test(this.peek())) {
        result += this.peek();
        this.offset += 1;
      } else break;
    }
    return result;
  }

  string(): string {
    const quote = this.peek();
    if (quote !== '"' && quote !== "'") return this.fail('expected CSS string');
    this.offset += 1;
    let result = '';
    while (this.peek() !== quote) {
      const char = this.peek();
      if (!char || char === '\n' || char === '\r' || char === '\f')
        return this.fail('unterminated CSS string');
      if (char === '\\') result += this.escape(true);
      else {
        result += char === '\0' ? '\uFFFD' : char;
        this.offset += 1;
      }
    }
    this.offset += 1;
    return result;
  }

  family(): string {
    this.skipSpace();
    if (this.peek() === '"' || this.peek() === "'") return this.string();
    const names = [this.identifier()];
    while (this.skipSpace() && this.peek() && this.peek() !== ')') {
      names.push(this.identifier());
    }
    return names.join(' ');
  }

  url(): string {
    // unquoted URL token内ではcommentもURL文字列になるため、空白と区別する。
    while (this.peek() && SPACE.test(this.peek())) this.offset += 1;
    if (this.peek() === '"' || this.peek() === "'") {
      const result = this.string();
      this.skipSpace();
      this.take(')');
      if (!result) this.fail('empty src URL');
      return result;
    }
    let result = '';
    while (this.peek() && this.peek() !== ')') {
      const char = this.peek();
      if (SPACE.test(char)) {
        while (this.peek() && SPACE.test(this.peek())) this.offset += 1;
        if (this.peek() !== ')') this.fail('whitespace inside unquoted src URL');
        break;
      }
      if (char === '\\') result += this.escape(false);
      else {
        const code = char.charCodeAt(0);
        if (char === '"' || char === "'" || char === '(' || code < 0x20 || code === 0x7f)
          this.fail('invalid unquoted src URL');
        result += char;
        this.offset += 1;
      }
    }
    this.take(')');
    if (!result) this.fail('empty src URL');
    return result;
  }

  functionName(): string {
    const name = this.identifier().toLowerCase();
    this.take('(');
    return name;
  }

  hint(name: 'format' | 'tech'): void {
    this.skipSpace();
    if (name === 'format') {
      if (this.peek() === '"' || this.peek() === "'") {
        if (!this.string()) this.fail('empty format hint');
      } else if (!FONT_FORMATS.has(this.identifier().toLowerCase())) {
        this.fail('unknown unquoted format hint');
      }
    } else {
      const technology = (): void => {
        if (!FONT_TECHNOLOGIES.has(this.identifier().toLowerCase()))
          this.fail('unknown font technology hint');
      };
      technology();
      this.skipSpace();
      while (this.peek() === ',') {
        this.take(',');
        this.skipSpace();
        technology();
        this.skipSpace();
      }
    }
    this.skipSpace();
    this.take(')');
  }

  end(): void {
    this.skipSpace();
    if (this.peek()) this.fail('unsupported or invalid font descriptor syntax');
  }
}

const declarationValue = (declaration: Declaration): string =>
  declaration.raws.value?.raw ?? declaration.value;

export const collectGeistMonoFontFaceUrls = (css: string, from: string): string[] => {
  const fail = (message: string): never => {
    throw new Error(`[production-font-assets] Geist Mono: ${message} (${from})`);
  };
  const reader = (value: string): FontValueReader => new FontValueReader(value, fail);
  const identifier = (value: string): string => {
    const input = reader(value);
    const result = input.identifier().toLowerCase();
    input.end();
    return result;
  };
  const urls: string[] = [];
  const root = (() => {
    try {
      return postcss.parse(css, { from });
    } catch {
      return fail('invalid CSS syntax');
    }
  })();
  root.walkAtRules((face) => {
    // PostCSSはescaped at-keywordをnameとparamsへ分割するため、未対応のheaderは拒否する。
    if (face.raws.afterName === '' && face.params.startsWith('\\'))
      fail('escaped at-rule names are unsupported');
    if (identifier(face.name) !== 'font-face') return;
    const families: Declaration[] = [];
    const sources: Declaration[] = [];
    face.each((node) => {
      if (node.type !== 'decl') return;
      const property = identifier(node.prop);
      // PostCSSはlegacy property hackの*/_をraws.beforeへ移すため、descriptorとして採用しない。
      if (
        (property === 'font-family' || property === 'src') &&
        /[^\t\n\f\r ]/u.test(node.raws.before ?? '')
      )
        fail('unsupported font descriptor prefix');
      if (property === 'font-family') families.push(node);
      if (property === 'src') sources.push(node);
    });
    if (families.length > 1) fail('duplicate font-family descriptors');
    const family = families[0];
    if (!family) return;
    const familyReader = reader(declarationValue(family));
    const familyName = familyReader.family();
    familyReader.end();
    if (familyName.toLowerCase() !== GEIST_MONO_FAMILY) return;
    face.each((node) => {
      if (node.type !== 'decl' && node.type !== 'comment') fail('invalid font-face child');
    });
    if (family.important) fail('important font-family descriptor');
    if (face.params.trim()) fail('unexpected font-face parameters');
    if (sources.length !== 1) fail('expected exactly one src descriptor');
    const source = sources[0];
    if (!source || source.important) return fail('invalid src descriptor');
    const input = reader(declarationValue(source));
    const faceUrls: string[] = [];
    while (true) {
      input.skipSpace();
      const name = input.functionName();
      if (name === 'url') {
        faceUrls.push(input.url());
        let sawFormat = false;
        let sawTech = false;
        input.skipSpace();
        while (input.peek() && input.peek() !== ',') {
          const hint = input.functionName();
          if (hint === 'format' && !sawFormat && !sawTech) sawFormat = true;
          else if (hint === 'tech' && !sawTech) sawTech = true;
          else fail('unknown, duplicate or misplaced src hint');
          input.hint(hint === 'format' ? 'format' : 'tech');
          input.skipSpace();
        }
      } else if (name === 'local') {
        if (!input.family()) fail('empty local font name');
        input.skipSpace();
        input.take(')');
      } else fail('unsupported src function');
      input.skipSpace();
      if (input.peek() !== ',') break;
      input.take(',');
    }
    input.end();
    if (faceUrls.length === 0) fail('src must contain at least one URL; local-only is invalid');
    urls.push(...faceUrls);
  });
  return urls;
};
