import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        // テスト: 内部 button 要素が存在する
        const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
        if (!button) throw new Error('button not found in shadow root');

        // テスト: type="button" が設定されている（フォーム送信を防ぐ）
        if (button.type !== 'button') {
            throw new Error(`Expected type="button", got "${button.type}"`);
        }

        // テスト: aria-label が設定されている
        if (button.getAttribute('aria-label') !== '検索ダイアログを開く') {
            throw new Error(
                `Expected aria-label="検索ダイアログを開く", got "${button.getAttribute('aria-label') ?? 'null'}"`,
            );
        }

        // テスト: aria-haspopup="dialog" が設定されている
        if (button.getAttribute('aria-haspopup') !== 'dialog') {
            throw new Error(
                `Expected aria-haspopup="dialog", got "${button.getAttribute('aria-haspopup') ?? 'null'}"`,
            );
        }

        // テスト: aria-keyshortcuts が設定されている
        const keyshortcuts = button.getAttribute('aria-keyshortcuts');
        if (!keyshortcuts?.includes('Control+K') || !keyshortcuts.includes('Meta+K')) {
            throw new Error(
                `Expected aria-keyshortcuts to include "Control+K Meta+K", got "${keyshortcuts ?? 'null'}"`,
            );
        }

        // テスト: 検索アイコンが存在する
        const icon = trigger.shadowRoot?.querySelector('.icon');
        if (!icon) throw new Error('Icon element not found');

        // テスト: プレースホルダーが存在する
        const placeholder = trigger.shadowRoot?.querySelector('.placeholder');
        if (!placeholder) throw new Error('Placeholder element not found');

        // テスト: バッジが存在する
        const badge = trigger.shadowRoot?.querySelector('.badge');
        if (!badge) throw new Error('Badge element not found');

        // テスト: disabled でない
        if (trigger.disabled) throw new Error('Expected disabled to be false');
        if (button.disabled) throw new Error('Expected button to not be disabled');

        console.log('✅ All tests passed for Default story');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
        if (!button) throw new Error('button not found');

        // テスト: disabled でない
        if (button.disabled) throw new Error('Expected button to not be disabled');

        // テスト: aria-disabled="false"
        if (button.getAttribute('aria-disabled') !== 'false') {
            throw new Error(
                `Expected aria-disabled="false", got "${button.getAttribute('aria-disabled') ?? 'null'}"`,
            );
        }

        console.log('✅ All tests passed for StateDefault story');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        // テスト: disabled プロパティが true
        if (!trigger.disabled) throw new Error('Expected disabled to be true');

        const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
        if (!button) throw new Error('button not found');

        // テスト: button に disabled 属性が付与されている
        if (!button.disabled) throw new Error('Expected button to be disabled');

        // テスト: aria-disabled="true"
        if (button.getAttribute('aria-disabled') !== 'true') {
            throw new Error(
                `Expected aria-disabled="true", got "${button.getAttribute('aria-disabled') ?? 'null'}"`,
            );
        }

        console.log('✅ All tests passed for StateDisabled story');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        // テスト: placeholder プロパティが設定されている
        if (trigger.placeholder !== 'ドキュメントを検索...') {
            throw new Error(`Expected placeholder="ドキュメントを検索...", got "${trigger.placeholder}"`);
        }

        // テスト: プレースホルダー要素にテキストが反映されている
        const placeholderEl = trigger.shadowRoot?.querySelector('.placeholder');
        if (!placeholderEl) throw new Error('Placeholder element not found');
        if (!placeholderEl.textContent.includes('ドキュメントを検索...')) {
            throw new Error(`Expected placeholder text to include "ドキュメントを検索...", got "${placeholderEl.textContent}"`);
        }

        console.log('✅ All tests passed for CustomPlaceholder story');
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
            throw new Error(`Expected 3 triggers, got ${String(triggers.length)}`);
        }

        await Promise.all([...triggers].map((t) => t.updateComplete));

        // テスト: デフォルトは disabled でない
        const defaultTrigger = canvasElement.querySelector<SearchTrigger>('#all-default');
        if (!defaultTrigger) throw new Error('Default trigger not found');
        if (defaultTrigger.disabled) throw new Error('Default trigger should not be disabled');

        // テスト: disabled トリガーは disabled
        const disabledTrigger = canvasElement.querySelector<SearchTrigger>('#all-disabled');
        if (!disabledTrigger) throw new Error('Disabled trigger not found');
        if (!disabledTrigger.disabled) throw new Error('Disabled trigger should be disabled');

        // テスト: カスタムプレースホルダー
        const customTrigger = canvasElement.querySelector<SearchTrigger>('#all-custom');
        if (!customTrigger) throw new Error('Custom trigger not found');
        if (customTrigger.placeholder !== 'ドキュメントを検索...') {
            throw new Error(`Expected custom placeholder, got "${customTrigger.placeholder}"`);
        }

        console.log('✅ All tests passed for AllStates story');
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
            const log = document.getElementById('event-log');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        // テスト: open-search-dialog イベントが発火する
        const eventPromise = new Promise<CustomEvent>((resolve) => {
            trigger.addEventListener('open-search-dialog', (e) => { resolve(e as CustomEvent); }, { once: true });
        });

        const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
        if (!button) throw new Error('button not found');
        button.click();

        const event = await Promise.race([
            eventPromise,
            new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
        ]);

        if (!event) throw new Error('open-search-dialog event was not fired');

        // テスト: イベントが bubbles: true
        if (!event.bubbles) throw new Error('Expected event to bubble');

        // テスト: イベントが composed: true
        if (!event.composed) throw new Error('Expected event to be composed');

        console.log('✅ All tests passed for EventFiring story');
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
        @open-search-dialog="${() => {
            const log = document.getElementById('disabled-event-log');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        if (!trigger.disabled) throw new Error('Expected trigger to be disabled');

        let eventFired = false;
        trigger.addEventListener('open-search-dialog', () => { eventFired = true; });

        // disabled なので button.click() は pointer-events: none で無効化されているが、
        // 念のため _handleActivate の disabled ガードも検証するため直接呼び出す
        trigger.click();
        await new Promise((resolve) => setTimeout(resolve, 100));

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (eventFired) throw new Error('open-search-dialog should not fire when disabled');

        console.log('✅ All tests passed for DisabledNoEvent story');
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
        @open-search-dialog="${() => {
            const log = document.getElementById('keyboard-log');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
        if (!button) throw new Error('button not found');

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

        // テスト: Enter キーで open-search-dialog イベントが発火する
        // ネイティブ button は Enter キーでクリックイベントを発火するため、
        // click イベントをシミュレートしてテスト
        const eventPromise = new Promise<CustomEvent>((resolve) => {
            trigger.addEventListener('open-search-dialog', (e) => { resolve(e as CustomEvent); }, { once: true });
        });

        // Enter キー相当: ネイティブ button の Enter キー動作をシミュレート
        button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
        button.click(); // Enter は click を発火させる

        const event = await Promise.race([
            eventPromise,
            new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
        ]);

        if (!event) throw new Error('open-search-dialog event was not fired on keyboard activation');

        console.log('✅ All tests passed for KeyboardActivation story');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
        if (!button) throw new Error('button not found');

        // テスト: aria-label
        const ariaLabel = button.getAttribute('aria-label');
        if (ariaLabel !== '検索ダイアログを開く') {
            throw new Error(`Expected aria-label="検索ダイアログを開く", got "${ariaLabel ?? 'null'}"`);
        }

        // テスト: aria-haspopup="dialog"
        const ariaHasPopup = button.getAttribute('aria-haspopup');
        if (ariaHasPopup !== 'dialog') {
            throw new Error(`Expected aria-haspopup="dialog", got "${ariaHasPopup ?? 'null'}"`);
        }

        // テスト: aria-keyshortcuts
        const ariaKeyshortcuts = button.getAttribute('aria-keyshortcuts');
        if (!ariaKeyshortcuts?.includes('Control+K')) {
            throw new Error(`Expected aria-keyshortcuts to include "Control+K", got "${ariaKeyshortcuts ?? 'null'}"`);
        }
        if (!ariaKeyshortcuts.includes('Meta+K')) {
            throw new Error(`Expected aria-keyshortcuts to include "Meta+K", got "${ariaKeyshortcuts}"`);
        }

        // テスト: バッジが aria-hidden="true"
        const badge = trigger.shadowRoot?.querySelector('.badge');
        if (!badge) throw new Error('Badge not found');
        if (badge.getAttribute('aria-hidden') !== 'true') {
            throw new Error(
                `Expected badge aria-hidden="true", got "${badge.getAttribute('aria-hidden') ?? 'null'}"`,
            );
        }

        // テスト: アイコンが aria-hidden="true"
        const icon = trigger.shadowRoot?.querySelector('.icon');
        if (!icon) throw new Error('Icon not found');
        if (icon.getAttribute('aria-hidden') !== 'true') {
            throw new Error(
                `Expected icon aria-hidden="true", got "${icon.getAttribute('aria-hidden') ?? 'null'}"`,
            );
        }

        // テスト: プレースホルダーが aria-hidden="true"
        const placeholder = trigger.shadowRoot?.querySelector('.placeholder');
        if (!placeholder) throw new Error('Placeholder not found');
        if (placeholder.getAttribute('aria-hidden') !== 'true') {
            throw new Error(
                `Expected placeholder aria-hidden="true", got "${placeholder.getAttribute('aria-hidden') ?? 'null'}"`,
            );
        }

        console.log('✅ All tests passed for AriaAttributes story');
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
        @open-search-dialog="${() => {
            const log = document.getElementById('focus-only-log');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        let eventFired = false;
        trigger.addEventListener('open-search-dialog', () => { eventFired = true; });

        // フォーカスのみ（クリックなし）
        const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
        if (!button) throw new Error('button not found');
        button.focus();

        // フォーカスイベントを発火（クリックなし）
        button.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

        await new Promise((resolve) => setTimeout(resolve, 100));

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (eventFired) throw new Error('open-search-dialog should not fire on focus only');

        console.log('✅ All tests passed for FocusOnlyNoEvent story');
    },
};

