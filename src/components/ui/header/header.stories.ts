import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './header';
import type { UiHeader, UiHeaderSidebarToggleDetail } from './header';
import '../breadcrumbs/breadcrumbs';
import '../button/button';
import '../dropdown/dropdown';
import '../search-trigger/search-trigger';

// ────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────

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

// ────────────────────────────────────────────
// スロットコンテンツテンプレート
// ────────────────────────────────────────────

/** 全3スロットを配置した標準的なヘッダー内容（既存コンポーネントを使用） */
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
          style="width:14px;height:14px;"
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

  <div slot="end" style="display: flex; align-items: center; gap: 8px;">
    <ui-search-trigger></ui-search-trigger>
    <ui-button variant="ghost" icon-only aria-label="テーマを変更">
      <iconify-icon icon="lucide:sun" aria-hidden="true"></iconify-icon>
    </ui-button>
  </div>
`;

/** モバイル向け簡素化ヘッダー内容（375px など狭幅ビューポート用） */
const mobileSlotContent = html`
  <div slot="start">
    <ui-button variant="ghost" icon-only aria-label="メニューを開く">
      <iconify-icon icon="lucide:menu" aria-hidden="true"></iconify-icon>
    </ui-button>
  </div>

  <div slot="end">
    <ui-button variant="ghost" icon-only aria-label="テーマを変更">
      <iconify-icon icon="lucide:sun" aria-hidden="true"></iconify-icon>
    </ui-button>
  </div>
