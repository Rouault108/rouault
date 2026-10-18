import { MAIN_CONTENT_SELECTOR } from '../../../../shared/navigation/main-landmark-contract.js';
import { prepareTableGeometry } from '../../../client/post-hydrate/table-scroll-enhancer.js';
import { readContentContext } from '../../../navigation/content-navigation-context.js';
import { readAddress, readHistoryEntry } from '../../../navigation/history-entry.js';
import type { NavigationCommitReceipt } from '../../../router/router-types.js';
import type { NavigationIntent } from '../../../navigation/content-navigation-context.js';
import { readCurrentShellCommitId } from '../shell/app-shell-lifecycle.js';

export const TABLE_PREPARATION_TARGET_MS = 8;

export const ownsAcceptedPostCommit = (
  root: HTMLElement,
  intent: NavigationIntent,
  receipt: NavigationCommitReceipt,
): boolean => {
  const context = readContentContext();
  return (
    !intent.signal.aborted &&
    root.ownerDocument === document &&
    root.isConnected &&
    root.matches(MAIN_CONTENT_SELECTOR) &&
    root.ownerDocument.getElementById('main-content') === root &&
    context?.root === root &&
    !context.mutation &&
    !context.recoveryRequired &&
    context.intent?.intentId === intent.intentId &&
    receipt.intentId === intent.intentId &&
    receipt.root === root &&
    receipt.contentEpoch === context.contentEpoch &&
    receipt.shellCommitId === readCurrentShellCommitId() &&
    receipt.entryId === (readHistoryEntry()?.id ?? null) &&
    receipt.url === readAddress() &&
    context.displayedBinding.entryId === receipt.entryId &&
    context.displayedBinding.url === receipt.url &&
    context.addressBinding.entryId === receipt.entryId &&
    context.addressBinding.url === receipt.url
  );
};

// intentは準備中だけの許可。採用後の表UIは同epochのstate-onlyや失敗navigationを跨ぐ。
export const prepareOwnedTables = (
  root: HTMLElement,
  canPrepare: () => boolean,
  signal: AbortSignal,
  beforeGeometryChange: () => void,
): boolean => {
  const context = readContentContext();
  if (context?.root !== root || signal.aborted || !canPrepare()) return false;
  const epoch = context.contentEpoch;
  const shell = readCurrentShellCommitId();
  const isCurrent = (): boolean => {
    const current = readContentContext();
    return (
      !signal.aborted &&
      root.ownerDocument === document &&
      root.isConnected &&
      root.ownerDocument.getElementById('main-content') === root &&
      current?.root === root &&
      current.contentEpoch === epoch &&
      !current.mutation &&
      !current.recoveryRequired &&
      readCurrentShellCommitId() === shell
    );
  };
  const started = performance.now();
  try {
    const prepared = prepareTableGeometry(root, {
      isCurrent,
      canPrepare,
      signal,
      beforeGeometryChange: () => {
        if (isCurrent()) beforeGeometryChange();
      },
    });
    // 単一layout呼出しは途中停止できない。超過は許可しないが、hard capとは扱わない。
    return (
      prepared &&
      isCurrent() &&
      canPrepare() &&
      performance.now() - started <= TABLE_PREPARATION_TARGET_MS
    );
  } catch {
    // 受理済み本文は保ち、準備失敗をtransactionの失敗へ戻さない。
    return false;
  }
};
