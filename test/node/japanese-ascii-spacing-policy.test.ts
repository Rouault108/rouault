import { describe, expect, it } from 'vitest';

import {
  JAPANESE_PUNCTUATION,
  dedupeNormalizedFilePaths,
  detectJapaneseAsciiSpacingCandidates,
  isJapaneseCharacter,
  shouldIncludeFilePath,
} from '../../scripts/japanese-ascii-spacing-policy.js';

const detect = (text: string) =>
  detectJapaneseAsciiSpacingCandidates(text, {
    filePath: 'docs/example.md',
  });

describe('japanese-ascii-spacing-policy', () => {
  it('和文文字 + U+0020 + ASCII英数字を検出すること', () => {
    expect(detect('本文 Markdownを扱う').map((candidate) => candidate.reason)).to.deep.equal([
      'japanese-to-ascii',
    ]);
  });

  it('ASCII英数字 + U+0020 + 和文文字を検出すること', () => {
    expect(detect('Markdown を扱う').map((candidate) => candidate.reason)).to.deep.equal([
      'ascii-to-japanese',
    ]);
  });

  it('inline code span + U+0020 + 日本語助詞を検出すること', () => {
    expect(detect('`data-link-kind` を設定する').map((candidate) => candidate.reason)).to.deep.equal([
      'inline-code-to-japanese',
    ]);
  });

  it('日本語文字 + U+0020 + inline code spanを検出すること', () => {
    expect(detect('値 `data-link-kind`').map((candidate) => candidate.reason)).to.deep.equal([
      'japanese-to-inline-code',
    ]);
  });

  it('数値+単位列 + U+0020 + 日本語助詞を検出すること', () => {
    expect(detect('10 ms の遅延').map((candidate) => candidate.reason)).to.deep.equal([
      'number-unit-to-japanese',
    ]);
  });

  it('Markdown表セル本文内の和欧間スペース候補を検出すること', () => {
    expect(detect('| 項目 | Lit とTypeScript |\n|---|---|')).to.have.lengthOf(1);
  });

  it('fenced code block内部は検出しないこと', () => {
    expect(detect('```ts\nconst label = "Markdown を扱う";\n```')).to.deep.equal([]);
  });

  it('長いfence内の短いfence例は外側fenceの終了として扱わないこと', () => {
    expect(
      detect('````md\n```ts\nconst label = "Markdown を扱う";\n```\n````'),
    ).to.deep.equal([]);
  });

  it('inline code内部は検出しないこと', () => {
    expect(detect('`Markdown を扱う`')).to.deep.equal([]);
  });

  it('URL本体は検出しないこと', () => {
    expect(detect('https://example.com/Markdown を参照')).to.deep.equal([]);
  });

  it('URL直後の日本語助詞保護が複数行でも安定すること', () => {
    expect(
      detect('https://example.com/Markdown を参照\nhttps://example.com/CommonMark を参照'),
    ).to.deep.equal([]);
  });

  it('MarkdownリンクURL部分は検出しないこと', () => {
    expect(detect('[参照](https://example.com/Markdown を参照)')).to.deep.equal([]);
  });

  it('Markdown table alignment rowは検出しないこと', () => {
    expect(detect('| :--- | ---: |')).to.deep.equal([]);
  });

  it('Markdown表のpipe delimiter周辺padding spaceは検出しないこと', () => {
    expect(detect('| UI |')).to.deep.equal([]);
  });

  it('frontmatter keyは検出しないこと', () => {
    expect(detect('---\nASCII Key: 値\n---')).to.deep.equal([]);
  });

  it('ファイルパス本体は検出しないこと', () => {
    expect(detect('docs/guides/japanese-writing-style.md を参照')).to.deep.equal([]);
  });

  it('コマンド本体は検出しないこと', () => {
    expect(detect('pnpm run test:node を実行')).to.deep.equal([]);
  });

  it('include patternの重複一致ファイルを正規化し、重複除去できること', () => {
    expect(
      dedupeNormalizedFilePaths([
        'content\\program\\_config.json',
        './content/program/_config.json',
        'content/testing/_config.json',
      ]),
    ).to.deep.equal(['content/program/_config.json', 'content/testing/_config.json']);

    expect(shouldIncludeFilePath('content/program/_config.json')).toBe(true);
    expect(shouldIncludeFilePath('content/testing/_config.json')).toBe(true);
    expect(shouldIncludeFilePath('content/library/_config.json')).toBe(true);
    expect(shouldIncludeFilePath('content/program/csharp/_config.json')).toBe(true);
    expect(shouldIncludeFilePath('content/program/javascript/_config.json')).toBe(true);
    expect(shouldIncludeFilePath('content/testing/sidebar-scroll/_config.json')).toBe(true);
  });

  it('frozen-v85-referenceは対象に含め、r4-validation samples/schemas/toolsは対象外にすること', () => {
    expect(shouldIncludeFilePath('docs/workflows/problem-solving/frozen-v85-reference/README.md')).toBe(
      true,
    );
    expect(
      shouldIncludeFilePath('docs/workflows/problem-solving/r4-validation/samples/README.md'),
    ).toBe(false);
    expect(
      shouldIncludeFilePath('docs/workflows/problem-solving/r4-validation/schemas/README.md'),
    ).toBe(false);
    expect(
      shouldIncludeFilePath('docs/workflows/problem-solving/r4-validation/tools/README.md'),
    ).toBe(false);
  });

  it('Japanese punctuationの対象文字をfixtureで明示していること', () => {
    expect(JAPANESE_PUNCTUATION).to.deep.equal([
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
    ]);

    for (const punctuation of JAPANESE_PUNCTUATION) {
      expect(isJapaneseCharacter(punctuation), punctuation).toBe(true);
    }
  });
});
