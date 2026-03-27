import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sidebar-shell';
import { type UiSidebarShell, type UiSidebarStateChangeDetail } from './sidebar-shell';

/* ===================================================================
 * テストユーティリティ
 * =================================================================== */

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

const flush = async (host: UiSidebarShell): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

/* ===================================================================
 * DOM クエリヘルパー
 * =================================================================== */

const getHost = (canvasElement: Element, id: string): UiSidebarShell => {
  const host = canvasElement.querySelector<UiSidebarShell>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getNav = (host: UiSidebarShell): HTMLElement => {
  const nav = host.shadowRoot?.querySelector<HTMLElement>('nav');
  if (!nav) throw new Error('nav 要素が見つかりません');
  return nav;
};

const getScrim = (host: UiSidebarShell): HTMLElement => {
  const scrim = host.shadowRoot?.querySelector<HTMLElement>('.scrim');
  if (!scrim) throw new Error('.scrim 要素が見つかりません');
  return scrim;
};

const getSidebarHeader = (host: UiSidebarShell): HTMLElement => {
  const header = host.shadowRoot?.querySelector<HTMLElement>('.sidebar-header');
  if (!header) throw new Error('.sidebar-header 要素が見つかりません');
  return header;
};

const getSidebarContent = (host: UiSidebarShell): HTMLElement => {
  const content = host.shadowRoot?.querySelector<HTMLElement>('.sidebar-content');
  if (!content) throw new Error('.sidebar-content 要素が見つかりません');
  return content;
};

const getActiveElementLabel = (): string => {
  const activeElement = document.activeElement;
  if (!activeElement) return 'none';
  if (activeElement instanceof HTMLElement && activeElement.id !== '') return activeElement.id;
  return activeElement.tagName;
};

/* ===================================================================
 * Meta
 * =================================================================== */

const meta: Meta<UiSidebarShell> = {
  title: 'Components/Sidebar',
  component: 'ui-sidebar-shell',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
アプリケーションの左翼を担うナビゲーションコンテナです。

- \`mode="fixed"\`: デスクトップで Grid Item として配置。Zen Mode（格納時）は Grid Track \`0px\` で完全消失。
- \`mode="overlay"\`: モバイル/タブレットで \`position: fixed\` の前景補助面。スクリム付き。
- \`data-state\`: \`expanded\` / \`collapsed\` で開閉状態を管理。
- \`ui-sidebar-state-change\` イベント: \`{ state, mode }\` を含み、バブリングしない。
- \`inert\` 属性戦略によるフォーカス管理。Overlay 展開時は先頭要素へフォーカス移動。
- 開閉の視覚遷移は 150ms 前後の短いフェードで、reduced motion では即時反映します。
        `,
      },
    },
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<UiSidebarShell>;

/* ===================================================================
 * A. 意味のある組み合わせ（Variant × State）
 * =================================================================== */

/**
 * Fixed × Expanded — DOM 構造・ARIA・スロット・属性の包括検証
 */
