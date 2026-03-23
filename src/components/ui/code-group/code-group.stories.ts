import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './code-group';
import { CodeGroup } from './code-group';
import '../codeblock/codeblock';
import type { CopyButton } from '../copy-button/copy-button';

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const waitMicrotask = async (): Promise<void> =>
  new Promise((resolve) => {
    queueMicrotask(() => {
      resolve();
    });
  });

const getGroup = (canvasElement: Element, id: string): CodeGroup => {
  const group = canvasElement.querySelector<CodeGroup>(`#${id}`);
  if (!group) throw new Error(`ui-code-group#${id} が見つかりません`);
  return group;
};

const getTabs = (group: CodeGroup): HTMLButtonElement[] =>
  Array.from(group.querySelectorAll<HTMLButtonElement>('button[slot="tab"]'));

const getPanels = (group: CodeGroup): HTMLElement[] =>
  Array.from(group.querySelectorAll<HTMLElement>('ui-code-block[slot="panel"]'));

const getTabList = (group: CodeGroup): HTMLElement => {
  const tabList = group.shadowRoot?.querySelector<HTMLElement>('.tab-list');
  if (!tabList) throw new Error('tab-list が見つかりません');
  return tabList;
};

const getCopyButton = (group: CodeGroup): CopyButton => {
  const copyButton = group.shadowRoot?.querySelector<CopyButton>('ui-copy-button');
  if (!copyButton) throw new Error('ui-copy-button が見つかりません');
  return copyButton;
};

const readCssText = (styles: unknown): string => {
  if (Array.isArray(styles)) {
    return styles.map((style) => readCssText(style)).join('\n');
  }
  if (styles && typeof styles === 'object' && 'cssText' in styles) {
    const cssText = styles.cssText;
    if (typeof cssText === 'string') return cssText;
  }
  return '';
};

const dispatchTabKey = (target: HTMLElement, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  target.dispatchEvent(event);
  return event;
};

const meta: Meta<CodeGroup> = {
  title: 'Components/Code Group',
  component: 'ui-code-group',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
\`ui-code-group\` は複数の \`ui-code-block\` を stable key ベースで比較表示するコンポーネントです。

## このストーリーで検証する観点
- \`group-key\` による選択状態の安定化
- \`selected-value\` / \`default-selected-value\` の制御契約
- \`activation="auto"\` / \`activation="manual"\` の差異
- \`tab-label\` / \`copy-label\` / \`filename\` / \`lang\` の解決順序
- duplicate key / 無関係要素混在 / child 1件時の退行
- \`ui-code-group-change\` の detail 契約
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<CodeGroup>;

export const UncontrolledComparison: Story = {
  render: () => html`
    <ui-code-group id="uncontrolled-group" aria-label="実装比較" default-selected-value="react">
      <ui-code-block
        group-key="react"
        tab-label="React"
        copy-label="React 実装"
        filename="button.react.tsx"
        lang="tsx"
      >
        <pre><code>export function Button() { return &lt;button&gt;React&lt;/button&gt;; }</code></pre>
      </ui-code-block>
      <ui-code-block
        group-key="lit"
        tab-label="Lit"
        copy-label="Lit 実装"
        filename="button.lit.ts"
        lang="ts"
      >
        <pre><code>export class UIButton extends LitElement {}</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'uncontrolled-group');
    await group.updateComplete;
    await waitFrame();

    if (!group.hasAttribute('data-ready')) {
      throw new Error('比較成立時に data-ready が付与されていません');
    }

    const tabs = getTabs(group);
    const panels = getPanels(group);
    if (tabs.length !== 2 || panels.length !== 2) {
      throw new Error(
        `タブ/パネル数が不正です: tabs=${String(tabs.length)} panels=${String(panels.length)}`,
      );
    }

    const reactTab = tabs[0];
    const litTab = tabs[1];
    const reactPanel = panels[0];
    const litPanel = panels[1];
    if (!reactTab || !litTab || !reactPanel || !litPanel) {
      throw new Error('比較ストーリーの必須要素が不足しています');
    }

    if (reactTab.textContent?.trim() !== 'React') {
      throw new Error('1つ目のタブラベルが tab-label から解決されていません');
    }
    if (litTab.textContent?.trim() !== 'Lit') {
      throw new Error('2つ目のタブラベルが tab-label から解決されていません');
    }
    if (reactTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('default-selected-value が初期選択に反映されていません');
    }
    if (!litPanel.hasAttribute('hidden')) {
      throw new Error('非アクティブパネルが hidden になっていません');
    }

    const copyButton = getCopyButton(group);
    if (`${copyButton.label}` !== 'React 実装 のコードをコピー') {
      throw new Error(`copy-label がコピー文脈に反映されていません: "${copyButton.label}"`);
    }

    litTab.click();
    await group.updateComplete;
    await waitFrame();

    if (litTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('uncontrolled mode で選択状態が更新されていません');
    }
    if (`${copyButton.label}` !== 'Lit 実装 のコードをコピー') {
      throw new Error(`タブ切り替え後のコピー文脈が不正です: "${copyButton.label}"`);
    }
  },
};

