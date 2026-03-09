import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { userEvent } from 'storybook/test';
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

const getHeaderTools = (group: CodeGroup): HTMLElement => {
  const tools = group.shadowRoot?.querySelector<HTMLElement>('.header-tools');
  if (!tools) throw new Error('header-tools が見つかりません');
  return tools;
};

const getCopyButton = (group: CodeGroup): CopyButton => {
  const copyButton = group.shadowRoot?.querySelector<CopyButton>('ui-copy-button');
  if (!copyButton) throw new Error('ui-copy-button が見つかりません');
  return copyButton;
};

const getBody = (group: CodeGroup): HTMLElement => {
  const body = group.shadowRoot?.querySelector<HTMLElement>('.body');
  if (!body) throw new Error('body が見つかりません');
  return body;
};

const getCopyFocusable = (group: CodeGroup): HTMLElement => {
  const copyButton = getCopyButton(group);
  const uiButton = copyButton.shadowRoot?.querySelector<HTMLElement>('ui-button');
  if (!uiButton) throw new Error('ui-copy-button 内の ui-button が見つかりません');

  const innerNativeButton = uiButton.shadowRoot?.querySelector<HTMLButtonElement>('button');
  return innerNativeButton ?? uiButton;
};

const dispatchTabKey = (target: HTMLElement, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
};

// タスクキューの次のマイクロタスクまで待機するユーティリティ。
const waitMicrotask = async (): Promise<void> =>
  new Promise((resolve) => {
    queueMicrotask(() => {
      resolve();
    });
  });

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

const meta: Meta<CodeGroup> = {
  title: 'Components/Code Group',
  component: 'ui-code-group',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
コードグループコンポーネントです。複数の \`ui-code-block\` を 1 つの比較可能なタブUIとして統合します。

## このストーリーで検証する観点
- 正誤比較（\`正しい例\` / \`誤り例\`）と \`intent\` の整合
- \`label\` 未指定時のフォールバック契約（\`filename\` > \`lang\` > \`"コード"\`）
- 横スクロール時の \`scrollIntoView + header-tools 幅補正\`
- コピー操作の文脈分離（タブ切り替え後に旧結果を持ち越さない）
- テーマトークン追従（Dark想定）と \`forced-colors\` フォールバック定義
- モバイルでのメタデータ移送（groupヘッダー非表示 + blockヘッダー復帰）
- 子要素ゼロ時の安全な退行（\`data-ready\` を付与しない）
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<CodeGroup>;

/**
 * 正誤比較の代表ケース。
 * ラベル・intent・copy文脈の同期を検証します。
 */
export const ComparisonPair: Story = {
  render: () => html`
    <ui-code-group id="comparison-group" aria-label="コード例の比較">
      <ui-code-block label="正しい例" intent="valid" filename="good.ts" lang="ts">
        <pre><code>export const total = (a: number, b: number): number => a + b;</code></pre>
      </ui-code-block>

      <ui-code-block label="誤り例" intent="invalid" filename="bad.ts" lang="ts">
        <pre><code>export const total = (a: number, b: number) => a + ;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'comparison-group');
    await group.updateComplete;
    await waitFrame();

    if (!group.hasAttribute('data-ready')) {
      throw new Error('初期化後に data-ready が付与されていません');
    }

    const tabs = getTabs(group);
    const panels = getPanels(group);
    if (tabs.length !== 2 || panels.length !== 2) {
      throw new Error(`タブ/パネル数が想定外です: tabs=${String(tabs.length)} panels=${String(panels.length)}`);
    }
    const firstTab = tabs[0];
    const secondTab = tabs[1];
    const firstPanel = panels[0];
    const secondPanel = panels[1];
    if (!firstTab || !secondTab || !firstPanel || !secondPanel) {
      throw new Error('比較ストーリーの必須要素が不足しています');
    }

    if (firstTab.textContent.trim() !== '正しい例') {
      throw new Error('1つ目のタブラベルが「正しい例」ではありません');
    }
    if (secondTab.textContent.trim() !== '誤り例') {
      throw new Error('2つ目のタブラベルが「誤り例」ではありません');
    }

    if (firstTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('初期アクティブタブが不正です');
    }
    if (!secondPanel.hasAttribute('hidden')) {
      throw new Error('非アクティブパネルが hidden になっていません');
    }
    if (firstPanel.getAttribute('role') !== 'tabpanel') {
      throw new Error('パネルに role="tabpanel" が付与されていません');
    }
    if (firstPanel.hasAttribute('aria-roledescription')) {
      throw new Error('aria-roledescription は通常時に付与しない想定です');
    }
    if (!firstPanel.hasAttribute('headless')) {
      throw new Error('配下の ui-code-block に headless が付与されていません');
    }

    const headerMetaBefore = group.shadowRoot?.querySelector<HTMLElement>('.header-meta');
    if (headerMetaBefore) {
      throw new Error('header-meta はレンダリングしてはいけません');
    }

    const firstPre = firstPanel.querySelector('pre');
    if (!firstPre) throw new Error('1つ目のパネルの pre が見つかりません');
    if (getComputedStyle(firstPre).backgroundColor !== 'rgba(0, 0, 0, 0)') {
      throw new Error('code-group の body 内では、スロットされた pre の背景は透明（transparent）でなければなりません');
    }

    const copyButtonBefore = getCopyButton(group);
    if (copyButtonBefore.label !== 'good.ts のコードをコピー') {
      throw new Error(`コピーラベルが不正です: "${copyButtonBefore.label}"`);
    }

    secondTab.click();
    await group.updateComplete;
    await waitFrame();

    if (secondTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('タブ切り替え後の選択状態が不正です');
    }
    if (!firstPanel.hasAttribute('hidden') || secondPanel.hasAttribute('hidden')) {
      throw new Error('タブ切り替え後の hidden 制御が不正です');
    }
    const headerMetaAfter = group.shadowRoot?.querySelector<HTMLElement>('.header-meta');
    if (headerMetaAfter) {
      throw new Error('タブ切り替え後も header-meta は非表示のままでなければなりません');
    }

    const copyButtonAfter = getCopyButton(group);
    if (copyButtonAfter.label !== 'bad.ts のコードをコピー') {
      throw new Error(`切り替え後コピーラベルが不正です: "${copyButtonAfter.label}"`);
    }

    firstTab.click();
    await group.updateComplete;
    await waitFrame();

    if (firstTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('ストーリー終了時に初期タブへ復帰していません');
    }
  },
};

