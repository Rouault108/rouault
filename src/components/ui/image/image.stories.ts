import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './image';
import type { ImageLoading, UiImage } from './image';

const SAMPLE_IMAGE_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='%23d9e7ff'/><stop offset='100%' stop-color='%23f8f3e8'/></linearGradient></defs><rect width='1200' height='800' fill='url(%23g)'/><circle cx='320' cy='320' r='180' fill='%2376a0d4' fill-opacity='0.45'/><circle cx='860' cy='420' r='230' fill='%23d7b46a' fill-opacity='0.35'/><text x='80' y='120' font-size='68' fill='%23222f3a' font-family='sans-serif'>Rouault Visual Sample</text></svg>",
)}`;

const SECOND_IMAGE_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'><rect width='1600' height='900' fill='%23e7ecef'/><path d='M0 780 L300 520 L620 760 L980 430 L1300 760 L1600 560 L1600 900 L0 900 Z' fill='%2390a5b7'/><text x='72' y='122' font-size='72' fill='%23253343' font-family='sans-serif'>Context Diagram</text></svg>",
)}`;

const BROKEN_IMAGE_SRC = 'data:image/png;base64,invalid-base64';

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const getImage = (canvasElement: Element, id: string): UiImage => {
  const image = canvasElement.querySelector<UiImage>(`#${id}`);
  if (!image) throw new Error(`#${id} が見つかりません`);
  return image;
};

const getRootFigure = (image: UiImage): HTMLElement => {
  const root = image.shadowRoot?.querySelector<HTMLElement>('figure.root');
  if (!root) throw new Error('figure.root が見つかりません');
  return root;
};

const getTrigger = (image: UiImage): HTMLButtonElement => {
  const trigger = image.shadowRoot?.querySelector<HTMLButtonElement>('button.trigger');
  if (!trigger) throw new Error('button.trigger が見つかりません');
  return trigger;
};

const getThumbnail = (image: UiImage): HTMLImageElement => {
  const thumbnail = image.shadowRoot?.querySelector<HTMLImageElement>('img.thumbnail-image');
  if (!thumbnail) throw new Error('img.thumbnail-image が見つかりません');
  return thumbnail;
};

const getLightbox = (image: UiImage): HTMLElement => {
  const lightbox = image.shadowRoot?.querySelector<HTMLElement>('.lightbox');
  if (!lightbox) throw new Error('.lightbox が見つかりません');
  return lightbox;
};

const getDialog = (image: UiImage): HTMLElement => {
  const dialog = image.shadowRoot?.querySelector<HTMLElement>('.lightbox-dialog');
  if (!dialog) throw new Error('.lightbox-dialog が見つかりません');
  return dialog;
};

const getMediaShell = (image: UiImage): HTMLElement => {
  const shell = image.shadowRoot?.querySelector<HTMLElement>('.media-shell');
  if (!shell) throw new Error('.media-shell が見つかりません');
  return shell;
};

const getShadowRoot = (image: UiImage): ShadowRoot => {
  const root = image.shadowRoot;
  if (!root) throw new Error('shadowRoot が見つかりません');
  return root;
};

const meta: Meta<UiImage> = {
  title: 'Components/Image',
  component: 'ui-image',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
画像・図版のためのコンポーネントです。

- \`zoomable\` 時は \`button + role="dialog"\` のLightboxを提供
- \`aria-expanded\` / \`aria-controls\` / \`aria-haspopup\` とフォーカス復帰を保証
- ローディング時は Skeleton、エラー時は \`lucide:image-off\` フォールバック
- \`width/height\` でアスペクト比を固定し、未指定時は最小高さでCLSを緩和
        `,
      },
    },
  },
  argTypes: {
    src: {
      control: 'text',
      description: '画像URL',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    alt: {
      control: 'text',
      description: '代替テキスト（装飾画像は空文字）',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    caption: {
      control: 'text',
      description: 'キャプション',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    zoomable: {
      control: 'boolean',
      description: '拡大表示の可否',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'true' } },
    },
    width: {
      control: { type: 'number', min: 1, step: 1 },
      description: '画像幅（CLS防止）',
      table: { type: { summary: 'number | undefined' } },
    },
    height: {
      control: { type: 'number', min: 1, step: 1 },
      description: '画像高さ（CLS防止）',
      table: { type: { summary: 'number | undefined' } },
    },
    loading: {
      control: 'inline-radio',
      options: ['lazy', 'eager'] satisfies ImageLoading[],
      description: '読み込み優先度',
      table: { type: { summary: "'lazy' | 'eager'" }, defaultValue: { summary: "'lazy'" } },
    },
  },
};

