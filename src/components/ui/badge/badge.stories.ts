import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './badge';
import type { Badge } from './badge';

/**
 * ## バッジ (Badge) `<ui-badge>`
 *
 * UIの一部として、数値（件数）やステータス（New, Draft）などのシステム的な「状態」を通知します。
 * **カプセル型（Pill Shape）** を採用し、ユーザー定義の分類である「タグ（矩形）」と形状レベルで区別します。
 *
 * ### バリアント
 *
 * - **`solid`** (デフォルト): 高コントラスト背景。未読数など強調すべき情報に使用。
 * - **`subtle`**: Solid の意味論を維持しつつトーンを落とす。`Beta`, `New`, `Draft` などのテキストラベルに使用。
 * - **`dot`**: 8px 正円。コンテンツの更新有無のみを伝える最小単位。
 *
 * ### コンテンツ優先ロジック
 *
 * - `count` が `number` の場合: スロット内容は無視され、数値のみが表示されます。
 * - `count` が `null` / `undefined` かつ `variant !== "dot"`: スロット内容が表示されます。
 * - `variant === "dot"`: `count` およびスロット内容は物理的にレンダリングされません。
 *
 * ### 非インタラクティブ設計
 *
 * バッジは情報表示専用コンポーネントです。`disabled`・`error` 状態は存在せず、
 * カスタムイベントも発行しません。フォーカス不可（`tabindex` なし）。
 */
const meta: Meta<Badge> = {
    title: 'Components/Badge',
    component: 'ui-badge',
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: `
バッジコンポーネントは、数値（件数）やステータス（New, Draft）などのシステム的な「状態」を通知します。
カプセル型（Pill Shape）を採用し、ユーザー定義の分類である「タグ（矩形）」と形状レベルで区別します。

## 使用方法

\`\`\`html
<!-- 数値バッジ（未読数） -->
<ui-badge count="5"></ui-badge>
<ui-badge count="128" max="99"></ui-badge>

<!-- テキストバッジ -->
<ui-badge variant="subtle">New</ui-badge>
<ui-badge variant="subtle" color="success">Beta</ui-badge>

<!-- Dot バッジ（更新有無） -->
<ui-badge variant="dot" color="danger" aria-label="未読の更新があります"></ui-badge>

<!-- カラー指定 -->
<ui-badge color="danger" count="3"></ui-badge>
<ui-badge color="warning" variant="subtle">Draft</ui-badge>
\`\`\`

## 注意事項

- **\`count\` が \`number\` の場合**: スロット内容は無視されます（Content Priority Logic）。
- **\`variant="dot"\`**: \`count\` およびスロット内容は物理的にレンダリングされません。
- **\`aria-label\`**: Dot バリアントには必ず \`aria-label\` を付与してください。
- **\`count > max\`**: 表示は \`{max}+\` ですが、\`aria-label\` には実際の件数が含まれます。
                `,
            },
        },
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['solid', 'subtle', 'dot'],
            description: '視覚スタイル',
            table: { type: { summary: "'solid' | 'subtle' | 'dot'" }, defaultValue: { summary: "'solid'" } },
        },
        count: {
            control: 'number',
            description: '表示する数値。`null` の場合はスロットを表示',
            table: { type: { summary: 'number | null' }, defaultValue: { summary: 'null' } },
        },
        max: {
            control: 'number',
            description: '数値の最大表示リミット（表示は `{max}+`）',
            table: { type: { summary: 'number' }, defaultValue: { summary: '99' } },
        },
        color: {
            control: 'select',
            options: ['danger', 'primary', 'neutral', 'success', 'warning'],
            description: '意味的カラー',
            table: { type: { summary: "'danger' | 'primary' | 'neutral' | 'success' | 'warning'" }, defaultValue: { summary: "'primary'" } },
        },
    },
};

export default meta;
type Story = StoryObj<Badge>;

const parseRgb = (value: string): [number, number, number] => {
    const normalized = value.trim();
    const match = /^rgba?\((.*)\)$/.exec(normalized);
    if (!match) throw new Error(`サポートされていないカラー形式です: "${value}"`);

    const rawBody = match[1] ?? '';
    const body = rawBody.split('/')[0]?.trim() ?? '';
    const channels = body.includes(',') ? body.split(',') : body.split(/\s+/);
    if (channels.length < 3) throw new Error(`無効な RGB チャンネルです: "${value}"`);

    const rgb = channels.slice(0, 3).map((ch) => Number.parseFloat(ch.trim()));
    if (rgb.some((n) => Number.isNaN(n))) throw new Error(`無効な RGB 値です: "${value}"`);
    return [rgb[0] ?? 0, rgb[1] ?? 0, rgb[2] ?? 0];
};

const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
    const linearize = (channel: number): number => {
        const sRgb = channel / 255;
        return sRgb <= 0.03928 ? sRgb / 12.92 : ((sRgb + 0.055) / 1.055) ** 2.4;
    };
    const lr = linearize(r);
    const lg = linearize(g);
    const lb = linearize(b);
    return (0.2126 * lr) + (0.7152 * lg) + (0.0722 * lb);
};

const contrastRatio = (fg: string, bg: string): number => {
    const l1 = relativeLuminance(parseRgb(fg));
    const l2 = relativeLuminance(parseRgb(bg));
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
};

const collectCssText = (styles: unknown): string => {
    if (Array.isArray(styles)) return styles.map((item) => collectCssText(item)).join('\n');
    if (typeof styles === 'object' && styles !== null && 'cssText' in styles) {
        const cssText = (styles as { cssText: unknown }).cssText;
        return typeof cssText === 'string' ? cssText : '';
    }
    return '';
};

// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * デフォルトのバッジ（solid / primary / スロットテキスト）。
 *
 * `count` が `null` のため、スロット内容が表示されます。
 */
export const Default: Story = {
    args: {
        variant: 'solid',
        color: 'primary',
        count: null,
        max: 99,
    },
    render: (args) => html`
    <ui-badge
      id="default-badge"
      variant="${args.variant}"
      color="${args.color}"
      max="${args.max}"
    >New</ui-badge>
  `,
    play: async ({ canvasElement }) => {
        const badge = canvasElement.querySelector<Badge>('#default-badge');
        if (!badge) throw new Error('ui-badge が見つかりません');
        await badge.updateComplete;

        // テスト: デフォルトプロパティ
        if (badge.variant !== 'solid') throw new Error(`variant="solid" を期待していましたが、実際には "${badge.variant}" でした`);
        if (badge.color !== 'primary') throw new Error(`color="primary" を期待していましたが、実際には "${badge.color}" でした`);
        if (badge.count !== null) throw new Error(`count=null を期待していましたが、実際には ${String(badge.count)} でした`);
        if (badge.max !== 99) throw new Error(`max=99 を期待していましたが、実際には ${String(badge.max)} でした`);

        // テスト: count が null のためスロットがレンダリングされる
        const slot = badge.shadowRoot?.querySelector('slot');
        if (!slot) throw new Error('slot が見つかりません（count が null の場合は存在する必要があります）');

        // テスト: role="status" は存在しない（スロット表示時は静的ラベル）
        const statusSpan = badge.shadowRoot?.querySelector('[role="status"]');
        if (statusSpan) throw new Error('count が null のとき、role="status" は存在してはいけません');

        console.log('✅ All tests passed for Default story');
    },
};

