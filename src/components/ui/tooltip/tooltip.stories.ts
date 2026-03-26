import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './tooltip';
import { UiTooltip } from './tooltip';
import '../tree-item/tree-item';
import type { TreeItem } from '../tree-item/tree-item';

const nextFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const getTooltipHost = (canvasElement: Element, id: string): UiTooltip => {
  const host = canvasElement.querySelector<UiTooltip>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getTrigger = (host: UiTooltip, selector: string): HTMLElement => {
  const trigger = host.querySelector<HTMLElement>(selector);
  if (!trigger) throw new Error(`trigger (${selector}) が見つかりません`);
  return trigger;
};

const getPanel = (host: UiTooltip): HTMLElement => {
  const tooltipId = host.dataset['tooltipId'];
  if (!tooltipId) throw new Error('tooltip id が見つかりません');
  const panel = host.ownerDocument.getElementById(tooltipId);
  if (!panel) throw new Error('tooltip panel が見つかりません');
  return panel;
};

const getPanelIfPresent = (host: UiTooltip): HTMLElement | null => {
  const tooltipId = host.dataset['tooltipId'];
  if (!tooltipId) throw new Error('tooltip id が見つかりません');
  const panel = host.ownerDocument.getElementById(tooltipId);
  return panel instanceof HTMLElement ? panel : null;
};

const getPanelSurface = (host: UiTooltip): HTMLElement => {
  const panel = getPanel(host);
  const surface = panel.querySelector<HTMLElement>('[data-ui-tooltip-surface]');
  if (!surface) throw new Error('tooltip surface が見つかりません');
  return surface;
};

const waitForPanel = async (host: UiTooltip, maxFrames = 8): Promise<HTMLElement> => {
  for (let index = 0; index < maxFrames; index += 1) {
    const panel = getPanelIfPresent(host);
    if (panel) return panel;
    await nextFrame();
  }

  throw new Error('tooltip panel が見つかりません');
};

const openByHover = async (trigger: HTMLElement): Promise<void> => {
  trigger.dispatchEvent(new MouseEvent('mouseenter'));
  await nextFrame();
  await nextFrame();
};

const closeByLeave = async (trigger: HTMLElement): Promise<void> => {
  trigger.dispatchEvent(new MouseEvent('mouseleave'));
  await nextFrame();
  await nextFrame();
};

const movePointerFromTriggerToPanel = async (
  trigger: HTMLElement,
  panel: HTMLElement,
): Promise<void> => {
  trigger.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: panel }));
  panel.dispatchEvent(new MouseEvent('mouseenter', { relatedTarget: trigger }));
  await nextFrame();
  await nextFrame();
};

const getVerticalGap = (triggerRect: DOMRect, panelRect: DOMRect): number => {
  if (panelRect.bottom <= triggerRect.top) {
    return Math.round(triggerRect.top - panelRect.bottom);
  }

  if (panelRect.top >= triggerRect.bottom) {
    return Math.round(panelRect.top - triggerRect.bottom);
  }

  return -Math.round(
    Math.min(triggerRect.bottom, panelRect.bottom) - Math.max(triggerRect.top, panelRect.top),
  );
};

