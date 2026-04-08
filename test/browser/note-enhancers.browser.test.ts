import { expect } from '@open-wc/testing';
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
      <h2>脚注</h2>
      <ol>
        <li id="fn-enhancer-1">
          enhancer footnote body
          <a href="#fn-enhancer-1-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
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
      <img src="/static/example-thumb.png" alt="zoom target" />
      <figcaption>lightbox caption</figcaption>
      <button type="button" data-image-zoom-trigger="true" aria-label="画像を拡大表示">拡大</button>
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

const setClientRect = (
  element: Element,
  {
    left,
    top,
    width,
    height,
  }: { left: number; top: number; width: number; height: number },
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
  if (
    belowTop + popoverHeight > viewportHeight - popoverMargin &&
    aboveTop >= popoverMargin
  ) {
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
      Math.min(
        Math.max(12, anchorLeft),
        Math.max(12, viewportWidth - 12 - popoverWidth),
      ),
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

  it('image lightbox enhancer が static figure に dialog を付与し close 後に scroll / focus を戻すこと', () => {
    const root = createImageRoot();
    document.body.append(root);

    enhanceImageLightboxes(root);

    const figure = root.querySelector<HTMLElement>('figure[data-image]');
    const trigger = root.querySelector<HTMLButtonElement>('button[data-image-zoom-trigger]');
    const dialog = root.querySelector<HTMLDialogElement>('dialog[data-image-lightbox-dialog]');
    const image = dialog?.querySelector<HTMLImageElement>('img.image-lightbox-image');
    const caption = dialog?.querySelector<HTMLElement>('.image-lightbox-caption');
    const closeButton = dialog?.querySelector<HTMLButtonElement>('[data-image-lightbox-close]');

    expect(figure?.dataset['imageEnhanced']).to.equal('true');
    expect(dialog).to.not.equal(null);
    expect(dialog?.getAttribute('aria-modal')).to.equal('true');
    expect(image?.getAttribute('src')).to.contain('/static/example.png');
    expect(image?.getAttribute('alt')).to.equal('zoom target');
    expect(image?.getAttribute('srcset')).to.equal(
      '/static/example.png 1x, /static/example@2x.png 2x',
    );
    expect(image?.getAttribute('sizes')).to.equal('min(100vw, 72rem)');
    expect(caption?.textContent).to.equal('lightbox caption');

    trigger?.focus();
    trigger?.click();

    expect(dialog?.open).to.equal(true);
    expect(document.documentElement.style.overflow).to.equal('hidden');
    expect(document.body.style.overflow).to.equal('hidden');

    closeButton?.click();

    expect(dialog?.open).to.equal(false);
    expect(document.documentElement.style.overflow).to.equal('');
    expect(document.body.style.overflow).to.equal('');
    expect(document.activeElement).to.equal(trigger);
  });
});