// ──────────────────────────────────────────────
// バリアント × カラーのマトリクス
// ──────────────────────────────────────────────

/**
 * 全バリアント × 全カラーの一覧。
 *
 * デザインレビューやビジュアルリグレッションテストに使用します。
 * WCAG AA 準拠のコントラスト比（テキスト: 4.5:1 以上）を目視で確認できます。
 *
 * - **Solid**: 高コントラスト背景。未読数など強調すべき情報に使用。
 * - **Subtle**: Solid の意味論を維持しつつトーンを落とす。テキストラベルに使用。
 * - **Dot**: 8px 正円。コンテンツの更新有無のみを伝える最小単位。
 */
export const VariantColorMatrix: Story = {
    render: () => {
        const variants = ['solid', 'subtle', 'dot'] as const;
        const colors = ['primary', 'danger', 'success', 'warning', 'neutral'] as const;

        return html`
      <style>
        .matrix { display: flex; flex-direction: column; gap: 1.5rem; }
        .matrix-row { display: flex; flex-direction: column; gap: 0.5rem; }
        .matrix-label {
          font-size: 11px; font-weight: 500;
          color: oklch(48% 0.01 250);
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .matrix-badges { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
      </style>
      <div class="matrix">
        ${variants.map((variant) => html`
          <div class="matrix-row">
            <div class="matrix-label">${variant}</div>
            <div class="matrix-badges">
              ${colors.map((color) => variant === 'dot'
            ? html`
                    <ui-badge
                      id="matrix-${variant}-${color}"
                      variant="${variant}"
                      color="${color}"
                      aria-label="${color} の更新があります"
                    ></ui-badge>
                  `
            : html`
                    <ui-badge
                      id="matrix-${variant}-${color}"
                      variant="${variant}"
                      color="${color}"
                    >${color}</ui-badge>
                  `
        )}
            </div>
          </div>
        `)}
      </div>
    `;
    },
    play: async ({ canvasElement }) => {
        const badges = canvasElement.querySelectorAll<Badge>('ui-badge');
        // 3 variants × 5 colors = 15
        if (badges.length !== 15) {
            throw new Error(`15個のバッジ（3バリアント × 5カラー）を期待していましたが、実際には ${String(badges.length)}個でした`);
        }

        await Promise.all([...badges].map((b) => b.updateComplete));

        // テスト: 各バッジが正しい variant / color を持つ
        const solidPrimary = canvasElement.querySelector<Badge>('#matrix-solid-primary');
        if (!solidPrimary) throw new Error('#matrix-solid-primary が見つかりません');
        if (solidPrimary.variant !== 'solid') throw new Error('variant="solid" を期待していました');
        if (solidPrimary.color !== 'primary') throw new Error('color="primary" を期待していました');

        const subtleWarning = canvasElement.querySelector<Badge>('#matrix-subtle-warning');
        if (!subtleWarning) throw new Error('#matrix-subtle-warning が見つかりません');
        if (subtleWarning.variant !== 'subtle') throw new Error('variant="subtle" を期待していました');
        if (subtleWarning.color !== 'warning') throw new Error('color="warning" を期待していました');

        const dotDanger = canvasElement.querySelector<Badge>('#matrix-dot-danger');
        if (!dotDanger) throw new Error('#matrix-dot-danger が見つかりません');
        if (dotDanger.variant !== 'dot') throw new Error('variant="dot" を期待していました');
        if (dotDanger.color !== 'danger') throw new Error('Expected color="danger"');

        // テスト: Dot バリアントはコンテンツをレンダリングしない
        const dotSlot = dotDanger.shadowRoot?.querySelector('slot');
        if (dotSlot) throw new Error('dot バリアントは slot をレンダリングしてはいけません');
        const dotStatus = dotDanger.shadowRoot?.querySelector('[role="status"]');
        if (dotStatus) throw new Error('dot バリアントは role="status" をレンダリングしてはいけません');

        console.log('✅ All tests passed for VariantColorMatrix story');
    },
};

// ──────────────────────────────────────────────
// 数値バッジ（count）
// ──────────────────────────────────────────────

/**
 * 数値バッジ（`count` プロパティ使用）。
 *
 * `count` が `number` の場合、スロット内容は無視され、数値のみが表示されます。
 * `role="status"` により、動的に変更された場合にスクリーンリーダーが自動アナウンスします。
 */
export const CountBadge: Story = {
    render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
      <ui-badge id="count-1"   color="primary" count="1"></ui-badge>
      <ui-badge id="count-9"   color="primary" count="9"></ui-badge>
      <ui-badge id="count-99"  color="primary" count="99"></ui-badge>
      <ui-badge id="count-100" color="primary" count="100"></ui-badge>
      <ui-badge id="count-128" color="danger"  count="128"></ui-badge>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const badge1 = canvasElement.querySelector<Badge>('#count-1');
        const badge99 = canvasElement.querySelector<Badge>('#count-99');
        const badge100 = canvasElement.querySelector<Badge>('#count-100');
        const badge128 = canvasElement.querySelector<Badge>('#count-128');
        if (!badge1 || !badge99 || !badge100 || !badge128) throw new Error('バッジが見つかりません');
        await Promise.all([badge1.updateComplete, badge99.updateComplete, badge100.updateComplete, badge128.updateComplete]);

        // テスト: count=1 → 表示 "1"
        const status1 = badge1.shadowRoot?.querySelector('[role="status"]');
        if (!status1) throw new Error('count=1 の role="status" が見つかりません');
        if (status1.textContent.trim() !== '1') {
            throw new Error(`"1" を期待していましたが、実際には "${status1.textContent.trim()}" でした`);
        }

        // テスト: count=99 → 表示 "99"（max=99 と等しいため "+" なし）
        const status99 = badge99.shadowRoot?.querySelector('[role="status"]');
        if (!status99) throw new Error('count=99 の role="status" が見つかりません');
        if (status99.textContent.trim() !== '99') {
            throw new Error(`"99" を期待していましたが、実際には "${status99.textContent.trim()}" でした`);
        }

        // テスト: count=100 → 表示 "99+"（max=99 を超過）
        const status100 = badge100.shadowRoot?.querySelector('[role="status"]');
        if (!status100) throw new Error('count=100 の role="status" が見つかりません');
        if (status100.textContent.trim() !== '99+') {
            throw new Error(`"99+" を期待していましたが、実際には "${status100.textContent.trim()}" でした`);
        }

        // テスト: count=128 → aria-label は "128 件"（実数値）
        const status128 = badge128.shadowRoot?.querySelector('[role="status"]');
        if (!status128) throw new Error('count=128 の role="status" が見つかりません');
        const ariaLabel128 = status128.getAttribute('aria-label');
        if (ariaLabel128 !== '128 件') {
            throw new Error(`aria-label="128 件" を期待していましたが、実際には "${ariaLabel128 ?? 'null'}" でした`);
        }

        // テスト: count が number の場合、slot は存在しない
        const slot1 = badge1.shadowRoot?.querySelector('slot');
        if (slot1) throw new Error('count が数値のとき、slot は存在してはいけません');

        console.log('✅ All tests passed for CountBadge story');
    },
};