export const FixedExpanded: Story = {
  render: () => html`
    <div
      style="display: grid; grid-template-columns: var(--sidebar-width, 240px) 1fr; min-height: 400px;"
    >
      <ui-sidebar-shell id="sidebar-fixed-expanded" data-state="expanded" mode="fixed">
        <button
          slot="header"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-label="現在のジャンルを変更"
        >
          音楽
        </button>
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
          <a href="/music" role="treeitem" tabindex="-1" aria-selected="false">音楽</a>
          <a href="/photos" role="treeitem" tabindex="-1" aria-selected="false">写真</a>
        </div>
      </ui-sidebar-shell>
      <main style="padding: 2rem;">
        <p>メインコンテンツ</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-fixed-expanded');
    await flush(host);

    const nav = getNav(host);
    const scrim = getScrim(host);
    const sidebarHeader = getSidebarHeader(host);
    const sidebarContent = getSidebarContent(host);

    /* --- DOM 構造 --- */
    assert(nav.tagName === 'NAV', 'nav 要素が存在すること');
    assert(sidebarHeader, '.sidebar-header が存在すること');
    assert(sidebarContent, '.sidebar-content が存在すること');
    assert(scrim, '.scrim が存在すること');

    /* --- ARIA --- */
    assert(
      nav.getAttribute('aria-label') === 'メインナビゲーション',
      'nav の aria-label が日本語であること',
    );
    assert(scrim.getAttribute('aria-hidden') === 'true', 'scrim に aria-hidden="true" があること');

    /* --- part 属性不使用 --- */
    const allElements = host.shadowRoot?.querySelectorAll('[part]') ?? [];
    assert(allElements.length === 0, 'Shadow DOM 内に part 属性が存在しないこと');

    /* --- :host の display --- */
    const hostStyle = getComputedStyle(host);
    assert(hostStyle.display === 'block', ':host の display が block であること');

    /* --- data-state / mode 属性 --- */
    assert(host.getAttribute('data-state') === 'expanded', 'data-state="expanded" であること');
    assert(host.getAttribute('mode') === 'fixed', 'mode="fixed" であること');

    /* --- コンテンツの可視性 --- */
    const contentStyle = getComputedStyle(sidebarContent);
    assert(contentStyle.opacity === '1', '.sidebar-content の opacity が 1 であること');

    /* --- inert なし --- */
    assert(!nav.inert, 'expanded 時に nav は inert でないこと');

    /* --- Fixed モードでは header スロットエリアが非表示 --- */
    const headerStyle = getComputedStyle(sidebarHeader);
    assert(headerStyle.display === 'none', 'Fixed モードでは .sidebar-header が非表示であること');
  },
};

/**
 * Fixed × Collapsed — Zen Mode（Grid Track 0px での完全消失）
 */
export const FixedCollapsedZenMode: Story = {
  render: () => html`
    <div id="shell-zen" style="display: grid; grid-template-columns: 0px 1fr; min-height: 400px;">
      <ui-sidebar-shell id="sidebar-fixed-collapsed" data-state="collapsed" mode="fixed">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
          <a href="/music" role="treeitem" tabindex="-1" aria-selected="false">音楽</a>
        </div>
      </ui-sidebar-shell>
      <main style="padding: 2rem; text-align: center;">
        <p>Zen Mode — メインコンテンツが中央へセンタリング</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-fixed-collapsed');
    await flush(host);

    const nav = getNav(host);
    const sidebarContent = getSidebarContent(host);

    /* --- collapsed 状態 --- */
    assert(host.getAttribute('data-state') === 'collapsed', 'data-state="collapsed" であること');

    /* --- inert --- */
    assert(nav.inert, 'collapsed 時に nav は inert であること');

    /* --- visibility: hidden --- */
    assert(
      nav.style.visibility === 'hidden',
      'collapsed 時に nav の visibility が hidden であること',
    );

    /* --- overflow: hidden --- */
    const navStyle = getComputedStyle(nav);
    assert(navStyle.overflow === 'hidden', 'nav に overflow: hidden が設定されていること');

    /* --- コンテンツの opacity --- */
    const contentStyle = getComputedStyle(sidebarContent);
    assert(contentStyle.opacity === '0', '.sidebar-content の opacity が 0 であること');
  },
};

/**
 * Overlay × Expanded — position: fixed、z-index、スクリム表示、header スロット表示
 */
