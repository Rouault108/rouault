import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './card';
import type { Card } from './card';

// ────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────

/** テスト用リンクにクリックスパイをアタッチし、クリック数を返すカウンタを返す */
const attachLinkSpy = (card: Card): (() => number) => {
  const link = card.querySelector<HTMLAnchorElement>('a[href]');
  let count = 0;
  link?.addEventListener('click', (e) => {
    // ページ遷移を防ぐ
    e.preventDefault();
    count++;
  });
  return () => count;
};

/** 指定セレクタのリンクにクリックスパイを設定し、クリック数カウンタを返す */
const attachNamedLinkSpy = (
  card: Card,
  selector: string,
): (() => number) => {
  const link = card.querySelector<HTMLAnchorElement>(selector);
  let count = 0;
  link?.addEventListener('click', (e) => {
    e.preventDefault();
    count++;
  });
  return () => count;
};

/**
 * ## カード (Card)
 *
 * 関連する情報をグルーピングし、一つのまとまりとして提示するコンテナコンポーネントです。
 *
 * ### バリアント
 *
 * | バリアント | 用途 |
 * |------------|------|
 * | `outlined` | 枠線で輪郭。Hover 時に浮上（デフォルト） |
 * | `elevated` | 影で浮き上がりを表現 |
 * | `flat` | 背景色で領域を示す（影なし） |
 * | `ghost` | 最小限の枠線のみ（最も静謐） |
 *
 * ### クリック委譲のキャンセル条件
 *
 * | 条件 | 理由 |
 * |------|------|
 * | 主ボタン以外（中クリック等） | ブラウザのネイティブ操作を優先 |
 * | 修飾キー押下（Ctrl / Cmd / Shift / Alt） | 別タブで開く等の操作を優先 |
 * | テキスト選択中 | コピー操作を阻害しない |
 * | `<a>` / `<button>` / `[role="button"]` への直接クリック | ネイティブ挙動を優先 |
 */
const meta: Meta<Card> = {
  title: 'Components/Card',
  component: 'ui-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
カードコンポーネントは、関連する情報をグルーピングして一つのまとまりとして提示するコンテナです。

## 使用方法

\`\`\`html
<!-- シンプルなコンテンツカード -->
<ui-card>
  <p>本文テキスト</p>
</ui-card>

<!-- クリック可能なノートカード -->
<ui-card variant="elevated" clickable>
  <h2 slot="header">ノートタイトル</h2>
  <p>本文。<a href="/notes/1">詳細へ（主要リンク）</a></p>
  <time slot="footer">2024-01-01</time>
</ui-card>
\`\`\`
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['outlined', 'elevated', 'flat', 'ghost'],
      description: 'カードの外観スタイル',
    },
    clickable: {
      control: 'boolean',
      description: 'クリック可能モード（ホバーエフェクト + クリック委譲）',
    },
  },
};

export default meta;
type Story = StoryObj<Card>;

// ────────────────────────────────────────────
// 1. Default: Outlined バリアントの基本表示
// ────────────────────────────────────────────

/**
 * `outlined`（デフォルト）バリアントの基本表示です。
 *
 * ### 確認ポイント
 * - `role="article"` が自動設定されること（未指定時）
 * - `variant="outlined"` が reflect されること
 * - Shadow DOM に 3 つのスロットが存在すること
 * - `clickable` 属性が存在しないこと
 */
export const Default: Story = {
  args: {
    variant: 'outlined',
  },
  render: () => html`
    <ui-card>
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">ノートのタイトル</h3>
      <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
        本文のテキストがここに入ります。カードはコンテンツをグルーピングする役割を果たします。
      </p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('ui-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    // テスト: role="article" が自動設定されること
    const role = card.getAttribute('role');
    if (role !== 'article') {
      throw new Error(`role="article" を期待していましたが、実際には "${role ?? 'null'}" でした`);
    }

    // テスト: variant="outlined" が reflect されること
    const variant = card.getAttribute('variant');
    if (variant !== 'outlined') {
      throw new Error(`variant="outlined" を期待していましたが、実際には "${variant ?? 'null'}" でした`);
    }

    // テスト: clickable 属性が存在しないこと
    if (card.hasAttribute('clickable')) {
      throw new Error('非 clickable カードに clickable 属性が設定されています');
    }

    // テスト: Shadow DOM に 3 つのスロットが存在すること
    const slots = card.shadowRoot?.querySelectorAll('slot');
    if (!slots || slots.length < 3) {
      throw new Error(`3つのスロットを期待していましたが、実際には ${String(slots?.length ?? 0)}個でした`);
    }

    const headerSlot = card.shadowRoot?.querySelector('slot[name="header"]');
    const defaultSlot = card.shadowRoot?.querySelector('slot:not([name])');
    const footerSlot = card.shadowRoot?.querySelector('slot[name="footer"]');

    if (!headerSlot) throw new Error('header スロットが見つかりません');
    if (!defaultSlot) throw new Error('デフォルトスロットが見つかりません');
    if (!footerSlot) throw new Error('footer スロットが見つかりません');
  },
};

