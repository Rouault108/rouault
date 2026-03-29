import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './syntax-card';
import { SyntaxCard } from './syntax-card';
import { SyntaxSection } from './syntax-section';
import '../syntax-field/syntax-field';
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

const getSignaturePre = (card: SyntaxCard): HTMLPreElement => {
  const pre = card.querySelector<HTMLPreElement>('pre[slot="signature"]');
  if (!pre) throw new Error('signature スロットの pre が見つかりません');
  return pre;
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

const getStylesText = (styles: typeof SyntaxCard.styles): string => {
  if (Array.isArray(styles)) {
    return styles
      .map((style) => {
        const s = style as { cssText?: string };
        return s.cssText ?? '';
      })
      .join('\n');
  }

  return 'cssText' in styles ? styles.cssText : '';
};

const getSyntaxCardStylesText = (): string => getStylesText(SyntaxCard.styles);

const getSyntaxSectionStylesText = (): string => getStylesText(SyntaxSection.styles);

const meta: Meta<SyntaxCard> = {
  title: 'Components/Syntax Card',
  component: 'ui-syntax-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
構文カードコンポーネントです。Signature（コード）と Members（解説）を分離し、APIドキュメントのような読書体験を提供します。

signature スロットには素の \`<pre><code>\` を直接配置します。

## このストーリーで検証する観点
- 種別（kind）× コンテンツ状態（通常 / returns-only / empty）の整合
- heading-level の有効値（2-6）とフォールバック（h4）
- copy 失敗隔離（signature 内 pre 0件 / 複数件 / 空コード）
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
      description: 'data-lang 属性。表示言語の識別子',
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
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-syntax-card
      id="method-card"
      kind="フック"
      name="useEffect"
      data-lang="ts"
      heading-level="3"
      style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
    >
      <pre slot="signature"><code>function useEffect(
  effect: () =&gt; void | (() =&gt; void),
  deps?: readonly unknown[]
): void</code></pre>

      <ui-syntax-section label="パラメータ">
        <dl>
          <ui-syntax-field name="effect" type="() =&gt; void | (() =&gt; void)" required>
            副作用を実行する関数。クリーンアップが必要な場合は関数を返します。
          </ui-syntax-field>
          <ui-syntax-field name="deps" type="readonly unknown[]">
            依存配列。変更時のみ effect を再実行します。省略時は毎レンダーで実行されます。
          </ui-syntax-field>
        </dl>
      </ui-syntax-section>

      <ui-syntax-section label="戻り値">
        <p>
          void。effect が返したクリーンアップ関数は、再実行前およびアンマウント時に呼び出されます。
        </p>
      </ui-syntax-section>
    </ui-syntax-card>
  `,
  play: async ({ canvasElement }) => {
    const card = getCard(canvasElement, 'method-card');
    await card.updateComplete;
    await waitFrame();

    if (card.hasAttribute('data-content-empty')) {
      throw new Error('sections が存在するため data-content-empty は付与されない想定です');
    }

    const kindTag = getShadowElement(card, '.kind-tag', 'kind タグ') as HTMLElement;
    if (kindTag.textContent.trim() !== 'フック') {
      throw new Error('kind タグが "フック" ではありません');
    }

    const syntaxFields = card.querySelectorAll('ui-syntax-field');
    if (syntaxFields.length !== 2) {
      throw new Error(
        `members は ui-syntax-field を2件使用する必要があります。actual=${String(syntaxFields.length)}`,
      );
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

    const signaturePre = getSignaturePre(card);
    if (!signaturePre.querySelector('code')) {
      throw new Error('signature の pre 内に code 要素が必要です');
    }

    const sections = card.querySelectorAll<SyntaxSection>('ui-syntax-section');
    if (sections.length !== 2) {
      throw new Error(`ui-syntax-section は2件必要です。actual=${String(sections.length)}`);
    }

    if (sections[0]?.label !== 'パラメータ') {
      throw new Error('最初のセクションラベルは "パラメータ" である必要があります');
    }

    if (sections[1]?.label !== '戻り値') {
      throw new Error('2番目のセクションラベルは "戻り値" である必要があります');
    }
  },
};

/**
 * 境界: default なし + returns のみ。
 * Returns-only Integrity を検証します。
 */
export const SingleSectionOnly: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-syntax-card
      id="single-section-card"
      kind="Query"
      name="SELECT"
      data-lang="sql"
      style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
    >
      <pre slot="signature"><code>SELECT id, name
FROM users
WHERE deleted_at IS NULL;</code></pre>

      <ui-syntax-section label="戻り値">
        <p>一致する行のレコードセットを返します。</p>
      </ui-syntax-section>
    </ui-syntax-card>
  `,
  play: async ({ canvasElement }) => {
    const card = getCard(canvasElement, 'single-section-card');
    await card.updateComplete;
    await waitFrame();

    if (card.hasAttribute('data-content-empty')) {
      throw new Error('セクションが1件存在するため data-content-empty は付与されない想定です');
    }

    const heading = getHeading(card);
    if (heading.tagName !== 'H4') {
      throw new Error(`heading-level 未指定時は h4 が必要です。actual=${heading.tagName}`);
    }

    const sections = card.querySelectorAll('ui-syntax-section');
    if (sections.length !== 1) {
      throw new Error(`ui-syntax-section は1件必要です。actual=${String(sections.length)}`);
    }

    const contentArea = getContentArea(card);
    if (getComputedStyle(contentArea).display === 'none') {
      throw new Error('セクションが存在するため Content Area は表示される必要があります');
    }
  },
};

/**
 * 境界: default / returns の両方が空。
 * Content Empty Contract を検証します。
 */
export const EmptyContentContract: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <ui-syntax-card
      id="empty-content-card"
      kind="Struct"
      name="User"
      data-lang="ts"
      style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
    >
      <pre slot="signature"><code>type User = {
  id: string;
  name: string;
};</code></pre>
    </ui-syntax-card>
  `,
  play: async ({ canvasElement }) => {
    const card = getCard(canvasElement, 'empty-content-card');
    await card.updateComplete;
    await waitFrame();

    if (!card.hasAttribute('data-content-empty')) {
      throw new Error('セクションが空のため data-content-empty が付与される必要があります');
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
      throw new Error(
        'data-content-empty 時は Signature Area の border-bottom が除去される必要があります',
      );
    }

    const copyButton = getCopyButton(card);
    if (copyButton.getAttribute('aria-disabled') !== 'false') {
      throw new Error('signature に有効な pre が1件あるため copy は有効状態である必要があります');
    }
  },
};

/**
 * 境界: heading-level の有効値 / 無効値。
 * Heading Fallback Safety を検証します。
 */
export const HeadingLevelFallback: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-syntax-card
        id="heading-valid-card"
        kind="Component"
        name="SyntaxCard"
        heading-level="2"
        style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
      >
        <pre
          slot="signature"
        ><code>&lt;ui-syntax-card kind="Method" name="fetch"&gt;&lt;/ui-syntax-card&gt;</code></pre>
      </ui-syntax-card>

      <ui-syntax-card
        id="heading-invalid-card"
        kind="Component"
        name="BrokenHeading"
        heading-level="9"
        style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
      >
        <pre
          slot="signature"
        ><code>&lt;ui-syntax-card heading-level="9"&gt;&lt;/ui-syntax-card&gt;</code></pre>
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
      throw new Error(
        `heading-level=2 は h2 で描画される必要があります。actual=${validHeading.tagName}`,
      );
    }

    const invalidHeading = getHeading(invalidCard);
    if (invalidHeading.tagName !== 'H4') {
      throw new Error(
        `heading-level=9 は h4 にフォールバックする必要があります。actual=${invalidHeading.tagName}`,
      );
    }
  },
};

