import { renderStaticIconHtml } from '../../../shared/icons/render-static-icon-html.js';
import { createSearchJsonParseDiagnosticSink } from '../../../shared/search/search-diagnostics.js';
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
import { orderSearchPageTags } from '../../search/search-page-tag-order.js';
import {
  getSearchPageTagModeCountDescription,
  getSearchPageTagModeLabel,
  getSearchPageTagOptionPresentation,
} from '../../search/search-page-tag-option.js';
import { SEARCH_DEBOUNCE_MS } from '../../search/search-constants.js';
import type { SearchCore } from '../../search/search-core.js';
import { buildSearchResultRenderHref } from '../../search/normalize-search-result-url.js';
import { readSiteUrlContextFromDocumentMeta } from '../../site/read-site-url-context-from-document-meta.js';
import {
  getSearchBootstrapUnavailableMessage,
  type SearchBootstrapUnavailableReason,
} from '../../../shared/search/search-unavailable-reason.js';

const SITE_URL_CONTEXT_UNAVAILABLE_MESSAGE =
  'サイトURL情報を読み込めないため、検索ページの動的機能を利用できません。通常リンクはそのまま利用できます。';

const DYNAMIC_SEARCH_CONTROL_SELECTOR = [
  '[data-search-query-input]',
  '[data-search-query-clear]',
  '[data-search-tag-checkbox]',
  '[data-search-selected-tag-remove]',
  '[data-search-filter-input]',
  '[data-search-filter-clear]',
].join(',');

const searchChoiceLabels = {
  tagMode: {
    or: getSearchPageTagModeLabel('or'),
    and: getSearchPageTagModeLabel('and'),
  },
  sort: {
    relevance: '関連度順',
    'date-desc': '新しい順',
  },
} as const;

type SearchChoiceName = 'tagMode' | 'sort';

const choiceInputSelector = (name: SearchChoiceName): string =>
  name === 'tagMode' ? '[data-search-tag-mode-value]' : '[data-search-sort-value]';

const choiceValueLabel = (name: SearchChoiceName, value: string): string =>
  name === 'tagMode'
    ? searchChoiceLabels.tagMode[normalizeSearchTagMode(value)]
    : searchChoiceLabels.sort[normalizeSearchSort(value)];

export type SearchPageControllerState =
  | {
      readonly kind: 'ready';
      readonly siteUrlContext: SiteUrlContext;
      readonly bootstrapState: Extract<SearchBootstrapState, { readonly status: 'ready' }>;
      readonly searchRuntime: SearchCore;
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
  countsStatus: 'ready' | 'pending' | 'error';
  loaded: boolean;
}

export type SearchPageRenderableItem = Omit<SearchResultItem, 'reasons'>;

type SearchPageStatusVariant = 'loading' | 'error' | 'unavailable';

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

export const areSearchStatesCanonicallyEqual = (left: SearchState, right: SearchState): boolean =>
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
  countsStatus: response === undefined ? 'pending' : 'ready',
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
  button.setAttribute('aria-label', `${tag}を解除`);
  button.dataset['searchSelectedTagRemove'] = tag;
  button.innerHTML = renderStaticIconHtml('x', 'selected-tag__remove-icon');
  chip.append(label, button);
  return chip;
};

const createFilterOption = (document: Document, tag: string): HTMLElement => {
  const option = document.createElement('div');
  option.className = 'filter-option';
  option.setAttribute('role', 'listitem');
  option.dataset['filterOption'] = '';
  option.dataset['filterTag'] = tag;

  const label = document.createElement('label');
  label.className = 'filter-option-checkbox';
  const checkbox = document.createElement('input');
  checkbox.className = 'filter-option-checkbox__input';
  checkbox.type = 'checkbox';
  checkbox.name = 'tag';
  checkbox.value = tag;
  checkbox.dataset['searchTagCheckbox'] = '';
  const control = document.createElement('span');
  control.className = 'filter-option-checkbox__control';
  control.setAttribute('aria-hidden', 'true');
  control.innerHTML = renderStaticIconHtml('check', 'filter-option-checkbox__icon');
  const text = document.createElement('span');
  text.className = 'filter-option-label';
  text.textContent = tag;
  label.append(checkbox, control, text);

  const count = document.createElement('span');
  count.className = 'filter-option-count';
  option.append(label, count);
  return option;
};