// ────────────────────────────────────────────
// 2. ElevatedVariant: Elevated バリアント
// ────────────────────────────────────────────

/**
 * `elevated` バリアントの表示です。影で背景から浮き上がっていることを表現します。
 *
 * Dark モードでは `inset 0 1px 0 0 oklch(100% 0 0 / 0.1)` の
 * Edge Highlight がエッジを立たせます（border は使用しません）。
 *
 * ### 確認ポイント
 * - `variant="elevated"` 属性が設定されること
 * - `border: none` が適用されること（DevTools で確認）
 * - 背景色が `--bg-surface-2` であること
 * - Shadow が `--elevation-md` であること
 */
export const ElevatedVariant: Story = {
  args: {
    variant: 'elevated',
  },
  render: () => html`
    <ui-card variant="elevated">
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">Elevated カード</h3>
      <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
        影で背景から浮き上がっています。Dark モードでは Edge Highlight がエッジを強調します。
      </p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('ui-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    // テスト: variant="elevated" が設定されること
    if (card.getAttribute('variant') !== 'elevated') {
      throw new Error(`variant="elevated" を期待していましたが、実際には "${card.getAttribute('variant') ?? 'null'}" でした`);
    }

    // テスト: JS プロパティが正しく設定されること
    if (card.variant !== 'elevated') {
      throw new Error(`card.variant="elevated" を期待していましたが、実際には "${card.variant}" でした`);
    }
  },
};

// ────────────────────────────────────────────
// 3. FlatVariant: Flat バリアント
// ────────────────────────────────────────────

/**
 * `flat` バリアントの表示です。
 * `--bg-fill-muted` で領域を示します（`--bg-surface-2` ではありません）。
 *
 * ### 設計ノート
 * `flat` は影なしで領域を明示する際に使用します。
 * `--bg-fill-muted` は「構造的背景色」として意味論的に正確です。
 * `--bg-surface-2` は `elevated`（影あり）コンテキスト専用です。
 */
export const FlatVariant: Story = {
  args: {
    variant: 'flat',
  },
  render: () => html`
    <ui-card variant="flat">
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">Flat カード</h3>
      <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
        影なしで領域を明示します。コードブロックや入力フォーム背景と同等の視覚的重みを持ちます。
      </p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('ui-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    if (card.getAttribute('variant') !== 'flat') {
      throw new Error(`variant="flat" を期待していましたが、実際には "${card.getAttribute('variant') ?? 'null'}" でした`);
    }
  },
};

// ────────────────────────────────────────────
// 4. GhostVariant: Ghost バリアント
// ────────────────────────────────────────────

/**
 * `ghost` バリアントの表示です。最も静謐な表現で、淡い枠線のみを持ちます。
 *
 * `--border-ghost` は `--border-default` よりさらに薄いトークンです。
 * 背景は透明で、コンテンツに最大限フォーカスを当てます。
 */
export const GhostVariant: Story = {
  args: {
    variant: 'ghost',
  },
  render: () => html`
    <ui-card variant="ghost">
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">Ghost カード</h3>
      <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
        最も静謐な表現です。淡い枠線のみで、背景は透明です。
      </p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('ui-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    if (card.getAttribute('variant') !== 'ghost') {
      throw new Error(`variant="ghost" を期待していましたが、実際には "${card.getAttribute('variant') ?? 'null'}" でした`);
    }
  },
};

// ────────────────────────────────────────────
// 5. AllVariants: 全バリアント比較（視覚確認用）
// ────────────────────────────────────────────

/**
 * 全 4 バリアントを並べて比較できます。
 * デザインレビューや Dark/Light モード切替の視覚確認に使用します。
 */
export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      ${(['outlined', 'elevated', 'flat', 'ghost'] as const).map(
    (variant) => html`
          <div>
            <div
              style="
              font-size: var(--text-xs);
              font-weight: var(--font-medium);
              color: var(--fg-muted);
              margin-bottom: 0.5rem;
              font-family: var(--font-mono);
            "
            >
              variant="${variant}"
            </div>
            <ui-card variant="${variant}">
              <h3 style="margin: 0 0 0.25rem; font-size: var(--text-base);">
                ${variant.charAt(0).toUpperCase() + variant.slice(1)} カード
              </h3>
              <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
                バリアント比較用のサンプルコンテンツです。
              </p>
            </ui-card>
          </div>
        `,
  )}
    </div>
  `,
};

// ────────────────────────────────────────────
// 6. WithAllSlots: 全スロット使用例
// ────────────────────────────────────────────

/**
 * `header`・デフォルト・`footer` の全スロットを使用した例です。
 *
 * ### 確認ポイント
 * - 各スロットに正しいコンテンツが割り当てられること
 * - `header` は上部、デフォルトは中央、`footer` は下部に表示されること
 */
