import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './tag';
import type { Tag } from './tag';

/**
 * ## タグ (Tag) `<ui-tag>`
 *
 * コンテンツのメタデータやカテゴリーを表現します。
 * 「静謐さ」を最優先し、デフォルトでは彩度を抑えた **Subtle Style** を採用します。
 *
 * ### バリアント
 *
 * - **`default`** (Subtle): 背景色あり・ボーダー透明。最も控えめ。
 * - **`outline`**: 背景透明・ボーダーあり。親要素の背景に依存。
 * - **`solid`**: 高彩度背景・白文字。重要なステータスのみ使用。
 *
 * ### 構造パターン
 *
 * - **通常**: `<span>` ルート（装飾的）
 * - **Link Only**: ルートが `<a>` タグ
 * - **Removable Only**: `<span>` + 内部 `<button>`
 * - **Link + Removable**: `<div role="group">` + `<a>` + `<button>` 並列配置
 *   （HTML 仕様: Interactive content nesting 禁止に準拠）
 *
 * ### タッチターゲット (WCAG 2.5.5)
 *
 * 削除ボタン・リンクには `::after` 疑似要素で最低 44×44px を確保します。
 *
 * ### イベント
 *
 * - `ui-tag-remove`: 削除ボタンクリック時に発火。`detail: { value: string }`
 */
const meta: Meta<Tag> = {
    title: 'Components/Tag',
    component: 'ui-tag',
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: `
タグコンポーネントは、コンテンツのメタデータやカテゴリーを表現します。
行内やカード内に収まる高密度な設計（High Density）です。

## 使用方法

\`\`\`html
<!-- 基本 -->
<ui-tag>JavaScript</ui-tag>

<!-- カラー付き -->
<ui-tag color="blue">Computer Science</ui-tag>
<ui-tag color="gold">Literature</ui-tag>

<!-- リンク付き -->
<ui-tag href="/tags/js">JavaScript</ui-tag>

<!-- 削除可能 -->
<ui-tag removable>Python</ui-tag>

<!-- Solid バリアント -->
<ui-tag variant="solid" color="primary">New</ui-tag>
\`\`\`

## 注意事項

- **\`href\` + \`removable\`** の併用時は、\`<a>\` と \`<button>\` が並列配置されます（Interactive content nesting 禁止）。
- **\`outline\`** バリアントは背景が \`transparent\` のため、親要素の背景色に依存します。
- **削除後の DOM 操作**は親コンポーネントが \`ui-tag-remove\` イベントをリスンして行ってください。
                `,
            },
        },
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'outline', 'solid'],
            description: 'スタイルバリアント',
            table: { type: { summary: "'default' | 'outline' | 'solid'" }, defaultValue: { summary: "'default'" } },
        },
        size: {
            control: 'select',
            options: ['xs', 'sm'],
            description: 'サイズ',
            table: { type: { summary: "'xs' | 'sm'" }, defaultValue: { summary: "'xs'" } },
        },
        color: {
            control: 'select',
            options: ['neutral', 'primary', 'blue', 'violet', 'pink', 'gold'],
            description: '意味的カラー',
            table: { type: { summary: "'neutral' | 'primary' | 'blue' | 'violet' | 'pink' | 'gold'" }, defaultValue: { summary: "'neutral'" } },
        },
        removable: {
            control: 'boolean',
            description: '削除ボタンを表示するか',
            table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
        },
        href: {
            control: 'text',
            description: 'リンク先URL',
            table: { type: { summary: 'string | undefined' }, defaultValue: { summary: 'undefined' } },
        },
        disabled: {
            control: 'boolean',
            description: '非活性状態',
            table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
        },
    },
};

export default meta;
type Story = StoryObj<Tag>;
const parsePx = (value: string): number => Number.parseFloat(value) || 0;

// ──────────────────────────────────────────────
// デフォルト
// ──────────────────────────────────────────────

/**
 * デフォルトのタグ（neutral / xs / default）。
 *
 * 最も控えめな Subtle Style。行内やカード内に自然に溶け込みます。
 */
