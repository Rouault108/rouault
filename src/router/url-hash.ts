import { writeHistoryEntry } from '../navigation/history-entry.js';
import {
  adoptFeatureAddress,
  isFeatureTokenCurrent,
  writeFeatureHistoryEntry,
  type FeatureSource,
  type FeatureToken,
} from '../navigation/content-navigation-context.js';
export type HistoryUpdateMode = 'push' | 'replace';
interface FeatureHashOperation {
  source: FeatureSource;
  token: FeatureToken;
  onAdopt(token: FeatureToken): void;
}
const adoptNoop = (operation?: FeatureHashOperation): void => {
  if (operation && isFeatureTokenCurrent(operation.source, operation.token))
    operation.onAdopt(operation.token);
};
const writeHash = (
  url: string,
  mode: HistoryUpdateMode,
  operation?: FeatureHashOperation,
): void => {
  if (operation) {
    const next = writeFeatureHistoryEntry(operation.source, operation.token, {
      mode,
      url,
      state: history.state,
    });
    if (next) operation.onAdopt(next);
  } else {
    writeHistoryEntry({ mode, url, state: history.state, owner: 'feature' });
    adoptFeatureAddress();
  }
};

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

export const updateHashInCurrentUrl = (
  hash: string,
  mode: HistoryUpdateMode = 'push',
  operation?: FeatureHashOperation,
): string => {
  if (operation && !isFeatureTokenCurrent(operation.source, operation.token))
    return operation.token.expectedUrl;
  const nextUrl = buildUrlWithHash(hash);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl === currentUrl) {
    adoptNoop(operation);
    return nextUrl;
  }

  writeHash(nextUrl, mode, operation);
  return nextUrl;
};

export const updateHashInCurrentUrlFromId = (
  rawId: string,
  mode: HistoryUpdateMode = 'push',
  operation?: FeatureHashOperation,
): string => {
  if (operation && !isFeatureTokenCurrent(operation.source, operation.token))
    return operation.token.expectedUrl;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const currentDecoded = decodeHashFragment(window.location.hash);
  if (currentDecoded === rawId) {
    adoptNoop(operation);
    return currentUrl;
  }

  let nextHash: string;
  try {
    nextHash = buildHashHrefFromId(rawId);
  } catch {
    return currentUrl;
  }

  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
  writeHash(nextUrl, mode, operation);
  return nextUrl;
};
