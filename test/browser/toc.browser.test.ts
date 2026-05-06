import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/toc/toc.js';
import type { Toc } from '../../src/components/ui/toc/toc.js';
import { hasDynamicTocScopeSelections } from '../../src/toc/toc-headings.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const headers = [
  { id: '71-配列の生成', text: '7.1 配列の生成', level: 2 },
  { id: '72-配列の要素の読み書き', text: '7.2 配列の要素の読み書き', level: 2 },
];

const createRect = ({
  top,
  left = 0,
  width = 240,
  height = 24,
}: {
  top: number;
  left?: number;
  width?: number;
  height?: number;
}): DOMRect =>
  ({
    x: left,
    y: top,
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  }) as DOMRect;

const createRectList = (rect: DOMRect): DOMRectList =>
  ({
    0: rect,
    length: 1,
    item: (index: number) => (index === 0 ? rect : null),
    [Symbol.iterator]: function* () {
      yield rect;
    },
  }) as unknown as DOMRectList;

const setBoxMetrics = (
  element: HTMLElement,
  {
    rect,
    scrollHeight,
    clientHeight,
    scrollTop,
  }: {
    rect: DOMRect;
    scrollHeight?: number;
    clientHeight?: number;
    scrollTop?: number;
  },
): void => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
  Object.defineProperty(element, 'getClientRects', {
    configurable: true,
    value: () => createRectList(rect),
  });

  if (scrollHeight !== undefined) {
    Object.defineProperty(element, 'scrollHeight', {
      configurable: true,
      value: scrollHeight,
    });
  }

  if (clientHeight !== undefined) {
    Object.defineProperty(element, 'clientHeight', {
      configurable: true,
      value: clientHeight,
    });
  }

  if (scrollTop !== undefined) {
    Object.defineProperty(element, 'scrollTop', {
      configurable: true,
      writable: true,
      value: scrollTop,
    });
  }
};

const flush = async (toc: Toc): Promise<void> => {
  await waitForLitUpdate(toc);
  await nextAnimationFrame();
  await waitForLitUpdate(toc);
};

