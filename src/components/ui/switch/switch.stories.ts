import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './switch';
import type { Switch } from './switch';

/**
 * ## トグルスイッチ (Toggle Switch)
 *
 * 設定の「即時反映（Instant Reflection）」を司るメタファーです。
 * 保存操作を待たず、システムの状態をダイレクトに変更します。
 *
 * ### デザイン哲学
 *
 * - **Digital Tactility**: 0から1へのデジタルな状態遷移を `--ease-spring` で「即時かつ滑らか」に表現
 * - **フォーム非依存**: `name` / `required` / `value` は非対応。状態管理は親コンポーネントで行います
 * - **Thumb アニメーション**: `--duration-normal` (150ms) + `--ease-spring` (Overdamped) で追従性を実現
 *
 * ### キーボード操作
 *
 * - **Space**: トグル操作
 * - **Enter**: トグル操作（フォーム送信はブロック）
 *
 * ### 使用上の注意
 *
 * - **フォーム非依存**: `name` / `value` / `required` は非対応です。状態は `checked` プロパティで管理してください
 * - **ラベルなし使用時**: `aria-label` を外部から付与してアクセシビリティを確保してください
 */
const meta: Meta<Switch> = {
  title: 'Components/Switch',
  component: 'ui-switch',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
トグルスイッチコンポーネントは、設定の「即時反映（Instant Reflection）」を司るメタファーです。
保存操作を待たず、システムの状態をダイレクトに変更します。

## 使用方法

\`\`\`html
<!-- 基本的な使用 -->
<ui-switch label="ダークモード"></ui-switch>

<!-- ON 状態 -->
<ui-switch label="通知を受け取る" checked></ui-switch>

<!-- 無効 -->
<ui-switch label="変更不可" disabled></ui-switch>
\`\`\`

## 注意事項

- **フォーム非依存**: \`name\` / \`value\` / \`required\` は非対応です。状態は \`checked\` プロパティで管理してください。
- **ラベルなし使用時**: \`aria-label\` を外部から付与してアクセシビリティを確保してください。
- **Enter キー**: トグル操作のみ実行し、フォーム送信は行いません（\`event.preventDefault()\` でブロック）。
        `,
      },
    },
  },
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'ON/OFF 状態',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    label: {
      control: 'text',
      description: 'スイッチのラベル（aria-labelledby で関連付け）',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    disabled: {
      control: 'boolean',
      description: '操作無効化',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<Switch>;

// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * デフォルトのトグルスイッチ（OFF 状態）。
 *
 * OFF 時はトラックが `--bg-fill-muted` で静かに存在します。
 * Thumb は左端 (`--switch-thumb-pos-off`: 2px) に位置します。
 */
export const Default: Story = {
  args: {
    label: 'ダークモード',
  },
  render: (args) => html`
    <ui-switch
      id="default-switch"
      label="${args.label}"
      ?checked="${args.checked}"
      ?disabled="${args.disabled}"
    ></ui-switch>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#default-switch');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    // テスト: デフォルトは OFF
    if (sw.checked) throw new Error('デフォルトで checked が false であることを期待していましたが、実際には true でした');

    // テスト: role="switch" が設定されている
    const track = sw.shadowRoot?.querySelector('.track');
    if (!track) throw new Error('Shadow Root 内に track 要素が見つかりません');
    if (track.getAttribute('role') !== 'switch') {
      throw new Error(`role="switch" を期待していましたが、実際には "${track.getAttribute('role') ?? 'null'}" でした`);
    }

    // テスト: aria-checked="false" が設定されている
    if (track.getAttribute('aria-checked') !== 'false') {
      throw new Error(`aria-checked="false" を期待していましたが、実際には "${track.getAttribute('aria-checked') ?? 'null'}" でした`);
    }

    // テスト: tabindex="0"（フォーカス可能）
    if (track.getAttribute('tabindex') !== '0') {
      throw new Error(`tabindex="0" を期待していましたが、実際には "${track.getAttribute('tabindex') ?? 'null'}" でした`);
    }
  },
};

// ──────────────────────────────────────────────
// バリアント × 状態の組み合わせ
// ──────────────────────────────────────────────

/**
 * 通常状態 × OFF。
 *
 * 最も基本的な状態。トラックは `--bg-fill-muted` で静かに存在します。
 * Thumb は左端に位置し、`aria-checked="false"` が設定されます。
 */
export const OffNormal: Story = {
  render: () => html`
    <ui-switch
      id="off-normal"
      label="OFF（通常）"
    ></ui-switch>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#off-normal');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    const track = sw.shadowRoot?.querySelector('.track');
    if (!track) throw new Error('track 要素が見つかりません');

    if (sw.checked) throw new Error('checked が false であることを期待していましたが true でした');
    if (track.getAttribute('aria-checked') !== 'false') {
      throw new Error('aria-checked="false" を期待していましたが true でした');
    }
  },
};

/**
 * 通常状態 × ON。
 *
 * ON 時はトラックが `--primary` 色になり、Thumb が右端へ移動します。
 * `aria-checked="true"` が設定されます。
 */
export const OnNormal: Story = {
  render: () => html`
    <ui-switch
      id="on-normal"
      label="ON（通常）"
      checked
    ></ui-switch>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#on-normal');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    const track = sw.shadowRoot?.querySelector('.track');
    if (!track) throw new Error('Track 要素が見つかりません');

    if (!sw.checked) throw new Error('checked が true であることを期待していましたが false でした');
    if (track.getAttribute('aria-checked') !== 'true') {
      throw new Error(`aria-checked="true" を期待していましたが、実際には "${track.getAttribute('aria-checked') ?? 'null'}" でした`);
    }
  },
};

/**
 * 通常状態 × OFF + Disabled。
 *
 * 無効状態では `opacity: --opacity-disabled` で薄く表示されます。
 * `pointer-events: none` により操作不可。`aria-disabled="true"` が設定されます。
 */
export const OffDisabled: Story = {
  render: () => html`
    <ui-switch
      id="off-disabled"
      label="OFF（無効）"
      disabled
    ></ui-switch>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#off-disabled');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    const track = sw.shadowRoot?.querySelector('.track');
    if (!track) throw new Error('Track 要素が見つかりません');

    if (!sw.disabled) throw new Error('disabled が true であることを期待していましたが false でした');
    if (sw.checked) throw new Error('checked が false であることを期待していましたが true でした');
    if (track.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`aria-disabled="true" を期待していましたが "${track.getAttribute('aria-disabled') ?? 'null'}" でした`);
    }
    // tabindex="-1": フォーカス不可
    if (track.getAttribute('tabindex') !== '-1') {
      throw new Error(`tabindex="-1" を期待していましたが、実際には "${track.getAttribute('tabindex') ?? 'null'}" でした`);
    }
  },
};