// ──────────────────────────────────────────────
// テキストバッジ（スロット使用）
// ──────────────────────────────────────────────

/**
 * テキストバッジ（スロット使用）。
 *
 * `count` が `null` かつ `variant !== "dot"` の場合、スロット内容が表示されます。
 * `Beta`, `New`, `Draft` などのテキストラベルに使用します。
 * **Subtle バリアント** が推奨されます。
 */
export const TextBadge: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="font-size: 11px; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        Solid × Text
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="text-solid-primary" variant="solid" color="primary">New</ui-badge>
        <ui-badge id="text-solid-danger"  variant="solid" color="danger">Hot</ui-badge>
        <ui-badge id="text-solid-success" variant="solid" color="success">Live</ui-badge>
      </div>
      <div style="font-size: 11px; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        Subtle × Text（推奨）
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="text-subtle-primary" variant="subtle" color="primary">Beta</ui-badge>
        <ui-badge id="text-subtle-success" variant="subtle" color="success">Stable</ui-badge>
        <ui-badge id="text-subtle-warning" variant="subtle" color="warning">Draft</ui-badge>
        <ui-badge id="text-subtle-danger"  variant="subtle" color="danger">Deprecated</ui-badge>
        <ui-badge id="text-subtle-neutral" variant="subtle" color="neutral">Archived</ui-badge>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const subtlePrimary = canvasElement.querySelector<Badge>('#text-subtle-primary');
        if (!subtlePrimary) throw new Error('#text-subtle-primary が見つかりません');
        await subtlePrimary.updateComplete;

        // テスト: count が null のためスロットがレンダリングされる
        const slot = subtlePrimary.shadowRoot?.querySelector('slot');
        if (!slot) throw new Error('slot が見つかりません（count が null の場合は存在する必要があります）');

        // テスト: role="status" は存在しない（静的ラベル）
        const statusSpan = subtlePrimary.shadowRoot?.querySelector('[role="status"]');
        if (statusSpan) throw new Error('テキストバッジに role="status" は存在してはいけません');

        // テスト: solid バリアントでも同様にスロットが使われる
        const solidPrimary = canvasElement.querySelector<Badge>('#text-solid-primary');
        if (!solidPrimary) throw new Error('#text-solid-primary が見つかりません');
        await solidPrimary.updateComplete;
        const solidSlot = solidPrimary.shadowRoot?.querySelector('slot');
        if (!solidSlot) throw new Error('solid テキストバッジの slot が見つかりません');

        console.log('✅ All tests passed for TextBadge story');
    },
};

// ──────────────────────────────────────────────
// Dot バリアント
// ──────────────────────────────────────────────

/**
 * Dot バリアント（8px 正円）。
 *
 * コンテンツの更新有無のみを伝える最小単位です。
 * テキストを持たないため、**必ず** `aria-label` を付与してください。
 * `role="img"` が付与されます。
 */
export const DotVariant: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>Dot バリアント</strong>: テキストを持たないため、<code>aria-label</code> が必須です。
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
        <ui-badge id="dot-primary" variant="dot" color="primary" aria-label="新しい更新があります"></ui-badge>
        <ui-badge id="dot-danger"  variant="dot" color="danger"  aria-label="未読の通知があります"></ui-badge>
        <ui-badge id="dot-success" variant="dot" color="success" aria-label="オンラインです"></ui-badge>
        <ui-badge id="dot-warning" variant="dot" color="warning" aria-label="注意が必要です"></ui-badge>
        <ui-badge id="dot-neutral" variant="dot" color="neutral" aria-label="オフラインです"></ui-badge>
      </div>
      <div style="font-size: 11px; color: oklch(48% 0.01 250);">
        ↑ アイコンの右上などに配置して使用します
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const dotDanger = canvasElement.querySelector<Badge>('#dot-danger');
        if (!dotDanger) throw new Error('#dot-danger が見つかりません');
        await dotDanger.updateComplete;

        // テスト: role="img" が付与されている
        const imgSpan = dotDanger.shadowRoot?.querySelector('[role="img"]');
        if (!imgSpan) throw new Error('dot バリアントの role="img" が見つかりません');
        if (imgSpan.getAttribute('aria-label') !== '未読の通知があります') {
            throw new Error('dot バリアントの aria-label が適用されていません');
        }

        // テスト: slot は存在しない（Dot は内容を持たない）
        const slot = dotDanger.shadowRoot?.querySelector('slot');
        if (slot) throw new Error('dot バリアントに slot は存在してはいけません');

        // テスト: role="status" は存在しない
        const statusSpan = dotDanger.shadowRoot?.querySelector('[role="status"]');
        if (statusSpan) throw new Error('dot バリアントに role="status" は存在してはいけません');

        // テスト: count を設定してもコンテンツがレンダリングされない
        dotDanger.count = 5;
        await dotDanger.updateComplete;
        const imgSpanAfterCount = dotDanger.shadowRoot?.querySelector('[role="img"]');
        if (!imgSpanAfterCount) throw new Error('dot バリアントに count を設定した後も role="img" は存在する必要があります');
        const statusAfterCount = dotDanger.shadowRoot?.querySelector('[role="status"]');
        if (statusAfterCount) throw new Error('dot バリアントに count を設定しても role="status" は表示されてはいけません');

        // テスト: aria-label 属性の変更が再レンダリングに追従する
        dotDanger.setAttribute('aria-label', '新しい未読があります');
        await dotDanger.updateComplete;
        const imgSpanAfterLabelUpdate = dotDanger.shadowRoot?.querySelector('[role="img"]');
        if (!imgSpanAfterLabelUpdate) throw new Error('aria-label 更新後に role="img" が見つかりません');
        if (imgSpanAfterLabelUpdate.getAttribute('aria-label') !== '新しい未読があります') {
            throw new Error('dot バリアントの aria-label 更新が反映されていません');
        }

        console.log('✅ All tests passed for DotVariant story');
    },
};

