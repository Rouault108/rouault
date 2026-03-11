import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './dropdown';
import { type Dropdown } from './dropdown';

/**
 * ## ドロップダウンメニュー (Dropdown Menu)
 *
 * 値の入力ではなく、「アクション（操作）」や「ナビゲーション」の選択肢を提示するために使用します。
 * Ephemeral UI として、必要な瞬間に現れ、用が済めば消えます。
 *
 * ### デザイン哲学
 *
 * - **役割**: アクション・ナビゲーションの選択肢を提示（値入力ではない）
 * - **Ephemeral UI**: 必要な瞬間に現れ、用が済めば消える
 * - **Floating UI**: `@floating-ui/dom` による位置計算（flip / shift / offset）
 *
 * ### 使用方法
 *
 * ```html
 * <ui-dropdown>
 *   <ui-button slot="trigger">メニュー</ui-button>
 *   <ui-menu-item value="edit">編集</ui-menu-item>
 *   <ui-menu-item value="copy">コピー</ui-menu-item>
 *   <ui-menu-separator></ui-menu-separator>
 *   <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
 * </ui-dropdown>
 * ```
 *
 * ### キーボード操作（WAI-ARIA Menu Pattern準拠）
 *
 * | キー | 動作 |
 * |------|------|
 * | `Enter` / `Space` | メニューを開く / 項目を選択 |
 * | `ArrowDown` | 次の項目へ（循環）、disabled スキップ |
 * | `ArrowUp` | 前の項目へ（循環）、disabled スキップ |
 * | `Home` | 最初の項目へ |
 * | `End` | 最後の項目へ |
 * | `Escape` | メニューを閉じ、トリガーへフォーカス戻す |
 * | `Tab` | メニューを閉じ、次の要素へ（Focus Trap なし） |
 * | 文字キー | Type-ahead（1秒バッファ） |
 */