`;

// ────────────────────────────────────────────
// メタ
// ────────────────────────────────────────────

const meta: Meta<UiHeader> = {
  title: 'Components/Header',
  component: 'ui-header',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
アプリケーションシェルのヘッダーコンポーネントです。

- \`display: contents\` でアプリシェルの Grid に透過的に参加
- 3スロット構成（\`start\` / \`center\` / \`end\`）
- \`sidebar-expanded\` 属性でサイドバー展開/格納状態を管理
- Glassmorphism背景（\`@supports\` によるProgressive Enhancement）
- \`ui-header-sidebar-toggle\` イベントで状態変更を通知
				`,
      },
    },
    layout: 'fullscreen',
  },
  argTypes: {
    sidebarExpanded: {
      control: 'boolean',
      description: 'サイドバーの展開状態',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiHeader>;

// ────────────────────────────────────────────
// 1. DefaultExpanded: サイドバー展開、全3スロット配置
// ────────────────────────────────────────────

/**
 * 意味のある組み合わせ:
 * - sidebar-expanded=true（デフォルト状態）
 * - 全3スロット（start/center/end）を配置
 * - DOM構造、スロット配置、スティッキー配置、ARIAランドマークを検証
 */
export const DefaultExpanded: Story = {
  render: () => html`
    <div style="height: 200vh;">
      <ui-header id="header-default" sidebar-expanded> ${fullSlotContent} </ui-header>
      <main style="padding: 2rem;">
        <p>スクロールコンテンツ（sticky検証用）</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-default');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    // Shadow DOM内にheader要素が存在すること
    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が Shadow DOM 内に見つかりません');

    // 3つのゾーンが存在すること
    const zoneStart = host.shadowRoot?.querySelector('.zone-start');
    const zoneCenter = host.shadowRoot?.querySelector('.zone-center');
    const zoneEnd = host.shadowRoot?.querySelector('.zone-end');
    assert(!!zoneStart, '.zone-start が見つかりません');
    assert(!!zoneCenter, '.zone-center が見つかりません');
    assert(!!zoneEnd, '.zone-end が見つかりません');

    // 各ゾーンにslot要素が存在すること
    const slotStart = zoneStart.querySelector('slot[name="start"]');
    const slotCenter = zoneCenter.querySelector('slot[name="center"]');
    const slotEnd = zoneEnd.querySelector('slot[name="end"]');
    assert(!!slotStart, 'slot[name="start"] が見つかりません');
    assert(!!slotCenter, 'slot[name="center"] が見つかりません');
    assert(!!slotEnd, 'slot[name="end"] が見つかりません');

    // sidebarExpanded=trueが反映されていること
    assert(host.sidebarExpanded, 'sidebarExpanded のデフォルト値が true ではありません');
    assert(
      host.hasAttribute('sidebar-expanded'),
      'sidebar-expanded 属性がホストに反映されていません',
    );

    // part属性が存在しないこと
    const partsInShadow = host.shadowRoot?.querySelectorAll('[part]');
    assert(partsInShadow?.length === 0, 'Shadow DOM 内に part 属性が存在します');

    // sticky positioning の検証
    const headerStyles = getComputedStyle(header);
    assert(
      headerStyles.position === 'sticky',
      `header に position: sticky が適用されていません（実際: ${headerStyles.position}）`,
    );

    // 内部コンテナの存在検証
    const inner = host.shadowRoot?.querySelector('.inner');
    assert(!!inner, '.inner コンテナが見つかりません');
  },
};

// ────────────────────────────────────────────
// 2. ZenModeCollapsed: サイドバー格納（Zen Mode）
// ────────────────────────────────────────────

/**
 * 意味のある組み合わせ:
 * - sidebar-expanded=false（Zen Mode）
 * - Start Zone幅がautoに縮退すること
 * - 属性反映の検証
 */
export const ZenModeCollapsed: Story = {
  render: () => html`
    <ui-header id="header-zen" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-zen');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    const zoneStart = host.shadowRoot?.querySelector<HTMLElement>('.zone-start');
    assert(!!zoneStart, '.zone-start コンテナが見つかりません');

    // 展開状態: sidebar-expanded 属性あり → .zone-start が --sidebar-width (240px) を持つ
    const expandedWidth = getComputedStyle(zoneStart).inlineSize;

    // sidebarExpanded=false に切り替え
    host.sidebarExpanded = false;
    await flush(host);

    assert(
      !host.hasAttribute('sidebar-expanded'),
      'sidebarExpanded=false のとき sidebar-expanded 属性が残存しています',
    );
    assert(!host.sidebarExpanded, 'sidebarExpanded プロパティが false に更新されていません');

    // 格納状態: .zone-start の inline-size が縮退していること
    const collapsedWidth = getComputedStyle(zoneStart).inlineSize;
    assert(
      collapsedWidth !== expandedWidth,
      'Zen Mode と Expanded で .zone-start の幅が変化していません',
    );
  },
};

// ────────────────────────────────────────────
// 3. SidebarToggleEvent: イベント発火
// ────────────────────────────────────────────

/**
 * 意味のある組み合わせ:
 * - sidebarExpanded の変更で ui-header-sidebar-toggle イベントが発火すること
 * - detail.expanded が正しい値を含むこと
 * - bubbles=false であること
 */
export const SidebarToggleEvent: Story = {
  render: () => html`
    <ui-header id="header-event" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-event');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    // expanded -> collapsed: イベントがdetail.expanded=falseで発火
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

    // collapsed -> expanded: イベントがdetail.expanded=trueで発火
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

// ────────────────────────────────────────────
// 4. ResponsiveVisualComparison: レスポンシブ表示の視覚確認
// ────────────────────────────────────────────

/**
 * レスポンシブ表示の視覚的確認:
 * - 異なるビューポート幅でのヘッダーレイアウトを並べて比較
 * - max-width制限（1280px）の動作確認
 */
export const ResponsiveVisualComparison: Story = {
  render: () => html`
    <div style="display: grid; gap: 2rem; padding: 1rem;">
      <p style="font-size: 0.875rem; color: var(--fg-muted);">
        以下はビューポート幅の制約をシミュレートしています。
        実際のレスポンシブ挙動はブラウザのビューポートリサイズで確認してください。
      </p>

      <!--
				モバイル想定 (375px):
				- sidebar-expanded なし（サイドバーは非表示状態）
				- mobileSlotContent: ハンバーガーメニュー + テーマトグルのみ
				- CSS により .zone-center は max-width: 640px で非表示
			-->
      <div
        style="width: 375px; border: 1px solid var(--border-default); border-radius: 8px; overflow: hidden;"
      >
        <p style="font-size: 11px; padding: 4px 8px; background: var(--bg-fill-muted); margin: 0;">
          375px (Mobile)
        </p>
        <ui-header> ${mobileSlotContent} </ui-header>
      </div>

      <!--
				タブレット想定 (768px):
				- sidebar-expanded なし（1280px 未満ではサイドバーは格納）
				- fullSlotContent: 全ゾーン表示、パンくずは真ん中に絶対配置
			-->
      <div
        style="width: 768px; border: 1px solid var(--border-default); border-radius: 8px; overflow: hidden;"
      >
        <p style="font-size: 11px; padding: 4px 8px; background: var(--bg-fill-muted); margin: 0;">
          768px (Tablet)
        </p>
        <ui-header> ${fullSlotContent} </ui-header>
      </div>

      <!--
				デスクトップ想定 (100%):
				- sidebar-expanded あり（サイドバーが展開、start ゾーン = 240px）
				- パンくずは絶対配置でヘッダー全幅の中央に固定
			-->
      <div
        style="width: 100%; border: 1px solid var(--border-default); border-radius: 8px; overflow: hidden;"
      >
        <p style="font-size: 11px; padding: 4px 8px; background: var(--bg-fill-muted); margin: 0;">
          100% (Desktop)
        </p>
        <ui-header sidebar-expanded> ${fullSlotContent} </ui-header>
      </div>
    </div>
  `,
};

// ────────────────────────────────────────────
// 5. EmptySlots: ルートページ（centerスロット空）
// ────────────────────────────────────────────

/**
 * 境界条件:
 * - centerスロットが空（ルートページでbreadcrumbsが空になるシナリオ）
 * - ヘッダーが正常にレンダリングされ、レイアウトが崩れないこと
 */
export const EmptySlots: Story = {
  render: () => html`
    <ui-header id="header-empty" sidebar-expanded>
      <div slot="start">
        <button
          aria-label="サイドバーを閉じる"
          style="all: unset; display: inline-flex; align-items: center; justify-content: center;
						width: 32px; height: 32px; cursor: pointer;"
        >
          <iconify-icon icon="lucide:panel-left" aria-hidden="true"></iconify-icon>
        </button>
      </div>
      <!-- center スロットは意図的に空 -->
      <div slot="end">
        <button
          aria-haspopup="dialog"
          aria-label="検索"
          style="all: unset; display: inline-flex; width: 32px; height: 32px; cursor: pointer;
						align-items: center; justify-content: center;"
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

    // ヘッダーが正常にレンダリングされていること
    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が存在しません');

    // 3ゾーンとも存在すること（スロットが空でもコンテナは描画される）
    const zones = host.shadowRoot?.querySelectorAll('.zone-start, .zone-center, .zone-end');
    assert(zones?.length === 3, '3つのゾーンコンテナが描画されていません');

    // centerスロットにassigned elementsがないこと
    const centerSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="center"]');
    const centerAssigned = centerSlot?.assignedElements({ flatten: true }) ?? [];
    assert(centerAssigned.length === 0, 'center スロットに要素が配置されています（空であるべき）');
  },
};

