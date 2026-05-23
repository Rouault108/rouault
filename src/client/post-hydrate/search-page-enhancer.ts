export const enhanceSearchPage = (root: ParentNode = document): void => {
  const page = root.querySelector<HTMLElement>('[data-search-page-root]');
  if (!page) {
    return;
  }
  if (page.dataset['enhanced'] === 'true') {
    return;
  }

  const form = page.querySelector<HTMLFormElement>('[data-search-page-form]');
  if (!form) {
    return;
  }

  const readFormString = (value: FormDataEntryValue | null): string =>
    typeof value === 'string' ? value : '';

  const syncSearchUrl = (): void => {
    const data = new FormData(form);
    const url = new URL('/search/', window.location.origin);
    const query = readFormString(data.get('q')).trim().toLowerCase();
    if (query.length > 0) {
      url.searchParams.set('q', query);
    }
    for (const tag of data.getAll('tag')) {
      if (typeof tag === 'string') {
        url.searchParams.append('tag', tag);
      }
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

  form.addEventListener('change', syncSearchUrl);
  form.querySelector('[data-search-query-input]')?.addEventListener('input', syncSearchUrl);
  page.dataset['enhanced'] = 'true';
};
