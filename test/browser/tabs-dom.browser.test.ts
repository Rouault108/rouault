import { describe, expect, it } from 'vitest';
import {
  applyTabsAria,
  readTabsSnapshot,
  resolveTabValueForPanelTarget,
} from '../../src/components/ui/tabs/tabs-dom.js';

const createSlotMock = (elements: Element[]): HTMLSlotElement => {
  const slot = document.createElement('slot');
  Object.defineProperty(slot, 'assignedElements', {
    value: () => elements,
  });
  return slot;
};

describe('tabs-dom', () => {
  it('readTabsSnapshot: tab / panel の最小数を interactiveCount として返すこと', () => {
    const tabA = document.createElement('button');
    const tabB = document.createElement('button');
    const panelA = document.createElement('div');

    const snapshot = readTabsSnapshot(createSlotMock([tabA, tabB]), createSlotMock([panelA]));

    expect(snapshot.tabs.length).to.equal(2);
    expect(snapshot.panels.length).to.equal(1);
    expect(snapshot.interactiveCount).to.equal(1);
  });

  it('applyTabsAria: role / aria-selected / aria-controls / aria-labelledby を設定すること', () => {
    const tabA = document.createElement('button');
    tabA.setAttribute('value', 'overview');

    const tabB = document.createElement('button');
    tabB.setAttribute('value', 'details');

    const panelA = document.createElement('div');
    const panelB = document.createElement('div');

    const snapshot = {
      tabs: [tabA, tabB],
      panels: [panelA, panelB],
      interactiveCount: 2,
    };

    applyTabsAria(snapshot, 7, 1, 1);

    expect(tabA.getAttribute('role')).to.equal('tab');
    expect(tabB.getAttribute('role')).to.equal('tab');
    expect(panelA.getAttribute('role')).to.equal('tabpanel');
    expect(panelB.getAttribute('role')).to.equal('tabpanel');

    expect(tabA.getAttribute('aria-selected')).to.equal('false');
    expect(tabB.getAttribute('aria-selected')).to.equal('true');

    expect(tabA.getAttribute('tabindex')).to.equal('-1');
    expect(tabB.getAttribute('tabindex')).to.equal('0');

    const controlsA = tabA.getAttribute('aria-controls');
    const controlsB = tabB.getAttribute('aria-controls');

    expect(controlsA).to.be.a('string');
    expect(controlsB).to.be.a('string');
    expect(panelA.getAttribute('id')).to.equal(controlsA);
    expect(panelB.getAttribute('id')).to.equal(controlsB);

    expect(panelA.getAttribute('aria-labelledby')).to.equal(tabA.getAttribute('id'));
    expect(panelB.getAttribute('aria-labelledby')).to.equal(tabB.getAttribute('id'));
  });

  it('applyTabsAria: interactiveCount を超える tab には aria-controls を付けないこと', () => {
    const tabA = document.createElement('button');
    const tabB = document.createElement('button');
    const panelA = document.createElement('div');

    const snapshot = {
      tabs: [tabA, tabB],
      panels: [panelA],
      interactiveCount: 1,
    };

    applyTabsAria(snapshot, 11, 0, 0);

    expect(tabA.getAttribute('aria-controls')).to.be.a('string');
    expect(tabB.hasAttribute('aria-controls')).to.equal(false);
  });

  it('resolveTabValueForPanelTarget: panel 自身を target として対応 tab value を返すこと', () => {
    const tabA = document.createElement('button');
    tabA.setAttribute('value', 'overview');
    const panelA = document.createElement('section');

    expect(
      resolveTabValueForPanelTarget(
        {
          tabs: [tabA],
          panels: [panelA],
          interactiveCount: 1,
        },
        panelA,
      ),
    ).to.equal('overview');
  });

  it('resolveTabValueForPanelTarget: panel 配下 target から対応 tab value を返すこと', () => {
    const tabA = document.createElement('button');
    tabA.setAttribute('value', 'overview');
    const panelA = document.createElement('section');
    const heading = document.createElement('h2');
    panelA.append(heading);

    expect(
      resolveTabValueForPanelTarget(
        {
          tabs: [tabA],
          panels: [panelA],
          interactiveCount: 1,
        },
        heading,
      ),
    ).to.equal('overview');
  });

  it('resolveTabValueForPanelTarget: interactiveCount 範囲外の panel は採用しないこと', () => {
    const tabA = document.createElement('button');
    tabA.setAttribute('value', 'overview');
    const tabB = document.createElement('button');
    tabB.setAttribute('value', 'details');
    const panelA = document.createElement('section');
    const panelB = document.createElement('section');

    expect(
      resolveTabValueForPanelTarget(
        {
          tabs: [tabA, tabB],
          panels: [panelA, panelB],
          interactiveCount: 1,
        },
        panelB,
      ),
    ).to.equal(null);
  });

  it('resolveTabValueForPanelTarget: 対応 tab が欠落している場合は null を返すこと', () => {
    const panelA = document.createElement('section');

    expect(
      resolveTabValueForPanelTarget(
        {
          tabs: [],
          panels: [panelA],
          interactiveCount: 1,
        },
        panelA,
      ),
    ).to.equal(null);
  });

  it('resolveTabValueForPanelTarget: 対応 tab value が空の場合は null を返すこと', () => {
    const tabA = document.createElement('button');
    tabA.setAttribute('value', ' ');
    const panelA = document.createElement('section');

    expect(
      resolveTabValueForPanelTarget(
        {
          tabs: [tabA],
          panels: [panelA],
          interactiveCount: 1,
        },
        panelA,
      ),
    ).to.equal(null);
  });

  it('resolveTabValueForPanelTarget: panel 外 target は採用しないこと', () => {
    const tabA = document.createElement('button');
    tabA.setAttribute('value', 'overview');
    const panelA = document.createElement('section');
    const outside = document.createElement('h2');

    expect(
      resolveTabValueForPanelTarget(
        {
          tabs: [tabA],
          panels: [panelA],
          interactiveCount: 1,
        },
        outside,
      ),
    ).to.equal(null);
  });
});
