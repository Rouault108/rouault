import { expect, fixture, html } from '@open-wc/testing';

import {
  LayoutSidebarNavInteractionController,
  findLayoutSidebarNav,
  syncLayoutSidebarNav,
} from '../../src/components/layout/layout-sidebar-nav.js';
import { dispatchKey, nextAnimationFrame } from './helpers/wait-for-lit.js';

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
              <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/explicit">
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
              <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/alpha">Alpha</a>
            </li>
            <li data-node-id="beta" data-node-kind="leaf" data-node-depth="0">
              <a data-sidebar-nav-control data-sidebar-nav-link href="/notes/beta">
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
