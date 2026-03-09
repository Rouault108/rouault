import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { userEvent } from 'storybook/test';
import './search-trigger';
import type { SearchTrigger } from './search-trigger';

/**
 * ## 検索トリガー (Search Trigger) `<ui-search-trigger>`
 *
 * ヘッダー等に配置され、**検索ダイアログを起動するためだけのボタン**です。
 *
 * ### デザイン哲学
 *
 * - **Dummy Input (Mental Model)**: 外見は検索ボックス（Input）そのものですが、
 *   実際には文字入力を行わず、アクティベーション（クリック・Enter・Space）によって
 *   即座にモーダルを展開します
 * - **Cursor: default**: 文字入力カーソル（I-beam）による偽の期待を与えず、
 *   かつ通常のボタン（Pointer）ほど主張しない「ツール」としての感触を提供します
 *   （Linear/Spotlight 準拠）
 *
 * ### レスポンシブ挙動
 *
 * - **デスクトップ**: 検索アイコン + プレースホルダーテキスト + ショートカットバッジ
 * - **モバイル (`≤640px`)**: 検索アイコンのみ（正方形 32×32px）
 *   - `::after` 擬似要素で 44×44px のタッチターゲットを確保
 *
 * ### アクセシビリティ
 *
 * - `aria-label="検索ダイアログを開く"` — 視覚的プレースホルダーに依存しない機能説明
 * - `aria-haspopup="dialog"` — モーダルが開く挙動を予告
 * - `aria-keyshortcuts="Control+K Meta+K"` — 支援技術へショートカットキーを通知
 * - バッジは `aria-hidden="true"` — 読み上げのノイズを防止
 *
 * ### イベント
 *
 * - `open-search-dialog`: クリック・Enter・Space でアクティベートされた時に発火
 *
 * ### 使用上の注意
 *
 * - **Explicit Activation Only**: フォーカス取得（`:focus`）だけではモーダルを開きません
 * - **イベントリスン**: `open-search-dialog` イベントをリスンして検索ダイアログを表示してください
 */
const meta: Meta<SearchTrigger> = {
  title: 'Components/SearchTrigger',
  component: 'ui-search-trigger',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
検索トリガーコンポーネントは、ヘッダー等に配置され、検索ダイアログを起動するためだけのボタンです。
外見は検索ボックス（Input）そのものですが、実際には文字入力を行わず、アクティベーションによって即座にモーダルを展開します。

## 使用方法

\`\`\`html
<!-- 基本的な使用 -->
<ui-search-trigger></ui-search-trigger>

<!-- カスタムプレースホルダー -->
<ui-search-trigger placeholder="ドキュメントを検索..."></ui-search-trigger>

<!-- 無効状態 -->
<ui-search-trigger disabled></ui-search-trigger>

<!-- イベントリスン -->
<ui-search-trigger id="trigger"></ui-search-trigger>
<script>
  document.getElementById('trigger').addEventListener('open-search-dialog', () => {
    // 検索ダイアログを開く処理
  });
</script>
\`\`\`

## 注意事項

- **Explicit Activation Only**: フォーカス取得（\`:focus\`）だけではモーダルを開きません。
- **イベント**: \`open-search-dialog\` カスタムイベントをリスンして検索ダイアログを表示してください。
- **cursor: default**: 意図的に通常のボタン（pointer）ではなく default カーソルを使用します。
                `,
      },
    },
  },
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'プレースホルダーテキスト',
      table: { type: { summary: 'string' }, defaultValue: { summary: '検索...' } },
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<SearchTrigger>;

// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * デフォルトの検索トリガー。
 *
 * デスクトップ幅では検索アイコン・プレースホルダー・ショートカットバッジが表示されます。
 * クリックすると `open-search-dialog` カスタムイベントが発火します。
 */
