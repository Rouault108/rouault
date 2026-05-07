import { expect } from '@open-wc/testing';
import type { TocActiveTracker } from '../../src/toc/toc-active-tracker.js';
import {
  shouldCloseMobilePanelAfterTocNavigation,
  TocNavigationController,
} from '../../src/toc/toc-navigation-controller.js';

const createTrackerStub = (): TocActiveTracker =>
  ({
    beginProgrammaticNavigation: () => undefined,
    finishProgrammaticNavigation: () => undefined,
    beginPostSettlementHold: () => undefined,
    cancelProgrammaticNavigation: () => undefined,
    canHoldProgrammaticTarget: () => true,
  }) as unknown as TocActiveTracker;

const createClickEventForLink = (link: HTMLAnchorElement): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    composed: true,
    cancelable: true,
    button: 0,
  });

  Object.defineProperty(event, 'composedPath', {
    configurable: true,
    value: () => [link, link.parentElement, document.body, document, window],
  });

  return event;
};

describe('TocNavigationController', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  });

  it('content root 内で heading id が重複する場合は click を所有しないこと', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <h2 id="dup">Duplicate 1</h2>
        <h2 id="dup">Duplicate 2</h2>
      </article>
      <a href="#dup" data-toc-link data-heading-id="dup">Duplicate</a>
    `;

    const contentRoot = document.getElementById('content-root');
    const link = document.querySelector('a[data-toc-link]');
    if (!(contentRoot instanceof HTMLElement) || !(link instanceof HTMLAnchorElement)) {
      throw new Error('TOC navigation fixture の構築に失敗しました。');
    }

    let activeId = '';
    const controller = new TocNavigationController();
    const event = createClickEventForLink(link);
    const result = controller.handleTocLinkClick(event, {
      tocRuntimeId: 'test-toc',
      contentRoot,
      tracker: createTrackerStub(),
      getActiveId: () => activeId,
      applyActiveId: (id) => {
        activeId = id;
      },
    });

    expect(result).to.deep.equal({ owned: false, reason: 'target-not-unique' });
    expect(event.defaultPrevented).to.equal(false);
    expect(activeId).to.equal('');
  });

  it('activeTracking=false 相当でも所有した click は active id を適用すること', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <h2 id="a b">Section</h2>
      </article>
      <a href="#a%20b" data-toc-link data-heading-id="a b">Section</a>
    `;

    const contentRoot = document.getElementById('content-root');
    const target = document.getElementById('a b');
    const link = document.querySelector('a[data-toc-link]');
    if (
      !(contentRoot instanceof HTMLElement) ||
      !(target instanceof HTMLElement) ||
      !(link instanceof HTMLAnchorElement)
    ) {
      throw new Error('TOC navigation fixture の構築に失敗しました。');
    }

    document.documentElement.style.scrollPaddingTop = '0px';
    target.style.scrollMarginTop = '0px';
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 100,
          bottom: 24,
          width: 100,
          height: 24,
          toJSON: () => undefined,
        }) satisfies DOMRect,
    });

    let activeId = '';
    const controller = new TocNavigationController();
    const event = createClickEventForLink(link);
    const result = controller.handleTocLinkClick(event, {
      tocRuntimeId: 'test-toc',
      contentRoot,
      tracker: createTrackerStub(),
      getActiveId: () => activeId,
      applyActiveId: (id) => {
        activeId = id;
      },
    });

    expect(result.owned).to.equal(true);
    expect(event.defaultPrevented).to.equal(true);
    expect(activeId).to.equal('a b');
    expect(window.location.hash).to.equal('#a%20b');

    document.documentElement.style.scrollPaddingTop = '';
  });

  it('別タブ target の TOC link は click を所有しないこと', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <h2 id="section">Section</h2>
      </article>
      <a href="#section" target="_blank" data-toc-link data-heading-id="section">Section</a>
    `;

    const contentRoot = document.getElementById('content-root');
    const link = document.querySelector('a[data-toc-link]');
    if (!(contentRoot instanceof HTMLElement) || !(link instanceof HTMLAnchorElement)) {
      throw new Error('TOC navigation fixture の構築に失敗しました。');
    }

    let activeId = '';
    const controller = new TocNavigationController();
    const event = createClickEventForLink(link);
    const result = controller.handleTocLinkClick(event, {
      tocRuntimeId: 'test-toc',
      contentRoot,
      tracker: createTrackerStub(),
      getActiveId: () => activeId,
      applyActiveId: (id) => {
        activeId = id;
      },
    });

    expect(result).to.deep.equal({ owned: false, reason: 'external-url' });
    expect(event.defaultPrevented).to.equal(false);
    expect(activeId).to.equal('');
  });

  it('href decode 結果と data-heading-id が不一致なら active と hash を変更しないこと', () => {
    document.body.innerHTML = `
      <article id="content-root">
        <h2 id="section">Section</h2>
      </article>
      <a href="#other" data-toc-link data-heading-id="section">Section</a>
    `;

    const contentRoot = document.getElementById('content-root');
    const link = document.querySelector('a[data-toc-link]');
    if (!(contentRoot instanceof HTMLElement) || !(link instanceof HTMLAnchorElement)) {
      throw new Error('TOC navigation fixture の構築に失敗しました。');
    }

    let activeId = '';
    const controller = new TocNavigationController();
    const event = createClickEventForLink(link);
    const result = controller.handleTocLinkClick(event, {
      tocRuntimeId: 'test-toc',
      contentRoot,
      tracker: createTrackerStub(),
      getActiveId: () => activeId,
      applyActiveId: (id) => {
        activeId = id;
      },
    });

    expect(result).to.deep.equal({ owned: false, reason: 'href-data-id-mismatch' });
    expect(event.defaultPrevented).to.equal(false);
    expect(activeId).to.equal('');
    expect(window.location.hash).to.equal('');
  });

  it('owned navigation が mobile panel nav 内の link なら close 対象にすること', () => {
    document.body.innerHTML = `
      <nav data-layout-toc-mobile-nav>
        <a href="#section" data-toc-link data-heading-id="section">Section</a>
      </nav>
      <a href="#section" data-toc-link data-heading-id="section" id="desktop-link">Section</a>
    `;

    const mobileNav = document.querySelector<HTMLElement>('[data-layout-toc-mobile-nav]');
    const mobileLink = mobileNav?.querySelector<HTMLAnchorElement>('a[data-toc-link]');
    const desktopLink = document.querySelector<HTMLAnchorElement>('#desktop-link');
    if (
      !(mobileNav instanceof HTMLElement) ||
      !(mobileLink instanceof HTMLAnchorElement) ||
      !(desktopLink instanceof HTMLAnchorElement)
    ) {
      throw new Error('mobile panel navigation fixture の構築に失敗しました。');
    }

    expect(
      shouldCloseMobilePanelAfterTocNavigation(
        { owned: true, targetId: 'section', link: mobileLink },
        mobileNav,
      ),
    ).to.equal(true);
    expect(
      shouldCloseMobilePanelAfterTocNavigation(
        { owned: true, targetId: 'section', link: desktopLink },
        mobileNav,
      ),
    ).to.equal(false);
    expect(
      shouldCloseMobilePanelAfterTocNavigation({ owned: false, reason: 'empty-hash' }, mobileNav),
    ).to.equal(false);
  });
});
