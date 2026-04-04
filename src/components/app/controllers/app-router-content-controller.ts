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

  captureInitialContent(hostElement: HTMLElement): RouterContentHtml {
    if (this.didInitializeFromSsr) {
      return this.currentContent;
    }

    const existingMain = hostElement.querySelector('main');
    this.currentContent = createRouterContentHtml(existingMain?.innerHTML ?? '');
    this.didInitializeFromSsr = true;

    return this.currentContent;
  }

  createContentAdapter(waitForUpdate: () => Promise<unknown>): ContentUpdateAdapter {
    if (this.didInitializeFromSsr) {
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
    throw new Error('SSR 初期化前に content adapter が生成されました。');
  }
}
