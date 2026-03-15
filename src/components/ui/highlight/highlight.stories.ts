import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './highlight';
import type {
  Highlight,
  HighlightOrigin,
} from './highlight';
import {
  DOCUMENT_STYLE_ID,
  HIGHLIGHT_SCOPE_SELECTOR,
} from './highlight';

const ORIGINS = ['search', 'user'] as const satisfies HighlightOrigin[];

const getHost = (canvasElement: Element, id: string): Highlight => {
  const host = canvasElement.querySelector<Highlight>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getInnerMark = (host: Highlight): HTMLElement => {
  const mark = host.querySelector<HTMLElement>(':scope > mark');
  if (!mark) {
    throw new Error(`ui-highlight#${host.id} 直下の mark が見つかりません`);
  }
  return mark;
};

const getMarkById = (canvasElement: Element, id: string): HTMLElement => {
  const mark = canvasElement.querySelector<HTMLElement>(`#${id}`);
  if (!mark) {
    throw new Error(`#${id} が見つかりません`);
  }
  return mark;
};

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const toPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isNearlyEqual = (actual: number, expected: number, tolerance = 0.75): boolean =>
  Math.abs(actual - expected) <= tolerance;

const parseRgbChannels = (value: string): [number, number, number] => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D コンテキストを取得できません');
  }

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const pixel = context.getImageData(0, 0, 1, 1).data;
  return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
};

const srgbToLinear = (channel: number): number => {
  const normalized = channel / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (color: string): number => {
  const [r, g, b] = parseRgbChannels(color);
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

const getContrastRatio = (foreground: string, background: string): number => {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
};

const getInjectedStyleTag = (): HTMLStyleElement => {
  const styleTag = document.getElementById(DOCUMENT_STYLE_ID);
  if (!(styleTag instanceof HTMLStyleElement)) {
    throw new Error(`#${DOCUMENT_STYLE_ID} が見つかりません`);
  }
  return styleTag;
};

const meta: Meta<Highlight> = {
  title: 'Components/Highlight',
  component: 'ui-highlight',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
ハイライトコンポーネントです。

- 最終DOMはネイティブ \`mark\`
- 適用スコープは \`.prose mark\` と \`ui-highlight > mark\` / \`ui-search-highlight > mark\`
- 通常モードは塗りつぶしではなく、線状のハイライトを \`box-shadow\` で描画
- \`origin\` は \`search\` / \`user\` を受け取り、\`data-origin\` へ反映
- \`forced-colors\` / \`print\` では背景依存を避け、下線で非色シグナルを維持
        `,
      },
    },
  },
  argTypes: {
    origin: {
      control: 'inline-radio',
      options: ORIGINS,
      table: {
        type: { summary: "'search' | 'user'" },
        defaultValue: { summary: "'search'" },
      },
      description: 'ハイライトの発生源',
    },
    current: {
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
      description: '現在フォーカス中の検索ヒットかどうか',
    },
    text: {
      control: 'text',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
      description: 'スロット未指定時の表示テキスト',
    },
  },
};

export default meta;
type Story = StoryObj<Highlight>;

/**
 * 基本契約:
 * - `ui-highlight` は `mark` を出力する
 * - セマンティクスを壊す属性（role/tabindex）を付けない
 */
