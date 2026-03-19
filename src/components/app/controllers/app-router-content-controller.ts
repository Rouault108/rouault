import type { ReactiveController, ReactiveControllerHost } from 'lit';

export class AppRouterContentController implements ReactiveController {
  private didInitializeFromSsr = false;
  private shouldRunPostNavigationHooks = false;

  constructor(
    host: ReactiveControllerHost,
    private setPageContent: (html: string) => void,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    // no-op
  }

  captureInitialContent(hostElement: HTMLElement): void {
    if (this.didInitializeFromSsr) {
      return;
    }

    const existingMain = hostElement.querySelector('main');
    this.setPageContent(existingMain?.innerHTML ?? '');
    hostElement.replaceChildren();
    this.didInitializeFromSsr = true;
  }

  async handleContentUpdate(newContent: string, onAfterUpdate: () => Promise<void>): Promise<void> {
    this.shouldRunPostNavigationHooks = true;
    this.setPageContent(newContent);
    await onAfterUpdate();
  }

  shouldRunPostRenderHooks(): boolean {
    return this.shouldRunPostNavigationHooks;
  }

  consumePostRenderHooksFlag(): void {
    this.shouldRunPostNavigationHooks = false;
  }
}
