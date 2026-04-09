import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { ContentUpdateAdapter } from '../../../router/router.js';
import {
  createRouterContentHtml,
  type RouterContentHtml,
} from '../../../router/router-content-html.js';

export class AppRouterContentController implements ReactiveController {
  private didInitializeFromSsr = false;
  private currentContent: RouterContentHtml = createRouterContentHtml('');

  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected(): void {
    // no-op
  }

  initialize(content: RouterContentHtml): void {
    this.currentContent = content;
    this.didInitializeFromSsr = true;
  }

  captureInitialContent(hostElement: HTMLElement, contentRootSelector: string): RouterContentHtml {
    if (this.didInitializeFromSsr) {
      return this.currentContent;
    }

    const existingMain = hostElement.querySelector<HTMLElement>(contentRootSelector);
    this.initialize(createRouterContentHtml(existingMain?.innerHTML ?? ''));
    return this.currentContent;
  }

  createContentAdapter(
    applyContent: (html: RouterContentHtml) => void | Promise<void>,
  ): ContentUpdateAdapter {
    if (!this.didInitializeFromSsr) {
      throw new Error('SSR 初期化前に content adapter が生成されました。');
    }

    return {
      prepare: ({ html }) => {
        const previousContent = this.currentContent;
        const nextContent = createRouterContentHtml(html);

        return {
          commit: async () => {
            this.currentContent = nextContent;
            await applyContent(nextContent);
          },
          rollback: async () => {
            this.currentContent = previousContent;
            await applyContent(previousContent);
          },
        };
      },
    };
  }
}