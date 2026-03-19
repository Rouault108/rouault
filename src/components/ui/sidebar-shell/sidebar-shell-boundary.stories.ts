import type { Meta, StoryObj } from '@storybook/web-components';
import { CSSResult, html } from 'lit';
import './sidebar-shell';
import { UiSidebarShell } from './sidebar-shell';

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

const getSidebarHeader = (host: UiSidebarShell): HTMLElement => {
  const header = host.shadowRoot?.querySelector<HTMLElement>('.sidebar-header');
  if (!header) throw new Error('.sidebar-header 要素が見つかりません');
  return header;
};

/** CSSStyleSheet の cssText を取得する */
const readCssText = (): string => {
  const styles = UiSidebarShell.styles;
  if (Array.isArray(styles)) {
    return styles.map((s) => (s as CSSResult).cssText).join('\n');
  }
  return (styles as { cssText: string }).cssText;
};

/* ===================================================================
 * LocalStorage テスト用キー（sidebar.ts と同一値）
 * =================================================================== */
const STORAGE_KEY = 'rouault.sidebar.state';

/* ===================================================================
 * Meta
 * =================================================================== */

const meta: Meta<UiSidebarShell> = {
  title: 'Components/Sidebar Shell/Boundary',
  component: 'ui-sidebar-shell',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '`<ui-sidebar>` の境界条件、再入安全性、永続化、メディアクエリ、契約テスト。',
      },
    },
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<UiSidebarShell>;

/* ===================================================================
 * C. 境界条件
 * =================================================================== */

/**
 * 高速トグルでイベントが重複しないこと、同値設定で発火しないこと
 */
export const RapidToggleReentrancySafety: Story = {
  render: () => html`
    <div style="min-height: 200px;">
      <ui-sidebar-shell id="sidebar-rapid" data-state="expanded" mode="fixed">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" aria-selected="false" tabindex="0">ノート</a>
        </div>
      </ui-sidebar-shell>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-rapid');
    await flush(host);

    let eventCount = 0;
    const listener = (): void => {
      eventCount += 1;
    };
    host.addEventListener('ui-sidebar-state-change', listener);

    /* --- 高速トグル: expanded → collapsed → expanded → collapsed --- */
    host.collapse();
    await waitForEvent(host, 'ui-sidebar-state-change');
    await flush(host);

    host.expand();
    await waitForEvent(host, 'ui-sidebar-state-change');
    await flush(host);

    host.collapse();
    await waitForEvent(host, 'ui-sidebar-state-change');
    await flush(host);

    assert(eventCount === 3, `イベント発火回数が 3 であること (実際: ${eventCount.toString()})`);
    assert(host.state === 'collapsed', '最終状態が collapsed であること');

    /* --- 同値設定ではイベント発火しない --- */
    await ensureNoEvent(host, 'ui-sidebar-state-change', () => {
      host.collapse(); /* 既に collapsed */
    });

    assert(
      (eventCount as number) === 3,
      `同値設定後もイベント回数が 3 のまま (実際: ${eventCount.toString()})`,
    );

    host.removeEventListener('ui-sidebar-state-change', listener);
  },
};

/**
 * setAttribute / プロパティの双方向同期
 */
export const AttributeDrivenStateChange: Story = {
  render: () => html`
    <div style="min-height: 200px;">
      <ui-sidebar-shell id="sidebar-attr" data-state="expanded" mode="fixed">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" aria-selected="false" tabindex="0">ノート</a>
        </div>
      </ui-sidebar-shell>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-attr');
    await flush(host);

    /* --- 属性 → プロパティ同期 --- */
    const collapsePromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.setAttribute('data-state', 'collapsed');
    await collapsePromise;
    await flush(host);

    assert(
      host.state === 'collapsed',
      'setAttribute("data-state", "collapsed") でプロパティも collapsed になること',
    );

    /* --- プロパティ → 属性同期 --- */
    const expandPromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.state = 'expanded';
    await expandPromise;
    await flush(host);

    assert(
      host.getAttribute('data-state') === 'expanded',
      'プロパティ変更で data-state 属性が expanded になること',
    );
  },
};

/**
 * LocalStorage への状態永続化
 */