// ──────────────────────────────────────────────
// count × max の組み合わせ
// ──────────────────────────────────────────────

/**
 * `count` と `max` の組み合わせ一覧。
 *
 * `count > max` の場合、表示は `{max}+` となります。
 * `aria-label` には正規化後の実数値が含まれます。
 */
export const CountMaxCombinations: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="font-size: 11px; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        count ≤ max（そのまま表示）
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="cm-0"   color="primary" count="0"   max="99"></ui-badge>
        <ui-badge id="cm-1"   color="primary" count="1"   max="99"></ui-badge>
        <ui-badge id="cm-50"  color="primary" count="50"  max="99"></ui-badge>
        <ui-badge id="cm-99"  color="primary" count="99"  max="99"></ui-badge>
      </div>
      <div style="font-size: 11px; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        count > max（{max}+ 表示）
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="cm-100"  color="danger" count="100"  max="99"></ui-badge>
        <ui-badge id="cm-999"  color="danger" count="999"  max="99"></ui-badge>
        <ui-badge id="cm-9999" color="danger" count="9999" max="99"></ui-badge>
      </div>
      <div style="font-size: 11px; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        カスタム max
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="cm-custom-9"    color="warning" count="10"  max="9"></ui-badge>
        <ui-badge id="cm-custom-999"  color="warning" count="1000" max="999"></ui-badge>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        await Promise.all(
            [...canvasElement.querySelectorAll<Badge>('ui-badge')].map((b) => b.updateComplete),
        );

        // テスト: count=0 → 表示 "0"
        const b0 = canvasElement.querySelector<Badge>('#cm-0');
        if (!b0) throw new Error('#cm-0 が見つかりません');
        const s0 = b0.shadowRoot?.querySelector('[role="status"]');
        if (!s0) throw new Error('count=0 の role="status" が見つかりません');
        if (s0.textContent.trim() !== '0') throw new Error(`"0" を期待していましたが、実際には "${s0.textContent.trim()}" でした`);

        // テスト: count=99, max=99 → 表示 "99"（等しいため "+" なし）
        const b99 = canvasElement.querySelector<Badge>('#cm-99');
        if (!b99) throw new Error('#cm-99 が見つかりません');
        const s99 = b99.shadowRoot?.querySelector('[role="status"]');
        if (!s99) throw new Error('count=99 の role="status" が見つかりません');
        if (s99.textContent.trim() !== '99') throw new Error(`"99" を期待していましたが、実際には "${s99.textContent.trim()}" でした`);

        // テスト: count=100, max=99 → 表示 "99+"
        const b100 = canvasElement.querySelector<Badge>('#cm-100');
        if (!b100) throw new Error('#cm-100 が見つかりません');
        const s100 = b100.shadowRoot?.querySelector('[role="status"]');
        if (!s100) throw new Error('count=100 の role="status" が見つかりません');
        if (s100.textContent.trim() !== '99+') throw new Error(`"99+" を期待していましたが、実際には "${s100.textContent.trim()}" でした`);

        // テスト: count=10, max=9 → 表示 "9+"
        const bCustom9 = canvasElement.querySelector<Badge>('#cm-custom-9');
        if (!bCustom9) throw new Error('#cm-custom-9 が見つかりません');
        const sCustom9 = bCustom9.shadowRoot?.querySelector('[role="status"]');
        if (!sCustom9) throw new Error('カスタム max=9 の role="status" が見つかりません');
        if (sCustom9.textContent.trim() !== '9+') throw new Error(`"9+" を期待していましたが、実際には "${sCustom9.textContent.trim()}" でした`);

        console.log('✅ All tests passed for CountMaxCombinations story');
    },
};

// ──────────────────────────────────────────────
// Content Priority Logic: count が number の場合スロットを無視
// ──────────────────────────────────────────────

/**
 * Content Priority Logic の確認。
 *
 * `count` が `number` の場合、スロット内容は無視されます。
 * スロットに "New" と書いても、数値のみが表示されます。
 */
export const ContentPriorityLogic: Story = {
    parameters: {
        docs: {
            description: {
                story: '`count` が `number` の場合、スロット内容は無視されます（Content Priority Logic）。スロットに "New" と書いても数値のみが表示されます。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>Content Priority Logic</strong>: <code>count</code> が <code>number</code> の場合、スロット内容は無視されます。
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <!-- count が number → スロット "New" は無視され "5" が表示される -->
        <ui-badge id="priority-count" color="primary" count="5">New</ui-badge>
        <!-- count が null → スロット "New" が表示される -->
        <ui-badge id="priority-slot"  color="primary">New</ui-badge>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const withCount = canvasElement.querySelector<Badge>('#priority-count');
        const withSlot = canvasElement.querySelector<Badge>('#priority-slot');
        if (!withCount || !withSlot) throw new Error('バッジが見つかりません');
        await Promise.all([withCount.updateComplete, withSlot.updateComplete]);

        // テスト: count=5 → role="status" で "5" が表示される
        const statusSpan = withCount.shadowRoot?.querySelector('[role="status"]');
        if (!statusSpan) throw new Error('count 設定時に role="status" が見つかりません');
        if (statusSpan.textContent.trim() !== '5') {
            throw new Error(`"5" を期待していましたが、実際には "${statusSpan.textContent.trim()}" でした`);
        }

        // テスト: count=5 → slot は存在しない
        const slotWithCount = withCount.shadowRoot?.querySelector('slot');
        if (slotWithCount) throw new Error('count が数値のとき、slot は存在してはいけません');

        // テスト: count=null → slot が存在する
        const slotWithoutCount = withSlot.shadowRoot?.querySelector('slot');
        if (!slotWithoutCount) throw new Error('count が null のとき、slot は存在する必要があります');

        // テスト: count=null → role="status" は存在しない
        const statusWithoutCount = withSlot.shadowRoot?.querySelector('[role="status"]');
        if (statusWithoutCount) throw new Error('count が null のとき、role="status" は存在してはいけません');

        console.log('✅ All tests passed for ContentPriorityLogic story');
    },
};

// ──────────────────────────────────────────────
// 境界条件（事故が多い）
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: `count` の正規化ルール。
 *
 * - `NaN` → `0`
 * - `Infinity` / `-Infinity` → `0`
 * - 負数 → `0`
 * - 小数 → `Math.floor()` で整数化
 * - `null` / `undefined` → スロット表示
 */
export const CountNormalization: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: `count` の正規化ルール。`NaN`/`Infinity`/負数は `0`、小数は `Math.floor()` で整数化されます。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>count</code> の正規化ルール（NaN/Infinity/負数/小数）
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="norm-nan"      color="primary" .count="${NaN}"></ui-badge>
        <ui-badge id="norm-inf"      color="primary" .count="${Infinity}"></ui-badge>
        <ui-badge id="norm-neg-inf"  color="primary" .count="${-Infinity}"></ui-badge>
        <ui-badge id="norm-negative" color="primary" .count="${-5}"></ui-badge>
        <ui-badge id="norm-float"    color="primary" .count="${3.9}"></ui-badge>
        <ui-badge id="norm-zero"     color="primary" .count="${0}"></ui-badge>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        await Promise.all(
            [...canvasElement.querySelectorAll<Badge>('ui-badge')].map((b) => b.updateComplete),
        );

        const check = (id: string, expected: string) => {
            const badge = canvasElement.querySelector<Badge>(id);
            if (!badge) throw new Error(`${id} が見つかりません`);
            const status = badge.shadowRoot?.querySelector('[role="status"]');
            if (!status) throw new Error(`${id} の role="status" が見つかりません`);
            const actual = status.textContent.trim() || 'null';
            if (actual !== expected) {
                throw new Error(`${id}: "${expected}" を期待していましたが、実際には "${actual}" でした`);
            }
        };

        // テスト: NaN → "0"
        check('#norm-nan', '0');
        // テスト: Infinity → "0"
        check('#norm-inf', '0');
        // テスト: -Infinity → "0"
        check('#norm-neg-inf', '0');
        // テスト: -5 → "0"
        check('#norm-negative', '0');
        // テスト: 3.9 → "3"（Math.floor）
        check('#norm-float', '3');
        // テスト: 0 → "0"
        check('#norm-zero', '0');

        console.log('✅ All tests passed for CountNormalization story');
    },
};

