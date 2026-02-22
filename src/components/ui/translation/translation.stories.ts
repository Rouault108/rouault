import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './translation';
import { DOCUMENT_STYLE_ID, MAX_TRIGGER_TEXT_LENGTH, type TranslationRenderMode } from './translation';
import type { UiTranslation } from './translation';

interface MatrixCase {
  id: string;
  mode: TranslationRenderMode;
  open: boolean;
  label: string;
}

const MATRIX_CASES: readonly MatrixCase[] = [
  { id: 'matrix-popover-closed', mode: 'popover', open: false, label: 'popover / closed' },
  { id: 'matrix-popover-open', mode: 'popover', open: true, label: 'popover / open' },
  { id: 'matrix-drawer-closed', mode: 'drawer', open: false, label: 'drawer / closed' },
  { id: 'matrix-drawer-open', mode: 'drawer', open: true, label: 'drawer / open' },
  { id: 'matrix-interlinear-closed', mode: 'interlinear', open: false, label: 'interlinear / closed' },
  { id: 'matrix-interlinear-open', mode: 'interlinear', open: true, label: 'interlinear / open' },
];

const getHost = (canvasElement: Element, id: string): UiTranslation => {
  const host = canvasElement.querySelector<UiTranslation>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getTrigger = (host: UiTranslation): HTMLButtonElement => {
  const trigger = host.querySelector<HTMLButtonElement>('[data-part="trigger"]');
  if (!trigger) {
    throw new Error(`ui-translation#${host.id} の trigger が見つかりません`);
  }
  return trigger;
};

const getContent = (host: UiTranslation): HTMLElement => {
  const content = host.querySelector<HTMLElement>('[data-part="content"]');
  if (!content) {
    throw new Error(`ui-translation#${host.id} の content が見つかりません`);
  }
  return content;
};

const normalize = (value: string | null | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim();

const meta: Meta<UiTranslation> = {
  title: 'Components/Translation',
  component: 'ui-translation',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
翻訳/対訳のためのコンポーネントです。

- Trigger は常に \`button\` を出力（\`aria-controls\` / \`aria-details\` を維持）
- \`render-mode\` に応じて意味論を切り替え
  - \`popover\` / \`drawer\`: \`role="dialog"\` + \`aria-haspopup="dialog"\`
  - \`interlinear\`: \`role="note"\` + \`aria-haspopup\` なし
- 原文が長すぎる場合（151文字以上）は開発時警告を出力
        `,
      },
    },
  },
  argTypes: {
    original: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '原文テキスト',
    },
    translated: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '翻訳テキスト',
    },
    lang: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '原文言語コード',
    },
    targetLang: {
      name: 'target-lang',
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "'ja'" } },
      description: '翻訳言語コード（空の場合は ja にフォールバック）',
    },
    renderMode: {
      name: 'render-mode',
      control: 'inline-radio',
      options: ['popover', 'drawer', 'interlinear'],
      table: {
        type: { summary: "'popover' | 'drawer' | 'interlinear'" },
        defaultValue: { summary: "'popover'" },
      },
      description: 'レンダリングモード',
    },
    open: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: '開閉状態',
    },
  },
};

export default meta;
type Story = StoryObj<UiTranslation>;

/**
 * 基本契約:
 * - Trigger / Content の A11y 契約
 * - open 状態と aria-expanded / hidden の同期
 * - translation-toggle イベント通知
 */
