import { describe, expect, it } from 'vitest';

import {
  findLinkUnderlineContractViolations,
  hasDeclarationForSelector,
  listCssFiles,
  readCssFile,
} from './support/css-contract.js';

describe('link underline css contract', () => {
  it('does not define broad link underline in static screen css', () => {
    const violations = listCssFiles().flatMap((filePath) => {
      const { cssText } = readCssFile(filePath);
      return findLinkUnderlineContractViolations(filePath, cssText);
    });

    expect(violations).toEqual([]);
  });

  it('treats ordinary media rules as screen scope but excludes print and forced-colors', () => {
    const cssText = `
      @media (min-width: 640px) {
        .layout-toc__link[href] { text-decoration: none; }
      }
      @media print {
        .print-only[href] { text-decoration: none; }
      }
      @media (forced-colors: active) {
        .forced-only[href] { text-decoration: none; }
      }
    `;

    expect(
      hasDeclarationForSelector(
        cssText,
        '.layout-toc__link[href]',
        'text-decoration',
        'none',
        { scope: 'screen' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(cssText, '.print-only[href]', 'text-decoration', 'none', {
        scope: 'screen',
      }),
    ).toBe(false);
    expect(
      hasDeclarationForSelector(cssText, '.forced-only[href]', 'text-decoration', 'none', {
        scope: 'screen',
      }),
    ).toBe(false);
  });

  it('matches selector declarations without requiring selector list grouping', () => {
    const cssText = `
      .one[href],
      .two[href],
      .three[href] {
        text-decoration: none;
      }
    `;

    expect(
      hasDeclarationForSelector(cssText, '.two[href]', 'text-decoration', 'none', {
        scope: 'screen',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        '.three[href]',
        'text-decoration',
        'none',
        { scope: 'screen' },
      ),
    ).toBe(true);
  });

  it('checks text-decoration-line, allows print underline, and rejects base footnote underline', () => {
    const cssText = `
      @media print {
        a[href] { text-decoration-line: underline; }
      }
      a[data-footnote-ref='true'][role='doc-noteref']:hover { text-decoration-line: underline; }
      a[data-footnote-ref] { text-decoration-line: underline; }
    `;

    expect(findLinkUnderlineContractViolations('fixture.css', cssText)).toEqual([
      {
        filePath: 'fixture.css',
        selector: 'a[data-footnote-ref]',
        property: 'text-decoration-line',
        value: 'underline',
        scope: 'screen',
        reason: 'broad link underline must use an explicit link surface',
      },
    ]);
  });
});
