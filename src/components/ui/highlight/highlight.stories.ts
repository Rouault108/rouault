import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './highlight';
import type { Highlight } from './highlight';
import { HIGHLIGHT_RULE_TEMPLATE } from './highlight';

const getHost = (canvasElement: Element, id: string): Highlight => {
  const host = canvasElement.querySelector<Highlight>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }
  return host;
};

const getMark = (host: Highlight): HTMLElement | null =>
  host.querySelector<HTMLElement>(':scope > mark');

const requireMark = (host: Highlight): HTMLElement => {
  const mark = getMark(host);
  if (!mark) {
    throw new Error(`ui-highlight#${host.id} 直下の mark が見つかりません`);
  }
  return mark;
};

const toPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseRgbChannels = (value: string): [number, number, number] => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D コンテキストを取得できません');
  }

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
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
};

const getContrastRatio = (foreground: string, background: string): number => {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
};

const nextFrame = async (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

const meta: Meta<Highlight> = {
  title: 'Components/Highlight',
  component: 'ui-highlight',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
検索ハイライト専用の inline semantic component です。

- 公開タグは \`ui-highlight\` のみ
- 公開入力は \`current-match\` と \`text\`
- 最終DOMはホスト直下のネイティブ \`mark\`
- \`text === null\` のときだけ初期子テキスト fallback を評価
- 解決後文字列が空なら \`mark\` を形成しない
        `,
      },
    },
  },
  argTypes: {
    currentMatch: {
      name: 'current-match',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
      description: '検索ヒット列の現在位置かどうか',
    },
    text: {
      control: 'text',
      table: {
        type: { summary: 'string | null' },
        defaultValue: { summary: 'null' },
      },
      description: '子テキストを与えにくい場合の明示入力',
    },
  },
};

export default meta;
type Story = StoryObj<Highlight>;

export const Default: Story = {
  args: {
    currentMatch: false,
    text: '検索キーワード',
  },
  render: (args) => html`
    <ui-highlight
      id="default-highlight"
      ?current-match=${args.currentMatch}
      .text=${args.text ?? null}
    ></ui-highlight>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'default-highlight');
    await host.updateComplete;

    const mark = requireMark(host);
    if (mark.tagName !== 'MARK') {
      throw new Error('ui-highlight はネイティブ mark を出力する必要があります');
    }
    if (mark.textContent !== '検索キーワード') {
      throw new Error('mark の表示文字列が不正です');
    }
    if (mark.getAttribute('data-current-match') !== 'false') {
      throw new Error('既定状態の data-current-match は false である必要があります');
    }
    if (
      mark.hasAttribute('aria-current') ||
      mark.hasAttribute('role') ||
      mark.hasAttribute('tabindex')
    ) {
      throw new Error('mark に不要な対話属性や ARIA 属性を付与してはいけません');
    }
  },
};

export const CurrentMatchMatrix: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-highlight id="passive-highlight" text="通常ヒット"></ui-highlight>
      <ui-highlight id="current-highlight" current-match text="現在ヒット"></ui-highlight>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const passiveHost = getHost(canvasElement, 'passive-highlight');
    const currentHost = getHost(canvasElement, 'current-highlight');
    await Promise.all([passiveHost.updateComplete, currentHost.updateComplete]);

    const passiveMark = requireMark(passiveHost);
    const currentMark = requireMark(currentHost);

    if (passiveHost.hasAttribute('current-match')) {
      throw new Error('非 current host は current-match 属性を持ってはいけません');
    }
    if (!currentHost.hasAttribute('current-match')) {
      throw new Error('current host は current-match 属性を反映する必要があります');
    }
    if (passiveMark.getAttribute('data-current-match') !== 'false') {
      throw new Error('非 current mark の data-current-match が不正です');
    }
    if (currentMark.getAttribute('data-current-match') !== 'true') {
      throw new Error('current mark の data-current-match が不正です');
    }
  },
};

export const CurrentMatchVisualContract: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-highlight id="visual-passive" text="通常ヒット"></ui-highlight>
      <ui-highlight id="visual-current" current-match text="現在ヒット"></ui-highlight>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const passiveMark = requireMark(getHost(canvasElement, 'visual-passive'));
    const currentMark = requireMark(getHost(canvasElement, 'visual-current'));

    const passiveStyle = getComputedStyle(passiveMark);
    const currentStyle = getComputedStyle(currentMark);

    if (
      passiveStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
      currentStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
    ) {
      throw new Error('通常モードで背景塗りつぶしを持ってはいけません');
    }
    if (passiveStyle.color !== currentStyle.color) {
      throw new Error('current-match の有無で本文色を変えてはいけません');
    }
    if (passiveStyle.boxShadow === 'none' || currentStyle.boxShadow === 'none') {
      throw new Error('線状ハイライトが消失しています');
    }
    if (passiveStyle.boxShadow === currentStyle.boxShadow) {
      throw new Error('current-match=true は最小限の視覚差分を持つ必要があります');
    }
    if (toPx(passiveStyle.paddingLeft) !== 0 || toPx(currentStyle.paddingLeft) !== 0) {
      throw new Error('mark に padding を入れてはいけません');
    }
  },
};

export const ExplicitTextContract: Story = {
  render: () => html`
    <ui-highlight id="explicit-text" text="明示入力">fallback 値</ui-highlight>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'explicit-text');
    await host.updateComplete;

    const mark = requireMark(host);
    if (mark.textContent !== '明示入力') {
      throw new Error('text を明示した場合はその値を最優先しなければなりません');
    }
  },
};

