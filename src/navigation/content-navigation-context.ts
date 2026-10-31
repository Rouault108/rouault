import { readAddress, readHistoryEntry, writeHistoryEntry } from './history-entry.js';
import { readCurrentShellCommitId } from '../components/app/shell/app-shell-lifecycle.js';
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
export interface InitialFragmentSelectionBinding {
  readonly root: HTMLElement;
  readonly contentEpoch: number;
  readonly shellCommitId: number;
  readonly intentId: number;
  readonly entryId: string | null;
  readonly url: string;
}
export interface InitialFragmentSelectionPolicy extends InitialFragmentSelectionBinding {
  readonly eligible: boolean;
  readonly inputRevision: number;
  readonly suppressed: boolean;
}
export interface ContentContext {
  readonly contentEpoch: number;
  readonly root: HTMLElement | null;
  readonly displayedBinding: ContentBinding;
  readonly addressBinding: ContentBinding;
  readonly mutation: boolean;
  readonly intent: NavigationIntent | null;
  readonly coordinatePriority: boolean;
  readonly recoveryRequired?: boolean;
  readonly initialFragmentSelectionPolicy?: InitialFragmentSelectionPolicy | null;
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
  (
    reason: 'intent' | 'before-mutation' | 'mutation' | 'adopt' | 'feature' | 'recovery',
    owner: string,
  ) => void
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
const initialBinding = (
  current: ContentContext,
  shellCommitId: number,
): InitialFragmentSelectionBinding | null => {
  const intent = current.intent;
  if (
    !current.root?.isConnected ||
    intent?.cause !== 'initial' ||
    intent.signal.aborted ||
    current.mutation ||
    current.recoveryRequired ||
    current.displayedBinding.entryId === null ||
    current.displayedBinding.entryId !== current.addressBinding.entryId ||
    current.displayedBinding.url !== current.addressBinding.url
  )
    return null;
  return {
    root: current.root,
    contentEpoch: current.contentEpoch,
    shellCommitId,
    intentId: intent.intentId,
    entryId: current.displayedBinding.entryId,
    url: current.displayedBinding.url,
  };
};
const sameInitialBinding = (
  a: InitialFragmentSelectionBinding,
  b: InitialFragmentSelectionBinding,
): boolean =>
  a.root === b.root &&
  a.contentEpoch === b.contentEpoch &&
  a.shellCommitId === b.shellCommitId &&
  a.intentId === b.intentId &&
  a.entryId === b.entryId &&
  a.url === b.url;
const currentInitialBinding = (shellCommitId: number): InitialFragmentSelectionBinding | null => {
  if (!context || shellCommitId !== readCurrentShellCommitId()) return null;
  const binding = initialBinding(context, shellCommitId);
  return binding?.url === readAddress() && binding.entryId === readHistoryEntry()?.id
    ? binding
    : null;
};
export const registerInitialFragmentSelectionPolicy = (
  binding: InitialFragmentSelectionBinding,
  intervened = hasInitialIntervention(),
): InitialFragmentSelectionPolicy | null => {
  const current = currentInitialBinding(binding.shellCommitId);
  if (!context || !current || !sameInitialBinding(current, binding)) return null;
  const prior = context.initialFragmentSelectionPolicy;
  const matching = prior && sameInitialBinding(prior, binding) ? prior : null;
  const policy = Object.freeze({
    ...binding,
    eligible: true,
    inputRevision: matching?.inputRevision ?? (intervened ? 1 : 0),
    suppressed: intervened || matching?.suppressed === true,
  });
  context = { ...context, initialFragmentSelectionPolicy: policy };
  return policy;
};
export const recordInitialFragmentInput = (shellCommitId = readCurrentShellCommitId()): void => {
  const binding = currentInitialBinding(shellCommitId);
  if (!context || !binding) return;
  const prior = context.initialFragmentSelectionPolicy;
  const matching = prior && sameInitialBinding(prior, binding) ? prior : null;
  context = {
    ...context,
    initialFragmentSelectionPolicy: Object.freeze({
      ...binding,
      eligible: matching?.eligible ?? false,
      inputRevision: (matching?.inputRevision ?? 0) + 1,
      suppressed: true,
    }),
  };
};
export const readInitialFragmentSelectionPolicy = (
  root: HTMLElement,
  shellCommitId: number,
): InitialFragmentSelectionPolicy | null => {
  const binding = currentInitialBinding(shellCommitId);
  const policy = context?.initialFragmentSelectionPolicy;
  return binding?.root === root && policy?.eligible && sameInitialBinding(policy, binding)
    ? policy
    : null;
};
export const clearInitialFragmentSelectionPolicy = (): void => {
  if (context?.initialFragmentSelectionPolicy)
    context = { ...context, initialFragmentSelectionPolicy: null };
};
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
    recoveryRequired: false,
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
      initialFragmentSelectionPolicy: null,
    };
  emit('intent', owner);
  return intent;
};
export const isNavigationIntentCurrent = (intent: NavigationIntent): boolean =>
  !intent.signal.aborted && intent.intentId === intentCounter;
