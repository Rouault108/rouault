import { ReadingPositionController } from './reading-position-controller.js';
import { readCurrentShellCommitId } from '../shell/app-shell-lifecycle.js';
import { FocusManager } from '../../../router/focus-manager.js';
import type { PostCommitController } from '../../../router/router.js';
import type { RouterDiagnosticPayload } from '../../../router/router-diagnostics.js';
import { MAIN_CONTENT_SELECTOR } from '../../../../shared/navigation/main-landmark-contract.js';
import { readContentContext } from '../../../navigation/content-navigation-context.js';
import { ownsAcceptedPostCommit, prepareOwnedTables } from './accepted-table-geometry.js';
import { invalidateHistoryTableProof } from './history-presentation-geometry.js';
import {
  claimAcceptedIncoming,
  type AcceptedIncomingTableArtifact,
} from './history-table-incoming.js';
import {
  dispatchPrimaryTabUrlStateChange,
  readDecodedHash,
} from '../navigation/primary-tab-url-state.js';

export class RouterDocumentHostPostRenderController {
  private readonly lifetime = new AbortController();
  private readonly focusManager = new FocusManager();
  private clearTimer: number | null = null;
  private readonly reading = new ReadingPositionController((error) => {
    this.reportBackgroundError(error);
  });

  constructor(
    private readonly setAnnouncement: (text: string) => void,
    private readonly reportBackgroundError: (error: unknown) => void = () => {
      /* 初期化前には診断先がない。 */
    },
  ) {}

  dispose(): void {
    if (this.clearTimer !== null) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
    this.reading.dispose();
    this.lifetime.abort();
  }

  terminal(committed: boolean, intentId: number): void {
    this.reading.terminal(committed, intentId);
  }

  initialize(host: HTMLElement): void {
    const root = host.querySelector(MAIN_CONTENT_SELECTOR);
    if (!(root instanceof HTMLElement)) return;
    this.prepareTables(root, () => {
      const context = readContentContext();
      return (
        !this.lifetime.signal.aborted &&
        context?.root === root &&
        !context.mutation &&
        !context.recoveryRequired
      );
    });
    this.reading.start(root);
  }

  private prepareTables(root: HTMLElement, canPrepare: () => boolean): boolean {
    const epoch = readContentContext()?.contentEpoch;
    const shell = readCurrentShellCommitId();
    return prepareOwnedTables(root, canPrepare, this.lifetime.signal, () => {
      invalidateHistoryTableProof(root);
      if (epoch !== undefined) this.reading.invalidateTableGeometry(root, epoch, shell);
    });
  }

  createPostCommitController(hostElement: HTMLElement): PostCommitController {
    return {
      run: (context) => {
        const root = hostElement.querySelector(MAIN_CONTENT_SELECTOR);
        if (!(root instanceof HTMLElement)) return;
        const canContinue = (): boolean => {
          if (this.lifetime.signal.aborted || context.intent.signal.aborted) return false;
          if (context.receipt)
            return (
              context.receipt.stateOnly === context.stateOnly &&
              ownsAcceptedPostCommit(root, context.intent, context.receipt)
            );
          // 受理記録のない呼出しへ表の先行準備を広げない。
          return readContentContext()?.intent?.intentId === context.intent.intentId;
        };
        if (!canContinue()) return;
        if (context.stateOnly) dispatchPrimaryTabUrlStateChange(context.previousUrl, context.url);
        else {
          this.setAnnouncement('ページが読み込まれました');
          if (this.clearTimer !== null) window.clearTimeout(this.clearTimer);
          this.clearTimer = window.setTimeout(() => {
            if (!context.intent.signal.aborted) this.setAnnouncement('');
            this.clearTimer = null;
          }, 1000);
          const main = hostElement.querySelector(MAIN_CONTENT_SELECTOR);
          if (
            main instanceof HTMLElement &&
            !context.intent.signal.aborted &&
            this.reading.shouldFocus(context.intent)
          )
            this.focusManager.focusMainContent(main);
        }
        if (!canContinue()) return;
        const tablePreparationStartedAt = performance.now();
        // rail/IDを作る前の受理済み authored DOMを固定し、既知準備差は証跡側で検査する。
        let incomingTableArtifact: AcceptedIncomingTableArtifact | null = null;
        try {
          if (context.receipt && !context.stateOnly && context.renderedKind === 'page')
            incomingTableArtifact = claimAcceptedIncoming(root, context.receipt);
        } catch {
          // 証跡採用の失敗は受理済み本文や通常の位置jobを失わせない。
        }
        try {
          const tablePreparationWithinBudget =
            context.receipt && !context.stateOnly && context.renderedKind === 'page'
              ? this.prepareTables(root, canContinue)
              : false;
          // 準備失敗は通常jobへ進めるが、途中で失効した旧ownerは予約し直さない。
          if (canContinue())
            this.reading.schedule({
              intent: context.intent,
              root,
              url: window.location.pathname + window.location.search + window.location.hash,
              stateOnly: context.stateOnly,
              error: context.renderedKind === 'error' || context.renderedKind === 'not-found',
              shellCommitId: readCurrentShellCommitId(),
              previousUrl: context.previousUrl,
              tablePreparationWithinBudget,
              tablePreparationStartedAt,
              ...(incomingTableArtifact ? { incomingTableArtifact } : {}),
              ...(context.receipt ? { receipt: context.receipt } : {}),
            });
        } finally {
          // 同期採用しないjobもhandoff用監視を残さず、通常readinessへ所有権を返す。
          incomingTableArtifact?.finishHandoff();
        }
      },
    };
  }

  createHashTargetDiagnostic(url: string): RouterDiagnosticPayload | null {
    const hash = readDecodedHash(url);
    if (hash.length === 0 || document.getElementById(hash) instanceof HTMLElement) {
      return null;
    }

    return {
      reason: 'return-to-reading-unavailable',
      routeId: url,
    };
  }
}