export const WithAllSlots: Story = {
  render: () => html`
    <ui-card style="max-width: 360px;">
      <div slot="header" style="border-bottom: 1px solid var(--border-default); padding-bottom: var(--space-3); margin-bottom: var(--space-3);">
        <h3 style="margin: 0; font-size: var(--text-base); font-weight: var(--font-medium);">
          ノートタイトル
        </h3>
        <p style="margin: 0.25rem 0 0; font-size: var(--text-xs); color: var(--fg-muted);">
          カテゴリ: デザインシステム
        </p>
      </div>

      <p style="margin: 0; font-size: var(--text-sm); line-height: var(--line-height-relaxed);">
        これはデフォルトスロットに配置されたメインコンテンツです。
        カードの主要な情報はここに記述します。
      </p>

      <div
        slot="footer"
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-default);
          padding-top: var(--space-3);
          margin-top: var(--space-3);
          font-size: var(--text-xs);
          color: var(--fg-muted);
        "
      >
        <time>2024-01-15</time>
        <span>読了時間: 3分</span>
      </div>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('ui-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    // テスト: header スロットにコンテンツが割り当てられていること
    const headerContent = card.querySelector('[slot="header"]');
    if (!headerContent) throw new Error('header スロットにコンテンツが割り当てられていません');

    // テスト: footer スロットにコンテンツが割り当てられていること
    const footerContent = card.querySelector('[slot="footer"]');
    if (!footerContent) throw new Error('footer スロットにコンテンツが割り当てられていません');

    // テスト: デフォルトスロットにコンテンツが割り当てられていること
    // スロットなしの子要素（p タグ）が存在すること
    const defaultContent = Array.from(card.children).find(
      (child) => !child.hasAttribute('slot'),
    );
    if (!defaultContent) throw new Error('デフォルトスロットにコンテンツが割り当てられていません');
  },
};

// ────────────────────────────────────────────
// 7. Clickable: クリック委譲の基本動作
// ────────────────────────────────────────────

/**
 * `clickable` 属性が有効な場合のクリック委譲動作を確認します。
 *
 * カード全体のクリックが内部の主要リンクへ委譲されます。
 *
 * ### 確認ポイント
 * - `clickable` 属性が設定されること
 * - カード背景クリックでリンクがクリックされること
 * - `cursor: pointer` が適用されること（視覚確認）
 */
export const Clickable: Story = {
  render: () => html`
    <div id="click-log" style="
      padding: 0.75rem;
      background: var(--bg-surface-2);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      margin-bottom: 1rem;
      font-family: var(--font-mono);
    ">
      カード背景をクリックしてください
    </div>

    <ui-card
      id="clickable-card"
      clickable
      style="max-width: 360px;"
    >
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">
        <a
          href="/notes/1"
          id="primary-link"
          style="color: inherit; text-decoration: none;"
          @click="${(e: MouseEvent) => {
      e.preventDefault();
      const log = document.getElementById('click-log');
      if (log) log.textContent = '✅ クリック委譲が機能しました → /notes/1 へ遷移';
    }}"
        >クリック可能なノートカード</a>
      </h3>
      <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
        カードのどこをクリックしても、上のリンクへ委譲されます。
      </p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('#clickable-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    // テスト: clickable 属性が設定されること
    if (!card.hasAttribute('clickable')) {
      throw new Error('clickable 属性が設定されていません');
    }

    if (!card.clickable) {
      throw new Error('card.clickable プロパティが true であることを期待していましたが、実際には false でした');
    }

    // テスト: カード背景クリックでリンクが発火すること
    const getCount = attachLinkSpy(card);

    // カード要素自体へのクリックを模擬（パディング領域のクリック）
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await card.updateComplete;

    if (getCount() !== 1) {
      throw new Error(`カード背景クリックで主要リンクへの委譲（発火回数: 1）を期待していましたが、実際には ${String(getCount())}回でした`);
    }
  },
};

// ────────────────────────────────────────────
// 8. ClickDelegationGuards: 委譲キャンセル条件（境界条件）
// ────────────────────────────────────────────

/**
 * **境界条件**: クリック委譲がキャンセルされる各条件を確認します。
 *
 * テキスト選択性（Selectability）やブラウザのネイティブ操作を阻害しないことが
 * ナレッジ管理ツールとして重要です。
 *
 * ### テストする境界条件
 * 1. 中クリック（`button: 1`）→ 委譲しない
 * 2. `ctrlKey` → 委譲しない（新しいタブで開く操作）
 * 3. `metaKey` → 委譲しない（Mac での新しいタブで開く操作）
 * 4. `shiftKey` → 委譲しない（新しいウィンドウで開く操作）
 * 5. `altKey` → 委譲しない（ファイル保存操作）
 * 6. `<button>` への直接クリック → 委譲しない
 * 7. `<a>` への直接クリック → 委譲しない（自身のリンクで処理）
 */
