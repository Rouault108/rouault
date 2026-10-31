import { describe, expect, it } from 'vitest';
import { normalizeBlackShadowSerialization } from '../e2e/support/shadow-css-value.js';

describe('black shadow CSSOM serialization', () => {
  it.each(['0.05', '0.1', '0.3', '0.4', '0.5'])('同じ透明度の黒だけを揃える: %s', (alpha) => {
    expect(normalizeBlackShadowSerialization(`lab(0 0 0 / ${alpha}) 0px 4px 6px -1px`)).toBe(
      `oklch(0 0 0 / ${alpha}) 0px 4px 6px -1px`,
    );
  });

  it('不透明な黒を揃える', () => {
    expect(normalizeBlackShadowSerialization('lab(0 0 0) 0px 1px 2px 0px')).toBe(
      'oklch(0 0 0) 0px 1px 2px 0px',
    );
  });

  it('複数の影でも色付きの影と順序を保持する', () => {
    expect(
      normalizeBlackShadowSerialization(
        'lab(0 0 0 / 0.1) 0px 4px 6px -1px, oklch(0.55 0.22 250 / 0.6) 0px 0px 8px 0px',
      ),
    ).toBe('oklch(0 0 0 / 0.1) 0px 4px 6px -1px, oklch(0.55 0.22 250 / 0.6) 0px 0px 8px 0px');
  });

  it.each([
    'lab(0.01 0 0 / 0.1) 0px 4px 6px -1px',
    'lab(0 0.01 0 / 0.1) 0px 4px 6px -1px',
    'lab(0 0 0.01 / 0.1) 0px 4px 6px -1px',
    'lab(0 0 0 / 0.12) 0px 4px 6px -1px',
    'lab(0 0 0 / 0.1) 1px 4px 6px -1px',
    'lab(0 0 0 / 0.1) 0px 4px 7px -1px',
    'lab(0 0 0 / 0.1) 0px 4px 6px 0px',
    'lab(0 0 0 / 0.1) 0px 4px 6px -1px inset',
    'none',
  ])('色・透明度・形状・消失の差を同一視しない: %s', (actual) => {
    expect(normalizeBlackShadowSerialization(actual)).not.toBe(
      normalizeBlackShadowSerialization('oklch(0 0 0 / 0.1) 0px 4px 6px -1px'),
    );
  });

  it('glowの色相の差を保持する', () => {
    expect(
      normalizeBlackShadowSerialization('oklch(0.55 0.22 123 / 0.6) 0px 0px 8px 0px'),
    ).not.toBe(normalizeBlackShadowSerialization('oklch(0.55 0.22 250 / 0.6) 0px 0px 8px 0px'));
  });
});
