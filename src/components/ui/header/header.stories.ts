import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './header';
import type { UiHeader, UiHeaderSidebarToggleDetail } from './header';
import '../breadcrumbs/breadcrumbs';
import '../button/button';
import '../dropdown/dropdown';
import '../search-trigger/search-trigger';

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const flush = async (host: UiHeader): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const waitForEvent = <T extends Event>(
  target: EventTarget,
  eventName: string,
  timeoutMs = 3000,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${eventName} の待機がタイムアウトしました`));
    }, timeoutMs);

    const listener: EventListener = (event) => {
      window.clearTimeout(timer);
      resolve(event as T);
    };

    target.addEventListener(eventName, listener, { once: true });
  });

const ensureNoEvent = async (
  target: EventTarget,
  eventName: string,
  action: () => void | Promise<void>,
  waitMs = 220,
): Promise<void> => {
  let listener!: EventListener;
  const eventPromise = new Promise<never>((_, reject) => {
    listener = () => {
      target.removeEventListener(eventName, listener);
      reject(new Error(`${eventName} が重複発火しました`));
    };
    target.addEventListener(eventName, listener);
  });

  const timeoutPromise = wait(waitMs);
  await action();
  await Promise.race([eventPromise, timeoutPromise]);
  target.removeEventListener(eventName, listener);
};

const isMobileViewport = (): boolean => window.matchMedia('(max-width: 640px)').matches;

const getZone = (host: UiHeader, selector: string): HTMLElement => {
  const zone = host.shadowRoot?.querySelector<HTMLElement>(selector);
  assert(!!zone, `${selector} が見つかりません`);
  return zone;
};

const getSlot = (host: UiHeader, name: string): HTMLSlotElement => {
  const slot = host.shadowRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`);
  assert(!!slot, `slot[name="${name}"] が見つかりません`);
  return slot;
};

const fullSlotContent = html`
  <div slot="start" style="display: flex; align-items: center; gap: 8px;">
    <ui-button variant="ghost" icon-only aria-label="サイドバーを閉じる">
      <iconify-icon icon="lucide:panel-left" aria-hidden="true"></iconify-icon>
    </ui-button>
    <ui-dropdown>
      <ui-button slot="trigger" variant="ghost">
        音楽
        <iconify-icon
          icon="lucide:chevron-down"
          aria-hidden="true"
          style="width: 14px; height: 14px;"
        ></iconify-icon>
      </ui-button>
      <ui-menu-item value="music">音楽</ui-menu-item>
      <ui-menu-item value="notes">ノート</ui-menu-item>
      <ui-menu-item value="photos">写真</ui-menu-item>
    </ui-dropdown>
  </div>

  <ui-breadcrumbs
    slot="center"
    .items=${[
    { label: 'ホーム', href: '/' },
    { label: 'プロジェクト', href: '/projects' },
    { label: '設定' },
  ]}
  ></ui-breadcrumbs>

  <span slot="compact-center" style="font-size: 12px; color: var(--fg-muted); white-space: nowrap;">
    設定
  </span>

  <div slot="end" style="display: flex; align-items: center; gap: 8px;">
    <ui-search-trigger></ui-search-trigger>
    <ui-button variant="ghost" icon-only aria-label="テーマを変更">
      <iconify-icon icon="lucide:sun" aria-hidden="true"></iconify-icon>
    </ui-button>
  </div>
`;

const mobileSlotContent = html`
  <div slot="start">
    <ui-button variant="ghost" icon-only aria-label="メニューを開く">
      <iconify-icon icon="lucide:menu" aria-hidden="true"></iconify-icon>
    </ui-button>
  </div>

  <span slot="compact-center" style="font-size: 12px; color: var(--fg-muted); white-space: nowrap;">
    Notes
  </span>

  <div slot="end">
    <ui-button variant="ghost" icon-only aria-label="テーマを変更">
      <iconify-icon icon="lucide:sun" aria-hidden="true"></iconify-icon>
    </ui-button>
  </div>
`;

