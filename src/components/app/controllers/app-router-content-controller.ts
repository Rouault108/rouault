import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { ContentUpdateAdapter } from '../../../lib/router.js';

export class AppRouterContentController implements ReactiveController {
  private didInitializeFromSsr = false;
  private currentContent = '';

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
    this.currentContent = existingMain?.innerHTML ?? '';
    this.setPageContent(this.currentContent);
    hostElement.replaceChildren();
    this.didInitializeFromSsr = true;
  }

  createContentAdapter(waitForUpdate: () => Promise<unknown>): ContentUpdateAdapter {
    return {
      prepare: ({ html }) => {
        const previousContent = this.currentContent;

        return {
          commit: async () => {
            this.currentContent = html;
            this.setPageContent(html);
            await waitForUpdate();
          },
          rollback: async () => {
            this.currentContent = previousContent;
            this.setPageContent(previousContent);
            await waitForUpdate();
          },
        };
      },
    };
  }
}
