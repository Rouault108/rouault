import type { TocPresence } from '../note/toc-presence.js';

export const resolveTocTriggerReserved = (input: {
  readonly tocPresence: TocPresence;
  readonly tocOwnerId: string | null | undefined;
  readonly shouldHydrate: boolean;
}): boolean =>
  input.tocPresence === 'present' &&
  typeof input.tocOwnerId === 'string' &&
  input.tocOwnerId.trim().length > 0 &&
  input.shouldHydrate;
