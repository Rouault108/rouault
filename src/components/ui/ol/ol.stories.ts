import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './ol';
import type { Ol } from './ol';

const ALLOWED_ALIGNMENT_DELTA = 1;

const getHost = (canvasElement: Element, id: string): Ol => {
  const host = canvasElement.querySelector<Ol>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getDirectLists = (host: Ol): HTMLOListElement[] =>
  [...host.children].filter((child): child is HTMLOListElement => child instanceof HTMLOListElement);

const getDirectList = (host: Ol): HTMLOListElement => {
  const [list] = getDirectLists(host);
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

const getElement = (root: ParentNode, selector: string): HTMLElement => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`${selector} が見つかりません`);
  }
  return element;
};

const getDirectItems = (list: HTMLOListElement): HTMLLIElement[] =>
  [...list.children].filter((child): child is HTMLLIElement => child instanceof HTMLLIElement);

const computeNativeMarkerSequence = (list: HTMLOListElement): number[] => {
  const items = getDirectItems(list);
  const step = list.reversed ? -1 : 1;
  const rawStart = list.getAttribute('start');
  let current =
    rawStart !== null ? Number.parseInt(rawStart, 10) : list.reversed ? items.length : 1;
  const sequence: number[] = [];

  for (const item of items) {
    const rawValue = item.getAttribute('value');
    if (rawValue !== null) {
      current = Number.parseInt(rawValue, 10);
    }
    sequence.push(current);
    current += step;
  }

  return sequence;
};

const expectMarkerSequence = (list: HTMLOListElement, expected: number[]): void => {
  const actual = computeNativeMarkerSequence(list);
  if (actual.length !== expected.length) {
    throw new Error(`項目数が一致しません: expected=${String(expected.length)}, actual=${String(actual.length)}`);
  }

  actual.forEach((value, index) => {
    if (value !== expected[index]) {
      throw new Error(`番号進行が一致しません: expected=${expected.join(', ')}, actual=${actual.join(', ')}`);
    }
  });
};

const expectAlignment = (anchors: HTMLElement[]): void => {
  const xs = anchors.map((anchor) => anchor.getBoundingClientRect().left);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  if (max - min > ALLOWED_ALIGNMENT_DELTA) {
    throw new Error(`本文開始位置が揃っていません: ${xs.map(String).join(', ')}`);
  }
};

const expectSameTextColor = (elements: HTMLElement[]): void => {
  const colors = elements.map((element) => getComputedStyle(element).color);
  const [first, ...rest] = colors;
  if (!first) {
    throw new Error('比較対象の本文要素がありません');
  }
  for (const color of rest) {
    if (color !== first) {
      throw new Error(`本文色が一致しません: ${colors.join(', ')}`);
    }
  }
};

const meta: Meta<Ol> = {
  title: 'Components/Ol',
  component: 'ui-ol',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
単一の ordered list を、native ordered list semantics と整合したまま静かに整列表示するコンポーネントです。

- 契約対象は \`ui-ol\` 配下の ordered list のみ
- \`start\` / \`reversed\` / \`li[value]\` と視覚マーカーを整合
- 本文開始位置は list 単位で安定して揃う
- \`variant="steps"\` はマーカー差分のみに限定
- 非正規入力は best-effort であり、公開契約の中心には含めない
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Ol>;

export const Default: Story = {
  render: () => html`
    <ui-ol id="default-ol" style="--space-2: 8px;">
      <ol>
        <li><span data-testid="anchor-1">順序を明確に伝える。</span></li>
        <li><span data-testid="anchor-2">本文の視線誘導を壊さない。</span></li>
        <li><span data-testid="anchor-3">静かな構造を保つ。</span></li>
      </ol>
    </ui-ol>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'default-ol');
    await host.updateComplete;

    const lists = getDirectLists(host);
    if (lists.length !== 1) {
      throw new Error(`root <ol> は 1 個でなければなりません: ${String(lists.length)}`);
    }

    const list = lists[0];
    if (!list) {
      throw new Error('root <ol> が取得できません');
    }

    const items = getDirectItems(list);
    if (items.length !== 3) {
      throw new Error(`li の件数が 3 件ではありません: ${String(items.length)}`);
    }

    expectMarkerSequence(list, [1, 2, 3]);

    const anchors = [
      getElement(list, '[data-testid="anchor-1"]'),
      getElement(list, '[data-testid="anchor-2"]'),
      getElement(list, '[data-testid="anchor-3"]'),
    ];
    expectAlignment(anchors);

    const secondItem = items[1];
    if (!secondItem) {
      throw new Error('2 件目の li が見つかりません');
    }

    const secondMargin = getComputedStyle(secondItem).marginBlockStart;
    if (secondMargin !== '8px') {
      throw new Error(`項目間余白が --space-2 を反映していません: ${secondMargin}`);
    }
  },
};

