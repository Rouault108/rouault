import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixtureAbortController } from './harness/browser-fixture.js';
import { nativeNoteFixture, element, text } from './harness/native-note-fixture.js';
import { activateTabs, readTabsSelection } from '../../src/client/post-hydrate/tabs-enhancer.js';
import type { UiTabChangeDetail } from '../../src/components/ui/tabs/tabs.types.js';
import {
  clearTabsUrlSyncStrategy,
  registerTabsUrlSyncStrategy,
} from '../../src/components/ui/tabs/tabs-url-sync-strategy.js';
import { primaryTabTabsUrlSyncStrategy } from '../../src/components/app/navigation/primary-tab-url-state.js';
import { dispatchKey, waitForCondition } from './harness/browser-test-utilities.js';
import { fetchCssText } from './helpers/fetch-css-text.js';

const must = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

const asHtmlElements = (elements: Iterable<Element>): HTMLElement[] =>
  Array.from(elements).filter((element): element is HTMLElement => element instanceof HTMLElement);

describe('ui-tabs browser contract', () => {
  beforeEach(() => {
    registerTabsUrlSyncStrategy(primaryTabTabsUrlSyncStrategy);
  });

  afterEach(() => {
    clearTabsUrlSyncStrategy();
  });

  const withThreeTabs = element('ui-tabs', {}, [
    element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
    element('div', { slot: 'panel' }, [text('概要パネル')]),
    element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
    element('div', { slot: 'panel' }, [text('詳細パネル')]),
    element('button', { slot: 'tab', value: 'settings' }, [text('設定')]),
    element('div', { slot: 'panel' }, [text('設定パネル')]),
  ]);

  it.each(['horizontal', 'vertical'] as const)(
    '%s tabsの装飾は、収まるlabelに不要なscroll領域を作らない',
    async (orientation) => {
      const tabs = await nativeNoteFixture<HTMLElement>(
        element('ui-tabs', { orientation }, withThreeTabs.children ?? []),
      );
      // CSSもfixture内へ置き、他testへstylesheetを持ち越さない。
      const style = document.createElement('style');
      style.textContent = await fetchCssText('/src/assets/css/tabs.css');
      tabs.prepend(style);
      tabs.style.width = '600px';
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      const nav = must(tabs.querySelector<HTMLElement>('[data-tabs-static-nav]'), 'tab navigation');
      const indicator = must(
        nav.querySelector<HTMLElement>('[data-tabs-indicator]'),
        'tab indicator',
      );
      await waitForCondition(
        () =>
          orientation === 'horizontal'
            ? indicator.style.width !== ''
            : indicator.style.height !== '',
        'indicator layout',
      );
      expect(nav.scrollWidth).toBe(nav.clientWidth);
      expect(nav.scrollHeight).toBe(nav.clientHeight);
    },
  );

  const replaceUrl = (url: string): (() => void) => {
    const original = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    history.replaceState(history.state, '', url);
    return () => history.replaceState(history.state, '', original);
  };

  const spyOnHistoryWrites = (): {
    pushUrls: string[];
    replaceUrls: string[];
    restore: () => void;
  } => {
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    const pushUrls: string[] = [];
    const replaceUrls: string[] = [];

    history.pushState = ((data: unknown, unused: string, url?: string | URL | null) => {
      if (url !== undefined && url !== null) {
        pushUrls.push(url.toString());
      }
      originalPushState(data, unused, url);
    }) as typeof history.pushState;

    history.replaceState = ((data: unknown, unused: string, url?: string | URL | null) => {
      if (url !== undefined && url !== null) {
        replaceUrls.push(url.toString());
      }
      originalReplaceState(data, unused, url);
    }) as typeof history.replaceState;

    return {
      pushUrls,
      replaceUrls,
      restore: () => {
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
      },
    };
  };

  it('初期描画で tab / tabpanel / roving tabindex を公開すること', async () => {
    const tabs = await nativeNoteFixture<HTMLElement>(withThreeTabs);
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

    const tabEls = asHtmlElements(tabs.querySelectorAll('[data-tab]'));
    const panelEls = asHtmlElements(tabs.querySelectorAll('[data-tab-panel]'));
    const tablist = tabs.querySelector<HTMLElement>('[role="tablist"]') ?? null;

    const firstTab = must(tabEls[0], '1 番目の tab が見つかりません');
    const secondTab = must(tabEls[1], '2 番目の tab が見つかりません');
    const firstPanel = must(panelEls[0], '1 番目の panel が見つかりません');
    const secondPanel = must(panelEls[1], '2 番目の panel が見つかりません');

    expect(tablist?.getAttribute('aria-orientation')).to.equal('horizontal');
    expect(tabEls.map((tab) => tab.getAttribute('role'))).to.deep.equal(['tab', 'tab', 'tab']);
    expect(panelEls.map((panel) => panel.getAttribute('role'))).to.deep.equal([
      'tabpanel',
      'tabpanel',
      'tabpanel',
    ]);

    expect(firstTab.getAttribute('aria-selected')).to.equal('true');
    expect(secondTab.getAttribute('aria-selected')).to.equal('false');
    expect(firstTab.getAttribute('tabindex')).to.equal('0');
    expect(secondTab.getAttribute('tabindex')).to.equal('-1');
    expect(firstPanel.hasAttribute('hidden')).to.equal(false);
    expect(secondPanel.hasAttribute('hidden')).to.equal(true);

    const controls = secondTab.getAttribute('aria-controls');
    expect(controls).to.be.a('string');
    expect(secondPanel.id).to.equal(controls);
    expect(secondPanel.getAttribute('aria-labelledby')).to.equal(secondTab.getAttribute('id'));
  });

  it('manual activation では矢印キーで focus のみ移動し、Enter で選択を確定すること', async () => {
    const tabs = await nativeNoteFixture<HTMLElement>(withThreeTabs);
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

    const tabEls = asHtmlElements(tabs.querySelectorAll('[data-tab]'));
    const firstTab = must(tabEls[0], '1 番目の tab が見つかりません');
    const secondTab = must(tabEls[1], '2 番目の tab が見つかりません');
    const thirdTab = must(tabEls[2], '3 番目の tab が見つかりません');

    firstTab.focus();
    dispatchKey(firstTab, 'ArrowRight');
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

    expect(secondTab.getAttribute('tabindex')).to.equal('0');
    expect(firstTab.getAttribute('aria-selected')).to.equal('true');
    expect(readTabsSelection(tabs)).to.equal('overview');

    dispatchKey(secondTab, 'Enter');
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

    expect(secondTab.getAttribute('aria-selected')).to.equal('true');
    expect(readTabsSelection(tabs)).to.equal('details');

    dispatchKey(secondTab, 'End');
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');
    expect(thirdTab.getAttribute('tabindex')).to.equal('0');

    dispatchKey(thirdTab, 'Home');
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');
    expect(firstTab.getAttribute('tabindex')).to.equal('0');
  });

  it('automatic activation は矢印キーでfocusと選択panelを同時に切り替えること', async () => {
    const tabs = await nativeNoteFixture<HTMLElement>(
      element('ui-tabs', { 'automatic-activation': '' }, [
        element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
        element('div', { slot: 'panel' }, [text('概要パネル')]),
        element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
        element('div', { slot: 'panel' }, [text('詳細パネル')]),
      ]),
    );
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');
    const first = must(
      tabs.querySelector<HTMLAnchorElement>('[data-tab-value="overview"]'),
      '概要tab',
    );
    const second = must(
      tabs.querySelector<HTMLAnchorElement>('[data-tab-value="details"]'),
      '詳細tab',
    );
    const panels = tabs.querySelectorAll<HTMLElement>('[data-tab-panel]');
    first.focus();
    dispatchKey(first, 'ArrowRight');
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

    expect(document.activeElement).to.equal(second);
    expect(readTabsSelection(tabs)).to.equal('details');
    expect(second.getAttribute('aria-selected')).to.equal('true');
    expect(first.getAttribute('aria-selected')).to.equal('false');
    expect(must(panels[0], '概要panel').getAttribute('aria-hidden')).to.equal('true');
    await expect.poll(() => must(panels[0], '概要panel').hidden).toBe(true);
    expect(must(panels[1], '詳細panel').hidden).to.equal(false);
  });

  it('vertical では ArrowUp / ArrowDown を使い、ArrowLeft は選択移動に使わないこと', async () => {
    const tabs = await nativeNoteFixture<HTMLElement>(
      element('ui-tabs', { orientation: 'vertical' }, [
        element('button', { slot: 'tab', value: 'a' }, [text('A')]),
        element('div', { slot: 'panel' }, [text('A panel')]),
        element('button', { slot: 'tab', value: 'b' }, [text('B')]),
        element('div', { slot: 'panel' }, [text('B panel')]),
        element('button', { slot: 'tab', value: 'c' }, [text('C')]),
        element('div', { slot: 'panel' }, [text('C panel')]),
      ]),
    );
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

    const tabEls = asHtmlElements(tabs.querySelectorAll('[data-tab]'));
    const firstTab = must(tabEls[0], '1 番目の tab が見つかりません');
    const secondTab = must(tabEls[1], '2 番目の tab が見つかりません');

    firstTab.focus();
    dispatchKey(firstTab, 'ArrowDown');
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');
    expect(secondTab.getAttribute('tabindex')).to.equal('0');

    dispatchKey(secondTab, 'ArrowLeft');
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');
    expect(secondTab.getAttribute('tabindex')).to.equal('0');

    dispatchKey(secondTab, 'ArrowUp');
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');
    expect(firstTab.getAttribute('tabindex')).to.equal('0');
  });

  it('ui-tab-change.detail に value / prevIndex / scopeId を載せること', async () => {
    const tabs = await nativeNoteFixture<HTMLElement>(
      element('ui-tabs', { 'data-toc-scope': 'toc-scope-story' }, [
        element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
        element('div', { slot: 'panel' }, [text('概要パネル')]),
        element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
        element('div', { slot: 'panel' }, [text('詳細パネル')]),
      ]),
    );
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

    const observedPromise = new Promise<UiTabChangeDetail>((resolve) => {
      const handleChange = (event: Event): void => {
        if (event instanceof CustomEvent) {
          resolve(event.detail as UiTabChangeDetail);
        }
      };

      tabs.addEventListener('ui-tab-change', handleChange, { once: true });
    });

    const detailTab = must(
      tabs.querySelector<HTMLElement>('[data-tab][data-tab-value="details"]'),
      'details tab が見つかりません',
    );
    detailTab.click();
    activateTabs(tabs, fixtureAbortController(tabs).signal);
    await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

    const detail = await observedPromise;
    expect(detail.value).to.equal('details');
    expect(detail.prevIndex).to.equal(0);
    expect(detail.index).to.equal(1);
    expect(detail.scopeId).to.equal('toc-scope-story');
  });

  it('url-sync は初期 query を読み取り、クリックで ?tab= を更新すること', async () => {
    const restore = replaceUrl('/?tab=details');

    try {
      const tabs = await nativeNoteFixture<HTMLElement>(
        element('ui-tabs', { 'url-sync': '' }, [
          element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
          element('div', { slot: 'panel' }, [text('概要パネル')]),
          element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
          element('div', { slot: 'panel' }, [text('詳細パネル')]),
        ]),
      );
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

      const detailTab = must(
        tabs.querySelector<HTMLElement>('[data-tab][data-tab-value="details"]'),
        'details tab が見つかりません',
      );
      const overviewTab = must(
        tabs.querySelector<HTMLElement>('[data-tab][data-tab-value="overview"]'),
        'overview tab が見つかりません',
      );

      expect(detailTab.getAttribute('aria-selected')).to.equal('true');
      overviewTab.click();
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

      expect(window.location.search).to.contain('tab=overview');
    } finally {
      restore();
    }
  });

  it('url-sync は host-owned hash を query より優先し replaceState で ?tab= を正規化すること', async () => {
    const restoreUrl = replaceUrl('/?tab=details#overview-heading');
    const historySpy = spyOnHistoryWrites();

    try {
      const tabs = await nativeNoteFixture<HTMLElement>(
        element('ui-tabs', { 'url-sync': '' }, [
          element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
          element('div', { slot: 'panel' }, [
            element('h3', { id: 'overview-heading' }, [text('概要見出し')]),
          ]),
          element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
          element('div', { slot: 'panel' }, [
            element('h3', { id: 'details-heading' }, [text('詳細見出し')]),
          ]),
        ]),
      );
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

      const overviewTab = must(
        tabs.querySelector<HTMLElement>('[data-tab][data-tab-value="overview"]'),
        'overview tab が見つかりません',
      );
      const detailTab = must(
        tabs.querySelector<HTMLElement>('[data-tab][data-tab-value="details"]'),
        'details tab が見つかりません',
      );

      expect(overviewTab.getAttribute('aria-selected')).to.equal('true');
      expect(detailTab.getAttribute('aria-selected')).to.equal('false');
      expect(window.location.search).to.equal('?tab=overview');
      expect(window.location.hash).to.equal('#overview-heading');
      expect(historySpy.pushUrls).to.deep.equal([]);
      expect(historySpy.replaceUrls).to.deep.equal(['/?tab=overview#overview-heading']);
    } finally {
      historySpy.restore();
      restoreUrl();
    }
  });

  it('url-sync は hash-only direct access で host-owned hash の tab を選択し ?tab= を補うこと', async () => {
    const restoreUrl = replaceUrl('/#details-heading');
    const historySpy = spyOnHistoryWrites();

    try {
      const tabs = await nativeNoteFixture<HTMLElement>(
        element('ui-tabs', { 'url-sync': '' }, [
          element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
          element('div', { slot: 'panel' }, [
            element('h3', { id: 'overview-heading' }, [text('概要見出し')]),
          ]),
          element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
          element('div', { slot: 'panel' }, [
            element('h3', { id: 'details-heading' }, [text('詳細見出し')]),
          ]),
        ]),
      );
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

      const overviewTab = must(
        tabs.querySelector<HTMLElement>('[data-tab][data-tab-value="overview"]'),
        'overview tab が見つかりません',
      );
      const detailTab = must(
        tabs.querySelector<HTMLElement>('[data-tab][data-tab-value="details"]'),
        'details tab が見つかりません',
      );

      expect(overviewTab.getAttribute('aria-selected')).to.equal('false');
      expect(detailTab.getAttribute('aria-selected')).to.equal('true');
      expect(window.location.search).to.equal('?tab=details');
      expect(window.location.hash).to.equal('#details-heading');
      expect(historySpy.pushUrls).to.deep.equal([]);
      expect(historySpy.replaceUrls).to.deep.equal(['/?tab=details#details-heading']);
    } finally {
      historySpy.restore();
      restoreUrl();
    }
  });

  it('url-sync は host 外 hash / unknown hash / malformed hash では ?tab= を新規生成しないこと', async () => {
    const cases = ['/#outside-heading', '/#unknown-heading', '/#%E0%A4%A'];

    for (const url of cases) {
      const outside = document.createElement('h2');
      outside.id = 'outside-heading';
      document.body.append(outside);
      const restoreUrl = replaceUrl(url);
      const historySpy = spyOnHistoryWrites();

      try {
        const tabs = await nativeNoteFixture<HTMLElement>(
          element('ui-tabs', { 'url-sync': '' }, [
            element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
            element('div', { slot: 'panel' }, [
              element('h3', { id: 'overview-heading' }, [text('概要見出し')]),
            ]),
            element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
            element('div', { slot: 'panel' }, [
              element('h3', { id: 'details-heading' }, [text('詳細見出し')]),
            ]),
          ]),
        );
        activateTabs(tabs, fixtureAbortController(tabs).signal);
        await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

        const overviewTab = must(
          tabs.querySelector<HTMLElement>('[data-tab][data-tab-value="overview"]'),
          'overview tab が見つかりません',
        );
        const detailTab = must(
          tabs.querySelector<HTMLElement>('[data-tab][data-tab-value="details"]'),
          'details tab が見つかりません',
        );

        expect(overviewTab.getAttribute('aria-selected')).to.equal('true');
        expect(detailTab.getAttribute('aria-selected')).to.equal('false');
        expect(window.location.search).to.equal('');
        expect(historySpy.pushUrls).to.deep.equal([]);
        expect(historySpy.replaceUrls).to.deep.equal([]);
      } finally {
        historySpy.restore();
        restoreUrl();
        outside.remove();
      }
    }
  });

  it('url-sync は host 外 hash への location 同期で controlled selection を保持しないこと', async () => {
    const outside = document.createElement('h2');
    outside.id = 'outside-heading';
    document.body.append(outside);

    const restoreUrl = replaceUrl('/?tab=details');
    const historySpy = spyOnHistoryWrites();

    try {
      const tabs = await nativeNoteFixture<HTMLElement>(
        element('ui-tabs', { 'url-sync': '' }, [
          element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
          element('div', { slot: 'panel' }, [
            element('h3', { id: 'overview-heading' }, [text('概要見出し')]),
          ]),
          element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
          element('div', { slot: 'panel' }, [
            element('h3', { id: 'details-heading' }, [text('詳細見出し')]),
          ]),
        ]),
      );
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

      expect(readTabsSelection(tabs)).to.equal('details');

      history.replaceState(history.state, '', '/#outside-heading');
      historySpy.pushUrls.length = 0;
      historySpy.replaceUrls.length = 0;

      window.dispatchEvent(new HashChangeEvent('hashchange'));
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

      expect(readTabsSelection(tabs)).to.equal('details');
      expect(window.location.search).to.equal('');
      expect(window.location.hash).to.equal('#outside-heading');
      expect(historySpy.pushUrls).to.deep.equal([]);
      expect(historySpy.replaceUrls).to.deep.equal([]);
    } finally {
      historySpy.restore();
      restoreUrl();
      outside.remove();
    }
  });

  it('url-sync は無効な query 値を有効 activeValue へ replaceState で回復すること', async () => {
    const restoreUrl = replaceUrl('/?tab=missing');
    const historySpy = spyOnHistoryWrites();

    try {
      const tabs = await nativeNoteFixture<HTMLElement>(
        element('ui-tabs', { 'url-sync': '', 'default-selected-value': 'details' }, [
          element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
          element('div', { slot: 'panel' }, [text('概要パネル')]),
          element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
          element('div', { slot: 'panel' }, [text('詳細パネル')]),
        ]),
      );
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

      const detailTab = must(
        tabs.querySelector<HTMLElement>('[data-tab][data-tab-value="details"]'),
        'details tab が見つかりません',
      );

      expect(detailTab.getAttribute('aria-selected')).to.equal('true');
      expect(window.location.search).to.equal('?tab=details');
      expect(historySpy.pushUrls).to.deep.equal([]);
      expect(historySpy.replaceUrls).to.deep.equal(['/?tab=details']);
    } finally {
      historySpy.restore();
      restoreUrl();
    }
  });

  it('url-sync は空白のみ query と source=null 初期表示で ?tab= を新規生成しないこと', async () => {
    for (const url of ['/?tab=%20', '/']) {
      const restoreUrl = replaceUrl(url);
      const historySpy = spyOnHistoryWrites();

      try {
        const tabs = await nativeNoteFixture<HTMLElement>(
          element('ui-tabs', { 'url-sync': '' }, [
            element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
            element('div', { slot: 'panel' }, [text('概要パネル')]),
            element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
            element('div', { slot: 'panel' }, [text('詳細パネル')]),
          ]),
        );
        activateTabs(tabs, fixtureAbortController(tabs).signal);
        await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

        expect(readTabsSelection(tabs)).to.equal('overview');
        expect(window.location.search).to.equal(url === '/' ? '' : '?tab=%20');
        expect(historySpy.pushUrls).to.deep.equal([]);
        expect(historySpy.replaceUrls).to.deep.equal([]);
      } finally {
        historySpy.restore();
        restoreUrl();
      }
    }
  });

  it('url-sync は query 値が activeValue と一致する場合に副作用的な query 正規化をしないこと', async () => {
    const restoreUrl = replaceUrl('/?tag=lit&tab=details&tab=overview');
    const historySpy = spyOnHistoryWrites();

    try {
      const tabs = await nativeNoteFixture<HTMLElement>(
        element('ui-tabs', { 'url-sync': '' }, [
          element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
          element('div', { slot: 'panel' }, [text('概要パネル')]),
          element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
          element('div', { slot: 'panel' }, [text('詳細パネル')]),
        ]),
      );
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

      expect(readTabsSelection(tabs)).to.equal('details');
      expect(window.location.search).to.equal('?tag=lit&tab=details&tab=overview');
      expect(historySpy.pushUrls).to.deep.equal([]);
      expect(historySpy.replaceUrls).to.deep.equal([]);
    } finally {
      historySpy.restore();
      restoreUrl();
    }
  });

  it('url-sync は内側 ui-tabs 配下 hash を外側 ui-tabs の host-owned hash として採用しないこと', async () => {
    const restoreUrl = replaceUrl('/#inner-heading');
    const historySpy = spyOnHistoryWrites();

    try {
      const tabs = await nativeNoteFixture<HTMLElement>(
        element('ui-tabs', { 'url-sync': '' }, [
          element('button', { slot: 'tab', value: 'overview' }, [text('概要')]),
          element('section', { slot: 'panel' }, [
            element('h3', { id: 'overview-heading' }, [text('概要見出し')]),
            element('ui-tabs', {}, [
              element('button', { slot: 'tab', value: 'inner' }, [text('Inner')]),
              element('section', { slot: 'panel' }, [
                element('h4', { id: 'inner-heading' }, [text('Inner heading')]),
              ]),
            ]),
          ]),
          element('button', { slot: 'tab', value: 'details' }, [text('詳細')]),
          element('section', { slot: 'panel' }, [
            element('h3', { id: 'details-heading' }, [text('詳細見出し')]),
          ]),
        ]),
      );
      activateTabs(tabs, fixtureAbortController(tabs).signal);
      await waitForCondition(() => tabs.hasAttribute('data-tabs-enhanced'), 'tabs enhanced');

      expect(readTabsSelection(tabs)).to.equal('overview');
      expect(window.location.search).to.equal('');
      expect(historySpy.pushUrls).to.deep.equal([]);
      expect(historySpy.replaceUrls).to.deep.equal([]);
    } finally {
      historySpy.restore();
      restoreUrl();
    }
  });
});
