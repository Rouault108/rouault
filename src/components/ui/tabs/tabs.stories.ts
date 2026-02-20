import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './tabs';
import type { Tabs } from './tabs';

/**
 * ## タブ (Tabs) `<ui-tabs>`
 *
 * 同一コンテキスト内でのビュー（パネル）切り替えを提供します。
 * WAI-ARIA Tabs パターン（Roving Tabindex）に準拠します。
 *
 * ### 使用方法
 *
 * ```html
 * <ui-tabs selected-index="0">
 *   <button slot="tab">概要</button>
 *   <div slot="panel">概要コンテンツ</div>
 *   <button slot="tab">詳細</button>
 *   <div slot="panel">詳細コンテンツ</div>
 * </ui-tabs>
 * ```
 *
 * ### API Resolution Rules
 *
 * 1. `selected-value` が指定されていれば優先（URL連携に安定）
 * 2. 一致しない場合は `selected-index` を評価
 * 3. 両方が無効なら先頭タブ (index=0) を選択し `console.warn` で通知
 *
 * ### キーボードナビゲーション
 *
 * | キー | 動作 |
 * |------|------|
 * | `Tab` / `Shift+Tab` | タブリストへのフォーカス移動 |
 * | `ArrowLeft` / `ArrowRight` | 水平時: 前/次タブへフォーカス（循環） |
 * | `ArrowUp` / `ArrowDown` | 垂直時: 前/次タブへフォーカス（循環） |
 * | `Home` | 先頭タブへフォーカス |
 * | `End` | 末尾タブへフォーカス |
 * | `Enter` / `Space` | Manual Activation: タブを選択 |
 *
 * Automatic Activation 有効時は矢印キーでの移動と同時に選択されます。
 */
const meta: Meta<Tabs> = {
  title: 'Components/Tabs',
  component: 'ui-tabs',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
タブコンポーネントは、同一コンテキスト内でのビュー切り替えを提供します。

## 使用方法

\`\`\`html
<ui-tabs selected-index="0">
  <button slot="tab">概要</button>
  <div slot="panel">概要コンテンツ</div>
  <button slot="tab">詳細</button>
  <div slot="panel">詳細コンテンツ</div>
</ui-tabs>
\`\`\`

## 注意事項

- タブ数とパネル数は一致させてください（1:1 対応）
- 個別タブの \`disabled\` は現在の Rouault では実装対象外です
- \`selected-value\` と \`selected-index\` が同時指定された場合、\`selected-value\` が優先されます
        `,
      },
    },
  },
  argTypes: {
    selectedIndex: {
      control: 'number',
      description: '選択タブのインデックス（0始まり）',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '0' },
      },
    },
    selectedValue: {
      control: 'text',
      description: '選択タブの値（tab要素の value 属性と対応）',
      table: {
        type: { summary: 'string | null' },
        defaultValue: { summary: 'null' },
      },
    },
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'タブの配置方向',
      table: {
        type: { summary: "'horizontal' | 'vertical'" },
        defaultValue: { summary: 'horizontal' },
      },
    },
    automaticActivation: {
      control: 'boolean',
      description: '矢印キーで即座に選択するか（設定画面など即応性重視の場面向け）',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<Tabs>;

// ─────────────────────────────────────────────────
// 基本ストーリー
// ─────────────────────────────────────────────────

/**
 * デフォルトの水平タブ。
 *
 * 基本的な 3 タブ構成。role、aria-selected、aria-controls、
 * aria-labelledby の正確な付与を検証します。
 */
export const Default: Story = {
  args: {
    selectedIndex: 0,
    orientation: 'horizontal',
    automaticActivation: false,
  },
  render: (args) => html`
    <ui-tabs
      selected-index="${args.selectedIndex}"
      orientation="${args.orientation}"
      ?automatic-activation="${args.automaticActivation}"
    >
      <button slot="tab">概要</button>
      <div slot="panel" style="padding: 1rem;">
        <p>概要パネルのコンテンツです。</p>
      </div>

      <button slot="tab">詳細</button>
      <div slot="panel" style="padding: 1rem;">
        <p>詳細パネルのコンテンツです。技術的な仕様や実装の詳細が入ります。</p>
      </div>

      <button slot="tab">設定</button>
      <div slot="panel" style="padding: 1rem;">
        <p>設定パネルのコンテンツです。各種オプションが入ります。</p>
      </div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('ui-tabs');
    if (!tabs) throw new Error('[Default] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const tabEls = canvasElement.querySelectorAll('[slot="tab"]');
    const panelEls = canvasElement.querySelectorAll('[slot="panel"]');

    // テスト: タブの role
    tabEls.forEach((tab, i) => {
      if (tab.getAttribute('role') !== 'tab') {
        throw new Error(`[Default] tab[${String(i)}] の role が "tab" ではありません: ${String(tab.getAttribute('role'))}`);
      }
    });

    // テスト: 先頭タブが選択済み
    if (tabEls[0]?.getAttribute('aria-selected') !== 'true') {
      throw new Error('[Default] 先頭タブが aria-selected="true" ではありません');
    }
    if (tabEls[1]?.getAttribute('aria-selected') !== 'false') {
      throw new Error('[Default] 2番目のタブが aria-selected="false" ではありません');
    }

    // テスト: tablist の role と aria-orientation
    const tablist = tabs.shadowRoot?.querySelector('[role="tablist"]');
    if (!tablist) throw new Error('[Default] role="tablist" 要素が見つかりません');
    if (tablist.getAttribute('aria-orientation') !== 'horizontal') {
      throw new Error('[Default] aria-orientation が "horizontal" ではありません');
    }

    // テスト: aria-controls / aria-labelledby の相互参照
    tabEls.forEach((tab, i) => {
      const controls = tab.getAttribute('aria-controls');
      if (!controls) throw new Error(`[Default] tab[${String(i)}] に aria-controls がありません`);
      const panel = canvasElement.querySelector(`#${controls}`);
      if (!panel) throw new Error(`[Default] aria-controls="${controls}" に対応するパネルが見つかりません`);
      const labelledby = panel.getAttribute('aria-labelledby');
      if (labelledby !== tab.getAttribute('id')) {
        throw new Error(`[Default] panel の aria-labelledby が tab の id と一致しません`);
      }
    });

    // テスト: panel の role
    panelEls.forEach((panel, i) => {
      if (panel.getAttribute('role') !== 'tabpanel') {
        throw new Error(`[Default] panel[${String(i)}] の role が "tabpanel" ではありません`);
      }
    });

    // テスト: Roving Tabindex（先頭タブのみ tabindex="0"）
    if (tabEls[0].getAttribute('tabindex') !== '0') {
      throw new Error('[Default] 先頭タブの tabindex が "0" ではありません');
    }
    if (tabEls[1].getAttribute('tabindex') !== '-1') {
      throw new Error('[Default] 2番目のタブの tabindex が "-1" ではありません');
    }

    // テスト: 先頭パネルが表示されている
    const firstPanel = panelEls[0] as HTMLElement;
    if (firstPanel.hasAttribute('hidden')) {
      throw new Error('[Default] 先頭パネルが hidden になっています');
    }

    console.log('✅ [Default] 全テスト通過');
  },
};

