export type HistoryUpdateMode = 'push' | 'replace';

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

export const updateHashInCurrentUrl = (hash: string, mode: HistoryUpdateMode = 'push'): string => {
  const nextUrl = buildUrlWithHash(hash);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl === currentUrl) {
    return nextUrl;
  }

  const nextState: unknown = history.state;
  if (mode === 'replace') {
    history.replaceState(nextState, '', nextUrl);
  } else {
    history.pushState(nextState, '', nextUrl);
  }

  return nextUrl;
};