/**
 * 通常状態 × ON + Disabled。
 *
 * ON 状態かつ無効。トラックは `--primary` 色を維持しますが操作不可です。
 * Thumb は右端位置を維持します。
 */
export const OnDisabled: Story = {
  render: () => html`
    <ui-switch
      id="on-disabled"
      label="ON（無効）"
      checked
      disabled
    ></ui-switch>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#on-disabled');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    const track = sw.shadowRoot?.querySelector('.track');
    if (!track) throw new Error('.track が見つかりません');

    if (!sw.checked) throw new Error('checked が true であることを期待していましたが false でした');
    if (!sw.disabled) throw new Error('disabled が true であることを期待していましたが false でした');
    if (track.getAttribute('aria-checked') !== 'true') {
      throw new Error('aria-checked="true" を期待していましたが false でした');
    }
    if (track.getAttribute('aria-disabled') !== 'true') {
      throw new Error('aria-disabled="true" を期待していましたが false でした');
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
      .states-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        max-width: 600px;
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
        margin-bottom: 0.25rem;
      }
    </style>

    <div class="states-grid">
      <div class="state-group">
        <div class="state-label">OFF (Default)</div>
        <ui-switch id="all-off" label="OFF"></ui-switch>
      </div>

      <div class="state-group">
        <div class="state-label">ON (Checked)</div>
        <ui-switch id="all-on" label="ON" checked></ui-switch>
      </div>

      <div class="state-group">
        <div class="state-label">OFF + Disabled</div>
        <ui-switch label="OFF・無効" disabled></ui-switch>
      </div>

      <div class="state-group">
        <div class="state-label">ON + Disabled</div>
        <ui-switch label="ON・無効" checked disabled></ui-switch>
      </div>

      <div class="state-group">
        <div class="state-label">No Label</div>
        <ui-switch id="all-no-label" aria-label="ラベルなしスイッチ"></ui-switch>
      </div>

      <div class="state-group">
        <div class="state-label">Long Label</div>
        <ui-switch
          label="非常に長いラベルテキストのテスト用スイッチ"
        ></ui-switch>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const switches = canvasElement.querySelectorAll('ui-switch');
    if (switches.length !== 6) {
      throw new Error(`6つのスイッチを期待していましたが、実際には ${String(switches.length)}個でした`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    await Promise.all([...switches].map((s) => (s as Switch).updateComplete));

    // テスト: ラベルなしのコントロールは存在する
    const noLabel = canvasElement.querySelector<Switch>('#all-no-label');
    if (!noLabel) throw new Error('ラベルなしのスイッチが見つかりません');
    const labelEl = noLabel.shadowRoot?.querySelector('.label');
    if (labelEl) throw new Error('label プロパティが空の場合、ラベル要素は存在しないはずです');

    // テスト: ON スイッチは aria-checked="true"
    const onSwitch = canvasElement.querySelector<Switch>('#all-on');
    if (!onSwitch) throw new Error('ON 状態のスイッチが見つかりません');
    await onSwitch.updateComplete;
    const onTrack = onSwitch.shadowRoot?.querySelector('.track');
    if (onTrack?.getAttribute('aria-checked') !== 'true') {
      throw new Error('ON 状態のスイッチの aria-checked が "true" であることを期待していましたが false でした');
    }
  },
};

// ──────────────────────────────────────────────
// インタラクション
// ──────────────────────────────────────────────

/**
 * クリックによるトグル。
 *
 * クリックで checked 状態がトグルし、`change` / `input` イベントが発火します。
 * ラベルをクリックしてもトグルします。
 */
export const ClickToggle: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <ui-switch
        id="toggle-switch"
        label="クリックでトグル"
        @change="${(e: Event) => {
      const sw = e.target as Switch;
      const log = document.getElementById('toggle-log');
      if (log) log.textContent = `change イベント: checked=${String(sw.checked)}`;
    }}"
      ></ui-switch>

      <div
        id="toggle-log"
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
        スイッチをクリックするとここに表示されます
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#toggle-switch');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    // テスト: 初期状態は OFF
    if (sw.checked) throw new Error('初期状態が OFF であることを期待していましたが ON でした');

    // change イベントを Promise で受け取る
    const changePromise = new Promise<boolean>((resolve) => {
      sw.addEventListener('change', (e) => {
        resolve((e.target as Switch).checked);
      }, { once: true });
    });

    // トラックをクリック
    const track = sw.shadowRoot?.querySelector<HTMLElement>('.track');
    if (!track) throw new Error('Track not found');
    track.click();

    const newChecked = await Promise.race([
      changePromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (newChecked === null) throw new Error('change イベントが発火しませんでした');
    if (!newChecked) throw new Error('クリック後に checked が true になることを期待していましたが false のままでした');

    // テスト: 2回目のクリックで OFF に戻る
    const changePromise2 = new Promise<boolean>((resolve) => {
      sw.addEventListener('change', (e) => {
        resolve((e.target as Switch).checked);
      }, { once: true });
    });

    track.click();
    const newChecked2 = await Promise.race([
      changePromise2,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (newChecked2 === null) throw new Error('2回目の change イベントが発火しませんでした');
    if (newChecked2) throw new Error('2回目のクリック後に checked が false になることを期待していましたが true のままでした');
  },
};

/**
 * ラベルクリックによるトグル。
 *
 * ラベルテキストをクリックしてもスイッチがトグルします。
 * WCAG 2.5.5 のタッチターゲット要件を満たすため、ラベル全体がクリック可能領域です。
 */
export const LabelClickToggle: Story = {
  render: () => html`
    <ui-switch
      id="label-click-switch"
      label="ラベルをクリックしてもトグルします"
    ></ui-switch>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#label-click-switch');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    if (sw.checked) throw new Error('Expected initial state to be OFF');

    // ラベル要素をクリック
    const label = sw.shadowRoot?.querySelector<HTMLElement>('.label');
    if (!label) throw new Error('ラベル要素が見つかりません');

    const changePromise = new Promise<boolean>((resolve) => {
      sw.addEventListener('change', (e) => {
        resolve((e.target as Switch).checked);
      }, { once: true });
    });

    label.click();

    const newChecked = await Promise.race([
      changePromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (newChecked === null) throw new Error('ラベルのクリックで change イベントが発火しませんでした');
    if (!newChecked) throw new Error('ラベルクリック後に checked が true になることを期待していましたが false のままでした');
  },
};

/**
 * キーボード操作（Space キー）。
 *
 * Space キーで checked 状態がトグルします。
 * `Tab` でフォーカスを当て、`Space` で操作できます。
 */
export const KeyboardSpaceToggle: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px;">
        <strong>操作方法</strong>: Tab キーでフォーカスを当て、Space キーでトグルしてください。
      </div>
      <ui-switch
        id="space-switch"
        label="Space キーでトグル"
      ></ui-switch>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#space-switch');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    const track = sw.shadowRoot?.querySelector<HTMLElement>('.track');
    if (!track) throw new Error('.track が見つかりません');

    // フォーカスを当てる
    track.focus();

    // Space キーイベントを発火
    const changePromise = new Promise<boolean>((resolve) => {
      sw.addEventListener('change', (e) => {
        resolve((e.target as Switch).checked);
      }, { once: true });
    });

    track.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }));

    const newChecked = await Promise.race([
      changePromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (newChecked === null) throw new Error('Space キー押下で change イベントが発火しませんでした');
    if (!newChecked) throw new Error('Space キー押下後に checked が true になることを期待していましたが false のままでした');
  },
};