/**
 * 2番目のタブを初期選択した状態。
 *
 * `selected-index="1"` の動作と、対応するパネルの表示を確認します。
 */
export const InitialIndex: Story = {
  render: () => html`
    <ui-tabs selected-index="1">
      <button slot="tab">概要</button>
      <div slot="panel" style="padding: 1rem;">概要パネル</div>

      <button slot="tab">詳細</button>
      <div slot="panel" style="padding: 1rem;">
        <strong>詳細パネル</strong>（初期選択）
      </div>

      <button slot="tab">設定</button>
      <div slot="panel" style="padding: 1rem;">設定パネル</div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('ui-tabs');
    if (!tabs) throw new Error('[InitialIndex] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const tabEls = canvasElement.querySelectorAll('[slot="tab"]');
    const panelEls = canvasElement.querySelectorAll('[slot="panel"]');

    // テスト: index=1 のタブが選択されている
    if (tabEls[1]?.getAttribute('aria-selected') !== 'true') {
      throw new Error('[InitialIndex] index=1 のタブが aria-selected="true" ではありません');
    }
    if (tabEls[0]?.getAttribute('aria-selected') !== 'false') {
      throw new Error('[InitialIndex] index=0 のタブが aria-selected="false" ではありません');
    }

    // テスト: index=1 のパネルが表示されている
    const secondPanel = panelEls[1] as HTMLElement;
    const firstPanel = panelEls[0] as HTMLElement;
    if (secondPanel.hasAttribute('hidden')) {
      throw new Error('[InitialIndex] index=1 のパネルが hidden になっています');
    }
    if (!firstPanel.hasAttribute('hidden')) {
      throw new Error('[InitialIndex] index=0 のパネルが表示されたままです');
    }

    // テスト: Roving Tabindex は選択タブに追従
    if (tabEls[1].getAttribute('tabindex') !== '0') {
      throw new Error('[InitialIndex] 選択タブの tabindex が "0" ではありません');
    }

    console.log('✅ [InitialIndex] 全テスト通過');
  },
};

// ─────────────────────────────────────────────────
// orientation
// ─────────────────────────────────────────────────

/**
 * 垂直タブ（`orientation="vertical"`）。
 *
 * タブリストが左側に縦並びで表示されます。
 * Arrow Up/Down でナビゲーションします。
 */
export const Vertical: Story = {
  render: () => html`
    <ui-tabs orientation="vertical" style="min-height: 200px;">
      <button slot="tab">プロフィール</button>
      <div slot="panel" style="padding: 1rem;">
        <h3 style="margin: 0 0 0.5rem 0;">プロフィール</h3>
        <p>ユーザー情報の設定が入ります。</p>
      </div>

      <button slot="tab">セキュリティ</button>
      <div slot="panel" style="padding: 1rem;">
        <h3 style="margin: 0 0 0.5rem 0;">セキュリティ</h3>
        <p>パスワードや2段階認証の設定が入ります。</p>
      </div>

      <button slot="tab">通知</button>
      <div slot="panel" style="padding: 1rem;">
        <h3 style="margin: 0 0 0.5rem 0;">通知</h3>
        <p>通知設定が入ります。</p>
      </div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('ui-tabs');
    if (!tabs) throw new Error('[Vertical] ui-tabs が見つかりません');

    await tabs.updateComplete;

    // テスト: aria-orientation が "vertical"
    const tablist = tabs.shadowRoot?.querySelector('[role="tablist"]');
    if (tablist?.getAttribute('aria-orientation') !== 'vertical') {
      throw new Error('[Vertical] aria-orientation が "vertical" ではありません');
    }

    // テスト: orientation 属性が反映されている
    if (tabs.getAttribute('orientation') !== 'vertical') {
      throw new Error('[Vertical] orientation 属性が反映されていません');
    }

    console.log('✅ [Vertical] 全テスト通過');
  },
};

// ─────────────────────────────────────────────────
// automatic-activation
// ─────────────────────────────────────────────────

