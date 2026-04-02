import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/popover/popover.js';
import type {
  UiPopover,
  UiPopoverOpenChangeDetail,
  UiPopoverOpenChangeRequestDetail,
} from '../../src/components/ui/popover/popover.js';
import {
  dispatchKey,
  nextAnimationFrame,
  waitForLitUpdate,
} from './helpers/wait-for-lit.js';

const supportsPopoverApi = (): boolean =>
  typeof HTMLElement !== 'undefined' &&
  'showPopover' in HTMLElement.prototype &&
  'hidePopover' in HTMLElement.prototype;

const isPopoverOpen = (element: Element): boolean => {
  try {
    return element.matches(':popover-open');
  } catch {
    return false;
  }
};

const getTrigger = (host: UiPopover): HTMLElement | null =>
  host.querySelector<HTMLElement>('[slot="trigger"]');

const getContent = (host: UiPopover): HTMLElement | null =>
  host.querySelector<HTMLElement>('[slot="content"]');

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const clickPrimary = (target: HTMLElement): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
  });
  target.dispatchEvent(event);
  return event;
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

describe('ui-popover browser contract', () => {
  it('open/close に伴って trigger aria / content state を更新すること', async () => {
    const host = await fixture<UiPopover>(html`
      <ui-popover>
        <button id="trigger" slot="trigger" type="button">詳細を開く</button>
        <div id="content" slot="content">Popover 本文です。</div>
      </ui-popover>
    `);

    await waitForLitUpdate(host);

    const trigger = expectPresent(getTrigger(host), 'trigger');
    const content = expectPresent(getContent(host), 'content');

    expect(content.getAttribute('role')).to.equal(null);
    expect(trigger.getAttribute('aria-haspopup')).to.equal(null);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(trigger.getAttribute('aria-controls')).to.equal(content.id);

    const opened = waitForCustomEvent<unknown>(host, 'ui-popover-opened');
    const click = clickPrimary(trigger);
    expect(click.defaultPrevented).to.equal(true);

    await opened;
    await nextAnimationFrame();

    expect(host.opened).to.equal(true);
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    expect(trigger.getAttribute('aria-controls')).to.equal(content.id);
    expect(content.dataset['open']).to.equal('true');

    if (supportsPopoverApi()) {
      expect(isPopoverOpen(content)).to.equal(true);
    } else {
      expect(content.hidden).to.equal(false);
    }

    const closed = waitForCustomEvent<unknown>(host, 'ui-popover-closed');
    clickPrimary(trigger);
    await closed;
    await nextAnimationFrame();

    expect(host.opened).to.equal(false);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(content.dataset['open']).to.equal('false');

    if (supportsPopoverApi()) {
      expect(isPopoverOpen(content)).to.equal(false);
    } else {
      expect(content.hidden).to.equal(true);
    }
  });

  it('open-change-request を cancel された場合は状態を変えないこと', async () => {
    const host = await fixture<UiPopover>(html`
      <ui-popover>
        <button id="trigger" slot="trigger" type="button">cancel</button>
        <div id="content" slot="content">cancel content</div>
      </ui-popover>
    `);

    await waitForLitUpdate(host);

    const trigger = expectPresent(getTrigger(host), 'trigger');

    let requested = false;
    host.addEventListener('ui-popover-open-change-request', (event) => {
      const customEvent = event as CustomEvent<UiPopoverOpenChangeRequestDetail>;
      if (customEvent.detail.nextOpen) {
        requested = true;
        event.preventDefault();
      }
    });

    const click = clickPrimary(trigger);
    await nextAnimationFrame();

    expect(click.defaultPrevented).to.equal(true);
    expect(requested).to.equal(true);
    expect(host.opened).to.equal(false);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('controlled mode で request / change / close を分離し、dismiss reason を公開すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button id="outside" type="button">outside</button>
        <ui-popover id="controlled" opened>
          <button id="controlled-trigger" slot="trigger" type="button">controlled</button>
          <div id="controlled-content" slot="content">controlled content</div>
        </ui-popover>
      </div>
    `);

    const host = expectPresent(wrapper.querySelector<UiPopover>('#controlled'), 'host');
    await waitForLitUpdate(host);

    const trigger = expectPresent(getTrigger(host), 'trigger');
    const content = expectPresent(getContent(host), 'content');
    const outside = expectPresent(
      wrapper.querySelector<HTMLButtonElement>('#outside'),
      'outside',
    );

    const requests: UiPopoverOpenChangeRequestDetail[] = [];
    const changes: UiPopoverOpenChangeDetail[] = [];

    host.addEventListener('ui-popover-open-change-request', (event) => {
      const detail = (event as CustomEvent<UiPopoverOpenChangeRequestDetail>).detail;
      requests.push(detail);
      host.opened = detail.nextOpen;
    });

    host.addEventListener('ui-popover-open-change', (event) => {
      changes.push((event as CustomEvent<UiPopoverOpenChangeDetail>).detail);
    });

    await nextAnimationFrame();

    expect(host.opened).to.equal(true);
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
    expect(content.dataset['open']).to.equal('true');

    const closeByTrigger = waitForCustomEvent<UiPopoverOpenChangeDetail>(host, 'ui-popover-open-change');
    clickPrimary(trigger);
    const triggerChange = await closeByTrigger;
    await nextAnimationFrame();

    expect(requests.at(-1)?.reason).to.equal('trigger');
    expect(triggerChange.detail.open).to.equal(false);
    expect(triggerChange.detail.reason).to.equal('trigger');
    expect(triggerChange.detail.returnFocus).to.equal(true);
    expect(host.opened).to.equal(false);

    const reopen = waitForCustomEvent<UiPopoverOpenChangeDetail>(host, 'ui-popover-open-change');
    clickPrimary(trigger);
    await reopen;
    await nextAnimationFrame();

    const closeByEscape = waitForCustomEvent<UiPopoverOpenChangeDetail>(host, 'ui-popover-open-change');
    dispatchKey(content, 'Escape');
    const escapeChange = await closeByEscape;
    await nextAnimationFrame();

    expect(escapeChange.detail.open).to.equal(false);
    expect(escapeChange.detail.reason).to.equal('escape');
    expect(escapeChange.detail.returnFocus).to.equal(true);

    const reopen2 = waitForCustomEvent<UiPopoverOpenChangeDetail>(host, 'ui-popover-open-change');
    clickPrimary(trigger);
    await reopen2;
    await nextAnimationFrame();

    const closeByOutside = waitForCustomEvent<UiPopoverOpenChangeDetail>(host, 'ui-popover-open-change');
    outside.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        button: 0,
      }),
    );
    const outsideChange = await closeByOutside;
    await nextAnimationFrame();

    expect(outsideChange.detail.open).to.equal(false);
    expect(outsideChange.detail.reason).to.equal('outside-pointer');
    expect(outsideChange.detail.returnFocus).to.equal(false);

    host.disabled = true;
    host.opened = true;
    await waitForLitUpdate(host);
    await nextAnimationFrame();

    const closeByDisabled = await waitForCustomEvent<UiPopoverOpenChangeDetail>(
      host,
      'ui-popover-open-change',
    );
    expect(closeByDisabled.detail.open).to.equal(false);
    expect(closeByDisabled.detail.reason).to.equal('disabled');

    expect(changes.length).to.be.greaterThan(0);
  });

  it('active trigger 切替と invalid attribute 正規化、content id resync を行うこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-popover id="shared" variant="unsupported" placement="diagonal" offset="-4">
          <button id="owner" slot="trigger" type="button">owner</button>
          <div id="shared-content" slot="content">shared content</div>
        </ui-popover>

        <button id="follower" type="button">follower</button>
      </div>
    `);

    const host = expectPresent(wrapper.querySelector<UiPopover>('#shared'), 'host');
    await waitForLitUpdate(host);

    const owner = expectPresent(wrapper.querySelector<HTMLElement>('#owner'), 'owner');
    const follower = expectPresent(wrapper.querySelector<HTMLElement>('#follower'), 'follower');
    const content = expectPresent(getContent(host), 'content');

    expect(host.variant).to.equal('default');
    expect(host.placement).to.equal('bottom-start');
    expect(host.offset).to.equal(8);

    host.openForTrigger(follower);
    await nextAnimationFrame();

    expect(host.opened).to.equal(true);
    expect(follower.getAttribute('aria-expanded')).to.equal('true');
    expect(owner.getAttribute('aria-expanded')).to.equal('false');
    expect(owner.hasAttribute('aria-controls')).to.equal(false);

    host.openForTrigger(owner);
    await nextAnimationFrame();

    expect(owner.getAttribute('aria-expanded')).to.equal('true');
    expect(follower.getAttribute('aria-expanded')).to.equal('false');

    content.id = 'shared-content-renamed';
    await nextAnimationFrame();

    expect(owner.getAttribute('aria-controls')).to.equal('shared-content-renamed');

    host.close({ returnFocus: false });
    await nextAnimationFrame();

    expect(host.opened).to.equal(false);
    expect(owner.getAttribute('aria-expanded')).to.equal('false');
  });
});