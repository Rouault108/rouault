import {
  BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE,
  SEARCH_DIALOG_LOADING_INDICATOR_DELAY_MS,
  SEARCH_DIALOG_STATUS_EMPTY_MESSAGE,
  SEARCH_DIALOG_STATUS_ERROR_FALLBACK_MESSAGE,
  SEARCH_DIALOG_STATUS_IDLE_MESSAGE,
  SEARCH_DIALOG_STATUS_LOADING_MESSAGE,
  createSearchDialogResultsStatusMessage,
} from '../../search/search-dialog-constants.js';
import {
  dispatchSearchDialogEvent,
  type SearchDialogCloseRequestDetail,
  type SearchDialogOpenRequestDetail,
  type SearchDialogResultsChangeDetail,
  type SearchDialogSelectedDetail,
} from '../../search/search-dialog-events.js';
import {
  resolveSearchDialogItemPath,
  splitSearchDialogHighlightParts,
} from '../../search/search-dialog-highlight.js';
import {
  SearchDialogSelectionModel,
  type SearchDialogActiveChangeOrigin,
  type SearchDialogFocusTarget,
} from '../../search/search-dialog-selection-model.js';
import type {
  SearchDialogCloseReason,
  SearchDialogItem,
} from '../../search/search-dialog-types.js';
import { SearchDialogVirtualizer } from '../../search/search-dialog-virtualizer.js';
import { createInteractionModalityTracker } from '../../search/interaction-modality.js';
import {
  captureTrigger,
  createBodyScrollLock,
  restoreTriggerFocus,
  showNativeDialog,
  waitForDialogAnimations,
} from '../../components/ui/dialog/dialog-helpers.js';
import {
  closestFromEvent,
  focusDialogControl,
  getSearchDialogOptionElementById,
  getSearchDialogOptionId,
} from './search-dialog-dom-utils.js';

type SearchDialogCloseCompletionSource =
  | 'close-pipeline'
  | 'native-close'
  | 'native-close-fallback'
  | 'external-native-close'
  | 'dispose';

interface CompleteCloseOnceOptions {
  readonly force?: boolean;
  readonly suppressEvents?: boolean;
}

interface SearchDialogState {
  query: string;
  loading: boolean;
  loadingIndicatorVisible: boolean;
  results: readonly SearchDialogItem[];
  activeId: string | null;
  errorMessage: string | null;
  unavailable: boolean;
  unavailableMessage: string;
  hasCompletedSearch: boolean;
  completedResultsQuery: string | null;
  virtualScrollTop: number;
  isOpen: boolean;
  isClosing: boolean;
  closeReason: SearchDialogCloseReason | null;
  triggerElement: HTMLElement | null;
  pendingOpenModality: 'keyboard' | 'pointer' | 'unknown';
  closeOperationGeneration: number;
  activeCloseGeneration: number | null;
  closeCompletionDone: boolean;
  bodyLockHeld: boolean;
  disposed: boolean;
}

interface RenderFromStateOptions {
  readonly activeChangeOrigin?: SearchDialogActiveChangeOrigin;
}

interface RenderResultsOptions {
  readonly syncActiveIntoView: boolean;
  readonly preserveScrollTop?: number;
}

interface RenderedVirtualRangeSignature {
  readonly start: number;
  readonly end: number;
  readonly topSpacer: number;
  readonly bottomSpacer: number;
  readonly total: number;
}

interface RenderableResultsRange {
  readonly start: number;
  readonly end: number;
  readonly topSpacer: number;
  readonly bottomSpacer: number;
}

const searchDialogBodyScrollLock = createBodyScrollLock(BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE);

const isDialogOpen = (dialog: HTMLDialogElement): boolean =>
  dialog.open || dialog.hasAttribute('open');

const setHidden = (element: HTMLElement | null, hidden: boolean): void => {
  if (element !== null) element.hidden = hidden;
};

export interface SearchDialogDomController {
  dispose(): void;
  canOpen(): boolean;
  tryOpen(detail: SearchDialogOpenRequestDetail): boolean;
}