const meta: Meta<Dropdown> = {
  title: 'Components/Dropdown',
  component: 'ui-dropdown',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
ドロップダウンメニューコンポーネントは、アクションやナビゲーションの選択肢を Ephemeral UI として提示します。

## 構成要素

- \`<ui-dropdown>\`: コンテナ（Floating UI による位置計算）
- \`<ui-menu-item>\`: メニュー項目（variant="danger" で破壊的アクション）
- \`<ui-menu-separator>\`: セパレータ

## イベント

- \`menu-item-select\`: 項目選択時に発火。\`event.detail: { value: string, label: string }\`
        `,
      },
    },
  },
  argTypes: {
    opened: {
      control: 'boolean',
      description: '開閉状態（プログラム的に制御可能）',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom', 'bottom-end', 'top-start', 'top', 'top-end'],
      description: '出現方向（Floating UI準拠）',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'bottom-start' } },
    },
    align: {
      control: 'select',
      options: ['start', 'end', 'center'],
      description: 'トリガーに対する配置基準位置',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'start' } },
    },
    disabled: {
      control: 'boolean',
      description: 'トリガーボタンの操作無効化',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<Dropdown>;

// ──────────────────────────────────────────────
// 基本
// ──────────────────────────────────────────────

/**
 * デフォルトのドロップダウンメニュー。
 *
 * トリガーをクリックするとメニューが開きます。
 * `menu-item-select` イベントで選択値を受け取れます。
 */
export const Default: Story = {
  args: {
    opened: false,
    placement: 'bottom-start',
    align: 'start',
    disabled: false,
  },
  render: (args) => html`
    <div style="padding: 2rem;">
      <ui-dropdown
        id="default-dropdown"
        ?opened="${args.opened}"
        placement="${args.placement}"
        align="${args.align}"
        ?disabled="${args.disabled}"
        @menu-item-select="${(e: CustomEvent<{ value: string; label: string }>) => {
      console.log('menu-item-select:', e.detail);
    }}"
      >
        <button
          slot="trigger"
          style="
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 0 12px;
            height: 32px;
            border: 1px solid oklch(90% 0.01 250 / 0.3);
            border-radius: 6px;
            background: oklch(97% 0 0);
            cursor: pointer;
            font-size: 14px;
          "
        >
          メニューを開く
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
        <ui-menu-item value="share">共有</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#default-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    // テスト: 初期状態は閉じている
    if (dropdown.hasAttribute("opened")) throw new Error('初期状態でドロップダウンが閉じていることを期待していましたが、開いていました');

    // テスト: disabled でないこと
    if (dropdown.disabled) throw new Error('ドロップダウンが無効状態でないことを期待していましたが、無効でした');

    // テスト: placement のデフォルト値
    if (dropdown.placement !== 'bottom-start') {
      throw new Error(`placement="bottom-start" を期待していましたが、実際には "${dropdown.placement}" でした`);
    }

    // テスト: プログラム的に開く
    dropdown.open();
    await dropdown.updateComplete;
    if (!dropdown.hasAttribute("opened")) throw new Error('open() 実行後にドロップダウンが開いていることを期待していましたが、閉じていました');

    // テスト: プログラム的に閉じる
    dropdown.close();
    await dropdown.updateComplete;
    if (dropdown.hasAttribute("opened")) throw new Error('close() 実行後にドロップダウンが閉じていることを期待していましたが、開いていました');
  },
};

// ──────────────────────────────────────────────
// バリアント × 状態の組み合わせ
// ──────────────────────────────────────────────

/**
 * Default バリアント × 通常状態。
 *
 * 標準的なメニュー項目（テキストのみ）。
 */
export const DefaultVariantNormal: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="variant-normal-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          メニュー
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="new">新規作成</ui-menu-item>
        <ui-menu-item value="open">開く</ui-menu-item>
        <ui-menu-item value="save">保存</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#variant-normal-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    // テスト: 開いている
    if (!dropdown.hasAttribute("opened")) throw new Error('ドロップダウンが開いていることを期待していましたが、閉じていました');

    // テスト: パネルが存在する
    const panel = dropdown.shadowRoot?.querySelector('.panel');
    if (!panel) throw new Error('Shadow Root 内にパネル要素が見つかりませんでした');

    // テスト: role="menu" が設定されている
    if (panel.getAttribute('role') !== 'menu') {
      throw new Error(`role="menu" を期待していましたが、実際には "${panel.getAttribute('role') ?? 'null'}" でした`);
    }

    // テスト: メニュー項目が3つある
    const items = canvasElement.querySelectorAll('ui-menu-item');
    if (items.length !== 3) {
      throw new Error(`メニュー項目が 3 つあることを期待していましたが、実際には ${String(items.length)} つでした`);
    }
  },
};

/**
 * Danger バリアント × 通常状態。
 *
 * 破壊的アクション（削除、リセット等）に使用します。
 * 赤文字で警告し、ホバー時に背景が赤らみます。
 */
export const DangerVariantNormal: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="danger-variant-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          操作
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="archive">アーカイブ</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
        <ui-menu-item value="reset" variant="danger">リセット</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: ({ canvasElement }) => {
    const dangerItems = canvasElement.querySelectorAll('ui-menu-item[variant="danger"]');
    if (dangerItems.length !== 2) {
      throw new Error(`danger バリアントの項目が 2 つあることを期待していましたが、実際には ${String(dangerItems.length)} つでした`);
    }

    // テスト: danger バリアントの variant 属性
    dangerItems.forEach(item => {
      if (item.getAttribute('variant') !== 'danger') {
        throw new Error('variant="danger" を期待していましたが、異なりました');
      }
    });
  },
};

/**
 * Default バリアント × Disabled 状態。
 *
 * 個別の項目を disabled にした場合。
 * disabled 項目はスキップされ、フォーカスを受け取れません。
 */
export const DefaultVariantDisabledItem: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="disabled-item-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          操作
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy" disabled>コピー（無効）</ui-menu-item>
        <ui-menu-item value="paste">貼り付け</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const disabledItem = canvasElement.querySelector<HTMLElement>('ui-menu-item[disabled]');
    if (!disabledItem) throw new Error('無効化されたメニュー項目が見つかりませんでした');

    // テスト: disabled 属性が設定されている
    if (!disabledItem.hasAttribute('disabled')) {
      throw new Error('メニュー項目に disabled 属性があることを期待していましたが、ありませんでした');
    }

    // テスト: 内部ボタンが disabled
    await new Promise(resolve => setTimeout(resolve, 0));
    const button = disabledItem.shadowRoot?.querySelector('button');
    if (!button) throw new Error('Shadow Root 内に button 要素が見つかりませんでした');
    if (!button.disabled) throw new Error('ボタンが無効状態であることを期待していましたが、有効でした');

    // テスト: aria-disabled="true" が設定されている
    if (button.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`aria-disabled="true" を期待していましたが、実際には "${button.getAttribute('aria-disabled') ?? 'null'}" でした`);
    }
  },
};

/**
 * Danger バリアント × Disabled 状態。
 *
 * 破壊的アクションが一時的に無効な場合（例: 権限なし）。
 */
export const DangerVariantDisabledItem: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="danger-disabled-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          操作
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="view">詳細を見る</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger" disabled>削除（権限なし）</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dangerDisabledItem = canvasElement.querySelector<HTMLElement>('ui-menu-item[variant="danger"][disabled]');
    if (!dangerDisabledItem) throw new Error('無効化された danger バリアントのメニュー項目が見つかりませんでした');

    await new Promise(resolve => setTimeout(resolve, 0));
    const button = dangerDisabledItem.shadowRoot?.querySelector('button');
    if (!button) throw new Error('button 要素が見つかりませんでした');

    // テスト: disabled かつ danger
    if (!button.disabled) throw new Error('ボタンが無効状態であることを期待していましたが、有効でした');
    if (dangerDisabledItem.getAttribute('variant') !== 'danger') {
      throw new Error('variant="danger" を期待していましたが、異なりました');
    }
  },
};

// ──────────────────────────────────────────────
// Dropdown 自体の disabled 状態
// ──────────────────────────────────────────────

/**
 * Dropdown 全体の disabled 状態。
 *
 * トリガーボタン自体が操作不可になり、メニューは開きません。
 * `disabled` はトリガーに opacity と pointer-events: none を適用します。
 */
export const DropdownDisabled: Story = {
  args: { disabled: true },
  render: (args) => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="dropdown-disabled" ?disabled="${args.disabled}">
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          メニュー
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#dropdown-disabled');
    if (!dropdown) throw new Error('ui-dropdown が見つかりませんでした');
    await dropdown.updateComplete;

    // テスト: disabled 状態
    if (!dropdown.disabled) throw new Error('ドロップダウンが無効状態であることを期待していましたが、有効でした');

    // テスト: disabled 時は open() を呼んでも開かない
    dropdown.open();
    await dropdown.updateComplete;
    if (dropdown.hasAttribute("opened")) throw new Error('無効状態のドロップダウンは開かないはずですが、開いてしまいました');
  },
};

// ──────────────────────────────────────────────
// アイコン付き
// ──────────────────────────────────────────────

/**
 * アイコン付きメニュー項目。
 *
 * アイコンとテキストを組み合わせたメニュー項目。
 * アイコンは `var(--icon-base)` (16px) で統一されます。
 */
export const WithIcons: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="with-icons-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          ファイル
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="new">
          <iconify-icon icon="lucide:file-plus" style="font-size: 16px;"></iconify-icon>
          新規作成
        </ui-menu-item>
        <ui-menu-item value="open">
          <iconify-icon icon="lucide:folder-open" style="font-size: 16px;"></iconify-icon>
          開く
        </ui-menu-item>
        <ui-menu-item value="save">
          <iconify-icon icon="lucide:save" style="font-size: 16px;"></iconify-icon>
          保存
        </ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">
          <iconify-icon icon="lucide:trash-2" style="font-size: 16px;"></iconify-icon>
          削除
        </ui-menu-item>
      </ui-dropdown>
    </div>
  `,
};

// ──────────────────────────────────────────────
// セパレータ
// ──────────────────────────────────────────────

/**
 * セパレータによるグループ分け。
 *
 * 関連するアクションをグループ化し、視覚的に区切ります。
 * セパレータは `role="separator"` を持ちます。
 */
export const WithSeparators: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="with-separators-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          編集
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="cut">切り取り</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
        <ui-menu-item value="paste">貼り付け</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="select-all">すべて選択</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const separators = canvasElement.querySelectorAll('ui-menu-separator');
    if (separators.length !== 2) {
      throw new Error(`セパレータが2つあることを期待していましたが、実際には ${String(separators.length)} つでした`);
    }

    await new Promise(resolve => setTimeout(resolve, 0));

    // テスト: セパレータに role="separator" が設定されている
    for (const sep of separators) {
      const div = sep.shadowRoot?.querySelector('.separator');
      if (!div) throw new Error('セパレータの div 要素が見つかりませんでした');
      if (div.getAttribute('role') !== 'separator') {
        throw new Error(`role="separator" を期待していましたが、実際には "${div.getAttribute('role') ?? 'null'}" でした`);
      }
    }
  },
};