export const StartZeroAndNegative: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-ol id="start-zero" style="--space-2: 8px;">
        <ol start="0">
          <li><span data-testid="zero-1">0 から始まる。</span></li>
          <li><span data-testid="zero-2">1 へ進む。</span></li>
        </ol>
      </ui-ol>

      <ui-ol id="start-negative" style="--space-2: 8px;">
        <ol start="-1">
          <li><span data-testid="negative-1">-1 から始まる。</span></li>
          <li><span data-testid="negative-2">0 へ進む。</span></li>
        </ol>
      </ui-ol>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const zeroHost = getHost(canvasElement, 'start-zero');
    const negativeHost = getHost(canvasElement, 'start-negative');
    await Promise.all([zeroHost.updateComplete, negativeHost.updateComplete]);

    const zeroList = getDirectList(zeroHost);
    const negativeList = getDirectList(negativeHost);
    expectMarkerSequence(zeroList, [0, 1]);
    expectMarkerSequence(negativeList, [-1, 0]);

    expectAlignment([
      getElement(zeroList, '[data-testid="zero-1"]'),
      getElement(zeroList, '[data-testid="zero-2"]'),
    ]);
    expectAlignment([
      getElement(negativeList, '[data-testid="negative-1"]'),
      getElement(negativeList, '[data-testid="negative-2"]'),
    ]);
  },
};

export const StartAndValueJump: Story = {
  render: () => html`
    <ui-ol id="start-value-jump" style="--space-2: 8px;">
      <ol start="9">
        <li><span data-testid="jump-9">9。</span></li>
        <li><span data-testid="jump-10">10。</span></li>
        <li value="99"><span data-testid="jump-99">99。</span></li>
        <li><span data-testid="jump-100">100。</span></li>
        <li value="-3"><span data-testid="jump-neg3">-3。</span></li>
        <li><span data-testid="jump-neg2">-2。</span></li>
      </ol>
    </ui-ol>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'start-value-jump');
    await host.updateComplete;

    const list = getDirectList(host);
    expectMarkerSequence(list, [9, 10, 99, 100, -3, -2]);

    expectAlignment([
      getElement(list, '[data-testid="jump-9"]'),
      getElement(list, '[data-testid="jump-10"]'),
      getElement(list, '[data-testid="jump-99"]'),
      getElement(list, '[data-testid="jump-100"]'),
      getElement(list, '[data-testid="jump-neg3"]'),
      getElement(list, '[data-testid="jump-neg2"]'),
    ]);
  },
};

export const Reversed: Story = {
  render: () => html`
    <ui-ol id="reversed-only" style="--space-2: 8px;">
      <ol reversed>
        <li><span data-testid="reversed-3">降順 3。</span></li>
        <li><span data-testid="reversed-2">降順 2。</span></li>
        <li><span data-testid="reversed-1">降順 1。</span></li>
      </ol>
    </ui-ol>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'reversed-only');
    await host.updateComplete;

    const list = getDirectList(host);
    expectMarkerSequence(list, [3, 2, 1]);

    expectAlignment([
      getElement(list, '[data-testid="reversed-3"]'),
      getElement(list, '[data-testid="reversed-2"]'),
      getElement(list, '[data-testid="reversed-1"]'),
    ]);
  },
};