describe('ui-toc active link scroll contract', () => {
  let originalScrollIntoViewDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
  });

  afterEach(() => {
    if (originalScrollIntoViewDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollIntoView',
        originalScrollIntoViewDescriptor,
      );
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    }
  });

  it('active link の追従は scrollIntoView ではなく scroll container の scrollTo を使うこと', async () => {
    let scrollIntoViewCalls = 0;
    let scrollToOptions: ScrollToOptions | null = null;

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => {
        scrollIntoViewCalls += 1;
      },
    });

    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="overflow-y: auto; max-height: 40px;">
        <ui-toc .headers=${headers} active-id="71-配列の生成"></ui-toc>
      </div>
    `);

    const toc = wrapper.querySelector<Toc>('ui-toc');
    if (!toc) {
      throw new Error('ui-toc が見つかりません');
    }

    await flush(toc);

    setBoxMetrics(wrapper, {
      rect: createRect({ top: 0, height: 40 }),
      scrollHeight: 120,
      clientHeight: 40,
      scrollTop: 0,
    });
    setBoxMetrics(toc, {
      rect: createRect({ top: 0, height: 40 }),
    });

    Object.defineProperty(wrapper, 'scrollTo', {
      configurable: true,
      value: (options: ScrollToOptions) => {
        scrollToOptions = options;
      },
    });

    const nextActiveLink = toc.shadowRoot?.querySelector<HTMLElement>(
      'a.toc-link[data-heading-id="72-配列の要素の読み書き"]',
    );
    if (!nextActiveLink) {
      throw new Error('next active link が見つかりません');
    }

    setBoxMetrics(nextActiveLink, {
      rect: createRect({ top: 48, height: 24 }),
    });

    toc.activeId = '72-配列の要素の読み書き';
    await flush(toc);

    expect(scrollIntoViewCalls).to.equal(0);
    expect(scrollToOptions).to.deep.equal({
      top: 32,
      behavior: 'instant',
    });
  });

  it('suppress-active-link-scroll 指定時は active link 追従スクロールを抑止すること', async () => {
    let scrollIntoViewCalls = 0;
    let scrollToCalls = 0;

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => {
        scrollIntoViewCalls += 1;
      },
    });

    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="overflow-y: auto; max-height: 40px;">
        <ui-toc .headers=${headers} active-id="71-配列の生成" suppress-active-link-scroll></ui-toc>
      </div>
    `);

    const toc = wrapper.querySelector<Toc>('ui-toc');
    if (!toc) {
      throw new Error('ui-toc が見つかりません');
    }

    await flush(toc);

    setBoxMetrics(wrapper, {
      rect: createRect({ top: 0, height: 40 }),
      scrollHeight: 120,
      clientHeight: 40,
      scrollTop: 0,
    });
    setBoxMetrics(toc, {
      rect: createRect({ top: 0, height: 40 }),
    });

    Object.defineProperty(wrapper, 'scrollTo', {
      configurable: true,
      value: () => {
        scrollToCalls += 1;
      },
    });

    const nextActiveLink = toc.shadowRoot?.querySelector<HTMLElement>(
      'a.toc-link[data-heading-id="72-配列の要素の読み書き"]',
    );
    if (!nextActiveLink) {
      throw new Error('next active link が見つかりません');
    }

    setBoxMetrics(nextActiveLink, {
      rect: createRect({ top: 48, height: 24 }),
    });

    toc.activeId = '72-配列の要素の読み書き';
    await flush(toc);

    expect(scrollIntoViewCalls).to.equal(0);
    expect(scrollToCalls).to.equal(0);
  });

  it('navigation label は既定で 目次 を内部 nav へ設定すること', async () => {
    const toc = await fixture<Toc>(html`
      <ui-toc .headers=${headers}></ui-toc>
    `);

    await flush(toc);

    const nav = toc.shadowRoot?.querySelector<HTMLElement>('nav');
    expect(nav?.getAttribute('aria-label')).to.equal('目次');
  });

  it('scopeSelections の有無は shared heading helper で判定すること', () => {
    expect(
      hasDynamicTocScopeSelections([
        { id: 'intro', text: 'Intro', level: 2 },
        {
          id: 'details',
          text: 'Details',
          level: 2,
          scopeSelections: [{ scopeId: 'tabs', value: 'details' }],
        },
      ]),
    ).to.equal(true);
  });

  it('navigation-label attribute で内部 nav の accessible name を上書きできること', async () => {
    const toc = await fixture<Toc>(html`
      <ui-toc .headers=${headers} navigation-label="Sections"></ui-toc>
    `);

    await flush(toc);

    const nav = toc.shadowRoot?.querySelector<HTMLElement>('nav');
    expect(nav?.getAttribute('aria-label')).to.equal('Sections');
  });

  it('active DOM の再照合は encoded href ではなく raw data-heading-id を使うこと', async () => {
    const toc = await fixture<Toc>(html`
      <ui-toc
        .headers=${[{ id: 'a b', text: 'A B', level: 2 }]}
        active-id="a b"
      ></ui-toc>
    `);

    await flush(toc);

    const link = toc.shadowRoot?.querySelector<HTMLAnchorElement>('a.toc-link');
    if (!(link instanceof HTMLAnchorElement)) {
      throw new Error('TOC link が見つかりません。');
    }

    link.href = '#wrong';
    link.classList.remove('is-active');
    link.removeAttribute('aria-current');

    const internals = toc as unknown as { _reconcileRenderedActiveState: () => boolean };
    expect(internals._reconcileRenderedActiveState()).to.equal(true);

    expect(link.classList.contains('is-active')).to.equal(true);
    expect(link.getAttribute('aria-current')).to.equal('location');
  });
});
