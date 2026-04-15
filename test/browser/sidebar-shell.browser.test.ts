import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '../../src/components/ui/sidebar-shell/sidebar-shell.js';
import type {
  UiSidebarShell,
  UiSidebarStateChangeDetail,
} from '../../src/components/ui/sidebar-shell/sidebar-shell.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const getNav = (host: UiSidebarShell): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('nav') ?? null;

const getScrim = (host: UiSidebarShell): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.scrim') ?? null;

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const waitForStateChange = (host: UiSidebarShell): Promise<UiSidebarStateChangeDetail> =>
  new Promise((resolve) => {
    host.addEventListener(
      'ui-sidebar-state-change',
      ((event: Event) => {
        if (event instanceof CustomEvent) {
          resolve(event.detail as UiSidebarStateChangeDetail);
        }
      }) as EventListener,
      { once: true },
    );
  });

describe('ui-sidebar-shell browser contract', () => {
  it('overlay では expand / collapse に伴って focus を移し、trigger へ返すこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button id="trigger">開く</button>
        <ui-sidebar-shell id="shell" mode="overlay" data-state="collapsed">
          <button id="inside-header" slot="header">現在のジャンル</button>
          <a href="#note-a">ノート A</a>
          <a href="#note-b">ノート B</a>
        </ui-sidebar-shell>
      </div>
    `);

    const trigger = expectPresent(wrapper.querySelector<HTMLButtonElement>('#trigger'), 'trigger');
    const shell = expectPresent(wrapper.querySelector<UiSidebarShell>('#shell'), 'shell');
    const headerButton = expectPresent(
      wrapper.querySelector<HTMLButtonElement>('#inside-header'),
      'headerButton',
    );

    await waitForLitUpdate(shell);

    const nav = expectPresent(getNav(shell), 'nav');
    expect(nav.inert).to.equal(true);
    expect(nav.style.visibility).to.equal('hidden');

    trigger.focus();

    const expandPromise = waitForStateChange(shell);
    shell.expand(trigger);
    const expandDetail = await expandPromise;
    await waitForLitUpdate(shell);

    expect(expandDetail.state).to.equal('expanded');
    expect(expandDetail.mode).to.equal('overlay');
    expect(nav.inert).to.equal(false);
    expect(nav.style.visibility).to.equal('visible');
    await waitUntil(
      () => document.activeElement === headerButton,
      'overlay expand 後に header の先頭 focusable へ focus が移ること',
    );

    const collapsePromise = waitForStateChange(shell);
    shell.collapse();
    const collapseDetail = await collapsePromise;
    await waitForLitUpdate(shell);

    expect(collapseDetail.state).to.equal('collapsed');
    expect(collapseDetail.mode).to.equal('overlay');
    expect(nav.inert).to.equal(true);
    expect(nav.style.visibility).to.equal('hidden');
    expect(document.activeElement).to.equal(trigger);
  });

  it('state change event は bubble せず、属性とプロパティが双方向同期すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div id="parent">
        <ui-sidebar-shell id="shell" mode="fixed" data-state="expanded">
          <a href="#note-a">ノート A</a>
        </ui-sidebar-shell>
      </div>
    `);

    const shell = expectPresent(wrapper.querySelector<UiSidebarShell>('#shell'), 'shell');

    await waitForLitUpdate(shell);

    let bubbledCount = 0;
    wrapper.addEventListener('ui-sidebar-state-change', () => {
      bubbledCount += 1;
    });

    const collapsePromise = waitForStateChange(shell);
    shell.setAttribute('data-state', 'collapsed');
    const collapseDetail = await collapsePromise;
    await waitForLitUpdate(shell);

    expect(collapseDetail.state).to.equal('collapsed');
    expect(collapseDetail.mode).to.equal('fixed');
    expect(shell.state).to.equal('collapsed');
    expect(bubbledCount).to.equal(0);

    const expandPromise = waitForStateChange(shell);
    shell.state = 'expanded';
    await expandPromise;
    await waitForLitUpdate(shell);

    expect(shell.getAttribute('data-state')).to.equal('expanded');
  });

  it('overlay では Escape で close request を出すが、fixed では無視すること', async () => {
    const overlay = await fixture<UiSidebarShell>(html`
      <ui-sidebar-shell mode="overlay" data-state="expanded">
        <button slot="header">Header</button>
        <a href="#note-a">ノート A</a>
      </ui-sidebar-shell>
    `);

    await waitForLitUpdate(overlay);

    const overlayNav = expectPresent(getNav(overlay), 'overlayNav');
    const overlayClosed = new Promise<{ reason: string }>((resolve) => {
      overlay.addEventListener(
        'ui-sidebar-request-close',
        ((event: Event) => {
          resolve((event as CustomEvent<{ reason: string }>).detail);
        }) as EventListener,
        { once: true },
      );
    });
    dispatchKey(overlayNav, 'Escape');
    const overlayDetail = await overlayClosed;
    await waitForLitUpdate(overlay);

    expect(overlayDetail).to.deep.equal({ reason: 'escape' });
    expect(overlay.state).to.equal('expanded');

    const fixed = await fixture<UiSidebarShell>(html`
      <ui-sidebar-shell mode="fixed" data-state="expanded">
        <button slot="header">Header</button>
        <a href="#note-a">ノート A</a>
      </ui-sidebar-shell>
    `);

    await waitForLitUpdate(fixed);

    const fixedNav = expectPresent(getNav(fixed), 'fixedNav');
    dispatchKey(fixedNav, 'Escape');
    await nextAnimationFrame();

    expect(fixed.state).to.equal('expanded');
  });

  it('scrim click では close request を出すが、state は親が変えるまで維持すること', async () => {
    const shell = await fixture<UiSidebarShell>(html`
      <ui-sidebar-shell mode="overlay" data-state="expanded">
        <a href="#note-a">ノート A</a>
      </ui-sidebar-shell>
    `);

    await waitForLitUpdate(shell);

    const scrim = expectPresent(getScrim(shell), 'scrim');
    const closeRequest = new Promise<{ reason: string }>((resolve) => {
      shell.addEventListener(
        'ui-sidebar-request-close',
        ((event: Event) => {
          resolve((event as CustomEvent<{ reason: string }>).detail);
        }) as EventListener,
        { once: true },
      );
    });

    scrim.click();
    await nextAnimationFrame();

    expect(await closeRequest).to.deep.equal({ reason: 'scrim' });
    expect(shell.state).to.equal('expanded');
  });
});