export const ReversedWithStartAndValue: Story = {
  render: () => html`
    <ui-ol id="reversed-composite" style="--space-2: 8px;">
      <ol reversed start="5">
        <li><span data-testid="reversed-start-5">5。</span></li>
        <li value="2"><span data-testid="reversed-value-2">2。</span></li>
        <li><span data-testid="reversed-value-1">1。</span></li>
      </ol>
    </ui-ol>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'reversed-composite');
    await host.updateComplete;

    const list = getDirectList(host);
    expectMarkerSequence(list, [5, 2, 1]);

    expectAlignment([
      getElement(list, '[data-testid="reversed-start-5"]'),
      getElement(list, '[data-testid="reversed-value-2"]'),
      getElement(list, '[data-testid="reversed-value-1"]'),
    ]);
  },
};

export const MarkerAlignment: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-ol id="align-9-10">
        <ol start="9">
          <li><span data-testid="a-9">9。</span></li>
          <li><span data-testid="a-10">10。</span></li>
        </ol>
      </ui-ol>

      <ui-ol id="align-99-100">
        <ol start="99">
          <li><span data-testid="a-99">99。</span></li>
          <li><span data-testid="a-100">100。</span></li>
        </ol>
      </ui-ol>

      <ui-ol id="align-999-1000">
        <ol start="999">
          <li><span data-testid="a-999">999。</span></li>
          <li><span data-testid="a-1000">1000。</span></li>
        </ol>
      </ui-ol>

      <ui-ol id="align-neg1-0">
        <ol start="-1">
          <li><span data-testid="a-neg1">-1。</span></li>
          <li><span data-testid="a-0">0。</span></li>
        </ol>
      </ui-ol>

      <ui-ol id="align-0-1">
        <ol start="0">
          <li><span data-testid="a-0b">0。</span></li>
          <li><span data-testid="a-1">1。</span></li>
        </ol>
      </ui-ol>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cases = [
      { hostId: 'align-9-10', markers: [9, 10], anchors: ['[data-testid="a-9"]', '[data-testid="a-10"]'] },
      { hostId: 'align-99-100', markers: [99, 100], anchors: ['[data-testid="a-99"]', '[data-testid="a-100"]'] },
      { hostId: 'align-999-1000', markers: [999, 1000], anchors: ['[data-testid="a-999"]', '[data-testid="a-1000"]'] },
      { hostId: 'align-neg1-0', markers: [-1, 0], anchors: ['[data-testid="a-neg1"]', '[data-testid="a-0"]'] },
      { hostId: 'align-0-1', markers: [0, 1], anchors: ['[data-testid="a-0b"]', '[data-testid="a-1"]'] },
    ] as const;

    for (const testCase of cases) {
      const host = getHost(canvasElement, testCase.hostId);
      await host.updateComplete;

      const list = getDirectList(host);
      const items = getDirectItems(list);
      expectMarkerSequence(list, [...testCase.markers]);

      expectAlignment(testCase.anchors.map((selector) => getElement(list, selector)));

      const columns = items.map((item) => getComputedStyle(item).gridTemplateColumns);
      const [first, ...rest] = columns;
      if (!first) {
        throw new Error(`gridTemplateColumns が取得できません: ${testCase.hostId}`);
      }
      for (const column of rest) {
        if (column !== first) {
          throw new Error(`マーカー列幅が揃っていません: ${columns.join(', ')}`);
        }
      }
    }
  },
};

export const VariantSteps: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
        --fg-muted: rgb(111, 111, 124);
        --primary: rgb(24, 118, 242);
        --space-2: 8px;
      }
    </style>

    <div class="matrix">
      <div id="token-muted-probe" style="color: var(--fg-muted); display: none;"></div>
      <div id="token-primary-probe" style="color: var(--primary); display: none;"></div>

      <ui-ol id="variant-default">
        <ol>
          <li><span data-testid="variant-default-anchor">既定状態。</span></li>
          <li>本文色はそのまま。</li>
        </ol>
      </ui-ol>

      <ui-ol id="variant-steps" variant="steps">
        <ol>
          <li><span data-testid="variant-steps-anchor">手順状態。</span></li>
          <li>本文色はそのまま。</li>
        </ol>
      </ui-ol>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultHost = getHost(canvasElement, 'variant-default');
    const stepsHost = getHost(canvasElement, 'variant-steps');
    await Promise.all([defaultHost.updateComplete, stepsHost.updateComplete]);

    const mutedProbe = getElement(canvasElement, '#token-muted-probe');
    const primaryProbe = getElement(canvasElement, '#token-primary-probe');
    const defaultList = getDirectList(defaultHost);
    const stepsList = getDirectList(stepsHost);
    const defaultItem = getItem(defaultList, 'li:first-child');
    const stepsItem = getItem(stepsList, 'li:first-child');
    const defaultAnchor = getElement(defaultList, '[data-testid="variant-default-anchor"]');
    const stepsAnchor = getElement(stepsList, '[data-testid="variant-steps-anchor"]');

    const defaultMarkerColor = getComputedStyle(defaultItem, '::before').color;
    const stepsMarkerColor = getComputedStyle(stepsItem, '::before').color;
    const expectedMuted = getComputedStyle(mutedProbe).color;
    const expectedPrimary = getComputedStyle(primaryProbe).color;

    if (defaultMarkerColor !== expectedMuted) {
      throw new Error(`default のマーカー色が --fg-muted を追従していません: ${defaultMarkerColor}`);
    }
    if (stepsMarkerColor !== expectedPrimary) {
      throw new Error(`steps のマーカー色が --primary を追従していません: ${stepsMarkerColor}`);
    }

    expectSameTextColor([defaultAnchor, stepsAnchor]);

    const leftDefault = defaultAnchor.getBoundingClientRect().left;
    const leftSteps = stepsAnchor.getBoundingClientRect().left;
    if (Math.abs(leftDefault - leftSteps) > ALLOWED_ALIGNMENT_DELTA) {
      throw new Error(`steps で本文開始位置が変化しています: ${String(leftDefault)} vs ${String(leftSteps)}`);
    }
  },
};

export const NestedOrderedList: Story = {
  render: () => html`
    <ui-ol id="nested-ordered" style="--space-2: 8px;">
      <ol>
        <li><span data-testid="parent-1">親 1。</span></li>
        <li>
          <span data-testid="parent-2">親 2。</span>
          <ol start="9">
            <li><span data-testid="child-9">子 9。</span></li>
            <li><span data-testid="child-10">子 10。</span></li>
          </ol>
        </li>
      </ol>
    </ui-ol>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'nested-ordered');
    await host.updateComplete;

    const rootList = getDirectList(host);
    const nestedList = getElement(rootList, 'li ol') as HTMLOListElement;
    expectMarkerSequence(rootList, [1, 2]);
    expectMarkerSequence(nestedList, [9, 10]);

    expectAlignment([
      getElement(rootList, '[data-testid="parent-1"]'),
      getElement(rootList, '[data-testid="parent-2"]'),
    ]);
    expectAlignment([
      getElement(nestedList, '[data-testid="child-9"]'),
      getElement(nestedList, '[data-testid="child-10"]'),
    ]);
  },
};