/**
 * キーボード操作（Enter キー）。
 *
 * Enter キーでトグル操作のみ実行し、フォーム送信は行いません。
 * `event.preventDefault()` でデフォルト動作をブロックします。
 */
export const KeyboardEnterToggle: Story = {
  parameters: {
    docs: {
      description: {
        story: '**Enter キー**: トグル操作のみ実行し、フォーム送信は行いません。`event.preventDefault()` でブロックします。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px;">
        <strong>操作方法</strong>: Tab キーでフォーカスを当て、Enter キーでトグルしてください（フォーム送信はブロックされます）。
      </div>
      <form id="enter-form" @submit="${(e: Event) => { e.preventDefault(); }}">
        <ui-switch
          id="enter-switch"
          label="Enter キーでトグル（フォーム送信なし）"
        ></ui-switch>
        <button type="submit" style="display: none;">送信</button>
      </form>
      <div
        id="enter-log"
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
        Enter キーを押すとここに表示されます
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#enter-switch');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    const track = sw.shadowRoot?.querySelector<HTMLElement>('.track');
    if (!track) throw new Error('.track が見つかりません');

    track.focus();

    // フォーム送信が発生しないことを確認
    let formSubmitted = false;
    const form = canvasElement.querySelector<HTMLFormElement>('#enter-form');
    if (form) {
      form.addEventListener('submit', () => { formSubmitted = true; });
    }

    // change イベントを Promise で受け取る
    const changePromise = new Promise<boolean>((resolve) => {
      sw.addEventListener('change', (e) => {
        resolve((e.target as Switch).checked);
      }, { once: true });
    });

    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));

    const newChecked = await Promise.race([
      changePromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (newChecked === null) throw new Error('Enter キーで change イベントが発生しませんでした');
    if (!newChecked) throw new Error('Enter キーで checked が true になるはずです');

    // テスト: フォーム送信は発生していない
    await new Promise((resolve) => setTimeout(resolve, 100));
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (formSubmitted) throw new Error('スイッチ上で Enter キーが押された場合、フォームは送信されないはずです');

    const log = canvasElement.querySelector('#enter-log');
    if (log) log.textContent = `Enter キー: checked=${String(sw.checked)}（フォーム送信なし）`;
  },
};

// ──────────────────────────────────────────────
// 境界条件
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: Disabled 時のクリック無効化。
 *
 * `disabled` 状態ではクリックしても状態が変化せず、
 * `change` / `input` イベントも発火しません。
 * `pointer-events: none` により物理的に操作をブロックします。
 */
export const DisabledClickBlocked: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `disabled` 状態ではクリックしても状態が変化せず、イベントも発火しません。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0.01 80 / 0.3);
          border: 1px solid oklch(80% 0.05 80 / 0.4);
          border-radius: 6px;
          font-size: 13px;
        "
      >
        <strong>⚠️ 境界条件</strong>: disabled 状態ではクリックしても状態が変化しません。
      </div>
      <ui-switch
        id="disabled-blocked"
        label="クリックしても変化しない（無効）"
        disabled
      ></ui-switch>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#disabled-blocked');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    let changeEventFired = false;
    sw.addEventListener('change', () => { changeEventFired = true; });

    // pointer-events: none のため直接クリックは届かないが、
    // プログラム的に _toggle を呼ぼうとしても disabled チェックで弾かれることを確認
    // Shadow DOM 内の track に直接クリックイベントを送る
    const track = sw.shadowRoot?.querySelector<HTMLElement>('.track');
    if (!track) throw new Error('Track not found');

    // disabled 時は pointer-events: none なので、dispatchEvent で強制的にテスト
    track.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (sw.checked) throw new Error('無効状態のスイッチはクリックしても状態が変化しないはずです');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changeEventFired) throw new Error('無効状態のスイッチは change イベントを発火しないはずです');
  },
};

