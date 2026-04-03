import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/header/header.js';
import type {
  UiHeader,
  UiHeaderSidebarToggleDetail,
} from '../../src/components/ui/header/header.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const waitForHeaderToggle = (header: UiHeader): Promise<CustomEvent<UiHeaderSidebarToggleDetail>> =>
  new Promise((resolve) => {
    header.addEventListener(
      'ui-header-sidebar-toggle',
      ((event: Event) => {
        resolve(event as CustomEvent<UiHeaderSidebarToggleDetail>);
      }) as EventListener,
      { once: true },
    );
  });

describe('ui-header browser contract', () => {
  it('初回 render では event を発火せず、sidebarExpanded 変更時だけ non-bubbling event を出すこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div id="parent">
        <ui-header id="header" sidebar-expanded></ui-header>
      </div>
    `);

    const header = expectPresent(wrapper.querySelector<UiHeader>('#header'), 'header');
    await waitForLitUpdate(header);

    let bubbledCount = 0;
    wrapper.addEventListener('ui-header-sidebar-toggle', () => {
      bubbledCount += 1;
    });

    const collapsePromise = waitForHeaderToggle(header);
    header.sidebarExpanded = false;
    const collapseEvent = await collapsePromise;
    await waitForLitUpdate(header);

    expect(collapseEvent.detail.expanded).to.equal(false);
    expect(collapseEvent.bubbles).to.equal(false);
    expect(collapseEvent.composed).to.equal(false);
    expect(header.hasAttribute('sidebar-expanded')).to.equal(false);
    expect(bubbledCount).to.equal(0);

    const expandPromise = waitForHeaderToggle(header);
    header.setAttribute('sidebar-expanded', '');
    const expandEvent = await expandPromise;
    await waitForLitUpdate(header);

    expect(expandEvent.detail.expanded).to.equal(true);
    expect(header.sidebarExpanded).to.equal(true);
  });

  it('start / center / compact-center / end の 4 slot を公開すること', async () => {
    const header = await fixture<UiHeader>(html`
      <ui-header>
        <button id="start" slot="start" type="button">戻る</button>
        <nav id="center" slot="center">パンくず</nav>
        <span id="compact" slot="compact-center">現在地</span>
        <button id="end" slot="end" type="button">検索</button>
      </ui-header>
    `);

    await waitForLitUpdate(header);

    const startSlot = expectPresent(
      header.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="start"]'),
      'startSlot',
    );
    const centerSlot = expectPresent(
      header.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="center"]'),
      'centerSlot',
    );
    const compactCenterSlot = expectPresent(
      header.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="compact-center"]'),
      'compactCenterSlot',
    );
    const endSlot = expectPresent(
      header.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="end"]'),
      'endSlot',
    );

    expect(startSlot.assignedElements()).to.have.length(1);
    expect(centerSlot.assignedElements()).to.have.length(1);
    expect(compactCenterSlot.assignedElements()).to.have.length(1);
    expect(endSlot.assignedElements()).to.have.length(1);
  });

  it('empty center slot 構成でも header 本体と zone を維持すること', async () => {
    const header = await fixture<UiHeader>(html`
      <ui-header sidebar-expanded>
        <button slot="start" type="button">戻る</button>
        <button slot="end" type="button">検索</button>
      </ui-header>
    `);

    await waitForLitUpdate(header);

    const headerElement = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('header'),
      'headerElement',
    );
    const startZone = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.zone-start'),
      'startZone',
    );
    const centerZone = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.zone-center'),
      'centerZone',
    );
    const compactCenterZone = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.zone-compact-center'),
      'compactCenterZone',
    );
    const endZone = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.zone-end'),
      'endZone',
    );

    expect(headerElement).to.not.equal(null);
    expect(startZone).to.not.equal(null);
    expect(centerZone).to.not.equal(null);
    expect(compactCenterZone).to.not.equal(null);
    expect(endZone).to.not.equal(null);
    expect(header.hasAttribute('sidebar-expanded')).to.equal(true);
  });
});