/**
 * ⚠️ 境界条件: `max` の正規化ルール。
 *
 * - `Math.floor()` で整数化
 * - `1` 未満は `1` に補正（`max=0`, `max=-1` など）
 * - `NaN` / `Infinity` → `1` に補正
 */
export const MaxNormalization: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: `max` の正規化ルール。`1` 未満は `1` に補正されます。`max=0` でも表示は `"1+"` になります。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>max</code> の正規化ルール（1未満は1に補正）
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <!-- max=0 → 1 に補正 → count=5 > 1 → "1+" -->
        <ui-badge id="max-zero"     color="warning" count="5"  .max="${0}"></ui-badge>
        <!-- max=-1 → 1 に補正 → count=5 > 1 → "1+" -->
        <ui-badge id="max-negative" color="warning" count="5"  .max="${-1}"></ui-badge>
        <!-- max=0.9 → floor=0 → 1 に補正 → "1+" -->
        <ui-badge id="max-float"    color="warning" count="5"  .max="${0.9}"></ui-badge>
        <!-- max=NaN → 1 に補正 → "1+" -->
        <ui-badge id="max-nan"      color="warning" count="5"  .max="${NaN}"></ui-badge>
        <!-- max=Infinity → 1 に補正 → "1+" -->
        <ui-badge id="max-inf"      color="warning" count="5"  .max="${Infinity}"></ui-badge>
        <!-- max=1 → count=1 ≤ 1 → "1" -->
        <ui-badge id="max-one"      color="primary" count="1"  max="1"></ui-badge>
        <!-- max=1 → count=2 > 1 → "1+" -->
        <ui-badge id="max-one-over" color="danger"  count="2"  max="1"></ui-badge>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        await Promise.all(
            [...canvasElement.querySelectorAll<Badge>('ui-badge')].map((b) => b.updateComplete),
        );

        const check = (id: string, expected: string) => {
            const badge = canvasElement.querySelector<Badge>(id);
            if (!badge) throw new Error(`${id} が見つかりません`);
            const status = badge.shadowRoot?.querySelector('[role="status"]');
            if (!status) throw new Error(`${id} の role="status" が見つかりません`);
            const actual = status.textContent.trim();
            if (actual !== expected) {
                throw new Error(`${id}: "${expected}" を期待していましたが、実際には "${actual}" でした`);
            }
        };

        // テスト: max=0 → 1 に補正 → count=5 > 1 → "1+"
        check('#max-zero', '1+');
        // テスト: max=-1 → 1 に補正 → "1+"
        check('#max-negative', '1+');
        // テスト: max=0.9 → floor=0 → 1 に補正 → "1+"
        check('#max-float', '1+');
        // テスト: max=NaN → 1 に補正 → "1+"
        check('#max-nan', '1+');
        // テスト: max=Infinity → 1 に補正 → "1+"
        check('#max-inf', '1+');
        // テスト: max=1, count=1 → "1"（等しいため "+" なし）
        check('#max-one', '1');
        // テスト: max=1, count=2 → "1+"
        check('#max-one-over', '1+');

        console.log('✅ All tests passed for MaxNormalization story');
    },
};

/**
 * ⚠️ 境界条件: `count=0` の表示。
 *
 * `count=0` は有効な数値として扱われ、`"0"` が表示されます。
 * `null` や `undefined` とは異なります。
 */
export const CountZero: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: `count=0` は有効な数値として `"0"` が表示されます。`null` や `undefined` とは異なります。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>count=0</code> は <code>"0"</code> が表示されます（<code>null</code> とは異なります）。
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="zero-count"  color="primary" count="0">スロット（無視される）</ui-badge>
        <ui-badge id="null-count"  color="primary">スロット（表示される）</ui-badge>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const zeroCount = canvasElement.querySelector<Badge>('#zero-count');
        const nullCount = canvasElement.querySelector<Badge>('#null-count');
        if (!zeroCount || !nullCount) throw new Error('バッジが見つかりません');
        await Promise.all([zeroCount.updateComplete, nullCount.updateComplete]);

        // テスト: count=0 → "0" が表示される（スロットは無視）
        const statusZero = zeroCount.shadowRoot?.querySelector('[role="status"]');
        if (!statusZero) throw new Error('count=0 の role="status" が見つかりません');
        if (statusZero.textContent.trim() !== '0') {
            throw new Error(`"0" を期待していましたが、実際には "${statusZero.textContent.trim()}" でした`);
        }
        const slotZero = zeroCount.shadowRoot?.querySelector('slot');
        if (slotZero) throw new Error('count=0 のとき、slot は存在してはいけません');

        // テスト: count=null → スロットが表示される
        const slotNull = nullCount.shadowRoot?.querySelector('slot');
        if (!slotNull) throw new Error('count が null のとき、slot は存在する必要があります');
        const statusNull = nullCount.shadowRoot?.querySelector('[role="status"]');
        if (statusNull) throw new Error('count が null のとき、role="status" は存在してはいけません');

        console.log('✅ All tests passed for CountZero story');
    },
};

