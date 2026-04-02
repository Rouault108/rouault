import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './syntax-card';
import { SyntaxCard } from './syntax-card';
import '../syntax-field/syntax-field';

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

const movedToBrowserDocs = (
  story: string,
): Pick<Story, 'tags' | 'parameters'> => ({
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story,
      },
    },
  },
});

/**
 * 代表ケース: Method + members + returns。
 * コンポーネントの標準的な情報密度を確認します。
 */
export const MethodWithMembersAndReturns: Story = {
  tags: ['smoke'],
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
};

export const SingleSectionOnly: Story = {
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
};

export const EmptyContentContract: Story = {
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
};

/**
 * 境界: heading-level の有効値 / 無効値。
 * Heading Fallback Safety を検証します。
 */
export const HeadingLevelFallback: Story = {
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
};

export const LangAttribute: Story = {
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
};

export const CopyFailureIsolation: Story = {
  ...movedToBrowserDocs(
    'copy disabled / signature slot 境界 / tabindex 伝播は test/browser/syntax-card.browser.test.ts で検査します。この story は docs / 手動確認専用です。',
  ),
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
};

export const DefaultOnlyMembers: Story = {
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
};

/**
 * 契約: forced-colors の境界フォールバックが定義されていること。
 */
export const ForcedColorsContract: Story = {
  tags: ['manual-only'],
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
  parameters: {
    docs: {
      description: {
        story:
          'syntax-card / syntax-section の forced-colors CSS 構造契約は test/ssr/css-structure-contracts.test.ts へ移送済みです。この story は手動確認専用です。',
      },
    },
  },
};

/**
 * 契約: print 時の baseline ルールが定義されていること。
 */
export const PrintContract: Story = {
  tags: ['manual-only'],
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
  parameters: {
    docs: {
      description: {
        story:
          'syntax-card の print CSS 構造契約は test/ssr/css-structure-contracts.test.ts へ移送済みです。この story は手動確認専用です。',
      },
    },
  },
};

export const CopyDisabledInteractionContract: Story = {
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
};