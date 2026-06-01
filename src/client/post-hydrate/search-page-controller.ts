import { renderStaticIconHtml } from '../../../shared/icons/render-static-icon-html.js';
import type { SiteUrlContext } from '../../../shared/site/site-url-context.js';
import {
  getInitializedSearchBootstrapState,
  getInitializedSearchCore,
  type SearchBootstrapState,
} from '../../search/bootstrap.js';
import type { SearchCore } from '../../search/search-core.js';
import { readSiteUrlContextFromDocumentMeta } from '../../site/read-site-url-context-from-document-meta.js';

const SITE_URL_CONTEXT_UNAVAILABLE_MESSAGE =
  'サイト URL 情報を読み込めないため、検索ページの動的機能を利用できません。通常リンクはそのまま利用できます。';

const DYNAMIC_SEARCH_CONTROL_SELECTOR = [
  '[data-search-query-input]',
  '[data-search-query-clear]',
  '[data-search-tag-checkbox]',
  '[data-search-tag-mode-select]',
  '[data-search-sort-select]',
  '[data-search-selected-tag-remove]',
].join(',');

export type SearchPageControllerState =
  | {
      readonly kind: 'ready';
      readonly siteUrlContext: SiteUrlContext;
      readonly bootstrapState: SearchBootstrapState | null;
      readonly searchRuntime: SearchCore | null;
    }
  | {
      readonly kind: 'site-url-context-unavailable';
      readonly message: string;
    };

export interface SearchPageControllerDependencies {
  readonly bootstrapProvider: () => SearchBootstrapState | null;
  readonly searchRuntimeProvider: () => SearchCore | null;
  readonly siteUrlContextProvider: (document: Document) => SiteUrlContext | null;
}

export interface CreateSearchPageControllerOptions {
  readonly page: HTMLElement;
  readonly signal?: AbortSignal;
  readonly dependencies?: Partial<SearchPageControllerDependencies>;
}

const defaultDependencies: SearchPageControllerDependencies = {
  bootstrapProvider: getInitializedSearchBootstrapState,
  searchRuntimeProvider: getInitializedSearchCore,
  siteUrlContextProvider: readSiteUrlContextFromDocumentMeta,
};

const readFormString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value : '';

const selectedTagValues = (form: HTMLFormElement): string[] =>
  [...form.querySelectorAll<HTMLInputElement>('[data-search-tag-checkbox]:checked')].map(
    (input) => input.value,
  );

const orderedSelectedTagValues = (form: HTMLFormElement, preferredTag?: string): string[] => {
  const selectedTags = selectedTagValues(form);
  const selectedSet = new Set(selectedTags);
  const currentTags = new URL(window.location.href).searchParams.getAll('tag');
  const preferredTags =
    typeof preferredTag === 'string' && selectedSet.has(preferredTag) ? [preferredTag] : [];
  const preferredSet = new Set(preferredTags);
  const keptTags = currentTags.filter((tag) => selectedSet.has(tag));
  const knownSet = new Set([...preferredTags, ...keptTags]);
  const addedTags = selectedTags.filter((tag) => !knownSet.has(tag));
  return [...preferredTags, ...addedTags, ...keptTags.filter((tag) => !preferredSet.has(tag))];
};

const syncStaticSearchFieldClearButtons = (page: HTMLElement): void => {
  const pairs = [
    ['[data-search-query-input]', '[data-search-query-clear]'],
    ['[data-search-filter-input]', '[data-search-filter-clear]'],
  ] as const;
  for (const [inputSelector, buttonSelector] of pairs) {
    const input = page.querySelector<HTMLInputElement>(inputSelector);
    const button = page.querySelector<HTMLButtonElement>(buttonSelector);
    if (button) {
      button.hidden = (input?.value ?? '').length === 0;
    }
  }
};

const syncSearchUrl = (page: HTMLElement, form: HTMLFormElement, preferredTag?: string): void => {
  const data = new FormData(form);
  const url = new URL('/search/', window.location.origin);
  const query = readFormString(data.get('q')).trim().toLowerCase();
  if (query.length > 0) {
    url.searchParams.set('q', query);
  }
  for (const tag of orderedSelectedTagValues(form, preferredTag)) {
    url.searchParams.append('tag', tag);
  }
  const tagMode = readFormString(data.get('tagMode'));
  if (tagMode === 'and') {
    url.searchParams.set('tagMode', tagMode);
  }
  const sort = readFormString(data.get('sort'));
  if (sort === 'date-desc') {
    url.searchParams.set('sort', sort);
  }
  history.replaceState(history.state, '', `${url.pathname}${url.search}`);
  page.querySelector('h1')?.replaceChildren('検索');
};

