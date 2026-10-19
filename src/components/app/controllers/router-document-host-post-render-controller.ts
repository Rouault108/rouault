import { ReadingPositionController } from './reading-position-controller.js';
import { syncTocAtReadingPosition } from '../../../toc/sync-toc-at-reading-position.js';
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
      syncTocAtReadingPosition(position);
    },
  );
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
    if (this.clearTimer !== null) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
    this.reading.dispose();
    this.stopTablePreparation();
    this.clearTablePreparation();
  }

  private clearTablePreparation(): void {
    this.tablePreparation?.abort();
    this.tablePreparation = null;
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
        let prepaintGeometryReady = false;
        const receipt = context.receipt;
        if (
          root instanceof HTMLElement &&
          receipt?.commitTiming === 'synchronous' &&
          context.intent.cause === 'traverse' &&
          !context.stateOnly &&
          context.renderedKind === 'page' &&
          !receipt.url.includes('#') &&
          ownsAcceptedHistoryCommit(root, context.intent, receipt)
        ) {
          this.clearTablePreparation();
          const preparation = new AbortController();
          this.tablePreparation = preparation;
          const isCurrent = (): boolean => {
            const current = readContentContext();
            return (
              !preparation.signal.aborted &&
              root.isConnected &&
              root.ownerDocument === document &&
              document.getElementById('main-content') === root &&
              current?.root === root &&
              current.contentEpoch === receipt.contentEpoch &&
              !current.mutation &&
              !current.recoveryRequired &&
              readCurrentShellCommitId() === receipt.shellCommitId
            );
          };
          // 操作有効化を待たず、位置に影響する既知railだけをfocus/scrollより先に準備する。
          prepaintGeometryReady = prepareTableGeometry(root, {
            isCurrent,
            canPrepare: () => ownsAcceptedHistoryCommit(root, context.intent, receipt),
            signal: preparation.signal,
          });
        }
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
        if (root instanceof HTMLElement)
          this.reading.schedule({
            intent: context.intent,
            root,
            url: window.location.pathname + window.location.search + window.location.hash,
            stateOnly: context.stateOnly,
            error: context.renderedKind === 'error' || context.renderedKind === 'not-found',
            shellCommitId: readCurrentShellCommitId(),
            previousUrl: context.previousUrl,
            prepaintGeometryReady,
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