export const ClickDelegationGuards: Story = {
  render: () => html`
    <ui-card id="guard-card" clickable style="max-width: 400px;">
      <h3 style="margin: 0 0 0.75rem; font-size: var(--text-base);">
        <a href="/notes/guard" id="guard-link" style="color: inherit; text-decoration: none;">
          委譲ガードテスト用カード
        </a>
      </h3>
      <p style="margin: 0 0 0.75rem; font-size: var(--text-sm); color: var(--fg-muted);">
        下のボタンは独自のアクションを持ちます。カードクリックとは独立して動作します。
      </p>
      <button
        id="action-button"
        style="
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-default);
          background: transparent;
          cursor: pointer;
          font-size: var(--text-sm);
        "
      >
        独立したアクション
      </button>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('#guard-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    const getCount = attachLinkSpy(card);

    // ── Guard 1: 中クリック（button: 1）は委譲しない ──
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 1 }));
    await card.updateComplete;
    if (getCount() !== 0) {
      throw new Error('Guard 1 失敗: 中クリックで委譲が発生してはいけません');
    }

    // ── Guard 2: ctrlKey は委譲しない ──
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, ctrlKey: true }));
    await card.updateComplete;
    if (getCount() !== 0) {
      throw new Error('Guard 2 失敗: ctrlKey 押下で委譲が発生してはいけません');
    }

    // ── Guard 3: metaKey は委譲しない ──
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, metaKey: true }));
    await card.updateComplete;
    if (getCount() !== 0) {
      throw new Error('Guard 3 失敗: metaKey 押下で委譲が発生してはいけません');
    }

    // ── Guard 4: shiftKey は委譲しない ──
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, shiftKey: true }));
    await card.updateComplete;
    if (getCount() !== 0) {
      throw new Error('Guard 4 失敗: shiftKey 押下で委譲が発生してはいけません');
    }

    // ── Guard 5: altKey は委譲しない ──
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, altKey: true }));
    await card.updateComplete;
    if (getCount() !== 0) {
      throw new Error('Guard 5 失敗: altKey 押下で委譲が発生してはいけません');
    }

    // ── Guard 6: <button> への直接クリックは委譲しない ──
    const button = card.querySelector<HTMLButtonElement>('#action-button');
    if (!button) throw new Error('テスト用ボタンが見つかりません');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await card.updateComplete;
    if (getCount() !== 0) {
      throw new Error('Guard 6 失敗: <button> への直接クリックで委譲が発生してはいけません');
    }

    // ── Guard 7: <a> への直接クリックは委譲しない ──
    // <a> 自身はクリックを処理する（委譲は不要）
    // ここでは「委譲がキャンセルされること」を確認する
    // ※ link.click() を呼んでも count は増えない（addEventListener は既にスパイ済み）
    //   <a> への直接クリックは既存のリンク処理に委ねる
    const link = card.querySelector<HTMLAnchorElement>('#guard-link');
    if (!link) throw new Error('テスト用リンクが見つかりません');

    // リンク自体をクリックしても「委譲による二重発火」はないことを確認
    // （リンクの click は 1 回だが、それは委譲ではなくリンク自身のクリック）
    const countBeforeLinkClick = getCount();
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await card.updateComplete;
    // count は 1 増えるが、それは委譲ではなくリンク自身のリスナーによるもの
    if (getCount() !== countBeforeLinkClick + 1) {
      throw new Error(
        `Guard 7: リンク自身のクリックで count が 1 増えるべきです（委譲による二重発火ではない）`,
      );
    }

    // 重要: ここまでの累計で委譲による余分な発火がないことを確認
    // (Guards 1-6 で 0 のまま、Guard 7 でリンク自身が 1 回)
    if (getCount() !== 1) {
      throw new Error(
        `Guard 7 後の累計が 1 であるべきですが ${String(getCount())} です（委譲による余分な発火がある可能性）`,
      );
    }

    console.log('✅ ClickDelegationGuards: すべてのガードが正常に機能しています');
  },
};

// ────────────────────────────────────────────
// 9. TextSelectionGuard: テキスト選択中のクリック（境界条件）
// ────────────────────────────────────────────

/**
 * **境界条件**: テキスト選択中のクリックは委譲されません。
 *
 * ナレッジ管理ツールにおける「テキスト選択性（Selectability）」の維持を確認します。
 * ユーザーがテキストをコピーしようとしている際に、意図せず遷移しないことが重要です。
 */
export const TextSelectionGuard: Story = {
  render: () => html`
    <ui-card id="selection-card" clickable style="max-width: 400px;">
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">
        <a href="/notes/selection" id="selection-link" style="color: inherit; text-decoration: none;">
          テキスト選択テスト
        </a>
      </h3>
      <p id="selectable-text" style="margin: 0; font-size: var(--text-sm);">
        このテキストを選択してからカードをクリックしても、リンクへ遷移しません。
      </p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('#selection-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    const getCount = attachLinkSpy(card);

    // テキストを選択状態にする（instanceof で型安全かつ ESLint フレンドリーに判定）
    const textEl = card.querySelector('#selectable-text');
    const rawNode = textEl?.firstChild;
    if (rawNode instanceof Text) {
      const range = document.createRange();
      range.setStart(rawNode, 0);
      range.setEnd(rawNode, Math.min(10, rawNode.data.length));
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }

    // テキスト選択中にカードクリック
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await card.updateComplete;

    // 選択を解除
    window.getSelection()?.removeAllRanges();

    if (getCount() !== 0) {
      throw new Error('テキスト選択中にクリックで委譲が発生してはいけません');
    }

    // 選択解除後は委譲されること（正常動作の確認）
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await card.updateComplete;

    if (getCount() !== 1) {
      throw new Error('テキスト選択解除後はクリックで委譲が発生するはずです');
    }
  },
};

