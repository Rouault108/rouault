import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './pagination';
import { computeCompactRange, computeRange } from './pagination';
import type { Pagination } from './pagination';

// =====================================================
// テスト用ヘルパー
// =====================================================

/**
 * コンポーネント内部状態へのアクセス用型（テスト専用）。
 * `@state() private _isCompact` をテストコードからセットするために使用します。
 * `@state()` デコレーターは Lit のリアクティブセッターを生成するため、
 * 型アサション経由でセットするだけで `requestUpdate()` が自動的に呼ばれます。
 */
interface PaginationMutableInternals {
  _isCompact: boolean;
}

function forceCompactMode(el: Pagination): void {
  // Storybook テストから private state を強制更新するための内部アクセス
  (el as unknown as PaginationMutableInternals)._isCompact = true;
}

/** getHref のデフォルト実装 */
const defaultHref = (p: number): string => `?page=${String(p)}`;

/** shadowRoot を取得（null チェック付き） */
function getShadow(el: Pagination, storyName: string): ShadowRoot {
  const sh = el.shadowRoot;
  if (!sh) throw new Error(`[${storyName}] shadowRoot が存在しません`);
  return sh;
}

/** Prev ボタン要素を取得（リスト先頭の .nav-btn） */
function getPrev(sh: ShadowRoot, storyName: string): Element {
  const el = sh.querySelector('li:first-child .nav-btn');
  if (!el) throw new Error(`[${storyName}] Prev ボタンが見つかりません`);
  return el;
}

/** Next ボタン要素を取得（リスト末尾の .nav-btn） */
function getNext(sh: ShadowRoot, storyName: string): Element {
  const el = sh.querySelector('li:last-child .nav-btn');
  if (!el) throw new Error(`[${storyName}] Next ボタンが見つかりません`);
  return el;
}

/** shadow style のテキストを取得 */
function getStyleText(sh: ShadowRoot, storyName: string): string {
  const inlineStyles = Array.from(sh.querySelectorAll('style'))
    .map((style) => style.textContent)
    .join('\n');

  const adoptedStyles = sh.adoptedStyleSheets
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  const merged = `${inlineStyles}\n${adoptedStyles}`.trim();
  if (!merged) throw new Error(`[${storyName}] shadow style が見つかりません`);
  return merged;
}

// =====================================================
// Meta
// =====================================================

/**
 * ## ページネーション (Pagination) `<ui-pagination>`
 *
 * 大量データを分割表示する際のナビゲーション。
 *
 * ### Range Algorithm (Desktop)
 *
 * | 条件 | 挙動 |
 * |------|------|
 * | `total <= 7` | 全ページを省略なしで表示 |
 * | `total >= 8` | `1` / `total` を常時表示。`current±1` を近傍表示。欠落 ≥ 2 は省略記号、欠落 = 1 は実ページ番号 |
 *
 * ### Disabled State
 *
 * - 先頭ページ時の Prev / 末尾ページ時の Next は **`<span aria-disabled="true">`** で描画。
 * - `href` を持たないため、`<a>` ではなく `<span>` を使用しフォーカス不能・遷移不能を物理的に担保。
 *
 * ### Compact Display
 *
 * `@media (hover: none) and (pointer: coarse)` 環境下では
 * `Prev ... {current} ... Next` のコンパクト表示へ切り替わります。
 */
const meta: Meta<Pagination> = {
  title: 'Components/Pagination',
  component: 'ui-pagination',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
ページネーションコンポーネントは、大量データを分割表示する際のナビゲーションを提供します。

## 使用方法

\`\`\`html
<ui-pagination
  current="5"
  total="10"
  .getHref="\${(p) => \`/notes?page=\${p}\`}"
></ui-pagination>
\`\`\`

## Range Algorithm

- **\`total <= 7\`**: 全ページを省略なしで表示（1〜7）
- **\`total >= 8\`**:
  - \`1\` と \`total\` を常時表示
  - \`current - 1\` 〜 \`current + 1\` を近傍として表示
  - 欠落 **2 ページ以上** → 省略記号 \`…\`
  - 欠落 **1 ページのみ** → 実ページ番号（省略記号ではなく）

## アクセシビリティ

- \`<nav aria-label="ページナビゲーション">\`
- 各リンク: \`aria-label="Xページへ移動"\`
- 現在ページ: \`<a aria-current="page" aria-label="現在のページ、Xページ">\`
- Disabled: \`<span aria-disabled="true">\`（\`<a>\` は使用しない）
- 省略記号: \`<span aria-hidden="true">\`
        `,
      },
    },
  },
  argTypes: {
    current: {
      control: 'number',
      description: '現在のページ（1始まり）',
      table: { type: { summary: 'number' }, defaultValue: { summary: '1' } },
    },
    total: {
      control: 'number',
      description: '総ページ数',
      table: { type: { summary: 'number' }, defaultValue: { summary: '1' } },
    },
  },
};

export default meta;
type Story = StoryObj<Pagination>;

// ─────────────────────────────────────────────────
// 基本ストーリー
// ─────────────────────────────────────────────────

/**
 * デフォルト: 中間ページ（デスクトップ Range 表示）。
 *
 * `current=5, total=10` における標準的な表示。
 * Range: `[1, …, 4, 5, 6, …, 10]`（両端に省略記号あり）
 *
 * 以下をすべて検証します:
 * - `<nav aria-label="ページナビゲーション">`
 * - Prev / Next がリンク（`<a>`）として描画されること
 * - 現在ページが `<a aria-current="page">` かつ `href` を保持すること（再訪可能）
 * - 省略記号が `aria-hidden="true"` を持つこと
 * - `getHref` から生成された `href` が正しいこと
 */
export const Default: Story = {
  args: { current: 5, total: 10 },
  render: (args) => html`
    <ui-pagination
      id="default-pagination"
      current="${args.current}"
      total="${args.total}"
      .getHref="${defaultHref}"
    ></ui-pagination>
  `,
  play: async ({ canvasElement }) => {
    const S = 'Default';
    const el = canvasElement.querySelector<Pagination>('#default-pagination');
    if (!el) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await el.updateComplete;

    const sh = getShadow(el, S);

    // テスト: nav 要素の aria-label
    const nav = sh.querySelector('nav');
    if (!nav) throw new Error(`[${S}] nav が見つかりません`);
    if (nav.getAttribute('aria-label') !== 'ページナビゲーション') {
      throw new Error(`[${S}] nav の aria-label が "ページナビゲーション" ではありません`);
    }

    // テスト: Prev は <a>（先頭ページではないため）
    const prev = getPrev(sh, S);
    if (prev.tagName !== 'A') {
      throw new Error(`[${S}] Prev は <a> であるべきですが <${prev.tagName}> です`);
    }
    if (prev.getAttribute('aria-label') !== '前のページへ移動') {
      throw new Error(
        `[${S}] Prev の aria-label が正しくありません: "${prev.getAttribute('aria-label') ?? '(null)'}"`,
      );
    }
    if (prev.getAttribute('href') !== '?page=4') {
      throw new Error(
        `[${S}] Prev の href が "?page=4" ではありません: "${prev.getAttribute('href') ?? '(null)'}"`,
      );
    }

    // テスト: Next は <a>（末尾ページではないため）
    const next = getNext(sh, S);
    if (next.tagName !== 'A') {
      throw new Error(`[${S}] Next は <a> であるべきですが <${next.tagName}> です`);
    }
    if (next.getAttribute('aria-label') !== '次のページへ移動') {
      throw new Error(`[${S}] Next の aria-label が正しくありません`);
    }
    if (next.getAttribute('href') !== '?page=6') {
      throw new Error(
        `[${S}] Next の href が "?page=6" ではありません: "${next.getAttribute('href') ?? '(null)'}"`,
      );
    }

    // テスト: 現在ページが aria-current="page" かつ href を保持（再訪可能性の保証）
    const currentLink = sh.querySelector('[aria-current="page"]');
    if (!currentLink) throw new Error(`[${S}] aria-current="page" が見つかりません`);
    if ((currentLink.textContent).trim() !== '5') {
      throw new Error(
        `[${S}] 現在ページのテキストが "5" ではありません: "${(currentLink.textContent).trim()}"`,
      );
    }
    if (currentLink.getAttribute('aria-label') !== '現在のページ、5ページ') {
      throw new Error(
        `[${S}] 現在ページの aria-label が正しくありません: "${currentLink.getAttribute('aria-label') ?? '(null)'}"`,
      );
    }
    if (!currentLink.getAttribute('href')) {
      throw new Error(`[${S}] 現在ページの href が存在しません（再訪可能性の保証が失われています）`);
    }

    // テスト: 省略記号が aria-hidden="true" を持つ（スクリーンリーダー非通知）
    const ellipses = sh.querySelectorAll('.ellipsis');
    if (ellipses.length === 0) throw new Error(`[${S}] 省略記号が見つかりません`);
    ellipses.forEach((el, i) => {
      if (el.getAttribute('aria-hidden') !== 'true') {
        throw new Error(`[${S}] ellipsis[${String(i)}] に aria-hidden="true" がありません`);
      }
    });

    // テスト: computeRange(5, 10) = [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
    const expected = computeRange(5, 10);
    if (expected.filter((x) => x === 'ellipsis').length !== 2) {
      throw new Error(
        `[${S}] computeRange(5, 10) の省略記号数が 2 ではありません: ${JSON.stringify(expected)}`,
      );
    }
  },
};

