import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { FocusManager } from '../../../lib/router/focus-manager.js';
import type { PostCommitController } from '../../../lib/router.js';

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
      run: (context) => {
        if (context.stateOnly) {
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

        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

        const main = hostElement.querySelector('#main-content');
        if (main instanceof HTMLElement) {
          this.focusManager.focusMainContent(main);
        }
      },
    };
  }
}
