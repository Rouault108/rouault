import { expect } from '@open-wc/testing';
import {
  applyTabsAria,
  readTabsSnapshot,
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

    const snapshot = readTabsSnapshot(
      createSlotMock([tabA, tabB]),
      createSlotMock([panelA]),
    );

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
});