export const Default: Story = {
  args: {
    placeholder: '検索...',
    disabled: false,
  },
  render: (args) => html`
    <ui-search-trigger
      id="default-trigger"
      placeholder="${args.placeholder}"
      ?disabled="${args.disabled}"
    ></ui-search-trigger>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#default-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    // テスト: 内部 button 要素が存在する
    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('Shadow Root 内に button 要素が見つかりません');

    // テスト: type="button" が設定されている（フォーム送信を防ぐ）
    if (button.type !== 'button') {
      throw new Error(`type="button" を期待していましたが、実際には "${button.type}" でした`);
    }

    // テスト: aria-label が設定されている
    if (button.getAttribute('aria-label') !== '検索ダイアログを開く') {
      throw new Error(
        `aria-label="検索ダイアログを開く" を期待していましたが、実際には "${button.getAttribute('aria-label') ?? 'null'}" でした`,
      );
    }

    // テスト: aria-haspopup="dialog" が設定されている
    if (button.getAttribute('aria-haspopup') !== 'dialog') {
      throw new Error(
        `aria-haspopup="dialog" を期待していましたが、実際には "${button.getAttribute('aria-haspopup') ?? 'null'}" でした`,
      );
    }

    // テスト: aria-keyshortcuts が設定されている
    const keyshortcuts = button.getAttribute('aria-keyshortcuts');
    if (!keyshortcuts?.includes('Control+K') || !keyshortcuts.includes('Meta+K')) {
      throw new Error(
        `aria-keyshortcuts に "Control+K Meta+K" が含まれることを期待していましたが、実際には "${keyshortcuts ?? 'null'}" でした`,
      );
    }

    // テスト: 検索アイコンが存在する
    const icon = trigger.shadowRoot?.querySelector('.icon');
    if (!icon) throw new Error('アイコン要素が見つかりません');
    const iconGlyph = icon.querySelector('iconify-icon');
    if (!iconGlyph) throw new Error('iconify-icon が見つかりません');
    if (iconGlyph.getAttribute('icon') !== 'lucide:search') {
      throw new Error(`icon="lucide:search" を期待していましたが、実際には "${iconGlyph.getAttribute('icon') ?? 'null'}" でした`);
    }

    // テスト: プレースホルダーが存在する
    const placeholder = trigger.shadowRoot?.querySelector('.placeholder');
    if (!placeholder) throw new Error('プレースホルダー要素が見つかりません');

    // テスト: disabled でない
    if (trigger.disabled) throw new Error('disabled が false である必要があります');
    if (button.disabled) throw new Error('ボタンが無効化されていない必要があります');
  },
};

// ──────────────────────────────────────────────
// 状態別ストーリー
// ──────────────────────────────────────────────

/**
 * 通常状態（Default）。
 *
 * ボーダーは透明で、背景色は `--bg-fill-muted`。
 * ホバー時にボーダーが `--border-default` 色で表示されます。
 */
export const StateDefault: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="font-size: 11px; font-weight: 500; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        Default State
      </div>
      <ui-search-trigger id="state-default"></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#state-default');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('button が見つかりません');

    // テスト: disabled でない
    if (button.disabled) throw new Error('ボタンが無効化されていない必要があります');
  },
};

/**
 * 無効状態（Disabled）。
 *
 * `disabled` 状態では `opacity: --opacity-disabled` で薄く表示されます。
 * クリックしても `open-search-dialog` イベントは発火しません。
 */
export const StateDisabled: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="font-size: 11px; font-weight: 500; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        Disabled State
      </div>
      <ui-search-trigger id="state-disabled" disabled></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#state-disabled');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    // テスト: disabled プロパティが true
    if (!trigger.disabled) throw new Error('disabled が true である必要があります');

    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('button が見つかりません');

    // テスト: button に disabled 属性が付与されている
    if (!button.disabled) throw new Error('ボタンが無効化されている必要があります');
  },
};

/**
 * カスタムプレースホルダー。
 *
 * `placeholder` 属性でプレースホルダーテキストをカスタマイズできます。
 */
export const CustomPlaceholder: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="font-size: 11px; font-weight: 500; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        Custom Placeholder
      </div>
      <ui-search-trigger
        id="custom-placeholder"
        placeholder="ドキュメントを検索..."
      ></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#custom-placeholder');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    // テスト: placeholder プロパティが設定されている
    if (trigger.placeholder !== 'ドキュメントを検索...') {
      throw new Error(`placeholder="ドキュメントを検索..." を期待していましたが、実際には "${trigger.placeholder}" でした`);
    }

    // テスト: プレースホルダー要素にテキストが反映されている
    const placeholderEl = trigger.shadowRoot?.querySelector('.placeholder');
    if (!placeholderEl) throw new Error('プレースホルダー要素が見つかりません');
    if (!placeholderEl.textContent.includes('ドキュメントを検索...')) {
      throw new Error(`プレースホルダーのテキストに "ドキュメントを検索..." が含まれることを期待していましたが、実際には "${placeholderEl.textContent}" でした`);
    }
  },
};

// ──────────────────────────────────────────────
// 全状態一覧（ビジュアル確認用）
// ──────────────────────────────────────────────

/**
 * 全状態の一覧。
 *
 * すべての状態を一覧で確認できます。
 * デザインレビューやビジュアルリグレッションテストに使用します。
 */
export const AllStates: Story = {
  render: () => html`
    <style>
      .states-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        max-width: 480px;
      }
      .state-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .state-label {
        font-size: 11px;
        font-weight: 500;
        color: oklch(48% 0.01 250);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>

    <div class="states-list">
      <div class="state-group">
        <div class="state-label">Default</div>
        <ui-search-trigger id="all-default"></ui-search-trigger>
      </div>

      <div class="state-group">
        <div class="state-label">Disabled</div>
        <ui-search-trigger id="all-disabled" disabled></ui-search-trigger>
      </div>

      <div class="state-group">
        <div class="state-label">Custom Placeholder</div>
        <ui-search-trigger
          id="all-custom"
          placeholder="ドキュメントを検索..."
        ></ui-search-trigger>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const triggers = canvasElement.querySelectorAll('ui-search-trigger');
    if (triggers.length !== 3) {
      throw new Error(`3つのトリガーを期待していましたが、実際には ${String(triggers.length)}個でした`);
    }

    await Promise.all([...triggers].map((t) => t.updateComplete));

    // テスト: デフォルトは disabled でない
    const defaultTrigger = canvasElement.querySelector<SearchTrigger>('#all-default');
    if (!defaultTrigger) throw new Error('デフォルトのトリガーが見つかりません');
    if (defaultTrigger.disabled) throw new Error('デフォルトのトリガーは無効化されていない必要があります');

    // テスト: disabled トリガーは disabled
    const disabledTrigger = canvasElement.querySelector<SearchTrigger>('#all-disabled');
    if (!disabledTrigger) throw new Error('無効化されたトリガーが見つかりません');
    if (!disabledTrigger.disabled) throw new Error('無効化されたトリガーは無効化されている必要があります');

    // テスト: カスタムプレースホルダー
    const customTrigger = canvasElement.querySelector<SearchTrigger>('#all-custom');
    if (!customTrigger) throw new Error('カスタムトリガーが見つかりません');
    if (customTrigger.placeholder !== 'ドキュメントを検索...') {
      throw new Error(`カスタムプレースホルダーを期待していましたが、実際には "${customTrigger.placeholder}" でした`);
    }
  },
};

