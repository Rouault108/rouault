import {
  createSearchPageController,
  type SearchPageController,
  type SearchPageControllerDependencies,
} from './search-page-controller.js';

const sessions = new WeakMap<HTMLElement, SearchPageController>();

export const enhanceSearchPage = (
  root: ParentNode = document,
  signal?: AbortSignal,
  dependencies?: Partial<SearchPageControllerDependencies>,
): SearchPageController | null => {
  const page = root.querySelector<HTMLElement>('[data-search-page-root]');
  if (!page || signal?.aborted === true) {
    return null;
  }

  const existing = sessions.get(page);
  if (existing) {
    return existing;
  }

  const controller = createSearchPageController({
    page,
    ...(signal !== undefined ? { signal } : {}),
    ...(dependencies !== undefined ? { dependencies } : {}),
  });
  const dispose = controller.dispose.bind(controller);
  controller.dispose = () => {
    dispose();
    if (sessions.get(page) === controller) {
      sessions.delete(page);
      delete page.dataset['enhanced'];
    }
  };
  sessions.set(page, controller);
  page.dataset['enhanced'] = 'true';
  controller.start();
  return controller;
};