/**
 * ⚠️ 境界条件: ON 状態の Disabled。
 *
 * ON 状態かつ disabled の場合、トラックは `--primary` 色を維持し、
 * Thumb は右端位置を維持します。操作はブロックされます。
 */
export const OnDisabledClickBlocked: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: ON + disabled 状態では、見た目は ON を維持しつつ操作をブロックします。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0.01 80 / 0.3);
          border: 1px solid oklch(80% 0.05 80 / 0.4);
          border-radius: 6px;
          font-size: 13px;
        "
      >
        <strong>⚠️ 境界条件</strong>: ON + disabled 状態では ON の見た目を維持しつつ操作をブロックします。
      </div>
      <ui-switch
        id="on-disabled-blocked"
        label="ON（無効・変更不可）"
        checked
        disabled
      ></ui-switch>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#on-disabled-blocked');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    // 初期状態: ON かつ disabled
    if (!sw.checked) throw new Error('初期状態で checked が true であることを期待していましたが false でした');
    if (!sw.disabled) throw new Error('disabled が true であることを期待していましたが false でした');

    let changeEventFired = false;
    sw.addEventListener('change', () => { changeEventFired = true; });

    const track = sw.shadowRoot?.querySelector<HTMLElement>('.track');
    if (!track) throw new Error('Track not found');

    track.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // ON 状態が維持されている
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!sw.checked) throw new Error('ONかつ無効状態のスイッチは、クリック後も checked 状態を維持するはずです');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changeEventFired) throw new Error('ONかつ無効状態のスイッチは change イベントを発火しないはずです');
  },
};