export const NestedUnorderedListIsolation: Story = {
  render: () => html`
    <ui-ol id="nested-unordered">
      <ol>
        <li>
          <span data-testid="ordered-anchor">ordered item</span>
          <ul data-testid="nested-ul">
            <li data-testid="unordered-item">unordered item</li>
          </ul>
        </li>
      </ol>
    </ui-ol>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'nested-unordered');
    await host.updateComplete;

    const list = getDirectList(host);
    const orderedItem = getItem(list, 'li');
    const nestedUl = getElement(list, '[data-testid="nested-ul"]') as HTMLUListElement;
    const unorderedItem = getElement(nestedUl, '[data-testid="unordered-item"]') as HTMLLIElement;

    if (getComputedStyle(orderedItem).display !== 'grid') {
      throw new Error('ordered list の項目が grid 整列になっていません');
    }
    if (getComputedStyle(unorderedItem).display === 'grid') {
      throw new Error('unordered list の項目に ordered list 用レイアウトが漏れています');
    }
    if (getComputedStyle(unorderedItem, '::before').content !== 'none') {
      throw new Error('unordered list の項目に ordered list 用マーカーが漏れています');
    }
  },
};

export const StructureViolation: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-ol id="structure-no-root">
        <p data-testid="structure-no-root-text">root ol 不在</p>
      </ui-ol>

      <ui-ol id="structure-multi-root">
        <ol><li>root 1</li></ol>
        <ol><li>root 2</li></ol>
      </ui-ol>

      <ui-ol id="structure-invalid-child">
        <ol>
          <li>valid</li>
          <div data-testid="structure-invalid-non-li">invalid</div>
        </ol>
      </ui-ol>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const noRootHost = getHost(canvasElement, 'structure-no-root');
    const multiRootHost = getHost(canvasElement, 'structure-multi-root');
    const invalidChildHost = getHost(canvasElement, 'structure-invalid-child');
    await Promise.all([
      noRootHost.updateComplete,
      multiRootHost.updateComplete,
      invalidChildHost.updateComplete,
    ]);

    if (getDirectLists(noRootHost).length !== 0) {
      throw new Error('root <ol> 不在ケースが自動正規化されています');
    }
    if (!noRootHost.querySelector('[data-testid="structure-no-root-text"]')) {
      throw new Error('構造違反入力の観測対象が失われています');
    }

    if (getDirectLists(multiRootHost).length !== 2) {
      throw new Error('複数 root <ol> の構造が変化しています');
    }

    const invalidList = getDirectList(invalidChildHost);
    const invalidChild = getElement(invalidList, '[data-testid="structure-invalid-non-li"]') as HTMLDivElement;
    if (!(invalidChild.parentElement instanceof HTMLOListElement)) {
      throw new Error('非正規な non-li 子要素が移動しています');
    }
  },
};

export const EnvironmentContracts: Story = {
  render: () => html`
    <style>
      .surface {
        display: grid;
        gap: 1rem;
        padding: 1rem;
        border-radius: 12px;
        background: oklch(18% 0.02 250);
        color: oklch(92% 0.01 250);
        --space-2: 8px;
        --fg-muted: oklch(74% 0.01 250);
        --primary: oklch(72% 0.17 256);
      }

      .touch-link,
      .touch-button {
        display: inline-flex;
        align-items: center;
      }
    </style>

    <div class="surface">
      <div id="env-muted-probe" style="color: var(--fg-muted); display: none;"></div>
      <div id="env-primary-probe" style="color: var(--primary); display: none;"></div>

      <ui-ol id="env-default">
        <ol>
          <li><span data-testid="env-default-anchor">暗色面でも本文を優先する。</span></li>
          <li><a class="touch-link" href="#detail">詳細を読む</a></li>
        </ol>
      </ui-ol>

      <ui-ol id="env-steps" variant="steps">
        <ol>
          <li><span data-testid="env-steps-anchor">steps でも本文色は変えない。</span></li>
          <li><button class="touch-button" type="button">次へ進む</button></li>
        </ol>
      </ui-ol>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultHost = getHost(canvasElement, 'env-default');
    const stepsHost = getHost(canvasElement, 'env-steps');
    await Promise.all([defaultHost.updateComplete, stepsHost.updateComplete]);

    const defaultList = getDirectList(defaultHost);
    const stepsList = getDirectList(stepsHost);
    const defaultItem = getItem(defaultList, 'li:first-child');
    const stepsItem = getItem(stepsList, 'li:first-child');
    const defaultAnchor = getElement(defaultList, '[data-testid="env-default-anchor"]');
    const stepsAnchor = getElement(stepsList, '[data-testid="env-steps-anchor"]');
    const mutedProbe = getElement(canvasElement, '#env-muted-probe');
    const primaryProbe = getElement(canvasElement, '#env-primary-probe');
    const link = getElement(defaultList, '.touch-link') as HTMLAnchorElement;
    const button = getElement(stepsList, '.touch-button') as HTMLButtonElement;

    const defaultMarkerColor = getComputedStyle(defaultItem, '::before').color;
    const stepsMarkerColor = getComputedStyle(stepsItem, '::before').color;
    if (defaultMarkerColor !== getComputedStyle(mutedProbe).color) {
      throw new Error('default のマーカー色が暗色面トークンを追従していません');
    }
    if (stepsMarkerColor !== getComputedStyle(primaryProbe).color) {
      throw new Error('steps のマーカー色が暗色面トークンを追従していません');
    }

    expectSameTextColor([defaultAnchor, stepsAnchor]);

    const defaultLeft = defaultAnchor.getBoundingClientRect().left;
    const stepsLeft = stepsAnchor.getBoundingClientRect().left;
    if (Math.abs(defaultLeft - stepsLeft) > ALLOWED_ALIGNMENT_DELTA) {
      throw new Error(`環境差し替えで本文開始位置が崩れています: ${String(defaultLeft)} vs ${String(stepsLeft)}`);
    }

    const linkAfterWidth = Number.parseFloat(getComputedStyle(link, '::after').width);
    const buttonAfterHeight = Number.parseFloat(getComputedStyle(button, '::after').height);
    if (!(linkAfterWidth >= 24)) {
      throw new Error(`リンクの補助 hit area 幅が不足しています: ${String(linkAfterWidth)}px`);
    }
    if (!(buttonAfterHeight >= 24)) {
      throw new Error(`ボタンの補助 hit area 高さが不足しています: ${String(buttonAfterHeight)}px`);
    }
  },
};