// ──────────────────────────────────────────────
// イベント
// ──────────────────────────────────────────────

/**
 * menu-item-select イベントの確認。
 *
 * 項目を選択すると `menu-item-select` イベントが発火します。
 * `event.detail: { value: string, label: string }` を確認できます。
 */
export const EventHandling: Story = {
  render: () => html`
    <div style="padding: 2rem; display: flex; flex-direction: column; gap: 1rem;">
      <ui-dropdown
        id="event-dropdown"
        @menu-item-select="${(e: CustomEvent<{ value: string; label: string }>) => {
      const log = document.getElementById('event-log');
      if (log) {
        log.textContent = `選択: value="${e.detail.value}", label="${e.detail.label}"`;
      }
    }}"
      >
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          操作を選択
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>

      <div
        id="event-log"
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0 0);
          border: 1px solid oklch(90% 0.01 250 / 0.2);
          border-radius: 6px;
          font-size: 13px;
          color: oklch(48% 0.01 250);
          min-height: 2.5rem;
        "
      >
        項目を選択するとここに表示されます
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#event-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    // プログラム的に開く
    dropdown.open();
    await dropdown.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 50));

    // 最初の項目を取得してクリック
    const firstItem = canvasElement.querySelector<HTMLElement>('ui-menu-item[value="edit"]');
    if (!firstItem) throw new Error('最初のメニュー項目が見つかりませんでした');

    const button = firstItem.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('メニュー項目内のボタンが見つかりませんでした');

    // イベントを Promise で受け取る（control flow analysis 問題を回避）
    const detailPromise = new Promise<Record<string, string>>(resolve => {
      dropdown.addEventListener('menu-item-select', (e) => {
        resolve((e as CustomEvent<Record<string, string>>).detail);
      }, { once: true });
    });

    button.click();
    const receivedDetail = await Promise.race([
      detailPromise,
      new Promise<null>(resolve => setTimeout(() => { resolve(null); }, 500)),
    ]);

    // テスト: イベントが発火した
    if (!receivedDetail) throw new Error('menu-item-select イベントが発火しませんでした');

    // テスト: detail.value が正しい
    if (receivedDetail['value'] !== 'edit') {
      throw new Error(`value="edit" を期待していましたが、実際には "${String(receivedDetail['value'])}" でした`);
    }

    // テスト: 選択後にメニューが閉じる
    if (dropdown.hasAttribute("opened")) throw new Error('項目選択後にドロップダウンが閉じることを期待していましたが、開いたままでした');
  },
};

// ──────────────────────────────────────────────
// キーボード操作
// ──────────────────────────────────────────────

/**
 * キーボード操作のデモ。
 *
 * WAI-ARIA Menu Pattern に準拠したキーボード操作を確認できます。
 * Tab キーでトリガーにフォーカスを当て、Enter/Space で開いてください。
 */
export const KeyboardNavigation: Story = {
  render: () => html`
    <div style="padding: 2rem; display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px;">
        <strong>操作方法</strong>:
        <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
          <li>Tab キーでトリガーにフォーカス</li>
          <li>Enter / Space / ↓ でメニューを開く</li>
          <li>↑↓ で項目を移動（disabled はスキップ）</li>
          <li>Home / End で先頭・末尾へ</li>
          <li>Enter / Space で選択</li>
          <li>Escape でメニューを閉じ、トリガーへ戻る</li>
          <li>Tab でメニューを閉じ、次の要素へ（Focus Trap なし）</li>
        </ul>
      </div>

      <ui-dropdown id="keyboard-dropdown">
        <button
          id="keyboard-trigger"
          slot="trigger"
          style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;"
        >
          キーボード操作
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="new">新規作成</ui-menu-item>
        <ui-menu-item value="copy" disabled>コピー（無効）</ui-menu-item>
        <ui-menu-item value="paste">貼り付け</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#keyboard-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    // テスト: プログラム的に開く
    dropdown.open();
    await dropdown.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 50));
    if (!dropdown.hasAttribute("opened")) throw new Error('ドロップダウンが開くことを期待していましたが、閉じたままでした');

    // テスト: Escape でメニューを閉じる
    const panel = dropdown.shadowRoot?.querySelector<HTMLElement>('.panel');
    if (!panel) throw new Error('パネル要素が見つかりませんでした');

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    await dropdown.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 50));
    if (dropdown.hasAttribute("opened")) throw new Error('Escape キー押下後にドロップダウンが閉じることを期待していましたが、開いたままでした');

    const trigger = canvasElement.querySelector<HTMLElement>('#keyboard-trigger');
    if (!trigger) throw new Error('トリガー要素が見つかりませんでした');
    const getFocusedValue = (): string | null => {
      const items = canvasElement.querySelectorAll<HTMLElement>('ui-menu-item');
      for (const item of items) {
        const active = item.shadowRoot?.activeElement;
        if (active instanceof HTMLButtonElement) {
          return item.getAttribute('value');
        }
      }
      return null;
    };

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await dropdown.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 50));
    if (!dropdown.hasAttribute('opened')) throw new Error('ArrowDown キー押下後にドロップダウンが開くことを期待していましたが、閉じたままでした');
    if (getFocusedValue() !== 'new') throw new Error('展開時に有効な最初の項目にフォーカスが当たることを期待していましたが、当たりませんでした');

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    if (getFocusedValue() !== 'paste') throw new Error('ArrowDown キーで無効な項目をスキップすることを期待していましたが、スキップされませんでした');

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    if (getFocusedValue() !== 'new') throw new Error('Home キーで最初の項目にフォーカスが移動することを期待していましたが、移動しませんでした');

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    if (getFocusedValue() !== 'delete') throw new Error('End キーで最後の項目にフォーカスが移動することを期待していましたが、移動しませんでした');

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, composed: true }));
    await dropdown.updateComplete;
    if (dropdown.hasAttribute('opened')) throw new Error('Tab キーでドロップダウンが閉じることを期待していましたが、開いたままでした');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await dropdown.updateComplete;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, composed: true }));
    await dropdown.updateComplete;
    if (dropdown.hasAttribute('opened')) throw new Error('Shift+Tab キーでドロップダウンが閉じることを期待していましたが、開いたままでした');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await dropdown.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 50));
    if (!dropdown.hasAttribute('opened')) throw new Error('ArrowUp キー押下後にドロップダウンが開くことを期待していましたが、閉じたままでした');
    if (getFocusedValue() !== 'delete') throw new Error('ArrowUp キーでの展開時に有効な最後の項目にフォーカスが当たることを期待していましたが、当たりませんでした');
  },
};