export const OverlayExpanded: Story = {
  render: () => html`
    <div style="min-height: 400px; position: relative;">
      <ui-sidebar-shell id="sidebar-overlay-expanded" data-state="expanded" mode="overlay">
        <button
          slot="header"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-label="現在のジャンルを変更"
        >
          音楽
        </button>
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
          <a href="/music" role="treeitem" tabindex="-1" aria-selected="false">音楽</a>
        </div>
      </ui-sidebar-shell>
      <main style="padding: 2rem;">
        <p>Overlay モード: スクリムの背後にコンテンツ</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-overlay-expanded');
    await flush(host);

    const nav = getNav(host);
    const scrim = getScrim(host);
    const sidebarHeader = getSidebarHeader(host);
    const navStyle = getComputedStyle(nav);
    const scrimStyle = getComputedStyle(scrim);

    /* --- mode / state --- */
    assert(host.getAttribute('mode') === 'overlay', 'mode="overlay" であること');
    assert(host.getAttribute('data-state') === 'expanded', 'data-state="expanded" であること');

    /* --- position: fixed --- */
    assert(navStyle.position === 'fixed', 'Overlay モードで nav は position: fixed であること');

    /* --- opacity --- */
    assert(navStyle.opacity === '1', 'expanded 時に nav の opacity が 1 であること');

    /* --- z-index --- */
    assert(
      navStyle.zIndex === '300',
      `nav の z-index が 300 であること (実際: ${navStyle.zIndex})`,
    );
    assert(
      scrimStyle.zIndex === '200',
      `scrim の z-index が 200 であること (実際: ${scrimStyle.zIndex})`,
    );

    /* --- スクリム表示 --- */
    assert(scrimStyle.opacity === '1', 'expanded 時にスクリムの opacity が 1 であること');
    assert(
      scrimStyle.pointerEvents === 'auto',
      'expanded 時にスクリムの pointer-events が auto であること',
    );

    /* --- header スロット表示（overlay では表示） --- */
    const headerStyle = getComputedStyle(sidebarHeader);
    assert(headerStyle.display !== 'none', 'Overlay モードでは .sidebar-header が表示されること');

    /* --- inert なし --- */
    assert(!nav.inert, 'expanded 時に nav は inert でないこと');
  },
};

/**
 * Overlay × Collapsed — 非表示、スクリム非表示、inert
 */
export const OverlayCollapsed: Story = {
  render: () => html`
    <div style="min-height: 400px; position: relative;">
      <ui-sidebar-shell id="sidebar-overlay-collapsed" data-state="collapsed" mode="overlay">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
        </div>
      </ui-sidebar-shell>
      <main style="padding: 2rem;">
        <p>Overlay Collapsed: サイドバーは非表示</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-overlay-collapsed');
    await flush(host);

    const nav = getNav(host);
    const scrim = getScrim(host);
    const navStyle = getComputedStyle(nav);
    const scrimStyle = getComputedStyle(scrim);

    /* --- opacity --- */
    assert(navStyle.opacity === '0', 'collapsed 時に nav の opacity が 0 であること');

    /* --- スクリム非表示 --- */
    assert(scrimStyle.opacity === '0', 'collapsed 時にスクリムの opacity が 0 であること');
    assert(
      scrimStyle.pointerEvents === 'none',
      'collapsed 時にスクリムの pointer-events が none であること',
    );

    /* --- inert --- */
    assert(nav.inert, 'collapsed 時に nav は inert であること');

    /* --- visibility: hidden --- */
    assert(
      nav.style.visibility === 'hidden',
      'collapsed 時に nav の visibility が hidden であること',
    );
  },
};

/* ===================================================================
 * B. 振る舞い / インタラクション
 * =================================================================== */

/**
 * Fixed モードでのトグル状態遷移
 * - inert タイミング（collapse=即座、expand=先行解除）
 * - イベント発火
 * - Fixed ではフォーカス移動なし
 */
