import { afterEach, describe, expect, it } from 'vitest';
import { enhanceFootnotePopovers } from '../../src/client/post-hydrate/footnote-popover-enhancer.js';
import { enhanceImageLightboxes } from '../../src/client/post-hydrate/image-lightbox-enhancer.js';

const installPopoverPolyfill = (): void => {
  if (typeof HTMLElement.prototype.showPopover !== 'function') {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value(this: HTMLElement) {
        this.hidden = false;
      },
    });
  }

  if (typeof HTMLElement.prototype.hidePopover !== 'function') {
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
      configurable: true,
      value(this: HTMLElement) {
        this.hidden = true;
      },
    });
  }
};

const installDialogPolyfill = (): void => {
  if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
  }

  if (typeof HTMLDialogElement.prototype.close !== 'function') {
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    });
  }
};

installPopoverPolyfill();
installDialogPolyfill();

const withShowModalDescriptor = (value: unknown, callback: () => void): void => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );

  try {
    if (value === undefined) {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    } else {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
        configurable: true,
        value,
      });
    }
    callback();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalDescriptor);
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    }
  }
};

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const createFootnoteRoot = (): HTMLElement => {
  const root = document.createElement('article');
  root.setAttribute('data-note-root', '');
  root.setAttribute('data-footnote-scope', '');
  root.innerHTML = `
    <p>
      enhancer footnote
      <a
        id="fn-enhancer-1-ref-1"
        href="#fn-enhancer-1"
        data-footnote-ref="true"
        data-footnote-id="fn-enhancer-1"
        data-footnote-ref-instance="1"
        data-hydration-key="footnote-popover-enhancer"
        role="doc-noteref"
      >
        <sup>[1]</sup>
      </a>
    </p>
    <section role="doc-endnotes">
      <h2 id="footnote-label">脚注</h2>
      <ol>
        <li id="fn-enhancer-1">
          enhancer footnote body
          <a href="#fn-enhancer-1-ref-1" data-footnote-backref="true" role="doc-backlink">↩︎</a>
        </li>
      </ol>
    </section>
  `;
  return root;
};

const createImageRoot = (): HTMLElement => {
  const root = document.createElement('article');
  root.setAttribute('data-note-root', '');
  root.innerHTML = `
    <figure
      data-image="true"
      data-image-zoomable="true"
      data-hydration-key="image-lightbox-enhancer"
      data-image-lightbox-src="/static/example.png"
      data-image-lightbox-srcset="/static/example.png 1x, /static/example@2x.png 2x"
      data-image-lightbox-sizes="min(100vw, 72rem)"
    >
      <div data-image-preview-frame="true" class="image-preview-frame">
        <img src="/static/example-thumb.png" alt="zoom target" />
        <button hidden type="button" data-image-zoom-trigger="true" class="image-preview-trigger" aria-label="画像を拡大表示: zoom target" aria-haspopup="dialog">
          <span class="image-zoom-trigger__icon static-icon" aria-hidden="true"><svg></svg></span>
        </button>
      </div>
      <figcaption>lightbox caption</figcaption>
    </figure>
  `;
  return root;
};

const getEnhancedPopover = (anchor: HTMLElement): HTMLElement | null => {
  const controls = anchor.getAttribute('aria-controls');
  if (!controls) {
    return null;
  }
  return document.getElementById(controls);
};

const clickPrimary = (target: HTMLElement): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
  });
  target.dispatchEvent(event);
  return event;
};

const waitForClose = (dialog: HTMLDialogElement): Promise<void> =>
  new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(), { once: true });
  });

const setClientRect = (
  element: Element,
  { left, top, width, height }: { left: number; top: number; width: number; height: number },
): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: (): DOMRect => new DOMRect(left, top, width, height),
  });
};

