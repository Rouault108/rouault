import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { Router } from '../../../lib/router.js';
import { FocusManager } from '../../../lib/router/focus-manager.js';

export class AppRouterPostRenderController implements ReactiveController {
  private focusManager = new FocusManager();

  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected(): void {
    // no-op
  }

  handleContentRendered(
    shouldRunHooks: boolean,
    router: Router | null,
    main: HTMLElement | null,
  ): void {
    if (!shouldRunHooks) {
      return;
    }

    router?.runReinitializeHooks();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });

    if (main) {
      this.focusManager.focusMainContent(main);
    }
  }
}