/**
 * ⚠️ 境界条件: ラベルなし（label 属性未設定）。
 *
 * `label` 属性が未設定の場合、コントロールのみが表示されます。
 * この場合、外部から `aria-label` を提供してアクセシビリティを確保してください。
 */
export const NoLabel: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `label` 属性が未設定の場合。コントロールのみが表示されます。外部から `aria-label` を提供してください。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <ui-switch id="no-label-switch" aria-label="ラベルなしスイッチ"></ui-switch>
      <span style="font-size: 14px; color: oklch(20% 0.01 250);">外部ラベル（aria-label で紐付け）</span>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#no-label-switch');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    // テスト: ラベル要素が存在しない
    const label = sw.shadowRoot?.querySelector('.label');
    if (label) throw new Error('label プロパティが空の場合、ラベル要素は存在しないはずです');

    // テスト: トラックは存在する
    const track = sw.shadowRoot?.querySelector('.track');
    if (!track) throw new Error('ラベルがなくても track 要素は存在するはずです');
    if (!track.getAttribute('aria-label')) {
      throw new Error('aria-label が内部のスイッチ要素に転送されることを期待していましたがされていませんでした');
    }

    // テスト: aria-labelledby は設定されない（label がないため）
    if (track.getAttribute('aria-labelledby')) {
      throw new Error('ラベルが空の時はaria-labelledby を設定すべきではありません');
    }
  },
};