/**
 * ラベルフォールバック契約の境界。
 * filename > lang > "コード" を検証します。
 */
export const LabelFallbackContract: Story = {
  render: () => html`
    <ui-code-group id="fallback-group">
      <ui-code-block filename="alpha.ts">
        <pre><code>export const alpha = 1;</code></pre>
      </ui-code-block>

      <ui-code-block lang="css">
        <pre><code>.item { color: var(--fg-default); }</code></pre>
      </ui-code-block>

      <ui-code-block>
        <pre><code>plain text fallback</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'fallback-group');
    await group.updateComplete;
    await waitFrame();

    const tabs = getTabs(group);
    if (tabs.length !== 3) {
      throw new Error(`タブ数が不正です: ${String(tabs.length)}`);
    }

    const tabTexts = tabs.map((tab) => tab.textContent.trim());
    const expected = ['alpha.ts', 'css', 'コード'];
    expected.forEach((label, index) => {
      const actual = tabTexts[index] ?? '';
      if (actual !== label) {
        throw new Error(`フォールバック順序が不正です。index=${String(index)} expected="${label}" actual="${actual}"`);
      }
    });

    const secondTab = tabs[1];
    const thirdTab = tabs[2];
    if (!secondTab || !thirdTab) {
      throw new Error('フォールバックストーリーの必須タブが不足しています');
    }

    secondTab.click();
    await group.updateComplete;
    await waitFrame();

    const copy1 = getCopyButton(group);
    if (copy1.label !== 'css のコードをコピー') {
      throw new Error(`lang フォールバック時のコピーラベルが不正です: "${copy1.label}"`);
    }

    thirdTab.click();
    await group.updateComplete;
    await waitFrame();

    const copy2 = getCopyButton(group);
    if (copy2.label !== 'コードをコピー') {
      throw new Error(`最終フォールバック時のコピーラベルが不正です: "${copy2.label}"`);
    }
  },
};

/**
 * 横スクロール境界。
 * 右端タブへの移動時に header-tools 幅ぶん可視域補正されることを検証します。
 */
export const OverflowAndCompensation: Story = {
  render: () => html`
    <div style="width: 320px;">
      <ui-code-group
        id="overflow-group"
        style="--header-tools-width: 120px;"
      >
        <ui-code-block label="長いタブラベル 01" filename="file-01.ts">
          <pre><code>const v01 = 1;</code></pre>
        </ui-code-block>
        <ui-code-block label="長いタブラベル 02" filename="file-02.ts">
          <pre><code>const v02 = 2;</code></pre>
        </ui-code-block>
        <ui-code-block label="長いタブラベル 03" filename="file-03.ts">
          <pre><code>const v03 = 3;</code></pre>
        </ui-code-block>
        <ui-code-block label="長いタブラベル 04" filename="file-04.ts">
          <pre><code>const v04 = 4;</code></pre>
        </ui-code-block>
        <ui-code-block label="長いタブラベル 05" filename="file-05.ts">
          <pre><code>const v05 = 5;</code></pre>
        </ui-code-block>
        <ui-code-block label="長いタブラベル 06" filename="file-06.ts">
          <pre><code>const v06 = 6;</code></pre>
        </ui-code-block>
      </ui-code-group>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'overflow-group');
    await group.updateComplete;
    await waitFrame();

    const tabs = getTabs(group);
    const tabList = getTabList(group);
    const headerTools = getHeaderTools(group);
    const spacer = group.shadowRoot?.querySelector<HTMLElement>('.tab-list-spacer');
    const lastTab = tabs[tabs.length - 1];
    if (!lastTab) throw new Error('最終タブが見つかりません');
    if (!spacer) throw new Error('補償用スペーサーが見つかりません');

    tabList.scrollLeft = 0;
    lastTab.click();
    await group.updateComplete;
    await waitFrame();

    if (tabList.scrollLeft <= 0) {
      throw new Error('タブ移動後に横スクロールが発生していません');
    }

    const tabListRect = tabList.getBoundingClientRect();
    const lastTabRect = lastTab.getBoundingClientRect();
    const toolsWidth = headerTools.getBoundingClientRect().width;
    const spacerWidth = spacer.getBoundingClientRect().width;

    if (lastTabRect.right > tabListRect.right + 1) {
      throw new Error('アクティブタブが可視領域からはみ出しています');
    }
    if (spacerWidth < toolsWidth) {
      throw new Error('header-tools 幅補償用スペーサーが不足しています');
    }
  },
};