/**
 * 先頭ページ（`current=1`）。
 *
 * Prev ボタンが `<span aria-disabled="true">` になることを検証します。
 * - `<a>` は使用しない（フォーカス不能・遷移不能を物理的に担保）
 * - `href` を持たない
 * - Next は通常の `<a>` リンク
 *
 * Range: `[1, 2, …, 10]`
 */
export const FirstPage: Story = {
  args: { current: 1, total: 10 },
  render: (args) => html`
    <ui-pagination
      id="first-pagination"
      current="${args.current}"
      total="${args.total}"
      .getHref="${defaultHref}"
    ></ui-pagination>
  `,
  play: async ({ canvasElement }) => {
    const S = 'FirstPage';
    const el = canvasElement.querySelector<Pagination>('#first-pagination');
    if (!el) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await el.updateComplete;

    const sh = getShadow(el, S);

    // テスト: Prev は <span aria-disabled="true">（<a> ではない）
    const prev = getPrev(sh, S);
    if (prev.tagName !== 'SPAN') {
      throw new Error(`[${S}] 先頭ページの Prev は <span> であるべきですが <${prev.tagName}> です`);
    }
    if (prev.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`[${S}] Prev に aria-disabled="true" がありません`);
    }
    if (prev.hasAttribute('href')) {
      throw new Error(`[${S}] 先頭ページの Prev は href を持つべきではありません`);
    }
    if (prev.getAttribute('aria-label') !== '前のページへ移動') {
      throw new Error(`[${S}] Prev の aria-label が正しくありません`);
    }

    // テスト: Next は通常の <a> リンク
    const next = getNext(sh, S);
    if (next.tagName !== 'A') {
      throw new Error(`[${S}] Next は <a> であるべきですが <${next.tagName}> です`);
    }
    if (next.getAttribute('href') !== '?page=2') {
      throw new Error(
        `[${S}] Next の href が "?page=2" ではありません: "${next.getAttribute('href') ?? '(null)'}"`,
      );
    }

    // テスト: 現在ページが 1 かつ aria-current="page"
    const currentLink = sh.querySelector('[aria-current="page"]');
    if (!currentLink) throw new Error(`[${S}] aria-current="page" が見つかりません`);
    if ((currentLink.textContent).trim() !== '1') {
      throw new Error(`[${S}] 現在ページのテキストが "1" ではありません`);
    }
  },
};

/**
 * 末尾ページ（`current=total`）。
 *
 * Next ボタンが `<span aria-disabled="true">` になることを検証します。
 * - `<a>` は使用しない
 * - `href` を持たない
 * - Prev は通常の `<a>` リンク
 *
 * Range: `[1, …, 9, 10]`
 */
export const LastPage: Story = {
  args: { current: 10, total: 10 },
  render: (args) => html`
    <ui-pagination
      id="last-pagination"
      current="${args.current}"
      total="${args.total}"
      .getHref="${defaultHref}"
    ></ui-pagination>
  `,
  play: async ({ canvasElement }) => {
    const S = 'LastPage';
    const el = canvasElement.querySelector<Pagination>('#last-pagination');
    if (!el) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await el.updateComplete;

    const sh = getShadow(el, S);

    // テスト: Next は <span aria-disabled="true">
    const next = getNext(sh, S);
    if (next.tagName !== 'SPAN') {
      throw new Error(`[${S}] 末尾ページの Next は <span> であるべきですが <${next.tagName}> です`);
    }
    if (next.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`[${S}] Next に aria-disabled="true" がありません`);
    }
    if (next.hasAttribute('href')) {
      throw new Error(`[${S}] 末尾ページの Next は href を持つべきではありません`);
    }
    if (next.getAttribute('aria-label') !== '次のページへ移動') {
      throw new Error(`[${S}] Next の aria-label が正しくありません`);
    }

    // テスト: Prev は通常の <a> リンク
    const prev = getPrev(sh, S);
    if (prev.tagName !== 'A') {
      throw new Error(`[${S}] Prev は <a> であるべきですが <${prev.tagName}> です`);
    }
    if (prev.getAttribute('href') !== '?page=9') {
      throw new Error(
        `[${S}] Prev の href が "?page=9" ではありません: "${prev.getAttribute('href') ?? '(null)'}"`,
      );
    }

    // テスト: 現在ページが 10
    const currentLink = sh.querySelector('[aria-current="page"]');
    if (!currentLink) throw new Error(`[${S}] aria-current="page" が見つかりません`);
    if ((currentLink.textContent).trim() !== '10') {
      throw new Error(`[${S}] 現在ページのテキストが "10" ではありません`);
    }
  },
};

/**
 * 1ページのみ（`total=1`）。
 *
 * Prev・Next の両方が `<span aria-disabled="true">` になることを検証します。
 * Range: `[1]`（省略記号なし）
 */
export const SinglePage: Story = {
  args: { current: 1, total: 1 },
  render: (args) => html`
    <ui-pagination
      id="single-pagination"
      current="${args.current}"
      total="${args.total}"
      .getHref="${defaultHref}"
    ></ui-pagination>
  `,
  play: async ({ canvasElement }) => {
    const S = 'SinglePage';
    const el = canvasElement.querySelector<Pagination>('#single-pagination');
    if (!el) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await el.updateComplete;

    const sh = getShadow(el, S);

    // テスト: Prev が <span aria-disabled="true">
    const prev = getPrev(sh, S);
    if (prev.tagName !== 'SPAN' || prev.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`[${S}] Prev が <span aria-disabled="true"> ではありません`);
    }

    // テスト: Next が <span aria-disabled="true">
    const next = getNext(sh, S);
    if (next.tagName !== 'SPAN' || next.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`[${S}] Next が <span aria-disabled="true"> ではありません`);
    }

    // テスト: 省略記号が存在しない（total=1 は省略不要）
    const ellipses = sh.querySelectorAll('.ellipsis');
    if (ellipses.length > 0) {
      throw new Error(`[${S}] total=1 の場合、省略記号は存在すべきではありません`);
    }

    // テスト: 現在ページが 1 かつ aria-current="page"
    const currentLink = sh.querySelector('[aria-current="page"]');
    if (!currentLink) throw new Error(`[${S}] aria-current="page" が見つかりません`);
    if ((currentLink.textContent).trim() !== '1') {
      throw new Error(`[${S}] 現在ページのテキストが "1" ではありません`);
    }

    // テスト: computeRange(1, 1) が [1] を返す
    const range = computeRange(1, 1);
    if (range.length !== 1 || range[0] !== 1) {
      throw new Error(`[${S}] computeRange(1, 1) が [1] ではありません: ${JSON.stringify(range)}`);
    }
  },
};

// ─────────────────────────────────────────────────
// Range Algorithm
// ─────────────────────────────────────────────────

/**
 * `total <= 7` — 省略なし全ページ表示。
 *
 * 7 ページ以下の場合、省略記号は一切表示されず、
 * すべてのページ番号が表示されます。
 *
 * Range (`current=4, total=7`): `[1, 2, 3, 4, 5, 6, 7]`
 */