export const Default: Story = {
  args: {
    origin: 'search',
    current: false,
    text: '検索キーワード',
  },
  render: (args) => html`
    <ui-highlight
      id="default-highlight"
      origin="${args.origin}"
      ?current="${args.current}"
      text="${args.text}"
    ></ui-highlight>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'default-highlight');
    await host.updateComplete;

    const mark = getInnerMark(host);
    if (mark.tagName !== 'MARK') {
      throw new Error('ui-highlight はネイティブ mark を出力する必要があります');
    }

    if (mark.textContent !== '検索キーワード') {
      throw new Error('mark のテキストに前後の不要な空白を含めてはいけません');
    }

    if (normalizeText(mark.textContent) !== '検索キーワード') {
      throw new Error('mark のテキストが想定どおりではありません');
    }

    if (mark.getAttribute('data-origin') !== 'search') {
      throw new Error('default の data-origin は "search" である必要があります');
    }

    if (mark.getAttribute('data-current') !== 'false') {
      throw new Error('default の data-current は "false" である必要があります');
    }

    if (mark.hasAttribute('aria-current')) {
      throw new Error('current=false のとき aria-current を付与してはいけません');
    }

    if (mark.hasAttribute('role') || mark.hasAttribute('tabindex')) {
      throw new Error('mark に不要なインタラクション属性を付与してはいけません');
    }

    const markStyle = getComputedStyle(mark);
    const borderRadius = toPx(markStyle.borderRadius);
    if (!(borderRadius > 0)) {
      throw new Error('mark に角丸トークンが適用されていません');
    }

    if (!isNearlyEqual(toPx(markStyle.paddingLeft), 0) || !isNearlyEqual(toPx(markStyle.paddingRight), 0)) {
      throw new Error('mark に左右 padding を入れてはいけません');
    }

    if (markStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      throw new Error('通常モードで塗りつぶし背景を持ってはいけません');
    }

    if (markStyle.boxShadow === 'none') {
      throw new Error('通常モードで線状ハイライトが消失しています');
    }

    if (markStyle.textDecorationLine.includes('underline')) {
      throw new Error('通常モードでは常時下線を表示してはいけません');
    }
  },
};

/**
 * Markdown 由来の子テキスト:
 * - `<ui-highlight>text</ui-highlight>` をそのまま描画できる
 */
export const SlottedTextFromMarkdown: Story = {
  render: () => html`
    <ui-highlight id="markdown-highlight" origin="user"
      >Markdown ハイライト</ui-highlight
    >
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'markdown-highlight');
    await host.updateComplete;

    const mark = getInnerMark(host);
    const directMarks = host.querySelectorAll(':scope > mark');
    const directTextNodes = Array.from(host.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);

    if (directMarks.length !== 1) {
      throw new Error(`mark は 1 つだけ描画される必要があります: actual=${String(directMarks.length)}`);
    }

    if (directTextNodes.length !== 0) {
      throw new Error('初期の生テキストノードがホスト直下に残ってはいけません');
    }

    if (normalizeText(mark.textContent) !== 'Markdown ハイライト') {
      throw new Error('Markdown 由来の子テキストを mark へ引き継げていません');
    }

    if (mark.getAttribute('data-origin') !== 'user') {
      throw new Error('Markdown 由来の highlight でも origin を保持する必要があります');
    }

    if (mark.getAttribute('data-current') !== 'false') {
      throw new Error('current 未指定時の data-current は false である必要があります');
    }
  },
};

/**
 * バリアント × 状態:
 * - origin: search / user
 * - state: current true / false
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 0.75rem;
      }

      .cell {
        padding: 0.75rem;
        border: 1px dashed var(--border-default, #d7d7d7);
        border-radius: var(--radius-sm, 4px);
      }

      .label {
        margin-block-end: 0.35rem;
        font-size: 11px;
        color: var(--fg-muted, #666);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>

    <div class="matrix">
      <div class="cell">
        <div class="label">search x passive</div>
        <ui-highlight id="matrix-search-passive" origin="search" text="検索ヒット"></ui-highlight>
      </div>

      <div class="cell">
        <div class="label">search x current</div>
        <ui-highlight id="matrix-search-current" origin="search" current text="現在の検索ヒット"></ui-highlight>
      </div>

      <div class="cell">
        <div class="label">user x passive</div>
        <ui-highlight id="matrix-user-passive" origin="user" text="手動ハイライト"></ui-highlight>
      </div>

      <div class="cell">
        <div class="label">user x current</div>
        <ui-highlight id="matrix-user-current" origin="user" current text="現在の手動ハイライト"></ui-highlight>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const matrix = [
      { id: 'matrix-search-passive', origin: 'search', current: false },
      { id: 'matrix-search-current', origin: 'search', current: true },
      { id: 'matrix-user-passive', origin: 'user', current: false },
      { id: 'matrix-user-current', origin: 'user', current: true },
    ] as const;

    const hosts = matrix.map(({ id }) => getHost(canvasElement, id));
    await Promise.all(hosts.map((host) => host.updateComplete));

    for (const item of matrix) {
      const host = getHost(canvasElement, item.id);
      const mark = getInnerMark(host);

      if (mark.getAttribute('data-origin') !== item.origin) {
        throw new Error(`${item.id} の data-origin が不正です`);
      }

      if (mark.getAttribute('data-current') !== String(item.current)) {
        throw new Error(`${item.id} の data-current が不正です`);
      }

      if (item.current) {
        if (mark.getAttribute('aria-current') !== 'true') {
          throw new Error(`${item.id} は current=true のため aria-current="true" が必要です`);
        }
      } else if (mark.hasAttribute('aria-current')) {
        throw new Error(`${item.id} は current=false のため aria-current を持ってはいけません`);
      }
    }
  },
};

/**
 * 事故が多い境界条件:
 * - 不正 origin のフォールバック
 * - text 未指定時の空文字安全性
 * - スコープ外 mark へのスタイル漏れ防止
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <style>
      #boundary-scope {
        --radius-sm: 12px;
      }
    </style>

    <div id="boundary-scope">
      <ui-highlight id="boundary-invalid-origin" origin="invalid" text="不正origin"></ui-highlight>

      <ui-highlight id="boundary-empty-text"></ui-highlight>

      <div class="prose">
        <p>prose scope: <mark id="boundary-prose-mark">本文ハイライト</mark></p>
      </div>

      <p>scope outside: <mark id="boundary-plain-mark">通常mark</mark></p>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidOrigin = getHost(canvasElement, 'boundary-invalid-origin');
    const emptyText = getHost(canvasElement, 'boundary-empty-text');
    await Promise.all([invalidOrigin.updateComplete, emptyText.updateComplete]);

    const invalidMark = getInnerMark(invalidOrigin);
    if (invalidMark.getAttribute('data-origin') !== 'search') {
      throw new Error('不正 origin は "search" へフォールバックする必要があります');
    }

    const emptyMark = getInnerMark(emptyText);
    if (normalizeText(emptyMark.textContent) !== '') {
      throw new Error('text 未指定時は空文字である必要があります');
    }

    const scopeRoot = canvasElement.querySelector<HTMLElement>('#boundary-scope');
    if (!scopeRoot) {
      throw new Error('#boundary-scope が見つかりません');
    }

    const expectedRadius = toPx(getComputedStyle(scopeRoot).getPropertyValue('--radius-sm'));

    const proseMark = getMarkById(canvasElement, 'boundary-prose-mark');
    const plainMark = getMarkById(canvasElement, 'boundary-plain-mark');

    const proseStyle = getComputedStyle(proseMark);
    const emptyStyle = getComputedStyle(emptyMark);
    const plainStyle = getComputedStyle(plainMark);

    if (!isNearlyEqual(toPx(proseStyle.borderRadius), expectedRadius)) {
      throw new Error('.prose mark にトークン由来の border-radius が適用されていません');
    }

    if (!isNearlyEqual(toPx(emptyStyle.borderRadius), expectedRadius)) {
      throw new Error('ui-highlight 内 mark にトークン由来の border-radius が適用されていません');
    }

    const plainRadiusMatches = isNearlyEqual(toPx(plainStyle.borderRadius), expectedRadius);
    const plainShadowMatches = plainStyle.boxShadow === proseStyle.boxShadow;
    if (plainRadiusMatches && plainShadowMatches) {
      throw new Error('スコープ外 mark に highlight スタイルが漏れています');
    }
  },
};

/**
 * メディア/トークン契約:
 * - スタイル注入は1回のみ
 * - forced-colors / print / token 参照を保持
 */