export const ControlledSelection: Story = {
  render: () => html`
    <ui-code-group id="controlled-group" aria-label="制御モード検証" selected-value="lit">
      <ui-code-block group-key="react" tab-label="React" filename="react.tsx" lang="tsx">
        <pre><code>export const react = true;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="lit" tab-label="Lit" filename="lit.ts" lang="ts">
        <pre><code>export const lit = true;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'controlled-group');
    await group.updateComplete;
    await waitFrame();

    const tabs = getTabs(group);
    const reactTab = tabs[0];
    const litTab = tabs[1];
    if (!reactTab || !litTab) throw new Error('controlled mode のタブが不足しています');

    if (litTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('selected-value の初期反映が不正です');
    }

    const events: Array<Record<string, unknown>> = [];
    group.addEventListener('ui-code-group-change', ((event: Event) => {
      const customEvent = event as CustomEvent<Record<string, unknown>>;
      events.push(customEvent.detail);
    }) as EventListener);

    reactTab.click();
    await waitMicrotask();

    if (litTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('controlled mode で外部更新前に選択が変わっています');
    }

    const firstEvent = events[0];
    if (!firstEvent) {
      throw new Error('controlled mode の選択要求イベントが発火していません');
    }
    if (firstEvent['value'] !== 'react' || firstEvent['prevValue'] !== 'lit') {
      throw new Error(`イベント detail が不正です: ${JSON.stringify(firstEvent)}`);
    }
    if (firstEvent['userInitiated'] !== true) {
      throw new Error('ユーザー操作イベントの userInitiated が true ではありません');
    }

    group.selectedValue = 'react';
    await group.updateComplete;
    await waitFrame();

    if (reactTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('外部更新後に選択が同期されていません');
    }
  },
};

export const ManualActivationContract: Story = {
  render: () => html`
    <ui-code-group id="manual-group" aria-label="手動アクティベーション検証" activation="manual">
      <ui-code-block group-key="alpha" tab-label="Alpha" filename="alpha.ts">
        <pre><code>const alpha = 1;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="beta" tab-label="Beta" filename="beta.ts">
        <pre><code>const beta = 2;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="gamma" tab-label="Gamma" filename="gamma.ts">
        <pre><code>const gamma = 3;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'manual-group');
    await group.updateComplete;
    await waitFrame();

    const tabs = getTabs(group);
    const firstTab = tabs[0];
    const secondTab = tabs[1];
    if (!firstTab || !secondTab) throw new Error('manual mode のタブが不足しています');

    firstTab.focus();
    dispatchTabKey(firstTab, 'ArrowRight');
    await group.updateComplete;
    await waitFrame();

    if (firstTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('manual activation で ArrowRight が選択変更を起こしています');
    }
    if (secondTab.tabIndex !== 0) {
      throw new Error('manual activation で roving tabindex が移動していません');
    }

    dispatchTabKey(secondTab, 'Enter');
    await group.updateComplete;
    await waitFrame();

    if (secondTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('manual activation で Enter による確定が機能していません');
    }
  },
};