export const FallbackTextContract: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-highlight id="fallback-text">  初期子テキスト  </ui-highlight>
      <ui-highlight id="empty-explicit" text="">  初期子テキスト  </ui-highlight>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fallbackHost = getHost(canvasElement, 'fallback-text');
    const emptyExplicitHost = getHost(canvasElement, 'empty-explicit');
    await Promise.all([fallbackHost.updateComplete, emptyExplicitHost.updateComplete]);

    const fallbackMark = requireMark(fallbackHost);
    if (fallbackMark.textContent !== '初期子テキスト') {
      throw new Error('text===null のときだけ初期子テキスト fallback を使う必要があります');
    }
    if (getMark(emptyExplicitHost) !== null) {
      throw new Error('text が空文字なら fallback せず no-op である必要があります');
    }
  },
};

export const WhitespaceNormalizationContract: Story = {
  render: () => html`
    <ui-highlight id="whitespace-highlight">
        前後は削る
  中間改行は残す
    </ui-highlight>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'whitespace-highlight');
    await host.updateComplete;

    const mark = requireMark(host);
    if (mark.textContent !== '前後は削る\n  中間改行は残す') {
      throw new Error(
        '初期子テキストは前後 trim のみ行い、中間空白や改行を保持する必要があります',
      );
    }
  },
};

export const EmptyResolvedTextContract: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-highlight id="empty-text-attr" text=""></ui-highlight>
      <ui-highlight id="empty-fallback">   </ui-highlight>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const emptyTextAttr = getHost(canvasElement, 'empty-text-attr');
    const emptyFallback = getHost(canvasElement, 'empty-fallback');
    await Promise.all([emptyTextAttr.updateComplete, emptyFallback.updateComplete]);

    if (getMark(emptyTextAttr) !== null || getMark(emptyFallback) !== null) {
      throw new Error('解決後文字列が空なら成功状態の mark を形成してはいけません');
    }
  },
};

export const UpdateLifecycleContract: Story = {
  render: () => html`
    <ui-highlight id="lifecycle-highlight">初期テキスト</ui-highlight>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'lifecycle-highlight');
    await host.updateComplete;

    const initialMark = requireMark(host);
    if (initialMark.textContent !== '初期テキスト') {
      throw new Error('初期 fallback の解決に失敗しています');
    }

    host.textContent = '接続後に書き換えた子ノード';
    await nextFrame();

    const afterDomMutation = requireMark(host);
    if (afterDomMutation.textContent !== '初期テキスト') {
      throw new Error('接続後の Light DOM 変更に自動追従してはいけません');
    }

    host.text = '明示更新';
    await host.updateComplete;

    const explicitMark = requireMark(host);
    if (explicitMark.textContent !== '明示更新') {
      throw new Error('接続後の更新は text 変更でのみ行う必要があります');
    }

    host.text = null;
    await host.updateComplete;

    const fallbackAgain = requireMark(host);
    if (fallbackAgain.textContent !== '初期テキスト') {
      throw new Error('text を null に戻した場合は初回接続時の fallback に戻る必要があります');
    }
  },
};

