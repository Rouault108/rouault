import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './popover';
import {
  DOCUMENT_STYLE_ID,
  type UiPopover,
  type UiPopoverOpenChangeDetail,
  type UiPopoverOpenChangeRequestDetail,
} from './popover';

const nextFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

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

const getHost = (canvasElement: Element, id: string): UiPopover => {
  const host = canvasElement.querySelector<UiPopover>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getElement = (root: ParentNode, selector: string): HTMLElement => {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`${selector} が見つかりません`);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`${selector} は HTMLElement である必要があります`);
  }
  return element;
};

const clickPrimary = (target: HTMLElement): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  target.dispatchEvent(event);
  return event;
};

const dispatchEscape = (target: EventTarget): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
};

const waitForEvent = <T>(target: EventTarget, type: string): Promise<CustomEvent<T>> =>
  new Promise((resolve) => {
    const onEvent = (event: Event): void => {
      target.removeEventListener(type, onEvent);
      resolve(event as CustomEvent<T>);
    };
    target.addEventListener(type, onEvent);
  });

const meta: Meta<UiPopover> = {
  title: 'Components/Popover',
  component: 'ui-popover',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
意味論を持たない anchored popover shell です。

- \`slot="trigger"\` / \`slot="content"\` を使用
- \`opened\` は controlled state、\`defaultOpened\` は uncontrolled 初期値
- \`ui-popover-open-change-request\` / \`ui-popover-open-change\` で変更要求と結果を分離
- \`openForTrigger()\` / \`toggleForTrigger()\` により controller mode を扱えます
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['default', 'subtle', 'inverse'],
      table: {
        type: { summary: "'default' | 'subtle' | 'inverse'" },
        defaultValue: { summary: "'default'" },
      },
    },
    placement: {
      control: 'text',
      table: { type: { summary: 'Placement' }, defaultValue: { summary: "'bottom-start'" } },
    },
    offset: {
      control: { type: 'number', min: 0, step: 1 },
      table: { type: { summary: 'number' }, defaultValue: { summary: '8' } },
    },
    opened: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    defaultOpened: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<UiPopover>;

export const BasicContract: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-popover id="popover-basic">
        <button id="popover-basic-trigger" slot="trigger" type="button">詳細を開く</button>
        <div id="popover-basic-content" slot="content">Popover 本文です。</div>
      </ui-popover>
      <button id="popover-basic-after" type="button">次要素</button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'popover-basic');
    await host.updateComplete;

    const trigger = getElement(host, '#popover-basic-trigger') as HTMLButtonElement;
    const content = getElement(host, '#popover-basic-content') as HTMLDivElement;
    const after = getElement(canvasElement, '#popover-basic-after') as HTMLButtonElement;

    if (content.getAttribute('role') !== null) {
      throw new Error('ui-popover は content に既定 role を付与してはいけません');
    }
    if (trigger.getAttribute('aria-haspopup') !== null) {
      throw new Error('ui-popover は trigger に aria-haspopup を既定付与してはいけません');
    }
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('初期 aria-expanded は false である必要があります');
    }
    if (trigger.getAttribute('aria-controls') !== content.id) {
      throw new Error('初期 aria-controls は content.id を参照する必要があります');
    }

    trigger.focus();
    clickPrimary(trigger);
    await nextFrame();

    if (!host.opened) {
      throw new Error('anchored mode の通常クリックで開く必要があります');
    }
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('open 時に active trigger の aria-expanded=true が必要です');
    }
    if (supportsPopoverApi()) {
      if (!isPopoverOpen(content)) {
        throw new Error('Popover API 対応環境で :popover-open が成立していません');
      }
    } else if (content.hidden) {
      throw new Error('Popover API 非対応環境では hidden=false で表示される必要があります');
    }

    dispatchEscape(trigger);
    await nextFrame();
    await wait(0);

    if (document.activeElement !== trigger) {
      throw new Error('Escape close 後は active trigger にフォーカスが戻る必要があります');
    }
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('close 後は aria-expanded=false に戻る必要があります');
    }

    clickPrimary(trigger);
    await nextFrame();
    after.focus();
    host.close({ returnFocus: false });
    await nextFrame();
    if (document.activeElement !== after) {
      throw new Error('programmatic close(returnFocus=false) では focus return してはいけません');
    }
  },
};

export const RequestCancelContract: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-popover id="popover-request-cancel">
        <button id="popover-request-trigger" slot="trigger" type="button">開く</button>
        <div id="popover-request-content" slot="content">cancel</div>
      </ui-popover>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'popover-request-cancel');
    await host.updateComplete;
    const trigger = getElement(host, '#popover-request-trigger') as HTMLButtonElement;
    const content = getElement(host, '#popover-request-content') as HTMLDivElement;

    const reasons: UiPopoverOpenChangeRequestDetail[] = [];
    host.addEventListener('ui-popover-open-change-request', (event) => {
      const customEvent = event as CustomEvent<UiPopoverOpenChangeRequestDetail>;
      reasons.push(customEvent.detail);
      event.preventDefault();
    });

    clickPrimary(trigger);
    await nextFrame();

    const firstReason = reasons.at(0);
    if (!firstReason || reasons.length !== 1 || firstReason.reason !== 'trigger' || !firstReason.nextOpen) {
      throw new Error('open request は reason=trigger, nextOpen=true で 1 回だけ発火する必要があります');
    }
    if (host.opened) {
      throw new Error('request が cancel された場合は opened が変化してはいけません');
    }
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('request cancel 時に aria-expanded は変化してはいけません');
    }
    if (supportsPopoverApi()) {
      if (isPopoverOpen(content)) {
        throw new Error('request cancel 時に content が開いてはいけません');
      }
    } else if (!content.hidden) {
      throw new Error('request cancel 時に fallback content が表示されてはいけません');
    }
  },
};

export const ControlledAndUncontrolledContract: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; padding: 2rem;">
      <ui-popover id="popover-uncontrolled" defaultOpened>
        <button id="popover-uncontrolled-trigger" slot="trigger" type="button">uncontrolled</button>
        <div id="popover-uncontrolled-content" slot="content">uncontrolled body</div>
      </ui-popover>

      <ui-popover id="popover-controlled" opened>
        <button id="popover-controlled-trigger" slot="trigger" type="button">controlled</button>
        <div id="popover-controlled-content" slot="content">controlled body</div>
      </ui-popover>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const uncontrolled = getHost(canvasElement, 'popover-uncontrolled');
    const controlled = getHost(canvasElement, 'popover-controlled');
    await Promise.all([uncontrolled.updateComplete, controlled.updateComplete]);

    const uncontrolledTrigger = getElement(
      uncontrolled,
      '#popover-uncontrolled-trigger',
    ) as HTMLButtonElement;
    const controlledTrigger = getElement(
      controlled,
      '#popover-controlled-trigger',
    ) as HTMLButtonElement;

    const uncontrolledInitiallyOpened = uncontrolled.opened;
    if (!uncontrolledInitiallyOpened) {
      throw new Error('defaultOpened は uncontrolled 初期 open を成立させる必要があります');
    }

    clickPrimary(uncontrolledTrigger);
    await nextFrame();
    await wait(0);
    const uncontrolledClosed = uncontrolled.opened;
    if (uncontrolledClosed) {
      throw new Error('uncontrolled では内部状態だけで close できる必要があります');
    }

    const requestPromise = waitForEvent<UiPopoverOpenChangeRequestDetail>(
      controlled,
      'ui-popover-open-change-request',
    );
    const changeEvents: UiPopoverOpenChangeDetail[] = [];
    controlled.addEventListener('ui-popover-open-change', (event) => {
      changeEvents.push((event as CustomEvent<UiPopoverOpenChangeDetail>).detail);
    });

    clickPrimary(controlledTrigger);
    const requestEvent = await requestPromise;
    await nextFrame();

    if (requestEvent.detail.reason !== 'trigger' || requestEvent.detail.nextOpen) {
      throw new Error('controlled close request は reason=trigger, nextOpen=false が必要です');
    }
    if (!controlled.opened) {
      throw new Error('controlled では request 後も外部が更新するまで opened=true を維持する必要があります');
    }
    if (changeEvents.length !== 0) {
      throw new Error('controlled では外部が opened を更新する前に change event を出してはいけません');
    }

    controlled.opened = false;
    await controlled.updateComplete;

    if (changeEvents.at(0)?.reason !== 'trigger') {
      throw new Error('controlled の確定 change は reason=trigger で 1 回だけ発火する必要があります');
    }
    if (controlledTrigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('controlled close 確定後は aria-expanded=false が必要です');
    }
  },
};

export const DismissReasonContract: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; padding: 2rem;">
      <ui-popover id="reason-trigger">
        <button id="reason-trigger-button" slot="trigger" type="button">trigger</button>
        <div id="reason-trigger-content" slot="content">trigger</div>
      </ui-popover>

      <ui-popover id="reason-escape">
        <button id="reason-escape-button" slot="trigger" type="button">escape</button>
        <div id="reason-escape-content" slot="content">escape</div>
      </ui-popover>

      <ui-popover id="reason-outside">
        <button id="reason-outside-button" slot="trigger" type="button">outside</button>
        <div id="reason-outside-content" slot="content">outside</div>
      </ui-popover>

      <ui-popover id="reason-disabled">
        <button id="reason-disabled-button" slot="trigger" type="button">disabled</button>
        <div id="reason-disabled-content" slot="content">disabled</div>
      </ui-popover>

      <div id="reason-outside-target" tabindex="0">outside target</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const triggerHost = getHost(canvasElement, 'reason-trigger');
    const escapeHost = getHost(canvasElement, 'reason-escape');
    const outsideHost = getHost(canvasElement, 'reason-outside');
    const disabledHost = getHost(canvasElement, 'reason-disabled');
    await Promise.all([
      triggerHost.updateComplete,
      escapeHost.updateComplete,
      outsideHost.updateComplete,
      disabledHost.updateComplete,
    ]);

    const outsideTarget = getElement(canvasElement, '#reason-outside-target') as HTMLDivElement;

    const triggerEvents: UiPopoverOpenChangeDetail[] = [];
    triggerHost.addEventListener('ui-popover-open-change', (event) => {
      triggerEvents.push((event as CustomEvent<UiPopoverOpenChangeDetail>).detail);
    });
    clickPrimary(getElement(triggerHost, '#reason-trigger-button'));
    await nextFrame();
    clickPrimary(getElement(triggerHost, '#reason-trigger-button'));
    await nextFrame();
    const triggerClose = triggerEvents.at(-1);
    if (triggerClose?.reason !== 'trigger') {
      throw new Error('toggle close は reason=trigger である必要があります');
    }

    const escapeTrigger = getElement(escapeHost, '#reason-escape-button') as HTMLButtonElement;
    const escapeEvents: UiPopoverOpenChangeDetail[] = [];
    escapeHost.addEventListener('ui-popover-open-change', (event) => {
      escapeEvents.push((event as CustomEvent<UiPopoverOpenChangeDetail>).detail);
    });
    escapeTrigger.focus();
    clickPrimary(escapeTrigger);
    await nextFrame();
    dispatchEscape(escapeTrigger);
    await nextFrame();
    await wait(0);
    const escapeDetail = escapeEvents.at(-1);
    if (escapeDetail?.reason !== 'escape' || !escapeDetail.returnFocus) {
      throw new Error('Escape close は reason=escape, returnFocus=true である必要があります');
    }

    const outsideTrigger = getElement(outsideHost, '#reason-outside-button') as HTMLButtonElement;
    const outsideEvents: UiPopoverOpenChangeDetail[] = [];
    outsideHost.addEventListener('ui-popover-open-change', (event) => {
      outsideEvents.push((event as CustomEvent<UiPopoverOpenChangeDetail>).detail);
    });
    clickPrimary(outsideTrigger);
    await nextFrame();
    outsideTarget.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
      }),
    );
    await nextFrame();
    await wait(0);
    const outsideDetail = outsideEvents.at(-1);
    if (outsideDetail?.reason !== 'outside-pointer' || outsideDetail.returnFocus) {
      throw new Error(
        'outside dismiss は reason=outside-pointer, returnFocus=false である必要があります',
      );
    }

    const disabledEvents: UiPopoverOpenChangeDetail[] = [];
    disabledHost.addEventListener('ui-popover-open-change', (event) => {
      disabledEvents.push((event as CustomEvent<UiPopoverOpenChangeDetail>).detail);
    });
    clickPrimary(getElement(disabledHost, '#reason-disabled-button'));
    await nextFrame();
    disabledHost.disabled = true;
    await disabledHost.updateComplete;
    await wait(0);
    const disabledDetail = disabledEvents.at(-1);
    if (disabledDetail?.reason !== 'disabled' || disabledDetail.returnFocus) {
      throw new Error('disabled close は reason=disabled, returnFocus=false が必要です');
    }
  },
};

export const ActiveTriggerAndControllerModeContract: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem; padding: 2rem;">
      <ui-popover id="popover-shared">
        <button id="popover-shared-owner" slot="trigger" type="button">owner</button>
        <div id="popover-shared-content" slot="content">shared content</div>
      </ui-popover>
      <button id="popover-shared-follower" type="button">follower</button>

      <ui-popover id="popover-controller-only">
        <div id="popover-controller-content" slot="content">controller only</div>
      </ui-popover>
      <button id="popover-controller-external" type="button">external trigger</button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const shared = getHost(canvasElement, 'popover-shared');
    const controllerOnly = getHost(canvasElement, 'popover-controller-only');
    await Promise.all([shared.updateComplete, controllerOnly.updateComplete]);

    const ownerTrigger = getElement(shared, '#popover-shared-owner') as HTMLButtonElement;
    const followerTrigger = getElement(
      canvasElement,
      '#popover-shared-follower',
    ) as HTMLButtonElement;

    shared.openForTrigger(followerTrigger);
    await nextFrame();

    if (!shared.opened) {
      throw new Error('controller mode で slot 外 trigger から open できる必要があります');
    }
    if (followerTrigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('active trigger の follower は aria-expanded=true である必要があります');
    }
    if (ownerTrigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('owner trigger は active でない限り aria-expanded=false を維持する必要があります');
    }
    if (ownerTrigger.hasAttribute('aria-controls')) {
      throw new Error('owner trigger は active でない間 aria-controls を保持してはいけません');
    }

    const openChangeEvents: UiPopoverOpenChangeDetail[] = [];
    shared.addEventListener('ui-popover-open-change', (event) => {
      openChangeEvents.push((event as CustomEvent<UiPopoverOpenChangeDetail>).detail);
    });

    shared.openForTrigger(ownerTrigger);
    await nextFrame();

    if (ownerTrigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('active trigger を owner に切り替えられる必要があります');
    }
    if (followerTrigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('旧 active trigger は aria-expanded=false に戻る必要があります');
    }
    if (openChangeEvents.length !== 0) {
      throw new Error('active trigger 切替は open 真偽値変更ではないため change event を発火してはいけません');
    }

    const controllerExternal = getElement(
      canvasElement,
      '#popover-controller-external',
    ) as HTMLButtonElement;
    controllerExternal.focus();
    controllerOnly.openForTrigger(controllerExternal);
    await nextFrame();
    if (!controllerOnly.opened) {
      throw new Error('trigger slot なしでも openForTrigger() で開ける必要があります');
    }
    controllerOnly.close({ returnFocus: true });
    await nextFrame();
    await wait(0);
    if (document.activeElement !== controllerExternal) {
      throw new Error('controller mode の close(returnFocus=true) は active trigger へ戻る必要があります');
    }
  },
};

export const SlotResyncAndBoundaryContract: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-popover id="boundary-invalid" variant="unsupported" placement="diagonal" offset="-4">
        <button id="boundary-invalid-trigger" slot="trigger" type="button">invalid</button>
        <div id="boundary-invalid-content" slot="content">invalid normalization</div>
      </ui-popover>

      <ui-popover id="boundary-multi-content">
        <button id="boundary-multi-trigger" slot="trigger" type="button">multi</button>
        <div slot="content">first</div>
        <div slot="content">second</div>
      </ui-popover>

      <ui-popover id="boundary-resync">
        <button id="boundary-resync-trigger" slot="trigger" type="button">resync</button>
        <div id="boundary-resync-content" slot="content">before replace</div>
      </ui-popover>

      <div id="boundary-reconnect-wrap">
        <ui-popover id="boundary-reconnect">
          <button id="boundary-reconnect-trigger" slot="trigger" type="button">reconnect</button>
          <div id="boundary-reconnect-content" slot="content">
            長文テスト。長文テスト。長文テスト。長文テスト。長文テスト。長文テスト。長文テスト。長文テスト。
            長文テスト。長文テスト。長文テスト。長文テスト。長文テスト。長文テスト。長文テスト。長文テスト。
          </div>
        </ui-popover>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalid = getHost(canvasElement, 'boundary-invalid');
    const multi = getHost(canvasElement, 'boundary-multi-content');
    const resync = getHost(canvasElement, 'boundary-resync');
    const reconnect = getHost(canvasElement, 'boundary-reconnect');
    await Promise.all([
      invalid.updateComplete,
      multi.updateComplete,
      resync.updateComplete,
      reconnect.updateComplete,
    ]);

    if (invalid.variant !== 'default') {
      throw new Error(`invalid variant は default に正規化される必要があります: ${invalid.variant}`);
    }
    if (invalid.placement !== 'bottom-start') {
      throw new Error(
        `invalid placement は bottom-start に正規化される必要があります: ${invalid.placement}`,
      );
    }
    if (invalid.offset !== 0) {
      throw new Error(`invalid offset は 0 に正規化される必要があります: ${String(invalid.offset)}`);
    }

    clickPrimary(getElement(multi, '#boundary-multi-trigger'));
    await nextFrame();
    if (multi.opened) {
      throw new Error('複数 content slot は no-op として扱われる必要があります');
    }

    const resyncTrigger = getElement(resync, '#boundary-resync-trigger') as HTMLButtonElement;
    clickPrimary(resyncTrigger);
    await nextFrame();
    const slotEvents: UiPopoverOpenChangeDetail[] = [];
    resync.addEventListener('ui-popover-open-change', (event) => {
      slotEvents.push((event as CustomEvent<UiPopoverOpenChangeDetail>).detail);
    });
    const currentContent = getElement(resync, '#boundary-resync-content') as HTMLDivElement;
    currentContent.remove();
    await resync.updateComplete;
    await nextFrame();
    await wait(0);
    const invalidatedDetail = slotEvents.at(-1);
    if (invalidatedDetail?.reason !== 'slot-invalidated') {
      throw new Error('slot から必要要素が失われた場合は reason=slot-invalidated で閉じる必要があります');
    }

    const reconnectWrap = getElement(canvasElement, '#boundary-reconnect-wrap') as HTMLDivElement;
    const reconnectTrigger = getElement(
      reconnect,
      '#boundary-reconnect-trigger',
    ) as HTMLButtonElement;
    clickPrimary(reconnectTrigger);
    await nextFrame();
    reconnectWrap.removeChild(reconnect);
    await nextFrame();
    reconnectWrap.appendChild(reconnect);
    await reconnect.updateComplete;
    await nextFrame();
    clickPrimary(getElement(reconnect, '#boundary-reconnect-trigger'));
    await nextFrame();
    if (!reconnect.opened) {
      throw new Error('reconnect 後も再び open できる必要があります');
    }

    const reconnectContent = getElement(
      reconnect,
      '#boundary-reconnect-content',
    ) as HTMLDivElement;
    const style = getComputedStyle(reconnectContent);
    if (style.overflowY !== 'auto') {
      throw new Error(`長文 content は overflow-y:auto が必要です: ${style.overflowY}`);
    }
    if (style.maxHeight === 'none') {
      throw new Error('長文 content は max-height 制約を失ってはいけません');
    }
  },
};

export const VisualModeContracts: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <div
      style="
        background: oklch(18% 0.01 250);
        color: oklch(95% 0.01 250);
        padding: 1rem;
        border-radius: 10px;
        display: flex;
        gap: 1rem;
      "
    >
      <ui-popover id="visual-default" variant="default">
        <button id="visual-default-trigger" slot="trigger" type="button">Default</button>
        <div id="visual-default-content" slot="content">default</div>
      </ui-popover>
      <ui-popover id="visual-subtle" variant="subtle">
        <button id="visual-subtle-trigger" slot="trigger" type="button">Subtle</button>
        <div id="visual-subtle-content" slot="content">subtle</div>
      </ui-popover>
      <ui-popover id="visual-inverse" variant="inverse">
        <button id="visual-inverse-trigger" slot="trigger" type="button">Inverse</button>
        <div id="visual-inverse-content" slot="content">inverse</div>
      </ui-popover>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultHost = getHost(canvasElement, 'visual-default');
    const subtleHost = getHost(canvasElement, 'visual-subtle');
    const inverseHost = getHost(canvasElement, 'visual-inverse');
    await Promise.all([defaultHost.updateComplete, subtleHost.updateComplete, inverseHost.updateComplete]);

    clickPrimary(getElement(defaultHost, '#visual-default-trigger'));
    clickPrimary(getElement(subtleHost, '#visual-subtle-trigger'));
    clickPrimary(getElement(inverseHost, '#visual-inverse-trigger'));
    await nextFrame();
    await wait(10);

    const defaultStyle = getComputedStyle(getElement(defaultHost, '#visual-default-content'));
    const subtleStyle = getComputedStyle(getElement(subtleHost, '#visual-subtle-content'));
    const inverseStyle = getComputedStyle(getElement(inverseHost, '#visual-inverse-content'));

    if (defaultStyle.backgroundColor === subtleStyle.backgroundColor) {
      throw new Error('default と subtle の背景は区別できる必要があります');
    }
    if (defaultStyle.backgroundColor === inverseStyle.backgroundColor) {
      throw new Error('default と inverse の背景は区別できる必要があります');
    }
    if (defaultStyle.boxShadow === 'none') {
      throw new Error('default variant は shadow を維持する必要があります');
    }

    const styleElement = document.getElementById(DOCUMENT_STYLE_ID);
    if (!(styleElement instanceof HTMLStyleElement)) {
      throw new Error('document 単位の style 供給が存在しません');
    }

    const cssText = styleElement.textContent || '';
    const requiredSnippets = [
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
      '@media print',
      'var(--z-popover',
      'var(--bg-surface-2',
      'var(--fg-default',
      'var(--border-default',
      'var(--elevation-lg',
    ];
    for (const snippet of requiredSnippets) {
      if (!cssText.includes(snippet)) {
        throw new Error(`表示契約に必要な document style が不足しています: ${snippet}`);
      }
    }
  },
};
