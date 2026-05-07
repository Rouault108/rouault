import {
  readTocJsonSourceScriptContract,
  type TocJsonSourceScript,
} from './toc-json-source-script.js';

export type TocSourceObserverStatus =
  | 'idle'
  | 'script-found'
  | 'script-missing'
  | 'source-stale'
  | 'observer-disconnected';

export type TocSourceObserverSnapshot =
  | { readonly status: 'idle'; readonly ownerId: string | null }
  | { readonly status: 'script-found'; readonly ownerId: string; readonly sourceId: string }
  | { readonly status: 'script-missing'; readonly ownerId: string }
  | { readonly status: 'source-stale'; readonly ownerId: string; readonly sourceId: string }
  | { readonly status: 'observer-disconnected'; readonly ownerId: string | null };

export const createTocSourceObserverSnapshot = (
  script: HTMLScriptElement | null,
  ownerId: string | null,
): TocSourceObserverSnapshot => {
  if (ownerId === null || ownerId.trim().length === 0) {
    return { status: 'idle', ownerId: null };
  }

  if (script === null) {
    return { status: 'script-missing', ownerId };
  }

  const contract: TocJsonSourceScript | null = readTocJsonSourceScriptContract(script);
  if (contract?.ownerId !== ownerId) {
    return { status: 'source-stale', ownerId, sourceId: script.id };
  }

  return { status: 'script-found', ownerId, sourceId: contract.sourceId };
};

export const createTocSourceObserverDisconnectedSnapshot = (
  ownerId: string | null,
): TocSourceObserverSnapshot => ({
  status: 'observer-disconnected',
  ownerId,
});