// ──────────────────────────────────────────────
// 境界条件
// ──────────────────────────────────────────────

/**
 * 全項目 disabled の境界条件。
 *
 * 全ての項目が disabled の場合、矢印キーで移動できる項目がありません。
 * メニューは開きますが、フォーカスは移動しません。
 */
export const AllItemsDisabled: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="all-disabled-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          操作
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="edit" disabled>編集（無効）</ui-menu-item>
        <ui-menu-item value="copy" disabled>コピー（無効）</ui-menu-item>
        <ui-menu-item value="delete" variant="danger" disabled>削除（無効）</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: 全項目が disabled の場合。矢印キーで移動できる項目がなく、メニューは開くが操作できません。',
      },
    },
  },
  play: ({ canvasElement }) => {
    const items = canvasElement.querySelectorAll('ui-menu-item');
    if (items.length !== 3) {
      throw new Error(`項目が3つあることを期待していましたが、実際には ${String(items.length)} つでした`);
    }

    // テスト: 全項目が disabled
    items.forEach(item => {
      if (!item.hasAttribute('disabled')) {
        throw new Error(`項目 "${item.getAttribute('value') ?? ''}" が無効であることを期待していましたが、有効でした`);
      }
    });
  },
};

/**
 * 単一項目のドロップダウン（最小構成）。
 *
 * 項目が1つだけの場合。ArrowDown/Up で循環しても同じ項目にフォーカスが戻ります。
 */