export const LocalStoragePersistence: Story = {
  render: () => html`
    <div style="min-height: 200px;">
      <ui-sidebar-shell id="sidebar-storage" data-state="expanded" mode="fixed">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" aria-selected="false" tabindex="0">ノート</a>
        </div>
      </ui-sidebar-shell>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-storage');
    await flush(host);

    /* テスト前にクリーンアップ */
    localStorage.removeItem(STORAGE_KEY);

    /* --- Collapse → localStorage 確認 --- */
    const collapsePromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.collapse();
    await collapsePromise;
    await flush(host);

    assert(
      localStorage.getItem(STORAGE_KEY) === 'collapsed',
      'collapse 後に localStorage が "collapsed" であること',
    );

    /* --- Expand → localStorage 確認 --- */
    const expandPromise = waitForEvent(host, 'ui-sidebar-state-change');
    host.expand();
    await expandPromise;
    await flush(host);

    assert(
      localStorage.getItem(STORAGE_KEY) === 'expanded',
      'expand 後に localStorage が "expanded" であること',
    );

    /* テスト後にクリーンアップ */
    localStorage.removeItem(STORAGE_KEY);
  },
};

/**
 * matchMedia による初期 mode 自動判定
 *
 * NOTE: Storybook の play 関数ではビューポートリサイズが不可能なため、
 * 初期判定と属性反映のみを検証する。
 * ビューポートリサイズに追従する挙動の検証は E2E テストで行う。
 */
export const ModeAutoDetection: Story = {
  render: () => html`
    <div style="min-height: 200px;">
      <ui-sidebar-shell id="sidebar-auto-mode">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" aria-selected="false" tabindex="0">ノート</a>
        </div>
      </ui-sidebar-shell>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-auto-mode');
    await flush(host);

    const isXl = window.matchMedia('(min-width: 1280px)').matches;
    const expectedMode = isXl ? 'fixed' : 'overlay';

    /* --- mode プロパティが auto-detect されること --- */
    assert(
      host.mode === expectedMode,
      `mode が "${expectedMode}" であること (viewport: ${window.innerWidth.toString()}px, 実際: ${host.mode})`,
    );

    /* --- mode 属性が反映されること --- */
    assert(host.getAttribute('mode') === expectedMode, `mode 属性が "${expectedMode}" であること`);
  },
};

/**
 * header スロットの mode 依存可視性
 * - Fixed: 非表示（display: none）
 * - Overlay: 表示
 */
export const HeaderSlotVisibilityByMode: Story = {
  render: () => html`
    <div style="min-height: 300px;">
      <ui-sidebar-shell id="sidebar-header-vis" data-state="expanded" mode="fixed">
        <button
          slot="header"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-label="現在のジャンルを変更"
        >
          音楽
        </button>
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" aria-selected="false" tabindex="0">ノート</a>
        </div>
      </ui-sidebar-shell>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-header-vis');
    await flush(host);

    const sidebarHeader = getSidebarHeader(host);

    /* --- Fixed: header 非表示 --- */
    const fixedHeaderStyle = getComputedStyle(sidebarHeader);
    assert(
      fixedHeaderStyle.display === 'none',
      'mode="fixed" で .sidebar-header が非表示であること',
    );

    /* --- Overlay に切り替え --- */
    host.mode = 'overlay';
    await flush(host);

    const overlayHeaderStyle = getComputedStyle(sidebarHeader);
    assert(
      overlayHeaderStyle.display !== 'none',
      'mode="overlay" で .sidebar-header が表示されること',
    );

    /* --- header スロットの DOM 永続性 --- */
    const headerSlot = host.shadowRoot?.querySelector<HTMLSlotElement>(
      '.sidebar-header slot[name="header"]',
    );
    const assigned = headerSlot?.assignedElements({ flatten: true }) ?? [];
    assert(assigned.length > 0, 'mode 切替後も header スロットに要素が割り当てられていること');
  },
};

/**
 * inert 属性のタイミング検証
 * - collapse: inert → animation → visibility:hidden
 * - expand: visibility:visible + inert解除 → animation
 */
export const InertStrategyTiming: Story = {
  render: () => html`
    <div
      style="display: grid; grid-template-columns: var(--sidebar-width, 240px) 1fr; min-height: 300px;"
    >
      <ui-sidebar-shell id="sidebar-inert-timing" data-state="expanded" mode="fixed">
        <div role="tree" aria-label="ナビゲーション">
          <a href="/notes" role="treeitem" aria-selected="false" tabindex="0">ノート</a>
        </div>
      </ui-sidebar-shell>
      <main style="padding: 2rem;">メイン</main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-inert-timing');
    await flush(host);

    const nav = getNav(host);

    /* --- 初期状態: expanded, not inert --- */
    assert(!nav.inert, '初期状態で inert でないこと');
    assert(nav.style.visibility !== 'hidden', '初期状態で visibility が hidden でないこと');

    /* --- Collapse: inert がアニメーション前に即座設定 → 最終的に visibility:hidden --- */
    host.state = 'collapsed';
    await host.updateComplete;
    /* rAF 1回目: ブラウザがスタイルを適用する前 */
    await waitFrame();

    /* この時点で inert は即座に設定されているはず */
    assert(nav.inert, 'collapse 開始直後に inert が設定されていること');

    /* アニメーション完了を待つ */
    await waitForEvent(host, 'ui-sidebar-state-change');
    await flush(host);

    assert(nav.style.visibility === 'hidden', 'collapse 完了後に visibility: hidden であること');

    /* --- Expand: visibility:visible + inert解除がアニメーション前 --- */
    host.state = 'expanded';
    await host.updateComplete;
    await waitFrame();

    /* この時点で inert 解除と visibility:visible が先行しているはず */
    assert(!nav.inert, 'expand 開始直後に inert が解除されていること');
    assert(
      (nav.style.visibility as string) === 'visible',
      'expand 開始直後に visibility: visible であること',
    );

    /* アニメーション完了を待つ */
    await waitForEvent(host, 'ui-sidebar-state-change');
    await flush(host);

    assert(!nav.inert, 'expand 完了後も inert でないこと');
  },
};