const meta: Meta<UiTooltip> = {
  title: 'Components/Tooltip',
  component: 'ui-tooltip',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
非インタラクティブな情報提示用ツールチップです。

- hover / focus で表示
- Escape で閉じる
- trigger へ aria-describedby を動的付与
- floating-ui で追従配置
        `,
      },
    },
  },
  argTypes: {
    text: {
      control: 'text',
      description: 'ツールチップテキスト',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
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
      table: { type: { summary: 'Placement' }, defaultValue: { summary: "'top'" } },
    },
    offset: {
      control: { type: 'number', min: 0, step: 1 },
      table: { type: { summary: 'number' }, defaultValue: { summary: '8' } },
    },
    openDelay: {
      control: { type: 'number', min: 0, step: 10 },
      name: 'open-delay',
      table: { type: { summary: 'number' }, defaultValue: { summary: '0' } },
    },
    closeDelay: {
      control: { type: 'number', min: 0, step: 10 },
      name: 'close-delay',
      table: { type: { summary: 'number' }, defaultValue: { summary: '0' } },
    },
    disabled: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<UiTooltip>;

export const DefaultInfoIcon: Story = {
  render: () => html`
    <ui-tooltip id="tooltip-default" text="この項目の補足情報を表示します" placement="top">
      <button
        id="tooltip-default-trigger"
        type="button"
        aria-label="補足情報"
        style="inline-size: 24px; block-size: 24px;"
      >
        <ui-icon name="circle-help" aria-hidden="true"></ui-icon>
      </button>
    </ui-tooltip>
  `,
  play: async ({ canvasElement }) => {
    const host = getTooltipHost(canvasElement, 'tooltip-default');
    await host.updateComplete;

    const trigger = getTrigger(host, '#tooltip-default-trigger');
    if (getPanelIfPresent(host) !== null) {
      throw new Error('初期状態で tooltip panel は生成されてはいけません');
    }

    await openByHover(trigger);
    const panel = await waitForPanel(host);
    if (panel.getAttribute('role') !== 'tooltip') {
      throw new Error('panel の role は tooltip である必要があります');
    }
    if (panel.getAttribute('aria-hidden') !== 'false') {
      throw new Error('hover 時に tooltip が表示されていません');
    }
    const describedBy = trigger.getAttribute('aria-describedby') ?? '';
    if (!describedBy.split(/\s+/).includes(panel.id)) {
      throw new Error('表示中は trigger に aria-describedby が付与される必要があります');
    }

    await movePointerFromTriggerToPanel(trigger, panel);
    if (panel.getAttribute('aria-hidden') !== 'false') {
      throw new Error('tooltip 上へポインタを移動しても表示を維持する必要があります');
    }

    panel.dispatchEvent(new MouseEvent('mouseleave'));
    await nextFrame();
    await nextFrame();
    if (getPanelIfPresent(host) !== null) {
      throw new Error('tooltip から離れたら panel は破棄される必要があります');
    }

    await closeByLeave(trigger);
    if (getPanelIfPresent(host) !== null) {
      throw new Error('leave 後に tooltip panel は破棄される必要があります');
    }
    if ((trigger.getAttribute('aria-describedby') ?? '').split(/\s+/).includes(panel.id)) {
      throw new Error('close 後に aria-describedby から tooltip id が除去されていません');
    }

    trigger.focus();
    await nextFrame();
    const focusedPanel = getPanel(host);
    if (focusedPanel.getAttribute('aria-hidden') !== 'false') {
      throw new Error('focus 時に tooltip が表示されていません');
    }

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextFrame();
    if (getPanelIfPresent(host) !== null) {
      throw new Error('Escape で close 後、tooltip panel は破棄される必要があります');
    }
  },
};

export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.875rem;
      }

      .cell {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .label {
        inline-size: 140px;
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--fg-muted, #666);
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <span class="label">default / enabled</span>
        <ui-tooltip id="matrix-default" text="default tooltip" variant="default">
          <button id="matrix-default-trigger" type="button">?</button>
        </ui-tooltip>
      </div>

      <div class="cell">
        <span class="label">subtle / enabled</span>
        <ui-tooltip id="matrix-subtle" text="subtle tooltip" variant="subtle">
          <button id="matrix-subtle-trigger" type="button">?</button>
        </ui-tooltip>
      </div>

      <div class="cell">
        <span class="label">inverse / enabled</span>
        <ui-tooltip id="matrix-inverse" text="inverse tooltip" variant="inverse">
          <button id="matrix-inverse-trigger" type="button">?</button>
        </ui-tooltip>
      </div>

      <div class="cell">
        <span class="label">default / disabled</span>
        <ui-tooltip id="matrix-disabled" text="disabled tooltip" variant="default" disabled>
          <button id="matrix-disabled-trigger" type="button">?</button>
        </ui-tooltip>
      </div>

      <div class="cell">
        <span class="label">invalid variant fallback</span>
        <ui-tooltip id="matrix-invalid" text="invalid tooltip" variant="broken">
          <button id="matrix-invalid-trigger" type="button">?</button>
        </ui-tooltip>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ids = [
      'matrix-default',
      'matrix-subtle',
      'matrix-inverse',
      'matrix-disabled',
      'matrix-invalid',
    ] as const;
    const hosts = ids.map((id) => getTooltipHost(canvasElement, id));
    await Promise.all(hosts.map(async (host) => host.updateComplete));

    const defaultHost = getTooltipHost(canvasElement, 'matrix-default');
    const subtleHost = getTooltipHost(canvasElement, 'matrix-subtle');
    const inverseHost = getTooltipHost(canvasElement, 'matrix-inverse');
    const disabledHost = getTooltipHost(canvasElement, 'matrix-disabled');
    const invalidHost = getTooltipHost(canvasElement, 'matrix-invalid');

    if (invalidHost.variant !== 'default') {
      throw new Error(
        `invalid variant は default に正規化される必要があります: ${invalidHost.variant}`,
      );
    }

    const defaultTrigger = getTrigger(defaultHost, '#matrix-default-trigger');
    const subtleTrigger = getTrigger(subtleHost, '#matrix-subtle-trigger');
    const inverseTrigger = getTrigger(inverseHost, '#matrix-inverse-trigger');
    const disabledTrigger = getTrigger(disabledHost, '#matrix-disabled-trigger');

    await openByHover(defaultTrigger);
    await openByHover(subtleTrigger);
    await openByHover(inverseTrigger);

    const defaultPanel = await waitForPanel(defaultHost);
    const subtlePanel = await waitForPanel(subtleHost);
    const inversePanel = await waitForPanel(inverseHost);

    if (defaultPanel.dataset['variant'] !== 'default') {
      throw new Error('default panel の variant が不正です');
    }
    if (subtlePanel.dataset['variant'] !== 'subtle') {
      throw new Error('subtle panel の variant が不正です');
    }
    if (inversePanel.dataset['variant'] !== 'inverse') {
      throw new Error('inverse panel の variant が不正です');
    }

    const defaultBg = getComputedStyle(getPanelSurface(defaultHost)).backgroundColor;
    const subtleBg = getComputedStyle(getPanelSurface(subtleHost)).backgroundColor;
    const inverseBg = getComputedStyle(getPanelSurface(inverseHost)).backgroundColor;

    if (defaultBg === subtleBg) {
      throw new Error('default と subtle の背景色は差分が必要です');
    }
    if (defaultBg === inverseBg) {
      throw new Error('default と inverse の背景色は差分が必要です');
    }

    disabledTrigger.dispatchEvent(new MouseEvent('mouseenter'));
    await nextFrame();
    if (getPanelIfPresent(disabledHost) !== null) {
      throw new Error('disabled の tooltip は panel を生成してはいけません');
    }
  },
};

export const TransformZoomContract: Story = {
  render: () => html`
    <style>
      #tooltip-zoom-scale {
        display: inline-block;
        transform-origin: top left;
      }
    </style>

    <div style="padding: 2rem; min-block-size: 18rem; display: flex; align-items: flex-start;">
      <div id="tooltip-zoom-scale">
        <ui-tooltip id="tooltip-zoom" text="Zoom しても隙間が崩れない" placement="bottom">
          <button id="tooltip-zoom-trigger" type="button">拡大確認</button>
        </ui-tooltip>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const scaleHost = canvasElement.querySelector<HTMLElement>('#tooltip-zoom-scale');
    if (!scaleHost) throw new Error('#tooltip-zoom-scale が見つかりません');

    const host = getTooltipHost(canvasElement, 'tooltip-zoom');
    await host.updateComplete;

    const trigger = getTrigger(host, '#tooltip-zoom-trigger');
    await openByHover(trigger);
    const panel = await waitForPanel(host);

    const initialTriggerRect = trigger.getBoundingClientRect();
    const initialPanelRect = panel.getBoundingClientRect();
    const initialGap = getVerticalGap(initialTriggerRect, initialPanelRect);
    if (Math.abs(initialGap - 8) > 2) {
      throw new Error(`初期ギャップが offset に近い必要があります: ${String(initialGap)}px`);
    }

    scaleHost.style.transform = 'scale(1.5)';
    window.dispatchEvent(new Event('resize'));
    await nextFrame();
    await nextFrame();

    const zoomedTriggerRect = trigger.getBoundingClientRect();
    const zoomedPanelRect = panel.getBoundingClientRect();
    const zoomedGap = getVerticalGap(zoomedTriggerRect, zoomedPanelRect);
    if (Math.abs(zoomedGap - initialGap) > 3) {
      throw new Error(
        `transform zoom 後も trigger と tooltip の距離は offset を維持する必要があります: ${String(zoomedGap)}px`,
      );
    }
  },
};

