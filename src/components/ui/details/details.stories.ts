import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './details';
import type { Details, DetailsVariant } from './details';

interface MatrixCase {
  id: string;
  variant: DetailsVariant;
  open: boolean;
  summary: string;
};

const MATRIX_CASES: readonly MatrixCase[] = [
  { id: 'matrix-default-closed', variant: 'default', open: false, summary: 'Default / Closed' },
  { id: 'matrix-default-open', variant: 'default', open: true, summary: 'Default / Open' },
  { id: 'matrix-bordered-closed', variant: 'bordered', open: false, summary: 'Bordered / Closed' },
  { id: 'matrix-bordered-open', variant: 'bordered', open: true, summary: 'Bordered / Open' },
];

const getTrigger = (details: Details): HTMLButtonElement => {
  const trigger = details.shadowRoot?.querySelector<HTMLButtonElement>('button.trigger');
  if (!trigger) throw new Error('button.trigger が見つかりません');
  return trigger;
};

const getContentWrapper = (details: Details): HTMLElement => {
  const content = details.shadowRoot?.querySelector<HTMLElement>('.content-wrapper');
  if (!content) throw new Error('.content-wrapper が見つかりません');
  return content;
};

const meta: Meta<Details> = {
  title: 'Components/Details',
  component: 'ui-details',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
段階的開示（Progressive Disclosure）を実現する詳細折りたたみです。
Native <details> ではなく、\`button + grid-template-rows + opacity + inert\` で
開閉アニメーションと閉状態のコンテンツ隔離を両立します。

## 重要仕様
- \`aria-label\` は必須（空文字不可）
- \`summary\` slot がある場合は \`summary\` 属性より優先
- \`open\` と \`aria-expanded\` は常に同期
- 状態変化時に \`toggle\` イベントを1回発火
        `,
      },
    },
  },
  argTypes: {
    ariaLabel: {
      control: 'text',
      description: 'トリガーのアクセシブルネーム（必須）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    summary: {
      control: 'text',
      description: '見出しテキスト（summary slot 未指定時のフォールバック）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    open: {
      control: 'boolean',
      description: '開閉状態',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    variant: {
      control: 'select',
      options: ['default', 'bordered'],
      description: '外枠バリアント',
      table: {
        type: { summary: "'default' | 'bordered'" },
        defaultValue: { summary: "'default'" },
      },
    },
  },
};

export default meta;
type Story = StoryObj<Details>;

/**
 * 基本ケース。
 * 初期閉状態で ARIA・inert 同期を確認します。
 */
