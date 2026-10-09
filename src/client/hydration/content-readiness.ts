export type ContentReadinessStatus = 'pending' | 'settled' | 'unavailable' | 'invalidated';
export interface ContentReadiness {
  readonly contentEpoch: number;
  readonly root: HTMLElement;
  readonly shellCommitId: number;
  readonly status: ContentReadinessStatus;
  readonly started: boolean;
}
let current: ContentReadiness | null = null;
const listeners = new Set<(state: ContentReadiness) => void>();
export const readContentReadiness = (epoch: number): ContentReadiness | null =>
  current?.contentEpoch === epoch ? current : null;
export const setContentReadiness = (state: ContentReadiness): void => {
  current = state;
  for (const listener of listeners) listener(state);
};
export const invalidateContentReadiness = (): void => {
  if (current) setContentReadiness({ ...current, status: 'invalidated' });
};
export const waitForContentReadiness = (
  epoch: number,
  signal: AbortSignal,
): Promise<ContentReadinessStatus> =>
  new Promise((resolve) => {
    const finish = (status: ContentReadinessStatus): void => {
      listeners.delete(onChange);
      signal.removeEventListener('abort', onAbort);
      resolve(status);
    };
    const onAbort = (): void => { finish('invalidated'); };
    const onChange = (state: ContentReadiness): void => {
      if (state.contentEpoch !== epoch) finish('invalidated');
      else if (state.status !== 'pending') finish(state.status);
    };
    listeners.add(onChange);
    signal.addEventListener('abort', onAbort, { once: true });
    const state = current;
    if (signal.aborted) onAbort();
    else if (state) onChange(state);
  });