export const SingleItem: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="single-item-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          操作
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="confirm" variant="danger">実行して削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: '**境界条件**: 項目が1つだけの場合。ArrowDown/Up で循環しても同じ項目に戻ります。',
      },
    },
  },
  play: ({ canvasElement }) => {
    const items = canvasElement.querySelectorAll('ui-menu-item');
    if (items.length !== 1) {
      throw new Error(`項目が1つあることを期待していましたが、実際には ${String(items.length)} つでした`);
    }
  },
};

/**
 * 多数の項目（スクロール）。
 *
 * 10件を超える項目がある場合、パネルはスクロール可能になります。
 * `max-height: calc(var(--control-height-md) * 10)` = 320px。
 */
export const ManyItems: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="many-items-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          言語を選択
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        ${Array.from({ length: 15 }, (_, i) => html`
          <ui-menu-item value="lang-${String(i + 1)}">言語 ${String(i + 1)}</ui-menu-item>
        `)}
      </ui-dropdown>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: '**境界条件**: 10件超の項目がある場合。パネルは `max-height: 320px` でスクロール可能になります。',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const items = canvasElement.querySelectorAll('ui-menu-item');
    if (items.length !== 15) {
      throw new Error(`項目が15個あることを期待していましたが、実際には ${String(items.length)} 個でした`);
    }

    const dropdown = canvasElement.querySelector<Dropdown>('#many-items-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    // テスト: パネルが overflow-y: auto を持つ（スクロール可能）
    const panel = dropdown.shadowRoot?.querySelector<HTMLElement>('.panel');
    if (!panel) throw new Error('パネル要素が見つかりませんでした');
    const style = getComputedStyle(panel);
    if (style.overflowY !== 'auto') {
      throw new Error(`overflow-y: auto を期待していましたが、実際には "${style.overflowY}" でした`);
    }
  },
};

/**
 * 長いラベルの項目（最大幅制限）。
 *
 * `max-width: 280px` により、長いラベルでもレイアウト破壊を防ぎます。
 * テキストは `text-overflow: ellipsis` で省略されます。
 */
export const LongLabels: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="long-labels-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          操作
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="short">短いラベル</ui-menu-item>
        <ui-menu-item value="long">非常に長いラベルのメニュー項目がここに表示されます（最大280px）</ui-menu-item>
        <ui-menu-item value="danger-long" variant="danger">破壊的アクション：この操作は元に戻せません</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: '**境界条件**: 長いラベルの場合。`max-width: 280px` でレイアウト破壊を防ぎます。',
      },
    },
  },
};

/**
 * プログラム的な opened 制御。
 *
 * `opened` プロパティを直接操作してメニューを開閉できます。
 * 外部コントローラーからの制御が必要な場合に使用します。
 */
