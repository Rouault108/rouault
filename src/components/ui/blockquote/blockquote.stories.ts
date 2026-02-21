import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './blockquote';
import type { Blockquote, BlockquoteVariant } from './blockquote';

const VARIANTS = ['default', 'nested'] as const satisfies BlockquoteVariant[];

const getBlockquote = (canvasElement: Element, id: string): Blockquote => {
  const blockquote = canvasElement.querySelector<Blockquote>(`#${id}`);
  if (!blockquote) throw new Error(`#${id} が見つかりません`);
  return blockquote;
};

const getQuoteRoot = (block: Blockquote): HTMLElement => {
  const quote = block.shadowRoot?.querySelector<HTMLElement>('blockquote.quote');
  if (!quote) throw new Error('blockquote.quote が見つかりません');
  return quote;
};

const meta: Meta<Blockquote> = {
  title: 'Components/Blockquote',
  component: 'ui-blockquote',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
引用文のためのコンポーネントです。

- 出典なし: \`blockquote\` 単体
- 出典あり: \`figure > blockquote + figcaption > cite\`
- 状態: \`variant="default" | "nested"\`
- 属性: \`cite\`（引用元URL）, \`quote-lang\`（引用文の言語）
        `,
      },
    },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: VARIANTS,
      table: { type: { summary: "'default' | 'nested'" }, defaultValue: { summary: "'default'" } },
      description: '見た目のバリアント',
    },
    source: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '出典テキスト（空なら figcaption を出さない）',
    },
    cite: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'blockquote の cite 属性',
    },
    quoteLang: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'blockquote の lang 属性',
    },
  },
};

export default meta;
type Story = StoryObj<Blockquote>;

/**
 * 基本ケース:
 * - 出典なしでは `blockquote` 単体を使う
 * - キーボード非インタラクティブ契約（tabindex/role を持たない）
 */
export const Default: Story = {
  render: () => html`
    <ui-blockquote id="default-quote">
      <p>読書体験は、UIを消すことではなく、本文の信号を最大化することで成立する。</p>
    </ui-blockquote>
  `,
  play: async ({ canvasElement }) => {
    const block = getBlockquote(canvasElement, 'default-quote');
    await block.updateComplete;

    const quote = getQuoteRoot(block);
    if (quote.getAttribute('data-variant') !== 'default') {
      throw new Error('default バリアントの data-variant が不正です');
    }

    if (block.shadowRoot?.querySelector('figure')) {
      throw new Error('出典なしで figure を描画してはいけません');
    }

    if (quote.hasAttribute('tabindex') || quote.hasAttribute('role')) {
      throw new Error('blockquote は非インタラクティブ要素として扱う必要があります');
    }
  },
};

/**
 * バリアント×状態マトリクス:
 * - variant: default / nested
 * - source: あり / なし
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
        color: var(--fg-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>
    <div class="matrix">
      <div class="label">default x source:none</div>
      <ui-blockquote id="matrix-default-no-source" variant="default">
        <p>既定バリアント、出典なし。</p>
      </ui-blockquote>

      <div class="label">default x source:yes</div>
      <ui-blockquote id="matrix-default-source" variant="default" source="出典: 設計ノート">
        <p>既定バリアント、出典あり。</p>
      </ui-blockquote>

      <div class="label">nested x source:none</div>
      <ui-blockquote id="matrix-nested-no-source" variant="nested">
        <p>ネストバリアント、出典なし。</p>
      </ui-blockquote>

      <div class="label">nested x source:yes</div>
      <ui-blockquote id="matrix-nested-source" variant="nested" source="出典: RFC">
        <p>ネストバリアント、出典あり。</p>
      </ui-blockquote>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ids = [
      'matrix-default-no-source',
      'matrix-default-source',
      'matrix-nested-no-source',
      'matrix-nested-source',
    ] as const;

    const blocks = ids.map((id) => getBlockquote(canvasElement, id));
    await Promise.all(blocks.map((block) => block.updateComplete));

    for (const block of blocks) {
      const quote = getQuoteRoot(block);
      const expectedVariant = block.getAttribute('variant') ?? 'default';
      if (quote.getAttribute('data-variant') !== expectedVariant) {
        throw new Error(`${block.id} の data-variant が不正です`);
      }
    }

    const withSource = ['matrix-default-source', 'matrix-nested-source'] as const;
    for (const id of withSource) {
      const block = getBlockquote(canvasElement, id);
      const figure = block.shadowRoot?.querySelector('figure');
      const source = block.shadowRoot?.querySelector('figcaption.source cite');
      if (!figure || !source) {
        throw new Error(`${id} は source あり構造 (figure/figcaption/cite) を満たす必要があります`);
      }
    }

    const noSource = ['matrix-default-no-source', 'matrix-nested-no-source'] as const;
    for (const id of noSource) {
      const block = getBlockquote(canvasElement, id);
      if (block.shadowRoot?.querySelector('figure')) {
        throw new Error(`${id} は source なしのため figure を描画してはいけません`);
      }
    }

    const defaultQuote = getQuoteRoot(getBlockquote(canvasElement, 'matrix-default-no-source'));
    const nestedQuote = getQuoteRoot(getBlockquote(canvasElement, 'matrix-nested-no-source'));
    const defaultMargin = Number.parseFloat(getComputedStyle(defaultQuote).marginTop);
    const nestedMargin = Number.parseFloat(getComputedStyle(nestedQuote).marginTop);
    if (!(nestedMargin < defaultMargin)) {
      throw new Error('nested バリアントの margin が default より小さい想定を満たしていません');
    }
  },
};

/**
 * Source Contract:
 * - cite 属性の伝播
 * - quote-lang / lang の伝播
 * - source プロパティと source スロットの両対応
 */
