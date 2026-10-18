import { MAIN_CONTENT_SELECTOR } from '../../../../shared/navigation/main-landmark-contract.js';
import {
  readContentContext,
  type NavigationIntent,
} from '../../../navigation/content-navigation-context.js';
import { readAddress, readHistoryEntry } from '../../../navigation/history-entry.js';
import type { NavigationCommitReceipt } from '../../../router/router-types.js';
import { readCurrentShellCommitId } from '../shell/app-shell-lifecycle.js';

// commit時に固定された受理記録を検証し、後から現在値を寄せ集めた代用を許可しない。
export const ownsAcceptedHistoryCommit = (
  root: HTMLElement,
  intent: NavigationIntent,
  receipt: NavigationCommitReceipt,
): boolean => {
  const context = readContentContext();
  const entryId = readHistoryEntry()?.id ?? null;
  const url = readAddress();
  return (
    Object.isFrozen(receipt) &&
    !receipt.stateOnly &&
    !intent.signal.aborted &&
    root.ownerDocument === document &&
    root.isConnected &&
    root.matches(MAIN_CONTENT_SELECTOR) &&
    document.getElementById('main-content') === root &&
    context?.root === root &&
    !context.mutation &&
    !context.recoveryRequired &&
    context.intent?.intentId === intent.intentId &&
    receipt.intentId === intent.intentId &&
    receipt.root === root &&
    receipt.contentEpoch === context.contentEpoch &&
    receipt.shellCommitId === readCurrentShellCommitId() &&
    entryId !== null &&
    receipt.entryId === entryId &&
    receipt.url === url &&
    intent.target.entryId === entryId &&
    intent.target.url === url &&
    context.displayedBinding.entryId === entryId &&
    context.displayedBinding.url === url &&
    context.addressBinding.entryId === entryId &&
    context.addressBinding.url === url
  );
};