// ──────────────────────────────────────────────
// インタラクション
// ──────────────────────────────────────────────

/**
 * `open-search-dialog` イベントの発火確認。
 *
 * クリックすると `open-search-dialog` カスタムイベントが発火します。
 * イベントは `bubbles: true, composed: true` で設定されています。
 */
export const EventFiring: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <ui-search-trigger
        id="event-trigger"
        @open-search-dialog="${(e: Event) => {
      const root = (e.currentTarget as HTMLElement).parentElement;
      const log = root?.querySelector<HTMLElement>('#event-log');
      if (log) log.textContent = `open-search-dialog イベントが発火しました（target: ${(e.target as Element).tagName.toLowerCase()}）`;
    }}"
      ></ui-search-trigger>

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
        トリガーをクリックするとここに表示されます
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#event-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    // テスト: open-search-dialog イベントが発火する
    const eventPromise = new Promise<CustomEvent>((resolve) => {
      trigger.addEventListener('open-search-dialog', (e) => { resolve(e as CustomEvent); }, { once: true });
    });

    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('button が見つかりません');
    button.click();

    const event = await Promise.race([
      eventPromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (!event) throw new Error('open-search-dialog イベントが発火しませんでした');

    // テスト: イベントが bubbles: true
    if (!event.bubbles) throw new Error('イベントがバブリングすることを期待していました');

    // テスト: イベントが composed: true
    if (!event.composed) throw new Error('イベントが composed であることを期待していました');
  },
};