// ────────────────────────────────────────────
// 10. ClickableNoLink: 内部リンクなし（境界条件）
// ────────────────────────────────────────────

/**
 * **境界条件**: `clickable` だが内部に `<a href>` がない場合。
 *
 * クラッシュや例外が発生しないことを確認します。
 * 開発中に `clickable` を設定してリンクを追加し忘れるケースへの防御です。
 */
export const ClickableNoLink: Story = {
  render: () => html`
    <ui-card id="no-link-card" clickable style="max-width: 360px;">
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">リンクなしの clickable カード</h3>
      <p style="margin: 0; font-size: var(--text-sm); color: var(--fg-muted);">
        内部に <code>&lt;a href&gt;</code> がない場合、クリックしても何も起きません（エラーなし）。
      </p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('#no-link-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    // テスト: 内部に <a href> がないことを確認
    const link = card.querySelector<HTMLAnchorElement>('a[href]');
    if (link) throw new Error('このストーリーではリンクが存在しないはずです');

    // テスト: クリックしてもエラーが発生しないこと
    let errorOccurred = false;
    try {
      card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
      await card.updateComplete;
    } catch {
      errorOccurred = true;
    }

    if (errorOccurred) {
      throw new Error('リンクなし clickable カードのクリックでエラーが発生しました');
    }
  },
};

// ────────────────────────────────────────────
// 11. MultipleLinksPrimaryFirst: 複数リンク時の主要リンク委譲（境界条件）
// ────────────────────────────────────────────

/**
 * **境界条件**: `clickable` カード内に複数リンクがある場合、
 * カード背景クリックは最初の `<a href>`（主要リンク）へ委譲されることを確認します。
 */
export const MultipleLinksPrimaryFirst: Story = {
  render: () => html`
    <ui-card id="multiple-links-card" clickable style="max-width: 400px;">
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">
        <a href="/notes/primary" id="primary-link" style="color: inherit; text-decoration: none;">
          主要リンク（先頭）
        </a>
      </h3>
      <p style="margin: 0 0 0.75rem; font-size: var(--text-sm); color: var(--fg-muted);">
        背景クリックは主要リンクへ。副リンクの直接クリックは副リンク自身で処理されます。
      </p>
      <a href="/notes/secondary" id="secondary-link">副リンク</a>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('#multiple-links-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    const getPrimaryCount = attachNamedLinkSpy(card, '#primary-link');
    const getSecondaryCount = attachNamedLinkSpy(card, '#secondary-link');

    // 背景クリック時は先頭リンクへ委譲されること
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await card.updateComplete;

    if (getPrimaryCount() !== 1) {
      throw new Error(`主要リンクのクリック数が 1 であるべきですが ${String(getPrimaryCount())} です`);
    }
    if (getSecondaryCount() !== 0) {
      throw new Error(`副リンクのクリック数は 0 であるべきですが ${String(getSecondaryCount())} です`);
    }

    // 副リンク直接クリック時は委譲せず副リンク自身で処理されること
    const secondaryLink = card.querySelector<HTMLAnchorElement>('#secondary-link');
    if (!secondaryLink) throw new Error('副リンクが見つかりません');
    secondaryLink.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await card.updateComplete;

    if (getSecondaryCount() !== 1) {
      throw new Error(`副リンクのクリック数が 1 であるべきですが ${String(getSecondaryCount())} です`);
    }
    if (getPrimaryCount() !== 1) {
      throw new Error('副リンク直接クリックで主要リンクが増加しています（誤委譲の可能性）');
    }
  },
};

// ────────────────────────────────────────────
// 12. InteractiveElementsGuard: フォーム系要素の委譲抑止（境界条件）
// ────────────────────────────────────────────

/**
 * **境界条件**: 入力系・編集系要素への直接クリックでは委譲されないことを確認します。
 * `input` / `select` / `textarea` / `[contenteditable="true"]` / `[role="button"]`
 */
