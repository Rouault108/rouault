import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './ul';
import type { Ul } from './ul';

const getHost = (canvasElement: Element, id: string): Ul => {
  const host = canvasElement.querySelector<Ul>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getDirectList = (host: Ul): HTMLUListElement => {
  const list = [...host.children].find(
    (child): child is HTMLUListElement => child instanceof HTMLUListElement,
  );
  if (!list) {
    throw new Error('ui-ul 直下の <ul> が見つかりません');
  }
  return list;
};

const getItem = (root: ParentNode, selector: string): HTMLLIElement => {
  const item = root.querySelector<HTMLLIElement>(selector);
  if (!item) {
    throw new Error(`${selector} が見つかりません`);
  }
  return item;
};

const normalizePseudoContent = (value: string): string => value.replace(/^["']|["']$/g, '');

const getMarker = (item: HTMLLIElement): string =>
  normalizePseudoContent(getComputedStyle(item, '::before').content);

const nextFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
};

const meta: Meta<Ul> = {
  title: 'Components/Ul',
  component: 'ui-ul',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
順序なしリストのためのコンポーネントです。

- 適用スコープは \`.prose ul\` と \`ui-ul > ul\` のみに限定
- マーカー階層は Level1/2/3 = \`•/◦/▪\`
- \`list-style: none\` の副作用を避けるため \`role="list"\` / \`role="listitem"\` を補強
- リスト内リンク/ボタンのタッチターゲット最小 44px を保証
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Ul>;

/**
 * 基本契約:
 * - `role="list"` / `role="listitem"` が付与される
 * - Level 1 マーカーが `•`
 */
export const Default: Story = {
  render: () => html`
    <ui-ul id="default-ul" style="--space-2: 8px; --space-4: 16px;">
      <ul>
        <li data-testid="item-1">本文の読書リズムを壊さない。</li>
        <li data-testid="item-2">マーカーは主張しすぎない。</li>
        <li data-testid="item-3">情報の信号を優先する。</li>
      </ul>
    </ui-ul>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'default-ul');
    await host.updateComplete;

    const list = getDirectList(host);
    if (list.getAttribute('role') !== 'list') {
      throw new Error('<ul> に role="list" が付与されていません');
    }

    const items = list.querySelectorAll('li');
    if (items.length !== 3) {
      throw new Error(`li の件数が 3 件ではありません: ${String(items.length)}`);
    }

    for (const item of items) {
      if (item.getAttribute('role') !== 'listitem') {
        throw new Error('li に role="listitem" が付与されていません');
      }
    }

    const firstItem = getItem(list, '[data-testid="item-1"]');
    const secondItem = getItem(list, '[data-testid="item-2"]');
    if (getMarker(firstItem) !== '•') {
      throw new Error('Level 1 マーカーが "•" ではありません');
    }

    const secondMarginBlockStart = getComputedStyle(secondItem).marginBlockStart;
    if (secondMarginBlockStart !== '8px') {
      throw new Error(
        `Item Gap が var(--space-2) と一致しません: margin-block-start=${secondMarginBlockStart}`,
      );
    }

    const firstItemGridColumns = getComputedStyle(firstItem).gridTemplateColumns;
    if (!firstItemGridColumns.startsWith('16px')) {
      throw new Error(
        `Marker Column Width が var(--space-4) と一致しません: grid-template-columns=${firstItemGridColumns}`,
      );
    }
  },
};