/**
 * 境界: data-lang 属性の伝播。
 * カードレベルの lang 管理を検証します。
 */
export const LangAttribute: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-syntax-card
        id="lang-ts-card"
        kind="Method"
        name="parse"
        data-lang="ts"
        style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
      >
        <pre slot="signature"><code>function parse(input: string): Ast</code></pre>
      </ui-syntax-card>

      <ui-syntax-card
        id="lang-sql-card"
        kind="Query"
        name="FindUsers"
        data-lang="sql"
        style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
      >
        <pre slot="signature"><code>SELECT * FROM users;</code></pre>
      </ui-syntax-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const tsCard = getCard(canvasElement, 'lang-ts-card');
    const sqlCard = getCard(canvasElement, 'lang-sql-card');
    await Promise.all([tsCard.updateComplete, sqlCard.updateComplete]);
    await waitFrame();

    if (tsCard.getAttribute('data-lang') !== 'ts') {
      throw new Error('data-lang="ts" がホスト属性に反映される必要があります');
    }

    if (sqlCard.getAttribute('data-lang') !== 'sql') {
      throw new Error('data-lang="sql" がホスト属性に反映される必要があります');
    }

    // lang プロパティ更新の反映
    tsCard.lang = 'rust';
    await tsCard.updateComplete;
    await waitFrame();

    if (tsCard.getAttribute('data-lang') !== 'rust') {
      throw new Error('lang プロパティ更新が data-lang 属性へ反映される必要があります');
    }
  },
};