export const ProgrammaticControl: Story = {
  render: () => html`
    <div style="padding: 2rem; display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; gap: 0.5rem;">
        <button
          id="open-btn"
          style="padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;"
          @click="${() => {
      const dd = document.getElementById('programmatic-dropdown') as Dropdown | null;
      dd?.open();
    }}"
        >
          開く
        </button>
        <button
          id="close-btn"
          style="padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;"
          @click="${() => {
      const dd = document.getElementById('programmatic-dropdown') as Dropdown | null;
      dd?.close();
    }}"
        >
          閉じる
        </button>
        <button
          id="toggle-btn"
          style="padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;"
          @click="${() => {
      const dd = document.getElementById('programmatic-dropdown') as Dropdown | null;
      dd?.toggle();
    }}"
        >
          トグル
        </button>
      </div>

      <ui-dropdown id="programmatic-dropdown">
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          メニュー
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#programmatic-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    // テスト: open()
    dropdown.open();
    await dropdown.updateComplete;
    if (!dropdown.hasAttribute("opened")) throw new Error('open() 実行後に opened=true になることを期待していましたが、false でした');

    // テスト: close()
    dropdown.close();
    await dropdown.updateComplete;
    if (dropdown.hasAttribute("opened")) throw new Error('close() 実行後に opened=false になることを期待していましたが、true でした');

    // テスト: toggle() × 2
    dropdown.toggle();
    await dropdown.updateComplete;
    if (!dropdown.hasAttribute("opened")) throw new Error('toggle() 実行後に opened=true になることを期待していましたが、false でした');

    dropdown.toggle();
    await dropdown.updateComplete;
    if (dropdown.hasAttribute("opened")) throw new Error('2 回目の toggle() 実行後に opened=false になることを期待していましたが、true でした');

    // テスト: 重複 open() は無視される
    dropdown.open();
    dropdown.open(); // 2回目は無視
    await dropdown.updateComplete;
    if (!dropdown.hasAttribute("opened")) throw new Error('opened=true であることを期待していましたが、false でした');

    // テスト: 重複 close() は無視される
    dropdown.close();
    dropdown.close(); // 2回目は無視
    await dropdown.updateComplete;
    if (dropdown.hasAttribute("opened")) throw new Error('opened=false であることを期待していましたが、true でした');
  },
};

// ──────────────────────────────────────────────
// ARIA / アクセシビリティ
// ──────────────────────────────────────────────

/**
 * ARIA 属性の確認。
 *
 * WAI-ARIA Menu Pattern に準拠した ARIA 属性を確認します。
 * - トリガー: `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`
 * - パネル: `role="menu"`, `aria-labelledby`
 * - 項目: `role="menuitem"`, `tabindex="-1"`
 */
export const AriaAttributes: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="aria-dropdown">
        <button id="aria-trigger" slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          メニュー
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#aria-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    const trigger = canvasElement.querySelector<HTMLElement>('#aria-trigger');
    if (!trigger) throw new Error('トリガー要素が見つかりませんでした');

    // テスト: トリガーに aria-haspopup="menu" が設定されている
    if (trigger.getAttribute('aria-haspopup') !== 'menu') {
      throw new Error(`aria-haspopup="menu" を期待していましたが、実際には "${trigger.getAttribute('aria-haspopup') ?? 'null'}" でした`);
    }

    // テスト: 閉じている時は aria-expanded="false"
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error(`aria-expanded="false" を期待していましたが、実際には "${trigger.getAttribute('aria-expanded') ?? 'null'}" でした`);
    }

    // テスト: aria-controls が設定されている
    const controls = trigger.getAttribute('aria-controls');
    if (!controls) throw new Error('トリガーに aria-controls が設定されていることを期待していましたが、設定されていませんでした');

    // テスト: パネルに role="menu" が設定されている
    const panel = dropdown.shadowRoot?.querySelector('.panel');
    if (!panel) throw new Error('パネル要素が見つかりませんでした');
    if (panel.getAttribute('role') !== 'menu') {
      throw new Error(`Expected role="menu", got "${panel.getAttribute('role') ?? 'null'}"`);
    }

    // テスト: パネルの id が aria-controls と一致する
    if (panel.id !== controls) {
      throw new Error(`パネルの id が "${controls}" であることを期待していましたが、実際には "${panel.id}" でした`);
    }

    // テスト: 開いた時は aria-expanded="true"
    dropdown.open();
    await dropdown.updateComplete;
    await new Promise(resolve => setTimeout(resolve, 50));
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error(`展開時に aria-expanded="true" になることを期待していましたが、実際には "${trigger.getAttribute('aria-expanded') ?? 'null'}" でした`);
    }

    // テスト: メニュー項目に role="menuitem" が設定されている
    const items = canvasElement.querySelectorAll('ui-menu-item');
    await new Promise(resolve => setTimeout(resolve, 0));
    for (const item of items) {
      const btn = item.shadowRoot?.querySelector('button');
      if (!btn) throw new Error('メニュー項目にボタンが見つかりませんでした');
      if (btn.getAttribute('role') !== 'menuitem') {
        throw new Error(`role="menuitem" を期待していましたが、実際には "${btn.getAttribute('role') ?? 'null'}" でした`);
      }
      // テスト: tabindex="-1" (Roving Tabindex)
      if (btn.getAttribute('tabindex') !== '-1') {
        throw new Error(`tabindex="-1" を期待していましたが、実際には "${btn.getAttribute('tabindex') ?? 'null'}" でした`);
      }
    }
  },
};

// ──────────────────────────────────────────────
// Placement
// ──────────────────────────────────────────────

/**
 * 上方向への展開（top-start）。
 *
 * 画面下部に配置されたトリガーでは、Floating UI の flip() により
 * 自動的に上方向へ展開します。`placement="top-start"` で明示的に指定も可能です。
 */
export const PlacementTop: Story = {
  args: { placement: 'top-start' },
  render: (args) => html`
    <div style="padding: 2rem; padding-top: 10rem;">
      <ui-dropdown id="placement-top-dropdown" placement="${args.placement}" opened>
        <button slot="trigger" style="padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          上方向に展開 ▴
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#placement-top-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    if (dropdown.placement !== 'top-start') {
      throw new Error(`placement="top-start" を期待していましたが、実際には "${dropdown.placement}" でした`);
    }
  },
};

// ──────────────────────────────────────────────
// 実際の使用例
// ──────────────────────────────────────────────

