import { html } from 'lit/static-html.js';
import { describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import '../../src/components/layout/layout-sidebar-surface.js';
import '../../src/components/ui/sidebar-shell/sidebar-shell.js';

import type { LayoutSidebarSurface } from '../../src/components/layout/layout-sidebar-surface.js';
import type { UiSidebarShell } from '../../src/components/ui/sidebar-shell/sidebar-shell.js';
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

import {
  LayoutSidebarNavInteractionController,
  findLayoutSidebarNav,
  syncLayoutSidebarNav,
} from '../../src/components/layout/layout-sidebar-nav.js';
import { dispatchKey, nextAnimationFrame, waitForStyleRecalc } from './harness/browser-test-utilities.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

describe('layout-sidebar-nav explicit contract', () => {
  it('runtime が metadata を持つ control だけを拾うこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <nav data-sidebar-nav aria-label="ノートナビゲーション">
          <ul>
            <li data-node-id="legacy" data-node-kind="leaf" data-node-depth="0">
              <a href="/notes/legacy">Legacy</a>
            </li>
            <li data-node-id="explicit" data-node-kind="leaf" data-node-depth="0">
              <a
                data-sidebar-nav-control
                data-sidebar-nav-link
                href="/notes/explicit"
                data-link-kind="internal-document"
                data-link-surface="navigation"
              >
                <span data-sidebar-nav-label>Explicit</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    `);

    const nav = expectPresent(findLayoutSidebarNav(wrapper), 'nav');
    const activeId = syncLayoutSidebarNav(nav, {
      selectedId: 'legacy',
      expandedIds: new Set(),
      activeId: null,
    });

    const legacyLink = expectPresent(
      wrapper.querySelector<HTMLAnchorElement>('li[data-node-id="legacy"] > a'),
      'legacyLink',
    );
    const explicitLink = expectPresent(
      wrapper.querySelector<HTMLAnchorElement>('li[data-node-id="explicit"] > a'),
      'explicitLink',
    );

    expect(activeId).to.equal('explicit');
    expect(legacyLink.getAttribute('aria-current')).to.equal(null);
    expect(explicitLink.tabIndex).to.equal(0);
  });

  it('label 解決が explicit label 契約に依存すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <nav data-sidebar-nav aria-label="ノートナビゲーション">
          <ul>
            <li data-node-id="alpha" data-node-kind="leaf" data-node-depth="0">
              <a
                data-sidebar-nav-control
                data-sidebar-nav-link
                href="/notes/alpha"
                data-link-kind="internal-document"
                data-link-surface="navigation"
                >Alpha</a
              >
            </li>
            <li data-node-id="beta" data-node-kind="leaf" data-node-depth="0">
              <a
                data-sidebar-nav-control
                data-sidebar-nav-link
                href="/notes/beta"
                data-link-kind="internal-document"
                data-link-surface="navigation"
              >
                <span data-sidebar-nav-label>Beta</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    `);

    const nav = expectPresent(findLayoutSidebarNav(wrapper), 'nav');
    const alphaLink = expectPresent(
      wrapper.querySelector<HTMLAnchorElement>('li[data-node-id="alpha"] > a'),
      'alphaLink',
    );
    const betaLink = expectPresent(
      wrapper.querySelector<HTMLAnchorElement>('li[data-node-id="beta"] > a'),
      'betaLink',
    );

    syncLayoutSidebarNav(nav, {
      selectedId: 'alpha',
      expandedIds: new Set(),
      activeId: 'alpha',
    });

    const controller = new LayoutSidebarNavInteractionController({
      onToggle: () => undefined,
      onSelect: () => undefined,
      onActiveChange: () => undefined,
    });
    controller.connect(nav);

    alphaLink.focus();
    dispatchKey(alphaLink, 'b');
    await nextAnimationFrame();
    expect(document.activeElement).to.equal(betaLink);

    dispatchKey(betaLink, 'a');
    await nextAnimationFrame();
    expect(document.activeElement).to.equal(betaLink);

    controller.disconnect();
  });

  it('active fallback は data-current-branch だけを読み data-current-path-indicator だけの branch を候補にしないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <nav data-sidebar-nav aria-label="ノートナビゲーション">
          <ul>
            <li data-node-id="alpha" data-node-kind="leaf" data-node-depth="0">
              <a
                data-sidebar-nav-control
                data-sidebar-nav-link
                href="/notes/alpha"
                data-link-kind="internal-document"
                data-link-surface="navigation"
              >
                <span data-sidebar-nav-label>Alpha</span>
              </a>
            </li>
            <li
              data-node-id="branch"
              data-node-kind="branch"
              data-node-depth="0"
              data-current-branch="true"
              data-current-path-indicator="true"
            >
              <button
                type="button"
                data-sidebar-nav-control
                data-sidebar-nav-branch-control
                aria-expanded="true"
              >
                <span data-sidebar-nav-label>Branch</span>
              </button>
              <ul>
                <li data-node-id="branch/leaf" data-node-kind="leaf" data-node-depth="1">
                  <a
                    data-sidebar-nav-control
                    data-sidebar-nav-link
                    href="/notes/branch/leaf"
                    data-link-kind="internal-document"
                    data-link-surface="navigation"
                  >
                    <span data-sidebar-nav-label>Leaf</span>
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    `);

    const nav = expectPresent(findLayoutSidebarNav(wrapper), 'nav');
    const branch = expectPresent(
      wrapper.querySelector<HTMLLIElement>('li[data-node-id="branch"]'),
      'branch',
    );

    const activeWithCurrentBranch = syncLayoutSidebarNav(nav, {
      selectedId: null,
      expandedIds: new Set(['branch']),
      activeId: null,
    });

    expect(activeWithCurrentBranch).to.equal('branch');
    expect(branch.getAttribute('data-current-branch')).to.equal('true');
    expect(branch.getAttribute('data-current-path-indicator')).to.equal('true');

    branch.removeAttribute('data-current-branch');
    const activeWithPathIndicatorOnly = syncLayoutSidebarNav(nav, {
      selectedId: null,
      expandedIds: new Set(['branch']),
      activeId: null,
    });

    expect(activeWithPathIndicatorOnly).to.equal('alpha');
    expect(branch.getAttribute('data-current-branch')).to.equal(null);
    expect(branch.getAttribute('data-current-path-indicator')).to.equal('true');
  });

  it('metadata を外した fixture では interaction が成立しないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <nav data-sidebar-nav aria-label="ノートナビゲーション">
          <ul>
            <li data-node-id="branch" data-node-kind="branch" data-node-depth="0">
              <button type="button" aria-expanded="false">Branch</button>
              <ul hidden>
                <li data-node-id="leaf" data-node-kind="leaf" data-node-depth="1">
                  <a href="/notes/leaf">Leaf</a>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    `);

    const nav = expectPresent(findLayoutSidebarNav(wrapper), 'nav');
    nav.addEventListener('click', (event) => {
      event.preventDefault();
    });
    const branchButton = expectPresent(
      wrapper.querySelector<HTMLButtonElement>('li[data-node-id="branch"] > button'),
      'branchButton',
    );
    const legacyLeafLink = expectPresent(
      wrapper.querySelector<HTMLAnchorElement>('li[data-node-id="leaf"] > a'),
      'legacyLeafLink',
    );

    const interactions = {
      toggles: 0,
      selects: 0,
    };
    const controller = new LayoutSidebarNavInteractionController({
      onToggle: () => {
        interactions.toggles += 1;
      },
      onSelect: () => {
        interactions.selects += 1;
      },
      onActiveChange: () => undefined,
    });
    controller.connect(nav);

    const activeId = syncLayoutSidebarNav(nav, {
      selectedId: 'leaf',
      expandedIds: new Set(['branch']),
      activeId: null,
    });

    branchButton.click();
    legacyLeafLink.click();
    await nextAnimationFrame();

    expect(activeId).to.equal(null);
    expect(interactions.toggles).to.equal(0);
    expect(interactions.selects).to.equal(0);
    expect(branchButton.getAttribute('aria-expanded')).to.equal('false');

    controller.disconnect();
  });
});