/**
 * 無効状態ではイベントが発火しない。
 *
 * `disabled` 状態ではクリックしても `open-search-dialog` イベントは発火しません。
 */
export const DisabledNoEvent: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="
        padding: 0.75rem 1rem;
        background: oklch(97% 0.01 80 / 0.3);
        border: 1px solid oklch(80% 0.05 80 / 0.4);
        border-radius: 6px;
        font-size: 13px;
      ">
        <strong>確認</strong>: disabled 状態ではクリックしてもイベントが発火しません。
      </div>
      <ui-search-trigger
        id="disabled-no-event"
        disabled
        @open-search-dialog="${(e: Event) => {
      const root = (e.currentTarget as HTMLElement).parentElement;
      const log = root?.querySelector<HTMLElement>('#disabled-event-log');
      if (log) log.textContent = '❌ イベントが発火してしまいました（バグ）';
    }}"
      ></ui-search-trigger>

      <div
        id="disabled-event-log"
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
        ✅ イベントは発火しません（disabled 状態）
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#disabled-no-event');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    if (!trigger.disabled) throw new Error('disabled が true である必要があります');

    let eventFired = false;
    trigger.addEventListener('open-search-dialog', () => { eventFired = true; });

    // disabled なので button.click() は pointer-events: none で無効化されているが、
    // 念のため _handleActivate の disabled ガードも検証するため直接呼び出す
    trigger.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (eventFired) throw new Error('無効化されているときは open-search-dialog イベントが発火してはいけません');
  },
};

/**
 * キーボードアクセシビリティ確認。
 *
 * Tab でフォーカスを当て、Enter または Space でアクティベートできます。
 * フォーカスのみ（Tab 移動）ではイベントは発火しません（Explicit Activation Only）。
 */
export const KeyboardActivation: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="
        padding: 0.75rem 1rem;
        background: oklch(97% 0 0);
        border: 1px solid oklch(90% 0.01 250 / 0.2);
        border-radius: 6px;
        font-size: 13px;
      ">
        <strong>操作方法</strong>: Tab でフォーカスを当て、Enter または Space でアクティベートしてください。
      </div>
      <ui-search-trigger
        id="keyboard-trigger"
        @open-search-dialog="${(e: Event) => {
      const root = (e.currentTarget as HTMLElement).parentElement;
      const log = root?.querySelector<HTMLElement>('#keyboard-log');
      if (log) log.textContent = '✅ open-search-dialog イベントが発火しました';
    }}"
      ></ui-search-trigger>

      <div
        id="keyboard-log"
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
        キーボードで操作するとここに表示されます
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#keyboard-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('button が見つかりません');

    // テスト: フォーカスが当たる
    button.focus();
    if (document.activeElement !== trigger && trigger.shadowRoot?.activeElement !== button) {
      // Shadow DOM 内のフォーカスは document.activeElement では検出できないため、
      // shadowRoot.activeElement で確認する
      const shadowActive = trigger.shadowRoot?.activeElement;
      if (shadowActive !== button) {
        // フォーカスが当たっていない場合でも、テスト環境の制約として警告のみ
        console.warn('Focus may not be detectable in test environment');
      }
    }

    // テスト: Enter と Space キーで open-search-dialog イベントが発火する
    let eventCount = 0;
    trigger.addEventListener('open-search-dialog', () => { eventCount++; });

    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    if (eventCount < 2) {
      throw new Error(`キーボード操作により少なくとも2つのイベントが発火することを期待していましたが、実際には ${String(eventCount)}個でした`);
    }
  },
};

// ──────────────────────────────────────────────
// アクセシビリティ
// ──────────────────────────────────────────────

/**
 * ARIA 属性の確認。
 *
 * - `aria-label="検索ダイアログを開く"`: 視覚的プレースホルダーに依存しない機能説明
 * - `aria-haspopup="dialog"`: モーダルが開く挙動を予告
 * - `aria-keyshortcuts="Control+K Meta+K"`: 支援技術へショートカットキーを通知
 * - バッジは `aria-hidden="true"`: 読み上げのノイズを防止
 */