export const Default: Story = {
    args: {
        variant: 'default',
        size: 'xs',
        color: 'neutral',
        removable: false,
        disabled: false,
    },
    render: (args) => html`
    <ui-tag
      id="default-tag"
      variant="${args.variant}"
      size="${args.size}"
      color="${args.color}"
      ?removable="${args.removable}"
      ?disabled="${args.disabled}"
    >JavaScript</ui-tag>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#default-tag');
        if (!tag) throw new Error('ui-tag not found');
        await tag.updateComplete;

        // テスト: ルートが span（非インタラクティブ）
        const root = tag.shadowRoot?.querySelector('.tag-root');
        if (!root) throw new Error('.tag-root not found');
        if (root.tagName.toLowerCase() !== 'span') {
            throw new Error(`Expected span, got ${root.tagName.toLowerCase()}`);
        }

        // テスト: 削除ボタンが存在しない
        const removeBtn = tag.shadowRoot?.querySelector('.tag-remove-button');
        if (removeBtn) throw new Error('Remove button should not exist in non-removable tag');

        // テスト: リンクが存在しない
        const link = tag.shadowRoot?.querySelector('.tag-link');
        if (link) throw new Error('Link should not exist when href is not set');

        // テスト: variant / size / color プロパティ
        if (tag.variant !== 'default') throw new Error(`Expected variant="default", got "${tag.variant}"`);
        if (tag.size !== 'xs') throw new Error(`Expected size="xs", got "${tag.size}"`);
        if (tag.color !== 'neutral') throw new Error(`Expected color="neutral", got "${tag.color}"`);

        console.log('✅ All tests passed for Default story');
    },
};

// ──────────────────────────────────────────────
// バリアント × カラーの組み合わせ
// ──────────────────────────────────────────────

/**
 * 全バリアント × 全カラーの一覧。
 *
 * デザインレビューやビジュアルリグレッションテストに使用します。
 * WCAG AA 準拠のコントラスト比を目視で確認できます。
 */
export const VariantColorMatrix: Story = {
    render: () => {
        const variants = ['default', 'outline', 'solid'] as const;
        const colors = ['neutral', 'primary', 'blue', 'violet', 'pink', 'gold'] as const;

        return html`
      <style>
        .matrix { display: flex; flex-direction: column; gap: 1.5rem; }
        .matrix-row { display: flex; flex-direction: column; gap: 0.5rem; }
        .matrix-label {
          font-size: 11px; font-weight: 500;
          color: oklch(48% 0.01 250);
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .matrix-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
      </style>
      <div class="matrix">
        ${variants.map((variant) => html`
          <div class="matrix-row">
            <div class="matrix-label">${variant}</div>
            <div class="matrix-tags">
              ${colors.map((color) => html`
                <ui-tag
                  id="matrix-${variant}-${color}"
                  variant="${variant}"
                  color="${color}"
                >${color}</ui-tag>
              `)}
            </div>
          </div>
        `)}
      </div>
    `;
    },
    play: async ({ canvasElement }) => {
        const tags = canvasElement.querySelectorAll<Tag>('ui-tag');
        if (tags.length !== 18) {
            throw new Error(`Expected 18 tags (3 variants × 6 colors), got ${String(tags.length)}`);
        }

        await Promise.all([...tags].map((t) => t.updateComplete));

        // テスト: 全組み合わせが正しい variant / color を持つ
        const variants = ['default', 'outline', 'solid'] as const;
        const colors = ['neutral', 'primary', 'blue', 'violet', 'pink', 'gold'] as const;
        for (const variant of variants) {
            for (const color of colors) {
                const tag = canvasElement.querySelector<Tag>(`#matrix-${variant}-${color}`);
                if (!tag) throw new Error(`#matrix-${variant}-${color} not found`);
                if (tag.variant !== variant) throw new Error(`Expected variant="${variant}"`);
                if (tag.color !== color) throw new Error(`Expected color="${color}"`);
            }
        }

        console.log('✅ All tests passed for VariantColorMatrix story');
    },
};

// ──────────────────────────────────────────────
// サイズ
// ──────────────────────────────────────────────

/**
 * サイズ比較（xs / sm）。
 *
 * - `xs` (20px): 通常使用。High Density。
 * - `sm` (24px): 強調時のみ使用。
 */
export const Sizes: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 11px; color: oklch(48% 0.01 250); width: 3rem;">xs</span>
        <ui-tag id="size-xs" size="xs" color="blue">Computer Science</ui-tag>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 11px; color: oklch(48% 0.01 250); width: 3rem;">sm</span>
        <ui-tag id="size-sm" size="sm" color="blue">Computer Science</ui-tag>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const xs = canvasElement.querySelector<Tag>('#size-xs');
        const sm = canvasElement.querySelector<Tag>('#size-sm');
        if (!xs || !sm) throw new Error('Tags not found');
        await Promise.all([xs.updateComplete, sm.updateComplete]);

        if (xs.size !== 'xs') throw new Error(`Expected size="xs", got "${xs.size}"`);
        if (sm.size !== 'sm') throw new Error(`Expected size="sm", got "${sm.size}"`);

        // テスト: xs の高さが sm より小さい
        const xsRect = xs.getBoundingClientRect();
        const smRect = sm.getBoundingClientRect();
        if (xsRect.height >= smRect.height) {
            throw new Error(`Expected xs height (${String(xsRect.height)}) < sm height (${String(smRect.height)})`);
        }

        console.log('✅ All tests passed for Sizes story');
    },
};

// ──────────────────────────────────────────────
// 状態: Disabled
// ──────────────────────────────────────────────

/**
 * 非活性状態（Disabled）× 各バリアント。
 *
 * `disabled` 状態では `opacity: 0.5` が適用され、
 * リンク・削除ボタンは無効化されます。
 */