/**
 * コンテキストメニューの使用例。
 *
 * テーブル行やカードの「…」ボタンに配置するパターン。
 */
export const ContextMenuExample: Story = {
  render: () => html`
    <style>
      .table-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        background: oklch(100% 0 0);
        border: 1px solid oklch(90% 0.01 250 / 0.2);
        border-radius: 6px;
        max-width: 480px;
      }
      .table-row-name {
        flex: 1;
        font-size: 14px;
      }
      .table-row-status {
        font-size: 13px;
        color: oklch(48% 0.01 250);
      }
    </style>

    <div style="padding: 2rem; display: flex; flex-direction: column; gap: 0.5rem;">
      ${['山田 太郎', '鈴木 花子', '田中 一郎'].map((name, i) => html`
        <div class="table-row">
          <span class="table-row-name">${name}</span>
          <span class="table-row-status">アクティブ</span>
          <ui-dropdown>
            <button
              slot="trigger"
              aria-label="${name} の操作メニュー"
              style="
                width: 32px; height: 32px;
                border: none; border-radius: 6px;
                background: transparent; cursor: pointer;
                font-size: 16px; display: flex; align-items: center; justify-content: center;
              "
            >
              ⋯
            </button>
            <ui-menu-item value="view-${String(i)}">詳細を見る</ui-menu-item>
            <ui-menu-item value="edit-${String(i)}">編集</ui-menu-item>
            <ui-menu-separator></ui-menu-separator>
            <ui-menu-item value="delete-${String(i)}" variant="danger">削除</ui-menu-item>
          </ui-dropdown>
        </div>
      `)}
    </div>
  `,
};

/**
 * ナビゲーションメニューの使用例。
 *
 * ヘッダーナビゲーションのドロップダウンパターン。
 */
export const NavigationExample: Story = {
  render: () => html`
    <style>
      .nav-bar {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.5rem 1rem;
        background: oklch(20% 0.01 250);
        border-radius: 6px;
      }
      .nav-logo {
        font-size: 14px;
        font-weight: 600;
        color: oklch(100% 0 0);
        margin-right: 1rem;
      }
    </style>

    <div style="padding: 2rem;">
      <nav class="nav-bar">
        <span class="nav-logo">MyApp</span>

        <ui-dropdown>
          <button
            slot="trigger"
            style="
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 0 12px; height: 28px;
              border: none; border-radius: 4px;
              background: transparent; color: oklch(85% 0 0);
              cursor: pointer; font-size: 13px;
            "
          >
            ファイル
            <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
          </button>
          <ui-menu-item value="new">新規作成</ui-menu-item>
          <ui-menu-item value="open">開く</ui-menu-item>
          <ui-menu-item value="save">保存</ui-menu-item>
          <ui-menu-separator></ui-menu-separator>
          <ui-menu-item value="export">エクスポート</ui-menu-item>
        </ui-dropdown>

        <ui-dropdown>
          <button
            slot="trigger"
            style="
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 0 12px; height: 28px;
              border: none; border-radius: 4px;
              background: transparent; color: oklch(85% 0 0);
              cursor: pointer; font-size: 13px;
            "
          >
            編集
            <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
          </button>
          <ui-menu-item value="undo">元に戻す</ui-menu-item>
          <ui-menu-item value="redo">やり直す</ui-menu-item>
          <ui-menu-separator></ui-menu-separator>
          <ui-menu-item value="cut">切り取り</ui-menu-item>
          <ui-menu-item value="copy">コピー</ui-menu-item>
          <ui-menu-item value="paste">貼り付け</ui-menu-item>
        </ui-dropdown>
      </nav>
    </div>
  `,
};

// ──────────────────────────────────────────────
// アクセシビリティ環境
// ──────────────────────────────────────────────

/**
 * Forced Colors Mode での表示確認。
 *
 * Windows の高コントラストモードなど、強制カラーモード環境での表示を確認します。
 * ボーダーとシステムカラーにより構造が明確化されます。
 */