const createSelectedTag = (document: Document, tag: string): HTMLElement => {
  const chip = document.createElement('span');
  chip.className = 'selected-tag';
  chip.dataset['selectedTag'] = tag;
  const label = document.createElement('span');
  label.className = 'selected-tag__label';
  label.textContent = tag;
  const button = document.createElement('button');
  button.className = 'selected-tag__remove';
  button.type = 'button';
  button.setAttribute('aria-label', `${tag} を解除`);
  button.dataset['searchSelectedTagRemove'] = tag;
  button.innerHTML = renderStaticIconHtml('x', 'selected-tag__remove-icon');
  chip.append(label, button);
  return chip;
};

const syncFilterDomFromForm = (
  page: HTMLElement,
  form: HTMLFormElement,
  preferredTag?: string,
): void => {
  const selectedTags = orderedSelectedTagValues(form, preferredTag);
  const tagMode =
    readFormString(new FormData(form).get('tagMode')) === 'and' ? 'すべて' : 'いずれか';
  const selectedTagsRoot = page.querySelector<HTMLElement>('[data-selected-tags]');
  if (selectedTagsRoot) {
    selectedTagsRoot.replaceChildren();
    if (selectedTags.length === 0) {
      const empty = page.ownerDocument.createElement('p');
      empty.className = 'filter-empty';
      empty.dataset['selectedTagsEmpty'] = '';
      empty.textContent = 'まだタグは選択されていません。';
      selectedTagsRoot.append(empty);
    } else {
      selectedTagsRoot.append(
        ...selectedTags.map((tag) => createSelectedTag(page.ownerDocument, tag)),
      );
    }
  }

  const state = page.querySelector<HTMLElement>('.filter-summary-state');
  if (state) {
    state.textContent =
      selectedTags.length > 0
        ? `${String(selectedTags.length)}タグ選択中 / ${tagMode}`
        : 'すべてのタグ';
  }
  const detail = page.querySelector<HTMLElement>('.filter-summary-detail');
  if (detail) {
    if (selectedTags.length === 0) {
      detail.textContent = '必要な時だけ展開して絞り込めます。';
    } else {
      const head = selectedTags.slice(0, 2).join(' / ');
      detail.textContent =
        selectedTags.length > 2 ? `${head} / ほか ${String(selectedTags.length - 2)} 件` : head;
    }
  }
  const selectedCount = page.querySelector<HTMLElement>('[data-selected-tags-count]');
  if (selectedCount) {
    selectedCount.textContent = `${String(selectedTags.length)} 件`;
  }

  const filterQuery = page
    .querySelector<HTMLInputElement>('[data-search-filter-input]')
    ?.value.trim()
    .toLocaleLowerCase();
  let visibleCount = 0;
  const options = [...page.querySelectorAll<HTMLElement>('[data-filter-option]')];
  for (const option of options) {
    const checkbox = option.querySelector<HTMLInputElement>('[data-search-tag-checkbox]');
    const tag = option.dataset['filterTag'] ?? checkbox?.value ?? '';
    const selected = checkbox?.checked === true;
    const count = Number.parseInt(option.dataset['filterCount'] ?? '0', 10);
    const disabled = !selected && count === 0;
    if (checkbox) {
      checkbox.disabled = disabled;
    }
    option.dataset['selected'] = String(selected);
    option.dataset['disabled'] = String(disabled);
    const matches = !filterQuery || tag.toLocaleLowerCase().includes(filterQuery);
    option.hidden = !matches;
    option.dataset['filterHidden'] = String(!matches);
    if (matches) {
      visibleCount += 1;
    }
  }
  const visibleMeta = page.querySelector<HTMLElement>('[data-filter-visible-count]');
  if (visibleMeta) {
    visibleMeta.textContent = `${String(visibleCount)} / ${String(options.length)} タグ`;
  }
  const filterEmpty = page.querySelector<HTMLElement>('[data-search-filter-empty]');
  if (filterEmpty) {
    filterEmpty.hidden = visibleCount > 0;
  }
  syncStaticSearchFieldClearButtons(page);
};

export const getSearchPageUnavailableMessage = (
  _kind: 'site-url-context-unavailable',
): string => SITE_URL_CONTEXT_UNAVAILABLE_MESSAGE;