const meta: Meta<UiHeader> = {
  title: 'Components/Header',
  component: 'ui-header',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
アプリケーションシェル上端のヘッダーコンポーネントです。

- \`display: contents\` で app-shell の Grid に透過的に参加
- 4 スロット構成（\`start\` / \`center\` / \`compact-center\` / \`end\`）
- \`sidebarExpanded\` は sidebar 状態そのものではなく start ゾーンの予約幅入力
- 狭幅では \`center\` を隠し、\`compact-center\` を代替文脈表示面として使える
- \`ui-header-sidebar-toggle\` は反映済み状態の局所通知
        `,
      },
    },
    layout: 'fullscreen',
  },
  argTypes: {
    sidebarExpanded: {
      control: 'boolean',
      description: 'start ゾーンの予約幅を切り替える layout 入力',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiHeader>;

export const DefaultExpanded: Story = {
  render: () => html`
    <div style="height: 200vh;">
      <ui-header id="header-default" sidebar-expanded> ${fullSlotContent} </ui-header>
      <main style="padding: 2rem;">
        <p>スクロールコンテンツ（sticky 検証用）</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-default');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が Shadow DOM 内に見つかりません');

    const zoneStart = getZone(host, '.zone-start');
    const zoneCenter = getZone(host, '.zone-center');
    const zoneCompactCenter = getZone(host, '.zone-compact-center');
    const zoneEnd = getZone(host, '.zone-end');

    assert(!!zoneStart, '.zone-start が見つかりません');
    assert(!!zoneCenter, '.zone-center が見つかりません');
    assert(!!zoneCompactCenter, '.zone-compact-center が見つかりません');
    assert(!!zoneEnd, '.zone-end が見つかりません');

    assert(!!getSlot(host, 'start'), 'start スロットが見つかりません');
    assert(!!getSlot(host, 'center'), 'center スロットが見つかりません');
    assert(!!getSlot(host, 'compact-center'), 'compact-center スロットが見つかりません');
    assert(!!getSlot(host, 'end'), 'end スロットが見つかりません');

    assert(host.sidebarExpanded, 'sidebarExpanded の既定値が true ではありません');
    assert(
      host.hasAttribute('sidebar-expanded'),
      'sidebar-expanded 属性がホストに反映されていません',
    );

    const partsInShadow = host.shadowRoot?.querySelectorAll('[part]');
    assert(partsInShadow?.length === 0, 'Shadow DOM 内に part 属性が存在します');

    const headerStyles = getComputedStyle(header);
    assert(
      headerStyles.position === 'sticky',
      `header に position: sticky が適用されていません（実際: ${headerStyles.position}）`,
    );

    const inner = host.shadowRoot?.querySelector('.inner');
    assert(!!inner, '.inner コンテナが見つかりません');

    if (!isMobileViewport()) {
      assert(getComputedStyle(zoneCenter).display !== 'none', '通常幅で center が非表示です');
      assert(
        getComputedStyle(zoneCompactCenter).display === 'none',
        '通常幅で compact-center が表示されています',
      );
    }
  },
};

export const ZenModeCollapsed: Story = {
  render: () => html`
    <ui-header id="header-zen" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-zen');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const zoneStart = getZone(host, '.zone-start');
    const expandedWidth = getComputedStyle(zoneStart).inlineSize;

    host.sidebarExpanded = false;
    await flush(host);

    assert(
      !host.hasAttribute('sidebar-expanded'),
      'sidebarExpanded=false のとき sidebar-expanded 属性が残存しています',
    );
    assert(!host.sidebarExpanded, 'sidebarExpanded プロパティが false に更新されていません');

    const collapsedWidth = getComputedStyle(zoneStart).inlineSize;
    assert(
      collapsedWidth !== expandedWidth,
      'Zen Mode と Expanded で .zone-start の幅が変化していません',
    );
  },
};

export const SidebarToggleEvent: Story = {
  render: () => html`
    <ui-header id="header-event" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-event');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const collapsePromise = waitForEvent<CustomEvent<UiHeaderSidebarToggleDetail>>(
      host,
      'ui-header-sidebar-toggle',
    );
    host.sidebarExpanded = false;
    const collapseEvent = await collapsePromise;
    await flush(host);

    assert(
      !collapseEvent.detail.expanded,
      'collapse イベントの detail.expanded が false ではありません',
    );
    assert(!collapseEvent.bubbles, 'ui-header-sidebar-toggle がバブリングしています');
    assert(!collapseEvent.composed, 'ui-header-sidebar-toggle が composed=true になっています');

    const expandPromise = waitForEvent<CustomEvent<UiHeaderSidebarToggleDetail>>(
      host,
      'ui-header-sidebar-toggle',
    );
    host.sidebarExpanded = true;
    const expandEvent = await expandPromise;
    await flush(host);

    assert(expandEvent.detail.expanded, 'expand イベントの detail.expanded が true ではありません');
  },
};

export const ResponsiveVisualComparison: Story = {
  render: () => html`
    <div style="display: grid; gap: 2rem; padding: 1rem;">
      <p style="font-size: 0.875rem; color: var(--fg-muted);">
        実際のレスポンシブ切替はブラウザのビューポート幅に従います。以下は利用構成の比較用です。
      </p>

      <div
        style="width: 375px; border: 1px solid var(--border-default); border-radius: 8px; overflow: hidden;"
      >
        <p style="font-size: 11px; padding: 4px 8px; background: var(--bg-fill-muted); margin: 0;">
          375px 構成例
        </p>
        <ui-header> ${mobileSlotContent} </ui-header>
      </div>

      <div
        style="width: 768px; border: 1px solid var(--border-default); border-radius: 8px; overflow: hidden;"
      >
        <p style="font-size: 11px; padding: 4px 8px; background: var(--bg-fill-muted); margin: 0;">
          768px 構成例
        </p>
        <ui-header> ${fullSlotContent} </ui-header>
      </div>

      <div
        style="width: 100%; border: 1px solid var(--border-default); border-radius: 8px; overflow: hidden;"
      >
        <p style="font-size: 11px; padding: 4px 8px; background: var(--bg-fill-muted); margin: 0;">
          Desktop 構成例
        </p>
        <ui-header sidebar-expanded> ${fullSlotContent} </ui-header>
      </div>
    </div>
  `,
};

export const EmptySlots: Story = {
  render: () => html`
    <ui-header id="header-empty" sidebar-expanded>
      <div slot="start">
        <button
          aria-label="サイドバーを閉じる"
          style="all: unset; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: pointer;"
        >
          <iconify-icon icon="lucide:panel-left" aria-hidden="true"></iconify-icon>
        </button>
      </div>
      <div slot="end">
        <button
          aria-haspopup="dialog"
          aria-label="検索"
          style="all: unset; display: inline-flex; width: 32px; height: 32px; cursor: pointer; align-items: center; justify-content: center;"
        >
          <iconify-icon icon="lucide:search" aria-hidden="true"></iconify-icon>
        </button>
      </div>
    </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-empty');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が存在しません');

    const zones = host.shadowRoot?.querySelectorAll(
      '.zone-start, .zone-center, .zone-compact-center, .zone-end',
    );
    assert(zones?.length === 4, '4 つの zone コンテナが描画されていません');

    const centerAssigned = getSlot(host, 'center').assignedElements({ flatten: true });
    const compactAssigned = getSlot(host, 'compact-center').assignedElements({ flatten: true });
    assert(centerAssigned.length === 0, 'center スロットに要素が配置されています');
    assert(compactAssigned.length === 0, 'compact-center スロットに要素が配置されています');
  },
};

