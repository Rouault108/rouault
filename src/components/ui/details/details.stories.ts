import type { Meta, StoryObj } from '@storybook/web-components';
import { CSSResult, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import './details';
import { Details, type DetailsVariant } from './details';

interface MatrixCase {
  id: string;
  variant: DetailsVariant;
  open: boolean;
  summary: string;
}

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

const getComponentCssText = (): string => {
  const styles = Details.styles;
  const styleList = Array.isArray(styles) ? (styles as CSSResult[]) : [styles];
  return styleList
    .map((style) => ('cssText' in style && typeof style.cssText === 'string' ? style.cssText : ''))
    .join('\n');
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
- 通常利用では \`summary\` または \`summary\` slot が必須
- \`aria-label\` は icon-only 利用時にのみ必須
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
      description: 'icon-only 利用時のトリガーのアクセシブルネーム',
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
    region: {
      control: 'boolean',
      description: 'コンテンツをランドマーク領域（role="region"）として扱う',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
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
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    summary: '関連情報',
    open: false,
    variant: 'default',
  },
  render: (args) => html`
    <ui-details
      id="details-default"
      aria-label="${ifDefined(args.ariaLabel.trim() ? args.ariaLabel : undefined)}"
      summary="${args.summary}"
      ?open=${args.open}
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
    if (trigger.hasAttribute('aria-label')) {
      throw new Error('通常利用では trigger に aria-label を出力してはいけません');
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
  parameters: { rouaultContractKind: 'interaction-contract' },
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
        color: var(--fg-muted, oklch(48% 0 0));
      }
    </style>
    <div class="matrix">
      ${MATRIX_CASES.map(
        (item) => html`
          <div class="matrix-row">
            <div class="matrix-label">${item.summary}</div>
            <ui-details
              id="${item.id}"
              summary="${item.summary}"
              variant="${item.variant}"
              ?open=${item.open}
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
      if (trigger.hasAttribute('aria-label')) {
        throw new Error(
          `#${testCase.id}: 可視 summary があるため aria-label は内部へ反映してはいけません`,
        );
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
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-details id="toggle-sync" summary="状態同期テスト">
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

    const innerAction = details.querySelector<HTMLButtonElement>('#inner-action');
    if (!innerAction) throw new Error('#inner-action が見つかりません');
    innerAction.focus();
    if (document.activeElement === innerAction) {
      throw new Error('閉状態で inert が有効なら内部要素へフォーカス移動できない必要があります');
    }
  },
};

/**
 * 境界条件: キーボード契約。
 * トリガーが native button であり、ブラウザ標準の Enter/Space 操作を利用できることを担保します。
 */
export const KeyboardInteraction: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-details id="keyboard-toggle" summary="Keyboard Interaction">
      <p style="margin: 0;">Enter と Space で開閉できることを検証します。</p>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#keyboard-toggle');
    if (!details) throw new Error('#keyboard-toggle が見つかりません');
    await details.updateComplete;

    const trigger = getTrigger(details);
    if (trigger.tagName !== 'BUTTON') {
      throw new Error('キーボード契約のため trigger は button 要素である必要があります');
    }
    if (trigger.getAttribute('type') !== 'button') {
      throw new Error('trigger の type は button である必要があります');
    }

    trigger.focus();
    if (details.shadowRoot?.activeElement !== trigger) {
      throw new Error('trigger がフォーカス可能である必要があります');
    }

    trigger.click();
    await details.updateComplete;
    if (!details.open) throw new Error('button 操作で open=true である必要があります');

    trigger.click();
    await details.updateComplete;
    if (details.open as boolean) throw new Error('button 再操作で open=false である必要があります');
  },
};

/**
 * 境界条件: `summary` slot が `summary` 属性より優先されること。
 */
export const SummarySlotPriority: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-details id="slot-priority" summary="属性サマリー（表示されない想定）" open>
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
      throw new Error(
        `summary slot の割り当て要素数は1件のはずですが ${String(assigned.length)} 件です`,
      );
    }

    const assignedText = assigned[0]?.textContent.replace(/\s+/g, ' ').trim() ?? '';
    if (assignedText !== 'スロットで上書きされた見出し') {
      throw new Error('summary slot に期待した見出しが割り当てられていません');
    }

    const trigger = getTrigger(details);
    if (trigger.hasAttribute('aria-label')) {
      throw new Error('summary slot がある通常利用では aria-label を内部へ反映してはいけません');
    }
  },
};

/**
 * A11y 契約: 通常利用では可視 summary がアクセシブルネームの主ソースになること。
 */
export const AccessibleNameContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-details id="a11y-contract" summary="可視サマリー契約">
      <p style="margin: 0;">通常利用では可視 summary をアクセシブルネームとして扱います。</p>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#a11y-contract');
    if (!details) throw new Error('#a11y-contract が見つかりません');
    await details.updateComplete;

    const trigger = getTrigger(details);
    const summary = details.shadowRoot?.querySelector<HTMLElement>('.summary');
    if (!summary) throw new Error('.summary が見つかりません');

    if (trigger.hasAttribute('aria-label')) {
      throw new Error('通常利用では trigger に aria-label を出力してはいけません');
    }
    if (summary.textContent.trim() !== '可視サマリー契約') {
      throw new Error('可視 summary が期待どおりに描画されていません');
    }
  },
};

