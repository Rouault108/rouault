import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/search/canonical-v3.json' with { type: 'json' };
import { createBuildAnalyzer } from '../../build/search/create-build-analyzer.js';
import { mapNfkc, retrievalFlags } from '../../shared/search/lexical-analyzer.js';

describe('rouault-lexical-v3', () => {
  it('2起動・逆順で採用済み1867入力のtokenと原文offsetを再現する', async () => {
    expect(fixtures.fixtures).toHaveLength(1867);
    for (let boot = 0; boot < 2; boot++) {
      const analyzer = await createBuildAnalyzer();
      try {
        for (const fixture of boot ? [...fixtures.fixtures].reverse() : fixtures.fixtures) {
          const result = analyzer.analyze(fixture.input);
          const expected = Object.fromEntries(
            Object.entries(fixture).filter(([key]) => key !== 'id' && key !== 'input'),
          );
          expect(result, fixture.id).toMatchObject(expected);
          for (const token of [...result.wordOccurrences, ...result.gramOccurrences]) {
            expect(
              fixture.input
                .slice(token.startUtf16, token.endUtf16)
                .normalize('NFKC')
                .replace(/[A-Z]/gu, (c) => c.toLowerCase()),
            ).toContain(token.surface);
          }
        }
      } finally {
        analyzer.dispose();
      }
      expect(() => analyzer.analyze('test')).toThrow('disposed');
    }
  }, 60000);

  it('NFKC合成・展開を原文の被覆範囲へ対応させる', () => {
    expect(mapNfkc('ｶﾞ')).toEqual({ text: 'ガ', spans: [{ start: 0, end: 2 }] });
    expect(mapNfkc('ﬃ')).toEqual({
      text: 'ffi',
      spans: Array.from({ length: 3 }, () => ({ start: 0, end: 1 })),
    });
    expect(mapNfkc('A\u030a 𠮷').text).toBe('Å 𠮷');
  });

  it('prefixは末尾だけ、fuzzyはASCII4文字以上だけ、gramはexactだけ', () => {
    expect(retrievalFlags(['hello', '世界'])).toEqual([
      { token: 'hello', prefix: false, fuzzy: 1 },
      { token: '世界', prefix: true, fuzzy: false },
    ]);
    expect(retrievalFlags(['hello'], true)).toEqual([
      { token: 'hello', prefix: false, fuzzy: false },
    ]);
    expect(retrievalFlags(['x'])).toEqual([{ token: 'x', prefix: false, fuzzy: false }]);
  });
});