export const AttributeDrivenToggle: Story = {
  render: () => html`
    <ui-header id="header-attr" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-attr');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    assert(host.hasAttribute('sidebar-expanded'), '初期状態で sidebar-expanded 属性がありません');
    assert(host.sidebarExpanded, '初期状態で sidebarExpanded が true ではありません');

    const collapsePromise = waitForEvent<CustomEvent<UiHeaderSidebarToggleDetail>>(
      host,
      'ui-header-sidebar-toggle',
    );
    host.removeAttribute('sidebar-expanded');
    await flush(host);
    const collapseEvent = await collapsePromise;

    assert(!host.sidebarExpanded, '属性除去後に sidebarExpanded が false になっていません');
    assert(!collapseEvent.detail.expanded, '属性除去時のイベント detail が不正です');

    const expandPromise = waitForEvent<CustomEvent<UiHeaderSidebarToggleDetail>>(
      host,
      'ui-header-sidebar-toggle',
    );
    host.sidebarExpanded = true;
    await flush(host);
    await expandPromise;

    assert(host.hasAttribute('sidebar-expanded'), 'プロパティ設定後に属性が反映されていません');
  },
};

export const RapidToggleReentrancy: Story = {
  render: () => html`
    <ui-header id="header-rapid" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-rapid');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    let eventCount = 0;
    const listener = (): void => {
      eventCount += 1;
    };
    host.addEventListener('ui-header-sidebar-toggle', listener);

    await ensureNoEvent(host, 'ui-header-sidebar-toggle', () => {
      host.sidebarExpanded = true;
    });
    assert(eventCount === 0, '同一値設定でイベントが発火しました');

    host.sidebarExpanded = false;
    await flush(host);
    host.sidebarExpanded = true;
    await flush(host);
    host.sidebarExpanded = false;
    await flush(host);

    assert(eventCount as number === 3, `高速トグルで ${String(eventCount)} 回発火しました（期待: 3 回）`);

    host.removeEventListener('ui-header-sidebar-toggle', listener);
  },
};

