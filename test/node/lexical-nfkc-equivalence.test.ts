import { describe, expect, it } from 'vitest';
import { mapNfkc } from '../../shared/search/lexical-analyzer.js';
import { mapNfkcReference } from '../fixtures/search/map-nfkc-reference.js';

describe('adopted NFKC source-span equivalence', () => {
  const cases = [
    '',
    'ASCII camelCase\r\n42',
    '日本語'.repeat(267),
    '𠮷田葛󠄀飾',
    'ＡＢＣ㍿Ⅳﬃ①',
    'ｶﾞﾊﾟ',
    'e\u0301a\u0323\u0302',
    '\u1100\u1161\u11a8',
    '\u212b\u0323',
    'x\u0301\u0323\u0300',
    ' '.repeat(5) + 'が\tカ\u3099\nＡＢＣ',
  ];
  it.each(cases)('preserves normalized text and every UTF-16 source span: %s', (value) => {
    expect(mapNfkc(value)).toEqual(mapNfkcReference(value));
  });
  it('preserves mixed normalization, reordering, expansion and astral spans across deterministic inputs', () => {
    const alphabet = Array.from(
      '漢字かなカナＡＢＣabc012ｶﾞﾊﾟ㍿①ﬃⅣ𠮷\u0301\u0323\u0300\u3099\u1100\u1161\u11a8 \t\n',
    );
    let seed = 123456789;
    for (let sample = 0; sample < 128; sample++) {
      let input = '';
      for (let i = 0; i < 128; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        input += alphabet[seed % alphabet.length] ?? '';
      }
      expect(mapNfkc(input), `sample ${String(sample)}`).toEqual(mapNfkcReference(input));
    }
  });
});
