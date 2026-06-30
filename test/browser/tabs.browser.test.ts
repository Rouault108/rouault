import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/tabs/tabs.js';
import type { Tabs } from '../../src/components/ui/tabs/tabs.js';
import type { UiTabChangeDetail } from '../../src/components/ui/tabs/tabs.types.js';
import {
  clearTabsUrlSyncStrategy,
  registerTabsUrlSyncStrategy,
} from '../../src/components/ui/tabs/tabs-url-sync-strategy.js';
import { primaryTabTabsUrlSyncStrategy } from '../../src/components/app/navigation/primary-tab-url-state.js';
import { dispatchKey, waitForLitUpdate } from './helpers/wait-for-lit.js';

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

  const withThreeTabs = html`
    <ui-tabs>
      <button slot="tab" value="overview">概要</button>
      <div slot="panel">概要パネル</div>
      <button slot="tab" value="details">詳細</button>
      <div slot="panel">詳細パネル</div>
      <button slot="tab" value="settings">設定</button>
      <div slot="panel">設定パネル</div>
    </ui-tabs>
  `;

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
    const tabs = await fixture<Tabs>(withThreeTabs);
    await waitForLitUpdate(tabs);

    const tabEls = asHtmlElements(tabs.querySelectorAll('[slot="tab"]'));
    const panelEls = asHtmlElements(tabs.querySelectorAll('[slot="panel"]'));
    const tablist = tabs.shadowRoot?.querySelector<HTMLElement>('[role="tablist"]') ?? null;

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
    const tabs = await fixture<Tabs>(withThreeTabs);
    await waitForLitUpdate(tabs);

    const tabEls = asHtmlElements(tabs.querySelectorAll('[slot="tab"]'));
    const firstTab = must(tabEls[0], '1 番目の tab が見つかりません');
    const secondTab = must(tabEls[1], '2 番目の tab が見つかりません');
    const thirdTab = must(tabEls[2], '3 番目の tab が見つかりません');

    firstTab.focus();
    dispatchKey(firstTab, 'ArrowRight');
    await waitForLitUpdate(tabs);

    expect(secondTab.getAttribute('tabindex')).to.equal('0');
    expect(firstTab.getAttribute('aria-selected')).to.equal('true');
    expect(tabs.selectedValue).to.equal('overview');

    dispatchKey(secondTab, 'Enter');
    await waitForLitUpdate(tabs);

    expect(secondTab.getAttribute('aria-selected')).to.equal('true');
    expect(tabs.selectedValue).to.equal('details');

    dispatchKey(secondTab, 'End');
    await waitForLitUpdate(tabs);
    expect(thirdTab.getAttribute('tabindex')).to.equal('0');

    dispatchKey(thirdTab, 'Home');
    await waitForLitUpdate(tabs);
    expect(firstTab.getAttribute('tabindex')).to.equal('0');
  });

  it('vertical では ArrowUp / ArrowDown を使い、ArrowLeft は選択移動に使わないこと', async () => {
    const tabs = await fixture<Tabs>(html`
      <ui-tabs orientation="vertical">
        <button slot="tab" value="a">A</button>
        <div slot="panel">A panel</div>
        <button slot="tab" value="b">B</button>
        <div slot="panel">B panel</div>
        <button slot="tab" value="c">C</button>
        <div slot="panel">C panel</div>
      </ui-tabs>
    `);
    await waitForLitUpdate(tabs);

    const tabEls = asHtmlElements(tabs.querySelectorAll('[slot="tab"]'));
    const firstTab = must(tabEls[0], '1 番目の tab が見つかりません');
    const secondTab = must(tabEls[1], '2 番目の tab が見つかりません');

    firstTab.focus();
    dispatchKey(firstTab, 'ArrowDown');
    await waitForLitUpdate(tabs);
    expect(secondTab.getAttribute('tabindex')).to.equal('0');

    dispatchKey(secondTab, 'ArrowLeft');
    await waitForLitUpdate(tabs);
    expect(secondTab.getAttribute('tabindex')).to.equal('0');

    dispatchKey(secondTab, 'ArrowUp');
    await waitForLitUpdate(tabs);
    expect(firstTab.getAttribute('tabindex')).to.equal('0');
  });

  it('ui-tab-change.detail に value / prevIndex / scopeId を載せること', async () => {
    const tabs = await fixture<Tabs>(html`
      <ui-tabs data-toc-scope="toc-scope-story">
        <button slot="tab" value="overview">概要</button>
        <div slot="panel">概要パネル</div>
        <button slot="tab" value="details">詳細</button>
        <div slot="panel">詳細パネル</div>
      </ui-tabs>
    `);
    await waitForLitUpdate(tabs);

    const observedPromise = new Promise<UiTabChangeDetail>((resolve) => {
      const handleChange = (event: Event): void => {
        if (event instanceof CustomEvent) {
          resolve(event.detail as UiTabChangeDetail);
        }
      };

      tabs.addEventListener('ui-tab-change', handleChange, { once: true });
    });

    const detailTab = must(
      tabs.querySelector<HTMLElement>('[slot="tab"][value="details"]'),
      'details tab が見つかりません',
    );
    detailTab.click();
    await waitForLitUpdate(tabs);

    const detail = await observedPromise;
    expect(detail.value).to.equal('details');
    expect(detail.prevIndex).to.equal(0);
    expect(detail.index).to.equal(1);
    expect(detail.scopeId).to.equal('toc-scope-story');
  });

  it('url-sync は初期 query を読み取り、クリックで ?tab= を更新すること', async () => {
    const restore = replaceUrl('/?tab=details');

    try {
      const tabs = await fixture<Tabs>(html`
        <ui-tabs url-sync>
          <button slot="tab" value="overview">概要</button>
          <div slot="panel">概要パネル</div>
          <button slot="tab" value="details">詳細</button>
          <div slot="panel">詳細パネル</div>
        </ui-tabs>
      `);
      await waitForLitUpdate(tabs);

      const detailTab = must(
        tabs.querySelector<HTMLElement>('[slot="tab"][value="details"]'),
        'details tab が見つかりません',
      );
      const overviewTab = must(
        tabs.querySelector<HTMLElement>('[slot="tab"][value="overview"]'),
        'overview tab が見つかりません',
      );

      expect(detailTab.getAttribute('aria-selected')).to.equal('true');
      overviewTab.click();
      await waitForLitUpdate(tabs);

      expect(window.location.search).to.contain('tab=overview');
    } finally {
      restore();
    }
  });

  it('url-sync は host-owned hash を query より優先し replaceState で ?tab= を正規化すること', async () => {
    const restoreUrl = replaceUrl('/?tab=details#overview-heading');
    const historySpy = spyOnHistoryWrites();

    try {
      const tabs = await fixture<Tabs>(html`
        <ui-tabs url-sync>
          <button slot="tab" value="overview">概要</button>
          <div slot="panel"><h3 id="overview-heading">概要見出し</h3></div>
          <button slot="tab" value="details">詳細</button>
          <div slot="panel"><h3 id="details-heading">詳細見出し</h3></div>
        </ui-tabs>
      `);
      await waitForLitUpdate(tabs);

      const overviewTab = must(
        tabs.querySelector<HTMLElement>('[slot="tab"][value="overview"]'),
        'overview tab が見つかりません',
      );
      const detailTab = must(
        tabs.querySelector<HTMLElement>('[slot="tab"][value="details"]'),
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
      const tabs = await fixture<Tabs>(html`
        <ui-tabs url-sync>
          <button slot="tab" value="overview">概要</button>
          <div slot="panel"><h3 id="overview-heading">概要見出し</h3></div>
          <button slot="tab" value="details">詳細</button>
          <div slot="panel"><h3 id="details-heading">詳細見出し</h3></div>
        </ui-tabs>
      `);
      await waitForLitUpdate(tabs);

      const overviewTab = must(
        tabs.querySelector<HTMLElement>('[slot="tab"][value="overview"]'),
        'overview tab が見つかりません',
      );
      const detailTab = must(
        tabs.querySelector<HTMLElement>('[slot="tab"][value="details"]'),
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
        const tabs = await fixture<Tabs>(html`
          <ui-tabs url-sync>
            <button slot="tab" value="overview">概要</button>
            <div slot="panel"><h3 id="overview-heading">概要見出し</h3></div>
            <button slot="tab" value="details">詳細</button>
            <div slot="panel"><h3 id="details-heading">詳細見出し</h3></div>
          </ui-tabs>
        `);
        await waitForLitUpdate(tabs);

        const overviewTab = must(
          tabs.querySelector<HTMLElement>('[slot="tab"][value="overview"]'),
          'overview tab が見つかりません',
        );
        const detailTab = must(
          tabs.querySelector<HTMLElement>('[slot="tab"][value="details"]'),
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

  it('url-sync は無効な query 値を有効 activeValue へ replaceState で回復すること', async () => {
    const restoreUrl = replaceUrl('/?tab=missing');
    const historySpy = spyOnHistoryWrites();

    try {
      const tabs = await fixture<Tabs>(html`
        <ui-tabs url-sync default-selected-value="details">
          <button slot="tab" value="overview">概要</button>
          <div slot="panel">概要パネル</div>
          <button slot="tab" value="details">詳細</button>
          <div slot="panel">詳細パネル</div>
        </ui-tabs>
      `);
      await waitForLitUpdate(tabs);

      const detailTab = must(
        tabs.querySelector<HTMLElement>('[slot="tab"][value="details"]'),
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
        const tabs = await fixture<Tabs>(html`
          <ui-tabs url-sync>
            <button slot="tab" value="overview">概要</button>
            <div slot="panel">概要パネル</div>
            <button slot="tab" value="details">詳細</button>
            <div slot="panel">詳細パネル</div>
          </ui-tabs>
        `);
        await waitForLitUpdate(tabs);

        expect(tabs.selectedValue).to.equal('overview');
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
      const tabs = await fixture<Tabs>(html`
        <ui-tabs url-sync>
          <button slot="tab" value="overview">概要</button>
          <div slot="panel">概要パネル</div>
          <button slot="tab" value="details">詳細</button>
          <div slot="panel">詳細パネル</div>
        </ui-tabs>
      `);
      await waitForLitUpdate(tabs);

      expect(tabs.selectedValue).to.equal('details');
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
      const tabs = await fixture<Tabs>(html`
        <ui-tabs url-sync>
          <button slot="tab" value="overview">概要</button>
          <section slot="panel">
            <h3 id="overview-heading">概要見出し</h3>
            <ui-tabs>
              <button slot="tab" value="inner">Inner</button>
              <section slot="panel"><h4 id="inner-heading">Inner heading</h4></section>
            </ui-tabs>
          </section>
          <button slot="tab" value="details">詳細</button>
          <section slot="panel"><h3 id="details-heading">詳細見出し</h3></section>
        </ui-tabs>
      `);
      await waitForLitUpdate(tabs);

      expect(tabs.selectedValue).to.equal('overview');
      expect(window.location.search).to.equal('');
      expect(historySpy.pushUrls).to.deep.equal([]);
      expect(historySpy.replaceUrls).to.deep.equal([]);
    } finally {
      historySpy.restore();
      restoreUrl();
    }
  });
});