export const FixedToggleStateTransition: Story = {
  render: () => html`
    <div
      style="display: grid; grid-template-columns: var(--sidebar-width, 240px) 1fr; min-height: 400px;"
    >
      <ui-sidebar-shell id="sidebar-fixed-toggle" data-state="expanded" mode="fixed">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
        </div>
      </ui-sidebar-shell>
      <main style="padding: 2rem;">
        <button id="toggle-trigger" type="button">サイドバー切替</button>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-fixed-toggle');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#toggle-trigger');
    assert(!!trigger, '#toggle-trigger が見つかりません');
    await flush(host);

    const nav = getNav(host);

    /* --- トリガーにフォーカス --- */
    trigger.focus();
    assert(document.activeElement === trigger, 'トリガーにフォーカスが当たっていること');

    /* --- Collapse --- */
    const collapseEventPromise = waitForEvent<CustomEvent<UiSidebarStateChangeDetail>>(
      host,
      'ui-sidebar-state-change',
    );
    host.collapse();
    const collapseEvent = await collapseEventPromise;
    await flush(host);

    assert(host.state === 'collapsed', 'collapse() 後に state が collapsed であること');
    assert(nav.inert, 'collapse 後に nav が inert であること');
    assert(
      nav.style.visibility === 'hidden',
      'collapse アニメーション完了後に visibility: hidden であること',
    );
    assert(
      collapseEvent.detail.state === 'collapsed',
      'イベント detail.state が collapsed であること',
    );
    assert(collapseEvent.detail.mode === 'fixed', 'イベント detail.mode が fixed であること');

    /* --- Fixed モードではフォーカスが移動しない --- */
    assert(
      document.activeElement === trigger,
      'Fixed モードでは collapse 後もフォーカスがトリガーに留まること',
    );

    /* --- Expand --- */
    const expandEventPromise = waitForEvent<CustomEvent<UiSidebarStateChangeDetail>>(
      host,
      'ui-sidebar-state-change',
    );
    host.expand();
    const expandEvent = await expandEventPromise;
    await flush(host);

    assert((host.state as string) === 'expanded', 'expand() 後に state が expanded であること');
    assert(!nav.inert, 'expand 後に nav が inert でないこと');
    assert(
      (nav.style.visibility as string) === 'visible',
      'expand 後に visibility: visible であること',
    );
    assert(expandEvent.detail.state === 'expanded', 'イベント detail.state が expanded であること');

    /* --- Fixed モードではフォーカスが移動しない --- */
    assert(
      document.activeElement === trigger,
      'Fixed モードでは expand 後もフォーカスがトリガーに留まること',
    );
  },
};

/**
 * Overlay モードでの展開・格納時のフォーカス管理
 * - expand → 先頭フォーカス可能要素へ移動
 * - collapse → トリガーへ返却
 */
export const OverlayOpenCloseFocusManagement: Story = {
  render: () => html`
    <div style="min-height: 400px; position: relative;">
      <button id="overlay-trigger" type="button">サイドバーを開く</button>

      <ui-sidebar-shell id="sidebar-overlay-focus" data-state="collapsed" mode="overlay">
        <button
          slot="header"
          id="header-button"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-label="現在のジャンルを変更"
        >
          音楽
        </button>
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" id="first-link" aria-selected="true"
            >ノート</a
          >
          <a href="/music" role="treeitem" tabindex="-1" aria-selected="false">音楽</a>
        </div>
      </ui-sidebar-shell>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-overlay-focus');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#overlay-trigger');
    const headerButton = canvasElement.querySelector<HTMLButtonElement>('#header-button');
    assert(!!trigger, '#overlay-trigger が見つかりません');
    assert(!!headerButton, '#header-button が見つかりません');
    await flush(host);

    /* --- 初期状態: collapsed --- */
    assert(host.state === 'collapsed', '初期状態が collapsed であること');

    /* --- Expand --- */
    trigger.focus();
    const expandPromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.expand(trigger);
    await expandPromise;
    await flush(host);
    /* フォーカス移動のための rAF 待機 */
    await waitFrame();
    await waitFrame();

    assert((host.state as string) === 'expanded', 'expand() 後に state が expanded であること');

    /* header スロットの先頭フォーカス可能要素にフォーカスが移動 */
    assert(
      document.activeElement === headerButton,
      `Overlay 展開後に header スロットの先頭要素へフォーカスが移動すること (実際: ${getActiveElementLabel()})`,
    );

    /* --- Collapse --- */
    const collapsePromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.collapse();
    await collapsePromise;
    await flush(host);

    assert(
      host.getAttribute('data-state') === 'collapsed',
      'collapse() 後に data-state が collapsed であること',
    );

    /* トリガーへフォーカス返却 */
    assert(
      document.activeElement === trigger,
      `Overlay 格納後にトリガーへフォーカスが返却されること (実際: ${getActiveElementLabel()})`,
    );
  },
};

