import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './syntax-card';
import type { SyntaxCard } from './syntax-card';
import '../codeblock/codeblock';
import type { CodeBlock } from '../codeblock/codeblock';
import type { CopyButton } from '../copy-button/copy-button';

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const getCard = (canvasElement: Element, id: string): SyntaxCard => {
  const card = canvasElement.querySelector<SyntaxCard>(`#${id}`);
  if (!card) throw new Error(`ui-syntax-card#${id} が見つかりません`);
  return card;
};

const getShadowElement = (card: SyntaxCard, selector: string, label: string): Element => {
  const element = card.shadowRoot?.querySelector(selector);
  if (!element) throw new Error(`${label} が見つかりません: selector=${selector}`);
  return element;
};

const getCopyButton = (card: SyntaxCard): CopyButton => {
  const element = getShadowElement(card, 'ui-copy-button.copy-action', 'コピー ボタン');
  return element as CopyButton;
};

const getHeading = (card: SyntaxCard): HTMLElement => {
  const element = getShadowElement(card, '.name', 'ヘッダー見出し');
  return element as HTMLElement;
};

const getSignatureArea = (card: SyntaxCard): HTMLElement => {
  const element = getShadowElement(card, '.signature-area', 'Signature エリア');
  return element as HTMLElement;
};

const getContentArea = (card: SyntaxCard): HTMLElement => {
  const element = getShadowElement(card, '.content-area', 'Content エリア');
  return element as HTMLElement;
};

const getSignatureCodeBlock = (card: SyntaxCard): CodeBlock => {
  const block = card.querySelector<CodeBlock>('ui-code-block[slot="signature"]');
  if (!block) throw new Error('signature スロットの ui-code-block が見つかりません');
  return block;
};

const assertCopyDisabled = (card: SyntaxCard, reason: string): void => {
  const copyButton = getCopyButton(card);
  if (!copyButton.hasAttribute('disabled')) {
    throw new Error(`${reason}: コピー ボタンに disabled が付与されていません`);
  }
  if (copyButton.getAttribute('aria-disabled') !== 'true') {
    throw new Error(`${reason}: aria-disabled="true" が付与されていません`);
  }
  if (copyButton.value !== '') {
    throw new Error(`${reason}: disabled 時の value は空文字である必要があります`);
  }
};