/**
 * Automatic Activation モード。
 *
 * 矢印キーでのフォーカス移動と同時にタブが選択されます。
 * 設定画面など、コンテンツがローカルにあり即応性が求められる場合に使用します。
 *
 * Manual Activation（デフォルト）との違い:
 * - **Manual**: 矢印キーでフォーカス移動 → Enter/Space で選択
 * - **Automatic**: 矢印キーでフォーカス移動と同時に選択
 */
export const AutomaticActivation: Story = {
  render: () => html`
    <style>
      .auto-info {
        padding: 0.75rem 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1rem;
      }
    </style>

    <div class="auto-info">
      <strong>Automatic Activation</strong>:
      Tab キーでフォーカスしてから Arrow Left/Right を押すと、
      Enter/Space なしにタブが切り替わります。
    </div>

    <ui-tabs automatic-activation>
      <button slot="tab">外観</button>
      <div slot="panel" style="padding: 1rem;">外観設定</div>

      <button slot="tab">エディタ</button>
      <div slot="panel" style="padding: 1rem;">エディタ設定</div>

      <button slot="tab">ショートカット</button>
      <div slot="panel" style="padding: 1rem;">ショートカット設定</div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('ui-tabs');
    if (!tabs) throw new Error('[AutomaticActivation] ui-tabs が見つかりません');

    await tabs.updateComplete;

    // テスト: automatic-activation 属性が反映されている
    if (!tabs.automaticActivation) {
      throw new Error('[AutomaticActivation] automaticActivation が true ではありません');
    }

    console.log('✅ [AutomaticActivation] 全テスト通過');
  },
};

// ─────────────────────────────────────────────────
// アイコン付き
// ─────────────────────────────────────────────────

/**
 * アイコン + テキストのタブ。
 *
 * `<iconify-icon>` を使用したリッチなタブラベルです。
 * 通常のテキストラベルに比べて視覚的な識別性が向上します。
 */
export const WithIcons: Story = {
  render: () => html`
    <style>
      iconify-icon {
        font-size: var(--icon-base, 16px);
      }
    </style>

    <ui-tabs selected-index="0">
      <button slot="tab">
        <iconify-icon icon="lucide:file-text"></iconify-icon>
        ノート
      </button>
      <div slot="panel" style="padding: 1rem;">
        <p>ノートの一覧が入ります。</p>
      </div>

      <button slot="tab">
        <iconify-icon icon="lucide:tag"></iconify-icon>
        タグ
      </button>
      <div slot="panel" style="padding: 1rem;">
        <p>タグ一覧が入ります。</p>
      </div>

      <button slot="tab">
        <iconify-icon icon="lucide:search"></iconify-icon>
        検索
      </button>
      <div slot="panel" style="padding: 1rem;">
        <p>検索インターフェースが入ります。</p>
      </div>
    </ui-tabs>
  `,
};

// ─────────────────────────────────────────────────
// オーバーフロースクロール
// ─────────────────────────────────────────────────

/**
 * タブ数が多い場合のオーバーフロースクロール。
 *
 * タブリストの幅がコンテナを超えた場合、横スクロールが有効になります。
 * キーボード操作でのタブ移動時、アクティブなタブが自動的にスクロールされます。
 */
export const ManyTabs: Story = {
  render: () => html`
    <div style="max-width: 400px; border: 1px dashed var(--border-default, #e0e0e0); padding: 0.5rem;">
      <p style="font-size: var(--text-sm, 13px); color: var(--fg-muted, #666); margin: 0 0 0.5rem 0;">
        コンテナ幅: 400px（タブリストがオーバーフロー）
      </p>
      <ui-tabs selected-index="0">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
          (n) => html`
            <button slot="tab">タブ ${String(n)}</button>
            <div slot="panel" style="padding: 1rem;">パネル ${String(n)} のコンテンツ</div>
          `,
        )}
      </ui-tabs>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('ui-tabs');
    if (!tabs) throw new Error('[ManyTabs] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const tabEls = canvasElement.querySelectorAll('[slot="tab"]');

    // テスト: 10タブが正しく初期化されている
    if (tabEls.length !== 10) {
      throw new Error(`[ManyTabs] タブ数が 10 ではありません: ${String(tabEls.length)}`);
    }

    // テスト: 全タブに role="tab" が付与されている
    tabEls.forEach((tab, i) => {
      if (tab.getAttribute('role') !== 'tab') {
        throw new Error(`[ManyTabs] tab[${String(i)}] の role が "tab" ではありません`);
      }
    });

    console.log('✅ [ManyTabs] 全テスト通過');
  },
};

// ─────────────────────────────────────────────────
// selected-value
// ─────────────────────────────────────────────────

/**
 * `selected-value` による初期選択。
 *
 * URL のハッシュやクエリパラメータと連携する場合に使用します。
 * タブの `value` 属性と `selected-value` 属性を一致させることで選択されます。
 */
