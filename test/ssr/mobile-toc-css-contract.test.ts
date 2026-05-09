import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  TOC_MOBILE_PANEL_CSS_ARTIFACT_PATH,
  TOC_MOBILE_PANEL_CSS_CONTRACT,
  TOC_MOBILE_PANEL_SELECTOR,
  TOC_MOBILE_PANEL_STYLING_SELECTOR,
} from '../../src/toc/toc-mobile-panel-dom-css-contract.js';
import { hasDeclarationForSelectorInMedia } from './support/css-contract.js';

const mainCss = readFileSync(resolve(process.cwd(), 'src/assets/css/main.css'), 'utf8');
const layoutTocCss = readFileSync(resolve(process.cwd(), 'src/assets/css/layout-toc.css'), 'utf8');

describe('mobile toc css contract', () => {
  it('mobile panel contract points at the shared layout toc CSS artifact', () => {
    expect(TOC_MOBILE_PANEL_SELECTOR).toBe('[data-layout-toc-mobile-panel]');
    expect(TOC_MOBILE_PANEL_STYLING_SELECTOR).toBe('.layout-toc-mobile-panel');
    expect(TOC_MOBILE_PANEL_CSS_ARTIFACT_PATH).toBe('src/assets/css/layout-toc.css');
    expect(TOC_MOBILE_PANEL_CSS_CONTRACT.stylingSelector).toBe('.layout-toc-mobile-panel');
    expect(mainCss).toContain("@import './layout-toc.css';");
  });

  it('mobile shell collapses TOC holder into a zero-height host while keeping one-column shells', () => {
    expect(mainCss).toContain('@media (max-width: 639px)');

    expect(mainCss).toMatch(
      /\.note-shell,\s*\.note-shell\[data-toc-presence='present'\],\s*\.note-shell\[data-toc-presence='absent'\],\s*\.about-shell\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);\s*row-gap:\s*0;/s,
    );

    expect(mainCss).toMatch(
      /\.note-shell\[data-toc-presence='present'\]\s+\.layout-toc-col,\s*\.about-shell\s+\.layout-toc-col\s*\{\s*grid-column:\s*1;\s*position:\s*static;\s*block-size:\s*0;\s*min-block-size:\s*0;\s*max-block-size:\s*none;\s*overflow:\s*visible;\s*transform:\s*none;\s*\}/s,
    );
  });

  it('mobileでは shell 種別に依存せず SSR 静的 TOC nav を非表示にすること', () => {
    expect(
      hasDeclarationForSelectorInMedia(
        layoutTocCss,
        (params) => /\bmax-width\s*:\s*639px\b/u.test(params),
        '.layout-toc-col [data-layout-toc-nav]',
        'display',
        'none',
      ),
    ).toBe(true);
  });
});