export const DynamicSlotContent: Story = {
  render: () => html`
    <ui-header id="header-dynamic" sidebar-expanded>
      <div slot="center" id="dynamic-center">初期コンテンツ</div>
      <span slot="compact-center" id="dynamic-compact">初期コンパクト</span>
    </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-dynamic');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const centerSlot = getSlot(host, 'center');
    const compactSlot = getSlot(host, 'compact-center');

    let centerAssigned = centerSlot.assignedElements({ flatten: true });
    let compactAssigned = compactSlot.assignedElements({ flatten: true });
    assert(centerAssigned.length === 1, '初期状態で center スロットに 1 要素が配置されていません');
    assert(
      compactAssigned.length === 1,
      '初期状態で compact-center スロットに 1 要素が配置されていません',
    );

    host.querySelector('#dynamic-center')?.remove();
    host.querySelector('#dynamic-compact')?.remove();

    const newCenter = document.createElement('span');
    newCenter.setAttribute('slot', 'center');
    newCenter.textContent = '差し替え後コンテンツ';
    host.appendChild(newCenter);

    const newCompact = document.createElement('span');
    newCompact.setAttribute('slot', 'compact-center');
    newCompact.textContent = '差し替え後コンパクト';
    host.appendChild(newCompact);

    await flush(host);

    centerAssigned = centerSlot.assignedElements({ flatten: true });
    compactAssigned = compactSlot.assignedElements({ flatten: true });

    assert(centerAssigned.length === 1, '差し替え後に center スロットの割り当てが崩れています');
    assert(
      compactAssigned.length === 1,
      '差し替え後に compact-center スロットの割り当てが崩れています',
    );
    assert(
      centerAssigned[0]?.textContent === '差し替え後コンテンツ',
      'center の差し替え内容が不正です',
    );
    assert(
      compactAssigned[0]?.textContent === '差し替え後コンパクト',
      'compact-center の差し替え内容が不正です',
    );
  },
};

export const CompactCenterResponsiveReplacement: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => html`
    <ui-header id="header-compact-replacement" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-compact-replacement');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    if (!isMobileViewport()) {
      console.warn('Mobile viewport is not active; CompactCenterResponsiveReplacement was skipped');
      return;
    }

    const centerZone = getZone(host, '.zone-center');
    const compactZone = getZone(host, '.zone-compact-center');

    assert(
      getComputedStyle(centerZone).display === 'none',
      '狭幅で center が非表示になっていません',
    );
    assert(
      getComputedStyle(compactZone).display !== 'none',
      '狭幅で compact-center が表示されていません',
    );

    assert(
      getSlot(host, 'compact-center').assignedElements({ flatten: true }).length === 1,
      'compact-center に代替文脈表示が配置されていません',
    );
  },
};

