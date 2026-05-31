import { expect } from '@open-wc/testing';
import { buildThemeChromeBootstrapScript } from '../../src/theme/theme-chrome-bootstrap.js';

interface ThemeTriggerState {
  icon: string | null;
  iconChildCount: number;
  label: string;
  marker: string | null;
  accessibleName: string | null;
  selectedItems: { value: string | null; icon: string | null; iconChildCount: number }[];
}

const createThemeChromeHtml = (): string => `
  <ui-dropdown data-dropdown="theme">
    <ui-button slot="trigger" accessible-name="テーマ: OSテーマ">
      <span class="theme-trigger-main" data-theme-preference="system">
        <svg class="theme-trigger-icon" data-icon="monitor"><path></path></svg>
        <span class="theme-trigger-text">OSテーマ</span>
      </span>
    </ui-button>
    <ui-menu-item value="light"><svg data-icon="sun"><path></path></svg>ライト</ui-menu-item>
    <ui-menu-item value="dark"><svg data-icon="moon"><path></path></svg>ダーク</ui-menu-item>
    <ui-menu-item value="system" data-selected><svg data-icon="check"><path></path></svg>OSテーマ</ui-menu-item>
    <ui-menu-item value="unknown" data-selected><svg data-icon="check"><path></path></svg>不正値</ui-menu-item>
  </ui-dropdown>
`;

const runThemeChromeBootstrapScript = (): void => {
  const element = document.createElement('script');
  element.textContent = buildThemeChromeBootstrapScript();
  document.body.append(element);
  element.remove();
};

const readThemeTriggerState = (root: ParentNode): ThemeTriggerState => {
  const trigger = root.querySelector<HTMLElement>('[data-dropdown="theme"] [slot="trigger"]');
  if (!(trigger instanceof HTMLElement)) {
    throw new Error('theme trigger が見つかりません');
  }

  const icon = trigger.querySelector<SVGElement>('.theme-trigger-icon');
  const label = trigger.querySelector<HTMLElement>('.theme-trigger-text');
  const main = trigger.querySelector<HTMLElement>('.theme-trigger-main');
  const selectedItems = [
    ...root.querySelectorAll<HTMLElement>('[data-dropdown="theme"] ui-menu-item[data-selected]'),
  ].map((item) => {
    const itemIcon = item.querySelector<SVGElement>('[data-icon]');
    return {
      value: item.getAttribute('value'),
      icon: itemIcon?.getAttribute('data-icon') ?? null,
      iconChildCount: itemIcon?.childElementCount ?? 0,
    };
  });

  return {
    icon: icon?.getAttribute('data-icon') ?? null,
    iconChildCount: icon?.childElementCount ?? 0,
    label: label?.textContent?.trim() ?? '',
    marker: main?.getAttribute('data-theme-preference') ?? null,
    accessibleName: trigger.getAttribute('accessible-name'),
    selectedItems,
  };
};

const expectSystemThemeState = (state: ThemeTriggerState): void => {
  expect(state.icon).to.equal('monitor');
  expect(state.iconChildCount).to.be.greaterThan(0);
  expect(state.label).to.equal('OSテーマ');
  expect(state.marker).to.equal('system');
  expect(state.accessibleName).to.equal('テーマ: OSテーマ');
  expect(state.selectedItems).to.have.length(1);
  expect(state.selectedItems[0]).to.include({ value: 'system', icon: 'check' });
  expect(state.selectedItems[0]?.iconChildCount).to.be.greaterThan(0);
};

describe('theme chrome bootstrap browser contract', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-resolved-theme');
    document.documentElement.style.colorScheme = '';
    document.querySelectorAll('layout-header, script[data-theme-chrome-bootstrap-test]').forEach(
      (element) => element.remove(),
    );
  });

  it('open shadow root の light theme chrome を補正すること', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    const header = document.createElement('layout-header');
    const root = header.attachShadow({ mode: 'open' });
    root.innerHTML = createThemeChromeHtml();
    document.body.append(header);

    runThemeChromeBootstrapScript();

    const state = readThemeTriggerState(root);
    expect(state.icon).to.equal('sun');
    expect(state.iconChildCount).to.be.greaterThan(0);
    expect(state.label).to.equal('ライト');
    expect(state.marker).to.equal('light');
    expect(state.accessibleName).to.equal('テーマ: ライト');
    expect(state.selectedItems).to.have.length(1);
    expect(state.selectedItems[0]).to.include({ value: 'light', icon: 'check' });
    expect(state.selectedItems[0]?.iconChildCount).to.be.greaterThan(0);
  });

  it('declarative shadow DOM fallback の dark theme chrome を補正すること', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const header = document.createElement('layout-header');
    const template = document.createElement('template');
    template.setAttribute('shadowrootmode', 'open');
    template.innerHTML = createThemeChromeHtml();
    header.append(template);
    document.body.append(header);

    runThemeChromeBootstrapScript();

    const state = readThemeTriggerState(template.content);
    expect(state.icon).to.equal('moon');
    expect(state.iconChildCount).to.be.greaterThan(0);
    expect(state.label).to.equal('ダーク');
    expect(state.marker).to.equal('dark');
    expect(state.accessibleName).to.equal('テーマ: ダーク');
    expect(state.selectedItems).to.have.length(1);
    expect(state.selectedItems[0]).to.include({ value: 'dark', icon: 'check' });
    expect(state.selectedItems[0]?.iconChildCount).to.be.greaterThan(0);
  });

  for (const value of [null, 'invalid', 'system'] as const) {
    it(`data-theme=${String(value)} は system 表示へ fallback すること`, () => {
      if (value !== null) {
        document.documentElement.setAttribute('data-theme', value);
      }
      const header = document.createElement('layout-header');
      const root = header.attachShadow({ mode: 'open' });
      root.innerHTML = createThemeChromeHtml();
      document.body.append(header);

      runThemeChromeBootstrapScript();

      expectSystemThemeState(readThemeTriggerState(root));
      expect(root.querySelector('ui-menu-item[value="unknown"]')?.hasAttribute('data-selected')).to
        .equal(false);
    });
  }
});