export const InteractiveElementsGuard: Story = {
  render: () => html`
    <ui-card id="interactive-guard-card" clickable style="max-width: 440px;">
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">
        <a href="/notes/interactive" id="interactive-primary" style="color: inherit; text-decoration: none;">
          主要リンク
        </a>
      </h3>

      <div style="display: grid; gap: 0.5rem;">
        <input id="guard-input" value="input" />
        <select id="guard-select">
          <option>select</option>
        </select>
        <textarea id="guard-textarea">textarea</textarea>
        <div id="guard-editable" contenteditable="true">contenteditable</div>
        <div id="guard-role-button" role="button" tabindex="0">role=button</div>
      </div>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('#interactive-guard-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    const getPrimaryCount = attachNamedLinkSpy(card, '#interactive-primary');
    const interactiveSelectors = [
      '#guard-input',
      '#guard-select',
      '#guard-textarea',
      '#guard-editable',
      '#guard-role-button',
    ] as const;

    for (const selector of interactiveSelectors) {
      const el = card.querySelector<HTMLElement>(selector);
      if (!el) throw new Error(`${selector} が見つかりません`);

      el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
      await card.updateComplete;

      if (getPrimaryCount() !== 0) {
        throw new Error(`${selector} 直接クリックで委譲が発生しています`);
      }
    }

    // 背景クリック時のみ委譲されること
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    await card.updateComplete;

    if (getPrimaryCount() !== 1) {
      throw new Error('背景クリックで主要リンク委譲が発生していません');
    }
  },
};

// ────────────────────────────────────────────
// 13. FocusWithin: キーボードフォーカスのアクセシビリティ
// ────────────────────────────────────────────

/**
 * キーボードフォーカス時のアクセシビリティを確認します。
 *
 * ### 設計方針（Focusable Container Anti-pattern の回避）
 * - カード自体には `tabindex` を設定しない
 * - 内部リンク・ボタンがフォーカスを受け取る
 * - CSS `:focus-within` でカード全体にフォーカスリングを描画する（視覚確認）
 *
 * ### 確認ポイント
 * - カードに `tabindex` 属性が存在しないこと（フォーカス対象外）
 * - 内部リンクが正常にフォーカスを受け取れること
 * - フォーカス時にカード全体にアウトラインが表示されること（視覚確認）
 */
export const FocusWithin: Story = {
  render: () => html`
    <div style="font-size: var(--text-sm); color: var(--fg-muted); margin-bottom: 1rem;">
      Tab キーでカード内リンクにフォーカスを当て、カード全体にフォーカスリングが表示されることを確認してください。
    </div>

    <ui-card id="focus-card" clickable style="max-width: 360px;">
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">
        <a href="/notes/focus" id="focus-link" style="color: inherit;">
          キーボードフォーカス確認カード
        </a>
      </h3>
      <p style="margin: 0; font-size: var(--text-sm); color: var(--fg-muted);">
        リンクにフォーカスすると、カード全体にフォーカスリングが描画されます。
      </p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('#focus-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    // テスト: カード自体に tabindex が設定されていないこと（Anti-pattern 回避）
    if (card.hasAttribute('tabindex')) {
      throw new Error(
        'Focusable Container Anti-pattern: カード自体に tabindex が設定されています。' +
        '内部リンクにフォーカスを委ねてください。',
      );
    }

    // テスト: 内部リンクが存在すること
    const link = card.querySelector<HTMLAnchorElement>('#focus-link');
    if (!link) throw new Error('内部リンクが見つかりません');

    // テスト: リンクがフォーカス可能であること
    link.focus();
    if (document.activeElement !== link) {
      throw new Error('内部リンクがフォーカスを受け取れません');
    }

    // フォーカス解除
    link.blur();
  },
};

// ────────────────────────────────────────────
// 14. DefaultRoleAutoSet: role="article" の自動設定
// ────────────────────────────────────────────

/**
 * `role` 属性が未指定の場合、`role="article"` が自動設定されることを確認します。
 *
 * ### 設計根拠
 * PKM（個人ナレッジ管理）ツールにおいてカードは通常「独立した記事」として
 * 機能するため、`article` がデフォルトとして最適です。
 */
