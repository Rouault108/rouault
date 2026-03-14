export type HistoryUpdateMode = 'push' | 'replace';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const createHistoryStateWithUrl = (
  state: unknown,
  url: string,
  origin: string = window.location.origin,
): Record<string, unknown> => {
  const currentState = isRecord(state) ? state : {};
  const parsedUrl = new URL(url, origin);

  return {
    ...currentState,
    __routerUrl: `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
    __routerPath: parsedUrl.pathname,
  };
};

export const buildUrlWithHash = (
  hash: string,
  currentUrl: string = window.location.href,
  origin: string = window.location.origin,
): string => {
  const normalizedHash = hash.trim();
  const parsedUrl = new URL(currentUrl, origin);
  parsedUrl.hash = normalizedHash;
  return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
};

export const updateHashInCurrentUrl = (
  hash: string,
  mode: HistoryUpdateMode = 'push',
): string => {
  const nextUrl = buildUrlWithHash(hash);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl === currentUrl) {
    return nextUrl;
  }

  const nextState = createHistoryStateWithUrl(history.state, nextUrl);
  if (mode === 'replace') {
    history.replaceState(nextState, '', nextUrl);
  } else {
    history.pushState(nextState, '', nextUrl);
  }

  return nextUrl;
};