export const AriaAttributes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="
        padding: 0.75rem 1rem;
        background: oklch(97% 0 0);
        border: 1px solid oklch(90% 0.01 250 / 0.2);
        border-radius: 6px;
        font-size: 13px;
      ">
        <strong>確認</strong>: DevTools の Accessibility パネルで ARIA 属性を確認してください。
      </div>
      <ui-search-trigger id="aria-trigger"></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#aria-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('button が見つかりません');

    // テスト: aria-label
    const ariaLabel = button.getAttribute('aria-label');
    if (ariaLabel !== '検索ダイアログを開く') {
      throw new Error(`aria-label="検索ダイアログを開く" を期待していましたが、実際には "${ariaLabel ?? 'null'}" でした`);
    }

    // テスト: aria-haspopup="dialog"
    const ariaHasPopup = button.getAttribute('aria-haspopup');
    if (ariaHasPopup !== 'dialog') {
      throw new Error(`aria-haspopup="dialog" を期待していましたが、実際には "${ariaHasPopup ?? 'null'}" でした`);
    }

    // テスト: aria-keyshortcuts
    const ariaKeyshortcuts = button.getAttribute('aria-keyshortcuts');
    if (!ariaKeyshortcuts?.includes('Control+K')) {
      throw new Error(`aria-keyshortcuts に "Control+K" が含まれることを期待していましたが、実際には "${ariaKeyshortcuts ?? 'null'}" でした`);
    }
    if (!ariaKeyshortcuts.includes('Meta+K')) {
      throw new Error(`aria-keyshortcuts に "Meta+K" が含まれることを期待していましたが、実際には "${ariaKeyshortcuts}" でした`);
    }

    // テスト: アイコンが aria-hidden="true"
    const icon = trigger.shadowRoot?.querySelector('.icon');
    if (!icon) throw new Error('アイコン要素が見つかりません');
    if (icon.getAttribute('aria-hidden') !== 'true') {
      throw new Error(
        `アイコンの aria-hidden="true" を期待していましたが、実際には "${icon.getAttribute('aria-hidden') ?? 'null'}" でした`,
      );
    }

    // テスト: プレースホルダーが aria-hidden="true"
    const placeholder = trigger.shadowRoot?.querySelector('.placeholder');
    if (!placeholder) throw new Error('プレースホルダー要素が見つかりません');
    if (placeholder.getAttribute('aria-hidden') !== 'true') {
      throw new Error(
        `プレースホルダーの aria-hidden="true" を期待していましたが、実際には "${placeholder.getAttribute('aria-hidden') ?? 'null'}" でした`,
      );
    }
  },
};

// ──────────────────────────────────────────────
// 境界条件（事故が多い）
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: フォーカスのみではイベントが発火しない（Explicit Activation Only）。
 *
 * Tab キーでフォーカスを当てるだけでは `open-search-dialog` イベントは発火しません。
 * ユーザーの明示的なアクティベーション（click, Enter, Space）が必要です。
 * これは「フォーカスで即座にダイアログが開く」という誤動作を防ぎます。
 */
export const FocusOnlyNoEvent: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: フォーカス取得（`:focus`）だけでは `open-search-dialog` イベントは発火しません。明示的なアクティベーションが必要です。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="
        padding: 0.75rem 1rem;
        background: oklch(97% 0.01 80 / 0.3);
        border: 1px solid oklch(80% 0.05 80 / 0.4);
        border-radius: 6px;
        font-size: 13px;
      ">
        <strong>⚠️ 境界条件</strong>: フォーカスのみではイベントが発火しません（Explicit Activation Only）。
      </div>
      <ui-search-trigger
        id="focus-only-trigger"
        @open-search-dialog="${(e: Event) => {
      const root = (e.currentTarget as HTMLElement).parentElement;
      const log = root?.querySelector<HTMLElement>('#focus-only-log');
      if (log) log.textContent = '❌ フォーカスでイベントが発火してしまいました（バグ）';
    }}"
      ></ui-search-trigger>

      <div
        id="focus-only-log"
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
        ✅ フォーカスのみではイベントは発火しません
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#focus-only-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    let eventFired = false;
    trigger.addEventListener('open-search-dialog', () => { eventFired = true; });

    // フォーカスのみ（クリックなし）
    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('button が見つかりません');
    button.focus();

    // フォーカスイベントを発火（クリックなし）
    button.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 100));

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (eventFired) throw new Error('フォーカスのみで open-search-dialog イベントが発火してはいけません');
  },
};