export class SearchPageController {
  private readonly page: HTMLElement;
  private readonly form: HTMLFormElement | null;
  private readonly dependencies: SearchPageControllerDependencies;
  private readonly listenerController = new AbortController();
  private readonly signal: AbortSignal | undefined;
  private disposed = false;
  private currentState: SearchPageControllerState | null = null;

  constructor(options: CreateSearchPageControllerOptions) {
    this.page = options.page;
    this.form = options.page.querySelector<HTMLFormElement>('[data-search-page-form]');
    this.signal = options.signal;
    this.dependencies = { ...defaultDependencies, ...options.dependencies };
  }

  get state(): SearchPageControllerState | null {
    return this.currentState;
  }

  start(): void {
    if (this.disposed || this.signal?.aborted === true || this.currentState !== null) {
      return;
    }
    this.signal?.addEventListener(
      'abort',
      () => {
        this.dispose();
      },
      { once: true },
    );

    const siteUrlContext = this.dependencies.siteUrlContextProvider(this.page.ownerDocument);
    if (siteUrlContext === null) {
      const message = getSearchPageUnavailableMessage('site-url-context-unavailable');
      this.currentState = { kind: 'site-url-context-unavailable', message };
      this.setDynamicSearchControlsDisabled(true);
      const unavailable = this.page.querySelector<HTMLElement>('[data-search-page-unavailable]');
      if (unavailable) {
        unavailable.textContent = message;
        unavailable.hidden = false;
      }
      return;
    }

    this.currentState = {
      kind: 'ready',
      siteUrlContext,
      bootstrapState: this.dependencies.bootstrapProvider(),
      searchRuntime: this.dependencies.searchRuntimeProvider(),
    };
    this.setDynamicSearchControlsDisabled(false);
    if (this.form === null) {
      return;
    }
    this.bindReadyListeners(this.form);
    syncFilterDomFromForm(this.page, this.form);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.listenerController.abort();
  }

  private setDynamicSearchControlsDisabled(disabled: boolean): void {
    for (const control of this.page.querySelectorAll<
      HTMLButtonElement | HTMLInputElement | HTMLSelectElement
    >(DYNAMIC_SEARCH_CONTROL_SELECTOR)) {
      control.disabled = disabled;
    }
  }

  private bindReadyListeners(form: HTMLFormElement): void {
    const listenerOptions = { signal: this.listenerController.signal };
    const syncAll = (preferredTag?: string): void => {
      if (this.disposed) {
        return;
      }
      syncSearchUrl(this.page, form, preferredTag);
      syncFilterDomFromForm(this.page, form, preferredTag);
    };

    form.addEventListener(
      'change',
      (event) => {
        const target = event.target;
        const preferredTag =
          target instanceof HTMLInputElement &&
          target.matches('[data-search-tag-checkbox]') &&
          target.checked
            ? target.value
            : undefined;
        syncAll(preferredTag);
      },
      listenerOptions,
    );
    form.querySelector<HTMLInputElement>('[data-search-query-input]')?.addEventListener(
      'input',
      () => {
        syncAll();
      },
      listenerOptions,
    );
    form.querySelector<HTMLInputElement>('[data-search-filter-input]')?.addEventListener(
      'input',
      () => {
        syncFilterDomFromForm(this.page, form);
      },
      listenerOptions,
    );
    form.querySelector<HTMLButtonElement>('[data-search-query-clear]')?.addEventListener(
      'click',
      () => {
        const input = form.querySelector<HTMLInputElement>('[data-search-query-input]');
        if (input) {
          input.value = '';
          syncAll();
          input.focus();
        }
      },
      listenerOptions,
    );
    form.querySelector<HTMLButtonElement>('[data-search-filter-clear]')?.addEventListener(
      'click',
      () => {
        const input = form.querySelector<HTMLInputElement>('[data-search-filter-input]');
        if (input) {
          input.value = '';
          syncFilterDomFromForm(this.page, form);
          input.focus();
        }
      },
      listenerOptions,
    );
    form.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        const button =
          target instanceof HTMLElement
            ? target.closest<HTMLButtonElement>('[data-search-selected-tag-remove]')
            : null;
        if (!button) {
          return;
        }
        const tag = button.dataset['searchSelectedTagRemove'];
        const checkbox = [
          ...form.querySelectorAll<HTMLInputElement>('[data-search-tag-checkbox]'),
        ].find((candidate) => candidate.value === tag);
        if (checkbox) {
          checkbox.checked = false;
          syncAll();
        }
      },
      listenerOptions,
    );
  }
}

export const createSearchPageController = (
  options: CreateSearchPageControllerOptions,
): SearchPageController => new SearchPageController(options);
