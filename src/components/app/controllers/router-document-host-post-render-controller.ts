import { ReadingPositionController } from './reading-position-controller.js';
import { readCurrentShellCommitId } from '../shell/app-shell-lifecycle.js';
import { FocusManager } from '../../../router/focus-manager.js';
import type { PostCommitController } from '../../../router/router.js';
import type { RouterDiagnosticPayload } from '../../../router/router-diagnostics.js';
import { MAIN_CONTENT_SELECTOR } from '../../../../shared/navigation/main-landmark-contract.js';
import {
  dispatchPrimaryTabUrlStateChange,
  readDecodedHash,
} from '../navigation/primary-tab-url-state.js';

export class RouterDocumentHostPostRenderController {
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
  }

  terminal(committed: boolean): void {
    this.reading.terminal(committed);
  }

  initialize(host: HTMLElement): void {
    const root = host.querySelector(MAIN_CONTENT_SELECTOR);
    if (!(root instanceof HTMLElement)) return;
    this.reading.start(root);
  }

  createPostCommitController(hostElement: HTMLElement): PostCommitController {
    return {
      run: (context) => {
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
        const root = hostElement.querySelector(MAIN_CONTENT_SELECTOR);
        if (root instanceof HTMLElement)
          this.reading.schedule({
            intent: context.intent,
            root,
            url: window.location.pathname + window.location.search + window.location.hash,
            stateOnly: context.stateOnly,
            error: context.renderedKind === 'error' || context.renderedKind === 'not-found',
            shellCommitId: readCurrentShellCommitId(),
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