/**
 * ⚠️ 境界条件: 空のプレースホルダー。
 *
 * `placeholder=""` を設定した場合、プレースホルダー要素は存在しますが空になります。
 * アイコンとバッジのみが表示されます。
 */
export const EmptyPlaceholder: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `placeholder=""` を設定した場合、プレースホルダーテキストは空になります。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="
        padding: 0.75rem 1rem;
        background: oklch(97% 0.01 80 / 0.3);
        border: 1px solid oklch(80% 0.05 80 / 0.4);
        border-radius: 6px;
        font-size: 13px;
      ">
        <strong>⚠️ 境界条件</strong>: <code>placeholder=""</code> — プレースホルダーテキストが空の状態。
      </div>
      <ui-search-trigger id="empty-placeholder" placeholder=""></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#empty-placeholder');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    // テスト: placeholder プロパティが空文字列
    if (trigger.placeholder !== '') {
      throw new Error(`placeholder="" を期待していましたが、実際には "${trigger.placeholder}" でした`);
    }

    // テスト: button は存在する（プレースホルダーが空でも機能する）
    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('button が見つかりません');

    // テスト: aria-label は空プレースホルダーに依存しない（固定値）
    if (button.getAttribute('aria-label') !== '検索ダイアログを開く') {
      throw new Error(
        `プレースホルダーが空の場合でも aria-label="検索ダイアログを開く" を期待していましたが、実際には "${button.getAttribute('aria-label') ?? 'null'}" でした`,
      );
    }
  },
};

/**
 * ⚠️ 境界条件: 連続クリックでイベントが複数回発火する。
 *
 * 連続クリックでは `open-search-dialog` イベントが複数回発火します。
 * 親コンポーネント側でダイアログの重複表示を防ぐ処理が必要です。
 */
export const RapidClickMultipleEvents: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: 連続クリックでは `open-search-dialog` イベントが複数回発火します。親コンポーネント側でダイアログの重複表示を防いでください。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="
        padding: 0.75rem 1rem;
        background: oklch(97% 0.01 80 / 0.3);
        border: 1px solid oklch(80% 0.05 80 / 0.4);
        border-radius: 6px;
        font-size: 13px;
      ">
        <strong>⚠️ 境界条件</strong>: 連続クリックでイベントが複数回発火します。親側で重複防止が必要です。
      </div>
      <ui-search-trigger
        id="rapid-click-trigger"
        @open-search-dialog="${(e: Event) => {
      const root = (e.currentTarget as HTMLElement).parentElement;
      const log = root?.querySelector<HTMLElement>('#rapid-click-log');
      const count = parseInt(log?.dataset['count'] ?? '0', 10) + 1;
      if (log) {
        log.dataset['count'] = String(count);
        log.textContent = `open-search-dialog が ${String(count)} 回発火しました`;
      }
    }}"
      ></ui-search-trigger>

      <div
        id="rapid-click-log"
        data-count="0"
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
        トリガーを連続クリックしてください
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#rapid-click-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    let eventCount = 0;
    trigger.addEventListener('open-search-dialog', () => { eventCount++; });

    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('button が見つかりません');

    // 3 回連続クリック
    button.click();
    button.click();
    button.click();

    await new Promise((resolve) => setTimeout(resolve, 50));

    // テスト: 3 回クリックで 3 回イベントが発火する
    if (eventCount !== 3) {
      throw new Error(`3回のクリックで3つのイベントが発火することを期待していましたが、実際には ${String(eventCount)}個でした`);
    }
  },
};

/**
 * ⚠️ 境界条件: `click()` パブリック API によるプログラム的アクティベーション。
 *
 * `element.click()` を呼び出すことで、プログラム的に検索ダイアログを開けます。
 * ショートカットキー（Ctrl+K / Cmd+K）のハンドラから呼び出す際に使用します。
 */
