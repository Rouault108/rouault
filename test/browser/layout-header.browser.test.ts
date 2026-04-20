import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '../../src/components/layout/layout-header.js';
import type { LayoutHeader } from '../../src/components/layout/layout-header.js';
import type { MenuItem } from '../../src/components/ui/dropdown/dropdown.js';
import {
  DEFAULT_LAYOUT_SIDEBAR_ID,
  layoutSidebarController,
} from '../../src/components/layout/layout-sidebar-controller.js';
import { layoutTocMobileController } from '../../src/components/layout/layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore } from '../../src/components/layout/layout-toc-runtime-store.js';
import type { UiHeader } from '../../src/components/ui/header/header.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const isVisible = (element: HTMLElement): boolean => {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    rect.width > 0 &&
    rect.height > 0
  );
};

describe('layout-header browser contract', () => {
  afterEach(() => {
    layoutSidebarController.reset();
    layoutTocRuntimeStore.reset();
    layoutTocMobileController.reset();
  });

  it('狭幅コンテナでも header が右方向へはみ出さないこと', async () => {
    const header = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 320px; overflow: auto;">
        <layout-header
          note-layout
          current-corpus-key="program"
          corpora-json='[{"key":"all","label":"すべてのノート","href":"/corpora/"},{"key":"program","label":"Program corpus with a relatively long label","href":"/corpora/program/"}]'
        ></layout-header>
      </div>
    `);

    const layoutHeader = expectPresent(
      header.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(layoutHeader);

    const metrics = (() => {
      const uiHeader = layoutHeader.shadowRoot?.querySelector('ui-header');
      const shadowHeader = uiHeader?.shadowRoot?.querySelector('header');
      const inner = uiHeader?.shadowRoot?.querySelector('.inner');
      const start = uiHeader?.shadowRoot?.querySelector('.zone-start');
      const end = uiHeader?.shadowRoot?.querySelector('.zone-end');

      return {
        wrapperClientWidth: header.clientWidth,
        wrapperScrollWidth: header.scrollWidth,
        layoutHeaderWidth: Math.round(layoutHeader.getBoundingClientRect().width),
        shadowHeaderWidth:
          shadowHeader instanceof HTMLElement
            ? Math.round(shadowHeader.getBoundingClientRect().width)
            : -1,
        innerWidth:
          inner instanceof HTMLElement ? Math.round(inner.getBoundingClientRect().width) : -1,
        startWidth:
          start instanceof HTMLElement ? Math.round(start.getBoundingClientRect().width) : -1,
        endWidth: end instanceof HTMLElement ? Math.round(end.getBoundingClientRect().width) : -1,
      };
    })();

    const horizontalOverflow = header.scrollWidth - header.clientWidth;
    expect(horizontalOverflow, JSON.stringify(metrics)).to.be.lessThanOrEqual(1);
  });

  it('テーマ変更後の再描画で theme dropdown trigger に focus を残さないこと', async () => {
    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    await waitForLitUpdate(header);

    const themeDropdown = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('[data-dropdown="theme"]'),
      'themeDropdown',
    );
    const themeTrigger = expectPresent(
      themeDropdown.querySelector<HTMLElement>('[slot="trigger"]'),
      'themeTrigger',
    );
    const darkItem = expectPresent(
      themeDropdown.querySelector<MenuItem>('ui-menu-item[value="dark"]'),
      'darkItem',
    );
    const darkItemButton = expectPresent(
      darkItem.shadowRoot?.querySelector<HTMLButtonElement>('button'),
      'darkItemButton',
    );

    themeTrigger.click();
    await waitForLitUpdate(header);

    darkItemButton.click();
    await waitForLitUpdate(header);

    await waitUntil(
      () => document.activeElement !== themeTrigger,
      'テーマ変更後に theme trigger へ focus が残らないこと',
    );

    expect(document.activeElement).to.not.equal(themeTrigger);
  });

  it('mobile note では compact-center を描画しないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header
          note-layout
          breadcrumbs-json='[{"label":"Notes","href":"/"},{"label":"Section","href":"/notes/section"},{"label":"Current"}]'
        ></layout-header>
      </div>
    `);

    const header = expectPresent(wrapper.querySelector<LayoutHeader>('layout-header'), 'layoutHeader');
    await waitForLitUpdate(header);

    expect(header.shadowRoot?.querySelector('.compact-note-label')).to.equal(null);
  });

  it('mobile note かつ sidebar-enabled=true では corpus-switcher を隠し、theme chevron を描画しないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header note-layout sidebar-enabled></layout-header>
      </div>
    `);

    const header = expectPresent(wrapper.querySelector<LayoutHeader>('layout-header'), 'layoutHeader');
    await waitForLitUpdate(header);

    const corpusSwitcher = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.corpus-switcher'),
      'corpusSwitcher',
    );

    await waitUntil(
      () => header.shadowRoot?.querySelector('.theme-chevron') === null,
      'mobile note では theme chevron を描画しないこと',
    );

    expect(getComputedStyle(corpusSwitcher).display).to.equal('none');
    expect(header.shadowRoot?.querySelector('.theme-chevron')).to.equal(null);
  });

  it('mobile note かつ sidebar-enabled=false では corpus-switcher を維持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header note-layout></layout-header>
      </div>
    `);

    const header = expectPresent(wrapper.querySelector<LayoutHeader>('layout-header'), 'layoutHeader');
    await waitForLitUpdate(header);

    const corpusSwitcher = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.corpus-switcher'),
      'corpusSwitcher',
    );

    expect(isVisible(corpusSwitcher)).to.equal(true);
  });

  it('non-note では theme chevron を描画すること', async () => {
    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    await waitForLitUpdate(header);

    expect(header.shadowRoot?.querySelector('.theme-chevron')).to.not.equal(null);
  });

  it('overlay 展開時は ui-header に overlaySidebarOpen だけを渡し、sidebar 幅は予約しないこと', async () => {
    layoutSidebarController.initialize(DEFAULT_LAYOUT_SIDEBAR_ID, {
      presentation: 'overlay',
      fixedBreakpoint: 1024,
      storage: null,
    });

    const header = await fixture<LayoutHeader>(
      html`<layout-header note-layout sidebar-enabled></layout-header>`,
    );
    await waitForLitUpdate(header);

    const uiHeaderBefore = expectPresent(
      header.shadowRoot?.querySelector<UiHeader>('ui-header'),
      'uiHeaderBefore',
    );
    expect(uiHeaderBefore.overlaySidebarOpen).to.equal(false);
    expect(uiHeaderBefore.hasAttribute('overlay-sidebar-open')).to.equal(false);

    layoutSidebarController.open(DEFAULT_LAYOUT_SIDEBAR_ID);
    await waitForLitUpdate(header);

    const uiHeader = expectPresent(
      header.shadowRoot?.querySelector<UiHeader>('ui-header'),
      'uiHeader',
    );
    const toggleButton = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.sidebar-toggle'),
      'toggleButton',
    );

    expect(uiHeader.sidebarExpanded).to.equal(false);
    expect(uiHeader.overlaySidebarOpen).to.equal(true);
    expect(uiHeader.hasAttribute('overlay-sidebar-open')).to.equal(true);
    expect(toggleButton.getAttribute('aria-expanded')).to.equal('true');
  });

  it('fixed sidebar の expanded snapshot を overlaySidebarOpen と誤認しないこと', async () => {
    layoutSidebarController.initialize(DEFAULT_LAYOUT_SIDEBAR_ID, {
      presentation: 'fixed',
      fixedBreakpoint: 1024,
      storage: null,
    });

    const header = await fixture<LayoutHeader>(
      html`<layout-header note-layout sidebar-enabled></layout-header>`,
    );
    await waitForLitUpdate(header);

    const uiHeader = expectPresent(
      header.shadowRoot?.querySelector<UiHeader>('ui-header'),
      'uiHeader',
    );

    expect(uiHeader.sidebarExpanded).to.equal(false);
    expect(uiHeader.overlaySidebarOpen).to.equal(false);
    expect(uiHeader.hasAttribute('overlay-sidebar-open')).to.equal(false);
  });

  it('desktop の note-layout では sidebar-main gap を含む start reserve と TOC reserve を使うこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1440px; --note-sidebar-main-gap: 32px;">
        <layout-header note-layout sidebar-enabled toc-presence="present"></layout-header>
      </div>
    `);

    const header = expectPresent(wrapper.querySelector<LayoutHeader>('layout-header'), 'layoutHeader');
    await waitForLitUpdate(header);

    const uiHeader = expectPresent(
      header.shadowRoot?.querySelector<UiHeader>('ui-header'),
      'uiHeader',
    );
    const zoneCenter = expectPresent(
      uiHeader.shadowRoot?.querySelector<HTMLElement>('.zone-center'),
      'zoneCenter',
    );

    const styles = getComputedStyle(zoneCenter);
    expect(styles.left).to.equal('280px');
    expect(styles.right).to.equal('248px');
  });

  it('toc-presence=absent の note-layout でも desktop では present と同じ right reserve を維持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1440px; --note-sidebar-main-gap: 32px;">
        <layout-header note-layout sidebar-enabled toc-presence="absent"></layout-header>
      </div>
    `);

    const header = expectPresent(wrapper.querySelector<LayoutHeader>('layout-header'), 'layoutHeader');
    await waitForLitUpdate(header);

    const uiHeader = expectPresent(
      header.shadowRoot?.querySelector<UiHeader>('ui-header'),
      'uiHeader',
    );
    const zoneCenter = expectPresent(
      uiHeader.shadowRoot?.querySelector<HTMLElement>('.zone-center'),
      'zoneCenter',
    );

    const styles = getComputedStyle(zoneCenter);
    expect(styles.left).to.equal('280px');
    expect(styles.right).to.equal('248px');
  });

  it('shell projection に tocPresence を round-trip すること', async () => {
    const header = await fixture<LayoutHeader>(
      html`<layout-header toc-presence="present"></layout-header>`,
    );
    await waitForLitUpdate(header);

    header.applyShellProjection({
      breadcrumbs: [],
      corpora: [],
      currentCorpusKey: 'all',
      noteLayout: true,
      sidebarEnabled: true,
      tocPresence: 'absent',
    });
    await waitForLitUpdate(header);

    expect(header.getAttribute('toc-presence')).to.equal('absent');
    expect(header.readShellProjection().tocPresence).to.equal('absent');
  });

  it('375px の mobile note では TOC trigger が icon only になること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header note-layout toc-presence="present" toc-runtime-id="test-toc"></layout-header>
      </div>
    `);

    const header = expectPresent(wrapper.querySelector<LayoutHeader>('layout-header'), 'layoutHeader');
    await waitForLitUpdate(header);

    layoutTocRuntimeStore.publish('test-toc', {
      ready: true,
      hasVisibleHeadings: true,
      currentLabel: '2. 状態同期',
      activeId: 'state-sync',
      activeIndex: 2,
      activeTotal: 5,
    });
    await waitForLitUpdate(header);

    const trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );
    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );
    const triggerProgress = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-progress'),
      'tocTriggerProgress',
    );

    expect(trigger.getAttribute('data-visible')).to.equal('true');
    expect(getComputedStyle(triggerText).display).to.equal('none');
    expect(getComputedStyle(triggerProgress).display).to.equal('none');
    expect(header.shadowRoot?.querySelector('.compact-note-label')).to.equal(null);
  });

  it('430px の mobile note では TOC trigger が text のみになること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 430px;">
        <layout-header note-layout toc-presence="present" toc-runtime-id="test-toc"></layout-header>
      </div>
    `);

    const header = expectPresent(wrapper.querySelector<LayoutHeader>('layout-header'), 'layoutHeader');
    await waitForLitUpdate(header);

    layoutTocRuntimeStore.publish('test-toc', {
      ready: true,
      hasVisibleHeadings: true,
      currentLabel: '2. 状態同期',
      activeId: 'state-sync',
      activeIndex: 2,
      activeTotal: 5,
    });
    await waitForLitUpdate(header);

    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );
    const triggerProgress = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-progress'),
      'tocTriggerProgress',
    );

    expect(getComputedStyle(triggerText).display).to.not.equal('none');
    expect(getComputedStyle(triggerProgress).display).to.equal('none');
    expect(header.shadowRoot?.querySelector('.compact-note-label')).to.equal(null);
  });

  it('520px の mobile note では TOC trigger が text + progress になること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 520px;">
        <layout-header note-layout toc-presence="present" toc-runtime-id="test-toc"></layout-header>
      </div>
    `);

    const header = expectPresent(wrapper.querySelector<LayoutHeader>('layout-header'), 'layoutHeader');
    await waitForLitUpdate(header);

    layoutTocRuntimeStore.publish('test-toc', {
      ready: true,
      hasVisibleHeadings: true,
      currentLabel: '2. 状態同期',
      activeId: 'state-sync',
      activeIndex: 2,
      activeTotal: 5,
    });
    await waitForLitUpdate(header);

    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );
    const triggerProgress = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-progress'),
      'tocTriggerProgress',
    );

    expect(getComputedStyle(triggerText).display).to.not.equal('none');
    expect(getComputedStyle(triggerProgress).display).to.not.equal('none');
    expect(header.shadowRoot?.querySelector('.compact-note-label')).to.equal(null);
  });

  it('toc mobile controller snapshot を aria-expanded へ反映すること', async () => {
    const header = await fixture<LayoutHeader>(html`
      <layout-header note-layout toc-presence="present" toc-runtime-id="test-toc"></layout-header>
    `);

    layoutTocRuntimeStore.publish('test-toc', {
      ready: true,
      hasVisibleHeadings: true,
      currentLabel: '目次',
      activeId: 'intro',
      activeIndex: 1,
      activeTotal: 3,
    });
    await waitForLitUpdate(header);

    const trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');

    layoutTocMobileController.open('test-toc', trigger);
    await waitForLitUpdate(header);
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');

    layoutTocMobileController.close('test-toc');
    await waitForLitUpdate(header);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('sidebar-enabled が無い note-layout では sidebar toggle を描画しないこと', async () => {
    const header = await fixture<LayoutHeader>(html`<layout-header note-layout></layout-header>`);
    await waitForLitUpdate(header);

    expect(header.shadowRoot?.querySelector('.sidebar-toggle')).to.equal(null);
  });

  it('sidebar-enabled がある場合のみ sidebar toggle を描画すること', async () => {
    const header = await fixture<LayoutHeader>(
      html`<layout-header note-layout sidebar-enabled></layout-header>`,
    );
    await waitForLitUpdate(header);

    expect(header.shadowRoot?.querySelector('.sidebar-toggle')).to.not.equal(null);
  });
});