describe('layout-sidebar-nav paint contract', () => {
  const navMarkup = `
    <nav data-sidebar-nav aria-label="ノートナビゲーション">
      <ul>
        <li data-node-id="music" data-node-kind="branch" data-node-depth="0" data-current-branch="true" data-current-path-indicator="true">
          <button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="true" aria-controls="sidebar-group-music">
            <span data-sidebar-nav-label>Music</span>
            <span data-sidebar-nav-disclosure aria-hidden="true">
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="M6 3.5L10.5 8L6 12.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>
            </span>
          </button>
          <ul id="sidebar-group-music">
            <li data-node-id="music/mozart" data-node-kind="leaf" data-node-depth="1">
              <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/music/mozart" data-link-kind="internal-document" data-link-surface="navigation" aria-current="page"><span data-sidebar-nav-label>Mozart</span></a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  `;

  const renderSurface = async (): Promise<{
    surface: LayoutSidebarSurface;
    shell: UiSidebarShell;
    shellNav: HTMLElement;
    currentLink: HTMLAnchorElement;
    branchControl: HTMLButtonElement;
  }> => {
    await ensureMainCssLoaded();
    const surface = await fixture<LayoutSidebarSurface>(html`
      <layout-sidebar-surface .navMarkup=${navMarkup}></layout-sidebar-surface>
    `);
    await surface.updateComplete;
    const shell = expectPresent(
      surface.querySelector<UiSidebarShell>('ui-sidebar-shell'),
      'ui-sidebar-shell',
    );
    await shell.updateComplete;
    await waitForStyleRecalc();
    const shellNav = expectPresent(
      shell.shadowRoot?.querySelector<HTMLElement>('nav'),
      'shell nav',
    );
    const currentLink = expectPresent(
      surface.querySelector<HTMLAnchorElement>('[data-sidebar-nav-link][aria-current="page"]'),
      'current link',
    );
    const branchControl = expectPresent(
      surface.querySelector<HTMLButtonElement>(
        'li[data-current-branch="true"] > [data-sidebar-nav-control]',
      ),
      'current branch',
    );
    return { surface, shell, shellNav, currentLink, branchControl };
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