/**
 * ⚠️ 境界条件: フォーム内での Enter キー送信ブロック。
 *
 * フォーム内に配置されたスイッチで Enter キーを押しても、
 * フォームが送信されないことを確認します。
 * これは「即時実行」コンポーネントの重要な仕様です。
 */
export const EnterKeyInFormNoSubmit: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: フォーム内で Enter キーを押してもフォームが送信されません。`event.preventDefault()` でブロックします。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0.01 80 / 0.3);
          border: 1px solid oklch(80% 0.05 80 / 0.4);
          border-radius: 6px;
          font-size: 13px;
        "
      >
        <strong>⚠️ 境界条件</strong>: フォーム内で Enter キーを押してもフォームが送信されません。
      </div>
      <form
        id="boundary-form"
        style="display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px;"
        @submit="${(e: Event) => {
      e.preventDefault();
      const log = document.getElementById('boundary-log');
      if (log) log.textContent = '⚠️ フォームが送信されました（これは発生してはいけません）';
    }}"
      >
        <ui-switch
          id="boundary-switch"
          label="フォーム内スイッチ（Enter でトグルのみ）"
        ></ui-switch>
        <button
          type="submit"
          style="
            padding: 0 12px;
            height: 32px;
            background: oklch(60% 0.15 250);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            width: fit-content;
          "
        >
          送信ボタン（クリックで送信）
        </button>
      </form>
      <div
        id="boundary-log"
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
        Enter キーを押してもここに「フォームが送信されました」と表示されないことを確認してください
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#boundary-switch');
    if (!sw) throw new Error('ui-switch が見つかりません');
    await sw.updateComplete;

    const track = sw.shadowRoot?.querySelector<HTMLElement>('.track');
    if (!track) throw new Error('.track が見つかりません');

    let formSubmitted = false;
    const form = canvasElement.querySelector<HTMLFormElement>('#boundary-form');
    if (form) {
      form.addEventListener('submit', () => { formSubmitted = true; });
    }

    track.focus();

    const changePromise = new Promise<boolean>((resolve) => {
      sw.addEventListener('change', (e) => {
        resolve((e.target as Switch).checked);
      }, { once: true });
    });

    // Enter キーを発火
    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));

    const newChecked = await Promise.race([
      changePromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (newChecked === null) throw new Error('Enter キーで change イベントが発火しませんでした');
    if (!newChecked) throw new Error('Enter キー押下後に checked が true になることを期待していましたが false のままでした');

    await new Promise((resolve) => setTimeout(resolve, 100));
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (formSubmitted) throw new Error('Enter キーでフォームが送信されてしまいました');

  },
};

/**
 * ⚠️ 境界条件: aria-labelledby の設定。
 *
 * `label` 属性が設定されている場合、トラックに `aria-labelledby` が設定されます。
 * `label` が空の場合は `aria-labelledby` は設定されません。
 */
export const AriaLabelledBy: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `label` 属性が設定されている場合のみ `aria-labelledby` が設定されます。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <ui-switch id="labeled-switch" label="aria-labelledby テスト"></ui-switch>
      <ui-switch id="unlabeled-switch" aria-label="ラベルなし（aria-label で代替）"></ui-switch>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const labeled = canvasElement.querySelector<Switch>('#labeled-switch');
    const unlabeled = canvasElement.querySelector<Switch>('#unlabeled-switch');
    if (!labeled || !unlabeled) throw new Error('ui-switchが見つかりません');

    await Promise.all([labeled.updateComplete, unlabeled.updateComplete]);

    // テスト: label あり → aria-labelledby が設定される
    const labeledTrack = labeled.shadowRoot?.querySelector('.track');
    if (!labeledTrack) throw new Error('.track が見つかりません');
    if (!labeledTrack.getAttribute('aria-labelledby')) {
      throw new Error('label がある場合は aria-labelledby を設定すべきです');
    }

    // テスト: label なし → aria-labelledby は設定されない
    const unlabeledTrack = unlabeled.shadowRoot?.querySelector('.track');
    if (!unlabeledTrack) throw new Error('.track が見つかりません');
    if (unlabeledTrack.getAttribute('aria-labelledby')) {
      throw new Error('ラベルがない場合は aria-labelledby を設定すべきではありません');
    }
    if (!unlabeledTrack.getAttribute('aria-label')) {
      throw new Error('ラベルがない場合は aria-label を設定すべきです');
    }
  },
};