export const CompactCenterNotSimultaneous: Story = {
  render: () => html`
    <ui-header id="header-not-simultaneous" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-not-simultaneous');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const centerVisible = getComputedStyle(getZone(host, '.zone-center')).display !== 'none';
    const compactVisible =
      getComputedStyle(getZone(host, '.zone-compact-center')).display !== 'none';

    assert(!(centerVisible && compactVisible), 'center と compact-center が同時に表示されています');
  },
};

export const CompactCenterEmptyFallback: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => html`
    <ui-header id="header-compact-empty" sidebar-expanded>
      <div slot="start">
        <ui-button variant="ghost" icon-only aria-label="メニューを開く">
          <iconify-icon icon="lucide:menu" aria-hidden="true"></iconify-icon>
        </ui-button>
      </div>
      <span slot="center">通常幅用の文脈</span>
      <div slot="end">
        <ui-button variant="ghost" icon-only aria-label="検索">
          <iconify-icon icon="lucide:search" aria-hidden="true"></iconify-icon>
        </ui-button>
      </div>
    </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-compact-empty');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    if (!isMobileViewport()) {
      console.warn('Mobile viewport is not active; CompactCenterEmptyFallback was skipped');
      return;
    }

    assert(
      getComputedStyle(getZone(host, '.zone-center')).display === 'none',
      '狭幅で center が非表示になっていません',
    );
    assert(
      getSlot(host, 'compact-center').assignedElements({ flatten: true }).length === 0,
      'compact-center が空ではありません',
    );
    assert(
      getZone(host, '.zone-compact-center').textContent.trim() === '',
      'compact-center が空のはずなのに表示内容が残っています',
    );
  },
};

