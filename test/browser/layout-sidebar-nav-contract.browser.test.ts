import { html } from 'lit/static-html.js';
import { describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';

import { ensureMainCssLoaded } from './helpers/load-main-css.js';
import { withDocumentTheme } from './helpers/document-theme.js';
import {
  compositeOver,
  expectContrast,
  expectVisiblePseudoPaint,
  resolveComputedColor,
  resolvePaintedElementBackground,
  resolvePseudoColor,
} from './helpers/color-contrast.js';

import { waitForStyleRecalc } from './harness/browser-test-utilities.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

describe('layout-sidebar-nav paint contract', () => {
  const navMarkup = `
    <nav data-sidebar-nav aria-label="ノートナビゲーション">
      <ul>
        <li data-node-id="music" data-node-kind="branch" data-node-depth="0" data-current-branch="true" data-current-path-indicator="true">
          <details data-sidebar-nav-branch open><summary data-sidebar-nav-control data-sidebar-nav-branch-control aria-controls="sidebar-group-music">
            <span data-sidebar-nav-label>Music</span>
            <span data-sidebar-nav-disclosure aria-hidden="true">
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="M6 3.5L10.5 8L6 12.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>
            </span>
          </summary>
          <ul id="sidebar-group-music">
            <li data-node-id="music/mozart" data-node-kind="leaf" data-node-depth="1">
              <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/music/mozart" data-link-kind="internal-document" data-link-surface="navigation" aria-current="page"><span data-sidebar-nav-label>Mozart</span></a>
            </li>
          </ul></details>
        </li>
      </ul>
    </nav>
  `;

  const renderSurface = async (): Promise<{
    surface: HTMLElement;
    shellNav: HTMLElement;
    currentLink: HTMLAnchorElement;
    branchControl: HTMLElement;
  }> => {
    await ensureMainCssLoaded();
    const surface = await fixture<HTMLElement>(html`<aside data-layout-sidebar-root></aside>`);
    surface.innerHTML = navMarkup;
    await waitForStyleRecalc();
    const shellNav = document.body;
    const currentLink = expectPresent(
      surface.querySelector<HTMLAnchorElement>('[data-sidebar-nav-link][aria-current="page"]'),
      'current link',
    );
    const branchControl = expectPresent(
      surface.querySelector<HTMLElement>(
        'li[data-current-branch="true"] > details > [data-sidebar-nav-control]',
      ),
      'current branch',
    );
    return { surface, shellNav, currentLink, branchControl };
  };

  for (const theme of ['light', 'dark'] as const) {
    it(`${theme} theme で current page の surface / indicator contrast を満たすこと`, async () => {
      await withDocumentTheme(theme, async () => {
        const { surface, shellNav, currentLink } = await renderSurface();
        const shellBackground = resolvePaintedElementBackground(shellNav, surface);
        expect(shellBackground.a, 'shell painted background alpha').to.equal(1);

        const foreground = resolveComputedColor(
          getComputedStyle(currentLink).color,
          currentLink,
          'color',
        );
        expect(foreground.a, 'current page foreground alpha').to.equal(1);

        const activeSurface = resolvePseudoColor(currentLink, '::before', 'background-color');
        expectVisiblePseudoPaint(
          currentLink,
          '::before',
          activeSurface,
          'current page active surface',
        );

        const indicator = resolvePseudoColor(currentLink, '::after', 'background-color');
        expectVisiblePseudoPaint(currentLink, '::after', indicator, 'current page indicator');

        const paintedActiveSurface = compositeOver(activeSurface, shellBackground);
        const paintedIndicator = compositeOver(indicator, paintedActiveSurface);

        expectContrast(foreground, paintedActiveSurface, 4.5);
        expectContrast(paintedIndicator, paintedActiveSurface, 3);
      });
    });

    it(`${theme} theme で current branch は非 hover surface を持たず indicator contrast を満たすこと`, async () => {
      await withDocumentTheme(theme, async () => {
        const { surface, shellNav, branchControl } = await renderSurface();
        const shellBackground = resolvePaintedElementBackground(shellNav, surface);
        const branchSurface = resolvePseudoColor(branchControl, '::before', 'background-color');
        expect(branchSurface.a, 'current branch base surface raw alpha').to.be.lessThanOrEqual(
          0.001,
        );

        const branchIndicator = resolvePseudoColor(branchControl, '::after', 'background-color');
        expectVisiblePseudoPaint(
          branchControl,
          '::after',
          branchIndicator,
          'current branch indicator',
        );
        const paintedBranchIndicator = compositeOver(branchIndicator, shellBackground);
        expectContrast(paintedBranchIndicator, shellBackground, 3);
      });
    });
  }
});