const clampExpectedTop = ({
  anchorTop,
  anchorBottom,
  popoverHeight,
  viewportHeight,
}: {
  anchorTop: number;
  anchorBottom: number;
  popoverHeight: number;
  viewportHeight: number;
}): number => {
  const popoverMargin = 12;
  const popoverOffset = 8;

  const belowTop = anchorBottom + popoverOffset;
  const aboveTop = anchorTop - popoverOffset - popoverHeight;

  let top = belowTop;
  if (belowTop + popoverHeight > viewportHeight - popoverMargin && aboveTop >= popoverMargin) {
    top = aboveTop;
  }

  const maxTop = Math.max(popoverMargin, viewportHeight - popoverMargin - popoverHeight);
  return Math.round(Math.min(Math.max(popoverMargin, top), maxTop));
};

describe('note progressive enhancers', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  });

  it('footnote popover enhancer が static endnotes から popover を生成し aria state を更新すること', () => {
    const root = createFootnoteRoot();
    document.body.append(root);

    enhanceFootnotePopovers(root);

    const anchor = expectPresent(
      root.querySelector<HTMLElement>('a[data-footnote-ref]'),
      'footnote anchor',
    );
    expect(anchor.dataset['footnoteEnhanced']).to.equal('true');

    const popover = expectPresent(getEnhancedPopover(anchor), 'footnote popover');
    expect(popover.parentElement).to.equal(document.body);
    expect(popover.hidden).to.equal(true);
    expect(popover.querySelector('a[data-footnote-backref]')).to.equal(null);

    const footerLink = expectPresent(
      popover.querySelector<HTMLAnchorElement>('.footnote-list-link'),
      'footnote footer link',
    );
    expect(footerLink.getAttribute('href')).to.equal('#fn-enhancer-1');

    clickPrimary(anchor);

    expect(anchor.getAttribute('aria-expanded')).to.equal('true');
    expect(anchor.classList.contains('is-active-trigger')).to.equal(true);
    expect(popover.hidden).to.equal(false);
    expect(popover.textContent).to.contain('enhancer footnote body');

    anchor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(anchor.hasAttribute('aria-expanded')).to.equal(false);
    expect(anchor.classList.contains('is-active-trigger')).to.equal(false);
    expect(popover.hidden).to.equal(true);
    expect(document.activeElement).to.equal(anchor);
  });

  it('footnote popover enhancer が fixed 配置の初期化を inline style に反映すること', () => {
    const root = createFootnoteRoot();
    document.body.append(root);

    enhanceFootnotePopovers(root);

    const anchor = expectPresent(
      root.querySelector<HTMLElement>('a[data-footnote-ref]'),
      'footnote anchor',
    );
    const popover = expectPresent(getEnhancedPopover(anchor), 'footnote popover');

    setClientRect(anchor, { left: 120, top: 160, width: 10, height: 16 });
    setClientRect(popover, { left: 0, top: 0, width: 180, height: 90 });

    clickPrimary(anchor);

    expect(popover.hidden).to.equal(false);
    expect(popover.parentElement).to.equal(document.body);
    expect(popover.style.position).to.equal('fixed');

    // shorthand の inset は left/top 設定後に再シリアライズされるため、
    // 常に "auto" のままではない。
    expect(popover.style.inset).to.equal('184px auto auto 120px');

    expect(popover.style.right).to.equal('auto');
    expect(popover.style.bottom).to.equal('auto');
    expect(popover.style.margin).to.match(/^0(px)?$/);
    expect(popover.style.left).to.equal('120px');
    expect(popover.style.top).to.equal('184px');
  });

  it('footnote popover enhancer が viewport 端で横方向 clamp と上側反転を行うこと', () => {
    const root = createFootnoteRoot();
    document.body.append(root);

    enhanceFootnotePopovers(root);

    const anchor = expectPresent(
      root.querySelector<HTMLElement>('a[data-footnote-ref]'),
      'footnote anchor',
    );
    const popover = expectPresent(getEnhancedPopover(anchor), 'footnote popover');

    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;

    const anchorLeft = viewportWidth - 4;
    const anchorTop = viewportHeight - 24;
    const anchorWidth = 8;
    const anchorHeight = 12;
    const popoverWidth = 240;
    const popoverHeight = 120;

    setClientRect(anchor, {
      left: anchorLeft,
      top: anchorTop,
      width: anchorWidth,
      height: anchorHeight,
    });
    setClientRect(popover, {
      left: 0,
      top: 0,
      width: popoverWidth,
      height: popoverHeight,
    });

    clickPrimary(anchor);

    const expectedLeft = Math.round(
      Math.min(Math.max(12, anchorLeft), Math.max(12, viewportWidth - 12 - popoverWidth)),
    );
    const expectedTop = clampExpectedTop({
      anchorTop,
      anchorBottom: anchorTop + anchorHeight,
      popoverHeight,
      viewportHeight,
    });

    expect(popover.style.left).to.equal(`${expectedLeft.toString()}px`);
    expect(popover.style.top).to.equal(`${expectedTop.toString()}px`);
  });

  it('footnote popover enhancer が open 中の resize で再配置されること', () => {
    const root = createFootnoteRoot();
    document.body.append(root);

    enhanceFootnotePopovers(root);

    const anchor = expectPresent(
      root.querySelector<HTMLElement>('a[data-footnote-ref]'),
      'footnote anchor',
    );
    const popover = expectPresent(getEnhancedPopover(anchor), 'footnote popover');

    setClientRect(anchor, { left: 40, top: 80, width: 10, height: 12 });
    setClientRect(popover, { left: 0, top: 0, width: 160, height: 80 });

    clickPrimary(anchor);

    expect(popover.style.left).to.equal('40px');
    expect(popover.style.top).to.equal('100px');

    setClientRect(anchor, { left: 220, top: 260, width: 10, height: 12 });
    window.dispatchEvent(new Event('resize'));

    expect(popover.style.left).to.equal('220px');
    expect(popover.style.top).to.equal('280px');
  });

  it('image lightbox enhancer が static figure に dialog を付与し close 後に scroll / focus を戻すこと', async () => {
    const root = createImageRoot();
    document.body.append(root);

    enhanceImageLightboxes(root);

    const figure = root.querySelector<HTMLElement>('figure[data-image]');
    const trigger = root.querySelector<HTMLButtonElement>('button[data-image-zoom-trigger]');
    const dialog = root.querySelector<HTMLDialogElement>('dialog[data-image-lightbox-dialog]');
    const image = dialog?.querySelector<HTMLImageElement>('img.image-lightbox-image');
    const caption = dialog?.querySelector<HTMLElement>('.image-lightbox-caption');
    const closeButton = dialog?.querySelector<HTMLButtonElement>('[data-image-lightbox-close]');
    const figureChildren = Array.from(figure?.children ?? []);

    expect(figure?.dataset['imageEnhanced']).to.equal('true');
    expect(trigger?.hidden).to.equal(false);
    expect(dialog).to.not.equal(null);
    expect(dialog?.getAttribute('aria-modal')).to.equal('true');
    expect(dialog?.getAttribute('aria-label')).to.equal('拡大画像');
    expect(dialog?.querySelector('[data-image-lightbox-surface]')).to.not.equal(null);
    expect(figureChildren.at(-1)?.tagName.toLowerCase()).to.equal('figcaption');
    expect(figureChildren.indexOf(expectPresent(dialog, 'dialog'))).to.equal(
      figureChildren.indexOf(expectPresent(caption?.parentElement?.parentElement, 'caption dialog')),
    );
    expect(image?.getAttribute('src')).to.contain('/static/example.png');
    expect(image?.getAttribute('alt')).to.equal('zoom target');
    expect(image?.getAttribute('srcset')).to.equal(
      '/static/example.png 1x, /static/example@2x.png 2x',
    );
    expect(image?.getAttribute('sizes')).to.equal('min(100vw, 72rem)');
    expect(caption?.textContent).to.equal('lightbox caption');
    expect(
      closeButton?.querySelector('.image-lightbox-close__icon.static-icon > svg'),
    ).not.to.equal(null);

    trigger?.focus();
    trigger?.click();

    expect(dialog?.open).to.equal(true);
    expect(document.documentElement.style.overflow).to.equal('hidden');
    expect(document.body.style.overflow).to.equal('hidden');

    const closeSettled = waitForClose(expectPresent(dialog, 'dialog'));
    closeButton?.click();
    await closeSettled;

    expect(dialog?.open).to.equal(false);
    expect(document.documentElement.style.overflow).to.equal('');
    expect(document.body.style.overflow).to.equal('');
    expect(document.activeElement).to.equal(trigger);
  });

  it('image lightbox enhancer は keyboard activation 用の native button contract を維持すること', async () => {
    const root = createImageRoot();
    document.body.append(root);

    enhanceImageLightboxes(root);

    const trigger = expectPresent(
      root.querySelector<HTMLButtonElement>('button[data-image-zoom-trigger]'),
      'image trigger',
    );
    const dialog = expectPresent(
      root.querySelector<HTMLDialogElement>('dialog[data-image-lightbox-dialog]'),
      'image dialog',
    );
    const closeButton = expectPresent(
      dialog.querySelector<HTMLButtonElement>('[data-image-lightbox-close]'),
      'lightbox close button',
    );

    trigger.focus();

    expect(document.activeElement).to.equal(trigger);
    expect(trigger.tagName.toLowerCase()).to.equal('button');
    expect(trigger.type).to.equal('button');
    expect(trigger.getAttribute('aria-haspopup')).to.equal('dialog');

    // programmaticなKeyboardEvent dispatchではnative buttonのUA既定activationを
    // 安定して発火できないため、native button + click pathとしてcontractを固定する。
    clickPrimary(trigger);

    expect(dialog.open).to.equal(true);

    const closeSettled = waitForClose(dialog);
    closeButton.click();
    await closeSettled;
  });

  it('image lightbox enhancer は背景 click / Escape で閉じ、画像と caption click では閉じないこと', async () => {
    const root = createImageRoot();
    document.body.append(root);

    enhanceImageLightboxes(root);

    const trigger = expectPresent(
      root.querySelector<HTMLButtonElement>('button[data-image-zoom-trigger]'),
      'image trigger',
    );
    const dialog = expectPresent(
      root.querySelector<HTMLDialogElement>('dialog[data-image-lightbox-dialog]'),
      'image dialog',
    );
    const surface = expectPresent(
      dialog.querySelector<HTMLElement>('[data-image-lightbox-surface]'),
      'lightbox surface',
    );
    const image = expectPresent(
      dialog.querySelector<HTMLImageElement>('img.image-lightbox-image'),
      'lightbox image',
    );
    const caption = expectPresent(
      dialog.querySelector<HTMLElement>('.image-lightbox-caption'),
      'lightbox caption',
    );

    trigger.click();
    expect(dialog.open).to.equal(true);
    clickPrimary(image);
    expect(dialog.open).to.equal(true);
    clickPrimary(caption);
    expect(dialog.open).to.equal(true);
    let closeSettled = waitForClose(dialog);
    clickPrimary(surface);
    await closeSettled;
    expect(dialog.open).to.equal(false);

    trigger.click();
    expect(dialog.open).to.equal(true);
    closeSettled = waitForClose(dialog);
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await closeSettled;
    expect(dialog.open).to.equal(false);

    trigger.click();
    expect(dialog.open).to.equal(true);
    closeSettled = waitForClose(dialog);
    clickPrimary(dialog);
    await closeSettled;
    expect(dialog.open).to.equal(false);
  });

  it('image lightbox enhancer は showModal 非対応や必須DOM欠落では trigger を hidden のままにすること', () => {
    withShowModalDescriptor(undefined, () => {
      const root = createImageRoot();
      document.body.append(root);

      enhanceImageLightboxes(root);

      const figure = expectPresent(root.querySelector<HTMLElement>('figure[data-image]'), 'figure');
      const trigger = expectPresent(
        root.querySelector<HTMLButtonElement>('button[data-image-zoom-trigger]'),
        'image trigger',
      );

      expect(figure.dataset['imageEnhanced']).to.equal(undefined);
      expect(trigger.hidden).to.equal(true);
      trigger.click();
      expect(
        root.querySelector<HTMLDialogElement>('dialog[data-image-lightbox-dialog]')?.open,
      ).to.not.equal(true);
    });

    const root = createImageRoot();
    root.querySelector('img')?.remove();
    document.body.append(root);

    enhanceImageLightboxes(root);

    const figure = expectPresent(root.querySelector<HTMLElement>('figure[data-image]'), 'figure');
    const trigger = expectPresent(
      root.querySelector<HTMLButtonElement>('button[data-image-zoom-trigger]'),
      'image trigger',
    );

    expect(figure.dataset['imageEnhanced']).to.equal(undefined);
    expect(trigger.hidden).to.equal(true);
  });

  it('image lightbox enhancer は showModal 失敗時に scroll lock を戻し trigger を隠すこと', () => {
    withShowModalDescriptor(function showModalFailure() {
      throw new Error('showModal failed');
    }, () => {
      const root = createImageRoot();
      document.body.append(root);

      enhanceImageLightboxes(root);

      const trigger = expectPresent(
        root.querySelector<HTMLButtonElement>('button[data-image-zoom-trigger]'),
        'image trigger',
      );

      expect(trigger.hidden).to.equal(false);
      trigger.click();

      expect(trigger.hidden).to.equal(true);
      expect(document.documentElement.style.overflow).to.equal('');
      expect(document.body.style.overflow).to.equal('');
    });
  });

  it('image lightbox enhancer は canonical でない既存 dialog を操作可能化しないこと', () => {
    const root = createImageRoot();
    const figure = expectPresent(root.querySelector<HTMLElement>('figure[data-image]'), 'figure');
    figure.insertAdjacentHTML(
      'beforeend',
      '<dialog data-image-lightbox-dialog="true" open><div></div></dialog>',
    );
    document.body.append(root);

    enhanceImageLightboxes(root);

    const trigger = expectPresent(
      root.querySelector<HTMLButtonElement>('button[data-image-zoom-trigger]'),
      'image trigger',
    );

    expect(figure.dataset['imageEnhanced']).to.equal(undefined);
    expect(trigger.hidden).to.equal(true);
    expect(root.querySelectorAll('dialog[data-image-lightbox-dialog]')).to.have.length(1);
  });

  it('image lightbox enhancer は既存 dialog の aria-modal / aria-label だけなら補完して再利用すること', () => {
    const root = createImageRoot();
    const figure = expectPresent(root.querySelector<HTMLElement>('figure[data-image]'), 'figure');
    figure.insertAdjacentHTML(
      'beforeend',
      [
        '<dialog data-image-lightbox-dialog="true">',
        '<div class="image-lightbox-surface" data-image-lightbox-surface="true">',
        '<button type="button" data-image-lightbox-close="true"></button>',
        '<img class="image-lightbox-image" src="/static/existing.png" alt="">',
        '</div>',
        '</dialog>',
      ].join(''),
    );
    document.body.append(root);

    enhanceImageLightboxes(root);

    const trigger = expectPresent(
      root.querySelector<HTMLButtonElement>('button[data-image-zoom-trigger]'),
      'image trigger',
    );
    const dialog = expectPresent(
      root.querySelector<HTMLDialogElement>('dialog[data-image-lightbox-dialog]'),
      'image dialog',
    );
    const figureChildren = Array.from(figure.children);

    expect(figure.dataset['imageEnhanced']).to.equal('true');
    expect(trigger.hidden).to.equal(false);
    expect(dialog.getAttribute('aria-modal')).to.equal('true');
    expect(dialog.getAttribute('aria-label')).to.equal('拡大画像');
    expect(figureChildren.at(-1)?.tagName.toLowerCase()).to.equal('figcaption');
    expect(figureChildren.at(-2)).to.equal(dialog);
  });
});
