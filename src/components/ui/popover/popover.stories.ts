import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './popover';
import { DOCUMENT_STYLE_ID, UiPopover } from './popover';

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

const getTrigger = (host: UiPopover, selector = '[slot="trigger"]'): HTMLElement => {
  const trigger = host.querySelector<HTMLElement>(selector);
  if (!trigger) throw new Error(`trigger (${selector}) が見つかりません`);
  return trigger;
};

const getContent = (host: UiPopover, selector = '[slot="content"]'): HTMLElement => {
  const content = host.querySelector<HTMLElement>(selector);
  if (!content) throw new Error(`content (${selector}) が見つかりません`);
  return content;
};

const getExpanded = (trigger: HTMLElement): string => trigger.getAttribute('aria-expanded') ?? '';

const clickPrimary = (target: HTMLElement): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  target.dispatchEvent(event);
  return event;
};

const meta: Meta<UiPopover> = {
  title: 'Components/Popover',
  component: 'ui-popover',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
クリック起点の汎用 Popover です。

- \`slot="trigger"\` / \`slot="content"\` を使用
- Popover API 対応環境では \`showPopover/hidePopover\` を利用
- 非対応環境ではフォールバック表示へ切り替え
- \`openForTrigger\` により共有トリガー運用が可能
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
    disabled: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    keepLinkFallback: {
      name: 'keep-link-fallback',
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<UiPopover>;

export const DefaultContract: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-popover id="popover-default">
        <button id="popover-default-trigger" slot="trigger" type="button">詳細を開く</button>
        <div id="popover-default-content" slot="content">Popover 本文です。</div>
      </ui-popover>
      <button id="popover-after" type="button">次要素</button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'popover-default');
    await host.updateComplete;

    const trigger = getTrigger(host, '#popover-default-trigger');
    const content = getContent(host, '#popover-default-content');
    const after = canvasElement.querySelector<HTMLButtonElement>('#popover-after');
    if (!after) throw new Error('#popover-after が見つかりません');

    if (content.id !== trigger.getAttribute('aria-controls')) {
      throw new Error('trigger の aria-controls が content.id と一致しません');
    }
    if (getExpanded(trigger) !== 'false') {
      throw new Error('初期 aria-expanded は false である必要があります');
    }

    trigger.focus();
    clickPrimary(trigger);
    await nextFrame();

    if (!host.opened) {
      throw new Error('クリックで opened=true になる必要があります');
    }
    if (getExpanded(trigger) !== 'true') {
      throw new Error('open 時に aria-expanded=true が必要です');
    }
    if (supportsPopoverApi()) {
      if (!isPopoverOpen(content)) {
        throw new Error('Popover API 対応環境で :popover-open が成立していません');
      }
    } else if (content.hidden) {
      throw new Error('フォールバック環境で content が表示されていません');
    }
    const openedStyle = getComputedStyle(content);
    if (openedStyle.left === '0px' && openedStyle.top === '0px') {
      throw new Error('open 時に popover 座標が更新されていません');
    }

    content.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await nextFrame();

    if (document.activeElement !== trigger) {
      throw new Error('Escape クローズ後に trigger へフォーカス復帰する必要があります');
    }
    if (getExpanded(trigger) !== 'false') {
      throw new Error('close 後に aria-expanded=false が必要です');
    }

    clickPrimary(trigger);
    await nextFrame();
    after.focus();
    host.close({ returnFocus: false });
    await nextFrame();
    if (document.activeElement !== after) {
      throw new Error('returnFocus=false の close ではフォーカス復帰してはいけません');
    }
  },
};

export const TypographyZoomContract: Story = {
  render: () => html`
    <div id="popover-zoom-wrapper" style="padding: 2rem; font-size: 16px;">
      <ui-popover id="popover-zoom">
        <button id="popover-zoom-trigger" slot="trigger" type="button">拡大確認</button>
        <div id="popover-zoom-content" slot="content">Popover 本文も拡大される必要があります。</div>
      </ui-popover>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const wrapper = canvasElement.querySelector<HTMLElement>('#popover-zoom-wrapper');
    if (!wrapper) throw new Error('#popover-zoom-wrapper が見つかりません');

    const host = getHost(canvasElement, 'popover-zoom');
    await host.updateComplete;

    const trigger = getTrigger(host, '#popover-zoom-trigger');
    const content = getContent(host, '#popover-zoom-content');

    clickPrimary(trigger);
    await nextFrame();

    const initialFontSize = getComputedStyle(content).fontSize;
    if (initialFontSize !== '16px') {
      throw new Error(`初期フォントサイズは親要素を継承する必要があります: ${initialFontSize}`);
    }

    wrapper.style.fontSize = '24px';
    await nextFrame();

    const zoomedFontSize = getComputedStyle(content).fontSize;
    if (zoomedFontSize !== '24px') {
      throw new Error(`親要素の文字拡大に追従していません: ${zoomedFontSize}`);
    }
  },
};

