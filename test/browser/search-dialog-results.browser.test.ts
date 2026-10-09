import { afterEach, describe, expect, it } from 'vitest';

import { enhanceSearchDialog } from '../../src/client/post-hydrate/search-dialog-enhancer.js';
import { dispatchSearchDialogEvent } from '../../src/search/search-dialog-events.js';
import {
  appendDialogFixture,
  createResultItem,
  flushOperations,
  installMockScrollTop,
  waitForAnimationFrame,
} from './helpers/search-dialog-test-fixture.js';

describe('search-dialog results', () => {
  afterEach(() => {
    document.body.replaceChildren();
    enhanceSearchDialog(document);
  });

  it('100件以下の結果では scroll しても上端へ戻らないこと', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    results.style.blockSize = '96px';
    results.style.overflow = 'auto';
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 100 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    results.scrollTop = 240;
    results.dispatchEvent(new Event('scroll'));

    expect(results.scrollTop).to.equal(240);
    expect(input.getAttribute('aria-activedescendant')).to.equal('search-option-/notes/result-0/');
  });

  it('non-virtualized keyboard navigation は active option を viewport 内へ scroll し、focus を input に保つこと', async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    try {
      const dialog = appendDialogFixture();
      const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
      const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
      if (!input || !results) throw new Error('search dialog fixture is invalid');
      Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
      installMockScrollTop(results);
      HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
        if (this === results) return new DOMRect(0, 0, 320, 96);
        if (this instanceof HTMLElement && this.getAttribute('role') === 'option') {
          const index = Number(this.dataset['index'] ?? '0');
          const top = index * 32 - results.scrollTop;
          return new DOMRect(0, top, 320, 32);
        }
        return originalGetBoundingClientRect.call(this);
      };
      enhanceSearchDialog(document);
      dispatchSearchDialogEvent('search-dialog:open-request', {
        trigger: null,
        modality: 'keyboard',
      });
      await flushOperations();
      dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
      dispatchSearchDialogEvent('search-dialog:results-change', {
        query: 'result',
        items: Array.from({ length: 12 }, (_, index) => createResultItem(index)),
      });
      await waitForAnimationFrame();

      input.focus();
      expect(document.activeElement).to.equal(input);

      for (let count = 0; count < 4; count += 1) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(document.activeElement).to.equal(input);
      }

      expect(input.getAttribute('aria-activedescendant')).to.equal(
        'search-option-/notes/result-4/',
      );
      expect(
        results.querySelector<HTMLElement>('[aria-selected="true"]')?.dataset['index'],
      ).to.equal('4');
      expect(results.scrollTop).to.equal(64);

      for (let count = 0; count < 3; count += 1) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(document.activeElement).to.equal(input);
      }

      expect(input.getAttribute('aria-activedescendant')).to.equal(
        'search-option-/notes/result-1/',
      );
      expect(
        results.querySelector<HTMLElement>('[aria-selected="true"]')?.dataset['index'],
      ).to.equal('1');
      expect(results.scrollTop).to.equal(32);
      expect(results.querySelectorAll('[role="option"]')).to.have.length(12);
      expect(results.querySelector('.search-dialog__virtual-spacer')).to.equal(null);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('virtualized passive scroll は旧 active 位置へ戻さず active と aria を解除すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    expect(results.querySelectorAll('[role="option"]')).to.have.length.lessThan(150);
    expect(
      results.querySelector(
        '.search-dialog__virtual-spacer[role="presentation"][aria-hidden="true"]',
      ),
    ).to.not.equal(null);

    results.scrollTop = 2400;
    results.dispatchEvent(new Event('scroll'));

    expect(results.scrollTop).to.equal(2400);
    expect(input.hasAttribute('aria-activedescendant')).to.equal(false);
    expect(results.querySelector('[aria-selected="true"]')).to.equal(null);
    expect(results.querySelector('[data-active="true"]')).to.equal(null);
  });

  it('active なし Enter は選択せず、passive scroll 後の ArrowDown/ArrowUp は視覚 viewport から再開すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    const selected: unknown[] = [];
    document.addEventListener('search-dialog:selected', (event) => {
      selected.push((event as CustomEvent).detail);
    });
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    results.scrollTop = 2400;
    results.dispatchEvent(new Event('scroll'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(selected).to.deep.equal([]);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(input.getAttribute('aria-activedescendant')).to.equal('search-option-/notes/result-50/');
    await waitForAnimationFrame();

    results.scrollTop = 2496;
    results.dispatchEvent(new Event('scroll'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(input.getAttribute('aria-activedescendant')).to.equal('search-option-/notes/result-53/');
  });

  it('keyboard navigation は active option を DOM に保持し、内部 scroll event を passive 扱いしないこと', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(results.scrollTop).to.be.greaterThan(0);

    results.scrollTop = 0;
    results.dispatchEvent(new Event('scroll'));

    expect(input.getAttribute('aria-activedescendant')).to.equal(
      'search-option-/notes/result-149/',
    );
    expect(results.contains(document.getElementById('search-option-/notes/result-149/'))).to.equal(
      true,
    );
    expect(results.scrollTop).to.equal(0);
    expect(
      results.querySelector<HTMLElement>('.search-dialog__virtual-spacer')?.style.blockSize,
    ).to.not.equal('0px');
  });

  it('query 変更と results-change は scroll を reset し、旧 active と同じ ID が残っても先頭へ初期化すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    results.scrollTop = 2400;
    results.dispatchEvent(new Event('scroll'));
    expect(results.scrollTop).to.equal(2400);

    dispatchSearchDialogEvent('search-dialog:query-change', { query: '' });
    expect(results.scrollTop).to.equal(0);

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: [createResultItem(10), createResultItem(1), createResultItem(2)],
    });
    expect(input.getAttribute('aria-activedescendant')).to.equal('search-option-/notes/result-10/');
  });

  it('passive scroll で range が不変なら virtual rows を再構築しないこと', async () => {
    const dialog = appendDialogFixture();
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    const originalReplaceChildren = results.replaceChildren.bind(results);
    let replaceChildrenCount = 0;
    results.replaceChildren = (...nodes: (Node | string)[]) => {
      replaceChildrenCount += 1;
      originalReplaceChildren(...nodes);
    };

    results.scrollTop = 10;
    results.dispatchEvent(new Event('scroll'));

    expect(replaceChildrenCount).to.equal(0);
  });
});