export const Default: Story = {
  args: {
    ariaLabel: '関連情報を開閉',
    summary: '関連情報',
    open: false,
    variant: 'default',
  },
  render: (args) => html`
    <ui-details
      id="details-default"
      aria-label="${args.ariaLabel}"
      summary="${args.summary}"
      ?open="${args.open}"
      variant="${args.variant}"
    >
      <p style="margin: 0;">このセクションは、必要な時だけ読む補足情報です。</p>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#details-default');
    if (!details) throw new Error('#details-default が見つかりません');
    await details.updateComplete;

    const trigger = getTrigger(details);
    const content = getContentWrapper(details);

    if (trigger.tagName !== 'BUTTON') {
      throw new Error('トリガーは button 要素である必要があります');
    }
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('初期状態の aria-expanded は "false" である必要があります');
    }
    if (!content.hasAttribute('inert')) {
      throw new Error('閉状態では content に inert が必要です');
    }
    if (content.getAttribute('aria-hidden') !== 'true') {
      throw new Error('閉状態では content の aria-hidden は "true" である必要があります');
    }
  },
};

/**
 * 意味のある組み合わせ: `variant × open/closed`。
 * 表示差分と状態同期（aria-expanded / inert / aria-hidden）を一括検証します。
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
      }
      .matrix-row {
        display: grid;
        gap: 0.5rem;
      }
      .matrix-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--fg-muted, oklch(48% 0.01 250));
      }
    </style>
    <div class="matrix">
      ${MATRIX_CASES.map(
        (item) => html`
          <div class="matrix-row">
            <div class="matrix-label">${item.summary}</div>
            <ui-details
              id="${item.id}"
              aria-label="${item.summary} 詳細"
              summary="${item.summary}"
              variant="${item.variant}"
              ?open="${item.open}"
            >
              <p style="margin: 0;">
                variant="${item.variant}" / open="${String(item.open)}" の検証コンテンツです。
              </p>
            </ui-details>
          </div>
        `,
      )}
    </div>
  `,
  play: async ({ canvasElement }) => {
    for (const testCase of MATRIX_CASES) {
      const details = canvasElement.querySelector<Details>(`#${testCase.id}`);
      if (!details) throw new Error(`#${testCase.id} が見つかりません`);
      await details.updateComplete;

      const trigger = getTrigger(details);
      const content = getContentWrapper(details);
      const root = details.shadowRoot?.querySelector<HTMLElement>('.root');
      if (!root) throw new Error(`#${testCase.id} の .root が見つかりません`);

      if (details.variant !== testCase.variant) {
        throw new Error(`#${testCase.id}: variant が期待値と一致しません`);
      }
      if (details.open !== testCase.open) {
        throw new Error(`#${testCase.id}: open が期待値と一致しません`);
      }
      if (trigger.getAttribute('aria-expanded') !== String(testCase.open)) {
        throw new Error(`#${testCase.id}: aria-expanded が open と同期していません`);
      }
      if (content.getAttribute('aria-hidden') !== String(!testCase.open)) {
        throw new Error(`#${testCase.id}: aria-hidden が open と同期していません`);
      }

      const isInert = content.hasAttribute('inert');
      if (isInert === testCase.open) {
        throw new Error(`#${testCase.id}: inert の状態が open と逆転していません`);
      }

      const hasBorderedClass = root.classList.contains('bordered');
      if (testCase.variant === 'bordered' && !hasBorderedClass) {
        throw new Error(`#${testCase.id}: bordered バリアントなのに .bordered クラスがありません`);
      }
      if (testCase.variant === 'default' && hasBorderedClass) {
        throw new Error(`#${testCase.id}: default バリアントなのに .bordered クラスがあります`);
      }
    }
  },
};

/**
 * 境界条件: 状態同期とイベント発火の一貫性。
 * `toggle` が「状態変化1回につき1回」発火し、重複発火しないことを確認します。
 */
export const ToggleEventAndStateSync: Story = {
  render: () => html`
    <ui-details id="toggle-sync" aria-label="詳細情報を開閉" summary="状態同期テスト">
      <div>
        <p style="margin: 0 0 0.5rem;">開閉とイベント同期を検証します。</p>
        <button id="inner-action" type="button">内部アクション</button>
      </div>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#toggle-sync');
    if (!details) throw new Error('#toggle-sync が見つかりません');
    await details.updateComplete;

    const trigger = getTrigger(details);
    const content = getContentWrapper(details);
    const observedStates: boolean[] = [];
    let toggleCount = 0;

    details.addEventListener('toggle', (event: Event) => {
      const customEvent = event as CustomEvent<{ open: boolean }>;
      observedStates.push(customEvent.detail.open);
      toggleCount += 1;
    });

    trigger.click();
    await details.updateComplete;

    if (!details.open) throw new Error('1回目クリック後は open=true である必要があります');
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('open=true 時は aria-expanded="true" である必要があります');
    }
    if (content.hasAttribute('inert')) {
      throw new Error('open=true 時は inert が外れている必要があります');
    }

    trigger.click();
    await details.updateComplete;

    if (details.hasAttribute('open')) {
      throw new Error('2回目クリック後は open=false である必要があります');
    }
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('open=false 時は aria-expanded="false" である必要があります');
    }
    if (!content.hasAttribute('inert')) {
      throw new Error('open=false 時は inert が付与されている必要があります');
    }

    // 同値代入では再発火しないことを確認
    details.open = false;
    await details.updateComplete;

    if (toggleCount !== 2) {
      throw new Error(`toggle の発火回数は2回のはずですが ${String(toggleCount)} 回です`);
    }
    if (observedStates.length !== 2 || observedStates[0] !== true || observedStates[1] !== false) {
      throw new Error('toggle.detail.open のシーケンスが [true, false] と一致しません');
    }

    const controlsId = trigger.getAttribute('aria-controls');
    if (!controlsId || controlsId !== content.id) {
      throw new Error('aria-controls が content id を参照していません');
    }
  },
};

/**
 * 境界条件: `summary` slot が `summary` 属性より優先されること。
 */
export const SummarySlotPriority: Story = {
  render: () => html`
    <ui-details
      id="slot-priority"
      aria-label="スロット優先サマリー"
      summary="属性サマリー（表示されない想定）"
      open
    >
      <span slot="summary">
        <strong>スロットで上書きされた見出し</strong>
      </span>
      <p style="margin: 0;">summary slot が優先されることを確認します。</p>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#slot-priority');
    if (!details) throw new Error('#slot-priority が見つかりません');
    await details.updateComplete;

    const summarySlot = details.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="summary"]');
    if (!summarySlot) throw new Error('summary slot が見つかりません');

    const assigned = summarySlot.assignedElements({ flatten: true });
    if (assigned.length !== 1) {
      throw new Error(`summary slot の割り当て要素数は1件のはずですが ${String(assigned.length)} 件です`);
    }

    const triggerText = getTrigger(details).textContent.replace(/\s+/g, ' ').trim();
    if (!triggerText.includes('スロットで上書きされた見出し')) {
      throw new Error('slot の見出しテキストがトリガーに反映されていません');
    }
    if (triggerText.includes('属性サマリー（表示されない想定）')) {
      throw new Error('summary 属性のフォールバックが表示されてしまっています');
    }
  },
};