export const SmallTotal: Story = {
  args: { current: 4, total: 7 },
  render: (args) => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          total=7, current=4（ちょうど省略なし閾値・中間ページ）
        </div>
        <ui-pagination
          id="small-total-7"
          current="${args.current}"
          total="${args.total}"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          total=5, current=3（中間）
        </div>
        <ui-pagination
          id="small-total-5"
          current="3"
          total="5"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          total=2, current=1（最小構成）
        </div>
        <ui-pagination
          id="small-total-2"
          current="1"
          total="2"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'SmallTotal';

    const el7 = canvasElement.querySelector<Pagination>('#small-total-7');
    const el5 = canvasElement.querySelector<Pagination>('#small-total-5');
    const el2 = canvasElement.querySelector<Pagination>('#small-total-2');
    if (!el7 || !el5 || !el2) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await Promise.all([el7.updateComplete, el5.updateComplete, el2.updateComplete]);

    // ─── total=7 ───

    const sh7 = getShadow(el7, S);

    // テスト: 省略記号が存在しない
    const ellipses7 = sh7.querySelectorAll('.ellipsis');
    if (ellipses7.length > 0) {
      throw new Error(
        `[${S}] total=7 の場合、省略記号は存在すべきではありません（${String(ellipses7.length)} 個検出）`,
      );
    }

    // テスト: 全 7 ページのリンクが存在する（Prev/Next 除く）
    const pageLinks7 = sh7.querySelectorAll('.page-btn');
    if (pageLinks7.length !== 7) {
      throw new Error(
        `[${S}] total=7 の場合、7 個のページリンクが存在すべきですが ${String(pageLinks7.length)} 個です`,
      );
    }

    // テスト: computeRange(4, 7) が 7 ページをすべて返す（省略記号なし）
    const range7 = computeRange(4, 7);
    if (range7.length !== 7 || range7.includes('ellipsis')) {
      throw new Error(
        `[${S}] computeRange(4, 7) が全ページを返していません: ${JSON.stringify(range7)}`,
      );
    }

    // ─── total=5 ───

    const sh5 = getShadow(el5, S);
    const ellipses5 = sh5.querySelectorAll('.ellipsis');
    if (ellipses5.length > 0) {
      throw new Error(`[${S}] total=5 の場合、省略記号は存在すべきではありません`);
    }
    const range5 = computeRange(3, 5);
    if (range5.length !== 5 || range5.includes('ellipsis')) {
      throw new Error(
        `[${S}] computeRange(3, 5) が全ページを返していません: ${JSON.stringify(range5)}`,
      );
    }

    // ─── total=2 ───

    const sh2 = getShadow(el2, S);
    const ellipses2 = sh2.querySelectorAll('.ellipsis');
    if (ellipses2.length > 0) {
      throw new Error(`[${S}] total=2 の場合、省略記号は存在すべきではありません`);
    }
  },
};

/**
 * ⚠️ Range Algorithm 境界条件: `total=7` vs `total=8` の閾値。
 *
 * - `total=7` → 省略記号なし（全ページ表示）
 * - `total=8` → 省略記号が発生する最小のページ数
 *
 * `total=8, current=4` の Range: `[1, 2, 3, 4, 5, …, 8]`
 * (`gap=2` ルールにより `1→3` 間の欠落 1 ページを `2` として挿入、左側は省略記号なし)
 */
export const EdgeCase_Total7vs8: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '⚠️ **境界条件**: `total=7` と `total=8` では Range Algorithm の分岐が切り替わります。`total=7` は省略なし、`total=8` は省略記号が発生し始める最小値です。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          total=7, current=4 — 省略なし（全ページ表示）
        </div>
        <ui-pagination
          id="boundary-7"
          current="4"
          total="7"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          total=8, current=4 — 省略記号が発生（右側に 1 つ）
        </div>
        <ui-pagination
          id="boundary-8-mid"
          current="4"
          total="8"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          total=8, current=1 — 先頭ページ（省略記号 1 つ）
        </div>
        <ui-pagination
          id="boundary-8-first"
          current="1"
          total="8"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'EdgeCase_Total7vs8';

    const el7 = canvasElement.querySelector<Pagination>('#boundary-7');
    const el8mid = canvasElement.querySelector<Pagination>('#boundary-8-mid');
    const el8first = canvasElement.querySelector<Pagination>('#boundary-8-first');
    if (!el7 || !el8mid || !el8first) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await Promise.all([el7.updateComplete, el8mid.updateComplete, el8first.updateComplete]);

    // ─── total=7: 省略記号なし ───

    const sh7 = getShadow(el7, S);
    const ellipses7 = sh7.querySelectorAll('.ellipsis');
    if (ellipses7.length > 0) {
      throw new Error(`[${S}] total=7 に省略記号が存在します（${String(ellipses7.length)} 個）`);
    }
    const range7 = computeRange(4, 7);
    if (range7.includes('ellipsis')) {
      throw new Error(
        `[${S}] computeRange(4, 7) が省略記号を含んでいます: ${JSON.stringify(range7)}`,
      );
    }

    // ─── total=8, current=4: 省略記号 1 つ（右側のみ） ───
    // computeRange(4, 8) = [1, 2, 3, 4, 5, 'ellipsis', 8]

    const sh8mid = getShadow(el8mid, S);
    const ellipses8mid = sh8mid.querySelectorAll('.ellipsis');
    if (ellipses8mid.length !== 1) {
      throw new Error(
        `[${S}] total=8, current=4 の省略記号数が 1 ではありません: ${String(ellipses8mid.length)} 個`,
      );
    }
    const range8mid = computeRange(4, 8);
    if (range8mid.filter((x) => x === 'ellipsis').length !== 1) {
      throw new Error(
        `[${S}] computeRange(4, 8) の省略記号数が 1 ではありません: ${JSON.stringify(range8mid)}`,
      );
    }

    // ─── total=8, current=1: 省略記号 1 つ ───
    // computeRange(1, 8) = [1, 2, 'ellipsis', 8]

    const sh8first = getShadow(el8first, S);
    const ellipses8first = sh8first.querySelectorAll('.ellipsis');
    if (ellipses8first.length !== 1) {
      throw new Error(
        `[${S}] total=8, current=1 の省略記号数が 1 ではありません: ${String(ellipses8first.length)} 個`,
      );
    }
    const range8first = computeRange(1, 8);
    if (range8first.filter((x) => x === 'ellipsis').length !== 1) {
      throw new Error(
        `[${S}] computeRange(1, 8) の省略記号数が 1 ではありません: ${JSON.stringify(range8first)}`,
      );
    }
  },
};

/**
 * ⚠️ Range Algorithm 境界条件: 欠落 1 ページは省略記号ではなく実ページ番号。
 *
 * 仕様: ギャップが 2 ページ（欠落 1 ページ）の場合、
 * 省略記号ではなく**実ページ番号**を挿入します。
 *
 * - `current=4, total=10`: 左ギャップ `1 [gap=2] 3` → ページ `2` を挿入
 *   → `[1, 2, 3, 4, 5, …, 10]`（省略記号は右 1 つのみ）
 * - `current=7, total=10`: 右ギャップ `8 [gap=2] 10` → ページ `9` を挿入
 *   → `[1, …, 6, 7, 8, 9, 10]`（省略記号は左 1 つのみ）
 *
 * このロジックを誤ると `1 ... 3 4 5 ... 10` / `1 ... 6 7 8 ... 10` と表示されます。
 */
