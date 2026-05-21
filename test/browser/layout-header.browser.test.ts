import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '../../src/components/layout/layout-header.js';
import type { LayoutHeader } from '../../src/components/layout/layout-header.js';
import type { Dropdown, MenuItem } from '../../src/components/ui/dropdown/dropdown.js';
import {
  DEFAULT_LAYOUT_SIDEBAR_ID,
  layoutSidebarController,
} from '../../src/components/layout/layout-sidebar-controller.js';
import { layoutTocMobileController } from '../../src/components/layout/layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore } from '../../src/components/layout/layout-toc-runtime-store.js';
import type { UiHeader } from '../../src/components/ui/header/header.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';
import {
  RESOLVED_THEME_ATTRIBUTE,
  THEME_ATTRIBUTE,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from '../../src/theme/theme-manager.js';
import {
  createCorpusNavigationProjectionPayload,
  EMPTY_CORPUS_NAVIGATION_PROJECTION_PAYLOAD,
  type CorpusNavigationItem,
} from '../../shared/navigation/corpus-navigation-projection.js';

const serializeCorpusPayload = (items: readonly CorpusNavigationItem[]) =>
  JSON.stringify(createCorpusNavigationProjectionPayload(items));

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
    style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
  );
};

const getPanelPhase = (panel: HTMLElement): 'idle' | 'positioning' | 'ready' => {
  const phase = panel.dataset['positionPhase'];
  if (phase === 'idle' || phase === 'positioning' || phase === 'ready') {
    return phase;
  }

  throw new Error(`unknown dropdown phase: ${String(phase)}`);
};

const waitForAnimationFrames = async (count: number): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
};

const getSearchTriggerButton = (host: ShadowRoot | null): HTMLButtonElement => {
  return expectPresent(
    host?.querySelector<HTMLButtonElement>('[data-search-dialog-trigger]'),
    'search trigger button',
  );
};

const getSearchTriggerHost = (host: ShadowRoot | null): HTMLElement =>
  expectPresent(host?.querySelector<HTMLElement>('[data-search-dialog-trigger]'), 'search trigger');

const expectFocusedHeaderItemRaised = async (
  header: LayoutHeader,
  item: HTMLElement,
): Promise<void> => {
  await waitForLitUpdate(header);
  await waitForAnimationFrames(1);

  const styles = getComputedStyle(item);
  expect(styles.position).to.equal('relative');
  expect(styles.zIndex).to.equal('1');
};

const publishReadyTocRuntime = (
  runtimeId: string,
  overrides: Partial<{
    activeId: string | null;
  }> = {},
): void => {
  layoutTocRuntimeStore.publish(runtimeId, {
    ready: true,
    hasVisibleHeadings: true,
    activeId: 'state-sync',
    ...overrides,
  });
};

const waitForDropdownReady = async (dropdown: Dropdown): Promise<HTMLElement> => {
  await waitUntil(() => {
    const panel = dropdown.getMenuElement();
    if (!(panel instanceof HTMLElement)) {
      return false;
    }

    const style = getComputedStyle(panel);
    return (
      getPanelPhase(panel) === 'ready' &&
      style.visibility === 'visible' &&
      style.pointerEvents === 'auto'
    );
  }, 'dropdown が ready state へ遷移しません');

  // WebKit では ready commit 直後も transform transition 中の rect を返すことがあるため、
  // paint を数フレーム待ってから座標を読む。
  await waitForAnimationFrames(3);

  const panel = dropdown.getMenuElement();
  if (!(panel instanceof HTMLElement)) {
    throw new Error('dropdown panel が見つかりません');
  }

  return panel;
};

const waitForDropdownTrigger = async (dropdown: Dropdown): Promise<HTMLElement> => {
  await waitForLitUpdate(dropdown);

  await waitUntil(
    () => dropdown.getTriggerElement() instanceof HTMLElement,
    'dropdown trigger が slot assignment されません',
  );

  const trigger = dropdown.getTriggerElement();
  if (!(trigger instanceof HTMLElement)) {
    throw new Error('dropdown trigger was not assigned');
  }

  return trigger;
};

const waitForResponsiveState = async (
  header: LayoutHeader,
  expectedNarrow: boolean,
): Promise<void> => {
  await waitForLitUpdate(header);

  await waitUntil(
    () => header.hasAttribute('narrow-layout') === expectedNarrow,
    `narrow-layout 属性が ${String(expectedNarrow)} に同期されません`,
  );
};

const expectWithinPx = (actual: number, expected: number, tolerance = 1): void => {
  expect(Math.abs(actual - expected)).to.be.lessThanOrEqual(tolerance);
};

const waitForComputedStyleValue = async (
  element: HTMLElement,
  property: keyof CSSStyleDeclaration,
  expected: string,
  message: string,
): Promise<void> => {
  await waitUntil(() => String(getComputedStyle(element)[property]) === expected, message);
};

const readUiHeaderZoneCenterStyle = (header: LayoutHeader): CSSStyleDeclaration => {
  const uiHeader = expectPresent(
    header.shadowRoot?.querySelector<UiHeader>('ui-header'),
    'uiHeader',
  );
  const zoneCenter = expectPresent(
    uiHeader.shadowRoot?.querySelector<HTMLElement>('.zone-center'),
    'zoneCenter',
  );

  return getComputedStyle(zoneCenter);
};

const readSlotGroups = (
  header: LayoutHeader,
): {
  start: HTMLElement;
  end: HTMLElement;
} => {
  return {
    start: expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.start-slot-group'),
      'startSlotGroup',
    ),
    end: expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.end-slot-group'),
      'endSlotGroup',
    ),
  };
};

const readCorpusTriggerLeft = async (header: LayoutHeader): Promise<number> => {
  await waitForLitUpdate(header);
  const dropdown = expectPresent(
    header.shadowRoot?.querySelector<Dropdown>('.corpus-switcher'),
    'corpusDropdown',
  );
  const trigger = await waitForDropdownTrigger(dropdown);

  return trigger.getBoundingClientRect().left;
};

const waitForDropdownIdle = async (dropdown: Dropdown): Promise<void> => {
  await waitUntil(() => {
    const panel = dropdown.getMenuElement();
    return panel instanceof HTMLElement && getPanelPhase(panel) === 'idle';
  }, 'dropdown が idle state へ戻りません');
};

const resetThemeTestState = (): void => {
  document.documentElement.removeAttribute(THEME_ATTRIBUTE);
  document.documentElement.removeAttribute(RESOLVED_THEME_ATTRIBUTE);
  document.documentElement.style.colorScheme = '';
  localStorage.removeItem(THEME_STORAGE_KEY);
};

const readThemeTriggerState = async (
  header: LayoutHeader,
): Promise<{
  icons: string[];
  iconGlyphs: (string | null)[];
  labels: string[];
  markers: (string | null)[];
  accessibleName: string | null;
  ariaLabel: string | null;
  selectedItems: { value: string | null; icon: string | null }[];
}> => {
  await waitForLitUpdate(header);

  const trigger = expectPresent(
    header.shadowRoot?.querySelector<HTMLElement>('[data-dropdown="theme"] [slot="trigger"]'),
    'themeTrigger',
  );
  await waitForLitUpdate(trigger);

  const button = expectPresent(
    trigger.shadowRoot?.querySelector<HTMLButtonElement>('button'),
    'themeTriggerButton',
  );
  const icons = [...trigger.querySelectorAll<HTMLElement>('.theme-trigger-icon')];
  const items = [
    ...(header.shadowRoot?.querySelectorAll<HTMLElement>('[data-dropdown="theme"] ui-menu-item') ??
      []),
  ];

  return {
    icons: icons.map((icon) => icon.getAttribute('data-icon') ?? ''),
    iconGlyphs: icons.map(
      (icon) => {
        const iconName = icon.getAttribute('data-icon');
        return iconName === null ? null : `lucide:${iconName}`;
      },
    ),
    labels: [...trigger.querySelectorAll<HTMLElement>('.theme-trigger-text')].map(
      (node) => node.textContent?.trim() ?? '',
    ),
    markers: [...trigger.querySelectorAll<HTMLElement>('.theme-trigger-main')].map((node) =>
      node.getAttribute('data-theme-preference'),
    ),
    accessibleName: trigger.getAttribute('accessible-name'),
    ariaLabel: button.getAttribute('aria-label'),
    selectedItems: items
      .filter((item) => item.hasAttribute('data-selected'))
      .map((item) => ({
        value: item.getAttribute('value'),
        icon: item.querySelector('[data-icon]')?.getAttribute('data-icon') ?? null,
      })),
  };
};

