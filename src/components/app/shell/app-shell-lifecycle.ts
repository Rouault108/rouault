import { STATIC_HEADER_ROOT_SELECTOR } from '../../../../shared/navigation/static-header-contract.js';
import type { AppShellValidatedDetail } from './app-shell-events.js';

let currentShellCommitId = 0;
let nextShellCommitId = 1;
export interface ValidatedShellProof extends AppShellValidatedDetail {
  readonly document: Document;
}
let validatedShellProof: ValidatedShellProof | null = null;
const proofListeners = new Set<() => void>();

export const readValidatedShellProof = (): ValidatedShellProof | null => {
  const proof = validatedShellProof;
  if (
    proof?.shellCommitId !== currentShellCommitId ||
    !proof.header.isConnected ||
    proof.header.ownerDocument !== proof.document ||
    proof.document.querySelector(STATIC_HEADER_ROOT_SELECTOR) !== proof.header
  )
    return null;
  return proof;
};

export const recordValidatedShellProof = (
  detail: AppShellValidatedDetail,
  owner: Document,
): void => {
  validatedShellProof = Object.freeze({ ...detail, document: owner });
  for (const listener of [...proofListeners]) {
    try {
      listener();
    } catch {
      /* 観測先の失敗で、検証済みshellの受理を取り消さない。 */
    }
  }
};

export const subscribeValidatedShellProof = (listener: () => void): (() => void) => {
  proofListeners.add(listener);
  return () => {
    proofListeners.delete(listener);
  };
};

export const readCurrentShellCommitId = (): number => currentShellCommitId;

export const reserveShellCommitId = (): number => {
  const reserved = nextShellCommitId;
  nextShellCommitId += 1;
  return reserved;
};

export const commitShellGeneration = (shellCommitId: number): void => {
  currentShellCommitId = shellCommitId;
};

export const restoreShellGeneration = (shellCommitId: number): void => {
  currentShellCommitId = shellCommitId;
};

export const resetShellLifecycleForTest = (): void => {
  currentShellCommitId = 0;
  nextShellCommitId = 1;
  validatedShellProof = null;
};