export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.75rem;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .label {
        inline-size: 180px;
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
    </style>
    <div class="matrix">
      <div class="row">
        <span class="label">default / enabled</span>
        <ui-popover id="matrix-default" variant="default">
          <button id="matrix-default-trigger" slot="trigger" type="button">open</button>
          <div id="matrix-default-content" slot="content">default</div>
        </ui-popover>
      </div>
      <div class="row">
        <span class="label">subtle / enabled</span>
        <ui-popover id="matrix-subtle" variant="subtle">
          <button id="matrix-subtle-trigger" slot="trigger" type="button">open</button>
          <div id="matrix-subtle-content" slot="content">subtle</div>
        </ui-popover>
      </div>
      <div class="row">
        <span class="label">inverse / enabled</span>
        <ui-popover id="matrix-inverse" variant="inverse">
          <button id="matrix-inverse-trigger" slot="trigger" type="button">open</button>
          <div id="matrix-inverse-content" slot="content">inverse</div>
        </ui-popover>
      </div>
      <div class="row">
        <span class="label">default / disabled</span>
        <ui-popover id="matrix-disabled" variant="default" disabled>
          <button id="matrix-disabled-trigger" slot="trigger" type="button">open</button>
          <div id="matrix-disabled-content" slot="content">disabled</div>
        </ui-popover>
      </div>
      <div class="row">
        <span class="label">invalid variant fallback</span>
        <ui-popover id="matrix-invalid" variant="broken">
          <button id="matrix-invalid-trigger" slot="trigger" type="button">open</button>
          <div id="matrix-invalid-content" slot="content">invalid</div>
        </ui-popover>
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
    const hosts = ids.map((id) => getHost(canvasElement, id));
    await Promise.all(hosts.map((host) => host.updateComplete));

    const invalid = getHost(canvasElement, 'matrix-invalid');
    if (invalid.variant !== 'default') {
      throw new Error(
        `invalid variant は default に正規化される必要があります: ${invalid.variant}`,
      );
    }

    for (const id of ['matrix-default', 'matrix-subtle', 'matrix-inverse'] as const) {
      clickPrimary(getTrigger(getHost(canvasElement, id), `#${id}-trigger`));
      await nextFrame();
    }

    const defaultBg = getComputedStyle(
      getContent(getHost(canvasElement, 'matrix-default')),
    ).backgroundColor;
    const subtleBg = getComputedStyle(
      getContent(getHost(canvasElement, 'matrix-subtle')),
    ).backgroundColor;
    const inverseBg = getComputedStyle(
      getContent(getHost(canvasElement, 'matrix-inverse')),
    ).backgroundColor;

    if (defaultBg === subtleBg) {
      throw new Error('default と subtle の背景色は差分が必要です');
    }
    if (defaultBg === inverseBg) {
      throw new Error('default と inverse の背景色は差分が必要です');
    }

    const disabledHost = getHost(canvasElement, 'matrix-disabled');
    clickPrimary(getTrigger(disabledHost, '#matrix-disabled-trigger'));
    await nextFrame();
    if (disabledHost.opened) {
      throw new Error('disabled 状態で開いてはいけません');
    }
  },
};

