import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './footnote';
import type { Footnote } from './footnote';

const meta: Meta<Footnote> = {
  title: 'Components/Footnote',
  component: 'ui-footnote',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
脚注参照のためのコンポーネントです。

- Trigger / Popover / scope / backlink / keyboard / focus / SSR 再接続の browser contract は \`test/browser/footnote.browser.test.ts\` を正本にします。
- CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本にします。
- Storybook には representative surface と manual review 面だけを残します。
        `,
      },
    },
  },
  argTypes: {
    refId: {
      control: 'text',
      name: 'ref-id',
      description: '論理脚注の安定識別子',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    index: {
      control: { type: 'number', min: 1, step: 1 },
      description: '表示番号（識別子ではない）',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '1' },
      },
    },
    refInstance: {
      control: { type: 'number', min: 1, step: 1 },
      name: 'ref-instance',
      description: '同一脚注内での参照位置番号',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '1' },
      },
    },
    shared: {
      control: 'boolean',
      description: 'secondary reference を表す暫定フラグ',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<Footnote>;

const movedToBrowserDocs = (story: string): Pick<Story, 'tags' | 'parameters'> => ({
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story,
      },
    },
  },
});

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '基本の Trigger / Popover / backlink 契約は test/browser/footnote.browser.test.ts で検査します。',
      },
    },
  },
  render: () => html`
    <article data-footnote-scope>
      <p>
        読書体験は本文の信号比で決まる
        <ui-footnote ref-id="fn-1" index="1" ref-instance="1">
          <span>補足: 本文に集中できる設計は、補助情報へのアクセス経路を明確に定義する。</span>
        </ui-footnote>
      </p>

      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-1">
            補足: 本文に集中できる設計は、補助情報へのアクセス経路を明確に定義する。
            <a href="#fn-1-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
};

export const VariantStateMatrix: Story = {
  ...movedToBrowserDocs(
    'scope ごとの解決と shared secondary reference の browser contract は test/browser/footnote.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <article data-footnote-scope>
        <p>
          最初の参照
          <ui-footnote ref-id="fn-11" index="11" ref-instance="1">
            <span>共有本文は primary reference が 1 つだけ保持する。</span>
          </ui-footnote>
          追従参照
          <ui-footnote ref-id="fn-11" index="11" ref-instance="2" shared></ui-footnote>
        </p>
        <section class="footnotes" role="doc-endnotes">
          <h2 class="sr-only">脚注</h2>
          <ol>
            <li id="fn-11">
              共有本文は primary reference が 1 つだけ保持する。
              <a href="#fn-11-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
              <a href="#fn-11-ref-2" data-footnote-backref role="doc-backlink">↩︎2</a>
            </li>
          </ol>
        </section>
      </article>

      <article data-footnote-scope>
        <p>
          別 scope の同一 refId
          <ui-footnote ref-id="fn-11" index="11" ref-instance="1">
            <span>scope が異なれば同じ refId でも独立して解決される。</span>
          </ui-footnote>
        </p>
        <section class="footnotes" role="doc-endnotes">
          <h2 class="sr-only">脚注</h2>
          <ol>
            <li id="fn-11">
              scope が異なれば同じ refId でも独立して解決される。
              <a href="#fn-11-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
            </li>
          </ol>
        </section>
      </article>
    </div>
  `,
};

export const DualAccessContract: Story = {
  ...movedToBrowserDocs(
    '通常クリック / 修飾クリック / 中クリックの dual-access 契約は test/browser/footnote.browser.test.ts で検査します。',
  ),
  render: () => html`
    <article data-footnote-scope>
      <p>
        デュアルアクセス
        <ui-footnote ref-id="fn-20" index="20" ref-instance="1">
          <span>Popover は補助経路であり、脚注一覧は正規経路である。</span>
        </ui-footnote>
      </p>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-20">
            Popover は補助経路であり、脚注一覧は正規経路である。
            <a href="#fn-20-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
};

export const KeyboardAndFocusContract: Story = {
  ...movedToBrowserDocs(
    'Escape close / focus return / footer link 上の Tab 契約は test/browser/footnote.browser.test.ts で検査します。',
  ),
  render: () => html`
    <article data-footnote-scope>
      <p>
        キーボード契約
        <ui-footnote ref-id="fn-40" index="40" ref-instance="1">
          <span>読書フローの継続を妨げないキーボード契約。</span>
        </ui-footnote>
        <a href="#after-footnote" id="after-footnote">次のリンク</a>
      </p>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-40">
            読書フローの継続を妨げないキーボード契約。
            <a href="#fn-40-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
};

export const SsrHydrationContract: Story = {
  ...movedToBrowserDocs(
    'SSR 由来本文の再接続と再描画保持の契約は test/browser/footnote.browser.test.ts で検査します。',
  ),
  render: () => html`
    <article data-footnote-scope>
      <div>
        SSR 再接続
        <ui-footnote ref-id="fn-60" index="60" ref-instance="1">
          <p>SSR で埋め込まれた脚注本文。</p>
        </ui-footnote>
      </div>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-60">
            SSR で埋め込まれた脚注本文。
            <a href="#fn-60-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
};

export const BoundaryConditions: Story = {
  ...movedToBrowserDocs(
    'index / refInstance の縮退正規化と境界条件は test/browser/footnote.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <article data-footnote-scope>
        <p style="font-size: 11px;">
          親 11px
          <ui-footnote ref-id="fn-31" index="31" ref-instance="1">
            <span>small text 本文。</span>
          </ui-footnote>
        </p>

        <p>
          長文
          <ui-footnote ref-id="fn-32" index="32" ref-instance="1">
            <span>
              長文脚注: 表示領域の上限を超えると内部スクロールで読む。長文脚注:
              表示領域の上限を超えると内部スクロールで読む。長文脚注:
              表示領域の上限を超えると内部スクロールで読む。
            </span>
          </ui-footnote>
        </p>

        <p>
          shared
          <ui-footnote ref-id="fn-31" index="31" ref-instance="2" shared></ui-footnote>
        </p>

        <section class="footnotes" role="doc-endnotes">
          <h2 class="sr-only">脚注</h2>
          <ol>
            <li id="fn-31">
              small text 本文。
              <a href="#fn-31-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
              <a href="#fn-31-ref-2" data-footnote-backref role="doc-backlink">↩︎2</a>
            </li>
            <li id="fn-32">
              長文脚注。
              <a href="#fn-32-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
            </li>
          </ol>
        </section>
      </article>
    </div>
  `,
};

export const VisualModeContracts: Story = {
  ...movedToBrowserDocs(
    'visual mode の outcome は手動確認専用です。構造契約は SSR / browser test を正本にします。',
  ),
  render: () => html`
    <article data-footnote-scope>
      <p>
        表示モード検証
        <ui-footnote ref-id="fn-50" index="50" ref-instance="1">
          <span>表示モード契約の検証用本文。</span>
        </ui-footnote>
      </p>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-50">
            表示モード契約の検証用本文。
            <a href="#fn-50-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
};