/* ===================================================================
 * D. ダークモード + 契約テスト
 * =================================================================== */

/**
 * ダークモードでの表示確認（ライト/ダークコンテナ並列表示）
 */
export const DarkModeSurface: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'ライトモードとダークモードの並列表示。トークンベースのスタイリングにより自動適応する。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; min-height: 400px;">
      <!-- ライトモード -->
      <div
        id="light-container"
        style="color-scheme: light; background: oklch(98% 0.01 250); padding: 1rem;"
      >
        <h3 style="margin: 0 0 0.5rem;">Light</h3>
        <ui-sidebar-shell
          id="sidebar-dark-light"
          data-state="expanded"
          mode="fixed"
          style="border: 1px dashed oklch(50% 0 0 / 0.2); min-height: 300px;"
        >
          <div role="tree" aria-label="ナビゲーション">
            <a
              href="/notes"
              role="treeitem"
              aria-selected="false"
              tabindex="0"
              style="color: var(--fg-muted);"
              >ノート</a
            >
            <a
              href="/music"
              role="treeitem"
              aria-selected="false"
              tabindex="-1"
              style="color: var(--fg-muted);"
              >音楽</a
            >
          </div>
        </ui-sidebar-shell>
      </div>

      <!-- ダークモード -->
      <div
        id="dark-container"
        style="color-scheme: dark; background: oklch(12% 0.02 250); color: oklch(90% 0.01 250); padding: 1rem;"
      >
        <h3 style="margin: 0 0 0.5rem;">Dark</h3>
        <ui-sidebar-shell
          id="sidebar-dark-dark"
          data-state="expanded"
          mode="fixed"
          style="border: 1px dashed oklch(80% 0 0 / 0.2); min-height: 300px;"
        >
          <div role="tree" aria-label="ナビゲーション">
            <a
              href="/notes"
              role="treeitem"
              aria-selected="false"
              tabindex="0"
              style="color: var(--fg-muted);"
              >ノート</a
            >
            <a
              href="/music"
              role="treeitem"
              aria-selected="false"
              tabindex="-1"
              style="color: var(--fg-muted);"
              >音楽</a
            >
          </div>
        </ui-sidebar-shell>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const lightHost = getHost(canvasElement, 'sidebar-dark-light');
    const darkHost = getHost(canvasElement, 'sidebar-dark-dark');
    await flush(lightHost);
    await flush(darkHost);

    /* 両方の nav が存在すること */
    const lightNav = getNav(lightHost);
    const darkNav = getNav(darkHost);
    assert(!!lightNav, 'ライト側の nav が存在すること');
    assert(!!darkNav, 'ダーク側の nav が存在すること');

    /* 背景色が解決されていること（transparent でないこと） */
    const lightBg = getComputedStyle(lightNav).backgroundColor;
    const darkBg = getComputedStyle(darkNav).backgroundColor;
    assert(
      lightBg !== 'transparent' && lightBg !== '',
      `ライト側の背景色が解決されていること (実際: ${lightBg})`,
    );
    assert(
      darkBg !== 'transparent' && darkBg !== '',
      `ダーク側の背景色が解決されていること (実際: ${darkBg})`,
    );

    /* ボーダーが設定されていること */
    const lightBorder = getComputedStyle(lightNav).borderRightStyle;
    const darkBorder = getComputedStyle(darkNav).borderRightStyle;
    assert(lightBorder === 'solid', 'ライト側のボーダーが solid であること');
    assert(darkBorder === 'solid', 'ダーク側のボーダーが solid であること');
  },
};

/**
 * Forced Colors Mode の CSS 契約テスト
 * - forced-colors: active メディアクエリが存在すること
 * - Canvas / CanvasText キーワードが使用されていること
 * - part 属性セレクタが使用されていないこと
 */