/**
 * コピー状態分離の境界。
 * 旧タブで開始したコピー結果が、新タブのボタン状態を上書きしないことを検証します。
 */
export const CopyStateIsolation: Story = {
  render: () => html`
    <ui-code-group id="copy-isolation-group">
      <ui-code-block label="First" filename="first.ts">
        <pre><code>const source = 'first';</code></pre>
      </ui-code-block>

      <ui-code-block label="Second" filename="second.ts">
        <pre><code>const source = 'second';</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'copy-isolation-group');
    await group.updateComplete;
    await waitFrame();

    const tabs = getTabs(group);
    const secondTab = tabs[1];
    if (!secondTab) throw new Error('2つ目のタブが見つかりません');

    const originalClipboard = navigator.clipboard;
    let copyCallCount = 0;
    const fakeClipboard = {
      writeText: (_value: string): Promise<void> =>
        new Promise((resolve) => {
          copyCallCount += 1;
          setTimeout(() => {
            resolve();
          }, 120);
        }),
    };

    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: fakeClipboard,
      });

      const copyFocusableBeforeSwitch = getCopyFocusable(group);
      await userEvent.click(copyFocusableBeforeSwitch);

      secondTab.click();
      await group.updateComplete;
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 220);
      });
      await waitFrame();

      const copyAfterSwitch = getCopyButton(group);

      if (copyAfterSwitch.getAttribute('state') !== 'idle') {
        throw new Error('タブ切り替え後のコピーボタン状態が idle に維持されていません');
      }
      if (copyCallCount !== 1) {
        throw new Error(`コピー処理の呼び出し回数が不正です: ${String(copyCallCount)}`);
      }

      if (copyAfterSwitch.label !== 'second.ts のコードをコピー') {
        throw new Error(`タブ切り替え後のコピーボタンラベルが不正です: "${copyAfterSwitch.label}"`);
      }
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    }
  },
};

/**
 * 子要素追加/削除の同期。
 * childList 変化時にタブ構成と data-ready が破綻しないことを検証します。
 */
export const ChildListMutationSync: Story = {
  render: () => html`
    <ui-code-group id="child-list-mutation-group">
      <ui-code-block label="One" filename="one.ts">
        <pre><code>const one = 1;</code></pre>
      </ui-code-block>
      <ui-code-block label="Two" filename="two.ts">
        <pre><code>const two = 2;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'child-list-mutation-group');
    await group.updateComplete;
    await waitFrame();

    if (getTabs(group).length !== 2) {
      throw new Error('初期タブ数が不正です');
    }

    const appended = document.createElement('ui-code-block');
    appended.setAttribute('label', 'Three');
    appended.setAttribute('filename', 'three.ts');
    appended.innerHTML = '<pre><code>const three = 3;</code></pre>';
    group.append(appended);
    await group.updateComplete;
    await waitFrame();

    const tabsAfterAppend = getTabs(group);
    if (tabsAfterAppend.length !== 3) {
      throw new Error(`子要素追加後のタブ数が不正です: ${String(tabsAfterAppend.length)}`);
    }
    const thirdTab = tabsAfterAppend[2];
    if (thirdTab?.textContent.trim() !== 'Three') {
      throw new Error('追加した子要素のタブが正しく生成されていません');
    }

    const firstPanel = getPanels(group)[0];
    if (!firstPanel) throw new Error('削除対象の先頭パネルが見つかりません');
    firstPanel.remove();
    await group.updateComplete;
    await waitFrame();

    const tabsAfterRemove = getTabs(group);
    if (tabsAfterRemove.length !== 2) {
      throw new Error(`子要素削除後のタブ数が不正です: ${String(tabsAfterRemove.length)}`);
    }
    const firstTabAfterRemove = tabsAfterRemove[0];
    if (firstTabAfterRemove?.textContent.trim() !== 'Two') {
      throw new Error('子要素削除後のタブ再構成が不正です');
    }

    const remainingPanels = getPanels(group);
    remainingPanels.forEach((panel) => {
      panel.remove();
    });
    await group.updateComplete;
    await waitFrame();

    if (group.hasAttribute('data-ready')) {
      throw new Error('子要素全削除後に data-ready が残存しています');
    }
    if (getTabs(group).length !== 0) {
      throw new Error('子要素全削除後にタブが残存しています');
    }
  },
};