export const MediaAndTokenContracts: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.5rem;">
      <ui-highlight id="contract-a" origin="search" text="A"></ui-highlight>
      <ui-highlight id="contract-b" origin="user" current text="B"></ui-highlight>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const hostA = getHost(canvasElement, 'contract-a');
    const hostB = getHost(canvasElement, 'contract-b');
    await Promise.all([hostA.updateComplete, hostB.updateComplete]);

    const styleTags = document.querySelectorAll<HTMLStyleElement>(`#${DOCUMENT_STYLE_ID}`);
    if (styleTags.length !== 1) {
      throw new Error(`スタイル注入は1回であるべきですが ${String(styleTags.length)} 回です`);
    }

    const styleTag = getInjectedStyleTag();
    const cssText = styleTag.textContent;

    if (!cssText.includes(HIGHLIGHT_SCOPE_SELECTOR)) {
      throw new Error('Scope Contract のセレクタが不足しています');
    }
    if (!cssText.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors 契約が不足しています');
    }
    if (!cssText.includes('@media print')) {
      throw new Error('print 契約が不足しています');
    }
    if (!cssText.includes('var(--bg-highlight-subtle)')) {
      throw new Error('背景トークン参照が不足しています');
    }
    if (!cssText.includes('var(--radius-sm)')) {
      throw new Error('角丸トークン参照が不足しています');
    }
    if (!cssText.includes('box-shadow: inset 0 -0.5em 0')) {
      throw new Error('線状ハイライトの box-shadow 契約が不足しています');
    }
    if (!cssText.includes('text-decoration: none')) {
      throw new Error('通常モードで下線を抑制する契約が不足しています');
    }
    if (!cssText.includes('text-decoration-line: underline')) {
      throw new Error('forced-colors/print 向けの非色シグナル契約が不足しています');
    }
    if (!cssText.includes('color: currentColor')) {
      throw new Error('print 時に currentColor を使う可読性契約が不足しています');
    }
    if (cssText.includes('CanvasText') || cssText.includes('Highlight')) {
      throw new Error('Highlight 固有の強制カラーハードコードは禁止です');
    }

    const markA = getInnerMark(hostA);
    const markB = getInnerMark(hostB);
    const styleA = getComputedStyle(markA);
    const styleB = getComputedStyle(markB);
    if (styleA.boxShadow !== styleB.boxShadow) {
      throw new Error('origin/state の違いで線状ハイライトの見た目が変化してはいけません');
    }
  },
};