export const FallbackAndCopyContract: Story = {
  render: () => html`
    <ui-code-group id="fallback-group" aria-label="フォールバック検証">
      <ui-code-block group-key="filename" filename="alpha.ts">
        <pre><code>export const alpha = 1;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="lang" lang="css">
        <pre><code>.item { color: var(--fg-default); }</code></pre>
      </ui-code-block>
      <ui-code-block group-key="copy-label" tab-label="Preview" copy-label="Preview 用コード">
        <pre><code>&lt;button&gt;preview&lt;/button&gt;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'fallback-group');
    await group.updateComplete;
    await waitFrame();

    const tabs = getTabs(group);
    const expected = ['alpha.ts', 'css', 'Preview'];
    expected.forEach((label, index) => {
      const actual = tabs[index]?.textContent?.trim() ?? '';
      if (actual !== label) {
        throw new Error(`タブラベルの解決順が不正です: index=${String(index)} actual="${actual}"`);
      }
    });

    const secondTab = tabs[1];
    const thirdTab = tabs[2];
    if (!secondTab || !thirdTab) throw new Error('フォールバック検証用タブが不足しています');

    secondTab.click();
    await group.updateComplete;
    await waitFrame();

    const copyAfterLang = getCopyButton(group);
    if (copyAfterLang.label !== 'css のコードをコピー') {
      throw new Error(`lang フォールバック時のコピーラベルが不正です: "${copyAfterLang.label}"`);
    }

    thirdTab.click();
    await group.updateComplete;
    await waitFrame();

    const copyAfterExplicit = getCopyButton(group);
    if (copyAfterExplicit.label !== 'Preview 用コード のコードをコピー') {
      throw new Error(`copy-label が優先されていません: "${copyAfterExplicit.label}"`);
    }
  },
};

export const CopyDisabledBoundary: Story = {
  render: () => html`
    <ui-code-group id="copy-disabled-group" aria-label="copyable 検証">
      <ui-code-block group-key="enabled" tab-label="Enabled" filename="enabled.ts">
        <pre><code>const enabled = true;</code></pre>
      </ui-code-block>
      <ui-code-block
        group-key="disabled"
        tab-label="Disabled"
        filename="disabled.ts"
        copyable="false"
      >
        <pre><code>const disabled = true;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'copy-disabled-group');
    await group.updateComplete;
    await waitFrame();

    const tabs = getTabs(group);
    const disabledTab = tabs[1];
    if (!disabledTab) throw new Error('copyable=false のタブが見つかりません');

    disabledTab.click();
    await group.updateComplete;
    await waitFrame();

    const copyButton = getCopyButton(group);
    if (!copyButton.disabled) {
      throw new Error('copyable=false の active item でコピーボタンが disabled になっていません');
    }
  },
};

