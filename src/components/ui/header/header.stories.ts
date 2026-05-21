import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './header';
import type { UiHeader } from './header';
import '../button/button';
import '../dropdown/dropdown';
import { renderStaticIconTemplate } from '../icon/static-icon-template.js';

const fullSlotContent = html`
  <div slot="start" style="display: flex; align-items: center; gap: 8px;">
    <ui-button variant="ghost" icon-only aria-label="サイドバーを閉じる">
      ${renderStaticIconTemplate('panel-left')}
    </ui-button>
    <ui-dropdown>
      <ui-button slot="trigger" variant="ghost">
        音楽
        ${renderStaticIconTemplate('chevron-down')}
      </ui-button>
      <ui-menu-item value="music">音楽</ui-menu-item>
      <ui-menu-item value="notes">ノート</ui-menu-item>
      <ui-menu-item value="photos">写真</ui-menu-item>
    </ui-dropdown>
  </div>

  <nav slot="center" aria-label="パンくず">
    <ol style="display: flex; gap: 0.5rem; margin: 0; padding: 0; list-style: none;">
      <li><a href="/">ホーム</a></li>
      <li aria-hidden="true">/</li>
      <li><a href="/projects">プロジェクト</a></li>
      <li aria-hidden="true">/</li>
      <li aria-current="page">設定</li>
    </ol>
  </nav>

  <div slot="end" style="display: flex; align-items: center; gap: 8px;">
    <button type="button" data-search-dialog-trigger aria-haspopup="dialog">検索</button>
    <ui-button variant="ghost" icon-only aria-label="テーマを変更">
      ${renderStaticIconTemplate('sun')}
    </ui-button>
  </div>
`;

const mobileSlotContent = html`
  <div slot="start">
    <ui-button variant="ghost" icon-only aria-label="メニューを開く">
      ${renderStaticIconTemplate('menu')}
    </ui-button>
  </div>

  <div slot="end">
    <ui-button variant="ghost" icon-only aria-label="テーマを変更">
      ${renderStaticIconTemplate('sun')}
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
- 4 スロット契約を持つ一方、Storybook の例示は \`start\` / \`center\` / \`end\` に限定
- \`sidebarExpanded\` は sidebar 状態そのものではなく start ゾーンの予約幅入力
- 狭幅では \`center\` を隠し、文脈表示を出さない例を含む
- event / attribute / responsive contract は \`test/browser/header.browser.test.ts\` に移送済み

幅契約:

- \`ui-header\` shadow DOM 内 \`.inner\` の契約対象は content box ではなく border-box width
- 新規参照用の semantic override token は \`--app-header-inner-max-width\`
- \`--layout-chrome-max-width\` は legacy override token として残し、削除・非推奨化しない
- \`--layout-chrome-max-width\` の default value は 1384px で、旧 default visual value 1280px の維持は保証しない
- 同一 scope で \`--app-header-inner-max-width\` と \`--layout-chrome-max-width\` が競合した場合は \`--app-header-inner-max-width\` を優先
- \`--layout-chrome-max-width\` だけを局所指定する legacy override 経路は引き続き有効
- tokens.css root には \`--app-header-inner-max-width\` を定義しない
- \`sidebar-expanded\` 経路も同じ幅契約に従う
- \`--ui-header-max-inline-size\` / \`--ui-header-max-inline-size-with-sidebar\` は ui-header 内部・adapter bridge 用 token
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
        <p>スクロールコンテンツ（sticky 確認用）</p>
      </main>
    </div>
  `,
};

export const ZenModeCollapsed: Story = {
  render: () => html` <ui-header id="header-zen"> ${fullSlotContent} </ui-header> `,
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
    <ui-header sidebar-expanded>
      <div slot="start">
        <button
          aria-label="サイドバーを閉じる"
          style="all: unset; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: pointer;"
        >
          ${renderStaticIconTemplate('panel-left')}
        </button>
      </div>
      <div slot="end">
        <button
          aria-haspopup="dialog"
          aria-label="検索"
          style="all: unset; display: inline-flex; width: 32px; height: 32px; cursor: pointer; align-items: center; justify-content: center;"
        >
          ${renderStaticIconTemplate('search')}
        </button>
      </div>
    </ui-header>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'empty slot の境界契約は browser test 側へ移送済みです。この story はレイアウトの最小構成を確認するために残しています。',
      },
    },
  },
};

export const ForcedColorsMode: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div
      style="padding: 1rem; background: var(--bg-surface-2); border-radius: var(--radius-md);
      font-size: var(--text-sm); margin-bottom: 1.5rem; border: 1px solid var(--border-default);"
    >
      Chrome DevTools → Rendering →
      <code>forced-colors: active</code> を有効にして確認してください。
    </div>

    <ui-header sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'forced-colors の CSS 構造契約は test/ssr 側で検査し、この story は手動確認専用に縮退しています。',
      },
    },
  },
};

export const ReducedMotion: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div
      style="padding: 1rem; background: var(--bg-surface-2); border-radius: var(--radius-md);
      font-size: var(--text-sm); margin-bottom: 1.5rem; border: 1px solid var(--border-default);"
    >
      OS の「視覚効果を減らす」設定を有効にした状態で動作を確認してください。
    </div>

    <ui-header sidebar-expanded> ${fullSlotContent} </ui-header>
  `,
};

export const PrintStyles: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div>
      <ui-header sidebar-expanded> ${fullSlotContent} </ui-header>
      <main style="padding: 2rem;">
        <h1 style="font-size: 1.5rem; margin: 0 0 1rem;">印刷テスト</h1>
        <p>
          ブラウザの印刷プレビュー（Cmd+P /
          Ctrl+P）を使用して、ヘッダーが非表示になることを確認してください。
        </p>
      </main>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'print の CSS 構造契約は test/ssr 側で検査し、この story は印刷プレビュー確認用に残しています。',
      },
    },
  },
};

export const DarkModeGlassmorphism: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div
      style="color-scheme: dark; background: oklch(12% 0.02 250); color: oklch(90% 0.01 250);
      height: 400px; overflow-y: auto; position: relative;"
    >
      <ui-header sidebar-expanded> ${fullSlotContent} </ui-header>
      <main style="padding: 2rem;">
        ${Array.from(
          { length: 20 },
          (_, i) => html`
            <p
              style="margin-bottom: 1rem; padding: 1rem; border-radius: 6px; background: oklch(17% 0.02 250);"
            >
              ダークモード背景コンテンツ #${i + 1}: スクロールするとヘッダーの見え方を確認できます。
              <span style="color: oklch(65% 0.15 250);">カラーテキスト</span
              >も合わせて確認してください。
            </p>
          `,
        )}
      </main>
    </div>
  `,
};

export const CustomBackdropSaturate: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="--ui-header-backdrop-saturate: 1.6; height: 240px; overflow: auto;">
      <ui-header sidebar-expanded> ${fullSlotContent} </ui-header>
      <main style="padding: 1.5rem; display: grid; gap: 1rem;">
        <p>ヘッダーの backdrop saturation カスタマイズ確認用です。</p>
        <div style="height: 320px; background: linear-gradient(135deg, #f7d794, #778beb);"></div>
      </main>
    </div>
  `,
};
