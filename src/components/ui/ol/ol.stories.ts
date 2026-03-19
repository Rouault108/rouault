import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './ol';
import type { Ol } from './ol';

const getHost = (canvasElement: Element, id: string): Ol => {
  const host = canvasElement.querySelector<Ol>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getDirectList = (host: Ol): HTMLOListElement => {
  const list = [...host.children].find(
    (child): child is HTMLOListElement => child instanceof HTMLOListElement,
  );
  if (!list) {
    throw new Error('ui-ol 直下の <ol> が見つかりません');
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

/**
 * CSS counter は getComputedStyle では解決されないため、
 * コンポーネントが設定する CSS カスタムプロパティから計算する。
 */
const getMarkerNumber = (item: HTMLLIElement): number => {
  const list = item.closest('ol');
  if (!(list instanceof HTMLOListElement)) {
    throw new Error('li の親 ol が見つかりません');
  }
  const listStyle = getComputedStyle(list);
  const resetStr = listStyle.getPropertyValue('--ui-ol-counter-reset').trim();
  const stepStr = listStyle.getPropertyValue('--ui-ol-counter-step').trim();
  const reset = resetStr !== '' ? Number(resetStr) : 0;
  const step = stepStr !== '' ? Number(stepStr) : 1;
  const directItems = [...list.children].filter(
    (c): c is HTMLLIElement => c instanceof HTMLLIElement,
  );
  let counter = reset;
  for (const li of directItems) {
    const setValStr = getComputedStyle(li).getPropertyValue('--ui-ol-counter-set').trim();
    if (setValStr !== '') {
      counter = Number(setValStr);
    }
    counter += step;
    if (li === item) return counter;
  }
  throw new Error('item が list 内で見つかりません');
};

const getMarkerText = (item: HTMLLIElement): string => `${getMarkerNumber(item).toString()}.`;

const nextFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const meta: Meta<Ol> = {
  title: 'Components/Ol',
  component: 'ui-ol',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
順序付きリストのためのコンポーネントです。

- 適用スコープは \`.prose ol\` と \`ui-ol > ol\` のみに限定
- マーカーは \`var(--font-mono)\` + \`tabular-nums\` + 右寄せ配置
- 3桁以上が想定される場合のみ \`data-marker-digits="3"\` を自動付与（4ch列）
- \`variant="steps"\` でマーカー色のみ \`var(--primary)\` に変更
- \`list-style: none\` の副作用を避けるため \`role="list"\` / \`role="listitem"\` を補強
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Ol>;

/**
 * 基本契約:
 * - `role="list"` / `role="listitem"` が付与される
 * - マーカーが `1.` から始まる
 * - 2桁以内では `data-marker-digits` が付与されない
 */
export const Default: Story = {
  render: () => html`
    <ui-ol id="default-ol" style="--space-2: 8px;">
      <ol>
        <li data-testid="item-1">順序を明確に伝える。</li>
        <li data-testid="item-2">本文の視線誘導を壊さない。</li>
        <li data-testid="item-3">静かな構造を保つ。</li>
      </ol>
    </ui-ol>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'default-ol');
    await host.updateComplete;

    const list = getDirectList(host);
    if (list.getAttribute('role') !== 'list') {
      throw new Error('<ol> に role="list" が付与されていません');
    }
    if (list.hasAttribute('data-marker-digits')) {
      throw new Error('2桁以内のリストに data-marker-digits が付与されています');
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
    if (getMarkerText(firstItem) !== '1.') {
      throw new Error(`先頭マーカーが "1." ではありません: ${getMarkerText(firstItem)}`);
    }

    const secondMarginBlockStart = getComputedStyle(secondItem).marginBlockStart;
    if (secondMarginBlockStart !== '8px') {
      throw new Error(
        `Item Gap が var(--space-2) と一致しません: margin-block-start=${secondMarginBlockStart}`,
      );
    }

    const markerColumn = getComputedStyle(list).getPropertyValue('--ol-marker-column').trim();
    if (markerColumn !== '3ch') {
      throw new Error(`既定のマーカー列幅が 3ch ではありません: ${markerColumn}`);
    }
  },
};

/**
 * Marker Alignment + Item Gap:
 * - 1桁と2桁（9. / 10.）で本文開始位置が一致
 * - `var(--space-2)` が項目間余白へ正しく反映
 */
export const MarkerAlignmentAndSpacing: Story = {
  render: () => html`
    <ui-ol id="alignment-ol" style="--space-2: 8px;">
      <ol start="9">
        <li data-testid="align-9"><span class="content-anchor">9番の本文</span></li>
        <li data-testid="align-10"><span class="content-anchor">10番の本文</span></li>
      </ol>
    </ui-ol>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'alignment-ol');
    await host.updateComplete;

    const list = getDirectList(host);
    const item9 = getItem(list, '[data-testid="align-9"]');
    const item10 = getItem(list, '[data-testid="align-10"]');
    const anchor9 = item9.querySelector<HTMLElement>('.content-anchor');
    const anchor10 = item10.querySelector<HTMLElement>('.content-anchor');
    if (!anchor9 || !anchor10) {
      throw new Error('本文開始位置の検証用要素が見つかりません');
    }

    const marker9 = getMarkerNumber(item9);
    const marker10 = getMarkerNumber(item10);
    if (marker9 !== 9 || marker10 !== 10) {
      throw new Error(`start=9 のマーカー生成が不正です: ${String(marker9)}, ${String(marker10)}`);
    }

    const left9 = anchor9.getBoundingClientRect().left;
    const left10 = anchor10.getBoundingClientRect().left;
    if (Math.abs(left9 - left10) > 1) {
      throw new Error(`1桁/2桁で本文開始位置がずれています: ${String(left9)} vs ${String(left10)}`);
    }

    const item10MarginBlockStart = getComputedStyle(item10).marginBlockStart;
    if (item10MarginBlockStart !== '8px') {
      throw new Error(
        `Item Gap が var(--space-2) と一致しません: margin-block-start=${item10MarginBlockStart}`,
      );
    }
  },
};

/**
 * バリアント × 状態:
 * - default / steps のマーカー色差分
 * - インタラクティブ要素を含む状態で 44px タッチターゲット維持
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
        --fg-muted: rgb(111, 111, 124);
        --primary: rgb(24, 118, 242);
        --control-min-touch: 24px;
      }
      .cell {
        padding: 0.75rem;
        border: 1px dashed var(--border-default, #d7d7d7);
        border-radius: var(--radius-sm, 4px);
      }
      .label {
        margin-block-end: 0.375rem;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--fg-muted);
      }
      .touch-link,
      .touch-button {
        display: inline-flex;
        align-items: center;
      }
    </style>

    <div class="matrix">
      <div id="token-muted-probe" style="color: var(--fg-muted); display: none;"></div>
      <div id="token-primary-probe" style="color: var(--primary); display: none;"></div>

      <div class="cell">
        <div class="label">Default × Reading</div>
        <ui-ol id="matrix-default">
          <ol>
            <li data-testid="default-marker">文脈に従う番号。</li>
            <li>強調しすぎない視覚重み。</li>
          </ol>
        </ui-ol>
      </div>

      <div class="cell">
        <div class="label">Steps × Tutorial</div>
        <ui-ol id="matrix-steps" variant="steps">
          <ol>
            <li data-testid="steps-marker">導線を強調する番号。</li>
            <li>本文色は変えない。</li>
          </ol>
        </ui-ol>
      </div>

      <div class="cell">
        <div class="label">Interactive × Touch Target</div>
        <ui-ol id="matrix-interactive">
          <ol>
            <li>
              <a class="touch-link" href="#detail">詳細を読む</a>
            </li>
            <li>
              <button class="touch-button" type="button">次へ進む</button>
            </li>
          </ol>
        </ui-ol>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultHost = getHost(canvasElement, 'matrix-default');
    const stepsHost = getHost(canvasElement, 'matrix-steps');
    const interactiveHost = getHost(canvasElement, 'matrix-interactive');
    await Promise.all([
      defaultHost.updateComplete,
      stepsHost.updateComplete,
      interactiveHost.updateComplete,
    ]);

    const mutedProbe = canvasElement.querySelector<HTMLElement>('#token-muted-probe');
    const primaryProbe = canvasElement.querySelector<HTMLElement>('#token-primary-probe');
    if (!mutedProbe || !primaryProbe) {
      throw new Error('色トークン検証用プローブが見つかりません');
    }

    const mutedColor = getComputedStyle(mutedProbe).color;
    const primaryColor = getComputedStyle(primaryProbe).color;

    const defaultItem = getItem(getDirectList(defaultHost), '[data-testid="default-marker"]');
    const stepsItem = getItem(getDirectList(stepsHost), '[data-testid="steps-marker"]');
    const defaultMarkerColor = getComputedStyle(defaultItem, '::before').color;
    const stepsMarkerColor = getComputedStyle(stepsItem, '::before').color;

    if (defaultMarkerColor !== mutedColor) {
      throw new Error(`default のマーカー色が fg-muted と一致しません: ${defaultMarkerColor}`);
    }
    if (stepsMarkerColor !== primaryColor) {
      throw new Error(`steps のマーカー色が primary と一致しません: ${stepsMarkerColor}`);
    }
    if (defaultMarkerColor === stepsMarkerColor) {
      throw new Error('default と steps でマーカー色差分がありません');
    }

    const interactiveRoot = getDirectList(interactiveHost);
    const link = interactiveRoot.querySelector<HTMLAnchorElement>('.touch-link');
    const button = interactiveRoot.querySelector<HTMLButtonElement>('.touch-button');
    if (!link || !button) {
      throw new Error('インタラクティブ要素が見つかりません');
    }

    const linkAfterWidth = Number.parseFloat(getComputedStyle(link, '::after').width);
    const buttonAfterHeight = Number.parseFloat(getComputedStyle(button, '::after').height);
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
 * - 3桁判定（`data-marker-digits="3"`）
 * - `start` / `reversed` / `li[value]` のマーカー追従
 * - `<ui-ol><li>...</li></ui-ol>` の自動補完
 * - `<ol>` と直下 `li` の混在入力救済
 * - 後追加ノードの role 補強
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-ol id="boundary-large">
        <ol start="100">
          <li data-testid="large-1">三桁開始。</li>
          <li data-testid="large-2">列幅拡張。</li>
        </ol>
      </ui-ol>

      <ui-ol id="boundary-reversed-value">
        <ol reversed start="5">
          <li data-testid="rev-1">5 から開始。</li>
          <li data-testid="rev-2" value="2">明示値 2。</li>
          <li data-testid="rev-3">次は 1。</li>
        </ol>
      </ui-ol>

      <ui-ol id="boundary-autowrap">
        <li data-testid="auto-1">ol を省略した入力 1</li>
        <li data-testid="auto-2">ol を省略した入力 2</li>
      </ui-ol>

      <ui-ol id="boundary-dynamic">
        <ol>
          <li data-testid="dynamic-root">初期項目</li>
        </ol>
      </ui-ol>

      <ui-ol id="boundary-mixed">
        <ol>
          <li data-testid="mixed-root">既存リスト項目</li>
        </ol>
        <li data-testid="mixed-stray-1">直下 stray 1</li>
        <li data-testid="mixed-stray-2">直下 stray 2</li>
      </ui-ol>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const largeHost = getHost(canvasElement, 'boundary-large');
    const reversedHost = getHost(canvasElement, 'boundary-reversed-value');
    const autoHost = getHost(canvasElement, 'boundary-autowrap');
    const dynamicHost = getHost(canvasElement, 'boundary-dynamic');
    const mixedHost = getHost(canvasElement, 'boundary-mixed');
    await Promise.all([
      largeHost.updateComplete,
      reversedHost.updateComplete,
      autoHost.updateComplete,
      dynamicHost.updateComplete,
      mixedHost.updateComplete,
    ]);

    const largeList = getDirectList(largeHost);
    if (largeList.getAttribute('data-marker-digits') !== '3') {
      throw new Error('3桁ケースで data-marker-digits="3" が付与されていません');
    }
    const largeMarkerColumn = getComputedStyle(largeList)
      .getPropertyValue('--ol-marker-column')
      .trim();
    if (largeMarkerColumn !== '4ch') {
      throw new Error(`3桁ケースでマーカー列幅が 4ch ではありません: ${largeMarkerColumn}`);
    }
    const largeFirst = getItem(largeList, '[data-testid="large-1"]');
    const largeSecond = getItem(largeList, '[data-testid="large-2"]');
    if (getMarkerNumber(largeFirst) !== 100) {
      throw new Error('start="100" の先頭マーカーが 100 ではありません');
    }
    if (getMarkerNumber(largeSecond) !== 101) {
      throw new Error('start="100" の2件目マーカーが 101 ではありません');
    }

    const reversedList = getDirectList(reversedHost);
    const rev1 = getItem(reversedList, '[data-testid="rev-1"]');
    const rev2 = getItem(reversedList, '[data-testid="rev-2"]');
    const rev3 = getItem(reversedList, '[data-testid="rev-3"]');
    if (getMarkerNumber(rev1) !== 5) {
      throw new Error('reversed start=5 の先頭マーカーが 5 ではありません');
    }
    if (getMarkerNumber(rev2) !== 2) {
      throw new Error('li[value="2"] のマーカーが 2 ではありません');
    }
    if (getMarkerNumber(rev3) !== 1) {
      throw new Error('li[value="2"] の次マーカーが 1 ではありません');
    }

    const autoList = getDirectList(autoHost);
    if (autoList.children.length !== 2) {
      throw new Error('自動補完された <ol> の子要素数が不正です');
    }
    if (autoList.getAttribute('role') !== 'list') {
      throw new Error('自動補完された <ol> に role="list" がありません');
    }

    const dynamicRoot = getDirectList(dynamicHost);
    const newItem = document.createElement('li');
    newItem.textContent = '後追加項目';

    const nested = document.createElement('ol');
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
      throw new Error('後追加したネスト ol に role="list" が補強されていません');
    }
    if (nestedItem.getAttribute('role') !== 'listitem') {
      throw new Error('後追加したネスト li に role="listitem" が補強されていません');
    }

    const mixedLists = [...mixedHost.children].filter(
      (child): child is HTMLOListElement => child instanceof HTMLOListElement,
    );
    if (mixedLists.length < 2) {
      throw new Error('ol と直下 li の混在ケースで救済用 <ol> が生成されていません');
    }

    const rescuedList = mixedLists.find((listCandidate) =>
      listCandidate.querySelector('[data-testid="mixed-stray-1"], [data-testid="mixed-stray-2"]'),
    );
    if (!rescuedList) {
      throw new Error('直下 stray li が救済用 <ol> に移動していません');
    }

    const rescuedItems = rescuedList.querySelectorAll<HTMLLIElement>('li');
    if (rescuedItems.length !== 2) {
      throw new Error(`救済用 <ol> の li 件数が不正です: ${String(rescuedItems.length)}`);
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
 * - `.prose ol` には適用される
 * - それ以外の通常 `ol` には適用しない
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
      <div class="block prose">
        <div class="label">Prose Context</div>
        <ol id="scope-prose-list">
          <li id="scope-prose-item">.prose 内リスト</li>
        </ol>
      </div>

      <div class="block">
        <div class="label">Plain OL (No Scope)</div>
        <ol id="scope-plain-list">
          <li id="scope-plain-item">スコープ外リスト</li>
        </ol>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    await nextFrame();

    const proseList = canvasElement.querySelector<HTMLOListElement>('#scope-prose-list');
    const proseItem = canvasElement.querySelector<HTMLLIElement>('#scope-prose-item');
    const plainList = canvasElement.querySelector<HTMLOListElement>('#scope-plain-list');
    const plainItem = canvasElement.querySelector<HTMLLIElement>('#scope-plain-item');
    if (!proseList || !proseItem || !plainList || !plainItem) {
      throw new Error('ScopeIsolation 用要素の取得に失敗しました');
    }

    if (getComputedStyle(proseList).listStyleType !== 'none') {
      throw new Error('.prose ol に list-style: none が適用されていません');
    }
    if (getComputedStyle(proseItem).display !== 'grid') {
      throw new Error('.prose ol li に grid レイアウトが適用されていません');
    }

    if (getComputedStyle(plainItem).display === 'grid') {
      throw new Error('スコープ外の ol li にスタイルが漏れています');
    }
    if (getComputedStyle(plainList).listStyleType === 'none') {
      throw new Error('スコープ外の ol に list-style: none が漏れています');
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
    <ui-ol id="contract-ol">
      <ol>
        <li>契約確認</li>
      </ol>
    </ui-ol>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'contract-ol');
    await host.updateComplete;

    const styleTag = document.getElementById('ui-ol-document-styles');
    if (!(styleTag instanceof HTMLStyleElement)) {
      throw new Error('ui-ol のドキュメントスタイルが注入されていません');
    }

    const cssText = styleTag.textContent;
    if (typeof cssText !== 'string') {
      throw new Error('style text の取得に失敗しました');
    }

    if (!cssText.includes(':where(.prose ol, ui-ol > ol)')) {
      throw new Error('Scope Contract のセレクタが欠落しています');
    }
    if (!cssText.includes('counter-reset: list-item')) {
      throw new Error('カウンタ初期化契約が定義されていません');
    }
    if (!cssText.includes('counter-increment: list-item')) {
      throw new Error('カウンタ増分契約が定義されていません');
    }
    if (!cssText.includes('counter-set: list-item')) {
      throw new Error('li[value] 対応の counter-set 契約が定義されていません');
    }
    if (!cssText.includes('font-variant-numeric: tabular-nums')) {
      throw new Error('等幅数字契約が定義されていません');
    }
    if (!cssText.includes('variant="steps"')) {
      throw new Error('steps バリアント契約が定義されていません');
    }
    if (!cssText.includes('--ol-marker-column: 3ch')) {
      throw new Error('既定列幅 3ch 契約が定義されていません');
    }
    if (!cssText.includes('data-marker-digits="3"')) {
      throw new Error('3桁切り替え契約が定義されていません');
    }
    if (!cssText.includes('var(--fg-muted)')) {
      throw new Error('マーカー色トークン参照がありません');
    }
    if (!cssText.includes('var(--space-2)')) {
      throw new Error('スペーシングのトークン参照がありません');
    }
    if (!cssText.includes('var(--control-min-touch)')) {
      throw new Error('タッチターゲットトークン参照がありません');
    }
    if (!cssText.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors 契約が定義されていません');
    }
    if (!cssText.includes('color: CanvasText')) {
      throw new Error('forced-colors 時の CanvasText 指定がありません');
    }
  },
};

/**
 * Dark Mode契約:
 * - セマンティックトークン参照でモード分岐不要
 * - Defaultマーカーは `--fg-muted`、Stepsマーカーは `--primary` を追従
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
        --primary: oklch(72% 0.17 256);
      }
    </style>

    <div class="dark-surface">
      <div id="dark-muted-probe" style="color: var(--fg-muted); display: none;"></div>
      <div id="dark-primary-probe" style="color: var(--primary); display: none;"></div>

      <ui-ol id="dark-default">
        <ol>
          <li data-testid="dark-default-item">暗色面でも静かな主従を維持する</li>
        </ol>
      </ui-ol>

      <ui-ol id="dark-steps" variant="steps">
        <ol>
          <li data-testid="dark-steps-item">手順強調時のみプライマリに切り替える</li>
        </ol>
      </ui-ol>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultHost = getHost(canvasElement, 'dark-default');
    const stepsHost = getHost(canvasElement, 'dark-steps');
    await Promise.all([defaultHost.updateComplete, stepsHost.updateComplete]);

    const defaultItem = getItem(getDirectList(defaultHost), '[data-testid="dark-default-item"]');
    const stepsItem = getItem(getDirectList(stepsHost), '[data-testid="dark-steps-item"]');
    const mutedProbe = canvasElement.querySelector<HTMLElement>('#dark-muted-probe');
    const primaryProbe = canvasElement.querySelector<HTMLElement>('#dark-primary-probe');
    if (!mutedProbe || !primaryProbe) {
      throw new Error('Dark Mode 色検証用プローブが見つかりません');
    }

    const defaultMarkerColor = getComputedStyle(defaultItem, '::before').color;
    const stepsMarkerColor = getComputedStyle(stepsItem, '::before').color;
    const expectedMuted = getComputedStyle(mutedProbe).color;
    const expectedPrimary = getComputedStyle(primaryProbe).color;
    if (defaultMarkerColor !== expectedMuted) {
      throw new Error(
        `Dark Mode で default マーカー色が --fg-muted を追従していません: ${defaultMarkerColor}`,
      );
    }
    if (stepsMarkerColor !== expectedPrimary) {
      throw new Error(
        `Dark Mode で steps マーカー色が --primary を追従していません: ${stepsMarkerColor}`,
      );
    }
  },
};