export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 0.75rem;">
      <ui-highlight id="element-child"><span>要素子</span></ui-highlight>
      <ui-highlight id="direct-mark-child"><mark>直下 mark</mark></ui-highlight>
      <ui-highlight id="nested-highlight-child"><ui-highlight text="nested"></ui-highlight></ui-highlight>
      <div>
        <ui-highlight id="adjacent-a" text="A"></ui-highlight>
        <ui-highlight id="adjacent-b" current-match text="B"></ui-highlight>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ids = [
      'element-child',
      'direct-mark-child',
      'nested-highlight-child',
      'adjacent-a',
      'adjacent-b',
    ] as const;
    const hosts = ids.map((id) => getHost(canvasElement, id));
    await Promise.all(hosts.map((host) => host.updateComplete));

    if (getMark(getHost(canvasElement, 'element-child')) !== null) {
      throw new Error('要素子は fallback 入力文法に含めてはいけません');
    }
    if (getMark(getHost(canvasElement, 'direct-mark-child')) !== null) {
      throw new Error('直下 mark は fallback 入力文法に含めてはいけません');
    }
    if (getMark(getHost(canvasElement, 'nested-highlight-child')) !== null) {
      throw new Error('ネストされた highlight は入力文法として扱ってはいけません');
    }
    if (
      !requireMark(getHost(canvasElement, 'adjacent-a')).textContent ||
      !requireMark(getHost(canvasElement, 'adjacent-b')).textContent
    ) {
      throw new Error('隣接 highlight は独立要素として成立する必要があります');
    }
  },
};

export const MediaAndTokenContracts: Story = {
  render: () => html`
    <ui-highlight id="media-highlight" current-match text="検索ヒット"></ui-highlight>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'media-highlight');
    await host.updateComplete;

    const mark = requireMark(host);
    const style = getComputedStyle(mark);
    const cssText = HIGHLIGHT_RULE_TEMPLATE('ui-highlight > mark');

    if (style.boxShadow === 'none') {
      throw new Error('通常モードで線状ハイライトを維持する必要があります');
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
    if (!cssText.includes('--bg-highlight-current')) {
      throw new Error('current-match 用トークン hook が不足しています');
    }
    if (!cssText.includes("data-current-match='true'")) {
      throw new Error('current-match の styling hook が不足しています');
    }
    if (!cssText.includes('text-decoration-line: underline')) {
      throw new Error('forced-colors / print の非色シグナル契約が不足しています');
    }
  },
};

export const DarkModeTokenAndContrastContract: Story = {
  render: () => html`
    <style>
      .theme {
        display: grid;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: 12px;
      }

      .probe {
        inline-size: 1px;
        block-size: 1px;
      }

      .light {
        --fg-default: oklch(22% 0.03 250);
        --bg-highlight-subtle: oklch(96% 0.04 65);
        --bg-highlight-current: oklch(91% 0.07 72);
        background: white;
        color: var(--fg-default);
      }

      .dark {
        --fg-default: oklch(95% 0.01 250);
        --bg-highlight-subtle: oklch(34% 0.05 65);
        --bg-highlight-current: oklch(42% 0.08 72);
        background: oklch(22% 0.02 250);
        color: var(--fg-default);
      }
    </style>

    <div id="light-theme" class="theme light">
      <div id="light-fg" class="probe" style="background: var(--fg-default);"></div>
      <div id="light-bg" class="probe" style="background: var(--bg-highlight-subtle);"></div>
      <ui-highlight id="light-highlight" current-match text="Light"></ui-highlight>
    </div>

    <div id="dark-theme" class="theme dark">
      <div id="dark-fg" class="probe" style="background: var(--fg-default);"></div>
      <div id="dark-bg" class="probe" style="background: var(--bg-highlight-subtle);"></div>
      <ui-highlight id="dark-highlight" current-match text="Dark"></ui-highlight>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const scenarios = [
      { fgId: 'light-fg', bgId: 'light-bg', highlightId: 'light-highlight', label: 'light' },
      { fgId: 'dark-fg', bgId: 'dark-bg', highlightId: 'dark-highlight', label: 'dark' },
    ] as const;

    for (const scenario of scenarios) {
      const fgProbe = canvasElement.querySelector<HTMLElement>(`#${scenario.fgId}`);
      const bgProbe = canvasElement.querySelector<HTMLElement>(`#${scenario.bgId}`);
      if (!fgProbe || !bgProbe) {
        throw new Error(`${scenario.label} テーマの probe が見つかりません`);
      }

      const contrast = getContrastRatio(
        getComputedStyle(fgProbe).backgroundColor,
        getComputedStyle(bgProbe).backgroundColor,
      );
      if (contrast < 4.5) {
        throw new Error(
          `${scenario.label} テーマで --fg-default と --bg-highlight-subtle のコントラストが不足しています`,
        );
      }

      const host = getHost(canvasElement, scenario.highlightId);
      await host.updateComplete;
      const mark = requireMark(host);
      if (getComputedStyle(mark).boxShadow === 'none') {
        throw new Error(`${scenario.label} テーマで highlight の視覚契約が失われています`);
      }
    }
  },
};
