import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '../../src/components/layout/layout-header.js';
import type { LayoutHeader } from '../../src/components/layout/layout-header.js';
import type { MenuItem } from '../../src/components/ui/dropdown/dropdown.js';
import {
  DEFAULT_LAYOUT_SIDEBAR_ID,
  layoutSidebarController,
} from '../../src/components/layout/layout-sidebar-controller.js';
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

describe('layout-header browser contract', () => {
  afterEach(() => {
    layoutSidebarController.reset();
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

  it('breadcrumbs を持つ場合でも compact-center の文脈ラベルを出さないこと', async () => {
    const header = await fixture<LayoutHeader>(html`
      <layout-header
        note-layout
        breadcrumbs-json='[{"label":"Notes","href":"/"},{"label":"Section","href":"/notes/section"},{"label":"Current"}]'
      ></layout-header>
    `);
    await waitForLitUpdate(header);

    expect(header.shadowRoot?.querySelector('[slot="compact-center"]')).to.equal(null);
  });

  it('overlay 展開時も ui-header に sidebar 幅を予約させず、toggle の aria-expanded のみ更新すること', async () => {
    const unregister = layoutSidebarController.register(DEFAULT_LAYOUT_SIDEBAR_ID, {
      applyOverlayState: () => undefined,
    });

    try {
      const header = await fixture<LayoutHeader>(
        html`<layout-header note-layout sidebar-enabled></layout-header>`,
      );
      await waitForLitUpdate(header);

      layoutSidebarController.report(DEFAULT_LAYOUT_SIDEBAR_ID, {
        state: 'expanded',
        mode: 'overlay',
      });
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
      expect(toggleButton.getAttribute('aria-expanded')).to.equal('true');
    } finally {
      unregister();
    }
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