export const BoundaryConditions: Story = {
  render: () => html`
    <style>
      .boundary {
        display: grid;
        gap: 0.75rem;
      }

      .dynamic {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
    </style>

    <div class="boundary" id="boundary-root">
      <ui-tooltip id="boundary-empty" text="   ">
        <button id="boundary-empty-trigger" type="button">empty text</button>
      </ui-tooltip>

      <ui-tooltip
        id="boundary-invalid"
        text="invalid value fallback"
        variant="unsupported"
        placement="diagonal"
        offset="NaN"
        open-delay="-40"
        close-delay="-20"
      >
        <button id="boundary-invalid-trigger" type="button">invalid attrs</button>
      </ui-tooltip>

      <ui-tooltip id="boundary-no-trigger" text="no trigger"></ui-tooltip>

      <div id="reconnect-container" class="dynamic">
        <ui-tooltip id="boundary-reconnect" text="reconnect tooltip" open-delay="5" close-delay="5">
          <button id="boundary-reconnect-trigger" type="button">reconnect</button>
        </ui-tooltip>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const empty = getTooltipHost(canvasElement, 'boundary-empty');
    const invalid = getTooltipHost(canvasElement, 'boundary-invalid');
    const noTrigger = getTooltipHost(canvasElement, 'boundary-no-trigger');
    const reconnect = getTooltipHost(canvasElement, 'boundary-reconnect');
    await Promise.all([
      empty.updateComplete,
      invalid.updateComplete,
      noTrigger.updateComplete,
      reconnect.updateComplete,
    ]);

    const emptyTrigger = getTrigger(empty, '#boundary-empty-trigger');
    emptyTrigger.dispatchEvent(new MouseEvent('mouseenter'));
    await nextFrame();
    if (getPanelIfPresent(empty) !== null) {
      throw new Error('text が空の場合は tooltip panel を生成してはいけません');
    }

    if (invalid.variant !== 'default') {
      throw new Error(`invalid variant の正規化が不正です: ${invalid.variant}`);
    }
    if (invalid.placement !== 'top') {
      throw new Error(`invalid placement の正規化が不正です: ${invalid.placement}`);
    }
    if (invalid.offset !== 8) {
      throw new Error(`invalid offset の正規化が不正です: ${String(invalid.offset)}`);
    }
    if (invalid.openDelay !== 0) {
      throw new Error(`invalid openDelay の正規化が不正です: ${String(invalid.openDelay)}`);
    }
    if (invalid.closeDelay !== 0) {
      throw new Error(`invalid closeDelay の正規化が不正です: ${String(invalid.closeDelay)}`);
    }

    const invalidTrigger = getTrigger(invalid, '#boundary-invalid-trigger');
    await openByHover(invalidTrigger);
    if ((await waitForPanel(invalid)).getAttribute('aria-hidden') !== 'false') {
      throw new Error('正規化後の tooltip は表示できる必要があります');
    }

    const noTriggerSlot = noTrigger.shadowRoot?.querySelector('slot');
    if (!(noTriggerSlot instanceof HTMLSlotElement)) {
      throw new Error('no-trigger の slot が見つかりません');
    }
    if (noTriggerSlot.assignedElements({ flatten: true }).length !== 0) {
      throw new Error('no-trigger ストーリーに trigger が割り当てられてはいけません');
    }

    const reconnectContainer = canvasElement.querySelector<HTMLElement>('#reconnect-container');
    if (!reconnectContainer) throw new Error('#reconnect-container が見つかりません');

    const reconnectTrigger = getTrigger(reconnect, '#boundary-reconnect-trigger');
    await openByHover(reconnectTrigger);
    reconnectContainer.removeChild(reconnect);
    await nextFrame();
    reconnectContainer.appendChild(reconnect);
    await reconnect.updateComplete;

    const reconnectTriggerAfter = getTrigger(reconnect, '#boundary-reconnect-trigger');
    await openByHover(reconnectTriggerAfter);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await nextFrame();
    if ((await waitForPanel(reconnect)).getAttribute('aria-hidden') !== 'false') {
      throw new Error('reconnect 後も tooltip が開ける必要があります');
    }
  },
};

export const DarkModeContract: Story = {
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
      <ui-tooltip id="dark-default" text="dark default" variant="default">
        <button id="dark-default-trigger" type="button">Default</button>
      </ui-tooltip>

      <ui-tooltip id="dark-inverse" text="dark inverse" variant="inverse">
        <button id="dark-inverse-trigger" type="button">Inverse</button>
      </ui-tooltip>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const darkDefault = getTooltipHost(canvasElement, 'dark-default');
    const darkInverse = getTooltipHost(canvasElement, 'dark-inverse');
    await Promise.all([darkDefault.updateComplete, darkInverse.updateComplete]);

    await openByHover(getTrigger(darkDefault, '#dark-default-trigger'));
    await openByHover(getTrigger(darkInverse, '#dark-inverse-trigger'));

    const defaultPanel = await waitForPanel(darkDefault);
    const inversePanel = await waitForPanel(darkInverse);

    const defaultStyle = getComputedStyle(getPanelSurface(darkDefault));
    const inverseStyle = getComputedStyle(getPanelSurface(darkInverse));
    const defaultPanelStyle = getComputedStyle(defaultPanel);
    const inversePanelStyle = getComputedStyle(inversePanel);

    if (defaultStyle.backgroundColor === inverseStyle.backgroundColor) {
      throw new Error('dark mode でも default/inverse の背景が区別できる必要があります');
    }
    if (defaultPanelStyle.zIndex === 'auto' || inversePanelStyle.zIndex === 'auto') {
      throw new Error('tooltip は z-popover を使用する必要があります');
    }
    if (defaultStyle.boxShadow === 'none') {
      throw new Error('tooltip は dark mode でも shadow を持つ必要があります');
    }
  },
};

export const VisualModeContracts: Story = {
  render: () => html`
    <ui-tooltip id="visual-mode" text="visual contract">
      <button id="visual-mode-trigger" type="button">visual</button>
    </ui-tooltip>
  `,
  play: async ({ canvasElement }) => {
    const host = getTooltipHost(canvasElement, 'visual-mode');
    await host.updateComplete;

    const styleElement = document.getElementById('ui-tooltip-document-styles');
    if (!(styleElement instanceof HTMLStyleElement)) {
      throw new Error('ui-tooltip の document style が注入されていません');
    }

    const cssText = styleElement.textContent;
    const requiredSnippets = [
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
      '@media print',
      'pointer-events: auto',
      'var(--z-popover',
      'var(--bg-surface-2',
      'var(--fg-default',
      'var(--border-default',
      'var(--elevation-lg',
    ];

    for (const snippet of requiredSnippets) {
      if (!cssText.includes(snippet)) {
        throw new Error(`表示モード契約に必要なスタイル定義が不足しています: ${snippet}`);
      }
    }

    if (getPanelIfPresent(host) !== null) {
      throw new Error('初期状態では panel は生成されてはいけません');
    }
  },
};

export const TreeItemIntegrationContract: Story = {
  render: () => html`
    <style>
      .tree-wrap {
        max-inline-size: 220px;
        border: 1px solid var(--border-default, #d9d9d9);
        border-radius: var(--radius-md, 6px);
        padding: 8px;
        display: grid;
        gap: 8px;
      }
    </style>

    <div class="tree-wrap">
      <ui-tree-item
        id="tree-long"
        label="これは非常に長いファイル名でコンテナ幅を超える可能性があります.tsx"
        icon="file-code"
      ></ui-tree-item>
      <ui-tree-item id="tree-short" label="a.ts" icon="file-code"></ui-tree-item>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const longItem = canvasElement.querySelector<TreeItem>('#tree-long');
    const shortItem = canvasElement.querySelector<TreeItem>('#tree-short');
    if (!longItem || !shortItem) {
      throw new Error('tree item が見つかりません');
    }

    await Promise.all([longItem.updateComplete, shortItem.updateComplete]);
    await nextFrame();
    await nextFrame();

    const longLabel = longItem.shadowRoot?.querySelector<HTMLElement>('.label');
    const shortLabel = shortItem.shadowRoot?.querySelector<HTMLElement>('.label');
    const longTooltip = longItem.shadowRoot?.querySelector<UiTooltip>('ui-tooltip.item-tooltip');
    const shortTooltip = shortItem.shadowRoot?.querySelector<UiTooltip>('ui-tooltip.item-tooltip');

    if (!longLabel || !shortLabel || !longTooltip || !shortTooltip) {
      throw new Error('tree-item 内の label / tooltip 構造が不正です');
    }

    const longStyle = getComputedStyle(longLabel);
    const shortStyle = getComputedStyle(shortLabel);
    if (longStyle.textOverflow !== 'ellipsis' || shortStyle.textOverflow !== 'ellipsis') {
      throw new Error('label の ellipsis 契約が失われています');
    }

    if (longTooltip.disabled) {
      throw new Error('長いラベルでは tooltip が有効である必要があります');
    }
    if (!shortTooltip.disabled) {
      throw new Error('短いラベルでは tooltip は無効である必要があります');
    }

    const longItemTrigger = longItem.shadowRoot?.querySelector<HTMLElement>('.item');
    if (!longItemTrigger) throw new Error('long item の trigger が見つかりません');

    await openByHover(longItemTrigger);
    const longPanel = await waitForPanel(longTooltip);
    if (longPanel.getAttribute('aria-hidden') !== 'false') {
      throw new Error('長いラベルで hover 時に tooltip が開く必要があります');
    }

    await closeByLeave(longItemTrigger);
    if (getPanelIfPresent(longTooltip) !== null) {
      throw new Error('leave 後に tooltip panel は破棄される必要があります');
    }
  },
};