export const SelectedByValue: Story = {
  render: () => html`
    <ui-tabs selected-value="settings">
      <button slot="tab" value="overview">概要</button>
      <div slot="panel" style="padding: 1rem;">概要パネル</div>

      <button slot="tab" value="details">詳細</button>
      <div slot="panel" style="padding: 1rem;">詳細パネル</div>

      <button slot="tab" value="settings">設定</button>
      <div slot="panel" style="padding: 1rem;">
        <strong>設定パネル</strong>（selected-value="settings" により選択）
      </div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('ui-tabs');
    if (!tabs) throw new Error('[SelectedByValue] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const tabEls = canvasElement.querySelectorAll('[slot="tab"]');
    const panelEls = canvasElement.querySelectorAll('[slot="panel"]');

    // テスト: "settings" タブが選択されている（index=2）
    if (tabEls[2]?.getAttribute('aria-selected') !== 'true') {
      throw new Error('[SelectedByValue] value="settings" のタブが aria-selected="true" ではありません');
    }
    if (tabEls[0]?.getAttribute('aria-selected') !== 'false') {
      throw new Error('[SelectedByValue] value="overview" のタブが aria-selected="false" ではありません');
    }

    // テスト: index=2 のパネルが表示されている
    const thirdPanel = panelEls[2] as HTMLElement;
    if (thirdPanel.hasAttribute('hidden')) {
      throw new Error('[SelectedByValue] selected-value に対応するパネルが hidden になっています');
    }

    console.log('✅ [SelectedByValue] 全テスト通過');
  },
};

// ─────────────────────────────────────────────────
// キーボードナビゲーション
// ─────────────────────────────────────────────────

/**
 * キーボードナビゲーションのテスト（Manual Activation）。
 *
 * - Arrow Left/Right: フォーカス移動（選択は変わらない）
 * - Enter/Space: 選択確定
 * - Home/End: 先頭/末尾へ移動
 * - 循環: 末尾 → 先頭、先頭 → 末尾
 */
export const KeyboardNavigation: Story = {
  render: () => html`
    <style>
      .keyboard-info {
        padding: 0.75rem 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1rem;
      }
      .keyboard-info code {
        background: var(--bg-fill-muted, #eee);
        padding: 0.1em 0.3em;
        border-radius: 3px;
      }
    </style>

    <div class="keyboard-info">
      Tab キーでフォーカスしてから:
      <code>← →</code> でフォーカス移動、
      <code>Enter</code> / <code>Space</code> で選択、
      <code>Home</code> / <code>End</code> で先頭/末尾へ。
    </div>

    <ui-tabs id="keyboard-tabs" selected-index="0">
      <button slot="tab">アルファ</button>
      <div slot="panel" style="padding: 1rem;">アルファパネル</div>

      <button slot="tab">ベータ</button>
      <div slot="panel" style="padding: 1rem;">ベータパネル</div>

      <button slot="tab">ガンマ</button>
      <div slot="panel" style="padding: 1rem;">ガンマパネル</div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector<Tabs>('#keyboard-tabs');
    if (!tabs) throw new Error('[KeyboardNavigation] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const tabEls = Array.from(canvasElement.querySelectorAll<HTMLElement>('[slot="tab"]'));
    const tablist = tabs.shadowRoot?.querySelector<HTMLElement>('[role="tablist"]');
    if (!tablist) throw new Error('[KeyboardNavigation] tablist が見つかりません');

    // ─── テスト: ArrowRight でフォーカス移動（Manual: 選択は変わらない） ───
    tabEls[0]?.focus();
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
    await tabs.updateComplete;

    // フォーカスが tab[1] に移動している
    if (tabEls[1]?.getAttribute('tabindex') !== '0') {
      throw new Error('[KeyboardNavigation] ArrowRight 後に tab[1] の tabindex が "0" ではありません');
    }
    // 選択は tab[0] のまま
    if (tabEls[0]?.getAttribute('aria-selected') !== 'true') {
      throw new Error('[KeyboardNavigation] Manual Activation: ArrowRight 後も aria-selected は変わらないはずです');
    }

    // ─── テスト: Enter で選択 ───
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await tabs.updateComplete;

    if (tabEls[1].getAttribute('aria-selected') !== 'true') {
      throw new Error('[KeyboardNavigation] Enter 後に tab[1] が aria-selected="true" ではありません');
    }

    // ─── テスト: End で末尾へ ───
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }));
    await tabs.updateComplete;

    if (tabEls[2]?.getAttribute('tabindex') !== '0') {
      throw new Error('[KeyboardNavigation] End 後に tab[2] の tabindex が "0" ではありません');
    }

    // ─── テスト: Home で先頭へ ───
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true }));
    await tabs.updateComplete;

    if (tabEls[0].getAttribute('tabindex') !== '0') {
      throw new Error('[KeyboardNavigation] Home 後に tab[0] の tabindex が "0" ではありません');
    }

    // ─── テスト: ArrowLeft での循環（先頭 → 末尾） ───
    // tab[0] にいる状態から ArrowLeft
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }));
    await tabs.updateComplete;

    if (tabEls[2].getAttribute('tabindex') !== '0') {
      throw new Error('[KeyboardNavigation] 先頭からの ArrowLeft で末尾へ循環しませんでした');
    }

    // ─── テスト: ArrowRight での循環（末尾 → 先頭） ───
    // tab[2] にいる状態から ArrowRight
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
    await tabs.updateComplete;

    if (tabEls[0].getAttribute('tabindex') !== '0') {
      throw new Error('[KeyboardNavigation] 末尾からの ArrowRight で先頭へ循環しませんでした');
    }

    console.log('✅ [KeyboardNavigation] 全テスト通過');
  },
};

/**
 * 垂直タブのキーボードナビゲーション。
 *
 * 垂直方向では Arrow Up/Down でナビゲーションします。
 * Arrow Left/Right は無視されます。
 */