export const DefaultRoleAutoSet: Story = {
  render: () => html`
    <ui-card id="default-role-card">
      <p style="margin: 0; font-size: var(--text-sm);">
        role 属性を指定していません。<code>role="article"</code> が自動設定されます。
      </p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('#default-role-card');
    if (!card) throw new Error('ui-card が見つかりません');

    await card.updateComplete;

    // テスト: role="article" が自動設定されること
    const role = card.getAttribute('role');
    if (role !== 'article') {
      throw new Error(`role が "article" であるべきですが "${role ?? 'null'}" です`);
    }
  },
};

// ────────────────────────────────────────────
// 15. ExplicitRoleOverride: 明示的な role 指定（境界条件）
// ────────────────────────────────────────────

/**
 * **境界条件**: `role` 属性を明示的に指定した場合、自動設定に上書きされないことを確認します。
 *
 * 独立した記事でない場合（ナビゲーション内のカード等）は
 * `role="section"` や `role="none"` を明示することが正しい使い方です。
 *
 * ### 確認ポイント
 * - `role="section"` が `role="article"` に上書きされないこと
 * - コンポーネントは外部指定の role を尊重すること
 */
export const ExplicitRoleOverride: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px;">
      <div>
        <div style="font-size: var(--text-xs); color: var(--fg-muted); margin-bottom: 0.5rem; font-family: var(--font-mono);">
          role="section"（明示指定）
        </div>
        <ui-card id="section-card" role="section">
          <p style="margin: 0; font-size: var(--text-sm);">
            <code>role="section"</code> を指定したカードです。
          </p>
        </ui-card>
      </div>

      <div>
        <div style="font-size: var(--text-xs); color: var(--fg-muted); margin-bottom: 0.5rem; font-family: var(--font-mono);">
          role="none"（装飾的な分離のみ）
        </div>
        <ui-card id="none-card" role="none">
          <p style="margin: 0; font-size: var(--text-sm);">
            <code>role="none"</code> を指定したカードです。意味論的なロールなしのラッパー。
          </p>
        </ui-card>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sectionCard = canvasElement.querySelector<Card>('#section-card');
    const noneCard = canvasElement.querySelector<Card>('#none-card');
    if (!sectionCard) throw new Error('#section-card が見つかりません');
    if (!noneCard) throw new Error('#none-card が見つかりません');

    await sectionCard.updateComplete;
    await noneCard.updateComplete;

    // テスト: role="section" が "article" に上書きされないこと
    const sectionRole = sectionCard.getAttribute('role');
    if (sectionRole !== 'section') {
      throw new Error(
        `section-card の role が "section" であるべきですが "${sectionRole ?? 'null'}" です（"article" に上書きされました）`,
      );
    }

    // テスト: role="none" が "article" に上書きされないこと
    const noneRole = noneCard.getAttribute('role');
    if (noneRole !== 'none') {
      throw new Error(
        `none-card の role が "none" であるべきですが "${noneRole ?? 'null'}" です（"article" に上書きされました）`,
      );
    }
  },
};

// ────────────────────────────────────────────
// 16. ClickableVariants: 全バリアント × Clickable（視覚確認）
// ────────────────────────────────────────────

/**
 * 全バリアントに `clickable` を適用した状態の視覚比較です。
 *
 * Hover 時の State Mutation を各バリアントで確認してください:
 * - **outlined**: Shadow 獲得・背景不透明化・枠線が薄くなる（浮上の演出）
 * - **elevated**: Shadow が `--elevation-md` → `--elevation-lg` へ強化
 * - **flat / ghost**: Scale のみ（Shadow・背景の変化なし）
 */
export const ClickableVariants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      ${(['outlined', 'elevated', 'flat', 'ghost'] as const).map(
    (variant) => html`
          <div>
            <div
              style="
              font-size: var(--text-xs);
              font-weight: var(--font-medium);
              color: var(--fg-muted);
              margin-bottom: 0.5rem;
              font-family: var(--font-mono);
            "
            >
              variant="${variant}" clickable
            </div>
            <ui-card variant="${variant}" clickable>
              <h3 style="margin: 0 0 0.25rem; font-size: var(--text-base);">
                <a href="/notes/${variant}" style="color: inherit; text-decoration: none;">
                  ${variant.charAt(0).toUpperCase() + variant.slice(1)} + Clickable
                </a>
              </h3>
              <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
                ホバーして State Mutation を確認してください。
              </p>
            </ui-card>
          </div>
        `,
  )}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cards = canvasElement.querySelectorAll<Card>('ui-card');
    if (cards.length !== 4) {
      throw new Error(`カードが 4 つ存在すべきですが ${String(cards.length)} つです`);
    }

    for (const card of cards) {
      await card.updateComplete;

      // テスト: 全カードに clickable 属性が設定されること
      if (!card.hasAttribute('clickable')) {
        throw new Error(`variant="${card.getAttribute('variant') ?? ''}" のカードに clickable 属性がありません`);
      }

      // テスト: 全カードに variant 属性が設定されること
      if (!card.hasAttribute('variant')) {
        throw new Error('variant 属性が設定されていないカードがあります');
      }

      // テスト: 全カードにカード背景クリックで委譲が機能すること
      const getCount = attachLinkSpy(card);
      card.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
      await card.updateComplete;

      if (getCount() !== 1) {
        throw new Error(
          `variant="${card.getAttribute('variant') ?? ''}" のクリック委譲が機能していません`,
        );
      }
    }
  },
};

// ────────────────────────────────────────────
// 17. DarkMode: ダークモードでの視覚確認
// ────────────────────────────────────────────

/**
 * ダーク背景におけるカードの視認性確認ストーリーです。
 * Elevated の Edge Highlight を含む、暗色環境での階層表現を確認できます。
 */
export const DarkMode: Story = {
  render: () => html`
    <div
      style="
        background: oklch(20% 0.01 250);
        color: oklch(95% 0.01 250);
        padding: 1.5rem;
        border-radius: var(--radius-lg);
      "
    >
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 420px;">
        <ui-card variant="outlined" clickable>
          <h3 style="margin: 0 0 0.4rem; font-size: var(--text-base);">
            <a href="/notes/dark-outlined" style="color: inherit; text-decoration: none;">
              Outlined / Dark
            </a>
          </h3>
          <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
            枠線と hover 浮上の視認性を確認します。
          </p>
        </ui-card>

        <ui-card id="dark-elevated" variant="elevated">
          <h3 style="margin: 0 0 0.4rem; font-size: var(--text-base);">Elevated / Dark</h3>
          <p style="margin: 0; color: var(--fg-muted); font-size: var(--text-sm);">
            Edge Highlight（inset shadow）を確認します。
          </p>
        </ui-card>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const elevated = canvasElement.querySelector<Card>('#dark-elevated');
    if (!elevated) throw new Error('#dark-elevated が見つかりません');

    await elevated.updateComplete;

    if (elevated.getAttribute('variant') !== 'elevated') {
      throw new Error('DarkMode: elevated カードの variant が不正です');
    }

    const style = getComputedStyle(elevated);
    if (!style.boxShadow || style.boxShadow === 'none') {
      throw new Error('DarkMode: elevated カードにシャドウが適用されていません');
    }
  },
};

