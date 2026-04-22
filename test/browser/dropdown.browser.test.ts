import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/dropdown/dropdown.js';
import '../../src/components/ui/icon/icon.js';
import type { Dropdown, MenuItem } from '../../src/components/ui/dropdown/dropdown.js';
import { dispatchKey, waitForLitUpdate, waitMs } from './helpers/wait-for-lit.js';

interface MenuItemSelectDetail {
  value: string;
  label: string;
}

type DropdownPanelPhase = 'idle' | 'positioning' | 'ready';

const getTrigger = (dropdown: Dropdown): HTMLElement | null =>
  dropdown.querySelector<HTMLElement>('[slot="trigger"]');

const getPanel = (dropdown: Dropdown): HTMLElement | null => dropdown.getMenuElement();

const getMenuItems = (dropdown: Dropdown): MenuItem[] =>
  Array.from(dropdown.querySelectorAll<MenuItem>('ui-menu-item'));

const getItemButton = (item: MenuItem): HTMLButtonElement | null =>
  item.shadowRoot?.querySelector<HTMLButtonElement>('button') ?? null;

const getPanelPhase = (panel: HTMLElement): DropdownPanelPhase => {
  const phase = panel.dataset['positionPhase'];
  if (phase === 'idle' || phase === 'positioning' || phase === 'ready') {
    return phase;
  }

  throw new Error(`unknown dropdown phase: ${String(phase)}`);
};

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

const waitUntil = async (
  predicate: () => boolean,
  timeoutMs = 2000,
  intervalMs = 20,
  message = 'condition not met',
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await waitMs(intervalMs);
  }

  throw new Error(message);
};

const waitUntilReadyState = async (
  dropdown: Dropdown,
  trigger: HTMLElement,
  panel: HTMLElement,
): Promise<void> => {
  await waitUntil(
    () =>
      dropdown.opened === true &&
      getPanelPhase(panel) === 'ready' &&
      trigger.getAttribute('aria-expanded') === 'true' &&
      panel.getAttribute('aria-hidden') === 'false' &&
      panel.hasAttribute('inert') === false,
    2000,
    20,
    'dropdown が ready state へ遷移しません',
  );
};

const waitUntilClosedState = async (
  dropdown: Dropdown,
  trigger: HTMLElement,
  panel: HTMLElement,
): Promise<void> => {
  await waitUntil(
    () =>
      dropdown.opened === false &&
      getPanelPhase(panel) === 'idle' &&
      trigger.getAttribute('aria-expanded') === 'false' &&
      panel.getAttribute('aria-hidden') === 'true' &&
      panel.hasAttribute('inert') === true,
    2000,
    20,
    'dropdown が閉状態へ遷移しません',
  );
};

const waitUntilFocusedValue = async (dropdown: Dropdown, value: string): Promise<void> => {
  await waitUntil(
    () => getFocusedValue(dropdown) === value,
    2000,
    20,
    `focus が ${value} へ移動しません`,
  );
};