export const KeyboardNavigationVertical: Story = {
  render: () => html`
    <ui-tabs id="keyboard-vertical-tabs" orientation="vertical" style="min-height: 200px;">
      <button slot="tab">項目 A</button>
      <div slot="panel" style="padding: 1rem;">項目 A のコンテンツ</div>

      <button slot="tab">項目 B</button>
      <div slot="panel" style="padding: 1rem;">項目 B のコンテンツ</div>

      <button slot="tab">項目 C</button>
      <div slot="panel" style="padding: 1rem;">項目 C のコンテンツ</div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector<Tabs>('#keyboard-vertical-tabs');
    if (!tabs) throw new Error('[KeyboardNavigationVertical] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const tabEls = Array.from(canvasElement.querySelectorAll<HTMLElement>('[slot="tab"]'));
    const tablist = tabs.shadowRoot?.querySelector<HTMLElement>('[role="tablist"]');
    if (!tablist) throw new Error('[KeyboardNavigationVertical] tablist が見つかりません');

    // テスト: ArrowDown でフォーカス移動
    tabEls[0]?.focus();
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    await tabs.updateComplete;

    if (tabEls[1]?.getAttribute('tabindex') !== '0') {
      throw new Error('[KeyboardNavigationVertical] ArrowDown 後に tab[1] の tabindex が "0" ではありません');
    }

    // テスト: ArrowLeft は無視される（垂直時）
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }));
    await tabs.updateComplete;

    // フォーカスは tab[1] のまま
    if (tabEls[1].getAttribute('tabindex') !== '0') {
      throw new Error('[KeyboardNavigationVertical] ArrowLeft が垂直時に誤って動作しました');
    }

    // テスト: ArrowUp でフォーカスを戻す
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }));
    await tabs.updateComplete;

    if (tabEls[0]?.getAttribute('tabindex') !== '0') {
      throw new Error('[KeyboardNavigationVertical] ArrowUp 後に tab[0] の tabindex が "0" ではありません');
    }

    console.log('✅ [KeyboardNavigationVertical] 全テスト通過');
  },
};

// ─────────────────────────────────────────────────
// タブ切り替えイベント
// ─────────────────────────────────────────────────

/**
 * `ui-tab-change` カスタムイベントの検証。
 *
 * タブ切り替え時に `ui-tab-change` イベントが発火され、
 * `detail` に `{ index, value, prevIndex }` が含まれることを確認します。
 */
export const TabChangeEvent: Story = {
  render: () => html`
    <style>
      .event-log {
        margin-top: 1rem;
        padding: 0.75rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        font-family: monospace;
        min-height: 3rem;
      }
    </style>

    <ui-tabs
      id="event-tabs"
      selected-index="0"
      @ui-tab-change="${(e: CustomEvent<{ index: number; value: string | null; prevIndex: number }>) => {
        const log = document.querySelector('#event-log');
        if (log) {
          log.textContent = `ui-tab-change: index=${String(e.detail.index)}, value=${e.detail.value ?? 'null'}, prevIndex=${String(e.detail.prevIndex)}`;
        }
      }}"
    >
      <button slot="tab" value="overview">概要</button>
      <div slot="panel" style="padding: 1rem;">概要パネル</div>

      <button slot="tab" value="details">詳細</button>
      <div slot="panel" style="padding: 1rem;">詳細パネル</div>

      <button slot="tab" value="settings">設定</button>
      <div slot="panel" style="padding: 1rem;">設定パネル</div>
    </ui-tabs>

    <div id="event-log" class="event-log">タブをクリックするとイベントが表示されます</div>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector<Tabs>('#event-tabs');
    if (!tabs) throw new Error('[TabChangeEvent] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const events: { index: number; value: string | null; prevIndex: number }[] = [];
    tabs.addEventListener('ui-tab-change', (e) => {
      const ce = e as CustomEvent<{ index: number; value: string | null; prevIndex: number }>;
      events.push(ce.detail);
    });

    // タブ[1] をクリック
    const tabEls = canvasElement.querySelectorAll<HTMLElement>('[slot="tab"]');
    tabEls[1]?.click();
    await tabs.updateComplete;

    // テスト: イベントが発火している
    if (events.length !== 1) {
      throw new Error(`[TabChangeEvent] イベント発火回数が 1 ではありません: ${String(events.length)}`);
    }

    // テスト: detail の内容
    const detail = events[0];
    if (!detail) throw new Error('[TabChangeEvent] detail が undefined です');
    if (detail.index !== 1) {
      throw new Error(`[TabChangeEvent] detail.index が 1 ではありません: ${String(detail.index)}`);
    }
    if (detail.value !== 'details') {
      throw new Error(`[TabChangeEvent] detail.value が "details" ではありません: ${String(detail.value)}`);
    }
    if (detail.prevIndex !== 0) {
      throw new Error(`[TabChangeEvent] detail.prevIndex が 0 ではありません: ${String(detail.prevIndex)}`);
    }

    // テスト: 同じタブを再クリックしてもイベントは発火しない
    const eventCountBeforeReclick = events.length as number;
    tabEls[1]?.click();
    await tabs.updateComplete;

    if (events.length !== eventCountBeforeReclick) {
      throw new Error('[TabChangeEvent] 同じタブの再選択でイベントが発火してしまいました');
    }

    console.log('✅ [TabChangeEvent] 全テスト通過');
  },
};

// ─────────────────────────────────────────────────
// 境界条件・エッジケース
// ─────────────────────────────────────────────────

/**
 * ⚠️ 無効な `selected-index`（境界条件）。
 *
 * タブ数を超えるインデックスが指定された場合、先頭タブを選択し、
 * 開発時に `console.warn` で通知します。
 *
 * コンソールに `[ui-tabs]: ... 先頭タブ (index=0) を選択します` が出力されることを確認してください。
 */