export const beginContentMutation = (root: HTMLElement): number => {
  if (!context) initializeContentContext(root);
  if (!context) throw new Error('content context unavailable');
  // enhancerの後始末も本文を変更し得るため、旧表示の保存を先に凍結する。
  clearInitialFragmentSelectionPolicy();
  emit('before-mutation', 'host');
  context = {
    ...context,
    contentEpoch: ++epochCounter,
    root,
    mutation: true,
    initialFragmentSelectionPolicy: null,
  };
  emit('mutation', 'host');
  return context.contentEpoch;
};
export const adoptContentBinding = (
  url: string,
  entryId = readHistoryEntry()?.id ?? null,
): void => {
  if (!context) return;
  const binding = { url, entryId };
  const policy = context.initialFragmentSelectionPolicy;
  context = {
    ...context,
    displayedBinding: binding,
    addressBinding: { entryId: readHistoryEntry()?.id ?? null, url: readAddress() },
    mutation: false,
    initialFragmentSelectionPolicy:
      policy?.url === url &&
      policy.entryId === entryId &&
      policy.shellCommitId === readCurrentShellCommitId()
        ? policy
        : null,
  };
  emit('adopt', 'router');
};
export const markContentRecoveryRequired = (root: HTMLElement, contentEpoch: number): void => {
  if (context?.root !== root || context.contentEpoch !== contentEpoch) return;
  context = { ...context, recoveryRequired: true, initialFragmentSelectionPolicy: null };
  emit('recovery', 'router');
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
    !context.recoveryRequired &&
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

export const beginNativeNavigation = (
  source: FeatureSource,
  url: string,
): NavigationIntent | null => {
  if (!isFeatureSourceCurrent(source)) return null;
  return beginNavigationIntent('native-navigation', url, 'native');
};
export const adoptNativeNavigationIntent = (url: string): NavigationIntent => {
  const pending = context?.intent;
  if (
    !pending ||
    pending.signal.aborted ||
    pending.cause !== 'native-navigation' ||
    pending.target.url !== url
  )
    return beginNavigationIntent('native-navigation', url, 'native');
  const intent = { ...pending, target: { entryId: readHistoryEntry()?.id ?? null, url } };
  if (context) context = { ...context, intent, addressBinding: intent.target };
  return intent;
};

export const isFeatureTokenCurrent = (source: FeatureSource, token: FeatureToken): boolean =>
  isFeatureSourceCurrent(source) &&
  token.intentId === intentCounter &&
  token.contentEpoch === source.contentEpoch &&
  token.entryId === (readHistoryEntry()?.id ?? null) &&
  token.expectedUrl === readAddress();
interface FeatureAddressAdoption {
  readonly token: FeatureToken;
  readonly mode: 'push' | 'replace';
}
const fragment = (url: string): string | null => {
  const href = new URL(url, window.location.href).href;
  const index = href.indexOf('#');
  return index < 0 ? null : href.slice(index);
};
export const adoptFeatureAddress = (adoption?: FeatureAddressAdoption): void => {
  if (!context || context.mutation) return;
  const binding = { entryId: readHistoryEntry()?.id ?? null, url: readAddress() };
  const policy = context.initialFragmentSelectionPolicy;
  const prior = initialBinding(context, readCurrentShellCommitId());
  const sameBinding =
    policy &&
    prior &&
    sameInitialBinding(policy, prior) &&
    policy.url === binding.url &&
    policy.entryId === binding.entryId;
  // 正規化の成功だけ入力抑止を引き継ぐ。旧位置証明のURLは更新しない。
  const rekey =
    policy &&
    prior &&
    sameInitialBinding(policy, prior) &&
    adoption?.mode === 'replace' &&
    (adoption.token.cause === 'initialization' || adoption.token.cause === 'normalization') &&
    adoption.token.intentId === prior.intentId &&
    adoption.token.contentEpoch === prior.contentEpoch &&
    adoption.token.entryId === prior.entryId &&
    adoption.token.expectedUrl === prior.url &&
    binding.entryId === policy.entryId &&
    fragment(policy.url) === fragment(binding.url);
  context = {
    ...context,
    displayedBinding: binding,
    addressBinding: binding,
    initialFragmentSelectionPolicy: sameBinding
      ? policy
      : rekey
        ? Object.freeze({ ...policy, url: binding.url })
        : null,
  };
  emit('feature', 'feature');
};
export const writeFeatureHistoryEntry = (
  source: FeatureSource,
  token: FeatureToken,
  options: { mode: 'push' | 'replace'; url: string; state?: unknown },
): FeatureToken | null => {
  if (!isFeatureTokenCurrent(source, token)) return null;
  const prior = context;
  const shellCommitId = readCurrentShellCommitId();
  const ownsDurableAdoption = (): boolean =>
    source.element.isConnected &&
    token.intentId === intentCounter &&
    shellCommitId === readCurrentShellCommitId() &&
    (prior === null
      ? context === null
      : context?.root === prior.root &&
        context.contentEpoch === prior.contentEpoch &&
        context.intent?.intentId === prior.intent?.intentId &&
        !context.intent?.signal.aborted &&
        !context.mutation &&
        !context.recoveryRequired &&
        context.displayedBinding.entryId === token.entryId &&
        context.displayedBinding.url === token.expectedUrl &&
        context.addressBinding.entryId === token.entryId &&
        context.addressBinding.url === token.expectedUrl);
  const result: { adopted: FeatureToken | null } = { adopted: null };
  try {
    writeHistoryEntry({
      ...options,
      owner: 'feature',
      beforeWrite: () => {
        if (!isFeatureTokenCurrent(source, token))
          throw new DOMException('superseded', 'AbortError');
      },
      onDurable: () => {
        // 成功API直後にbindingを採用し、after observerより前に新tokenを固定する。
        if (!ownsDurableAdoption()) return;
        adoptFeatureAddress({ token, mode: options.mode });
        result.adopted = {
          ...token,
          entryId: readHistoryEntry()?.id ?? null,
          expectedUrl: readAddress(),
        };
      },
    });
  } catch (error) {
    if (!isFeatureTokenCurrent(source, token)) return null;
    throw error;
  }
  return result.adopted && isFeatureTokenCurrent(source, result.adopted) ? result.adopted : null;
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