export const createSearchDialogDomController = (
  dialog: HTMLDialogElement,
): SearchDialogDomController => {
  const ownerDocument = dialog.ownerDocument;
  const listeners = new AbortController();
  const modalityTracker = createInteractionModalityTracker(ownerDocument);
  const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
  const field = dialog.querySelector<HTMLElement>('[data-search-dialog-field]');
  const clearButton = dialog.querySelector<HTMLButtonElement>('[data-search-dialog-clear]');
  const closeButton = dialog.querySelector<HTMLButtonElement>('[data-search-dialog-close]');
  const resultsList = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
  const loadingState = dialog.querySelector<HTMLElement>('[data-search-dialog-loading]');
  const emptyState = dialog.querySelector<HTMLElement>('[data-search-dialog-empty]');
  const errorState = dialog.querySelector<HTMLElement>('[data-search-dialog-error]');
  const unavailableState = dialog.querySelector<HTMLElement>('[data-search-dialog-unavailable]');
  const errorMessage = dialog.querySelector<HTMLElement>('[data-search-dialog-error-message]');
  const unavailableMessage = dialog.querySelector<HTMLElement>(
    '[data-search-dialog-unavailable-message]',
  );
  const liveRegion =
    dialog.querySelector<HTMLElement>('[data-search-dialog-status]') ??
    dialog.querySelector<HTMLElement>('[data-search-dialog-live]');
  const virtualizer = new SearchDialogVirtualizer();
  const state: SearchDialogState = {
    query: input?.value ?? '',
    loading: false,
    loadingIndicatorVisible: false,
    results: [],
    activeId: null,
    errorMessage: null,
    unavailable: false,
    unavailableMessage: '',
    hasCompletedSearch: false,
    completedResultsQuery: null,
    virtualScrollTop: 0,
    isOpen: isDialogOpen(dialog),
    isClosing: false,
    closeReason: null,
    triggerElement: null,
    pendingOpenModality: 'unknown',
    closeOperationGeneration: 0,
    activeCloseGeneration: null,
    closeCompletionDone: true,
    bodyLockHeld: false,
    disposed: false,
  };
  let closeFallbackTimer: number | undefined;
  let loadingIndicatorTimer: number | undefined;
  let loadingIndicatorGeneration = 0;
  let operationQueue = Promise.resolve();
  let escapeCloseRequested = false;
  let closeRequestPending = false;
  let lastRenderedVirtualRange: RenderedVirtualRangeSignature | null = null;
  let programmaticScrollDepth = 0;

  const enqueueOperation = (operation: () => Promise<void> | void): void => {
    operationQueue = operationQueue.then(operation, operation);
  };

  const withProgrammaticScroll = (operation: () => number | undefined): void => {
    programmaticScrollDepth += 1;
    try {
      const nextScrollTop = operation();
      if (typeof nextScrollTop === 'number') {
        state.virtualScrollTop = nextScrollTop;
      }
    } finally {
      window.requestAnimationFrame(() => {
        programmaticScrollDepth = Math.max(0, programmaticScrollDepth - 1);
      });
    }
  };

  const applyActiveId = (
    activeId: string | null,
    _origin: SearchDialogActiveChangeOrigin,
  ): void => {
    state.activeId = activeId;
  };

  const syncTriggerExpanded = (expanded: boolean): void => {
    for (const trigger of ownerDocument.querySelectorAll<HTMLElement>(
      '[data-search-dialog-trigger]',
    )) {
      if (dialog.id.length > 0) trigger.setAttribute('aria-controls', dialog.id);
      trigger.setAttribute('aria-expanded', String(expanded));
    }
    if (state.triggerElement?.isConnected === true) {
      if (dialog.id.length > 0) state.triggerElement.setAttribute('aria-controls', dialog.id);
      state.triggerElement.setAttribute('aria-expanded', String(expanded));
    }
  };

  const deriveShowResults = (): boolean => {
    const currentQuery = state.query.trim();
    return (
      !state.unavailable &&
      !state.loading &&
      state.errorMessage === null &&
      currentQuery !== '' &&
      state.completedResultsQuery === currentQuery &&
      state.results.length > 0
    );
  };

  const clearLoadingIndicatorTimer = (): void => {
    if (loadingIndicatorTimer !== undefined) {
      window.clearTimeout(loadingIndicatorTimer);
      loadingIndicatorTimer = undefined;
    }
  };

  const resetLoadingIndicator = (): void => {
    loadingIndicatorGeneration += 1;
    clearLoadingIndicatorTimer();
    state.loadingIndicatorVisible = false;
  };

  const resetLoadingIndicatorAndHideDom = (): void => {
    resetLoadingIndicator();
    setHidden(loadingState, true);
    if (dialog.dataset['searchDialogState'] === 'loading') {
      dialog.dataset['searchDialogState'] = 'idle';
    }
    if (liveRegion?.textContent === SEARCH_DIALOG_STATUS_LOADING_MESSAGE) {
      liveRegion.textContent = '';
    }
  };

  const scheduleLoadingIndicator = (): void => {
    resetLoadingIndicator();
    const generation = loadingIndicatorGeneration;
    loadingIndicatorTimer = window.setTimeout(() => {
      loadingIndicatorTimer = undefined;
      if (
        state.disposed ||
        generation !== loadingIndicatorGeneration ||
        state.unavailable ||
        !state.isOpen ||
        state.isClosing ||
        !state.loading ||
        state.query.trim() === ''
      ) {
        return;
      }
      state.loadingIndicatorVisible = true;
      renderFromState();
    }, SEARCH_DIALOG_LOADING_INDICATOR_DELAY_MS);
  };

  const getResultIdAt = (index: number): string | null =>
    deriveShowResults() && resultsList?.hidden === false
      ? (state.results[index]?.id ?? null)
      : null;

  const requestFocus = (target: SearchDialogFocusTarget): void => {
    const element =
      target === 'input' ? input : target === 'clear-button' ? clearButton : closeButton;
    focusDialogControl(element);
  };

  const requestSelection = (
    activeId: string,
    selectionMethod: SearchDialogSelectedDetail['selectionMethod'],
  ): void => {
    const currentQuery = state.query.trim();
    if (
      !deriveShowResults() ||
      currentQuery === '' ||
      state.completedResultsQuery !== currentQuery
    ) {
      return;
    }
    const index = state.results.findIndex((item) => item.id === activeId);
    const item = state.results[index];
    if (!item) return;
    dispatchSearchDialogEvent('search-dialog:selected', {
      id: item.id,
      renderHref: item.renderHref,
      canonicalPathname: item.canonicalPathname,
      title: item.title,
      query: currentQuery,
      index,
      item,
      selectionMethod,
    });
    dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'selection' });
  };

  const selectionModel = new SearchDialogSelectionModel({
    isLoading: () => state.loading,
    isUnavailable: () => state.unavailable,
    isClearButtonVisible: () => clearButton?.hidden === false,
    getResultCount: () =>
      deriveShowResults() && resultsList?.hidden === false ? state.results.length : 0,
    getResultIdAt,
    getActiveId: () => state.activeId,
    getNavigationStartIndex: (delta) => {
      const total =
        deriveShowResults() && resultsList?.hidden === false ? state.results.length : 0;
      if (total === 0) return null;
      if (virtualizer.isVirtualized(total) && resultsList !== null) {
        const range = virtualizer.getViewportIndexRange(
          total,
          state.virtualScrollTop,
          resultsList.clientHeight,
        );
        if (range.end <= range.start) return null;
        return delta === 1 ? range.start : range.end - 1;
      }
      return delta === 1 ? 0 : total - 1;
    },
    setActiveId: (activeId, origin) => {
      applyActiveId(activeId, origin);
      renderFromState({ activeChangeOrigin: origin });
    },
    requestSelection,
    requestFocus,
  });

  const appendHighlightedText = (target: HTMLElement, text: string, query: string): void => {
    for (const part of splitSearchDialogHighlightParts(text, query)) {
      if (!part.matched) {
        target.append(ownerDocument.createTextNode(part.text));
        continue;
      }
      const mark = ownerDocument.createElement('mark');
      mark.dataset['highlight'] = 'true';
      mark.textContent = part.text;
      target.append(mark);
    }
  };

  const createResultRow = (item: SearchDialogItem, index: number, query: string): HTMLLIElement => {
    const row = ownerDocument.createElement('li');
    row.id = getSearchDialogOptionId(item.id);
    row.className = 'search-dialog__result';
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(item.id === state.activeId));
    row.tabIndex = -1;
    row.dataset['index'] = String(index);
    row.dataset['itemId'] = item.id;
    row.dataset['id'] = item.id;
    row.dataset['renderHref'] = item.renderHref;
    row.dataset['canonicalPathname'] = item.canonicalPathname;
    row.dataset['searchQuery'] = query;
    if (item.id === state.activeId) row.dataset['active'] = 'true';
    const title = ownerDocument.createElement('span');
    title.className = 'search-dialog__result-title';
    appendHighlightedText(title, item.title, query);
    const path = ownerDocument.createElement('span');
    path.className = 'search-dialog__result-path';
    appendHighlightedText(path, resolveSearchDialogItemPath(item), query);
    row.append(title, path);
    return row;
  };

  const createVirtualSpacer = (blockSize: number): HTMLLIElement => {
    const spacer = ownerDocument.createElement('li');
    spacer.className = 'search-dialog__virtual-spacer';
    spacer.setAttribute('role', 'presentation');
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.blockSize = `${blockSize.toString()}px`;
    return spacer;
  };

  const getVirtualRangeSignature = (
    range: RenderedVirtualRangeSignature,
  ): RenderedVirtualRangeSignature => ({
    start: range.start,
    end: range.end,
    topSpacer: range.topSpacer,
    bottomSpacer: range.bottomSpacer,
    total: range.total,
  });

  const isSameVirtualRangeSignature = (
    left: RenderedVirtualRangeSignature | null,
    right: RenderedVirtualRangeSignature,
  ): boolean =>
    left !== null &&
    left.start === right.start &&
    left.end === right.end &&
    left.topSpacer === right.topSpacer &&
    left.bottomSpacer === right.bottomSpacer &&
    left.total === right.total;

  const createResultsFragment = (range: RenderableResultsRange): DocumentFragment => {
    const fragment = ownerDocument.createDocumentFragment();
    if (range.topSpacer > 0) fragment.append(createVirtualSpacer(range.topSpacer));
    for (let index = range.start; index < range.end; index += 1) {
      const item = state.results[index];
      if (item) fragment.append(createResultRow(item, index, state.query.trim()));
    }
    if (range.bottomSpacer > 0) fragment.append(createVirtualSpacer(range.bottomSpacer));
    return fragment;
  };

  const syncAriaActiveDescendant = (): void => {
    if (input === null || resultsList === null || state.activeId === null) {
      input?.removeAttribute('aria-activedescendant');
      return;
    }

    const activeOption = getSearchDialogOptionElementById(
      ownerDocument,
      resultsList,
      getSearchDialogOptionId(state.activeId),
    );

    if (activeOption !== null) input.setAttribute('aria-activedescendant', activeOption.id);
    else input.removeAttribute('aria-activedescendant');
  };

  const renderResults = (showResults: boolean, options: RenderResultsOptions): void => {
    if (resultsList === null) return;
    if (!showResults) {
      lastRenderedVirtualRange = null;
      resultsList.replaceChildren();
      syncAriaActiveDescendant();
      return;
    }

    const total = state.results.length;
    const isVirtualized = virtualizer.isVirtualized(total);
    const activeIndex = state.results.findIndex((item) => item.id === state.activeId);
    if (options.syncActiveIntoView && activeIndex >= 0 && isVirtualized) {
      withProgrammaticScroll(() =>
        virtualizer.scrollIndexIntoView(activeIndex, resultsList, state.virtualScrollTop),
      );
    }

    const range = virtualizer.getVisibleRange(
      total,
      state.virtualScrollTop,
      resultsList.clientHeight,
    );
    const fragment = createResultsFragment(range);

    if (typeof options.preserveScrollTop === 'number') {
      const preserveScrollTop = options.preserveScrollTop;
      withProgrammaticScroll(() => {
        resultsList.replaceChildren(fragment);
        resultsList.scrollTop = preserveScrollTop;
        return preserveScrollTop;
      });
    } else {
      resultsList.replaceChildren(fragment);
    }

    if (isVirtualized) {
      lastRenderedVirtualRange = getVirtualRangeSignature({ ...range, total });
    } else {
      lastRenderedVirtualRange = null;
    }
    syncAriaActiveDescendant();
  };

  const syncVirtualResultsAfterPassiveScroll = (desiredScrollTop: number): void => {
    if (resultsList === null || !deriveShowResults()) {
      state.virtualScrollTop = desiredScrollTop;
      syncAriaActiveDescendant();
      return;
    }

    const total = state.results.length;
    if (!virtualizer.isVirtualized(total)) {
      lastRenderedVirtualRange = null;
      state.virtualScrollTop = desiredScrollTop;
      syncAriaActiveDescendant();
      return;
    }

    state.virtualScrollTop = desiredScrollTop;
    const range = virtualizer.getVisibleRange(total, desiredScrollTop, resultsList.clientHeight);
    const viewportRange = virtualizer.getViewportIndexRange(
      total,
      desiredScrollTop,
      resultsList.clientHeight,
    );
    const signature = getVirtualRangeSignature({ ...range, total });
    const activeIndex = state.results.findIndex((item) => item.id === state.activeId);
    const shouldClearActive =
      activeIndex >= 0 && (activeIndex < viewportRange.start || activeIndex >= viewportRange.end);
    if (shouldClearActive) {
      applyActiveId(null, 'passive-scroll');
    }

    if (!isSameVirtualRangeSignature(lastRenderedVirtualRange, signature) || shouldClearActive) {
      const fragment = createResultsFragment(range);
      withProgrammaticScroll(() => {
        resultsList.replaceChildren(fragment);
        resultsList.scrollTop = desiredScrollTop;
        return desiredScrollTop;
      });
      lastRenderedVirtualRange = signature;
    }

    syncAriaActiveDescendant();
  };

  const resetResultsViewport = (): void => {
    state.virtualScrollTop = 0;
    lastRenderedVirtualRange = null;
    if (resultsList !== null) {
      withProgrammaticScroll(() => {
        resultsList.scrollTop = 0;
        return 0;
      });
    }
  };

  function renderFromState(options: RenderFromStateOptions = {}): void {
    const currentQuery = state.query.trim();
    const hasCurrentCompletedResults =
      currentQuery !== '' && state.completedResultsQuery === currentQuery;
    const showUnavailable = state.unavailable;
    const showLoading = !showUnavailable && state.loading && state.loadingIndicatorVisible;
    const showError = !showUnavailable && !state.loading && state.errorMessage !== null;
    const showResults =
      !showUnavailable &&
      !state.loading &&
      !showError &&
      hasCurrentCompletedResults &&
      state.results.length > 0;
    const showEmpty =
      !showUnavailable &&
      !state.loading &&
      !showError &&
      hasCurrentCompletedResults &&
      state.hasCompletedSearch &&
      state.results.length === 0;
    // data-search-dialog-state は表示中の視覚状態を表す。
    // 検索処理中でも、遅延時間内でローディングUIを表示していない間は loading にしない。
    const stateName = showUnavailable
      ? 'unavailable'
      : showLoading
        ? 'loading'
        : showError
          ? 'error'
          : showResults
            ? 'results'
            : showEmpty
              ? 'empty'
              : 'idle';
    dialog.dataset['searchDialogState'] = stateName;
    setHidden(resultsList, !showResults);
    setHidden(loadingState, !showLoading);
    setHidden(emptyState, !showEmpty);
    setHidden(errorState, !showError);
    setHidden(unavailableState, !showUnavailable);
    if (input !== null) {
      input.setAttribute('aria-expanded', String(showResults));
      input.setAttribute('aria-busy', String(state.loading));
    }
    if (clearButton !== null) clearButton.hidden = state.query.length === 0;
    if (errorMessage !== null) errorMessage.textContent = state.errorMessage ?? '';
    if (unavailableMessage !== null) unavailableMessage.textContent = state.unavailableMessage;
    renderResults(showResults, {
      syncActiveIntoView: options.activeChangeOrigin === 'keyboard-navigation',
    });
    if (liveRegion !== null) {
      const isPendingSearchStatus =
        currentQuery !== '' &&
        !hasCurrentCompletedResults &&
        !showUnavailable &&
        !showError &&
        !showResults &&
        !showEmpty;
      liveRegion.textContent = showUnavailable
        ? state.unavailableMessage
        : showLoading
          ? SEARCH_DIALOG_STATUS_LOADING_MESSAGE
          : showError
            ? (state.errorMessage ?? SEARCH_DIALOG_STATUS_ERROR_FALLBACK_MESSAGE)
            : showResults
              ? createSearchDialogResultsStatusMessage(state.results.length)
              : showEmpty
                ? SEARCH_DIALOG_STATUS_EMPTY_MESSAGE
                : state.loading || isPendingSearchStatus
                  ? ''
                  : SEARCH_DIALOG_STATUS_IDLE_MESSAGE;
    }
  }

  const completeCloseOnce = (
    source: SearchDialogCloseCompletionSource,
    generation: number,
    options: CompleteCloseOnceOptions = {},
  ): void => {
    const isDisposeCleanup = source === 'dispose' && options.force === true;
    const suppressEvents = source === 'dispose' && options.suppressEvents === true;
    if (
      !isDisposeCleanup &&
      (generation !== state.closeOperationGeneration || state.closeCompletionDone)
    ) {
      return;
    }
    resetLoadingIndicatorAndHideDom();
    const effectiveCloseReason = state.closeReason ?? 'programmatic';
    const capturedTriggerElement = state.triggerElement;
    if (closeFallbackTimer !== undefined) window.clearTimeout(closeFallbackTimer);
    closeFallbackTimer = undefined;
    if (isDisposeCleanup) {
      try {
        if (isDialogOpen(dialog)) dialog.close();
      } catch {
        dialog.removeAttribute('open');
      }
      if (isDialogOpen(dialog)) dialog.removeAttribute('open');
    }
    if (state.bodyLockHeld) {
      searchDialogBodyScrollLock.unlock();
      state.bodyLockHeld = false;
    }
    dialog.removeAttribute('data-closing');
    delete dialog.dataset['searchDialogOpenModality'];
    syncTriggerExpanded(false);
    if (effectiveCloseReason === 'selection' && capturedTriggerElement !== null) {
      capturedTriggerElement.blur();
    }
    if (!state.disposed && !suppressEvents && effectiveCloseReason !== 'selection') {
      restoreTriggerFocus(capturedTriggerElement);
      dispatchSearchDialogEvent('search-dialog:focus-return', { reason: effectiveCloseReason });
    }
    state.isOpen = false;
    state.isClosing = false;
    state.closeReason = null;
    state.triggerElement = null;
    state.pendingOpenModality = 'unknown';
    state.activeCloseGeneration = null;
    state.closeCompletionDone = true;
    escapeCloseRequested = false;
    closeRequestPending = false;
  };

  const startNativeClose = (generation: number): void => {
    if (generation !== state.activeCloseGeneration || state.disposed) return;
    try {
      if (dialog.open) dialog.close();
      else dialog.removeAttribute('open');
    } catch {
      dialog.removeAttribute('open');
    }
    if (!state.closeCompletionDone) {
      closeFallbackTimer = window.setTimeout(() => {
        completeCloseOnce('native-close-fallback', generation);
      }, 0);
    }
  };

  const performClose = async (detail: SearchDialogCloseRequestDetail): Promise<void> => {
    if (!isDialogOpen(dialog) || state.isClosing || state.disposed) {
      if (detail.reason === 'escape') escapeCloseRequested = false;
      return;
    }
    state.closeOperationGeneration += 1;
    const generation = state.closeOperationGeneration;
    state.activeCloseGeneration = generation;
    state.closeCompletionDone = false;
    state.closeReason = detail.reason;
    state.isClosing = true;
    dialog.setAttribute('data-closing', 'true');
    await waitForDialogAnimations(dialog);
    startNativeClose(generation);
  };

  // no-op close で直後の通常 open を破棄しないため、実際に cleanup が必要かを受付時に判定する。
  const hasCloseWork = (): boolean =>
    isDialogOpen(dialog) ||
    state.bodyLockHeld ||
    state.isOpen ||
    state.isClosing ||
    state.activeCloseGeneration !== null;

  const requestClose = (detail: SearchDialogCloseRequestDetail): void => {
    if (state.disposed || !hasCloseWork()) {
      if (detail.reason === 'escape') escapeCloseRequested = false;
      return;
    }
    if (closeRequestPending || state.isClosing || state.activeCloseGeneration !== null) {
      if (detail.reason === 'escape') escapeCloseRequested = false;
      return;
    }
    closeRequestPending = true;
    enqueueOperation(async () => {
      try {
        await performClose(detail);
      } finally {
        closeRequestPending = false;
      }
    });
  };

  const shouldStartExternalNativeCloseCompletion = (): boolean =>
    state.activeCloseGeneration === null && (state.bodyLockHeld || state.isOpen);

  const canOpenWithOptions = (options: { readonly allowUnavailable?: boolean } = {}): boolean =>
    dialog.isConnected &&
    !state.disposed &&
    (options.allowUnavailable === true || !state.unavailable) &&
    !closeRequestPending &&
    !state.isClosing &&
    state.activeCloseGeneration === null;

  const canOpen = (): boolean => canOpenWithOptions();

  const performOpen = (
    detail: SearchDialogOpenRequestDetail,
    options: { readonly allowUnavailable?: boolean } = {},
  ): boolean => {
    if (!canOpenWithOptions(options)) return false;
    const wasAlreadyOpen = isDialogOpen(dialog);
    state.triggerElement = captureTrigger(ownerDocument, detail.trigger ?? undefined);
    state.pendingOpenModality = detail.modality ?? modalityTracker.getSnapshot();
    dialog.removeAttribute('data-closing');
    if (!wasAlreadyOpen && !showNativeDialog(dialog, true)) {
      state.closeOperationGeneration += 1;
      state.closeCompletionDone = false;
      state.closeReason = 'programmatic';
      completeCloseOnce('close-pipeline', state.closeOperationGeneration);
      return false;
    }
    if (!state.bodyLockHeld) {
      searchDialogBodyScrollLock.lock();
      state.bodyLockHeld = true;
    }
    state.isOpen = true;
    state.isClosing = false;
    escapeCloseRequested = false;
    syncTriggerExpanded(true);
    input?.focus({ preventScroll: true });
    input?.setSelectionRange(state.query.length, state.query.length);
    dialog.dataset['searchDialogOpenModality'] = state.pendingOpenModality;
    if (!wasAlreadyOpen && state.loading && state.query.trim() !== '' && !state.unavailable) {
      scheduleLoadingIndicator();
    }
    if (!wasAlreadyOpen && state.query.trim() !== '' && !state.loading && !state.unavailable) {
      dispatchSearchDialogEvent('search-dialog:query-change', { query: state.query });
    }
    return true;
  };

  const requestOpen = (detail: SearchDialogOpenRequestDetail): void => {
    if (
      state.disposed ||
      closeRequestPending ||
      state.isClosing ||
      state.activeCloseGeneration !== null
    ) {
      return;
    }
    enqueueOperation(() => {
      performOpen(detail, { allowUnavailable: true });
    });
  };

  const clearQuery = (): void => {
    resetLoadingIndicator();
    state.query = '';
    state.loading = false;
    if (input !== null) input.value = '';
    state.results = [];
    applyActiveId(null, 'state-reset');
    state.errorMessage = null;
    state.hasCompletedSearch = false;
    state.completedResultsQuery = null;
    resetResultsViewport();
    renderFromState({ activeChangeOrigin: 'state-reset' });
    input?.focus();
    dispatchSearchDialogEvent('search-dialog:query-change', { query: '' });
  };

  const handleQueryChanged = (query: string): void => {
    state.query = query;
    if (input !== null && input.value !== query) input.value = query;
    resetLoadingIndicator();
    if (state.unavailable) {
      renderFromState();
      return;
    }
    const currentQuery = query.trim();
    if (currentQuery === '') {
      state.loading = false;
      state.results = [];
      applyActiveId(null, 'state-reset');
      state.errorMessage = null;
      state.hasCompletedSearch = false;
      state.completedResultsQuery = null;
      resetResultsViewport();
    } else {
      if (currentQuery !== state.completedResultsQuery) {
        applyActiveId(null, 'state-reset');
        state.hasCompletedSearch = false;
        state.completedResultsQuery = null;
      }
      state.errorMessage = null;
    }
    renderFromState({ activeChangeOrigin: 'state-reset' });
  };

  ownerDocument.addEventListener(
    'search-dialog:open-request',
    (event) => {
      requestOpen((event as CustomEvent<SearchDialogOpenRequestDetail>).detail);
    },
    { signal: listeners.signal },
  );
  ownerDocument.addEventListener(
    'search-dialog:close-request',
    (event) => {
      requestClose((event as CustomEvent<SearchDialogCloseRequestDetail>).detail);
    },
    { signal: listeners.signal },
  );
  ownerDocument.addEventListener(
    'search-dialog:query-change',
    (event) => {
      handleQueryChanged((event as CustomEvent<{ query: string }>).detail.query);
    },
    { signal: listeners.signal },
  );
  ownerDocument.addEventListener(
    'search-dialog:loading-change',
    (event) => {
      if (state.unavailable) return;
      const loading = (event as CustomEvent<{ loading: boolean }>).detail.loading;
      const currentQuery = state.query.trim();
      if (loading && currentQuery === '') {
        resetLoadingIndicator();
        state.loading = false;
        state.results = [];
        state.hasCompletedSearch = false;
        state.completedResultsQuery = null;
        state.errorMessage = null;
        applyActiveId(null, 'state-reset');
        resetResultsViewport();
        renderFromState({ activeChangeOrigin: 'state-reset' });
        return;
      }
      state.loading = loading;
      if (loading) {
        state.hasCompletedSearch = false;
        state.completedResultsQuery = null;
        state.errorMessage = null;
        applyActiveId(null, 'state-reset');
        resetResultsViewport();
        scheduleLoadingIndicator();
      } else {
        resetLoadingIndicator();
      }
      if (loading) renderFromState({ activeChangeOrigin: 'state-reset' });
      else renderFromState();
    },
    { signal: listeners.signal },
  );
  ownerDocument.addEventListener(
    'search-dialog:results-change',
    (event) => {
      if (state.unavailable) return;
      const detail = (event as CustomEvent<SearchDialogResultsChangeDetail>).detail;
      if (detail.query !== state.query.trim()) return;
      const normalizedQuery = detail.query.trim();
      resetLoadingIndicator();
      state.loading = false;
      state.results = detail.items;
      state.hasCompletedSearch = normalizedQuery !== '';
      state.completedResultsQuery = normalizedQuery === '' ? null : normalizedQuery;
      resetResultsViewport();
      applyActiveId(
        normalizedQuery === '' || detail.items.length === 0 ? null : (detail.items[0]?.id ?? null),
        'state-reset',
      );
      renderFromState({ activeChangeOrigin: 'state-reset' });
    },
    { signal: listeners.signal },
  );
  ownerDocument.addEventListener(
    'search-dialog:error',
    (event) => {
      if (state.unavailable) return;
      resetLoadingIndicator();
      state.loading = false;
      state.errorMessage = (event as CustomEvent<{ message: string }>).detail.message;
      state.hasCompletedSearch = true;
      applyActiveId(null, 'state-reset');
      resetResultsViewport();
      renderFromState({ activeChangeOrigin: 'state-reset' });
    },
    { signal: listeners.signal },
  );
  ownerDocument.addEventListener(
    'search-dialog:unavailable',
    (event) => {
      resetLoadingIndicator();
      state.loading = false;
      state.unavailable = true;
      state.unavailableMessage = (event as CustomEvent<{ message: string }>).detail.message;
      applyActiveId(null, 'state-reset');
      resetResultsViewport();
      renderFromState({ activeChangeOrigin: 'state-reset' });
    },
    { signal: listeners.signal },
  );

  input?.addEventListener(
    'input',
    () => {
      dispatchSearchDialogEvent('search-dialog:query-change', { query: input.value });
    },
    { signal: listeners.signal },
  );
  field?.addEventListener(
    'keydown',
    (event) => {
      if (event.target !== input) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        selectionModel.moveActive(event.key === 'ArrowDown' ? 1 : -1);
      } else if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        selectionModel.selectActive('keyboard');
      } else if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        selectionModel.handleForwardTabFromInput();
      }
    },
    { signal: listeners.signal },
  );
  clearButton?.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        clearQuery();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        selectionModel.handleAuxiliaryTraversal({
          origin: 'clear-button',
          shiftKey: event.shiftKey,
        });
      }
    },
    { signal: listeners.signal },
  );
  closeButton?.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'close-button' });
      } else if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault();
        selectionModel.handleAuxiliaryTraversal({ origin: 'close-button', shiftKey: true });
      }
    },
    { signal: listeners.signal },
  );
  dialog.addEventListener(
    'click',
    (event) => {
      if (closestFromEvent(dialog, event, '[data-search-dialog-close]') !== null) {
        dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'close-button' });
        return;
      }
      if (closestFromEvent(dialog, event, '[data-search-dialog-clear]') !== null) {
        clearQuery();
        return;
      }
      if (resultsList === null) return;
      const row = closestFromEvent(resultsList, event, '[role="option"][data-index]');
      if (!(row instanceof HTMLElement)) return;
      const index = Number(row.dataset['index'] ?? '-1');
      if (!Number.isInteger(index)) return;
      selectionModel.setActiveByIndex(index, 'pointer');
      const activeId = getResultIdAt(index);
      if (activeId !== null) requestSelection(activeId, 'pointer');
    },
    { signal: listeners.signal },
  );
  resultsList?.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = closestFromEvent(resultsList, event, '[role="option"][data-index]');
      if (!(row instanceof HTMLElement)) return;
      const index = Number(row.dataset['index'] ?? '-1');
      if (!Number.isInteger(index)) return;
      event.preventDefault();
      selectionModel.setActiveByIndex(index, 'keyboard-navigation');
      selectionModel.selectActive('keyboard');
    },
    { signal: listeners.signal },
  );
  resultsList?.addEventListener(
    'scroll',
    () => {
      state.virtualScrollTop = resultsList.scrollTop;
      if (programmaticScrollDepth > 0) return;
      if (!virtualizer.isVirtualized(state.results.length)) {
        lastRenderedVirtualRange = null;
        return;
      }
      syncVirtualResultsAfterPassiveScroll(resultsList.scrollTop);
    },
    { signal: listeners.signal },
  );
  dialog.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (escapeCloseRequested || state.isClosing) return;
      escapeCloseRequested = true;
      dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'escape' });
    },
    { signal: listeners.signal },
  );
  dialog.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault();
      if (escapeCloseRequested || state.isClosing) return;
      escapeCloseRequested = true;
      dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'escape' });
    },
    { signal: listeners.signal },
  );
  dialog.addEventListener(
    'pointerdown',
    (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'backdrop' });
    },
    { signal: listeners.signal },
  );
  dialog.addEventListener(
    'close',
    () => {
      if (state.disposed) return;
      if (state.activeCloseGeneration !== null) {
        completeCloseOnce('native-close', state.activeCloseGeneration);
        return;
      }
      if (shouldStartExternalNativeCloseCompletion()) {
        state.closeOperationGeneration += 1;
        state.closeCompletionDone = false;
        completeCloseOnce('external-native-close', state.closeOperationGeneration);
        return;
      }
      state.isClosing = false;
      dialog.removeAttribute('data-closing');
      syncTriggerExpanded(false);
    },
    { signal: listeners.signal },
  );

  renderFromState();

  return {
    canOpen,
    tryOpen(detail): boolean {
      return performOpen(detail);
    },
    dispose(): void {
      if (state.disposed) return;
      state.disposed = true;
      resetLoadingIndicatorAndHideDom();
      listeners.abort();
      modalityTracker.destroy();
      completeCloseOnce('dispose', state.closeOperationGeneration, {
        force: true,
        suppressEvents: true,
      });
      closeRequestPending = false;
      state.closeOperationGeneration += 1;
    },
  };
};