export default meta;
type Story = StoryObj<UiImage>;

/**
 * 基本ケース:
 * - zoomable + caption + width/height
 * - Lightbox の ARIA と開閉同期
 */
export const Default: Story = {
  render: () => html`
    <div style="max-width: 760px;">
      <ui-image
        id="default-image"
        src="${SAMPLE_IMAGE_SRC}"
        alt="薄い青とベージュの背景に配置された抽象図版"
        caption="Figure 1. 章導入の抽象図版"
        width="1200"
        height="800"
        loading="lazy"
      ></ui-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const image = getImage(canvasElement, 'default-image');
    await image.updateComplete;

    const root = getRootFigure(image);
    if (root.getAttribute('aria-busy') !== 'true') {
      throw new Error('初期状態は aria-busy="true"（ローディング中）である必要があります');
    }

    const thumbnail = getThumbnail(image);
    thumbnail.dispatchEvent(new Event('load'));
    await image.updateComplete;

    if (root.getAttribute('aria-busy') !== 'false') {
      throw new Error('load 後は aria-busy="false" である必要があります');
    }

    const trigger = getTrigger(image);
    if (trigger.getAttribute('aria-haspopup') !== 'dialog') {
      throw new Error('zoomable の trigger には aria-haspopup="dialog" が必要です');
    }
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('初期状態の aria-expanded は false である必要があります');
    }
    if (!trigger.getAttribute('aria-controls')) {
      throw new Error('trigger には aria-controls が必要です');
    }

    trigger.click();
    await image.updateComplete;
    await waitFrame();

    if (trigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('Lightbox 展開時は aria-expanded="true" が必要です');
    }

    const lightbox = getLightbox(image);
    if (!lightbox.classList.contains('is-open')) {
      throw new Error('Lightbox が開いていません');
    }

    const dialog = getDialog(image);
    if (dialog.getAttribute('role') !== 'dialog' || dialog.getAttribute('aria-modal') !== 'true') {
      throw new Error('Lightbox ダイアログには role="dialog" と aria-modal="true" が必要です');
    }

    const zoomedImage = image.shadowRoot?.querySelector<HTMLImageElement>('.lightbox-image');
    if (!zoomedImage) throw new Error('.lightbox-image が見つかりません');
    zoomedImage.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await image.updateComplete;
    await waitFrame();

    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('Lightbox close 後は aria-expanded="false" が必要です');
    }
    if (image.shadowRoot?.activeElement !== trigger) {
      throw new Error('Lightbox close 後は trigger へフォーカスを戻す必要があります');
    }
  },
};

/**
 * 意味のある組み合わせ:
 * - zoomable × caption 有無
 * - static(zoomable=false) × caption 有無
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
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--fg-muted);
      }
    </style>
    <div class="matrix">
      <div class="label">zoomable x caption</div>
      <ui-image
        id="matrix-zoom-caption"
        src="${SAMPLE_IMAGE_SRC}"
        alt="Zoom with caption"
        caption="zoom + caption"
        width="1200"
        height="800"
      ></ui-image>

      <div class="label">zoomable x no-caption</div>
      <ui-image
        id="matrix-zoom-no-caption"
        src="${SECOND_IMAGE_SRC}"
        alt="Zoom no caption"
        width="1600"
        height="900"
        loading="eager"
      ></ui-image>

      <div class="label">static x caption</div>
      <ui-image
        id="matrix-static-caption"
        src="${SECOND_IMAGE_SRC}"
        alt="Static with caption"
        caption="static + caption"
        ?zoomable="${false}"
        width="1600"
        height="900"
      ></ui-image>

      <div class="label">static x no-caption</div>
      <ui-image
        id="matrix-static-no-caption"
        src="${SAMPLE_IMAGE_SRC}"
        alt=""
        ?zoomable="${false}"
        width="1200"
        height="800"
      ></ui-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ids = [
      'matrix-zoom-caption',
      'matrix-zoom-no-caption',
      'matrix-static-caption',
      'matrix-static-no-caption',
    ] as const;

    const images = ids.map((id) => getImage(canvasElement, id));
    await Promise.all(images.map((image) => image.updateComplete));
    for (const image of images) {
      getThumbnail(image).dispatchEvent(new Event('load'));
    }
    await Promise.all(images.map((image) => image.updateComplete));

    const zoomCaption = getImage(canvasElement, 'matrix-zoom-caption');
    const zoomCaptionTrigger = getTrigger(zoomCaption);
    const zoomCaptionCaption = zoomCaption.shadowRoot?.querySelector<HTMLElement>('figcaption.caption');
    if (!zoomCaptionCaption) throw new Error('zoom+caption で figcaption が必要です');
    if (zoomCaptionTrigger.getAttribute('aria-describedby') !== zoomCaptionCaption.id) {
      throw new Error('zoom+caption は trigger と figcaption を aria-describedby で関連付ける必要があります');
    }

    const zoomNoCaption = getImage(canvasElement, 'matrix-zoom-no-caption');
    const zoomNoCaptionTrigger = getTrigger(zoomNoCaption);
    if (zoomNoCaption.shadowRoot?.querySelector('figcaption.caption')) {
      throw new Error('caption 未指定時は figcaption を描画してはいけません');
    }
    if (zoomNoCaptionTrigger.hasAttribute('aria-describedby')) {
      throw new Error('caption 未指定時は aria-describedby を出力してはいけません');
    }
    if (getThumbnail(zoomNoCaption).getAttribute('loading') !== 'eager') {
      throw new Error('loading="eager" が thumbnail に反映されていません');
    }

    const staticCaption = getImage(canvasElement, 'matrix-static-caption');
    if (staticCaption.shadowRoot?.querySelector('button.trigger')) {
      throw new Error('zoomable=false では button.trigger を描画してはいけません');
    }
    const staticCaptionImage = getThumbnail(staticCaption);
    const staticCaptionCaption = staticCaption.shadowRoot?.querySelector<HTMLElement>('figcaption.caption');
    if (!staticCaptionCaption) throw new Error('static+caption で figcaption が必要です');
    if (staticCaptionImage.getAttribute('aria-describedby') !== staticCaptionCaption.id) {
      throw new Error('static+caption では img が figcaption を参照する必要があります');
    }

    const staticNoCaption = getImage(canvasElement, 'matrix-static-no-caption');
    if (staticNoCaption.shadowRoot?.querySelector('button.trigger')) {
      throw new Error('static/no-caption でも button.trigger を描画してはいけません');
    }
    if (staticNoCaption.shadowRoot?.querySelector('figcaption.caption')) {
      throw new Error('static/no-caption で figcaption は不要です');
    }
    if (getThumbnail(staticNoCaption).hasAttribute('aria-describedby')) {
      throw new Error('static/no-caption で aria-describedby は不要です');
    }
  },
};

/**
 * 状態遷移:
 * - Loading Skeleton
 * - Error Fallback（zoomable 無効化）
 */
export const LoadingAndErrorStates: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-image
        id="state-loading"
        src="${SECOND_IMAGE_SRC}"
        alt="Loading state sample"
        caption="loading state"
        width="1600"
        height="900"
      ></ui-image>

      <ui-image
        id="state-error"
        src="${BROKEN_IMAGE_SRC}"
        alt="破損したサンプル画像"
        caption="error state"
        width="1600"
        height="900"
      ></ui-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const loading = getImage(canvasElement, 'state-loading');
    const error = getImage(canvasElement, 'state-error');
    await Promise.all([loading.updateComplete, error.updateComplete]);
    const loadingRootNode = getShadowRoot(loading);
    const errorRootNode = getShadowRoot(error);

    const loadingRoot = getRootFigure(loading);
    if (loadingRoot.getAttribute('aria-busy') !== 'true') {
      throw new Error('ローディング中は aria-busy="true" が必要です');
    }
    if (!loadingRootNode.querySelector('.placeholder')) {
      throw new Error('ローディング中は placeholder を表示する必要があります');
    }

    getThumbnail(loading).dispatchEvent(new Event('load'));
    await loading.updateComplete;
    if (loadingRoot.getAttribute('aria-busy') !== 'false') {
      throw new Error('load 後は aria-busy="false" が必要です');
    }
    if (loadingRootNode.querySelector('.placeholder')) {
      throw new Error('load 後は placeholder を非表示にする必要があります');
    }

    const errorThumb = getThumbnail(error);
    errorThumb.dispatchEvent(new Event('error'));
    await error.updateComplete;

    const errorFallback = errorRootNode.querySelector<HTMLElement>('.error-fallback');
    if (!errorFallback) throw new Error('error 時は .error-fallback を表示する必要があります');
    const errorIcon = errorFallback.querySelector<HTMLElement>('iconify-icon');
    if (errorIcon?.getAttribute('icon') !== 'lucide:image-off') {
      throw new Error('error 時のアイコンは lucide:image-off である必要があります');
    }

    const errorTrigger = getTrigger(error);
    if (!errorTrigger.disabled) {
      throw new Error('error 時は trigger を無効化する必要があります');
    }
    if (errorRootNode.querySelector('.lightbox.is-open')) {
      throw new Error('error 時に Lightbox が開いてはいけません');
    }
  },
};

/**
 * 操作境界:
 * - Dialog 初期フォーカス
 * - Tab/Shift+Tab フォーカストラップ
 * - Escape close + trigger へフォーカス復帰
 */
export const LightboxKeyboardAndFocusReturn: Story = {
  render: () => html`
    <div style="max-width: 760px;">
      <ui-image
        id="keyboard-focus-image"
        src="${SAMPLE_IMAGE_SRC}"
        alt="Keyboard operation sample"
        caption="focus management"
        width="1200"
        height="800"
      ></ui-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const image = getImage(canvasElement, 'keyboard-focus-image');
    await image.updateComplete;
    const rootNode = getShadowRoot(image);
    getThumbnail(image).dispatchEvent(new Event('load'));
    await image.updateComplete;

    const trigger = getTrigger(image);
    trigger.focus();
    trigger.click();
    await image.updateComplete;
    await waitFrame();

    const dialog = getDialog(image);
    if (rootNode.activeElement !== dialog) {
      throw new Error('展開時は dialog へフォーカスを移動する必要があります');
    }

    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    await image.updateComplete;
    if (rootNode.activeElement !== dialog) {
      throw new Error('Tab は dialog 内で循環する必要があります');
    }

    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    );
    await image.updateComplete;
    if (rootNode.activeElement !== dialog) {
      throw new Error('Shift+Tab も dialog 内で循環する必要があります');
    }

    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await image.updateComplete;
    await waitFrame();

    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('Escape close 後は aria-expanded="false" が必要です');
    }
    if (rootNode.activeElement !== trigger) {
      throw new Error('Escape close 後は trigger にフォーカスを戻す必要があります');
    }
  },
};