/**
 * ⚠️ 境界条件: `count=undefined` は `null` 同様にスロット表示。
 *
 * 仕様上、`count` が `null` または `undefined` の場合は数値表示せず、
 * `variant !== "dot"` でスロットを表示します。
 */
export const CountUndefined: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: `count=undefined` は `null` と同様にスロット表示されます。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>count=undefined</code> はスロット表示になります。
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="undefined-count" color="primary">New</ui-badge>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const badge = canvasElement.querySelector<Badge>('#undefined-count');
        if (!badge) throw new Error('#undefined-count が見つかりません');
        await badge.updateComplete;

        // テスト: count を undefined にしても数値表示されず、スロット表示になる
        badge.count = undefined;
        await badge.updateComplete;

        const slot = badge.shadowRoot?.querySelector('slot');
        if (!slot) throw new Error('count が undefined のとき、slot は存在する必要があります');
        const status = badge.shadowRoot?.querySelector('[role="status"]');
        if (status) throw new Error('count が undefined のとき、role="status" は存在してはいけません');

        console.log('✅ All tests passed for CountUndefined story');
    },
};

/**
 * ⚠️ 境界条件: `aria-label` の実数値保証。
 *
 * 表示が `99+` でも `aria-label` には実際の件数（例: 128）が含まれます。
 * スクリーンリーダーユーザーに正確な情報を提供します。
 */
export const AriaLabelAccuracy: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: 表示が `99+` でも `aria-label` には実際の件数（例: `128 件`）が含まれます。スクリーンリーダーユーザーへの正確な情報提供のため。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: 表示は <code>99+</code> でも <code>aria-label</code> には実際の件数が含まれます。
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <!-- 表示: "99+" / aria-label: "128 件" -->
        <ui-badge id="aria-128" color="danger" count="128" max="99"></ui-badge>
        <!-- 表示: "99+" / aria-label: "9999 件" -->
        <ui-badge id="aria-9999" color="danger" count="9999" max="99"></ui-badge>
        <!-- 表示: "50" / aria-label: "50 件" -->
        <ui-badge id="aria-50" color="primary" count="50" max="99"></ui-badge>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        await Promise.all(
            [...canvasElement.querySelectorAll<Badge>('ui-badge')].map((b) => b.updateComplete),
        );

        // テスト: count=128, max=99 → 表示 "99+", aria-label "128 件"
        const b128 = canvasElement.querySelector<Badge>('#aria-128');
        if (!b128) throw new Error('#aria-128 が見つかりません');
        const s128 = b128.shadowRoot?.querySelector('[role="status"]');
        if (!s128) throw new Error('count=128 の role="status" が見つかりません');
        if (s128.textContent.trim() !== '99+') {
            throw new Error(`表示が "99+" であることを期待していましたが、実際には "${s128.textContent.trim()}" でした`);
        }
        if (s128.getAttribute('aria-label') !== '128 件') {
            throw new Error(`aria-label="128 件" を期待していましたが、実際には "${s128.getAttribute('aria-label') ?? 'null'}" でした`);
        }

        // テスト: count=9999, max=99 → 表示 "99+", aria-label "9999 件"
        const b9999 = canvasElement.querySelector<Badge>('#aria-9999');
        if (!b9999) throw new Error('#aria-9999 が見つかりません');
        const s9999 = b9999.shadowRoot?.querySelector('[role="status"]');
        if (!s9999) throw new Error('count=9999 の role="status" が見つかりません');
        if (s9999.getAttribute('aria-label') !== '9999 件') {
            throw new Error(`aria-label="9999 件" を期待していましたが、実際には "${s9999.getAttribute('aria-label') ?? 'null'}" でした`);
        }

        // テスト: count=50, max=99 → 表示 "50", aria-label "50 件"
        const b50 = canvasElement.querySelector<Badge>('#aria-50');
        if (!b50) throw new Error('#aria-50 が見つかりません');
        const s50 = b50.shadowRoot?.querySelector('[role="status"]');
        if (!s50) throw new Error('count=50 の role="status" が見つかりません');
        if (s50.textContent.trim() !== '50') {
            throw new Error(`表示が "50" であることを期待していましたが、実際には "${s50.textContent.trim()}" でした`);
        }
        if (s50.getAttribute('aria-label') !== '50 件') {
            throw new Error(`aria-label="50 件" を期待していましたが、実際には "${s50.getAttribute('aria-label') ?? 'null'}" でした`);
        }

        console.log('✅ All tests passed for AriaLabelAccuracy story');
    },
};

/**
 * ⚠️ 境界条件: Dot バリアントは `count` を無視する。
 *
 * `variant="dot"` の場合、`count` を設定してもコンテンツはレンダリングされません。
 * Dot は純粋に視覚的インジケーターとしてのみ機能します。
 */
export const DotIgnoresCount: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: `variant="dot"` の場合、`count` を設定してもコンテンツはレンダリングされません。Dot は純粋に視覚的インジケーターです。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>variant="dot"</code> は <code>count</code> を無視します。
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <!-- count=99 を設定してもコンテンツはレンダリングされない -->
        <ui-badge id="dot-with-count" variant="dot" color="danger" count="99" aria-label="未読があります"></ui-badge>
        <!-- スロットを設定してもコンテンツはレンダリングされない -->
        <ui-badge id="dot-with-slot"  variant="dot" color="primary" aria-label="更新があります">New</ui-badge>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const dotWithCount = canvasElement.querySelector<Badge>('#dot-with-count');
        const dotWithSlot = canvasElement.querySelector<Badge>('#dot-with-slot');
        if (!dotWithCount || !dotWithSlot) throw new Error('バッジが見つかりません');
        await Promise.all([dotWithCount.updateComplete, dotWithSlot.updateComplete]);

        // テスト: dot + count → role="img" のみ（role="status" なし）
        const imgWithCount = dotWithCount.shadowRoot?.querySelector('[role="img"]');
        if (!imgWithCount) throw new Error('数値を持つ dot バリアントの role="img" が見つかりません');
        const statusWithCount = dotWithCount.shadowRoot?.querySelector('[role="status"]');
        if (statusWithCount) throw new Error('dot バリアントに count を設定しても role="status" は存在してはいけません');

        // テスト: dot + slot → role="img" のみ（slot なし）
        const imgWithSlot = dotWithSlot.shadowRoot?.querySelector('[role="img"]');
        if (!imgWithSlot) throw new Error('slot を持つ dot バリアントの role="img" が見つかりません');
        const slotWithDot = dotWithSlot.shadowRoot?.querySelector('slot');
        if (slotWithDot) throw new Error('dot バリアントに slot は存在してはいけません');

        console.log('✅ All tests passed for DotIgnoresCount story');
    },
};

