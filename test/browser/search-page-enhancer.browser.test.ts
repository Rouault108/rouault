import { expect } from '@open-wc/testing';

import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import { enhanceSearchPage } from '../../src/client/post-hydrate/search-page-enhancer.js';

const appendSiteUrlContextMeta = (): void => {
  for (const [name, content] of [
    ['rouault-site-origin', DEFAULT_SITE_URL_CONTEXT.siteOrigin],
    ['rouault-base-path', DEFAULT_SITE_URL_CONTEXT.basePath],
  ] as const) {
    const meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    document.head.append(meta);
  }
};

const renderSearchPageFixture = (): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = `
    <section data-search-page-root>
      <h1>#architecture</h1>
      <form data-search-page-form>
        <input name="q" value="" data-search-query-input>
        <button type="button" hidden data-search-query-clear>clear</button>
        <select name="tagMode" data-search-tag-mode-select>
          <option value="or" selected>or</option>
          <option value="and">and</option>
        </select>
        <select name="sort" data-search-sort-select>
          <option value="relevance" selected>relevance</option>
          <option value="date-desc">date-desc</option>
        </select>
        <div class="filter-summary-state"></div>
        <div class="filter-summary-detail"></div>
        <span data-selected-tags-count></span>
        <div data-selected-tags></div>
        <input data-search-filter-input>
        <button type="button" hidden data-search-filter-clear>filter clear</button>
        <div data-filter-option data-filter-tag="architecture" data-filter-count="1">
          <input type="checkbox" name="tag" value="architecture" checked data-search-tag-checkbox>
        </div>
        <div data-filter-option data-filter-tag="music" data-filter-count="1">
          <input type="checkbox" name="tag" value="music" data-search-tag-checkbox>
        </div>
        <span data-filter-visible-count></span>
        <p hidden data-search-filter-empty></p>
      </form>
      <div hidden data-search-page-unavailable></div>
    </section>
  `;
  document.body.append(root);
  return root;
};

const expectElement = <T extends Element>(element: T | null | undefined, label: string): T => {
  expect(element, label).to.not.equal(null);
  expect(element, label).to.not.equal(undefined);
  return element as T;
};