/**
 * 境界条件: icon-only trigger。
 * summary 未指定でも `aria-label` だけで操作可能であることを確認します。
 */
export const IconOnlyTrigger: Story = {
  render: () => html`
    <ui-details id="icon-only" aria-label="通知の詳細を開閉">
      <p style="margin: 0;">
        summary 未指定。アイコンのみトリガー + aria-label で意味を伝達します。
      </p>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#icon-only');
    if (!details) throw new Error('#icon-only が見つかりません');
    await details.updateComplete;

    const trigger = getTrigger(details);
    const summary = details.shadowRoot?.querySelector<HTMLElement>('.summary');
    if (!summary) throw new Error('.summary が見つかりません');

    if ((summary.textContent).trim() !== '') {
      throw new Error('icon-only ケースでは summary テキストが空である必要があります');
    }
    if (trigger.getAttribute('aria-label') !== '通知の詳細を開閉') {
      throw new Error('aria-label が期待値と一致しません');
    }

    let eventCount = 0;
    details.addEventListener('toggle', (event: Event) => {
      const customEvent = event as CustomEvent<{ open: boolean }>;
      if (!customEvent.detail.open) {
        throw new Error('1回目の toggle は open=true のはずです');
      }
      eventCount += 1;
    });

    trigger.click();
    await details.updateComplete;

    if (!details.open) throw new Error('クリック後に open=true へ遷移しませんでした');
    if (eventCount !== 1) throw new Error(`toggle が1回発火する想定ですが ${String(eventCount)} 回です`);
  },
};

/**
 * 境界条件: `aria-label` 必須制約。
 * 空文字に変更した時、開発時エラー通知が発生することを確認します。
 */
export const AccessibleNameRequiredBoundary: Story = {
  render: () => html`
    <ui-details id="a11y-boundary" aria-label="一時ラベル" summary="aria-label 必須境界">
      <p style="margin: 0;">aria-label の必須チェックを検証します。</p>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#a11y-boundary');
    if (!details) throw new Error('#a11y-boundary が見つかりません');
    await details.updateComplete;

    const originalError = console.error;
    const capturedMessages: string[] = [];

    console.error = (...args: unknown[]) => {
      const message = args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' ');
      capturedMessages.push(message);
    };

    try {
      details.ariaLabel = '';
      await details.updateComplete;
    } finally {
      console.error = originalError;
    }

    if (capturedMessages.length === 0) {
      throw new Error('aria-label 空文字時のエラーログが検出できませんでした');
    }
    if (!capturedMessages.some((message) => message.includes('[ui-details]'))) {
      throw new Error('ui-details 由来のエラーログが検出できませんでした');
    }

    const trigger = getTrigger(details);
    if (trigger.hasAttribute('aria-label')) {
      throw new Error('aria-label 空文字時は aria-label 属性が出力されない想定です');
    }
  },
};