export const SourceContract: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-blockquote
        id="source-prop-contract"
        source="Grace Hopper, Compiler Talk"
        cite=" https://example.com/compiler-talk "
        quote-lang="en"
      >
        <p>One accurate measurement is worth a thousand expert opinions.</p>
      </ui-blockquote>

      <ui-blockquote id="source-slot-contract" cite="https://example.com/interview">
        <p>設計は見えないところにこそ現れる。</p>
        <span slot="source">著者, <em>Interview</em></span>
      </ui-blockquote>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sourceProp = getBlockquote(canvasElement, 'source-prop-contract');
    const sourceSlot = getBlockquote(canvasElement, 'source-slot-contract');
    await Promise.all([sourceProp.updateComplete, sourceSlot.updateComplete]);

    const propQuote = getQuoteRoot(sourceProp);
    if (propQuote.getAttribute('cite') !== 'https://example.com/compiler-talk') {
      throw new Error('cite 属性は trim 済みURLで blockquote に反映される必要があります');
    }
    if (propQuote.getAttribute('lang') !== 'en') {
      throw new Error('quote-lang は blockquote.lang に反映される必要があります');
    }
    const propSource = sourceProp.shadowRoot?.querySelector('figcaption.source cite');
    if (!propSource) {
      throw new Error('source プロパティケースの figcaption.source cite が見つかりません');
    }
    if (!propSource.textContent.includes('Grace Hopper')) {
      throw new Error('source プロパティ値が figcaption > cite に反映されていません');
    }

    const slotQuote = getQuoteRoot(sourceSlot);
    if (slotQuote.getAttribute('cite') !== 'https://example.com/interview') {
      throw new Error('source slot ケースでも cite 属性を保持する必要があります');
    }
    const slotSourceEm = sourceSlot.shadowRoot?.querySelector('figcaption.source cite em');
    if (slotSourceEm?.textContent.trim() !== 'Interview') {
      throw new Error('source slot のリッチテキストが cite 内に保持されていません');
    }
  },
};

/**
 * 事故が多い境界条件:
 * - 不正 variant のフォールバック
 * - 空白 source / 空白 source slot の抑止
 * - host の lang フォールバック
 * - 空白 cite の無効化
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-blockquote id="boundary-invalid-variant" variant="unknown" source="   ">
        <p>不正バリアント + 空白source。</p>
      </ui-blockquote>

      <ui-blockquote id="boundary-host-lang" lang="fr" cite="   ">
        <p>host lang を blockquote に引き継ぐ。</p>
      </ui-blockquote>

      <ui-blockquote id="boundary-empty-source-slot">
        <p>空白だけの source slot は無視する。</p>
        <span slot="source">   </span>
      </ui-blockquote>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidVariant = getBlockquote(canvasElement, 'boundary-invalid-variant');
    const hostLang = getBlockquote(canvasElement, 'boundary-host-lang');
    const emptySourceSlot = getBlockquote(canvasElement, 'boundary-empty-source-slot');
    await Promise.all([invalidVariant.updateComplete, hostLang.updateComplete, emptySourceSlot.updateComplete]);

    const invalidQuote = getQuoteRoot(invalidVariant);
    if (invalidQuote.getAttribute('data-variant') !== 'default') {
      throw new Error('不正 variant は default にフォールバックする必要があります');
    }
    if (invalidVariant.shadowRoot?.querySelector('figure')) {
      throw new Error('空白 source は「出典なし」として扱う必要があります');
    }

    const hostLangQuote = getQuoteRoot(hostLang);
    if (hostLangQuote.getAttribute('lang') !== 'fr') {
      throw new Error('quote-lang 未指定時は host の lang を継承する必要があります');
    }
    if (hostLangQuote.hasAttribute('cite')) {
      throw new Error('空白 cite は blockquote に反映してはいけません');
    }
    if (hostLangQuote.hasAttribute('tabindex') || hostLangQuote.hasAttribute('role')) {
      throw new Error('blockquote に余分なインタラクション属性を付与してはいけません');
    }

    if (emptySourceSlot.shadowRoot?.querySelector('figure')) {
      throw new Error('空白のみの source slot は figcaption 描画条件に含めてはいけません');
    }
  },
};
