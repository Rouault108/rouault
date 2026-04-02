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

    const anchor = root.querySelector<HTMLElement>('a[data-footnote-ref]');
    expect(anchor).to.not.equal(null);
    expect(anchor?.dataset['footnoteEnhanced']).to.equal('true');

    const popover = root.querySelector<HTMLElement>('[data-footnote-popover]');
    expect(popover).to.not.equal(null);
    expect(popover?.hidden).to.equal(true);
    expect(popover?.querySelector('a[data-footnote-backref]')).to.equal(null);

    const footerLink = popover?.querySelector<HTMLAnchorElement>('.footnote-list-link');
    expect(footerLink?.getAttribute('href')).to.equal('#fn-enhancer-1');

    anchor?.click();

    expect(anchor?.getAttribute('aria-expanded')).to.equal('true');
    expect(anchor?.classList.contains('is-active-trigger')).to.equal(true);
    expect(popover?.hidden).to.equal(false);
    expect(popover?.textContent).to.contain('enhancer footnote body');

    anchor?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(anchor?.hasAttribute('aria-expanded')).to.equal(false);
    expect(anchor?.classList.contains('is-active-trigger')).to.equal(false);
    expect(popover?.hidden).to.equal(true);
    expect(document.activeElement).to.equal(anchor);
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