/**
 * バリアント × 状態:
 * - フラット構造
 * - ネスト構造（1〜4階層）
 * - インタラクティブ要素を含む状態
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
      }
      .label {
        font-size: 11px;
        color: var(--fg-muted, #666);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-block-end: 0.25rem;
      }
      .cell {
        padding: 0.75rem;
        border: 1px dashed var(--border-default, #d7d7d7);
        border-radius: var(--radius-sm, 4px);
      }
      .touch-link,
      .touch-button {
        display: inline-flex;
        align-items: center;
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <div class="label">Flat × Default</div>
        <ui-ul id="matrix-flat">
          <ul>
            <li data-testid="flat-1">シンプルな並列情報</li>
            <li data-testid="flat-2">行間リズムを維持</li>
          </ul>
        </ui-ul>
      </div>

      <div class="cell">
        <div class="label">Nested × Marker Hierarchy</div>
        <ui-ul id="matrix-nested">
          <ul>
            <li data-testid="nested-l1">
              Level 1
              <ul>
                <li data-testid="nested-l2">
                  Level 2
                  <ul>
                    <li data-testid="nested-l3">
                      Level 3
                      <ul>
                        <li data-testid="nested-l4">Level 4</li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </ui-ul>
      </div>

      <div class="cell">
        <div class="label">Interactive × Touch Target</div>
        <ui-ul
          id="matrix-interactive"
          style="--control-min-touch: 24px; --control-height-sm: 24px;"
        >
          <ul>
            <li>
              <a class="touch-link" href="#read">詳細を読む</a>
            </li>
            <li>
              <button class="touch-button" type="button">操作する</button>
            </li>
          </ul>
        </ui-ul>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const nestedHost = getHost(canvasElement, 'matrix-nested');
    await nestedHost.updateComplete;

    const nestedRoot = getDirectList(nestedHost);
    const level1 = getItem(nestedRoot, '[data-testid="nested-l1"]');
    const level2 = getItem(nestedRoot, '[data-testid="nested-l2"]');
    const level3 = getItem(nestedRoot, '[data-testid="nested-l3"]');
    const level4 = getItem(nestedRoot, '[data-testid="nested-l4"]');

    if (getMarker(level1) !== '•') {
      throw new Error('Level 1 マーカーが "•" ではありません');
    }
    if (getMarker(level2) !== '◦') {
      throw new Error('Level 2 マーカーが "◦" ではありません');
    }
    if (getMarker(level3) !== '▪') {
      throw new Error('Level 3 マーカーが "▪" ではありません');
    }
    if (getMarker(level4) !== '▪') {
      throw new Error('Level 4 で "▪" 維持の契約を満たしていません');
    }

    const interactiveHost = getHost(canvasElement, 'matrix-interactive');
    await interactiveHost.updateComplete;

    const interactiveRoot = getDirectList(interactiveHost);
    const link = interactiveRoot.querySelector<HTMLAnchorElement>('.touch-link');
    const button = interactiveRoot.querySelector<HTMLButtonElement>('.touch-button');
    if (!link || !button) {
      throw new Error('インタラクティブ要素が見つかりません');
    }

    const linkAfter = getComputedStyle(link, '::after');
    const buttonAfter = getComputedStyle(button, '::after');
    const linkAfterWidth = Number.parseFloat(linkAfter.width);
    const buttonAfterHeight = Number.parseFloat(buttonAfter.height);

    if (!(linkAfterWidth >= 24)) {
      throw new Error(`リンクのタッチターゲット幅が不足しています: ${String(linkAfterWidth)}px`);
    }
    if (!(buttonAfterHeight >= 24)) {
      throw new Error(`ボタンのタッチターゲット高が不足しています: ${String(buttonAfterHeight)}px`);
    }
  },
};

/**
 * 事故が多い境界条件:
 * - `<ui-ul><li>...</li></ui-ul>` 入力の自動補完
 * - MutationObserver による後追加ノードの role 補強
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-ul id="boundary-autowrap">
        <li data-testid="auto-1">ul を省略した入力 1</li>
        <li data-testid="auto-2">ul を省略した入力 2</li>
      </ui-ul>

      <ui-ul id="boundary-dynamic">
        <ul>
          <li data-testid="dynamic-root">初期項目</li>
        </ul>
      </ui-ul>

      <ui-ul id="boundary-mixed">
        <ul>
          <li data-testid="mixed-root">既存リスト項目</li>
        </ul>
        <li data-testid="mixed-stray-1">直下 stray 1</li>
        <li data-testid="mixed-stray-2">直下 stray 2</li>
      </ui-ul>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const autoWrap = getHost(canvasElement, 'boundary-autowrap');
    await autoWrap.updateComplete;

    const autoList = getDirectList(autoWrap);
    if (autoList.children.length !== 2) {
      throw new Error('自動補完された <ul> の子要素数が不正です');
    }
    if (autoList.getAttribute('role') !== 'list') {
      throw new Error('自動補完された <ul> に role="list" がありません');
    }

    const dynamicHost = getHost(canvasElement, 'boundary-dynamic');
    await dynamicHost.updateComplete;

    const dynamicRoot = getDirectList(dynamicHost);
    const newItem = document.createElement('li');
    newItem.textContent = '後追加項目';

    const nested = document.createElement('ul');
    const nestedItem = document.createElement('li');
    nestedItem.textContent = '後追加ネスト項目';
    nested.appendChild(nestedItem);
    newItem.appendChild(nested);
    dynamicRoot.appendChild(newItem);

    await nextFrame();

    if (newItem.getAttribute('role') !== 'listitem') {
      throw new Error('後追加した li に role="listitem" が補強されていません');
    }
    if (nested.getAttribute('role') !== 'list') {
      throw new Error('後追加したネスト ul に role="list" が補強されていません');
    }
    if (nestedItem.getAttribute('role') !== 'listitem') {
      throw new Error('後追加したネスト li に role="listitem" が補強されていません');
    }

    const mixedHost = getHost(canvasElement, 'boundary-mixed');
    await mixedHost.updateComplete;

    const mixedLists = [...mixedHost.children].filter(
      (child): child is HTMLUListElement => child instanceof HTMLUListElement,
    );
    if (mixedLists.length < 2) {
      throw new Error('ul と直下 li の混在ケースで救済用 <ul> が生成されていません');
    }

    const rescuedList = mixedLists.find((list) =>
      list.querySelector('[data-testid="mixed-stray-1"], [data-testid="mixed-stray-2"]'),
    );
    if (!rescuedList) {
      throw new Error('直下 stray li が救済用 <ul> に移動していません');
    }

    const rescuedItems = rescuedList.querySelectorAll<HTMLLIElement>('li');
    if (rescuedItems.length !== 2) {
      throw new Error(`救済用 <ul> の li 件数が不正です: ${String(rescuedItems.length)}`);
    }
    for (const item of rescuedItems) {
      if (item.getAttribute('role') !== 'listitem') {
        throw new Error('救済された li に role="listitem" が補強されていません');
      }
    }
  },
};

/**
 * Scope Isolation:
 * - `.prose ul` には適用される
 * - それ以外の通常 `ul` には適用しない
 */