// ────────────────────────────────────────────
// 18. ForcedColorsMode: 高コントラストモード（視覚確認）
// ────────────────────────────────────────────

/**
 * Forced Colors Mode（高コントラストモード）での表示確認です。
 *
 * シャドウと背景色が消失する環境でも、強制付与された境界線でカードの
 * 構造を認識できることを確認します。
 *
 * ### 確認方法
 * Chrome DevTools → Rendering → `forced-colors: active` を有効化してください。
 *
 * ### 期待される表示
 * - 全バリアントに `CanvasText` 色の境界線が付与される
 * - `clickable` カードの hover/focus-within に `Highlight` 色のアウトラインが付与される
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
      Chrome DevTools → Rendering → <code>forced-colors: active</code> を有効にして確認してください。
    </div>

    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px;">
      <ui-card variant="outlined">
        <p style="margin: 0; font-size: var(--text-sm);">Outlined（通常は枠線あり）</p>
      </ui-card>
      <ui-card variant="elevated">
        <p style="margin: 0; font-size: var(--text-sm);">Elevated（通常は枠線なし → 強制付与）</p>
      </ui-card>
      <ui-card variant="flat">
        <p style="margin: 0; font-size: var(--text-sm);">Flat（通常は枠線なし → 強制付与）</p>
      </ui-card>
      <ui-card variant="outlined" clickable>
        <p style="margin: 0; font-size: var(--text-sm);">
          <a href="/notes/forced">Clickable（hover/focus で Highlight アウトライン）</a>
        </p>
      </ui-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cards = canvasElement.querySelectorAll<Card>('ui-card');
    if (cards.length !== 4) {
      throw new Error(`ForcedColorsMode: カードが 4 つ存在すべきですが ${String(cards.length)} つです`);
    }

    for (const card of cards) {
      await card.updateComplete;
      if (!card.hasAttribute('variant')) {
        throw new Error('ForcedColorsMode: variant 属性未設定のカードがあります');
      }
    }

    const clickable = canvasElement.querySelector<Card>('ui-card[clickable]');
    if (!clickable) throw new Error('ForcedColorsMode: clickable カードが見つかりません');
  },
};

// ────────────────────────────────────────────
// 19. ReducedMotion: モーション軽減（視覚確認）
// ────────────────────────────────────────────

/**
 * `prefers-reduced-motion: reduce` 環境でのモーション軽減確認です。
 *
 * OS のモーション低減設定を有効にすると:
 * - `transform: scale()` が無効化される（hover 時のスケール変化なし）
 * - `transition-duration` が `0ms` に短縮される（色変化は即座）
 *
 * ### 確認方法
 * OS の「視覚効果を減らす」設定を有効化、または
 * Chrome DevTools → Rendering → `prefers-reduced-motion: reduce` を設定してください。
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
      OS の「視覚効果を減らす」設定を有効にした状態でホバーすると、
      スケール変化が無効化されていることを確認できます。
    </div>

    <ui-card id="reduced-motion-card" clickable style="max-width: 360px;">
      <h3 style="margin: 0 0 0.5rem; font-size: var(--text-base);">
        <a href="/notes/motion" style="color: inherit; text-decoration: none;">
          Reduced Motion テスト
        </a>
      </h3>
      <p style="margin: 0; font-size: var(--text-sm); color: var(--fg-muted);">
        通常: hover で scale(1.02)。モーション軽減時: スケール変化なし。
      </p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<Card>('#reduced-motion-card');
    if (!card) throw new Error('ReducedMotion: ui-card が見つかりません');

    await card.updateComplete;

    if (!card.hasAttribute('clickable')) {
      throw new Error('ReducedMotion: clickable 属性が設定されていません');
    }

    const link = card.querySelector<HTMLAnchorElement>('a[href]');
    if (!link) throw new Error('ReducedMotion: 内部リンクが見つかりません');
  },
};