export const AnchorDualAccessBoundary: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-popover id="popover-anchor" keep-link-fallback>
        <a id="anchor-trigger" slot="trigger" href="#anchor-target">脚注リンク</a>
        <div id="anchor-content" slot="content">リンク型 trigger の検証</div>
      </ui-popover>
      <div id="anchor-target">target</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'popover-anchor');
    await host.updateComplete;
    const trigger = getTrigger(host, '#anchor-trigger');

    // バブルフェーズのリスナーでコンポーネント処理後の状態を記録しつつナビゲーションを防ぐ
    // （dispatchEvent は同期的のため、コンポーネントの target フェーズ処理後に実行される）
    const dispatchAndCapture = (event: MouseEvent): boolean => {
      let preventedByComponent = false;
      const guard = (e: Event): void => {
        preventedByComponent = e.defaultPrevented;
        e.preventDefault(); // 実際のナビゲーションを防止
      };
      canvasElement.addEventListener('click', guard);
      trigger.dispatchEvent(event);
      canvasElement.removeEventListener('click', guard);
      return preventedByComponent;
    };

    const modifiedClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true,
    });
    if (dispatchAndCapture(modifiedClick)) {
      throw new Error('修飾キー付きクリックは preventDefault してはいけません');
    }

    const middleClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 1,
    });
    if (dispatchAndCapture(middleClick)) {
      throw new Error('中クリックは preventDefault してはいけません');
    }

    const normalClick = clickPrimary(trigger);
    await nextFrame();

    if (supportsPopoverApi()) {
      if (!normalClick.defaultPrevented) {
        throw new Error('Popover API 対応環境の通常クリックは preventDefault が必要です');
      }
      if (!host.opened) {
        throw new Error('通常クリックで開く必要があります');
      }
    } else {
      if (normalClick.defaultPrevented) {
        throw new Error('Popover 非対応環境ではリンクフォールバックを維持する必要があります');
      }
      if (host.opened) {
        throw new Error('Popover 非対応環境 keepLinkFallback では opened=false を維持します');
      }
    }
  },
};