/**
 * Dark Mode + Contrast 契約:
 * - セマンティックトークン参照で Light/Dark 両方に追従する
 * - `--fg-default` on `--bg-highlight-subtle` が 4.5:1 以上
 */
export const DarkModeTokenAndContrastContract: Story = {
  render: () => html`
    <style>
      .theme {
        display: grid;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: var(--radius-sm, 4px);
      }

      .theme + .theme {
        margin-top: 0.75rem;
      }

      .theme-title {
        font-size: 12px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--fg-muted, #666);
      }

      #highlight-theme-light {
        --bg-highlight-subtle: oklch(96% 0.04 65);
        --fg-default: oklch(20% 0.03 250);
        background: oklch(98% 0.01 250);
        color: var(--fg-default);
      }

      #highlight-theme-dark {
        --bg-highlight-subtle: oklch(25% 0.05 65);
        --fg-default: oklch(90% 0.01 250);
        background: oklch(12% 0.02 250);
        color: var(--fg-default);
      }

      .probe {
        display: none;
      }
    </style>

    <div id="highlight-theme-light" class="theme">
      <div class="theme-title">Light Token Set</div>
      <div id="probe-light-fg" class="probe" style="color: var(--fg-default);"></div>
      <div id="probe-light-bg" class="probe" style="background: var(--bg-highlight-subtle);"></div>
      <div class="prose">
        <p><mark id="dark-contract-light-prose">Light prose mark</mark></p>
      </div>
      <ui-highlight id="dark-contract-light-component" origin="search" text="Light component mark"></ui-highlight>
    </div>

    <div id="highlight-theme-dark" class="theme">
      <div class="theme-title">Dark Token Set</div>
      <div id="probe-dark-fg" class="probe" style="color: var(--fg-default);"></div>
      <div id="probe-dark-bg" class="probe" style="background: var(--bg-highlight-subtle);"></div>
      <div class="prose">
        <p><mark id="dark-contract-dark-prose">Dark prose mark</mark></p>
      </div>
      <ui-highlight id="dark-contract-dark-component" origin="user" current text="Dark component mark"></ui-highlight>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const lightComponent = getHost(canvasElement, 'dark-contract-light-component');
    const darkComponent = getHost(canvasElement, 'dark-contract-dark-component');
    await Promise.all([lightComponent.updateComplete, darkComponent.updateComplete]);

    const scenarios = [
      {
        proseMarkId: 'dark-contract-light-prose',
        component: lightComponent,
        fgProbeId: 'probe-light-fg',
        bgProbeId: 'probe-light-bg',
        label: 'light',
      },
      {
        proseMarkId: 'dark-contract-dark-prose',
        component: darkComponent,
        fgProbeId: 'probe-dark-fg',
        bgProbeId: 'probe-dark-bg',
        label: 'dark',
      },
    ] as const;

    const shadowValues: string[] = [];

    for (const scenario of scenarios) {
      const proseMark = getMarkById(canvasElement, scenario.proseMarkId);
      const componentMark = getInnerMark(scenario.component);
      const fgProbe = getMarkById(canvasElement, scenario.fgProbeId);
      const bgProbe = getMarkById(canvasElement, scenario.bgProbeId);

      const proseStyle = getComputedStyle(proseMark);
      const componentStyle = getComputedStyle(componentMark);
      const fgProbeColor = getComputedStyle(fgProbe).color;
      const bgProbeColor = getComputedStyle(bgProbe).backgroundColor;

      if (proseStyle.color !== fgProbeColor || componentStyle.color !== fgProbeColor) {
        throw new Error(`${scenario.label}: mark の文字色が --fg-default を追従していません`);
      }

      if (proseStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' || componentStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        throw new Error(
          `${scenario.label}: mark は塗りつぶし背景を持たない必要があります`,
        );
      }

      if (proseStyle.boxShadow === 'none' || componentStyle.boxShadow === 'none') {
        throw new Error(`${scenario.label}: 線状ハイライトが描画されていません`);
      }

      shadowValues.push(proseStyle.boxShadow, componentStyle.boxShadow);

      const contrast = getContrastRatio(fgProbeColor, bgProbeColor);
      if (contrast < 4.5) {
        throw new Error(
          `${scenario.label}: --fg-default と --bg-highlight-subtle のコントラスト比が不足しています (${contrast.toFixed(2)}:1, fg=${fgProbeColor}, bg=${bgProbeColor})`,
        );
      }
    }

    if (shadowValues[0] === shadowValues[2] && shadowValues[1] === shadowValues[3]) {
      throw new Error('Light/Dark で線状ハイライトが同一になっており、テーマトークン差分を反映できていません');
    }
  },
};