const meta: Meta<SyntaxCard> = {
  title: 'Components/Syntax Card',
  component: 'ui-syntax-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
構文カードコンポーネントです。Signature（コード）と Members（解説）を分離し、APIドキュメントのような読書体験を提供します。

## このストーリーで検証する観点
- 種別（kind）× コンテンツ状態（通常 / returns-only / empty）の整合
- heading-level の有効値（2-6）とフォールバック（h4）
- Language SoT（signature の ui-code-block[lang] 優先）
- copy 失敗隔離（signature 内 code-block 0件 / 複数件 / 空コード）
        `,
      },
    },
  },
  argTypes: {
    kind: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'ヘッダー左側の種別タグ',
    },
    name: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '要素名（見出し + コピーボタン文脈）',
    },
    lang: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'data-lang 属性。子 ui-code-block が lang 未指定のときのみ補完',
    },
    headingLevel: {
      control: 'number',
      table: { type: { summary: 'number (2-6)' }, defaultValue: { summary: '4' } },
      description: '見出しレベル（範囲外は h4 にフォールバック）',
    },
  },
};

export default meta;
type Story = StoryObj<SyntaxCard>;

/**
 * 代表ケース: Method + members + returns。
 * コンポーネントの標準的な情報密度を確認します。
 */
export const MethodWithMembersAndReturns: Story = {
  render: () => html`
    <ui-syntax-card id="method-card" kind="Method" name="useEffect" data-lang="ts" heading-level="3">
      <ui-code-block slot="signature">
        <pre><code>useEffect(() => {
  document.title = title;
}, [title]);</code></pre>
      </ui-code-block>

      <dl>
        <div>
          <dt>effect: () => void | (() => void)</dt>
          <dd>副作用の実行関数。必要ならクリーンアップ関数を返します。</dd>
        </div>
        <div>
          <dt>deps?: readonly unknown[]</dt>
          <dd>依存配列。変更時のみ effect を再実行します。</dd>
        </div>
      </dl>

      <p slot="returns">戻り値はありません（cleanup 関数を返すパターンを除く）。</p>
    </ui-syntax-card>
  `,
  play: async ({ canvasElement }) => {
    const card = getCard(canvasElement, 'method-card');
    await card.updateComplete;
    await waitFrame();

    if (card.hasAttribute('data-content-empty')) {
      throw new Error('members + returns が存在するため data-content-empty は付与されない想定です');
    }

    const kindTag = getShadowElement(card, '.kind-tag', 'kind タグ') as HTMLElement;
    if (kindTag.textContent.trim() !== 'Method') {
      throw new Error('kind タグが "Method" ではありません');
    }

    const heading = getHeading(card);
    if (heading.tagName !== 'H3') {
      throw new Error(`heading-level=3 のため h3 が必要です。actual=${heading.tagName}`);
    }
    if (heading.textContent.trim() !== 'useEffect') {
      throw new Error('見出しテキストが name と一致しません');
    }

    const copyButton = getCopyButton(card);
    if (copyButton.getAttribute('aria-disabled') !== 'false') {
      throw new Error('有効な signature を持つため copy は有効状態である必要があります');
    }

    const signatureBlock = getSignatureCodeBlock(card);
    if (!signatureBlock.hasAttribute('headless')) {
      throw new Error('signature 内の ui-code-block に headless が付与されていません');
    }
    if (signatureBlock.getAttribute('lang') !== 'ts') {
      throw new Error('card[data-lang] のフォールバックで ui-code-block[lang="ts"] が補完される必要があります');
    }

    const returnsSection = getShadowElement(card, '.returns-slot', 'returns セクション') as HTMLElement;
    if (returnsSection.hasAttribute('hidden')) {
      throw new Error('returns コンテンツがあるため returns セクションは表示される必要があります');
    }

    const returnsTitle = getShadowElement(card, '.returns-slot .section-title', 'returns タイトル') as HTMLElement;
    if (returnsTitle.textContent.trim() !== 'Returns') {
      throw new Error('returns セクションタイトルは "Returns" である必要があります');
    }
  },
};

/**
 * 境界: default なし + returns のみ。
 * Returns-only Integrity を検証します。
 */
export const ReturnsOnlyQuery: Story = {
  render: () => html`
    <ui-syntax-card id="returns-only-card" kind="Query" name="SELECT" data-lang="sql">
      <ui-code-block slot="signature">
        <pre><code>SELECT id, name
FROM users
WHERE deleted_at IS NULL;</code></pre>
      </ui-code-block>

      <p slot="returns">一致する行のレコードセットを返します。</p>
    </ui-syntax-card>
  `,
  play: async ({ canvasElement }) => {
    const card = getCard(canvasElement, 'returns-only-card');
    await card.updateComplete;
    await waitFrame();

    if (card.hasAttribute('data-content-empty')) {
      throw new Error('returns-only は正式サポートのため data-content-empty は付与されない想定です');
    }

    const heading = getHeading(card);
    if (heading.tagName !== 'H4') {
      throw new Error(`heading-level 未指定時は h4 が必要です。actual=${heading.tagName}`);
    }

    const defaultSection = getShadowElement(card, '.default-slot', 'default セクション') as HTMLElement;
    if (!defaultSection.hasAttribute('hidden')) {
      throw new Error('default slot が空のため default セクションは hidden である必要があります');
    }

    const returnsSection = getShadowElement(card, '.returns-slot', 'returns セクション') as HTMLElement;
    if (returnsSection.hasAttribute('hidden')) {
      throw new Error('returns slot が存在するため returns セクションは表示される必要があります');
    }

    const contentArea = getContentArea(card);
    if (getComputedStyle(contentArea).display === 'none') {
      throw new Error('returns-only 構成では Content Area は表示される必要があります');
    }
  },
};

/**
 * 境界: default / returns の両方が空。
 * Content Empty Contract を検証します。
 */
export const EmptyContentContract: Story = {
  render: () => html`
    <ui-syntax-card id="empty-content-card" kind="Struct" name="User" data-lang="ts">
      <ui-code-block slot="signature">
        <pre><code>type User = {
  id: string;
  name: string;
};</code></pre>
      </ui-code-block>
    </ui-syntax-card>
  `,
  play: async ({ canvasElement }) => {
    const card = getCard(canvasElement, 'empty-content-card');
    await card.updateComplete;
    await waitFrame();

    if (!card.hasAttribute('data-content-empty')) {
      throw new Error('default / returns が空のため data-content-empty が付与される必要があります');
    }

    const contentArea = getContentArea(card);
    if (getComputedStyle(contentArea).display !== 'none') {
      throw new Error('data-content-empty 時は Content Area が非表示である必要があります');
    }

    const signatureArea = getSignatureArea(card);
    const signatureStyle = getComputedStyle(signatureArea);
    const isBottomBorderCleared =
      signatureStyle.borderBottomStyle === 'none' || signatureStyle.borderBottomWidth === '0px';
    if (!isBottomBorderCleared) {
      throw new Error('data-content-empty 時は Signature Area の border-bottom が除去される必要があります');
    }

    if (signatureStyle.borderBottomLeftRadius === '0px') {
      throw new Error('data-content-empty 時は Signature Area の下端角丸が必要です');
    }

    const copyButton = getCopyButton(card);
    if (copyButton.getAttribute('aria-disabled') !== 'false') {
      throw new Error('signature に有効な code-block が1件あるため copy は有効状態である必要があります');
    }
  },
};

/**
 * 境界: heading-level の有効値 / 無効値。
 * Heading Fallback Safety を検証します。
 */
export const HeadingLevelFallback: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-syntax-card id="heading-valid-card" kind="Component" name="SyntaxCard" heading-level="2">
        <ui-code-block slot="signature">
          <pre><code>&lt;ui-syntax-card kind="Method" name="fetch"&gt;&lt;/ui-syntax-card&gt;</code></pre>
        </ui-code-block>
      </ui-syntax-card>

      <ui-syntax-card id="heading-invalid-card" kind="Component" name="BrokenHeading" heading-level="9">
        <ui-code-block slot="signature">
          <pre><code>&lt;ui-syntax-card heading-level="9"&gt;&lt;/ui-syntax-card&gt;</code></pre>
        </ui-code-block>
      </ui-syntax-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const validCard = getCard(canvasElement, 'heading-valid-card');
    const invalidCard = getCard(canvasElement, 'heading-invalid-card');
    await Promise.all([validCard.updateComplete, invalidCard.updateComplete]);
    await waitFrame();

    const validHeading = getHeading(validCard);
    if (validHeading.tagName !== 'H2') {
      throw new Error(`heading-level=2 は h2 で描画される必要があります。actual=${validHeading.tagName}`);
    }

    const invalidHeading = getHeading(invalidCard);
    if (invalidHeading.tagName !== 'H4') {
      throw new Error(`heading-level=9 は h4 にフォールバックする必要があります。actual=${invalidHeading.tagName}`);
    }
  },
};

/**
 * 境界: Language SoT。
 * 子 ui-code-block の lang 優先と補完条件を検証します。
 */
export const LanguageSourceOfTruth: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-syntax-card id="lang-fallback-card" kind="Query" name="FindUsers" data-lang="sql">
        <ui-code-block slot="signature">
          <pre><code>SELECT * FROM users;</code></pre>
        </ui-code-block>
      </ui-syntax-card>

      <ui-syntax-card id="lang-source-card" kind="Method" name="parse" data-lang="ts">
        <ui-code-block slot="signature" lang="rust">
          <pre><code>fn parse(input: &str) -&gt; Result&lt;Ast, Error&gt; { ... }</code></pre>
        </ui-code-block>
      </ui-syntax-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fallbackCard = getCard(canvasElement, 'lang-fallback-card');
    const sourceCard = getCard(canvasElement, 'lang-source-card');
    await Promise.all([fallbackCard.updateComplete, sourceCard.updateComplete]);
    await waitFrame();

    const fallbackBlock = getSignatureCodeBlock(fallbackCard);
    if (fallbackBlock.getAttribute('lang') !== 'sql') {
      throw new Error('子 ui-code-block の lang 未指定時は card[data-lang] が補完される必要があります');
    }

    const sourceBlock = getSignatureCodeBlock(sourceCard);
    if (sourceBlock.getAttribute('lang') !== 'rust') {
      throw new Error('子 ui-code-block の lang 指定時は card[data-lang] より子を優先する必要があります');
    }

    sourceCard.lang = 'go';
    await sourceCard.updateComplete;
    await waitFrame();

    if (sourceCard.getAttribute('data-lang') !== 'go') {
      throw new Error('card[data-lang] の更新がホスト属性へ反映されていません');
    }
    if (sourceBlock.getAttribute('lang') !== 'rust') {
      throw new Error('子 ui-code-block の lang は card 側更新で上書きしてはいけません');
    }
  },
};

/**
 * 事故が多い境界: copy 失敗隔離。
 * signature 内 code-block が 0件 / 複数件 / 空文字のケースを検証します。
 */
export const CopyFailureIsolation: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-syntax-card id="no-code-card" kind="Method" name="fetchData">
        <p slot="signature">コードブロック未配置</p>
      </ui-syntax-card>

      <ui-syntax-card id="multi-code-card" kind="Method" name="duplicate">
        <ui-code-block slot="signature">
          <pre><code>const a = 1;</code></pre>
        </ui-code-block>
        <ui-code-block slot="signature">
          <pre><code>const b = 2;</code></pre>
        </ui-code-block>
      </ui-syntax-card>

      <ui-syntax-card id="empty-code-card" kind="Method" name="blank">
        <ui-code-block slot="signature">
          <pre><code>   </code></pre>
        </ui-code-block>
      </ui-syntax-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const noCodeCard = getCard(canvasElement, 'no-code-card');
    const multiCodeCard = getCard(canvasElement, 'multi-code-card');
    const emptyCodeCard = getCard(canvasElement, 'empty-code-card');

    await Promise.all([noCodeCard.updateComplete, multiCodeCard.updateComplete, emptyCodeCard.updateComplete]);
    await waitFrame();

    if (multiCodeCard.querySelectorAll('ui-code-block[slot="signature"]').length !== 2) {
      throw new Error('multi-code-card は 2つの ui-code-block を持つ必要があります');
    }

    assertCopyDisabled(noCodeCard, 'code-block 0件');
    assertCopyDisabled(multiCodeCard, 'code-block 複数件');
    assertCopyDisabled(emptyCodeCard, 'code 文字列が空');
  },
};
