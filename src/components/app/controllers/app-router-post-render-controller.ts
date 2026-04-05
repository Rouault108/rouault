import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { FocusManager } from '../../../router/focus-manager.js';
import type { PostCommitController } from '../../../router/router.js';
import {
  dispatchPrimaryTabUrlStateChange,
  readDecodedHash,
} from '../navigation/primary-tab-url-state.js';

export class AppRouterPostRenderController implements ReactiveController {
  private focusManager = new FocusManager();
  private clearTimer: number | null = null;

  constructor(
    host: ReactiveControllerHost,
    private setAnnouncement: (text: string) => void,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    // no-op
  }

  hostDisconnected(): void {
    if (this.clearTimer !== null) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }

  createPostCommitController(hostElement: HTMLElement): PostCommitController {
    return {
      run: async (context) => {
        if (context.stateOnly) {
          if (context.previousUrl !== null) {
            dispatchPrimaryTabUrlStateChange(context.previousUrl, context.url);
          }

          await this.scrollToHash(context.url);
          return;
        }

        this.setAnnouncement('ページが読み込まれました');
        if (this.clearTimer !== null) {
          window.clearTimeout(this.clearTimer);
        }
        this.clearTimer = window.setTimeout(() => {
          this.setAnnouncement('');
          this.clearTimer = null;
        }, 1000);

        const didScrollToHash = await this.scrollToHash(context.url);
        if (!didScrollToHash) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }

        const main = hostElement.querySelector('#main-content');
        if (main instanceof HTMLElement) {
          this.focusManager.focusMainContent(main);
        }
      },
    };
  }

  private async scrollToHash(url: string): Promise<boolean> {
    const hash = readDecodedHash(url);
    if (hash.length === 0) {
      return false;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    const target = document.getElementById(hash);
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    target.scrollIntoView({ block: 'start', inline: 'nearest' });
    return true;
  }
}