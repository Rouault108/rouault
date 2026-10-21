import { ReadingPositionController } from './reading-position-controller.js';
import {
  observeNativeTocPosition,
  syncAcceptedTocPosition,
} from '../../../toc/toc-source-session.js';
import { readAddress } from '../../../navigation/history-entry.js';
import { readCurrentShellCommitId } from '../shell/app-shell-lifecycle.js';
import { FocusManager } from '../../../router/focus-manager.js';
import type { PostCommitController } from '../../../router/router.js';
import type { RouterDiagnosticPayload } from '../../../router/router-diagnostics.js';
import { MAIN_CONTENT_SELECTOR } from '../../../../shared/navigation/main-landmark-contract.js';
import { prepareTableGeometry } from '../../../client/post-hydrate/table-scroll-enhancer.js';
import {
  readContentContext,
  subscribeContentContext,
} from '../../../navigation/content-navigation-context.js';
import { ownsAcceptedHistoryCommit } from './accepted-history-commit.js';
import {
  dispatchPrimaryTabUrlStateChange,
  readDecodedHash,
} from '../navigation/primary-tab-url-state.js';

export class RouterDocumentHostPostRenderController {
  private readonly focusManager = new FocusManager();
  private clearTimer: number | null = null;
  private readonly reading = new ReadingPositionController(
    (error) => {
      this.reportBackgroundError(error);
    },
    (position) => {
      syncAcceptedTocPosition(position);
    },
    (observation) => {
      observeNativeTocPosition(observation);
    },
  );
  private disposed = false;
  private tablePreparation: AbortController | null = null;
  private readonly stopTablePreparation = subscribeContentContext((reason) => {
    // before-mutationの離脱座標保存より後に、旧本文の準備と操作購読を解放する。
    if (reason === 'mutation' || reason === 'recovery') this.clearTablePreparation();
  });

  constructor(
    private readonly setAnnouncement: (text: string) => void,
    private readonly reportBackgroundError: (error: unknown) => void = () => {
      /* 初期化前には診断先がない。 */
    },
  ) {}

  dispose(): void {
    this.disposed = true;
    if (this.clearTimer !== null) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
    this.reading.dispose();
    this.stopTablePreparation();
    this.clearTablePreparation();
  }

  private clearTablePreparation(): void {
    const previous = this.tablePreparation;
    this.tablePreparation = null;
    previous?.abort();
  }

  terminal(committed: boolean, intentId: number): void {
    this.reading.terminal(committed, intentId);
  }

  initialize(host: HTMLElement): void {
    const root = host.querySelector(MAIN_CONTENT_SELECTOR);
    if (!(root instanceof HTMLElement)) return;
    this.reading.start(root);
  }

  createPostCommitController(hostElement: HTMLElement): PostCommitController {
    return {
      run: (context) => {
        const root = hostElement.querySelector(MAIN_CONTENT_SELECTOR);
        if (!(root instanceof HTMLElement)) return;
        const receipt = context.receipt;
        const content = readContentContext();
        const epoch = content?.contentEpoch;
        const shellCommitId = readCurrentShellCommitId();
        const ownsRun = (): boolean => {
          const current = readContentContext();
          return (
            !this.disposed &&
            !context.intent.signal.aborted &&
            root.isConnected &&
            current?.root === root &&
            current.contentEpoch === epoch &&
            current.intent?.intentId === context.intent.intentId &&
            !current.mutation &&
            !current.recoveryRequired &&
            readCurrentShellCommitId() === shellCommitId &&
            readAddress() === context.url &&
            (context.stateOnly ||
              !receipt ||
              ownsAcceptedHistoryCommit(root, context.intent, receipt))
          );
        };
        if (!ownsRun()) return;
        let prepaintGeometryReady = false;
        const prepaintCandidate = receipt
          ? this.reading.qualifyPrepaintHistoryCandidate(root, context.intent, receipt)
          : null;
        if (
          receipt &&
          context.renderedKind === 'page' &&
          !context.stateOnly &&
          this.reading.ownsPrepaintHistoryCommit(root, context.intent, receipt) &&
          (!receipt.url.includes('#') || prepaintCandidate)
        ) {
          let preparation: AbortController | null = null;
          const ownsCommit = (): boolean =>
            ownsRun() && this.reading.ownsPrepaintHistoryCommit(root, context.intent, receipt);
          try {
            // abort/cleanupも再入し得るため、準備全体と同じ例外境界で扱う。
            this.clearTablePreparation();
            if (!ownsRun()) return;
            if (ownsCommit()) {
              preparation = new AbortController();
              this.tablePreparation = preparation;
              const owner = preparation;
              const isCurrent = (): boolean =>
                !owner.signal.aborted && this.tablePreparation === owner && ownsCommit();
              prepaintGeometryReady = prepareTableGeometry(root, {
                isCurrent,
                canPrepare: isCurrent,
                signal: preparation.signal,
              });
            }
            if (!ownsRun()) return;
            prepaintGeometryReady = prepaintGeometryReady && ownsCommit();
          } catch {
            // 新ownerへ移った場合には、その準備や受理済み本文へ触れない。
            if (!ownsRun()) return;
            if (preparation && this.tablePreparation === preparation) {
              this.tablePreparation = null;
              try {
                preparation.abort();
              } catch {
                /* 位置候補は遅延復元へ残す。 */
              }
            }
            prepaintGeometryReady = false;
          }
        }
        if (!ownsRun()) return;
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
        // preventScroll focusも同期navigationを起こせる。旧scheduleは新jobを取消すので呼ばない。
        if (!ownsRun()) return;
        this.reading.schedule({
          intent: context.intent,
          root,
          url: window.location.pathname + window.location.search + window.location.hash,
          stateOnly: context.stateOnly,
          error: context.renderedKind === 'error' || context.renderedKind === 'not-found',
          shellCommitId: readCurrentShellCommitId(),
          previousUrl: context.previousUrl,
          prepaintGeometryReady,
          ...(prepaintCandidate ? { prepaintCandidate } : {}),
          ...(context.receipt ? { receipt: context.receipt } : {}),
        });
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