describe('search-page-enhancer', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    appendSiteUrlContextMeta();
  });

  afterEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
    history.replaceState(history.state, '', '/');
  });

  it('clear button の hidden 同期と FormData 契約に沿った URL 同期を行うこと', () => {
    const root = renderSearchPageFixture();
    const page = root.querySelector<HTMLElement>('[data-search-page-root]');
    const query = root.querySelector<HTMLInputElement>('[data-search-query-input]');
    const queryClear = root.querySelector<HTMLButtonElement>('[data-search-query-clear]');
    const filter = root.querySelector<HTMLInputElement>('[data-search-filter-input]');
    const filterClear = root.querySelector<HTMLButtonElement>('[data-search-filter-clear]');
    const music = [...root.querySelectorAll<HTMLInputElement>('[data-search-tag-checkbox]')].find(
      (input) => input.value === 'music',
    );

    expectElement(page, 'page');
    const queryInput = expectElement(query, 'query');
    const queryClearButton = expectElement(queryClear, 'queryClear');
    const filterInput = expectElement(filter, 'filter');
    const filterClearButton = expectElement(filterClear, 'filterClear');
    const musicCheckbox = expectElement(music, 'music');

    enhanceSearchPage(root);
    expect(queryClear?.hidden).to.equal(true);

    queryInput.value = 'Router';
    queryInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(queryClear?.hidden).to.equal(false);
    expect(location.search).to.contain('q=router');

    musicCheckbox.checked = true;
    musicCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(location.search).to.contain('tag=music');

    filterInput.value = 'zzz';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(filterClear?.hidden).to.equal(false);
    expect(root.querySelector<HTMLElement>('[data-search-filter-empty]')?.hidden).to.equal(false);

    queryClearButton.click();
    filterClearButton.click();
    expect(queryInput.value).to.equal('');
    expect(filterInput.value).to.equal('');
    expect(queryClear?.hidden).to.equal(true);
    expect(filterClear?.hidden).to.equal(true);
  });

  it('AbortSignal で listener を解除し、abort 後に再有効化できること', () => {
    const root = renderSearchPageFixture();
    const page = root.querySelector<HTMLElement>('[data-search-page-root]');
    const query = root.querySelector<HTMLInputElement>('[data-search-query-input]');
    const first = new AbortController();
    const second = new AbortController();

    enhanceSearchPage(root, first.signal);
    expect(page?.dataset['enhanced']).to.equal('true');

    first.abort();
    expect(page?.dataset['enhanced']).to.equal(undefined);

    const queryInput = expectElement(query, 'query');
    queryInput.value = 'after abort';
    queryInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(location.search).to.equal('');

    enhanceSearchPage(root, second.signal);
    queryInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(location.search).to.contain('q=after+abort');
  });

  it('同一 root は二重 enhance せず、dispose 後に再有効化できること', () => {
    const root = renderSearchPageFixture();
    const page = root.querySelector<HTMLElement>('[data-search-page-root]');
    const first = enhanceSearchPage(root);
    const duplicate = enhanceSearchPage(root);

    expect(first).not.to.equal(null);
    expect(duplicate).to.equal(first);
    expect(page?.dataset['enhanced']).to.equal('true');

    first?.dispose();
    expect(page?.dataset['enhanced']).to.equal(undefined);

    const second = enhanceSearchPage(root);
    expect(second).not.to.equal(first);
  });

  it('provider injection で ready state を作り bootstrap と runtime を保持すること', () => {
    const root = renderSearchPageFixture();
    const bootstrapState = { status: 'unavailable' as const, reason: 'search-runtime-unavailable' as const };
    const searchRuntime = null;
    const controller = enhanceSearchPage(root, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => bootstrapState,
      searchRuntimeProvider: () => searchRuntime,
    });

    expect(controller?.state).to.deep.equal({
      kind: 'ready',
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
      bootstrapState,
      searchRuntime,
    });
  });

  it('siteUrlContext provider が null の場合は SSR unavailable container を再利用して dynamic controls を disabled にすること', () => {
    const root = renderSearchPageFixture();
    const page = root.querySelector<HTMLElement>('[data-search-page-root]');
    const unavailableBefore = root.querySelector<HTMLElement>('[data-search-page-unavailable]');
    const controller = enhanceSearchPage(root, undefined, {
      siteUrlContextProvider: () => null,
    });
    const unavailableAfter = root.querySelector<HTMLElement>('[data-search-page-unavailable]');

    expect(controller?.state?.kind).to.equal('site-url-context-unavailable');
    expect(unavailableAfter).to.equal(unavailableBefore);
    expect(root.querySelectorAll('[data-search-page-unavailable]')).to.have.length(1);
    expect(unavailableAfter?.hidden).to.equal(false);
    expect(unavailableAfter?.textContent).to.equal(
      'サイト URL 情報を読み込めないため、検索ページの動的機能を利用できません。通常リンクはそのまま利用できます。',
    );
    expect(page?.querySelector<HTMLInputElement>('[data-search-query-input]')?.disabled).to.equal(
      true,
    );
    expect(
      page?.querySelector<HTMLSelectElement>('[data-search-sort-select]')?.disabled,
    ).to.equal(true);
  });

  it('選択済みタグの解除 button を static icon 契約で生成すること', () => {
    const root = renderSearchPageFixture();
    enhanceSearchPage(root);

    const remove = expectElement(
      root.querySelector<HTMLButtonElement>(
        'button.selected-tag__remove[data-search-selected-tag-remove][type="button"]',
      ),
      'selected tag remove',
    );

    expect(remove.getAttribute('aria-label')).to.equal('architecture を解除');
    expect(remove.querySelector('.selected-tag__remove-icon.static-icon > svg')).not.to.equal(null);
    expect(remove.hasAttribute('data-selected-tag-remove')).to.equal(false);
    expect(root.querySelector('[data-filter-option]')?.getAttribute('data-selected')).to.equal(
      'true',
    );
    expect(root.querySelector('.filter-option--selected')).to.equal(null);
  });
});