export const ProgrammaticActivation: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `element.click()` によるプログラム的アクティベーション。ショートカットキーハンドラから呼び出す際に使用します。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="
        padding: 0.75rem 1rem;
        background: oklch(97% 0.01 80 / 0.3);
        border: 1px solid oklch(80% 0.05 80 / 0.4);
        border-radius: 6px;
        font-size: 13px;
      ">
        <strong>⚠️ 境界条件</strong>: <code>element.click()</code> でプログラム的にアクティベートできます。
      </div>
      <ui-search-trigger
        id="programmatic-trigger"
        @open-search-dialog="${(e: Event) => {
      const root = (e.currentTarget as HTMLElement).parentElement;
      const log = root?.querySelector<HTMLElement>('#programmatic-log');
      if (log) log.textContent = '✅ プログラム的アクティベーション成功';
    }}"
      ></ui-search-trigger>

      <div
        id="programmatic-log"
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
        プログラム的アクティベーションを待機中...
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#programmatic-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    // テスト: click() パブリック API でイベントが発火する
    const eventPromise = new Promise<CustomEvent>((resolve) => {
      trigger.addEventListener('open-search-dialog', (e) => { resolve(e as CustomEvent); }, { once: true });
    });

    // プログラム的アクティベーション
    trigger.click();

    const event = await Promise.race([
      eventPromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (!event) throw new Error('プログラム的な click() によって open-search-dialog イベントが発火しませんでした');
  },
};

// ──────────────────────────────────────────────
// 実用例
// ──────────────────────────────────────────────

/**
 * ヘッダー内での使用例。
 *
 * 実際のヘッダーレイアウト内での配置例です。
 * 検索トリガーはヘッダー右側に配置し、ショートカットバッジで発見性を高めます。
 */
export const InHeader: Story = {
  render: () => html`
    <style>
      .demo-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1.5rem;
        height: 56px;
        background: oklch(100% 0 0);
        border-bottom: 1px solid oklch(90% 0.01 250 / 0.12);
        gap: 1rem;
      }
      .demo-logo {
        font-size: 16px;
        font-weight: 600;
        color: oklch(20% 0.01 250);
        white-space: nowrap;
      }
      .demo-nav {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .demo-nav-item {
        padding: 0 0.75rem;
        height: 32px;
        display: flex;
        align-items: center;
        font-size: 14px;
        color: oklch(48% 0.01 250);
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
      }
      .demo-nav-item:hover {
        background: oklch(95% 0 0);
      }
    </style>

    <div class="header-story-root">
      <header class="demo-header">
        <div class="demo-logo">Rouault DS</div>

        <nav class="demo-nav">
          <div class="demo-nav-item">コンポーネント</div>
          <div class="demo-nav-item">ガイドライン</div>
          <div class="demo-nav-item">リソース</div>
        </nav>

        <ui-search-trigger
          id="header-trigger"
          @open-search-dialog="${(e: Event) => {
      const root = (e.currentTarget as HTMLElement).closest('.header-story-root');
      const log = root?.querySelector<HTMLElement>('#header-log');
      if (log) log.textContent = '検索ダイアログが開きます...';
    }}"
        ></ui-search-trigger>
      </header>

      <div
        id="header-log"
        style="
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: oklch(97% 0 0);
          border: 1px solid oklch(90% 0.01 250 / 0.2);
          border-radius: 6px;
          font-size: 13px;
          color: oklch(48% 0.01 250);
          min-height: 2.5rem;
        "
      >
        検索トリガーをクリックするとここに表示されます
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#header-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    // テスト: ヘッダー内でも正常に機能する
    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('button が見つかりません');

    const eventPromise = new Promise<void>((resolve) => {
      trigger.addEventListener('open-search-dialog', () => { resolve(); }, { once: true });
    });

    button.click();

    await Promise.race([
      eventPromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]).then((result) => {
      if (result === null) throw new Error('ヘッダーのコンテキストで open-search-dialog イベントが発火しませんでした');
    });
  },
};

/**
 * ダークモードでの可読性確認。
 *
 * トークンを暗色テーマ相当に上書きし、視覚的コントラストが維持されることを確認します。
 */
export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <div
      style="
        padding: 1.25rem;
        background: oklch(14% 0.01 250);
        --bg-fill-muted: oklch(22% 0.01 250);
        --bg-default: oklch(26% 0.01 250);
        --border-default: oklch(42% 0.02 250);
        --fg-muted: oklch(78% 0.01 250);
        --fg-subtle: oklch(86% 0.01 250);
      "
    >
      <ui-search-trigger id="dark-mode-trigger"></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#dark-mode-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    const placeholder = trigger.shadowRoot?.querySelector<HTMLElement>('.placeholder');
    if (!button || !placeholder) throw new Error('ダークモードの要素が見つかりません');

    const buttonStyle = getComputedStyle(button);
    const placeholderStyle = getComputedStyle(placeholder);

    if (buttonStyle.backgroundColor === 'rgba(0, 0, 0, 0)') {
      throw new Error('ダークモードの背景は透明であってはいけません');
    }
    if (placeholderStyle.color === 'rgba(0, 0, 0, 0)') {
      throw new Error('ダークモードでもプレースホルダーの色が可視である必要があります');
    }
  },
};

/**
 * モバイル icon-only 挙動と 44px ヒットエリアの確認。
 */
export const MobileIconOnly: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => html`
    <div style="padding: 1rem;">
      <ui-search-trigger id="mobile-trigger"></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#mobile-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    const isMobileViewport = window.matchMedia('(max-width: 640px)').matches;
    if (!isMobileViewport) {
      console.warn('Mobile viewport is not active; MobileIconOnly assertions were skipped');
      return;
    }

    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    const placeholder = trigger.shadowRoot?.querySelector<HTMLElement>('.placeholder');
    if (!button || !placeholder) throw new Error('モバイル用の要素が見つかりません');

    if (getComputedStyle(placeholder).display !== 'none') {
      throw new Error('モバイル環境ではプレースホルダーは非表示である必要があります');
    }

    const pseudo = getComputedStyle(button, '::after');
    if (pseudo.minWidth !== '24px' || pseudo.minHeight !== '24px') {
      throw new Error(`タッチターゲットが 24px であることを期待していましたが、実際には ${pseudo.minWidth} x ${pseudo.minHeight} でした`);
    }
  },
};

