import { describe, expect, it } from 'vitest';
import {
  matchesViewportWidthMedia,
  normalizeProductionCssDeclarationValue,
} from '../../scripts/assert-production-css-artifacts.js';

describe('production CSS viewport media contract', () => {
  it.each([
    ['(width >= 1024px)', '(width >= 1024px)'],
    ['(min-width:1024px)', '(width >= 1024px)'],
    ['(width < 1024px)', '(width < 1024px)'],
    ['not (min-width:1024px)', '(width < 1024px)'],
    ['(min-width: 640px)', '(width >= 640px)'],
    ['not (min-width: 640px)', '(width < 640px)'],
  ])('同じ境界と包含条件の表現を受け入れる: %s', (actual, expected) => {
    expect(matchesViewportWidthMedia(actual, expected)).toBe(true);
  });

  it.each([
    ['(max-width:1024px)', '(width < 1024px)'],
    ['(min-width:1024px)', '(width < 1024px)'],
    ['not (min-width:1024px)', '(width >= 1024px)'],
    ['(width > 1024px)', '(width >= 1024px)'],
    ['(width <= 1024px)', '(width < 1024px)'],
    ['(min-width:1023px)', '(width >= 1024px)'],
    ['not (min-width:639px)', '(width < 640px)'],
    ['(min-height:1024px)', '(width >= 1024px)'],
    ['screen and (min-width:1024px)', '(width >= 1024px)'],
    ['(min-width:1024px), print', '(width >= 1024px)'],
    ['not(min-width:1024px)', '(width < 1024px)'],
    ['(width > = 1024px)', '(width >= 1024px)'],
  ])('境界・feature・構文が異なる条件を拒否する: %s', (actual, expected) => {
    expect(matchesViewportWidthMedia(actual, expected)).toBe(false);
  });
});

describe('production CSS declaration comparison', () => {
  it('先頭のzero trackを揃え、残りのtrackを維持する', () => {
    expect(
      normalizeProductionCssDeclarationValue('grid-template-columns', '0px minmax(0, 1fr)'),
    ).toBe(normalizeProductionCssDeclarationValue('grid-template-columns', '0 minmax(0,1fr)'));
  });

  it.each(['1px minmax(0,1fr)', '0% minmax(0,1fr)', '0 minmax(1px,1fr)', '0 minmax(0,2fr)'])(
    '異なるtrackを同一視しない: %s',
    (value) => {
      expect(normalizeProductionCssDeclarationValue('grid-template-columns', value)).not.toBe(
        normalizeProductionCssDeclarationValue('grid-template-columns', '0px minmax(0,1fr)'),
      );
    },
  );

  it('他propertyやcalc内のunitを変換しない', () => {
    expect(normalizeProductionCssDeclarationValue('width', '0px')).toBe('0px');
    expect(
      normalizeProductionCssDeclarationValue('grid-template-columns', 'calc(0px + 1em) 1fr'),
    ).toBe('calc(0px + 1em) 1fr');
  });
});