/**
 * 境界条件: icon-only trigger。
 * summary 未指定でも `aria-label` だけで操作可能であることを確認します。
 */
export const IconOnlyBoundary: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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

    if (summary.textContent.trim() !== '') {
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
    if (eventCount !== 1)
      throw new Error(`toggle が1回発火する想定ですが ${String(eventCount)} 回です`);
  },
};

/**
 * 境界条件: 可視 summary と aria-label の併用は正規利用として扱わないこと。
 */
export const AccessibleNameMismatchBoundary: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <ui-details id="a11y-mismatch" summary="可視サマリー">
      <p style="margin: 0;">可視 summary と aria-label の併用を開発時警告として検知します。</p>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#a11y-mismatch');
    if (!details) throw new Error('#a11y-mismatch が見つかりません');
    await details.updateComplete;

    const trigger = getTrigger(details);
    const warnMessages: string[] = [];
    const originalWarn = console.warn;

    try {
      console.warn = (...args: unknown[]) => {
        warnMessages.push(args.map((arg) => String(arg)).join(' '));
      };

      details.ariaLabel = '別名ラベル';
      await details.updateComplete;
    } finally {
      console.warn = originalWarn;
    }

    if (!warnMessages.some((message) => message.includes('[ui-details]'))) {
      throw new Error('可視 summary と aria-label の併用時は開発時警告が必要です');
    }
    if (trigger.hasAttribute('aria-label')) {
      throw new Error('可視 summary がある場合は aria-label を内部 button に反映してはいけません');
    }
  },
};

/**
 * A11y: region モードで role と aria-labelledby が正しく付与されること。
 */
export const RegionLandmark: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-details id="region-case" summary="よくある質問" region>
      <p style="margin: 0;">独立したセクションとして扱う内容です。</p>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#region-case');
    if (!details) throw new Error('#region-case が見つかりません');
    await details.updateComplete;

    const trigger = getTrigger(details);
    const content = getContentWrapper(details);
    if (content.getAttribute('role') !== 'region') {
      throw new Error('region=true のとき content に role="region" が必要です');
    }
    if (content.getAttribute('aria-labelledby') !== trigger.id) {
      throw new Error('region=true のとき aria-labelledby は trigger id を参照する必要があります');
    }
  },
};

/**
 * Reduced Motion 契約: 0.01ms 短縮と遅延除去を維持すること。
 */
export const ReducedMotionContract: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <ui-details id="reduced-motion-contract" summary="Reduced Motion">
      <p style="margin: 0;">モーション抑制契約の退行検知用ストーリーです。</p>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#reduced-motion-contract');
    if (!details) throw new Error('#reduced-motion-contract が見つかりません');
    await details.updateComplete;

    const cssText = getComponentCssText();

    if (!cssText.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error('prefers-reduced-motion 契約が定義されていません');
    }
    if (!cssText.includes('transition-duration: 0.01ms !important;')) {
      throw new Error('reduced-motion 時の 0.01ms 短縮が不足しています');
    }
    if (!cssText.includes('transition-delay: 0ms !important;')) {
      throw new Error('reduced-motion 時の delay 除去が不足しています');
    }
  },
};

/**
 * Forced Colors 契約: システムカラー追従の退行検知。
 */
export const ForcedColorsContract: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <ui-details id="forced-colors-contract" summary="Forced Colors">
      <p style="margin: 0;">forced-colors 契約の退行検知用ストーリーです。</p>
    </ui-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#forced-colors-contract');
    if (!details) throw new Error('#forced-colors-contract が見つかりません');
    await details.updateComplete;

    const cssText = getComponentCssText();

    if (!cssText.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors 契約が定義されていません');
    }
    if (!cssText.includes('CanvasText')) {
      throw new Error('forced-colors 時のシステムカラー追従が不足しています');
    }
  },
};

/**
 * Dark Mode 契約: セマンティックトークン参照を維持すること。
 */
export const DarkModeTokenContract: Story = {
  parameters: {
    rouaultContractKind: 'boundary-contract',
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <div style="padding: 1rem; background: #11151b; border-radius: 8px;">
      <ui-details id="dark-mode-contract" summary="Dark Surface Contract" open>
        <p style="margin: 0;">暗色面でもセマンティックトークン参照が崩れないことを確認します。</p>
      </ui-details>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>('#dark-mode-contract');
    if (!details) throw new Error('#dark-mode-contract が見つかりません');
    await details.updateComplete;

    const cssText = getComponentCssText();

    if (!cssText.includes('var(--fg-default')) {
      throw new Error('fg-default のセマンティックトークン参照が不足しています');
    }
    if (!cssText.includes('var(--fg-muted')) {
      throw new Error('fg-muted のセマンティックトークン参照が不足しています');
    }
  },
};