export const DisabledVariants: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="font-size: 11px; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        Disabled × Variants
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
        <ui-tag id="disabled-default" variant="default" color="primary" disabled>Default</ui-tag>
        <ui-tag id="disabled-outline" variant="outline" color="primary" disabled>Outline</ui-tag>
        <ui-tag id="disabled-solid"   variant="solid"   color="primary" disabled>Solid</ui-tag>
      </div>
      <div style="font-size: 11px; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        Disabled × Removable
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
        <ui-tag id="disabled-removable" color="blue" removable disabled>Removable Disabled</ui-tag>
      </div>
      <div style="font-size: 11px; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        Disabled × Link
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
        <ui-tag id="disabled-link" href="/tags/test" color="violet" disabled>Link Disabled</ui-tag>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tags = ['#disabled-default', '#disabled-outline', '#disabled-solid', '#disabled-removable', '#disabled-link'];
        for (const sel of tags) {
            const tag = canvasElement.querySelector<Tag>(sel);
            if (!tag) throw new Error(`${sel} not found`);
            await tag.updateComplete;
            if (!tag.disabled) throw new Error(`Expected ${sel} to be disabled`);
        }

        // テスト: disabled な removable タグの削除ボタンは tabindex="-1"
        const removableTag = canvasElement.querySelector<Tag>('#disabled-removable');
        if (!removableTag) throw new Error('#disabled-removable not found');
        await removableTag.updateComplete;
        const removeBtn = removableTag.shadowRoot?.querySelector<HTMLButtonElement>('.tag-remove-button');
        if (!removeBtn) throw new Error('Remove button not found');
        if (removeBtn.getAttribute('tabindex') !== '-1') {
            throw new Error(`Expected tabindex="-1" on disabled remove button, got "${removeBtn.getAttribute('tabindex') ?? 'null'}"`);
        }

        // テスト: disabled な link タグのリンクは aria-disabled="true"
        const linkTag = canvasElement.querySelector<Tag>('#disabled-link');
        if (!linkTag) throw new Error('#disabled-link not found');
        await linkTag.updateComplete;
        const link = linkTag.shadowRoot?.querySelector<HTMLAnchorElement>('.tag-link');
        if (!link) throw new Error('Link not found');
        if (link.getAttribute('aria-disabled') !== 'true') {
            throw new Error(`Expected aria-disabled="true" on disabled link, got "${link.getAttribute('aria-disabled') ?? 'null'}"`);
        }

        console.log('✅ All tests passed for DisabledVariants story');
    },
};

// ──────────────────────────────────────────────
// Removable タグ
// ──────────────────────────────────────────────

/**
 * 削除可能タグ（Removable）。
 *
 * `removable` 属性を付与すると「×」ボタンが表示されます。
 * クリックすると `ui-tag-remove` イベントが発火します。
 */
export const Removable: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
        <ui-tag id="removable-neutral" color="neutral" removable>Neutral</ui-tag>
        <ui-tag id="removable-blue"    color="blue"    removable>Computer Science</ui-tag>
        <ui-tag id="removable-gold"    color="gold"    removable>Literature</ui-tag>
        <ui-tag id="removable-solid"   variant="solid" color="primary" removable>Solid</ui-tag>
      </div>
      <div
        id="remove-log"
        style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px; color: oklch(48% 0.01 250);"
      >
        削除ボタンをクリックするとここに表示されます
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#removable-blue');
        if (!tag) throw new Error('#removable-blue not found');
        await tag.updateComplete;

        // テスト: 削除ボタンが存在する
        const removeBtn = tag.shadowRoot?.querySelector<HTMLButtonElement>('.tag-remove-button');
        if (!removeBtn) throw new Error('Remove button not found');

        // テスト: aria-label が設定されている
        const ariaLabel = removeBtn.getAttribute('aria-label');
        if (!ariaLabel?.includes('削除')) {
            throw new Error(`Expected aria-label to include "削除", got "${ariaLabel ?? 'null'}"`);
        }

        // テスト: ui-tag-remove イベントが発火する
        const eventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
            tag.addEventListener('ui-tag-remove', (e) => { resolve(e as CustomEvent<{ value: string }>); }, { once: true });
        });

        removeBtn.click();

        const event = await Promise.race([
            eventPromise,
            new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
        ]);

        if (!event) throw new Error('ui-tag-remove event was not fired');
        if (!event.bubbles) throw new Error('Expected event to bubble');
        if (!event.composed) throw new Error('Expected event to be composed');
        if (typeof event.detail.value !== 'string') {
            throw new Error(`Expected detail.value to be string, got ${typeof event.detail.value}`);
        }

        console.log('✅ All tests passed for Removable story');
    },
};

// ──────────────────────────────────────────────
// Link タグ
// ──────────────────────────────────────────────

/**
 * リンク付きタグ（Link）。
 *
 * `href` 属性を付与するとテキスト部分が `<a>` タグになります。
 * フィルタリングやページ遷移のトリガーとして機能します。
 */
export const WithLink: Story = {
    render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
      <ui-tag id="link-blue"   href="/tags/cs"          color="blue">Computer Science</ui-tag>
      <ui-tag id="link-violet" href="/tags/music"       color="violet">Music</ui-tag>
      <ui-tag id="link-gold"   href="/tags/literature"  color="gold">Literature</ui-tag>
      <ui-tag id="link-solid"  href="/tags/new" variant="solid" color="primary">New</ui-tag>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#link-blue');
        if (!tag) throw new Error('#link-blue not found');
        await tag.updateComplete;

        // テスト: <a> 要素が存在する
        const link = tag.shadowRoot?.querySelector<HTMLAnchorElement>('.tag-link');
        if (!link) throw new Error('.tag-link not found');
        if (link.tagName.toLowerCase() !== 'a') {
            throw new Error(`Expected <a>, got <${link.tagName.toLowerCase()}>`);
        }

        // テスト: href が設定されている
        if (link.getAttribute('href') !== '/tags/cs') {
            throw new Error(`Expected href="/tags/cs", got "${link.getAttribute('href') ?? 'null'}"`);
        }

        // テスト: role="group" は存在しない（link only の場合）
        const group = tag.shadowRoot?.querySelector('[role="group"]');
        if (group) throw new Error('role="group" should not exist for link-only tag');

        console.log('✅ All tests passed for WithLink story');
    },
};