/**
 * 子要素属性変更の同期。
 * label / intent 更新後にタブ表示とヘッダー情報が追従することを検証します。
 */
export const ChildAttributeMutationSync: Story = {
  render: () => html`
    <ui-code-group id="mutation-group">
      <ui-code-block label="初期ラベル" filename="alpha.ts" intent="neutral">
        <pre><code>const alpha = 1;</code></pre>
      </ui-code-block>
      <ui-code-block filename="beta.ts" intent="invalid">
        <pre><code>const beta = 2;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'mutation-group');
    await group.updateComplete;
    await waitFrame();

    const panels = getPanels(group);
    const secondPanel = panels[1];
    if (!secondPanel) throw new Error('更新対象の2つ目パネルが見つかりません');

    secondPanel.setAttribute('label', '更新後ラベル');
    secondPanel.setAttribute('intent', 'valid');
    await group.updateComplete;
    await waitFrame();

    const tabs = getTabs(group);
    const secondTab = tabs[1];
    if (!secondTab) throw new Error('更新後の2つ目タブが見つかりません');
    if (secondTab.textContent.trim() !== '更新後ラベル') {
      throw new Error('子属性変更後にタブラベルが更新されていません');
    }

    secondTab.click();
    await group.updateComplete;
    await waitFrame();

  },
};

/**
 * キーボード操作契約。
 * Arrow/Home/End の Follow Focus と Tab キー非抑止を検証します。
 */
export const KeyboardNavigationContract: Story = {
  render: () => html`
    <ui-code-group id="keyboard-group" aria-label="キーボード検証">
      <ui-code-block label="One" filename="one.ts">
        <pre><code>const one = 1;</code></pre>
      </ui-code-block>
      <ui-code-block label="Two" filename="two.ts">
        <pre><code>const two = 2;</code></pre>
      </ui-code-block>
      <ui-code-block label="Three" filename="three.ts">
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
      throw new Error('キーボード検証に必要なタブが不足しています');
    }

    firstTab.focus();
    dispatchTabKey(firstTab, 'ArrowRight');
    await group.updateComplete;
    await waitFrame();
    if (secondTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('ArrowRight で次タブへ Follow Focus しません');
    }

    dispatchTabKey(secondTab, 'End');
    await group.updateComplete;
    await waitFrame();
    if (thirdTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('End で最終タブへ移動しません');
    }

    dispatchTabKey(thirdTab, 'Home');
    await group.updateComplete;
    await waitFrame();
    if (firstTab.getAttribute('aria-selected') !== 'true') {
      throw new Error('Home で先頭タブへ移動しません');
    }

    firstTab.focus();
    await waitFrame();
    const copyFocusable = getCopyFocusable(group);
    if (!(copyFocusable instanceof HTMLElement)) {
      throw new Error('Copy Button のフォーカス対象が取得できません');
    }

    const tabEvent = dispatchTabKey(firstTab, 'Tab');
    await waitMicrotask();
    if (tabEvent.defaultPrevented) {
      throw new Error('Tab キーが抑止されています');
    }
  },
};