/**
 * 事故が多い境界条件:
 * - 不正 loading 値の fallback
 * - alt="" 時の aria-label fallback
 * - src 未指定の error fallback
 * - width/height 未指定時の最小高さプレースホルダー
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <ui-image
        id="boundary-invalid-loading"
        src="${SAMPLE_IMAGE_SRC}"
        alt=""
        loading="invalid"
        width="1200"
        height="800"
      ></ui-image>

      <ui-image id="boundary-missing-src" alt="" caption="src missing fallback"></ui-image>

      <ui-image
        id="boundary-no-size"
        src="${SECOND_IMAGE_SRC}"
        alt="No size sample"
        caption="size missing fallback"
      ></ui-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidLoading = getImage(canvasElement, 'boundary-invalid-loading');
    const missingSrc = getImage(canvasElement, 'boundary-missing-src');
    const noSize = getImage(canvasElement, 'boundary-no-size');
    await Promise.all([invalidLoading.updateComplete, missingSrc.updateComplete, noSize.updateComplete]);

    const invalidThumb = getThumbnail(invalidLoading);
    if (invalidThumb.getAttribute('loading') !== 'lazy') {
      throw new Error('不正 loading 値は lazy にフォールバックする必要があります');
    }
    invalidThumb.dispatchEvent(new Event('load'));
    await invalidLoading.updateComplete;

    const invalidTrigger = getTrigger(invalidLoading);
    if (invalidTrigger.getAttribute('aria-label') !== '画像を拡大') {
      throw new Error('alt="" の場合、aria-label は「画像を拡大」にフォールバックする必要があります');
    }

    const missingTrigger = getTrigger(missingSrc);
    if (!missingTrigger.disabled) {
      throw new Error('src 未指定時は trigger が無効化される必要があります');
    }
    if (!missingSrc.shadowRoot?.querySelector('.error-fallback')) {
      throw new Error('src 未指定時は error fallback を表示する必要があります');
    }

    const noSizeShell = getMediaShell(noSize);
    const noSizeMinHeight = Number.parseFloat(getComputedStyle(noSizeShell).minHeight);
    if (!(noSizeMinHeight >= 160)) {
      throw new Error(`width/height 未指定時の最小高さが不正です: ${String(noSizeMinHeight)}px`);
    }

    getThumbnail(noSize).dispatchEvent(new Event('load'));
    await noSize.updateComplete;
    if (getRootFigure(noSize).getAttribute('aria-busy') !== 'false') {
      throw new Error('size 未指定ケースでも load 後は aria-busy="false" である必要があります');
    }
  },
};