export const CompactCenterAccessibilityContract: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => html`
    <ui-header id="header-compact-a11y" sidebar-expanded>
      <div slot="start">
        <ui-button variant="ghost" icon-only aria-label="戻る">
          <iconify-icon icon="lucide:arrow-left" aria-hidden="true"></iconify-icon>
        </ui-button>
      </div>
      <button
        slot="compact-center"
        type="button"
        aria-label="現在地を確認"
        style="all: unset; display: inline-flex; align-items: center; cursor: pointer; color: var(--fg-muted);"
      >
        Inbox
      </button>
      <div slot="end">
        <ui-button variant="ghost" icon-only aria-label="メニュー">
          <iconify-icon icon="lucide:ellipsis" aria-hidden="true"></iconify-icon>
        </ui-button>
      </div>
    </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-compact-a11y');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が見つかりません');
    assert(
      host.tabIndex === -1 || !host.hasAttribute('tabindex'),
      'ui-header 自体がフォーカス対象です',
    );

    const compactAssigned = getSlot(host, 'compact-center').assignedElements({ flatten: true });
    assert(compactAssigned.length === 1, 'compact-center に要素が配置されていません');

    const compactRoot = compactAssigned[0];
    assert(
      compactRoot instanceof HTMLButtonElement,
      'compact-center の直下要素が button ではありません',
    );
    assert(
      compactRoot.getAttribute('aria-label') === '現在地を確認',
      'compact-center のアクセシブル名が不足しています',
    );

    if (!isMobileViewport()) {
      console.warn(
        'Mobile viewport is not active; CompactCenterAccessibilityContract visibility checks were skipped',
      );
      return;
    }

    assert(
      getComputedStyle(getZone(host, '.zone-compact-center')).display !== 'none',
      '狭幅で compact-center が表示されていません',
    );

    let clickCount = 0;
    compactRoot.addEventListener('click', () => {
      clickCount += 1;
    });
    compactRoot.click();
    assert(clickCount === 1, 'compact-center の direct-slotted root が操作可能ではありません');
  },
};

export const CompactCenterDynamicSlotContent: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => html`
    <ui-header id="header-compact-dynamic" sidebar-expanded>
      <span slot="center">通常幅コンテキスト</span>
      <span slot="compact-center" id="compact-dynamic">初期コンパクト</span>
    </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-compact-dynamic');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    if (!isMobileViewport()) {
      console.warn('Mobile viewport is not active; CompactCenterDynamicSlotContent was skipped');
      return;
    }

    const compactSlot = getSlot(host, 'compact-center');
    let assigned = compactSlot.assignedElements({ flatten: true });
    assert(assigned.length === 1, '初期状態で compact-center に要素が配置されていません');

    host.querySelector('#compact-dynamic')?.remove();

    const nextCompact = document.createElement('button');
    nextCompact.type = 'button';
    nextCompact.setAttribute('slot', 'compact-center');
    nextCompact.textContent = '差し替え後コンパクト';
    host.appendChild(nextCompact);

    await flush(host);

    assigned = compactSlot.assignedElements({ flatten: true });
    assert(assigned.length === 1, '差し替え後に compact-center の割り当てが崩れています');
    assert(
      assigned[0]?.textContent === '差し替え後コンパクト',
      '差し替え後の compact-center 内容が不正です',
    );
    assert(
      getComputedStyle(getZone(host, '.zone-compact-center')).display !== 'none',
      '狭幅で差し替え後の compact-center が表示されていません',
    );
  },
};

export const ForcedColorsMode: Story = {
  render: () => html`
    <div
      style="padding: 1rem; background: var(--bg-surface-2); border-radius: var(--radius-md);
      font-size: var(--text-sm); margin-bottom: 1.5rem; border: 1px solid var(--border-default);"
    >
      Chrome DevTools → Rendering →
      <code>forced-colors: active</code> を有効にして確認してください。
    </div>

    <ui-header id="header-forced" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-forced');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が存在しません');

    const headerStyles = getComputedStyle(header);
    assert(
      headerStyles.borderBottomStyle === 'solid',
      'header に border-bottom: solid が適用されていません',
    );
  },
};

export const ReducedMotion: Story = {
  render: () => html`
    <div
      style="padding: 1rem; background: var(--bg-surface-2); border-radius: var(--radius-md);
      font-size: var(--text-sm); margin-bottom: 1.5rem; border: 1px solid var(--border-default);"
    >
      OS の「視覚効果を減らす」設定を有効にした状態で動作を確認してください。
    </div>

    <ui-header id="header-reduced-motion" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-reduced-motion');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が存在しません');
  },
};