let tagOptionStatusId = 0;

const syncFilterOptionPresentation = (
  option: HTMLElement,
  checkbox: HTMLInputElement | null,
  presentation: ReturnType<typeof getSearchPageTagOptionPresentation>,
): void => {
  option.dataset['filterCount'] = presentation.count === null ? '' : String(presentation.count);
  option.dataset['selected'] = String(presentation.state === 'selected');
  option.dataset['disabled'] = String(presentation.disabled);
  option.dataset['state'] = presentation.state;
  option.dataset['countStatus'] = presentation.countStatus;
  if (checkbox) {
    checkbox.checked = presentation.state === 'selected';
    checkbox.disabled = presentation.disabled;
  }
  const status = option.querySelector<HTMLElement>('.filter-option-count');
  if (!status) return;
  status.replaceChildren(presentation.statusText);
  if (!status.id) {
    tagOptionStatusId += 1;
    status.id = `search-page-tag-status-runtime-${String(tagOptionStatusId)}`;
  }
  checkbox?.setAttribute('aria-describedby', status.id);
};

const syncFilterOptionsFromRuntimeState = (
  page: HTMLElement,
  runtimeState: SearchPageRuntimeState,
): HTMLInputElement | null => {
  const list = page.querySelector<HTMLElement>('[data-search-filter-list]');
  if (!list) {
    return null;
  }
  const existingOptions = new Map(
    [...list.querySelectorAll<HTMLElement>('[data-filter-option]')].map((option) => [
      option.dataset['filterTag'] ?? '',
      option,
    ]),
  );
  const activeElement = page.ownerDocument.activeElement;
  const focusedCheckbox =
    activeElement instanceof HTMLInputElement &&
    activeElement.matches('[data-search-tag-checkbox]') &&
    list.contains(activeElement)
      ? activeElement
      : null;
  const hasKnownCountMaps =
    Object.keys(runtimeState.allTagCounts).length > 0 ||
    Object.keys(runtimeState.tagCounts).length > 0;
  const tags =
    runtimeState.countsStatus !== 'ready'
      ? [
          ...new Set([
            ...[...existingOptions.keys()].filter(
              (tag) =>
                !hasKnownCountMaps ||
                Object.hasOwn(runtimeState.allTagCounts, tag) ||
                Object.hasOwn(runtimeState.tagCounts, tag),
            ),
            ...runtimeState.selectedTags,
          ]),
        ]
      : orderSearchPageTags(runtimeState);
  list.setAttribute('aria-busy', String(runtimeState.countsStatus === 'pending'));
  list.dataset['countStatus'] = runtimeState.countsStatus;
  const options = tags.map((tag) => {
    const option = existingOptions.get(tag) ?? createFilterOption(page.ownerDocument, tag);
    const checkbox = option.querySelector<HTMLInputElement>('[data-search-tag-checkbox]');
    syncFilterOptionPresentation(
      option,
      checkbox,
      getSearchPageTagOptionPresentation({
        tag,
        tagMode: runtimeState.tagMode,
        selectedTags: runtimeState.selectedTags,
        tagCounts: runtimeState.tagCounts,
        allTagCounts: runtimeState.allTagCounts,
        countStatus: runtimeState.countsStatus,
      }),
    );
    return option;
  });
  const currentNodes = [...list.childNodes];
  if (
    currentNodes.length === options.length &&
    currentNodes.every((node, index) => node === options[index])
  ) {
    return null;
  }
  list.replaceChildren(...options);
  return focusedCheckbox &&
    list.contains(focusedCheckbox) &&
    page.ownerDocument.activeElement !== focusedCheckbox
    ? focusedCheckbox
    : null;
};

