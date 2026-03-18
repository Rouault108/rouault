import { FocusManager } from './focus-manager.js';
import { ReinitializeHookRegistry } from './reinitialize-hook-registry.js';
import { RouterAnnouncer } from './router-announcer.js';

export class StandaloneNavigationEffects {
  private focusManager = new FocusManager();

  constructor(
    private outlet: HTMLElement,
    private reinitializeHooks: ReinitializeHookRegistry,
    private announcer: RouterAnnouncer,
  ) {}

  afterContentCommit(): void {
    this.reinitializeHooks.run();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    this.focusManager.focusMainContent(this.outlet);
    this.announcer.announcePageChange();
  }
}