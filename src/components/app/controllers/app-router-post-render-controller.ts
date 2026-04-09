import { FocusManager } from '../../../router/focus-manager.js';
import type { PostCommitController } from '../../../router/router.js';
import {
  dispatchPrimaryTabUrlStateChange,
  readDecodedHash,
} from '../navigation/primary-tab-url-state.js';

export class AppRouterPostRenderController {
  private readonly focusManager = new FocusManager();
  private clearTimer: number | null = null;

  constructor(private readonly setAnnouncement: (text: string) => void) {}

  dispose(): void {
    if (this.clearTimer !== null) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }

  createPostCommitController(hostElement: HTMLElement): PostCommitController {
    return {
      run: async (context) => {
        if (context.stateOnly) {
          dispatchPrimaryTabUrlStateChange(context.previousUrl, context.url);

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

  async restoreInitialHashScroll(): Promise<void> {
    const waitForLoad = async (): Promise<void> => {
      if (document.readyState === 'complete') {
        return;
      }

      await new Promise<void>((resolve) => {
        window.addEventListener(
          'load',
          () => {
            resolve();
          },
          { once: true },
        );
      });
    };

    await waitForLoad();
    const didScroll = await this.scrollToHash(window.location.href);
    if (didScroll) {
      return;
    }

    const hash = readDecodedHash(window.location.href);
    if (hash.length === 0) {
      return;
    }

    const target = document.getElementById(hash);
    if (!(target instanceof HTMLElement)) {
      return;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    const absoluteTop = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: absoluteTop, left: 0, behavior: 'instant' });
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