/**
 * ⚠️ 境界条件: input イベントも発火する。
 *
 * `change` イベントと同タイミングで `input` イベントも発火します。
 * リアルタイム監視（即時反映）のユースケースに対応します。
 */
export const InputEventFired: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `change` と同タイミングで `input` イベントも発火します。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div
        style="
          padding: 0.75rem 1rem;
          background: oklch(97% 0.01 80 / 0.3);
          border: 1px solid oklch(80% 0.05 80 / 0.4);
          border-radius: 6px;
          font-size: 13px;
        "
      >
        <strong>⚠️ 境界条件</strong>: change と同タイミングで input イベントも発火します。
      </div>
      <ui-switch
        id="input-event-switch"
        label="input イベントテスト"
      ></ui-switch>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#input-event-switch');
    if (!sw) throw new Error('ui-switchが見つかりません');
    await sw.updateComplete;

    let changeCount = 0;
    let inputCount = 0;

    sw.addEventListener('change', () => { changeCount++; });
    sw.addEventListener('input', () => { inputCount++; });

    const track = sw.shadowRoot?.querySelector<HTMLElement>('.track');
    if (!track) throw new Error('.track が見つかりません');

    track.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (changeCount !== 1) throw new Error(`change イベントは1回発火するはずでしたが、実際は ${String(changeCount)} 回でした`);
    if (inputCount !== 1) throw new Error(`input イベントは1回発火するはずでしたが、実際は ${String(inputCount)} 回でした`);
  },
};

// ──────────────────────────────────────────────
// 実際のユースケース
// ──────────────────────────────────────────────

/**
 * 設定パネルの例。
 *
 * 複数のスイッチを設定パネルとして使用する典型的なユースケースです。
 * 各スイッチは独立して即時反映されます。
 */
export const SettingsPanel: Story = {
  render: () => html`
    <style>
      .settings-panel {
        max-width: 400px;
        padding: 1.5rem;
        background: oklch(97% 0 0);
        border-radius: 8px;
        border: 1px solid oklch(90% 0.01 250 / 0.2);
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .settings-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.875rem 0;
        border-bottom: 1px solid oklch(90% 0.01 250 / 0.15);
      }
      .settings-item:last-child {
        border-bottom: none;
      }
      .settings-info {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }
      .settings-title {
        font-size: 14px;
        font-weight: 500;
        color: oklch(20% 0.01 250);
      }
      .settings-desc {
        font-size: 12px;
        color: oklch(48% 0.01 250);
      }
    </style>

    <div class="settings-panel">
      <div class="settings-item">
        <div class="settings-info">
          <div class="settings-title">ダークモード</div>
          <div class="settings-desc">画面を暗いテーマで表示します</div>
        </div>
        <ui-switch id="setting-dark" checked></ui-switch>
      </div>

      <div class="settings-item">
        <div class="settings-info">
          <div class="settings-title">プッシュ通知</div>
          <div class="settings-desc">新着情報をリアルタイムで受け取ります</div>
        </div>
        <ui-switch id="setting-notify"></ui-switch>
      </div>

      <div class="settings-item">
        <div class="settings-info">
          <div class="settings-title">自動保存</div>
          <div class="settings-desc">変更を自動的に保存します（管理者のみ変更可）</div>
        </div>
        <ui-switch id="setting-autosave" checked disabled></ui-switch>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const darkSwitch = canvasElement.querySelector<Switch>('#setting-dark');
    const notifySwitch = canvasElement.querySelector<Switch>('#setting-notify');
    const autosaveSwitch = canvasElement.querySelector<Switch>('#setting-autosave');

    if (!darkSwitch || !notifySwitch || !autosaveSwitch) {
      throw new Error('ui-switchが見つかりません');
    }

    await Promise.all([
      darkSwitch.updateComplete,
      notifySwitch.updateComplete,
      autosaveSwitch.updateComplete,
    ]);

    // テスト: ダークモードは ON
    if (!darkSwitch.checked) throw new Error('ダークモードスイッチはONであるべきです');

    // テスト: 通知は OFF
    if (notifySwitch.checked) throw new Error('通知スイッチはOFFであるべきです');

    // テスト: 自動保存は ON + disabled
    if (!autosaveSwitch.checked) throw new Error('自動保存スイッチはONであるべきです');
    if (!autosaveSwitch.disabled) throw new Error('自動保存スイッチはdisabledであるべきです');

    // テスト: disabled スイッチはクリックしても変化しない
    let changeEventFired = false;
    autosaveSwitch.addEventListener('change', () => { changeEventFired = true; });
    const autosaveTrack = autosaveSwitch.shadowRoot?.querySelector<HTMLElement>('.track');
    if (autosaveTrack) {
      autosaveTrack.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!autosaveSwitch.checked) throw new Error('disabledな自動保存スイッチはONのままあるべきです');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changeEventFired) throw new Error('disabledな自動保存スイッチはchangeイベントを発火させるべきではありません');
  },
};

/**
 * ダークトークン環境での表示確認。
 */
export const DarkTokens: Story = {
  render: () => html`
    <style>
      .dark-surface {
        --bg-fill-muted: oklch(28% 0.01 250);
        --primary: oklch(68% 0.15 255);
        --primary-hover: oklch(74% 0.13 255);
        --fg-default: oklch(92% 0.01 250);
        --white: oklch(98% 0 0);
        max-width: 420px;
        padding: 1rem;
        border-radius: 10px;
        background: oklch(18% 0.01 250);
        border: 1px solid oklch(34% 0.01 250);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
    </style>
    <div class="dark-surface">
      <ui-switch id="dark-off" label="Dark OFF"></ui-switch>
      <ui-switch id="dark-on" label="Dark ON" checked></ui-switch>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const off = canvasElement.querySelector<Switch>('#dark-off');
    const on = canvasElement.querySelector<Switch>('#dark-on');
    if (!off || !on) throw new Error('ui-switchが見つかりません');

    await Promise.all([off.updateComplete, on.updateComplete]);

    const offTrack = off.shadowRoot?.querySelector<HTMLElement>('.track');
    const onTrack = on.shadowRoot?.querySelector<HTMLElement>('.track');
    if (!offTrack || !onTrack) throw new Error('.track が見つかりません');

    const offBg = getComputedStyle(offTrack).backgroundColor;
    const onBg = getComputedStyle(onTrack).backgroundColor;
    if (offBg === onBg) {
      throw new Error('OFFとONのトラックカラーがダークトークン環境で異なるべき');
    }
  },
};