export const EdgeCase_OnePageGap: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '⚠️ **境界条件 (gap=2)**: ギャップが 1 ページのみの場合、省略記号ではなく**実ページ番号**を表示します。誤実装すると `1 … 3` のような余分な省略記号が出ます。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          current=4, total=10 — 左ギャップ gap=2 → ページ 2 を表示（省略記号なし）
        </div>
        <ui-pagination
          id="gap-left"
          current="4"
          total="10"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          current=7, total=10 — 右ギャップ gap=2 → ページ 9 を表示（省略記号なし）
        </div>
        <ui-pagination
          id="gap-right"
          current="7"
          total="10"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'EdgeCase_OnePageGap';

    const elLeft = canvasElement.querySelector<Pagination>('#gap-left');
    const elRight = canvasElement.querySelector<Pagination>('#gap-right');
    if (!elLeft || !elRight) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await Promise.all([elLeft.updateComplete, elRight.updateComplete]);

    // ─── current=4, total=10 ───
    // computeRange(4, 10) = [1, 2, 3, 4, 5, 'ellipsis', 10]

    const range4 = computeRange(4, 10);

    // テスト: ページ 2 が含まれていること（gap=2 で省略記号ではなく実ページ）
    if (!range4.includes(2)) {
      throw new Error(
        `[${S}] computeRange(4, 10) にページ 2 が含まれていません: ${JSON.stringify(range4)}`,
      );
    }
    // テスト: 省略記号は 1 つだけ（右側のみ）
    if (range4.filter((x) => x === 'ellipsis').length !== 1) {
      throw new Error(
        `[${S}] computeRange(4, 10) の省略記号数が 1 ではありません: ${JSON.stringify(range4)}`,
      );
    }
    // テスト: 省略記号は右側にある（ページ 5 より後）
    const ellipsisIdx4 = range4.indexOf('ellipsis');
    const page5Idx4 = range4.indexOf(5);
    if (ellipsisIdx4 < page5Idx4) {
      throw new Error(
        `[${S}] computeRange(4, 10) の省略記号が左側にあります（誤り）: ${JSON.stringify(range4)}`,
      );
    }

    const shLeft = getShadow(elLeft, S);
    // テスト: ページ 2 のリンクが DOM に存在すること
    const page2Links = Array.from(shLeft.querySelectorAll('.page-btn')).filter(
      (a) => (a.textContent).trim() === '2',
    );
    if (page2Links.length === 0) {
      throw new Error(`[${S}] current=4 の場合、ページ 2 のリンクが表示されるべきです`);
    }
    // テスト: 省略記号が 1 つのみ（右側）
    const ellipsesLeft = shLeft.querySelectorAll('.ellipsis');
    if (ellipsesLeft.length !== 1) {
      throw new Error(
        `[${S}] current=4 の場合、省略記号は 1 つのみであるべきですが ${String(ellipsesLeft.length)} 個です`,
      );
    }

    // ─── current=7, total=10 ───
    // computeRange(7, 10) = [1, 'ellipsis', 6, 7, 8, 9, 10]

    const range7 = computeRange(7, 10);

    // テスト: ページ 9 が含まれていること（gap=2 で省略記号ではなく実ページ）
    if (!range7.includes(9)) {
      throw new Error(
        `[${S}] computeRange(7, 10) にページ 9 が含まれていません: ${JSON.stringify(range7)}`,
      );
    }
    // テスト: 省略記号は 1 つだけ（左側のみ）
    if (range7.filter((x) => x === 'ellipsis').length !== 1) {
      throw new Error(
        `[${S}] computeRange(7, 10) の省略記号数が 1 ではありません: ${JSON.stringify(range7)}`,
      );
    }
    // テスト: 省略記号は左側にある（ページ 6 より前）
    const ellipsisIdx7 = range7.indexOf('ellipsis');
    const page6Idx7 = range7.indexOf(6);
    if (ellipsisIdx7 > page6Idx7) {
      throw new Error(
        `[${S}] computeRange(7, 10) の省略記号が右側にあります（誤り）: ${JSON.stringify(range7)}`,
      );
    }

    const shRight = getShadow(elRight, S);
    // テスト: ページ 9 のリンクが DOM に存在すること
    const page9Links = Array.from(shRight.querySelectorAll('.page-btn')).filter(
      (a) => (a.textContent).trim() === '9',
    );
    if (page9Links.length === 0) {
      throw new Error(`[${S}] current=7 の場合、ページ 9 のリンクが表示されるべきです`);
    }
    // テスト: 省略記号が 1 つのみ（左側）
    const ellipsesRight = shRight.querySelectorAll('.ellipsis');
    if (ellipsesRight.length !== 1) {
      throw new Error(
        `[${S}] current=7 の場合、省略記号は 1 つのみであるべきですが ${String(ellipsesRight.length)} 個です`,
      );
    }
  },
};

/**
 * ⚠️ Range Algorithm 境界条件: 先頭付近のページ（`current=2`, `current=3`）。
 *
 * - `current=2, total=10`: Range `[1, 2, 3, …, 10]`（左側省略記号なし）
 * - `current=3, total=10`: Range `[1, 2, 3, 4, …, 10]`（左側省略記号なし）
 *
 * 先頭付近では左側の省略記号が出ないことを確認します（`1 ... 2` は誤り）。
 */
export const EdgeCase_NearStart: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '⚠️ **境界条件**: 先頭付近のページでは、左側に省略記号が出ません。`current=2` のときに `1 … 2` と表示するのは誤りです。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          current=2, total=10 — Range: [1, 2, 3, …, 10]（左に省略記号なし）
        </div>
        <ui-pagination
          id="near-start-2"
          current="2"
          total="10"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          current=3, total=10 — Range: [1, 2, 3, 4, …, 10]（左に省略記号なし）
        </div>
        <ui-pagination
          id="near-start-3"
          current="3"
          total="10"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'EdgeCase_NearStart';

    const el2 = canvasElement.querySelector<Pagination>('#near-start-2');
    const el3 = canvasElement.querySelector<Pagination>('#near-start-3');
    if (!el2 || !el3) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await Promise.all([el2.updateComplete, el3.updateComplete]);

    // ─── current=2, total=10 ───
    // expected: [1, 2, 3, 'ellipsis', 10]

    const range2 = computeRange(2, 10);

    // テスト: ページ 1, 2, 3 が含まれていること
    if (!range2.includes(1) || !range2.includes(2) || !range2.includes(3)) {
      throw new Error(
        `[${S}] computeRange(2, 10) にページ 1, 2, 3 が含まれていません: ${JSON.stringify(range2)}`,
      );
    }
    // テスト: 省略記号は右側のみ（左に省略記号はない）
    const firstEllipsisIdx2 = range2.indexOf('ellipsis');
    const page3Idx2 = range2.indexOf(3);
    if (firstEllipsisIdx2 !== -1 && firstEllipsisIdx2 < page3Idx2) {
      throw new Error(
        `[${S}] computeRange(2, 10) の左側に不正な省略記号があります: ${JSON.stringify(range2)}`,
      );
    }
    // テスト: 省略記号は 1 つ
    if (range2.filter((x) => x === 'ellipsis').length !== 1) {
      throw new Error(
        `[${S}] computeRange(2, 10) の省略記号数が 1 ではありません: ${JSON.stringify(range2)}`,
      );
    }

    const sh2 = getShadow(el2, S);
    const ellipses2 = sh2.querySelectorAll('.ellipsis');
    if (ellipses2.length !== 1) {
      throw new Error(
        `[${S}] current=2 の省略記号数が 1 ではありません: ${String(ellipses2.length)} 個`,
      );
    }

    // ─── current=3, total=10 ───
    // expected: [1, 2, 3, 4, 'ellipsis', 10]

    const range3 = computeRange(3, 10);

    if (!range3.includes(1) || !range3.includes(2) || !range3.includes(3) || !range3.includes(4)) {
      throw new Error(
        `[${S}] computeRange(3, 10) にページ 1, 2, 3, 4 が含まれていません: ${JSON.stringify(range3)}`,
      );
    }
    const firstEllipsisIdx3 = range3.indexOf('ellipsis');
    const page4Idx3 = range3.indexOf(4);
    if (firstEllipsisIdx3 !== -1 && firstEllipsisIdx3 < page4Idx3) {
      throw new Error(
        `[${S}] computeRange(3, 10) の左側に不正な省略記号があります: ${JSON.stringify(range3)}`,
      );
    }

    const sh3 = getShadow(el3, S);
    const ellipses3 = sh3.querySelectorAll('.ellipsis');
    if (ellipses3.length !== 1) {
      throw new Error(
        `[${S}] current=3 の省略記号数が 1 ではありません: ${String(ellipses3.length)} 個`,
      );
    }
  },
};

/**
 * ⚠️ Range Algorithm 境界条件: 末尾付近のページ（`current=8`, `current=9`）。
 *
 * - `current=8, total=10`: Range `[1, …, 7, 8, 9, 10]`（右側省略記号なし）
 * - `current=9, total=10`: Range `[1, …, 8, 9, 10]`（右側省略記号なし）
 *
 * 末尾付近では右側の省略記号が出ないことを確認します（`9 ... 10` は誤り）。
 */