// ──────────────────────────────────────────────
// Link + Removable（並列配置）
// ──────────────────────────────────────────────

/**
 * Link + Removable の並列配置。
 *
 * HTML 仕様（Interactive content nesting 禁止）に基づき、
 * `<a>` と `<button>` を Flexbox で並列配置します。
 * `role="group"` により、スクリーンリーダーが論理的な関連を把握できます。
 */
export const LinkAndRemovable: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
        <ui-tag id="link-removable-blue"   href="/tags/cs"         color="blue"   removable>Computer Science</ui-tag>
        <ui-tag id="link-removable-gold"   href="/tags/literature" color="gold"   removable>Literature</ui-tag>
        <ui-tag id="link-removable-violet" href="/tags/music"      color="violet" removable>Music</ui-tag>
      </div>
      <div
        id="link-remove-log"
        style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px; color: oklch(48% 0.01 250);"
      >
        削除ボタンをクリックするとここに表示されます
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#link-removable-blue');
        if (!tag) throw new Error('#link-removable-blue not found');
        await tag.updateComplete;

        // テスト: role="group" が存在する（Interactive content nesting 禁止対応）
        const group = tag.shadowRoot?.querySelector('[role="group"]');
        if (!group) throw new Error('role="group" not found for link+removable tag');

        // テスト: <a> と <button> が並列配置されている
        const link = tag.shadowRoot?.querySelector<HTMLAnchorElement>('.tag-link');
        if (!link) throw new Error('.tag-link not found');
        if (link.tagName.toLowerCase() !== 'a') {
            throw new Error(`Expected <a>, got <${link.tagName.toLowerCase()}>`);
        }

        const removeBtn = tag.shadowRoot?.querySelector<HTMLButtonElement>('.tag-remove-button');
        if (!removeBtn) throw new Error('.tag-remove-button not found');

        // テスト: <a> が <button> の親でない（並列配置の確認）
        if (link.contains(removeBtn)) {
            throw new Error('<button> must not be nested inside <a> (Interactive content nesting violation)');
        }

        // テスト: aria-label に "タグ" が含まれる
        const ariaLabel = group.getAttribute('aria-label');
        if (!ariaLabel?.includes('タグ')) {
            throw new Error(`Expected aria-label to include "タグ", got "${ariaLabel ?? 'null'}"`);
        }

        // テスト: ui-tag-remove イベントが発火する
        const eventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
            tag.addEventListener('ui-tag-remove', (e) => { resolve(e as CustomEvent<{ value: string }>); }, { once: true });
        });

        removeBtn.click();

        const event = await Promise.race([
            eventPromise,
            new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
        ]);

        if (!event) throw new Error('ui-tag-remove event was not fired');

        console.log('✅ All tests passed for LinkAndRemovable story');
    },
};

// ──────────────────────────────────────────────
// アイコン付きタグ
// ──────────────────────────────────────────────

/**
 * アイコン付きタグ（Leading Icon）。
 *
 * `icon` スロットにアイコンを配置します。
 * アイコンは自動的に 12px に調整されます。
 */