const syncFilterDomFromForm = (
  page: HTMLElement,
  form: HTMLFormElement,
  runtimeState: SearchPageRuntimeState,
  preferredTag?: string,
): void => {
  const focusToKeep = syncFilterOptionsFromRuntimeState(page, runtimeState);
  const selectedTags = orderedSelectedTagValues(form, preferredTag);
  const tagMode = getSearchPageTagModeLabel(runtimeState.tagMode);
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
    syncFilterOptionPresentation(
      option,
      checkbox,
      getSearchPageTagOptionPresentation({
        tag,
        tagMode: runtimeState.tagMode,
        selectedTags: runtimeState.selectedTags,
        tagCounts: runtimeState.tagCounts,
        allTagCounts: runtimeState.allTagCounts,
        countStatus: runtimeState.countsStatus,
      }),
    );
    const matches = !filterQuery || tag.toLocaleLowerCase().includes(filterQuery);
    option.hidden = !matches;
    option.dataset['filterHidden'] = String(!matches);
    if (matches) {
      visibleCount += 1;
    }
  }
  const visibleMeta = page.querySelector<HTMLElement>('[data-filter-visible-count]');
  if (visibleMeta) {
    visibleMeta.textContent = `${String(visibleCount)} / ${String(options.length)}タグ`;
  }
  const filterEmpty = page.querySelector<HTMLElement>('[data-search-filter-empty]');
  if (filterEmpty) {
    filterEmpty.hidden = visibleCount > 0;
  }
  // local filter 適用後に可視性を判定し、隠れた行へ focus を戻さない。
  if (focusToKeep && !focusToKeep.disabled && focusToKeep.getClientRects().length > 0) {
    focusToKeep.focus({ preventScroll: true });
  }
  syncStaticSearchFieldClearButtons(page);
};

const createSearchPageEmptyState = (document: Document, state: SearchState): HTMLElement => {
  const hasConditions = state.q.length > 0 || state.tags.length > 0;
  const section = document.createElement('section');
  section.className = 'empty-hint';
  section.dataset['emptyState'] = '';
  section.dataset['searchEmptyState'] = '';
  section.dataset['emptyVariant'] = 'search';
  const message = document.createElement('div');
  message.className = 'empty-hint__message';
  message.dataset['announce'] = 'off';
  const illustration = document.createElement('div');
  illustration.className = 'empty-hint__illustration';
  illustration.setAttribute('aria-hidden', 'true');
  illustration.hidden = true;
  const icon = document.createElement('div');
  icon.className = 'empty-hint__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.hidden = true;
  const heading = document.createElement('h2');
  heading.className = 'empty-hint__heading';
  heading.textContent = hasConditions
    ? '一致するメモが見つかりません'
    : 'キーワードまたはタグで絞り込めます';
  const description = document.createElement('p');
  description.className = 'empty-hint__description';
  description.textContent = hasConditions
    ? '検索語を変えるか、タグの組み合わせを見直してください。'
    : 'ヘッダーのダイアログは即時検索、ここではタグの組み合わせも含めて一覧で比較できます。';
  message.append(illustration, icon, heading, description);
  const actions = document.createElement('div');
  actions.className = 'empty-hint__actions';
  actions.hidden = true;
  section.append(message, actions);
  return section;
};

const createSearchPageResultExcerpt = (
  document: Document,
  item: SearchPageRenderableItem,
): HTMLParagraphElement | null => {
  const excerpt = document.createElement('p');
  excerpt.className = 'result-excerpt';
  if (item.snippet) {
    for (const segment of item.snippet.segments) {
      if (segment.matched) {
        const mark = document.createElement('mark');
        mark.textContent = segment.text;
        excerpt.append(mark);
      } else {
        excerpt.append(document.createTextNode(segment.text));
      }
    }
  } else {
    excerpt.textContent = item.description;
  }
  return excerpt.textContent.trim() ? excerpt : null;
};

const createSearchPageResult = (
  document: Document,
  item: SearchPageRenderableItem,
): HTMLLIElement => {
  const listItem = document.createElement('li');
  const card = document.createElement('article');
  card.className = 'result-card';
  card.dataset['searchResultCard'] = '';
  const link = document.createElement('a');
  link.className = 'result-link';
  link.href = item.renderHref;
  link.dataset['linkKind'] = 'internal-document';
  link.dataset['linkSurface'] = 'card';
  const path = document.createElement('div');
  path.className = 'result-path';
  path.textContent = item.pathLabel;
  const title = document.createElement('h2');
  title.className = 'result-title';
  title.textContent = item.title;
  link.append(path, title);
  if (item.date.original) {
    const date = document.createElement('div');
    date.className = 'result-meta';
    date.textContent = `更新日: ${item.date.original}`;
    link.append(date);
  }
  const excerpt = createSearchPageResultExcerpt(document, item);
  if (excerpt) {
    link.append(excerpt);
  }
  card.append(link);
  listItem.append(card);
  return listItem;
};

