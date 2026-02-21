import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './code-group';
import type { CodeGroup } from './code-group';
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

const getHeaderIntentText = (group: CodeGroup): string => {
  const intent = group.shadowRoot?.querySelector<HTMLElement>('.header-intent');
  return intent ? intent.textContent.trim() : '';
};

const getHeaderFilename = (group: CodeGroup): string => {
  const filename = group.shadowRoot?.querySelector<HTMLElement>('.header-filename');
  return filename ? filename.textContent.trim() : '';
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
    if (!firstPanel.hasAttribute('headless')) {
      throw new Error('配下の ui-code-block に headless が付与されていません');
    }

    if (getHeaderIntentText(group) !== '正しい例') {
      throw new Error('アクティブ intent 表示が「正しい例」と一致しません');
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
    if (getHeaderIntentText(group) !== '誤り例') {
      throw new Error('タブ切り替え後の intent 表示が「誤り例」と一致しません');
    }

    const copyButtonAfter = getCopyButton(group);
    if (copyButtonAfter.label !== 'bad.ts のコードをコピー') {
      throw new Error(`切り替え後コピーラベルが不正です: "${copyButtonAfter.label}"`);
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

    if (getHeaderFilename(group) !== '') {
      throw new Error('filename フォールバック時はヘッダーメタデータを重複表示しない想定です');
    }

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
    const lastTab = tabs[tabs.length - 1];
    if (!lastTab) throw new Error('最終タブが見つかりません');

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

    if (lastTabRect.right > tabListRect.right - toolsWidth + 4) {
      throw new Error('header-tools 幅補正後もアクティブタブがマスク領域に隠れています');
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
    const fakeClipboard = {
      writeText: (_value: string): Promise<void> =>
        new Promise((resolve) => {
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

      const copyBeforeSwitch = getCopyButton(group);
      copyBeforeSwitch.click();

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