export const WithIcon: Story = {
    render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
      <ui-tag id="icon-blue" color="blue">
        <svg slot="icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5"/>
          <path d="M6 4v2l1.5 1.5"/>
        </svg>
        Computer Science
      </ui-tag>
      <ui-tag id="icon-gold" color="gold">
        <svg slot="icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z"/>
        </svg>
        Literature
      </ui-tag>
      <ui-tag id="icon-removable" color="violet" removable>
        <svg slot="icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
          <path d="M2 6a4 4 0 1 0 8 0 4 4 0 0 0-8 0z"/>
        </svg>
        Music
      </ui-tag>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#icon-blue');
        if (!tag) throw new Error('#icon-blue not found');
        await tag.updateComplete;

        // テスト: icon スロットが存在する
        const iconSlot = tag.shadowRoot?.querySelector('.icon-slot');
        if (!iconSlot) throw new Error('.icon-slot not found');

        // テスト: icon スロットに要素が配置されている
        const slottedIcon = canvasElement.querySelector('[slot="icon"]');
        if (!slottedIcon) throw new Error('Slotted icon not found');

        console.log('✅ All tests passed for WithIcon story');
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
      .state-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    </style>
    <div class="states-list">
      <div class="state-group">
        <div class="state-label">Default × Colors</div>
        <div class="state-tags">
          <ui-tag id="all-neutral" color="neutral">Neutral</ui-tag>
          <ui-tag id="all-primary" color="primary">Primary</ui-tag>
          <ui-tag id="all-blue"    color="blue">Blue</ui-tag>
          <ui-tag id="all-violet"  color="violet">Violet</ui-tag>
          <ui-tag id="all-pink"    color="pink">Pink</ui-tag>
          <ui-tag id="all-gold"    color="gold">Gold</ui-tag>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">Outline × Colors</div>
        <div class="state-tags">
          <ui-tag variant="outline" color="neutral">Neutral</ui-tag>
          <ui-tag variant="outline" color="primary">Primary</ui-tag>
          <ui-tag variant="outline" color="blue">Blue</ui-tag>
          <ui-tag variant="outline" color="violet">Violet</ui-tag>
          <ui-tag variant="outline" color="pink">Pink</ui-tag>
          <ui-tag variant="outline" color="gold">Gold</ui-tag>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">Solid × Colors</div>
        <div class="state-tags">
          <ui-tag variant="solid" color="neutral">Neutral</ui-tag>
          <ui-tag variant="solid" color="primary">Primary</ui-tag>
          <ui-tag variant="solid" color="blue">Blue</ui-tag>
          <ui-tag variant="solid" color="violet">Violet</ui-tag>
          <ui-tag variant="solid" color="pink">Pink</ui-tag>
          <ui-tag variant="solid" color="gold">Gold</ui-tag>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">Sizes</div>
        <div class="state-tags">
          <ui-tag id="all-xs" size="xs" color="blue">xs (20px)</ui-tag>
          <ui-tag id="all-sm" size="sm" color="blue">sm (24px)</ui-tag>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">Removable</div>
        <div class="state-tags">
          <ui-tag color="neutral" removable>Neutral</ui-tag>
          <ui-tag color="blue"    removable>Blue</ui-tag>
          <ui-tag color="gold"    removable>Gold</ui-tag>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">Link</div>
        <div class="state-tags">
          <ui-tag href="/tags/cs"   color="blue">Link Blue</ui-tag>
          <ui-tag href="/tags/gold" color="gold">Link Gold</ui-tag>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">Link + Removable</div>
        <div class="state-tags">
          <ui-tag href="/tags/cs" color="blue" removable>Link + Remove</ui-tag>
        </div>
      </div>
      <div class="state-group">
        <div class="state-label">Disabled</div>
        <div class="state-tags">
          <ui-tag color="blue" disabled>Disabled</ui-tag>
          <ui-tag color="blue" removable disabled>Disabled Removable</ui-tag>
          <ui-tag href="/tags/cs" color="blue" disabled>Disabled Link</ui-tag>
        </div>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tags = canvasElement.querySelectorAll<Tag>('ui-tag');
        await Promise.all([...tags].map((t) => t.updateComplete));

        // テスト: neutral タグ
        const neutral = canvasElement.querySelector<Tag>('#all-neutral');
        if (!neutral) throw new Error('#all-neutral not found');
        if (neutral.color !== 'neutral') throw new Error('Expected color="neutral"');

        // テスト: xs / sm サイズ
        const xs = canvasElement.querySelector<Tag>('#all-xs');
        const sm = canvasElement.querySelector<Tag>('#all-sm');
        if (!xs || !sm) throw new Error('Size tags not found');
        if (xs.size !== 'xs') throw new Error('Expected size="xs"');
        if (sm.size !== 'sm') throw new Error('Expected size="sm"');

        console.log('✅ All tests passed for AllStates story');
    },
};

// ──────────────────────────────────────────────
// インタラクション: イベント発火
// ──────────────────────────────────────────────

/**
 * `ui-tag-remove` イベントの発火確認。
 *
 * 削除ボタンをクリックすると `ui-tag-remove` イベントが発火します。
 * `detail.value` にはタグのテキスト内容が含まれます。
 */
export const EventFiring: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
        <ui-tag
          id="event-tag"
          color="blue"
          removable
          @ui-tag-remove="${(e: CustomEvent<{ value: string }>) => {
            const log = document.getElementById('event-log');
            if (log) log.textContent = `ui-tag-remove: value="${e.detail.value}"`;
        }}"
        >Computer Science</ui-tag>
      </div>
      <div
        id="event-log"
        style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px; color: oklch(48% 0.01 250);"
      >
        削除ボタンをクリックするとここに表示されます
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#event-tag');
        if (!tag) throw new Error('#event-tag not found');
        await tag.updateComplete;

        const eventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
            tag.addEventListener('ui-tag-remove', (e) => { resolve(e as CustomEvent<{ value: string }>); }, { once: true });
        });

        const removeBtn = tag.shadowRoot?.querySelector<HTMLButtonElement>('.tag-remove-button');
        if (!removeBtn) throw new Error('Remove button not found');
        removeBtn.click();

        const event = await Promise.race([
            eventPromise,
            new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
        ]);

        if (!event) throw new Error('ui-tag-remove event was not fired');
        if (!event.bubbles) throw new Error('Expected event to bubble');
        if (!event.composed) throw new Error('Expected event to be composed');

        // テスト: detail.value がタグのテキスト内容
        const expectedValue = tag.textContent.trim();
        if (event.detail.value !== expectedValue) {
            throw new Error(`Expected detail.value="${expectedValue}", got "${event.detail.value}"`);
        }

        console.log('✅ All tests passed for EventFiring story');
    },
};

/**
 * disabled 状態では `ui-tag-remove` イベントが発火しない。
 */