export const EdgeCase_InvalidIndex: Story = {
  render: () => html`
    <style>
      .warning-banner {
        padding: 0.75rem 1rem;
        background: oklch(from var(--warning, oklch(70% 0.15 85)) l c h / 0.1);
        border: 1px solid oklch(from var(--warning, oklch(70% 0.15 85)) l c h / 0.3);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1rem;
      }
    </style>

    <div class="warning-banner">
      <strong>⚠️ 境界条件</strong>: selected-index="99" は無効です。
      コンソールに警告が出力され、先頭タブが選択されます。
    </div>

    <ui-tabs id="invalid-index-tabs" selected-index="99">
      <button slot="tab">タブ A</button>
      <div slot="panel" style="padding: 1rem;">タブ A のパネル（フォールバック選択）</div>

      <button slot="tab">タブ B</button>
      <div slot="panel" style="padding: 1rem;">タブ B のパネル</div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector<Tabs>('#invalid-index-tabs');
    if (!tabs) throw new Error('[EdgeCase_InvalidIndex] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const tabEls = canvasElement.querySelectorAll('[slot="tab"]');
    const panelEls = canvasElement.querySelectorAll('[slot="panel"]');

    // テスト: 無効なインデックスのため先頭タブが選択されている
    if (tabEls[0]?.getAttribute('aria-selected') !== 'true') {
      throw new Error('[EdgeCase_InvalidIndex] フォールバックで先頭タブが選択されていません');
    }

    // テスト: 先頭パネルが表示されている
    const firstPanel = panelEls[0] as HTMLElement;
    if (firstPanel.hasAttribute('hidden')) {
      throw new Error('[EdgeCase_InvalidIndex] フォールバックで先頭パネルが表示されていません');
    }

    console.log('✅ [EdgeCase_InvalidIndex] 全テスト通過');
    console.log('📝 コンソールの警告メッセージを確認してください');
  },
  parameters: {
    docs: {
      description: {
        story: '⚠️ `selected-index="99"` のような無効値はフォールバック（先頭タブ）と `console.warn` で安全に処理されます。',
      },
    },
  },
};

/**
 * ⚠️ `selected-value` と `selected-index` が同時指定（境界条件）。
 *
 * 両属性が指定された場合、`selected-value` が優先されます。
 * URL連携時の安定性のための仕様です。
 */
export const EdgeCase_ValueOverridesIndex: Story = {
  render: () => html`
    <style>
      .info-banner {
        padding: 0.75rem 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1rem;
      }
    </style>

    <div class="info-banner">
      <strong>API Resolution</strong>:
      <code>selected-index="0"</code> と <code>selected-value="gamma"</code> が同時指定。
      <strong>selected-value が優先され</strong>、「ガンマ」タブが選択されます。
    </div>

    <ui-tabs id="priority-tabs" selected-index="0" selected-value="gamma">
      <button slot="tab" value="alpha">アルファ</button>
      <div slot="panel" style="padding: 1rem;">アルファパネル（selected-index=0 だが非選択）</div>

      <button slot="tab" value="beta">ベータ</button>
      <div slot="panel" style="padding: 1rem;">ベータパネル</div>

      <button slot="tab" value="gamma">ガンマ</button>
      <div slot="panel" style="padding: 1rem;">
        <strong>ガンマパネル</strong>（selected-value="gamma" により選択）
      </div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector<Tabs>('#priority-tabs');
    if (!tabs) throw new Error('[EdgeCase_ValueOverridesIndex] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const tabEls = canvasElement.querySelectorAll('[slot="tab"]');

    // テスト: selected-value="gamma" が優先され index=2 が選択されている
    if (tabEls[2]?.getAttribute('aria-selected') !== 'true') {
      throw new Error('[EdgeCase_ValueOverridesIndex] selected-value が優先されていません。index=2 が選択されていません。');
    }
    if (tabEls[0]?.getAttribute('aria-selected') !== 'false') {
      throw new Error('[EdgeCase_ValueOverridesIndex] index=0 のタブが誤って選択されています');
    }

    console.log('✅ [EdgeCase_ValueOverridesIndex] 全テスト通過');
  },
  parameters: {
    docs: {
      description: {
        story: '`selected-value` と `selected-index` が競合した場合、**`selected-value` が優先**されます（API Resolution Rules）。',
      },
    },
  },
};

/**
 * ⚠️ タブが 1 つのエッジケース。
 *
 * タブが 1 つの場合、Arrow キーの循環ナビゲーションが自身に戻ります。
 * エラーにならずに動作することを確認します。
 */