const renderSearchPageResults = (page: HTMLElement, runtimeState: SearchPageRuntimeState): void => {
  const root = page.querySelector<HTMLElement>('[data-search-page-results-section]');
  if (!root) {
    return;
  }
  if (runtimeState.items.length === 0) {
    root.replaceChildren(
      createSearchPageEmptyState(page.ownerDocument, {
        q: runtimeState.normalizedQuery,
        tags: runtimeState.selectedTags,
        tagMode: runtimeState.tagMode,
        sort: runtimeState.sort,
      }),
    );
  } else {
    const list = page.ownerDocument.createElement('ol');
    list.className = 'results-list';
    list.dataset['searchResults'] = '';
    list.append(
      ...runtimeState.items.map((item) => createSearchPageResult(page.ownerDocument, item)),
    );
    root.replaceChildren(list);
  }
  page
    .querySelector<HTMLElement>('[data-search-page-result-count]')
    ?.replaceChildren(`${String(runtimeState.items.length)} 件の結果`);
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

    this.setDynamicSearchControlsDisabled(true);
    let siteUrlContext: SiteUrlContext | null;
    let bootstrapState: SearchBootstrapState | null;
    let searchRuntime: SearchCore | null;
    try {
      siteUrlContext = this.dependencies.siteUrlContextProvider(this.page.ownerDocument);
      bootstrapState = siteUrlContext ? this.dependencies.bootstrapProvider() : null;
      searchRuntime = siteUrlContext ? this.dependencies.searchRuntimeProvider() : null;
    } catch {
      const message = getSearchPageUnavailableMessage({
        kind: 'bootstrap',
        reason: 'search-runtime-unavailable',
      });
      this.currentState = { kind: 'bootstrap-unavailable', message };
      this.showUnavailable(message);
      return;
    }
    if (siteUrlContext === null) {
      const message = getSearchPageUnavailableMessage({ kind: 'site-url-context-unavailable' });
      this.currentState = { kind: 'site-url-context-unavailable', message };
      this.setDynamicSearchControlsDisabled(true);
      this.showUnavailable(message);
      return;
    }

    this.siteUrlContext = siteUrlContext;
    if (bootstrapState?.status !== 'ready' || searchRuntime === null || this.form === null) {
      const reason =
        bootstrapState?.status === 'unavailable'
          ? bootstrapState.reason
          : 'search-runtime-unavailable';
      const message = getSearchPageUnavailableMessage({ kind: 'bootstrap', reason });
      this.currentState = { kind: 'bootstrap-unavailable', message };
      this.runtimeState = createRuntimeState(parseCurrentSearchState(siteUrlContext));
      if (this.form) {
        this.syncFormFromRuntimeState(this.form);
        this.setDynamicSearchControlsDisabled(true);
      }
      this.showUnavailable(message);
      window.addEventListener('popstate', this.handlePopState, {
        signal: this.listenerController.signal,
      });
      return;
    }
    this.searchRuntime = searchRuntime;
    const urlState = parseCurrentSearchState(siteUrlContext);
    const initialState = readInitialSearchState(this.page);
    const initialResponseValue = parseJsonAttribute(this.page, 'initial-search-response-json');
    const diagnostics = createSearchJsonParseDiagnosticSink({ issues: [] });
    const parsedInitialResponse = parseStaticExploreSearchResponseJson({
      value: initialResponseValue,
      diagnostics,
      isInternalDocumentPathname: bootstrapState.isInternalDocumentPathname,
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
      syncFilterDomFromForm(this.page, this.form, this.runtimeState);
      this.showStatus(null);
      renderSearchPageResults(this.page, this.runtimeState);
    } else {
      this.runtimeState = createRuntimeState(urlState);
      this.syncFormFromRuntimeState(this.form);
      syncFilterDomFromForm(this.page, this.form, this.runtimeState);
      this.syncHeroFromRuntimeState();
    }
    this.bindReadyListeners(this.form);
    window.addEventListener('popstate', this.handlePopState, {
      signal: this.listenerController.signal,
    });
    this.currentState = { kind: 'ready', siteUrlContext, bootstrapState, searchRuntime };
    this.setDynamicSearchControlsDisabled(false);
    if (!canAdoptInitialResponse) this.runSearchImmediately();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.cancelPendingSearch();
    this.listenerController.abort();
    this.showStatus(null);
    this.setDynamicSearchControlsDisabled(true);
    this.page.dataset['searchPageCapability'] = 'static';
  }

  private readonly handlePopState = (): void => {
    if (this.disposed || this.siteUrlContext === null || this.runtimeState === null) {
      return;
    }
    const state = parseCurrentSearchState(this.siteUrlContext);
    this.closeAllSearchChoiceMenus();
    if (this.searchRuntime === null) {
      this.runtimeState = createRuntimeState(state);
      if (this.form) {
        this.syncFormFromRuntimeState(this.form);
      }
      this.setDynamicSearchControlsDisabled(true);
      return;
    }
    this.runtimeState = createRuntimeState(state);
    if (this.form) {
      this.syncFormFromRuntimeState(this.form);
      syncFilterDomFromForm(this.page, this.form, this.runtimeState);
    }
    this.syncHeroFromRuntimeState();
    this.runSearchImmediately();
  };

  private showUnavailable(message: string): void {
    this.page.dataset['searchPageCapability'] = 'unavailable';
    this.showStatus('unavailable', message);
  }

  private showStatus(variant: SearchPageStatusVariant | null, message = ''): void {
    const containers = new Map<SearchPageStatusVariant, HTMLElement>();
    for (const candidate of ['loading', 'error', 'unavailable'] as const) {
      const container = this.page.querySelector<HTMLElement>(`[data-search-page-${candidate}]`);
      if (!container) {
        continue;
      }
      containers.set(candidate, container);
      container.hidden = true;
      delete container.dataset['statusVariant'];
      if (candidate !== 'loading') {
        container.textContent = '';
      }
    }
    if (variant === null) {
      return;
    }
    const container = containers.get(variant);
    if (!container) {
      return;
    }
    if (variant !== 'loading') {
      container.textContent = message;
    }
    container.hidden = false;
    container.dataset['statusVariant'] = variant;
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
    this.syncHeroFromRuntimeState();
  }

  private syncHeroFromRuntimeState(): void {
    const state = this.toSearchState();
    const pathname = this.siteUrlContext
      ? stripBasePathFromPathname(window.location.pathname, this.siteUrlContext.basePath)
      : window.location.pathname;
    const isTagDefaultView =
      pathname.startsWith('/tags/') &&
      state.q.length === 0 &&
      state.tags.length === 1 &&
      state.tagMode === 'or' &&
      state.sort === 'relevance';
    this.page
      .querySelector<HTMLElement>('[data-search-page-dynamic-hero] .eyebrow')
      ?.replaceChildren(isTagDefaultView ? 'Tag / Explore' : 'Search / Filter');
    this.page
      .querySelector<HTMLElement>('[data-search-page-dynamic-hero] h1')
      ?.replaceChildren(isTagDefaultView ? `#${state.tags[0] ?? ''}` : '検索');
    this.page
      .querySelector<HTMLElement>('[data-search-page-dynamic-hero] .description')
      ?.replaceChildren(
        isTagDefaultView
          ? 'このタグに属するノートを起点に、検索語や追加タグで探索を広げられます。'
          : 'タグとキーワードを組み合わせ、複数タグはOR / ANDを切り替えて探索します。',
      );
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
    this.clearCurrentResults();
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
    this.clearCurrentResults();
    this.showStatus('loading');
    const searchRuntime = this.searchRuntime;
    const request = { mode: 'explore' as const, ...this.toSearchState() };
    let pending: ReturnType<SearchCore['search']>;
    try {
      pending = searchRuntime.search(request, { signal: searchAbortController.signal });
    } catch {
      this.activeSearchAbortController = null;
      this.showRequestError();
      return;
    }
    void pending
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
        if (response.diagnostics.failures.includes('all-sources-failed')) {
          this.showRequestError();
          return;
        }
        this.applySearchResponse(response);
      })
      .catch((error: unknown) => {
        if (
          this.disposed ||
          generation !== this.searchGeneration ||
          searchAbortController.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }
        this.showRequestError();
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

  private clearCurrentResults(): void {
    this.page.querySelector<HTMLElement>('[data-search-page-results-section]')?.replaceChildren();
    this.page.querySelector<HTMLElement>('[data-search-page-result-count]')?.replaceChildren();
  }

  private showRequestError(): void {
    if (this.runtimeState?.countsStatus === 'pending') {
      this.runtimeState.countsStatus = 'error';
      if (this.form) syncFilterDomFromForm(this.page, this.form, this.runtimeState);
    }
    this.clearCurrentResults();
    this.showStatus(
      'error',
      '検索の読み込みに失敗しました。検索語や条件を変更して再入力できます。',
    );
  }

  private applySearchResponse(response: ExploreSearchResponse): void {
    if (this.runtimeState === null) {
      return;
    }
    this.runtimeState.items = response.items.map(dynamicItemToRenderableItem);
    this.runtimeState.tagCounts = { ...response.tagCounts };
    this.runtimeState.allTagCounts = { ...response.allTagCounts };
    this.runtimeState.countsStatus = 'ready';
    this.runtimeState.loaded = true;
    this.showStatus(null);
    renderSearchPageResults(this.page, this.runtimeState);
    if (this.form) {
      this.syncFormFromRuntimeState(this.form);
      syncFilterDomFromForm(this.page, this.form, this.runtimeState);
    }
    if (response.diagnostics.degraded) {
      console.warn('Search page completed with degraded diagnostics.', response.diagnostics);
    }
  }

  private searchChoiceMenus(): HTMLDetailsElement[] {
    return [...this.page.querySelectorAll<HTMLDetailsElement>('[data-search-choice-menu]')];
  }

  private closeSearchChoiceMenu(details: HTMLDetailsElement, restoreFocus = false): void {
    details.open = false;
    const trigger = details.querySelector<HTMLElement>('[data-static-choice-trigger]');
    trigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) {
      trigger?.focus();
    }
  }

  private closeOtherSearchChoiceMenus(current: HTMLDetailsElement): void {
    for (const details of this.searchChoiceMenus()) {
      if (details !== current) {
        this.closeSearchChoiceMenu(details);
      }
    }
  }

  private closeAllSearchChoiceMenus(): void {
    for (const details of this.searchChoiceMenus()) {
      this.closeSearchChoiceMenu(details);
    }
  }

  private openSearchChoiceMenu(details: HTMLDetailsElement): void {
    this.closeOtherSearchChoiceMenus(details);
    details.open = true;
    details
      .querySelector<HTMLElement>('[data-static-choice-trigger]')
      ?.setAttribute('aria-expanded', 'true');
  }

  private toggleSearchChoiceMenu(details: HTMLDetailsElement): void {
    if (details.open) {
      this.closeSearchChoiceMenu(details);
    } else {
      this.openSearchChoiceMenu(details);
    }
  }

  private syncSearchChoiceMenu(
    form: HTMLFormElement,
    name: SearchChoiceName,
    value: SearchState[SearchChoiceName],
  ): void {
    const input = form.querySelector<HTMLInputElement>(choiceInputSelector(name));
    if (input) {
      input.name = name;
      input.value = value;
      input.disabled = false;
    }
    const menu = form.querySelector<HTMLDetailsElement>(
      `[data-search-choice-menu="${name === 'tagMode' ? 'tag-mode' : 'sort'}"]`,
    );
    if (!menu) {
      return;
    }
    const label = choiceValueLabel(name, value);
    menu.querySelector<HTMLElement>('[data-static-choice-current-label]')?.replaceChildren(label);
    const trigger = menu.querySelector<HTMLElement>('[data-static-choice-trigger]');
    trigger?.setAttribute('aria-expanded', menu.open ? 'true' : 'false');

    let selectedCount = 0;
    const items = [...menu.querySelectorAll<HTMLButtonElement>('[data-static-choice-item]')];
    for (const item of items) {
      const selected = item.dataset['value'] === value && selectedCount === 0;
      item.dataset['selected'] = String(selected);
      item.setAttribute('aria-pressed', String(selected));
      if (selected) {
        selectedCount += 1;
      }
    }
    if (selectedCount === 0 && items[0]) {
      items[0].dataset['selected'] = 'true';
      items[0].setAttribute('aria-pressed', 'true');
    }
  }

  private syncSearchChoiceMenusFromRuntimeState(form: HTMLFormElement): void {
    const state = this.runtimeState;
    if (state === null) {
      return;
    }
    this.syncSearchChoiceMenu(form, 'tagMode', state.tagMode);
    this.syncSearchChoiceMenu(form, 'sort', state.sort);
    this.page
      .querySelector<HTMLElement>('[data-search-tag-mode-description]')
      ?.replaceChildren(getSearchPageTagModeCountDescription(state.tagMode));
  }

  private setSearchChoiceMenusDisabled(disabled: boolean): void {
    for (const details of this.searchChoiceMenus()) {
      const trigger = details.querySelector<HTMLElement>('[data-static-choice-trigger]');
      if (trigger) {
        if (disabled) {
          trigger.setAttribute('aria-disabled', 'true');
          trigger.dataset['disabled'] = 'true';
        } else {
          trigger.removeAttribute('aria-disabled');
          delete trigger.dataset['disabled'];
        }
        trigger.setAttribute('aria-expanded', disabled || !details.open ? 'false' : 'true');
      }
      if (disabled) {
        details.open = false;
      }
      for (const item of details.querySelectorAll<HTMLButtonElement>('[data-static-choice-item]')) {
        item.disabled = disabled;
      }
    }
    for (const input of this.page.querySelectorAll<HTMLInputElement>(
      '[data-search-choice-value]',
    )) {
      input.disabled = false;
    }
  }

  private focusChoiceItem(details: HTMLDetailsElement, direction: 1 | -1): void {
    this.openSearchChoiceMenu(details);
    const items = [
      ...details.querySelectorAll<HTMLButtonElement>('[data-static-choice-item]'),
    ].filter((item) => !item.disabled);
    if (items.length === 0) {
      return;
    }
    const activeIndex = items.findIndex((item) => item === this.page.ownerDocument.activeElement);
    const nextIndex =
      activeIndex < 0
        ? direction > 0
          ? 0
          : items.length - 1
        : (activeIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
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
    this.syncSearchChoiceMenusFromRuntimeState(form);
  }

  private setDynamicSearchControlsDisabled(disabled: boolean): void {
    const activeElement = this.page.ownerDocument.activeElement;
    const baseline = this.page.querySelector<HTMLElement>('[data-search-page-baseline]');
    const focusLeavesBaseline =
      !disabled && activeElement !== null && baseline?.contains(activeElement);
    if (!disabled) this.page.dataset['searchPageCapability'] = 'ready';
    if (this.form) this.form.hidden = disabled;
    if (baseline) baseline.hidden = !disabled;
    for (const selector of [
      '[data-search-page-dynamic-hero]',
      '[data-search-page-results-section]',
    ]) {
      const region = this.page.querySelector<HTMLElement>(selector);
      if (region) region.hidden = disabled;
    }
    for (const control of this.page.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      DYNAMIC_SEARCH_CONTROL_SELECTOR,
    )) {
      control.disabled =
        disabled ||
        (control.matches('[data-search-tag-checkbox]') &&
          control.closest<HTMLElement>('[data-filter-option]')?.dataset['disabled'] === 'true');
    }
    this.setSearchChoiceMenusDisabled(disabled);
    if (focusLeavesBaseline) {
      this.form
        ?.querySelector<HTMLInputElement>('[data-search-query-input]')
        ?.focus({ preventScroll: true });
    }
  }

  private bindReadyListeners(form: HTMLFormElement): void {
    const listenerOptions = { signal: this.listenerController.signal };
    const syncFilterDom = (preferredTag?: string): void => {
      if (this.disposed || this.runtimeState === null) {
        return;
      }
      syncFilterDomFromForm(this.page, form, this.runtimeState, preferredTag);
      if (this.searchRuntime === null) {
        this.setDynamicSearchControlsDisabled(true);
      }
    };
    const commitFormState = (
      method: 'pushState' | 'replaceState',
      search: 'debounced' | 'immediate',
      preferredTag?: string,
      invalidateCounts = true,
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
      if (invalidateCounts) this.runtimeState.countsStatus = 'pending';
      this.commitUrl(method);
      this.syncSearchChoiceMenusFromRuntimeState(form);
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
        if (!(target instanceof HTMLElement) || !target.matches('[data-search-tag-checkbox]')) {
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
    form.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const trigger = target.closest<HTMLElement>('[data-static-choice-trigger]');
        if (!trigger || !form.contains(trigger)) {
          return;
        }
        const details = trigger.closest<HTMLDetailsElement>('[data-search-choice-menu]');
        if (!details) {
          return;
        }
        event.preventDefault();
        if (
          trigger.getAttribute('aria-disabled') === 'true' ||
          trigger.dataset['disabled'] === 'true'
        ) {
          return;
        }
        this.toggleSearchChoiceMenu(details);
      },
      listenerOptions,
    );
    form.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        const item =
          target instanceof HTMLElement
            ? target.closest<HTMLButtonElement>('[data-static-choice-item]')
            : null;
        if (!item || item.disabled) {
          return;
        }
        const details = item.closest<HTMLDetailsElement>('[data-search-choice-menu]');
        const kind = details?.dataset['searchChoiceMenu'];
        const value = item.dataset['value'];
        if (!details || (kind !== 'tag-mode' && kind !== 'sort') || typeof value !== 'string') {
          return;
        }
        const name: SearchChoiceName = kind === 'tag-mode' ? 'tagMode' : 'sort';
        const input = form.querySelector<HTMLInputElement>(choiceInputSelector(name));
        if (input) {
          input.value = value;
        }
        commitFormState('pushState', 'immediate', undefined, name !== 'sort');
        this.closeSearchChoiceMenu(details, true);
      },
      listenerOptions,
    );
    form.addEventListener(
      'keydown',
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const trigger = target.closest<HTMLElement>('[data-static-choice-trigger]');
        if (trigger && form.contains(trigger)) {
          const details = trigger.closest<HTMLDetailsElement>('[data-search-choice-menu]');
          if (!details) {
            return;
          }
          if (
            trigger.getAttribute('aria-disabled') === 'true' ||
            trigger.dataset['disabled'] === 'true'
          ) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.toggleSearchChoiceMenu(details);
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.focusChoiceItem(details, 1);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.focusChoiceItem(details, -1);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            this.closeSearchChoiceMenu(details, true);
          } else if (event.key === 'Tab') {
            this.closeSearchChoiceMenu(details);
          }
          return;
        }
        const item = target.closest<HTMLButtonElement>('[data-static-choice-item]');
        if (!item || !form.contains(item)) {
          return;
        }
        const details = item.closest<HTMLDetailsElement>('[data-search-choice-menu]');
        if (!details) {
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          this.focusChoiceItem(details, 1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          this.focusChoiceItem(details, -1);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          this.closeSearchChoiceMenu(details, true);
        } else if (event.key === 'Tab') {
          this.closeSearchChoiceMenu(details);
        }
      },
      listenerOptions,
    );
    form.addEventListener(
      'toggle',
      (event) => {
        const details =
          event.target instanceof HTMLDetailsElement &&
          event.target.matches('[data-search-choice-menu]')
            ? event.target
            : null;
        if (!details) {
          return;
        }
        if (details.open) {
          this.closeOtherSearchChoiceMenus(details);
        }
        details
          .querySelector<HTMLElement>('[data-static-choice-trigger]')
          ?.setAttribute('aria-expanded', details.open ? 'true' : 'false');
      },
      listenerOptions,
    );
    this.page.ownerDocument.addEventListener(
      'pointerdown',
      (event) => {
        const target = event.target;
        if (!(target instanceof Node)) {
          return;
        }
        for (const details of this.searchChoiceMenus()) {
          if (details.open && !details.contains(target)) {
            this.closeSearchChoiceMenu(details);
          }
        }
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
        syncFilterDom();
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
          syncFilterDom();
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