// ────────────────────────────────────────────
// 6. AttributeDrivenToggle: 属性/プロパティ双方向反映
// ────────────────────────────────────────────

/**
 * 境界条件:
 * - setAttribute による外部からの sidebar-expanded 切り替え
 * - プロパティとの双方向反映を確認
 */
export const AttributeDrivenToggle: Story = {
  render: () => html`
    <ui-header id="header-attr" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-attr');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    // 初期状態: sidebar-expanded 属性あり、プロパティ true
    assert(host.hasAttribute('sidebar-expanded'), '初期状態で sidebar-expanded 属性がありません');
    assert(host.sidebarExpanded, '初期状態で sidebarExpanded が true ではありません');

    // 属性を除去 -> プロパティが false になる
    const collapsePromise = waitForEvent<CustomEvent<UiHeaderSidebarToggleDetail>>(
      host,
      'ui-header-sidebar-toggle',
    );
    host.removeAttribute('sidebar-expanded');
    await flush(host);
    const collapseEvent = await collapsePromise;

    assert(!host.sidebarExpanded, '属性除去後に sidebarExpanded が false になっていません');
    assert(!collapseEvent.detail.expanded, '属性除去時のイベント detail が不正です');

    // プロパティで true に戻す -> 属性が復活する
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

// ────────────────────────────────────────────
// 7. RapidToggleReentrancy: 高速連続トグル
// ────────────────────────────────────────────

/**
 * 境界条件:
 * - 高速な連続トグルでイベントが適切に発火すること
 * - 同一値への設定で冗長なイベントが発火しないこと
 */
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

    // 同一値への設定ではイベントが発火しないことを確認
    await ensureNoEvent(host, 'ui-header-sidebar-toggle', () => {
      host.sidebarExpanded = true; // 既にtrue
    });
    assert(eventCount === 0, '同一値設定でイベントが発火しました');

    // 高速トグル: false -> true -> false
    host.sidebarExpanded = false;
    await flush(host);
    host.sidebarExpanded = true;
    await flush(host);
    host.sidebarExpanded = false;
    await flush(host);

    // 各変更で1回ずつ = 3回発火すること
    assert(
      (eventCount as number) === 3,
      `高速トグルで ${String(eventCount)} 回発火しました（期待: 3 回）`,
    );

    host.removeEventListener('ui-header-sidebar-toggle', listener);
  },
};

// ────────────────────────────────────────────
// 8. DynamicSlotContent: スロット内容の動的差し替え
// ────────────────────────────────────────────

/**
 * 境界条件:
 * - スロット内容を動的に差し替えてもヘッダーが正常動作すること
 */
export const DynamicSlotContent: Story = {
  render: () => html`
    <ui-header id="header-dynamic" sidebar-expanded>
      <div slot="center" id="dynamic-center">初期コンテンツ</div>
    </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-dynamic');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    // 初期コンテンツが配置されていること
    const centerSlot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="center"]');
    assert(!!centerSlot, 'center スロットが見つかりません');
    let assigned = centerSlot.assignedElements({ flatten: true });
    assert(assigned.length === 1, '初期状態で center スロットに 1 要素が配置されていません');

    // コンテンツを差し替え
    const oldContent = host.querySelector('#dynamic-center');
    oldContent?.remove();

    const newContent = document.createElement('span');
    newContent.setAttribute('slot', 'center');
    newContent.textContent = '差し替え後コンテンツ';
    host.appendChild(newContent);

    await flush(host);

    assigned = centerSlot.assignedElements({ flatten: true });
    assert(
      assigned.length === 1,
      'コンテンツ差し替え後に center スロットに 1 要素が配置されていません',
    );
    assert(
      assigned[0]?.textContent === '差し替え後コンテンツ',
      '差し替え後のコンテンツが正しくありません',
    );
  },
};