/**
 * 事故が多い境界: copy 失敗隔離。
 * signature 内 pre が 0件 / 複数件 / 空文字のケースを検証します。
 */
export const CopyFailureIsolation: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-syntax-card
        id="no-pre-card"
        kind="Method"
        name="fetchData"
        style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
      >
        <p slot="signature">pre なし</p>
      </ui-syntax-card>

      <ui-syntax-card
        id="multi-pre-card"
        kind="Method"
        name="duplicate"
        style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
      >
        <pre slot="signature"><code>const a = 1;</code></pre>
        <pre slot="signature"><code>const b = 2;</code></pre>
      </ui-syntax-card>

      <ui-syntax-card
        id="empty-pre-card"
        kind="Method"
        name="blank"
        style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
      >
        <pre slot="signature"><code>   </code></pre>
      </ui-syntax-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const noPreCard = getCard(canvasElement, 'no-pre-card');
    const multiPreCard = getCard(canvasElement, 'multi-pre-card');
    const emptyPreCard = getCard(canvasElement, 'empty-pre-card');

    await Promise.all([
      noPreCard.updateComplete,
      multiPreCard.updateComplete,
      emptyPreCard.updateComplete,
    ]);
    await waitFrame();

    if (multiPreCard.querySelectorAll('pre[slot="signature"]').length !== 2) {
      throw new Error('multi-pre-card は 2つの pre を持つ必要があります');
    }

    assertCopyDisabled(noPreCard, 'pre 0件');
    assertCopyDisabled(multiPreCard, 'pre 複数件');
    assertCopyDisabled(emptyPreCard, 'code 文字列が空');
  },
};

/**
 * 境界: default slot のみ（returns なし）。
 * Parameters-only 構成での表示整合を検証します。
 */
