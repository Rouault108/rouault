import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Router } from '../../../lib/router.js';

export class AppRouterAnnouncementController implements ReactiveController {
  private clearTimer: number | null = null;
  private router: Router | null = null;
  private contentLoadHandler: (() => void) | null = null;

  constructor(
    host: ReactiveControllerHost,
    private setAnnouncement: (text: string) => void,
  ) {
    host.addController(this);
  }

  connect(router: Router): void {
    this.disconnect();
    this.router = router;
    this.contentLoadHandler = () => {
      this.setAnnouncement('ページが読み込まれました');

      if (this.clearTimer !== null) {
        window.clearTimeout(this.clearTimer);
      }

      this.clearTimer = window.setTimeout(() => {
        this.setAnnouncement('');
        this.clearTimer = null;
      }, 1000);
    };

    router.on('content:load', this.contentLoadHandler);
  }

  hostDisconnected(): void {
    this.disconnect();
  }

  private disconnect(): void {
    if (this.router && this.contentLoadHandler) {
      this.router.off('content:load', this.contentLoadHandler);
    }

    this.router = null;
    this.contentLoadHandler = null;

    if (this.clearTimer !== null) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
  }
}