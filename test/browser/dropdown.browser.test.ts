import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/dropdown/dropdown.js';
import '../../src/components/ui/icon/icon.js';
import type { Dropdown, MenuItem } from '../../src/components/ui/dropdown/dropdown.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

interface MenuItemSelectDetail {
  value: string;
  label: string;
}

const getTrigger = (dropdown: Dropdown): HTMLElement | null =>
  dropdown.querySelector<HTMLElement>('[slot="trigger"]');

const getPanel = (dropdown: Dropdown): HTMLElement | null =>
  dropdown.shadowRoot?.querySelector<HTMLElement>('.panel') ?? null;

const getMenuItems = (dropdown: Dropdown): MenuItem[] =>
  Array.from(dropdown.querySelectorAll<MenuItem>('ui-menu-item'));

const getItemButton = (item: MenuItem): HTMLButtonElement | null =>
  item.shadowRoot?.querySelector<HTMLButtonElement>('button') ?? null;

const getFocusedValue = (dropdown: Dropdown): string | null => {
  for (const item of getMenuItems(dropdown)) {
    const button = getItemButton(item);
    if (button === item.shadowRoot?.activeElement) {
      return item.getAttribute('value');
    }
  }
  return null;
};

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const waitForCustomEvent = <T>(target: EventTarget, type: string): Promise<CustomEvent<T>> =>
  new Promise((resolve) => {
    target.addEventListener(
      type,
      ((event: Event) => {
        resolve(event as CustomEvent<T>);
      }) as EventListener,
      { once: true },
    );
  });

describe('ui-dropdown browser contract', () => {
  it('open/close と trigger aria / panel state を公開すること', async () => {
    const dropdown = await fixture<Dropdown>(html`
      <ui-dropdown side="bottom" align="start">
        <button slot="trigger" type="button">メニュー</button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
      </ui-dropdown>
    `);

    await waitForLitUpdate(dropdown);

    const trigger = expectPresent(getTrigger(dropdown), 'trigger');
    const panel = expectPresent(getPanel(dropdown), 'panel');

    expect(trigger.getAttribute('aria-haspopup')).to.equal('menu');
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(panel.getAttribute('role')).to.equal('menu');
    expect(panel.getAttribute('aria-hidden')).to.equal('true');
    expect(panel.hasAttribute('inert')).to.equal(true);

    dropdown.open();
    await waitForLitUpdate(dropdown);
    await nextAnimationFrame();
    await nextAnimationFrame();

    expect(dropdown.opened).to.equal(true);
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    expect(panel.getAttribute('aria-hidden')).to.equal('false');
    expect(panel.hasAttribute('inert')).to.equal(false);

    dropdown.close();
    await waitForLitUpdate(dropdown);

    expect(dropdown.opened).to.equal(false);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(panel.getAttribute('aria-hidden')).to.equal('true');
    expect(panel.hasAttribute('inert')).to.equal(true);
  });

  it('keyboard navigation と menu-item-select を Storybook ではなく browser test で担保すること', async () => {
    const dropdown = await fixture<Dropdown>(html`
      <ui-dropdown>
        <button slot="trigger" type="button">操作</button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="archive" disabled>アーカイブ</ui-menu-item>
        <ui-menu-item value="duplicate">複製</ui-menu-item>
      </ui-dropdown>
    `);

    await waitForLitUpdate(dropdown);

    const trigger = expectPresent(getTrigger(dropdown), 'trigger');
    const panel = expectPresent(getPanel(dropdown), 'panel');
    const items = getMenuItems(dropdown);

    expect(items).to.have.length(3);

    dispatchKey(trigger, 'ArrowDown');
    await waitForLitUpdate(dropdown);
    await nextAnimationFrame();
    await nextAnimationFrame();

    expect(dropdown.opened).to.equal(true);
    expect(getFocusedValue(dropdown)).to.equal('edit');

    dispatchKey(panel, 'ArrowDown');
    await nextAnimationFrame();

    expect(getFocusedValue(dropdown)).to.equal('duplicate');

    const duplicateItem = expectPresent(items[2], 'items[2]');
    const duplicateButton = expectPresent(getItemButton(duplicateItem), 'duplicateButton');

    const selectPromise = waitForCustomEvent<MenuItemSelectDetail>(dropdown, 'menu-item-select');
    duplicateButton.click();

    const selectEvent = await selectPromise;
    await waitForLitUpdate(dropdown);

    expect(selectEvent.detail.value).to.equal('duplicate');
    expect(selectEvent.detail.label).to.equal('複製');
    expect(dropdown.opened).to.equal(false);
    expect(document.activeElement).to.equal(trigger);
  });

  it('non-button trigger では role/tabindex/aria-disabled を公開し、disabled 時は開かないこと', async () => {
    const dropdown = await fixture<Dropdown>(html`
      <ui-dropdown>
        <div slot="trigger">開く</div>
        <ui-menu-item value="edit">編集</ui-menu-item>
      </ui-dropdown>
    `);

    await waitForLitUpdate(dropdown);

    const trigger = expectPresent(getTrigger(dropdown), 'trigger');

    expect(trigger.getAttribute('role')).to.equal('button');
    expect(trigger.getAttribute('tabindex')).to.equal('0');
    expect(trigger.getAttribute('aria-disabled')).to.equal(null);

    dropdown.disabled = true;
    await waitForLitUpdate(dropdown);

    expect(trigger.getAttribute('aria-disabled')).to.equal('true');
    expect(trigger.getAttribute('tabindex')).to.equal('-1');

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await waitForLitUpdate(dropdown);

    expect(dropdown.opened).to.equal(false);
  });
});