export const DefaultOnlyMembers: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-syntax-card
      id="default-only-card"
      kind="Struct"
      name="Article"
      data-lang="ts"
      style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
    >
      <pre slot="signature"><code>type Article = {
  id: string;
  title: string;
};</code></pre>

      <ui-syntax-section label="プロパティ">
        <dl>
          <ui-syntax-field name="id" type="string" required> 記事の識別子です。 </ui-syntax-field>
        </dl>
      </ui-syntax-section>
    </ui-syntax-card>
  `,
  play: async ({ canvasElement }) => {
    const card = getCard(canvasElement, 'default-only-card');
    await card.updateComplete;
    await waitFrame();

    if (card.hasAttribute('data-content-empty')) {
      throw new Error('セクションが存在するため data-content-empty は付与されません');
    }

    const sections = card.querySelectorAll<SyntaxSection>('ui-syntax-section');
    if (sections.length !== 1) {
      throw new Error(`ui-syntax-section は1件必要です。actual=${String(sections.length)}`);
    }

    if (sections[0]?.label !== 'プロパティ') {
      throw new Error('セクションラベルは "プロパティ" である必要があります');
    }

    const syntaxFields = card.querySelectorAll('ui-syntax-field');
    if (syntaxFields.length !== 1) {
      throw new Error(`ui-syntax-field は1件必要です。actual=${String(syntaxFields.length)}`);
    }
  },
};

/**
 * 契約: forced-colors の境界フォールバックが定義されていること。
 */
export const ForcedColorsContract: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <ui-syntax-card
      id="forced-colors-contract"
      kind="Method"
      name="hydrate"
      data-lang="ts"
      style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
    >
      <pre slot="signature"><code>hydrate(root, app);</code></pre>
    </ui-syntax-card>
  `,
  play: () => {
    const cardStyles = getSyntaxCardStylesText();
    const cardSnippets = [
      '@media (forced-colors: active)',
      'border-color: CanvasText;',
      '.signature-area',
      '.kind-tag',
      '.copy-action',
    ];

    cardSnippets.forEach((snippet) => {
      if (!cardStyles.includes(snippet)) {
        throw new Error(`forced-colors 契約の定義が不足しています (syntax-card): ${snippet}`);
      }
    });

    const sectionStyles = getSyntaxSectionStylesText();
    const sectionSnippets = ['@media (forced-colors: active)', '.section-title'];

    sectionSnippets.forEach((snippet) => {
      if (!sectionStyles.includes(snippet)) {
        throw new Error(`forced-colors 契約の定義が不足しています (syntax-section): ${snippet}`);
      }
    });
  },
};

/**
 * 契約: print 時の baseline ルールが定義されていること。
 */
export const PrintContract: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <ui-syntax-card
      id="print-contract"
      kind="Query"
      name="FindAll"
      data-lang="sql"
      style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
    >
      <pre slot="signature"><code>SELECT * FROM posts;</code></pre>
    </ui-syntax-card>
  `,
  play: () => {
    const styles = getSyntaxCardStylesText();
    const requiredSnippets = [
      '@media print',
      '.copy-action',
      'display: none;',
      'background: transparent !important;',
    ];

    requiredSnippets.forEach((snippet) => {
      if (!styles.includes(snippet)) {
        throw new Error(`print 契約の定義が不足しています: ${snippet}`);
      }
    });
  },
};

/**
 * 境界: copy 無効時に実操作できないこと。
 */
export const CopyDisabledInteractionContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-syntax-card
      id="copy-disabled-interaction"
      kind="Method"
      name="noop"
      style="--ui-syntax-card-breakout-width: 100%; --ui-syntax-card-breakout-margin: 0;"
    >
      <p slot="signature">pre なし</p>
    </ui-syntax-card>
  `,
  play: async ({ canvasElement }) => {
    const card = getCard(canvasElement, 'copy-disabled-interaction');
    await card.updateComplete;
    await waitFrame();

    const copyButton = getCopyButton(card);
    if (!copyButton.hasAttribute('disabled')) {
      throw new Error('copy 無効ケースでは ui-copy-button に disabled が必要です');
    }

    const innerButton = copyButton.shadowRoot?.querySelector('ui-button');
    if (!innerButton) {
      throw new Error('ui-copy-button 内の ui-button が見つかりません');
    }

    if (!innerButton.hasAttribute('disabled')) {
      throw new Error('copy 無効ケースでは内部 ui-button へ disabled を伝播する必要があります');
    }

    if (copyButton.getAttribute('tabindex') !== '-1') {
      throw new Error('copy 無効ケースでは tabindex=-1 である必要があります');
    }
  },
};