/**
 * 印刷スタイル契約。
 * @media print での基本ルールが定義されていることを検証します。
 */
export const PrintStyleContract: Story = {
  render: () => html`
    <ui-code-group id="print-group">
      <ui-code-block label="A" filename="a.ts">
        <pre><code>const a = 1;</code></pre>
      </ui-code-block>
      <ui-code-block label="B" filename="b.ts">
        <pre><code>const b = 2;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'print-group');
    await group.updateComplete;
    await waitFrame();

    const cssText = readCssText(CodeGroup.styles);
    const requiredTokens = [
      '@media print',
      'border-color: #000 !important',
      'page-break-inside: avoid',
      'break-inside: avoid',
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

/**
 * 子要素が存在しない境界。
 * data-ready を付与せず、強制的なタブUI化をしないことを検証します。
 */
export const EmptyGroupBoundary: Story = {
  render: () => html`
    <ui-code-group id="empty-group">
      <p id="empty-content">コードブロック未配置</p>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'empty-group');
    await group.updateComplete;
    await waitFrame();

    if (group.hasAttribute('data-ready')) {
      throw new Error('子コードブロックがない場合に data-ready が付与されています');
    }

    const tabs = getTabs(group);
    if (tabs.length !== 0) {
      throw new Error('子コードブロックがない場合にタブが生成されています');
    }

    const fallbackContent = group.querySelector('#empty-content');
    if (!fallbackContent) {
      throw new Error('フォールバックコンテンツが消失しています');
    }
  },
};

/**
 * テーマトークン追従（Dark想定）の境界。
 * タブ背景が透過で、下線のみが強調されることを検証します。
 */