export const PrintStyles: Story = {
  render: () => html`
    <div>
      <ui-header id="header-print" sidebar-expanded> ${fullSlotContent} </ui-header>
      <main style="padding: 2rem;">
        <h1 style="font-size: 1.5rem; margin: 0 0 1rem;">印刷テスト</h1>
        <p>
          ブラウザの印刷プレビュー（Cmd+P /
          Ctrl+P）を使用して、ヘッダーが非表示になることを確認してください。
        </p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-print');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が存在しません');
    const headerStyles = getComputedStyle(header);
    assert(headerStyles.display !== 'none', '通常表示で header が非表示になっています');
  },
};

export const DarkModeGlassmorphism: Story = {
  render: () => html`
    <div
      style="color-scheme: dark; background: oklch(12% 0.02 250); color: oklch(90% 0.01 250);
      height: 400px; overflow-y: auto; position: relative;"
    >
      <ui-header id="header-dark" sidebar-expanded> ${fullSlotContent} </ui-header>
      <main style="padding: 2rem;">
        ${Array.from(
    { length: 20 },
    (_, i) => html`
            <p
              style="margin-bottom: 1rem; padding: 1rem; border-radius: 6px; background: oklch(17% 0.02 250);"
            >
              ダークモード背景コンテンツ #${i + 1}: スクロールするとヘッダーの Glassmorphism
              効果が確認できます。
              <span style="color: oklch(65% 0.15 250);">カラーテキスト</span>も透過で確認。
            </p>
          `,
  )}
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-dark');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'dark mode ストーリーで header が存在しません');
  },
};

export const CustomBackdropSaturate: Story = {
  render: () => html`
    <style>
      .high-saturation {
        --ui-header-backdrop-saturate: 0.75;
      }

      .low-saturation {
        --ui-header-backdrop-saturate: 0.25;
      }
    </style>

    <div style="display: grid; gap: 2rem; padding: 1rem;">
      <div>
        <p
          style="font-size: 11px; color: var(--fg-muted); margin-bottom: 4px; font-family: var(--font-mono);"
        >
          デフォルト (--ui-header-backdrop-saturate: 0.5)
        </p>
        <ui-header id="header-saturate-default" sidebar-expanded> ${fullSlotContent} </ui-header>
      </div>

      <div>
        <p
          style="font-size: 11px; color: var(--fg-muted); margin-bottom: 4px; font-family: var(--font-mono);"
        >
          高彩度 (--ui-header-backdrop-saturate: 0.75)
        </p>
        <ui-header id="header-saturate-high" class="high-saturation" sidebar-expanded>
          ${fullSlotContent}
        </ui-header>
      </div>

      <div>
        <p
          style="font-size: 11px; color: var(--fg-muted); margin-bottom: 4px; font-family: var(--font-mono);"
        >
          低彩度 (--ui-header-backdrop-saturate: 0.25)
        </p>
        <ui-header id="header-saturate-low" class="low-saturation" sidebar-expanded>
          ${fullSlotContent}
        </ui-header>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const hostDefault = canvasElement.querySelector<UiHeader>('#header-saturate-default');
    const hostHigh = canvasElement.querySelector<UiHeader>('#header-saturate-high');
    const hostLow = canvasElement.querySelector<UiHeader>('#header-saturate-low');
    assert(!!hostDefault, 'デフォルト saturate ヘッダーが見つかりません');
    assert(!!hostHigh, '高彩度ヘッダーが見つかりません');
    assert(!!hostLow, '低彩度ヘッダーが見つかりません');

    await Promise.all([flush(hostDefault), flush(hostHigh), flush(hostLow)]);

    assert(
      !!hostDefault.shadowRoot?.querySelector('header'),
      'デフォルト saturate ヘッダーの header 要素がありません',
    );
    assert(
      !!hostHigh.shadowRoot?.querySelector('header'),
      '高彩度ヘッダーの header 要素がありません',
    );
    assert(
      !!hostLow.shadowRoot?.querySelector('header'),
      '低彩度ヘッダーの header 要素がありません',
    );

    const highValue = getComputedStyle(hostHigh)
      .getPropertyValue('--ui-header-backdrop-saturate')
      .trim();
    const lowValue = getComputedStyle(hostLow)
      .getPropertyValue('--ui-header-backdrop-saturate')
      .trim();

    assert(
      highValue === '0.75',
      `高彩度の --ui-header-backdrop-saturate が ${highValue} です（期待: 0.75）`,
    );
    assert(
      lowValue === '0.25',
      `低彩度の --ui-header-backdrop-saturate が ${lowValue} です（期待: 0.25）`,
    );
  },
};