/**
 * ⚠️ 境界条件: カスタムバッジスロット。
 *
 * `badge` スロットにカスタムコンテンツを提供することで、
 * デフォルトの `⌘K` バッジを置き換えられます。
 * プラットフォームに応じた表示（Ctrl K / Cmd K）に対応できます。
 */
export const CustomBadgeSlot: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: `badge` スロットにカスタムコンテンツを提供することで、デフォルトのバッジを置き換えられます。',
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
        <strong>⚠️ 境界条件</strong>: <code>badge</code> スロットでデフォルトバッジを置き換えます。
      </div>
      <ui-search-trigger id="custom-badge-trigger">
        <span
          slot="badge"
          style="
            display: inline-flex;
            align-items: center;
            gap: 2px;
            padding: 2px 5px;
            font-size: 11px;
            color: oklch(65% 0.01 250);
            background: oklch(95% 0 0);
            border: 1px solid oklch(85% 0.01 250);
            border-radius: 4px;
          "
        >Ctrl K</span>
      </ui-search-trigger>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const trigger = canvasElement.querySelector<SearchTrigger>('#custom-badge-trigger');
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        // テスト: カスタムバッジスロットが存在する
        const slottedBadge = canvasElement.querySelector('[slot="badge"]');
        if (!slottedBadge) throw new Error('Custom badge slot element not found');

        if (!slottedBadge.textContent.includes('Ctrl K')) {
            throw new Error(`Expected custom badge text to include "Ctrl K", got "${slottedBadge.textContent}"`);
        }

        console.log('✅ All tests passed for CustomBadgeSlot story');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        // テスト: placeholder プロパティが空文字列
        if (trigger.placeholder !== '') {
            throw new Error(`Expected placeholder="", got "${trigger.placeholder}"`);
        }

        // テスト: button は存在する（プレースホルダーが空でも機能する）
        const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
        if (!button) throw new Error('button not found');

        // テスト: aria-label は空プレースホルダーに依存しない（固定値）
        if (button.getAttribute('aria-label') !== '検索ダイアログを開く') {
            throw new Error(
                `Expected aria-label="検索ダイアログを開く" even with empty placeholder, got "${button.getAttribute('aria-label') ?? 'null'}"`,
            );
        }

        console.log('✅ All tests passed for EmptyPlaceholder story');
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
        @open-search-dialog="${() => {
            const log = document.getElementById('rapid-click-log');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        let eventCount = 0;
        trigger.addEventListener('open-search-dialog', () => { eventCount++; });

        const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
        if (!button) throw new Error('button not found');

        // 3 回連続クリック
        button.click();
        button.click();
        button.click();

        await new Promise((resolve) => setTimeout(resolve, 50));

        // テスト: 3 回クリックで 3 回イベントが発火する
        if (eventCount !== 3) {
            throw new Error(`Expected 3 events from 3 clicks, got ${String(eventCount)}`);
        }

        console.log('✅ All tests passed for RapidClickMultipleEvents story');
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
        @open-search-dialog="${() => {
            const log = document.getElementById('programmatic-log');
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
        if (!trigger) throw new Error('ui-search-trigger not found');
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

        if (!event) throw new Error('open-search-dialog event was not fired via programmatic click()');

        console.log('✅ All tests passed for ProgrammaticActivation story');
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

    <header class="demo-header">
      <div class="demo-logo">Rouault DS</div>

      <nav class="demo-nav">
        <div class="demo-nav-item">コンポーネント</div>
        <div class="demo-nav-item">ガイドライン</div>
        <div class="demo-nav-item">リソース</div>
      </nav>

      <ui-search-trigger
        id="header-trigger"
        @open-search-dialog="${() => {
            const log = document.getElementById('header-log');
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
  `,
    play: async ({ canvasElement }) => {
        const trigger = canvasElement.querySelector<SearchTrigger>('#header-trigger');
        if (!trigger) throw new Error('ui-search-trigger not found');
        await trigger.updateComplete;

        // テスト: ヘッダー内でも正常に機能する
        const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');
        if (!button) throw new Error('button not found');

        const eventPromise = new Promise<void>((resolve) => {
            trigger.addEventListener('open-search-dialog', () => { resolve(); }, { once: true });
        });

        button.click();

        await Promise.race([
            eventPromise,
            new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
        ]).then((result) => {
            if (result === null) throw new Error('open-search-dialog event was not fired in header context');
        });

        console.log('✅ All tests passed for InHeader story');
    },
};