/**
 * ⚠️ 境界条件: 非インタラクティブ設計の確認。
 *
 * バッジはフォーカス不可（`tabindex` なし）であり、
 * キーボードナビゲーションの対象にはなりません。
 * `disabled`・`error` 状態は存在しません。
 */
export const NonInteractive: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: バッジはフォーカス不可（`tabindex` なし）。インタラクティブな要素（クリック、削除等）は持ちません。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: バッジはフォーカス不可。クリックしても何も起きません。
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
        <ui-badge id="non-interactive-solid"  color="primary" count="5"></ui-badge>
        <ui-badge id="non-interactive-subtle" variant="subtle" color="success">Beta</ui-badge>
        <ui-badge id="non-interactive-dot"    variant="dot" color="danger" aria-label="更新があります"></ui-badge>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const badges = canvasElement.querySelectorAll<Badge>('ui-badge');
        await Promise.all([...badges].map((b) => b.updateComplete));

        for (const badge of badges) {
            // テスト: tabindex が設定されていない（フォーカス不可）
            const tabindex = badge.getAttribute('tabindex');
            if (tabindex !== null) {
                throw new Error(`tabindex が設定されていないことを期待していましたが、${badge.id} には "${tabindex}" が設定されていました`);
            }

            // テスト: 非対話属性を持たない
            if (badge.hasAttribute('disabled')) throw new Error(`${badge.id} に disabled が存在してはいけません`);
            if (badge.hasAttribute('error')) throw new Error(`${badge.id} に error が存在してはいけません`);
            if (badge.hasAttribute('aria-disabled')) throw new Error(`${badge.id} に aria-disabled が存在してはいけません`);
            if (badge.hasAttribute('role')) throw new Error(`${badge.id} にホスト role が設定されてはいけません`);

            // テスト: focus() を呼んでもフォーカス対象にならない
            badge.focus();
            if (badge === badge.ownerDocument.activeElement) {
                throw new Error(`バッジが activeElement になってはいけません: ${badge.id}`);
            }
        }

        console.log('✅ All tests passed for NonInteractive story');
    },
};

/**
 * A11y: テキストコントラストとDot非テキストコントラストの検証。
 *
 * Light/Dark 相当のトークンセットで、以下を満たすことを確認します。
 * - solid/subtle: 4.5:1 以上
 * - dot: 3.0:1 以上
 */
export const ThemeContrastAudit: Story = {
    render: () => {
        const colors = ['primary', 'danger', 'success', 'warning', 'neutral'] as const;
        return html`
      <style>
        .theme-grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
        .theme-block { padding: 1rem; border-radius: 10px; border: 1px solid oklch(76% 0.02 250 / 0.4); }
        .theme-title {
          margin-bottom: 0.75rem;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: oklch(48% 0.01 250);
        }
        .row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }
        .surface {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
          padding: 0.5rem;
          border-radius: 8px;
        }
      </style>

      <div class="theme-grid">
        <section
          id="contrast-light"
          class="theme-block"
          style="
            --primary: #1f5eff;
            --on-primary: #ffffff;
            --success: #007a4d;
            --on-success: #ffffff;
            --danger: #b42318;
            --on-danger: #ffffff;
            --warning: #9a4a00;
            --on-warning: #ffffff;
            --fg-default: #111827;
            --bg-default: #ffffff;
            --bg-surface-2: #f3f4f6;
            background: var(--bg-default);
            color: var(--fg-default);
          "
        >
          <div class="theme-title">Light Token Set</div>
          <div class="row">
            ${colors.map((color) => html`<ui-badge id="contrast-light-solid-${color}" color="${color}">text</ui-badge>`)}
          </div>
          <div class="row">
            ${colors.map((color) => html`<ui-badge id="contrast-light-subtle-${color}" variant="subtle" color="${color}">text</ui-badge>`)}
          </div>
          <div id="contrast-light-dot-default-surface" class="surface" style="background: var(--bg-default);">
            ${colors.map((color) => html`<ui-badge id="contrast-light-dot-${color}-default" variant="dot" color="${color}" aria-label="${color}"></ui-badge>`)}
          </div>
          <div id="contrast-light-dot-surface2-surface" class="surface" style="background: var(--bg-surface-2); margin-top: 0.5rem;">
            ${colors.map((color) => html`<ui-badge id="contrast-light-dot-${color}-surface2" variant="dot" color="${color}" aria-label="${color}"></ui-badge>`)}
          </div>
        </section>

        <section
          id="contrast-dark"
          class="theme-block"
          style="
            --primary: #8ab4ff;
            --on-primary: #06132d;
            --success: #5fd0a5;
            --on-success: #042417;
            --danger: #ff9f9f;
            --on-danger: #2a0d0d;
            --warning: #ffd08a;
            --on-warning: #2e1b00;
            --fg-default: #f3f4f6;
            --bg-default: #101317;
            --bg-surface-2: #1b222c;
            background: var(--bg-default);
            color: var(--fg-default);
          "
        >
          <div class="theme-title">Dark Token Set</div>
          <div class="row">
            ${colors.map((color) => html`<ui-badge id="contrast-dark-solid-${color}" color="${color}">text</ui-badge>`)}
          </div>
          <div class="row">
            ${colors.map((color) => html`<ui-badge id="contrast-dark-subtle-${color}" variant="subtle" color="${color}">text</ui-badge>`)}
          </div>
          <div id="contrast-dark-dot-default-surface" class="surface" style="background: var(--bg-default);">
            ${colors.map((color) => html`<ui-badge id="contrast-dark-dot-${color}-default" variant="dot" color="${color}" aria-label="${color}"></ui-badge>`)}
          </div>
          <div id="contrast-dark-dot-surface2-surface" class="surface" style="background: var(--bg-surface-2); margin-top: 0.5rem;">
            ${colors.map((color) => html`<ui-badge id="contrast-dark-dot-${color}-surface2" variant="dot" color="${color}" aria-label="${color}"></ui-badge>`)}
          </div>
        </section>
      </div>
    `;
    },
    play: async ({ canvasElement }) => {
        const colors = ['primary', 'danger', 'success', 'warning', 'neutral'] as const;
        const themes = ['light', 'dark'] as const;

        const assertTextContrast = (id: string, min: number) => {
            const badge = canvasElement.querySelector<Badge>(id);
            if (!badge) throw new Error(`${id} が見つかりません`);
            const style = getComputedStyle(badge);
            const ratio = contrastRatio(style.color, style.backgroundColor);
            if (ratio < min) throw new Error(`${id}: コントラスト比 ${ratio.toFixed(2)} が最小値 ${String(min)} を下回っています`);
        };

        const assertDotContrast = (badgeId: string, surfaceId: string, min: number) => {
            const badge = canvasElement.querySelector<Badge>(badgeId);
            const surface = canvasElement.querySelector<HTMLElement>(surfaceId);
            if (!badge || !surface) throw new Error(`dot コントラスト比の検証ターゲットが見つかりません: ${badgeId} / ${surfaceId}`);
            const dotStyle = getComputedStyle(badge);
            const surfaceStyle = getComputedStyle(surface);
            const ratio = contrastRatio(dotStyle.backgroundColor, surfaceStyle.backgroundColor);
            if (ratio < min) throw new Error(`${badgeId}: 非テキストのコントラスト比 ${ratio.toFixed(2)} が最小値 ${String(min)} を下回っています`);
        };

        await Promise.all(
            [...canvasElement.querySelectorAll<Badge>('ui-badge')].map((badge) => badge.updateComplete),
        );

        for (const theme of themes) {
            for (const color of colors) {
                assertTextContrast(`#contrast-${theme}-solid-${color}`, 4.5);
                assertTextContrast(`#contrast-${theme}-subtle-${color}`, 4.5);
                assertDotContrast(
                    `#contrast-${theme}-dot-${color}-default`,
                    `#contrast-${theme}-dot-default-surface`,
                    3,
                );
                assertDotContrast(
                    `#contrast-${theme}-dot-${color}-surface2`,
                    `#contrast-${theme}-dot-surface2-surface`,
                    3,
                );
            }
        }
        console.log('✅ All tests passed for ThemeContrastAudit story');
    },
};

