import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './score';
import type { ScoreLoading, UiScore } from './score';

const INLINE_SCORE_TEMPLATE = html`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 220">
    <rect width="920" height="220" fill="white"></rect>
    <g stroke="#111111" stroke-width="2" fill="none">
      <line x1="40" y1="56" x2="880" y2="56"></line>
      <line x1="40" y1="74" x2="880" y2="74"></line>
      <line x1="40" y1="92" x2="880" y2="92"></line>
      <line x1="40" y1="110" x2="880" y2="110"></line>
      <line x1="40" y1="128" x2="880" y2="128"></line>
    </g>
    <g fill="#111111">
      <ellipse cx="210" cy="92" rx="12" ry="9"></ellipse>
      <ellipse cx="300" cy="74" rx="12" ry="9"></ellipse>
      <ellipse cx="390" cy="110" rx="12" ry="9"></ellipse>
      <ellipse cx="500" cy="92" rx="12" ry="9"></ellipse>
      <ellipse cx="620" cy="74" rx="12" ry="9"></ellipse>
      <ellipse cx="740" cy="110" rx="12" ry="9"></ellipse>
    </g>
  </svg>
`;

const OVERFLOW_INLINE_SCORE_TEMPLATE = html`
  <svg xmlns="http://www.w3.org/2000/svg" width="1800" height="260" viewBox="0 0 1800 260">
    <rect width="1800" height="260" fill="white"></rect>
    <g stroke="#111111" stroke-width="2" fill="none">
      <line x1="40" y1="72" x2="1760" y2="72"></line>
      <line x1="40" y1="92" x2="1760" y2="92"></line>
      <line x1="40" y1="112" x2="1760" y2="112"></line>
      <line x1="40" y1="132" x2="1760" y2="132"></line>
      <line x1="40" y1="152" x2="1760" y2="152"></line>
    </g>
  </svg>
`;

const RUNTIME_SCORE_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1800 260'>
  <rect width='1800' height='260' fill='white'/>
  <g stroke='#111111' stroke-width='2' fill='none'>
    <line x1='40' y1='72' x2='1760' y2='72'/>
    <line x1='40' y1='92' x2='1760' y2='92'/>
    <line x1='40' y1='112' x2='1760' y2='112'/>
    <line x1='40' y1='132' x2='1760' y2='132'/>
    <line x1='40' y1='152' x2='1760' y2='152'/>
  </g>
  <g fill='#111111'>
    <ellipse cx='220' cy='112' rx='12' ry='9'/>
    <ellipse cx='340' cy='92' rx='12' ry='9'/>
    <ellipse cx='460' cy='132' rx='12' ry='9'/>
    <ellipse cx='620' cy='112' rx='12' ry='9'/>
    <ellipse cx='760' cy='92' rx='12' ry='9'/>
    <ellipse cx='920' cy='132' rx='12' ry='9'/>
    <ellipse cx='1080' cy='112' rx='12' ry='9'/>
    <ellipse cx='1240' cy='92' rx='12' ry='9'/>
    <ellipse cx='1400' cy='132' rx='12' ry='9'/>
    <ellipse cx='1560' cy='112' rx='12' ry='9'/>
  </g>
</svg>
`.trim();

const SECOND_RUNTIME_SCORE_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1400 240'>
  <rect width='1400' height='240' fill='white'/>
  <g stroke='#111111' stroke-width='2' fill='none'>
    <line x1='40' y1='70' x2='1360' y2='70'/>
    <line x1='40' y1='90' x2='1360' y2='90'/>
    <line x1='40' y1='110' x2='1360' y2='110'/>
    <line x1='40' y1='130' x2='1360' y2='130'/>
    <line x1='40' y1='150' x2='1360' y2='150'/>
  </g>
  <g fill='#111111'>
    <ellipse cx='200' cy='110' rx='12' ry='9'/>
    <ellipse cx='340' cy='90' rx='12' ry='9'/>
    <ellipse cx='500' cy='130' rx='12' ry='9'/>
    <ellipse cx='700' cy='110' rx='12' ry='9'/>
    <ellipse cx='860' cy='90' rx='12' ry='9'/>
    <ellipse cx='1040' cy='130' rx='12' ry='9'/>
    <ellipse cx='1220' cy='110' rx='12' ry='9'/>
  </g>
</svg>
`.trim();

