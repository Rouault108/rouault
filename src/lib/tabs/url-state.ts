export const PRIMARY_TAB_QUERY_PARAM = 'tab';
export const URL_STATE_CHANGE_EVENT = 'ui-url-state-change';

export type UrlHistoryMode = 'none' | 'push' | 'replace';

export interface UrlStateChangeDetail {
  previousUrl: string;
  url: string;
}

const toUrl = (input?: string | URL): URL => {
  if (input instanceof URL) {
    return new URL(input.toString(), window.location.origin);
  }

  if (typeof input === 'string' && input.length > 0) {
    return new URL(input, window.location.origin);
  }

  return new URL(window.location.href);
};

const normalizeComparableParams = (url: URL): string[] => {
  const params = new URLSearchParams(url.search);
  params.delete(PRIMARY_TAB_QUERY_PARAM);

  return Array.from(params.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort();
};

export const readPrimaryTabValue = (input?: string | URL): string | null => {
  const url = toUrl(input);
  const raw = url.searchParams.get(PRIMARY_TAB_QUERY_PARAM)?.trim() ?? '';
  return raw.length > 0 ? raw : null;
};

export const writePrimaryTabValue = (input: string | URL, value: string | null): string => {
  const url = toUrl(input);
  const normalized = value?.trim() ?? '';

  if (normalized.length > 0) {
    url.searchParams.set(PRIMARY_TAB_QUERY_PARAM, normalized);
  } else {
    url.searchParams.delete(PRIMARY_TAB_QUERY_PARAM);
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

export const isPrimaryTabOnlyNavigation = (currentUrl: string, nextUrl: string): boolean => {
  const current = toUrl(currentUrl);
  const next = toUrl(nextUrl);

  if (current.pathname !== next.pathname) {
    return false;
  }

  const currentComparable = normalizeComparableParams(current);
  const nextComparable = normalizeComparableParams(next);

  if (currentComparable.length !== nextComparable.length) {
    return false;
  }

  for (let i = 0; i < currentComparable.length; i += 1) {
    if (currentComparable[i] !== nextComparable[i]) {
      return false;
    }
  }

  const currentTab = readPrimaryTabValue(current);
  const nextTab = readPrimaryTabValue(next);

  return currentTab !== nextTab;
};

export const dispatchUrlStateChange = (previousUrl: string, url: string): void => {
  window.dispatchEvent(
    new CustomEvent<UrlStateChangeDetail>(URL_STATE_CHANGE_EVENT, {
      detail: {
        previousUrl,
        url,
      },
    }),
  );
};

export const readDecodedHash = (input?: string | URL): string => {
  const raw = toUrl(input).hash.replace(/^#/, '');
  if (raw.length === 0) {
    return '';
  }

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};