/**
 * A11y: forced-colors 対応ルールの退行検知。
 *
 * 実UAのforced-colors切替ではなく、スタイル定義に必要ルールがあることを検証します。
 */
export const ForcedColorsContract: Story = {
    render: () => html`
    <div style="display: flex; gap: 0.75rem; align-items: center;">
      <ui-badge id="forced-solid" color="primary">New</ui-badge>
      <ui-badge id="forced-subtle" variant="subtle" color="warning">Draft</ui-badge>
      <ui-badge id="forced-dot" variant="dot" color="danger" aria-label="更新があります"></ui-badge>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const badge = canvasElement.querySelector<Badge>('#forced-solid');
        if (!badge) throw new Error('#forced-solid が見つかりません');
        await badge.updateComplete;

        const cssText = collectCssText((badge.constructor as typeof Badge).styles);
        if (!cssText.includes('@media (forced-colors: active)')) {
            throw new Error('forced-colors メディアクエリが見つかりません');
        }
        if (!cssText.includes('ButtonText')) {
            throw new Error('forced-colors ルールに ButtonText トークンが見つかりません');
        }
        if (!cssText.includes('ButtonFace')) {
            throw new Error('forced-colors ルールに ButtonFace トークンが見つかりません');
        }
        if (!cssText.includes("width: 10px")) {
            throw new Error('Dot の forced-colors 時のサイズ拡張 (10px) が見つかりません');
        }

        console.log('✅ All tests passed for ForcedColorsContract story');
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
      .states-list { display: flex; flex-direction: column; gap: 1.5rem; }
      .state-group { display: flex; flex-direction: column; gap: 0.5rem; }
      .state-label {
        font-size: 11px; font-weight: 500;
        color: oklch(48% 0.01 250);
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      .state-badges { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
    </style>
    <div class="states-list">
      <div class="state-group">
        <div class="state-label">Solid × Colors（数値）</div>
        <div class="state-badges">
          <ui-badge id="all-solid-primary" color="primary" count="5"></ui-badge>
          <ui-badge id="all-solid-danger"  color="danger"  count="12"></ui-badge>
          <ui-badge id="all-solid-success" color="success" count="3"></ui-badge>
          <ui-badge id="all-solid-warning" color="warning" count="99"></ui-badge>
          <ui-badge id="all-solid-neutral" color="neutral" count="1"></ui-badge>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">Solid × Colors（テキスト）</div>
        <div class="state-badges">
          <ui-badge color="primary">New</ui-badge>
          <ui-badge color="danger">Hot</ui-badge>
          <ui-badge color="success">Live</ui-badge>
          <ui-badge color="warning">Soon</ui-badge>
          <ui-badge color="neutral">Old</ui-badge>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">Subtle × Colors（テキスト）</div>
        <div class="state-badges">
          <ui-badge variant="subtle" color="primary">Beta</ui-badge>
          <ui-badge variant="subtle" color="danger">Deprecated</ui-badge>
          <ui-badge variant="subtle" color="success">Stable</ui-badge>
          <ui-badge variant="subtle" color="warning">Draft</ui-badge>
          <ui-badge variant="subtle" color="neutral">Archived</ui-badge>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">Dot × Colors</div>
        <div class="state-badges">
          <ui-badge variant="dot" color="primary" aria-label="primary"></ui-badge>
          <ui-badge variant="dot" color="danger"  aria-label="danger"></ui-badge>
          <ui-badge variant="dot" color="success" aria-label="success"></ui-badge>
          <ui-badge variant="dot" color="warning" aria-label="warning"></ui-badge>
          <ui-badge variant="dot" color="neutral" aria-label="neutral"></ui-badge>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">count > max（99+）</div>
        <div class="state-badges">
          <ui-badge color="danger" count="100" max="99"></ui-badge>
          <ui-badge color="danger" count="999" max="99"></ui-badge>
          <ui-badge color="warning" count="10" max="9"></ui-badge>
        </div>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const badges = canvasElement.querySelectorAll<Badge>('ui-badge');
        await Promise.all([...badges].map((b) => b.updateComplete));

        // テスト: solid-primary の count が正しい
        const solidPrimary = canvasElement.querySelector<Badge>('#all-solid-primary');
        if (!solidPrimary) throw new Error('#all-solid-primary が見つかりません');
        if (solidPrimary.count !== 5) throw new Error(`count=5 を期待していましたが、実際には ${String(solidPrimary.count)} でした`);

        // テスト: solid-warning の count=99 → 表示 "99"（max=99 と等しいため "+" なし）
        const solidWarning = canvasElement.querySelector<Badge>('#all-solid-warning');
        if (!solidWarning) throw new Error('#all-solid-warning が見つかりません');
        const statusWarning = solidWarning.shadowRoot?.querySelector('[role="status"]');
        if (!statusWarning) throw new Error('solid-warning の role="status" が見つかりません');
        if (statusWarning.textContent.trim() !== '99') {
            throw new Error(`"99" を期待していましたが、実際には "${statusWarning.textContent.trim()}" でした`);
        }

        console.log('✅ All tests passed for AllStates story');
    },
};