export const Default: Story = {
  render: () => html`
    <p>
      <ui-translation
        id="translation-default"
        original="Je pense, donc je suis."
        translated="我思う、ゆえに我あり。"
        lang="fr"
        target-lang="ja"
        render-mode="popover"
      ></ui-translation>
    </p>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'translation-default');
    await host.updateComplete;

    const trigger = getTrigger(host);
    const content = getContent(host);

    if (trigger.tagName !== 'BUTTON') {
      throw new Error('trigger は button 要素である必要があります');
    }
    if (trigger.getAttribute('type') !== 'button') {
      throw new Error('trigger の type は button である必要があります');
    }
    if (trigger.getAttribute('lang') !== 'fr') {
      throw new Error('trigger の lang は "fr" である必要があります');
    }
    if (trigger.getAttribute('aria-haspopup') !== 'dialog') {
      throw new Error('lookup モードでは aria-haspopup="dialog" が必要です');
    }
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('初期 aria-expanded は false である必要があります');
    }

    const controlsId = trigger.getAttribute('aria-controls');
    if (!controlsId || controlsId !== trigger.getAttribute('aria-details')) {
      throw new Error('aria-controls と aria-details は同じ content ID を参照する必要があります');
    }
    if (content.id !== controlsId) {
      throw new Error('content.id が trigger の参照先と一致しません');
    }
    if (content.getAttribute('role') !== 'dialog') {
      throw new Error('popover の content role は dialog である必要があります');
    }
    if (content.getAttribute('aria-modal') !== 'false') {
      throw new Error('lookup の content は aria-modal="false" である必要があります');
    }
    if (content.getAttribute('lang') !== 'ja') {
      throw new Error('翻訳 content の lang は target-lang を反映する必要があります');
    }
    if (!content.hidden) {
      throw new Error('初期状態の content は hidden=true である必要があります');
    }

    const observed: boolean[] = [];
    host.addEventListener('translation-toggle', (event: Event) => {
      const customEvent = event as CustomEvent<{ open: boolean; renderMode: TranslationRenderMode }>;
      observed.push(customEvent.detail.open);
    });

    trigger.click();
    await host.updateComplete;

    const openedHost = getHost(canvasElement, 'translation-default');
    const openedContent = getContent(openedHost);
    if (!openedHost.open) {
      throw new Error('クリック後に open=true へ遷移しませんでした');
    }
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('open=true 時は aria-expanded="true" が必要です');
    }
    if (openedContent.hidden) {
      throw new Error('open=true 時は hidden=false である必要があります');
    }

    trigger.click();
    await host.updateComplete;

    const closedHost = getHost(canvasElement, 'translation-default');
    const closedContent = getContent(closedHost);
    if (closedHost.open) {
      throw new Error('2回目クリック後に open=false へ戻る必要があります');
    }
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('close 後は aria-expanded="false" である必要があります');
    }
    if (!closedContent.hidden) {
      throw new Error('close 後は hidden=true である必要があります');
    }
    if (observed.length !== 2 || observed[0] !== true || observed[1] !== false) {
      throw new Error('translation-toggle の open シーケンスが [true, false] と一致しません');
    }
  },
};

/**
 * 意味のある組み合わせ:
 * - render-mode × open/closed
 * - role / aria-haspopup / aria-modal の意味論一致
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.75rem;
      }
      .cell {
        display: grid;
        gap: 0.25rem;
        padding: 0.75rem;
        border: 1px dashed var(--border-default, oklch(86% 0.01 250));
      }
      .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--fg-muted, oklch(48% 0.01 250));
      }
    </style>
    <div class="matrix">
      ${MATRIX_CASES.map(
        (item) => html`
          <div class="cell">
            <div class="label">${item.label}</div>
            <ui-translation
              id="${item.id}"
              original="Je vois."
              translated="私は見る。"
              lang="fr"
              target-lang="ja"
              render-mode="${item.mode}"
              ?open="${item.open}"
            ></ui-translation>
          </div>
        `,
      )}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const hosts = MATRIX_CASES.map(item => getHost(canvasElement, item.id));
    await Promise.all(hosts.map(host => host.updateComplete));

    for (const item of MATRIX_CASES) {
      const host = getHost(canvasElement, item.id);
      const trigger = getTrigger(host);
      const content = getContent(host);

      if (host.renderMode !== item.mode) {
        throw new Error(`${item.id}: render-mode の反映が不正です`);
      }
      if (host.open !== item.open) {
        throw new Error(`${item.id}: open の反映が不正です`);
      }
      if (trigger.getAttribute('aria-expanded') !== String(item.open)) {
        throw new Error(`${item.id}: aria-expanded が open と同期していません`);
      }
      if (content.hidden !== !item.open) {
        throw new Error(`${item.id}: content hidden が open と同期していません`);
      }

      const hasPopup = trigger.getAttribute('aria-haspopup');
      const role = content.getAttribute('role');
      const ariaModal = content.getAttribute('aria-modal');

      if (item.mode === 'interlinear') {
        if (hasPopup !== null) {
          throw new Error(`${item.id}: interlinear では aria-haspopup を付与してはいけません`);
        }
        if (role !== 'note') {
          throw new Error(`${item.id}: interlinear の role は note である必要があります`);
        }
        if (ariaModal !== null) {
          throw new Error(`${item.id}: interlinear では aria-modal を付与してはいけません`);
        }
      } else {
        if (hasPopup !== 'dialog') {
          throw new Error(`${item.id}: lookup 系 mode では aria-haspopup="dialog" が必要です`);
        }
        if (role !== 'dialog') {
          throw new Error(`${item.id}: lookup 系 mode の role は dialog である必要があります`);
        }
        if (ariaModal !== 'false') {
          throw new Error(`${item.id}: lookup 系 mode では aria-modal="false" が必要です`);
        }
      }
    }
  },
};

/**
 * 事故が多い境界条件:
 * - 不正 render-mode のフォールバック
 * - 空 target-lang の ja フォールバック
 * - 翻訳未設定時の無効化
 * - 長文 trigger 警告
 * - スタイル注入の重複防止とメディア契約
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-translation
        id="boundary-invalid-mode"
        original="Bonjour."
        translated="こんにちは。"
        render-mode="unknown"
      ></ui-translation>

      <ui-translation
        id="boundary-empty-target"
        original="Bonsoir."
        translated="こんばんは。"
        lang="fr"
        target-lang=""
        render-mode="drawer"
      ></ui-translation>

      <ui-translation
        id="boundary-empty-translated"
        original="Salut."
        translated=""
        lang="fr"
        target-lang="ja"
      ></ui-translation>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidMode = getHost(canvasElement, 'boundary-invalid-mode');
    const emptyTarget = getHost(canvasElement, 'boundary-empty-target');
    const emptyTranslated = getHost(canvasElement, 'boundary-empty-translated');
    await Promise.all([invalidMode.updateComplete, emptyTarget.updateComplete, emptyTranslated.updateComplete]);

    if (invalidMode.renderMode !== 'popover') {
      throw new Error('不正 render-mode は popover へフォールバックする必要があります');
    }
    const invalidContent = getContent(invalidMode);
    if (invalidContent.getAttribute('data-render-mode') !== 'popover') {
      throw new Error('フォールバック後の content data-render-mode が popover ではありません');
    }

    if (emptyTarget.targetLang !== 'ja') {
      throw new Error('target-lang 空文字は ja にフォールバックする必要があります');
    }
    const emptyTargetContent = getContent(emptyTarget);
    if (emptyTargetContent.getAttribute('lang') !== 'ja') {
      throw new Error('content の lang が ja にフォールバックしていません');
    }

    const emptyTrigger = getTrigger(emptyTranslated);
    if (!emptyTrigger.disabled) {
      throw new Error('translated が空の場合、trigger は disabled である必要があります');
    }
    if (emptyTrigger.hasAttribute('aria-controls') || emptyTrigger.hasAttribute('aria-details')) {
      throw new Error('translated が空の場合、aria-controls/aria-details は出力してはいけません');
    }
    if (emptyTranslated.querySelector('[data-part="content"]') !== null) {
      throw new Error('translated が空の場合、content は描画してはいけません');
    }
    emptyTrigger.click();
    await emptyTranslated.updateComplete;
    if (emptyTranslated.open) {
      throw new Error('disabled trigger のクリックで open=true へ遷移してはいけません');
    }

    const originalWarn = console.warn;
    const warnMessages: string[] = [];
    console.warn = (...args: unknown[]): void => {
      warnMessages.push(args.map(arg => (typeof arg === 'string' ? arg : String(arg))).join(' '));
    };

    try {
      const longHost = document.createElement('ui-translation');
      longHost.id = 'boundary-long-trigger';
      longHost.original = 'あ'.repeat(MAX_TRIGGER_TEXT_LENGTH + 1);
      longHost.translated = '長文警告の確認';
      longHost.lang = 'ja';
      longHost.targetLang = 'en';
      canvasElement.append(longHost);
      await longHost.updateComplete;
    } finally {
      console.warn = originalWarn;
    }

    if (
      !warnMessages.some(
        message =>
          message.includes('[ui-translation]') &&
          message.includes(String(MAX_TRIGGER_TEXT_LENGTH)),
      )
    ) {
      throw new Error('長文 trigger 警告（150文字超過）が検出できませんでした');
    }

    const styleTags = document.querySelectorAll<HTMLStyleElement>(`#${DOCUMENT_STYLE_ID}`);
    if (styleTags.length !== 1) {
      throw new Error(`translation の style 注入は1回であるべきですが ${String(styleTags.length)} 回です`);
    }

    const [styleTag] = Array.from(styleTags);
    if (!(styleTag instanceof HTMLStyleElement)) {
      throw new Error('style タグの取得に失敗しました');
    }
    const styleText = styleTag.textContent;
    if (!styleText.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors 契約が style に含まれていません');
    }
    if (!styleText.includes('@media print')) {
      throw new Error('print 契約が style に含まれていません');
    }
    if (!styleText.includes('box-decoration-break')) {
      throw new Error('multiline underline 契約（box-decoration-break）が含まれていません');
    }
  },
};

/**
 * 操作境界:
 * - lookup モードの hover/focus で開き、Escape で閉じる
 */
export const LookupInteractionBoundary: Story = {
  render: () => html`
    <ui-translation
      id="boundary-lookup-interaction"
      original="Cogito."
      translated="私は考える。"
      lang="la"
      target-lang="ja"
      render-mode="popover"
    ></ui-translation>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'boundary-lookup-interaction');
    await host.updateComplete;

    const trigger = getTrigger(host);
    const root = host.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) {
      throw new Error('root 要素が見つかりません');
    }

    root.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await host.updateComplete;
    const openedHost = getHost(canvasElement, 'boundary-lookup-interaction');
    const openedContent = getContent(openedHost);
    if (!openedHost.open || openedContent.hidden) {
      throw new Error('pointerenter で lookup content が開く必要があります');
    }

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await host.updateComplete;
    const closedHost = getHost(canvasElement, 'boundary-lookup-interaction');
    const closedContent = getContent(closedHost);
    if (closedHost.open || !closedContent.hidden) {
      throw new Error('Escape で閉じる必要があります');
    }
    if (normalize(trigger.textContent) !== 'Cogito.') {
      throw new Error('trigger テキストが想定と一致しません');
    }
  },
};