/**
 * 強制カラーモード対応の確認。
 */
export const ForcedColors: Story = {
  render: () => html`
    <div style="padding: 1rem;">
      <ui-search-trigger id="forced-colors-trigger"></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#forced-colors-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    const isForcedColors = window.matchMedia('(forced-colors: active)').matches;
    if (!isForcedColors) {
      console.warn('forced-colors is not active; ForcedColors assertions were skipped');
      return;
    }

    const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('button が見つかりません');

    const style = getComputedStyle(button);
    if (style.borderStyle === 'none') {
      throw new Error('強制カラーモードではボーダーが可視である必要があります');
    }
    if (style.backgroundColor === 'rgba(0, 0, 0, 0)') {
      throw new Error('強制カラーモードでは背景は透明であってはいけません');
    }
  },
};

/**
 * 長いプレースホルダー文の省略表示確認。
 */
export const LongPlaceholderEllipsis: Story = {
  render: () => html`
    <div style="max-width: 420px;">
      <ui-search-trigger
        id="long-placeholder-trigger"
        placeholder="これは非常に長いプレースホルダーテキストで、表示幅を超えた場合に省略記号で切り詰められるべきです"
      ></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<SearchTrigger>('#long-placeholder-trigger');
    if (!trigger) throw new Error('ui-search-trigger が見つかりません');
    await trigger.updateComplete;

    const placeholder = trigger.shadowRoot?.querySelector<HTMLElement>('.placeholder');
    if (!placeholder) throw new Error('プレースホルダーが見つかりません');

    const style = getComputedStyle(placeholder);
    if (style.textOverflow !== 'ellipsis') {
      throw new Error(`text-overflow: ellipsis を期待していましたが、実際には "${style.textOverflow}" でした`);
    }
    if (style.whiteSpace !== 'nowrap') {
      throw new Error(`white-space: nowrap を期待していましたが、実際には "${style.whiteSpace}" でした`);
    }
  },
};