export const DisabledNoEvent: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>確認</strong>: disabled 状態では削除イベントが発火しません。
      </div>
      <ui-tag
        id="disabled-no-event"
        color="blue"
        removable
        disabled
        @ui-tag-remove="${() => {
            const log = document.getElementById('disabled-event-log');
            if (log) log.textContent = '❌ イベントが発火してしまいました（バグ）';
        }}"
      >Disabled Tag</ui-tag>
      <div
        id="disabled-event-log"
        style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px; color: oklch(48% 0.01 250);"
      >
        ✅ イベントは発火しません（disabled 状態）
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#disabled-no-event');
        if (!tag) throw new Error('#disabled-no-event not found');
        await tag.updateComplete;

        if (!tag.disabled) throw new Error('Expected tag to be disabled');

        let eventFired = false;
        tag.addEventListener('ui-tag-remove', () => { eventFired = true; });

        // pointer-events: none のため直接クリックは届かないが、
        // ガードロジックも検証するため内部ボタンを直接呼び出す
        const removeBtn = tag.shadowRoot?.querySelector<HTMLButtonElement>('.tag-remove-button');
        if (removeBtn) {
            // disabled ボタンへの直接 click() はブラウザがガードするが、
            // dispatchEvent でイベントを送ってもコンポーネント側でガードされることを確認
            removeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
        }

        await new Promise((resolve) => setTimeout(resolve, 100));

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (eventFired) throw new Error('ui-tag-remove should not fire when disabled');

        console.log('✅ All tests passed for DisabledNoEvent story');
    },
};

// ──────────────────────────────────────────────
// 境界条件（事故が多い）
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: `href` + `removable` の並列配置。
 *
 * HTML 仕様（Interactive content nesting 禁止）に基づき、
 * `<a>` の中に `<button>` を入れてはいけません。
 * このコンポーネントは `<div role="group">` + 並列配置で対応します。
 */
export const LinkRemovableNesting: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: `href` + `removable` 併用時、`<a>` 内に `<button>` をネストしてはいけません（HTML 仕様違反）。`role="group"` + 並列配置で対応します。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>href + removable</code> 併用時は <code>&lt;a&gt;</code> 内に <code>&lt;button&gt;</code> をネストしません。
      </div>
      <ui-tag id="nesting-test" href="/tags/cs" color="blue" removable>Computer Science</ui-tag>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#nesting-test');
        if (!tag) throw new Error('#nesting-test not found');
        await tag.updateComplete;

        // テスト: role="group" が存在する
        const group = tag.shadowRoot?.querySelector('[role="group"]');
        if (!group) throw new Error('role="group" not found');

        // テスト: <a> の中に <button> がネストされていない
        const link = tag.shadowRoot?.querySelector<HTMLAnchorElement>('.tag-link');
        const btn = tag.shadowRoot?.querySelector<HTMLButtonElement>('.tag-remove-button');
        if (!link || !btn) throw new Error('link or button not found');

        if (link.contains(btn)) {
            throw new Error('VIOLATION: <button> must not be nested inside <a>');
        }

        console.log('✅ All tests passed for LinkRemovableNesting story');
    },
};

/**
 * ⚠️ 境界条件: 長いテキストの省略（Truncation）。
 *
 * 想定外の長いテキストによるレイアウト崩壊を防ぐため、
 * `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` が適用されます。
 */