/**
 * Reduced Motion 環境の検証。
 */
export const ReducedMotion: Story = {
  parameters: {
    docs: {
      description: {
        story: 'OSでreduceが有効な場合のみ、transition時間が最小化されることを検証します。',
      },
    },
  },
  render: () => html`
    <ui-switch id="reduced-motion-switch" label="Reduced Motion"></ui-switch>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#reduced-motion-switch');
    if (!sw) throw new Error('ui-switchが見つかりません');
    await sw.updateComplete;

    const thumb = sw.shadowRoot?.querySelector<HTMLElement>('.thumb');
    if (!thumb) throw new Error('.thumb が見つかりません');

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!media.matches) return;

    const duration = getComputedStyle(thumb).transitionDuration;
    const isReduced = duration.includes('0s') || duration.includes('0.00001s') || duration.includes('0.01ms');
    if (!isReduced) {
      throw new Error(`reduced motion durationが期待値と異なります。実際は "${duration}" です`);
    }
  },
};

/**
 * Forced Colors 環境の検証。
 */
export const ForcedColors: Story = {
  parameters: {
    docs: {
      description: {
        story: 'OSでforced-colorsが有効な場合のみ、境界線が視認できることを検証します。',
      },
    },
  },
  render: () => html`
    <ui-switch id="forced-colors-switch" label="Forced Colors" checked></ui-switch>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<Switch>('#forced-colors-switch');
    if (!sw) throw new Error('ui-switchが見つかりません');
    await sw.updateComplete;

    const track = sw.shadowRoot?.querySelector<HTMLElement>('.track');
    if (!track) throw new Error('.track が見つかりません');

    const media = window.matchMedia('(forced-colors: active)');
    if (!media.matches) return;

    const borderStyle = getComputedStyle(track).borderStyle;
    if (borderStyle === 'none') {
      throw new Error('forced-colorsモードでは境界線が視認できるはずです');
    }
  },
};
