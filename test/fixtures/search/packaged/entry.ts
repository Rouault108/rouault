import { renderSearchDialogHtml } from '../../../../src/layouts/search-dialog-html.js';
import { createSearchDialogDomController } from '../../../../src/client/post-hydrate/search-dialog-dom-controller.js';
import { createLexicalSearchCore } from '../../../../src/search/lexical/search-core.js';
import { dispatchSearchDialogEvent } from '../../../../src/search/search-dialog-events.js';
import { isAbortError } from '../../../../src/search/abort.js';

document.body.innerHTML =
  '<button id="open">検索を開く</button><output id="state"></output>' + renderSearchDialogHtml();
const dialog = document.querySelector('dialog'),
  trigger = document.querySelector('#open'),
  output = document.querySelector('#state');
if (!(dialog instanceof HTMLDialogElement) || !(trigger instanceof HTMLButtonElement) || !output)
  throw new Error('Fixture DOM');
const controller = createSearchDialogDomController(dialog);
trigger.addEventListener('click', () => {
  controller.tryOpen({ trigger, modality: 'keyboard' });
});
const core = createLexicalSearchCore({
  context: { siteOrigin: location.origin, basePath: '/__search-target/healthy' },
  isInternalDocumentPathname: () => true,
});
let current: AbortController | undefined,
  serial = 0;
const state = {
  started: 0,
  aborted: 0,
  committed: 0,
  stale: 0,
  pending: 0,
  closedPending: false,
  errors: [] as string[],
  lastQuery: '',
  total: 0,
};
const render = (): void => {
  output.textContent = JSON.stringify(state);
};
document.addEventListener('search-dialog:query-change', (event) => {
  if (
    !(event instanceof CustomEvent) ||
    !event.detail ||
    typeof event.detail !== 'object' ||
    !('query' in event.detail) ||
    typeof event.detail.query !== 'string'
  )
    return;
  current?.abort();
  current = new AbortController();
  const signal = current.signal,
    generation = ++serial,
    q = event.detail.query;
  if (!q) return;
  state.started++;
  state.pending++;
  render();
  void core
    .search({ q, mode: 'explore', tags: [], tagMode: 'and', sort: 'relevance' }, { signal })
    .then(
      (response) => {
        if (signal.aborted || generation !== serial || !dialog.open) {
          state.stale++;
          return;
        }
        state.committed++;
        state.lastQuery = q;
        state.total = response.total;
        dispatchSearchDialogEvent('search-dialog:results-change', {
          query: q,
          items: response.items.map((item) => ({
            id: item.canonicalPathname,
            title: item.title,
            canonicalPathname: item.canonicalPathname,
            renderHref: item.renderHref,
          })),
        });
      },
      (error: unknown) => {
        if (isAbortError(error)) state.aborted++;
        else state.errors.push(error instanceof Error ? error.message : 'Unknown error');
      },
    )
    .finally(() => {
      state.pending--;
      render();
    });
});
document.addEventListener('search-dialog:close-request', () => {
  state.closedPending ||= state.pending > 0;
  serial++;
  current?.abort();
  render();
});
window.addEventListener('pagehide', () => {
  core.dispose();
  controller.dispose();
});
render();
document.body.dataset['ready'] = 'true';