export const ForcedColorsContract: Story = {
  render: () => html`
    <ui-sidebar-shell id="sidebar-forced" data-state="expanded" mode="fixed">
      <div role="tree" aria-label="ナビゲーション">
        <a href="/notes" role="treeitem" aria-selected="false" tabindex="0">ノート</a>
      </div>
    </ui-sidebar-shell>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-forced');
    await flush(host);

    const cssText = readCssText();

    /* --- forced-colors メディアクエリ --- */
    assert(cssText.includes('forced-colors'), 'CSS に forced-colors メディアクエリが含まれること');

    /* --- Canvas / CanvasText --- */
    assert(cssText.includes('Canvas'), 'CSS に Canvas キーワードが含まれること');
    assert(cssText.includes('CanvasText'), 'CSS に CanvasText キーワードが含まれること');

    /* --- part 属性セレクタ不使用 --- */
    assert(!cssText.includes('[part'), 'CSS に [part] セレクタが含まれないこと');
    assert(!cssText.includes('::part('), 'CSS に ::part() セレクタが含まれないこと');

    /* --- Shadow DOM に part 属性なし --- */
    const partsInDom = host.shadowRoot?.querySelectorAll('[part]') ?? [];
    assert(partsInDom.length === 0, 'Shadow DOM 内に part 属性が存在しないこと');
  },
};

/**
 * Reduced Motion + Print の CSS 契約テスト
 */
export const ReducedMotionAndPrintContract: Story = {
  render: () => html`
    <ui-sidebar-shell id="sidebar-motion" data-state="expanded" mode="fixed">
      <div role="tree" aria-label="ナビゲーション">
        <a href="/notes" role="treeitem" aria-selected="false" tabindex="0">ノート</a>
      </div>
    </ui-sidebar-shell>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'sidebar-motion');
    await flush(host);

    const cssText = readCssText();

    /* --- Reduced Motion --- */
    assert(
      cssText.includes('prefers-reduced-motion'),
      'CSS に prefers-reduced-motion メディアクエリが含まれること',
    );
    assert(
      cssText.includes('0.01ms'),
      'Reduced Motion 時に transition-duration: 0.01ms が指定されること',
    );

    /* --- Print --- */
    assert(cssText.includes('@media print'), 'CSS に @media print が含まれること');
    assert(cssText.includes('display: none'), '@media print 内で display: none が指定されること');

    /* --- 通常レンダリングでは表示されている --- */
    const hostStyle = getComputedStyle(host);
    assert(hostStyle.display !== 'none', '通常レンダリング時にサイドバーが表示されていること');
  },
};

/**
 * --ui-sidebar-scrim-opacity パブリックトークンのオーバーライド検証
 */
export const ScrimOpacityPublicToken: Story = {
  render: () => html`
    <style>
      .custom-scrim-sidebar {
        --ui-sidebar-scrim-opacity: 0.3;
      }
    </style>
    <div style="display: flex; gap: 2rem; min-height: 400px;">
      <!-- デフォルトスクリム -->
      <div style="flex: 1; position: relative;">
        <h3 style="margin: 0 0 0.5rem;">デフォルト (0.6)</h3>
        <ui-sidebar-shell id="sidebar-scrim-default" data-state="expanded" mode="overlay">
          <div role="tree" aria-label="ナビゲーション">
            <a href="/notes" role="treeitem" aria-selected="false" tabindex="0">ノート</a>
          </div>
        </ui-sidebar-shell>
      </div>

      <!-- カスタムスクリム -->
      <div style="flex: 1; position: relative;">
        <h3 style="margin: 0 0 0.5rem;">カスタム (0.3)</h3>
        <ui-sidebar-shell
          id="sidebar-scrim-custom"
          class="custom-scrim-sidebar"
          data-state="expanded"
          mode="overlay"
        >
          <div role="tree" aria-label="ナビゲーション">
            <a href="/notes" role="treeitem" aria-selected="false" tabindex="0">ノート</a>
          </div>
        </ui-sidebar-shell>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultHost = getHost(canvasElement, 'sidebar-scrim-default');
    const customHost = getHost(canvasElement, 'sidebar-scrim-custom');
    await flush(defaultHost);
    await flush(customHost);

    /* 両方にエラーなくレンダリングされること */
    const defaultNav = getNav(defaultHost);
    const customNav = getNav(customHost);
    assert(!!defaultNav, 'デフォルトスクリム側の nav が存在すること');
    assert(!!customNav, 'カスタムスクリム側の nav が存在すること');

    /* カスタムプロパティが適用されていること */
    const customValue = getComputedStyle(customHost).getPropertyValue('--ui-sidebar-scrim-opacity');
    assert(
      customValue.trim() === '0.3',
      `カスタム --ui-sidebar-scrim-opacity が 0.3 であること (実際: "${customValue.trim()}")`,
    );

    /* CSS 内にパブリックトークン定義が存在すること */
    const cssText = readCssText();
    assert(
      cssText.includes('--ui-sidebar-scrim-opacity'),
      'CSS 内に --ui-sidebar-scrim-opacity が定義されていること',
    );
  },
};