/**
 * Overlay モードでスクリムクリックによる格納
 */
export const OverlayScrimClickClose: Story = {
  render: () => html`
    <div style="min-height: 400px; position: relative;">
      <button id="scrim-trigger" type="button">サイドバーを開く</button>

      <ui-sidebar-shell id="sidebar-scrim-close" data-state="collapsed" mode="overlay">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
        </div>
      </ui-sidebar-shell>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-scrim-close');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#scrim-trigger');
    assert(!!trigger, '#scrim-trigger が見つかりません');
    await flush(host);

    /* --- 展開 --- */
    trigger.focus();
    const expandPromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.expand(trigger);
    await expandPromise;
    await flush(host);

    const scrim = getScrim(host);
    const scrimStyle = getComputedStyle(scrim);
    assert(scrimStyle.pointerEvents === 'auto', 'expanded 時にスクリムがクリック可能であること');

    /* --- スクリムクリック --- */
    const collapsePromise = waitForEvent(host, 'ui-sidebar-state-change');
    scrim.click();
    await collapsePromise;
    await flush(host);

    assert(host.state === 'collapsed', 'スクリムクリック後に state が collapsed であること');

    /* フォーカス返却 */
    assert(
      document.activeElement === trigger,
      'スクリムクリック後にトリガーへフォーカスが返却されること',
    );
  },
};

/**
 * Overlay モードで Esc キーによる格納
 * - Overlay では Esc で閉じる
 * - Fixed では Esc で閉じない
 */
export const OverlayEscapeKeyClose: Story = {
  render: () => html`
    <div style="min-height: 400px; position: relative;">
      <button id="esc-trigger" type="button">サイドバーを開く</button>

      <ui-sidebar-shell id="sidebar-esc-overlay" data-state="collapsed" mode="overlay">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" id="esc-first-link" aria-selected="true"
            >ノート</a
          >
        </div>
      </ui-sidebar-shell>

      <ui-sidebar-shell id="sidebar-esc-fixed" data-state="expanded" mode="fixed">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
        </div>
      </ui-sidebar-shell>
    </div>
  `,
  play: async ({ canvasElement }) => {
    /* --- Overlay: Esc で閉じる --- */
    const overlayHost = getHost(canvasElement, 'sidebar-esc-overlay');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#esc-trigger');
    assert(!!trigger, '#esc-trigger が見つかりません');
    await flush(overlayHost);

    trigger.focus();
    const expandPromise = waitForEvent(overlayHost, 'ui-sidebar-state-change');
    overlayHost.expand(trigger);
    await expandPromise;
    await flush(overlayHost);

    assert(overlayHost.state === 'expanded', 'Overlay が展開されていること');

    /* Esc キーを nav 上で発火 */
    const overlayNav = getNav(overlayHost);
    const collapsePromise = waitForEvent(overlayHost, 'ui-sidebar-state-change');
    overlayNav.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    await collapsePromise;
    await flush(overlayHost);

    assert((overlayHost.state as string) === 'collapsed', 'Esc キーで Overlay が格納されること');
    assert(document.activeElement === trigger, 'Esc 格納後にトリガーへフォーカスが返却されること');

    /* --- Fixed: Esc では閉じない --- */
    const fixedHost = getHost(canvasElement, 'sidebar-esc-fixed');
    await flush(fixedHost);

    const fixedNav = getNav(fixedHost);
    await ensureNoEvent(fixedHost, 'ui-sidebar-state-change', () => {
      fixedNav.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
      );
    });

    assert(fixedHost.state === 'expanded', 'Fixed モードでは Esc キーで状態が変わらないこと');
  },
};

/**
 * イベント detail の正確性とバブリング抑制
 */
export const EventDetailAndNoBubbling: Story = {
  render: () => html`
    <div id="event-parent" style="min-height: 200px;">
      <ui-sidebar-shell id="sidebar-event" data-state="expanded" mode="fixed">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" aria-selected="true">ノート</a>
        </div>
      </ui-sidebar-shell>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-event');
    const parent = canvasElement.querySelector<HTMLElement>('#event-parent');
    assert(!!parent, '#event-parent が見つかりません');
    await flush(host);

    /* --- 親要素にリスナーを設定（バブリング検証） --- */
    let parentReceived = false;
    const parentListener = (): void => {
      parentReceived = true;
    };
    parent.addEventListener('ui-sidebar-state-change', parentListener);

    /* --- Collapse --- */
    const eventPromise = waitForEvent<CustomEvent<UiSidebarStateChangeDetail>>(
      host,
      'ui-sidebar-state-change',
    );
    host.collapse();
    const event = await eventPromise;
    await flush(host);

    /* detail の正確性 */
    assert(event.detail.state === 'collapsed', 'event.detail.state が collapsed であること');
    assert(event.detail.mode === 'fixed', 'event.detail.mode が fixed であること');

    /* bubbles / composed */
    assert(!event.bubbles, 'event.bubbles が false であること');
    assert(!event.composed, 'event.composed が false であること');

    /* 親要素で受信しない */
    assert(!parentReceived, '親要素が ui-sidebar-state-change を受信しないこと');

    parent.removeEventListener('ui-sidebar-state-change', parentListener);
  },
};

