import { readAddress, readHistoryEntry } from './history-entry.js';
export type NavigationCause = 'initial' | 'navigation' | 'traverse' | 'native-navigation';
export type FeatureCause = 'user-navigation' | 'initialization' | 'url-sync' | 'normalization';
export interface ContentBinding {
  readonly entryId: string | null;
  readonly url: string;
}
export interface NavigationIntent {
  readonly intentId: number;
  readonly cause: NavigationCause;
  readonly signal: AbortSignal;
  readonly target: ContentBinding;
}
export interface FeatureSource {
  readonly element: HTMLElement;
  readonly contentEpoch: number;
}
export interface FeatureToken {
  readonly intentId: number;
  readonly contentEpoch: number;
  readonly entryId: string | null;
  readonly expectedUrl: string;
  readonly cause: FeatureCause;
}
export interface ContentContext {
  readonly contentEpoch: number;
  readonly root: HTMLElement | null;
  readonly displayedBinding: ContentBinding;
  readonly addressBinding: ContentBinding;
  readonly mutation: boolean;
  readonly intent: NavigationIntent | null;
  readonly coordinatePriority: boolean;
}
let initialIntervention = false;
export const recordInitialIntervention = (): void => {
  initialIntervention = true;
};
export const hasInitialIntervention = (): boolean => initialIntervention;
let epochCounter = 0;
let intentCounter = 0;
let controller = new AbortController();
let context: ContentContext | null = null;
const listeners = new Set<
  (reason: 'intent' | 'mutation' | 'adopt' | 'feature', owner: string) => void
>();
const emit = (reason: Parameters<Parameters<typeof listeners.add>[0]>[0], owner: string): void => {
  for (const listener of listeners) {
    try {
      listener(reason, owner);
    } catch {
      /* observerはtransactionを変更しない。 */
    }
  }
};
export const readContentContext = (): ContentContext | null => context;
export const subscribeContentContext = (
  listener: Parameters<typeof listeners.add>[0],
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const initializeContentContext = (root: HTMLElement): number => {
  const binding = { entryId: readHistoryEntry()?.id ?? null, url: readAddress() };
  context = {
    contentEpoch: ++epochCounter,
    root,
    displayedBinding: binding,
    addressBinding: binding,
    mutation: false,
    intent: null,
    coordinatePriority: false,
  };
  return context.contentEpoch;
};
export const beginNavigationIntent = (
  cause: NavigationCause,
  url: string,
  owner = 'router',
): NavigationIntent => {
  controller.abort();
  controller = new AbortController();
  const intent: NavigationIntent = {
    intentId: ++intentCounter,
    cause,
    signal: controller.signal,
    target: { entryId: readHistoryEntry()?.id ?? null, url },
  };
  if (context)
    context = {
      ...context,
      intent,
      addressBinding: {
        entryId: readHistoryEntry()?.id ?? null,
        url: readAddress(),
      },
      coordinatePriority: false,
    };
  emit('intent', owner);
  return intent;
};
export const isNavigationIntentCurrent = (intent: NavigationIntent): boolean =>
  !intent.signal.aborted && intent.intentId === intentCounter;
export const beginContentMutation = (root: HTMLElement): number => {
  if (!context) initializeContentContext(root);
  if (!context) throw new Error('content context unavailable');
  emit('mutation', 'host');
  context = { ...context, contentEpoch: ++epochCounter, root, mutation: true };
  return context.contentEpoch;
};
export const adoptContentBinding = (
  url: string,
  entryId = readHistoryEntry()?.id ?? null,
): void => {
  if (!context) return;
  const binding = { url, entryId };
  context = { ...context, displayedBinding: binding, addressBinding: binding, mutation: false };
  emit('adopt', 'router');
};
export const captureFeatureSource = (element: HTMLElement): FeatureSource => ({
  element,
  contentEpoch: context?.contentEpoch ?? 0,
});
export const isFeatureSourceCurrent = (source: FeatureSource): boolean => {
  if (!source.element.isConnected) return false;
  if (!context) return source.contentEpoch === 0;
  return (
    source.contentEpoch === context.contentEpoch &&
    !context.mutation &&
    context.displayedBinding.url === readAddress() &&
    context.displayedBinding.entryId === (readHistoryEntry()?.id ?? null)
  );
};
export const beginFeatureNavigation = (
  source: FeatureSource,
  cause: FeatureCause = 'user-navigation',
): FeatureToken | null => {
  if (!isFeatureSourceCurrent(source)) return null;
  if (cause === 'user-navigation') beginNavigationIntent('navigation', readAddress(), 'feature');
  return {
    intentId: intentCounter,
    contentEpoch: source.contentEpoch,
    entryId: readHistoryEntry()?.id ?? null,
    expectedUrl: readAddress(),
    cause,
  };
};
export const isFeatureTokenCurrent = (source: FeatureSource, token: FeatureToken): boolean =>
  isFeatureSourceCurrent(source) &&
  token.intentId === intentCounter &&
  token.contentEpoch === source.contentEpoch &&
  token.entryId === (readHistoryEntry()?.id ?? null) &&
  token.expectedUrl === readAddress();
export const adoptFeatureAddress = (): void => {
  if (!context || context.mutation) return;
  const binding = { entryId: readHistoryEntry()?.id ?? null, url: readAddress() };
  context = { ...context, displayedBinding: binding, addressBinding: binding };
  emit('feature', 'feature');
};
export const hasCoordinatePriority = (): boolean => context?.coordinatePriority === true;
export const markCoordinatePriority = (): void => {
  if (context) context = { ...context, coordinatePriority: true };
};

export const releaseContentContext = (root: HTMLElement | null): void => {
  if (context?.root !== root) return;
  controller.abort();
  context = null;
};