export const ProgrammaticSharedTriggerContract: Story = {
  render: () => html`
    <div style="padding: 2rem; display: grid; gap: 0.75rem;">
      <ui-popover id="shared-popover">
        <button id="shared-owner-trigger" slot="trigger" type="button">owner</button>
        <div id="shared-content" slot="content">共有コンテンツ</div>
      </ui-popover>
      <button id="shared-follower-trigger" type="button">follower</button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'shared-popover');
    await host.updateComplete;

    const ownerTrigger = getTrigger(host, '#shared-owner-trigger');
    const followerTrigger = canvasElement.querySelector<HTMLElement>('#shared-follower-trigger');
    if (!followerTrigger) throw new Error('#shared-follower-trigger が見つかりません');

    host.openForTrigger(followerTrigger);
    await nextFrame();
    if (!host.opened) {
      throw new Error('openForTrigger(follower) で開く必要があります');
    }
    if (getExpanded(followerTrigger) !== 'true') {
      throw new Error('follower trigger の aria-expanded が true である必要があります');
    }
    if (getExpanded(ownerTrigger) !== 'false') {
      throw new Error('owner trigger の aria-expanded は false を維持する必要があります');
    }

    host.openForTrigger(ownerTrigger);
    await nextFrame();
    if (getExpanded(ownerTrigger) !== 'true') {
      throw new Error('owner trigger の aria-expanded が true に切り替わる必要があります');
    }
    if (getExpanded(followerTrigger) !== 'false') {
      throw new Error('active trigger 切り替え時に follower は false へ戻る必要があります');
    }

    ownerTrigger.focus();
    host.close();
    await nextFrame();
    if (document.activeElement !== ownerTrigger) {
      throw new Error('close() の既定動作で active trigger にフォーカス復帰する必要があります');
    }
  },
};

export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-popover id="boundary-invalid" variant="unsupported" placement="diagonal" offset="-4">
        <button id="boundary-invalid-trigger" slot="trigger" type="button">invalid</button>
        <div id="boundary-invalid-content" slot="content">invalid normalization</div>
      </ui-popover>

      <ui-popover id="boundary-no-content">
        <button id="boundary-no-content-trigger" slot="trigger" type="button">no content</button>
      </ui-popover>

      <ui-popover id="boundary-no-trigger" opened>
        <div id="boundary-no-trigger-content" slot="content">no trigger</div>
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
    const noContent = getHost(canvasElement, 'boundary-no-content');
    const noTrigger = getHost(canvasElement, 'boundary-no-trigger');
    const reconnect = getHost(canvasElement, 'boundary-reconnect');
    await Promise.all([
      invalid.updateComplete,
      noContent.updateComplete,
      noTrigger.updateComplete,
      reconnect.updateComplete,
    ]);

    if (invalid.variant !== 'default') {
      throw new Error(`invalid variant の正規化が不正です: ${invalid.variant}`);
    }
    if (invalid.placement !== 'bottom-start') {
      throw new Error(`invalid placement の正規化が不正です: ${invalid.placement}`);
    }
    if (invalid.offset !== 0) {
      throw new Error(`invalid offset の正規化が不正です: ${String(invalid.offset)}`);
    }

    clickPrimary(getTrigger(noContent, '#boundary-no-content-trigger'));
    await nextFrame();
    if (noContent.opened) {
      throw new Error('content 不在では開いてはいけません');
    }

    await noTrigger.updateComplete;
    if (noTrigger.opened) {
      throw new Error('trigger 不在では opened=true を維持してはいけません');
    }

    const wrap = canvasElement.querySelector<HTMLElement>('#boundary-reconnect-wrap');
    if (!wrap) throw new Error('#boundary-reconnect-wrap が見つかりません');
    clickPrimary(getTrigger(reconnect, '#boundary-reconnect-trigger'));
    await nextFrame();
    if (!reconnect.opened) {
      throw new Error('reconnect 前提で開いている必要があります');
    }

    wrap.removeChild(reconnect);
    await nextFrame();
    wrap.appendChild(reconnect);
    await reconnect.updateComplete;
    clickPrimary(getTrigger(reconnect, '#boundary-reconnect-trigger'));
    await nextFrame();
    clickPrimary(getTrigger(reconnect, '#boundary-reconnect-trigger'));
    await nextFrame();
    clickPrimary(getTrigger(reconnect, '#boundary-reconnect-trigger'));
    await nextFrame();
    const reconnectTrigger = getTrigger(reconnect, '#boundary-reconnect-trigger');
    if (reconnectTrigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('再接続後も開閉できる必要があります');
    }

    const reconnectContent = getContent(reconnect, '#boundary-reconnect-content');
    const style = getComputedStyle(reconnectContent);
    if (style.overflowY !== 'auto') {
      throw new Error(`content の overflow-y は auto である必要があります: ${style.overflowY}`);
    }
    if (style.maxHeight === 'none') {
      throw new Error('content の max-height が無制限です');
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
      <ui-popover id="dark-default" variant="default">
        <button id="dark-default-trigger" slot="trigger" type="button">Default</button>
        <div id="dark-default-content" slot="content">dark default</div>
      </ui-popover>
      <ui-popover id="dark-inverse" variant="inverse">
        <button id="dark-inverse-trigger" slot="trigger" type="button">Inverse</button>
        <div id="dark-inverse-content" slot="content">dark inverse</div>
      </ui-popover>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultHost = getHost(canvasElement, 'dark-default');
    const inverseHost = getHost(canvasElement, 'dark-inverse');
    await Promise.all([defaultHost.updateComplete, inverseHost.updateComplete]);

    clickPrimary(getTrigger(defaultHost, '#dark-default-trigger'));
    clickPrimary(getTrigger(inverseHost, '#dark-inverse-trigger'));
    await nextFrame();
    await wait(10);

    const defaultStyle = getComputedStyle(getContent(defaultHost, '#dark-default-content'));
    const inverseStyle = getComputedStyle(getContent(inverseHost, '#dark-inverse-content'));
    if (defaultStyle.backgroundColor === inverseStyle.backgroundColor) {
      throw new Error('dark mode でも default/inverse の背景が区別できる必要があります');
    }
    if (defaultStyle.boxShadow === 'none') {
      throw new Error('dark mode でも shadow を維持する必要があります');
    }
    if (defaultStyle.zIndex === 'auto') {
      throw new Error('z-index は z-popover を参照する必要があります');
    }
  },
};

export const VisualModeContracts: Story = {
  render: () => html`
    <ui-popover id="visual-popover">
      <button id="visual-trigger" slot="trigger" type="button">visual</button>
      <div id="visual-content" slot="content">visual content</div>
    </ui-popover>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'visual-popover');
    await host.updateComplete;

    const styleElement = document.getElementById(DOCUMENT_STYLE_ID);
    if (!(styleElement instanceof HTMLStyleElement)) {
      throw new Error('ui-popover の document style が注入されていません');
    }
    const cssText = styleElement.textContent;
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
        throw new Error(`表示モード契約に必要なスタイル定義が不足しています: ${snippet}`);
      }
    }

    const content = getContent(host, '#visual-content');
    // Popover API 環境では hidden 属性ではなく UA スタイルで非表示になるため、
    // popover 属性あり + :popover-open でない場合も「非表示」として扱う
    const isHiddenByAttribute = content.hidden;
    const isHiddenByPopoverApi = content.hasAttribute('popover') && !isPopoverOpen(content);
    if (!isHiddenByAttribute && !isHiddenByPopoverApi) {
      throw new Error('初期状態では content は非表示である必要があります');
    }
  },
};
