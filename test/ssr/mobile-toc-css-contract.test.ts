import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const mainCss = readFileSync(resolve(process.cwd(), 'src/assets/css/main.css'), 'utf8');

describe('mobile toc css contract', () => {
  it('mobile shell collapses TOC holder into a zero-height host while keeping one-column shells', () => {
    expect(mainCss).toContain('@media (max-width: 639px)');

    expect(mainCss).toMatch(
      /\.note-shell,\s*\.note-shell\[data-toc-presence='present'\],\s*\.note-shell\[data-toc-presence='absent'\],\s*\.about-shell\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);\s*row-gap:\s*0;/s,
    );

    expect(mainCss).toMatch(
      /\.note-shell\[data-toc-presence='present'\]\s+\.layout-toc-col,\s*\.about-shell\s+\.layout-toc-col\s*\{\s*grid-column:\s*1;\s*position:\s*static;\s*block-size:\s*0;\s*min-block-size:\s*0;\s*max-block-size:\s*none;\s*overflow:\s*visible;\s*transform:\s*none;\s*\}/s,
    );
  });
});