export const ScopeIsolation: Story = {
  render: () => html`
    <style>
      .group {
        display: grid;
        gap: 1rem;
      }
      .block {
        padding: 0.75rem;
        border: 1px dashed var(--border-default, #d7d7d7);
        border-radius: var(--radius-sm, 4px);
      }
      .label {
        margin-block-end: 0.375rem;
        font-size: 11px;
        text-transform: uppercase;
        color: var(--fg-muted, #666);
      }
    </style>

    <div class="group">
      <div class="block prose" id="scope-prose">
        <div class="label">Prose Context</div>
        <ul id="scope-prose-list">
          <li id="scope-prose-item">.prose 内リスト</li>
        </ul>
      </div>

      <div class="block">
        <div class="label">Plain UL (No Scope)</div>
        <ul id="scope-plain-list">
          <li id="scope-plain-item">スコープ外リスト</li>
        </ul>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await nextFrame();

    const proseList = canvasElement.querySelector<HTMLUListElement>('#scope-prose-list');
    const proseItem = canvasElement.querySelector<HTMLLIElement>('#scope-prose-item');
    const plainItem = canvasElement.querySelector<HTMLLIElement>('#scope-plain-item');

    if (!proseList || !proseItem || !plainItem) {
      throw new Error('ScopeIsolation 用要素の取得に失敗しました');
    }

    const proseListStyle = getComputedStyle(proseList);
    if (proseListStyle.listStyleType !== 'none') {
      throw new Error('.prose ul に list-style: none が適用されていません');
    }

    if (getComputedStyle(proseItem).display !== 'grid') {
      throw new Error('.prose ul li に grid レイアウトが適用されていません');
    }

    if (getComputedStyle(plainItem).display === 'grid') {
      throw new Error('スコープ外の ul li にスタイルが漏れています');
    }
  },
};

/**
 * メディア契約:
 * - 強制色モード契約がスタイル定義に含まれる
 * - トークン参照でハードコードを持ち込まない
 */
export const MediaAndTokenContracts: Story = {
  render: () => html`
    <ui-ul id="contract-ul">
      <ul>
        <li>契約確認</li>
      </ul>
    </ui-ul>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'contract-ul');
    await host.updateComplete;

    const styleTag = document.getElementById('ui-ul-document-styles');
    if (!(styleTag instanceof HTMLStyleElement)) {
      throw new Error('ui-ul のドキュメントスタイルが注入されていません');
    }

    const cssText = styleTag.textContent;
    if (typeof cssText !== 'string') {
      throw new Error('style text の取得に失敗しました');
    }

    if (!cssText.includes(':where(.prose ul, ui-ul > ul)')) {
      throw new Error('Scope Contract のセレクタが欠落しています');
    }
    if (!cssText.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors 契約が定義されていません');
    }
    if (!cssText.includes('color: CanvasText')) {
      throw new Error('forced-colors 時の CanvasText 指定がありません');
    }
    if (!cssText.includes('var(--fg-muted)')) {
      throw new Error('マーカー色のトークン参照がありません');
    }
    if (!cssText.includes('var(--space-2)')) {
      throw new Error('スペーシングのトークン参照がありません');
    }
    if (!cssText.includes('var(--space-4)')) {
      throw new Error('マーカー列幅のトークン参照がありません');
    }
    if (!cssText.includes('var(--control-min-touch')) {
      throw new Error('タッチターゲットのトークン参照がありません');
    }
  },
};

