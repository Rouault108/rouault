export type HistoryUpdateMode = 'push' | 'replace';

export const encodeHashId = (rawId: string): string => encodeURIComponent(rawId);

export const buildHashHrefFromId = (rawId: string): string => `#${encodeHashId(rawId)}`;

export const decodeHashFragment = (hash: string): string | null => {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  if (fragment.length === 0) {
    return null;
  }

  try {
    return decodeURIComponent(fragment);
  } catch {
    return null;
  }
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

export const updateHashInCurrentUrlFromId = (
  rawId: string,
  mode: HistoryUpdateMode = 'push',
): string => {
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const currentDecoded = decodeHashFragment(window.location.hash);
  if (currentDecoded === rawId) {
    return currentUrl;
  }

  let nextHash: string;
  try {
    nextHash = buildHashHrefFromId(rawId);
  } catch {
    return currentUrl;
  }

  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
  const nextState: unknown = history.state;
  if (mode === 'replace') {
    history.replaceState(nextState, '', nextUrl);
  } else {
    history.pushState(nextState, '', nextUrl);
  }

  return nextUrl;
};