export const ForcedColorsMode: Story = {
  render: () => html`
    <div style="padding: 1rem; background: oklch(97% 0 0); border-radius: 6px; font-size: 13px; margin-bottom: 1rem;">
      <strong>確認方法</strong>:
      Chrome DevTools &gt; Rendering &gt; Emulate CSS media feature forced-colors: active
    </div>

    <div style="padding: 2rem;">
      <ui-dropdown id="forced-colors-dropdown" opened>
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          操作
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="edit">編集（Default）</ui-menu-item>
        <ui-menu-item value="copy" disabled>コピー（Disabled）</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除（Danger）</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#forced-colors-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;
    if (!dropdown.hasAttribute('opened')) throw new Error('強制カラーモードのドロップダウンが開いていることを期待していましたが、閉じていました');
  },
  parameters: {
    docs: {
      description: {
        story: 'Forced Colors Mode での表示確認。破壊的アクション（Danger）はアウトラインで識別可能にします。',
      },
    },
  },
};

/**
 * Reduced Motion での表示確認。
 *
 * `prefers-reduced-motion` 環境下では、開閉アニメーションが即座に適用されます。
 */
export const ReducedMotion: Story = {
  render: () => html`
    <div style="padding: 1rem; background: oklch(97% 0 0); border-radius: 6px; font-size: 13px; margin-bottom: 1rem;">
      <strong>確認方法</strong>: macOS: システム設定 &gt; アクセシビリティ &gt; ディスプレイ &gt; 視差効果を減らす
    </div>

    <div style="padding: 2rem;">
      <ui-dropdown id="reduced-motion-dropdown">
        <button slot="trigger" style="display: inline-flex; align-items: center; gap: 4px; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          メニュー
          <iconify-icon icon="lucide:chevron-down" aria-hidden="true" style="width: 14px; height: 14px;"></iconify-icon>
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#reduced-motion-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    dropdown.open();
    await dropdown.updateComplete;
    if (!dropdown.hasAttribute('opened')) throw new Error('ドロップダウンが開くことを期待していましたが、閉じたままでした');

    dropdown.close();
    await dropdown.updateComplete;
    if (dropdown.hasAttribute('opened')) throw new Error('ドロップダウンが閉じることを期待していましたが、開いたままでした');
  },
  parameters: {
    docs: {
      description: {
        story: 'prefers-reduced-motion 環境下では、開閉アニメーションが即座に適用されます（実質的に瞬時）。',
      },
    },
  },
};

export const ClickOutsideClose: Story = {
  render: () => html`
    <div style="padding: 2rem; display: flex; gap: 1rem;">
      <ui-dropdown id="outside-close-dropdown" opened>
        <button slot="trigger" style="padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          メニュー
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
      <button id="outside-target" style="height: 32px;">外側</button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#outside-close-dropdown');
    const outside = canvasElement.querySelector<HTMLElement>('#outside-target');
    if (!dropdown || !outside) throw new Error('必要な要素が見つかりませんでした');
    await dropdown.updateComplete;

    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await dropdown.updateComplete;
    if (dropdown.hasAttribute('opened')) throw new Error('外側をクリックした際にドロップダウンが閉じることを期待していましたが、開いたままでした');
  },
};

export const ScrollClose: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="scroll-close-dropdown" opened>
        <button slot="trigger" style="padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          メニュー
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#scroll-close-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    window.dispatchEvent(new Event('scroll'));
    await dropdown.updateComplete;
    if (dropdown.hasAttribute('opened')) throw new Error('スクロール時にドロップダウンが閉じることを期待していましたが、開いたままでした');
  },
};

export const TypeaheadNavigation: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="typeahead-dropdown" opened>
        <button slot="trigger" style="padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          メニュー
        </button>
        <ui-menu-item value="copy">Copy</ui-menu-item>
        <ui-menu-item value="commit">Commit</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">Delete</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#typeahead-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    const panel = dropdown.shadowRoot?.querySelector<HTMLElement>('.panel');
    if (!panel) throw new Error('パネル要素が見つかりませんでした');

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true, composed: true }));
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true, composed: true }));
    await new Promise(resolve => setTimeout(resolve, 0));

    const items = canvasElement.querySelectorAll<HTMLElement>('ui-menu-item');
    const focused = Array.from(items).find(item => item.shadowRoot?.activeElement instanceof HTMLButtonElement);
    if (focused?.getAttribute('value') !== 'copy') {
      throw new Error('Type-ahead "co" で copy にフォーカスが当たることを期待していましたが、当たりませんでした');
    }
  },
};

export const NonButtonTriggerAria: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="non-button-trigger-dropdown" disabled>
        <span slot="trigger" id="non-button-trigger" style="display: inline-flex; align-items: center; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px;">
          トリガー
        </span>
        <ui-menu-item value="edit">編集</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('#non-button-trigger');
    if (!trigger) throw new Error('トリガー要素が見つかりませんでした');
    if (trigger.getAttribute('role') !== 'button') throw new Error('ボタン以外のトリガーに role="button" が設定されていることを期待していましたが、設定されていませんでした');
    if (trigger.getAttribute('aria-disabled') !== 'true') throw new Error('aria-disabled="true" を期待していましたが、設定されていませんでした');
  },
};

export const DarkModeSurface: Story = {
  render: () => html`
    <div style="padding: 2rem; background: oklch(20% 0.01 250); border-radius: 8px;">
      <ui-dropdown id="dark-mode-dropdown" opened>
        <button slot="trigger" style="padding: 0 12px; height: 32px; border: 1px solid oklch(100% 0 0 / 0.2); border-radius: 6px; background: oklch(30% 0.01 250); color: oklch(95% 0 0); cursor: pointer;">
          メニュー
        </button>
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story: 'ダーク背景上でのパネル可読性とコントラスト確認用ストーリーです。',
      },
    },
  },
};

export const EmptyMenu: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="empty-menu-dropdown" opened>
        <button slot="trigger" style="padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer;">
          空メニュー
        </button>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#empty-menu-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;
    if (!dropdown.hasAttribute('opened')) throw new Error('opened=true であることを期待していましたが、false でした');
  },
};