/**
 * Overlay 展開中に Tab でサイドバー外へ移動可能（Focus Trap なし）
 */
export const NoFocusTrapInOverlay: Story = {
  render: () => html`
    <div style="min-height: 400px; position: relative;">
      <button id="trap-trigger" type="button">サイドバーを開く</button>
      <button id="outside-button" type="button">サイドバー外のボタン</button>

      <ui-sidebar-shell id="sidebar-no-trap" data-state="collapsed" mode="overlay">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" tabindex="0" id="trap-link" aria-selected="true"
            >ノート</a
          >
        </div>
      </ui-sidebar-shell>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-no-trap');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#trap-trigger');
    const outsideButton = canvasElement.querySelector<HTMLButtonElement>('#outside-button');
    assert(!!trigger, '#trap-trigger が見つかりません');
    assert(!!outsideButton, '#outside-button が見つかりません');
    await flush(host);

    /* --- 展開 --- */
    trigger.focus();
    const expandPromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.expand(trigger);
    await expandPromise;
    await flush(host);
    await waitFrame();
    await waitFrame();

    /* --- サイドバー外へ Tab 移動が可能であることを確認 --- */
    /*
     * Focus Trap がないことを検証するため、
     * サイドバー外のボタンにフォーカスを直接移動できることを確認する。
     * （実際の Tab キー動作はブラウザの Tab 順序に依存するため、
     *   focusable な外部要素が inert でないことで代替検証する。）
     */
    assert(!outsideButton.closest('[inert]'), 'サイドバー外の要素が inert でないこと');

    /* 外部ボタンにフォーカス移動可能 */
    outsideButton.focus();
    assert(
      document.activeElement === outsideButton,
      'Overlay 展開中にサイドバー外のボタンへフォーカスが移動可能であること（Focus Trap なし）',
    );
  },
};
