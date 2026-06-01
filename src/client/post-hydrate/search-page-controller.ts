import { renderStaticIconHtml } from '../../../shared/icons/render-static-icon-html.js';
import { createSearchJsonParseDiagnosticSink } from '../../../shared/search/search-diagnostics.js';
import { validateInlineStaticExploreSearchResponse } from '../../../shared/search/inline-static-explore-response-validator.js';
import { parseStaticExploreSearchResponseJson } from '../../../shared/search/search-json-artifact-parser.js';
import {
  buildUrlForSearchState,
  normalizeSearchQuery,
  normalizeSearchSort,
  normalizeSearchTagMode,
  normalizeSearchTags,
  parseSearchStateFromUrl,
} from '../../../shared/search/search-url.js';
import { adoptInitialStaticExploreSearchResponse } from '../../../shared/search/static-explore-response-adoption.js';
import type {
  ExploreSearchResponse,
  SearchResultItem,
  SearchState,
  StaticExploreSearchResultItem,
} from '../../../shared/search/search-types.js';
import type { SiteUrlContext } from '../../../shared/site/site-url-context.js';
import {
  applyBasePathToRenderHref,
  stripBasePathFromPathname,
} from '../../../shared/url/normalize-rouault-url.js';
import {
  getInitializedSearchBootstrapState,
  getInitializedSearchCore,
  type SearchBootstrapState,
} from '../../search/bootstrap.js';
import { SEARCH_DEBOUNCE_MS } from '../../search/search-constants.js';
import type { SearchCore } from '../../search/search-core.js';
import { buildSearchResultRenderHref } from '../../search/normalize-search-result-url.js';
import { readSiteUrlContextFromDocumentMeta } from '../../site/read-site-url-context-from-document-meta.js';
import {
  getSearchBootstrapUnavailableMessage,
  type SearchBootstrapUnavailableReason,
} from '../../../shared/search/search-unavailable-reason.js';

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
    }
  | {
      readonly kind: 'bootstrap-unavailable';
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

interface SearchPageRuntimeState {
  queryInputValue: string;
  normalizedQuery: string;
  selectedTags: string[];
  tagMode: SearchState['tagMode'];
  sort: SearchState['sort'];
  items: SearchPageRenderableItem[];
  tagCounts: Record<string, number>;
  allTagCounts: Record<string, number>;
  loaded: boolean;
}

type SearchPageRenderableItem = Omit<SearchResultItem, 'reasons'>;

const parseJsonAttribute = (page: HTMLElement, name: string): unknown => {
  const value = page.getAttribute(name);
  if (value === null) {
    return null;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const readInitialSearchState = (page: HTMLElement): SearchState | null => {
  const value = parseJsonAttribute(page, 'initial-search-state-json');
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const state = value as Partial<SearchState>;
  if (
    typeof state.q !== 'string' ||
    !Array.isArray(state.tags) ||
    state.tags.some((tag) => typeof tag !== 'string') ||
    typeof state.tagMode !== 'string' ||
    typeof state.sort !== 'string'
  ) {
    return null;
  }
  return {
    q: normalizeSearchQuery(state.q),
    tags: normalizeSearchTags(state.tags),
    tagMode: normalizeSearchTagMode(state.tagMode),
    sort: normalizeSearchSort(state.sort),
  };
};

const canonicalTagKeys = (tags: readonly string[]): string[] =>
  [...new Set(tags.map((tag) => tag.trim().toLocaleLowerCase('ja')).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, 'ja'),
  );

export const areSearchStatesCanonicallyEqual = (
  left: SearchState,
  right: SearchState,
): boolean =>
  normalizeSearchQuery(left.q) === normalizeSearchQuery(right.q) &&
  normalizeSearchTagMode(left.tagMode) === normalizeSearchTagMode(right.tagMode) &&
  normalizeSearchSort(left.sort) === normalizeSearchSort(right.sort) &&
  canonicalTagKeys(left.tags).join('\u0000') === canonicalTagKeys(right.tags).join('\u0000');

const parseCurrentSearchState = (siteUrlContext: SiteUrlContext): SearchState => {
  const url = new URL(window.location.href);
  url.pathname = stripBasePathFromPathname(url.pathname, siteUrlContext.basePath);
  return parseSearchStateFromUrl(url);
};

export const buildSearchPageHistoryHref = (
  state: SearchState,
  siteUrlContext: SiteUrlContext,
): string => {
  const canonicalUrl = new URL(buildUrlForSearchState(state), siteUrlContext.siteOrigin);
  return applyBasePathToRenderHref({
    pathname: canonicalUrl.pathname,
    search: canonicalUrl.search,
    siteUrlContext,
  });
};

const staticItemToRenderableItem = (
  item: StaticExploreSearchResultItem,
  siteUrlContext: SiteUrlContext,
): SearchPageRenderableItem => ({
  ...item,
  renderHref: buildSearchResultRenderHref({
    canonicalPathname: item.canonicalPathname,
    siteUrlContext,
  }),
});

const dynamicItemToRenderableItem = (item: SearchResultItem): SearchPageRenderableItem => ({
  ...item,
});

const createRuntimeState = (
  state: SearchState,
  response?: {
    readonly items: readonly SearchPageRenderableItem[];
    readonly tagCounts: Record<string, number>;
    readonly allTagCounts: Record<string, number>;
  },
): SearchPageRuntimeState => ({
  queryInputValue: state.q,
  normalizedQuery: normalizeSearchQuery(state.q),
  selectedTags: normalizeSearchTags(state.tags),
  tagMode: normalizeSearchTagMode(state.tagMode),
  sort: normalizeSearchSort(state.sort),
  items: response ? [...response.items] : [],
  tagCounts: response ? { ...response.tagCounts } : {},
  allTagCounts: response ? { ...response.allTagCounts } : {},
  loaded: response !== undefined,
});

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
  unavailable:
    | { readonly kind: 'site-url-context-unavailable' }
    | { readonly kind: 'bootstrap'; readonly reason: SearchBootstrapUnavailableReason },
): string =>
  unavailable.kind === 'site-url-context-unavailable'
    ? SITE_URL_CONTEXT_UNAVAILABLE_MESSAGE
    : getSearchBootstrapUnavailableMessage(unavailable.reason);

export class SearchPageController {
  private readonly page: HTMLElement;
  private readonly form: HTMLFormElement | null;
  private readonly dependencies: SearchPageControllerDependencies;
  private readonly listenerController = new AbortController();
  private readonly signal: AbortSignal | undefined;
  private disposed = false;
  private currentState: SearchPageControllerState | null = null;
  private runtimeState: SearchPageRuntimeState | null = null;
  private siteUrlContext: SiteUrlContext | null = null;
  private searchRuntime: SearchCore | null = null;
  private debounceTimerId: number | undefined;
  private searchGeneration = 0;
  private activeSearchAbortController: AbortController | null = null;

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
      const message = getSearchPageUnavailableMessage({ kind: 'site-url-context-unavailable' });
      this.currentState = { kind: 'site-url-context-unavailable', message };
      this.setDynamicSearchControlsDisabled(true);
      this.showUnavailable(message);
      return;
    }

    this.siteUrlContext = siteUrlContext;
    const bootstrapState = this.dependencies.bootstrapProvider();
    const searchRuntime = this.dependencies.searchRuntimeProvider();
    this.searchRuntime = searchRuntime;
    this.currentState = {
      kind: 'ready',
      siteUrlContext,
      bootstrapState,
      searchRuntime,
    };
    if (this.form === null) {
      return;
    }
    const urlState = parseCurrentSearchState(siteUrlContext);
    const initialState = readInitialSearchState(this.page);
    const initialResponseValue = parseJsonAttribute(this.page, 'initial-search-response-json');
    const diagnostics = createSearchJsonParseDiagnosticSink({ issues: [] });
    const parsedInitialResponse =
      bootstrapState?.status === 'ready'
        ? parseStaticExploreSearchResponseJson({
            value: initialResponseValue,
            diagnostics,
            isInternalDocumentPathname: bootstrapState.isInternalDocumentPathname,
          })
        : validateInlineStaticExploreSearchResponse({
            value: initialResponseValue,
            diagnostics,
          });
    const adoptedInitialResponse = adoptInitialStaticExploreSearchResponse(parsedInitialResponse);
    const canAdoptInitialResponse =
      initialState !== null &&
      adoptedInitialResponse.ok &&
      areSearchStatesCanonicallyEqual(initialState, urlState);
    if (canAdoptInitialResponse) {
      const response = adoptedInitialResponse.response;
      this.runtimeState = createRuntimeState(urlState, {
        items: response.items.map((item) => staticItemToRenderableItem(item, siteUrlContext)),
        tagCounts: response.tagCounts,
        allTagCounts: response.allTagCounts,
      });
      this.syncFormFromRuntimeState(this.form);
      syncFilterDomFromForm(this.page, this.form);
      if (searchRuntime === null) {
        const reason =
          bootstrapState?.status === 'unavailable'
            ? bootstrapState.reason
            : 'search-runtime-unavailable';
        this.showUnavailable(getSearchPageUnavailableMessage({ kind: 'bootstrap', reason }));
        this.setDynamicSearchControlsDisabled(true);
      } else {
        this.setDynamicSearchControlsDisabled(false);
      }
    } else if (searchRuntime === null) {
      const reason =
        bootstrapState?.status === 'unavailable'
          ? bootstrapState.reason
          : 'search-runtime-unavailable';
      const message = getSearchPageUnavailableMessage({ kind: 'bootstrap', reason });
      this.currentState = { kind: 'bootstrap-unavailable', message };
      this.runtimeState = createRuntimeState(urlState);
      this.syncFormFromRuntimeState(this.form);
      this.setDynamicSearchControlsDisabled(true);
      this.showUnavailable(message);
      this.clearResultsForUnavailable();
    } else {
      this.runtimeState = createRuntimeState(urlState);
      this.syncFormFromRuntimeState(this.form);
      this.setDynamicSearchControlsDisabled(false);
      this.runSearchImmediately();
    }
    this.bindReadyListeners(this.form);
    window.addEventListener('popstate', this.handlePopState, {
      signal: this.listenerController.signal,
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.cancelPendingSearch();
    this.listenerController.abort();
  }

  private readonly handlePopState = (): void => {
    if (this.disposed || this.siteUrlContext === null || this.runtimeState === null) {
      return;
    }
    const state = parseCurrentSearchState(this.siteUrlContext);
    if (this.searchRuntime === null) {
      const reason =
        this.currentState?.kind === 'ready' &&
        this.currentState.bootstrapState?.status === 'unavailable'
          ? this.currentState.bootstrapState.reason
          : 'search-runtime-unavailable';
      const message = getSearchPageUnavailableMessage({
        kind: 'bootstrap',
        reason,
      });
      this.currentState = { kind: 'bootstrap-unavailable', message };
      this.runtimeState = createRuntimeState(state);
      if (this.form) {
        this.syncFormFromRuntimeState(this.form);
        syncFilterDomFromForm(this.page, this.form);
      }
      this.setDynamicSearchControlsDisabled(true);
      this.showUnavailable(message);
      this.clearResultsForUnavailable();
      return;
    }
    this.runtimeState = createRuntimeState(state);
    if (this.form) {
      this.syncFormFromRuntimeState(this.form);
      syncFilterDomFromForm(this.page, this.form);
    }
    this.runSearchImmediately();
  };

  private showUnavailable(message: string): void {
    const unavailable = this.page.querySelector<HTMLElement>('[data-search-page-unavailable]');
    if (unavailable) {
      unavailable.textContent = message;
      unavailable.hidden = false;
    }
  }

  private clearResultsForUnavailable(): void {
    this.page.querySelector<HTMLElement>('[data-search-results-section]')?.replaceChildren();
  }

  private cancelPendingSearch(): void {
    this.searchGeneration += 1;
    if (typeof this.debounceTimerId === 'number') {
      window.clearTimeout(this.debounceTimerId);
      this.debounceTimerId = undefined;
    }
    this.activeSearchAbortController?.abort();
    this.activeSearchAbortController = null;
  }

  private commitUrl(method: 'pushState' | 'replaceState'): void {
    if (this.runtimeState === null || this.siteUrlContext === null) {
      return;
    }
    history[method](
      history.state,
      '',
      buildSearchPageHistoryHref(this.toSearchState(), this.siteUrlContext),
    );
    this.page.querySelector('h1')?.replaceChildren('検索');
  }

  private toSearchState(): SearchState {
    const state = this.runtimeState;
    if (state === null) {
      return { q: '', tags: [], tagMode: 'or', sort: 'relevance' };
    }
    return {
      q: state.normalizedQuery,
      tags: state.selectedTags,
      tagMode: state.tagMode,
      sort: state.sort,
    };
  }

  private scheduleSearch(): void {
    this.cancelPendingSearch();
    this.debounceTimerId = window.setTimeout(() => {
      this.debounceTimerId = undefined;
      this.executeSearch();
    }, SEARCH_DEBOUNCE_MS);
  }

  private runSearchImmediately(): void {
    this.cancelPendingSearch();
    this.executeSearch();
  }

  private executeSearch(): void {
    if (this.disposed || this.searchRuntime === null || this.runtimeState === null) {
      return;
    }
    const generation = this.searchGeneration;
    const searchAbortController = new AbortController();
    this.activeSearchAbortController = searchAbortController;
    void this.searchRuntime
      .search({ mode: 'explore', ...this.toSearchState() }, { signal: searchAbortController.signal })
      .then((response) => {
        if (
          this.disposed ||
          generation !== this.searchGeneration ||
          searchAbortController.signal.aborted
        ) {
          return;
        }
        if (response.mode !== 'explore') {
          throw new Error('Search page requires explore search response.');
        }
        this.applySearchResponse(response);
      })
      .catch((error: unknown) => {
        if (
          generation !== this.searchGeneration ||
          searchAbortController.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }
        const errorContainer = this.page.querySelector<HTMLElement>('[data-search-page-error]');
        if (errorContainer) {
          errorContainer.textContent = '検索の読み込みに失敗しました。';
          errorContainer.hidden = false;
        }
      })
      .finally(() => {
        if (
          generation === this.searchGeneration &&
          this.activeSearchAbortController === searchAbortController
        ) {
          this.activeSearchAbortController = null;
        }
      });
  }

  private applySearchResponse(response: ExploreSearchResponse): void {
    if (this.runtimeState === null) {
      return;
    }
    this.runtimeState.items = response.items.map(dynamicItemToRenderableItem);
    this.runtimeState.tagCounts = { ...response.tagCounts };
    this.runtimeState.allTagCounts = { ...response.allTagCounts };
    this.runtimeState.loaded = true;
    if (response.diagnostics.degraded) {
      console.warn('Search page completed with degraded diagnostics.', response.diagnostics);
    }
  }

  private syncFormFromRuntimeState(form: HTMLFormElement): void {
    const state = this.runtimeState;
    if (state === null) {
      return;
    }
    const query = form.querySelector<HTMLInputElement>('[data-search-query-input]');
    if (query) {
      query.value = state.queryInputValue;
    }
    for (const checkbox of form.querySelectorAll<HTMLInputElement>('[data-search-tag-checkbox]')) {
      checkbox.checked = state.selectedTags.includes(checkbox.value);
    }
    const tagMode = form.querySelector<HTMLSelectElement>('[data-search-tag-mode-select]');
    if (tagMode) {
      tagMode.value = state.tagMode;
    }
    const sort = form.querySelector<HTMLSelectElement>('[data-search-sort-select]');
    if (sort) {
      sort.value = state.sort;
    }
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
    const syncFilterDom = (preferredTag?: string): void => {
      if (this.disposed || this.runtimeState === null) {
        return;
      }
      syncFilterDomFromForm(this.page, form, preferredTag);
    };
    const commitFormState = (
      method: 'pushState' | 'replaceState',
      search: 'debounced' | 'immediate',
      preferredTag?: string,
    ): void => {
      if (this.disposed || this.runtimeState === null || this.searchRuntime === null) {
        return;
      }
      const data = new FormData(form);
      this.runtimeState.queryInputValue =
        form.querySelector<HTMLInputElement>('[data-search-query-input]')?.value ?? '';
      this.runtimeState.normalizedQuery = normalizeSearchQuery(this.runtimeState.queryInputValue);
      this.runtimeState.selectedTags = normalizeSearchTags(
        orderedSelectedTagValues(form, preferredTag),
      );
      this.runtimeState.tagMode = normalizeSearchTagMode(readFormString(data.get('tagMode')));
      this.runtimeState.sort = normalizeSearchSort(readFormString(data.get('sort')));
      this.commitUrl(method);
      syncFilterDom(preferredTag);
      if (search === 'debounced') {
        this.scheduleSearch();
      } else {
        this.runSearchImmediately();
      }
    };

    form.addEventListener(
      'change',
      (event) => {
        const target = event.target;
        if (
          !(target instanceof HTMLElement) ||
          !target.matches(
            '[data-search-tag-checkbox], [data-search-tag-mode-select], [data-search-sort-select]',
          )
        ) {
          return;
        }
        const preferredTag =
          target instanceof HTMLInputElement &&
          target.matches('[data-search-tag-checkbox]') &&
          target.checked
            ? target.value
            : undefined;
        commitFormState('pushState', 'immediate', preferredTag);
      },
      listenerOptions,
    );
    form.querySelector<HTMLInputElement>('[data-search-query-input]')?.addEventListener(
      'input',
      () => {
        commitFormState('replaceState', 'debounced');
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
          commitFormState('replaceState', 'debounced');
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
          commitFormState('pushState', 'immediate');
        }
      },
      listenerOptions,
    );
  }
}

export const createSearchPageController = (
  options: CreateSearchPageControllerOptions,
): SearchPageController => new SearchPageController(options);