describe('layout-header browser contract', () => {
  // browser: state / accessibility / interactivity の公開契約を検証する
  beforeEach(() => {
    resetThemeTestState();
  });

  afterEach(() => {
    resetThemeTestState();
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
          corpora-json=${serializeCorpusPayload([
            { key: 'all', label: 'すべてのノート', href: '/corpora/' },
            { key: 'program', label: 'Program corpus with a relatively long label', href: '/corpora/program/' },
          ])}
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

  it('640px 境界の長い corpus label でも header が右方向へはみ出さず、corpus chevron を表示すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 640px; overflow: auto;">
        <layout-header
          current-corpus-key="program"
          corpora-json=${serializeCorpusPayload([
            { key: 'all', label: 'すべてのノート', href: '/corpora/' },
            { key: 'program', label: 'Program corpus with a relatively long label for boundary verification', href: '/corpora/program/' },
          ])}
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    const corpusChevron = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>(
        '.corpus-switcher [slot="trigger"] [data-icon="chevron-down"]',
      ),
      'corpusChevron',
    );

    const horizontalOverflow = wrapper.scrollWidth - wrapper.clientWidth;
    expect(horizontalOverflow).to.be.lessThanOrEqual(1);
    expect(isVisible(corpusChevron)).to.equal(true);
  });

  it('slot groups do not clip focused header controls', async () => {
    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    await waitForLitUpdate(header);

    const groups = [...(header.shadowRoot?.querySelectorAll<HTMLElement>('.slot-group') ?? [])];
    expect(groups.length).to.be.greaterThan(0);

    for (const group of groups) {
      const styles = getComputedStyle(group);
      expect(styles.overflowX).to.equal('visible');
      expect(styles.overflowY).to.equal('visible');
    }
  });

  it('focused corpus dropdown host is raised above adjacent controls', async () => {
    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    await waitForLitUpdate(header);

    const corpusSwitcher = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.corpus-switcher'),
      'corpusSwitcher',
    );
    const corpusTrigger = expectPresent(
      corpusSwitcher.querySelector<HTMLElement>('ui-button[slot="trigger"]'),
      'corpusTrigger',
    );

    corpusTrigger.focus();
    await expectFocusedHeaderItemRaised(header, corpusSwitcher);
  });

  it('focused search trigger host is raised above adjacent controls', async () => {
    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    await waitForLitUpdate(header);

    const searchTrigger = getSearchTriggerHost(header.shadowRoot);

    searchTrigger.focus();
    await expectFocusedHeaderItemRaised(header, searchTrigger);
  });

  it('focused theme dropdown host is raised above adjacent controls', async () => {
    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    await waitForLitUpdate(header);

    const themeDropdown = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('[data-dropdown="theme"]'),
      'themeDropdown',
    );
    const themeTrigger = expectPresent(
      themeDropdown.querySelector<HTMLElement>('ui-button[slot="trigger"]'),
      'themeTrigger',
    );

    themeTrigger.focus();
    await expectFocusedHeaderItemRaised(header, themeDropdown);
  });

  it('layout-header は localStorage ではなく適用済み DOM 属性から theme 表示を初期同期すること', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'light');
    document.documentElement.setAttribute(RESOLVED_THEME_ATTRIBUTE, 'light');

    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    const state = await readThemeTriggerState(header);

    expect(state.icons).to.deep.equal(['sun']);
    expect(state.iconGlyphs).to.deep.equal(['lucide:sun']);
    expect(state.labels).to.deep.equal(['ライト']);
    expect(state.markers).to.deep.equal(['light']);
    expect(state.accessibleName).to.equal('テーマ: ライト');
    expect(state.ariaLabel).to.equal('テーマ: ライト');
    expect(state.selectedItems).to.deep.equal([{ value: 'light', icon: 'check' }]);
  });

  it('data-theme 未設定時は system 表示へ正規化すること', async () => {
    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    const state = await readThemeTriggerState(header);

    expect(state.icons).to.deep.equal(['monitor']);
    expect(state.iconGlyphs).to.deep.equal(['lucide:monitor']);
    expect(state.labels).to.deep.equal(['OSテーマ']);
    expect(state.markers).to.deep.equal(['system']);
    expect(state.accessibleName).to.equal('テーマ: OSテーマ');
    expect(state.ariaLabel).to.equal('テーマ: OSテーマ');
    expect(state.selectedItems).to.deep.equal([{ value: 'system', icon: 'check' }]);
  });

  it('不正な theme change detail では表示を変えず render も壊れないこと', async () => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'light');

    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    expect((await readThemeTriggerState(header)).labels).to.deep.equal(['ライト']);

    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { preference: 'unknown' },
      }),
    );
    await waitForLitUpdate(header);

    const state = await readThemeTriggerState(header);
    expect(state.icons).to.deep.equal(['sun']);
    expect(state.labels).to.deep.equal(['ライト']);
    expect(state.markers).to.deep.equal(['light']);
  });

  it('不正な menu-item-select detail では TypeError を出さず表示を変えないこと', async () => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, 'dark');

    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    const dropdown = expectPresent(
      header.shadowRoot?.querySelector<Dropdown>('[data-dropdown="theme"]'),
      'themeDropdown',
    );

    for (const detail of [null, undefined, { value: 42 }, { value: 'unknown' }] as const) {
      dropdown.dispatchEvent(
        new CustomEvent('menu-item-select', {
          bubbles: true,
          composed: true,
          detail,
        }),
      );
      await waitForLitUpdate(header);
    }

    const state = await readThemeTriggerState(header);
    expect(state.icons).to.deep.equal(['moon']);
    expect(state.iconGlyphs).to.deep.equal(['lucide:moon']);
    expect(state.labels).to.deep.equal(['ダーク']);
    expect(state.markers).to.deep.equal(['dark']);
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
    await waitForDropdownReady(themeDropdown as Dropdown);

    darkItemButton.click();
    await waitForLitUpdate(header);

    await waitUntil(
      () => document.activeElement !== themeTrigger,
      'テーマ変更後に theme trigger へ focus が残らないこと',
    );

    expect(document.activeElement).to.not.equal(themeTrigger);
  });

  it('theme dropdown item は親 shadow CSS に依存しない平坦構造と text-value を持つこと', async () => {
    const header = await fixture<LayoutHeader>(html`<layout-header></layout-header>`);
    await waitForLitUpdate(header);

    const lightItem = expectPresent(
      header.shadowRoot?.querySelector<MenuItem>(
        '[data-dropdown="theme"] ui-menu-item[value="light"]',
      ),
      'lightItem',
    );
    const lightIcon = expectPresent(
      lightItem.querySelector<HTMLElement>('[data-icon]'),
      'lightIcon',
    );

    expect(lightItem.getAttribute('text-value')).to.equal('ライト');
    expect(lightItem.querySelector('.theme-menu-label')).to.equal(null);
    expect(lightIcon.getAttribute('data-icon')).to.equal('sun');
    expect(lightItem.textContent?.trim()).to.equal('ライト');
  });

  it('mobile note でも layout-header は compact-center slot を使わないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header
          note-layout
          toc-presence="present"
          toc-runtime-id="test-toc"
          data-toc-owner-id="test-toc-owner"
          toc-trigger-reserved="true"
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    expect(header.shadowRoot?.querySelector('.compact-note-label')).to.equal(null);
  });

  it('mobile note かつ sidebar-enabled=true では corpus-switcher を隠し、theme trigger に chevron-down を表示すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header note-layout sidebar-enabled></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    const corpusSwitcher = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.corpus-switcher'),
      'corpusSwitcher',
    );

    const themeChevron = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>(
        '[data-dropdown="theme"] [slot="trigger"] .theme-trigger-chevron',
      ),
      'themeChevron',
    );

    expect(getComputedStyle(corpusSwitcher).display).to.equal('none');
    expect(isVisible(themeChevron)).to.equal(true);
  });

  it('mobile note かつ sidebar-enabled=false では corpus-switcher を維持し、corpus chevron も visible であること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header
          note-layout
          toc-presence="present"
          toc-runtime-id="test-toc"
          data-toc-owner-id="test-toc-owner"
          toc-trigger-reserved="true"
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    const corpusSwitcher = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.corpus-switcher'),
      'corpusSwitcher',
    );
    const corpusChevron = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>(
        '.corpus-switcher [slot="trigger"] [data-icon="chevron-down"]',
      ),
      'corpusChevron',
    );

    expect(isVisible(corpusSwitcher)).to.equal(true);
    expect(isVisible(corpusChevron)).to.equal(true);
  });

  it('wide 非 note では corpus chevron と theme chevron を表示すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 768px;">
        <layout-header></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    const corpusChevron = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>(
        '.corpus-switcher [slot="trigger"] [data-icon="chevron-down"]',
      ),
      'corpusChevron',
    );
    const themeChevron = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>(
        '[data-dropdown="theme"] [slot="trigger"] .theme-trigger-chevron',
      ),
      'themeChevron',
    );

    expect(isVisible(corpusChevron)).to.equal(true);
    expect(isVisible(themeChevron)).to.equal(true);
  });

  it('desktop note かつ sidebar-enabled=true では corpus-switcher が visible のとき corpus chevron も visible であること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1024px;">
        <layout-header note-layout sidebar-enabled></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    const corpusSwitcher = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.corpus-switcher'),
      'corpusSwitcher',
    );
    const corpusChevron = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>(
        '.corpus-switcher [slot="trigger"] [data-icon="chevron-down"]',
      ),
      'corpusChevron',
    );

    expect(isVisible(corpusSwitcher)).to.equal(true);
    expect(isVisible(corpusChevron)).to.equal(true);
  });

  it('narrow 幅で theme trigger text が非表示でも theme dropdown trigger の内部 button にアクセシブル名が入ること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header note-layout sidebar-enabled></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    const themeTriggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.theme-trigger-text'),
      'themeTriggerText',
    );
    const themeDropdown = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('[data-dropdown="theme"]'),
      'themeDropdown',
    );
    const themeTrigger = expectPresent(
      themeDropdown.querySelector<HTMLElement>('ui-button[slot="trigger"]'),
      'themeTrigger',
    );
    const themeTriggerButton = expectPresent(
      themeTrigger.shadowRoot?.querySelector<HTMLButtonElement>('button'),
      'themeTriggerButton',
    );

    expect(getComputedStyle(themeTriggerText).display).to.equal('none');
    expect(themeTrigger.getAttribute('accessible-name')).to.equal('テーマ: OSテーマ');
    expect(themeTriggerButton.getAttribute('aria-label')).to.equal('テーマ: OSテーマ');
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

  it('normal and note layout headers use the same app header width token', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1440px; --app-header-inner-max-width: 777px;">
        <layout-header data-test="normal"></layout-header>
        <layout-header data-test="note" note-layout sidebar-enabled></layout-header>
      </div>
    `);

    const normalHeader = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header[data-test="normal"]'),
      'normalHeader',
    );
    const noteHeader = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header[data-test="note"]'),
      'noteHeader',
    );

    await waitForLitUpdate(normalHeader);
    await waitForLitUpdate(noteHeader);

    const getInner = (header: LayoutHeader): HTMLElement => {
      const uiHeader = expectPresent(
        header.shadowRoot?.querySelector<UiHeader>('ui-header'),
        'uiHeader',
      );
      return expectPresent(uiHeader.shadowRoot?.querySelector<HTMLElement>('.inner'), 'inner');
    };

    const normalInner = getInner(normalHeader);
    const noteInner = getInner(noteHeader);

    expect(normalInner.getBoundingClientRect().width).to.be.closeTo(777, 1);
    expect(noteInner.getBoundingClientRect().width).to.be.closeTo(777, 1);
    expect(normalInner.getBoundingClientRect().width).to.be.closeTo(
      noteInner.getBoundingClientRect().width,
      1,
    );
  });

  it('fixed sidebar path and note layout path keep the same header border-box width', async () => {
    layoutSidebarController.initialize(DEFAULT_LAYOUT_SIDEBAR_ID, {
      presentation: 'fixed',
      fixedBreakpoint: 1024,
      storage: null,
    });

    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1440px; --app-header-inner-max-width: 777px;">
        <layout-header data-test="non-note" sidebar-enabled></layout-header>
        <layout-header data-test="note" note-layout sidebar-enabled></layout-header>
      </div>
    `);

    const nonNoteHeader = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header[data-test="non-note"]'),
      'nonNoteHeader',
    );
    const noteHeader = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header[data-test="note"]'),
      'noteHeader',
    );

    await waitForLitUpdate(nonNoteHeader);
    await waitForLitUpdate(noteHeader);

    const nonNoteUiHeader = expectPresent(
      nonNoteHeader.shadowRoot?.querySelector<UiHeader>('ui-header'),
      'nonNoteUiHeader',
    );
    const noteUiHeader = expectPresent(
      noteHeader.shadowRoot?.querySelector<UiHeader>('ui-header'),
      'noteUiHeader',
    );
    const nonNoteInner = expectPresent(
      nonNoteUiHeader.shadowRoot?.querySelector<HTMLElement>('.inner'),
      'nonNoteInner',
    );
    const noteInner = expectPresent(
      noteUiHeader.shadowRoot?.querySelector<HTMLElement>('.inner'),
      'noteInner',
    );

    expect(nonNoteUiHeader.sidebarExpanded).to.equal(true);
    expect(nonNoteUiHeader.hasAttribute('sidebar-expanded')).to.equal(true);

    expect(noteUiHeader.sidebarExpanded).to.equal(false);
    expect(noteUiHeader.hasAttribute('sidebar-expanded')).to.equal(false);

    expect(nonNoteInner.getBoundingClientRect().width).to.be.closeTo(777, 1);
    expect(noteInner.getBoundingClientRect().width).to.be.closeTo(777, 1);
    expect(nonNoteInner.getBoundingClientRect().width).to.be.closeTo(
      noteInner.getBoundingClientRect().width,
      1,
    );
  });

  it('1024px 以上では page kind によらず corpus dropdown trigger の開始位置が一致すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1440px;">
        <layout-header data-test="normal"></layout-header>
        <layout-header data-test="note" note-layout></layout-header>
        <layout-header data-test="note-sidebar" note-layout sidebar-enabled></layout-header>
      </div>
    `);

    const headers = [...wrapper.querySelectorAll<LayoutHeader>('layout-header')];
    expect(headers).to.have.length(3);
    for (const header of headers) {
      await waitForResponsiveState(header, false);
      expect(header.getBoundingClientRect().width).to.be.greaterThan(1023);
    }

    const lefts = await Promise.all(headers.map((header) => readCorpusTriggerLeft(header)));
    expectWithinPx(lefts[0] ?? 0, lefts[1] ?? 0, 1);
    expectWithinPx(lefts[0] ?? 0, lefts[2] ?? 0, 1);
  });

  it('640px 以上 1024px 未満では sidebar toggle 表示幅域でも corpus dropdown trigger の開始位置が一致すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 768px;">
        <layout-header data-test="normal"></layout-header>
        <layout-header data-test="note" note-layout></layout-header>
        <layout-header data-test="note-sidebar" note-layout sidebar-enabled></layout-header>
      </div>
    `);

    const headers = [...wrapper.querySelectorAll<LayoutHeader>('layout-header')];
    expect(headers).to.have.length(3);
    for (const header of headers) {
      await waitForResponsiveState(header, false);
      const width = header.getBoundingClientRect().width;
      expect(width).to.be.greaterThan(639);
      expect(width).to.be.lessThan(1024);
    }

    const lefts = await Promise.all(headers.map((header) => readCorpusTriggerLeft(header)));
    expectWithinPx(lefts[0] ?? 0, lefts[1] ?? 0, 1);
    expectWithinPx(lefts[0] ?? 0, lefts[2] ?? 0, 1);
  });

  it('container query の fractional boundary と runtime narrow-layout 属性が一致すること', async () => {
    const widths = [399.5, 400, 639.5, 640, 768, 1023, 1023.5, 1024, 1440] as const;

    for (const width of widths) {
      const wrapper = await fixture<HTMLDivElement>(html`
        <div style="inline-size: ${width}px; overflow: auto;">
          <layout-header
            note-layout
            sidebar-enabled
            toc-presence="present"
            toc-runtime-id="test-toc-${String(width).replace('.', '-')}"
          ></layout-header>
        </div>
      `);
      const header = expectPresent(
        wrapper.querySelector<LayoutHeader>('layout-header'),
        `layoutHeader ${width}`,
      );
      publishReadyTocRuntime(`test-toc-${String(width).replace('.', '-')}`);
      await waitUntil(
        () => Math.abs(header.getBoundingClientRect().width - width) <= 1,
        `${width}px の container width が反映されません`,
      );
      await waitForResponsiveState(header, width < 640);

      const measuredWidth = header.getBoundingClientRect().width;
      const corpusSwitcher = expectPresent(
        header.shadowRoot?.querySelector<HTMLElement>('.corpus-switcher'),
        'corpusSwitcher',
      );
      const corpusChevron = expectPresent(
        header.shadowRoot?.querySelector<HTMLElement>('.corpus-trigger-icon'),
        'corpusChevron',
      );
      const tocText = expectPresent(
        header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
        'tocText',
      );

      if (measuredWidth < 640) {
        expect(getComputedStyle(corpusSwitcher).display).to.equal('none');
        expect(header.hasAttribute('narrow-layout')).to.equal(true);
        expect(getComputedStyle(header).zIndex).to.not.equal('100');
      } else {
        expect(isVisible(corpusSwitcher)).to.equal(true);
        expect(isVisible(corpusChevron)).to.equal(true);
        expect(header.hasAttribute('narrow-layout')).to.equal(false);
        expect(wrapper.scrollWidth - wrapper.clientWidth).to.be.lessThanOrEqual(1);
      }

      if (measuredWidth < 400) {
        expect(getComputedStyle(tocText).display).to.equal('none');
      }
    }
  });

  it('stale な narrow-layout 属性は 640px 以上の responsive state 同期で除去されること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 768px;">
        <layout-header narrow-layout note-layout sidebar-enabled></layout-header>
      </div>
    `);
    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );

    await waitForResponsiveState(header, false);
    expect(header.hasAttribute('narrow-layout')).to.equal(false);
  });

  it('start / end slot group の gap と leading reserve を分離すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div
        style="
          inline-size: 768px;
          --layout-header-slot-group-gap: 2px;
          --layout-header-sidebar-toggle-interaction-bleed: 6px;
        "
      >
        <layout-header sidebar-enabled></layout-header>
      </div>
    `);
    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForResponsiveState(header, false);

    const { start, end } = readSlotGroups(header);
    await waitForComputedStyleValue(
      start,
      'gap',
      '6px',
      'start-slot-group の gap が 6px に同期されません',
    );
    await waitForComputedStyleValue(
      end,
      'gap',
      '2px',
      'end-slot-group の gap が 2px に同期されません',
    );
    await waitForComputedStyleValue(
      start,
      'paddingLeft',
      '38px',
      'start-slot-group の padding-left が 38px に同期されません',
    );
    await waitForComputedStyleValue(
      end,
      'paddingLeft',
      '0px',
      'end-slot-group の padding-left が 0px に同期されません',
    );
  });

  it('center start inset は 1024px 未満では token override、1024px 以上では fixed sidebar reserve に従うこと', async () => {
    const mediumWrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 768px; --layout-header-center-start-inset-with-sidebar: 52px;">
        <layout-header sidebar-enabled></layout-header>
      </div>
    `);
    const mediumHeader = expectPresent(
      mediumWrapper.querySelector<LayoutHeader>('layout-header'),
      'mediumHeader',
    );
    await waitForResponsiveState(mediumHeader, false);
    expect(readUiHeaderZoneCenterStyle(mediumHeader).left).to.equal('52px');

    const desktopWrapper = await fixture<HTMLDivElement>(html`
      <div
        style="
          inline-size: 1440px;
          --layout-header-center-start-inset-with-sidebar: 52px;
          --note-sidebar-width: 248px;
          --note-sidebar-main-gap: 32px;
        "
      >
        <layout-header sidebar-enabled></layout-header>
      </div>
    `);
    const desktopHeader = expectPresent(
      desktopWrapper.querySelector<LayoutHeader>('layout-header'),
      'desktopHeader',
    );
    await waitForResponsiveState(desktopHeader, false);
    expect(readUiHeaderZoneCenterStyle(desktopHeader).left).to.equal('280px');
  });

  it('1024px 未満と 1024px 以上の note-layout center-end inset contract を維持すること', async () => {
    const mediumWrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 768px;">
        <layout-header
          note-layout
          toc-presence="present"
          toc-runtime-id="test-toc"
          data-toc-owner-id="test-toc-owner"
          toc-trigger-reserved="true"
        ></layout-header>
      </div>
    `);
    const mediumHeader = expectPresent(
      mediumWrapper.querySelector<LayoutHeader>('layout-header'),
      'mediumHeader',
    );
    await waitForResponsiveState(mediumHeader, false);
    expect(readUiHeaderZoneCenterStyle(mediumHeader).right).to.not.equal('0px');

    const desktopWrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1440px; --note-toc-width: 260px; --note-shell-column-gap: 36px;">
        <layout-header
          note-layout
          toc-presence="present"
          toc-runtime-id="test-toc"
          data-toc-owner-id="test-toc-owner"
          toc-trigger-reserved="true"
        ></layout-header>
      </div>
    `);
    const desktopHeader = expectPresent(
      desktopWrapper.querySelector<LayoutHeader>('layout-header'),
      'desktopHeader',
    );
    await waitForResponsiveState(desktopHeader, false);
    expect(readUiHeaderZoneCenterStyle(desktopHeader).right).to.equal('296px');
  });

  it('sidebar toggle の min-block-size は sidebar-enabled の中幅だけに適用され desktop では解除されること', async () => {
    const mediumWrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 768px;">
        <layout-header data-test="normal"></layout-header>
        <layout-header data-test="sidebar" sidebar-enabled></layout-header>
      </div>
    `);
    const normalHeader = expectPresent(
      mediumWrapper.querySelector<LayoutHeader>('layout-header[data-test="normal"]'),
      'normalHeader',
    );
    const sidebarHeader = expectPresent(
      mediumWrapper.querySelector<LayoutHeader>('layout-header[data-test="sidebar"]'),
      'sidebarHeader',
    );
    await waitForResponsiveState(normalHeader, false);
    await waitForResponsiveState(sidebarHeader, false);

    await waitForComputedStyleValue(
      readSlotGroups(normalHeader).start,
      'minBlockSize',
      '0px',
      'normal start-slot-group の min-block-size が 0px に同期されません',
    );
    await waitForComputedStyleValue(
      readSlotGroups(sidebarHeader).start,
      'minBlockSize',
      '44px',
      'sidebar start-slot-group の min-block-size が 44px に同期されません',
    );

    const desktopWrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1440px;">
        <layout-header sidebar-enabled></layout-header>
      </div>
    `);
    const desktopHeader = expectPresent(
      desktopWrapper.querySelector<LayoutHeader>('layout-header'),
      'desktopHeader',
    );
    await waitForResponsiveState(desktopHeader, false);
    await waitForComputedStyleValue(
      readSlotGroups(desktopHeader).start,
      'minBlockSize',
      '0px',
      'desktop start-slot-group の min-block-size が 0px に同期されません',
    );
  });

  it('visible size override は sidebar toggle 実寸と reserve の両方へ反映されること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div
        style="
          inline-size: 768px;
          --layout-header-sidebar-toggle-visible-size: 40px;
          --layout-header-sidebar-toggle-interaction-bleed: 2px;
        "
      >
        <layout-header data-test="normal"></layout-header>
        <layout-header data-test="sidebar" sidebar-enabled></layout-header>
      </div>
    `);
    const normalHeader = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header[data-test="normal"]'),
      'normalHeader',
    );
    const sidebarHeader = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header[data-test="sidebar"]'),
      'sidebarHeader',
    );
    await waitForResponsiveState(normalHeader, false);
    await waitForResponsiveState(sidebarHeader, false);

    const toggle = expectPresent(
      sidebarHeader.shadowRoot?.querySelector<HTMLElement>('.sidebar-toggle'),
      'sidebarToggle',
    );
    const toggleRect = toggle.getBoundingClientRect();
    expectWithinPx(toggleRect.width, 40, 1);
    expectWithinPx(toggleRect.height, 40, 1);
    await waitForComputedStyleValue(
      readSlotGroups(sidebarHeader).start,
      'paddingLeft',
      '48px',
      'sidebar start-slot-group の padding-left が 48px に同期されません',
    );
    await waitForComputedStyleValue(
      readSlotGroups(sidebarHeader).start,
      'minBlockSize',
      '44px',
      'sidebar start-slot-group の min-block-size が 44px に同期されません',
    );
    expectWithinPx(
      await readCorpusTriggerLeft(normalHeader),
      await readCorpusTriggerLeft(sidebarHeader),
      1,
    );
  });

  it('visible size が 44px 以上の場合は bleed 0px で実寸と min-block-size が一致すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div
        style="
          inline-size: 768px;
          --layout-header-sidebar-toggle-visible-size: 48px;
          --layout-header-sidebar-toggle-interaction-bleed: 0px;
          --layout-header-slot-group-gap: 2px;
        "
      >
        <layout-header sidebar-enabled></layout-header>
      </div>
    `);
    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForResponsiveState(header, false);

    const toggle = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.sidebar-toggle'),
      'sidebarToggle',
    );
    expectWithinPx(toggle.getBoundingClientRect().width, 48, 1);
    expectWithinPx(toggle.getBoundingClientRect().height, 48, 1);
    await waitForComputedStyleValue(
      readSlotGroups(header).start,
      'gap',
      '2px',
      'start-slot-group の gap が 2px に同期されません',
    );
    await waitForComputedStyleValue(
      readSlotGroups(header).start,
      'minBlockSize',
      '48px',
      'start-slot-group の min-block-size が 48px に同期されません',
    );
  });

  it('--layout-header-start-leading-visual-reserve は reserve 下限を縮小せず、大きい値では拡張すること', async () => {
    const smallWrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 768px; --layout-header-start-leading-visual-reserve: 12px;">
        <layout-header></layout-header>
      </div>
    `);
    const smallHeader = expectPresent(
      smallWrapper.querySelector<LayoutHeader>('layout-header'),
      'smallHeader',
    );
    await waitForResponsiveState(smallHeader, false);
    await waitForComputedStyleValue(
      readSlotGroups(smallHeader).start,
      'paddingLeft',
      '40px',
      'small reserve start-slot-group の padding-left が 40px に同期されません',
    );

    const largeWrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 768px; --layout-header-start-leading-visual-reserve: 56px;">
        <layout-header></layout-header>
      </div>
    `);
    const largeHeader = expectPresent(
      largeWrapper.querySelector<LayoutHeader>('layout-header'),
      'largeHeader',
    );
    await waitForResponsiveState(largeHeader, false);
    await waitForComputedStyleValue(
      readSlotGroups(largeHeader).start,
      'paddingLeft',
      '56px',
      'large reserve start-slot-group の padding-left が 56px に同期されません',
    );
  });

  it('focus stacking contract を維持し、sidebar toggle focus 時も absolute 配置を維持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 768px;">
        <layout-header sidebar-enabled></layout-header>
      </div>
    `);
    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForResponsiveState(header, false);

    const corpusDropdown = expectPresent(
      header.shadowRoot?.querySelector<Dropdown>('.corpus-switcher'),
      'corpusDropdown',
    );
    const searchTrigger = getSearchTriggerHost(header.shadowRoot);
    const themeDropdown = expectPresent(
      header.shadowRoot?.querySelector<Dropdown>('[data-dropdown="theme"]'),
      'themeDropdown',
    );
    const sidebarToggle = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.sidebar-toggle'),
      'sidebarToggle',
    );

    const corpusTrigger = await waitForDropdownTrigger(corpusDropdown);
    expectPresent(
      corpusTrigger.shadowRoot?.querySelector<HTMLButtonElement>('button'),
      'corpusTriggerButton',
    ).focus();
    await expectFocusedHeaderItemRaised(header, corpusDropdown);

    getSearchTriggerButton(header.shadowRoot).focus();
    await expectFocusedHeaderItemRaised(header, searchTrigger);

    const themeTrigger = await waitForDropdownTrigger(themeDropdown);
    expectPresent(
      themeTrigger.shadowRoot?.querySelector<HTMLButtonElement>('button'),
      'themeTriggerButton',
    ).focus();
    await expectFocusedHeaderItemRaised(header, themeDropdown);

    expectPresent(
      sidebarToggle.shadowRoot?.querySelector<HTMLButtonElement>('button'),
      'sidebarToggleButton',
    ).focus();
    await waitForLitUpdate(header);

    const toggleStyle = getComputedStyle(sidebarToggle);
    expect(toggleStyle.position).to.equal('absolute');
    expect(toggleStyle.zIndex).to.equal('1');
    expect(toggleStyle.transform).to.not.equal('none');
  });

  it('desktop の note-layout では sidebar-main gap を含む start reserve と TOC reserve を使うこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1440px; --note-sidebar-main-gap: 32px;">
        <layout-header note-layout sidebar-enabled toc-presence="present"></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
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
    expect(styles.right).to.equal('272px');
  });

  it('toc-presence=absent の note-layout は desktop で right reserve を持たないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1440px; --note-sidebar-main-gap: 32px;">
        <layout-header note-layout sidebar-enabled toc-presence="absent"></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
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
    expect(styles.right).to.equal('0px');
  });

  it('note-layout の center reserve は新しい TOC 幅 fallback を使うこと', async () => {
    const headerSource = await fetch(
      new URL('../../src/components/layout/layout-header.ts', import.meta.url).href,
    ).then((response) => response.text());

    expect(headerSource).to.contain('var(--note-toc-width, clamp(15rem, 18vw, 17rem))');
    expect(headerSource).not.to.contain('var(--note-toc-width, 216px)');
  });

  it('shell projection に tocPresence を round-trip すること', async () => {
    const header = await fixture<LayoutHeader>(
      html`<layout-header toc-presence="present"></layout-header>`,
    );
    await waitForLitUpdate(header);

    header.applyShellProjection({
      corpora: EMPTY_CORPUS_NAVIGATION_PROJECTION_PAYLOAD,
      currentCorpusKey: 'all',
      noteLayout: true,
      sidebarEnabled: true,
      sidebarId: DEFAULT_LAYOUT_SIDEBAR_ID,
      tocPresence: 'absent',
      tocRuntimeId: null,
      tocOwnerId: null,
      tocTriggerReserved: false,
    });
    await waitForLitUpdate(header);

    expect(header.getAttribute('toc-presence')).to.equal('absent');
    expect(header.readShellProjection().tocPresence).to.equal('absent');
  });

  it('shell projection が present から absent へ更新されると TOC runtime 属性を削除すること', async () => {
    const header = await fixture<LayoutHeader>(
      html`<layout-header
        note-layout
        toc-presence="present"
        toc-runtime-id="old-runtime-id"
        data-toc-owner-id="old-owner-id"
        toc-trigger-reserved="true"
      ></layout-header>`,
    );
    await waitForLitUpdate(header);

    expect(header.getAttribute('toc-runtime-id')).to.equal('old-runtime-id');
    expect(header.getAttribute('data-toc-owner-id')).to.equal('old-owner-id');

    header.applyShellProjection({
      corpora: EMPTY_CORPUS_NAVIGATION_PROJECTION_PAYLOAD,
      currentCorpusKey: 'all',
      noteLayout: false,
      sidebarEnabled: false,
      sidebarId: DEFAULT_LAYOUT_SIDEBAR_ID,
      tocPresence: 'absent',
      tocRuntimeId: null,
      tocOwnerId: null,
      tocTriggerReserved: false,
    });
    await waitForLitUpdate(header);

    const trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );

    expect(header.getAttribute('toc-presence')).to.equal('absent');
    expect(header.getAttribute('toc-trigger-reserved')).to.equal('false');
    expect(header.hasAttribute('toc-runtime-id')).to.equal(false);
    expect(header.hasAttribute('data-toc-owner-id')).to.equal(false);
    expect(header.readShellProjection().tocRuntimeId).to.equal(null);
    expect(header.readShellProjection().tocOwnerId).to.equal(null);
    expect(isVisible(trigger)).to.equal(false);
    expect(trigger.disabled).to.equal(true);
  });

  it('sidebar disabled snapshot は stale sidebar-id を default に正規化すること', async () => {
    const header = await fixture<LayoutHeader>(
      html`<layout-header sidebar-id="note-secondary"></layout-header>`,
    );
    await waitForLitUpdate(header);

    expect(header.readShellProjection().sidebarEnabled).to.equal(false);
    expect(header.readShellProjection().sidebarId).to.equal(DEFAULT_LAYOUT_SIDEBAR_ID);

    header.applyShellProjection({
      corpora: EMPTY_CORPUS_NAVIGATION_PROJECTION_PAYLOAD,
      currentCorpusKey: 'all',
      noteLayout: false,
      sidebarEnabled: false,
      sidebarId: 'note-secondary',
      tocPresence: 'absent',
      tocRuntimeId: null,
      tocOwnerId: null,
      tocTriggerReserved: false,
    });
    await waitForLitUpdate(header);

    expect(header.getAttribute('sidebar-id')).to.equal(DEFAULT_LAYOUT_SIDEBAR_ID);
    expect(header.readShellProjection().sidebarId).to.equal(DEFAULT_LAYOUT_SIDEBAR_ID);
  });

  it('shell projection は TOC trigger reservation と interactive state を分離して round-trip すること', async () => {
    const header = await fixture<LayoutHeader>(
      html`<layout-header
        note-layout
        toc-presence="present"
        toc-runtime-id="test-toc"
        toc-trigger-reserved
      ></layout-header>`,
    );
    await waitForLitUpdate(header);

    let trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );

    expect(header.readShellProjection().tocTriggerReserved).to.equal(true);
    expect(trigger.getAttribute('data-toc-trigger-reserved')).to.equal('true');
    expect(trigger.getAttribute('data-toc-trigger-interactive')).to.equal('false');
    expect(trigger.disabled).to.equal(true);

    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );
    expect(trigger.getAttribute('data-toc-trigger-reserved')).to.equal('true');
    expect(trigger.getAttribute('data-toc-trigger-interactive')).to.equal('true');
    expect(trigger.disabled).to.equal(false);

    header.applyShellProjection({
      corpora: EMPTY_CORPUS_NAVIGATION_PROJECTION_PAYLOAD,
      currentCorpusKey: 'all',
      noteLayout: true,
      sidebarEnabled: false,
      sidebarId: DEFAULT_LAYOUT_SIDEBAR_ID,
      tocPresence: 'present',
      tocRuntimeId: 'next-toc',
      tocOwnerId: 'next-toc-owner',
      tocTriggerReserved: false,
    });
    await waitForLitUpdate(header);

    trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );
    expect(header.getAttribute('toc-trigger-reserved')).to.equal('false');
    expect(header.readShellProjection().tocTriggerReserved).to.equal(false);
    expect(trigger.getAttribute('data-toc-trigger-reserved')).to.equal('false');
    expect(trigger.getAttribute('data-toc-trigger-interactive')).to.equal('false');
  });

  it('640px では TOC trigger が非表示であること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 640px;">
        <layout-header
          note-layout
          toc-presence="present"
          toc-runtime-id="test-toc"
          data-toc-owner-id="test-toc-owner"
          toc-trigger-reserved="true"
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );
    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );

    expect(trigger.getAttribute('data-visible')).to.equal('true');
    expect(getComputedStyle(trigger).display).to.equal('none');
    expect(getComputedStyle(triggerText).display).to.not.equal('none');
    expect(triggerText.textContent?.trim()).to.equal('目次');
  });

  it('639px の mobile note では corpus chevron と TOC trigger が visible で、header が右方向へはみ出さないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 639px; overflow: auto;">
        <layout-header
          note-layout
          current-corpus-key="program"
          toc-presence="present"
          toc-runtime-id="test-toc"
          data-toc-owner-id="test-toc-owner"
          toc-trigger-reserved="true"
          corpora-json=${serializeCorpusPayload([
            { key: 'all', label: 'すべてのノート', href: '/corpora/' },
            { key: 'program', label: 'Program corpus with a relatively long label for 639px boundary verification', href: '/corpora/program/' },
          ])}
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );
    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );
    const corpusChevron = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>(
        '.corpus-switcher [slot="trigger"] [data-icon="chevron-down"]',
      ),
      'corpusChevron',
    );
    const horizontalOverflow = wrapper.scrollWidth - wrapper.clientWidth;

    expect(getComputedStyle(trigger).display).to.not.equal('none');
    expect(getComputedStyle(triggerText).display).to.not.equal('none');
    expect(isVisible(corpusChevron)).to.equal(true);
    expect(horizontalOverflow).to.be.lessThanOrEqual(1);
    expect(triggerText.textContent?.trim()).to.equal('目次');
    expect(header.shadowRoot?.querySelector('.toc-trigger-progress')).to.equal(null);
  });

  it('400px の mobile note では TOC trigger が icon と固定ラベルを表示すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 400px;">
        <layout-header note-layout toc-presence="present" toc-runtime-id="test-toc"></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );

    expect(getComputedStyle(triggerText).display).to.not.equal('none');
    expect(triggerText.textContent?.trim()).to.equal('目次');
    expect(header.shadowRoot?.querySelector('.toc-trigger-progress')).to.equal(null);
    expect(header.shadowRoot?.querySelector('.compact-note-label')).to.equal(null);
  });

  it('399px の mobile note では TOC trigger が icon only になること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 399px;">
        <layout-header note-layout toc-presence="present" toc-runtime-id="test-toc"></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );

    expect(getComputedStyle(triggerText).display).to.equal('none');
    expect(header.shadowRoot?.querySelector('.toc-trigger-progress')).to.equal(null);
  });

  it('375px の mobile note では TOC trigger が icon only になること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px; overflow: auto;">
        <layout-header
          note-layout
          current-corpus-key="program"
          toc-presence="present"
          toc-runtime-id="test-toc"
          data-toc-owner-id="test-toc-owner"
          toc-trigger-reserved="true"
          corpora-json=${serializeCorpusPayload([
            { key: 'all', label: 'すべてのノート', href: '/corpora/' },
            { key: 'program', label: 'Program corpus with a relatively long label for mobile overflow verification', href: '/corpora/program/' },
          ])}
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );
    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );

    expect(trigger.getAttribute('data-visible')).to.equal('true');
    expect(getComputedStyle(triggerText).display).to.equal('none');
    expect(wrapper.scrollWidth - wrapper.clientWidth).to.be.lessThanOrEqual(1);
    expect(header.shadowRoot?.querySelector('.toc-trigger-progress')).to.equal(null);
    expect(header.shadowRoot?.querySelector('.compact-note-label')).to.equal(null);
  });

  it('focused mobile TOC trigger is raised without adding horizontal overflow', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px; overflow: auto;">
        <layout-header
          note-layout
          toc-presence="present"
          toc-runtime-id="test-toc"
          data-toc-owner-id="test-toc-owner"
          toc-trigger-reserved="true"
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );

    expect(getComputedStyle(trigger).display).to.not.equal('none');

    trigger.focus();
    await expectFocusedHeaderItemRaised(header, trigger);
    expect(wrapper.scrollWidth - wrapper.clientWidth).to.be.lessThanOrEqual(1);
  });

  it('desktop note with sidebar reserve does not overflow while focus bleed is allowed', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 1024px; overflow: auto;">
        <layout-header
          note-layout
          sidebar-enabled
          current-corpus-key="program"
          toc-presence="present"
          corpora-json=${serializeCorpusPayload([
            { key: 'all', label: 'すべてのノート', href: '/corpora/' },
            { key: 'program', label: 'Program corpus with a relatively long label for desktop sidebar verification', href: '/corpora/program/' },
          ])}
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    expect(wrapper.scrollWidth - wrapper.clientWidth).to.be.lessThanOrEqual(1);
  });

  it('runtime activeId が変化しても header TOC trigger の可視文言は固定の 目次 であること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 430px;">
        <layout-header note-layout toc-presence="present" toc-runtime-id="test-toc"></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    publishReadyTocRuntime('test-toc', { activeId: 'deep-section' });
    await waitForLitUpdate(header);

    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );

    expect(getComputedStyle(triggerText).display).to.not.equal('none');
    expect(triggerText.textContent?.trim()).to.equal('目次');
  });

  it('400px 台の過密幅でも corpus chevron と TOC trigger を維持しつつ header が右方向へはみ出さないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 410px; overflow: auto;">
        <layout-header
          note-layout
          current-corpus-key="program"
          toc-presence="present"
          toc-runtime-id="test-toc"
          corpora-json=${serializeCorpusPayload([
            { key: 'all', label: 'すべてのノート', href: '/corpora/' },
            { key: 'program', label: 'Program corpus with a relatively long label for packed-width verification', href: '/corpora/program/' },
          ])}
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const horizontalOverflow = wrapper.scrollWidth - wrapper.clientWidth;
    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );
    const corpusSwitcher = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.corpus-switcher'),
      'corpusSwitcher',
    );
    const corpusChevron = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>(
        '.corpus-switcher [slot="trigger"] [data-icon="chevron-down"]',
      ),
      'corpusChevron',
    );

    expect(horizontalOverflow).to.be.lessThanOrEqual(1);
    expect(getComputedStyle(triggerText).display).to.not.equal('none');
    expect(isVisible(corpusSwitcher)).to.equal(true);
    expect(isVisible(corpusChevron)).to.equal(true);
    expect(triggerText.textContent?.trim()).to.equal('目次');
  });

  it('non-note の TOC page でも 639px で同じ TOC trigger 契約が成立すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 639px;">
        <layout-header
          toc-presence="present"
          toc-runtime-id="test-toc"
          data-toc-owner-id="test-toc-owner"
          toc-trigger-reserved="true"
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const trigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );
    const triggerText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.toc-trigger-text'),
      'tocTriggerText',
    );

    expect(getComputedStyle(trigger).display).to.not.equal('none');
    expect(getComputedStyle(triggerText).display).to.not.equal('none');
    expect(triggerText.textContent?.trim()).to.equal('目次');
    expect(header.shadowRoot?.querySelector('.toc-trigger-progress')).to.equal(null);
    expect(header.shadowRoot?.querySelector('.compact-note-label')).to.equal(null);
  });

  it('toc mobile controller snapshot を aria-expanded へ反映すること', async () => {
    const header = await fixture<LayoutHeader>(html`
      <layout-header
        note-layout
        toc-presence="present"
        toc-runtime-id="test-toc"
        data-toc-owner-id="test-toc-owner"
        toc-trigger-reserved="true"
      ></layout-header>
    `);

    layoutTocRuntimeStore.publish('test-toc', {
      ready: true,
      hasVisibleHeadings: true,
      activeId: 'intro',
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

  it('mobile 幅の theme dropdown 初回 open で positioning 中は不可視、ready 後に操作可能になること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header note-layout sidebar-enabled></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    const themeDropdown = expectPresent(
      header.shadowRoot?.querySelector<Dropdown>('[data-dropdown="theme"]'),
      'themeDropdown',
    );
    const trigger = expectPresent(
      themeDropdown.querySelector<HTMLElement>('[slot="trigger"]'),
      'themeTrigger',
    );

    trigger.click();
    await waitForLitUpdate(header);

    const positioningPanel = expectPresent(themeDropdown.getMenuElement(), 'positioningPanel');
    expect(getPanelPhase(positioningPanel)).to.equal('positioning');
    expect(getComputedStyle(positioningPanel).visibility).to.equal('hidden');
    expect(getComputedStyle(positioningPanel).pointerEvents).to.equal('none');

    const panel = await waitForDropdownReady(themeDropdown);

    expect(getPanelPhase(panel)).to.equal('ready');
    expect(getComputedStyle(panel).visibility).to.equal('visible');
    expect(getComputedStyle(panel).pointerEvents).to.equal('auto');
    expect(panel.getAttribute('aria-hidden')).to.equal('false');
    expect(panel.hasAttribute('inert')).to.equal(false);
  });

  it('mobile 幅の theme dropdown は ready 前に trigger aria-expanded を true にしないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header note-layout sidebar-enabled></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    const themeDropdown = expectPresent(
      header.shadowRoot?.querySelector<Dropdown>('[data-dropdown="theme"]'),
      'themeDropdown',
    );
    const trigger = expectPresent(
      themeDropdown.querySelector<HTMLElement>('[slot="trigger"]'),
      'themeTrigger',
    );

    trigger.click();
    await waitForLitUpdate(header);

    expect(trigger.getAttribute('aria-expanded')).to.equal('false');

    const panel = await waitForDropdownReady(themeDropdown);
    expect(getPanelPhase(panel)).to.equal('ready');
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
  });

  it('mobile 幅の corpus dropdown 初回 open で positioning 中は不可視、再 open でも操作可能になること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 375px;">
        <layout-header
          note-layout
          current-corpus-key="program"
          corpora-json=${serializeCorpusPayload([
            { key: 'all', label: 'すべてのノート', href: '/corpora/' },
            { key: 'program', label: 'Program corpus', href: '/corpora/program/' },
          ])}
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    await waitForLitUpdate(header);

    const corpusDropdown = expectPresent(
      header.shadowRoot?.querySelector<Dropdown>('.corpus-switcher'),
      'corpusDropdown',
    );
    const trigger = expectPresent(
      corpusDropdown.querySelector<HTMLElement>('[slot="trigger"]'),
      'corpusTrigger',
    );

    for (let attempt = 0; attempt < 2; attempt += 1) {
      trigger.click();
      await waitForLitUpdate(header);

      const positioningPanel = expectPresent(corpusDropdown.getMenuElement(), 'positioningPanel');
      expect(getPanelPhase(positioningPanel)).to.equal('positioning');
      expect(getComputedStyle(positioningPanel).visibility).to.equal('hidden');
      expect(getComputedStyle(positioningPanel).pointerEvents).to.equal('none');

      const panel = await waitForDropdownReady(corpusDropdown);

      expect(getPanelPhase(panel)).to.equal('ready');
      expect(getComputedStyle(panel).visibility).to.equal('visible');
      expect(getComputedStyle(panel).pointerEvents).to.equal('auto');
      expect(panel.getAttribute('aria-hidden')).to.equal('false');
      expect(panel.hasAttribute('inert')).to.equal(false);

      corpusDropdown.close(false);
      await waitForLitUpdate(header);
      await waitForDropdownIdle(corpusDropdown);
    }
  });

  it('header family の token 注入で theme / corpus / TOC と search-trigger の公開 style input を分離制御できること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div
        style="
          inline-size: 1024px;
          --layout-header-trigger-content-gap-default: 10px;
          --layout-header-trigger-content-gap-compact: 6px;
          --layout-header-trigger-affordance-gap-default: 8px;
          --layout-header-trigger-affordance-gap-compact: 4px;
          --layout-header-trigger-padding-inline-default: 14px;
          --layout-header-trigger-padding-inline-compact: 9px;
        "
      >
        <layout-header
          note-layout
          current-corpus-key="program"
          toc-presence="present"
          toc-runtime-id="test-toc"
          corpora-json=${serializeCorpusPayload([
            { key: 'all', label: 'すべてのノート', href: '/corpora/' },
            { key: 'program', label: 'Program corpus', href: '/corpora/program/' },
          ])}
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const themeMain = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.theme-trigger-main'),
      'themeTriggerMain',
    );
    const corpusLabel = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.corpus-trigger-label'),
      'corpusTriggerLabel',
    );
    const tocTrigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );
    const searchButton = getSearchTriggerButton(header.shadowRoot);

    expect(getComputedStyle(themeMain).gap).to.equal('10px');
    expect(getComputedStyle(corpusLabel).gap).to.equal('8px');
    expect(getComputedStyle(tocTrigger).gap).to.equal('6px');
    expect(getComputedStyle(tocTrigger).paddingLeft).to.equal('9px');
    expect(getComputedStyle(tocTrigger).paddingRight).to.equal('9px');

    const buttonStyle = getComputedStyle(searchButton);

    if (window.matchMedia('(max-width: 639px)').matches) {
      expect(buttonStyle.paddingLeft).to.equal('0px');
      expect(buttonStyle.paddingRight).to.equal('0px');
    } else if (window.matchMedia('(max-width: 960px)').matches) {
      expect(buttonStyle.gap).to.equal('6px');
      expect(buttonStyle.paddingLeft).to.equal('9px');
      expect(buttonStyle.paddingRight).to.equal('9px');
    } else {
      expect(buttonStyle.gap).to.equal('10px');
      expect(buttonStyle.paddingLeft).to.equal('14px');
      expect(buttonStyle.paddingRight).to.equal('14px');
    }
  });

  it('狭幅では TOC に compact token が反映され、search-trigger は auto 縮退規則を壊さないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div
        style="
          inline-size: 375px;
          --layout-header-trigger-content-gap-default: 10px;
          --layout-header-trigger-content-gap-compact: 6px;
          --layout-header-trigger-affordance-gap-default: 8px;
          --layout-header-trigger-affordance-gap-compact: 4px;
          --layout-header-trigger-padding-inline-default: 14px;
          --layout-header-trigger-padding-inline-compact: 9px;
        "
      >
        <layout-header note-layout toc-presence="present" toc-runtime-id="test-toc"></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const tocTrigger = expectPresent(
      header.shadowRoot?.querySelector<HTMLButtonElement>('.toc-trigger'),
      'tocTrigger',
    );
    const searchTrigger = getSearchTriggerHost(header.shadowRoot);
    const searchButton = getSearchTriggerButton(header.shadowRoot);

    expect(getComputedStyle(tocTrigger).gap).to.equal('6px');
    expect(getComputedStyle(tocTrigger).paddingLeft).to.equal('9px');
    expect(getComputedStyle(tocTrigger).paddingRight).to.equal('9px');
    expect(
      getComputedStyle(searchTrigger).getPropertyValue('--search-trigger-gap-compact').trim(),
    ).to.equal('6px');
    expect(
      getComputedStyle(searchTrigger)
        .getPropertyValue('--search-trigger-padding-inline-compact')
        .trim(),
    ).to.equal('9px');

    const buttonStyle = getComputedStyle(searchButton);
    const searchPlaceholder = expectPresent(
      searchTrigger.querySelector<HTMLElement>('.search-trigger__label'),
      'searchPlaceholder',
    );

    /*
     * layout-header の narrow 判定は container inline-size 契約だが、
     * ui-search-trigger[density="auto"] の縮退は search-trigger 自身の
     * viewport media query 契約である。ここで headerWidth < 640 を使って
     * search-trigger の icon-only 化を期待してはならない。
     */
    if (window.matchMedia('(max-width: 639px)').matches) {
      expect(buttonStyle.justifyContent).to.equal('center');
      expect(buttonStyle.paddingLeft).to.equal('0px');
      expect(buttonStyle.paddingRight).to.equal('0px');
      expect(getComputedStyle(searchPlaceholder).display).to.not.equal('none');
      return;
    }

    expect(buttonStyle.justifyContent).to.equal('flex-start');
    expect(getComputedStyle(searchPlaceholder).display).to.not.equal('none');

    if (window.matchMedia('(max-width: 960px)').matches) {
      expect(buttonStyle.gap).to.equal('6px');
      expect(buttonStyle.paddingLeft).to.equal('9px');
      expect(buttonStyle.paddingRight).to.equal('9px');
      return;
    }

    expect(buttonStyle.gap).to.equal('10px');
    expect(buttonStyle.paddingLeft).to.equal('14px');
    expect(buttonStyle.paddingRight).to.equal('14px');
  });

  it('長い corpus label でも truncate を維持しつつ chevron を消さないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 410px; overflow: auto;">
        <layout-header
          note-layout
          current-corpus-key="program"
          toc-presence="present"
          toc-runtime-id="test-toc"
          site-origin="https://example.com"
          base-path=""
          corpora-json='{"schemaVersion":1,"source":"corpus-navigation-projection","items":[{"key":"all","label":"すべてのノート","href":"/corpora/"},{"key":"program","label":"Program corpus with a relatively long label for truncate verification across a packed mobile header","href":"/corpora/program/"}]}'
        ></layout-header>
      </div>
    `);

    const header = expectPresent(
      wrapper.querySelector<LayoutHeader>('layout-header'),
      'layoutHeader',
    );
    publishReadyTocRuntime('test-toc');
    await waitForLitUpdate(header);

    const corpusText = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.corpus-trigger-text'),
      'corpusTriggerText',
    );
    const corpusChevron = expectPresent(
      header.shadowRoot?.querySelector<HTMLElement>('.corpus-trigger-icon'),
      'corpusChevron',
    );

    expect(wrapper.scrollWidth - wrapper.clientWidth).to.be.lessThanOrEqual(1);
    expect(corpusText.scrollWidth).to.be.greaterThan(corpusText.clientWidth);
    expect(isVisible(corpusChevron)).to.equal(true);
  });
});