const MALICIOUS_SCORE_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 200' onload='alert(1)'>
  <script>alert('xss')</script>
  <rect x='40' y='40' width='720' height='120' fill='black' stroke='#000000' onclick='alert(1)'/>
  <a href='javascript:alert(1)'>
    <text x='60' y='110' font-size='24' fill='#111111'>malicious-link</text>
  </a>
</svg>
`.trim();

const toDataSvgUri = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const RUNTIME_SCORE_SRC = toDataSvgUri(RUNTIME_SCORE_SVG);
const SECOND_RUNTIME_SCORE_SRC = toDataSvgUri(SECOND_RUNTIME_SCORE_SVG);
const MALICIOUS_SCORE_SRC = toDataSvgUri(MALICIOUS_SCORE_SVG);
const INVALID_SCORE_SRC = 'data:image/svg+xml;utf8,not-an-svg';

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const waitFor = async (
  predicate: () => boolean,
  errorMessage: string,
  maxFrames = 240,
): Promise<void> => {
  for (let frame = 0; frame < maxFrames; frame += 1) {
    if (predicate()) return;
    await waitFrame();
  }
  throw new Error(errorMessage);
};

const getScore = (canvasElement: Element, id: string): UiScore => {
  const score = canvasElement.querySelector<UiScore>(`#${id}`);
  if (!score) throw new Error(`#${id} が見つかりません`);
  return score;
};

const getShadowRoot = (score: UiScore): ShadowRoot => {
  const root = score.shadowRoot;
  if (!root) throw new Error('shadowRoot が見つかりません');
  return root;
};

const getFigure = (score: UiScore): HTMLElement => {
  const figure = score.shadowRoot?.querySelector<HTMLElement>('figure.root');
  if (!figure) throw new Error('figure.root が見つかりません');
  return figure;
};

const getScrollContainer = (score: UiScore): HTMLElement => {
  const scroll = score.shadowRoot?.querySelector<HTMLElement>('.score-scroll');
  if (!scroll) throw new Error('.score-scroll が見つかりません');
  return scroll;
};

const getErrorRegion = (score: UiScore): HTMLElement => {
  const errorRegion = score.shadowRoot?.querySelector<HTMLElement>('.error');
  if (!errorRegion) throw new Error('.error が見つかりません');
  return errorRegion;
};

const getCaption = (score: UiScore): HTMLElement | null =>
  score.shadowRoot?.querySelector<HTMLElement>('figcaption.caption') ?? null;

const getSkeleton = (score: UiScore): HTMLElement | null =>
  score.shadowRoot?.querySelector<HTMLElement>('.skeleton') ?? null;

const getRuntimeSvg = (score: UiScore): SVGSVGElement | null =>
  score.shadowRoot?.querySelector<SVGSVGElement>('.score-svg-host svg') ?? null;

const getScoreContent = (score: UiScore): HTMLElement => {
  const content = score.shadowRoot?.querySelector<HTMLElement>('.score-content');
  if (!content) throw new Error('.score-content が見つかりません');
  return content;
};

const getInlineSvg = (score: UiScore): SVGSVGElement => {
  const svg = score.querySelector('svg');
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error('inline SVG が見つかりません');
  }
  return svg;
};