export const EdgeCase_SingleTab: Story = {
  render: () => html`
    <style>
      .info-banner {
        padding: 0.75rem 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1rem;
      }
    </style>

    <div class="info-banner">
      <strong>境界条件</strong>: タブが 1 つの場合、Arrow キーを押しても自身に戻ります。
    </div>

    <ui-tabs id="single-tab">
      <button slot="tab">唯一のタブ</button>
      <div slot="panel" style="padding: 1rem;">唯一のパネル</div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector<Tabs>('#single-tab');
    if (!tabs) throw new Error('[EdgeCase_SingleTab] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const tabEls = canvasElement.querySelectorAll('[slot="tab"]');
    const tablist = tabs.shadowRoot?.querySelector<HTMLElement>('[role="tablist"]');
    if (!tablist) throw new Error('[EdgeCase_SingleTab] tablist が見つかりません');

    // テスト: 1タブのみ存在
    if (tabEls.length !== 1) {
      throw new Error(`[EdgeCase_SingleTab] タブ数が 1 ではありません: ${String(tabEls.length)}`);
    }

    // テスト: タブが選択されている
    if (tabEls[0]?.getAttribute('aria-selected') !== 'true') {
      throw new Error('[EdgeCase_SingleTab] 唯一のタブが選択されていません');
    }

    // テスト: Arrow キーを押してもエラーにならない（循環して自身に戻る）
    (tabEls[0] as HTMLElement).focus();
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
    await tabs.updateComplete;

    // 自身に戻っているため tabindex="0" は変わらない
    if (tabEls[0].getAttribute('tabindex') !== '0') {
      throw new Error('[EdgeCase_SingleTab] Arrow キー後に tabindex="0" が失われました');
    }

    console.log('✅ [EdgeCase_SingleTab] 全テスト通過');
  },
};

/**
 * ⚠️ `selected-value` が一致しない場合（境界条件）。
 *
 * `selected-value` に一致するタブがない場合は `selected-index` にフォールバックします。
 * `selected-index` も無効なら先頭タブを選択します。
 */
export const EdgeCase_UnmatchedValue: Story = {
  render: () => html`
    <style>
      .warning-banner {
        padding: 0.75rem 1rem;
        background: oklch(from var(--warning, oklch(70% 0.15 85)) l c h / 0.1);
        border: 1px solid oklch(from var(--warning, oklch(70% 0.15 85)) l c h / 0.3);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1rem;
      }
    </style>

    <div class="warning-banner">
      <strong>⚠️ 境界条件</strong>:
      <code>selected-value="nonexistent"</code> はどのタブにも一致しません。
      <code>selected-index="1"</code> にフォールバックします。
    </div>

    <ui-tabs id="unmatched-tabs" selected-value="nonexistent" selected-index="1">
      <button slot="tab" value="alpha">アルファ</button>
      <div slot="panel" style="padding: 1rem;">アルファパネル</div>

      <button slot="tab" value="beta">ベータ</button>
      <div slot="panel" style="padding: 1rem;">
        <strong>ベータパネル</strong>（selected-index=1 へのフォールバック）
      </div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector<Tabs>('#unmatched-tabs');
    if (!tabs) throw new Error('[EdgeCase_UnmatchedValue] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const tabEls = canvasElement.querySelectorAll('[slot="tab"]');

    // テスト: selected-value が一致しないため selected-index=1 にフォールバック
    if (tabEls[1]?.getAttribute('aria-selected') !== 'true') {
      throw new Error('[EdgeCase_UnmatchedValue] selected-index=1 へのフォールバックが機能していません');
    }

    console.log('✅ [EdgeCase_UnmatchedValue] 全テスト通過');
  },
};

// ─────────────────────────────────────────────────
// アクセシビリティ
// ─────────────────────────────────────────────────

/**
 * Reduced Motion での確認。
 *
 * `prefers-reduced-motion: reduce` 時、アニメーションが `0.01ms` に短縮されます。
 * 状態変化の認識に必須なため、完全無効化はしません。
 */
export const ReducedMotion: Story = {
  render: () => html`
    <style>
      .reduced-motion-info {
        padding: 0.75rem 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1rem;
      }

      /* Reduced Motion をシミュレート */
      @media (prefers-reduced-motion: no-preference) {
        .simulate-reduced-motion ui-tabs {
          --duration-fast: 0.01ms;
          --duration-normal: 0.01ms;
          --duration-slow: 0.01ms;
        }
      }
    </style>

    <div class="reduced-motion-info">
      <strong>確認方法</strong>:
      OS の「視差効果を減らす」（macOS）または「アニメーション効果をオフ」（Windows）を有効にしてください。
      インジケーターの移動とパネルのフェードが即座に完了します（0.01ms）。
    </div>

    <div class="simulate-reduced-motion">
      <ui-tabs selected-index="0">
        <button slot="tab">概要</button>
        <div slot="panel" style="padding: 1rem;">概要パネル（アニメーション短縮中）</div>

        <button slot="tab">詳細</button>
        <div slot="panel" style="padding: 1rem;">詳細パネル（アニメーション短縮中）</div>

        <button slot="tab">設定</button>
        <div slot="panel" style="padding: 1rem;">設定パネル（アニメーション短縮中）</div>
      </ui-tabs>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: '`prefers-reduced-motion: reduce` 時はすべてのトランジションが `0.01ms` に短縮されます。完全無効化はしません（状態変化の認識に必要なため）。',
      },
    },
  },
};

/**
 * Forced Colors Mode（高コントラストモード）での確認。
 *
 * Windows 高コントラストモードなど Forced Colors 環境での表示確認です。
 * JS 制御のスライディングインジケーターが非表示となり、
 * タブ自体のボーダー（`Highlight` システムカラー）で選択状態を示す「ネイティブ回帰」戦略を採用。
 */
export const ForcedColorsMode: Story = {
  render: () => html`
    <style>
      .forced-colors-info {
        padding: 0.75rem 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
        margin-bottom: 1rem;
      }
    </style>

    <div class="forced-colors-info">
      <strong>確認方法</strong>:
      Chrome DevTools → Rendering → Emulate CSS media feature
      <code>forced-colors: active</code> で確認できます。
      アクティブタブが <code>Highlight</code> システムカラーのボーダーで識別されます。
    </div>

    <ui-tabs selected-index="0">
      <button slot="tab">水平 - アクティブ</button>
      <div slot="panel" style="padding: 1rem;">アクティブパネル</div>

      <button slot="tab">水平 - 非アクティブ</button>
      <div slot="panel" style="padding: 1rem;">非アクティブパネル</div>
    </ui-tabs>

    <div style="margin-top: 1.5rem;">
      <ui-tabs orientation="vertical" selected-index="0" style="min-height: 120px;">
        <button slot="tab">垂直 - アクティブ</button>
        <div slot="panel" style="padding: 1rem;">垂直アクティブパネル</div>

        <button slot="tab">垂直 - 非アクティブ</button>
        <div slot="panel" style="padding: 1rem;">垂直非アクティブパネル</div>
      </ui-tabs>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'Forced Colors Mode では JS 制御のインジケーターが非表示になり、`Highlight` システムカラーのボーダーで選択状態を示します（ネイティブ回帰戦略）。',
      },
    },
  },
};

// ─────────────────────────────────────────────────
// 非同期コンテンツ・Loading State
// ─────────────────────────────────────────────────