// ────────────────────────────────────────────
// 9. ForcedColorsMode: 高コントラストモード（視覚確認）
// ────────────────────────────────────────────

/**
 * アクセシビリティ:
 * - Forced Colors Mode での表示確認
 * - Canvas背景、CanvasTextボーダーが適用されること
 * - backdrop-filterが無効化されること
 *
 * Note: 実際のForced Colors表示はOSの高コントラスト設定でのみ確認可能です。
 * Chrome DevTools → Rendering → forced-colors: active を有効化してください。
 */
export const ForcedColorsMode: Story = {
  render: () => html`
    <div
      style="
				padding: 1rem;
				background: var(--bg-surface-2);
				border-radius: var(--radius-md);
				font-size: var(--text-sm);
				margin-bottom: 1.5rem;
				border: 1px solid var(--border-default);
			"
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

    // ヘッダーが正常にレンダリングされていること
    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が存在しません');

    // border-bottom が設定されていること
    const headerStyles = getComputedStyle(header);
    assert(
      headerStyles.borderBottomStyle === 'solid',
      'header に border-bottom: solid が適用されていません',
    );
  },
};

// ────────────────────────────────────────────
// 10. ReducedMotion: モーション軽減（視覚確認）
// ────────────────────────────────────────────

/**
 * アクセシビリティ:
 * - prefers-reduced-motion: reduce での表示確認
 * - トランジションが無効化されていること
 *
 * Note: OS の「視覚効果を減らす」設定を有効化、または
 * Chrome DevTools → Rendering → prefers-reduced-motion: reduce を設定してください。
 */
export const ReducedMotion: Story = {
  render: () => html`
    <div
      style="
				padding: 1rem;
				background: var(--bg-surface-2);
				border-radius: var(--radius-md);
				font-size: var(--text-sm);
				margin-bottom: 1.5rem;
				border: 1px solid var(--border-default);
			"
    >
      OS の「視覚効果を減らす」設定を有効にした状態で動作を確認してください。
    </div>

    <ui-header id="header-reduced-motion" sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-reduced-motion');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    // ヘッダーがレンダリングされていること
    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が存在しません');
  },
};

// ────────────────────────────────────────────
// 11. PrintStyles: 印刷時非表示
// ────────────────────────────────────────────

/**
 * アクセシビリティ:
 * - 印刷時にヘッダーが非表示になること
 * - ブラウザの印刷プレビュー（Cmd+P）で確認してください
 */
export const PrintStyles: Story = {
  render: () => html`
    <div>
      <ui-header id="header-print" sidebar-expanded> ${fullSlotContent} </ui-header>
      <main style="padding: 2rem;">
        <h1 style="font-size: 1.5rem; margin: 0 0 1rem;">印刷テスト</h1>
        <p>
          ブラウザの印刷プレビュー（Cmd+P / Ctrl+P）を使用して、
          ヘッダーが非表示になることを確認してください。
        </p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<UiHeader>('#header-print');
    assert(!!host, 'ui-header が見つかりません');
    await flush(host);

    // 通常表示ではヘッダーが表示されていること（印刷時のみ非表示）
    const header = host.shadowRoot?.querySelector('header');
    assert(!!header, 'header 要素が存在しません');
    const headerStyles = getComputedStyle(header);
    assert(headerStyles.display !== 'none', '通常表示で header が非表示になっています');
  },
};

// ────────────────────────────────────────────
// 12. DarkModeGlassmorphism: ダークモード＋Glassmorphism
// ────────────────────────────────────────────

/**
 * ダークモード:
 * - Glassmorphism 背景の視覚的確認
 * - スクロール時にコンテンツが背後を通過する様子を確認
 */
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
              style="margin-bottom: 1rem; padding: 1rem; border-radius: 6px;
								background: oklch(17% 0.02 250);"
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

// ────────────────────────────────────────────
// 13. CustomBackdropSaturate: パブリックトークンカスタマイズ
// ────────────────────────────────────────────

/**
 * パブリックトークンカスタマイズ:
 * - --ui-header-backdrop-saturate を外部から上書きできること
 * - カスタム値が反映されること
 */
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

    // 3つとも正常にレンダリングされていること
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

    // カスタムプロパティが外部クラスで上書きされていることを検証
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