/**
 * Dark Mode契約:
 * - セマンティックトークン参照でモード分岐不要
 * - マーカー色は `--fg-muted` を追従する
 */
export const DarkModeTokenContract: Story = {
  render: () => html`
    <style>
      .dark-surface {
        padding: 1rem;
        background: oklch(18% 0.02 250);
        color: oklch(92% 0.01 250);
        border-radius: var(--radius-md, 8px);
        --fg-default: oklch(92% 0.01 250);
        --fg-muted: oklch(74% 0.01 250);
      }
    </style>

    <div class="dark-surface">
      <div id="dark-muted-probe" style="color: var(--fg-muted); display: none;"></div>
      <ui-ul id="dark-contract">
        <ul>
          <li data-testid="dark-item">暗色面でも本文とマーカーの階層差を維持する</li>
        </ul>
      </ui-ul>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dark-contract');
    await host.updateComplete;

    const item = getItem(getDirectList(host), '[data-testid="dark-item"]');
    const probe = canvasElement.querySelector<HTMLElement>('#dark-muted-probe');
    if (!probe) {
      throw new Error('Dark Mode 色検証用プローブが見つかりません');
    }

    const markerColor = getComputedStyle(item, '::before').color;
    const expectedMuted = getComputedStyle(probe).color;
    if (markerColor !== expectedMuted) {
      throw new Error(`Dark Mode でマーカー色が --fg-muted を追従していません: ${markerColor}`);
    }
  },
};
