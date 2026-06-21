import { expect } from '@open-wc/testing';

import { enhanceCodeBlocks } from '../../src/client/post-hydrate/code-block-enhancer.js';

class MockResizeObserver implements ResizeObserver {
  static instances: MockResizeObserver[] = [];

  readonly observed = new Set<Element>();
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  disconnect(): void {
    this.observed.clear();
  }

  observe(target: Element): void {
    this.observed.add(target);
  }

  takeRecords(): ResizeObserverEntry[] {
    return [];
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
  }

  trigger(): void {
    this.callback([], this);
  }
}

const nextFrame = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
};

const setCodeBlockMetrics = (
  block: HTMLElement,
  metrics: { readonly clientWidth: number; readonly scrollWidth: number },
): void => {
  Object.defineProperty(block, 'clientWidth', {
    configurable: true,
    value: metrics.clientWidth,
  });
  Object.defineProperty(block, 'scrollWidth', {
    configurable: true,
    value: metrics.scrollWidth,
  });
};

const createFixture = (
  preAttributes = '',
): { readonly root: HTMLElement; readonly pre: HTMLElement } => {
  const root = document.createElement('article');
  root.innerHTML = `
    <figure data-code-block-root>
      <pre data-code-block data-code-language="ts" ${preAttributes}><code>const value = 1;</code></pre>
    </figure>
  `;
  document.body.append(root);

  const codeBlockRoot = root.querySelector<HTMLElement>('[data-code-block-root]');
  const pre = root.querySelector<HTMLElement>('pre[data-code-block]');
  expect(codeBlockRoot, 'code block root').to.not.equal(null);
  expect(pre, 'code block pre').to.not.equal(null);

  return { root: codeBlockRoot as HTMLElement, pre: pre as HTMLElement };
};

describe('code-block-enhancer', () => {
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    originalResizeObserver = window.ResizeObserver;
    MockResizeObserver.instances = [];
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: MockResizeObserver,
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: originalResizeObserver,
    });
  });

  it('overflow する code block を keyboard focus 可能な region にすること', async () => {
    const { root, pre } = createFixture();
    setCodeBlockMetrics(pre, { clientWidth: 120, scrollWidth: 360 });

    enhanceCodeBlocks(root);
    await nextFrame();

    expect(root.dataset['codeBlockEnhanced']).to.equal('true');
    expect(pre.getAttribute('tabindex')).to.equal('0');
    expect(pre.getAttribute('role')).to.equal('region');
    expect(pre.getAttribute('aria-label')).to.equal('TypeScript のコードブロック');
    expect(MockResizeObserver.instances).to.have.length(1);
    expect(MockResizeObserver.instances[0]?.observed.has(root)).to.equal(true);
  });

  it('wrap 有効時と overflow なしでは enhancer 所有属性だけを削除すること', async () => {
    const { root, pre } = createFixture();
    setCodeBlockMetrics(pre, { clientWidth: 120, scrollWidth: 360 });

    enhanceCodeBlocks(root);
    await nextFrame();
    expect(pre.getAttribute('tabindex')).to.equal('0');

    pre.dataset['codeWrap'] = 'true';
    MockResizeObserver.instances[0]?.trigger();
    await nextFrame();

    expect(pre.hasAttribute('tabindex')).to.equal(false);
    expect(pre.hasAttribute('role')).to.equal(false);
    expect(pre.hasAttribute('aria-label')).to.equal(false);

    pre.dataset['codeWrap'] = 'false';
    setCodeBlockMetrics(pre, { clientWidth: 360, scrollWidth: 360 });
    MockResizeObserver.instances[0]?.trigger();
    await nextFrame();

    expect(pre.hasAttribute('tabindex')).to.equal(false);
    expect(pre.hasAttribute('role')).to.equal(false);
    expect(pre.hasAttribute('aria-label')).to.equal(false);
  });

  it('resize 後に overflow 状態を更新すること', async () => {
    const { root, pre } = createFixture();
    setCodeBlockMetrics(pre, { clientWidth: 360, scrollWidth: 360 });

    enhanceCodeBlocks(root);
    await nextFrame();
    expect(pre.hasAttribute('tabindex')).to.equal(false);

    setCodeBlockMetrics(pre, { clientWidth: 120, scrollWidth: 360 });
    MockResizeObserver.instances[0]?.trigger();
    await nextFrame();

    expect(pre.getAttribute('tabindex')).to.equal('0');
    expect(pre.getAttribute('role')).to.equal('region');
  });

  it('既存の tabindex / role / aria-label を破壊しないこと', async () => {
    const { root, pre } = createFixture('tabindex="-1" role="group" aria-label="既存ラベル"');
    setCodeBlockMetrics(pre, { clientWidth: 120, scrollWidth: 360 });

    enhanceCodeBlocks(root);
    await nextFrame();

    expect(pre.getAttribute('tabindex')).to.equal('-1');
    expect(pre.getAttribute('role')).to.equal('group');
    expect(pre.getAttribute('aria-label')).to.equal('既存ラベル');

    setCodeBlockMetrics(pre, { clientWidth: 360, scrollWidth: 360 });
    MockResizeObserver.instances[0]?.trigger();
    await nextFrame();

    expect(pre.getAttribute('tabindex')).to.equal('-1');
    expect(pre.getAttribute('role')).to.equal('group');
    expect(pre.getAttribute('aria-label')).to.equal('既存ラベル');
  });

  it('AbortSignal cleanup 後は observer を解除して再有効化できること', async () => {
    const { root, pre } = createFixture();
    const first = new AbortController();
    const second = new AbortController();
    setCodeBlockMetrics(pre, { clientWidth: 120, scrollWidth: 360 });

    enhanceCodeBlocks(root, first.signal);
    await nextFrame();
    expect(pre.getAttribute('tabindex')).to.equal('0');
    expect(pre.getAttribute('role')).to.equal('region');
    expect(pre.getAttribute('aria-label')).to.equal('TypeScript のコードブロック');

    first.abort();
    expect(pre.hasAttribute('tabindex')).to.equal(false);
    expect(pre.hasAttribute('role')).to.equal(false);
    expect(pre.hasAttribute('aria-label')).to.equal(false);

    MockResizeObserver.instances[0]?.trigger();
    await nextFrame();
    expect(pre.hasAttribute('tabindex')).to.equal(false);
    expect(pre.hasAttribute('role')).to.equal(false);
    expect(pre.hasAttribute('aria-label')).to.equal(false);

    enhanceCodeBlocks(root, second.signal);
    await nextFrame();
    expect(pre.getAttribute('tabindex')).to.equal('0');
    expect(MockResizeObserver.instances).to.have.length(2);
  });

  it('ResizeObserver がない環境では初回測定だけで degrade すること', async () => {
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: undefined,
    });
    const { root, pre } = createFixture();
    setCodeBlockMetrics(pre, { clientWidth: 120, scrollWidth: 360 });

    enhanceCodeBlocks(root);
    await nextFrame();

    expect(pre.getAttribute('tabindex')).to.equal('0');
    expect(MockResizeObserver.instances).to.have.length(0);
  });
});