export const ThemeTokenAdaptation: Story = {
  render: () => html`
    <div
      style="
        color-scheme: dark;
        background: rgb(2 6 23);
        padding: 12px;
        --bg-surface-2: rgb(15 23 42);
        --bg-default: rgb(15 23 42);
        --bg-fill-muted: rgb(10 14 28);
        --fg-default: rgb(226 232 240);
        --fg-muted: rgb(148 163 184);
        --border-default: rgb(71 85 105);
      "
    >
      <ui-code-group id="theme-group">
        <ui-code-block label="One" filename="one.ts">
          <pre><code>const one = 1;</code></pre>
        </ui-code-block>
        <ui-code-block label="Two" filename="two.ts">
          <pre><code>const two = 2;</code></pre>
        </ui-code-block>
      </ui-code-group>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'theme-group');
    await group.updateComplete;
    await waitFrame();

    const tabs = getTabs(group);
    const firstTab = tabs[0];
    if (!firstTab) throw new Error('1つ目のタブが見つかりません');

    const body = getBody(group);
    const tabStyle = getComputedStyle(firstTab);
    const bodyStyle = getComputedStyle(body);
    if (bodyStyle.backgroundColor !== 'rgb(15, 23, 42)') {
      throw new Error('body 背景色が theme token と一致しません');
    }
    if (tabStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      throw new Error('アクティブタブ背景が透過になっていません');
    }
    if (tabStyle.borderBottomColor === 'rgba(0, 0, 0, 0)') {
      throw new Error('アクティブタブ下線が表示されていません');
    }
  },
};

/**
 * 強制カラーモード契約。
 * フォールバック定義が style に存在することを検証します。
 */
export const ForcedColorsContract: Story = {
  render: () => html`
    <ui-code-group id="forced-colors-group">
      <ui-code-block label="One" filename="one.ts">
        <pre><code>const one = 1;</code></pre>
      </ui-code-block>
      <ui-code-block label="Two" filename="two.ts">
        <pre><code>const two = 2;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'forced-colors-group');
    await group.updateComplete;
    await waitFrame();

    const cssText = readCssText(CodeGroup.styles);
    const requiredTokens = [
      '@media (forced-colors: active)',
      'border-color: CanvasText',
      'CanvasText',
      'background: Canvas',
      'border-bottom-color: CanvasText !important',
    ];

    for (const token of requiredTokens) {
      if (!cssText.includes(token)) {
        throw new Error(`forced-colors 契約の定義が不足しています: ${token}`);
      }
    }
  },
};

/**
 * モバイル文脈移送契約。
 * 小画面時に group ヘッダーメタデータを隠し、block ヘッダー表示変数を復帰する定義を検証します。
 */
export const MobileMetadataRelocationContract: Story = {
  render: () => html`
    <ui-code-group id="mobile-relocation-group">
      <ui-code-block label="One" filename="one.ts">
        <pre><code>const one = 1;</code></pre>
      </ui-code-block>
      <ui-code-block label="Two" filename="two.ts">
        <pre><code>const two = 2;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const group = getGroup(canvasElement, 'mobile-relocation-group');
    await group.updateComplete;
    await waitFrame();

    const cssText = readCssText(CodeGroup.styles);
    const requiredTokens = [
      'container-type: inline-size',
      '@container (max-width: 639.98px)',
      '--ui-code-block-header-display: block',
    ];

    for (const token of requiredTokens) {
      if (!cssText.includes(token)) {
        throw new Error(`モバイル文脈移送契約の定義が不足しています: ${token}`);
      }
    }
  },
};

/**
 * 比較ペア不一致の事故境界。
 * intent と label が不一致な場合に警告が出ることを検証します。
 */
export const ComparisonPairMismatchWarning: Story = {
  render: () => html`
    <ui-code-group id="mismatch-group">
      <ui-code-block label="正しい例" intent="valid" filename="good.ts">
        <pre><code>export const ok = true;</code></pre>
      </ui-code-block>
      <ui-code-block label="誤り例" intent="invalid" filename="bad.ts">
        <pre><code>export const ok = ;</code></pre>
      </ui-code-block>
    </ui-code-group>
  `,
  play: async ({ canvasElement }) => {
    const warnMessages: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]): void => {
      warnMessages.push(args.map((value) => String(value)).join(' '));
    };

    try {
      const group = getGroup(canvasElement, 'mismatch-group');
      await group.updateComplete;
      await waitFrame();

      const firstPanel = getPanels(group)[0];
      if (!firstPanel) throw new Error('比較ペア検証対象の先頭パネルが見つかりません');

      firstPanel.setAttribute('label', '崩したラベル');
      await group.updateComplete;
      await waitFrame();

      const hasContractWarning = warnMessages.some((message) =>
        message.includes('[ui-code-group] Comparison Pair Contract mismatch'),
      );
      if (!hasContractWarning) {
        throw new Error('比較ペア不一致時の警告が出力されていません');
      }
    } finally {
      console.warn = originalWarn;
    }
  },
};