const meta: Meta<UiScore> = {
  title: 'Components/Score',
  component: 'ui-score',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
楽譜（SVG）表示用コンポーネントです。

- build-inline（slot内 SVG）を優先し、未提供時は \`src\` を fetch
- \`loading="lazy|eager"\` でネットワーク開始タイミングを制御
- \`aria-label\` / \`aria-describedby\` / \`aria-busy\` を同期
- 失敗時は \`aria-live="polite"\` でエラーメッセージを通知
        `,
      },
    },
  },
  argTypes: {
    src: {
      control: 'text',
      description: 'SVGソースURL（runtime fetch用）',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    caption: {
      control: 'text',
      description: '楽譜下の短い説明文',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    label: {
      control: 'text',
      description: 'スクリーンリーダー向けラベル（推奨: 文脈付き）',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    description: {
      control: 'text',
      description: '詳細説明（sr-only + aria-describedby）',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    aspectRatio: {
      control: 'text',
      description: 'スケルトン比率（例: "4/1"）',
      table: { type: { summary: 'string' }, defaultValue: { summary: "'' (3/1 fallback)" } },
    },
    loading: {
      control: 'inline-radio',
      options: ['lazy', 'eager'] satisfies ScoreLoading[],
      description: '読み込み戦略',
      table: { type: { summary: "'lazy' | 'eager'" }, defaultValue: { summary: "'lazy'" } },
    },
    primary: {
      control: 'boolean',
      description: '主要譜例として role="region" を付与する',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<UiScore>;

export const Default: Story = {
  render: () => html`
    <div style="max-width: 840px;">
      <ui-score
        id="default-score"
        src="${RUNTIME_SCORE_SRC}"
        label="ベートーヴェン 悲愴ソナタ 第1楽章 第1主題"
        caption="譜例1. 第1楽章 第1主題"
        description="ト長調の主題。冒頭は四分音符主体で、主旋律が反復される。"
        aspect-ratio="5/1"
        loading="eager"
        primary
      ></ui-score>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const score = getScore(canvasElement, 'default-score');
    await score.updateComplete;

    const scroll = getScrollContainer(score);
    if (scroll.getAttribute('aria-label') !== '楽譜: ベートーヴェン 悲愴ソナタ 第1楽章 第1主題') {
      throw new Error('aria-label が仕様どおりに設定されていません');
    }
    if (scroll.getAttribute('role') !== 'region') {
      throw new Error('primary=true では role="region" が必要です');
    }

    const describedBy = scroll.getAttribute('aria-describedby');
    if (!describedBy) {
      throw new Error('description 指定時は aria-describedby が必要です');
    }

    await waitFor(() => getRuntimeSvg(score) !== null, 'runtime SVG が描画されませんでした');
    await score.updateComplete;

    if (getFigure(score).getAttribute('aria-busy') !== 'false') {
      throw new Error('読み込み完了後は aria-busy="false" である必要があります');
    }

    const root = getShadowRoot(score);
    if (!root.getElementById(describedBy)) {
      throw new Error('aria-describedby の参照先が見つかりません');
    }

    const svg = getRuntimeSvg(score);
    if (!svg) throw new Error('描画後の SVG が見つかりません');
    if (svg.getAttribute('aria-hidden') !== 'true') {
      throw new Error('SVG は aria-hidden="true" である必要があります');
    }
    if (svg.getAttribute('focusable') !== 'false') {
      throw new Error('SVG は focusable="false" である必要があります');
    }

    if (getErrorRegion(score).textContent.trim() !== '') {
      throw new Error('正常系で error 領域にテキストを出力してはいけません');
    }
    if (!getCaption(score)) {
      throw new Error('caption 指定時は figcaption が必要です');
    }
  },
};

/**
 * 意味のある組み合わせ:
 * - build-inline x primary x description
 * - build-inline x eager
 * - runtime-fetch x eager x no-caption
 * - runtime-fetch x lazy x caption
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
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--fg-muted);
      }
    </style>
    <div class="matrix">
      <div class="label">build-inline x primary x description</div>
      <ui-score
        id="matrix-inline-primary"
        label="譜例1: モチーフ提示"
        caption="譜例1"
        description="冒頭モチーフ。主旋律は2度進行で開始し、3音目で跳躍する。"
        loading="lazy"
        primary
      >
        ${INLINE_SCORE_TEMPLATE}
      </ui-score>

      <div class="label">build-inline x eager</div>
      <ui-score id="matrix-inline-eager" label="譜例1b: build-inline eager" loading="eager">
        ${INLINE_SCORE_TEMPLATE}
      </ui-score>

      <div class="label">runtime-fetch x eager x no-caption</div>
      <ui-score
        id="matrix-runtime-eager"
        src="${SECOND_RUNTIME_SCORE_SRC}"
        label="譜例2: 展開部の変奏"
        aspect-ratio="6/1"
        loading="eager"
      ></ui-score>

      <div class="label">runtime-fetch x lazy x caption</div>
      <ui-score
        id="matrix-runtime-lazy"
        src="${RUNTIME_SCORE_SRC}"
        label="譜例3: 再現部への接続"
        caption="譜例3"
        aspect-ratio="7/1"
        loading="lazy"
      ></ui-score>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const inlinePrimary = getScore(canvasElement, 'matrix-inline-primary');
    const inlineEager = getScore(canvasElement, 'matrix-inline-eager');
    const runtimeEager = getScore(canvasElement, 'matrix-runtime-eager');
    const runtimeLazy = getScore(canvasElement, 'matrix-runtime-lazy');

    await Promise.all([
      inlinePrimary.updateComplete,
      inlineEager.updateComplete,
      runtimeEager.updateComplete,
      runtimeLazy.updateComplete,
    ]);

    if (getFigure(inlinePrimary).getAttribute('aria-busy') !== 'false') {
      throw new Error('build-inline は初期状態で aria-busy="false" である必要があります');
    }
    if (getSkeleton(inlinePrimary)) {
      throw new Error('build-inline では skeleton を描画してはいけません');
    }

    const inlineScroll = getScrollContainer(inlinePrimary);
    if (inlineScroll.getAttribute('role') !== 'region') {
      throw new Error('build-inline + primary では role="region" が必要です');
    }
    if (!inlineScroll.getAttribute('aria-describedby')) {
      throw new Error('description 指定時は aria-describedby が必要です');
    }

    const inlineSvg = getInlineSvg(inlinePrimary);
    await waitFor(
      () => inlineSvg.getAttribute('aria-hidden') === 'true',
      'inline SVG の aria-hidden 反映が完了しませんでした',
    );
    if (inlineSvg.getAttribute('focusable') !== 'false') {
      throw new Error('inline SVG は focusable="false" である必要があります');
    }

    if (getFigure(inlineEager).getAttribute('aria-busy') !== 'false') {
      throw new Error('build-inline + eager は aria-busy="false" である必要があります');
    }
    if (getSkeleton(inlineEager)) {
      throw new Error('build-inline + eager では skeleton を描画してはいけません');
    }
    if (getScrollContainer(inlineEager).hasAttribute('role')) {
      throw new Error('primary 未指定の build-inline は role を出力してはいけません');
    }

    await waitFor(() => getRuntimeSvg(runtimeEager) !== null, 'eager の runtime SVG が描画されませんでした');
    await runtimeEager.updateComplete;
    if (getCaption(runtimeEager)) {
      throw new Error('caption 未指定ケースで figcaption を描画してはいけません');
    }
    if (getScrollContainer(runtimeEager).hasAttribute('aria-describedby')) {
      throw new Error('description 未指定時は aria-describedby を出力してはいけません');
    }

    if (runtimeLazy.loading !== 'lazy') {
      throw new Error('runtime lazy ケースで loading が lazy のまま保持されていません');
    }
    await waitFor(() => getRuntimeSvg(runtimeLazy) !== null, 'lazy の runtime SVG が描画されませんでした');
    await runtimeLazy.updateComplete;
    if (getFigure(runtimeLazy).getAttribute('aria-busy') !== 'false') {
      throw new Error('runtime lazy の読み込み完了後は aria-busy="false" が必要です');
    }
    if (!getCaption(runtimeLazy)) {
      throw new Error('caption 指定ケースで figcaption が描画されていません');
    }
  },
};

/**
 * 状態系:
 * - loading(skeleton) から loaded への遷移
 * - fetch失敗時の polite エラー通知
 * - src未指定時の即時フォールバック
 */
export const LoadingAndErrorStates: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-score
        id="state-loading"
        label="ローディング状態サンプル（遅延フェッチ）"
        loading="eager"
      ></ui-score>

      <ui-score
        id="state-loading-lazy"
        src="${SECOND_RUNTIME_SCORE_SRC}"
        label="ローディング状態サンプル"
        aspect-ratio="6/1"
        loading="lazy"
      ></ui-score>

      <ui-score
        id="state-error"
        src="${INVALID_SCORE_SRC}"
        label="読み込み失敗サンプル"
        loading="eager"
      ></ui-score>

      <ui-score id="state-missing-src" label="ソース未設定サンプル"></ui-score>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const loading = getScore(canvasElement, 'state-loading');
    const loadingLazy = getScore(canvasElement, 'state-loading-lazy');
    const error = getScore(canvasElement, 'state-error');
    const missingSrc = getScore(canvasElement, 'state-missing-src');
    await Promise.all([loading.updateComplete, loadingLazy.updateComplete, error.updateComplete, missingSrc.updateComplete]);

    const originalFetch = globalThis.fetch;
    let resolveDelayedFetch: (response: Response) => void = () => {
      throw new Error('遅延フェッチ解決関数の初期化に失敗しました');
    };
    const delayedFetchPromise = new Promise<Response>((resolve) => {
      resolveDelayedFetch = resolve;
    });

    try {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (requestUrl === '/__score-delayed.svg') {
          return delayedFetchPromise;
        }
        return originalFetch(input, init);
      }) as typeof fetch;

      loading.src = '/__score-delayed.svg';
      await loading.updateComplete;

      await waitFor(
        () => getFigure(loading).getAttribute('aria-busy') === 'true',
        '遅延フェッチ中に aria-busy="true" へ遷移しませんでした',
      );
      const loadingSkeleton = getSkeleton(loading);
      if (!loadingSkeleton?.classList.contains('is-visible')) {
        throw new Error('遅延フェッチ中は skeleton が可視状態である必要があります');
      }

      const delayedSvgResponse = new Response(SECOND_RUNTIME_SCORE_SVG, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      });
      resolveDelayedFetch(delayedSvgResponse);

      await waitFor(() => getRuntimeSvg(loading) !== null, '遅延フェッチ完了後に SVG が描画されませんでした');
      await loading.updateComplete;
      if (getFigure(loading).getAttribute('aria-busy') !== 'false') {
        throw new Error('遅延フェッチ完了後は aria-busy="false" である必要があります');
      }
      if (!getScoreContent(loading).classList.contains('is-visible')) {
        throw new Error('SVG 描画後は score-content が可視状態である必要があります');
      }
    } finally {
      globalThis.fetch = originalFetch;
    }

    if (!getSkeleton(loadingLazy)) {
      throw new Error('runtime fetch lazy ケースには skeleton 要素が必要です');
    }
    await waitFor(() => getRuntimeSvg(loadingLazy) !== null, 'loading lazy ケースの SVG が描画されませんでした');
    await loadingLazy.updateComplete;
    if (getFigure(loadingLazy).getAttribute('aria-busy') !== 'false') {
      throw new Error('loading lazy 完了後は aria-busy="false" である必要があります');
    }

    await waitFor(
      () => getErrorRegion(error).textContent.trim() === '楽譜を読み込めませんでした',
      'error ケースのメッセージが想定どおりに表示されません',
    );
    if (getErrorRegion(error).getAttribute('aria-live') !== 'polite') {
      throw new Error('error 領域は aria-live="polite" である必要があります');
    }
    if (getFigure(error).getAttribute('aria-busy') !== 'false') {
      throw new Error('error 時は aria-busy="false" である必要があります');
    }

    if (getErrorRegion(missingSrc).textContent.trim() !== '楽譜ソースが未設定です') {
      throw new Error('src 未設定時のメッセージが不正です');
    }
    if (getFigure(missingSrc).getAttribute('aria-busy') !== 'false') {
      throw new Error('src 未設定時は aria-busy="false" である必要があります');
    }
  },
};

/**
 * 事故が多い境界条件:
 * - 不正 loading 値の fallback
 * - 不正 aspect-ratio の fallback
 * - runtime SVG サニタイズ（script・onイベント属性・javascript: の除去）
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-score
        id="boundary-invalid-input"
        src="${RUNTIME_SCORE_SRC}"
        label="譜例4: 境界条件"
        loading="invalid"
        aspect-ratio="broken-ratio"
      ></ui-score>

      <ui-score id="boundary-sanitize" src="${MALICIOUS_SCORE_SRC}" label="サニタイズ確認" loading="eager"></ui-score>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidInput = getScore(canvasElement, 'boundary-invalid-input');
    const sanitizeCase = getScore(canvasElement, 'boundary-sanitize');
    await Promise.all([invalidInput.updateComplete, sanitizeCase.updateComplete]);

    if (invalidInput.loading !== 'lazy') {
      throw new Error('不正 loading 値は lazy にフォールバックされる必要があります');
    }

    const invalidSkeleton = getSkeleton(invalidInput);
    if (!invalidSkeleton) throw new Error('invalid-input ケースの skeleton が見つかりません');
    const aspectStyle = invalidSkeleton.getAttribute('style') ?? '';
    if (!aspectStyle.includes('3 / 1')) {
      throw new Error(`aspect-ratio 不正時は 3/1 フォールバックが必要です: ${aspectStyle}`);
    }

    await waitFor(() => getRuntimeSvg(invalidInput) !== null, 'invalid-input の SVG が描画されませんでした');
    await waitFor(() => getRuntimeSvg(sanitizeCase) !== null, 'sanitize ケースの SVG が描画されませんでした');

    const sanitizedSvg = getRuntimeSvg(sanitizeCase);
    if (!sanitizedSvg) throw new Error('sanitize ケースの SVG が見つかりません');
    if (sanitizedSvg.hasAttribute('onload')) {
      throw new Error('SVG root の onload 属性は除去される必要があります');
    }

    const root = getShadowRoot(sanitizeCase);
    if (root.querySelector('.score-svg-host script')) {
      throw new Error('script 要素はサニタイズで除去される必要があります');
    }
    if (sanitizedSvg.querySelector('[href^="javascript:"], [xlink\\:href^="javascript:"]')) {
      throw new Error('javascript: URL はサニタイズで除去される必要があります');
    }

    const rect = sanitizedSvg.querySelector('rect');
    if (!rect) throw new Error('検証対象の rect 要素が見つかりません');
    if (rect.getAttribute('fill') !== 'currentColor') {
      throw new Error('fill="black" は currentColor へ置換される必要があります');
    }
    if (rect.getAttribute('stroke') !== 'currentColor') {
      throw new Error('stroke="#000000" は currentColor へ置換される必要があります');
    }
  },
};

export const VisualModesAndInkContrast: Story = {
  render: () => html`
    <style>
      .mode-grid {
        display: grid;
        gap: 1rem;
      }
      .mode-panel {
        padding: 1rem;
        border-radius: 12px;
        border: 1px solid var(--border-muted);
      }
      .mode-panel.dark {
        background: oklch(20% 0.03 250);
        color: oklch(92% 0.01 250);
      }
    </style>
    <div class="mode-grid">
      <div class="mode-panel">
        <ui-score
          id="mode-light-score"
          src="${SECOND_RUNTIME_SCORE_SRC}"
          label="ライトモード確認"
          loading="eager"
        ></ui-score>
      </div>
      <div class="mode-panel dark">
        <ui-score
          id="mode-dark-score"
          src="${SECOND_RUNTIME_SCORE_SRC}"
          label="ダーク背景確認"
          loading="eager"
        ></ui-score>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const light = getScore(canvasElement, 'mode-light-score');
    const dark = getScore(canvasElement, 'mode-dark-score');
    await Promise.all([light.updateComplete, dark.updateComplete]);

    await waitFor(() => getRuntimeSvg(light) !== null, 'light ケースの SVG が描画されませんでした');
    await waitFor(() => getRuntimeSvg(dark) !== null, 'dark ケースの SVG が描画されませんでした');

    const lightColor = getComputedStyle(getScrollContainer(light)).color;
    const darkColor = getComputedStyle(getScrollContainer(dark)).color;
    const isBlackColor = (value: string): boolean => {
      const normalized = value.replace(/\s+/g, '').toLowerCase();
      return normalized === 'rgb(0,0,0)' || normalized === 'oklch(000)';
    };
    if (!isBlackColor(lightColor) || !isBlackColor(darkColor)) {
      throw new Error(`譜面インク色は常に黒である必要があります: light=${lightColor}, dark=${darkColor}`);
    }
  },
};

export const OverflowAndFadeHints: Story = {
  render: () => html`
    <div style="max-width: 360px;">
      <ui-score id="overflow-fade-score" label="横スクロールヒント確認">${OVERFLOW_INLINE_SCORE_TEMPLATE}</ui-score>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const score = getScore(canvasElement, 'overflow-fade-score');
    await score.updateComplete;
    await waitFor(() => getInlineSvg(score).getAttribute('aria-hidden') === 'true', 'inline SVG の準備が完了しませんでした');

    const scroll = getScrollContainer(score);
    await waitFor(
      () => scroll.classList.contains('has-overflow'),
      'オーバーフロー時に has-overflow クラスが付与されませんでした',
    );
    if (scroll.classList.contains('has-left-fade')) {
      throw new Error('先頭位置では left-fade を表示してはいけません');
    }
    if (!scroll.classList.contains('has-right-fade')) {
      throw new Error('先頭位置では right-fade を表示する必要があります');
    }

    scroll.scrollLeft = scroll.scrollWidth;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFrame();

    if (!scroll.classList.contains('has-left-fade')) {
      throw new Error('末尾位置では left-fade を表示する必要があります');
    }
    if (scroll.classList.contains('has-right-fade')) {
      throw new Error('末尾位置では right-fade を表示してはいけません');
    }
  },
};

export const AccessibilityMediaContracts: Story = {
  render: () => html`
    <ui-score
      id="a11y-media-score"
      src="${SECOND_RUNTIME_SCORE_SRC}"
      label="A11yメディアクエリ契約"
      loading="eager"
    ></ui-score>
  `,
  play: async ({ canvasElement }) => {
    const score = getScore(canvasElement, 'a11y-media-score');
    await score.updateComplete;
    await waitFor(() => getRuntimeSvg(score) !== null, 'A11yメディア契約ケースの SVG が描画されませんでした');

    const styleTag = score.shadowRoot?.querySelector('style');
    const styleFromTag = styleTag?.textContent ?? '';
    const styleFromSheets = (score.shadowRoot?.adoptedStyleSheets ?? [])
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');
    const styleText = `${styleFromTag}\n${styleFromSheets}`;
    if (!styleText.includes('@media (prefers-reduced-motion: reduce)')) {
      throw new Error('reduced-motion 向けメディアクエリが定義されていません');
    }
    if (!styleText.includes('@media (forced-colors: active)')) {
      throw new Error('forced-colors 向けメディアクエリが定義されていません');
    }
    if (!styleText.includes('mask-image: none')) {
      throw new Error('forced-colors 時の mask-image 無効化ルールが見つかりません');
    }
  },
};