export const EdgeCase_NearEnd: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '⚠️ **境界条件**: 末尾付近のページでは、右側に省略記号が出ません。`current=9` のときに `9 … 10` と表示するのは誤りです。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          current=8, total=10 — Range: [1, …, 7, 8, 9, 10]（右に省略記号なし）
        </div>
        <ui-pagination
          id="near-end-8"
          current="8"
          total="10"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          current=9, total=10 — Range: [1, …, 8, 9, 10]（右に省略記号なし）
        </div>
        <ui-pagination
          id="near-end-9"
          current="9"
          total="10"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'EdgeCase_NearEnd';

    const el8 = canvasElement.querySelector<Pagination>('#near-end-8');
    const el9 = canvasElement.querySelector<Pagination>('#near-end-9');
    if (!el8 || !el9) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await Promise.all([el8.updateComplete, el9.updateComplete]);

    // ─── current=8, total=10 ───
    // expected: [1, 'ellipsis', 7, 8, 9, 10]

    const range8 = computeRange(8, 10);

    if (!range8.includes(7) || !range8.includes(8) || !range8.includes(9) || !range8.includes(10)) {
      throw new Error(
        `[${S}] computeRange(8, 10) にページ 7, 8, 9, 10 が含まれていません: ${JSON.stringify(range8)}`,
      );
    }
    // テスト: 省略記号は左側のみ（右に省略記号はない）
    const lastEllipsisIdx8 = range8.lastIndexOf('ellipsis');
    const page7Idx8 = range8.indexOf(7);
    if (lastEllipsisIdx8 !== -1 && lastEllipsisIdx8 > page7Idx8) {
      throw new Error(
        `[${S}] computeRange(8, 10) の右側に不正な省略記号があります: ${JSON.stringify(range8)}`,
      );
    }
    // テスト: 省略記号は 1 つ（左側）
    if (range8.filter((x) => x === 'ellipsis').length !== 1) {
      throw new Error(
        `[${S}] computeRange(8, 10) の省略記号数が 1 ではありません: ${JSON.stringify(range8)}`,
      );
    }

    const sh8 = getShadow(el8, S);
    const ellipses8 = sh8.querySelectorAll('.ellipsis');
    if (ellipses8.length !== 1) {
      throw new Error(
        `[${S}] current=8 の省略記号数が 1 ではありません: ${String(ellipses8.length)} 個`,
      );
    }

    // ─── current=9, total=10 ───
    // expected: [1, 'ellipsis', 8, 9, 10]

    const range9 = computeRange(9, 10);

    if (!range9.includes(8) || !range9.includes(9) || !range9.includes(10)) {
      throw new Error(
        `[${S}] computeRange(9, 10) にページ 8, 9, 10 が含まれていません: ${JSON.stringify(range9)}`,
      );
    }
    const lastEllipsisIdx9 = range9.lastIndexOf('ellipsis');
    const page8Idx9 = range9.indexOf(8);
    if (lastEllipsisIdx9 !== -1 && lastEllipsisIdx9 > page8Idx9) {
      throw new Error(
        `[${S}] computeRange(9, 10) の右側に不正な省略記号があります: ${JSON.stringify(range9)}`,
      );
    }

    const sh9 = getShadow(el9, S);
    const ellipses9 = sh9.querySelectorAll('.ellipsis');
    if (ellipses9.length !== 1) {
      throw new Error(
        `[${S}] current=9 の省略記号数が 1 ではありません: ${String(ellipses9.length)} 個`,
      );
    }
  },
};

// ─────────────────────────────────────────────────
// コンパクト表示（タッチデバイス）
// ─────────────────────────────────────────────────

/**
 * コンパクト表示: 中間ページ（`current=5, total=10`）。
 *
 * `@media (hover: none) and (pointer: coarse)` 環境での表示。
 * Range: `[…, 5, …]`（現在ページのみ、両端に省略記号）
 *
 * テストでは `_isCompact` を強制セットしてコンパクトモードをシミュレートします。
 * （`@state()` デコレーターのリアクティブセッターを経由するため自動で再描画されます）
 */