describe('ui-dropdown browser contract', () => {
  it('初回レンダリング時に close 副作用を発生させず、trigger へ focus を戻さないこと', async () => {
    const sentinel = document.createElement('button');
    sentinel.type = 'button';
    sentinel.textContent = 'sentinel';
    document.body.append(sentinel);
    sentinel.focus();

    let closeEventCount = 0;

    try {
      const dropdown = await fixture<Dropdown>(html`
        <ui-dropdown
          @close=${() => {
            closeEventCount += 1;
          }}
        >
          <button slot="trigger" type="button">メニュー</button>
          <ui-menu-item value="edit">編集</ui-menu-item>
          <ui-menu-item value="copy">コピー</ui-menu-item>
        </ui-dropdown>
      `);

      await waitForLitUpdate(dropdown);
      await waitMs(0);

      const trigger = expectPresent(getTrigger(dropdown), 'trigger');
      const panel = expectPresent(getPanel(dropdown), 'panel');

      expect(dropdown.opened).to.equal(false);
      expect(getPanelPhase(panel)).to.equal('idle');
      expect(trigger.getAttribute('aria-expanded')).to.equal('false');
      expect(panel.getAttribute('aria-hidden')).to.equal('true');
      expect(document.activeElement).to.equal(sentinel);
      expect(document.activeElement).to.not.equal(trigger);
      expect(closeEventCount).to.equal(0);
    } finally {
      sentinel.remove();
    }
  });

  it('open 直後は positioning を公開し、ready 後にのみ interaction-ready へ遷移すること', async () => {
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
    expect(getPanelPhase(panel)).to.equal('idle');

    dropdown.open();
    await waitForLitUpdate(dropdown);

    expect(dropdown.opened).to.equal(true);
    expect(getPanelPhase(panel)).to.equal('positioning');
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(panel.getAttribute('aria-hidden')).to.equal('true');
    expect(panel.hasAttribute('inert')).to.equal(true);
    expect(getFocusedValue(dropdown)).to.equal(null);

    await waitUntilReadyState(dropdown, trigger, panel);

    expect(dropdown.opened).to.equal(true);
    expect(getPanelPhase(panel)).to.equal('ready');
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    expect(panel.getAttribute('aria-hidden')).to.equal('false');
    expect(panel.hasAttribute('inert')).to.equal(false);

    dropdown.close();
    await waitForLitUpdate(dropdown);
    await waitUntilClosedState(dropdown, trigger, panel);
  });

  it('keyboard navigation と menu-item-select を ready 後にのみ成立させること', async () => {
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

    expect(getPanelPhase(panel)).to.equal('positioning');
    expect(getFocusedValue(dropdown)).to.equal(null);

    await waitUntilReadyState(dropdown, trigger, panel);
    await waitUntilFocusedValue(dropdown, 'edit');

    expect(dropdown.opened).to.equal(true);
    expect(getFocusedValue(dropdown)).to.equal('edit');

    dispatchKey(panel, 'ArrowDown');
    await waitUntilFocusedValue(dropdown, 'duplicate');

    const selectPromise = waitForCustomEvent<MenuItemSelectDetail>(dropdown, 'menu-item-select');
    dispatchKey(panel, 'Enter');

    const selectEvent = await selectPromise;
    await waitForLitUpdate(dropdown);
    await waitUntil(
      () => dropdown.opened === false && document.activeElement === trigger,
      2000,
      20,
      'dropdown が閉じず trigger へ focus が戻りません',
    );

    expect(selectEvent.detail.value).to.equal('duplicate');
    expect(selectEvent.detail.label).to.equal('複製');
    expect(dropdown.opened).to.equal(false);
    expect(document.activeElement).to.equal(trigger);
  });

  it('ArrowUp 起点 open では ready 後に最後の enabled item へ focus すること', async () => {
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

    dispatchKey(trigger, 'ArrowUp');
    await waitForLitUpdate(dropdown);

    expect(getPanelPhase(panel)).to.equal('positioning');
    expect(getFocusedValue(dropdown)).to.equal(null);

    await waitUntilReadyState(dropdown, trigger, panel);
    await waitUntilFocusedValue(dropdown, 'duplicate');
  });

  it('pointer で項目選択した場合は trigger へ focus を戻さないこと', async () => {
    const dropdown = await fixture<Dropdown>(html`
      <ui-dropdown>
        <button slot="trigger" type="button">操作</button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="duplicate">複製</ui-menu-item>
      </ui-dropdown>
    `);

    await waitForLitUpdate(dropdown);

    const trigger = expectPresent(getTrigger(dropdown), 'trigger');
    const panel = expectPresent(getPanel(dropdown), 'panel');
    const duplicateItem = expectPresent(getMenuItems(dropdown)[1], 'duplicateItem');
    const duplicateButton = expectPresent(getItemButton(duplicateItem), 'duplicateButton');

    trigger.click();
    await waitForLitUpdate(dropdown);
    await waitUntilReadyState(dropdown, trigger, panel);

    const selectPromise = waitForCustomEvent<MenuItemSelectDetail>(dropdown, 'menu-item-select');
    duplicateButton.click();

    const selectEvent = await selectPromise;
    await waitForLitUpdate(dropdown);
    await waitUntilClosedState(dropdown, trigger, panel);

    expect(selectEvent.detail.value).to.equal('duplicate');
    expect(selectEvent.detail.label).to.equal('複製');
    expect(document.activeElement).to.not.equal(trigger);
  });

  it('non-button trigger では role/tabindex/aria-disabled を公開し、disabled 遷移時は閉じること', async () => {
    const dropdown = await fixture<Dropdown>(html`
      <ui-dropdown>
        <div slot="trigger">開く</div>
        <ui-menu-item value="edit">編集</ui-menu-item>
      </ui-dropdown>
    `);

    await waitForLitUpdate(dropdown);

    const trigger = expectPresent(getTrigger(dropdown), 'trigger');
    const panel = expectPresent(getPanel(dropdown), 'panel');

    expect(trigger.getAttribute('role')).to.equal('button');
    expect(trigger.getAttribute('tabindex')).to.equal('0');
    expect(trigger.getAttribute('aria-disabled')).to.equal(null);

    dropdown.open();
    await waitForLitUpdate(dropdown);

    expect(getPanelPhase(panel)).to.equal('positioning');

    dropdown.disabled = true;
    await waitForLitUpdate(dropdown);
    await waitUntilClosedState(dropdown, trigger, panel);

    expect(trigger.getAttribute('aria-disabled')).to.equal('true');
    expect(trigger.getAttribute('tabindex')).to.equal('-1');
    expect(dropdown.opened).to.equal(false);
  });
});
