import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { ContentUpdateAdapter } from '../../../router/router.js';
import {
  createRouterContentHtml,
  type RouterContentHtml,
} from '../../../router/router-content-html.js';

export class AppRouterContentController implements ReactiveController {
  private didInitializeFromSsr = false;
  private currentContent: RouterContentHtml = createRouterContentHtml('');

  constructor(
    host: ReactiveControllerHost,
    private setPageContent: (html: RouterContentHtml) => void,
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
    this.currentContent = createRouterContentHtml(existingMain?.innerHTML ?? '');
    if (existingMain instanceof HTMLElement) {
      this.setPageContent(this.currentContent);
    }
    hostElement.replaceChildren();
    this.didInitializeFromSsr = true;
  }

  createContentAdapter(waitForUpdate: () => Promise<unknown>): ContentUpdateAdapter {
    return {
      prepare: ({ html }) => {
        const previousContent = this.currentContent;
        const nextContent = createRouterContentHtml(html);

        return {
          commit: async () => {
            this.currentContent = nextContent;
            this.setPageContent(nextContent);
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