export const GroupKeyPersistence: Story = {
  render: () => html`
    <ui-code-group id="persistence-group" aria-label="groupKey 再解決">
      <ui-code-block group-key="one" tab-label="One" filename="one.ts">
        <pre><code>const one = 1;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="two" tab-label="Two" filename="two.ts">
        <pre><code>const two = 2;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="three" tab-label="Three" filename="three.ts">
        <pre><code>const three = 3;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'persistence-group');
    await group.updateComplete;
    await waitFrame();

    const initialTabs = getTabs(group);
    const secondTab = initialTabs[1];
    if (!secondTab) throw new Error('初期 2 番目のタブが見つかりません');

    secondTab.click();
    await group.updateComplete;
    await waitFrame();

    const firstPanel = getPanels(group)[0];
    const secondPanel = getPanels(group)[1];
    if (!firstPanel || !secondPanel) throw new Error('再配置対象パネルが不足しています');

    group.insertBefore(secondPanel, firstPanel);
    await group.updateComplete;
    await waitFrame();

    const reorderedTabs = getTabs(group);
    const firstAfterReorder = reorderedTabs[0];
    if (!firstAfterReorder) throw new Error('再配置後タブが見つかりません');
    if (firstAfterReorder.textContent?.trim() !== 'Two') {
      throw new Error('groupKey ベースで再解決されていません');
    }
    if (firstAfterReorder.getAttribute('aria-selected') !== 'true') {
      throw new Error('再配置後に選択状態が維持されていません');
    }
  },
};

export const DuplicateKeyBoundary: Story = {
  render: () => html`
    <ui-code-group id="duplicate-group" aria-label="duplicate key 検証">
      <ui-code-block group-key="same" tab-label="Alpha" filename="alpha.ts">
        <pre><code>const alpha = 1;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="same" tab-label="Beta" filename="beta.ts">
        <pre><code>const beta = 2;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'duplicate-group');
    await group.updateComplete;
    await waitFrame();

    if (group.hasAttribute('data-ready')) {
      throw new Error('duplicate key で比較 UI が成立しています');
    }
    if (getTabs(group).length !== 0) {
      throw new Error('duplicate key でタブが生成されています');
    }
  },
};

export const SingleItemFallback: Story = {
  render: () => html`
    <ui-code-group id="single-group" aria-label="single item fallback">
      <ui-code-block group-key="single" tab-label="Only" filename="only.ts">
        <pre><code>const only = true;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'single-group');
    await group.updateComplete;
    await waitFrame();

    if (group.hasAttribute('data-ready')) {
      throw new Error('child 1 件で比較 UI が成立しています');
    }
    if (getTabs(group).length !== 0) {
      throw new Error('child 1 件でタブが生成されています');
    }

    const block = group.querySelector('ui-code-block');
    if (!block || block.getAttribute('slot') === 'panel') {
      throw new Error('単一表示への退行で light DOM の表示が維持されていません');
    }
  },
};

export const MixedChildrenBoundary: Story = {
  render: () => html`
    <ui-code-group id="mixed-group" aria-label="mixed children boundary">
      <ui-code-block group-key="one" tab-label="One" filename="one.ts">
        <pre><code>const one = 1;</code></pre>
      </ui-code-block>
      <p id="mixed-note">余計な要素</p>
      <ui-code-block group-key="two" tab-label="Two" filename="two.ts">
        <pre><code>const two = 2;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'mixed-group');
    await group.updateComplete;
    await waitFrame();

    if (group.hasAttribute('data-ready')) {
      throw new Error('無関係要素混在で比較 UI が成立しています');
    }

    const note = group.querySelector('#mixed-note');
    if (!note) {
      throw new Error('無関係要素混在時に fallback content が消失しています');
    }
  },
};

