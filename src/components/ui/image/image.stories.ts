import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './image';
import type { ImageLoading, UiImage } from './image';

const SAMPLE_IMAGE_SRC = new URL('../../../assets/images/sample.jpg', import.meta.url).href;

const SECOND_IMAGE_SRC = new URL('../../../assets/images/sample-2.jpeg', import.meta.url).href;

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

const getCloseButton = (image: UiImage): HTMLButtonElement => {
  const closeButton = image.shadowRoot?.querySelector<HTMLButtonElement>('button.close-button');
  if (!closeButton) throw new Error('button.close-button が見つかりません');
  return closeButton;
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

const getStyleText = (image: UiImage): string => {
  interface StyleTextLike {
    cssText: string;
  }

  const collectCssText = (styles: unknown): string => {
    if (Array.isArray(styles)) {
      return styles.map((item) => collectCssText(item)).join('\n');
    }
    if (typeof styles === 'object' && styles !== null && 'cssText' in styles) {
      const styleText = styles as StyleTextLike;
      return styleText.cssText;
    }
    return '';
  };

  const ctor = image.constructor as { styles?: unknown };
  const declaredStyleText = collectCssText(ctor.styles);
  if (declaredStyleText !== '') return declaredStyleText;

  const shadowRoot = image.shadowRoot;
  if (!shadowRoot) throw new Error('shadowRoot が見つかりません');

  const style = shadowRoot.querySelector('style');
  if (style?.textContent) return style.textContent;

  const sheetText = shadowRoot.adoptedStyleSheets
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
  if (sheetText !== '') return sheetText;

  throw new Error('style が見つかりません');
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

- \`empty / loading / loaded / error\` を分離し、\`zoomable\` 時のみ Lightbox を持つ
- trigger は \`aria-expanded\` / \`aria-controls\` / \`aria-haspopup\` を公開し、caption を名称へ混入しない
- Lightbox は close button / backdrop / Escape で閉じ、close 後は trigger へフォーカス復帰する
- \`width/height\` は intrinsic size hint として扱い、読み込み前は aspect-ratio または最小高さで面積を予約する
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
      description: '拡大モードの採用可否',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'true' } },
    },
    width: {
      control: { type: 'number', min: 1, step: 1 },
      description: 'intrinsic 幅ヒント',
      table: { type: { summary: 'number | undefined' } },
    },
    height: {
      control: { type: 'number', min: 1, step: 1 },
      description: 'intrinsic 高さヒント',
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
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="max-width: 760px;">
      <ui-image
        id="default-image"
        src="${SAMPLE_IMAGE_SRC}"
        alt="サンプル画像"
        caption="サンプル1画像のキャプション"
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
    if (trigger.hasAttribute('aria-describedby')) {
      throw new Error('trigger は caption を aria-describedby で参照してはいけません');
    }

    const dialogId = trigger.getAttribute('aria-controls');
    if (!dialogId || !image.shadowRoot?.getElementById(dialogId)) {
      throw new Error('aria-controls の参照先 dialog は常に実在する必要があります');
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
    const caption = image.shadowRoot.querySelector<HTMLElement>('figcaption.caption');
    if (!caption) throw new Error('figcaption.caption が見つかりません');
    if (dialog.getAttribute('aria-describedby') !== caption.id) {
      throw new Error('Lightbox dialog は figcaption を aria-describedby で参照する必要があります');
    }

    const closeButton = getCloseButton(image);
    if (closeButton.getAttribute('aria-label') !== '閉じる') {
      throw new Error('Lightbox には accessible name 付きの close button が必要です');
    }
    if (image.shadowRoot.activeElement !== closeButton) {
      throw new Error('Lightbox open 直後は close button へフォーカスを移動する必要があります');
    }

    const zoomedImage = image.shadowRoot.querySelector<HTMLImageElement>('.lightbox-image');
    if (!zoomedImage) throw new Error('.lightbox-image が見つかりません');
    zoomedImage.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await image.updateComplete;
    await waitFrame();

    if (trigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('dialog 内容面のクリックは close 契機に含めてはいけません');
    }

    closeButton.click();
    await image.updateComplete;
    await waitFrame();

    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('Lightbox close 後は aria-expanded="false" が必要です');
    }
    if (image.shadowRoot.activeElement !== trigger) {
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
  parameters: { rouaultContractKind: 'interaction-contract' },
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
        zoomable="false"
        width="1600"
        height="900"
      ></ui-image>

      <div class="label">static x no-caption</div>
      <ui-image
        id="matrix-static-no-caption"
        src="${SAMPLE_IMAGE_SRC}"
        alt=""
        .zoomable=${false}
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
    const zoomCaptionCaption =
      zoomCaption.shadowRoot?.querySelector<HTMLElement>('figcaption.caption');
    if (!zoomCaptionCaption) throw new Error('zoom+caption で figcaption が必要です');
    if (zoomCaptionTrigger.hasAttribute('aria-describedby')) {
      throw new Error('zoom+caption でも trigger は figcaption を参照してはいけません');
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
    const staticCaptionCaption =
      staticCaption.shadowRoot?.querySelector<HTMLElement>('figcaption.caption');
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
    if (staticNoCaption.shadowRoot?.querySelector('.lightbox')) {
      throw new Error('zoomable=false では Lightbox 自体を描画してはいけません');
    }
  },
};

/**
 * リソース状態:
 * - loading / error / empty の分離
 * - error / empty では open 不可
 */
export const LoadingAndErrorStates: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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

      <ui-image id="state-empty" alt="" caption="empty state"></ui-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const loading = getImage(canvasElement, 'state-loading');
    const error = getImage(canvasElement, 'state-error');
    const empty = getImage(canvasElement, 'state-empty');
    await Promise.all([loading.updateComplete, error.updateComplete, empty.updateComplete]);
    const loadingRootNode = getShadowRoot(loading);
    const errorRootNode = getShadowRoot(error);
    const emptyRootNode = getShadowRoot(empty);

    const loadingRoot = getRootFigure(loading);
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
    const errorIcon = errorFallback.querySelector<HTMLElement>('ui-icon');
    if (errorIcon?.getAttribute('icon') !== 'image-off') {
      throw new Error('error 時のアイコンは image-off である必要があります');
    }
    if (!errorFallback.textContent.includes('画像を読み込めませんでした')) {
      throw new Error('error 文言は alt ではなく失敗状態そのものを示す必要があります');
    }

    const errorTrigger = getTrigger(error);
    if (!errorTrigger.disabled) {
      throw new Error('error 時は trigger を無効化する必要があります');
    }
    if (errorTrigger.getAttribute('aria-haspopup') !== 'dialog') {
      throw new Error('error 時でも trigger は aria-haspopup="dialog" を維持する必要があります');
    }
    if (!errorTrigger.getAttribute('aria-controls')) {
      throw new Error('error 時でも trigger は aria-controls を維持する必要があります');
    }
    if (errorRootNode.querySelector('.lightbox.is-open')) {
      throw new Error('error 時に Lightbox が開いてはいけません');
    }

    const emptyFallback = emptyRootNode.querySelector<HTMLElement>('.error-fallback');
    if (!emptyFallback) throw new Error('empty 時はフォールバック面を表示する必要があります');
    if (!emptyFallback.textContent.includes('画像が指定されていません')) {
      throw new Error('empty 文言は error 文言と分離されている必要があります');
    }
    if (getRootFigure(empty).getAttribute('aria-busy') !== 'false') {
      throw new Error('empty 時は aria-busy="false" である必要があります');
    }
    if (!getTrigger(empty).disabled) {
      throw new Error('empty 時は trigger を無効化する必要があります');
    }
  },
};

/**
 * 操作境界:
 * - close button への初期フォーカス
 * - Tab/Shift+Tab フォーカストラップ
 * - Escape close + trigger へフォーカス復帰
 */
export const LightboxKeyboardAndFocusReturn: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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

    const closeButton = getCloseButton(image);
    if (rootNode.activeElement !== closeButton) {
      throw new Error('展開時は close button へフォーカスを移動する必要があります');
    }

    closeButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    await image.updateComplete;
    if (rootNode.activeElement !== closeButton) {
      throw new Error('Tab は dialog 内の focusable 要素間で循環する必要があります');
    }

    closeButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    );
    await image.updateComplete;
    if (rootNode.activeElement !== closeButton) {
      throw new Error('Shift+Tab も dialog 内の focusable 要素間で循環する必要があります');
    }

    closeButton.dispatchEvent(
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
 * 背景操作契約:
 * - open 中は body/html のスクロールをロック
 * - バックドロップクリックで close
 * - close 時にスクロールロック解除
 */
export const BackdropCloseAndScrollLock: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="max-width: 760px;">
      <ui-image
        id="backdrop-scroll-image"
        src="${SECOND_IMAGE_SRC}"
        alt="Backdrop close sample"
        caption="backdrop close and scroll lock"
        width="1600"
        height="900"
      ></ui-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const image = getImage(canvasElement, 'backdrop-scroll-image');
    await image.updateComplete;
    getThumbnail(image).dispatchEvent(new Event('load'));
    await image.updateComplete;

    const trigger = getTrigger(image);
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    trigger.click();
    await image.updateComplete;
    await waitFrame();

    if (
      document.body.style.overflow !== 'hidden' ||
      document.documentElement.style.overflow !== 'hidden'
    ) {
      throw new Error('Lightbox open 中は body/html のスクロールをロックする必要があります');
    }

    const lightbox = getLightbox(image);
    lightbox.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await image.updateComplete;
    await waitFrame();

    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('バックドロップクリック後は aria-expanded="false" である必要があります');
    }
    if (document.body.style.overflow !== previousBodyOverflow) {
      throw new Error('Lightbox close 後は body の overflow を復元する必要があります');
    }
    if (document.documentElement.style.overflow !== previousHtmlOverflow) {
      throw new Error('Lightbox close 後は html の overflow を復元する必要があります');
    }
  },
};

/**
 * 環境・レイアウト契約:
 * - dark/reduced-motion/forced-colors のスタイル契約
 * - inline prose と mobile caption padding
 * - print 時の Lightbox 非表示
 */
export const EnvironmentAndProseContracts: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div class="prose" style="max-width: 760px;">
      <ui-image
        id="environment-prose-image"
        src="${SAMPLE_IMAGE_SRC}"
        alt="Environment contracts sample"
        caption="environment and prose contracts"
        width="1200"
        height="800"
      ></ui-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const image = getImage(canvasElement, 'environment-prose-image');
    await image.updateComplete;
    const styleText = getStyleText(image);
    const normalizedStyleText = styleText.replace(/\s+/g, '').toLowerCase();

    const requiredSnippets = [
      '@media (prefers-color-scheme: dark)',
      'filter: brightness(var(--brightness-dimmed, 0.85));',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms !important;',
      '@media (forced-colors: active)',
      'border-color: canvastext;',
      '@media (max-width: 767px)',
      ':host-context(.prose) .caption {',
      'padding-inline: var(--space-4, 1rem);',
      '@media print',
      '.lightbox {',
      'display: none !important;',
    ] as const;

    for (const snippet of requiredSnippets) {
      if (!normalizedStyleText.includes(snippet.replace(/\s+/g, '').toLowerCase())) {
        throw new Error(`スタイル契約に必要な定義が不足しています: ${snippet}`);
      }
    }

    const forbiddenSnippets = [
      'width: calc(100% + var(--space-8, 2rem));',
      'margin-inline: var(--space-n4, -1rem);',
      'width: calc(100% + var(--space-16, 4rem));',
      'margin-inline: var(--space-n8, -2rem);',
    ] as const;

    for (const snippet of forbiddenSnippets) {
      if (normalizedStyleText.includes(snippet.replace(/\s+/g, '').toLowerCase())) {
        throw new Error(`inline 既定表示を壊す breakout スタイルが残っています: ${snippet}`);
      }
    }
  },
};

/**
 * 事故が多い境界条件:
 * - 不正 loading 値の fallback
 * - alt="" 時の aria-label fallback
 * - src 未指定の empty fallback
 * - width/height 未指定時の最小高さプレースホルダー
 */
export const BoundaryConditions: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
        src="${BROKEN_IMAGE_SRC}"
        alt="No size broken sample"
        caption="size missing fallback with error"
      ></ui-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const invalidLoading = getImage(canvasElement, 'boundary-invalid-loading');
    const missingSrc = getImage(canvasElement, 'boundary-missing-src');
    const noSize = getImage(canvasElement, 'boundary-no-size');
    await Promise.all([
      invalidLoading.updateComplete,
      missingSrc.updateComplete,
      noSize.updateComplete,
    ]);

    const invalidThumb = getThumbnail(invalidLoading);
    if (invalidThumb.getAttribute('loading') !== 'lazy') {
      throw new Error('不正 loading 値は lazy にフォールバックする必要があります');
    }
    invalidThumb.dispatchEvent(new Event('load'));
    await invalidLoading.updateComplete;

    const invalidTrigger = getTrigger(invalidLoading);
    if (invalidTrigger.getAttribute('aria-label') !== '画像を拡大') {
      throw new Error(
        'alt="" の場合、aria-label は「画像を拡大」にフォールバックする必要があります',
      );
    }

    const missingTrigger = getTrigger(missingSrc);
    if (!missingTrigger.disabled) {
      throw new Error('src 未指定時は trigger が無効化される必要があります');
    }
    if (missingTrigger.getAttribute('aria-haspopup') !== 'dialog') {
      throw new Error('src 未指定時でも aria-haspopup="dialog" を維持する必要があります');
    }
    if (!missingTrigger.getAttribute('aria-controls')) {
      throw new Error('src 未指定時でも aria-controls を維持する必要があります');
    }
    if (missingTrigger.hasAttribute('aria-describedby')) {
      throw new Error('src 未指定時でも trigger は caption を参照してはいけません');
    }
    if (!missingSrc.shadowRoot?.querySelector('.error-fallback')) {
      throw new Error('src 未指定時は empty fallback を表示する必要があります');
    }
    if (!missingSrc.shadowRoot.textContent.includes('画像が指定されていません')) {
      throw new Error('src 未指定時は empty 文言を表示する必要があります');
    }

    const noSizeThumb = getThumbnail(noSize);
    noSizeThumb.dispatchEvent(new Event('error'));
    await noSize.updateComplete;
    const noSizeShell = getMediaShell(noSize);
    const noSizeMinHeight = Number.parseFloat(getComputedStyle(noSizeShell).minHeight);
    if (!(noSizeMinHeight >= 160)) {
      throw new Error(`width/height 未指定時の最小高さが不正です: ${String(noSizeMinHeight)}px`);
    }
    if (getRootFigure(noSize).getAttribute('aria-busy') !== 'false') {
      throw new Error('size 未指定ケースでも error 後は aria-busy="false" である必要があります');
    }
  },
};