/**
 * 非同期パネルの Loading State（`aria-busy`）。
 *
 * パネルコンテンツのフェッチ中は `aria-busy="true"` を付与し、
 * `--timeout-async-threshold`（500ms）以内に完了すれば即フェードイン、
 * 超過した場合はスケルトンを表示します。
 *
 * NOTE: 本ストーリーは `aria-busy` の使用パターンを示すデモです。
 * 実際の非同期制御はアプリケーション層で行います。
 */
export const AsyncPanel: Story = {
  render: () => html`
    <style>
      .skeleton {
        background: linear-gradient(
          90deg,
          var(--bg-fill-muted, #eee) 25%,
          var(--bg-surface-2, #f5f5f5) 37%,
          var(--bg-fill-muted, #eee) 63%
        );
        background-size: 400px 100%;
        animation: shimmer 1.4s ease infinite;
        border-radius: var(--radius-md, 6px);
        height: 1rem;
        margin-bottom: 0.5rem;
      }

      @keyframes shimmer {
        0% { background-position: -400px 0; }
        100% { background-position: 400px 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .skeleton { animation: none; }
      }
    </style>

    <ui-tabs id="async-tabs" selected-index="0">
      <button slot="tab">既存コンテンツ</button>
      <div slot="panel" style="padding: 1rem;">
        即座に表示されるコンテンツ
      </div>

      <button slot="tab">非同期コンテンツ</button>
      <div slot="panel" id="async-panel" style="padding: 1rem;" aria-busy="true">
        <div class="skeleton" style="width: 80%;"></div>
        <div class="skeleton" style="width: 60%;"></div>
        <div class="skeleton" style="width: 70%;"></div>
        <p style="display: none;" id="async-content">読み込み完了後のコンテンツ</p>
      </div>
    </ui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector<Tabs>('#async-tabs');
    if (!tabs) throw new Error('[AsyncPanel] ui-tabs が見つかりません');

    await tabs.updateComplete;

    const asyncPanel = canvasElement.querySelector<HTMLElement>('#async-panel');
    if (!asyncPanel) throw new Error('[AsyncPanel] async-panel が見つかりません');

    // テスト: aria-busy="true" が付与されている
    if (asyncPanel.getAttribute('aria-busy') !== 'true') {
      throw new Error('[AsyncPanel] aria-busy="true" が設定されていません');
    }

    // 非同期完了をシミュレート（500ms 閾値内）
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        asyncPanel.setAttribute('aria-busy', 'false');
        const skeletons = asyncPanel.querySelectorAll<HTMLElement>('.skeleton');
        skeletons.forEach((s) => { s.remove(); });
        const content = asyncPanel.querySelector<HTMLElement>('#async-content');
        if (content) content.style.display = '';
        resolve();
      }, 300);
    });

    // テスト: aria-busy が false に戻っている
    if (asyncPanel.getAttribute('aria-busy') !== 'false') {
      throw new Error('[AsyncPanel] 完了後に aria-busy="false" になっていません');
    }

    console.log('✅ [AsyncPanel] 全テスト通過');
  },
};

// ─────────────────────────────────────────────────
// 統合例
// ─────────────────────────────────────────────────

/**
 * ページ内での統合例。
 *
 * ノートアプリのコンテキストで、タブコンポーネントがどのように機能するかを示します。
 */
export const IntegrationExample: Story = {
  render: () => html`
    <style>
      .page-demo {
        max-width: 600px;
        padding: 1.5rem;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
      }

      .page-header {
        margin-bottom: 1rem;
      }

      .page-title {
        margin: 0 0 0.25rem 0;
        font-size: var(--text-xl, 20px);
        font-weight: var(--font-semibold, 600);
      }

      .page-subtitle {
        margin: 0;
        color: var(--fg-muted, #666);
        font-size: var(--text-sm, 13px);
      }

      .content-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .content-item {
        padding: 0.75rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }

      .content-item-title {
        font-size: var(--text-base, 14px);
        font-weight: var(--font-medium, 500);
        margin: 0 0 0.25rem 0;
      }

      .content-item-meta {
        font-size: var(--text-sm, 13px);
        color: var(--fg-muted, #666);
        margin: 0;
      }

      .tag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0;
        margin: 0;
        list-style: none;
      }

      .tag-item {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        background: var(--bg-fill-muted, #eee);
        border-radius: 9999px;
        font-size: var(--text-sm, 13px);
      }
    </style>

    <div class="page-demo">
      <div class="page-header">
        <h2 class="page-title">プロジェクト管理</h2>
        <p class="page-subtitle">個人プロジェクトのノートと情報</p>
      </div>

      <ui-tabs selected-index="0">
        <button slot="tab">ノート</button>
        <div slot="panel">
          <div class="content-section">
            <div class="content-item">
              <p class="content-item-title">設計ドキュメント v2.0</p>
              <p class="content-item-meta">2026-02-15 更新</p>
            </div>
            <div class="content-item">
              <p class="content-item-title">API 仕様書</p>
              <p class="content-item-meta">2026-02-10 更新</p>
            </div>
            <div class="content-item">
              <p class="content-item-title">会議メモ 2026-02-05</p>
              <p class="content-item-meta">2026-02-05 更新</p>
            </div>
          </div>
        </div>

        <button slot="tab">タグ</button>
        <div slot="panel">
          <ul class="tag-list">
            <li class="tag-item">デザイン</li>
            <li class="tag-item">アーキテクチャ</li>
            <li class="tag-item">API</li>
            <li class="tag-item">ミーティング</li>
            <li class="tag-item">TDD</li>
            <li class="tag-item">アクセシビリティ</li>
          </ul>
        </div>
      </ui-tabs>
    </div>
  `,
};