export const Compact_Middle: Story = {
  args: { current: 5, total: 10 },
  parameters: {
    docs: {
      description: {
        story:
          'タッチデバイス (`@media (hover: none) and (pointer: coarse)`) でのコンパクト表示。現在ページのみが表示され、両端に省略記号が置かれます。',
      },
    },
  },
  render: (args) => html`
    <div>
      <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
        コンパクトモード — current=5, total=10（… 5 …）
      </div>
      <ui-pagination
        id="compact-mid"
        current="${args.current}"
        total="${args.total}"
        .getHref="${defaultHref}"
      ></ui-pagination>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'Compact_Middle';
    const el = canvasElement.querySelector<Pagination>('#compact-mid');
    if (!el) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await el.updateComplete;

    // コンパクトモードを強制的に有効化（メディアクエリのシミュレーション）
    forceCompactMode(el);
    await el.updateComplete;

    const sh = getShadow(el, S);

    // テスト: computeCompactRange(5, 10) = ['ellipsis', 5, 'ellipsis']
    const range = computeCompactRange(5, 10);
    if (range[0] !== 'ellipsis' || range[1] !== 5 || range[2] !== 'ellipsis') {
      throw new Error(
        `[${S}] computeCompactRange(5, 10) が ['ellipsis', 5, 'ellipsis'] ではありません: ${JSON.stringify(range)}`,
      );
    }

    // テスト: 省略記号が 2 つ表示されている（両端）
    const ellipses = sh.querySelectorAll('.ellipsis');
    if (ellipses.length !== 2) {
      throw new Error(
        `[${S}] コンパクト中間の省略記号数が 2 ではありません: ${String(ellipses.length)} 個`,
      );
    }

    // テスト: ページリンクが 1 つのみ（現在ページ）
    const pageLinks = sh.querySelectorAll('.page-btn');
    if (pageLinks.length !== 1) {
      throw new Error(
        `[${S}] コンパクト中間のページリンク数が 1 ではありません: ${String(pageLinks.length)} 個`,
      );
    }

    // テスト: 現在ページが 5
    const currentLink = sh.querySelector('[aria-current="page"]');
    if (!currentLink) throw new Error(`[${S}] aria-current="page" が見つかりません`);
    if ((currentLink.textContent).trim() !== '5') {
      throw new Error(`[${S}] 現在ページのテキストが "5" ではありません`);
    }

    // テスト: Prev/Next ともにリンク（中間ページ）
    const prev = getPrev(sh, S);
    const next = getNext(sh, S);
    if (prev.tagName !== 'A') {
      throw new Error(`[${S}] コンパクト中間で Prev が <a> ではありません`);
    }
    if (next.tagName !== 'A') {
      throw new Error(`[${S}] コンパクト中間で Next が <a> ではありません`);
    }
  },
};

/**
 * コンパクト表示: 先頭ページ（`current=1`）。
 *
 * 先頭ページでは左側の省略記号は不要なため表示しません。
 * Range: `[1, …]`（右のみ省略記号）
 *
 * 省略不要な側には `…` を出さないことを確認します（Layout Stability）。
 */
export const Compact_FirstPage: Story = {
  args: { current: 1, total: 10 },
  parameters: {
    docs: {
      description: {
        story:
          '⚠️ **コンパクト先頭ページ**: 先頭ページでは左側の省略記号が不要なため表示しません。',
      },
    },
  },
  render: (args) => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          コンパクト first — current=1（1 …）
        </div>
        <ui-pagination
          id="compact-first"
          current="${args.current}"
          total="${args.total}"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          コンパクト last — current=10（… 10）
        </div>
        <ui-pagination
          id="compact-last"
          current="10"
          total="10"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'Compact_FirstPage';

    const elFirst = canvasElement.querySelector<Pagination>('#compact-first');
    const elLast = canvasElement.querySelector<Pagination>('#compact-last');
    if (!elFirst || !elLast) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await Promise.all([elFirst.updateComplete, elLast.updateComplete]);

    // コンパクトモードを強制
    forceCompactMode(elFirst);
    forceCompactMode(elLast);
    await Promise.all([elFirst.updateComplete, elLast.updateComplete]);

    // ─── 先頭ページ: current=1 ───
    // computeCompactRange(1, 10) = [1, 'ellipsis']（左側省略記号なし）

    const rangeFirst = computeCompactRange(1, 10);
    if (rangeFirst[0] !== 1 || rangeFirst[1] !== 'ellipsis' || rangeFirst.length !== 2) {
      throw new Error(
        `[${S}] computeCompactRange(1, 10) が [1, 'ellipsis'] ではありません: ${JSON.stringify(rangeFirst)}`,
      );
    }
    const shFirst = getShadow(elFirst, S);
    const ellipsesFirst = shFirst.querySelectorAll('.ellipsis');
    if (ellipsesFirst.length !== 1) {
      throw new Error(
        `[${S}] compact first の省略記号数が 1 ではありません: ${String(ellipsesFirst.length)} 個`,
      );
    }
    // Prev が disabled（先頭ページ）
    const prevFirst = getPrev(shFirst, S);
    if (prevFirst.tagName !== 'SPAN' || prevFirst.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`[${S}] compact first の Prev が <span aria-disabled="true"> ではありません`);
    }

    // ─── 末尾ページ: current=10 ───
    // computeCompactRange(10, 10) = ['ellipsis', 10]（右側省略記号なし）

    const rangeLast = computeCompactRange(10, 10);
    if (rangeLast[0] !== 'ellipsis' || rangeLast[1] !== 10 || rangeLast.length !== 2) {
      throw new Error(
        `[${S}] computeCompactRange(10, 10) が ['ellipsis', 10] ではありません: ${JSON.stringify(rangeLast)}`,
      );
    }
    // 末尾側に省略記号がないこと
    if (rangeLast[rangeLast.length - 1] === 'ellipsis') {
      throw new Error(`[${S}] current=total の場合、末尾に省略記号が出るべきではありません`);
    }

    const shLast = getShadow(elLast, S);
    const ellipsesLast = shLast.querySelectorAll('.ellipsis');
    if (ellipsesLast.length !== 1) {
      throw new Error(
        `[${S}] compact last の省略記号数が 1 ではありません: ${String(ellipsesLast.length)} 個`,
      );
    }
    // Next が disabled（末尾ページ）
    const nextLast = getNext(shLast, S);
    if (nextLast.tagName !== 'SPAN' || nextLast.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`[${S}] compact last の Next が <span aria-disabled="true"> ではありません`);
    }

    // ─── 1 ページのみ（total=1）: 省略記号なし ───
    // computeCompactRange(1, 1) = [1]
    const rangeSingle = computeCompactRange(1, 1);
    if (rangeSingle.length !== 1 || rangeSingle[0] !== 1 || rangeSingle.includes('ellipsis')) {
      throw new Error(
        `[${S}] computeCompactRange(1, 1) が [1] ではありません: ${JSON.stringify(rangeSingle)}`,
      );
    }
  },
};

// ─────────────────────────────────────────────────
// アクセシビリティ
// ─────────────────────────────────────────────────

/**
 * アクセシビリティ: ARIA 属性の包括的検証。
 *
 * WAI-ARIA に準拠した属性が正しく付与されていることを確認します:
 * - `nav[aria-label="ページナビゲーション"]`
 * - 各ページリンク: `aria-label="Xページへ移動"`
 * - 現在ページ: `aria-label="現在のページ、Xページ"` + `aria-current="page"`
 * - Prev/Next (活性): `aria-label` 付き `<a>`
 * - Prev/Next (非活性): `<span aria-disabled="true">` + フォーカス不能
 * - 省略記号: `aria-hidden="true"` でスクリーンリーダー非通知
 *
 * **Note**: Rouault は日本語環境に特化しているため、ラベルはすべて日本語。
 */
export const Accessibility: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          中間ページ — 全 ARIA 属性チェック
        </div>
        <ui-pagination
          id="a11y-mid"
          current="5"
          total="10"
          .getHref="${defaultHref}"
        ></ui-pagination>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'Accessibility';
    const el = canvasElement.querySelector<Pagination>('#a11y-mid');
    if (!el) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await el.updateComplete;

    const sh = getShadow(el, S);

    // テスト: nav[aria-label]
    const nav = sh.querySelector('nav');
    if (!nav) throw new Error(`[${S}] nav が見つかりません`);
    if (nav.getAttribute('aria-label') !== 'ページナビゲーション') {
      throw new Error(`[${S}] nav の aria-label が "ページナビゲーション" ではありません`);
    }

    // テスト: Prev リンクの aria-label
    const prev = getPrev(sh, S);
    if (prev.getAttribute('aria-label') !== '前のページへ移動') {
      throw new Error(
        `[${S}] Prev の aria-label が正しくありません: "${prev.getAttribute('aria-label') ?? '(null)'}"`,
      );
    }

    // テスト: Next リンクの aria-label
    const next = getNext(sh, S);
    if (next.getAttribute('aria-label') !== '次のページへ移動') {
      throw new Error(
        `[${S}] Next の aria-label が正しくありません: "${next.getAttribute('aria-label') ?? '(null)'}"`,
      );
    }

    // テスト: 現在ページの aria-current と aria-label
    const currentLink = sh.querySelector('[aria-current="page"]');
    if (!currentLink) throw new Error(`[${S}] aria-current="page" が見つかりません`);
    if (currentLink.getAttribute('aria-label') !== '現在のページ、5ページ') {
      throw new Error(
        `[${S}] 現在ページの aria-label が正しくありません: "${currentLink.getAttribute('aria-label') ?? '(null)'}"`,
      );
    }

    // テスト: 非現在ページリンクの aria-label（例: ページ 4）
    const pageLinks = Array.from(sh.querySelectorAll('.page-btn'));
    const page4Link = pageLinks.find((a) => (a.textContent).trim() === '4');
    if (!page4Link) throw new Error(`[${S}] ページ 4 のリンクが見つかりません`);
    if (page4Link.getAttribute('aria-label') !== '4ページへ移動') {
      throw new Error(
        `[${S}] ページ 4 の aria-label が正しくありません: "${page4Link.getAttribute('aria-label') ?? '(null)'}"`,
      );
    }

    const page1Link = pageLinks.find((a) => (a.textContent).trim() === '1');
    if (!page1Link) throw new Error(`[${S}] ページ 1 のリンクが見つかりません`);
    if (page1Link.getAttribute('aria-label') !== '1ページへ移動') {
      throw new Error(
        `[${S}] ページ 1 の aria-label が正しくありません: "${page1Link.getAttribute('aria-label') ?? '(null)'}"`,
      );
    }

    // テスト: 省略記号は aria-hidden="true"（スクリーンリーダー非通知）
    const ellipses = sh.querySelectorAll('.ellipsis');
    if (ellipses.length === 0) throw new Error(`[${S}] 省略記号が見つかりません`);
    ellipses.forEach((el, i) => {
      if (el.getAttribute('aria-hidden') !== 'true') {
        throw new Error(`[${S}] ellipsis[${String(i)}] に aria-hidden="true" がありません`);
      }
    });

    // テスト: disabled な Prev/Next は <span>（tabindex なし = フォーカス不能）
    // → FirstPage / LastPage で別途検証済み。ここでは currentLink の構造を確認。
    // currentLink は <a> であること（href あり → 再訪可能）
    if (currentLink.tagName !== 'A') {
      throw new Error(`[${S}] 現在ページは <a> であるべきですが <${currentLink.tagName}> です`);
    }
    if (!currentLink.getAttribute('href')) {
      throw new Error(`[${S}] 現在ページの href が存在しません（再訪可能性の保証が失われています）`);
    }
  },
};

/**
 * `getHref` によるカスタム URL 生成。
 *
 * `getHref` プロパティに任意の関数を渡すことで、
 * 任意のルーティング形式に対応できます。
 * SSR 時にも静的 `href` が出力されることを保証します。
 */
export const GetHref: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          クエリパラメータ形式（デフォルト）: ?page=N
        </div>
        <ui-pagination
          id="href-query"
          current="5"
          total="10"
          .getHref="${(p: number) => `?page=${String(p)}`}"
        ></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
          パスベース形式: /notes/page/N/
        </div>
        <ui-pagination
          id="href-path"
          current="5"
          total="10"
          .getHref="${(p: number) => `/notes/page/${String(p)}/`}"
        ></ui-pagination>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'GetHref';

    const elQuery = canvasElement.querySelector<Pagination>('#href-query');
    const elPath = canvasElement.querySelector<Pagination>('#href-path');
    if (!elQuery || !elPath) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await Promise.all([elQuery.updateComplete, elPath.updateComplete]);

    // ─── クエリパラメータ形式 ───

    const shQuery = getShadow(elQuery, S);

    const prevQuery = getPrev(shQuery, S);
    if (prevQuery.getAttribute('href') !== '?page=4') {
      throw new Error(
        `[${S}] クエリ形式の Prev href が "?page=4" ではありません: "${prevQuery.getAttribute('href') ?? '(null)'}"`,
      );
    }
    const nextQuery = getNext(shQuery, S);
    if (nextQuery.getAttribute('href') !== '?page=6') {
      throw new Error(
        `[${S}] クエリ形式の Next href が "?page=6" ではありません: "${nextQuery.getAttribute('href') ?? '(null)'}"`,
      );
    }
    const currentQuery = shQuery.querySelector('[aria-current="page"]');
    if (!currentQuery) throw new Error(`[${S}] クエリ形式の aria-current="page" が見つかりません`);
    if (currentQuery.getAttribute('href') !== '?page=5') {
      throw new Error(
        `[${S}] クエリ形式の現在ページ href が "?page=5" ではありません: "${currentQuery.getAttribute('href') ?? '(null)'}"`,
      );
    }

    // ─── パスベース形式 ───

    const shPath = getShadow(elPath, S);

    const prevPath = getPrev(shPath, S);
    if (prevPath.getAttribute('href') !== '/notes/page/4/') {
      throw new Error(
        `[${S}] パス形式の Prev href が "/notes/page/4/" ではありません: "${prevPath.getAttribute('href') ?? '(null)'}"`,
      );
    }
    const nextPath = getNext(shPath, S);
    if (nextPath.getAttribute('href') !== '/notes/page/6/') {
      throw new Error(
        `[${S}] パス形式の Next href が "/notes/page/6/" ではありません: "${nextPath.getAttribute('href') ?? '(null)'}"`,
      );
    }
    const currentPath = shPath.querySelector('[aria-current="page"]');
    if (!currentPath) throw new Error(`[${S}] パス形式の aria-current="page" が見つかりません`);
    if (currentPath.getAttribute('href') !== '/notes/page/5/') {
      throw new Error(
        `[${S}] パス形式の現在ページ href が "/notes/page/5/" ではありません: "${currentPath.getAttribute('href') ?? '(null)'}"`,
      );
    }
  },
};

/**
 * 不正入力の正規化（防御的実装）の確認。
 *
 * `current` / `total` が不正値でも、内部で安全な整数へ正規化され
 * ページネーション契約（`aria-current` と有効な href）を維持することを確認します。
 */
export const InvalidInputNormalization: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem;">
          current=0, total=10 → current=1 に正規化
        </div>
        <ui-pagination id="invalid-current-low" current="0" total="10" .getHref="${defaultHref}">
        </ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem;">
          current=999, total=10 → current=10 に正規化
        </div>
        <ui-pagination id="invalid-current-high" current="999" total="10" .getHref="${defaultHref}">
        </ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem;">
          current=5, total=0 → total=1 に正規化
        </div>
        <ui-pagination id="invalid-total-zero" current="5" total="0" .getHref="${defaultHref}">
        </ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem;">
          API 関数: computeRange / computeCompactRange も不正値で安定動作
        </div>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'InvalidInputNormalization';
    const low = canvasElement.querySelector<Pagination>('#invalid-current-low');
    const high = canvasElement.querySelector<Pagination>('#invalid-current-high');
    const zero = canvasElement.querySelector<Pagination>('#invalid-total-zero');
    if (!low || !high || !zero) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await Promise.all([low.updateComplete, high.updateComplete, zero.updateComplete]);

    // current=0 -> 1
    const shLow = getShadow(low, S);
    const currentLow = shLow.querySelector('[aria-current="page"]');
    if (currentLow?.textContent.trim() !== '1') {
      throw new Error(`[${S}] current=0 が 1 に正規化されていません`);
    }
    const prevLow = getPrev(shLow, S);
    if (prevLow.tagName !== 'SPAN' || prevLow.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`[${S}] current=0 正規化時、Prev は disabled であるべきです`);
    }

    // current=999 -> total(=10)
    const shHigh = getShadow(high, S);
    const currentHigh = shHigh.querySelector('[aria-current="page"]');
    if (currentHigh?.textContent.trim() !== '10') {
      throw new Error(`[${S}] current=999 が 10 に正規化されていません`);
    }
    const nextHigh = getNext(shHigh, S);
    if (nextHigh.tagName !== 'SPAN' || nextHigh.getAttribute('aria-disabled') !== 'true') {
      throw new Error(`[${S}] current=999 正規化時、Next は disabled であるべきです`);
    }

    // total=0 -> 1
    const shZero = getShadow(zero, S);
    const currentZero = shZero.querySelector('[aria-current="page"]');
    if (currentZero?.textContent.trim() !== '1') {
      throw new Error(`[${S}] total=0 が total=1/current=1 に正規化されていません`);
    }
    const pageBtnsZero = shZero.querySelectorAll('.page-btn');
    if (pageBtnsZero.length !== 1) {
      throw new Error(`[${S}] total=0 正規化時、ページリンクは 1 つであるべきです`);
    }

    // 関数 API の安定性
    const r1 = computeRange(3, 0);
    if (r1.length !== 0) {
      throw new Error(`[${S}] computeRange(3, 0) は [] であるべきです: ${JSON.stringify(r1)}`);
    }
    const r2 = computeCompactRange(3, 0);
    if (r2.length !== 0) {
      throw new Error(
        `[${S}] computeCompactRange(3, 0) は [] であるべきです: ${JSON.stringify(r2)}`,
      );
    }
    const r3 = computeCompactRange(999, 10);
    if (r3.length !== 2 || r3[0] !== 'ellipsis' || r3[1] !== 10) {
      throw new Error(
        `[${S}] computeCompactRange(999, 10) が ['ellipsis', 10] ではありません: ${JSON.stringify(r3)}`,
      );
    }
  },
};

// ─────────────────────────────────────────────────
// 視覚確認（環境依存）
// ─────────────────────────────────────────────────

/**
 * Reduced Motion での確認。
 *
 * `prefers-reduced-motion: reduce` が設定されている場合、
 * `transition-duration` が `0.01ms` に短縮されます。
 *
 * **確認方法**:
 * - macOS: システム設定 > アクセシビリティ > ディスプレイ > 視差効果を減らす
 * - Windows: 設定 > アクセシビリティ > 視覚効果 > アニメーション効果をオフ
 * - Chrome DevTools: Rendering > Emulate CSS media feature `prefers-reduced-motion: reduce`
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
    </style>

    <div class="reduced-motion-info">
      <strong>確認方法</strong>:
      OS の「視差効果を減らす」または Chrome DevTools の
      <code>prefers-reduced-motion: reduce</code> を有効化してください。
      ホバー・プレス時のトランジションが即座に完了します（0.01ms）。
    </div>

    <ui-pagination
      current="5"
      total="10"
      .getHref="${defaultHref}"
    ></ui-pagination>
  `,
  parameters: {
    docs: {
      description: {
        story:
          '`prefers-reduced-motion: reduce` が有効な環境では、`transition-duration` が `0.01ms` に短縮されます。ホバーやプレスのアニメーションが即座に完了します。',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const S = 'ReducedMotion';
    const el = canvasElement.querySelector<Pagination>('ui-pagination');
    if (!el) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await el.updateComplete;
    const sh = getShadow(el, S);
    const styleText = getStyleText(sh, S);
    if (!styleText.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error(`[${S}] prefers-reduced-motion のメディアクエリが存在しません`);
    }
    if (!styleText.includes('transition-duration: 0.01ms')) {
      throw new Error(`[${S}] Reduced Motion 用の transition-duration: 0.01ms が存在しません`);
    }
  },
};

/**
 * Forced Colors Mode（高コントラストモード）での確認。
 *
 * Windows 高コントラストモード等での表示確認。
 *
 * **確認方法**:
 * - Windows: 設定 > アクセシビリティ > コントラストテーマ
 * - Chrome DevTools: Rendering > Emulate CSS media feature `forced-colors: active`
 *
 * **期待される表示**:
 * - 現在ページ: `Highlight` システムカラーで `outline` 付与（`box-shadow` は消失）
 * - Disabled (Prev/Next): `color: GrayText` でシステムカラーフォールバック
 * - 境界構造: 全アイテムに `border: var(--border-width) solid CanvasText`
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
      <strong>確認方法</strong>: Chrome DevTools → Rendering →
      <code>forced-colors: active</code> を有効化してください。
      現在ページが <code>Highlight</code> システムカラーの outline で識別されます。
    </div>

    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem;">
          中間ページ — current=5, total=10（Prev/Next 活性）
        </div>
        <ui-pagination current="5" total="10" .getHref="${defaultHref}"></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem;">
          先頭ページ — current=1（Prev disabled → GrayText）
        </div>
        <ui-pagination current="1" total="10" .getHref="${defaultHref}"></ui-pagination>
      </div>
      <div>
        <div style="font-size: 11px; color: oklch(48% 0.01 250); margin-bottom: 0.5rem;">
          末尾ページ — current=10（Next disabled → GrayText）
        </div>
        <ui-pagination current="10" total="10" .getHref="${defaultHref}"></ui-pagination>
      </div>
    </div>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'Forced Colors Mode では `box-shadow` インジケーターが消失するため、`outline: 2px solid Highlight` で現在地を明示します。Disabled 状態は `color: GrayText` でシステムカラーフォールバックします。',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const S = 'ForcedColorsMode';
    const mid = canvasElement.querySelector<Pagination>('ui-pagination[current="5"]');
    if (!mid) throw new Error(`[${S}] 中間ページの ui-pagination が見つかりません`);
    await mid.updateComplete;
    const sh = getShadow(mid, S);
    const styleText = getStyleText(sh, S);
    if (!styleText.includes('@media (forced-colors: active)')) {
      throw new Error(`[${S}] forced-colors のメディアクエリが存在しません`);
    }
    // WebKit は shorthand を longhand に分解し color token を小文字化するため、大文字小文字を区別しない検索を使用
    if (!styleText.toLowerCase().includes('outline') || !styleText.toLowerCase().includes('highlight')) {
      throw new Error(`[${S}] Forced Colors の current page outline が存在しません`);
    }
    // ブラウザによって color token が小文字化されるため、大文字小文字を区別しない検索を使用
    if (!styleText.toLowerCase().includes('graytext')) {
      throw new Error(`[${S}] Forced Colors の disabled GrayText が存在しません`);
    }
  },
};

/**
 * 構造型リンク契約:
 * - デフォルトは下線なし
 * - 現在地は物理インジケータ（inset shadow）で識別
 * - focus-visible の明示ルールを保持
 */
export const StructuralLinkContract: Story = {
  render: () => html`
    <ui-pagination
      id="structural-link-contract"
      current="5"
      total="10"
      .getHref="${defaultHref}"
    ></ui-pagination>
  `,
  play: async ({ canvasElement }) => {
    const S = 'StructuralLinkContract';
    const el = canvasElement.querySelector<Pagination>('#structural-link-contract');
    if (!el) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await el.updateComplete;

    const sh = getShadow(el, S);
    const styleText = getStyleText(sh, S);
    if (!styleText.includes('.page-btn:focus-visible')) {
      throw new Error(`[${S}] page-btn の focus-visible 契約が不足しています`);
    }
    if (!styleText.includes("box-shadow: inset")) {
      throw new Error(`[${S}] 現在地インジケータ（inset shadow）契約が不足しています`);
    }

    const current = sh.querySelector<HTMLAnchorElement>('.page-btn[aria-current="page"]');
    if (!current) throw new Error(`[${S}] 現在ページリンクが見つかりません`);
    if (getComputedStyle(current).textDecorationLine !== 'none') {
      throw new Error(`[${S}] page-btn は構造型リンクとして下線なしを維持する必要があります`);
    }

    const nonCurrent = sh.querySelector<HTMLAnchorElement>('.page-btn:not([aria-current="page"])');
    if (!nonCurrent) throw new Error(`[${S}] 非アクティブページリンクが見つかりません`);
    if (getComputedStyle(nonCurrent).textDecorationLine !== 'none') {
      throw new Error(`[${S}] 非アクティブ page-btn は下線なしである必要があります`);
    }
  },
};

/**
 * ダークモード想定のトークン適用確認。
 *
 * 色トークンを暗色系へ上書きした状態で、現在ページ・通常ページ・disabled が
 * 視覚的に分離されることを確認します。
 */
export const DarkMode: Story = {
  render: () => html`
    <div
      style="
        padding: 1rem;
        border-radius: 10px;
        background: #0f1217;
        color: #e6edf3;
        --bg-surface-active: color-mix(in oklab, #7ab8ff 18%, transparent);
        --bg-hover: color-mix(in oklab, #ffffff 10%, transparent);
        --primary: #7ab8ff;
        --fg-muted: #c7d1dc;
        --fg-subtle: #8b99aa;
        --focus-ring-color: #8fc2ff;
      "
    >
      <div style="font-size: 11px; margin-bottom: 0.5rem;">ダークトークン適用例 — current=5, total=10</div>
      <ui-pagination id="dark-pagination" current="5" total="10" .getHref="${defaultHref}"></ui-pagination>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'DarkMode';
    const el = canvasElement.querySelector<Pagination>('#dark-pagination');
    if (!el) throw new Error(`[${S}] ui-pagination が見つかりません`);
    await el.updateComplete;
    const sh = getShadow(el, S);
    const currentLink = sh.querySelector('[aria-current="page"]');
    if (!currentLink) throw new Error(`[${S}] aria-current="page" が見つかりません`);
    const prev = getPrev(sh, S);
    const next = getNext(sh, S);
    if (prev.tagName !== 'A' || next.tagName !== 'A') {
      throw new Error(`[${S}] 中間ページの Prev/Next は <a> であるべきです`);
    }
    const ellipses = sh.querySelectorAll('.ellipsis');
    if (ellipses.length !== 2) {
      throw new Error(`[${S}] 中間ページの省略記号数が 2 ではありません`);
    }
  },
};

// ─────────────────────────────────────────────────
// 全状態一覧（ビジュアルリグレッション用）
// ─────────────────────────────────────────────────

/**
 * 全状態一覧。
 *
 * すべての主要な状態・境界条件を一覧で確認できます。
 * デザインレビューやビジュアルリグレッションテストに使用します。
 */
export const AllStates: Story = {
  render: () => html`
    <style>
      .states-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
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
        <div class="state-label">中間ページ — current=5, total=10（両端に省略記号）</div>
        <ui-pagination id="all-mid" current="5" total="10" .getHref="${defaultHref}"></ui-pagination>
      </div>

      <div class="state-group">
        <div class="state-label">先頭ページ — current=1（Prev disabled）</div>
        <ui-pagination id="all-first" current="1" total="10" .getHref="${defaultHref}"></ui-pagination>
      </div>

      <div class="state-group">
        <div class="state-label">末尾ページ — current=10（Next disabled）</div>
        <ui-pagination id="all-last" current="10" total="10" .getHref="${defaultHref}"></ui-pagination>
      </div>

      <div class="state-group">
        <div class="state-label">1 ページのみ — total=1（両方 disabled）</div>
        <ui-pagination id="all-single" current="1" total="1" .getHref="${defaultHref}"></ui-pagination>
      </div>

      <div class="state-group">
        <div class="state-label">省略なし — total=7, current=4（全ページ表示）</div>
        <ui-pagination id="all-small" current="4" total="7" .getHref="${defaultHref}"></ui-pagination>
      </div>

      <div class="state-group">
        <div class="state-label">gap=2（左）— current=4, total=10（ページ 2 を実表示）</div>
        <ui-pagination id="all-gap-l" current="4" total="10" .getHref="${defaultHref}"></ui-pagination>
      </div>

      <div class="state-group">
        <div class="state-label">gap=2（右）— current=7, total=10（ページ 9 を実表示）</div>
        <ui-pagination id="all-gap-r" current="7" total="10" .getHref="${defaultHref}"></ui-pagination>
      </div>

      <div class="state-group">
        <div class="state-label">先頭付近 — current=2, total=10（左に省略記号なし）</div>
        <ui-pagination id="all-near-s" current="2" total="10" .getHref="${defaultHref}"></ui-pagination>
      </div>

      <div class="state-group">
        <div class="state-label">末尾付近 — current=9, total=10（右に省略記号なし）</div>
        <ui-pagination id="all-near-e" current="9" total="10" .getHref="${defaultHref}"></ui-pagination>
      </div>

      <div class="state-group">
        <div class="state-label">大量ページ — current=50, total=100</div>
        <ui-pagination id="all-large" current="50" total="100" .getHref="${defaultHref}"></ui-pagination>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const S = 'AllStates';

    const paginationEls = canvasElement.querySelectorAll<Pagination>('ui-pagination');
    await Promise.all([...paginationEls].map((el) => el.updateComplete));

    // テスト: すべての ui-pagination がレンダリングされている
    if (paginationEls.length !== 10) {
      throw new Error(`[${S}] ui-pagination 数が 10 ではありません: ${String(paginationEls.length)} 個`);
    }

    // テスト: 各要素の nav が存在すること
    paginationEls.forEach((el, i) => {
      const sh = el.shadowRoot;
      if (!sh) throw new Error(`[${S}] paginationEls[${String(i)}] の shadowRoot が存在しません`);
      const nav = sh.querySelector('nav');
      if (!nav) throw new Error(`[${S}] paginationEls[${String(i)}] の nav が存在しません`);
    });

    // テスト: all-small（total=7）は省略記号なし
    const elSmall = canvasElement.querySelector<Pagination>('#all-small');
    if (elSmall) {
      const sh = getShadow(elSmall, S);
      const ellipses = sh.querySelectorAll('.ellipsis');
      if (ellipses.length > 0) {
        throw new Error(`[${S}] total=7 に省略記号が存在します`);
      }
    }

    // テスト: all-single（total=1）は Prev/Next ともに disabled
    const elSingle = canvasElement.querySelector<Pagination>('#all-single');
    if (elSingle) {
      const sh = getShadow(elSingle, S);
      const prev = getPrev(sh, S);
      const next = getNext(sh, S);
      if (prev.tagName !== 'SPAN' || prev.getAttribute('aria-disabled') !== 'true') {
        throw new Error(`[${S}] all-single の Prev が disabled ではありません`);
      }
      if (next.tagName !== 'SPAN' || next.getAttribute('aria-disabled') !== 'true') {
        throw new Error(`[${S}] all-single の Next が disabled ではありません`);
      }
    }

    // テスト: all-gap-l（current=4, total=10）は省略記号 1 つのみ
    const elGapL = canvasElement.querySelector<Pagination>('#all-gap-l');
    if (elGapL) {
      const sh = getShadow(elGapL, S);
      const ellipses = sh.querySelectorAll('.ellipsis');
      if (ellipses.length !== 1) {
        throw new Error(
          `[${S}] all-gap-l の省略記号数が 1 ではありません: ${String(ellipses.length)} 個`,
        );
      }
    }

    // テスト: all-gap-r（current=7, total=10）は省略記号 1 つのみ
    const elGapR = canvasElement.querySelector<Pagination>('#all-gap-r');
    if (elGapR) {
      const sh = getShadow(elGapR, S);
      const ellipses = sh.querySelectorAll('.ellipsis');
      if (ellipses.length !== 1) {
        throw new Error(
          `[${S}] all-gap-r の省略記号数が 1 ではありません: ${String(ellipses.length)} 個`,
        );
      }
    }
  },
};
