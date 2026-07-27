import { describe, expect, it } from 'vitest';
import {
  findTabIndexByValue,
  resolveKeyNavigation,
  resolveSelectedIndex,
} from '../../src/components/ui/tabs/tabs-model.js';

const createTabs = (...values: string[]): HTMLElement[] =>
  values.map((value) => {
    const el = document.createElement('button');
    el.setAttribute('value', value);
    return el;
  });

describe('tabs-model', () => {
  it('findTabIndexByValue: value に対応する index を返すこと', () => {
    const tabs = createTabs('overview', 'details', 'settings');

    expect(findTabIndexByValue(tabs, 'details', tabs.length)).to.equal(1);
    expect(findTabIndexByValue(tabs, 'missing', tabs.length)).to.equal(-1);
  });

  it('resolveSelectedIndex: selected-value が default-selected-value より優先されること', () => {
    const tabs = createTabs('alpha', 'beta', 'gamma');

    const result = resolveSelectedIndex(
      {
        selectedValue: 'gamma',
        defaultSelectedValue: 'alpha',
        currentActiveIndex: 0,
        initialized: false,
        count: tabs.length,
        urlValue: null,
        urlSource: null,
      },
      (value) => findTabIndexByValue(tabs, value, tabs.length),
    );

    expect(result.index).to.equal(2);
    expect(result.source).to.equal('selected-value');
    expect(result.warning).to.equal(null);
  });

  it('resolveSelectedIndex: 初回のみ default-selected-value を評価すること', () => {
    const tabs = createTabs('alpha', 'beta', 'gamma');

    const result = resolveSelectedIndex(
      {
        selectedValue: null,
        defaultSelectedValue: 'beta',
        currentActiveIndex: 0,
        initialized: false,
        count: tabs.length,
        urlValue: null,
        urlSource: null,
      },
      (value) => findTabIndexByValue(tabs, value, tabs.length),
    );

    expect(result.index).to.equal(1);
    expect(result.source).to.equal('default-selected-value');
    expect(result.warning).to.equal(null);
  });

  it('resolveSelectedIndex: 初期化後は currentActiveIndex を維持すること', () => {
    const tabs = createTabs('alpha', 'beta', 'gamma');

    const result = resolveSelectedIndex(
      {
        selectedValue: null,
        defaultSelectedValue: 'alpha',
        currentActiveIndex: 2,
        initialized: true,
        count: tabs.length,
        urlValue: null,
        urlSource: null,
      },
      (value) => findTabIndexByValue(tabs, value, tabs.length),
    );

    expect(result.index).to.equal(2);
    expect(result.source).to.equal('current');
    expect(result.warning).to.equal(null);
  });

  it('resolveSelectedIndex: urlValue がある場合は selected-value より優先されること', () => {
    const tabs = createTabs('overview', 'details', 'settings');

    const result = resolveSelectedIndex(
      {
        selectedValue: 'overview',
        defaultSelectedValue: 'settings',
        currentActiveIndex: 0,
        initialized: false,
        count: tabs.length,
        urlValue: 'details',
        urlSource: 'query',
      },
      (value) => findTabIndexByValue(tabs, value, tabs.length),
    );

    expect(result.index).to.equal(1);
    expect(result.source).to.equal('query');
    expect(result.warning).to.equal(null);
  });

  it('resolveSelectedIndex: 無効な selected-value の場合は先頭にフォールバックし warning を返すこと', () => {
    const tabs = createTabs('overview', 'details');

    const result = resolveSelectedIndex(
      {
        selectedValue: 'missing',
        defaultSelectedValue: null,
        currentActiveIndex: 0,
        initialized: false,
        count: tabs.length,
        urlValue: null,
        urlSource: null,
      },
      (value) => findTabIndexByValue(tabs, value, tabs.length),
    );

    expect(result.index).to.equal(0);
    expect(result.source).to.equal('fallback');
    expect(result.warning).to.contain('selected-value="missing"');
  });

  it('resolveKeyNavigation: horizontal で ArrowLeft / ArrowRight / Home / End が循環すること', () => {
    expect(
      resolveKeyNavigation({
        key: 'ArrowRight',
        currentIndex: 0,
        count: 3,
        orientation: 'horizontal',
      }),
    ).to.deep.equal({
      kind: 'move-focus',
      nextIndex: 1,
    });

    expect(
      resolveKeyNavigation({
        key: 'ArrowLeft',
        currentIndex: 0,
        count: 3,
        orientation: 'horizontal',
      }),
    ).to.deep.equal({
      kind: 'move-focus',
      nextIndex: 2,
    });

    expect(
      resolveKeyNavigation({
        key: 'Home',
        currentIndex: 2,
        count: 3,
        orientation: 'horizontal',
      }),
    ).to.deep.equal({
      kind: 'move-focus',
      nextIndex: 0,
    });

    expect(
      resolveKeyNavigation({
        key: 'End',
        currentIndex: 0,
        count: 3,
        orientation: 'horizontal',
      }),
    ).to.deep.equal({
      kind: 'move-focus',
      nextIndex: 2,
    });
  });

  it('resolveKeyNavigation: vertical では ArrowUp / ArrowDown を使い、ArrowLeft は無視すること', () => {
    expect(
      resolveKeyNavigation({
        key: 'ArrowDown',
        currentIndex: 0,
        count: 3,
        orientation: 'vertical',
      }),
    ).to.deep.equal({
      kind: 'move-focus',
      nextIndex: 1,
    });

    expect(
      resolveKeyNavigation({
        key: 'ArrowUp',
        currentIndex: 0,
        count: 3,
        orientation: 'vertical',
      }),
    ).to.deep.equal({
      kind: 'move-focus',
      nextIndex: 2,
    });

    expect(
      resolveKeyNavigation({
        key: 'ArrowLeft',
        currentIndex: 1,
        count: 3,
        orientation: 'vertical',
      }),
    ).to.deep.equal({
      kind: 'none',
      nextIndex: null,
    });
  });

  it('resolveKeyNavigation: Enter / Space は activate-focused を返すこと', () => {
    expect(
      resolveKeyNavigation({
        key: 'Enter',
        currentIndex: 1,
        count: 3,
        orientation: 'horizontal',
      }),
    ).to.deep.equal({
      kind: 'activate-focused',
      nextIndex: 1,
    });

    expect(
      resolveKeyNavigation({
        key: ' ',
        currentIndex: 2,
        count: 3,
        orientation: 'horizontal',
      }),
    ).to.deep.equal({
      kind: 'activate-focused',
      nextIndex: 2,
    });
  });
});