export const KeyboardContract: Story = {
  render: () => html`
    <ui-code-group id="keyboard-group" aria-label="keyboard contract">
      <ui-code-block group-key="one" tab-label="One" filename="one.ts">
        <pre><code>const one = 1;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="two" tab-label="Two" filename="two.ts">
        <pre><code>const two = 2;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="three" tab-label="Three" filename="three.ts">
        <pre><code>const three = 3;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'keyboard-group');
    await group.updateComplete;
    await waitFrame();

    const tabs = getTabs(group);
    const firstTab = tabs[0];
    const secondTab = tabs[1];
    const thirdTab = tabs[2];
    if (!firstTab || !secondTab || !thirdTab) {
      throw new Error('キーボード検証用タブが不足しています');
    }

    firstTab.focus();
    dispatchTabKey(firstTab, 'ArrowRight');
    await group.updateComplete;
    await waitFrame();
    if (secondTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('activation=auto で ArrowRight が選択変更を起こしていません');
    }

    dispatchTabKey(secondTab, 'End');
    await group.updateComplete;
    await waitFrame();
    if (thirdTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('End キーで最終タブへ移動していません');
    }

    const tabEvent = dispatchTabKey(thirdTab, 'Tab');
    await waitMicrotask();
    if (tabEvent.defaultPrevented) {
      throw new Error('Tab キーが抑止されています');
    }
  },
};

export const ScrollCompensationContract: Story = {
  render: () => html`
    <div style="width: 320px;">
      <ui-code-group id="overflow-group" style="--header-tools-width: 120px;">
        <ui-code-block group-key="01" tab-label="長いタブラベル 01" filename="file-01.ts">
          <pre><code>const v01 = 1;</code></pre>
        </ui-code-block>
        <ui-code-block group-key="02" tab-label="長いタブラベル 02" filename="file-02.ts">
          <pre><code>const v02 = 2;</code></pre>
        </ui-code-block>
        <ui-code-block group-key="03" tab-label="長いタブラベル 03" filename="file-03.ts">
          <pre><code>const v03 = 3;</code></pre>
        </ui-code-block>
        <ui-code-block group-key="04" tab-label="長いタブラベル 04" filename="file-04.ts">
          <pre><code>const v04 = 4;</code></pre>
        </ui-code-block>
        <ui-code-block group-key="05" tab-label="長いタブラベル 05" filename="file-05.ts">
          <pre><code>const v05 = 5;</code></pre>
        </ui-code-block>
        <ui-code-block group-key="06" tab-label="長いタブラベル 06" filename="file-06.ts">
          <pre><code>const v06 = 6;</code></pre>
        </ui-code-block>
      </ui-code-group>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'overflow-group');
    await group.updateComplete;
    await waitFrame();

    const tabList = getTabList(group);
    const tabs = getTabs(group);
    const lastTab = tabs[tabs.length - 1];
    const spacer = group.shadowRoot?.querySelector<HTMLElement>('.tab-list-spacer');
    const headerTools = group.shadowRoot?.querySelector<HTMLElement>('.header-tools');
    if (!lastTab || !spacer || !headerTools) {
      throw new Error('スクロール補償検証用要素が不足しています');
    }

    tabList.scrollLeft = 0;
    lastTab.click();
    await group.updateComplete;
    await waitFrame();

    if (tabList.scrollLeft <= 0) {
      throw new Error('タブ移動後に横スクロールが発生していません');
    }

    const toolsWidth = headerTools.getBoundingClientRect().width;
    const spacerWidth = spacer.getBoundingClientRect().width;
    if (spacerWidth < toolsWidth) {
      throw new Error('header-tools 幅補償用スペーサーが不足しています');
    }
  },
};

export const PrintStyleContract: Story = {
  render: () => html`
    <ui-code-group id="print-group">
      <ui-code-block group-key="a" tab-label="A" filename="a.ts">
        <pre><code>const a = 1;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="b" tab-label="B" filename="b.ts">
        <pre><code>const b = 2;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async () => {
    const cssText = readCssText(CodeGroup.styles);
    const requiredTokens = [
      '@media print',
      'border-color: #000 !important',
      '.code-group-header',
      '.header-tools',
      'display: none !important',
      "[slot='panel'][hidden]",
      'display: block !important',
      'margin-block-start: var(--space-4, 1rem)',
    ];

    for (const token of requiredTokens) {
      if (!cssText.includes(token)) {
        throw new Error(`印刷スタイル契約の定義が不足しています: ${token}`);
      }
    }
  },
};

export const ForcedColorsContract: Story = {
  render: () => html`
    <ui-code-group id="forced-colors-group">
      <ui-code-block group-key="one" tab-label="One" filename="one.ts">
        <pre><code>const one = 1;</code></pre>
      </ui-code-block>
      <ui-code-block group-key="two" tab-label="Two" filename="two.ts">
        <pre><code>const two = 2;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async () => {
    const cssText = readCssText(CodeGroup.styles);
    const requiredTokens = [
      '@media (forced-colors: active)',
      'border-color: CanvasText',
      'background: Canvas',
      'CanvasText',
      'border-bottom-color: CanvasText !important',
    ];

    for (const token of requiredTokens) {
      if (!cssText.includes(token)) {
        throw new Error(`forced-colors 契約の定義が不足しています: ${token}`);
      }
    }
  },
};
