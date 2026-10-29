import { afterEach, describe, expect, it } from 'vitest';
import { ensureMainCssLoaded } from './helpers/load-main-css.js';
import { waitForStyleRecalc } from './harness/browser-test-utilities.js';

const fixed = { narrow: 6.66, numeric: 6.66, medium: 11.1, wide: 17.76 } as const;
const originalSize = document.documentElement.style.fontSize;
let fixture: HTMLElement | null = null;
afterEach(() => {
  fixture?.remove();
  fixture = null;
  document.documentElement.style.fontSize = originalSize;
});

describe('table column hints track font size without glyph-width dependence', () => {
  for (const size of [16, 32]) {
    it(`all contexts retain binding hints, visible tabs and overflow access at root ${size}px`, async () => {
      await ensureMainCssLoaded();
      document.documentElement.style.fontSize = `${size}px`;
      fixture = document.createElement('div');
      for (const surface of ['prose', 'about-prose']) {
        for (const compact of [false, true]) {
          const section = document.createElement('div');
          section.className = surface;
          section.style.width = '100px';
          section.innerHTML = `<div data-table-root tabindex="0" role="region" aria-label="width fixture" ${compact ? 'data-density="compact"' : ''}>
            <table><colgroup>${Object.keys(fixed)
              .map((role) => `<col data-table-col-width="${role}">`)
              .join('')}</colgroup>
            <tbody><tr><td>A</td><td>1</td><td>B</td><td>C</td></tr></tbody></table></div>`;
          fixture.append(section);
        }
      }
      const tabs = document.createElement('div');
      tabs.className = 'prose';
      tabs.style.width = '100px';
      tabs.innerHTML = `<div data-tabs-root><div data-tab-panel hidden>${fixture.firstElementChild?.innerHTML ?? ''}</div></div>`;
      fixture.append(tabs);
      document.body.append(fixture);
      await waitForStyleRecalc();
      const panel = tabs.querySelector<HTMLElement>('[data-tab-panel]');
      if (!panel) throw new Error('missing tab panel');
      expect(panel.getClientRects().length).toBe(0);
      panel.hidden = false;
      await waitForStyleRecalc();
      expect(panel.getClientRects().length).toBeGreaterThan(0);
      for (const table of fixture.querySelectorAll('table')) {
        const cols = [...table.querySelectorAll('col')];
        const firstRow = table.rows.item(0);
        if (!firstRow) throw new Error('missing fixture row');
        const cells = [...firstRow.cells];
        for (const [index, col] of cols.entries()) {
          const role = col.getAttribute('data-table-col-width') as keyof typeof fixed;
          const colSize = Number.parseFloat(getComputedStyle(col).fontSize);
          expect(colSize).toBe(size);
          const cell = cells[index];
          if (!cell) throw new Error('missing fixture cell');
          expect(
            Math.abs(cell.getBoundingClientRect().width - fixed[role] * colSize),
          ).toBeLessThanOrEqual(1);
        }
        const root = table.parentElement;
        if (!root) throw new Error('missing fixture root');
        expect(root.scrollWidth).toBeGreaterThan(root.clientWidth);
        expect(root.tabIndex).toBe(0);
        root.scrollLeft = root.scrollWidth;
        expect(root.scrollLeft).toBeGreaterThan(0);
      }
    });
  }
});