export const LongTextTruncation: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: 長いテキストは省略（ellipsis）されます。レイアウト崩壊を物理的に防ぎます。',
            },
        },
    },
    render: () => html`
    <div id="long-text-container" style="display: flex; flex-direction: column; gap: 1rem; max-width: 200px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: 長いテキストは省略されます（max-width: 200px のコンテナ内）。
      </div>
      <ui-tag id="long-text" color="blue">
        VeryLongTagNameThatShouldBeTruncatedWithEllipsis
      </ui-tag>
      <ui-tag id="long-text-removable" color="gold" removable>
        VeryLongTagNameThatShouldBeTruncatedWithEllipsis
      </ui-tag>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#long-text');
        if (!tag) throw new Error('#long-text not found');
        await tag.updateComplete;

        // テスト: タグが意図したコンテナ幅を超えていない
        const container = canvasElement.querySelector<HTMLElement>('#long-text-container');
        if (!container) throw new Error('#long-text-container not found');
        const tagRect = tag.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (tagRect.width > containerRect.width + 1) { // 1px の誤差を許容
            throw new Error(`Tag width (${String(tagRect.width)}) exceeds container width (${String(containerRect.width)})`);
        }

        console.log('✅ All tests passed for LongTextTruncation story');
    },
};

/**
 * ⚠️ 境界条件: `disabled` + `href` でリンクが無効化される。
 *
 * `disabled` 状態では `aria-disabled="true"` と `tabindex="-1"` が付与され、
 * クリック時は `preventDefault()` でページ遷移を抑止します。
 */
export const DisabledLinkPreventsNavigation: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: `disabled` + `href` 併用時、リンクは `aria-disabled="true"` かつ `tabindex="-1"` になり、ページ遷移が抑止されます。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>disabled + href</code> でリンクが無効化されます。
      </div>
      <ui-tag id="disabled-link-nav" href="/tags/cs" color="blue" disabled>Disabled Link</ui-tag>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#disabled-link-nav');
        if (!tag) throw new Error('#disabled-link-nav not found');
        await tag.updateComplete;

        const link = tag.shadowRoot?.querySelector<HTMLAnchorElement>('.tag-link');
        if (!link) throw new Error('.tag-link not found');

        // テスト: aria-disabled="true"
        if (link.getAttribute('aria-disabled') !== 'true') {
            throw new Error(`Expected aria-disabled="true", got "${link.getAttribute('aria-disabled') ?? 'null'}"`);
        }

        // テスト: tabindex="-1"
        if (link.getAttribute('tabindex') !== '-1') {
            throw new Error(`Expected tabindex="-1", got "${link.getAttribute('tabindex') ?? 'null'}"`);
        }

        // テスト: href が設定されていない（disabled 時は href を除去）
        // または click 時に preventDefault が呼ばれる
        let navigated = false;
        link.addEventListener('click', (e) => {
            if (!e.defaultPrevented) navigated = true;
        });
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 50));

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (navigated) {
            throw new Error('Navigation should be prevented when disabled');
        }

        console.log('✅ All tests passed for DisabledLinkPreventsNavigation story');
    },
};

/**
 * ⚠️ 境界条件: `removable` の削除ボタンのタッチターゲット（WCAG 2.5.5）。
 *
 * 視覚的サイズは 12px ですが、`::after` 疑似要素で最低 44×44px を確保します。
 */
export const TouchTargetSize: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: 削除ボタンの視覚的サイズは 12px ですが、`::after` 疑似要素で最低 44×44px のタッチターゲットを確保します（WCAG 2.5.5）。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: 削除ボタンの視覚的サイズは 12px ですが、タッチターゲットは最低 44×44px です。
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <ui-tag id="touch-target-xs" size="xs" color="blue" removable>xs (20px)</ui-tag>
        <ui-tag id="touch-target-sm" size="sm" color="blue" removable>sm (24px)</ui-tag>
        <ui-tag id="touch-target-link" href="/tags/cs" color="violet">Link</ui-tag>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const xs = canvasElement.querySelector<Tag>('#touch-target-xs');
        const sm = canvasElement.querySelector<Tag>('#touch-target-sm');
        const linkTag = canvasElement.querySelector<Tag>('#touch-target-link');
        if (!xs || !sm || !linkTag) throw new Error('touch target tags not found');
        await Promise.all([xs.updateComplete, sm.updateComplete, linkTag.updateComplete]);

        // テスト: 削除ボタンが存在し、44px以上の疑似要素ターゲットを持つ
        const removeBtn = xs.shadowRoot?.querySelector<HTMLButtonElement>('.tag-remove-button');
        if (!removeBtn) throw new Error('Remove button not found on xs removable tag');
        const removeAfterStyle = getComputedStyle(removeBtn, '::after');
        const removeAfterWidth = parsePx(removeAfterStyle.width);
        const removeAfterHeight = parsePx(removeAfterStyle.height);
        if (removeAfterWidth < 44 || removeAfterHeight < 44) {
            throw new Error(`Expected remove button pseudo target >= 44x44, got ${String(removeAfterWidth)}x${String(removeAfterHeight)}`);
        }

        // テスト: リンク側も44px以上の疑似要素ターゲットを持つ
        const link = linkTag.shadowRoot?.querySelector<HTMLAnchorElement>('.tag-link');
        if (!link) throw new Error('.tag-link not found');
        const linkAfterStyle = getComputedStyle(link, '::after');
        const linkAfterWidth = parsePx(linkAfterStyle.width);
        const linkAfterHeight = parsePx(linkAfterStyle.height);
        if (linkAfterWidth < 44 || linkAfterHeight < 44) {
            throw new Error(`Expected link pseudo target >= 44x44, got ${String(linkAfterWidth)}x${String(linkAfterHeight)}`);
        }

        // テスト: aria-label が設定されていることを確認
        const ariaLabel = removeBtn.getAttribute('aria-label');
        if (!ariaLabel) throw new Error('Remove button must have aria-label');

        // テスト: type="button" が設定されている（フォーム送信を防ぐ）
        if (removeBtn.type !== 'button') {
            throw new Error(`Expected type="button", got "${removeBtn.type}"`);
        }

        console.log('✅ All tests passed for TouchTargetSize story');
    },
};

/**
 * ⚠️ 境界条件: Gold カラーの視認性（White-out 防止）。
 *
 * Gold（黄色系）は高明度背景（L96%）では白飛びするため、
 * `--delta-l-bg: -3%`（背景を暗く）、`--delta-l-fg: -15%`（文字を茶色方向へ）
 * という逆方向補正を適用します。
 */
export const GoldColorVisibility: Story = {
    parameters: {
        docs: {
            description: {
                story: '⚠️ **境界条件**: Gold（黄色系）は高明度背景での白飛びを防ぐため、`delta-l-bg: -3%` / `delta-l-fg: -15%` の逆方向補正を適用します（index.md 基盤ルールの例外）。',
            },
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: Gold カラーは白飛び防止のため特殊な明度補正を適用します。
        他のカラーと並べて視認性を確認してください。
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
        <ui-tag id="gold-default" variant="default" color="gold">Gold Default</ui-tag>
        <ui-tag id="gold-outline" variant="outline" color="gold">Gold Outline</ui-tag>
        <ui-tag id="gold-solid"   variant="solid"   color="gold">Gold Solid</ui-tag>
        <ui-tag id="blue-default" variant="default" color="blue">Blue Default (比較)</ui-tag>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const goldTag = canvasElement.querySelector<Tag>('#gold-default');
        const blueTag = canvasElement.querySelector<Tag>('#blue-default');
        if (!goldTag) throw new Error('#gold-default not found');
        if (!blueTag) throw new Error('#blue-default not found');
        await Promise.all([goldTag.updateComplete, blueTag.updateComplete]);

        // テスト: color="gold" が設定されている
        if (goldTag.color !== 'gold') throw new Error('Expected color="gold"');

        // テスト: variant="default" が設定されている
        if (goldTag.variant !== 'default') throw new Error('Expected variant="default"');

        // Gold の delta-l 補正は CSS カスタムプロパティで管理されているため、
        // ここでは属性の正確性を確認する
        const goldAttr = goldTag.getAttribute('color');
        if (goldAttr !== 'gold') throw new Error(`Expected color attribute "gold", got "${goldAttr ?? 'null'}"`);

        // テスト: gold と blue は背景色が同一にならない
        const goldBg = getComputedStyle(goldTag).backgroundColor;
        const blueBg = getComputedStyle(blueTag).backgroundColor;
        if (goldBg === blueBg) {
            throw new Error(`Expected different background colors between gold and blue, got "${goldBg}"`);
        }

        console.log('✅ All tests passed for GoldColorVisibility story');
    },
};

/**
 * ダークモードでの視認性確認（手動確認用）。
 *
 * `prefers-color-scheme: dark` 時の最終色はOS/ブラウザ依存のため、
 * このストーリーは暗背景上での見え方を確認する目的で使用します。
 */
export const DarkModeReference: Story = {
    parameters: {
        docs: {
            description: {
                story: 'ダーク背景上での可視性確認用ストーリーです。`default` / `outline` / `solid` と Gold を含む主要色を並べています。',
            },
        },
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#121419' },
            ],
        },
    },
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; background: #121419; border-radius: 8px;">
      <div style="font-size: 12px; color: #b9c0cb;">Dark Mode Reference</div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        <ui-tag id="dark-default-blue" color="blue">Default Blue</ui-tag>
        <ui-tag id="dark-default-gold" color="gold">Default Gold</ui-tag>
        <ui-tag id="dark-outline-blue" variant="outline" color="blue">Outline Blue</ui-tag>
        <ui-tag id="dark-outline-gold" variant="outline" color="gold">Outline Gold</ui-tag>
        <ui-tag id="dark-solid-blue" variant="solid" color="blue">Solid Blue</ui-tag>
        <ui-tag id="dark-solid-gold" variant="solid" color="gold">Solid Gold</ui-tag>
      </div>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tags = canvasElement.querySelectorAll<Tag>('ui-tag');
        if (tags.length !== 6) throw new Error(`Expected 6 tags, got ${String(tags.length)}`);
        await Promise.all([...tags].map((tag) => tag.updateComplete));
        console.log('✅ All tests passed for DarkModeReference story');
    },
};

/**
 * フォーカスとキーボード操作の確認。
 *
 * `href + removable` 構造で、リンクと削除ボタンの双方がフォーカス可能であることを確認します。
 */
export const FocusAndKeyboard: Story = {
    render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>キーボード確認</strong>: Link と Remove の両方にフォーカス可能で、削除ボタンは Enter / Space で起動できます。
      </div>
      <ui-tag id="focus-keyboard" href="/tags/cs" color="blue" removable>Computer Science</ui-tag>
    </div>
  `,
    play: async ({ canvasElement }) => {
        const tag = canvasElement.querySelector<Tag>('#focus-keyboard');
        if (!tag) throw new Error('#focus-keyboard not found');
        await tag.updateComplete;

        const link = tag.shadowRoot?.querySelector<HTMLAnchorElement>('.tag-link');
        const removeBtn = tag.shadowRoot?.querySelector<HTMLButtonElement>('.tag-remove-button');
        if (!link || !removeBtn) throw new Error('link or remove button not found');

        // テスト: enabled 時はフォーカス除外されていない
        if (link.getAttribute('tabindex') === '-1') throw new Error('Link must be focusable when enabled');
        if (removeBtn.getAttribute('tabindex') === '-1') throw new Error('Remove button must be focusable when enabled');

        // テスト: プログラムフォーカス可能
        link.focus();
        if (tag.shadowRoot?.activeElement !== link) throw new Error('Link should receive focus');

        removeBtn.focus();
        if (tag.shadowRoot.activeElement !== removeBtn) throw new Error('Remove button should receive focus');

        // テスト: Enter / Space キー入力を受け取れる
        const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        const space = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true });
        const enterAccepted = removeBtn.dispatchEvent(enter);
        const spaceAccepted = removeBtn.dispatchEvent(space);
        if (!enterAccepted || !spaceAccepted) {
            throw new Error('Keyboard events should be accepted on remove button');
        }

        console.log('✅ All tests passed for FocusAndKeyboard story');
    },
};
